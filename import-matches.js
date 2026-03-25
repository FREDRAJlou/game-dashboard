#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const TOURNAMENT_ID = 3;  // Change this to your tournament ID
const SCHEDULED_BY_ID = 1; // Change this to your user ID
const API_URL = 'http://localhost:3000/api/matches/bulk-complete';
const CSV_FILE = path.join(__dirname, 'bulk_complete_template.csv');

// Read and parse CSV
const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
const lines = csvContent.trim().split('\n');

// Skip header row
const matches = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const parts = line.split(',').map(p => p.trim());
  if (parts.length < 7) {
    console.error(`⚠️  Line ${i + 1}: Not enough columns, skipping`);
    continue;
  }

  const [player1Name, group1Name, player2Name, group2Name, player1ScoreStr, player2ScoreStr, winnerTeamStr, scheduledAt, stage] = parts;

  matches.push({
    player1Name,
    group1Name,
    player2Name,
    group2Name,
    player1Score: parseInt(player1ScoreStr),
    player2Score: parseInt(player2ScoreStr),
    winnerTeam: parseInt(winnerTeamStr),
    scheduledAt: scheduledAt || undefined,
    stage: stage || 'GROUP_STAGE',
  });
}

console.log(`📊 Found ${matches.length} matches to import\n`);

// Make API call
const payload = {
  tournamentId: TOURNAMENT_ID,
  scheduledById: SCHEDULED_BY_ID,
  matches,
};

fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ Import Complete!\n');
    console.log(`Total: ${data.summary.total}`);
    console.log(`Created: ${data.summary.created}`);
    console.log(`Errors: ${data.summary.errors}\n`);

    if (data.results.created.length > 0) {
      console.log('📝 Successfully Created:');
      data.results.created.forEach(m => {
        console.log(`  Match ${m.matchId}: ${m.player1} vs ${m.player2} (${m.score}) - Winner: ${m.winner}`);
      });
      console.log('');
    }

    if (data.results.errors.length > 0) {
      console.log('❌ Errors:');
      data.results.errors.forEach(err => {
        console.log(`  ${err.error}`);
        console.log(`  Match: ${err.match.player1Name} vs ${err.match.player2Name}`);
      });
    }
  })
  .catch(err => {
    console.error('❌ Import failed:', err.message);
  });
