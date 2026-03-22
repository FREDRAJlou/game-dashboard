import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/tournaments/:id/standings - Get tournament standings with group breakdown
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tournamentId = parseInt(id);

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    // Get tournament with groups and matches
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        groups: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                player: true,
              },
            },
          },
        },
        matches: {
          where: { status: 'COMPLETED' },
          include: {
            players: {
              include: {
                player: true,
              },
            },
            performances: {
              include: {
                player: true,
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Calculate standings for each group
    const groupStandings = tournament.groups.map((group) => {
      // Get matches involving this group
      const groupMatches = tournament.matches.filter(
        (match) => match.group1Id === group.id || match.group2Id === group.id
      );

      // Calculate player stats
      const playerStats = group.members.map((member) => {
        // Get performances for this player IN THIS GROUP ONLY
        const playerPerformances = tournament.matches
          .flatMap((m) => m.performances)
          .filter((perf) => perf.playerId === member.playerId && perf.groupId === group.id);

        const wins = playerPerformances.filter((perf) => perf.won).length;
        const losses = playerPerformances.filter((perf) => !perf.won).length;
        
        // Count unique matches (not performance records) - important for doubles
        const uniqueMatchIds = new Set(playerPerformances.map(perf => perf.matchId));
        const matchesPlayed = uniqueMatchIds.size;

        // Calculate total tournament points (for standings)
        const tournamentPoints = playerPerformances.reduce(
          (sum, perf) => sum + perf.tournamentPoints,
          0
        );
        
        // Calculate total game score points (actual points scored in matches)
        const totalGamePointsScored = playerPerformances.reduce(
          (sum, perf) => sum + perf.gamePoints,
          0
        );

        return {
          player: member.player,
          matchesPlayed: matchesPlayed,
          wins,
          losses,
          winRate: matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0,
          tournamentPoints,          // Points for standings (e.g., 3 for win, 0 for loss)
          totalGamePointsScored,     // Actual game points scored in matches
        };
      });

      // Sort by tournament points desc, then wins desc, then win rate desc
      playerStats.sort((a, b) => {
        if (b.tournamentPoints !== a.tournamentPoints) return b.tournamentPoints - a.tournamentPoints;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winRate - a.winRate;
      });

      return {
        group: {
          id: group.id,
          name: group.name,
          color: group.color,
        },
        standings: playerStats,
        totalMatches: groupMatches.length,  // Actual number of matches for this group
      };
    });

    return NextResponse.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        matchType: tournament.matchType,
        status: tournament.status,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
      },
      groupStandings,
      totalMatches: tournament.matches.length,
    });
  } catch (error) {
    console.error('Error fetching tournament standings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tournament standings';
    return NextResponse.json({ 
      error: 'Failed to fetch tournament standings',
      details: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
