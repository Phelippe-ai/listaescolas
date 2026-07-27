/* ==========================================================================
   Fala Tio — Plataforma de Prospecção de Escolas
   Lógica da aplicação (vanilla JS, sem dependências, persiste em localStorage)
   ========================================================================== */

'use strict';

const STORAGE_KEY = 'falatio_escolas_v1';
const THEME_KEY = 'falatio_theme';

/* Definição das etapas do funil de prospecção (fluxo completo coordenação → direção → contrato) */
const ETAPAS = [
  { id: 'identificada',            label: 'Escola identificada',              hex: '#94A3B8' },
  { id: 'primeiro_contato',        label: 'Primeiro contato',                 hex: '#38BDF8' },
  { id: 'contato_coord',           label: 'Contato com a coordenação',        hex: '#3B82F6' },
  { id: 'reuniao_coord_agendada',  label: 'Reunião c/ coordenação agendada',  hex: '#6366F1' },
  { id: 'reuniao_coord_realizada', label: 'Reunião c/ coordenação realizada', hex: '#4F46E5' },
  { id: 'encaminhado_direcao',     label: 'Encaminhado para a direção',       hex: '#8B5CF6' },
  { id: 'contato_direcao',         label: 'Contato com a direção',            hex: '#A855F7' },
  { id: 'reuniao_direcao_agendada',label: 'Reunião c/ direção agendada',      hex: '#C026D3' },
  { id: 'reuniao_direcao_realizada',label:'Reunião c/ direção realizada',     hex: '#DB2777' },
  { id: 'contrato_enviado',        label: 'Contrato enviado',                 hex: '#F59E0B' },
  { id: 'contrato_analise',        label: 'Contrato em análise',              hex: '#F97316' },
  { id: 'contrato_assinado',       label: 'Contrato assinado',                hex: '#10B981' },
  { id: 'projeto_piloto',          label: 'Projeto piloto',                   hex: '#059669' },
];
const ETAPA_INICIAL = ETAPAS[0].id;
const etapaById = id => ETAPAS.find(e => e.id === id) || ETAPAS[0];

/* Campos exportados/importados e seus rótulos amigáveis */
const CAMPOS = ['nome', 'cidade', 'estado', 'bairro', 'endereco', 'telefone_escola', 'site',
  'alunos', 'ensino_medio', 'decisor_nome', 'decisor_cargo', 'decisor_telefone', 'inovacao',
  'score', 'nota_enem', 'etapa', 'observacoes', 'notas'];
const CAMPO_LABEL = {
  nome: 'Escola', cidade: 'Cidade', estado: 'UF', bairro: 'Bairro', endereco: 'Endereço',
  telefone_escola: 'Tel. escola', site: 'Site', alunos: 'Alunos', ensino_medio: 'Ensino médio',
  decisor_nome: 'Decisor', decisor_cargo: 'Cargo', decisor_telefone: 'Tel. direto',
  inovacao: 'Inovação', score: 'Score', nota_enem: 'Nota ENEM', etapa: 'Etapa',
  observacoes: 'Observações', notas: 'Notas',
};

/* Nomes de coluna aceitos na importação (o sistema reconhece variações comuns de planilha) */
const HEADER_ALIASES = {
  nome: ['nome', 'escola', 'nome da escola', 'colegio', 'instituicao', 'nome_escola', 'razao social'],
  cidade: ['cidade', 'municipio'],
  estado: ['estado', 'uf'],
  bairro: ['bairro'],
  endereco: ['endereco', 'logradouro', 'rua', 'endereco completo'],
  telefone_escola: ['telefone', 'telefone da escola', 'telefone_escola', 'fone', 'contato', 'contato_escola', 'telefone principal', 'telefone geral'],
  site: ['site', 'website', 'url', 'pagina'],
  alunos: ['alunos', 'num_alunos', 'numero de alunos', 'n alunos', 'no alunos', 'n de alunos', 'qtd alunos', 'qtde alunos', 'quantidade de alunos', 'total de alunos', 'matriculas'],
  ensino_medio: ['ensino medio', 'ensino_medio', 'tem ensino medio', 'possui ensino medio', 'medio', 'em'],
  decisor_nome: ['decisor', 'decisor_nome', 'nome do decisor', 'responsavel', 'diretor', 'gestor', 'contato nome', 'nome contato', 'nome do responsavel'],
  decisor_cargo: ['cargo', 'decisor_cargo', 'funcao', 'cargo do decisor', 'cargo contato'],
  decisor_telefone: ['telefone direto', 'decisor_telefone', 'celular', 'whatsapp', 'wpp', 'telefone do decisor', 'contato direto', 'telefone_decisor', 'telefone responsavel'],
  inovacao: ['inovacao', 'perfil de inovacao', 'perfil_inovacao', 'perfil inovacao'],
  score: ['score', 'pontuacao', 'prioridade', 'score_prioridade', 'nota prioridade'],
  nota_enem: ['nota enem', 'nota_enem', 'enem', 'media enem'],
  etapa: ['etapa', 'status', 'funil', 'fase', 'estagio', 'etapa do funil'],
  observacoes: ['observacoes', 'obs', 'observacao', 'notas gerais', 'comentarios'],
  notas: ['notas', 'historico', 'anotacoes', 'notas prospeccao', 'notas da prospeccao'],
};

