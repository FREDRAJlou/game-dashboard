# Bulk Match Import - Single Shot Solution

## Overview
You can now create AND complete matches in a single API call! No need to schedule first and then add results separately.

## What's Been Created

### 1. Combined API Endpoint
**File:** `/src/app/api/matches/bulk-complete/route.ts`

This API creates matches as COMPLETED from the start with all performance records.

**Endpoint:** `POST /api/matches/bulk-complete`

**Request Body:**
```json
{
  "matches": [
    {
      "player1Name": "John Doe",
      "group1Name": "A",
      "player2Name": "Jane Smith",
      "group2Name": "B",
      "player1Score": 21,
      "player2Score": 15,
      "winnerTeam": 1,
      "session": "Session1",
      "scheduledAt": "2025-01-15T10:00:00Z",
      "stage": "GROUP_STAGE"
    }
  ],
  "scheduledById": 1,
  "tournamentId": 1
}
```

**What It Does:**
1. ✅ Creates Match record with status=COMPLETED
2. ✅ Creates MatchPlayer records (links players to match)
3. ✅ Creates MatchPerformance records (individual stats with tournament points)
4. ✅ All in a single database transaction

### 2. CSV Template
**File:** `/bulk_complete_template.csv`

Format:
```csv
Session,Player1Name,Group1Name,Player2Name,Group2Name,Player1Score,Player2Score,WinnerTeam,ScheduledAt,Stage
Session1,John Doe,A,Jane Smith,B,21,15,1,2025-01-15T10:00:00Z,GROUP_STAGE
Session1,Mike Johnson,A,Sarah Williams,C,18,21,2,2025-01-15T10:30:00Z,GROUP_STAGE
```

**Field Descriptions:**
- `Session`: Optional session identifier (e.g., "Session1", "Session2")
- `Player1Name`: Exact name of player 1 (must exist in database)
- `Group1Name`: Group letter/name for player 1 (e.g., "A", "B", "C")
- `Player2Name`: Exact name of player 2 (must exist in database)
- `Group2Name`: Group letter/name for player 2
- `Player1Score`: Score for player 1 (integer)
- `Player2Score`: Score for player 2 (integer)
- `WinnerTeam`: 1 or 2 (must match scores: 1 if player1Score > player2Score)
- `ScheduledAt`: Optional ISO datetime (leave blank to use current time)
- `Stage`: Optional stage (GROUP_STAGE, SEMI_FINAL, FINAL - defaults to GROUP_STAGE)

### 3. UI Component
**File:** `/src/components/BulkCompleteMatches.tsx`

A dialog component with 3-step wizard:
1. **Paste CSV**: Paste your CSV data
2. **Preview**: Review parsed matches before import
3. **Results**: See what was created and any errors

## How to Use

### Option 1: Using the API Directly

```bash
curl -X POST http://localhost:3000/api/matches/bulk-complete \
  -H "Content-Type: application/json" \
  -d '{
    "matches": [
      {
        "player1Name": "John Doe",
        "group1Name": "A",
        "player2Name": "Jane Smith",
        "group2Name": "B",
        "player1Score": 21,
        "player2Score": 15,
        "winnerTeam": 1,
        "session": "Session1"
      }
    ],
    "scheduledById": 1,
    "tournamentId": 1
  }'
```

### Option 2: Using the UI Component

Add to your dashboard:

```tsx
import BulkCompleteMatches from '@/components/BulkCompleteMatches';

// In your component:
const [bulkCompleteOpen, setBulkCompleteOpen] = useState(false);

// Button to open dialog:
<Button onClick={() => setBulkCompleteOpen(true)}>
  Bulk Import Completed Matches
</Button>

// Dialog component:
<BulkCompleteMatches
  open={bulkCompleteOpen}
  onOpenChange={setBulkCompleteOpen}
  userId={user.id}
  tournamentId={tournament.id}
  onComplete={() => {
    // Refresh your matches list
    fetchMatches();
  }}
/>
```

## Tournament ID Mapping

The tournament ID is provided in the API request body, not in the CSV. This allows you to:
1. Import the same CSV data into different tournaments
2. Keep your CSV simple and focused on match data
3. Prevent accidental cross-tournament imports

## Database Records Created

For each match, the API creates:

