-- CreateEnum
CREATE TYPE "PriceScope" AS ENUM ('EVENT', 'STAND', 'ZONE', 'SEAT');

-- CreateTable
CREATE TABLE "ticket_categories" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_rules" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "scope" "PriceScope" NOT NULL DEFAULT 'EVENT',
    "stand_id" UUID,
    "zone_id" UUID,
    "seat_id" UUID,
    "price" DECIMAL(10,2) NOT NULL,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_categories_code_key" ON "ticket_categories"("code");

-- CreateIndex
CREATE INDEX "price_rules_event_id_category_id_idx" ON "price_rules"("event_id", "category_id");

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ticket_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
