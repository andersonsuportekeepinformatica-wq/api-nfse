import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { gunzipSync } from 'zlib';
import { parseStringPromise } from 'xml2js';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificadosService } from '../certificados/certificados.service';
import {
  CredencialCertificado,
  SefinNacionalClientService,
} from '../sefin-nacional/sefin-nacional-client.service';

const LIMITE_ITERACOES = 2000; // trava de seguranca contra loop infinito (2000 x 50 = 100 mil documentos)
// Abaixo do requestTimeout padrao do Node (5 min): passou disso, devolve o progresso e o painel
// chama de novo - o cursor e salvo a cada pagina, entao nada se perde.
const TEMPO_MAXIMO_SINCRONIZACAO_MS = 4 * 60 * 1000;
const TAMANHO_LOTE_COMPLETO = 50;

/**
 * Tipos de NSU do ADN (parametro tipoNSU da API de municipios), cada um com numeracao propria:
 * - RECEPCAO: notas que o SISTEMA PROPRIO do municipio enviou ao ADN (padrao quando nao se informa);
 * - DISTRIBUICAO: notas geradas por OUTRO sistema (ex. Emissor Nacional/Sefin Nacional, ou outro
 *   municipio) em que o municipio e interessado - inclusive as emitidas no proprio municipio pelo
 *   Emissor Nacional. Municipio que usa o Emissor Nacional so recebe suas notas por aqui.
 * - CONTRIBUINTE: API do contribuinte (/DFe sem prefixo), que nao tem tipo.
 * Confirmado contra producao em 16/10/2026 (Swagger: adn.nfse.gov.br/municipios/swagger/v1/swagger.json).
 */
type TipoNsu = 'RECEPCAO' | 'DISTRIBUICAO' | 'CONTRIBUINTE';

export interface FiltroNotas {
  /** Municipio onde a nota foi emitida (cLocEmi, codigo IBGE). */
  municipioEmissor?: string;
  /** Legado: municipio de incidencia/prestacao. */
  codigoMunicipio?: string;
  dataInicio?: string;
  dataFim?: string;
  incluirCanceladas?: boolean;
}

interface ResultadoPassagem {
  novos: number;
  ultimoNsu: string;
  iteracoes: number;
  concluido: boolean;
  mensagemAmbiente?: string;
}

interface ItemLoteDFe {
  NSU: number;
  ChaveAcesso?: string;
  TipoDocumento?: string; // 'NFSE' | 'EVENTO' etc.
  ArquivoXml?: string; // gzip + base64
  DataHoraGeracao?: string;
}

interface RespostaDistribuicao {
  StatusProcessamento?: string; // ex: 'DOCUMENTOS_LOCALIZADOS' | 'NENHUM_DOCUMENTO_LOCALIZADO'
  LoteDFe?: ItemLoteDFe[];
  Erros?: Array<{ Codigo?: string; Descricao?: string }>;
}

@Injectable()
export class DistribuicaoService {
  private readonly logger = new Logger(DistribuicaoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly certificados: CertificadosService,
    private readonly sefinClient: SefinNacionalClientService,
  ) {}

