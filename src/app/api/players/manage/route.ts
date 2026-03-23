import { NextResponse } from 'next/server';
import type { Player, User } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const players = await prisma.player.findMany({
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
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, username, password, isAdmin = false } = body;

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: 'Name, username, and password are required' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const existingPlayer = await prisma.player.findUnique({ where: { name } });
    if (existingPlayer) {
      return NextResponse.json({ error: 'Player name already exists' }, { status: 409 });
    }

    const player = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          password,
          isAdmin,
        },
      });

      return tx.player.create({
        data: {
          name,
          userId: user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              isAdmin: true,
            },
          },
        },
      });
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error('Error creating player:', error);
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { playerId, isActive } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    const player = await prisma.player.update({
      where: { id: playerId },
      data: { isActive },
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

    return NextResponse.json(player);
  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json({ error: 'Failed to update player' }, { status: 500 });
  }
}
