-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'VOUCHER');

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'COMPLETED',
    "payment_method" "PaymentMethod" NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "buyer_name" VARCHAR(150),
    "buyer_email" VARCHAR(150),
    "buyer_phone" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "seat_id" UUID NOT NULL,
    "stand_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "ticket_id" UUID,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orders_event_id_idx" ON "orders"("event_id");

-- CreateIndex
CREATE INDEX "orders_channel_id_idx" ON "orders"("channel_id");

-- CreateIndex
CREATE INDEX "orders_operator_id_idx" ON "orders"("operator_id");

-- CreateIndex
CREATE INDEX "order_items_event_id_stand_id_idx" ON "order_items"("event_id", "stand_id");

-- CreateIndex
CREATE INDEX "order_items_event_id_zone_id_idx" ON "order_items"("event_id", "zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_seat_id_order_id_key" ON "order_items"("seat_id", "order_id");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
