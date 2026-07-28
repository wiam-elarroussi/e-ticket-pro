-- CreateEnum
CREATE TYPE "SubscriptionFormulaType" AS ENUM ('SAISON', 'ELIMINATOIRES', 'POULES');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "subscription_formulas" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "SubscriptionFormulaType" NOT NULL,
    "venue_id" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_formula_events" (
    "formula_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,

    CONSTRAINT "subscription_formula_events_pkey" PRIMARY KEY ("formula_id","event_id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "formula_id" UUID NOT NULL,
    "holder_name" VARCHAR(150) NOT NULL,
    "holder_email" VARCHAR(150),
    "holder_phone" VARCHAR(30),
    "seat_id" UUID,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_formulas_venue_id_idx" ON "subscription_formulas"("venue_id");

-- CreateIndex
CREATE INDEX "subscriptions_formula_id_idx" ON "subscriptions"("formula_id");

-- AddForeignKey
ALTER TABLE "subscription_formula_events" ADD CONSTRAINT "subscription_formula_events_formula_id_fkey" FOREIGN KEY ("formula_id") REFERENCES "subscription_formulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_formula_events" ADD CONSTRAINT "subscription_formula_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_formula_id_fkey" FOREIGN KEY ("formula_id") REFERENCES "subscription_formulas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
