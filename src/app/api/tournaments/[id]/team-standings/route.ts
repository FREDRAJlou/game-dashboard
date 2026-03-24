import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/tournaments/:id/team-standings - Get team standings for doubles matches
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tournamentId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const groupIdParam = searchParams.get('groupId');
    const groupId = groupIdParam ? parseInt(groupIdParam) : null;

    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 });
    }

    // Get all team performances for this tournament
    const teamPerformances = await prisma.teamPerformance.findMany({
      where: {
        match: {
          tournamentId,
          type: 'DOUBLES',
          status: 'COMPLETED',
        },
        ...(groupId ? { groupId } : {}),
      },
      include: {
        team: {
          include: {
            players: {
              include: {
                player: true,
              },
            },
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        match: {
          select: {
            id: true,
            scheduledAt: true,
            team1Score: true,
            team2Score: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Aggregate stats by team
    const teamStatsMap = new Map<number, {
      team: any;
      groupName: string;
      groupColor?: string;
      matchesPlayed: number;
      wins: number;
      losses: number;
      tournamentPoints: number;
      gamePointsScored: number;
      gamePointsConceded: number;
      qualified: boolean;
    }>();

    teamPerformances.forEach((perf) => {
      const teamId = perf.teamId;
      
      if (!teamStatsMap.has(teamId)) {
        teamStatsMap.set(teamId, {
          team: {
            id: perf.team.id,
            name: perf.team.name,
            players: perf.team.players.map(tp => ({
              id: tp.player.id,
              name: tp.player.name,
            })),
          },
          groupName: perf.group.name,
          groupColor: perf.group.color || undefined,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          tournamentPoints: 0,
          gamePointsScored: 0,
          gamePointsConceded: 0,
          qualified: perf.team.qualifiedForSemis || false,
        });
      }

      const stats = teamStatsMap.get(teamId)!;
      stats.matchesPlayed++;
      if (perf.won) stats.wins++;
      else stats.losses++;
      stats.tournamentPoints += perf.tournamentPoints;
      stats.gamePointsScored += perf.gamePoints;
      
      // Calculate points conceded from opponent's score
      const opponentScore = perf.teamSide === 1 
        ? (perf.match.team2Score || 0) 
        : (perf.match.team1Score || 0);
      stats.gamePointsConceded += opponentScore;
    });

    // Convert to array and calculate win rates and point differential
    const standings = Array.from(teamStatsMap.values())
      .map((stats) => ({
        ...stats,
        winRate: stats.matchesPlayed > 0 ? (stats.wins / stats.matchesPlayed) * 100 : 0,
        pointDifferential: stats.gamePointsScored - stats.gamePointsConceded,
      }))
      .sort((a, b) => {
        // Sort by: tournament points desc, wins desc, win rate desc, point differential desc
        if (b.tournamentPoints !== a.tournamentPoints) {
          return b.tournamentPoints - a.tournamentPoints;
        }
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        if (b.winRate !== a.winRate) {
          return b.winRate - a.winRate;
        }
        return b.pointDifferential - a.pointDifferential;
      })
      .map((stats, index) => ({
        ...stats,
        rank: index + 1,
      }));

    return NextResponse.json({
      standings,
      totalTeams: standings.length,
    });
  } catch (error) {
    console.error('Error fetching team standings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch team standings';
    return NextResponse.json({ 
      error: 'Failed to fetch team standings',
      details: errorMessage 
    }, { status: 500 });
  }
}
