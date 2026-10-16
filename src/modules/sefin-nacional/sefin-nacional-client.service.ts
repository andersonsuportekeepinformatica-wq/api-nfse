import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { ChavesPem } from '../certificados/certificados.service';
import { ConfiguracaoService } from '../configuracao/configuracao.service';
import { CertificadosWindowsService } from './certificados-windows.service';

/** Certificado instalado no Windows: o mTLS e feito pelo proprio Windows (chave nao exportavel). */
export interface CertificadoRepositorioWindows {
  thumbprint: string;
}

/** Com o que autenticar no Ambiente Nacional: chaves PEM (.pfx anexado) ou certificado do Windows. */
export type CredencialCertificado = ChavesPem | CertificadoRepositorioWindows;

interface RespostaHttp {
  status: number;
  data: unknown;
  headers: Record<string, unknown>;
}

/**
 * Cliente HTTP para o Ambiente Nacional NFS-e (Sefin Nacional / ADN).
 *
 * O Ambiente Nacional exige TLS mutuo (mTLS): o certificado digital ICP-Brasil do
 * contribuinte/municipio e apresentado como certificado de CLIENTE a cada chamada,
 * nao havendo token OAuth separado. Por isso cada requisicao monta um https.Agent
 * proprio a partir das chaves (certificado + chave privada) do contribuinte.
 *
 * NOTA: usamos `cert`/`key` em PEM (extraidos do .pfx via node-forge, puro JS) em vez de
 * passar `pfx`/`passphrase` direto para o https.Agent. O parser PKCS12 nativo do Node.js
 * (OpenSSL 3.x) rejeita arquivos .pfx cifrados com algoritmos legados (RC2-40-CBC/3DES),
 * que sao comuns em certificados ICP-Brasil, com o erro "Unsupported PKCS12 PFX data".
 * O node-forge (usado em certificados.service.ts) nao tem essa limitacao.
 *
 * Certificados instalados no Windows (ver CertificadosWindowsService) seguem outro caminho:
 * a requisicao e feita pelo Windows, pois a chave privada nao pode ser extraida.
 *
 * O ambiente ativo (homologacao ou producao) e lido em runtime via ConfiguracaoService
 * (trocavel pelo painel, sem reiniciar o servidor) - ver .env.example para os hosts de cada um.
 */
@Injectable()
export class SefinNacionalClientService {
  private readonly logger = new Logger(SefinNacionalClientService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly configuracao: ConfiguracaoService,
    private readonly certificadosWindows: CertificadosWindowsService,
  ) {}

  private get timeoutMs(): number {
    return Number(this.config.get('SEFIN_NACIONAL_TIMEOUT_MS') ?? 30000);
  }

  // Um https.Agent por credencial+ambiente, reaproveitado entre chamadas (keep-alive). Sem isso,
  // cada requisicao ao ADN pagava um handshake mTLS completo do zero - o maior custo da
  // sincronizacao por NSU, que faz centenas/milhares de chamadas em sequencia.
  private readonly agentesHttp = new Map<string, https.Agent>();

  /** Ponto unico de saida para o Ambiente Nacional: escolhe o transporte pela origem do certificado. */
  private async requisitar(
    credencial: CredencialCertificado,
    baseURL: string,
    metodo: 'GET' | 'POST',
    caminho: string,
    opcoes: { corpo?: unknown; binario?: boolean } = {},
  ): Promise<RespostaHttp> {
    if ('thumbprint' in credencial) {
      if (metodo !== 'GET') {
        // Envio de DPS/eventos exige assinar XML com a chave privada, que o Windows nao entrega.
        throw new Error('Emissao e cancelamento exigem certificado anexado (.pfx), nao o instalado no Windows.');
      }
      const r = await this.certificadosWindows.get(
        credencial.thumbprint,
        baseURL + caminho,
        opcoes.binario ? '*/*' : 'application/json',
        this.timeoutMs,
      );
      return {
        status: r.status,
        data: opcoes.binario ? r.corpo : interpretarCorpo(r.corpo),
        headers: { 'content-type': r.contentType },
      };
    }

    const client = this.criarHttpClient(credencial, baseURL);
    const resposta = await client.request({
      method: metodo,
      url: caminho,
      data: opcoes.corpo,
      responseType: opcoes.binario ? 'arraybuffer' : 'json',
    });
    return { status: resposta.status, data: resposta.data, headers: resposta.headers as Record<string, unknown> };
  }

  private criarHttpClient(chaves: ChavesPem, baseURL: string): AxiosInstance {
    const chaveAgente = `${baseURL}::${chaves.certificatePem}`;
    let httpsAgent = this.agentesHttp.get(chaveAgente);
    if (!httpsAgent) {
      httpsAgent = new https.Agent({
        cert: chaves.certificatePem,
        key: chaves.privateKeyPem,
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
        keepAlive: true,
        maxSockets: 10,
      });
      this.agentesHttp.set(chaveAgente, httpsAgent);
    }

    return axios.create({
      baseURL,
      httpsAgent,
      timeout: this.timeoutMs,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      validateStatus: () => true, // tratamos status manualmente para capturar erros de negocio
    });
  }

  private async sefinBaseUrl(): Promise<string> {
    const producao = await this.configuracao.isProducao();
    const chave = producao ? 'SEFIN_NACIONAL_BASE_URL_PRODUCAO' : 'SEFIN_NACIONAL_BASE_URL_HOMOLOGACAO';
    const url = this.config.get<string>(chave);
    if (!url) throw new Error(`${chave} nao configurada.`);
    return url;
  }

