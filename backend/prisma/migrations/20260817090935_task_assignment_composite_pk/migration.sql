-- AlterTable
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("userId", "taskId");

-- DropIndex
DROP INDEX "task_assignments_userId_taskId_key";
