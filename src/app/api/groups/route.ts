import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/groups - List all groups (with optional tournament filter)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    const groups = await prisma.group.findMany({
      where: tournamentId ? { tournamentId: parseInt(tournamentId) } : undefined,
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        members: {
          where: { isActive: true },
          include: {
            player: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        _count: {
          select: {
            matchesAsGroup1: true,
            matchesAsGroup2: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

// POST /api/groups - Create new group
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tournamentId, name, description, color } = body;

    if (!tournamentId || !name) {
      return NextResponse.json(
        { error: 'Tournament ID and name are required' },
        { status: 400 }
      );
    }

    const group = await prisma.group.create({
      data: {
        tournamentId,
        name,
        description,
        color,
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
