-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('MATCH', 'COMPETITION', 'SHOW');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "EventType" NOT NULL,
    "home_team" VARCHAR(100),
    "away_team" VARCHAR(100),
    "venue_id" UUID NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "sales_open_at" TIMESTAMP(3),
    "sales_close_at" TIMESTAMP(3),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_venue_id_idx" ON "events"("venue_id");

-- CreateIndex
CREATE INDEX "events_start_at_idx" ON "events"("start_at");
