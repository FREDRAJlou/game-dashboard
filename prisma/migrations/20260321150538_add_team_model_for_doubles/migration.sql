/*
  Warnings:

  - You are about to drop the column `player1Id` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `player2Id` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `team` on the `MatchPlayer` table. All the data in the column will be lost.
  - Added the required column `teamSide` to the `MatchPlayer` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "scheduledAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "team1Id" INTEGER,
    "team2Id" INTEGER,
    "team1Score" INTEGER,
    "team2Score" INTEGER,
    "winnerTeam" INTEGER,
    "notes" TEXT,
    "scheduledById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_scheduledById_fkey" FOREIGN KEY ("scheduledById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("createdAt", "id", "notes", "scheduledAt", "scheduledById", "status", "team1Id", "team1Score", "team2Id", "team2Score", "type", "updatedAt", "winnerTeam") SELECT "createdAt", "id", "notes", "scheduledAt", "scheduledById", "status", "team1Id", "team1Score", "team2Id", "team2Score", "type", "updatedAt", "winnerTeam" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE TABLE "new_MatchPlayer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "teamSide" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MatchPlayer" ("id", "matchId", "playerId", "position") SELECT "id", "matchId", "playerId", "position" FROM "MatchPlayer";
DROP TABLE "MatchPlayer";
ALTER TABLE "new_MatchPlayer" RENAME TO "MatchPlayer";
CREATE UNIQUE INDEX "MatchPlayer_matchId_playerId_key" ON "MatchPlayer"("matchId", "playerId");
CREATE UNIQUE INDEX "MatchPlayer_matchId_teamSide_position_key" ON "MatchPlayer"("matchId", "teamSide", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
