import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/groups/:id - Get group details
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        tournament: true,
        members: {
          where: { isActive: true },
          include: {
            player: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        matchesAsGroup1: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        },
        matchesAsGroup2: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
  }
}

// PATCH /api/groups/:id - Update group
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    const group = await prisma.group.update({
      where: { id: groupId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

// DELETE /api/groups/:id - Delete group
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
