-- CreateEnum
CREATE TYPE "GeneratedTicketStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- AlterTable
ALTER TABLE "generated_tickets" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_by" UUID,
ADD COLUMN     "event_id" UUID,
ADD COLUMN     "status" "GeneratedTicketStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "generated_tickets_event_id_idx" ON "generated_tickets"("event_id");
