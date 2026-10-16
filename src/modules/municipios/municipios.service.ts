import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SefinNacionalClientService } from '../sefin-nacional/sefin-nacional-client.service';
import { CertificadosService } from '../certificados/certificados.service';
import { CriarMunicipioDto } from './dto/criar-municipio.dto';

@Injectable()
export class MunicipiosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sefinClient: SefinNacionalClientService,
    private readonly certificados: CertificadosService,
  ) {}

  async criar(dto: CriarMunicipioDto) {
    return this.prisma.municipio.create({ data: dto });
  }

  async listar() {
    return this.prisma.municipio.findMany({ orderBy: { nome: 'asc' } });
  }

  async obter(id: string) {
    const municipio = await this.prisma.municipio.findUnique({ where: { id } });
    if (!municipio) throw new NotFoundException('Municipio nao encontrado.');
    return municipio;
  }

  /**
   * Consulta os parametros do convenio do municipio junto ao Sefin Nacional e atualiza o cache local.
   * Requer um certificado valido (qualquer contribuinte conveniado pode consultar seus proprios
   * parametros municipais, conforme a API Parametros Municipais do Emissor Publico Nacional).
   */
  async sincronizarParametrosConvenio(municipioId: string, certificadoId: string) {
    const municipio = await this.obter(municipioId);
    const chaves = await this.certificados.carregarCredencial(certificadoId);
    const resposta = await this.sefinClient.consultarConvenioMunicipio(
      chaves,
      municipio.codigoIbge,
    );

    if (resposta.status >= 400) {
      return { sucesso: false, status: resposta.status, dados: resposta.data };
    }

    await this.prisma.municipio.update({
      where: { id: municipioId },
      data: { parametrosRaw: resposta.data as Prisma.InputJsonValue },
    });

    return { sucesso: true, status: resposta.status, dados: resposta.data };
  }

  async consultarAliquotasServico(
    municipioId: string,
    certificadoId: string,
    codigoServico: string,
  ) {
    const municipio = await this.obter(municipioId);
    const chaves = await this.certificados.carregarCredencial(certificadoId);
    const resposta = await this.sefinClient.consultarAliquotasServico(
      chaves,
      municipio.codigoIbge,
      codigoServico,
    );
    return { status: resposta.status, dados: resposta.data };
  }
}