  /**
   * Busca no ADN (Ambiente de Dados Nacional) os documentos fiscais vinculados ao certificado,
   * a partir do ultimo NSU conhecido de cada tipo, e persiste localmente.
   *
   * Duas APIs: GET /DFe/{nsu} (contribuinte: CNPJ/CPF como prestador/tomador/intermediario) e
   * GET /municipios/DFe/{nsu} (prefeitura conveniada). Tentamos sem prefixo; 404 => municipio.
   * Para municipio percorremos RECEPCAO e DISTRIBUICAO (ver TipoNsu).
   *
   * O NSU informado e EXCLUSIVO na pratica (pedir 714 devolve 715 em diante), apesar do Swagger
   * dizer "inclusive" - por isso o cursor guarda o ultimo NSU processado e e enviado como esta.
   */
  async sincronizar(contribuinteId: string, certificadoId: string) {
    const contribuinte = await this.prisma.contribuinte.findUnique({ where: { id: contribuinteId } });
    if (!contribuinte) throw new NotFoundException('Contribuinte nao encontrado.');

    const credencial = await this.certificados.carregarCredencial(certificadoId);
    const prazo = Date.now() + TEMPO_MAXIMO_SINCRONIZACAO_MS;

    try {
      const prefixo = await this.detectarApi(credencial, contribuinte.ultimoNsuDistribuicao ?? '0');
      const passagens: Array<{ tipo: TipoNsu; cursor: 'ultimoNsuDistribuicao' | 'ultimoNsuDistribuicaoMunicipio' }> =
        prefixo === '/municipios'
          ? [
              { tipo: 'RECEPCAO', cursor: 'ultimoNsuDistribuicao' },
              { tipo: 'DISTRIBUICAO', cursor: 'ultimoNsuDistribuicaoMunicipio' },
            ]
          : [{ tipo: 'CONTRIBUINTE', cursor: 'ultimoNsuDistribuicao' }];

      const porTipo: Partial<Record<TipoNsu, ResultadoPassagem>> = {};
      for (const { tipo, cursor } of passagens) {
        porTipo[tipo] = await this.sincronizarTipo({
          contribuinteId,
          credencial,
          prefixo,
          tipo,
          cursor,
          nsuInicial: contribuinte[cursor] ?? '0',
          prazo,
        });
        if (!porTipo[tipo]!.concluido) break; // tempo esgotado: o painel chama de novo
      }

      const resultados = Object.values(porTipo) as ResultadoPassagem[];
      const novosDocumentos = resultados.reduce((soma, r) => soma + r.novos, 0);
      const concluido = resultados.length === passagens.length && resultados.every((r) => r.concluido);
      const canceladas = await this.aplicarEventosCancelamento(contribuinteId);

      return {
        novosDocumentos,
        concluido,
        ultimoNsu: resultados[0]?.ultimoNsu,
        iteracoes: resultados.reduce((soma, r) => soma + r.iteracoes, 0),
        apiUsada: prefixo === '/municipios' ? 'municipio' : 'contribuinte',
        porTipo,
        notasCanceladasDetectadas: canceladas,
        // So faz sentido mostrar "nenhum documento" quando nenhuma passagem trouxe nada.
        mensagemAmbiente: novosDocumentos === 0 ? resultados.find((r) => r.mensagemAmbiente)?.mensagemAmbiente : undefined,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`Falha na sincronizacao com o ADN (contribuinte ${contribuinteId}): ${mensagem}`);
      throw new BadRequestException(
        `Falha ao conectar no Ambiente Nacional: ${mensagem}. Verifique ADN_BASE_URL e se o certificado e ICP-Brasil valido.`,
      );
    }
  }

  /** '' = API do contribuinte; '/municipios' = API do municipio (404 na do contribuinte). */
  private async detectarApi(credencial: CredencialCertificado, nsu: string): Promise<'' | '/municipios'> {
    const resposta = await this.sefinClient.consultarDistribuicaoPorNsu(credencial, nsu);
    return resposta.status === 404 ? '/municipios' : '';
  }

