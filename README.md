# API NFS-e Nacional — Gestão Pública

API (NestJS + TypeScript + PostgreSQL) para emissão, consulta, cancelamento e
sincronização de NFS-e através do **Ambiente Nacional** (Emissor Público Nacional /
Sefin Nacional / ADN), voltada para uso por uma gestão pública municipal. Inclui um
frontend mínimo (HTML/JS puro, sem build step) em `/` e documentação Swagger em `/docs`.

## Sumário

- [O que está implementado](#o-que-está-implementado)
- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Passo a passo para rodar localmente](#passo-a-passo-para-rodar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts disponíveis](#scripts-disponíveis)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Fluxo de uso](#fluxo-de-uso)
- [Distribuição de notas para prefeituras (ADN)](#distribuição-de-notas-para-prefeituras-adn)
- [Certificado instalado no Windows (sem anexar .pfx)](#certificado-instalado-no-windows-sem-anexar-pfx)
- [Build e execução em produção](#build-e-execução-em-produção)
- [Solução de problemas comuns](#solução-de-problemas-comuns)
- [Segurança](#segurança)
- [Pontos que exigem validação antes de produção](#pontos-que-exigem-validação-antes-de-produção)

## O que está implementado

- Cadastro de municípios, contribuintes (prestadores) e certificados digitais A1 (`.pfx`),
  cifrados em repouso (AES-256-GCM).
- Montagem e assinatura digital (XMLDSig, SHA-256) do XML da DPS a partir de um formulário/JSON.
- Envio da DPS ao Sefin Nacional (`POST /nfse`) com GZip+Base64, autenticado via **mTLS**
  (o certificado do prestador é apresentado como certificado de cliente na conexão HTTPS,
  conforme exigido pelo Ambiente Nacional — não há OAuth separado).
- Consulta de NFS-e por chave de acesso (local e no Ambiente Nacional), download de DANFSe (PDF).
- Cancelamento de NFS-e (evento de cancelamento assinado e enviado).
- Consulta de parâmetros municipais (convênio, alíquotas) no Sefin Nacional.
- Sincronização por NSU (distribuição de documentos fiscais do ADN) com download e gravação
  progressivos, sem travar a tela até o fim.
- Frontend mínimo para operar tudo isso sem precisar do Swagger.

## Stack

- [NestJS](https://nestjs.com/) 10 + TypeScript
- [Prisma](https://www.prisma.io/) 5 + PostgreSQL 16
- Frontend estático (HTML/CSS/JS puro) servido pelo próprio Nest, em `public/`
- Autenticação mTLS (certificado ICP-Brasil) com o Ambiente Nacional

## Pré-requisitos

- **Node.js 20+** (testado com Node 24) — <https://nodejs.org/>
- **Docker** (para subir o PostgreSQL local com um comando) — ou um PostgreSQL 14+ já existente
- **Git**
- (Opcional) `openssl` para gerar as chaves do `.env` — vem por padrão no Git Bash/WSL/Linux/macOS

## Passo a passo para rodar localmente

```bash
# 1. clonar o repositório
git clone https://github.com/<sua-org>/api-nfs-e.git
cd api-nfs-e

# 2. instalar as dependências
npm install

# 3. subir o banco de dados local (PostgreSQL via Docker)
docker compose up -d

# 4. criar o arquivo de variáveis de ambiente a partir do exemplo
cp .env.example .env

# 5. gerar valores fortes para as chaves de segurança e colar no .env
#    (API_KEY e CERT_ENCRYPTION_KEY — ver secao "Variaveis de ambiente" abaixo)
openssl rand -hex 32   # rode duas vezes: um valor para cada chave

# 6. aplicar as migrations (cria as tabelas no banco)
npm run prisma:migrate

# 7. subir a API em modo desenvolvimento (recarrega sozinho a cada alteração)
npm run start:dev
```

Se os passos acima rodaram sem erro, a aplicação estará disponível em:

- **Painel:** <http://localhost:3000/>
- **Swagger (documentação interativa da API):** <http://localhost:3000/docs>

Todas as rotas exigem o header `x-api-key`. No painel, cole a chave no campo correspondente
no topo da página. Existem dois tipos de chave:

- **Chave mestra** (`API_KEY` do `.env`): acesso total; é a única que cadastra entidades,
  municípios, troca o ambiente (homologação/produção) e gera chaves.
- **Chave da entidade** (`nfse_...`): enxerga apenas os dados de um contribuinte. Uma nova é
  gerada **a cada certificado anexado** (e pelo botão "Gerar nova chave" / `POST
  /contribuintes/:id/chave-api`); a anterior daquela entidade é revogada na hora. Ela é
  exibida uma única vez — o banco guarda só o hash SHA-256.

## Variáveis de ambiente

Todas estão documentadas com comentários em [`.env.example`](.env.example). Resumo:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | não (padrão `3000`) | Porta HTTP da API |
| `NODE_ENV` | não | `development` ou `production` |
| `API_KEY` | **sim** | Chave mestra exigida no header `x-api-key`. Gere com `openssl rand -hex 32` |
| `CERT_ENCRYPTION_KEY` | **sim** | Chave de 64 caracteres hex (32 bytes) usada para cifrar certificados `.pfx` e senhas em repouso. Gere com `openssl rand -hex 32` |
| `DATABASE_URL` | **sim** | String de conexão do PostgreSQL (o `docker-compose.yml` já sobe um banco compatível com o valor padrão do `.env.example`) |
| `SEFIN_NACIONAL_BASE_URL_HOMOLOGACAO` / `_PRODUCAO` | sim | Hosts do Emissor Público Nacional para cada ambiente |
| `ADN_BASE_URL_HOMOLOGACAO` / `_PRODUCAO` | sim | Hosts do Ambiente de Dados Nacional (distribuição de documentos) para cada ambiente |
| `SEFIN_AMBIENTE` | não (padrão `homologacao`) | Ambiente usado **apenas na primeira execução**; depois disso o ambiente ativo fica salvo no banco e é trocado pelo painel (`GET`/`POST /configuracao`), sem precisar reiniciar |
| `SEFIN_NACIONAL_TIMEOUT_MS` | não (padrão `30000`) | Timeout, em ms, das chamadas HTTP ao Ambiente Nacional |

> **Nunca versione o `.env`** — ele já está no `.gitignore`. Em produção, defina essas
> variáveis diretamente no ambiente de execução (secrets do provedor de hospedagem, etc.),
> nunca em um arquivo commitado.

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run start:dev` | Sobe a API em modo desenvolvimento, com recarga automática |
| `npm run build` | Compila o TypeScript para `dist/` |
| `npm run start:prod` | Roda a versão já compilada (`dist/main.js`) — use depois de `npm run build` |
| `npm run prisma:migrate` | Cria/atualiza as tabelas a partir das migrations (uso em desenvolvimento) |
| `npm run prisma:deploy` | Aplica as migrations já existentes sem gerar novas (uso em produção/CI) |
| `npm run prisma:generate` | Regenera o cliente Prisma (`@prisma/client`) a partir do `schema.prisma` |
| `npm run lint` | Roda o ESLint e corrige automaticamente o que for possível |
| `npm test` | Roda a suíte de testes (Jest) — o projeto ainda não tem testes automatizados escritos |

## Estrutura do projeto

```text
src/
  modules/
    municipios/       cadastro de municípios
    contribuintes/     cadastro de prestadores + chaves de API da entidade
    certificados/       upload/gestão de certificados .pfx (cifrados) e certificados do Windows
    dps/                 montagem, assinatura e emissão da DPS
    nfse/                consulta e cancelamento de NFS-e
    distribuicao/        sincronização por NSU (download em lote das notas do ADN)
    sefin-nacional/       cliente HTTP mTLS para o Ambiente Nacional
    configuracao/        ambiente ativo (homologação/produção), trocável em runtime
  common/               guards de autenticação, filtros de exceção, criptografia
  prisma/               PrismaService (acesso ao banco)
prisma/
  schema.prisma         modelo de dados
  migrations/            histórico de migrations
public/                  frontend mínimo (HTML/CSS/JS puro, sem build)
docs/                    documentação de apoio (PDF gerado, não é a fonte da verdade do código)
```

## Fluxo de uso

1. Cadastre o **município** (código IBGE, nome, UF).
2. Cadastre o **contribuinte** (prestador) vinculado ao município.
3. Faça upload do **certificado .pfx (A1)** do contribuinte, com a senha.
4. Em **Emitir DPS**, preencha os dados do tomador, do serviço e dos valores — a API monta
   o XML da DPS, assina com a chave do certificado, comprime (GZip+Base64) e envia ao
   Sefin Nacional, persistindo o resultado (NFS-e autorizada ou motivo de rejeição).
5. Em **Notas**, acompanhe o status, consulte no Ambiente Nacional, baixe o DANFSe ou cancele.

## Distribuição de notas para prefeituras (ADN)

Confirmado contra produção (Swagger: `https://adn.nfse.gov.br/municipios/swagger/v1/swagger.json`,
acessível só com certificado). `GET /municipios/DFe/{NSU}?tipoNSU=...`:

| `tipoNSU` | Traz | Exemplo |
|---|---|---|
| `RECEPCAO` (padrão se omitido) | Notas que o **sistema próprio** do município enviou ao ADN | Nova Fátima |
| `DISTRIBUICAO` | Notas geradas por **outro sistema** (Emissor Nacional, outros municípios) em que o município é interessado — inclui as emitidas no próprio município pelo Emissor Nacional | Riachão do Jacuípe |

- Cada tipo tem numeração de NSU própria; o sistema guarda um cursor para cada um.
- Na prática o NSU informado é **exclusivo** (pedir 714 devolve a partir do 715).
- A sincronização salva o progresso a cada página e devolve `concluido: false` após ~4 min; o
  painel chama de novo até terminar (a primeira carga pode ter dezenas de milhares de notas).
  As notas já baixadas aparecem na tela progressivamente, sem esperar o fim de tudo.
- O filtro "Notas emitidas em" usa o município emissor (`cLocEmi` = 7 primeiros dígitos da chave).
- Convênio do município: `GET https://adn.nfse.gov.br/parametrizacao/{codigoIbge}/convenio`.
  Os hosts `SEFIN_NACIONAL_BASE_URL_*` do `.env` (`sefinnacional...`) **não existem**; o Sefin
  Nacional responde em `https://sefin.nfse.gov.br/SefinNacional` (não validado para emissão).

## Certificado instalado no Windows (sem anexar .pfx)

Em "Começar aqui", **Usar certificado instalado neste computador** lista os certificados do
repositório pessoal do Windows (`CurrentUser\My`) do usuário que executa a API
(`GET /certificados/windows`, só chave mestra) e usa o escolhido (`POST /certificados/windows`).

- Certificados ICP-Brasil costumam ter a chave **não exportável**: o sistema guarda só o
  thumbprint e a conexão mTLS é feita pelo próprio Windows (.NET via PowerShell).
- Serve para sincronizar/baixar notas, XML, DANFSe e consultas. **Emitir e cancelar** exigem
  assinar XML com a chave privada — para isso, anexe o `.pfx`.
- Só funciona com a API rodando no Windows, na mesma máquina e usuário onde o certificado está
  instalado. Em servidor (Linux/Docker), use sempre o anexo de `.pfx`.

## Build e execução em produção

```bash
npm ci                 # instala exatamente as versões travadas no package-lock.json
npm run build           # compila para dist/
npm run prisma:deploy   # aplica as migrations existentes (não gera novas)
npm run start:prod      # roda dist/main.js
```

Configure `DATABASE_URL`, `API_KEY`, `CERT_ENCRYPTION_KEY` e os demais hosts do `.env` como
variáveis de ambiente do próprio servidor/container — nunca como arquivo `.env` commitado.

## Solução de problemas comuns

- **`npm run prisma:migrate` falha com erro de conexão** — confirme que `docker compose up -d`
  rodou com sucesso (`docker compose ps` deve mostrar o container `nfse-postgres` saudável) e
  que `DATABASE_URL` no `.env` aponta para o mesmo host/porta/usuário/senha do
  `docker-compose.yml` (padrão: `postgresql://postgres:postgres@localhost:5432/nfse`).
- **Erro "Property ... has no initializer" ou tipos do Prisma não encontrados** — rode
  `npm run prisma:generate` (o cliente Prisma precisa ser gerado após `npm install` e após
  qualquer alteração em `prisma/schema.prisma`).
- **Falha ao conectar no Ambiente Nacional (mTLS)** — confira se o certificado anexado é
  ICP-Brasil válido e corresponde ao ambiente ativo (homologação/produção) selecionado no
  painel; veja também se `ADN_BASE_URL_*` e `SEFIN_NACIONAL_BASE_URL_*` estão corretos no `.env`.
- **Porta 3000 ou 5432 já em uso** — altere `PORT` no `.env` (API) ou a porta mapeada no
  `docker-compose.yml` (banco), lembrando de atualizar `DATABASE_URL` de acordo.

## Segurança

- O arquivo `.pfx` e a senha do certificado nunca são retornados pela API após o cadastro;
  ficam cifrados em repouso (AES-256-GCM) e só são decifrados em memória no momento do uso
  (assinatura XML / conexão mTLS).
- Proteja o `.env` (principalmente `CERT_ENCRYPTION_KEY` e `API_KEY`) — nunca versione.
- Antes de subir este repositório para o GitHub, confirme que nenhum arquivo `.env`, `.pfx`,
  `.p12` ou dump de banco (`backups/`) está sendo versionado — todos já estão listados no
  [`.gitignore`](.gitignore), mas vale conferir com `git status` antes do primeiro commit.

## Pontos que exigem validação antes de produção

Este projeto foi construído com base nos manuais técnicos públicos do Sistema Nacional
NFS-e (gov.br/nfse — Manual dos Contribuintes/Municípios, Guia de APIs do ADN e do
Emissor Público Nacional). Dois pontos **não puderam ser confirmados publicamente** e
precisam ser obtidos no momento do credenciamento do município/prestador:

1. **Host exato do ambiente de homologação ("produção restrita") do Emissor Público
   Nacional** (endpoints `POST /nfse`, `/parametros_municipais/...`). O único host de
   produção restrita documentado publicamente é o do ADN
   (`adn.producaorestrita.nfse.gov.br`), usado por municípios que mantêm sistema próprio.
   Ajuste `SEFIN_NACIONAL_BASE_URL_*` no `.env` assim que o host oficial for confirmado.
2. **XSD completo da DPS/NFS-e e dos eventos** (`AnexoI-LeiautesRN_DPS_NFSe-SNNFSe` e
   `AnexoII-LeiautesRN_Eventos-SNNFSe`), distribuído como anexo do manual técnico. O XML
   montado em `src/modules/dps/dps-xml-builder.ts` e `src/modules/nfse/evento-xml-builder.ts`
   segue a estrutura pública de referência (grupos `prest`/`toma`/`serv`/`valores` dentro de
   `infDPS`), mas **deve ser validado campo a campo contra o XSD oficial** antes de qualquer
   envio em produção — nomes, ordem e obrigatoriedade de campos podem variar (ex.: regime
   especial de tributação, intermediário, exigibilidade do ISS).

Ambos os pontos estão sinalizados com comentários `ATENCAO` no código correspondente.
