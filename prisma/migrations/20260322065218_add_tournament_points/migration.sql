-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MatchPerformance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "teamSide" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "tournamentPoints" INTEGER NOT NULL DEFAULT 0,
    "won" BOOLEAN NOT NULL,
    "aces" INTEGER DEFAULT 0,
    "errors" INTEGER DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchPerformance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchPerformance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchPerformance_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MatchPerformance" ("aces", "createdAt", "errors", "groupId", "id", "matchId", "playerId", "points", "teamSide", "won") SELECT "aces", "createdAt", "errors", "groupId", "id", "matchId", "playerId", "points", "teamSide", "won" FROM "MatchPerformance";
DROP TABLE "MatchPerformance";
ALTER TABLE "new_MatchPerformance" RENAME TO "MatchPerformance";
CREATE INDEX "MatchPerformance_playerId_idx" ON "MatchPerformance"("playerId");
CREATE INDEX "MatchPerformance_groupId_idx" ON "MatchPerformance"("groupId");
CREATE INDEX "MatchPerformance_matchId_idx" ON "MatchPerformance"("matchId");
CREATE UNIQUE INDEX "MatchPerformance_matchId_playerId_key" ON "MatchPerformance"("matchId", "playerId");
CREATE TABLE "new_Tournament" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "pointsForWin" INTEGER NOT NULL DEFAULT 3,
    "pointsForLoss" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Tournament_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Tournament" ("createdAt", "createdById", "description", "endDate", "id", "name", "startDate", "status", "updatedAt") SELECT "createdAt", "createdById", "description", "endDate", "id", "name", "startDate", "status", "updatedAt" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");
CREATE INDEX "Tournament_createdById_idx" ON "Tournament"("createdById");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
