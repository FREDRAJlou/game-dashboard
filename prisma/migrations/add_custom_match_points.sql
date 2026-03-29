-- Add custom tournament points fields to Match table
-- These allow per-match point overrides (useful for knockout stages with different point values)

ALTER TABLE "Match" ADD COLUMN "customPointsForWin" INTEGER;
ALTER TABLE "Match" ADD COLUMN "customPointsForLoss" INTEGER;

-- Add comments
COMMENT ON COLUMN "Match"."customPointsForWin" IS 'Custom points for winning this match (overrides tournament default)';
COMMENT ON COLUMN "Match"."customPointsForLoss" IS 'Custom points for losing this match (overrides tournament default)';
