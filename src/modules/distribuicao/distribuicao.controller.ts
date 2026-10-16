import { Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as archiver from 'archiver';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { Acesso, AcessoAtual } from '../../common/auth/acesso';
import { AcessoService } from '../../common/auth/acesso.service';
import { DistribuicaoService, FiltroNotas } from './distribuicao.service';

@ApiTags('distribuicao')
@ApiSecurity('x-api-key')
@UseGuards(ApiKeyGuard)
@Controller('distribuicao')
export class DistribuicaoController {
  constructor(
    private readonly service: DistribuicaoService,
    private readonly acesso: AcessoService,
  ) {}

  @Post('contribuinte/:contribuinteId/sincronizar')
  async sincronizar(
    @Param('contribuinteId') contribuinteId: string,
    @Query('certificadoId') certificadoId: string,
    @AcessoAtual() acesso: Acesso,
  ) {
    this.acesso.exigirContribuinte(acesso, contribuinteId);
    await this.acesso.exigirCertificado(acesso, certificadoId, contribuinteId);
    return this.service.sincronizar(contribuinteId, certificadoId);
  }

  @Get('contribuinte/:contribuinteId')
  listar(
    @Param('contribuinteId') contribuinteId: string,
    @Query('codigoMunicipio') codigoMunicipio: string | undefined,
    @Query('municipioEmissor') municipioEmissor: string | undefined,
    @Query('dataInicio') dataInicio: string | undefined,
    @Query('dataFim') dataFim: string | undefined,
    @Query('incluirCanceladas') incluirCanceladas: string | undefined,
    @AcessoAtual() acesso: Acesso,
  ) {
    this.acesso.exigirContribuinte(acesso, contribuinteId);
    return this.service.listar(contribuinteId, {
      codigoMunicipio,
      municipioEmissor,
      dataInicio,
      dataFim,
      incluirCanceladas: incluirCanceladas === 'true',
    });
  }

  /** Quantidade de notas canceladas no filtro atual (excluidas de #listar e #por-empresa por padrao). */
  @Get('contribuinte/:contribuinteId/canceladas-count')
  contarCanceladas(
    @Param('contribuinteId') contribuinteId: string,
    @Query('codigoMunicipio') codigoMunicipio: string | undefined,
    @Query('municipioEmissor') municipioEmissor: string | undefined,
    @Query('dataInicio') dataInicio: string | undefined,
    @Query('dataFim') dataFim: string | undefined,
    @AcessoAtual() acesso: Acesso,
  ) {
    this.acesso.exigirContribuinte(acesso, contribuinteId);
    return this.service.contarCanceladas(contribuinteId, { codigoMunicipio, municipioEmissor, dataInicio, dataFim });
  }

  /**
   * Mesma lista de #listar, mas agrupada por empresa prestadora (CNPJ), com subtotal por empresa.
   * dataInicio/dataFim no formato AAAA-MM-DD, filtram pela data de emissao da NFS-e.
   */
  @Get('contribuinte/:contribuinteId/por-empresa')
  listarPorEmpresa(
    @Param('contribuinteId') contribuinteId: string,
    @Query('codigoMunicipio') codigoMunicipio: string | undefined,
    @Query('municipioEmissor') municipioEmissor: string | undefined,
    @Query('dataInicio') dataInicio: string | undefined,
    @Query('dataFim') dataFim: string | undefined,
    @AcessoAtual() acesso: Acesso,
  ) {
    this.acesso.exigirContribuinte(acesso, contribuinteId);
    const filtro: FiltroNotas = { codigoMunicipio, municipioEmissor, dataInicio, dataFim };
    return this.service.listarAgrupadoPorEmpresa(contribuinteId, filtro);
  }

  /** Municipios onde as notas foram emitidas, com quantidade (para o filtro "emitidas em"). */
  @Get('contribuinte/:contribuinteId/municipios-emissores')
  listarMunicipiosEmissores(@Param('contribuinteId') contribuinteId: string, @AcessoAtual() acesso: Acesso) {
    this.acesso.exigirContribuinte(acesso, contribuinteId);
    return this.service.listarMunicipiosEmissores(contribuinteId);
  }

  /**
   * Diagnostico: retorna a resposta BRUTA do ADN para /DFe/{nsu}, sem nenhuma interpretacao.
   * Use para conferir o formato real da resposta quando a sincronizacao normal (POST
   * /sincronizar) encontrar "0 novos documentos" mas voce sabe que existem documentos --
   * isso indica que o parser (normalizarItens em distribuicao.service.ts) precisa de ajuste
   * para o formato real devolvido pelo ambiente (ainda nao documentado publicamente).
   */
  @Get('contribuinte/:contribuinteId/bruto')
  async consultarBruto(
    @Param('contribuinteId') contribuinteId: string,
    @Query('certificadoId') certificadoId: string,
    @Query('nsu') nsu = '0',
    @AcessoAtual() acesso: Acesso,
  ) {
    this.acesso.exigirContribuinte(acesso, contribuinteId);
    await this.acesso.exigirCertificado(acesso, certificadoId, contribuinteId);
    return this.service.consultarBruto(contribuinteId, certificadoId, nsu);
  }

  @Get('documento/:id/xml')
  async baixarXml(@Param('id') id: string, @AcessoAtual() acesso: Acesso, @Res() res: Response) {
    await this.acesso.exigirDocumentoDistribuido(acesso, id);
    const { xml, chaveAcesso } = await this.service.obterXml(id);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="nfse-${chaveAcesso ?? id}.xml"`);
    res.send(xml);
  }

  /** DANFSe (PDF) de uma nota distribuida, pela chave de acesso. */
  @Get('danfse/:chaveAcesso')
  async baixarDanfse(
    @Param('chaveAcesso') chaveAcesso: string,
    @Query('certificadoId') certificadoId: string,
    @AcessoAtual() acesso: Acesso,
    @Res() res: Response,
  ) {
    await this.acesso.exigirCertificado(acesso, certificadoId);
    const pdf = await this.service.obterDanfse(chaveAcesso, certificadoId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="danfse-${chaveAcesso}.pdf"`);
    res.send(pdf);
  }

  /** Baixa todos os XMLs que batem com o filtro atual (municipio/periodo), em um unico .zip. */
  @Get('contribuinte/:contribuinteId/xml-lote')
  async baixarXmlsEmLote(
    @Param('contribuinteId') contribuinteId: string,
    @Query('codigoMunicipio') codigoMunicipio: string | undefined,
    @Query('municipioEmissor') municipioEmissor: string | undefined,
    @Query('dataInicio') dataInicio: string | undefined,
    @Query('dataFim') dataFim: string | undefined,
    @AcessoAtual() acesso: Acesso,
    @Res() res: Response,
  ) {
    this.acesso.exigirContribuinte(acesso, contribuinteId);
    const arquivos = await this.service.listarXmlsParaExportar(contribuinteId, {
      codigoMunicipio,
      municipioEmissor,
      dataInicio,
      dataFim,
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="notas-fiscais.zip"');

    const arquivo = new archiver.ZipArchive({ zlib: { level: 9 } });
    arquivo.pipe(res);

    const nomesUsados = new Set<string>();
    for (const item of arquivos) {
      let nome = item.nomeArquivo;
      let contador = 1;
      while (nomesUsados.has(nome)) {
        nome = `${item.nomeArquivo.replace(/\.xml$/, '')}_${contador}.xml`;
        contador++;
      }
      nomesUsados.add(nome);
      arquivo.append(item.xml, { name: nome });
    }

    await arquivo.finalize();
  }
}
