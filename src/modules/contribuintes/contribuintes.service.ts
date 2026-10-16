import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarContribuinteDto } from './dto/criar-contribuinte.dto';

@Injectable()
export class ContribuintesService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarContribuinteDto) {
    return this.prisma.contribuinte.create({
      data: {
        tipoInscricao: dto.tipoInscricao,
        inscricaoFederal: dto.inscricaoFederal.replace(/\D/g, ''),
        inscricaoMunicipal: dto.inscricaoMunicipal,
        razaoSocial: dto.razaoSocial,
        nomeFantasia: dto.nomeFantasia,
        email: dto.email,
        telefone: dto.telefone,
        municipioId: dto.municipioId,
      },
    });
  }

  async listar(contribuinteId?: string) {
    return this.prisma.contribuinte.findMany({
      where: contribuinteId ? { id: contribuinteId } : undefined,
      include: { municipio: true },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async obter(id: string) {
    const contribuinte = await this.prisma.contribuinte.findUnique({
      where: { id },
      include: {
        municipio: true,
        certificados: {
          select: { id: true, tipo: true, titular: true, numeroSerie: true, validoDe: true, validoAte: true, ativo: true, criadoEm: true },
        },
      },
    });
    if (!contribuinte) {
      throw new NotFoundException('Contribuinte nao encontrado.');
    }
    return contribuinte;
  }

  async inativar(id: string) {
    await this.obter(id);
    return this.prisma.contribuinte.update({ where: { id }, data: { ativo: false } });
  }

  /**
   * Entidades prontas para uso no seletor do painel: contribuintes ativos que ja tem pelo
   * menos um certificado ativo anexado (nao precisam de novo upload para trocar entre elas).
   */
  async listarSelecionaveis(contribuinteId?: string) {
    const contribuintes = await this.prisma.contribuinte.findMany({
      where: { ativo: true, certificados: { some: { ativo: true } }, ...(contribuinteId && { id: contribuinteId }) },
      include: {
        certificados: { where: { ativo: true }, orderBy: { criadoEm: 'desc' }, take: 1 },
      },
      orderBy: { razaoSocial: 'asc' },
    });

    return contribuintes.map((c) => ({
      contribuinteId: c.id,
      razaoSocial: c.razaoSocial,
      tipoInscricao: c.tipoInscricao,
      inscricaoFederal: c.inscricaoFederal,
      certificadoId: c.certificados[0]?.id,
      certificadoTitular: c.certificados[0]?.titular,
    }));
  }

  /**
   * Usado pelo fluxo de "anexar certificado": encontra o contribuinte pelo CPF/CNPJ extraido
   * do proprio certificado, ou cria um registro minimo automaticamente se ainda nao existir.
   */
  async buscarPorInscricao(tipoInscricao: 'CPF' | 'CNPJ', inscricaoFederal: string) {
    return this.prisma.contribuinte.findUnique({
      where: { tipoInscricao_inscricaoFederal: { tipoInscricao, inscricaoFederal } },
    });
  }

  async encontrarOuCriarPorInscricao(params: {
    tipoInscricao: 'CPF' | 'CNPJ';
    inscricaoFederal: string;
    razaoSocial: string;
    municipioId?: string;
  }) {
    const existente = await this.prisma.contribuinte.findUnique({
      where: {
        tipoInscricao_inscricaoFederal: {
          tipoInscricao: params.tipoInscricao,
          inscricaoFederal: params.inscricaoFederal,
        },
      },
    });
    if (existente) return existente;

    return this.prisma.contribuinte.create({
      data: {
        tipoInscricao: params.tipoInscricao,
        inscricaoFederal: params.inscricaoFederal,
        razaoSocial: params.razaoSocial,
        municipioId: params.municipioId,
      },
    });
  }
}
