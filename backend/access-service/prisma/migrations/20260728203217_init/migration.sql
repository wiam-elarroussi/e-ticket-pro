-- CreateEnum
CREATE TYPE "ScanType" AS ENUM ('TICKET', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('VALID', 'ALREADY_SCANNED', 'INVALID', 'CANCELLED', 'WRONG_EVENT', 'OVERRIDDEN');

-- CreateTable
CREATE TABLE "access_logs" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "gate_id" UUID NOT NULL,
    "scan_type" "ScanType" NOT NULL,
    "ticket_id" UUID,
    "subscription_id" UUID,
    "raw_code" VARCHAR(60),
    "result" "ScanResult" NOT NULL,
    "reason" VARCHAR(255),
    "scanned_by" UUID NOT NULL,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_logs_event_id_ticket_id_idx" ON "access_logs"("event_id", "ticket_id");

-- CreateIndex
CREATE INDEX "access_logs_event_id_subscription_id_idx" ON "access_logs"("event_id", "subscription_id");

-- CreateIndex
CREATE INDEX "access_logs_gate_id_idx" ON "access_logs"("gate_id");
