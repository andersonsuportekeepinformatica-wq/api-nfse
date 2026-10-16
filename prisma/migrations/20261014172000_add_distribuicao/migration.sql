-- AlterTable
ALTER TABLE "contribuintes" ADD COLUMN     "ultimoNsuDistribuicao" TEXT DEFAULT '0';

-- CreateTable
CREATE TABLE "nfse_distribuidas" (
    "id" TEXT NOT NULL,
    "contribuinteId" TEXT NOT NULL,
    "nsu" TEXT NOT NULL,
    "chaveAcesso" TEXT,
    "tipoDocumento" TEXT NOT NULL,
    "codigoMunicipio" TEXT,
    "cnpjPrestador" TEXT,
    "cnpjTomador" TEXT,
    "valorServicos" DECIMAL(15,2),
    "dataEmissao" TIMESTAMP(3),
    "xmlBruto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nfse_distribuidas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nfse_distribuidas_contribuinteId_nsu_key" ON "nfse_distribuidas"("contribuinteId", "nsu");

-- AddForeignKey
ALTER TABLE "nfse_distribuidas" ADD CONSTRAINT "nfse_distribuidas_contribuinteId_fkey" FOREIGN KEY ("contribuinteId") REFERENCES "contribuintes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
