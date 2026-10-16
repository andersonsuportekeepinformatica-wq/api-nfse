import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificadosService } from '../certificados/certificados.service';
import { SefinNacionalClientService } from '../sefin-nacional/sefin-nacional-client.service';
import { ConfiguracaoService } from '../configuracao/configuracao.service';
import { EmitirDpsDto } from './dto/emitir-dps.dto';
import { montarXmlDps } from './dps-xml-builder';
import { assinarXml, gzipBase64 } from './dps-xml-signer';

@Injectable()
export class DpsService {
  private readonly logger = new Logger(DpsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly certificados: CertificadosService,
    private readonly sefinClient: SefinNacionalClientService,
    private readonly configuracao: ConfiguracaoService,
  ) {}

  async emitir(dto: EmitirDpsDto) {
    const contribuinte = await this.prisma.contribuinte.findUnique({
      where: { id: dto.contribuinteId },
      include: { municipio: true },
    });
    if (!contribuinte) throw new NotFoundException('Contribuinte nao encontrado.');
    if (!contribuinte.ativo) throw new BadRequestException('Contribuinte inativo.');
    if (!contribuinte.municipio) {
      throw new BadRequestException(
        'Este contribuinte nao tem municipio de domicilio definido. Edite o contribuinte e informe o municipio antes de emitir DPS.',
      );
    }

    const dpsExistente = await this.prisma.dps.findUnique({
      where: {
        contribuinteId_serie_numero: {
          contribuinteId: dto.contribuinteId,
          serie: dto.serie,
          numero: dto.numero,
        },
      },
    });
    if (dpsExistente) {
      throw new BadRequestException('Ja existe uma DPS com esta serie/numero para este contribuinte.');
    }

    const dpsRegistro = await this.prisma.dps.create({
      data: {
        contribuinteId: dto.contribuinteId,
        serie: dto.serie,
        numero: dto.numero,
        competencia: new Date(dto.competencia),
        payload: dto as unknown as object,
        status: 'PENDENTE',
      },
    });

    try {
      const { xml, idDps } = montarXmlDps({
        dto,
        contribuinte,
        municipioPrestador: contribuinte.municipio,
        ambienteProducao: await this.configuracao.isProducao(),
      });

      const chaves = await this.certificados.carregarChavesPem(dto.certificadoId);
      const xmlAssinado = assinarXml({
        xml,
        idElemento: idDps,
        privateKeyPem: chaves.privateKeyPem,
        certificatePem: chaves.certificatePem,
      });

      await this.prisma.dps.update({
        where: { id: dpsRegistro.id },
        data: { xmlGerado: xmlAssinado },
      });

      const envelope = gzipBase64(xmlAssinado);

      const resposta = await this.sefinClient.enviarDps(chaves, envelope);

      await this.prisma.logIntegracao.create({
        data: {
          dpsId: dpsRegistro.id,
          endpoint: '/nfse',
          metodoHttp: 'POST',
          statusHttp: resposta.status,
          requisicao: JSON.stringify({ dpsXmlGzipB64: '[omitido]' }),
          resposta: JSON.stringify(resposta.data).slice(0, 8000),
        },
      });

      if (resposta.status >= 200 && resposta.status < 300) {
        return this.processarSucesso(dpsRegistro.id, resposta.data, dto.valores.valorServicos, vIssDe(dto));
      }

      const mensagemErro = extrairMensagemErro(resposta.data);
      await this.prisma.dps.update({
        where: { id: dpsRegistro.id },
        data: { status: 'REJEITADA', mensagemErro },
      });
      return { sucesso: false, status: resposta.status, erro: mensagemErro, detalhes: resposta.data };
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Erro desconhecido ao processar DPS.';
      this.logger.error(`Falha ao emitir DPS ${dpsRegistro.id}: ${mensagem}`);
      await this.prisma.dps.update({
        where: { id: dpsRegistro.id },
        data: { status: 'ERRO', mensagemErro: mensagem },
      });
      await this.prisma.logIntegracao.create({
        data: {
          dpsId: dpsRegistro.id,
          endpoint: '/nfse',
          metodoHttp: 'POST',
          erro: mensagem,
        },
      });
      throw new BadRequestException(
        `Falha ao emitir DPS ${dpsRegistro.id}: ${mensagem}. Verifique SEFIN_NACIONAL_BASE_URL e o certificado utilizado.`,
      );
    }
  }

  private async processarSucesso(
    dpsId: string,
    respostaSefin: unknown,
    valorServicos: number,
    valorIss: number | undefined,
  ) {
    const dados = respostaSefin as Record<string, unknown>;
    const chaveAcesso = String(dados['chaveAcesso'] ?? dados['chAcesso'] ?? '');
    const xmlNfse = String(dados['nfseXmlGzipB64'] ?? dados['xmlNfse'] ?? JSON.stringify(dados));
    const numero = String(dados['numero'] ?? dados['nNFSe'] ?? '');

    await this.prisma.dps.update({
      where: { id: dpsId },
      data: { status: 'AUTORIZADA', chaveAcessoNfse: chaveAcesso || null },
    });

    if (chaveAcesso) {
      await this.prisma.nfse.create({
        data: {
          dpsId,
          chaveAcesso,
          numero,
          xmlNfse,
          valorServicos,
          valorIss: valorIss ?? null,
          dataEmissao: new Date(),
        },
      });
    }

    return { sucesso: true, chaveAcesso, numero, respostaBruta: dados };
  }

  async consultarPorId(id: string) {
    const dps = await this.prisma.dps.findUnique({
      where: { id },
      include: { nfse: true, contribuinte: true },
    });
    if (!dps) throw new NotFoundException('DPS nao encontrada.');
    return dps;
  }

  async listarPorContribuinte(contribuinteId: string) {
    return this.prisma.dps.findMany({
      where: { contribuinteId },
      include: { nfse: true },
      orderBy: { criadoEm: 'desc' },
    });
  }
}

function vIssDe(dto: EmitirDpsDto): number | undefined {
  return dto.valores.aliquotaIss !== undefined
    ? (dto.valores.valorServicos * dto.valores.aliquotaIss) / 100
    : undefined;
}

function extrairMensagemErro(data: unknown): string {
  if (!data) return 'Erro nao especificado retornado pelo Ambiente Nacional.';
  if (typeof data === 'string') return data;
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj['erros'])) {
    return (obj['erros'] as Array<Record<string, unknown>>)
      .map((e) => `${e['codigo'] ?? ''} ${e['descricao'] ?? JSON.stringify(e)}`)
      .join('; ');
  }
  return JSON.stringify(data).slice(0, 2000);
}