1. **Match** record:
   - `status`: COMPLETED
   - `type`: SINGLES
   - `stage`: GROUP_STAGE (or specified stage)
   - `team1Score`, `team2Score`, `winnerTeam`
   - `scheduledAt`, `scheduledById`, `tournamentId`
   - `group1Id`, `group2Id`
   - `notes`: Contains session info if provided

2. **MatchPlayer** records (2 per match):
   - Links players to the match
   - `teamSide`: 1 or 2
   - `position`: 1 (for singles)

3. **MatchPerformance** records (2 per match):
   - Individual player statistics
   - `gamePoints`: The actual score (21, 15, etc.)
   - `tournamentPoints`: Points awarded (3 for win, 0 for loss by default)
   - `won`: true/false
   - `groupId`, `teamSide`

**Note:** TeamPerformance records are NOT created for SINGLES matches (only for DOUBLES with team IDs).

## Validation

The API validates:
- ✅ All required fields present
- ✅ Player names exist in database
- ✅ Group names exist in tournament
- ✅ Scores are valid (non-negative)
- ✅ Winner team (1 or 2) matches the scores
- ✅ User has admin or scoring admin permissions

Errors are returned per-match so partial imports can succeed.

## Response Format

```json
{
  "success": true,
  "summary": {
    "total": 10,
    "created": 9,
    "errors": 1
  },
  "results": {
    "created": [
      {
        "matchId": 123,
        "player1": "John Doe",
        "player2": "Jane Smith",
        "score": "21-15",
        "winner": "John Doe",
        "session": "Session1"
      }
    ],
    "errors": [
      {
        "match": { ... },
        "error": "Player not found: Invalid Name"
      }
    ]
  }
}
```

## Comparison: Old vs New Approach

### Old Way (Two Steps):
1. Create scheduled matches: `POST /api/matches/bulk-import`
2. Update with results: `POST /api/matches/bulk-results`
3. Need to track match IDs between steps

### New Way (Single Shot):
1. Create completed matches: `POST /api/matches/bulk-complete` ✨
2. Everything done in one call!

## Examples

### Example 1: Group Stage Matches
```csv
Session,Player1Name,Group1Name,Player2Name,Group2Name,Player1Score,Player2Score,WinnerTeam,ScheduledAt,Stage
1,Alice,A,Bob,B,21,18,1,2025-01-20T09:00:00Z,GROUP_STAGE
1,Charlie,A,Diana,C,15,21,2,2025-01-20T09:30:00Z,GROUP_STAGE
2,Alice,A,Diana,C,21,19,1,2025-01-20T10:00:00Z,GROUP_STAGE
```

### Example 2: Semi-Finals
```csv
Session,Player1Name,Group1Name,Player2Name,Group2Name,Player1Score,Player2Score,WinnerTeam,ScheduledAt,Stage
SF1,Alice,A,Bob,B,21,19,1,2025-01-21T14:00:00Z,SEMI_FINAL
SF2,Charlie,A,Diana,C,18,21,2,2025-01-21T14:30:00Z,SEMI_FINAL
```

### Example 3: Finals
```csv
Session,Player1Name,Group1Name,Player2Name,Group2Name,Player1Score,Player2Score,WinnerTeam,ScheduledAt,Stage
FINAL,Alice,A,Diana,C,21,20,1,2025-01-21T16:00:00Z,FINAL
```

## Notes

- **Player Names**: Must match exactly (case-insensitive)
- **Group Names**: Must exist in the specified tournament
- **Tournament Points**: Uses tournament's `pointsForWin` and `pointsForLoss` settings
- **Stage Points**: Currently uses same points for all stages (can be enhanced later)
- **SINGLES Only**: This API is for SINGLES matches (DOUBLES would require team IDs)
- **Session Field**: Optional, stored in match notes for reference

## Tips

1. **Test with small CSV first**: Try 2-3 matches to verify player/group names
2. **Use Excel/Sheets**: Easier to prepare CSV with proper formatting
3. **Check names**: Run `GET /api/players` and `GET /api/groups` to get exact names
4. **Backup data**: Take database backup before bulk imports
5. **Review preview**: Always check the preview step in UI before confirming

## Troubleshooting

**"Player not found"**: Check exact spelling and case of player names
**"Group not found"**: Verify group exists in tournament, check name/letter
**"Winner doesn't match scores"**: Ensure winnerTeam is 1 when player1Score > player2Score, or 2 when player2Score > player1Score
**"Tournament not found"**: Check tournamentId in request body
**"Permission denied"**: User must be admin or scoring admin