/* Normaliza um cabeçalho: sem acento, minúsculo, espaços colapsados */
function normHeader(s) {
  return String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
/* Lookup: cabeçalho normalizado -> campo canônico */
const HEADER_LOOKUP = {};
for (const [campo, aliases] of Object.entries(HEADER_ALIASES)) {
  aliases.forEach(a => { HEADER_LOOKUP[normHeader(a)] = campo; });
}
/* Lookup de etapa: aceita o id OU o rótulo escrito na planilha */
const ETAPA_LOOKUP = {};
ETAPAS.forEach(e => { ETAPA_LOOKUP[e.id] = e.id; ETAPA_LOOKUP[normHeader(e.label)] = e.id; });

/* ---------- Estado ---------- */
let escolas = [];
let sortKey = 'score';
let sortDir = -1; // -1 desc, 1 asc

/* ---------- Persistência ---------- */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { escolas = JSON.parse(raw); migrateEtapas(); return; }
  } catch (e) { console.warn('Falha ao ler dados salvos', e); }
  escolas = JSON.parse(JSON.stringify(SEED_ESCOLAS));
  migrateEtapas();
}
/* Garante que toda escola tenha uma etapa válida do fluxo atual.
   Mapeia etapas de versões antigas do funil para a etapa inicial. */
function migrateEtapas() {
  const validos = new Set(ETAPAS.map(e => e.id));
  const legado = {
    novo: 'identificada', contato: 'primeiro_contato', decisor: 'contato_coord',
    reuniao: 'reuniao_coord_agendada', coordenacao: 'reuniao_coord_realizada',
    fechado: 'contrato_assinado', perdido: 'identificada',
  };
  escolas.forEach(e => {
    if (!validos.has(e.etapa)) e.etapa = legado[e.etapa] || ETAPA_INICIAL;
  });
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(escolas)); }
  catch (e) { toast('Não foi possível salvar (armazenamento cheio?)'); }
}

/* ---------- Utilidades ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const onlyDigits = s => String(s || '').replace(/\D/g, '');
function waLink(phone) {
  const d = onlyDigits(phone);
  if (!d) return '';
  return 'https://wa.me/55' + d;
}
function scoreColor(score) {
  if (score >= 90) return '#10B981';
  if (score >= 75) return '#3B82F6';
  if (score >= 60) return '#F59E0B';
  return '#94A3B8';
}
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}
function nextId() {
  return escolas.reduce((m, e) => Math.max(m, e.id || 0), 0) + 1;
}
// Gera um id único. Na nuvem usa base de tempo para não colidir entre usuários.
let _idSeq = 0;
function newId() {
  if (!Cloud.active) return nextId();
  return Date.now() * 100000 + (_idSeq++);
}
// Salva uma escola na nuvem (se ativa) e registra a atividade. Não bloqueia a UI.
function cloudSave(e, acao, detalhe) {
  if (!Cloud.active) return;
  Cloud.upsert(e).catch(err => toast('Falha ao salvar na nuvem: ' + (err.message || err)));
  if (acao) Cloud.logAtividade(acao, e, detalhe);
}

/* ---------- Filtros ativos ---------- */
function activeFilters() {
  return {
    q: $('#searchInput').value.trim().toLowerCase(),
    estado: $('#filterEstado').value,
    cidade: $('#filterCidade').value,
    medio: $('#filterMedio').value,
    etapa: $('#filterEtapa').value,
    inovacao: $('#filterInovacao').value,
  };
}
function applyFilters(list) {
  const f = activeFilters();
  return list.filter(e => {
    if (f.estado && e.estado !== f.estado) return false;
    if (f.cidade && e.cidade !== f.cidade) return false;
    if (f.medio === 'sim' && !e.ensino_medio) return false;
    if (f.medio === 'nao' && e.ensino_medio) return false;
    if (f.etapa && e.etapa !== f.etapa) return false;
    if (f.inovacao && e.inovacao !== f.inovacao) return false;
    if (f.q) {
      const blob = [e.nome, e.decisor_nome, e.decisor_cargo, e.bairro, e.cidade, e.observacoes]
        .join(' ').toLowerCase();
      if (!blob.includes(f.q)) return false;
    }
    return true;
  });
}

/* ---------- Stats ---------- */
function renderStats() {
  const total = escolas.length;
  const emAndamento = escolas.filter(e =>
    e.etapa !== ETAPA_INICIAL && !['contrato_assinado', 'projeto_piloto'].includes(e.etapa)).length;
  const reunioes = escolas.filter(e => [
    'reuniao_coord_agendada', 'reuniao_coord_realizada',
    'reuniao_direcao_agendada', 'reuniao_direcao_realizada'].includes(e.etapa)).length;
  const fechados = escolas.filter(e => ['contrato_assinado', 'projeto_piloto'].includes(e.etapa)).length;
  const stats = [
    { num: total, lbl: 'Escolas' },
    { num: emAndamento, lbl: 'Em andamento' },
    { num: reunioes, lbl: 'Reuniões' },
    { num: fechados, lbl: 'Fechados' },
  ];
  $('#stats').innerHTML = stats.map(s =>
    `<div class="stat"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>`).join('');
}

