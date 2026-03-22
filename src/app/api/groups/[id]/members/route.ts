import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/groups/:id/members - Add players to group
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const body = await request.json();
    const { playerIds } = body;

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json(
        { error: 'Player IDs array is required' },
        { status: 400 }
      );
    }

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Add members
    const members = await prisma.$transaction(
      playerIds.map((playerId) =>
        prisma.groupMember.create({
          data: {
            groupId,
            playerId,
            isActive: true,
          },
          include: {
            player: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      )
    );

    return NextResponse.json(members, { status: 201 });
  } catch (error) {
    console.error('Error adding group members:', error);
    return NextResponse.json({ error: 'Failed to add group members' }, { status: 500 });
  }
}

// GET /api/groups/:id/members - Get group members
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const members = await prisma.groupMember.findMany({
      where: {
        groupId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        player: true,
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json({ error: 'Failed to fetch group members' }, { status: 500 });
  }
}
