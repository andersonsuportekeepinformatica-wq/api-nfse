import { create } from 'xmlbuilder2';

/**
 * Monta o XML do Pedido de Registro de Evento de Cancelamento de NFS-e.
 *
 * ATENCAO - LEIAUTE: estrutura simplificada do evento de cancelamento (tipo 101101 -
 * Cancelamento de NFS-e, conforme tabela de eventos do Sistema Nacional NFS-e). Validar
 * contra o AnexoII-LeiautesRN_Eventos-SNNFSe (grupo evCancNFSe) antes de uso em producao.
 */
export function montarXmlEventoCancelamento(params: {
  chaveAcesso: string;
  codigoMunicipioAutor: string;
  tipoInscricaoAutor: 'CPF' | 'CNPJ';
  inscricaoFederalAutor: string;
  motivo: string;
  numSeqEvento: number;
  ambienteProducao: boolean;
}): { xml: string; idEvento: string } {
  const idEvento = `EVT${params.chaveAcesso}${String(params.numSeqEvento).padStart(2, '0')}101101`;

  const infPedReg: Record<string, unknown> = {
    '@Id': idEvento,
    tpAmb: params.ambienteProducao ? '1' : '2',
    verAplic: 'api-nfs-e-1.0',
    dhEvento: new Date().toISOString(),
    cLocEmi: params.codigoMunicipioAutor,
    [params.tipoInscricaoAutor]: params.inscricaoFederalAutor,
    chNFSe: params.chaveAcesso,
    nPedRegEvento: '1',
    e101101: {
      xDesc: 'Cancelamento de NFS-e',
      cMotivo: '1',
      xMotivo: params.motivo,
    },
  };

  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele({
    pedRegEvento: {
      '@xmlns': 'http://www.sped.fazenda.gov.br/nfse',
      '@versao': '1.00',
      infPedReg,
    },
  });

  const xml = doc.end({ prettyPrint: false });
  return { xml, idEvento };
}
