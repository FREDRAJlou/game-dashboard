import { NextResponse } from 'next/server';
import type { Match as PrismaMatch, MatchPlayer, Player, Team, Group } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatTeamLabel, groupPlayersByTeam } from '@/lib/match-utils';

export async function GET() {
  try {
    const matches: Array<
      PrismaMatch & {
        players: Array<MatchPlayer & { player: Player }>;
        team1: Team | null;
        team2: Team | null;
        group1: Pick<Group, 'id' | 'name' | 'color'> | null;
        group2: Pick<Group, 'id' | 'name' | 'color'> | null;
      }
    > = await prisma.match.findMany({
      include: {
        players: {
          include: {
            player: true,
          },
          orderBy: [{ teamSide: 'asc' }, { position: 'asc' }],
        },
        team1: true,
        team2: true,
        group1: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        group2: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return NextResponse.json(
      matches.map((match) => {
        const teams = groupPlayersByTeam(match.players);
        
        // Use custom team names if available, otherwise use player names
        const team1Label = match.team1?.name || formatTeamLabel(teams.team1);
        const team2Label = match.team2?.name || formatTeamLabel(teams.team2);
        
        return {
          id: match.id,
          scheduledAt: match.scheduledAt,
          type: match.type,
          status: match.status,
          stage: (match as any).stage,
          team1Score: match.team1Score,
          team2Score: match.team2Score,
          winnerTeam: match.winnerTeam,
          notes: match.notes,
          team1: team1Label,
          team2: team2Label,
          team1Name: match.team1?.name,
          team2Name: match.team2?.name,
          tournamentId: match.tournamentId,
          group1: match.group1,
          group2: match.group2,
          players: match.players,
          isUpcoming: match.status === 'SCHEDULED' && new Date(match.scheduledAt) >= new Date(),
        };
      })
    );
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      scheduledAt,
      type,
      team1PlayerIds,
      team2PlayerIds,
      team1Name,
      team2Name,
      scheduledById,
      status = 'SCHEDULED',
      team1Score,
      team2Score,
      winnerTeam,
      notes,
      tournamentId,
      group1Id,
      group2Id,
      stage = 'GROUP_STAGE',
      customPointsForWin,
      customPointsForLoss,
    } = body;

    if (!scheduledAt || !type || !scheduledById) {
      return NextResponse.json(
        { error: 'scheduledAt, type, and scheduledById are required' },
        { status: 400 }
      );
    }

    // Verify that the user scheduling the match is an admin
    const user = await prisma.user.findUnique({
      where: { id: scheduledById },
      select: { isAdmin: true },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can schedule matches' },
        { status: 403 }
      );
    }

    if (!Array.isArray(team1PlayerIds) || !Array.isArray(team2PlayerIds)) {
      return NextResponse.json({ error: 'Both teams must be provided' }, { status: 400 });
    }

    const normalizedType = type === 'DOUBLES' ? 'DOUBLES' : 'SINGLES';
    const expectedTeamSize = normalizedType === 'SINGLES' ? 1 : 2;

    if (team1PlayerIds.length !== expectedTeamSize || team2PlayerIds.length !== expectedTeamSize) {
      return NextResponse.json(
        { error: `${normalizedType.toLowerCase()} matches require exactly ${expectedTeamSize} player(s) per team` },
        { status: 400 }
      );
    }

    const allPlayers = [...team1PlayerIds, ...team2PlayerIds];
    if (new Set(allPlayers).size !== allPlayers.length) {
      return NextResponse.json({ error: 'A player cannot appear twice in the same match' }, { status: 400 });
    }

    // Validate tournament requires groups
    if (tournamentId && (!group1Id || !group2Id)) {
      return NextResponse.json(
        { error: 'Tournament matches require both teams to be assigned to groups' },
        { status: 400 }
      );
    }

    // Handle team creation for doubles matches with custom names
    let team1Id = null;
    let team2Id = null;

    if (normalizedType === 'DOUBLES' && (team1Name || team2Name)) {
      // Create or find Team 1
      if (team1Name) {
        const team1 = await prisma.team.upsert({
          where: { name: team1Name },
          create: {
            name: team1Name,
            players: {
              create: team1PlayerIds.map((playerId) => ({
                playerId,
              })),
            },
          },
          update: {},
        });
        team1Id = team1.id;
      }

      // Create or find Team 2
      if (team2Name) {
        const team2 = await prisma.team.upsert({
          where: { name: team2Name },
          create: {
            name: team2Name,
            players: {
              create: team2PlayerIds.map((playerId) => ({
                playerId,
              })),
            },
          },
          update: {},
        });
        team2Id = team2.id;
      }
    }

    const match = await prisma.match.create({
      data: {
        scheduledAt: new Date(scheduledAt),
        type: normalizedType,
        status,
        stage: stage as any, // Type assertion until Prisma is regenerated
        team1Score: team1Score ?? null,
        team2Score: team2Score ?? null,
        winnerTeam: winnerTeam ?? null,
        notes: notes?.trim() || null,
        scheduledById,
        tournamentId: tournamentId ?? null,
        group1Id: group1Id ?? null,
        group2Id: group2Id ?? null,
        team1Id,
        team2Id,
        customPointsForWin: customPointsForWin ?? null,
        customPointsForLoss: customPointsForLoss ?? null,
        players: {
          create: [
            ...team1PlayerIds.map((playerId: number, index: number) => ({
              playerId,
              teamSide: 1,
              position: index + 1,
            })),
            ...team2PlayerIds.map((playerId: number, index: number) => ({
              playerId,
              teamSide: 2,
              position: index + 1,
            })),
          ],
        },
      },
      include: {
        players: {
          include: {
            player: true,
          },
          orderBy: [{ teamSide: 'asc' }, { position: 'asc' }],
        },
        team1: true,
        team2: true,
        group1: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        group2: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    console.error('Error creating match:', error);
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 });
  }
}
