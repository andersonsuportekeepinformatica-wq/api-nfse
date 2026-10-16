# Gera docs/Documentacao-API-NFSe.pdf - guia das rotas da API NFS-e Nacional (Keep Informatica).
import os
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (KeepTogether, PageBreak, Paragraph, Preformatted, SimpleDocTemplate,
                                Spacer, Table, TableStyle)

SAIDA = r"D:\05_KEEP_INFORMATICA\01_SISTEMAS\api-nfs-e\docs\Documentacao-API-NFSe.pdf"
os.makedirs(os.path.dirname(SAIDA), exist_ok=True)

VERDE = colors.HexColor('#0a6e4a')
VERDE_CLARO = colors.HexColor('#e8f5ee')
CINZA = colors.HexColor('#5c6a64')
BORDA = colors.HexColor('#d5dbd8')
FUNDO_CODIGO = colors.HexColor('#f4f6f5')
AVISO = colors.HexColor('#fff6e0')
CORES_METODO = {'GET': '#1f6feb', 'POST': '#0a6e4a', 'DELETE': '#b3261e'}

base = getSampleStyleSheet()
st = {
    'titulo': ParagraphStyle('titulo', parent=base['Title'], fontSize=22, textColor=VERDE, spaceAfter=6),
    'subtitulo': ParagraphStyle('subtitulo', parent=base['Normal'], fontSize=11, textColor=CINZA, spaceAfter=14),
    'h1': ParagraphStyle('h1', parent=base['Heading1'], fontSize=16, textColor=VERDE, spaceBefore=10, spaceAfter=8),
    'h2': ParagraphStyle('h2', parent=base['Heading2'], fontSize=12.5, spaceBefore=10, spaceAfter=4),
    'p': ParagraphStyle('p', parent=base['Normal'], fontSize=9.5, leading=13.5, spaceAfter=5),
    'pequeno': ParagraphStyle('pequeno', parent=base['Normal'], fontSize=8.5, leading=11.5),
    'celula': ParagraphStyle('celula', parent=base['Normal'], fontSize=8.5, leading=11),
    'celula_neg': ParagraphStyle('celula_neg', parent=base['Normal'], fontSize=8.5, leading=11, fontName='Helvetica-Bold'),
    'codigo': ParagraphStyle('codigo', parent=base['Code'], fontSize=8, leading=10.5, backColor=FUNDO_CODIGO, wordWrap='CJK',
                             borderPadding=(5, 6, 5, 6), leftIndent=6, rightIndent=6, spaceBefore=3, spaceAfter=7),
    'rota': ParagraphStyle('rota', parent=base['Normal'], fontSize=10.5, leading=14, fontName='Courier-Bold'),
}

story = []
P = lambda texto, estilo='p': Paragraph(texto, st[estilo])


def tabela(linhas, larguras, cabecalho=True):
    dados = [[c if not isinstance(c, str) else Paragraph(c, st['celula_neg' if (cabecalho and i == 0) else 'celula'])
              for c in linha] for i, linha in enumerate(linhas)]
    t = Table(dados, colWidths=larguras, repeatRows=1 if cabecalho else 0)
    estilo = [('GRID', (0, 0), (-1, -1), 0.4, BORDA), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
              ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
              ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]
    if cabecalho:
        estilo.append(('BACKGROUND', (0, 0), (-1, 0), VERDE_CLARO))
    t.setStyle(TableStyle(estilo))
    return t


def codigo(texto):
    # Paragraph (e nao Preformatted) para quebrar URLs longas na margem, preservando as quebras de linha.
    linhas = []
    for linha in texto.strip('\n').split('\n'):
        linha = linha.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        recuo = len(linha) - len(linha.lstrip(' '))
        linhas.append('&nbsp;' * recuo + linha.lstrip(' '))
    return Paragraph('<br/>'.join(linhas), st['codigo'])


def aviso(texto):
    t = Table([[Paragraph(texto, st['pequeno'])]], colWidths=[174 * mm])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), AVISO), ('BOX', (0, 0), (-1, -1), 0.4, colors.HexColor('#e6c96b')),
                           ('LEFTPADDING', (0, 0), (-1, -1), 6), ('TOPPADDING', (0, 0), (-1, -1), 4),
                           ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    return t