/* ---------- Popular selects de filtro ---------- */
function populateFilters() {
  const ufSel = $('#filterEstado'), cSel = $('#filterCidade'),
        eSel = $('#filterEtapa'), iSel = $('#filterInovacao');
  const keepUF = ufSel.value, keepC = cSel.value, keepE = eSel.value, keepI = iSel.value;

  const estados = [...new Set(escolas.map(e => e.estado).filter(Boolean))].sort();
  // Cidades acompanham o estado selecionado (se houver)
  const cidades = [...new Set(escolas
    .filter(e => !keepUF || e.estado === keepUF)
    .map(e => e.cidade).filter(Boolean))].sort();
  const inov = [...new Set(escolas.map(e => e.inovacao).filter(Boolean))];

  ufSel.innerHTML = '<option value="">Todos os estados</option>' +
    estados.map(u => `<option value="${esc(u)}">${esc(u)}</option>`).join('');
  cSel.innerHTML = '<option value="">Todas as cidades</option>' +
    cidades.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  eSel.innerHTML = '<option value="">Todas as etapas</option>' +
    ETAPAS.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join('');
  iSel.innerHTML = '<option value="">Toda inovação</option>' +
    inov.map(i => `<option value="${esc(i)}">${esc(i)}</option>`).join('');

  ufSel.value = keepUF; eSel.value = keepE; iSel.value = keepI;
  // Mantém a cidade só se ainda existir na lista filtrada pelo estado
  cSel.value = cidades.includes(keepC) ? keepC : '';
}

/* ---------- Render: Tabela ---------- */
function contactCell(e) {
  const lines = [];
  if (e.telefone_escola) {
    lines.push(`<div class="contact-line"><span class="tag">Esc</span>
      <span>${esc(e.telefone_escola)}</span>
      <a class="icon-link tel" href="tel:${onlyDigits(e.telefone_escola)}" title="Ligar">${icoPhone()}</a>
      <a class="icon-link wpp" href="${waLink(e.telefone_escola)}" target="_blank" rel="noopener" title="WhatsApp">${icoWpp()}</a>
    </div>`);
  }
  if (e.decisor_telefone && e.decisor_telefone !== e.telefone_escola) {
    lines.push(`<div class="contact-line"><span class="tag">Dir</span>
      <span>${esc(e.decisor_telefone)}</span>
      <a class="icon-link tel" href="tel:${onlyDigits(e.decisor_telefone)}" title="Ligar">${icoPhone()}</a>
      <a class="icon-link wpp" href="${waLink(e.decisor_telefone)}" target="_blank" rel="noopener" title="WhatsApp">${icoWpp()}</a>
    </div>`);
  }
  return `<div class="contacts">${lines.join('') || '<span class="muted">—</span>'}</div>`;
}

function etapaSelect(e) {
  const cur = etapaById(e.etapa);
  const opts = ETAPAS.map(s =>
    `<option value="${s.id}" ${s.id === e.etapa ? 'selected' : ''}>${esc(s.label)}</option>`).join('');
  return `<select class="etapa-select" data-id="${e.id}" style="background-color:${cur.hex}"
    onclick="event.stopPropagation()">${opts}</select>`;
}