  /** Percorre um tipo de NSU ate o fim (ou ate o prazo), salvando o cursor a cada pagina. */
  private async sincronizarTipo(params: {
    contribuinteId: string;
    credencial: CredencialCertificado;
    prefixo: '' | '/municipios';
    tipo: TipoNsu;
    cursor: 'ultimoNsuDistribuicao' | 'ultimoNsuDistribuicaoMunicipio';
    nsuInicial: string;
    prazo: number;
  }): Promise<ResultadoPassagem> {
    const { contribuinteId, credencial, prefixo, tipo, cursor, prazo } = params;
    const tipoNsuApi = tipo === 'CONTRIBUINTE' ? undefined : tipo;
    let ultNsu = params.nsuInicial;
    let novos = 0;
    let iteracoes = 0;

    const buscarPagina = (nsu: string) => {
      const promessa = this.sefinClient.consultarDistribuicaoPorNsu(credencial, nsu, prefixo, tipoNsuApi);
      // Se esta pagina for abandonada (prazo esgotado antes de usa-la), evita unhandledRejection.
      promessa.catch(() => {});
      return promessa;
    };

    let proximaPagina = buscarPagina(ultNsu);

    while (iteracoes < LIMITE_ITERACOES) {
      if (Date.now() > prazo) return { novos, ultimoNsu: ultNsu, iteracoes, concluido: false };
      iteracoes++;

      const resposta = await proximaPagina;
      if (resposta.status === 404) {
        // E2020 "nenhum documento a partir do NSU": fim normal. O corpo explica o motivo.
        const corpo = resposta.data as RespostaDistribuicao;
        return { novos, ultimoNsu: ultNsu, iteracoes, concluido: true, mensagemAmbiente: corpo?.Erros?.[0]?.Descricao };
      }
      if (resposta.status >= 400) {
        throw new BadRequestException(
          `Falha ao consultar distribuicao ${tipo} (NSU ${ultNsu}): HTTP ${resposta.status} - ${JSON.stringify(resposta.data).slice(0, 500)}`,
        );
      }

      const itens = (resposta.data as RespostaDistribuicao)?.LoteDFe ?? [];
      if (itens.length === 0) break;

      let maiorNsu = ultNsu;
      for (const item of itens) {
        if (item.NSU !== undefined && Number(item.NSU) > Number(maiorNsu)) maiorNsu = String(item.NSU);
      }

      // Lote completo = provavelmente ha mais paginas: dispara a proxima ja, em paralelo com a
      // gravacao da pagina atual, em vez de esperar o banco para so entao pedir a proxima.
      const loteCompleto = itens.length >= TAMANHO_LOTE_COMPLETO;
      if (loteCompleto) proximaPagina = buscarPagina(maiorNsu);

      novos += await this.persistirLote(contribuinteId, tipo, itens);
      ultNsu = maiorNsu;
      await this.prisma.contribuinte.update({ where: { id: contribuinteId }, data: { [cursor]: ultNsu } });

      if (!loteCompleto) break;
    }
    return { novos, ultimoNsu: ultNsu, iteracoes, concluido: true };
  }

  /**
   * Aplica eventos de cancelamento (tipo 101101) ja recebidos sobre as NFS-e correspondentes
   * (mesma chave de acesso), marcando-as como canceladas - elas ficam fora das listagens/totais
   * por padrao a partir daqui. Roda a cada sincronizacao para pegar cancelamentos recebidos
   * antes ou depois da propria NFS-e, em qualquer ordem.
   */
  private async aplicarEventosCancelamento(contribuinteId: string): Promise<number> {
    const eventos = await this.prisma.nfseDistribuida.findMany({
      where: { contribuinteId, tipoDocumento: 'Evento', chaveAcesso: { not: null } },
      select: { chaveAcesso: true, xmlBruto: true },
    });

    let total = 0;
    for (const evento of eventos) {
      const ehCancelamento = evento.xmlBruto.includes('<e101101>');
      if (!ehCancelamento || !evento.chaveAcesso) continue;

      const resultado = await this.prisma.nfseDistribuida.updateMany({
        where: {
          contribuinteId,
          chaveAcesso: evento.chaveAcesso,
          tipoDocumento: 'NFSe',
          cancelada: false,
        },
        data: { cancelada: true },
      });
      total += resultado.count;
    }
    return total;
  }

