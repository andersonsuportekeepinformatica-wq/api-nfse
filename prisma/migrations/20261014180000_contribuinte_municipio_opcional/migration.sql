-- DropForeignKey
ALTER TABLE "contribuintes" DROP CONSTRAINT "contribuintes_municipioId_fkey";

-- DropIndex
DROP INDEX "contribuintes_tipoInscricao_inscricaoFederal_municipioId_key";

-- AlterTable
ALTER TABLE "contribuintes" ALTER COLUMN "municipioId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "contribuintes_tipoInscricao_inscricaoFederal_key" ON "contribuintes"("tipoInscricao", "inscricaoFederal");

-- AddForeignKey
ALTER TABLE "contribuintes" ADD CONSTRAINT "contribuintes_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "municipios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