def rota(metodo, caminho, oque, acesso, headers=None, path=None, query=None, body=None, body_tipo=None,
         exemplo=None, resposta=None, obs=None):
    cor = CORES_METODO[metodo]
    blocos = [Paragraph(f'<font color="{cor}">{metodo}</font>&nbsp;&nbsp;{caminho}', st['rota']), Spacer(1, 3),
              P(f'<b>O que faz:</b> {oque}'), P(f'<b>Quem pode usar:</b> {acesso}')]
    hdrs = [['Header', 'Valor', 'Obrigatório']] + [['x-api-key', 'Chave mestra ou chave da entidade', 'Sim']] + (headers or [])
    blocos.append(tabela(hdrs, [38 * mm, 106 * mm, 30 * mm]))
    blocos.append(Spacer(1, 4))
    params = [['Parâmetro', 'Onde', 'Obrigatório', 'Descrição']]
    for nome, desc in (path or []):
        params.append([f'<font name="Courier">{nome}</font>', 'rota (path)', 'Sim', desc])
    for nome, obrig, desc in (query or []):
        params.append([f'<font name="Courier">{nome}</font>', 'query (?)', obrig, desc])
    if len(params) > 1:
        blocos.append(tabela(params, [36 * mm, 24 * mm, 22 * mm, 92 * mm]))
        blocos.append(Spacer(1, 4))
    if body:
        blocos.append(P(f'<b>Body</b> ({body_tipo or "JSON"}):'))
        blocos.append(tabela([['Campo', 'Tipo', 'Obrigatório', 'Descrição']] +
                             [[f'<font name="Courier">{c}</font>', t, o, d] for c, t, o, d in body],
                             [62 * mm, 22 * mm, 20 * mm, 70 * mm]))
        blocos.append(Spacer(1, 4))
    if exemplo:
        blocos.append(P('<b>Exemplo:</b>'))
        blocos.append(codigo(exemplo))
    if resposta:
        blocos.append(P(f'<b>Resposta:</b> {resposta}'))
    if obs:
        blocos.append(P(f'<b>Observação:</b> {obs}'))
    story.append(KeepTogether(blocos[:6]))
    story.extend(blocos[6:])
    story.append(Spacer(1, 10))


MESTRA = 'somente a <b>chave mestra</b>'
AMBAS = 'chave mestra ou chave da entidade (a da entidade só enxerga os próprios dados)'
CT_JSON = [['Content-Type', 'application/json', 'Sim']]
CT_MULTI = [['Content-Type', 'multipart/form-data (o Postman define sozinho ao usar form-data)', 'Sim']]

