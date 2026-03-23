import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/matches/:id - Get single match details
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const matchId = parseInt(id);

    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        players: {
          include: {
            player: true,
          },
          orderBy: [{ teamSide: 'asc' }, { position: 'asc' }],
        },
        team1: true,
        team2: true,
        group1: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        group2: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (error) {
    console.error('Error fetching match:', error);
    return NextResponse.json({ error: 'Failed to fetch match' }, { status: 500 });
  }
}

// PATCH /api/matches/:id - Update match score, status, or details
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const matchId = parseInt(id);

    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      team1Score, 
      team2Score, 
      winnerTeam, 
      status, 
      startedAt, 
      completedAt, 
      playerScores,
      scheduledAt,  // New: allow updating schedule time
      notes,        // New: allow updating notes
      players,      // New: allow updating players (array of {playerId, teamSide, position})
      userId,       // User ID making the request for permission checking
    } = body;

    // Check user permissions if changing status or scores
    if (userId && (status || team1Score !== undefined || team2Score !== undefined || startedAt || completedAt)) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Only admin can start match (change to IN_PROGRESS)
      // Both admin and scoring admin can complete match (change to COMPLETED)
      if (status === 'IN_PROGRESS' && !user.isAdmin) {
        return NextResponse.json(
          { error: 'Only administrators can start matches' },
          { status: 403 }
        );
      }

      if ((status === 'COMPLETED' || completedAt) && !user.isAdmin && !user.isScoringAdmin) {
        return NextResponse.json(
          { error: 'Only administrators or scoring administrators can complete matches' },
          { status: 403 }
        );
      }

      // Admin or scoring admin can update scores
      if ((team1Score !== undefined || team2Score !== undefined) && !user.isAdmin && !user.isScoringAdmin) {
        return NextResponse.json(
          { error: 'Only administrators or scoring administrators can update match scores' },
          { status: 403 }
        );
      }
    }

    // Validate match exists
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
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Validate status if provided
    const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    // Validate scores - only enforce strict validation when completing match
    // Allow incremental updates during IN_PROGRESS without winner
    if (status === 'COMPLETED' && team1Score !== undefined && team2Score !== undefined) {
      if (team1Score < 0 || team2Score < 0) {
        return NextResponse.json({ error: 'Scores cannot be negative' }, { status: 400 });
      }

      if (team1Score === team2Score) {
        return NextResponse.json({ error: 'Scores cannot be equal. There must be a winner.' }, { status: 400 });
      }

      if (winnerTeam !== 1 && winnerTeam !== 2) {
        return NextResponse.json({ error: 'Winner team must be 1 or 2' }, { status: 400 });
      }

      // Validate winner matches higher score
      const actualWinner = team1Score > team2Score ? 1 : 2;
      if (actualWinner !== winnerTeam) {
        return NextResponse.json({ error: 'Winner team does not match the scores' }, { status: 400 });
      }
    } else if (team1Score !== undefined || team2Score !== undefined) {
      // For incremental updates during IN_PROGRESS, just validate non-negative
      if ((team1Score !== undefined && team1Score < 0) || (team2Score !== undefined && team2Score < 0)) {
        return NextResponse.json({ error: 'Scores cannot be negative' }, { status: 400 });
      }
    }

    // Determine winner group ID
    let winnerGroupId = null;
    if (winnerTeam === 1 && match.group1Id) {
      winnerGroupId = match.group1Id;
    } else if (winnerTeam === 2 && match.group2Id) {
      winnerGroupId = match.group2Id;
    }

    // Update match in a transaction with increased timeout
    const result = await prisma.$transaction(async (tx) => {
      // Update match
      const updateData: any = {
        team1Score: team1Score !== undefined ? team1Score : match.team1Score,
        team2Score: team2Score !== undefined ? team2Score : match.team2Score,
        winnerTeam: winnerTeam !== undefined ? winnerTeam : match.winnerTeam,
        winnerGroupId,
        status: status || match.status,
        updatedAt: new Date(),
      };

      if (startedAt) updateData.startedAt = new Date(startedAt);
      if (completedAt) updateData.completedAt = new Date(completedAt);
      if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
      if (notes !== undefined) updateData.notes = notes;

      const updatedMatch = await tx.match.update({
        where: { id: matchId },
        data: updateData,
        include: {
          players: {
            include: {
              player: true,
            },
          },
          team1: true,
          team2: true,
          group1: true,
          group2: true,
          tournament: true,
        },
      });

      // Update players if provided
      if (players && Array.isArray(players)) {
        // Delete existing players
        await tx.matchPlayer.deleteMany({
          where: { matchId },
        });

        // Add new players in bulk
        if (players.length > 0) {
          await tx.matchPlayer.createMany({
            data: players.map(player => ({
              matchId,
              playerId: player.playerId,
              teamSide: player.teamSide,
              position: player.position || 1,
            })),
          });
        }
      }

      // If match is completed and has groups, create performance records
      if (status === 'COMPLETED' && match.group1Id && match.group2Id && match.tournament) {
        // Get tournament points configuration
        const pointsForWin = match.tournament.pointsForWin ?? 3;
        const pointsForLoss = match.tournament.pointsForLoss ?? 0;
        
        // Count players per team for tournament points division
        const team1Players = match.players.filter(p => p.teamSide === 1).length;
        const team2Players = match.players.filter(p => p.teamSide === 2).length;
        
        // Create player performances
        for (const matchPlayer of match.players) {
          const playerGroupId = matchPlayer.teamSide === 1 ? match.group1Id : match.group2Id;
          const playerWon = matchPlayer.teamSide === winnerTeam;
          
          // Get individual player's score
          // For singles: use team score
          // For doubles: use individual player score from playerScores
          let individualPlayerScore: number;
          
          if (match.tournament?.matchType === 'SINGLES') {
            individualPlayerScore = matchPlayer.teamSide === 1 ? team1Score : team2Score;
          } else {
            // For doubles, use the individual player score if provided
            individualPlayerScore = playerScores?.[matchPlayer.playerId] ?? 0;
          }
          
          // Calculate tournament points (exact division for doubles, no rounding)
          const tournamentPoints = playerWon ? pointsForWin : pointsForLoss;
          const playersOnTeam = matchPlayer.teamSide === 1 ? team1Players : team2Players;
          const playerShareOfTournamentPoints = playersOnTeam > 0 ? tournamentPoints / playersOnTeam : tournamentPoints;

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
              gamePoints: individualPlayerScore,  // Individual player's actual game score
              tournamentPoints: playerShareOfTournamentPoints,  // Exact division (Float)
              won: playerWon,
            },
            update: {
              gamePoints: individualPlayerScore,  // Individual player's actual game score
              tournamentPoints: playerShareOfTournamentPoints,  // Exact division (Float)
              won: playerWon,
            },
          });
        }

        // Create team performances for doubles matches with team names and tournament points
        if (match.tournament?.matchType === 'DOUBLES' && (match.team1Id || match.team2Id)) {
          // For doubles: team wins, so full tournament points go to the team
          const teamTournamentPoints = pointsForWin;
          
          if (match.team1Id) {
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
                gamePoints: team1Score,  // Team's actual match score
                tournamentPoints: winnerTeam === 1 ? teamTournamentPoints : pointsForLoss,  // Full tournament points
                won: winnerTeam === 1,
              },
              update: {
                gamePoints: team1Score,
                tournamentPoints: winnerTeam === 1 ? teamTournamentPoints : pointsForLoss,
                won: winnerTeam === 1,
              },
            });
          }

          if (match.team2Id) {
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
                gamePoints: team2Score,  // Team's actual match score
                tournamentPoints: winnerTeam === 2 ? teamTournamentPoints : pointsForLoss,  // Full tournament points
                won: winnerTeam === 2,
              },
              update: {
                gamePoints: team2Score,
                tournamentPoints: winnerTeam === 2 ? teamTournamentPoints : pointsForLoss,
                won: winnerTeam === 2,
              },
            });
          }
        }
      }

      return updatedMatch;
    }, {
      maxWait: 15000, // 15 seconds max wait
      timeout: 30000, // 30 seconds total timeout
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });
  }
}

// DELETE /api/matches/:id - Delete a match
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const matchId = parseInt(id);

    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
    }

    // Check if match exists
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, status: true },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Only allow deletion of non-completed matches or allow admin override
    // For now, we'll allow deletion of any match
    await prisma.match.delete({
      where: { id: matchId },
    });

    return NextResponse.json({ message: 'Match deleted successfully' });
  } catch (error) {
    console.error('Error deleting match:', error);
    return NextResponse.json({ error: 'Failed to delete match' }, { status: 500 });
  }
}