function renderTable() {
  const filtered = applyFilters(escolas);
  const prioCE = $('#prioCE') && $('#prioCE').checked;
  filtered.sort((a, b) => {
    // Ceará sempre no topo quando a opção está ligada
    if (prioCE) {
      const ca = a.estado === 'CE' ? 0 : 1, cb = b.estado === 'CE' ? 0 : 1;
      if (ca !== cb) return ca - cb;
    }
    let va = a[sortKey], vb = b[sortKey];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
    va = va ?? ''; vb = vb ?? '';
    if (va < vb) return -1 * sortDir;
    if (va > vb) return 1 * sortDir;
    return 0;
  });

  const body = $('#tableBody');
  if (!filtered.length) {
    body.innerHTML = `<tr><td colspan="9"><div class="empty-state">
      <div class="big">🔍</div>Nenhuma escola encontrada com esses filtros.</div></td></tr>`;
    updateSortHeaders();
    return;
  }

  body.innerHTML = filtered.map(e => {
    return `<tr data-id="${e.id}">
      <td>
        <div class="school-name" data-open="${e.id}">${esc(e.nome)}</div>
        ${e.observacoes ? `<div class="school-sub">${esc(e.observacoes.slice(0, 60))}${e.observacoes.length > 60 ? '…' : ''}</div>` : ''}
      </td>
      <td>
        <div>${esc(e.cidade || '—')}${e.estado ? `<span class="uf-chip">${esc(e.estado)}</span>` : ''}</div>
        ${e.bairro ? `<div class="school-sub">${esc(e.bairro)}</div>` : ''}
      </td>
      <td>
        ${e.decisor_nome ? `<div class="decisor-name">${esc(e.decisor_nome)}</div>
          <div class="decisor-cargo">${esc(e.decisor_cargo || '')}</div>` : '<span class="muted">—</span>'}
      </td>
      <td>${contactCell(e)}</td>
      <td>${e.alunos ? Number(e.alunos).toLocaleString('pt-BR') : '<span class="muted">—</span>'}</td>
      <td>${e.ensino_medio ? '<span class="ym-badge yes">Sim</span>' : '<span class="ym-badge no">Não</span>'}</td>
      <td><span class="score-badge" style="background:${scoreColor(e.score)}">${e.score || 0}</span></td>
      <td>${etapaSelect(e)}</td>
      <td>
        <div class="row-actions">
          <button class="btn-icon" data-open="${e.id}" title="Ver / editar">${icoEdit()}</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  updateSortHeaders();
}

function updateSortHeaders() {
  $$('thead th[data-sort]').forEach(th => {
    const key = th.dataset.sort;
    th.classList.toggle('sorted', key === sortKey);
    const arrow = th.querySelector('.arrow');
    if (arrow) arrow.textContent = key === sortKey ? (sortDir === 1 ? '↑' : '↓') : '↕';
  });
}

/* ---------- Render: Kanban ---------- */
function renderKanban() {
  const filtered = applyFilters(escolas);
  const board = $('#kanban');
  board.innerHTML = ETAPAS.map(st => {
    const cards = filtered.filter(e => e.etapa === st.id);
    return `<div class="kanban-col" data-etapa="${st.id}">
      <div class="kanban-col-head">
        <span class="dot" style="background:${st.hex}"></span>
        <span class="title">${esc(st.label)}</span>
        <span class="count">${cards.length}</span>
      </div>
      <div class="kanban-cards" data-etapa="${st.id}">
        ${cards.map(e => kcard(e, st)).join('')}
      </div>
    </div>`;
  }).join('');
  attachDnD();
}

function kcard(e, st) {
  const phone = e.decisor_telefone || e.telefone_escola;
  return `<div class="kcard" draggable="true" data-id="${e.id}" style="border-left-color:${st.hex}">
    <div class="kcard-title">
      <span>${esc(e.nome)}</span>
      <span class="score" style="background:${scoreColor(e.score)}">${e.score || 0}</span>
    </div>
    <div class="kcard-meta">
      ${e.decisor_nome ? `👤 <strong>${esc(e.decisor_nome)}</strong>${e.decisor_cargo ? ' · ' + esc(e.decisor_cargo) : ''}<br>` : ''}
      ${phone ? `📞 ${esc(phone)}` : '<span class="muted">Sem contato</span>'}
    </div>
    <div class="kcard-foot">
      <span class="city-tag">${esc(e.cidade || '—')}</span>
      ${phone ? `<a class="icon-link wpp" href="${waLink(phone)}" target="_blank" rel="noopener" title="WhatsApp" onclick="event.stopPropagation()">${icoWpp()}</a>` : ''}
      <button class="btn-icon btn-sm" data-open="${e.id}" title="Ver / editar" onclick="event.stopPropagation()">${icoEdit()}</button>
    </div>
  </div>`;
}

/* Drag & drop */
let dragId = null;
function attachDnD() {
  $$('.kcard').forEach(card => {
    card.addEventListener('dragstart', () => {
      dragId = +card.dataset.id;
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
  $$('.kanban-cards').forEach(col => {
    col.addEventListener('dragover', ev => { ev.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', ev => {
      ev.preventDefault();
      col.classList.remove('drag-over');
      const novaEtapa = col.dataset.etapa;
      const e = escolas.find(x => x.id === dragId);
      if (e && e.etapa !== novaEtapa) {
        const prev = e.etapa;
        e.etapa = novaEtapa;
        saveData();
        renderAll();
        cloudSave(e, 'moveu', `${etapaById(prev).label} → ${etapaById(novaEtapa).label}`);
        toast(`${e.nome} → ${etapaById(novaEtapa).label}`);
      }
      dragId = null;
    });
  });
}

/* ---------- Drawer: detalhe / edição ---------- */
function openDrawer(id) {
  const e = id ? escolas.find(x => x.id === id) : null;
  const isNew = !e;
  const d = e || { etapa: ETAPA_INICIAL, cidade: 'Fortaleza', estado: 'CE', ensino_medio: true, score: 60 };

  const drawer = $('#drawer');
  drawer.innerHTML = `
    <div class="drawer-head">
      <div>
        <h2>${isNew ? 'Nova escola' : esc(d.nome)}</h2>
        <div class="sub">${isNew ? 'Cadastrar nova escola na prospecção' : esc([d.bairro, d.cidade].filter(Boolean).join(' · '))}</div>
      </div>
      <button class="btn-icon" id="drawerClose" title="Fechar">✕</button>
    </div>
    <div class="drawer-body">
      <form id="escolaForm">
        <div class="detail-block">
          <h3>Identificação</h3>
          <div class="field"><label>Nome da escola *</label><input name="nome" required value="${esc(d.nome || '')}" /></div>
          <div class="field-row">
            <div class="field"><label>Cidade</label><input name="cidade" value="${esc(d.cidade || '')}" /></div>
            <div class="field"><label>Estado (UF)</label><input name="estado" maxlength="2" value="${esc(d.estado || '')}" /></div>
          </div>
          <div class="field"><label>Bairro</label><input name="bairro" value="${esc(d.bairro || '')}" /></div>
          <div class="field"><label>Endereço</label><input name="endereco" value="${esc(d.endereco || '')}" /></div>
          <div class="field-row">
            <div class="field"><label>Alunos</label><input name="alunos" type="number" min="0" value="${d.alunos ?? ''}" /></div>
            <div class="field"><label>Ensino médio</label><select name="ensino_medio">
              <option value="sim" ${d.ensino_medio ? 'selected' : ''}>Sim</option>
              <option value="nao" ${!d.ensino_medio ? 'selected' : ''}>Não</option>
            </select></div>
          </div>
          <div class="field"><label>Site</label><input name="site" value="${esc(d.site || '')}" /></div>
        </div>

        <div class="detail-block">
          <h3>Decisor</h3>
          <div class="field"><label>Nome do decisor</label><input name="decisor_nome" value="${esc(d.decisor_nome || '')}" /></div>
          <div class="field"><label>Cargo</label><input name="decisor_cargo" value="${esc(d.decisor_cargo || '')}" /></div>
          <div class="field-row">
            <div class="field"><label>Telefone da escola</label><input name="telefone_escola" value="${esc(d.telefone_escola || '')}" /></div>
            <div class="field"><label>Telefone direto</label><input name="decisor_telefone" value="${esc(d.decisor_telefone || '')}" /></div>
          </div>
        </div>

        <div class="detail-block">
          <h3>Prospecção</h3>
          <div class="field-row">
            <div class="field"><label>Etapa do funil</label><select name="etapa">
              ${ETAPAS.map(s => `<option value="${s.id}" ${s.id === d.etapa ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
            </select></div>
            <div class="field"><label>Score (0-100)</label><input name="score" type="number" min="0" max="100" value="${d.score ?? 60}" /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Perfil de inovação</label><input name="inovacao" value="${esc(d.inovacao || '')}" /></div>
            <div class="field"><label>Nota ENEM</label><input name="nota_enem" value="${esc(d.nota_enem ?? '')}" /></div>
          </div>
          <div class="field"><label>Observações</label><textarea name="observacoes">${esc(d.observacoes || '')}</textarea></div>
          <div class="field"><label>Notas da prospecção (histórico de contatos)</label><textarea name="notas" placeholder="Ex.: 22/07 liguei, secretária pediu para retornar às 14h…">${esc(d.notas || '')}</textarea></div>
        </div>

        ${!isNew ? quickContactsBlock(d) : ''}
      </form>
    </div>
    <div class="drawer-foot">
      ${!isNew ? `<button class="btn btn-danger" id="drawerDelete">🗑️ Excluir</button>` : '<span></span>'}
      <button class="btn btn-primary" id="drawerSave" form="escolaForm">💾 Salvar</button>
    </div>`;

  $('#overlay').classList.add('open');
  drawer.classList.add('open');

  $('#drawerClose').onclick = closeDrawer;
  $('#drawerSave').onclick = ev => { ev.preventDefault(); saveForm(isNew ? null : d.id); };
  const del = $('#drawerDelete');
  if (del) del.onclick = () => deleteEscola(d.id);
  $('#escolaForm').onsubmit = ev => { ev.preventDefault(); saveForm(isNew ? null : d.id); };
}

function quickContactsBlock(d) {
  const links = [];
  if (d.decisor_telefone || d.telefone_escola) {
    const p = d.decisor_telefone || d.telefone_escola;
    links.push(`<a class="wpp" href="${waLink(p)}" target="_blank" rel="noopener">${icoWpp()} WhatsApp</a>`);
    links.push(`<a class="tel" href="tel:${onlyDigits(p)}">${icoPhone()} Ligar</a>`);
  }
  if (d.site) {
    const url = d.site.startsWith('http') ? d.site : 'https://' + d.site;
    links.push(`<a href="${esc(url)}" target="_blank" rel="noopener">🌐 Site</a>`);
  }
  if (!links.length) return '';
  return `<div class="detail-block"><h3>Ações rápidas</h3><div class="quick-contacts">${links.join('')}</div></div>`;
}

function saveForm(id) {
  const form = $('#escolaForm');
  if (!form.nome.value.trim()) { toast('Informe o nome da escola'); return; }
  const fd = new FormData(form);
  const obj = Object.fromEntries(fd.entries());
  obj.alunos = obj.alunos ? parseInt(obj.alunos, 10) : null;
  obj.score = obj.score ? parseInt(obj.score, 10) : 0;
  obj.nota_enem = obj.nota_enem ? parseFloat(String(obj.nota_enem).replace(',', '.')) : null;
  obj.ensino_medio = obj.ensino_medio === 'sim';

  let alvo;
  if (id) {
    alvo = escolas.find(x => x.id === id);
    Object.assign(alvo, obj);
    toast('Escola atualizada');
    cloudSave(alvo, 'editou', null);
  } else {
    obj.id = newId();
    escolas.push(obj);
    alvo = obj;
    toast('Escola adicionada');
    cloudSave(alvo, 'adicionou', null);
  }
  saveData();
  closeDrawer();
  renderAll();
}

function deleteEscola(id) {
  const e = escolas.find(x => x.id === id);
  if (!e) return;
  if (!confirm(`Excluir "${e.nome}" da lista? Esta ação não pode ser desfeita.`)) return;
  escolas = escolas.filter(x => x.id !== id);
  saveData();
  if (Cloud.active) {
    Cloud.remove(id).catch(err => toast('Falha ao excluir na nuvem: ' + (err.message || err)));
    Cloud.logAtividade('excluiu', e, null);
  }
  closeDrawer();
  renderAll();
  toast('Escola excluída');
}

function closeDrawer() {
  $('#overlay').classList.remove('open');
  $('#drawer').classList.remove('open');
}

/* ---------- Render geral ---------- */
function renderAll() {
  renderStats();
  populateFilters();
  renderTable();
  if ($('#view-kanban').classList.contains('active')) renderKanban();
}

/* ---------- Export ---------- */
function exportJSON() {
  download('escolas-prospeccao.json', JSON.stringify(escolas, null, 2), 'application/json');
  toast('Backup JSON exportado');
}
function csvCell(v) { return '"' + String(v ?? '').replace(/"/g, '""') + '"'; }
function exportCSV() {
  const head = CAMPOS.join(';');
  const rows = escolas.map(e => CAMPOS.map(c => {
    if (c === 'etapa') return csvCell(etapaById(e.etapa).label);
    if (c === 'ensino_medio') return csvCell(e.ensino_medio ? 'Sim' : 'Não');
    return csvCell(e[c] == null ? '' : e[c]);
  }).join(';'));
  download('escolas-prospeccao.csv', '﻿' + [head, ...rows].join('\r\n'), 'text/csv;charset=utf-8');
  toast('Planilha CSV exportada');
}
function downloadTemplate() {
  const exemplo = {
    nome: 'Colégio Exemplo', cidade: 'Fortaleza', estado: 'CE', bairro: 'Aldeota',
    endereco: 'Av. Exemplo, 100', telefone_escola: '(85) 3000-0000', site: 'https://exemplo.com.br',
    alunos: '1200', ensino_medio: 'Sim', decisor_nome: 'Maria Silva', decisor_cargo: 'Diretora',
    decisor_telefone: '(85) 99999-0000', inovacao: 'Alta', score: '80', nota_enem: '',
    etapa: 'Escola identificada', observacoes: 'Escola de referência no bairro', notas: '',
  };
  const csv = '﻿' + CAMPOS.join(';') + '\r\n' + CAMPOS.map(c => csvCell(exemplo[c])).join(';');
  download('modelo-escolas.csv', csv, 'text/csv;charset=utf-8');
  toast('Modelo baixado — preencha e importe');
}
function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- Import ---------- */
/* Detecta o formato do arquivo e chama o importador certo */
function importFile(file) {
  const nome = file.name.toLowerCase();
  if (nome.endsWith('.json')) return importJSON(file);
  if (nome.endsWith('.csv')) return importCSV(file);
  // Sem extensão clara: fareja o conteúdo
  const rd = new FileReader();
  rd.onload = () => {
    const t = String(rd.result).trim();
    (t.startsWith('[') || t.startsWith('{')) ? importJSON(file) : importCSV(file);
  };
  rd.readAsText(file);
}
function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('o arquivo não é uma lista de escolas');
      const records = data.map(e => ({ etapa: ETAPA_INICIAL, notas: '', ...e }));
      showImportDialog(records, { recognized: ['(backup completo)'], ignored: [], format: 'backup JSON' });
    } catch (e) { toast('Arquivo inválido: ' + e.message); }
  };
  reader.readAsText(file);
}

/* Parser de CSV robusto (aspas, campos com quebra de linha, delimitador ; ou ,) */
function parseCSV(text) {
  text = String(text).replace(/^﻿/, '');
  const nl = text.indexOf('\n');
  const first = nl === -1 ? text : text.slice(0, nl);
  const delim = (first.split(';').length - 1) >= (first.split(',').length - 1) ? ';' : ',';
  const rows = [];
  let field = '', row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') { inQuotes = true; }
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\r') { /* ignora */ }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function toNum(v) { const n = parseInt(String(v).replace(/\D/g, ''), 10); return isNaN(n) ? null : n; }
function toBool(v) { return ['sim', 's', 'true', '1', 'x', 'yes', 'possui', 'tem'].includes(normHeader(v)); }
function toEnem(v) {
  let s = String(v).trim(); if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s); return isNaN(n) ? null : n;
}
function importCSV(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result).filter(r => r.some(c => c && c.trim() !== ''));
    if (rows.length < 2) { toast('Planilha vazia ou sem linhas de dados'); return; }
    const headers = rows[0].map(normHeader);
    const mapped = headers.map(h => HEADER_LOOKUP[h] || null);
    if (!mapped.includes('nome')) {
      toast('Não encontrei uma coluna de nome da escola. Baixe o modelo para ver o formato.');
      return;
    }
    const recognized = [...new Set(mapped.filter(Boolean))];
    const ignored = rows[0].filter((h, i) => !mapped[i] && h.trim() !== '');
    const records = [];
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r];
      const rec = {};
      mapped.forEach((campo, i) => {
        if (campo && cells[i] != null && cells[i].trim() !== '') rec[campo] = cells[i].trim();
      });
      if (!rec.nome) continue;
      if ('alunos' in rec) rec.alunos = toNum(rec.alunos);
      if ('ensino_medio' in rec) rec.ensino_medio = toBool(rec.ensino_medio);
      if ('score' in rec) rec.score = toNum(rec.score) || 0;
      if ('nota_enem' in rec) rec.nota_enem = toEnem(rec.nota_enem);
      rec.etapa = rec.etapa ? (ETAPA_LOOKUP[normHeader(rec.etapa)] || ETAPA_INICIAL) : ETAPA_INICIAL;
      if (!('notas' in rec)) rec.notas = '';
      records.push(rec);
    }
    if (!records.length) { toast('Nenhuma escola válida encontrada na planilha'); return; }
    showImportDialog(records, { recognized, ignored, format: 'planilha CSV' });
  };
  reader.readAsText(file, 'utf-8');
}

