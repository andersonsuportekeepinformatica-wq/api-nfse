import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificadosService } from '../certificados/certificados.service';
import { SefinNacionalClientService } from '../sefin-nacional/sefin-nacional-client.service';
import { ConfiguracaoService } from '../configuracao/configuracao.service';
import { assinarXml, gzipBase64 } from '../dps/dps-xml-signer';
import { montarXmlEventoCancelamento } from './evento-xml-builder';
import { CancelarNfseDto } from './dto/cancelar-nfse.dto';

@Injectable()
export class NfseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly certificados: CertificadosService,
    private readonly sefinClient: SefinNacionalClientService,
    private readonly configuracao: ConfiguracaoService,
  ) {}

  async listar(contribuinteId?: string) {
    return this.prisma.nfse.findMany({
      where: contribuinteId ? { dps: { contribuinteId } } : undefined,
      include: { dps: { include: { contribuinte: true } } },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async obterPorChave(chaveAcesso: string) {
    const nfse = await this.prisma.nfse.findUnique({
      where: { chaveAcesso },
      include: { dps: { include: { contribuinte: { include: { municipio: true } } } }, eventos: true },
    });
    if (!nfse) throw new NotFoundException('NFS-e nao encontrada na base local.');
    return nfse;
  }

  /** Consulta a NFS-e diretamente no Ambiente Nacional (fonte de verdade), usando um certificado valido. */
  async consultarRemoto(chaveAcesso: string, certificadoId: string) {
    const chaves = await this.certificados.carregarCredencial(certificadoId);
    const resposta = await this.sefinClient.consultarNfse(chaves, chaveAcesso);
    return { status: resposta.status, dados: resposta.data };
  }

  async baixarDanfse(chaveAcesso: string, certificadoId: string) {
    const chaves = await this.certificados.carregarCredencial(certificadoId);
    const resposta = await this.sefinClient.obterDanfsePdf(chaves, chaveAcesso);
    if (resposta.status >= 400) {
      throw new BadRequestException('Nao foi possivel obter o DANFSe no Ambiente Nacional.');
    }
    return Buffer.from(resposta.data as ArrayBuffer);
  }

  async cancelar(chaveAcesso: string, dto: CancelarNfseDto) {
    const nfse = await this.obterPorChave(chaveAcesso);
    if (nfse.status === 'CANCELADA') {
      throw new BadRequestException('NFS-e ja esta cancelada.');
    }

    const contribuinte = nfse.dps.contribuinte;
    if (!contribuinte.municipio) {
      throw new BadRequestException('Contribuinte emissor sem municipio de domicilio definido.');
    }
    const proximoSeq = nfse.eventos.length + 1;

    const { xml, idEvento } = montarXmlEventoCancelamento({
      chaveAcesso,
      codigoMunicipioAutor: contribuinte.municipio.codigoIbge,
      tipoInscricaoAutor: contribuinte.tipoInscricao,
      inscricaoFederalAutor: contribuinte.inscricaoFederal,
      motivo: dto.motivo,
      numSeqEvento: proximoSeq,
      ambienteProducao: await this.configuracao.isProducao(),
    });

    const chaves = await this.certificados.carregarChavesPem(dto.certificadoId);
    const xmlAssinado = assinarXml({
      xml,
      idElemento: idEvento,
      privateKeyPem: chaves.privateKeyPem,
      certificatePem: chaves.certificatePem,
    });

    const envelope = gzipBase64(xmlAssinado);
    const resposta = await this.sefinClient.registrarEvento(chaves, chaveAcesso, envelope);

    const sucesso = resposta.status >= 200 && resposta.status < 300;

    await this.prisma.eventoNfse.create({
      data: {
        nfseId: nfse.id,
        tipoEvento: 'CANCELAMENTO',
        numSeqEvento: proximoSeq,
        justificativa: dto.motivo,
        xmlEvento: xmlAssinado,
        xmlResposta: JSON.stringify(resposta.data).slice(0, 8000),
        sucesso,
      },
    });

    if (sucesso) {
      await this.prisma.nfse.update({ where: { id: nfse.id }, data: { status: 'CANCELADA' } });
    }

    return { sucesso, status: resposta.status, dados: resposta.data };
  }
}
