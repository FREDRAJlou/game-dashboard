import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/matches/bulk-results - Bulk update match results from CSV
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { results, userId } = body;

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: 'Missing required field: results (array)' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Check user permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || (!user.isAdmin && !user.isScoringAdmin)) {
      return NextResponse.json(
        { error: 'Only administrators or scoring administrators can update match results' },
        { status: 403 }
      );
    }

    const updatedMatches = [];
    const errors = [];

    // Process each result
    for (const result of results) {
      try {
        const {
          matchId,
          team1Score,
          team2Score,
          winnerTeam,
          completedAt,
          playerScores, // Optional: for doubles matches
        } = result;

        // Validate required fields
        if (!matchId || team1Score === undefined || team2Score === undefined || !winnerTeam) {
          errors.push(`Match ${matchId || 'unknown'}: Missing required fields`);
          continue;
        }

        // Validate scores
        if (team1Score < 0 || team2Score < 0) {
          errors.push(`Match ${matchId}: Scores cannot be negative`);
          continue;
        }

        if (team1Score === team2Score) {
          errors.push(`Match ${matchId}: Scores cannot be equal`);
          continue;
        }

        // Validate winner matches scores
        const actualWinner = team1Score > team2Score ? 1 : 2;
        if (actualWinner !== winnerTeam) {
          errors.push(`Match ${matchId}: Winner team doesn't match scores`);
          continue;
        }

        // Get match details
        const match = await prisma.match.findUnique({
          where: { id: matchId },
          include: {
            players: {
              include: {
                player: true,
              },
            },
            group1: true,
            group2: true,
            tournament: {
              select: {
                id: true,
                matchType: true,
                pointsForWin: true,
                pointsForLoss: true,
              },
            },
          },
        });

        if (!match) {
          errors.push(`Match ${matchId}: Not found`);
          continue;
        }

        if (match.status === 'COMPLETED') {
          errors.push(`Match ${matchId}: Already completed`);
          continue;
        }

        // Determine winner group ID
        let winnerGroupId = null;
        if (winnerTeam === 1 && match.group1Id) {
          winnerGroupId = match.group1Id;
        } else if (winnerTeam === 2 && match.group2Id) {
          winnerGroupId = match.group2Id;
        }

        // Update match in transaction
        await prisma.$transaction(async (tx) => {
          // Update match
          const updatedMatch = await tx.match.update({
            where: { id: matchId },
            data: {
              team1Score,
              team2Score,
              winnerTeam,
              winnerGroupId,
              status: 'COMPLETED',
              completedAt: completedAt ? new Date(completedAt) : new Date(),
              updatedAt: new Date(),
            },
          });

          // Create performance records
          if (match.group1Id && match.group2Id && match.tournament) {
            const pointsForWin = match.tournament.pointsForWin ?? 3;
            const pointsForLoss = match.tournament.pointsForLoss ?? 0;

            const team1Players = match.players.filter(p => p.teamSide === 1).length;
            const team2Players = match.players.filter(p => p.teamSide === 2).length;

            for (const matchPlayer of match.players) {
              const playerGroupId = matchPlayer.teamSide === 1 ? match.group1Id : match.group2Id;
              const playerWon = matchPlayer.teamSide === winnerTeam;

              // Get individual player score
              let individualPlayerScore: number;
              if (match.tournament?.matchType === 'SINGLES') {
                individualPlayerScore = matchPlayer.teamSide === 1 ? team1Score : team2Score;
              } else {
                individualPlayerScore = playerScores?.[matchPlayer.playerId] ?? 0;
              }

              // Calculate tournament points
              const tournamentPoints = playerWon ? pointsForWin : pointsForLoss;
              const playersOnTeam = matchPlayer.teamSide === 1 ? team1Players : team2Players;
              const playerShareOfTournamentPoints = playersOnTeam > 0 
                ? tournamentPoints / playersOnTeam 
                : tournamentPoints;

              await tx.matchPerformance.upsert({
                where: {
                  matchId_playerId: {
                    matchId,
                    playerId: matchPlayer.playerId,
                  },
                },
                create: {
                  matchId,
                  playerId: matchPlayer.playerId,
                  groupId: playerGroupId,
                  teamSide: matchPlayer.teamSide,
                  gamePoints: individualPlayerScore,
                  tournamentPoints: playerShareOfTournamentPoints,
                  won: playerWon,
                },
                update: {
                  gamePoints: individualPlayerScore,
                  tournamentPoints: playerShareOfTournamentPoints,
                  won: playerWon,
                },
              });
            }

            // Create team performances for doubles
            if (match.tournament?.matchType === 'DOUBLES' && match.team1Id && match.team2Id) {
              await tx.teamPerformance.upsert({
                where: {
                  matchId_teamId: {
                    matchId,
                    teamId: match.team1Id,
                  },
                },
                create: {
                  matchId,
                  teamId: match.team1Id,
                  groupId: match.group1Id,
                  teamSide: 1,
                  gamePoints: team1Score,
                  tournamentPoints: winnerTeam === 1 ? pointsForWin : pointsForLoss,
                  won: winnerTeam === 1,
                },
                update: {
                  gamePoints: team1Score,
                  tournamentPoints: winnerTeam === 1 ? pointsForWin : pointsForLoss,
                  won: winnerTeam === 1,
                },
              });

              await tx.teamPerformance.upsert({
                where: {
                  matchId_teamId: {
                    matchId,
                    teamId: match.team2Id,
                  },
                },
                create: {
                  matchId,
                  teamId: match.team2Id,
                  groupId: match.group2Id,
                  teamSide: 2,
                  gamePoints: team2Score,
                  tournamentPoints: winnerTeam === 2 ? pointsForWin : pointsForLoss,
                  won: winnerTeam === 2,
                },
                update: {
                  gamePoints: team2Score,
                  tournamentPoints: winnerTeam === 2 ? pointsForWin : pointsForLoss,
                  won: winnerTeam === 2,
                },
              });
            }
          }
        });

        updatedMatches.push({
          matchId,
          team1Score,
          team2Score,
          winnerTeam,
        });
      } catch (err) {
        errors.push(
          `Match ${result.matchId}: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedMatches.length} matches`,
      updated: updatedMatches.length,
      total: results.length,
      matches: updatedMatches,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in bulk results update:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update match results';
    return NextResponse.json(
      {
        error: 'Failed to update match results',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
