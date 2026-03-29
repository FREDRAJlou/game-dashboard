-- Expand MatchStage enum to support more tournament formats
-- Adds: ROUND_OF_16, THIRD_PLACE, ELIMINATOR, QUALIFIER_1, QUALIFIER_2

-- Drop and recreate the enum with new values
ALTER TYPE "MatchStage" RENAME TO "MatchStage_old";

CREATE TYPE "MatchStage" AS ENUM (
  'GROUP_STAGE',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
  'ELIMINATOR',
  'QUALIFIER_1',
  'QUALIFIER_2'
);

-- Update the Match table column type
ALTER TABLE "Match" ALTER COLUMN "stage" TYPE "MatchStage" USING "stage"::text::"MatchStage";

-- Set default for new stage column
ALTER TABLE "Match" ALTER COLUMN "stage" SET DEFAULT 'GROUP_STAGE'::"MatchStage";

-- Drop old enum type
DROP TYPE "MatchStage_old";

-- Add comments explaining each stage
COMMENT ON TYPE "MatchStage" IS 'Tournament match stages supporting various formats';
