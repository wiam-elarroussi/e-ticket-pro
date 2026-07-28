-- CreateEnum
CREATE TYPE "QuotaScope" AS ENUM ('EVENT', 'STAND', 'ZONE', 'CHANNEL');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "max_per_order" INTEGER;

-- AlterTable
ALTER TABLE "ticket_categories" ADD COLUMN     "requires_nominative_info" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "sales_quotas" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "scope" "QuotaScope" NOT NULL DEFAULT 'EVENT',
    "stand_id" UUID,
    "zone_id" UUID,
    "channel_id" UUID,
    "category_id" UUID,
    "max_quantity" INTEGER,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_quotas_event_id_idx" ON "sales_quotas"("event_id");

-- AddForeignKey
ALTER TABLE "sales_quotas" ADD CONSTRAINT "sales_quotas_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quotas" ADD CONSTRAINT "sales_quotas_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ticket_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
