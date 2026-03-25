import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type BulkMatchRow = {
  session: number;
  match: string;
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

    // Parse CSV data
    const rows = csvData
      .split('\n')
      .slice(1) // Skip header
      .filter((line: string) => line.trim())
      .map((line: string) => {
        const [session, match] = line.split('\t').map((s: string) => s.trim());
        return { session: parseInt(session), match };
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

    // Create a map of player names to their details
    const playerMap = new Map<string, { id: number; groupId: number; groupName: string }>();
    tournament.groups.forEach((group) => {
      group.members.forEach((member) => {
        const playerName = member.player.name.toLowerCase();
        playerMap.set(playerName, {
          id: member.player.id,
          groupId: group.id,
          groupName: group.name,
        });
      });
    });

    // Parse matches and validate
    const matchesToCreate = [];
    const errors = [];

    for (const row of rows) {
      try {
        // Parse match string: "PlayerName1 (GroupLetter) vs PlayerName2 (GroupLetter)"
        const matchRegex = /^(.+?)\s*\(([A-Z])\)\s*vs\s*(.+?)\s*\(([A-Z])\)$/i;
        const match = row.match.match(matchRegex);

        if (!match) {
          errors.push(`Session ${row.session}: Invalid match format - ${row.match}`);
          continue;
        }

        const player1Name = match[1].trim().toLowerCase();
        const group1Letter = match[2];
        const player2Name = match[3].trim().toLowerCase();
        const group2Letter = match[4];

        const player1 = playerMap.get(player1Name);
        const player2 = playerMap.get(player2Name);

        if (!player1) {
          errors.push(`Session ${row.session}: Player "${match[1]}" not found`);
          continue;
        }

        if (!player2) {
          errors.push(`Session ${row.session}: Player "${match[3]}" not found`);
          continue;
        }

        matchesToCreate.push({
          session: row.session,
          player1: { ...player1, name: match[1] },
          player2: { ...player2, name: match[3] },
          originalText: row.match,
        });
      } catch (err) {
        errors.push(`Session ${row.session}: Error parsing - ${err instanceof Error ? err.message : 'Unknown error'}`);
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

    for (const matchData of matchesToCreate) {
      try {
        const scheduledAt = new Date();
        scheduledAt.setHours(scheduledAt.getHours() + matchData.session); // Stagger by session number

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
          session: matchData.session,
          player1: matchData.player1.name,
          player2: matchData.player2.name,
          group1: matchData.player1.groupName,
          group2: matchData.player2.groupName,
        });
      } catch (err) {
        creationErrors.push(
          `Session ${matchData.session}: Failed to create - ${err instanceof Error ? err.message : 'Unknown error'}`
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
