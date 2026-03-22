-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- MatchPerformance table migration
CREATE TABLE "new_MatchPerformance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "teamSide" INTEGER NOT NULL,
    "gamePoints" INTEGER NOT NULL DEFAULT 0,
    "tournamentPoints" REAL NOT NULL DEFAULT 0,
    "won" BOOLEAN NOT NULL,
    "aces" INTEGER DEFAULT 0,
    "errors" INTEGER DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchPerformance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchPerformance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchPerformance_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy data from old table using the migrated columns
INSERT INTO "new_MatchPerformance" SELECT "id", "matchId", "playerId", "groupId", "teamSide", "gamePoints", "newTournamentPoints", "won", "aces", "errors", "createdAt" FROM "MatchPerformance";

DROP TABLE "MatchPerformance";
ALTER TABLE "new_MatchPerformance" RENAME TO "MatchPerformance";

CREATE UNIQUE INDEX "MatchPerformance_matchId_playerId_key" ON "MatchPerformance"("matchId", "playerId");
CREATE INDEX "MatchPerformance_playerId_idx" ON "MatchPerformance"("playerId");
CREATE INDEX "MatchPerformance_groupId_idx" ON "MatchPerformance"("groupId");
CREATE INDEX "MatchPerformance_matchId_idx" ON "MatchPerformance"("matchId");

-- TeamPerformance table migration
CREATE TABLE "new_TeamPerformance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "teamSide" INTEGER NOT NULL,
    "gamePoints" INTEGER NOT NULL DEFAULT 0,
    "tournamentPoints" REAL NOT NULL DEFAULT 0,
    "won" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamPerformance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamPerformance_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeamPerformance_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copy data from old table using the migrated columns
INSERT INTO "new_TeamPerformance" SELECT "id", "matchId", "teamId", "groupId", "teamSide", "gamePoints", "newTournamentPoints", "won", "createdAt" FROM "TeamPerformance";

DROP TABLE "TeamPerformance";
ALTER TABLE "new_TeamPerformance" RENAME TO "TeamPerformance";

CREATE UNIQUE INDEX "TeamPerformance_matchId_teamId_key" ON "TeamPerformance"("matchId", "teamId");
CREATE INDEX "TeamPerformance_teamId_idx" ON "TeamPerformance"("teamId");
CREATE INDEX "TeamPerformance_groupId_idx" ON "TeamPerformance"("groupId");
CREATE INDEX "TeamPerformance_matchId_idx" ON "TeamPerformance"("matchId");

-- GroupMember table migration (add qualification fields)
CREATE TABLE "new_GroupMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "groupId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "qualifiedForSemis" BOOLEAN NOT NULL DEFAULT false,
    "qualificationRank" INTEGER,
    CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_GroupMember" SELECT "id", "groupId", "playerId", "joinedAt", "leftAt", "isActive", COALESCE("qualifiedForSemis", 0), "qualificationRank" FROM "GroupMember";

DROP TABLE "GroupMember";
ALTER TABLE "new_GroupMember" RENAME TO "GroupMember";

CREATE UNIQUE INDEX "GroupMember_groupId_playerId_joinedAt_key" ON "GroupMember"("groupId", "playerId", "joinedAt");
CREATE INDEX "GroupMember_groupId_isActive_idx" ON "GroupMember"("groupId", "isActive");
CREATE INDEX "GroupMember_playerId_idx" ON "GroupMember"("playerId");

-- Team table migration (add qualification fields)
CREATE TABLE "new_Team" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualifiedForSemis" BOOLEAN NOT NULL DEFAULT false,
    "qualificationRank" INTEGER
);

INSERT INTO "new_Team" SELECT "id", "name", "createdAt", COALESCE("qualifiedForSemis", 0), "qualificationRank" FROM "Team";

DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";

CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
