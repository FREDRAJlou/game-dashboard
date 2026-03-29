import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    // Get group with members and tournament info
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        tournament: true,
        members: {
          include: {
            player: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Get all completed matches in this tournament for this group
    const completedMatches = await prisma.match.findMany({
      where: {
        tournamentId: group.tournamentId,
        OR: [
          { group1Id: groupId },
          { group2Id: groupId },
        ],
        status: 'COMPLETED',
      },
      include: {
        players: {
          include: { player: true },
        },
        performances: true,  // Include MatchPerformance records
      },
    });

    // Get total scheduled matches (all statuses) for this group
    const totalScheduledMatches = await prisma.match.count({
      where: {
        tournamentId: group.tournamentId,
        OR: [
          { group1Id: groupId },
          { group2Id: groupId },
        ],
      },
    });

    // Calculate standings for this group
    const playerStats = new Map<number, {
      player: { id: number; name: string };
      matches: number;
      wins: number;
      losses: number;
      pointsScored: number;           // Game score points (actual points in matches)
      pointsConceded: number;
      tournamentPoints: number;       // Tournament standings points
    }>();

    // Initialize stats for all group members
    group.members.forEach((member) => {
      playerStats.set(member.playerId, {
        player: { id: member.player.id, name: member.player.name },
        matches: 0,
        wins: 0,
        losses: 0,
        pointsScored: 0,
        pointsConceded: 0,
        tournamentPoints: 0,
      });
    });

    // Calculate stats from matches
    completedMatches.forEach((match) => {
      match.players.forEach((mp: any) => {
        const stats = playerStats.get(mp.playerId);
        if (!stats) return; // Player not in this group

        stats.matches++;
        
        // Get individual player scores from MatchPerformance records
        const performance = match.performances?.find((perf: any) => perf.playerId === mp.playerId);
        
        if (performance) {
          // Use the actual individual player score stored in MatchPerformance
          stats.pointsScored += performance.gamePoints || 0;  // Changed from points to gamePoints
          stats.tournamentPoints += performance.tournamentPoints || 0;
        }
        
        // Calculate points conceded (opponent's score)
        const opponentScore = mp.teamSide === 1 ? match.team2Score : match.team1Score;
        if (opponentScore !== null) {
          // For doubles, divide opponent score by their team size
          const opponentTeamSize = match.players.filter((p: any) => p.teamSide !== mp.teamSide).length;
          stats.pointsConceded += opponentTeamSize > 0 ? Math.round(opponentScore / opponentTeamSize) : opponentScore;
        }

        if (match.winnerTeam === mp.teamSide) {
          stats.wins++;
        } else {
          stats.losses++;
        }
      });
    });

    // Convert to array and sort by tournament points, then wins, then win rate, then point difference
    const standings = Array.from(playerStats.values())
      .sort((a, b) => {
        if (b.tournamentPoints !== a.tournamentPoints) return b.tournamentPoints - a.tournamentPoints;
        if (b.wins !== a.wins) return b.wins - a.wins;
        const aWinRate = a.matches > 0 ? (a.wins / a.matches) : 0;
        const bWinRate = b.matches > 0 ? (b.wins / b.matches) : 0;
        if (bWinRate !== aWinRate) return bWinRate - aWinRate;
        // Use point difference instead of just points scored
        const aPointDiff = a.pointsScored - a.pointsConceded;
        const bPointDiff = b.pointsScored - b.pointsConceded;
        return bPointDiff - aPointDiff;
      });

    // Calculate group statistics
    const totalCompletedMatches = completedMatches.length;
    const completionRate = totalScheduledMatches > 0 
      ? Math.round((totalCompletedMatches / totalScheduledMatches) * 100) 
      : 0;

    // Calculate competitiveness (average score differential)
    let totalDifferential = 0;
    completedMatches.forEach((match) => {
      if (match.team1Score !== null && match.team2Score !== null) {
        totalDifferential += Math.abs(match.team1Score - match.team2Score);
      }
    });
    const avgDifferential = totalCompletedMatches > 0 ? Math.round(totalDifferential / totalCompletedMatches) : 0;

    // Prepare chart data
    const chartData = {
      standingsPoints: standings.map((s) => ({
        player: s.player.name,
        points: s.pointsScored,         // Show game score points in chart
        tournamentPoints: s.tournamentPoints,  // Also include tournament points
        wins: s.wins,
      })),
      participation: standings.map((s) => ({
        player: s.player.name,
        matches: s.matches,
      })),
      competitiveness: completedMatches
        .filter((m) => m.team1Score !== null && m.team2Score !== null)
        .map((m, index) => ({
          match: `Match ${index + 1}`,
          differential: Math.abs((m.team1Score || 0) - (m.team2Score || 0)),
        })),
    };

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        color: group.color,
        tournamentId: group.tournamentId,
        tournamentName: group.tournament?.name,
      },
      standings,
      stats: {
        totalCompletedMatches,
        totalScheduledMatches,
        completionRate,
        avgScoreDifferential: avgDifferential,
      },
      chartData,
    });
  } catch (error) {
    console.error('Error fetching group analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch group analytics' }, { status: 500 });
  }
}
