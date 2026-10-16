-- CreateEnum
CREATE TYPE "OrigemCertificado" AS ENUM ('ARQUIVO', 'REPOSITORIO_WINDOWS');

-- AlterTable
ALTER TABLE "certificados" ADD COLUMN     "origem" "OrigemCertificado" NOT NULL DEFAULT 'ARQUIVO',
ADD COLUMN     "thumbprint" TEXT,
ALTER COLUMN "arquivoCifrado" DROP NOT NULL,
ALTER COLUMN "senhaCifrada" DROP NOT NULL,
ALTER COLUMN "iv" DROP NOT NULL,
ALTER COLUMN "authTag" DROP NOT NULL;

