-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "customer_id" UUID;

-- CreateIndex
CREATE INDEX "subscriptions_customer_id_idx" ON "subscriptions"("customer_id");
