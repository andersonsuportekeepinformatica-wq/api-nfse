-- DropIndex
DROP INDEX "nfse_distribuidas_contribuinteId_nsu_key";

-- AlterTable
ALTER TABLE "contribuintes" ADD COLUMN     "ultimoNsuDistribuicaoMunicipio" TEXT DEFAULT '0';

-- AlterTable
ALTER TABLE "nfse_distribuidas" ADD COLUMN     "codigoMunicipioEmissor" TEXT,
ADD COLUMN     "nomeMunicipioEmissor" TEXT,
ADD COLUMN     "tipoNsu" TEXT NOT NULL DEFAULT 'RECEPCAO';

-- CreateIndex
CREATE INDEX "nfse_distribuidas_contribuinteId_codigoMunicipioEmissor_idx" ON "nfse_distribuidas"("contribuinteId", "codigoMunicipioEmissor");

-- CreateIndex
CREATE UNIQUE INDEX "nfse_distribuidas_contribuinteId_tipoNsu_nsu_key" ON "nfse_distribuidas"("contribuinteId", "tipoNsu", "nsu");


-- Backfill: municipio emissor das notas ja baixadas, a partir do XML guardado.
UPDATE "nfse_distribuidas"
SET "codigoMunicipioEmissor" = COALESCE(substring("xmlBruto" from '<cLocEmi>([0-9]{7})</cLocEmi>'), left("chaveAcesso", 7)),
    "nomeMunicipioEmissor"   = substring("xmlBruto" from '<xLocEmi>([^<]*)</xLocEmi>')
WHERE "codigoMunicipioEmissor" IS NULL;
