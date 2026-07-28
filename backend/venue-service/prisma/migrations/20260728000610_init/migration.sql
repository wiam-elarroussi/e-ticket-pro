-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('AVAILABLE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "NumberingDirection" AS ENUM ('LEFT_TO_RIGHT', 'RIGHT_TO_LEFT');

-- CreateTable
CREATE TABLE "venues" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "city" VARCHAR(100),
    "address" VARCHAR(255),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gates" (
    "id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(30),
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stands" (
    "id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" UUID NOT NULL,
    "stand_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color_hex" VARCHAR(9),
    "map_polygon" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_zone_access" (
    "gate_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,

    CONSTRAINT "gate_zone_access_pkey" PRIMARY KEY ("gate_id","zone_id")
);

-- CreateTable
CREATE TABLE "rows" (
    "id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "numbering_direction" "NumberingDirection" NOT NULL DEFAULT 'LEFT_TO_RIGHT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" UUID NOT NULL,
    "row_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "label" VARCHAR(50),
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "status" "SeatStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seats_row_id_number_key" ON "seats"("row_id", "number");

-- AddForeignKey
ALTER TABLE "gates" ADD CONSTRAINT "gates_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stands" ADD CONSTRAINT "stands_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_stand_id_fkey" FOREIGN KEY ("stand_id") REFERENCES "stands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_zone_access" ADD CONSTRAINT "gate_zone_access_gate_id_fkey" FOREIGN KEY ("gate_id") REFERENCES "gates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_zone_access" ADD CONSTRAINT "gate_zone_access_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rows" ADD CONSTRAINT "rows_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_row_id_fkey" FOREIGN KEY ("row_id") REFERENCES "rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
