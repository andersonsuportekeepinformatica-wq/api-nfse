import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Acesso } from './acesso';

/**
 * Regras de escopo das chaves de API. Recursos de outra entidade respondem 404 (e nao 403)
 * para que uma chave de entidade nao consiga descobrir quais IDs existem no sistema.
 */
@Injectable()
export class AcessoService {
  constructor(private readonly prisma: PrismaService) {}

  exigirAdmin(acesso: Acesso): void {
    if (!acesso.admin) {
      throw new ForbiddenException('Operacao restrita a chave mestra (administrador).');
    }
  }

  /** contribuinteId para filtrar listagens: undefined = sem filtro (admin). */
  filtroContribuinte(acesso: Acesso): string | undefined {
    return acesso.admin ? undefined : acesso.contribuinteId;
  }

  exigirContribuinte(acesso: Acesso, contribuinteId: string): void {
    if (!acesso.admin && acesso.contribuinteId !== contribuinteId) {
      throw new NotFoundException('Contribuinte nao encontrado.');
    }
  }

  /**
   * Garante que o certificado e visivel para quem chama e, se informado, que pertence ao
   * contribuinte da operacao - impede usar o certificado de uma entidade para agir em nome de outra.
   */
  async exigirCertificado(acesso: Acesso, certificadoId: string, contribuinteId?: string): Promise<void> {
    if (!certificadoId) {
      throw new BadRequestException('certificadoId e obrigatorio.');
    }
    const cert = await this.prisma.certificado.findUnique({
      where: { id: certificadoId },
      select: { contribuinteId: true },
    });
    const visivel = cert && (acesso.admin || cert.contribuinteId === acesso.contribuinteId);
    if (!visivel) {
      throw new NotFoundException('Certificado nao encontrado.');
    }
    if (contribuinteId && cert.contribuinteId !== contribuinteId) {
      throw new BadRequestException('O certificado informado nao pertence a este contribuinte.');
    }
  }

  async exigirDocumentoDistribuido(acesso: Acesso, documentoId: string): Promise<void> {
    if (acesso.admin) return;
    const doc = await this.prisma.nfseDistribuida.findUnique({
      where: { id: documentoId },
      select: { contribuinteId: true },
    });
    if (doc?.contribuinteId !== acesso.contribuinteId) {
      throw new NotFoundException('Documento nao encontrado.');
    }
  }

  async exigirDps(acesso: Acesso, dpsId: string): Promise<void> {
    if (acesso.admin) return;
    const dps = await this.prisma.dps.findUnique({ where: { id: dpsId }, select: { contribuinteId: true } });
    if (dps?.contribuinteId !== acesso.contribuinteId) {
      throw new NotFoundException('DPS nao encontrada.');
    }
  }

  /** Retorna o contribuinte emissor da NFS-e local (para validar o certificado do cancelamento). */
  async exigirNfse(acesso: Acesso, chaveAcesso: string): Promise<string> {
    const nfse = await this.prisma.nfse.findUnique({
      where: { chaveAcesso },
      select: { dps: { select: { contribuinteId: true } } },
    });
    if (!nfse || (!acesso.admin && nfse.dps.contribuinteId !== acesso.contribuinteId)) {
      throw new NotFoundException('NFS-e nao encontrada na base local.');
    }
    return nfse.dps.contribuinteId;
  }
}