# ---------------------------------------------------------------- capa / visao geral
story += [
    P('API NFS-e Nacional — Guia de Rotas', 'titulo'),
    P('Keep Informática · Gestão pública · Versão de 16/10/2026', 'subtitulo'),
    P('Visão geral', 'h1'),
    P('Esta API conecta a prefeitura ao <b>Ambiente Nacional da NFS-e</b> (ADN / Sefin Nacional). '
      'O uso principal é <b>baixar as notas fiscais de serviço do município</b>, separadas por empresa, '
      'com XML e DANFSe. Ela também permite cadastrar certificados digitais, consultar e (em fase de validação) emitir '
      'e cancelar notas.'),
    tabela([['Item', 'Valor'],
            ['Endereço base', '<font name="Courier">http://localhost:3002</font>'],
            ['Documentação interativa (Swagger)', '<font name="Courier">http://localhost:3002/docs</font>'],
            ['Painel web', '<font name="Courier">http://localhost:3002/</font>'],
            ['Formato', 'JSON (exceto upload de certificado, que é multipart/form-data, e downloads de XML/PDF/ZIP)'],
            ['Datas', 'Formato <font name="Courier">AAAA-MM-DD</font> (ex.: 2026-10-31)'],
            ['Valores', 'Número com ponto decimal (ex.: 1500.75)']],
           [55 * mm, 119 * mm]),
    Spacer(1, 8),
    P('Autenticação', 'h1'),
    P('Toda rota exige o header <font name="Courier">x-api-key</font>. Existem dois tipos de chave:'),
    tabela([['Tipo', 'Onde obter', 'O que acessa'],
            ['<b>Chave mestra</b>', 'Variável <font name="Courier">API_KEY</font> no arquivo <font name="Courier">.env</font>',
             'Tudo. Única que cadastra entidades e municípios, troca o ambiente, lista certificados do Windows e gera chaves.'],
            ['<b>Chave da entidade</b> (<font name="Courier">nfse_...</font>)',
             'Gerada automaticamente a cada certificado anexado, ou em <font name="Courier">POST /contribuintes/{id}/chave-api</font>. Aparece uma única vez.',
             'Somente os dados da própria entidade (notas, certificados, XML, DANFSe). Ao gerar uma nova, a anterior para de funcionar.']],
           [38 * mm, 64 * mm, 72 * mm]),
    Spacer(1, 6),
    P('<b>Respostas de erro</b> seguem sempre o formato abaixo:'),
    codigo('{ "statusCode": 404, "message": "Contribuinte nao encontrado.", "error": "Not Found" }'),
    tabela([['Código', 'Significado'],
            ['400', 'Dados inválidos, certificado vencido/incompatível, ou falha de comunicação com o Ambiente Nacional (a mensagem explica).'],
            ['401', 'x-api-key ausente, inválida ou revogada.'],
            ['403', 'A chave usada não tem permissão (ex.: chave de entidade tentando ação de administrador).'],
            ['404', 'Registro não encontrado — ou pertence a outra entidade (por segurança, a API não diferencia).']],
           [20 * mm, 154 * mm]),
    PageBreak(),
    P('Passo a passo: baixar as notas da prefeitura', 'h1'),
    tabela([['#', 'Ação', 'Rota'],
            ['1', 'Cadastrar a entidade enviando o certificado (.pfx + senha). Guarde o <font name="Courier">contribuinte.id</font>, o <font name="Courier">certificado.id</font> e a <font name="Courier">chaveApi.chave</font> da resposta.',
             '<font name="Courier">POST /certificados/anexar-rapido</font>'],
            ['2', 'Sincronizar com o Ambiente Nacional. Repita enquanto a resposta vier com <font name="Courier">"concluido": false</font> (a primeira carga pode ter dezenas de milhares de notas).',
             '<font name="Courier">POST /distribuicao/contribuinte/{id}/sincronizar</font>'],
            ['3', 'Descobrir o código do município emissor (o primeiro da lista costuma ser o da própria prefeitura).',
             '<font name="Courier">GET /distribuicao/contribuinte/{id}/municipios-emissores</font>'],
            ['4', 'Listar as notas do período, agrupadas por empresa.',
             '<font name="Courier">GET /distribuicao/contribuinte/{id}/por-empresa</font>'],
            ['5', 'Baixar os XML do período em ZIP, ou um XML/DANFSe específico.',
             '<font name="Courier">GET .../xml-lote</font>, <font name="Courier">.../documento/{id}/xml</font>, <font name="Courier">.../danfse/{chave}</font>']],
           [8 * mm, 96 * mm, 70 * mm]),
    Spacer(1, 12),
]

# ---------------------------------------------------------------- distribuicao
story.append(P('1. Notas do Ambiente Nacional (distribuição)', 'h1'))
story.append(P('Rotas usadas no dia a dia para baixar e consultar as notas. O Ambiente Nacional <b>não oferece filtro por período</b>: '
               'a sincronização baixa tudo uma vez para o banco local, e os filtros de data são aplicados aqui.'))

FILTROS = [
    ('municipioEmissor', 'Não', 'Código IBGE do município onde a nota foi emitida (ex.: 2926301 = Riachão do Jacuípe). Veja a rota municipios-emissores.'),
    ('dataInicio', 'Não', 'Data inicial da emissão, AAAA-MM-DD.'),
    ('dataFim', 'Não', 'Data final da emissão, AAAA-MM-DD.'),
    ('codigoMunicipio', 'Não', 'Legado: município de incidência do ISS. Prefira municipioEmissor.'),
]

