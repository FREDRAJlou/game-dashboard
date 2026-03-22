import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/matches/:id/performance - Record match performance for players
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const matchId = parseInt(id);

    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    const body = await request.json();
    const { performances } = body;

    if (!performances || !Array.isArray(performances)) {
      return NextResponse.json(
        { error: 'Performances array is required' },
        { status: 400 }
      );
    }

    // Validate match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        players: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Validate required fields
    if (!match.group1Id) {
      return NextResponse.json(
        { error: 'Match must be associated with groups to record performance' },
        { status: 400 }
      );
    }

    // Validate all players are in the match
    const matchPlayerIds = match.players.map((p) => p.playerId);
    for (const perf of performances) {
      if (!matchPlayerIds.includes(perf.playerId)) {
        return NextResponse.json(
          { error: `Player ${perf.playerId} is not in this match` },
          { status: 400 }
        );
      }
    }

    // Create performances in transaction
    const createdPerformances = await prisma.$transaction(
      performances.map((perf: any) => {
        // Find player's team side
        const matchPlayer = match.players.find((p) => p.playerId === perf.playerId);
        const teamSide = matchPlayer?.teamSide || 1;
        const groupId = teamSide === 1 ? match.group1Id : match.group2Id;

        return prisma.matchPerformance.create({
          data: {
            matchId,
            playerId: perf.playerId,
            groupId: groupId!,
            teamSide,
            gamePoints: perf.gamePoints || perf.points || 0,  // Support both new and old field names
            tournamentPoints: perf.tournamentPoints || 0,
            won: perf.won || false,
            aces: perf.aces || 0,
            errors: perf.errors || 0,
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      })
    );

    return NextResponse.json(createdPerformances, { status: 201 });
  } catch (error) {
    console.error('Error recording match performance:', error);
    return NextResponse.json({ error: 'Failed to record match performance' }, { status: 500 });
  }
}

// GET /api/matches/:id/performance - Get match performance details
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const matchId = parseInt(id);

    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    const performances = await prisma.matchPerformance.findMany({
      where: { matchId },
      include: {
        player: true,
      },
      orderBy: {
        gamePoints: 'desc',  // Fixed: use gamePoints instead of points
      },
    });

    return NextResponse.json(performances);
  } catch (error) {
    console.error('Error fetching match performance:', error);
    return NextResponse.json({ error: 'Failed to fetch match performance' }, { status: 500 });
  }
}