/* Diálogo de confirmação da importação (adicionar x substituir) */
function showImportDialog(records, meta) {
  const cols = meta.recognized.map(f => CAMPO_LABEL[f] || f).join(', ');
  const modal = $('#modal');
  modal.innerHTML = `
    <h2>Importar ${esc(meta.format)}</h2>
    <p class="modal-sub"><strong>${records.length}</strong> escola(s) encontrada(s) no arquivo.</p>
    <div class="import-info">
      <div><span class="k">Colunas reconhecidas:</span> ${esc(cols)}</div>
      ${meta.ignored.length ? `<div class="warn"><span class="k">Colunas ignoradas:</span> ${esc(meta.ignored.join(', '))}</div>` : ''}
    </div>
    <p class="modal-sub">Como você quer importar?</p>
    <div class="modal-actions">
      <button class="btn btn-primary" id="impAdd">➕ Adicionar à lista atual</button>
      <button class="btn btn-outline" id="impReplace">♻️ Substituir toda a lista</button>
      <button class="btn btn-outline" id="impCancel">Cancelar</button>
    </div>`;
  openModal();
  $('#impCancel').onclick = closeModal;
  $('#impReplace').onclick = () => {
    if (!confirm(`Isso vai APAGAR as ${escolas.length} escolas atuais e substituir pelas ${records.length} da planilha. Continuar?`)) return;
    escolas = records.map((r, i) => ({ id: i + 1, ensino_medio: true, notas: '', ...r }));
    saveData(); closeModal(); renderAll();
    if (Cloud.active) {
      Cloud.replaceAll(escolas).catch(err => toast('Falha ao sincronizar: ' + (err.message || err)));
      Cloud.logAtividade('importou', null, `Substituiu a lista por ${escolas.length} escolas`);
    }
    toast(`${escolas.length} escolas importadas (lista substituída)`);
  };
  $('#impAdd').onclick = () => {
    const existentes = new Set(escolas.map(e => normHeader(e.nome)));
    const novas = [];
    let add = 0, skip = 0;
    records.forEach(r => {
      const chave = normHeader(r.nome);
      if (existentes.has(chave)) { skip++; return; }
      const nova = { id: newId(), ensino_medio: true, notas: '', ...r };
      escolas.push(nova); novas.push(nova);
      existentes.add(chave); add++;
    });
    saveData(); closeModal(); renderAll();
    if (Cloud.active && novas.length) {
      Cloud.insertMany(novas).catch(err => toast('Falha ao sincronizar: ' + (err.message || err)));
      Cloud.logAtividade('importou', null, `Adicionou ${novas.length} escolas`);
    }
    toast(`${add} escola(s) adicionada(s)${skip ? ` · ${skip} já existiam (ignoradas)` : ''}`);
  };
}
function openModal() { $('#overlay').classList.add('open'); $('#modal').classList.add('open'); }
function closeModal() { $('#overlay').classList.remove('open'); $('#modal').classList.remove('open'); }
function resetData() {
  if (!confirm('Restaurar os dados originais? Todas as suas edições, notas e movimentações no funil serão perdidas.')) return;
  escolas = JSON.parse(JSON.stringify(SEED_ESCOLAS));
  saveData();
  if (Cloud.active) {
    Cloud.replaceAll(escolas).catch(err => toast('Falha ao sincronizar: ' + (err.message || err)));
    Cloud.logAtividade('importou', null, 'Restaurou os dados originais');
  }
  renderAll();
  toast('Dados originais restaurados');
}