  /**
   * Persiste um lote inteiro (ate 50 itens) de uma vez: checagem de duplicados em lote (1-2
   * idas ao banco para o lote todo, em vez de 1-3 por item) + gravacao com createMany.
   * Antes disso cada item do lote fazia sua propria sequencia de queries, um apos o outro -
   * o maior custo de banco da sincronizacao por NSU.
   */
  private async persistirLote(contribuinteId: string, tipoNsu: TipoNsu, itens: ItemLoteDFe[]): Promise<number> {
    const validos = itens.filter((item) => item.NSU !== undefined && item.ArquivoXml);
    if (validos.length === 0) return 0;

    const nsus = validos.map((item) => String(item.NSU));
    const jaGravadosPorNsu = await this.prisma.nfseDistribuida.findMany({
      where: { contribuinteId, tipoNsu, nsu: { in: nsus } },
      select: { nsu: true },
    });
    const nsusExistentes = new Set(jaGravadosPorNsu.map((n) => n.nsu));
    const novosPorNsu = validos.filter((item) => !nsusExistentes.has(String(item.NSU)));
    if (novosPorNsu.length === 0) return 0;

    const candidatos = await Promise.all(
      novosPorNsu.map(async (item) => {
        const xml = gunzipSync(Buffer.from(item.ArquivoXml!, 'base64')).toString('utf8');
        const campos = await this.extrairCamposXml(xml, item.TipoDocumento);
        return {
          nsu: String(item.NSU),
          xml,
          chaveAcesso: item.ChaveAcesso ?? campos.chaveAcesso,
          campos,
        };
      }),
    );

    // A mesma NFS-e pode chegar por mais de um tipo de NSU, ou se repetir dentro do proprio
    // lote: guarda uma vez so, pela chave de acesso.
    const chavesNfseDoLote = candidatos
      .filter((c) => c.campos.tipoDocumento === 'NFSe' && c.chaveAcesso)
      .map((c) => c.chaveAcesso as string);
    const chavesJaGravadas = chavesNfseDoLote.length
      ? new Set(
          (
            await this.prisma.nfseDistribuida.findMany({
              where: { contribuinteId, tipoDocumento: 'NFSe', chaveAcesso: { in: chavesNfseDoLote } },
              select: { chaveAcesso: true },
            })
          ).map((n) => n.chaveAcesso as string),
        )
      : new Set<string>();

    const chavesVistasNesteLote = new Set<string>();
    const paraGravar = candidatos.filter((c) => {
      if (c.campos.tipoDocumento === 'NFSe' && c.chaveAcesso) {
        if (chavesJaGravadas.has(c.chaveAcesso) || chavesVistasNesteLote.has(c.chaveAcesso)) return false;
        chavesVistasNesteLote.add(c.chaveAcesso);
      }
      return true;
    });
    if (paraGravar.length === 0) return 0;

    const resultado = await this.prisma.nfseDistribuida.createMany({
      data: paraGravar.map((c) => ({
        contribuinteId,
        tipoNsu,
        nsu: c.nsu,
        xmlBruto: c.xml,
        chaveAcesso: c.chaveAcesso,
        ...c.campos,
      })),
      // Guarda-chuva contra corrida com outra sincronizacao da mesma entidade (ex: painel aberto
      // em duas abas) gravando o mesmo NSU entre a verificacao e o createMany.
      skipDuplicates: true,
    });
    return resultado.count;
  }

  private async extrairCamposXml(xml: string, tipoDocumentoApi?: string) {
    const tipoDocumento = tipoDocumentoApi?.toUpperCase().includes('NFS')
      ? 'NFSe'
      : tipoDocumentoApi?.toUpperCase().includes('EVENTO')
        ? 'Evento'
        : 'Desconhecido';

    try {
      const parsed = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });
      // Leiaute real confirmado: <NFSe><infNFSe Id="..."> ... <emit><CNPJ/xNome/> ... <valores><vLiq/>
      // ... <DPS><infDPS><dhEmi/toma/> </infDPS></DPS> </infNFSe></NFSe>
      const infNFSe = parsed?.NFSe?.infNFSe;
      if (!infNFSe) {
        // Evento: a chave da nota referenciada comeca pelo municipio emissor dela.
        const chaveEvento = texto(parsed?.evento?.infEvento?.pedRegEvento?.infPedReg?.chNFSe);
        return { tipoDocumento, numeroNfse: undefined, codigoMunicipioEmissor: chaveEvento?.slice(0, 7) };
      }

