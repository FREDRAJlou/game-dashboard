-- Add tournament points to MatchPerformance
ALTER TABLE "MatchPerformance" ADD COLUMN "tournamentPoints" INTEGER NOT NULL DEFAULT 0;

-- Add tournament points configuration to Tournament
ALTER TABLE "Tournament" ADD COLUMN "pointsForWin" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Tournament" ADD COLUMN "pointsForLoss" INTEGER NOT NULL DEFAULT 0;
