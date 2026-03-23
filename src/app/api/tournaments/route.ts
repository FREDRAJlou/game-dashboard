import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/tournaments - List all tournaments
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const tournaments = await prisma.tournament.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
        groups: {
          select: {
            id: true,
            tournamentId: true,
            name: true,
            description: true,
            color: true,
            _count: {
              select: {
                members: {
                  where: { isActive: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            matches: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { startDate: 'desc' },
      ],
    });

    return NextResponse.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
  }
}

// POST /api/tournaments - Create new tournament
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, matchType, startDate, endDate, status, createdById, pointsForWin, pointsForLoss } = body;

    if (!name || !startDate || !createdById) {
      return NextResponse.json(
        { error: 'Name, startDate, and createdById are required' },
        { status: 400 }
      );
    }

    const tournament = await prisma.tournament.create({
      data: {
        name,
        description,
        matchType: matchType || 'SINGLES',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status || 'DRAFT',
        createdById,
        pointsForWin: pointsForWin ?? 3,
        pointsForLoss: pointsForLoss ?? 0,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 });
  }
}
