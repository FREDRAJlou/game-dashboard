import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type BulkMatchRow = {
  group1: string;
  player1: string;
  group2: string;
  player2: string;
};

// POST /api/matches/bulk-import - Import multiple matches from CSV data
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tournamentId, csvData, scheduledById } = body;

    if (!tournamentId || !csvData || !scheduledById) {
      return NextResponse.json(
        { error: 'Missing required fields: tournamentId, csvData, scheduledById' },
        { status: 400 }
      );
    }

    // Parse CSV data - Format: Group1 [TAB] Player1 [TAB] Group2 [TAB] Player2
    const rows = csvData
      .split('\n')
      .slice(1) // Skip header
      .filter((line: string) => line.trim())
      .map((line: string) => {
        const [group1, player1, group2, player2] = line.split('\t').map((s: string) => s.trim());
        return { group1, player1, group2, player2 };
      });

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid data found in CSV' }, { status: 400 });
    }

    // Get tournament details
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        groups: {
          include: {
            members: {
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

    // Create a map of group names to group IDs (case-insensitive)
    const groupMap = new Map<string, { id: number; name: string }>();
    tournament.groups.forEach((group) => {
      groupMap.set(group.name.toLowerCase(), { id: group.id, name: group.name });
    });

    // Create a map of player names to their player IDs (all players in all groups)
    const allPlayers = new Map<string, number>();
    tournament.groups.forEach((group) => {
      group.members.forEach((member) => {
        const playerName = member.player.name.toLowerCase();
        allPlayers.set(playerName, member.player.id);
      });
    });

    // Parse matches and validate
    const matchesToCreate = [];
    const errors = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      try {
        if (!row.group1 || !row.player1 || !row.group2 || !row.player2) {
          errors.push(`Row ${index + 1}: Missing required fields (Group1, Player1, Group2, Player2)`);
          continue;
        }

        const player1Name = row.player1.trim().toLowerCase();
        const group1Name = row.group1.trim().toLowerCase();
        const player2Name = row.player2.trim().toLowerCase();
        const group2Name = row.group2.trim().toLowerCase();

        // Look up player IDs
        const player1Id = allPlayers.get(player1Name);
        const player2Id = allPlayers.get(player2Name);

        if (!player1Id) {
          errors.push(`Row ${index + 1}: Player "${row.player1}" not found in tournament`);
          continue;
        }

        if (!player2Id) {
          errors.push(`Row ${index + 1}: Player "${row.player2}" not found in tournament`);
          continue;
        }

        // Look up groups
        const group1 = groupMap.get(group1Name);
        const group2 = groupMap.get(group2Name);

        if (!group1) {
          errors.push(`Row ${index + 1}: Group "${row.group1}" not found in tournament`);
          continue;
        }

        if (!group2) {
          errors.push(`Row ${index + 1}: Group "${row.group2}" not found in tournament`);
          continue;
        }

        matchesToCreate.push({
          player1: { id: player1Id, name: row.player1.trim(), groupId: group1.id, groupName: group1.name },
          player2: { id: player2Id, name: row.player2.trim(), groupId: group2.id, groupName: group2.name },
          originalText: `${row.player1} (${row.group1}) vs ${row.player2} (${row.group2})`,
        });
      } catch (err) {
        errors.push(`Row ${index + 1}: Error parsing - ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    if (matchesToCreate.length === 0) {
      return NextResponse.json(
        { 
          error: 'No valid matches to create',
          errors,
          parsed: 0,
          created: 0,
        },
        { status: 400 }
      );
    }

    // Create matches in database
    const createdMatches = [];
    const creationErrors = [];

    for (let index = 0; index < matchesToCreate.length; index++) {
      const matchData = matchesToCreate[index];
      try {
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + index); // Stagger by index

        const match = await prisma.match.create({
          data: {
            tournamentId,
            type: 'SINGLES',
            stage: 'GROUP_STAGE',
            status: 'SCHEDULED',
            scheduledAt,
            scheduledById,
            group1Id: matchData.player1.groupId,
            group2Id: matchData.player2.groupId,
            players: {
              create: [
                {
                  playerId: matchData.player1.id,
                  teamSide: 1,
                  position: 1,
                },
                {
                  playerId: matchData.player2.id,
                  teamSide: 2,
                  position: 1,
                },
              ],
            },
          },
          include: {
            players: {
              include: {
                player: true,
              },
            },
            group1: true,
            group2: true,
          },
        });

        createdMatches.push({
          id: match.id,
          player1: matchData.player1.name,
          player2: matchData.player2.name,
          group1: matchData.player1.groupName,
          group2: matchData.player2.groupName,
        });
      } catch (err) {
        creationErrors.push(
          `Match ${index + 1}: Failed to create - ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdMatches.length} matches`,
      parsed: rows.length,
      created: createdMatches.length,
      matches: createdMatches,
      errors: [...errors, ...creationErrors],
    });
  } catch (error) {
    console.error('Error in bulk match import:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to import matches';
    return NextResponse.json(
      {
        error: 'Failed to import matches',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