rota('POST', '/distribuicao/contribuinte/{contribuinteId}/sincronizar',
     'Busca no Ambiente Nacional as notas e eventos (ex.: cancelamentos) novos desde a última sincronização e grava no banco local. '
     'Para prefeituras percorre os dois tipos de NSU: RECEPCAO (sistema próprio do município) e DISTRIBUICAO (Emissor Nacional e outros municípios).',
     AMBAS,
     path=[('contribuinteId', 'ID da entidade (veja GET /contribuintes/selecionaveis).')],
     query=[('certificadoId', 'Sim', 'ID do certificado da mesma entidade que será usado na conexão.')],
     exemplo='POST http://localhost:3002/distribuicao/contribuinte/7da198ba-.../sincronizar?certificadoId=d110d1c7-...',
     resposta='JSON com <font name="Courier">novosDocumentos</font>, <font name="Courier">concluido</font> (false = ainda há documentos; chame de novo), '
              '<font name="Courier">porTipo</font> (progresso de RECEPCAO e DISTRIBUICAO), <font name="Courier">notasCanceladasDetectadas</font> e '
              '<font name="Courier">mensagemAmbiente</font> (quando o governo informa que não há documentos).',
     obs='Cada chamada dura no máximo ~4 minutos e salva o progresso a cada página. Pode ser chamada de novo a qualquer momento sem duplicar notas.')

rota('GET', '/distribuicao/contribuinte/{contribuinteId}/municipios-emissores',
     'Lista os municípios onde as notas da entidade foram emitidas, com a quantidade. Serve para escolher o filtro municipioEmissor.',
     AMBAS, path=[('contribuinteId', 'ID da entidade.')],
     exemplo='[ { "codigo": "2926301", "nome": "Riachão do Jacuípe", "quantidade": 7317 },\n  { "codigo": "3106200", "nome": "Belo Horizonte", "quantidade": 3832 } ]',
     resposta='Lista ordenada da maior para a menor quantidade.')

rota('GET', '/distribuicao/contribuinte/{contribuinteId}/por-empresa',
     'Notas do filtro informado, <b>agrupadas por empresa prestadora</b> (CNPJ), com o total em reais de cada empresa. Notas canceladas ficam de fora.',
     AMBAS, path=[('contribuinteId', 'ID da entidade.')], query=FILTROS,
     exemplo='GET /distribuicao/contribuinte/{id}/por-empresa?municipioEmissor=2926301&dataInicio=2026-10-01&dataFim=2026-10-31',
     resposta='Lista de <font name="Courier">{ cnpj, nome, total, notas: [ { id, chaveAcesso, numeroNfse, valorServicos, dataEmissao, cnpjTomador, ... } ] }</font>.')

rota('GET', '/distribuicao/contribuinte/{contribuinteId}',
     'Mesmas notas da rota anterior, em lista simples (sem agrupar).',
     AMBAS, path=[('contribuinteId', 'ID da entidade.')],
     query=FILTROS + [('incluirCanceladas', 'Não', '"true" para incluir as notas canceladas.')],
     resposta='Lista de notas (sem o XML, que é baixado pela rota de documento).')

rota('GET', '/distribuicao/contribuinte/{contribuinteId}/canceladas-count',
     'Quantas notas canceladas existem no filtro (elas não entram nas listas e totais).',
     AMBAS, path=[('contribuinteId', 'ID da entidade.')], query=FILTROS, resposta='Um número (ex.: 542).')

rota('GET', '/distribuicao/contribuinte/{contribuinteId}/xml-lote',
     'Baixa <b>todos os XML</b> do filtro em um único arquivo <b>.zip</b>, nomeados por empresa e número da nota.',
     AMBAS, path=[('contribuinteId', 'ID da entidade.')], query=FILTROS,
     exemplo='GET /distribuicao/contribuinte/{id}/xml-lote?municipioEmissor=2926301&dataInicio=2026-10-01&dataFim=2026-10-31',
     resposta='Arquivo <font name="Courier">notas-fiscais.zip</font>. No Postman use <b>Send and Download</b>.')

rota('GET', '/distribuicao/documento/{id}/xml',
     'Baixa o XML de uma nota específica.', AMBAS,
     path=[('id', 'Campo "id" da nota (vem nas listas acima). Não é a chave de acesso.')],
     resposta='Arquivo XML (Content-Type application/xml).')

rota('GET', '/distribuicao/danfse/{chaveAcesso}',
     'Baixa o DANFSe (PDF) de uma nota, gerado pelo Ambiente Nacional.', AMBAS,
     path=[('chaveAcesso', 'Chave de acesso de 50 dígitos.')],
     query=[('certificadoId', 'Sim', 'ID de um certificado da entidade.')],
     resposta='Arquivo PDF.',
     obs='O serviço de DANFSe do governo fica indisponível (HTTP 503) com frequência; nesse caso a API devolve 400 com a explicação. Tente mais tarde.')

