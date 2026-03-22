import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/tournaments/:id/create-playoffs - Auto-generate playoff matches
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tournamentId = parseInt(id);
    const body = await request.json();
    const { scheduledDate, scheduledById } = body;  // matchType removed

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    if (!scheduledById) {
      return NextResponse.json({ 
        error: 'Missing required field: scheduledById' 
      }, { status: 400 });
    }

    const scheduledAt = scheduledDate ? new Date(scheduledDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
      });

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      const matchType = tournament.matchType;  // Get from tournament

      if (matchType === 'SINGLES') {
        // Get qualified players
        const qualifiedPlayers = await tx.groupMember.findMany({
          where: {
            group: {
              tournamentId,
            },
            qualifiedForSemis: true,
          },
          include: {
            player: true,
            group: true,
          },
          orderBy: {
            qualificationRank: 'asc',
          },
        });

        if (qualifiedPlayers.length < 2) {
          throw new Error('Not enough qualified players. Need at least 2 players.');
        }

        if (qualifiedPlayers.length !== 4) {
          throw new Error(`Expected 4 qualified players (top 2 from each group), found ${qualifiedPlayers.length}`);
        }

        // Create semifinals: 1st from Group A vs 2nd from Group B, 1st from Group B vs 2nd from Group A
        const group1Players = qualifiedPlayers.filter(qp => qp.group.id === qualifiedPlayers[0].group.id);
        const group2Players = qualifiedPlayers.filter(qp => qp.group.id !== qualifiedPlayers[0].group.id);

        if (group1Players.length !== 2 || group2Players.length !== 2) {
          throw new Error('Each group must have exactly 2 qualified players');
        }

        const semi1 = await tx.match.create({
          data: {
            tournamentId,
            type: 'SINGLES',
            stage: 'SEMI_FINAL',
            status: 'SCHEDULED',
            scheduledAt,
            scheduledById,
            group1Id: group1Players[0].groupId, // 1st from Group A
            group2Id: group2Players[1].groupId, // 2nd from Group B
            players: {
              create: [
                { playerId: group1Players[0].playerId, teamSide: 1, position: 1 },
                { playerId: group2Players[1].playerId, teamSide: 2, position: 1 },
              ],
            },
          },
        });

        const semi2 = await tx.match.create({
          data: {
            tournamentId,
            type: 'SINGLES',
            stage: 'SEMI_FINAL',
            status: 'SCHEDULED',
            scheduledAt: new Date(scheduledAt.getTime() + 3600000), // 1 hour later
            scheduledById,
            group1Id: group2Players[0].groupId, // 1st from Group B
            group2Id: group1Players[1].groupId, // 2nd from Group A
            players: {
              create: [
                { playerId: group2Players[0].playerId, teamSide: 1, position: 1 },
                { playerId: group1Players[1].playerId, teamSide: 2, position: 1 },
              ],
            },
          },
        });

        return {
          matchType: 'SINGLES',
          semifinals: [
            {
              id: semi1.id,
              player1: group1Players[0].player.name,
              player2: group2Players[1].player.name,
            },
            {
              id: semi2.id,
              player1: group2Players[0].player.name,
              player2: group1Players[1].player.name,
            },
          ],
        };

      } else {
        // Get qualified teams
        const qualifiedTeams = await tx.team.findMany({
          where: {
            qualifiedForSemis: true,
          },
          include: {
            players: {
              include: {
                player: true,
              },
            },
            performances: {
              where: {
                match: {
                  tournamentId,
                },
              },
              include: {
                group: true,
              },
              take: 1,
            },
          },
          orderBy: {
            qualificationRank: 'asc',
          },
        });

        if (qualifiedTeams.length < 2) {
          throw new Error('Not enough qualified teams. Need at least 2 teams.');
        }

        if (qualifiedTeams.length !== 4) {
          throw new Error(`Expected 4 qualified teams (top 2 from each group), found ${qualifiedTeams.length}`);
        }

        // Determine which group each team belongs to
        const teamsWithGroups = qualifiedTeams.map(team => ({
          ...team,
          groupId: team.performances[0]?.groupId,
        }));

        const group1Teams = teamsWithGroups.filter(t => t.groupId === teamsWithGroups[0].groupId);
        const group2Teams = teamsWithGroups.filter(t => t.groupId !== teamsWithGroups[0].groupId);

        if (group1Teams.length !== 2 || group2Teams.length !== 2) {
          throw new Error('Each group must have exactly 2 qualified teams');
        }

        // Create semifinals: 1st from Group A vs 2nd from Group B, 1st from Group B vs 2nd from Group A
        const semi1 = await tx.match.create({
          data: {
            tournamentId,
            type: 'DOUBLES',
            stage: 'SEMI_FINAL',
            status: 'SCHEDULED',
            scheduledAt,
            scheduledById,
            group1Id: group1Teams[0].groupId,
            group2Id: group2Teams[1].groupId,
            team1Id: group1Teams[0].id,
            team2Id: group2Teams[1].id,
            players: {
              create: [
                ...group1Teams[0].players.map((tp, idx) => ({
                  playerId: tp.player.id,
                  teamSide: 1,
                  position: idx + 1,
                })),
                ...group2Teams[1].players.map((tp, idx) => ({
                  playerId: tp.player.id,
                  teamSide: 2,
                  position: idx + 1,
                })),
              ],
            },
          },
        });

        const semi2 = await tx.match.create({
          data: {
            tournamentId,
            type: 'DOUBLES',
            stage: 'SEMI_FINAL',
            status: 'SCHEDULED',
            scheduledAt: new Date(scheduledAt.getTime() + 3600000), // 1 hour later
            scheduledById,
            group1Id: group2Teams[0].groupId,
            group2Id: group1Teams[1].groupId,
            team1Id: group2Teams[0].id,
            team2Id: group1Teams[1].id,
            players: {
              create: [
                ...group2Teams[0].players.map((tp, idx) => ({
                  playerId: tp.player.id,
                  teamSide: 1,
                  position: idx + 1,
                })),
                ...group1Teams[1].players.map((tp, idx) => ({
                  playerId: tp.player.id,
                  teamSide: 2,
                  position: idx + 1,
                })),
              ],
            },
          },
        });

        return {
          matchType: 'DOUBLES',
          semifinals: [
            {
              id: semi1.id,
              team1: group1Teams[0].name,
              team2: group2Teams[1].name,
            },
            {
              id: semi2.id,
              team1: group2Teams[0].name,
              team2: group1Teams[1].name,
            },
          ],
        };
      }
    });

    return NextResponse.json({
      success: true,
      message: `Created ${result.matchType.toLowerCase()} semifinal matches`,
      ...result,
    });

  } catch (error) {
    console.error('Error creating playoff matches:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create playoff matches';
    return NextResponse.json({ 
      error: 'Failed to create playoff matches',
      details: errorMessage 
    }, { status: 500 });
  }
}