/* ---------- Tema ---------- */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const next = cur ? (cur === 'dark' ? 'light' : 'dark') : (prefersDark ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
}

/* ---------- Ícones (SVG inline) ---------- */
function icoPhone() { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`; }
function icoWpp() { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4zM12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>`; }
function icoEdit() { return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>`; }

/* ---------- Eventos ---------- */
function bindEvents() {
  // Tabs
  $$('nav.tabs button').forEach(btn => btn.addEventListener('click', () => {
    $$('nav.tabs button').forEach(b => b.classList.remove('active'));
    $$('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    $('#view-' + btn.dataset.view).classList.add('active');
    if (btn.dataset.view === 'kanban') renderKanban();
  }));

  // Filtros
  const refilter = () => {
    populateFilters();               // cidades acompanham o estado selecionado
    renderTable();
    if ($('#view-kanban').classList.contains('active')) renderKanban();
  };
  ['#searchInput', '#filterEstado', '#filterCidade', '#filterMedio', '#filterEtapa', '#filterInovacao']
    .forEach(sel => $(sel).addEventListener('input', refilter));
  $('#prioCE').addEventListener('change', () => {
    renderTable();
    if ($('#view-kanban').classList.contains('active')) renderKanban();
  });

  // Ordenação
  $$('thead th[data-sort]').forEach(th => th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (sortKey === key) sortDir *= -1;
    else { sortKey = key; sortDir = (key === 'nome' || key === 'cidade') ? 1 : -1; }
    renderTable();
  }));

  // Delegação: abrir drawer + mudar etapa via select da tabela
  document.body.addEventListener('click', ev => {
    const opener = ev.target.closest('[data-open]');
    if (opener) { openDrawer(+opener.dataset.open); }
  });
  $('#tableBody').addEventListener('change', ev => {
    const sel = ev.target.closest('.etapa-select');
    if (sel) {
      const e = escolas.find(x => x.id === +sel.dataset.id);
      if (e) {
        const prev = e.etapa;
        e.etapa = sel.value;
        sel.style.backgroundColor = etapaById(e.etapa).hex;
        saveData();
        renderStats();
        cloudSave(e, 'moveu', `${etapaById(prev).label} → ${etapaById(e.etapa).label}`);
        toast(`${e.nome} → ${etapaById(e.etapa).label}`);
      }
    }
  });

  // Header
  $('#btnNova').onclick = () => openDrawer(null);
  $('#overlay').onclick = () => { closeDrawer(); closeModal(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); closeModal(); closeMenu(); } });

  // Menu de dados
  $('#btnMenu').onclick = ev => { ev.stopPropagation(); $('#dataMenu').classList.toggle('open'); };
  document.body.addEventListener('click', ev => {
    if (!ev.target.closest('.menu-wrap')) closeMenu();
  });
  $('#btnImport').onclick = () => { $('#fileInput').click(); closeMenu(); };
  $('#btnTemplate').onclick = () => { downloadTemplate(); closeMenu(); };
  $('#btnCSV').onclick = () => { exportCSV(); closeMenu(); };
  $('#btnExport').onclick = () => { exportJSON(); closeMenu(); };
  $('#btnReset').onclick = () => { resetData(); closeMenu(); };
  $('#btnTheme').onclick = () => { toggleTheme(); closeMenu(); };
  $('#fileInput').onchange = ev => { if (ev.target.files[0]) importFile(ev.target.files[0]); ev.target.value = ''; };
}
function closeMenu() { const m = $('#dataMenu'); if (m) m.classList.remove('open'); }

/* ---------- Modo nuvem (Supabase) ---------- */
async function enterCloud() {
  hideLogin();
  showCloudChrome();
  try {
    let rows = await Cloud.fetchAll();
    if (!rows.length) {
      // Primeira vez: semeia o banco com as escolas da pesquisa
      const seed = JSON.parse(JSON.stringify(SEED_ESCOLAS));
      await Cloud.replaceAll(seed);
      await Cloud.logAtividade('importou', null, `Base inicial com ${seed.length} escolas`);
      rows = await Cloud.fetchAll();
    }
    escolas = rows;
    renderAll();
    // Tempo real: qualquer mudança de qualquer aparelho recarrega a lista
    Cloud.subscribe(async () => {
      try { escolas = await Cloud.fetchAll(); renderAll(); } catch (e) { console.warn(e); }
    });
  } catch (e) {
    toast('Erro ao carregar dados da nuvem: ' + (e.message || e));
  }
}
function showLogin() { $('#loginScreen').classList.add('show'); }
function hideLogin() { $('#loginScreen').classList.remove('show'); }
function showCloudChrome() {
  $('#userChip').style.display = '';
  $('#userEmail').textContent = Cloud.email();
  $('#btnHistorico').style.display = '';
}
function bindCloudEvents() {
  $('#loginForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    const email = $('#loginEmail').value.trim();
    const pass = $('#loginPass').value;
    const errEl = $('#loginError');
    const btn = $('#loginBtn');
    errEl.textContent = '';
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      await Cloud.signIn(email, pass);
      await enterCloud();
    } catch (e) {
      errEl.textContent = traduzErroLogin(e);
    } finally {
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });
  $('#btnLogout').addEventListener('click', async () => {
    try { await Cloud.signOut(); } catch (e) {}
    location.reload();
  });
  $('#btnHistorico').addEventListener('click', abrirHistorico);
}
function traduzErroLogin(e) {
  const m = ((e && e.message) || '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid_credentials')) return 'Email ou senha incorretos.';
  if (m.includes('not confirmed')) return 'Este email ainda não foi confirmado no Supabase.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão com o servidor. Tente novamente.';
  return 'Não foi possível entrar: ' + ((e && e.message) || e);
}
async function abrirHistorico() {
  const modal = $('#modal');
  modal.innerHTML = `<h2>🕑 Histórico de atividades</h2><p class="modal-sub">Carregando…</p>`;
  openModal();
  try {
    const ats = await Cloud.fetchAtividades(120);
    const icones = { adicionou: '➕', editou: '✏️', moveu: '🔀', excluiu: '🗑️', importou: '📥' };
    const itens = ats.map(a => {
      const quando = a.criado_em ? new Date(a.criado_em).toLocaleString('pt-BR') : '';
      const ico = icones[a.acao] || '•';
      return `<div class="hist-item">
        <div class="hist-ico">${ico}</div>
        <div class="hist-body">
          <div class="hist-top"><strong>${esc(a.escola_nome || '—')}</strong> <span class="hist-acao">${esc(a.acao || '')}</span></div>
          ${a.detalhe ? `<div class="hist-det">${esc(a.detalhe)}</div>` : ''}
          <div class="hist-meta">${esc(a.usuario || '')}${a.usuario ? ' · ' : ''}${esc(quando)}</div>
        </div>
      </div>`;
    }).join('');
    modal.innerHTML = `<h2>🕑 Histórico de atividades</h2>
      <div class="hist-list">${itens || '<p class="modal-sub">Sem atividades ainda.</p>'}</div>
      <div class="modal-actions"><button class="btn btn-outline" id="histClose">Fechar</button></div>`;
    $('#histClose').onclick = closeModal;
  } catch (e) {
    modal.innerHTML = `<h2>🕑 Histórico</h2><p class="modal-sub">Erro ao carregar: ${esc((e && e.message) || e)}</p>
      <div class="modal-actions"><button class="btn btn-outline" id="histClose">Fechar</button></div>`;
    $('#histClose').onclick = closeModal;
  }
}

/* ---------- Boot ---------- */
async function init() {
  initTheme();
  bindEvents();
  if (await Cloud.init()) {
    bindCloudEvents();
    if (Cloud.user) { await enterCloud(); }
    else { showLogin(); }
  } else {
    // Modo local (sem nuvem configurada): comportamento original
    loadData();
    renderAll();
  }
}
document.addEventListener('DOMContentLoaded', init);