rota('GET', '/distribuicao/contribuinte/{contribuinteId}/bruto',
     'Diagnóstico: mostra a resposta <b>sem tratamento</b> do Ambiente Nacional para um NSU. Use só para investigar problemas.',
     AMBAS, path=[('contribuinteId', 'ID da entidade.')],
     query=[('certificadoId', 'Sim', 'ID do certificado da entidade.'), ('nsu', 'Não', 'NSU de partida (padrão 0).')])
story.append(PageBreak())

# ---------------------------------------------------------------- certificados
story.append(P('2. Certificados e entidades', 'h1'))
story.append(P('Cada <b>entidade</b> (prefeitura ou empresa) é identificada pelo CPF/CNPJ que vem dentro do certificado ICP-Brasil. '
               'Toda vez que um certificado é cadastrado, o sistema gera uma <b>nova chave de API</b> para a entidade e revoga a anterior.'))

rota('POST', '/certificados/anexar-rapido',
     'Forma recomendada de cadastrar: envia o .pfx e a senha; o sistema lê o CPF/CNPJ do próprio certificado, cadastra (ou reconhece) a entidade, guarda o certificado cifrado e gera a chave de API.',
     'chave mestra (cadastra entidade nova) ou chave da entidade (só para renovar o certificado dela mesma)',
     headers=CT_MULTI, body_tipo='multipart/form-data',
     body=[('arquivo', 'arquivo', 'Sim', 'Arquivo do certificado A1 (.pfx ou .p12).'),
           ('senha', 'texto', 'Sim', 'Senha do certificado.'),
           ('municipioId', 'texto', 'Não', 'ID do município de domicílio (informativo).')],
     resposta='<font name="Courier">{ contribuinte: {id, razaoSocial, ...}, certificado: {id, titular, validoAte, ...}, chaveApi: {chave, prefixo, criadaEm} }</font>. '
              '<b>Guarde a chaveApi.chave: ela não aparece de novo.</b>')

rota('POST', '/certificados',
     'Cadastra um certificado para uma entidade já existente, informando o ID dela. Também gera nova chave de API.',
     'chave mestra ou chave da própria entidade', headers=CT_MULTI, body_tipo='multipart/form-data',
     body=[('arquivo', 'arquivo', 'Sim', 'Arquivo .pfx/.p12.'),
           ('contribuinteId', 'texto (UUID)', 'Sim', 'ID da entidade.'),
           ('senha', 'texto', 'Sim', 'Senha do certificado.')],
     resposta='Dados do certificado + <font name="Courier">chaveApi</font>.')

rota('GET', '/certificados/windows',
     'Lista os certificados instalados no Windows do computador onde a API está rodando, indicando vencidos e se a entidade já está cadastrada.',
     MESTRA,
     resposta='Lista de <font name="Courier">{ thumbprint, nome, tipoInscricao, inscricaoFederal, emissor, validoAte, vencido, entidadeCadastrada }</font>.',
     obs='Só funciona com a API rodando em Windows, no mesmo usuário em que o certificado foi instalado.')

rota('POST', '/certificados/windows',
     'Usa um certificado instalado no Windows em vez de enviar o .pfx. A chave privada continua no Windows. Gera chave de API como no anexo.',
     'chave mestra ou chave da própria entidade', headers=CT_JSON,
     body=[('thumbprint', 'texto', 'Sim', 'Impressão digital (40 caracteres) obtida em GET /certificados/windows.'),
           ('municipioId', 'texto', 'Não', 'ID do município de domicílio (informativo).')],
     exemplo='{ "thumbprint": "A1B2C3D4E5F6A7B8C9D0A1B2C3D4E5F6A7B8C9D0" }',
     obs='Certificado do Windows serve para baixar notas, XML, DANFSe e consultas. Para <b>emitir ou cancelar</b> nota é preciso o .pfx.')

rota('GET', '/certificados/contribuinte/{contribuinteId}',
     'Lista os certificados de uma entidade (nunca devolve o arquivo nem a senha).', AMBAS,
     path=[('contribuinteId', 'ID da entidade.')])

rota('DELETE', '/certificados/{id}', 'Revoga (desativa) um certificado.', AMBAS, path=[('id', 'ID do certificado.')])

rota('GET', '/contribuintes/selecionaveis',
     'Entidades prontas para uso (com certificado ativo). É o jeito mais fácil de obter o contribuinteId e o certificadoId.',
     AMBAS + '. Com a chave da entidade, retorna só ela.',
     resposta='Lista de <font name="Courier">{ contribuinteId, razaoSocial, tipoInscricao, inscricaoFederal, certificadoId, certificadoTitular }</font>.')

