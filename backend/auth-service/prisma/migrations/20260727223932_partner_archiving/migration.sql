-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "archived_by" UUID;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
