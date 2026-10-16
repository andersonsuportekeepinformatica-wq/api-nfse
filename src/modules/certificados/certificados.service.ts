import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as forge from 'node-forge';
import { PrismaService } from '../../prisma/prisma.service';
import { SecretCipherService } from '../../common/crypto/secret-cipher.service';
import { ContribuintesService } from '../contribuintes/contribuintes.service';
import { ChavesApiService } from '../../common/auth/chaves-api.service';
import { Acesso } from '../../common/auth/acesso';
import { CertificadosWindowsService } from '../sefin-nacional/certificados-windows.service';
import type { CredencialCertificado } from '../sefin-nacional/sefin-nacional-client.service';

export interface CertificadoCarregado {
  pfx: Buffer;
  senha: string;
}

export interface ChavesPem {
  privateKeyPem: string;
  certificatePem: string;
}

// O que pode sair pela API sobre um certificado: nunca o .pfx/senha cifrados.
const CAMPOS_PUBLICOS = {
  id: true,
  tipo: true,
  origem: true,
  titular: true,
  numeroSerie: true,
  validoDe: true,
  validoAte: true,
  ativo: true,
  criadoEm: true,
} as const;

@Injectable()
export class CertificadosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: SecretCipherService,
    private readonly contribuintes: ContribuintesService,
    private readonly chavesApi: ChavesApiService,
    private readonly certificadosWindows: CertificadosWindowsService,
  ) {}

  /**
   * Recebe o arquivo .pfx (A1) em bytes + senha, valida o certificado (parse via node-forge),
   * extrai metadados (titular, validade, numero de serie) e persiste cifrado em repouso.
   */
  async cadastrar(params: {
    contribuinteId: string;
    arquivoPfx: Buffer;
    senha: string;
  }) {
    const contribuinte = await this.prisma.contribuinte.findUnique({
      where: { id: params.contribuinteId },
    });
    if (!contribuinte) {
      throw new NotFoundException(
        'Contribuinte nao encontrado. Cadastre o contribuinte antes de anexar o certificado.',
      );
    }

    const metadados = this.inspecionarPfx(params.arquivoPfx, params.senha);

    if (metadados.validoAte < new Date()) {
      throw new BadRequestException('Certificado informado ja esta vencido.');
    }

    const certificado = await this.persistirCertificado({
      contribuinteId: params.contribuinteId,
      arquivoPfx: params.arquivoPfx,
      senha: params.senha,
      metadados,
    });
    const chaveApi = await this.chavesApi.gerarParaContribuinte(params.contribuinteId);
    return { ...certificado, chaveApi };
  }

  private async persistirCertificado(params: {
    contribuinteId: string;
    arquivoPfx: Buffer;
    senha: string;
    metadados: { titular: string; numeroSerie: string; validoDe: Date; validoAte: Date };
  }) {
    const arquivoCifrado = this.cipher.encrypt(params.arquivoPfx);
    const senhaCifrada = this.cipher.encrypt(params.senha);

    return this.prisma.certificado.create({
      data: {
        contribuinteId: params.contribuinteId,
        tipo: 'A1',
        arquivoCifrado: arquivoCifrado.ciphertext,
        iv: arquivoCifrado.iv,
        authTag: arquivoCifrado.authTag,
        // senha cifrada reaproveita o mesmo IV/authTag empacotados em um unico campo texto
        senhaCifrada: `${senhaCifrada.iv}:${senhaCifrada.authTag}:${senhaCifrada.ciphertext.toString('hex')}`,
        titular: params.metadados.titular,
        numeroSerie: params.metadados.numeroSerie,
        validoDe: params.metadados.validoDe,
        validoAte: params.metadados.validoAte,
      },
      select: CAMPOS_PUBLICOS,
    });
  }

  /**
   * Fluxo rapido: o usuario so anexa o .pfx + senha (e opcionalmente escolhe o municipio de
   * domicilio). O CPF/CNPJ e o nome sao extraidos do proprio certificado (padrao ICP-Brasil
   * e-CPF/e-CNPJ, onde o CN vem no formato "NOME:CPFOUCNPJ"), e o contribuinte e localizado ou
   * criado automaticamente - sem precisar de um cadastro manual previo.
   */
  async anexarRapido(params: { arquivoPfx: Buffer; senha: string; municipioId?: string }, acesso: Acesso) {
    const metadados = this.inspecionarPfx(params.arquivoPfx, params.senha);

    if (metadados.validoAte < new Date()) {
      throw new BadRequestException('Certificado informado ja esta vencido.');
    }

    const contribuinte = await this.resolverEntidadeDoTitular(metadados.titular, params.municipioId, acesso);

    const certificado = await this.persistirCertificado({
      contribuinteId: contribuinte.id,
      arquivoPfx: params.arquivoPfx,
      senha: params.senha,
      metadados,
    });

    const chaveApi = await this.chavesApi.gerarParaContribuinte(contribuinte.id);
    return { contribuinte, certificado, chaveApi };
  }

  /**
   * Certificados instalados no Windows deste computador, para o usuario escolher qual usar.
   * Indica se ja estao vencidos e a qual entidade cadastrada correspondem.
   */
  async listarInstaladosWindows() {
    const instalados = await this.certificadosWindows.listarInstalados();
    const agora = new Date();
    const resultado = [];
    for (const c of instalados) {
      const identificacao = this.extrairIdentificacaoDoTitular(c.titular);
      const entidade = identificacao
        ? await this.contribuintes.buscarPorInscricao(identificacao.tipo, identificacao.numero)
        : null;
      resultado.push({
        thumbprint: c.thumbprint,
        titular: c.titular,
        nome: identificacao?.nome ?? c.titular,
        tipoInscricao: identificacao?.tipo ?? null,
        inscricaoFederal: identificacao?.numero ?? null,
        emissor: c.emissor,
        validoAte: c.validoAte,
        vencido: c.validoAte < agora,
        entidadeCadastrada: entidade ? { id: entidade.id, razaoSocial: entidade.razaoSocial } : null,
      });
    }
    // Validos primeiro, depois por nome.
    return resultado.sort((a, b) => Number(a.vencido) - Number(b.vencido) || a.nome.localeCompare(b.nome));
  }

  /**
   * Usa um certificado instalado no Windows (escolhido pelo thumbprint) em vez de anexar o .pfx.
   * Guarda so a referencia; a chave privada continua no Windows. Mesmas regras de entidade do
   * anexo rapido e mesma geracao de chave de API.
   */
  async usarInstaladoWindows(params: { thumbprint: string; municipioId?: string }, acesso: Acesso) {
    const instalado = await this.certificadosWindows.obterInstalado(params.thumbprint);
    if (instalado.validoAte < new Date()) {
      throw new BadRequestException(`O certificado "${instalado.titular}" esta vencido.`);
    }

    const contribuinte = await this.resolverEntidadeDoTitular(instalado.titular, params.municipioId, acesso);

    // Escolher de novo o mesmo certificado nao duplica o registro.
    const existente = await this.prisma.certificado.findFirst({
      where: { contribuinteId: contribuinte.id, thumbprint: instalado.thumbprint, ativo: true },
      select: CAMPOS_PUBLICOS,
    });
    const certificado =
      existente ??
      (await this.prisma.certificado.create({
        data: {
          contribuinteId: contribuinte.id,
          tipo: 'A1',
          origem: 'REPOSITORIO_WINDOWS',
          thumbprint: instalado.thumbprint,
          titular: instalado.titular,
          // Windows devolve o serial em hexa maiusculo; o node-forge (anexo .pfx), em minusculo.
          numeroSerie: instalado.numeroSerie.toLowerCase(),
          validoDe: instalado.validoDe,
          validoAte: instalado.validoAte,
        },
        select: CAMPOS_PUBLICOS,
      }));

    const chaveApi = await this.chavesApi.gerarParaContribuinte(contribuinte.id);
    return { contribuinte, certificado, chaveApi };
  }

  /**
   * Identifica a entidade pelo CN do certificado (ICP-Brasil: "NOME:CPFOUCNPJ"), aplica as regras
   * de acesso e devolve o contribuinte, criando-o se for novo (so com a chave mestra).
   */
  private async resolverEntidadeDoTitular(titular: string, municipioId: string | undefined, acesso: Acesso) {
    const identificacao = this.extrairIdentificacaoDoTitular(titular);
    if (!identificacao) {
      throw new BadRequestException(
        `Nao foi possivel identificar o CPF/CNPJ no certificado (titular: "${titular}"). ` +
          'Certificados ICP-Brasil e-CPF/e-CNPJ normalmente trazem o numero no campo CN, no formato "NOME:NUMERO". ' +
          'Se o seu certificado nao segue esse padrao, cadastre o contribuinte manualmente na aba Contribuintes e anexe o certificado por la.',
      );
    }

    // Chave de entidade so pode anexar certificado da propria entidade (renovacao); criar
    // entidade nova e privilegio da chave mestra.
    if (!acesso.admin) {
      const existente = await this.contribuintes.buscarPorInscricao(identificacao.tipo, identificacao.numero);
      if (!existente) {
        throw new ForbiddenException(
          `"${identificacao.nome}" ainda nao esta cadastrada. A chave em uso no painel e de uma entidade e so ` +
            'renova o certificado dela mesma - para cadastrar uma entidade nova, use a chave mestra (API_KEY do .env).',
        );
      }
      if (existente.id !== acesso.contribuinteId) {
        throw new ForbiddenException(
          `Este certificado e de "${existente.razaoSocial}", outra entidade. A chave em uso no painel nao tem acesso a ela - use a chave mestra.`,
        );
      }
    }

    return this.contribuintes.encontrarOuCriarPorInscricao({
      tipoInscricao: identificacao.tipo,
      inscricaoFederal: identificacao.numero,
      razaoSocial: identificacao.nome,
      municipioId,
    });
  }

  private extrairIdentificacaoDoTitular(
    titular: string,
  ): { tipo: 'CPF' | 'CNPJ'; numero: string; nome: string } | null {
    const partes = titular.split(':');
    if (partes.length < 2) return null;

    const numero = (partes[partes.length - 1] ?? '').replace(/\D/g, '');
    const nome = partes.slice(0, -1).join(':').trim();
    if (!nome) return null;

    if (numero.length === 11) return { tipo: 'CPF', numero, nome };
    if (numero.length === 14) return { tipo: 'CNPJ', numero, nome };
    return null;
  }

  async listarPorContribuinte(contribuinteId: string) {
    return this.prisma.certificado.findMany({
      where: { contribuinteId },
      select: CAMPOS_PUBLICOS,
      orderBy: { criadoEm: 'desc' },
    });
  }

  async revogar(id: string) {
    await this.obterOuFalhar(id);
    return this.prisma.certificado.update({ where: { id }, data: { ativo: false } });
  }

  /**
   * Credencial para conectar no Ambiente Nacional (consultas, distribuicao, DANFSe). Funciona
   * para as duas origens; para assinar XML (emitir/cancelar) use carregarChavesPem.
   */
  async carregarCredencial(certificadoId: string): Promise<CredencialCertificado> {
    const cert = await this.obterUtilizavel(certificadoId);
    if (cert.origem === 'REPOSITORIO_WINDOWS') {
      return { thumbprint: cert.thumbprint as string };
    }
    return this.carregarChavesPem(certificadoId);
  }

  /** Carrega e decifra o .pfx + senha para uso em runtime (ex: montar https.Agent mTLS). Nunca expor via API. */
  async carregarParaUso(certificadoId: string): Promise<CertificadoCarregado> {
    const cert = await this.obterUtilizavel(certificadoId);
    if (cert.origem === 'REPOSITORIO_WINDOWS' || !cert.arquivoCifrado || !cert.iv || !cert.authTag || !cert.senhaCifrada) {
      throw new BadRequestException(
        'Este certificado esta instalado no Windows e a chave nao pode ser extraida: ele serve para ' +
          'consultar e baixar notas/DANFSe. Para emitir ou cancelar NFS-e, anexe o arquivo .pfx.',
      );
    }

    const pfx = this.cipher.decrypt(cert.arquivoCifrado, cert.iv, cert.authTag);
    const [ivHex, authTagHex, ciphertextHex] = cert.senhaCifrada.split(':');
    const senha = this.cipher
      .decrypt(Buffer.from(ciphertextHex, 'hex'), ivHex, authTagHex)
      .toString('utf8');

    return { pfx, senha };
  }

  /** Extrai a chave privada e o certificado em PEM, usados para assinar o XML da DPS/evento (XMLDSig). */
  async carregarChavesPem(certificadoId: string): Promise<ChavesPem> {
    const { pfx, senha } = await this.carregarParaUso(certificadoId);

    const p12Asn1 = forge.asn1.fromDer(pfx.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag =
      keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ??
      p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
    if (!keyBag || !keyBag.key) {
      throw new BadRequestException('Nao foi possivel extrair a chave privada do certificado.');
    }

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    if (!certBag || !certBag.cert) {
      throw new BadRequestException('Nao foi possivel extrair o certificado do arquivo .pfx.');
    }

    const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
    const certificatePem = forge.pki.certificateToPem(certBag.cert);

    return { privateKeyPem, certificatePem };
  }

  private async obterUtilizavel(id: string) {
    const cert = await this.obterOuFalhar(id);
    if (!cert.ativo) {
      throw new BadRequestException('Certificado inativo/revogado.');
    }
    if (cert.validoAte < new Date()) {
      throw new BadRequestException('Certificado vencido.');
    }
    return cert;
  }

  private async obterOuFalhar(id: string) {
    const cert = await this.prisma.certificado.findUnique({ where: { id } });
    if (!cert) {
      throw new NotFoundException('Certificado nao encontrado.');
    }
    return cert;
  }

  private inspecionarPfx(pfxBuffer: Buffer, senha: string) {
    let p12Asn1;
    try {
      p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    } catch {
      throw new BadRequestException('Arquivo .pfx invalido ou corrompido.');
    }

    let p12;
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);
    } catch {
      throw new BadRequestException('Senha do certificado incorreta ou arquivo .pfx invalido.');
    }

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const bag = certBags[forge.pki.oids.certBag]?.[0];
    if (!bag || !bag.cert) {
      throw new BadRequestException('Nao foi possivel localizar o certificado dentro do arquivo .pfx.');
    }

    const cert = bag.cert;
    const titular = cert.subject.getField('CN')?.value ?? 'desconhecido';
    const numeroSerie = cert.serialNumber;
    const validoDe = cert.validity.notBefore;
    const validoAte = cert.validity.notAfter;

    return { titular, numeroSerie, validoDe, validoAte };
  }
}