      const infDPS = infNFSe?.DPS?.infDPS;
      // xml2js (com as opcoes usadas aqui) coloca atributos em `$`, nao em `@_` (convencao de
      // outras libs, ex: fast-xml-parser). O atributo Id vem como "NFS" + chave de acesso (52 digitos).
      const idAttr = texto(infNFSe?.$?.Id);
      const chaveAcesso = idAttr?.replace(/^NFS/, '');
      const numeroNfse = texto(infNFSe?.nNFSe);
      const codigoMunicipio = texto(infNFSe?.cLocIncid) ?? texto(infNFSe?.xLocPrestacao) ?? texto(infNFSe?.xLocEmi);
      const codigoMunicipioEmissor = texto(infNFSe?.cLocEmi) ?? chaveAcesso?.slice(0, 7);
      const nomeMunicipioEmissor = nomeDoMunicipioEmissor(infNFSe, codigoMunicipioEmissor);
      const cnpjPrestador = texto(infNFSe?.emit?.CNPJ) ?? texto(infNFSe?.emit?.CPF);
      const nomePrestador = texto(infNFSe?.emit?.xNome);
      const cnpjTomador = texto(infDPS?.toma?.CNPJ) ?? texto(infDPS?.toma?.CPF);
      const vLiq = texto(infNFSe?.valores?.vLiq);
      const valorServicos = vLiq && Number.isFinite(Number(vLiq)) ? Number(vLiq) : undefined;
      const dhEmissao = texto(infDPS?.dhEmi) ?? texto(infNFSe?.dhProc);
      const dataEmissao = dhEmissao && !Number.isNaN(Date.parse(dhEmissao)) ? new Date(dhEmissao) : undefined;

