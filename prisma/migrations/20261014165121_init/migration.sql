-- CreateEnum
CREATE TYPE "TipoInscricao" AS ENUM ('CPF', 'CNPJ');

-- CreateEnum
CREATE TYPE "TipoCertificado" AS ENUM ('A1', 'A3');

-- CreateEnum
CREATE TYPE "StatusDps" AS ENUM ('PENDENTE', 'ENVIADA', 'AUTORIZADA', 'REJEITADA', 'ERRO');

-- CreateEnum
CREATE TYPE "StatusNfse" AS ENUM ('AUTORIZADA', 'CANCELADA', 'SUBSTITUIDA');

-- CreateTable
CREATE TABLE "municipios" (
    "id" TEXT NOT NULL,
    "codigoIbge" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "parametrosRaw" JSONB,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "municipios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribuintes" (
    "id" TEXT NOT NULL,
    "tipoInscricao" "TipoInscricao" NOT NULL,
    "inscricaoFederal" TEXT NOT NULL,
    "inscricaoMunicipal" TEXT,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "municipioId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribuintes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificados" (
    "id" TEXT NOT NULL,
    "contribuinteId" TEXT NOT NULL,
    "tipo" "TipoCertificado" NOT NULL DEFAULT 'A1',
    "arquivoCifrado" BYTEA NOT NULL,
    "senhaCifrada" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "titular" TEXT NOT NULL,
    "numeroSerie" TEXT NOT NULL,
    "validoDe" TIMESTAMP(3) NOT NULL,
    "validoAte" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dps" (
    "id" TEXT NOT NULL,
    "contribuinteId" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "competencia" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "xmlGerado" TEXT,
    "xmlEnviado" TEXT,
    "status" "StatusDps" NOT NULL DEFAULT 'PENDENTE',
    "mensagemErro" TEXT,
    "chaveAcessoNfse" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfse" (
    "id" TEXT NOT NULL,
    "dpsId" TEXT NOT NULL,
    "chaveAcesso" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "xmlNfse" TEXT NOT NULL,
    "status" "StatusNfse" NOT NULL DEFAULT 'AUTORIZADA',
    "valorServicos" DECIMAL(15,2) NOT NULL,
    "valorIss" DECIMAL(15,2),
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_nfse" (
    "id" TEXT NOT NULL,
    "nfseId" TEXT NOT NULL,
    "tipoEvento" TEXT NOT NULL,
    "numSeqEvento" INTEGER NOT NULL DEFAULT 1,
    "justificativa" TEXT,
    "xmlEvento" TEXT,
    "xmlResposta" TEXT,
    "sucesso" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_nfse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_integracao" (
    "id" TEXT NOT NULL,
    "dpsId" TEXT,
    "endpoint" TEXT NOT NULL,
    "metodoHttp" TEXT NOT NULL,
    "statusHttp" INTEGER,
    "requisicao" TEXT,
    "resposta" TEXT,
    "erro" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_integracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "municipios_codigoIbge_key" ON "municipios"("codigoIbge");

-- CreateIndex
CREATE UNIQUE INDEX "contribuintes_tipoInscricao_inscricaoFederal_municipioId_key" ON "contribuintes"("tipoInscricao", "inscricaoFederal", "municipioId");

-- CreateIndex
CREATE UNIQUE INDEX "dps_contribuinteId_serie_numero_key" ON "dps"("contribuinteId", "serie", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "nfse_dpsId_key" ON "nfse"("dpsId");

-- CreateIndex
CREATE UNIQUE INDEX "nfse_chaveAcesso_key" ON "nfse"("chaveAcesso");

-- AddForeignKey
ALTER TABLE "contribuintes" ADD CONSTRAINT "contribuintes_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "municipios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_contribuinteId_fkey" FOREIGN KEY ("contribuinteId") REFERENCES "contribuintes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dps" ADD CONSTRAINT "dps_contribuinteId_fkey" FOREIGN KEY ("contribuinteId") REFERENCES "contribuintes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfse" ADD CONSTRAINT "nfse_dpsId_fkey" FOREIGN KEY ("dpsId") REFERENCES "dps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_nfse" ADD CONSTRAINT "eventos_nfse_nfseId_fkey" FOREIGN KEY ("nfseId") REFERENCES "nfse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_integracao" ADD CONSTRAINT "logs_integracao_dpsId_fkey" FOREIGN KEY ("dpsId") REFERENCES "dps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
