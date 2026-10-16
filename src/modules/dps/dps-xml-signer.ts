import { SignedXml } from 'xml-crypto';
import { gzipSync } from 'zlib';

/**
 * Assina digitalmente o XML da DPS (ou de um evento de NFS-e) usando o padrao XMLDSig
 * exigido pelo Sistema Nacional NFS-e: assinatura enveloped, canonicalizacao C14N,
 * SHA-256 + RSA, referenciando o elemento pelo atributo Id (ex: Id="DPS...").
 */
export function assinarXml(params: {
  xml: string;
  idElemento: string;
  privateKeyPem: string;
  certificatePem: string;
}): string {
  const { xml, idElemento, privateKeyPem, certificatePem } = params;

  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certificatePem,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
  });

  sig.addReference({
    xpath: `//*[@Id='${idElemento}']`,
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
  });

  sig.getKeyInfoContent = () => {
    const certB64 = certificatePem
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\r?\n/g, '');
    return `<X509Data><X509Certificate>${certB64}</X509Certificate></X509Data>`;
  };

  sig.computeSignature(xml, { location: { reference: `//*[@Id='${idElemento}']`, action: 'append' } });

  return sig.getSignedXml();
}

/** Compacta (GZip) e codifica em Base64 o XML assinado, formato exigido no envelope JSON das APIs. */
export function gzipBase64(xml: string): string {
  return gzipSync(Buffer.from(xml, 'utf8')).toString('base64');
}
