/*
  Warnings:

  - Made the column `userId` on table `campanhas` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `userId` to the `instancias` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `leads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `varredura_jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `workflow_execucoes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "campanhas" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "instancias" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "varredura_jobs" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "workflow_execucoes" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "campanhas_userId_idx" ON "campanhas"("userId");

-- CreateIndex
CREATE INDEX "instancias_userId_idx" ON "instancias"("userId");

-- CreateIndex
CREATE INDEX "leads_userId_idx" ON "leads"("userId");

-- CreateIndex
CREATE INDEX "templates_userId_idx" ON "templates"("userId");

-- CreateIndex
CREATE INDEX "varredura_jobs_userId_idx" ON "varredura_jobs"("userId");

-- CreateIndex
CREATE INDEX "workflow_execucoes_userId_idx" ON "workflow_execucoes"("userId");