rota('POST', '/contribuintes/{id}/chave-api',
     'Gera uma nova chave de API para a entidade, sem precisar reenviar o certificado. A chave anterior para de funcionar na hora.',
     MESTRA, path=[('id', 'ID da entidade.')],
     resposta='<font name="Courier">{ chave, prefixo, criadaEm }</font> — a chave aparece só nesta resposta.')

rota('GET', '/contribuintes', 'Lista as entidades cadastradas.', AMBAS + '.')
rota('GET', '/contribuintes/{id}', 'Detalhes de uma entidade, com município e certificados.', AMBAS,
     path=[('id', 'ID da entidade.')])

rota('POST', '/contribuintes',
     'Cadastro manual de entidade (normalmente desnecessário: o anexo rápido cadastra sozinho).', MESTRA, headers=CT_JSON,
     body=[('tipoInscricao', '"CPF" ou "CNPJ"', 'Sim', 'Tipo do documento.'),
           ('inscricaoFederal', 'texto', 'Sim', 'CPF/CNPJ, só dígitos (11 a 14).'),
           ('razaoSocial', 'texto', 'Sim', 'Nome/razão social.'),
           ('inscricaoMunicipal', 'texto', 'Não', ''), ('nomeFantasia', 'texto', 'Não', ''),
           ('email', 'e-mail', 'Não', ''), ('telefone', 'texto', 'Não', ''),
           ('municipioId', 'texto', 'Não', 'ID do município de domicílio.')])

rota('DELETE', '/contribuintes/{id}', 'Inativa a entidade (as chaves dela deixam de funcionar).', MESTRA,
     path=[('id', 'ID da entidade.')])
story.append(PageBreak())

# ---------------------------------------------------------------- configuracao / municipios
story.append(P('3. Configuração e municípios', 'h1'))
rota('GET', '/configuracao', 'Mostra o ambiente ativo: HOMOLOGACAO (teste) ou PRODUCAO.', AMBAS + '.')
rota('POST', '/configuracao/ambiente',
     'Troca o ambiente usado em todas as chamadas ao governo. Vale para todas as entidades, na hora, sem reiniciar.',
     MESTRA, headers=CT_JSON,
     body=[('ambiente', 'texto', 'Sim', '"HOMOLOGACAO" ou "PRODUCAO". Em produção as notas têm validade fiscal.')],
     exemplo='{ "ambiente": "PRODUCAO" }')
rota('GET', '/municipios', 'Lista os municípios cadastrados.', AMBAS + '.')
rota('GET', '/municipios/{id}', 'Detalhes de um município.', AMBAS + '.', path=[('id', 'ID do município.')])
rota('POST', '/municipios', 'Cadastra um município.', MESTRA, headers=CT_JSON,
     body=[('codigoIbge', 'texto', 'Sim', 'Código IBGE, 7 dígitos.'), ('nome', 'texto', 'Sim', 'Nome.'),
           ('uf', 'texto', 'Sim', 'UF, 2 letras.')],
     exemplo='{ "codigoIbge": "2926301", "nome": "Riachão do Jacuípe", "uf": "BA" }')
rota('POST', '/municipios/{id}/sincronizar-convenio', 'Consulta e guarda os parâmetros do convênio do município no governo.',
     MESTRA, path=[('id', 'ID do município.')], query=[('certificadoId', 'Sim', 'ID de qualquer certificado válido.')],
     obs='<b>Pendente de correção:</b> o endereço do governo configurado no .env não existe; o correto, já identificado, é '
         'adn.nfse.gov.br/parametrizacao/{ibge}/convenio.')
rota('GET', '/municipios/{id}/servicos/{codigoServico}/aliquotas', 'Consulta as alíquotas de ISS de um serviço no município.',
     AMBAS, path=[('id', 'ID do município.'), ('codigoServico', 'Código do serviço (ex.: 0107).')],
     query=[('certificadoId', 'Sim', 'ID de um certificado válido.')], obs='Mesma pendência de endereço da rota anterior.')
story.append(PageBreak())

