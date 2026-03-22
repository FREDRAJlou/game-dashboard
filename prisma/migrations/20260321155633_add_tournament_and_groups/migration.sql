-- CreateTable
CREATE TABLE "Tournament" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tournament_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Group" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournamentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Group_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "groupId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchPerformance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "teamSide" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "won" BOOLEAN NOT NULL,
    "aces" INTEGER DEFAULT 0,
    "errors" INTEGER DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchPerformance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchPerformance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchPerformance_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamPerformance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "teamSide" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "won" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamPerformance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamPerformance_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeamPerformance_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "team1Id" INTEGER,
    "team2Id" INTEGER,
    "team1Score" INTEGER,
    "team2Score" INTEGER,
    "winnerTeam" INTEGER,
    "winnerGroupId" INTEGER,
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
INSERT INTO "new_Match" ("createdAt", "id", "notes", "scheduledAt", "scheduledById", "status", "team1Id", "team1Score", "team2Id", "team2Score", "type", "updatedAt", "winnerTeam") SELECT "createdAt", "id", "notes", "scheduledAt", "scheduledById", "status", "team1Id", "team1Score", "team2Id", "team2Score", "type", "updatedAt", "winnerTeam" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");
CREATE INDEX "Match_group1Id_idx" ON "Match"("group1Id");
CREATE INDEX "Match_group2Id_idx" ON "Match"("group2Id");
CREATE INDEX "Match_status_idx" ON "Match"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "Tournament_createdById_idx" ON "Tournament"("createdById");

-- CreateIndex
CREATE INDEX "Group_tournamentId_idx" ON "Group"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_tournamentId_name_key" ON "Group"("tournamentId", "name");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_isActive_idx" ON "GroupMember"("groupId", "isActive");

-- CreateIndex
CREATE INDEX "GroupMember_playerId_idx" ON "GroupMember"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_playerId_joinedAt_key" ON "GroupMember"("groupId", "playerId", "joinedAt");

-- CreateIndex
CREATE INDEX "MatchPerformance_playerId_idx" ON "MatchPerformance"("playerId");

-- CreateIndex
CREATE INDEX "MatchPerformance_groupId_idx" ON "MatchPerformance"("groupId");

-- CreateIndex
CREATE INDEX "MatchPerformance_matchId_idx" ON "MatchPerformance"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPerformance_matchId_playerId_key" ON "MatchPerformance"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "TeamPerformance_teamId_idx" ON "TeamPerformance"("teamId");

-- CreateIndex
CREATE INDEX "TeamPerformance_groupId_idx" ON "TeamPerformance"("groupId");

-- CreateIndex
CREATE INDEX "TeamPerformance_matchId_idx" ON "TeamPerformance"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamPerformance_matchId_teamId_key" ON "TeamPerformance"("matchId", "teamId");
