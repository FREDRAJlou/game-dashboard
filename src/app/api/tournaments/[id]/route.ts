import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/tournaments/:id - Get tournament details
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tournamentId = parseInt(id);

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
        groups: {
          include: {
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
        },
        matches: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
          orderBy: {
            scheduledAt: 'desc',
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return NextResponse.json({ error: 'Failed to fetch tournament' }, { status: 500 });
  }
}

// PATCH /api/tournaments/:id - Update tournament
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tournamentId = parseInt(id);

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, startDate, endDate, status } = body;

    const tournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status && { status }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
        groups: true,
      },
    });

    return NextResponse.json(tournament);
  } catch (error) {
    console.error('Error updating tournament:', error);
    return NextResponse.json({ error: 'Failed to update tournament' }, { status: 500 });
  }
}

// DELETE /api/tournaments/:id - Delete tournament
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tournamentId = parseInt(id);

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    return NextResponse.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json({ error: 'Failed to delete tournament' }, { status: 500 });
  }
}
