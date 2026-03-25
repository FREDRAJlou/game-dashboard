import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Bulk create and complete matches in a single shot
 * This combines match creation + result entry into one operation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matches, scheduledById, tournamentId } = body;

    if (!Array.isArray(matches) || matches.length === 0) {
      return NextResponse.json(
        { error: 'matches array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!scheduledById) {
      return NextResponse.json(
        { error: 'scheduledById is required' },
        { status: 400 }
      );
    }

    if (!tournamentId) {
      return NextResponse.json(
        { error: 'tournamentId is required' },
        { status: 400 }
      );
    }

    // Verify that the user is an admin or scoring admin
    const user = await prisma.user.findUnique({
      where: { id: scheduledById },
      select: { isAdmin: true, isScoringAdmin: true },
    });

    if (!user || (!user.isAdmin && !user.isScoringAdmin)) {
      return NextResponse.json(
        { error: 'Only administrators or scoring admins can perform bulk operations' },
        { status: 403 }
      );
    }

    // Fetch tournament and its point configuration
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        pointsForWin: true,
        pointsForLoss: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    const results = {
      created: [] as any[],
      errors: [] as any[],
    };

    // Process each match
    for (const matchData of matches) {
      try {
        const {
          player1Name,
          player2Name,
          group1Name,
          group2Name,
          player1Score,
          player2Score,
          winnerTeam,
          scheduledAt,
          stage = 'GROUP_STAGE',
        } = matchData;

        // Validate required fields
        if (!player1Name || !player2Name || !group1Name || !group2Name) {
          results.errors.push({
            match: matchData,
            error: 'player1Name, player2Name, group1Name, and group2Name are required',
          });
          continue;
        }

        if (player1Score === undefined || player2Score === undefined || !winnerTeam) {
          results.errors.push({
            match: matchData,
            error: 'player1Score, player2Score, and winnerTeam are required',
          });
          continue;
        }

        if (winnerTeam !== 1 && winnerTeam !== 2) {
          results.errors.push({
            match: matchData,
            error: 'winnerTeam must be 1 or 2',
          });
          continue;
        }

        // Find players by name
        const player1 = await prisma.player.findFirst({
          where: { name: { equals: player1Name, mode: 'insensitive' } },
        });

        const player2 = await prisma.player.findFirst({
          where: { name: { equals: player2Name, mode: 'insensitive' } },
        });

        if (!player1) {
          results.errors.push({
            match: matchData,
            error: `Player not found: ${player1Name}`,
          });
          continue;
        }

        if (!player2) {
          results.errors.push({
            match: matchData,
            error: `Player not found: ${player2Name}`,
          });
          continue;
        }

        // Find groups by name
        const group1 = await prisma.group.findFirst({
          where: {
            tournamentId,
            name: { equals: group1Name, mode: 'insensitive' },
          },
        });

        const group2 = await prisma.group.findFirst({
          where: {
            tournamentId,
            name: { equals: group2Name, mode: 'insensitive' },
          },
        });

        if (!group1) {
          results.errors.push({
            match: matchData,
            error: `Group not found: ${group1Name}`,
          });
          continue;
        }

        if (!group2) {
          results.errors.push({
            match: matchData,
            error: `Group not found: ${group2Name}`,
          });
          continue;
        }

        // Determine point values - same for all stages in this simple model
        const winPoints = tournament.pointsForWin;
        const lossPoints = tournament.pointsForLoss;

        // Create match as COMPLETED with all data
        const match = await prisma.match.create({
          data: {
            scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
            type: 'SINGLES',
            status: 'COMPLETED',
            stage: stage,
            team1Score: player1Score,
            team2Score: player2Score,
            winnerTeam: winnerTeam,
            notes: null,
            scheduledById,
            tournamentId,
            group1Id: group1.id,
            group2Id: group2.id,
            players: {
              create: [
                {
                  playerId: player1.id,
                  teamSide: 1,
                  position: 1,
                },
                {
                  playerId: player2.id,
                  teamSide: 2,
                  position: 1,
                },
              ],
            },
          },
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        });

        // Create MatchPerformance records for individual player stats
        await prisma.matchPerformance.createMany({
          data: [
            {
              playerId: player1.id,
              matchId: match.id,
              groupId: group1.id,
              teamSide: 1,
              gamePoints: player1Score,
              tournamentPoints: winnerTeam === 1 ? winPoints : lossPoints,
              won: winnerTeam === 1,
            },
            {
              playerId: player2.id,
              matchId: match.id,
              groupId: group2.id,
              teamSide: 2,
              gamePoints: player2Score,
              tournamentPoints: winnerTeam === 2 ? winPoints : lossPoints,
              won: winnerTeam === 2,
            },
          ],
        });

        // Note: TeamPerformance is only for DOUBLES matches with team IDs
        // For SINGLES matches, we only track MatchPerformance

        results.created.push({
          matchId: match.id,
          player1: player1Name,
          player2: player2Name,
          score: `${player1Score}-${player2Score}`,
          winner: winnerTeam === 1 ? player1Name : player2Name,
        });
      } catch (error) {
        console.error('Error processing match:', error);
        results.errors.push({
          match: matchData,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: matches.length,
        created: results.created.length,
        errors: results.errors.length,
      },
      results,
    });
  } catch (error) {
    console.error('Error in bulk complete matches:', error);
    return NextResponse.json(
      { error: 'Failed to process matches' },
      { status: 500 }
    );
  }
}
