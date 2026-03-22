import { MatchStatus, MatchType, type Match as PrismaMatch, type MatchPlayer, type Player } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const matches: Array<
      PrismaMatch & {
        players: Array<MatchPlayer & { player: Player }>;
        scheduledBy: {
          id: number;
          username: string;
        };
      }
    > = await prisma.match.findMany({
      include: {
        players: {
          include: {
            player: true,
          },
          orderBy: [{ teamSide: 'asc' }, { position: 'asc' }],
        },
        scheduledBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json(matches);
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
      scheduledById,
      status = 'SCHEDULED',
      team1Score,
      team2Score,
      winnerTeam,
      notes,
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

    const normalizedType = type === 'DOUBLES' ? MatchType.DOUBLES : MatchType.SINGLES;
    const expectedTeamSize = normalizedType === MatchType.SINGLES ? 1 : 2;

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

    const match = await prisma.match.create({
      data: {
        scheduledAt: new Date(scheduledAt),
        type: normalizedType,
        status:
          status === MatchStatus.COMPLETED || status === MatchStatus.CANCELLED
            ? status
            : MatchStatus.SCHEDULED,
        team1Score: team1Score ?? null,
        team2Score: team2Score ?? null,
        winnerTeam: winnerTeam ?? null,
        notes: notes?.trim() || null,
        scheduledById,
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
      },
    });

    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    console.error('Error creating match:', error);
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 });
  }
}
