import { create } from 'xmlbuilder2';
import { EmitirDpsDto } from './dto/emitir-dps.dto';
import { Contribuinte, Municipio } from '@prisma/client';

/**
 * Monta o XML da DPS (Declaracao de Prestacao de Servicos) conforme o leiaute nacional
 * do Sistema Nacional NFS-e (schema infDPS / grupo DPS).
 *
 * ATENCAO - LEIAUTE: a estrutura abaixo segue o modelo publico de referencia da NT NFS-e
 * Nacional (grupos prest/toma/serv/valores dentro de infDPS). O XSD oficial completo
 * (AnexoI-LeiautesRN_DPS_NFSe-SNNFSe) e distribuido como anexo do credenciamento e deve
 * ser usado para validar/ajustar nomes de campos, ordem e campos obrigatorios adicionais
 * (ex: regimes especiais de tributacao, exigibilidade de ISS, intermediario) antes de
 * qualquer envio em producao. A construcao via objeto (abaixo) facilita ajustar campos
 * sem risco de desbalancear tags, bastando editar o objeto `infDPS`.
 */
export function construirIdDps(params: {
  codigoMunicipio: string;
  tipoInscricao: 'CPF' | 'CNPJ';
  inscricaoFederal: string;
  serie: string;
  numero: string;
}): string {
  const tpInsc = params.tipoInscricao === 'CNPJ' ? '2' : '1';
  const inscricaoPad = params.inscricaoFederal.padStart(14, '0');
  const seriePad = params.serie.padStart(5, '0');
  const numeroPad = params.numero.padStart(15, '0');
  return `DPS${params.codigoMunicipio}${tpInsc}${inscricaoPad}${seriePad}${numeroPad}`;
}

export function montarXmlDps(params: {
  dto: EmitirDpsDto;
  contribuinte: Contribuinte;
  municipioPrestador: Municipio;
  ambienteProducao: boolean;
}): { xml: string; idDps: string } {
  const { dto, contribuinte, municipioPrestador, ambienteProducao } = params;

  const idDps = construirIdDps({
    codigoMunicipio: municipioPrestador.codigoIbge,
    tipoInscricao: contribuinte.tipoInscricao,
    inscricaoFederal: contribuinte.inscricaoFederal,
    serie: dto.serie,
    numero: dto.numero,
  });

  const tagInscricaoPrestador = contribuinte.tipoInscricao === 'CNPJ' ? 'CNPJ' : 'CPF';
  const inscricaoTomadorLimpa = dto.tomador.inscricaoFederal.replace(/\D/g, '');
  const tagInscricaoTomador = inscricaoTomadorLimpa.length === 14 ? 'CNPJ' : 'CPF';

  const aliquota = dto.valores.aliquotaIss;
  const vIssqn = aliquota !== undefined ? (dto.valores.valorServicos * aliquota) / 100 : undefined;

  const infDPS: Record<string, unknown> = {
    '@Id': idDps,
    tpAmb: ambienteProducao ? '1' : '2',
    dhEmi: new Date().toISOString(),
    verAplic: 'api-nfs-e-1.0',
    serie: dto.serie,
    nDPS: dto.numero,
    dCompet: dto.competencia,
    tpEmit: '1', // 1 = Prestador emite diretamente via Emissor Publico Nacional
    cLocEmi: municipioPrestador.codigoIbge,
    ...(dto.chaveNfseSubstituida ? { chSubstda: dto.chaveNfseSubstituida } : {}),
    prest: {
      [tagInscricaoPrestador]: contribuinte.inscricaoFederal,
      xNome: contribuinte.razaoSocial,
    },
    toma: {
      [tagInscricaoTomador]: inscricaoTomadorLimpa,
      xNome: dto.tomador.razaoSocial,
      end: {
        endNac: {
          cMun: dto.tomador.codigoMunicipio,
          CEP: dto.tomador.cep ?? '',
        },
        xLgr: dto.tomador.logradouro ?? '',
      },
      ...(dto.tomador.email ? { email: dto.tomador.email } : {}),
    },
    serv: {
      locPrest: {
        cLocPrestacao: dto.servico.codigoMunicipioPrestacao,
      },
      cServ: {
        cTribNac: dto.servico.codigoTributacaoNacional,
        ...(dto.servico.codigoTributacaoMunicipal
          ? { cTribMun: dto.servico.codigoTributacaoMunicipal }
          : {}),
        xDescServ: dto.servico.descricao,
      },
    },
    valores: {
      vServPrest: {
        vServ: dto.valores.valorServicos.toFixed(2),
        ...(dto.valores.valorDeducoes ? { vDesc: dto.valores.valorDeducoes.toFixed(2) } : {}),
      },
      ...(aliquota !== undefined
        ? {
            trib: {
              tribMun: {
                tribISSQN: '1', // 1 = Operacao tributavel
                pAliq: aliquota.toFixed(4),
                vISSQN: vIssqn!.toFixed(2),
              },
            },
          }
        : {}),
    },
  };

  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele({
    DPS: {
      '@xmlns': 'http://www.sped.fazenda.gov.br/nfse',
      '@versao': '1.00',
      infDPS,
    },
  });

  const xml = doc.end({ prettyPrint: false });

  return { xml, idDps };
}