# ---------------------------------------------------------------- emissao
story.append(P('4. Emissão e cancelamento (em validação)', 'h1'))
story.append(aviso('<b>Atenção:</b> a emissão e o cancelamento estão implementados, mas <b>não foram validados</b> contra o '
                   'Ambiente Nacional: o endereço do Sefin Nacional no .env é provisório e o leiaute precisa ser conferido com o '
                   'XSD oficial. Exigem certificado enviado como .pfx (não funcionam com certificado do Windows).'))
story.append(Spacer(1, 8))
rota('POST', '/dps/emitir',
     'Monta a DPS (declaração de prestação de serviço), assina com o certificado, envia ao Sefin Nacional e grava o resultado.',
     AMBAS, headers=CT_JSON,
     body=[('contribuinteId', 'UUID', 'Sim', 'Entidade prestadora.'),
           ('certificadoId', 'UUID', 'Sim', 'Certificado .pfx da mesma entidade.'),
           ('serie', 'texto', 'Sim', 'Série da DPS (1 a 5 caracteres).'),
           ('numero', 'texto', 'Sim', 'Número sequencial controlado pelo emissor.'),
           ('competencia', 'data', 'Sim', 'AAAA-MM-DD.'),
           ('tomador.inscricaoFederal', 'texto', 'Sim', 'CPF/CNPJ do tomador, só dígitos.'),
           ('tomador.razaoSocial', 'texto', 'Sim', ''),
           ('tomador.codigoMunicipio', 'texto', 'Sim', 'IBGE do tomador (7 dígitos).'),
           ('tomador.email / logradouro / cep', 'texto', 'Não', ''),
           ('servico.codigoTributacaoNacional', 'texto', 'Sim', 'Código do serviço (LC 116).'),
           ('servico.codigoTributacaoMunicipal', 'texto', 'Não', 'Se o município exigir.'),
           ('servico.descricao', 'texto', 'Sim', 'Descrição do serviço.'),
           ('servico.codigoMunicipioPrestacao', 'texto', 'Sim', 'IBGE de onde o serviço foi prestado.'),
           ('valores.valorServicos', 'número', 'Sim', 'Valor total (mínimo 0.01).'),
           ('valores.aliquotaIss', 'número', 'Não', 'Percentual (ex.: 5 = 5%).'),
           ('valores.valorDeducoes', 'número', 'Não', ''),
           ('valores.valorDescontoIncondicionado', 'número', 'Não', ''),
           ('chaveNfseSubstituida', 'texto', 'Não', 'Chave da nota a substituir (nota substituta).')],
     exemplo='''{
  "contribuinteId": "uuid-da-entidade", "certificadoId": "uuid-do-certificado",
  "serie": "1", "numero": "1001", "competencia": "2026-10-16",
  "tomador": { "inscricaoFederal": "12345678000199", "razaoSocial": "Empresa Tomadora", "codigoMunicipio": "2926301" },
  "servico": { "codigoTributacaoNacional": "010701", "descricao": "Manutencao de sistemas",
               "codigoMunicipioPrestacao": "2926301" },
  "valores": { "valorServicos": 1500.00, "aliquotaIss": 5 }
}''')
rota('GET', '/dps/{id}', 'Consulta uma DPS enviada (situação, erro, nota gerada).', AMBAS, path=[('id', 'ID da DPS.')])
rota('GET', '/dps/contribuinte/{contribuinteId}', 'Histórico de DPS da entidade (pendentes, autorizadas, rejeitadas e com erro).',
     AMBAS, path=[('contribuinteId', 'ID da entidade.')])
rota('GET', '/nfse', 'Notas emitidas por este sistema.', AMBAS + '.')
rota('GET', '/nfse/{chaveAcesso}', 'Detalhes de uma nota emitida por este sistema.', AMBAS,
     path=[('chaveAcesso', 'Chave de 50 dígitos.')])
rota('GET', '/nfse/{chaveAcesso}/remoto', 'Consulta a nota direto no Sefin Nacional.', AMBAS,
     path=[('chaveAcesso', 'Chave de 50 dígitos.')], query=[('certificadoId', 'Sim', 'Certificado da entidade.')])
rota('GET', '/nfse/{chaveAcesso}/danfse', 'DANFSe (PDF) de uma nota emitida por este sistema.', AMBAS,
     path=[('chaveAcesso', 'Chave de 50 dígitos.')], query=[('certificadoId', 'Sim', 'Certificado da entidade.')])
