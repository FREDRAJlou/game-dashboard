import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/tournaments/:id/qualify - Qualify top performers for semifinals
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tournamentId = parseInt(id);
    const body = await request.json();
    const { groupId } = body;  // matchType removed - get from tournament

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    if (!groupId) {
      return NextResponse.json({ 
        error: 'Missing required field: groupId' 
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Verify tournament and group exist, get matchType from tournament
      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          groups: {
            where: { id: groupId },
          },
        },
      });

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (tournament.groups.length === 0) {
        throw new Error('Group not found in this tournament');
      }

      const matchType = tournament.matchType;  // Get from tournament instead of parameter

      if (matchType === 'SINGLES') {
        // Qualify top 2 players from group
        const playerPerformances = await tx.matchPerformance.findMany({
          where: {
            groupId,
            match: {
              tournamentId,
              type: 'SINGLES',
              status: 'COMPLETED',
            },
          },
          include: {
            player: true,
            match: {
              select: {
                team1Score: true,
                team2Score: true,
              },
            },
          },
        });

        // Aggregate stats by player
        const playerStatsMap = new Map<number, {
          playerId: number;
          playerName: string;
          tournamentPoints: number;
          wins: number;
          winRate: number;
          matchesPlayed: number;
          pointsScored: number;
          pointsConceded: number;
        }>();

        playerPerformances.forEach((perf) => {
          if (!playerStatsMap.has(perf.playerId)) {
            playerStatsMap.set(perf.playerId, {
              playerId: perf.playerId,
              playerName: perf.player.name,
              tournamentPoints: 0,
              wins: 0,
              winRate: 0,
              matchesPlayed: 0,
              pointsScored: 0,
              pointsConceded: 0,
            });
          }

          const stats = playerStatsMap.get(perf.playerId)!;
          stats.tournamentPoints += perf.tournamentPoints;
          stats.matchesPlayed++;
          if (perf.won) stats.wins++;
          stats.pointsScored += perf.gamePoints;
          
          // Calculate points conceded from opponent's score
          const opponentScore = perf.teamSide === 1 
            ? (perf.match.team2Score || 0) 
            : (perf.match.team1Score || 0);
          stats.pointsConceded += opponentScore;
        });

        // Sort by tournament points, then wins, then win rate, then point differential
        const sortedPlayers = Array.from(playerStatsMap.values())
          .map(stats => ({
            ...stats,
            winRate: stats.matchesPlayed > 0 ? (stats.wins / stats.matchesPlayed) * 100 : 0,
            pointDifferential: stats.pointsScored - stats.pointsConceded,
          }))
          .sort((a, b) => {
            if (b.tournamentPoints !== a.tournamentPoints) return b.tournamentPoints - a.tournamentPoints;
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
            return b.pointDifferential - a.pointDifferential;
          });

        // Mark top 2 as qualified
        const qualified = [];
        for (let i = 0; i < Math.min(2, sortedPlayers.length); i++) {
          const player = sortedPlayers[i];
          
          await tx.groupMember.updateMany({
            where: {
              groupId,
              playerId: player.playerId,
            },
            data: {
              qualifiedForSemis: true,
              qualificationRank: i + 1,
            },
          });

          qualified.push({
            rank: i + 1,
            playerId: player.playerId,
            playerName: player.playerName,
            tournamentPoints: player.tournamentPoints,
            wins: player.wins,
            matchesPlayed: player.matchesPlayed,
          });
        }

        return {
          matchType: 'SINGLES',
          groupId,
          qualified,
        };

      } else {
        // Qualify top 2 teams from group (DOUBLES)
        const teamPerformances = await tx.teamPerformance.findMany({
          where: {
            groupId,
            match: {
              tournamentId,
              type: 'DOUBLES',
              status: 'COMPLETED',
            },
          },
          include: {
            team: {
              include: {
                players: {
                  include: {
                    player: true,
                  },
                },
              },
            },
            match: {
              select: {
                team1Score: true,
                team2Score: true,
              },
            },
          },
        });

        // Aggregate stats by team
        const teamStatsMap = new Map<number, {
          teamId: number;
          teamName: string;
          players: string[];
          tournamentPoints: number;
          wins: number;
          winRate: number;
          matchesPlayed: number;
          pointsScored: number;
          pointsConceded: number;
        }>();

        teamPerformances.forEach((perf) => {
          if (!teamStatsMap.has(perf.teamId)) {
            teamStatsMap.set(perf.teamId, {
              teamId: perf.teamId,
              teamName: perf.team.name,
              players: perf.team.players.map(tp => tp.player.name),
              tournamentPoints: 0,
              wins: 0,
              winRate: 0,
              matchesPlayed: 0,
              pointsScored: 0,
              pointsConceded: 0,
            });
          }

          const stats = teamStatsMap.get(perf.teamId)!;
          stats.tournamentPoints += perf.tournamentPoints;
          stats.matchesPlayed++;
          if (perf.won) stats.wins++;
          stats.pointsScored += perf.gamePoints;
          
          // Calculate points conceded from opponent's score
          const opponentScore = perf.teamSide === 1 
            ? (perf.match.team2Score || 0) 
            : (perf.match.team1Score || 0);
          stats.pointsConceded += opponentScore;
        });

        // Sort by tournament points, then wins, then win rate, then point differential
        const sortedTeams = Array.from(teamStatsMap.values())
          .map(stats => ({
            ...stats,
            winRate: stats.matchesPlayed > 0 ? (stats.wins / stats.matchesPlayed) * 100 : 0,
            pointDifferential: stats.pointsScored - stats.pointsConceded,
          }))
          .sort((a, b) => {
            if (b.tournamentPoints !== a.tournamentPoints) return b.tournamentPoints - a.tournamentPoints;
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
            return b.pointDifferential - a.pointDifferential;
          });

        // Mark top 2 teams as qualified
        const qualified = [];
        for (let i = 0; i < Math.min(2, sortedTeams.length); i++) {
          const team = sortedTeams[i];
          
          await tx.team.update({
            where: { id: team.teamId },
            data: {
              qualifiedForSemis: true,
              qualificationRank: i + 1,
            },
          });

          qualified.push({
            rank: i + 1,
            teamId: team.teamId,
            teamName: team.teamName,
            players: team.players,
            tournamentPoints: team.tournamentPoints,
            wins: team.wins,
            matchesPlayed: team.matchesPlayed,
          });
        }

        return {
          matchType: 'DOUBLES',
          groupId,
          qualified,
        };
      }
    });

    return NextResponse.json({
      success: true,
      message: `Qualified top 2 ${result.matchType.toLowerCase()} ${result.matchType === 'SINGLES' ? 'players' : 'teams'} for semifinals`,
      ...result,
    });

  } catch (error) {
    console.error('Error qualifying participants:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to qualify participants';
    return NextResponse.json({ 
      error: 'Failed to qualify participants',
      details: errorMessage 
    }, { status: 500 });
  }
}

