-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "stereotype" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "age" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "politics" TEXT NOT NULL,
    "friendly" TEXT NOT NULL,
    "trustworthy" TEXT NOT NULL,
    "confident" TEXT NOT NULL,
    "competent" TEXT NOT NULL,
    "wealthy" TEXT NOT NULL,
    "conservative" TEXT NOT NULL,
    "religious" TEXT NOT NULL,
    "embedding" vector(1536),

    CONSTRAINT "stereotype_pkey" PRIMARY KEY ("id")
);
