import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH /api/matches/:id/edit - Edit match details (schedule, players, notes)
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const matchId = parseInt(id);

    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    const body = await request.json();
    const { scheduledAt, notes, players, customPointsForWin, customPointsForLoss } = body;

    // Check if match exists and is editable
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { 
        id: true, 
        status: true,
        type: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Only allow editing if match is SCHEDULED or IN_PROGRESS
    if (match.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot edit completed matches. Only scheduled or in-progress matches can be edited.' },
        { status: 400 }
      );
    }

    // Validate players if provided
    if (players && Array.isArray(players)) {
      const playerCount = players.length;
      const expectedCount = match.type === 'SINGLES' ? 2 : 4;
      
      if (playerCount !== expectedCount) {
        return NextResponse.json(
          { error: `${match.type} matches require exactly ${expectedCount} players` },
          { status: 400 }
        );
      }

      // Validate team distribution
      const team1Players = players.filter(p => p.teamSide === 1);
      const team2Players = players.filter(p => p.teamSide === 2);
      const expectedPerTeam = match.type === 'SINGLES' ? 1 : 2;

      if (team1Players.length !== expectedPerTeam || team2Players.length !== expectedPerTeam) {
        return NextResponse.json(
          { error: `Each team must have exactly ${expectedPerTeam} player(s)` },
          { status: 400 }
        );
      }

      // Check for duplicate players
      const playerIds = players.map(p => p.playerId);
      const uniquePlayerIds = new Set(playerIds);
      if (playerIds.length !== uniquePlayerIds.size) {
        return NextResponse.json(
          { error: 'Cannot have the same player on both teams' },
          { status: 400 }
        );
      }
    }

    // Perform updates without transaction to avoid timeout issues
    // These operations are safe to do separately
    
    // Prepare update data for match
    const updateData: any = {};
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
    if (notes !== undefined) updateData.notes = notes;
    if (customPointsForWin !== undefined) updateData.customPointsForWin = customPointsForWin;
    if (customPointsForLoss !== undefined) updateData.customPointsForLoss = customPointsForLoss;

    // Update match basic info if there's data to update
    if (Object.keys(updateData).length > 0) {
      await prisma.match.update({
        where: { id: matchId },
        data: updateData,
      });
    }

    // Update players if provided
    if (players && Array.isArray(players)) {
      // Delete existing match players
      await prisma.matchPlayer.deleteMany({
        where: { matchId },
      });

      // Add new players in bulk
      await prisma.matchPlayer.createMany({
        data: players.map(player => ({
          matchId,
          playerId: player.playerId,
          teamSide: player.teamSide,
          position: player.position || 1,
        })),
      });
    }

    // Fetch updated match with all relations
    const result = await prisma.match.findUnique({
      where: { id: matchId },
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
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error editing match:', error);
    return NextResponse.json({ error: 'Failed to edit match' }, { status: 500 });
  }
}
