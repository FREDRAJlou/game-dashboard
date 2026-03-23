-- Add isScoringAdmin column to User table
ALTER TABLE "User" ADD COLUMN "isScoringAdmin" BOOLEAN NOT NULL DEFAULT false;
