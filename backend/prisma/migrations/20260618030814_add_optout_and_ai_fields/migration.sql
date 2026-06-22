-- AlterTable
ALTER TABLE "campanhas" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "ia_intencao" TEXT,
ADD COLUMN     "ia_resumo" TEXT,
ADD COLUMN     "optOut" BOOLEAN NOT NULL DEFAULT false;
