import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string; playerId: string }>;
};

// DELETE /api/groups/:id/members/:playerId - Remove player from group
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id, playerId } = await context.params;
    const groupId = parseInt(id);
    const playerIdNum = parseInt(playerId);

    if (isNaN(groupId) || isNaN(playerIdNum)) {
      return NextResponse.json({ error: 'Invalid group or player ID' }, { status: 400 });
    }

    // Mark member as inactive instead of deleting (for historical tracking)
    const member = await prisma.groupMember.updateMany({
      where: {
        groupId,
        playerId: playerIdNum,
        isActive: true,
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });

    if (member.count === 0) {
      return NextResponse.json(
        { error: 'Active member not found in group' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing group member:', error);
    return NextResponse.json({ error: 'Failed to remove group member' }, { status: 500 });
  }
}
