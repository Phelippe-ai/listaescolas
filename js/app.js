/* ==========================================================================
   Fala Tio — Plataforma de Prospecção de Escolas
   Lógica da aplicação (vanilla JS, sem dependências, persiste em localStorage)
   ========================================================================== */

'use strict';

const STORAGE_KEY = 'falatio_escolas_v1';
const THEME_KEY = 'falatio_theme';

/* Definição das etapas do funil de prospecção */
const ETAPAS = [
  { id: 'novo',        label: 'Contato pendente',        color: 'var(--st-novo)',        hex: '#94A3B8' },
  { id: 'contato',     label: 'Tentativa de contato',    color: 'var(--st-contato)',     hex: '#3B82F6' },
  { id: 'decisor',     label: 'Falei com o decisor',     color: 'var(--st-decisor)',     hex: '#8B5CF6' },
  { id: 'reuniao',     label: 'Reunião agendada',        color: 'var(--st-reuniao)',     hex: '#F59E0B' },
  { id: 'coordenacao', label: 'Reunião c/ coordenação',  color: 'var(--st-coordenacao)', hex: '#14B8A6' },
  { id: 'fechado',     label: 'Fechado ✓',               color: 'var(--st-fechado)',     hex: '#10B981' },
  { id: 'perdido',     label: 'Sem interesse',           color: 'var(--st-perdido)',     hex: '#EF4444' },
];
const etapaById = id => ETAPAS.find(e => e.id === id) || ETAPAS[0];

/* ---------- Estado ---------- */
let escolas = [];
let sortKey = 'score';
let sortDir = -1; // -1 desc, 1 asc

/* ---------- Persistência ---------- */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { escolas = JSON.parse(raw); return; }
  } catch (e) { console.warn('Falha ao ler dados salvos', e); }
  escolas = JSON.parse(JSON.stringify(SEED_ESCOLAS));
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