// GET /api/tournaments/:id/qualify - Get qualified participants
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tournamentId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const matchType = searchParams.get('matchType') || 'BOTH';

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    const result: any = {
      tournamentId,
      singles: [],
      doubles: [],
    };

    if (matchType === 'SINGLES' || matchType === 'BOTH') {
      // Get qualified players
      const qualifiedPlayers = await prisma.groupMember.findMany({
        where: {
          group: {
            tournamentId,
          },
          qualifiedForSemis: true,
        },
        include: {
          player: true,
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          qualificationRank: 'asc',
        },
      });

      result.singles = qualifiedPlayers.map(qp => ({
        playerId: qp.player.id,
        playerName: qp.player.name,
        groupId: qp.group.id,
        groupName: qp.group.name,
        qualificationRank: qp.qualificationRank,
      }));
    }

    if (matchType === 'DOUBLES' || matchType === 'BOTH') {
      // Get qualified teams
      const qualifiedTeams = await prisma.team.findMany({
        where: {
          qualifiedForSemis: true,
        },
        include: {
          players: {
            include: {
              player: true,
            },
          },
        },
        orderBy: {
          qualificationRank: 'asc',
        },
      });

      result.doubles = qualifiedTeams.map(team => ({
        teamId: team.id,
        teamName: team.name,
        players: team.players.map(tp => tp.player.name),
        qualificationRank: team.qualificationRank,
      }));
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching qualified participants:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch qualified participants';
    return NextResponse.json({ 
      error: 'Failed to fetch qualified participants',
      details: errorMessage 
    }, { status: 500 });
  }
}
