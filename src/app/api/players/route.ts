import { NextResponse } from 'next/server';
import type { MatchPlayer, Match as PrismaMatch, Player as PrismaPlayer, User as PrismaUser } from '@prisma/client';
import { prisma } from '@/lib/prisma';

interface PlayerStats {
  id: number;
  name: string;
  username: string | null;
  isActive: boolean;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
}

export async function GET() {
  try {
    const [players, completedMatches]: [
      Array<PrismaPlayer & { user: Pick<PrismaUser, 'username'> | null }>,
      Array<PrismaMatch & { players: MatchPlayer[] }>
    ] = await Promise.all([
      prisma.player.findMany({
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.match.findMany({
        where: {
          status: 'COMPLETED',
          winnerTeam: {
            not: null,
          },
        },
        include: {
          players: true,
        },
      }),
    ]);

    const statsMap = new Map<number, PlayerStats>();

    players.forEach((player) => {
      statsMap.set(player.id, {
        id: player.id,
        name: player.name,
        username: player.user?.username ?? null,
        isActive: player.isActive,
        wins: 0,
        losses: 0,
        totalGames: 0,
        winRate: 0,
      });
    });

    completedMatches.forEach((match) => {
      match.players.forEach((entry) => {
        const stat = statsMap.get(entry.playerId);
        if (!stat) return;
        stat.totalGames += 1;
        if (entry.teamSide === match.winnerTeam) {
          stat.wins += 1;
        } else {
          stat.losses += 1;
        }
      });
    });

    const playerStats = Array.from(statsMap.values()).map((player) => ({
      ...player,
      winRate:
        player.totalGames > 0
          ? Math.round((player.wins / player.totalGames) * 1000) / 10
          : 0,
    }));

    playerStats.sort(
      (a, b) => b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name)
    );

    return NextResponse.json(playerStats);
  } catch (error) {
    console.error('Error calculating player stats:', error);
    return NextResponse.json({ error: 'Failed to calculate player stats' }, { status: 500 });
  }
}