/* ---------- Filtros ativos ---------- */
function activeFilters() {
  return {
    q: $('#searchInput').value.trim().toLowerCase(),
    cidade: $('#filterCidade').value,
    etapa: $('#filterEtapa').value,
    inovacao: $('#filterInovacao').value,
  };
}
function applyFilters(list) {
  const f = activeFilters();
  return list.filter(e => {
    if (f.cidade && e.cidade !== f.cidade) return false;
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
  const ativos = escolas.filter(e => !['novo', 'perdido', 'fechado'].includes(e.etapa)).length;
  const reunioes = escolas.filter(e => ['reuniao', 'coordenacao'].includes(e.etapa)).length;
  const fechados = escolas.filter(e => e.etapa === 'fechado').length;
  const stats = [
    { num: total, lbl: 'Escolas' },
    { num: ativos, lbl: 'Em negociação' },
    { num: reunioes, lbl: 'Reuniões' },
    { num: fechados, lbl: 'Fechados' },
  ];
  $('#stats').innerHTML = stats.map(s =>
    `<div class="stat"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>`).join('');
}

/* ---------- Popular selects de filtro ---------- */
function populateFilters() {
  const cidades = [...new Set(escolas.map(e => e.cidade).filter(Boolean))].sort();
  const inov = [...new Set(escolas.map(e => e.inovacao).filter(Boolean))];
  const cSel = $('#filterCidade'), eSel = $('#filterEtapa'), iSel = $('#filterInovacao');
  const keepC = cSel.value, keepE = eSel.value, keepI = iSel.value;
  cSel.innerHTML = '<option value="">Todas as cidades</option>' +
    cidades.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  eSel.innerHTML = '<option value="">Todas as etapas</option>' +
    ETAPAS.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join('');
  iSel.innerHTML = '<option value="">Toda inovação</option>' +
    inov.map(i => `<option value="${esc(i)}">${esc(i)}</option>`).join('');
  cSel.value = keepC; eSel.value = keepE; iSel.value = keepI;
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
  filtered.sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
    va = va ?? ''; vb = vb ?? '';
    if (va < vb) return -1 * sortDir;
    if (va > vb) return 1 * sortDir;
    return 0;
  });

  const body = $('#tableBody');
  if (!filtered.length) {
    body.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <div class="big">🔍</div>Nenhuma escola encontrada com esses filtros.</div></td></tr>`;
    updateSortHeaders();
    return;
  }

  body.innerHTML = filtered.map(e => {
    const local = [e.bairro, e.cidade].filter(Boolean).join(' · ') || esc(e.cidade) || '—';
    return `<tr data-id="${e.id}">
      <td>
        <div class="school-name" data-open="${e.id}">${esc(e.nome)}</div>
        ${e.observacoes ? `<div class="school-sub">${esc(e.observacoes.slice(0, 60))}${e.observacoes.length > 60 ? '…' : ''}</div>` : ''}
      </td>
      <td><span class="muted">${esc(local)}</span></td>
      <td>
        ${e.decisor_nome ? `<div class="decisor-name">${esc(e.decisor_nome)}</div>
          <div class="decisor-cargo">${esc(e.decisor_cargo || '')}</div>` : '<span class="muted">—</span>'}
      </td>
      <td>${contactCell(e)}</td>
      <td>${e.alunos ? Number(e.alunos).toLocaleString('pt-BR') : '<span class="muted">—</span>'}</td>
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
        e.etapa = novaEtapa;
        saveData();
        renderAll();
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
  const d = e || { etapa: 'novo', cidade: 'Fortaleza', estado: 'CE', ensino_medio: true, score: 60 };

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
            <div class="field"><label>Site</label><input name="site" value="${esc(d.site || '')}" /></div>
          </div>
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

  if (id) {
    const e = escolas.find(x => x.id === id);
    Object.assign(e, obj);
    toast('Escola atualizada');
  } else {
    obj.id = nextId();
    obj.ensino_medio = true;
    escolas.push(obj);
    toast('Escola adicionada');
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

/* ---------- Import / Export ---------- */
function exportJSON() {
  download('escolas-prospeccao.json', JSON.stringify(escolas, null, 2), 'application/json');
  toast('Dados exportados');
}
function exportCSV() {
  const cols = ['nome', 'cidade', 'estado', 'bairro', 'endereco', 'telefone_escola',
    'decisor_nome', 'decisor_cargo', 'decisor_telefone', 'alunos', 'score', 'etapa', 'site', 'notas'];
  const head = cols.join(';');
  const rows = escolas.map(e => cols.map(c => {
    let v = e[c] == null ? '' : String(e[c]);
    if (c === 'etapa') v = etapaById(e.etapa).label;
    return '"' + v.replace(/"/g, '""') + '"';
  }).join(';'));
  download('escolas-prospeccao.csv', '﻿' + [head, ...rows].join('\n'), 'text/csv');
  toast('CSV exportado');
}
function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      escolas = data.map((e, i) => ({ id: e.id || i + 1, etapa: 'novo', notas: '', ...e }));
      saveData();
      renderAll();
      toast(`${escolas.length} escolas importadas`);
    } catch (e) { toast('Arquivo inválido: ' + e.message); }
  };
  reader.readAsText(file);
}
function resetData() {
  if (!confirm('Restaurar os dados originais? Todas as suas edições, notas e movimentações no funil serão perdidas.')) return;
  escolas = JSON.parse(JSON.stringify(SEED_ESCOLAS));
  saveData();
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
  ['#searchInput', '#filterCidade', '#filterEtapa', '#filterInovacao'].forEach(sel =>
    $(sel).addEventListener('input', () => {
      renderTable();
      if ($('#view-kanban').classList.contains('active')) renderKanban();
    }));

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
        e.etapa = sel.value;
        sel.style.backgroundColor = etapaById(e.etapa).hex;
        saveData();
        renderStats();
        toast(`${e.nome} → ${etapaById(e.etapa).label}`);
      }
    }
  });

  // Header
  $('#btnNova').onclick = () => openDrawer(null);
  $('#overlay').onclick = closeDrawer;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); closeMenu(); } });

  // Menu de dados
  $('#btnMenu').onclick = ev => { ev.stopPropagation(); $('#dataMenu').classList.toggle('open'); };
  document.body.addEventListener('click', ev => {
    if (!ev.target.closest('.menu-wrap')) closeMenu();
  });
  $('#btnExport').onclick = () => { exportJSON(); closeMenu(); };
  $('#btnCSV').onclick = () => { exportCSV(); closeMenu(); };
  $('#btnImport').onclick = () => { $('#fileInput').click(); closeMenu(); };
  $('#btnReset').onclick = () => { resetData(); closeMenu(); };
  $('#btnTheme').onclick = () => { toggleTheme(); closeMenu(); };
  $('#fileInput').onchange = ev => { if (ev.target.files[0]) importJSON(ev.target.files[0]); ev.target.value = ''; };
}
function closeMenu() { const m = $('#dataMenu'); if (m) m.classList.remove('open'); }

/* ---------- Boot ---------- */
function init() {
  initTheme();
  loadData();
  bindEvents();
  renderAll();
}
document.addEventListener('DOMContentLoaded', init);
