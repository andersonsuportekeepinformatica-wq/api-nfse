import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ambiente } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ID_SINGLETON = 'singleton';

@Injectable()
export class ConfiguracaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Retorna a configuracao atual, criando o registro padrao (a partir do .env) na 1a chamada. */
  async obter() {
    const existente = await this.prisma.configuracao.findUnique({ where: { id: ID_SINGLETON } });
    if (existente) return existente;

    const padrao: Ambiente =
      this.config.get<string>('SEFIN_AMBIENTE') === 'producao' ? 'PRODUCAO' : 'HOMOLOGACAO';

    return this.prisma.configuracao.create({ data: { id: ID_SINGLETON, ambiente: padrao } });
  }

  async definirAmbiente(ambiente: Ambiente) {
    return this.prisma.configuracao.upsert({
      where: { id: ID_SINGLETON },
      create: { id: ID_SINGLETON, ambiente },
      update: { ambiente },
    });
  }

  async isProducao(): Promise<boolean> {
    const config = await this.obter();
    return config.ambiente === 'PRODUCAO';
  }
}
