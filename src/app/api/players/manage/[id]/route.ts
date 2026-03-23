import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH /api/players/manage/:id - Update player/user roles
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const playerId = parseInt(id);

    if (isNaN(playerId)) {
      return NextResponse.json({ error: 'Invalid player ID' }, { status: 400 });
    }

    const body = await request.json();
    const { isScoringAdmin } = body;

    // Get player with user
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { user: true },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if (!player.userId) {
      return NextResponse.json(
        { error: 'Player does not have a user account' },
        { status: 400 }
      );
    }

    // Update user role
    if (isScoringAdmin !== undefined) {
      await prisma.user.update({
        where: { id: player.userId },
        data: { isScoringAdmin },
      });
    }

    // Return updated player with user info
    const updatedPlayer = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            isAdmin: true,
            isScoringAdmin: true,
          },
        },
      },
    });

    return NextResponse.json(updatedPlayer);
  } catch (error) {
    console.error('Error updating player roles:', error);
    return NextResponse.json({ error: 'Failed to update player roles' }, { status: 500 });
  }
}
