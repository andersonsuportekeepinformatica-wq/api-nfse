import { BadRequestException, Injectable } from '@nestjs/common';
import { execFile } from 'child_process';

/**
 * Acesso ao repositorio de certificados do Windows (CurrentUser\My) do computador onde a API roda.
 *
 * Certificados ICP-Brasil costumam ser instalados com a chave privada NAO exportavel: o Windows
 * deixa usar, mas nao copiar a chave. Por isso nao convertemos para PEM como no .pfx anexado - a
 * conexao mTLS com o Ambiente Nacional e feita pelo proprio Windows (.NET HttpClient/Schannel),
 * via PowerShell, e so o resultado volta para o Node.
 *
 * Limitacao inerente: so enxerga os certificados do usuario Windows que executa a API, na
 * mesma maquina. Num servidor remoto, use o anexo de .pfx.
 */

export interface CertificadoInstalado {
  thumbprint: string;
  titular: string;
  emissor: string;
  numeroSerie: string;
  validoDe: Date;
  validoAte: Date;
}

export interface RespostaWindows {
  status: number;
  contentType: string;
  corpo: Buffer;
}

const THUMBPRINT_VALIDO = /^[0-9A-F]{40}$/i;
// Lotes de distribuicao e PDFs podem ser grandes; o corpo volta em base64 pelo stdout.
const LIMITE_SAIDA_BYTES = 64 * 1024 * 1024;

const PREAMBULO = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
function Falhar($e) {
  $ex = $e.Exception; while ($ex.InnerException) { $ex = $ex.InnerException }
  [Console]::Error.WriteLine($ex.Message); exit 2
}
`;

const SCRIPT_LISTAR =
  PREAMBULO +
  `
try {
  $lista = @(Get-ChildItem Cert:\\CurrentUser\\My | Where-Object { $_.HasPrivateKey } | ForEach-Object {
    [pscustomobject]@{
      thumbprint  = $_.Thumbprint
      titular     = $_.GetNameInfo('SimpleName', $false)
      emissor     = $_.GetNameInfo('SimpleName', $true)
      numeroSerie = $_.SerialNumber
      validoDe    = $_.NotBefore.ToUniversalTime().ToString('o')
      validoAte   = $_.NotAfter.ToUniversalTime().ToString('o')
    }
  })
  ConvertTo-Json -InputObject $lista -Compress
} catch { Falhar $_ }
`;

// Parametros chegam por variaveis de ambiente (nunca interpolados no script) - sem injecao.
const SCRIPT_GET =
  PREAMBULO +
  `
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Add-Type -AssemblyName System.Net.Http
  $cert = Get-Item -LiteralPath ('Cert:\\CurrentUser\\My\\' + $env:NFSE_THUMBPRINT)
  $handler = New-Object System.Net.Http.HttpClientHandler
  $handler.ClientCertificateOptions = 'Manual'
  [void]$handler.ClientCertificates.Add($cert)
  $cliente = New-Object System.Net.Http.HttpClient($handler)
  $cliente.Timeout = [TimeSpan]::FromMilliseconds([int]$env:NFSE_TIMEOUT_MS)
  [void]$cliente.DefaultRequestHeaders.TryAddWithoutValidation('Accept', $env:NFSE_ACCEPT)
  $resp = $cliente.GetAsync($env:NFSE_URL).GetAwaiter().GetResult()
  $bytes = $resp.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  $tipo = ''; if ($resp.Content.Headers.ContentType) { $tipo = $resp.Content.Headers.ContentType.ToString() }
  ConvertTo-Json -Compress -InputObject @{ status = [int]$resp.StatusCode; contentType = $tipo; corpoBase64 = [Convert]::ToBase64String($bytes) }
} catch { Falhar $_ }
`;

@Injectable()
export class CertificadosWindowsService {
  async listarInstalados(): Promise<CertificadoInstalado[]> {
    const saida = await this.executar(SCRIPT_LISTAR, {}, 30000);
    const itens = JSON.parse(saida || '[]') as Array<Record<string, string>>;
    return itens.map((c) => ({
      thumbprint: c.thumbprint,
      titular: c.titular,
      emissor: c.emissor,
      numeroSerie: c.numeroSerie,
      validoDe: new Date(c.validoDe),
      validoAte: new Date(c.validoAte),
    }));
  }

  async obterInstalado(thumbprint: string): Promise<CertificadoInstalado> {
    this.validarThumbprint(thumbprint);
    const cert = (await this.listarInstalados()).find(
      (c) => c.thumbprint.toUpperCase() === thumbprint.toUpperCase(),
    );
    if (!cert) {
      throw new BadRequestException(
        'Certificado nao encontrado no Windows deste computador (pode ter sido removido ou estar em outro usuario).',
      );
    }
    return cert;
  }

  /** GET com mTLS usando o certificado instalado. Lanca Error em falha de rede/TLS (como o axios). */
  async get(thumbprint: string, url: string, accept: string, timeoutMs: number): Promise<RespostaWindows> {
    this.validarThumbprint(thumbprint);
    const saida = await this.executar(
      SCRIPT_GET,
      { NFSE_THUMBPRINT: thumbprint, NFSE_URL: url, NFSE_ACCEPT: accept, NFSE_TIMEOUT_MS: String(timeoutMs) },
      timeoutMs + 15000,
    );
    const r = JSON.parse(saida) as { status: number; contentType: string; corpoBase64: string };
    return { status: r.status, contentType: r.contentType, corpo: Buffer.from(r.corpoBase64, 'base64') };
  }

  private validarThumbprint(thumbprint: string) {
    if (!THUMBPRINT_VALIDO.test(thumbprint ?? '')) {
      throw new BadRequestException('Thumbprint de certificado invalido.');
    }
  }

  private executar(script: string, variaveis: Record<string, string>, timeoutMs: number): Promise<string> {
    if (process.platform !== 'win32') {
      throw new BadRequestException(
        'Certificados instalados so estao disponiveis com a API rodando em Windows. Anexe o arquivo .pfx.',
      );
    }
    // -EncodedCommand (UTF-16LE base64) evita qualquer problema de aspas na linha de comando.
    const comando = Buffer.from(script, 'utf16le').toString('base64');
    return new Promise((resolve, reject) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', comando],
        {
          env: { ...process.env, ...variaveis },
          timeout: timeoutMs,
          maxBuffer: LIMITE_SAIDA_BYTES,
          windowsHide: true,
        },
        (erro, stdout, stderr) => {
          if (erro) {
            const motivo = stderr?.toString().trim() || (erro.killed ? 'tempo esgotado' : erro.message);
            reject(new Error(`Windows: ${motivo}`));
            return;
          }
          resolve(stdout.toString().trim());
        },
      );
    });
  }
}
