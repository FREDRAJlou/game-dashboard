import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function checkMissingMatches() {
  try {
    // Get the latest tournament
    const latestTournament = await prisma.tournament.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true }
    });
    
    if (!latestTournament) {
      console.log('❌ No tournaments found in database');
      return;
    }
    
    const tournamentId = latestTournament.id;
    console.log(`🏆 Checking tournament: "${latestTournament.name}" (ID: ${tournamentId})\n`);
    
    // Read CSV file
    const csvContent = fs.readFileSync('tournament_matches.csv', 'utf-8');
    const csvLines = csvContent.split('\n').slice(1).filter(line => line.trim());
    
    console.log(`📋 CSV has ${csvLines.length} matches\n`);
    
    // Parse CSV matches
    const csvMatches = csvLines.map((line, index) => {
      const [group1, player1, group2, player2] = line.split('\t').map(s => s.trim());
      return {
        index: index + 1,
        group1,
        player1: player1.toLowerCase(),
        group2,
        player2: player2.toLowerCase(),
        key: `${player1.toLowerCase()}_${player2.toLowerCase()}`
      };
    });
    
    // Get all matches from database for this tournament
    const dbMatches = await prisma.match.findMany({
      where: {
        tournamentId,
        // Remove status filter to get all matches
      },
      include: {
        players: {
          include: {
            player: true,
          },
          orderBy: {
            teamSide: 'asc'
          }
        },
        group1: true,
        group2: true,
      },
    });
    
    console.log(`🗄️  Database has ${dbMatches.length} total matches for tournament ${tournamentId}`);
    console.log(`   - Scheduled: ${dbMatches.filter(m => m.status === 'SCHEDULED').length}`);
    console.log(`   - In Progress: ${dbMatches.filter(m => m.status === 'IN_PROGRESS').length}`);
    console.log(`   - Completed: ${dbMatches.filter(m => m.status === 'COMPLETED').length}\n`);
    
    // Create a set of match keys from database
    const dbMatchKeys = new Set(
      dbMatches.map(m => {
        const player1 = m.players.find(p => p.teamSide === 1)?.player.name.toLowerCase();
        const player2 = m.players.find(p => p.teamSide === 2)?.player.name.toLowerCase();
        return `${player1}_${player2}`;
      })
    );
    
    // Find missing matches
    const missingMatches = csvMatches.filter(csvMatch => 
      !dbMatchKeys.has(csvMatch.key)
    );
    
    if (missingMatches.length === 0) {
      console.log('✅ All CSV matches exist in the database!');
    } else {
      console.log(`❌ Missing ${missingMatches.length} matches:\n`);
      
      for (const match of missingMatches) {
        console.log(`Row ${match.index}: ${match.player1} (${match.group1}) vs ${match.player2} (${match.group2})`);
        
        // Check if players exist
        const player1Exists = await prisma.player.findFirst({
          where: { name: { equals: match.player1, mode: 'insensitive' } }
        });
        
        const player2Exists = await prisma.player.findFirst({
          where: { name: { equals: match.player2, mode: 'insensitive' } }
        });
        
        if (!player1Exists) {
          console.log(`  ⚠️  Player "${match.player1}" does not exist in database`);
        }
        if (!player2Exists) {
          console.log(`  ⚠️  Player "${match.player2}" does not exist in database`);
        }
        
        // Check if players are in tournament groups
        if (player1Exists) {
          const group1 = await prisma.group.findFirst({
            where: {
              name: { equals: match.group1, mode: 'insensitive' },
              tournamentId
            },
            include: {
              members: {
                where: {
                  playerId: player1Exists.id
                }
              }
            }
          });
          
          if (!group1 || group1.members.length === 0) {
            console.log(`  ⚠️  Player "${match.player1}" is not in group "${match.group1}"`);
          }
        }
        
        if (player2Exists) {
          const group2 = await prisma.group.findFirst({
            where: {
              name: { equals: match.group2, mode: 'insensitive' },
              tournamentId
            },
            include: {
              members: {
                where: {
                  playerId: player2Exists.id
                }
              }
            }
          });
          
          if (!group2 || group2.members.length === 0) {
            console.log(`  ⚠️  Player "${match.player2}" is not in group "${match.group2}"`);
          }
        }
        
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMissingMatches();
