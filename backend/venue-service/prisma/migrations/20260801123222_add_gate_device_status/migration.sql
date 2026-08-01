-- CreateEnum
CREATE TYPE "GateDeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'FAULT');

-- AlterTable
ALTER TABLE "gates" ADD COLUMN     "device_status" "GateDeviceStatus" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN     "last_heartbeat_at" TIMESTAMP(3);
