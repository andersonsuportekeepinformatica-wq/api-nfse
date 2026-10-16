import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const PREFIXO_CHAVE = 'nfse_';
const TAMANHO_PREFIXO_EXIBIDO = PREFIXO_CHAVE.length + 8;

export interface ChaveApiGerada {
  /** Chave em claro: so existe nesta resposta, nao e recuperavel depois. */
  chave: string;
  prefixo: string;
  criadaEm: Date;
}

export function hashChave(chave: string): string {
  // SHA-256 simples e suficiente: a chave tem 256 bits aleatorios, nao e senha escolhida por humano.
  return createHash('sha256').update(chave).digest('hex');
}

@Injectable()
export class ChavesApiService {
  constructor(private readonly prisma: PrismaService) {}

  /** Gera uma chave nova para o contribuinte e revoga as anteriores (so uma ativa por entidade). */
  async gerarParaContribuinte(contribuinteId: string): Promise<ChaveApiGerada> {
    const chave = PREFIXO_CHAVE + randomBytes(32).toString('hex');
    const prefixo = chave.slice(0, TAMANHO_PREFIXO_EXIBIDO);

    const [, criada] = await this.prisma.$transaction([
      this.prisma.chaveApi.updateMany({
        where: { contribuinteId, ativa: true },
        data: { ativa: false, revogadaEm: new Date() },
      }),
      this.prisma.chaveApi.create({
        data: { contribuinteId, hash: hashChave(chave), prefixo },
      }),
    ]);

    return { chave, prefixo, criadaEm: criada.criadaEm };
  }

  /** Retorna o contribuinte dono da chave, ou null se a chave nao existe/foi revogada/entidade inativa. */
  async resolverContribuinte(chave: string): Promise<string | null> {
    if (!chave.startsWith(PREFIXO_CHAVE)) return null;
    const registro = await this.prisma.chaveApi.findUnique({
      where: { hash: hashChave(chave) },
      include: { contribuinte: { select: { ativo: true } } },
    });
    if (!registro || !registro.ativa || !registro.contribuinte.ativo) return null;
    return registro.contribuinteId;
  }
}
