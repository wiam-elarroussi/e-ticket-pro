-- CreateEnum
CREATE TYPE "AccreditationType" AS ENUM ('PUBLIC', 'VIP', 'PRESS', 'DELEGATION', 'STAFF');

-- AlterTable
ALTER TABLE "ticket_categories" ADD COLUMN     "accreditation_type" "AccreditationType" NOT NULL DEFAULT 'PUBLIC';
