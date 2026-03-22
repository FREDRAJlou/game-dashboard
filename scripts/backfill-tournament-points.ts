/**
 * Backfill tournament points for existing completed matches
 * Run this to update old MatchPerformance records with tournament points
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillTournamentPoints() {
  console.log('Starting tournament points backfill...\n');

  try {
    // Get all completed matches with tournament association
    const completedMatches = await prisma.match.findMany({
      where: {
        status: 'COMPLETED',
        tournamentId: { not: null },
        group1Id: { not: null },
        group2Id: { not: null },
      },
      include: {
        tournament: true,
        players: {
          include: { player: true },
        },
        performances: true,
      },
    });

    console.log(`Found ${completedMatches.length} completed tournament matches\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const match of completedMatches) {
      if (!match.tournament) {
        console.log(`Skipping match ${match.id}: No tournament`);
        skippedCount++;
        continue;
      }

      const pointsForWin = match.tournament.pointsForWin ?? 3;
      const pointsForLoss = match.tournament.pointsForLoss ?? 0;

      console.log(`Processing match ${match.id} (${match.type}): ${match.team1Score}-${match.team2Score}`);

      // Count players per team
      const team1Players = match.players.filter(p => p.teamSide === 1).length;
      const team2Players = match.players.filter(p => p.teamSide === 2).length;

      for (const matchPlayer of match.players) {
        const playerWon = matchPlayer.teamSide === match.winnerTeam;
        const tournamentPoints = playerWon ? pointsForWin : pointsForLoss;
        const playersOnTeam = matchPlayer.teamSide === 1 ? team1Players : team2Players;
        const playerShareOfTournamentPoints = playersOnTeam > 0 
          ? Math.round(tournamentPoints / playersOnTeam) 
          : tournamentPoints;

        // Check if performance record exists
        const existingPerf = match.performances.find(p => p.playerId === matchPlayer.playerId);

        if (existingPerf) {
          // Update existing performance record
          await prisma.matchPerformance.update({
            where: { id: existingPerf.id },
            data: {
              tournamentPoints: playerShareOfTournamentPoints,
              won: playerWon,
            },
          });
          console.log(`  ✓ Updated player ${matchPlayer.player.name}: ${playerShareOfTournamentPoints} tournament pts`);
          updatedCount++;
        } else {
          // Create missing performance record
          const playerGroupId = matchPlayer.teamSide === 1 ? match.group1Id : match.group2Id;
          const teamScore = matchPlayer.teamSide === 1 ? match.team1Score : match.team2Score;

          await prisma.matchPerformance.create({
            data: {
              matchId: match.id,
              playerId: matchPlayer.playerId,
              groupId: playerGroupId!,
              teamSide: matchPlayer.teamSide,
              gamePoints: teamScore || 0,  // Fixed: use gamePoints instead of points
              tournamentPoints: playerShareOfTournamentPoints,
              won: playerWon,
            },
          });
          console.log(`  ✓ Created performance for player ${matchPlayer.player.name}: ${playerShareOfTournamentPoints} tournament pts`);
          updatedCount++;
        }
      }
    }

    console.log(`\n✅ Backfill complete!`);
    console.log(`   Updated/Created: ${updatedCount} performance records`);
    console.log(`   Skipped: ${skippedCount} matches`);

  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillTournamentPoints()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
