import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playerId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const tournamentIdParam = searchParams.get('tournamentId');
    const tournamentId = tournamentIdParam ? parseInt(tournamentIdParam) : null;

    if (isNaN(playerId)) {
      return NextResponse.json({ error: 'Invalid player ID' }, { status: 400 });
    }

    // Get player info
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get all completed SINGLES matches for this player (global stats)
    const playerMatches = await prisma.match.findMany({
      where: {
        players: {
          some: { playerId: playerId },
        },
        status: 'COMPLETED',
        tournament: {
          matchType: 'SINGLES',  // Only singles matches for player stats
          ...(tournamentId ? { id: tournamentId } : {}),  // Optional tournament filter
        },
      },
      include: {
        players: {
          include: { player: true },
        },
        performances: true,  // Include MatchPerformance records
        tournament: true,
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    });

    // Calculate overall statistics
    const totalMatches = playerMatches.length;
    let wins = 0;
    let losses = 0;
    let totalGamePointsScored = 0;  // Individual game points
    let totalGamePointsConceded = 0;
    let totalTournamentPoints = 0;  // Tournament standings points

    // Stats by type with separate game points and tournament points
    let singlesWins = 0;
    let singlesLosses = 0;
    let singlesGamePoints = 0;
    let singlesTournamentPoints = 0;
    
    let doublesWins = 0;
    let doublesLosses = 0;
    let doublesGamePoints = 0;
    let doublesTournamentPoints = 0;

    // Stats by stage
    const stageStats: Record<string, { wins: number; losses: number }> = {
      GROUP_STAGE: { wins: 0, losses: 0 },
      QUARTER_FINAL: { wins: 0, losses: 0 },
      SEMI_FINAL: { wins: 0, losses: 0 },
      FINAL: { wins: 0, losses: 0 },
    };

    // Process each match
    const recentForm: Array<{
      matchId: number;
      result: 'WIN' | 'LOSS';
      points: number;
      opponentPoints: number;
      date: Date;
      opponent: string;
      type: string;
    }> = [];

    playerMatches.forEach((match) => {
      const playerSide = match.players.find((p: { playerId: number }) => p.playerId === playerId)?.teamSide;
      const isWin = match.winnerTeam === playerSide;
      
      // Get individual player performance record
      const performance = (match as any).performances?.find((perf: any) => perf.playerId === playerId);
      const playerGamePoints = performance?.gamePoints || 0;  // Individual game score
      const playerTournamentPoints = performance?.tournamentPoints || 0;  // Tournament standings points
      
      // Get opponent's score
      const opponentScore = playerSide === 1 ? match.team2Score : match.team1Score;
      const opponentTeamSize = match.players.filter((p: any) => p.teamSide !== playerSide).length;
      const opponentPointsShare = opponentTeamSize > 0 ? Math.round((opponentScore || 0) / opponentTeamSize) : (opponentScore || 0);

      // Get opponent name(s) - only players from the opposing team
      const opponents = match.players
        .filter((p: { playerId: number; teamSide: number }) => 
          p.playerId !== playerId && p.teamSide !== playerSide
        )
        .map((p: { player: { name: string } }) => p.player.name)
        .join(' & ');

      if (isWin) {
        wins++;
        if (match.type === 'SINGLES') {
          singlesWins++;
          singlesGamePoints += playerGamePoints;
          singlesTournamentPoints += playerTournamentPoints;
        } else {
          doublesWins++;
          doublesGamePoints += playerGamePoints;
          doublesTournamentPoints += playerTournamentPoints;
        }
      } else {
        losses++;
        if (match.type === 'SINGLES') {
          singlesLosses++;
          singlesGamePoints += playerGamePoints;
          singlesTournamentPoints += playerTournamentPoints;
        } else {
          doublesLosses++;
          doublesGamePoints += playerGamePoints;
          doublesTournamentPoints += playerTournamentPoints;
        }
      }

      // Use actual individual player points from performance record
      totalGamePointsScored += playerGamePoints;
      totalGamePointsConceded += opponentPointsShare;
      totalTournamentPoints += playerTournamentPoints;

      // Stage stats
      const matchStage = (match as any).stage;
      if (matchStage && stageStats[matchStage]) {
        if (isWin) {
          stageStats[matchStage].wins++;
        } else {
          stageStats[matchStage].losses++;
        }
      }

      // Recent form (last 10 matches)
      if (recentForm.length < 10) {
        recentForm.push({
          matchId: match.id,
          result: isWin ? 'WIN' : 'LOSS',
          points: playerSide === 1 ? (match.team1Score || 0) : (match.team2Score || 0), // Team score
          opponentPoints: playerSide === 1 ? (match.team2Score || 0) : (match.team1Score || 0), // Opponent team score
          date: match.scheduledAt,
          opponent: opponents,
          type: match.type,
        });
      }
    });

    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
    const singlesWinRate =
      singlesWins + singlesLosses > 0
        ? Math.round((singlesWins / (singlesWins + singlesLosses)) * 100)
        : 0;
    const doublesWinRate =
      doublesWins + doublesLosses > 0
        ? Math.round((doublesWins / (doublesWins + doublesLosses)) * 100)
        : 0;

    // Prepare chart data
    const chartData = {
      winLoss: {
        wins,
        losses,
      },
      pointsByMatch: recentForm.map((match, index) => ({
        match: `M${recentForm.length - index}`,
        points: match.points,
        date: match.date,
      })),
      formTrend: recentForm
        .slice()
        .reverse()
        .map((match, index) => {
          const matchesUpToNow = recentForm.slice(0, index + 1);
          const winsUpToNow = matchesUpToNow.filter((m) => m.result === 'WIN').length;
          const winRateAtPoint = Math.round((winsUpToNow / (index + 1)) * 100);
          return {
            match: `M${index + 1}`,
            winRate: winRateAtPoint,
          };
        }),
      stagePerformance: Object.entries(stageStats)
        .filter(([_, stats]) => stats.wins + stats.losses > 0)
        .map(([stage, stats]) => ({
          stage: stage.replace(/_/g, ' '),
          wins: stats.wins,
          losses: stats.losses,
          total: stats.wins + stats.losses,
        })),
    };

    return NextResponse.json({
      player: {
        id: player.id,
        name: player.name,
      },
      overall: {
        totalMatches,
        wins,
        losses,
        winRate,
        gamePointsScored: totalGamePointsScored,  // Total individual game points
        gamePointsConceded: totalGamePointsConceded,
        tournamentPoints: totalTournamentPoints,  // Total tournament standings points
        avgGamePointsPerMatch: totalMatches > 0 ? Math.round(totalGamePointsScored / totalMatches) : 0,
      },
      singles: {
        matches: singlesWins + singlesLosses,
        wins: singlesWins,
        losses: singlesLosses,
        winRate: singlesWinRate,
        gamePoints: singlesGamePoints,  // Game points in singles
        tournamentPoints: singlesTournamentPoints,  // Tournament points from singles
        avgGamePointsPerMatch: (singlesWins + singlesLosses) > 0 ? Math.round(singlesGamePoints / (singlesWins + singlesLosses)) : 0,
      },
      doubles: {
        matches: doublesWins + doublesLosses,
        wins: doublesWins,
        losses: doublesLosses,
        winRate: doublesWinRate,
        gamePoints: doublesGamePoints,  // Game points in doubles (individual contribution)
        tournamentPoints: doublesTournamentPoints,  // Tournament points from doubles (divided by 2)
        avgGamePointsPerMatch: (doublesWins + doublesLosses) > 0 ? Math.round(doublesGamePoints / (doublesWins + doublesLosses)) : 0,
      },
      byType: {
        singles: {
          matches: singlesWins + singlesLosses,
          wins: singlesWins,
          losses: singlesLosses,
          winRate: singlesWinRate,
        },
        doubles: {
          matches: doublesWins + doublesLosses,
          wins: doublesWins,
          losses: doublesLosses,
          winRate: doublesWinRate,
        },
      },
      byStage: stageStats,
      recentForm,
      chartData,
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json({ error: 'Failed to fetch player stats' }, { status: 500 });
  }
}