rota('POST', '/nfse/{chaveAcesso}/cancelar', 'Registra o evento de cancelamento da nota no Ambiente Nacional.', AMBAS,
     headers=CT_JSON, path=[('chaveAcesso', 'Chave de 50 dígitos.')],
     body=[('certificadoId', 'UUID', 'Sim', 'Certificado .pfx da entidade emissora.'),
           ('motivo', 'texto', 'Sim', 'Motivo do cancelamento.')],
     exemplo='{ "certificadoId": "uuid-do-certificado", "motivo": "Valor informado errado" }')
story.append(PageBreak())

# ---------------------------------------------------------------- API do governo
story.append(P('5. Chamando o Ambiente Nacional direto (Postman)', 'h1'))
story.append(P('Para consultar sem passar por esta API, chame o governo diretamente. A autenticação é feita pelo '
               '<b>certificado digital</b> (TLS mútuo), sem x-api-key.'))
story.append(P('<b>Configurar o certificado no Postman:</b> Settings → Certificates → Add Certificate → Host '
               '<font name="Courier">adn.nfse.gov.br</font> (porta 443), PFX file = o .pfx da prefeitura, Passphrase = a senha. '
               'Para teste, repita com o host <font name="Courier">adn.producaorestrita.nfse.gov.br</font>.'))
story.append(tabela([['Rota (GET)', 'O que faz'],
                     ['<font name="Courier">https://adn.nfse.gov.br/municipios/DFe/{NSU}?tipoNSU=...&amp;lote=true</font>',
                      'Até 50 documentos a partir do NSU (o NSU informado não vem; vem do seguinte em diante).'],
                     ['<font name="Courier">https://adn.nfse.gov.br/municipios/NFSe/{chave}/Eventos</font>',
                      'Eventos (cancelamentos etc.) de uma nota.'],
                     ['<font name="Courier">https://adn.nfse.gov.br/danfse/{chave}</font>', 'DANFSe em PDF.'],
                     ['<font name="Courier">https://adn.nfse.gov.br/parametrizacao/{codigoIbge}/convenio</font>',
                      'Situação do convênio do município.']],
                    [104 * mm, 70 * mm]))
story.append(Spacer(1, 6))
story.append(tabela([['tipoNSU', 'Traz', 'Use quando'],
                     ['RECEPCAO', 'Notas que o sistema próprio do município enviou ao Ambiente Nacional. É o padrão quando o parâmetro é omitido.',
                      'O município tem sistema próprio (ex.: Nova Fátima).'],
                     ['DISTRIBUICAO', 'Notas geradas por outro sistema (Emissor Nacional ou outros municípios) em que o município é interessado.',
                      'O município usa o Emissor Nacional (ex.: Riachão do Jacuípe).']],
                    [28 * mm, 90 * mm, 56 * mm]))
story.append(Spacer(1, 6))
story.append(P('<b>Paginação:</b> comece com NSU 0; na próxima chamada use o <b>maior NSU</b> recebido no lote. '
               'Quando não houver mais documentos, a resposta é HTTP 404 com o código <font name="Courier">E2020</font>. '
               'Cada documento vem em <font name="Courier">ArquivoXml</font> compactado (GZip) e codificado em Base64. '
               '<b>Não existe filtro por período</b> nas rotas do governo.'))
story.append(Spacer(1, 10))
story.append(P('Limitações conhecidas', 'h1'))
for item in [
    'O Ambiente Nacional não filtra por data: o período só pode ser filtrado nas rotas desta API, depois da sincronização.',
    'O serviço de DANFSe do governo fica indisponível (HTTP 503) com frequência.',
    'Certificado instalado no Windows: só baixa e consulta; emitir e cancelar exigem o .pfx. Só funciona com a API no mesmo computador.',
    'Emissão, cancelamento, convênio e alíquotas dependem da correção dos endereços do Sefin Nacional no .env.',
]:
    story.append(P('• ' + item))


def rodape(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(CINZA)
    canvas.drawString(18 * mm, 10 * mm, 'API NFS-e Nacional — Guia de Rotas · Keep Informática')
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f'Página {doc.page}')
    canvas.restoreState()


doc = SimpleDocTemplate(SAIDA, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm,
                        bottomMargin=18 * mm, title='API NFS-e Nacional - Guia de Rotas', author='Keep Informática')
doc.build(story, onFirstPage=rodape, onLaterPages=rodape)
print(SAIDA)
