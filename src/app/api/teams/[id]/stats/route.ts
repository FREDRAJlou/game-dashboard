import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const tournamentIdParam = searchParams.get('tournamentId');
    const tournamentId = tournamentIdParam ? parseInt(tournamentIdParam) : null;

    if (isNaN(teamId)) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
    }

    // Get team info
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        players: {
          include: {
            player: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get all team performances (from completed DOUBLES matches) - global stats
    const teamPerformances = await prisma.teamPerformance.findMany({
      where: {
        teamId: teamId,
        match: {
          status: 'COMPLETED',
          tournament: {
            matchType: 'DOUBLES',  // Only doubles matches for team stats
            ...(tournamentId ? { id: tournamentId } : {}),  // Optional tournament filter
          },
        },
      },
      include: {
        match: {
          include: {
            tournament: true,
            group1: true,
            group2: true,
          },
        },
        group: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate overall statistics
    const totalMatches = teamPerformances.length;
    let wins = 0;
    let losses = 0;
    let totalGamePointsScored = 0;  // Team's actual match scores
    let totalGamePointsConceded = 0;
    let totalTournamentPoints = 0;  // Tournament standings points

    // Recent form (last 10 matches)
    const recentForm: Array<{
      matchId: number;
      result: 'WIN' | 'LOSS';
      gamePoints: number;
      opponentPoints: number;
      tournamentPoints: number;
      date: Date;
      opponent: string;
      tournament: string;
    }> = [];

    teamPerformances.forEach((performance) => {
      const isWin = performance.won;

      if (isWin) {
        wins++;
      } else {
        losses++;
      }

      totalGamePointsScored += performance.gamePoints || 0;
      totalTournamentPoints += performance.tournamentPoints || 0;

      // Get opponent's score
      const opponentScore = performance.teamSide === 1 
        ? performance.match.team2Score 
        : performance.match.team1Score;
      
      totalGamePointsConceded += opponentScore || 0;

      // Get opponent group name
      const opponentGroup = performance.teamSide === 1 
        ? performance.match.group2 
        : performance.match.group1;

      // Recent form (last 10 matches)
      if (recentForm.length < 10) {
        recentForm.push({
          matchId: performance.match.id,
          result: isWin ? 'WIN' : 'LOSS',
          gamePoints: performance.gamePoints || 0,
          opponentPoints: opponentScore || 0,
          tournamentPoints: performance.tournamentPoints || 0,
          date: performance.match.scheduledAt,
          opponent: opponentGroup?.name || 'Unknown',
          tournament: performance.match.tournament?.name || 'Unknown',
        });
      }
    });

    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    // Prepare chart data
    const chartData = {
      winLoss: {
        wins,
        losses,
      },
      gamePointsByMatch: recentForm.map((match, index) => ({
        match: `M${recentForm.length - index}`,
        points: match.gamePoints,
        date: match.date,
      })),
      tournamentPointsByMatch: recentForm.map((match, index) => ({
        match: `M${recentForm.length - index}`,
        points: match.tournamentPoints,
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
    };

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        players: team.players.map(tp => ({
          id: tp.player.id,
          name: tp.player.name,
        })),
      },
      overall: {
        totalMatches,
        wins,
        losses,
        winRate,
        gamePointsScored: totalGamePointsScored,      // Total team game points
        gamePointsConceded: totalGamePointsConceded,
        tournamentPoints: totalTournamentPoints,      // Total tournament standings points
        avgGamePointsPerMatch: totalMatches > 0 ? Math.round(totalGamePointsScored / totalMatches) : 0,
        avgTournamentPointsPerMatch: totalMatches > 0 ? (totalTournamentPoints / totalMatches).toFixed(1) : '0.0',
      },
      recentForm,
      chartData,
    });
  } catch (error) {
    console.error('Error fetching team stats:', error);
    return NextResponse.json({ error: 'Failed to fetch team stats' }, { status: 500 });
  }
}
