const API_KEY_STORAGE = 'nfse_api_key';

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

/** Formata um numero como moeda brasileira: "R$ 1.234,56". */
function formatarMoeda(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Icones SVG inline (16x16, stroke), para usar dentro de botoes gerados dinamicamente. */
const ICONES = {
  download:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
  pdf:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  zip:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>',
  csv:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>',
  busca:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  sincronizar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M3 21v-5h5"/><path d="M21 3v5h-5"/></svg>',
  mais:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  trocar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  lixo:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
  cancelar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
  olho:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
  olhoRemoto:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16" opacity="0"/></svg>',
  salvar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>',
  upload:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></svg>',
  enviar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  cadastrar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>',
  filtro:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"/></svg>',
  lista:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>',
};

function icone(nome) {
  return ICONES[nome] || '';
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      'x-api-key': getApiKey(),
      ...(options.headers || {}),
    },
  });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/pdf')) {
    if (!res.ok) throw new Error(`HTTP ${res.status} ao obter PDF`);
    return res.blob();
  }
  if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
    if (!res.ok) throw new Error(`HTTP ${res.status} ao obter XML`);
    return res.text();
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error((data && (data.message || JSON.stringify(data))) || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function carregarAmbiente() {
  const btn = document.getElementById('btnAmbiente');
  try {
    const config = await api('/configuracao');
    aplicarAmbienteNoBotao(config.ambiente);
  } catch {
    btn.textContent = 'Ambiente: desconhecido';
  }
}

function aplicarAmbienteNoBotao(ambiente) {
  const btn = document.getElementById('btnAmbiente');
  const producao = ambiente === 'PRODUCAO';
  btn.textContent = producao ? 'PRODUCAO' : 'Homologacao (teste)';
  btn.classList.toggle('producao', producao);
  btn.classList.toggle('homologacao', !producao);
  document.body.classList.toggle('ambiente-producao', producao);
}

function setupAmbiente() {
  document.getElementById('btnAmbiente').addEventListener('click', async () => {
    try {
      const atual = await api('/configuracao');
      const proximo = atual.ambiente === 'PRODUCAO' ? 'HOMOLOGACAO' : 'PRODUCAO';

      if (proximo === 'PRODUCAO') {
        const confirmou = confirm(
          'ATENCAO: voce esta prestes a mudar para o ambiente de PRODUCAO.\n\n' +
            'Notas emitidas em producao tem validade fiscal real e nao podem ser ' +
            'desfeitas (so canceladas via evento formal).\n\n' +
            'Confirma a troca para PRODUCAO?',
        );
        if (!confirmou) return;
      }

      const novo = await api('/configuracao/ambiente', {
        method: 'POST',
        body: JSON.stringify({ ambiente: proximo }),
      });
      aplicarAmbienteNoBotao(novo.ambiente);
    } catch (e) {
      alert(`Erro ao trocar de ambiente: ${e.message}`);
    }
  });
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

function setupApiKey() {
  const input = document.getElementById('apiKey');
  input.value = getApiKey();
  document.getElementById('salvarApiKey').addEventListener('click', () => {
    localStorage.setItem(API_KEY_STORAGE, input.value.trim());
    alert('Chave salva. Recarregando listas...');
    carregarTudo();
  });
}

/**
 * Pede ao usuario para escolher um certificado de um contribuinte (usado nas acoes que exigem
 * assinatura/mTLS: sincronizar convenio, consultar remoto, baixar DANFSe, cancelar NFS-e).
 * Retorna o id do certificado escolhido, ou null se o usuario cancelar.
 */
async function escolherCertificado(contribuinteId) {
  if (!contribuinteId) {
    alert('Nao foi possivel identificar o contribuinte para escolher o certificado.');
    return null;
  }
  const certs = await api(`/certificados/contribuinte/${contribuinteId}`);
  const ativos = certs.filter((c) => c.ativo);
  if (ativos.length === 0) {
    alert('Este contribuinte nao possui certificado digital ativo cadastrado.');
    return null;
  }
  if (ativos.length === 1) return ativos[0].id;

  const opcoes = ativos.map((c, i) => `${i + 1}) ${c.titular} (valido ate ${new Date(c.validoAte).toLocaleDateString()})`).join('\n');
  const escolha = prompt(`Varios certificados encontrados. Digite o numero desejado:\n${opcoes}`, '1');
  const idx = Number(escolha) - 1;
  if (Number.isNaN(idx) || !ativos[idx]) return null;
  return ativos[idx].id;
}

async function carregarMunicipios() {
  const lista = document.getElementById('listaMunicipios');
  const selects = document.querySelectorAll('select[name="municipioId"]');
  try {
    const municipios = await api('/municipios');
    lista.innerHTML =
      municipios
        .map(
          (m) => `<div class="card">
            <strong>${m.nome}/${m.uf}</strong> — IBGE ${m.codigoIbge}
            ${m.parametrosRaw ? '<span class="badge ok">convenio sincronizado</span>' : '<span class="badge pendente">convenio nao sincronizado</span>'}
            <div class="card-acoes">
              <button data-acao="sincronizar-convenio" data-id="${m.id}">${icone('sincronizar')}Sincronizar convenio</button>
            </div>
          </div>`,
        )
        .join('') || '<p>Nenhum municipio cadastrado ainda.</p>';
    selects.forEach((sel) => {
      sel.innerHTML =
        '<option value="">Selecione o municipio</option>' +
        municipios
          .map((m) => `<option value="${m.id}" data-codigo-ibge="${m.codigoIbge}">${m.nome}/${m.uf}</option>`)
          .join('');
    });
  } catch (e) {
    lista.innerHTML = `<p class="badge erro">Erro ao carregar: ${e.message}</p>`;
  }
}

async function carregarContribuintes() {
  const lista = document.getElementById('listaContribuintes');
  const selects = document.querySelectorAll('select[name="contribuinteId"]');
  try {
    const contribuintes = await api('/contribuintes');
    lista.innerHTML =
      contribuintes
        .map(
          (c) => `<div class="card">
            <strong>${c.razaoSocial}</strong> — ${c.tipoInscricao} ${c.inscricaoFederal} (${c.municipio?.nome ?? ''})
            <span class="badge ${c.ativo ? 'ok' : 'erro'}">${c.ativo ? 'ativo' : 'inativo'}</span>
            <div class="card-acoes">
              <button data-acao="ver-certificados" data-id="${c.id}">${icone('olho')}Ver certificados</button>
              ${c.ativo ? `<button data-acao="inativar-contribuinte" data-id="${c.id}">${icone('lixo')}Inativar</button>` : ''}
            </div>
          </div>`,
        )
        .join('') || '<p>Nenhum contribuinte cadastrado ainda.</p>';
    selects.forEach((sel) => {
      const atual = sel.value;
      sel.innerHTML =
        '<option value="">Selecione o contribuinte</option>' +
        contribuintes.map((c) => `<option value="${c.id}">${c.razaoSocial}</option>`).join('');
      if (atual) sel.value = atual;
    });
  } catch (e) {
    lista.innerHTML = `<p class="badge erro">Erro ao carregar: ${e.message}</p>`;
  }
}

async function carregarCertificados() {
  const lista = document.getElementById('listaCertificados');
  const contribuinteSelect = document.querySelector('#formCertificado select[name="contribuinteId"]');
  if (!contribuinteSelect || !contribuinteSelect.value) {
    lista.innerHTML = '<p>Selecione um contribuinte para ver os certificados.</p>';
  } else {
    try {
      const certs = await api(`/certificados/contribuinte/${contribuinteSelect.value}`);
      lista.innerHTML =
        certs
          .map(
            (c) => `<div class="card">
              ${c.titular} — valido ate ${new Date(c.validoAte).toLocaleDateString()}
              <span class="badge ${c.ativo ? 'ok' : 'erro'}">${c.ativo ? 'ativo' : 'revogado'}</span>
              <div class="card-acoes">
                ${c.ativo ? `<button data-acao="revogar-certificado" data-id="${c.id}">${icone('lixo')}Revogar</button>` : ''}
              </div>
            </div>`,
          )
          .join('') || '<p>Nenhum certificado cadastrado para este contribuinte.</p>';
    } catch (e) {
      lista.innerHTML = `<p class="badge erro">Erro ao carregar: ${e.message}</p>`;
    }
  }

  const dpsCertSelect = document.querySelector('#formDps select[name="certificadoId"]');
  const dpsContribuinteSelect = document.querySelector('#formDps select[name="contribuinteId"]');
  if (dpsCertSelect && dpsContribuinteSelect.value) {
    try {
      const certs = await api(`/certificados/contribuinte/${dpsContribuinteSelect.value}`);
      dpsCertSelect.innerHTML =
        '<option value="">Selecione o certificado</option>' +
        certs.filter((c) => c.ativo).map((c) => `<option value="${c.id}">${c.titular}</option>`).join('');
    } catch {
      /* ignora */
    }
  }
}

async function carregarHistoricoDps(contribuinteId) {
  const lista = document.getElementById('listaHistoricoDps');
  if (!contribuinteId) {
    lista.innerHTML = '<p>Selecione um contribuinte e clique em Buscar.</p>';
    return;
  }
  lista.innerHTML = '<p>Carregando...</p>';
  try {
    const registros = await api(`/dps/contribuinte/${contribuinteId}`);
    const badgeClasse = { AUTORIZADA: 'ok', REJEITADA: 'erro', ERRO: 'erro', ENVIADA: 'pendente', PENDENTE: 'pendente' };
    lista.innerHTML =
      registros
        .map(
          (d) => `<div class="card">
            <strong>Serie ${d.serie} / Numero ${d.numero}</strong> — competencia ${new Date(d.competencia).toLocaleDateString()}
            <span class="badge ${badgeClasse[d.status] ?? 'pendente'}">${d.status}</span>
            ${d.chaveAcessoNfse ? `<div>Chave de acesso: ${d.chaveAcessoNfse}</div>` : ''}
            ${d.mensagemErro ? `<div class="badge erro" style="display:block;margin-top:0.4rem;white-space:pre-wrap;">${d.mensagemErro}</div>` : ''}
          </div>`,
        )
        .join('') || '<p>Nenhuma DPS emitida para este contribuinte ainda.</p>';
  } catch (e) {
    lista.innerHTML = `<p class="badge erro">Erro ao carregar: ${e.message}</p>`;
  }
}

async function carregarNotas() {
  const lista = document.getElementById('listaNotas');
  try {
    const notas = await api('/nfse');
    lista.innerHTML =
      notas
        .map(
          (n) => `<div class="card">
            <strong>${n.chaveAcesso}</strong> — ${formatarMoeda(n.valorServicos)}
            <span class="badge ${n.status === 'AUTORIZADA' ? 'ok' : 'erro'}">${n.status}</span>
            <div class="card-acoes">
              <button data-acao="consultar-remoto" data-chave="${n.chaveAcesso}" data-contribuinte="${n.dps?.contribuinte?.id ?? ''}">${icone('busca')}Consultar no Ambiente Nacional</button>
              <button data-acao="baixar-danfse" data-chave="${n.chaveAcesso}" data-contribuinte="${n.dps?.contribuinte?.id ?? ''}">${icone('pdf')}Baixar DANFSe</button>
              ${n.status !== 'CANCELADA' ? `<button data-acao="cancelar-nota" data-chave="${n.chaveAcesso}" data-contribuinte="${n.dps?.contribuinte?.id ?? ''}">${icone('cancelar')}Cancelar</button>` : ''}
            </div>
          </div>`,
        )
        .join('') || '<p>Nenhuma NFS-e emitida ainda.</p>';
  } catch (e) {
    lista.innerHTML = `<p class="badge erro">Erro ao carregar: ${e.message}</p>`;
  }
}

async function carregarMinhasNotas(contribuinteId, codigoMunicipio, dataInicio, dataFim) {
  const lista = document.getElementById('listaMinhasNotas');
  if (!contribuinteId) {
    lista.innerHTML = '<p>Selecione o contribuinte (e opcionalmente o municipio/periodo) e clique em "Sincronizar e listar".</p>';
    return;
  }
  try {
    return await renderizarNotasDaEntidade(lista, contribuinteId, { codigoMunicipio, dataInicio, dataFim });
  } catch (e) {
    lista.innerHTML = `<p class="badge erro">Erro ao carregar: ${e.message}</p>`;
  }
}

function carregarTudo() {
  carregarMunicipios();
  carregarContribuintes();
  carregarNotas();
}

const IDENTIDADE_STORAGE = 'nfse_identidade_lembrada';

function salvarIdentidadeLembrada(identidade) {
  localStorage.setItem(IDENTIDADE_STORAGE, JSON.stringify(identidade));
}

function obterIdentidadeLembrada() {
  try {
    const raw = localStorage.getItem(IDENTIDADE_STORAGE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function esquecerIdentidade() {
  localStorage.removeItem(IDENTIDADE_STORAGE);
}

function mostrarBoasVindas(razaoSocial) {
  document.getElementById('nomeBoasVindas').textContent = razaoSocial;
  document.getElementById('boasVindas').style.display = '';
  document.getElementById('formularioAnexo').style.display = 'none';
  document.getElementById('entidadeNomeAtual').textContent = razaoSocial;
}

function mostrarFormularioAnexo() {
  document.getElementById('boasVindas').style.display = 'none';
  document.getElementById('formularioAnexo').style.display = '';
}

/** Exibe a chave de API recem-gerada (unica vez em que ela aparece em claro). */
function mostrarChaveGerada(nomeEntidade, chaveApi) {
  document.getElementById('dialogChaveEntidade').textContent = nomeEntidade;
  document.getElementById('dialogChaveValor').value = chaveApi.chave;
  document.getElementById('btnCopiarChave').textContent = 'Copiar';
  document.getElementById('dialogChaveApi').showModal();
}

/**
 * Se o painel estava usando a chave da propria entidade, anexar certificado a revogou: troca
 * automaticamente pela nova para o painel nao ficar travado em "x-api-key invalido".
 */
async function adotarChaveSeAtualFoiRevogada(chaveApi) {
  const res = await fetch('/configuracao', { headers: { 'x-api-key': getApiKey() } });
  if (res.status !== 401) return;
  localStorage.setItem(API_KEY_STORAGE, chaveApi.chave);
  document.getElementById('apiKey').value = chaveApi.chave;
}

function adicionarErro(container, mensagem) {
  const p = document.createElement('p');
  p.className = 'badge erro';
  p.textContent = mensagem;
  container.appendChild(p);
}

/** Codigo IBGE do municipio escolhido no filtro opcional do "Comecar aqui". */
function codigoMunicipioDoInicio() {
  const option = document.querySelector('#formInicioRapido select[name="municipioId"]').selectedOptions[0];
  return option?.value ? option.dataset.codigoIbge : undefined;
}

/**
 * Passos comuns depois que um certificado e aceito (anexado ou escolhido no Windows): mostra a
 * chave de API nova, lembra a entidade e ja carrega as notas.
 */
async function concluirCertificadoAceito({ contribuinte, certificado, chaveApi }) {
  const status = document.getElementById('statusInicioRapido');
  await adotarChaveSeAtualFoiRevogada(chaveApi);
  mostrarChaveGerada(contribuinte.razaoSocial, chaveApi);

  const reconhecido = document.createElement('p');
  reconhecido.className = 'badge ok';
  reconhecido.textContent = `Certificado reconhecido: ${contribuinte.razaoSocial} (${contribuinte.tipoInscricao} ${contribuinte.inscricaoFederal})`;
  status.replaceChildren(reconhecido);

  salvarIdentidadeLembrada({
    contribuinteId: contribuinte.id,
    certificadoId: certificado.id,
    razaoSocial: contribuinte.razaoSocial,
  });
  mostrarBoasVindas(contribuinte.razaoSocial);
  await carregarSeletorEntidades(contribuinte.id);

  await atualizarMinhasNotasHome(contribuinte.id, certificado.id, codigoMunicipioDoInicio());
  carregarTudo();
}

function montarItemCertWindows(cert) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'cert-windows-item';
  item.disabled = cert.vencido;
  item.dataset.thumbprint = cert.thumbprint;

  const nome = document.createElement('strong');
  nome.textContent = cert.nome;
  const detalhes = document.createElement('small');
  const documento = cert.inscricaoFederal ? `${cert.tipoInscricao} ${cert.inscricaoFederal} · ` : '';
  detalhes.textContent = `${documento}${cert.emissor} · valido ate ${new Date(cert.validoAte).toLocaleDateString('pt-BR')}`;
  const situacao = document.createElement('span');
  if (cert.vencido) {
    situacao.className = 'badge erro';
    situacao.textContent = 'Vencido';
  } else if (cert.entidadeCadastrada) {
    situacao.className = 'badge ok';
    situacao.textContent = 'Entidade ja cadastrada';
  } else {
    situacao.className = 'badge pendente';
    situacao.textContent = 'Nova entidade (sera cadastrada)';
  }

  item.append(nome, detalhes, situacao);
  return item;
}

function setupCertificadoWindows() {
  const dialog = document.getElementById('dialogCertWindows');
  const lista = document.getElementById('listaCertWindows');

  document.getElementById('btnCertificadoWindows').addEventListener('click', async () => {
    lista.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Lendo certificados do Windows...' }));
    dialog.showModal();
    try {
      const certificados = await api('/certificados/windows');
      if (certificados.length === 0) {
        lista.replaceChildren(
          Object.assign(document.createElement('p'), {
            textContent: 'Nenhum certificado com chave privada instalado para o usuario do Windows que roda a API.',
          }),
        );
        return;
      }
      lista.replaceChildren(...certificados.map(montarItemCertWindows));
    } catch (e) {
      lista.replaceChildren();
      adicionarErro(
        lista,
        e.status === 403 ? 'Somente a chave mestra (administrador) pode ver os certificados deste computador.' : e.message,
      );
    }
  });

  lista.addEventListener('click', async (ev) => {
    const item = ev.target.closest('.cert-windows-item');
    if (!item || item.disabled) return;
    const status = document.getElementById('statusInicioRapido');
    dialog.close();
    status.innerHTML = '<p>Usando certificado instalado...</p>';
    try {
      const municipioId = document.querySelector('#formInicioRapido select[name="municipioId"]').value || undefined;
      const resultado = await api('/certificados/windows', {
        method: 'POST',
        body: JSON.stringify({ thumbprint: item.dataset.thumbprint, municipioId }),
      });
      await concluirCertificadoAceito(resultado);
    } catch (e) {
      adicionarErro(status, e.message);
    }
  });

  document.getElementById('btnFecharCertWindows').addEventListener('click', () => dialog.close());
}

function setupDialogChave() {
  const dialog = document.getElementById('dialogChaveApi');
  const input = document.getElementById('dialogChaveValor');
  document.getElementById('btnCopiarChave').addEventListener('click', async (ev) => {
    input.select();
    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      document.execCommand('copy');
    }
    ev.target.textContent = 'Copiada!';
  });
  // Ao fechar (botao ou Esc), a chave sai da tela e do DOM.
  document.getElementById('btnFecharChave').addEventListener('click', () => {
    input.value = '';
    dialog.close();
  });
  dialog.addEventListener('cancel', () => {
    input.value = '';
  });
}

/** "Gerar nova chave" so faz sentido com uma entidade escolhida: fora disso, some da tela. */
function atualizarBotaoGerarChave() {
  document.getElementById('btnGerarChave').hidden = !document.getElementById('seletorEntidade').value;
}

/** Carrega a lista de entidades (contribuintes com certificado ativo) no seletor do cabecalho. */
async function carregarSeletorEntidades(contribuinteIdAtual) {
  const select = document.getElementById('seletorEntidade');
  try {
    const entidades = await api('/contribuintes/selecionaveis');
    select.innerHTML =
      '<option value="">Selecione uma entidade...</option>' +
      entidades
        .map(
          (e) =>
            `<option value="${e.contribuinteId}" data-certificado="${e.certificadoId}" data-nome="${e.razaoSocial}">${e.razaoSocial}</option>`,
        )
        .join('');
    select.value = contribuinteIdAtual || '';
    atualizarBotaoGerarChave();
  } catch {
    /* ignora - seletor fica vazio se a listagem falhar */
  }
}

function setupSeletorEntidade() {
  document.getElementById('seletorEntidade').addEventListener('change', (ev) => {
    atualizarBotaoGerarChave();
    const option = ev.target.selectedOptions[0];
    if (!option || !option.value) return;

    const identidade = {
      contribuinteId: option.value,
      certificadoId: option.dataset.certificado,
      razaoSocial: option.dataset.nome,
    };
    salvarIdentidadeLembrada(identidade);
    mostrarBoasVindas(identidade.razaoSocial);

    document.querySelector('.tab-btn[data-tab="inicio"]').click();
    document.getElementById('statusInicioRapido').innerHTML = '';
    atualizarMinhasNotasHome(identidade.contribuinteId, identidade.certificadoId);
  });

  document.getElementById('btnNovaEntidade').addEventListener('click', () => {
    document.querySelector('.tab-btn[data-tab="inicio"]').click();
    document.getElementById('seletorEntidade').value = '';
    atualizarBotaoGerarChave();
    document.getElementById('entidadeNomeAtual').textContent = 'Anexando novo certificado...';
    document.getElementById('statusInicioRapido').innerHTML = '';
    document.getElementById('listaInicioRapido').innerHTML = '';
    mostrarFormularioAnexo();
  });

  document.getElementById('btnGerarChave').addEventListener('click', async () => {
    const option = document.getElementById('seletorEntidade').selectedOptions[0];
    if (!option || !option.value) {
      alert('Selecione primeiro a entidade no seletor ao lado.');
      return;
    }
    const nome = option.dataset.nome;
    if (!confirm(`Gerar nova chave para ${nome}?\n\nA chave atual desta entidade deixara de funcionar imediatamente.`)) {
      return;
    }
    try {
      const chaveApi = await api(`/contribuintes/${option.value}/chave-api`, { method: 'POST' });
      mostrarChaveGerada(nome, chaveApi);
    } catch (e) {
      alert(e.status === 403 ? 'Somente a chave mestra (administrador) pode gerar chaves.' : `Erro: ${e.message}`);
    }
  });
}

function renderizarGruposPorEmpresa(grupos, contexto) {
  if (grupos.length === 0) {
    return '<p>Nenhuma nota encontrada ainda. Se voce sabe que existem notas, use o diagnostico em "Notas do Ambiente Nacional".</p>';
  }
  const totalGeral = grupos.reduce((soma, g) => soma + g.total, 0);
  const totalNotas = grupos.reduce((soma, g) => soma + g.notas.length, 0);

  const params = new URLSearchParams();
  if (contexto?.codigoMunicipio) params.set('codigoMunicipio', contexto.codigoMunicipio);
  if (contexto?.municipioEmissor) params.set('municipioEmissor', contexto.municipioEmissor);
  if (contexto?.dataInicio) params.set('dataInicio', contexto.dataInicio);
  if (contexto?.dataFim) params.set('dataFim', contexto.dataFim);
  const queryZip = params.toString() ? `?${params.toString()}` : '';

  const resumo = `<div class="card resumo-geral">
    <strong>${grupos.length} empresa(s)</strong> — <strong>${totalNotas} nota(s)</strong> — <strong>${formatarMoeda(totalGeral)}</strong>
    <div class="card-acoes">
      <button id="btnExportarCsv">${icone('csv')}Exportar tudo em CSV</button>
      <a class="btn-link" href="/distribuicao/contribuinte/${contexto.contribuinteId}/xml-lote${queryZip}">${icone('zip')}Baixar todos os XML (.zip)</a>
    </div>
  </div>
  <input type="search" id="buscaNotas" class="busca-notas" placeholder="Pesquisar por empresa, CNPJ, numero da nota ou chave de acesso..." />
  <p id="buscaNotasResultado" class="busca-notas-resultado"></p>`;

  const porEmpresa = grupos
    .map((g) => {
      const buscaGrupo = `${g.nome} ${g.cnpj}`.toLowerCase();
      return `<details class="grupo-empresa" data-busca="${buscaGrupo}">
        <summary>${g.nome} (${g.cnpj}) — ${g.notas.length} nota(s) — ${formatarMoeda(g.total)}</summary>
        <div class="lista">
          ${g.notas
            .map((n) => {
              const buscaNota = `${n.numeroNfse ?? ''} ${n.chaveAcesso ?? ''}`.toLowerCase();
              return `<div class="card" data-busca="${buscaNota}">
                <strong>NFS-e ${n.numeroNfse ?? ''}</strong> ${n.chaveAcesso ?? ''}
                ${n.valorServicos ? ` — ${formatarMoeda(n.valorServicos)}` : ''}
                ${n.dataEmissao ? ` — ${new Date(n.dataEmissao).toLocaleDateString()}` : ''}
                <div class="card-acoes">
                  <button data-acao="baixar-xml-distribuido" data-id="${n.id}">${icone('download')}Baixar XML</button>
                  ${n.chaveAcesso ? `<button data-acao="baixar-danfse-distribuido" data-chave="${n.chaveAcesso}" data-contribuinte="${contexto.contribuinteId}">${icone('pdf')}Baixar DANFSe</button>` : ''}
                </div>
              </div>`;
            })
            .join('')}
        </div>
      </details>`;
    })
    .join('');

  return resumo + porEmpresa;
}

/**
 * Liga o campo de busca de uma lista ja renderizada por renderizarGruposPorEmpresa: filtra por
 * empresa, CNPJ, numero da nota ou chave de acesso, abrindo automaticamente os grupos com
 * resultado e escondendo o resto.
 */
function configurarBuscaNotas(listaEl) {
  const input = listaEl.querySelector('#buscaNotas');
  const contador = listaEl.querySelector('#buscaNotasResultado');
  if (!input) return;

  input.addEventListener('input', () => {
    const termo = input.value.trim().toLowerCase();
    const grupos = listaEl.querySelectorAll('.grupo-empresa');
    let notasVisiveis = 0;
    let gruposVisiveis = 0;

    grupos.forEach((grupo) => {
      if (!termo) {
        grupo.style.display = '';
        grupo.open = false;
        grupo.querySelectorAll('.card').forEach((card) => (card.style.display = ''));
        return;
      }

      const grupoCombina = grupo.dataset.busca.includes(termo);
      let algumaNotaCombina = false;

      grupo.querySelectorAll('.card').forEach((card) => {
        const combina = grupoCombina || card.dataset.busca.includes(termo);
        card.style.display = combina ? '' : 'none';
        if (combina) {
          algumaNotaCombina = true;
          notasVisiveis++;
        }
      });

      const mostrarGrupo = grupoCombina || algumaNotaCombina;
      grupo.style.display = mostrarGrupo ? '' : 'none';
      if (mostrarGrupo) {
        grupo.open = true;
        gruposVisiveis++;
      }
    });

    contador.textContent = termo ? `${gruposVisiveis} empresa(s), ${notasVisiveis} nota(s) encontrada(s).` : '';
  });
}

function exportarCsv(grupos) {
  const linhas = [['Empresa', 'CNPJ', 'Numero NFS-e', 'Chave de Acesso', 'Valor', 'Data Emissao']];
  for (const g of grupos) {
    for (const n of g.notas) {
      linhas.push([
        g.nome,
        g.cnpj,
        n.numeroNfse ?? '',
        n.chaveAcesso ?? '',
        n.valorServicos ?? '',
        n.dataEmissao ? new Date(n.dataEmissao).toLocaleDateString() : '',
      ]);
    }
  }
  const csv = linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'notas-por-empresa.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Executa `promessa` e, enquanto ela nao termina, chama `aoTick` a cada `intervaloMs` - usado
 * para atualizar a tela com o que ja foi salvo no banco durante uma chamada longa (ex: uma
 * pagina de sincronizacao pode levar ate 4 min no servidor antes de responder).
 */
function comPollingEnquantoEspera(promessa, intervaloMs, aoTick) {
  let emAndamento = true;
  const agendar = () => {
    setTimeout(async () => {
      if (!emAndamento) return;
      await aoTick().catch(() => {});
      agendar();
    }, intervaloMs);
  };
  agendar();
  return promessa.finally(() => {
    emAndamento = false;
  });
}

/**
 * Sincroniza ate o fim: com muitas notas (dezenas de milhares) o servidor devolve o progresso
 * a cada ~4 min com concluido=false, e chamamos de novo - ele continua de onde parou. Cada nota
 * ja e gravada no banco assim que chega (nao so quando a chamada termina), entao, se `aoTick` for
 * passado, a tela e atualizada a cada poucos segundos enquanto a chamada ainda esta em andamento,
 * em vez de so mostrar um texto de "carregando" parado por minutos.
 */
async function sincronizarAteConcluir(contribuinteId, certificadoId, aoProgredir, aoTick) {
  const LIMITE_CHAMADAS = 30;
  const INTERVALO_POLLING_MS = 3000;
  let novosDocumentos = 0;
  let ultima;
  for (let chamada = 1; chamada <= LIMITE_CHAMADAS; chamada++) {
    const chamadaApi = api(`/distribuicao/contribuinte/${contribuinteId}/sincronizar?certificadoId=${certificadoId}`, {
      method: 'POST',
    });
    ultima = aoTick ? await comPollingEnquantoEspera(chamadaApi, INTERVALO_POLLING_MS, aoTick) : await chamadaApi;
    novosDocumentos += ultima.novosDocumentos;
    aoProgredir?.(novosDocumentos);
    if (ultima.concluido !== false) break;
  }
  return { ...ultima, novosDocumentos };
}

/**
 * Painel exibido durante a sincronizacao: total de notas ja no banco + novas nesta rodada, com
 * um botao para atualizar a tela na hora (sem esperar o proximo tick automatico do polling).
 * `renderizar` e a funcao que desenha a lista de notas e devolve o total atual.
 */
function criarPainelProgresso(renderizar) {
  const painel = document.createElement('div');
  painel.className = 'progresso-sincronizacao';
  const texto = document.createElement('p');
  texto.textContent = 'Sincronizando com o Ambiente Nacional...';
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'btn-secundario';
  botao.textContent = 'Atualizar tela agora';
  painel.append(texto, botao);

  let novas = 0;
  const atualizar = async () => {
    const total = await renderizar();
    texto.textContent =
      total === undefined
        ? `Baixando notas... ${novas.toLocaleString('pt-BR')} nova(s) ate agora.`
        : `Baixando notas... ${total.toLocaleString('pt-BR')} nota(s) no total · ${novas.toLocaleString('pt-BR')} nova(s) nesta atualizacao.`;
  };
  botao.addEventListener('click', () => {
    botao.disabled = true;
    atualizar()
      .catch((e) => {
        texto.textContent = `Erro ao atualizar a tela: ${e.message}`;
      })
      .finally(() => {
        botao.disabled = false;
      });
  });

  return {
    painel,
    atualizar,
    definirNovas(quantidade) {
      novas = quantidade;
    },
  };
}

function mensagemSincronizacao(container, sync) {
  const ok = document.createElement('p');
  ok.className = 'badge ok';
  ok.textContent = `Sincronizado: ${sync.novosDocumentos} novo(s) documento(s) encontrado(s).`;
  container.appendChild(ok);
  if (sync.concluido === false) {
    adicionarErro(container, 'A sincronizacao ainda nao terminou (muitos documentos). Clique em atualizar de novo para continuar.');
  }
  if (sync.novosDocumentos === 0 && sync.mensagemAmbiente) {
    const aviso = document.createElement('p');
    aviso.className = 'badge pendente';
    aviso.textContent = `Ambiente Nacional informou: "${sync.mensagemAmbiente}"`;
    container.appendChild(aviso);
  }
}

/**
 * Lista as notas agrupadas por empresa, com o filtro "Emitidas em" (municipio emissor) montado a
 * partir das proprias notas. Vem selecionado o municipio com mais notas - para a prefeitura, o dela.
 *
 * Chamada varias vezes seguidas durante uma sincronizacao (a lista vai crescendo): reaproveita a
 * estrutura (filtro + area da lista) do `container` em vez de recria-la do zero a cada chamada, e
 * so redesenha o conteudo quando o total de notas realmente mudou desde a ultima vez - sem isso a
 * tela "piscava" a cada poucos segundos mesmo quando nenhum documento novo tinha chegado ainda.
 */
async function renderizarNotasDaEntidade(container, contribuinteId, filtros = {}) {
  const jaMontado = container.querySelector('.filtro-emissor');
  const selecaoAnterior = jaMontado?.querySelector('select')?.value;

  const municipios = await api(`/distribuicao/contribuinte/${contribuinteId}/municipios-emissores`);

  let select, lista;
  if (jaMontado) {
    select = jaMontado.querySelector('select');
    lista = container.querySelector('.lista-notas');
  } else {
    const barra = document.createElement('div');
    barra.className = 'filtro-emissor';
    const rotulo = document.createElement('label');
    rotulo.textContent = 'Notas emitidas em:';
    select = document.createElement('select');
    rotulo.append(select);
    barra.append(rotulo);
    lista = document.createElement('div');
    lista.className = 'lista-notas';
    container.replaceChildren(barra, lista);
    select.addEventListener('change', () =>
      carregar({ mostrarCarregando: true, forcar: true }).catch((e) => adicionarErro(lista, e.message)),
    );
  }

  select.innerHTML = '';
  for (const m of municipios) {
    const nome = m.nome ? `${m.nome} (${m.codigo})` : `Municipio ${m.codigo}`;
    select.append(new Option(`${nome} - ${m.quantidade.toLocaleString('pt-BR')} nota(s)`, m.codigo));
  }
  select.append(new Option('Todos os municipios', ''));
  if (filtros.municipioEmissor !== undefined) select.value = filtros.municipioEmissor;
  else if (selecaoAnterior !== undefined) select.value = selecaoAnterior;

  let totalNotas = 0;
  const carregar = async ({ mostrarCarregando = false, forcar = false } = {}) => {
    const contexto = { contribuinteId, ...filtros, municipioEmissor: select.value || undefined };
    const params = new URLSearchParams();
    for (const campo of ['codigoMunicipio', 'municipioEmissor', 'dataInicio', 'dataFim']) {
      if (contexto[campo]) params.set(campo, contexto[campo]);
    }
    if (mostrarCarregando) lista.innerHTML = '<p>Carregando notas...</p>';
    const grupos = await api(`/distribuicao/contribuinte/${contribuinteId}/por-empresa?${params}`);
    totalNotas = grupos.reduce((soma, g) => soma + g.notas.length, 0);

    const assinatura = `${contexto.municipioEmissor ?? ''}|${totalNotas}`;
    if (!forcar && lista.dataset.assinatura === assinatura) return;
    lista.dataset.assinatura = assinatura;

    lista.innerHTML = renderizarGruposPorEmpresa(grupos, contexto);
    const btnCsv = lista.querySelector('#btnExportarCsv');
    if (btnCsv) btnCsv.addEventListener('click', () => exportarCsv(grupos));
    configurarBuscaNotas(lista);
  };

  await carregar({ mostrarCarregando: !jaMontado, forcar: !jaMontado });
  return totalNotas;
}

/** Sincroniza com o Ambiente Nacional e renderiza as notas, agrupadas por empresa, na tela "Comecar aqui". */
async function atualizarMinhasNotasHome(contribuinteId, certificadoId, codigoMunicipio, dataInicio, dataFim) {
  const status = document.getElementById('statusInicioRapido');
  const lista = document.getElementById('listaInicioRapido');
  lista.innerHTML = '';
  status.innerHTML = '';

  const progresso = criarPainelProgresso(() =>
    renderizarNotasDaEntidade(lista, contribuinteId, { codigoMunicipio, dataInicio, dataFim }),
  );
  status.appendChild(progresso.painel);

  try {
    const sync = await sincronizarAteConcluir(
      contribuinteId,
      certificadoId,
      (n) => progresso.definirNovas(n),
      progresso.atualizar,
    );
    progresso.painel.remove();
    mensagemSincronizacao(status, sync);
    await renderizarNotasDaEntidade(lista, contribuinteId, { codigoMunicipio, dataInicio, dataFim });
  } catch (e) {
    if (e.status === 404 || e.status === 400) {
      // Identidade lembrada neste navegador nao existe mais no banco (ex: banco foi resetado).
      // Esquece e volta para o formulario de anexo, em vez de travar numa tela de erro.
      esquecerIdentidade();
      status.innerHTML = `<p class="badge erro">Certificado nao reconhecido pelo sistema (pode ter sido removido). Anexe novamente.</p>`;
      mostrarFormularioAnexo();
      return;
    }
    status.innerHTML += `<p class="badge erro">${e.message}</p>`;
  }
}

function setupIdentidadeLembrada() {
  const identidade = obterIdentidadeLembrada();
  carregarSeletorEntidades(identidade?.contribuinteId);

  if (identidade) {
    mostrarBoasVindas(identidade.razaoSocial);
    atualizarMinhasNotasHome(identidade.contribuinteId, identidade.certificadoId);
  } else {
    mostrarFormularioAnexo();
  }

  document.getElementById('formPeriodo').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const atual = obterIdentidadeLembrada();
    if (!atual) return;
    const f = Object.fromEntries(new FormData(ev.target));
    document.getElementById('statusInicioRapido').innerHTML = '';
    atualizarMinhasNotasHome(atual.contribuinteId, atual.certificadoId, undefined, f.dataInicio, f.dataFim);
  });

  document.getElementById('btnTrocarCertificado').addEventListener('click', () => {
    esquecerIdentidade();
    document.getElementById('seletorEntidade').value = '';
    atualizarBotaoGerarChave();
    document.getElementById('entidadeNomeAtual').textContent = 'Nenhuma selecionada';
    document.getElementById('statusInicioRapido').innerHTML = '';
    document.getElementById('listaInicioRapido').innerHTML = '';
    mostrarFormularioAnexo();
  });
}

function setupAcoesDelegadas() {
  document.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button[data-acao]');
    if (!btn) return;
    const acao = btn.dataset.acao;

    try {
      if (acao === 'sincronizar-convenio') {
        const certificadoId = await escolherCertificadoPorMunicipio();
        if (!certificadoId) return;
        btn.disabled = true;
        const resp = await api(`/municipios/${btn.dataset.id}/sincronizar-convenio?certificadoId=${certificadoId}`, {
          method: 'POST',
        });
        alert(resp.sucesso ? 'Convenio sincronizado com sucesso.' : `Falha: HTTP ${resp.status}`);
        carregarMunicipios();
      }

      if (acao === 'ver-certificados') {
        document.querySelector('.tab-btn[data-tab="certificados"]').click();
        const sel = document.querySelector('#formCertificado select[name="contribuinteId"]');
        sel.value = btn.dataset.id;
        carregarCertificados();
      }

      if (acao === 'inativar-contribuinte') {
        if (!confirm('Inativar este contribuinte?')) return;
        await api(`/contribuintes/${btn.dataset.id}`, { method: 'DELETE' });
        carregarContribuintes();
      }

      if (acao === 'revogar-certificado') {
        if (!confirm('Revogar este certificado? Ele deixara de poder ser usado para emitir/assinar.')) return;
        await api(`/certificados/${btn.dataset.id}`, { method: 'DELETE' });
        carregarCertificados();
      }

      if (acao === 'consultar-remoto') {
        const certificadoId = await escolherCertificado(btn.dataset.contribuinte);
        if (!certificadoId) return;
        const resp = await api(`/nfse/${btn.dataset.chave}/remoto?certificadoId=${certificadoId}`);
        alert(JSON.stringify(resp, null, 2));
      }

      if (acao === 'baixar-danfse') {
        const certificadoId = await escolherCertificado(btn.dataset.contribuinte);
        if (!certificadoId) return;
        const blob = await api(`/nfse/${btn.dataset.chave}/danfse?certificadoId=${certificadoId}`);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `danfse-${btn.dataset.chave}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }

      if (acao === 'baixar-xml-distribuido') {
        const xml = await api(`/distribuicao/documento/${btn.dataset.id}/xml`);
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nfse-${btn.dataset.id}.xml`;
        a.click();
        URL.revokeObjectURL(url);
      }

      if (acao === 'baixar-danfse-distribuido') {
        const certificadoId = await escolherCertificado(btn.dataset.contribuinte);
        if (!certificadoId) return;
        const blob = await api(`/distribuicao/danfse/${btn.dataset.chave}?certificadoId=${certificadoId}`);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `danfse-${btn.dataset.chave}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }

      if (acao === 'cancelar-nota') {
        const certificadoId = await escolherCertificado(btn.dataset.contribuinte);
        if (!certificadoId) return;
        const motivo = prompt('Motivo do cancelamento:');
        if (!motivo) return;
        const resp = await api(`/nfse/${btn.dataset.chave}/cancelar`, {
          method: 'POST',
          body: JSON.stringify({ certificadoId, motivo }),
        });
        alert(resp.sucesso ? 'NFS-e cancelada com sucesso.' : `Falha no cancelamento: HTTP ${resp.status}`);
        carregarNotas();
      }
    } catch (e) {
      alert(`Erro: ${e.message}`);
    } finally {
      btn.disabled = false;
    }
  });
}

/**
 * A consulta de parametros municipais (API Parametros Municipais do Emissor Publico Nacional)
 * aceita qualquer certificado digital valido para assinar a conexao mTLS — nao precisa ser de
 * um contribuinte especificamente cadastrado naquele municipio. Por isso listamos aqui os
 * certificados de TODOS os contribuintes cadastrados, de qualquer municipio.
 */
async function escolherCertificadoPorMunicipio() {
  const contribuintes = await api('/contribuintes');
  const ativos = contribuintes.filter((c) => c.ativo);
  if (ativos.length === 0) {
    alert('Cadastre ao menos um contribuinte com certificado digital antes de sincronizar o convenio.');
    return null;
  }
  if (ativos.length === 1) return escolherCertificado(ativos[0].id);

  const opcoes = ativos.map((c, i) => `${i + 1}) ${c.razaoSocial}`).join('\n');
  const escolha = prompt(`Qual contribuinte usar para assinar a consulta?\n${opcoes}`, '1');
  const idx = Number(escolha) - 1;
  if (Number.isNaN(idx) || !ativos[idx]) return null;
  return escolherCertificado(ativos[idx].id);
}

function setupForms() {
  document.getElementById('formMunicipio').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(ev.target));
    try {
      await api('/municipios', { method: 'POST', body: JSON.stringify(data) });
      ev.target.reset();
      carregarMunicipios();
    } catch (e) {
      alert(`Erro: ${e.message}`);
    }
  });

  document.getElementById('formContribuinte').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(ev.target));
    try {
      await api('/contribuintes', { method: 'POST', body: JSON.stringify(data) });
      ev.target.reset();
      carregarContribuintes();
    } catch (e) {
      alert(`Erro: ${e.message}`);
    }
  });

  document
    .querySelector('#formCertificado select[name="contribuinteId"]')
    .addEventListener('change', carregarCertificados);

  document.getElementById('formCertificado').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const formData = new FormData(ev.target);
    try {
      const nomeEntidade = ev.target.querySelector('select[name="contribuinteId"]').selectedOptions[0]?.textContent ?? '';
      const { chaveApi } = await api('/certificados', { method: 'POST', body: formData });
      ev.target.reset();
      await adotarChaveSeAtualFoiRevogada(chaveApi);
      carregarCertificados();
      mostrarChaveGerada(nomeEntidade, chaveApi);
    } catch (e) {
      alert(`Erro: ${e.message}`);
    }
  });

  document
    .querySelector('#formDps select[name="contribuinteId"]')
    .addEventListener('change', carregarCertificados);

  document.getElementById('formDps').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.target));
    const payload = {
      contribuinteId: f.contribuinteId,
      certificadoId: f.certificadoId,
      serie: f.serie,
      numero: f.numero,
      competencia: f.competencia,
      tomador: {
        inscricaoFederal: f.tomadorInscricao,
        razaoSocial: f.tomadorNome,
        codigoMunicipio: f.tomadorMunicipio,
        email: f.tomadorEmail || undefined,
      },
      servico: {
        codigoTributacaoNacional: f.codTribNacional,
        codigoMunicipioPrestacao: f.municipioPrestacao,
        descricao: f.descricaoServico,
      },
      valores: {
        valorServicos: Number(f.valorServicos),
        aliquotaIss: f.aliquotaIss ? Number(f.aliquotaIss) : undefined,
      },
    };
    const resultado = document.getElementById('resultadoDps');
    resultado.textContent = 'Enviando...';
    try {
      const resp = await api('/dps/emitir', { method: 'POST', body: JSON.stringify(payload) });
      resultado.textContent = JSON.stringify(resp, null, 2);
      carregarNotas();
    } catch (e) {
      resultado.textContent = `Erro: ${e.message}\n\n${JSON.stringify(e.data, null, 2)}`;
    } finally {
      carregarHistoricoDps(f.contribuinteId);
    }
  });

  document.getElementById('atualizarNotas').addEventListener('click', carregarNotas);

  document.getElementById('formAliquotas').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.target));
    const resultado = document.getElementById('resultadoAliquotas');
    const certificadoId = await escolherCertificadoPorMunicipio();
    if (!certificadoId) return;
    resultado.textContent = 'Consultando...';
    try {
      const resp = await api(
        `/municipios/${f.municipioId}/servicos/${f.codigoServico}/aliquotas?certificadoId=${certificadoId}`,
      );
      resultado.textContent = JSON.stringify(resp, null, 2);
    } catch (e) {
      resultado.textContent = `Erro: ${e.message}`;
    }
  });

  document.getElementById('formHistoricoDps').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.target));
    carregarHistoricoDps(f.contribuinteId);
  });

  document.getElementById('formInicioRapido').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const formData = new FormData(ev.target);
    const status = document.getElementById('statusInicioRapido');
    status.innerHTML = '<p>Lendo certificado...</p>';

    try {
      const resultado = await api('/certificados/anexar-rapido', { method: 'POST', body: formData });
      await concluirCertificadoAceito(resultado);
    } catch (e) {
      adicionarErro(status, e.message);
    }
  });

  document.getElementById('formMinhasNotas').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.target));
    if (!f.contribuinteId) return;

    const codigoMunicipio = f.municipioId
      ? document.querySelector(`#formMinhasNotas select[name="municipioId"] option[value="${f.municipioId}"]`)
          ?.dataset.codigoIbge
      : undefined;

    const status = document.getElementById('statusSincronizacao');
    const certificadoId = await escolherCertificado(f.contribuinteId);
    if (!certificadoId) return;

    status.innerHTML = '';
    const progresso = criarPainelProgresso(() =>
      carregarMinhasNotas(f.contribuinteId, codigoMunicipio, f.dataInicio, f.dataFim),
    );
    status.appendChild(progresso.painel);
    try {
      const resp = await sincronizarAteConcluir(
        f.contribuinteId,
        certificadoId,
        (n) => progresso.definirNovas(n),
        progresso.atualizar,
      );
      status.replaceChildren();
      mensagemSincronizacao(status, resp);
    } catch (e) {
      status.innerHTML = `<span class="badge erro">Falha na sincronizacao: ${e.message}</span>`;
    }
    carregarMinhasNotas(f.contribuinteId, codigoMunicipio, f.dataInicio, f.dataFim);
  });

  document.getElementById('formDiagnostico').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.target));
    if (!f.contribuinteId) return;
    const resultado = document.getElementById('resultadoDiagnostico');
    const certificadoId = await escolherCertificado(f.contribuinteId);
    if (!certificadoId) return;
    resultado.textContent = 'Consultando...';
    try {
      const resp = await api(
        `/distribuicao/contribuinte/${f.contribuinteId}/bruto?certificadoId=${certificadoId}&nsu=${f.nsu || '0'}`,
      );
      resultado.textContent = JSON.stringify(resp, null, 2);
    } catch (e) {
      resultado.textContent = `Erro: ${e.message}\n\n${JSON.stringify(e.data, null, 2)}`;
    }
  });
}

setupTabs();
setupApiKey();
setupAmbiente();
setupForms();
setupAcoesDelegadas();
setupSeletorEntidade();
setupDialogChave();
setupCertificadoWindows();
setupIdentidadeLembrada();
carregarAmbiente();
carregarTudo();
