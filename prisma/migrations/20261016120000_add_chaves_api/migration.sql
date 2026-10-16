-- CreateTable
CREATE TABLE "chaves_api" (
    "id" TEXT NOT NULL,
    "contribuinteId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogadaEm" TIMESTAMP(3),

    CONSTRAINT "chaves_api_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chaves_api_hash_key" ON "chaves_api"("hash");

-- CreateIndex
CREATE INDEX "chaves_api_contribuinteId_idx" ON "chaves_api"("contribuinteId");

-- AddForeignKey
ALTER TABLE "chaves_api" ADD CONSTRAINT "chaves_api_contribuinteId_fkey" FOREIGN KEY ("contribuinteId") REFERENCES "contribuintes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