  private async adnBaseUrl(): Promise<string> {
    const producao = await this.configuracao.isProducao();
    const chave = producao ? 'ADN_BASE_URL_PRODUCAO' : 'ADN_BASE_URL_HOMOLOGACAO';
    const url = this.config.get<string>(chave);
    if (!url) throw new Error(`${chave} nao configurada.`);
    return url;
  }

  /** POST /nfse - envia a DPS (XML assinado, GZip+Base64) e recebe a NFS-e gerada. */
  async enviarDps(chaves: ChavesPem, dpsXmlGzipBase64: string) {
    const resposta = await this.requisitar(chaves, await this.sefinBaseUrl(), 'POST', '/nfse', {
      corpo: { dpsXmlGzipB64: dpsXmlGzipBase64 },
    });
    this.logResposta('POST /nfse', resposta.status);
    return resposta;
  }

  /** GET /nfse/{chaveAcesso} */
  async consultarNfse(credencial: CredencialCertificado, chaveAcesso: string) {
    const resposta = await this.requisitar(credencial, await this.sefinBaseUrl(), 'GET', `/nfse/${chaveAcesso}`);
    this.logResposta(`GET /nfse/${chaveAcesso}`, resposta.status);
    return resposta;
  }

  /** GET /dps/{id} */
  async consultarDps(credencial: CredencialCertificado, idDps: string) {
    const resposta = await this.requisitar(credencial, await this.sefinBaseUrl(), 'GET', `/dps/${idDps}`);
    this.logResposta(`GET /dps/${idDps}`, resposta.status);
    return resposta;
  }

  /** POST /nfse/{chaveAcesso}/eventos - usado para cancelamento e demais eventos de NFS-e. */
  async registrarEvento(chaves: ChavesPem, chaveAcesso: string, eventoXmlGzipBase64: string) {
    const resposta = await this.requisitar(chaves, await this.sefinBaseUrl(), 'POST', `/nfse/${chaveAcesso}/eventos`, {
      corpo: { eventoXmlGzipB64: eventoXmlGzipBase64 },
    });
    this.logResposta(`POST /nfse/${chaveAcesso}/eventos`, resposta.status);
    return resposta;
  }

  /** GET /nfse/{chaveAcesso}/eventos */
  async consultarEventos(credencial: CredencialCertificado, chaveAcesso: string) {
    const resposta = await this.requisitar(
      credencial,
      await this.sefinBaseUrl(),
      'GET',
      `/nfse/${chaveAcesso}/eventos`,
    );
    this.logResposta(`GET /nfse/${chaveAcesso}/eventos`, resposta.status);
    return resposta;
  }

  /** GET /parametros_municipais/{codigoMunicipio}/convenio */
  async consultarConvenioMunicipio(credencial: CredencialCertificado, codigoIbge: string) {
    const resposta = await this.requisitar(
      credencial,
      await this.sefinBaseUrl(),
      'GET',
      `/parametros_municipais/${codigoIbge}/convenio`,
    );
    this.logResposta(`GET /parametros_municipais/${codigoIbge}/convenio`, resposta.status);
    return resposta;
  }

  /** GET /parametros_municipais/{codigoMunicipio}/{codigoServico} */
  async consultarAliquotasServico(credencial: CredencialCertificado, codigoIbge: string, codigoServico: string) {
    const resposta = await this.requisitar(
      credencial,
      await this.sefinBaseUrl(),
      'GET',
      `/parametros_municipais/${codigoIbge}/${codigoServico}`,
    );
    this.logResposta(
      `GET /parametros_municipais/${codigoIbge}/${codigoServico}`,
      resposta.status,
    );
    return resposta;
  }

  /** GET /danfse/{chaveAcesso} - PDF do DANFSe, disponibilizado pelo ADN. */
  async obterDanfsePdf(credencial: CredencialCertificado, chaveAcesso: string, prefixo = '') {
    const caminho = `${prefixo}/danfse/${chaveAcesso}`;
    const resposta = await this.requisitar(credencial, await this.adnBaseUrl(), 'GET', caminho, { binario: true });
    this.logResposta(`GET ${caminho}`, resposta.status);
    return resposta;
  }

  /**
   * GET /DFe/{NSU} - API de Distribuicao do Contribuinte (ADN): retorna o(s) documento(s)
   * fiscal(is) eletronico(s) (NFS-e e eventos) onde o titular do certificado usado na conexao
   * figura como prestador, tomador ou intermediario, a partir do NSU informado.
   *
   * ATENCAO: o manual publico ("Manual dos Contribuintes - Guia para utilizacao das APIs do
   * ADN") descreve o retorno no singular ("o DF-e associado"), mas o padrao nacional de
   * distribuicao de documentos fiscais (replicado do modelo usado pela NF-e ha anos) tipicamente
   * devolve um LOTE a partir do NSU informado, com o maior NSU dispovel. Esta implementacao
   * aceita os dois formatos (objeto unico ou lista) — ver distribuicao.service.ts. Validar o
   * formato exato de resposta contra o ambiente de homologacao real no credenciamento.
   */
  async consultarDistribuicaoPorNsu(credencial: CredencialCertificado, nsu: string, prefixo = '', tipoNsu?: string) {
    const caminho = `${prefixo}/DFe/${nsu}${tipoNsu ? `?tipoNSU=${tipoNsu}` : ''}`;
    const resposta = await this.requisitar(credencial, await this.adnBaseUrl(), 'GET', caminho);
    this.logResposta(`GET ${caminho}`, resposta.status);
    return resposta;
  }

  private logResposta(operacao: string, status: number) {
    this.logger.log(`${operacao} -> HTTP ${status}`);
  }
}

/** Mesmo comportamento do axios com responseType 'json': JSON quando der, senao texto. */
function interpretarCorpo(corpo: Buffer): unknown {
  const texto = corpo.toString('utf8');
  if (!texto) return '';
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}
