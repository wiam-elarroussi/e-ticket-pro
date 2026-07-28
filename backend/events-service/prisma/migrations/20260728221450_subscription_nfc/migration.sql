-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "nfc_tag_id" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_nfc_tag_id_key" ON "subscriptions"("nfc_tag_id");
