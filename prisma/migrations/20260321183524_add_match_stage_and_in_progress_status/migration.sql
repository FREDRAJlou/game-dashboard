-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournamentId" INTEGER,
    "group1Id" INTEGER,
    "group2Id" INTEGER,
    "scheduledAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "stage" TEXT NOT NULL DEFAULT 'GROUP_STAGE',
    "team1Id" INTEGER,
    "team2Id" INTEGER,
    "team1Score" INTEGER,
    "team2Score" INTEGER,
    "winnerTeam" INTEGER,
    "winnerGroupId" INTEGER,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "notes" TEXT,
    "scheduledById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_group1Id_fkey" FOREIGN KEY ("group1Id") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_group2Id_fkey" FOREIGN KEY ("group2Id") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_winnerGroupId_fkey" FOREIGN KEY ("winnerGroupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_scheduledById_fkey" FOREIGN KEY ("scheduledById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("createdAt", "group1Id", "group2Id", "id", "notes", "scheduledAt", "scheduledById", "status", "team1Id", "team1Score", "team2Id", "team2Score", "tournamentId", "type", "updatedAt", "winnerGroupId", "winnerTeam") SELECT "createdAt", "group1Id", "group2Id", "id", "notes", "scheduledAt", "scheduledById", "status", "team1Id", "team1Score", "team2Id", "team2Score", "tournamentId", "type", "updatedAt", "winnerGroupId", "winnerTeam" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");
CREATE INDEX "Match_group1Id_idx" ON "Match"("group1Id");
CREATE INDEX "Match_group2Id_idx" ON "Match"("group2Id");
CREATE INDEX "Match_status_idx" ON "Match"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