// POST endpoint for creating finals match after semifinals complete
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tournamentId = parseInt(id);
    const body = await request.json();
    const { scheduledDate, scheduledById } = body;  // matchType removed

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    if (!scheduledById) {
      return NextResponse.json({ 
        error: 'Missing required field: scheduledById' 
      }, { status: 400 });
    }

    const scheduledAt = scheduledDate ? new Date(scheduledDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
      });

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      const matchType = tournament.matchType;  // Get from tournament

      // Get completed semifinals
      const semifinals = await tx.match.findMany({
        where: {
          tournamentId,
          type: matchType,  // Use tournament's matchType
          stage: 'SEMI_FINAL',
          status: 'COMPLETED',
          winnerGroupId: { not: null },
        },
        include: {
          players: {
            include: {
              player: true,
            },
          },
          team1: true,
          team2: true,
        },
      });

      if (semifinals.length !== 2) {
        throw new Error(`Need 2 completed semifinals, found ${semifinals.length}`);
      }

      if (matchType === 'SINGLES') {
        // Get winners from semifinals
        const winner1PlayerId = semifinals[0].players.find(
          p => p.teamSide === semifinals[0].winnerTeam
        )?.playerId;
        
        const winner2PlayerId = semifinals[1].players.find(
          p => p.teamSide === semifinals[1].winnerTeam
        )?.playerId;

        if (!winner1PlayerId || !winner2PlayerId) {
          throw new Error('Could not determine semifinal winners');
        }

        const finals = await tx.match.create({
          data: {
            tournamentId,
            type: 'SINGLES',
            stage: 'FINAL',
            status: 'SCHEDULED',
            scheduledAt,
            scheduledById,
            group1Id: semifinals[0].winnerGroupId,
            group2Id: semifinals[1].winnerGroupId,
            players: {
              create: [
                { playerId: winner1PlayerId, teamSide: 1, position: 1 },
                { playerId: winner2PlayerId, teamSide: 2, position: 1 },
              ],
            },
          },
        });

        const winner1 = semifinals[0].players.find(p => p.playerId === winner1PlayerId);
        const winner2 = semifinals[1].players.find(p => p.playerId === winner2PlayerId);

        return {
          matchType: 'SINGLES',
          finals: {
            id: finals.id,
            player1: winner1?.player.name,
            player2: winner2?.player.name,
          },
        };

      } else {
        // Get winning teams from semifinals
        const winner1TeamId = semifinals[0].winnerTeam === 1 
          ? semifinals[0].team1Id 
          : semifinals[0].team2Id;
        
        const winner2TeamId = semifinals[1].winnerTeam === 1 
          ? semifinals[1].team1Id 
          : semifinals[1].team2Id;

        if (!winner1TeamId || !winner2TeamId) {
          throw new Error('Could not determine semifinal winning teams');
        }

        const winner1Team = await tx.team.findUnique({
          where: { id: winner1TeamId },
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        });

        const winner2Team = await tx.team.findUnique({
          where: { id: winner2TeamId },
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        });

        if (!winner1Team || !winner2Team) {
          throw new Error('Could not find winning teams');
        }

        const finals = await tx.match.create({
          data: {
            tournamentId,
            type: 'DOUBLES',
            stage: 'FINAL',
            status: 'SCHEDULED',
            scheduledAt,
            scheduledById,
            group1Id: semifinals[0].winnerGroupId,
            group2Id: semifinals[1].winnerGroupId,
            team1Id: winner1TeamId,
            team2Id: winner2TeamId,
            players: {
              create: [
                ...winner1Team.players.map((tp, idx) => ({
                  playerId: tp.player.id,
                  teamSide: 1,
                  position: idx + 1,
                })),
                ...winner2Team.players.map((tp, idx) => ({
                  playerId: tp.player.id,
                  teamSide: 2,
                  position: idx + 1,
                })),
              ],
            },
          },
        });

        return {
          matchType: 'DOUBLES',
          finals: {
            id: finals.id,
            team1: winner1Team.name,
            team2: winner2Team.name,
          },
        };
      }
    });

    return NextResponse.json({
      success: true,
      message: `Created ${result.matchType.toLowerCase()} final match`,
      ...result,
    });

  } catch (error) {
    console.error('Error creating finals match:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create finals match';
    return NextResponse.json({ 
      error: 'Failed to create finals match',
      details: errorMessage 
    }, { status: 500 });
  }
}
