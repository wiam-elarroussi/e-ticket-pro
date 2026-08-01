-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'ONLINE';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customer_id" UUID,
ALTER COLUMN "operator_id" DROP NOT NULL;
