-- AlterTable
ALTER TABLE "projects" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "projects" ADD COLUMN "startDate" DATE;
ALTER TABLE "projects" ADD COLUMN "endDate" DATE;
ALTER TABLE "projects" ADD COLUMN "managerId" TEXT;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