      return {
        tipoDocumento,
        chaveAcesso,
        numeroNfse,
        codigoMunicipio,
        codigoMunicipioEmissor,
        nomeMunicipioEmissor,
        cnpjPrestador,
        nomePrestador,
        cnpjTomador,
        valorServicos,
        dataEmissao,
      };
    } catch (error) {
      this.logger.warn(`Nao foi possivel interpretar o XML do documento distribuido: ${error}`);
      return { tipoDocumento };
    }
  }

  /**
   * Diagnostico: chama o ADN diretamente e devolve a resposta sem nenhuma interpretacao.
   * Tenta os 2 caminhos possiveis para a distribuicao - sem prefixo (API do Contribuinte,
   * por CNPJ/CPF como prestador/tomador/intermediario) e com prefixo /municipios (API do
   * Municipio, por codigo IBGE como interessado/incidencia).
   */
  async consultarBruto(contribuinteId: string, certificadoId: string, nsu: string) {
    const contribuinte = await this.prisma.contribuinte.findUnique({ where: { id: contribuinteId } });
    if (!contribuinte) throw new NotFoundException('Contribuinte nao encontrado.');

    const chaves = await this.certificados.carregarCredencial(certificadoId);

    const tentar = async (prefixo: string) => {
      try {
        const resposta = await this.sefinClient.consultarDistribuicaoPorNsu(chaves, nsu, prefixo);
        return { status: resposta.status, headers: resposta.headers, dados: resposta.data };
      } catch (error) {
        return { erro: error instanceof Error ? error.message : String(error) };
      }
    };

    const [semPrefixo, comPrefixoMunicipios] = await Promise.all([
      tentar(''),
      tentar('/municipios'),
    ]);

    return {
      'GET /DFe/{nsu} (API do Contribuinte, padrao atual do sistema)': semPrefixo,
      'GET /municipios/DFe/{nsu} (tentativa alternativa, API do Municipio)': comPrefixoMunicipios,
    };
  }

  async obterXml(documentoId: string): Promise<{ xml: string; chaveAcesso: string | null }> {
    const doc = await this.prisma.nfseDistribuida.findUnique({ where: { id: documentoId } });
    if (!doc) throw new NotFoundException('Documento nao encontrado.');
    return { xml: doc.xmlBruto, chaveAcesso: doc.chaveAcesso };
  }

  /**
   * DANFSe (PDF) de uma nota distribuida, a partir da chave de acesso - disponibilizado pelo ADN.
   * Tenta sem prefixo e, se falhar, com /municipios (mesma ambiguidade de caminho do /DFe/{nsu}).
   */
  async obterDanfse(chaveAcesso: string, certificadoId: string): Promise<Buffer> {
    const chaves = await this.certificados.carregarCredencial(certificadoId);

    // ATENCAO: testado com varias chaves reais - /danfse/{chave} consistentemente devolve 503
    // (servico indisponivel no ADN) e /municipios/danfse/{chave} nao existe (404, sempre). Nao
    // tentamos mais o prefixo /municipios aqui pois comprovadamente nunca funciona para DANFSe.
    const resposta = await this.sefinClient.obterDanfsePdf(chaves, chaveAcesso, '');
    if (resposta.status === 503) {
      throw new BadRequestException(
        'O servico de DANFSe do Ambiente Nacional esta indisponivel no momento (HTTP 503). ' +
          'Isso nao e um problema deste sistema - tente novamente mais tarde. Enquanto isso, ' +
          'use "Baixar XML", que contem os mesmos dados da nota.',
      );
    }
    if (resposta.status >= 400) {
      throw new BadRequestException(
        `Nao foi possivel obter o DANFSe no Ambiente Nacional (HTTP ${resposta.status}).`,
      );
    }
    return Buffer.from(resposta.data as ArrayBuffer);
  }

  /** XMLs (para montar um .zip) de todas as notas que batem com o filtro atual. */
  async listarXmlsParaExportar(
    contribuinteId: string,
    filtro: FiltroNotas,
  ): Promise<Array<{ nomeArquivo: string; xml: string }>> {
    const notas = await this.prisma.nfseDistribuida.findMany({
      where: this.montarFiltro(contribuinteId, filtro),
      select: { id: true, nomePrestador: true, numeroNfse: true, chaveAcesso: true, xmlBruto: true },
      orderBy: [{ nomePrestador: 'asc' }, { dataEmissao: 'desc' }],
    });
    return notas.map((n) => ({
      nomeArquivo: `${n.nomePrestador ?? 'empresa'}_${n.numeroNfse ?? n.chaveAcesso ?? n.id}.xml`
        .replace(/[\\/:*?"<>|]/g, '-')
        .slice(0, 150),
      xml: n.xmlBruto,
    }));
  }

  /** Sem o XML: com dezenas de milhares de notas ele tornaria a resposta enorme (baixe por #obterXml). */
  async listar(contribuinteId: string, filtro: FiltroNotas) {
    return this.prisma.nfseDistribuida.findMany({
      where: this.montarFiltro(contribuinteId, filtro),
      select: {
        id: true,
        chaveAcesso: true,
        numeroNfse: true,
        codigoMunicipio: true,
        codigoMunicipioEmissor: true,
        cnpjPrestador: true,
        nomePrestador: true,
        cnpjTomador: true,
        valorServicos: true,
        dataEmissao: true,
        cancelada: true,
      },
      orderBy: [{ nomePrestador: 'asc' }, { dataEmissao: 'desc' }],
    });
  }

  /** Quantas notas canceladas existem no periodo/filtro, mas foram excluidas de #listar. */
  async contarCanceladas(contribuinteId: string, filtro: FiltroNotas) {
    return this.prisma.nfseDistribuida.count({
      where: { ...this.montarFiltro(contribuinteId, { ...filtro, incluirCanceladas: true }), cancelada: true },
    });
  }

  /**
   * Municipios onde as notas da entidade foram emitidas, com a quantidade - para o filtro do painel.
   * O mais frequente costuma ser o proprio municipio (prefeitura); os demais sao notas de outros
   * municipios em que ele e interessado.
   */
  async listarMunicipiosEmissores(contribuinteId: string) {
    const grupos = await this.prisma.nfseDistribuida.groupBy({
      by: ['codigoMunicipioEmissor'],
      where: { contribuinteId, tipoDocumento: 'NFSe', cancelada: false },
      _count: { _all: true },
      _max: { nomeMunicipioEmissor: true },
    });
    return grupos
      .filter((g) => g.codigoMunicipioEmissor)
      .map((g) => ({
        codigo: g.codigoMunicipioEmissor as string,
        nome: g._max.nomeMunicipioEmissor ?? null,
        quantidade: g._count._all,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }

  /** Lista agrupada por empresa prestadora - usado para o relatorio "separado por empresa". */
  async listarAgrupadoPorEmpresa(contribuinteId: string, filtro: FiltroNotas) {
    const notas = await this.listar(contribuinteId, filtro);

    const grupos = new Map<string, { cnpj: string; nome: string; notas: typeof notas; total: number }>();
    for (const nota of notas) {
      const chave = nota.cnpjPrestador ?? 'desconhecido';
      if (!grupos.has(chave)) {
        grupos.set(chave, { cnpj: chave, nome: nota.nomePrestador ?? '(empresa nao identificada)', notas: [], total: 0 });
      }
      const grupo = grupos.get(chave)!;
      grupo.notas.push(nota);
      grupo.total += nota.valorServicos ? Number(nota.valorServicos) : 0;
    }

    return Array.from(grupos.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }

  private montarFiltro(contribuinteId: string, filtro: FiltroNotas) {
    const periodo: { gte?: Date; lte?: Date } = {};
    if (filtro.dataInicio) periodo.gte = new Date(`${filtro.dataInicio}T00:00:00`);
    if (filtro.dataFim) periodo.lte = new Date(`${filtro.dataFim}T23:59:59`);
    return {
      contribuinteId,
      tipoDocumento: 'NFSe',
      ...(filtro.incluirCanceladas ? {} : { cancelada: false }),
      ...(filtro.municipioEmissor ? { codigoMunicipioEmissor: filtro.municipioEmissor } : {}),
      ...(filtro.codigoMunicipio ? { codigoMunicipio: filtro.codigoMunicipio } : {}),
      ...(filtro.dataInicio || filtro.dataFim ? { dataEmissao: periodo } : {}),
    };
  }
}

/**
 * Nome do municipio emissor. Alguns sistemas municipais gravam o CODIGO em xLocEmi; nesse caso
 * usamos o nome do municipio de incidencia quando for o mesmo municipio.
 */
function nomeDoMunicipioEmissor(infNFSe: Record<string, unknown>, codigo?: string): string | undefined {
  const xLocEmi = texto(infNFSe?.xLocEmi);
  if (xLocEmi && !/^\d+$/.test(xLocEmi)) return xLocEmi;
  if (codigo && texto(infNFSe?.cLocIncid) === codigo) return texto(infNFSe?.xLocIncid);
  return undefined;
}

/**
 * Texto de um no lido pelo xml2js. Elemento com atributo vira { _: 'texto', $: {...} } e elemento
 * vazio pode virar '' ou { $: {...} } - varios sistemas municipais geram assim.
 */
function texto(valor: unknown): string | undefined {
  if (typeof valor === 'string') return valor.trim() || undefined;
  if (typeof valor === 'number') return String(valor);
  if (valor && typeof valor === 'object' && typeof (valor as { _?: unknown })._ === 'string') {
    return ((valor as { _: string })._).trim() || undefined;
  }
  return undefined;
}
