-- CreateEnum
CREATE TYPE "Ambiente" AS ENUM ('HOMOLOGACAO', 'PRODUCAO');

-- CreateTable
CREATE TABLE "configuracao" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "ambiente" "Ambiente" NOT NULL DEFAULT 'HOMOLOGACAO',
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_pkey" PRIMARY KEY ("id")
);

