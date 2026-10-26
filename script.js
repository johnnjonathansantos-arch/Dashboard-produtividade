/* =========================================================
   Painel SAC — lógica de dados e renderização reativa
   Depende de: data.js (jiraData, multiData)
   Gráficos em <canvas> puro (sem bibliotecas externas).
   ========================================================= */

/* -- Guard: garante que os dados do data.js foram carregados -- */
if (typeof jiraData === 'undefined' || typeof multiData === 'undefined') {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;color:#C23A5D;flex-direction:column;gap:12px;">
      <strong style="font-size:1.2rem;">Erro ao carregar os dados</strong>
      <span style="color:#64708C;font-size:.9rem;">O arquivo data.js não foi encontrado ou contém um erro de sintaxe.</span>
    </div>`;
  throw new Error('data.js não carregado — jiraData ou multiData indefinidos');
}

const COLORS = {
  amber:     '#FFC400',
  amberText: '#8A6100',
  teal:      '#0E8F82',
  rose:      '#C23A5D',
  brand:     '#123877',
  blue:      '#2F5AA8',
  ink:       '#1B2A4A',
  mute:      '#64708C',
  grid:      'rgba(18,56,119,.10)'
};

const FONT = 'Inter, sans-serif';

/* ==========================================================
   PERSISTÊNCIA VIA localStorage
   Os dados importados são salvos no localStorage após cada
   importação bem-sucedida e restaurados automaticamente ao
   carregar a página. Os dados base do data.js nunca são
   alterados. Chaves de armazenamento:
     sac_importedJira  → array JSON de registros Jira
     sac_importedMulti → array JSON de registros Multi
   ========================================================== */

const LS_KEY_JIRA  = 'sac_importedJira';
const LS_KEY_MULTI = 'sac_importedMulti';

/** Carrega os dados importados salvos no localStorage (sem sobrescrever os dados base). */
function carregarDadosImportados() {
  try {
    const jiraJson  = localStorage.getItem(LS_KEY_JIRA);
    const multiJson = localStorage.getItem(LS_KEY_MULTI);
    if (jiraJson)  _importedJira  = JSON.parse(jiraJson);
    if (multiJson) _importedMulti = JSON.parse(multiJson);
  } catch (e) {
    console.warn('[localStorage] Falha ao restaurar dados importados:', e);
    _importedJira  = [];
    _importedMulti = [];
  }
}

/** Persiste os arrays _importedJira e _importedMulti no localStorage. */
function salvarDadosImportados() {
  try {
    localStorage.setItem(LS_KEY_JIRA,  JSON.stringify(_importedJira));
    localStorage.setItem(LS_KEY_MULTI, JSON.stringify(_importedMulti));
  } catch (e) {
    console.warn('[localStorage] Falha ao salvar dados importados:', e);
  }
}

let _importedJira  = [];  // registros importados do Jira (memória + localStorage)
let _importedMulti = [];  // registros importados do Multi (memória + localStorage)

// Restaura imediatamente ao carregar o script
carregarDadosImportados();

/** Retorna o array Jira combinado (base + importações da sessão). */
function getAllJira()  { return [...jiraData,  ..._importedJira]; }
/** Retorna o array Multi combinado (base + importações da sessão). */
function getAllMulti() { return [...multiData, ..._importedMulti]; }

/* ==========================================================
   HELPERS DE DATA
   ========================================================== */

function parseBrDate(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, d, mo, y, h, mi] = m;
  return new Date(+y, +mo - 1, +d, +h, +mi);
}

function formatMinutesAsDuration(min) {
  if (min === null || isNaN(min)) return '—';
  const abs   = Math.abs(min);
  const days  = Math.floor(abs / 1440);
  const hours = Math.floor((abs % 1440) / 60);
  const mins  = Math.round(abs % 60);
  let out = '';
  if (days > 0) out += `${days}d `;
  out += `${hours}h ${mins}min`;
  return out;
}

function calcTempoAtendimentoMin(inicio, fim) {
  const dtI = parseBrDate(inicio);
  const dtF = parseBrDate(fim);
  if (!dtI || !dtF) return null;
  const diff = Math.round((dtF - dtI) / 60000);
  return diff >= 0 ? diff : null;
}

function countBy(arr, keyFn) {
  const map = {};
  arr.forEach(item => {
    const k = keyFn(item);
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

function sortEntriesDesc(obj) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

/* ==========================================================
   HELPERS DE CANVAS
   ========================================================== */

function isMobile() {
  return window.innerWidth <= 640;
}

function setupCanvas(canvas, cssHeight) {
  const dpr    = window.devicePixelRatio || 1;
  const parent = canvas.parentElement;
  const ps     = getComputedStyle(parent);
  const padX   = (parseFloat(ps.paddingLeft) || 0) + (parseFloat(ps.paddingRight) || 0);
  const cssWidth = parent.clientWidth - padX;
  canvas.style.width  = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width  = Math.max(1, Math.round(cssWidth * dpr));
  canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  return { ctx, width: cssWidth, height: cssHeight };
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) out = out.slice(0, -1);
  return out + '…';
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(h) / 2, Math.abs(w) / 2);
  ctx.beginPath();
  if (h >= 0) {
    ctx.moveTo(x, y + rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.arcTo(x, y + h, x, y, rr);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.closePath();
}

/* ==========================================================
   GRÁFICOS
   ========================================================== */

function drawDonutChart(canvasId, segments) {
  const canvas    = document.getElementById(canvasId);
  if (!canvas) return;
  const cssHeight = isMobile() ? 150 : 190;
  const { ctx, width, height } = setupCanvas(canvas, cssHeight);
  const total     = segments.reduce((a, s) => a + s.value, 0);

  if (total === 0) {
    ctx.fillStyle = COLORS.mute;
    ctx.font      = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sem dados para o período', width / 2, height / 2);
    return;
  }

  const radius    = Math.min(height, width * 0.42) / 2 - 4;
  const cx        = radius + 8;
  const cy        = height / 2;
  const lineWidth = radius * 0.42;
  let startAngle  = -Math.PI / 2;

  segments.forEach(seg => {
    const angle = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - lineWidth / 2, startAngle, startAngle + angle);
    ctx.strokeStyle = seg.color;
    ctx.lineWidth   = lineWidth;
    ctx.lineCap     = segments.length > 1 ? 'butt' : 'round';
    ctx.stroke();
    startAngle += angle;
  });

  ctx.fillStyle = COLORS.ink;
  ctx.font      = `600 20px ${FONT.replace('Inter', 'Space Grotesk')}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), cx, cy - 6);
  ctx.fillStyle = COLORS.mute;
  ctx.font      = `10px ${FONT}`;
  ctx.fillText('total', cx, cy + 12);

  const legendX = cx + radius + 22;
  const rowH    = Math.min(22, (height - 8) / segments.length);
  let y         = (height - rowH * segments.length) / 2 + rowH / 2;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';

  segments.forEach(seg => {
    ctx.fillStyle = seg.color;
    ctx.beginPath();
    ctx.arc(legendX, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.ink;
    ctx.font      = `500 11.5px ${FONT}`;
    const pct     = ((seg.value / total) * 100).toFixed(0);
    const label   = truncateText(ctx, seg.label, width - legendX - 46);
    ctx.fillText(label, legendX + 12, y);
    ctx.fillStyle = COLORS.mute;
    ctx.font      = `11px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${seg.value} · ${pct}%`, width - 2, y);
    ctx.textAlign = 'left';
    y += rowH;
  });
}

function drawHBarChart(canvasId, items, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const scrollContainer = canvas.parentElement;
  const panel           = scrollContainer ? scrollContainer.parentElement : canvas.parentElement;

  if (items.length === 0) {
    const dpr      = window.devicePixelRatio || 1;
    const ps       = getComputedStyle(panel);
    const padX     = (parseFloat(ps.paddingLeft) || 0) + (parseFloat(ps.paddingRight) || 0);
    const cssWidth = panel.clientWidth - padX;
    canvas.style.width  = cssWidth + 'px';
    canvas.style.height = '40px';
    canvas.width  = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(40 * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, 40);
    ctx.fillStyle = COLORS.mute;
    ctx.font      = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sem dados para o período', cssWidth / 2, 20);
    return;
  }

  const rowH      = isMobile() ? 22 : 26;
  const cssHeight = items.length * rowH + 10;
  const dpr       = window.devicePixelRatio || 1;
  const ps        = getComputedStyle(panel);
  const padX      = (parseFloat(ps.paddingLeft) || 0) + (parseFloat(ps.paddingRight) || 0);
  const cssWidth  = panel.clientWidth - padX;

  canvas.style.width  = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width  = Math.max(1, Math.round(cssWidth * dpr));
  canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const maxVal   = Math.max(...items.map(i => i.value));
  const labelW   = Math.min(cssWidth * 0.42, 190);
  const barAreaW = cssWidth - labelW - 46;
  const barX     = labelW;

  ctx.textBaseline = 'middle';
  items.forEach((item, i) => {
    const y    = i * rowH + rowH / 2 + 4;
    const barW = Math.max(3, (item.value / maxVal) * barAreaW);
    ctx.fillStyle = COLORS.ink;
    ctx.font      = `12px ${FONT}`;
    ctx.textAlign = 'left';
    const label   = truncateText(ctx, item.label, labelW - 10);
    ctx.fillText(label, 0, y);
    roundRect(ctx, barX, y - 7, barW, 14, 5);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = COLORS.mute;
    ctx.font      = `11px ${FONT}`;
    ctx.fillText(String(item.value), barX + barW + 8, y);
  });
}

function drawVBarChart(canvasId, items) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const cssHeight = isMobile() ? 150 : 190;
  const { ctx, width, height } = setupCanvas(canvas, cssHeight);

  if (items.length === 0) {
    ctx.fillStyle = COLORS.mute;
    ctx.font      = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sem dados para o período', width / 2, height / 2);
    return;
  }

  const padBottom = 22, padTop = 22;
  const chartH    = height - padBottom - padTop;
  const maxVal    = Math.max(...items.map(i => i.value));
  const gap       = 18;
  const barW      = Math.min(46, (width - gap * (items.length + 1)) / items.length);
  const totalBarsW = barW * items.length + gap * (items.length - 1);
  const startX    = (width - totalBarsW) / 2;

  items.forEach((item, i) => {
    const x    = startX + i * (barW + gap);
    const barH = (item.value / maxVal) * chartH;
    const y    = padTop + (chartH - barH);
    roundRect(ctx, x, y, barW, barH, 6);
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.fillStyle    = COLORS.ink;
    ctx.font         = `600 12px ${FONT}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(String(item.value), x + barW / 2, y - 5);
    ctx.fillStyle    = COLORS.mute;
    ctx.font         = `11px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.fillText(item.label, x + barW / 2, padTop + chartH + 6);
  });
}

/* ==========================================================
   ANIMAÇÃO DE CONTADORES
   ========================================================== */

function animateCounter(elementId, targetValue, duration = 800) {
  const element = document.getElementById(elementId);
  if (!element) return;
  const startTime     = performance.now();
  const isFloat       = typeof targetValue === 'string' && targetValue.includes('.');
  const numericTarget = parseFloat(targetValue);

  function animate(currentTime) {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease     = 1 - (1 - progress) * (1 - progress);
    element.textContent = isFloat
      ? (numericTarget * ease).toFixed(1)
      : Math.floor(numericTarget * ease);
    if (progress < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

function animateValueUpdate(elementId, newValue) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = newValue;
    return;
  }
  el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  el.style.opacity    = '0';
  el.style.transform  = 'translateY(4px)';
  setTimeout(() => {
    el.textContent      = newValue;
    el.style.opacity    = '1';
    el.style.transform  = 'translateY(0)';
  }, 200);
}

function animateTableUpdate(tableId, updateFn) {
  const wrap = document.querySelector(`#${tableId}`)?.closest('.table-scroll');
  if (!wrap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    updateFn();
    return;
  }
  wrap.style.opacity = '0';
  setTimeout(() => {
    updateFn();
    wrap.style.opacity = '1';
  }, 180);
}

/* ==========================================================
   ESTADO DOS FILTROS DAS TABELAS
   ========================================================== */

let jiraClienteFiltroValue  = 'all';
let jiraTipoFiltroValue     = 'all';
let jiraPrioFiltroValue     = 'all';
let multiClienteFiltroValue = 'all';
let multiMotivoFiltroValue  = 'all';
let multiNotaFiltroValue    = 'all';

/* ==========================================================
   FILTRO DE ORIGEM (Jira / Multi / Todos)
   ========================================================== */

let origemFiltroValue = 'todos';

function filtrarPorOrigem(jira, multi) {
  if (origemFiltroValue === 'jira')  return { jira, multi: [] };
  if (origemFiltroValue === 'multi') return { jira: [], multi };
  return { jira, multi };
}

function atualizarVisibilidadeOrigem() {
  const grid   = document.querySelector('.grid');
  const kpiRow = document.querySelector('.kpi-row');
  ['origem-jira', 'origem-multi'].forEach(cls => {
    grid.classList.remove(cls);
    kpiRow.classList.remove(cls);
  });
  if (origemFiltroValue === 'jira') {
    grid.classList.add('origem-jira');
    kpiRow.classList.add('origem-jira');
  } else if (origemFiltroValue === 'multi') {
    grid.classList.add('origem-multi');
    kpiRow.classList.add('origem-multi');
  }
}

/* ==========================================================
   FUNÇÃO CENTRAL: renderDashboard
   ========================================================== */

function renderDashboard(jira, multi) {

  /* ---- KPIs ----
     Regras de origem:
     • kpiJiraSlaMedio  → campo sla (minutos) dos registros Jira; nunca usa Multi
     • statTempoMedio   → diferença data/dataFinalizacao dos registros Multi; nunca usa Jira
     • kpiMultiNota     → campo avaliacao dos registros Multi exclusivamente; nunca usa Jira
     Todos os cálculos ignoram valores null/undefined/inválidos (não convertem para zero).
  ----------------------------------------------------------------- */

  const jiraConcluidos = jira.filter(t => t.status === 'Concluido');

  /* --- SLA Jira: média do campo sla (minutos) — apenas registros com sla numérico >= 0 --- */
  const jiraSlaValidos  = jira.filter(t => typeof t.sla === 'number' && t.sla >= 0);
  const jiraSlaMedioMin = jiraSlaValidos.length
    ? jiraSlaValidos.reduce((a, t) => a + t.sla, 0) / jiraSlaValidos.length
    : null;

  /* --- Tempo médio Multi: diferença dataFinalizacao − data (minutos) — apenas Multi --- */
  const multiTemposValidos = multi
    .map(m => calcTempoAtendimentoMin(m.data, m.dataFinalizacao))
    .filter(v => v !== null && v >= 0);
  const tempoMedioMultiMin = multiTemposValidos.length
    ? multiTemposValidos.reduce((a, b) => a + b, 0) / multiTemposValidos.length
    : null;

  /* --- Nota média: exclusivamente do Multi; ignora completamente o array jira --- */
  const multiComNota = multi.filter(
    m => m.avaliacao !== null && m.avaliacao !== undefined && !isNaN(m.avaliacao)
  );
  const notaMedia = multiComNota.length
    ? multiComNota.reduce((a, b) => a + b.avaliacao, 0) / multiComNota.length
    : null;  // null → exibe '—', nunca um valor fictício

  /* --- Atualiza elementos com animação --- */
  // kpiMultiNota: nota média Multi (nunca exibe valor quando não há notas válidas)
  animateValueUpdate('kpiMultiNota', notaMedia !== null ? notaMedia.toFixed(1) : '—');

  // kpiJiraSlaMedio: SLA médio Jira (oculto pelo CSS quando origem=Multi)
  animateValueUpdate('kpiJiraSlaMedio', jiraSlaValidos.length
    ? formatMinutesAsDuration(Math.round(jiraSlaMedioMin))
    : '—');

  // statTempoMedio: tempo médio Multi
  animateValueUpdate('statTempoMedio', formatMinutesAsDuration(tempoMedioMultiMin));

  // statNotaMin: menor nota válida do Multi
  animateValueUpdate('statNotaMin', multiComNota.length
    ? Math.min(...multiComNota.map(m => m.avaliacao)).toFixed(0)
    : '—');

  /* --- Contadores numéricos animados --- */
  animateCounter('kpiJiraTotal',        jira.length,           900);
  animateCounter('kpiJiraConcluido',    jiraConcluidos.length, 900);
  animateCounter('kpiMultiTotal',       multi.length,          900);
  animateCounter('statTotalAvaliacoes', multiComNota.length,   900);
  animateCounter('statNota10', multiComNota.filter(m => m.avaliacao === 10).length, 900);

  /* ---- Gráficos ---- */
  const statusColorMap = {
    'Concluido':       COLORS.teal,
    'Aguarda Externo': COLORS.blue,
    'Aguarda Dev':     COLORS.amber,
    'Cancelado':       COLORS.rose,
    'Em Análise':      COLORS.amber
  };
  const statusCounts   = sortEntriesDesc(countBy(jira, t => t.status));
  const statusSegments = statusCounts.map(([label, value]) => ({
    label, value, color: statusColorMap[label] || COLORS.mute
  }));

  const classeColorMap = { A: COLORS.rose, B: COLORS.amber, C: COLORS.mute };
  const classeCounts   = sortEntriesDesc(countBy(jira, t => t.classe));
  const classeSegments = classeCounts.map(([label, value]) => ({
    label: `Classe ${label}`, value, color: classeColorMap[label] || COLORS.mute
  }));

  const clienteItems = sortEntriesDesc(countBy(jira, t => t.cliente))
    .map(([label, value]) => ({ label, value }));

  const motivoItems = sortEntriesDesc(countBy(multi, m => m.motivo))
    .map(([label, value]) => ({ label, value }));

  const notaCounts = countBy(multiComNota, m => m.avaliacao.toFixed(0));
  const notaItems  = Object.keys(notaCounts).sort((a, b) => a - b).map(n => ({
    label: `Nota ${n}`,
    value: notaCounts[n],
    color: +n >= 9 ? COLORS.teal : COLORS.rose
  }));

  drawDonutChart('statusChart', statusSegments);
  drawDonutChart('classeChart', classeSegments);
  drawHBarChart('clienteChart', clienteItems, COLORS.amber);
  drawHBarChart('motivoChart',  motivoItems,  COLORS.blue);
  drawVBarChart('notaChart',    notaItems);

  /* ---- Tabelas ---- */
  rebuildJiraFilters(jira);
  renderJiraTable(jira);
  rebuildMultiFilters(multi);
  renderMultiTable(multi);
}

/* ==========================================================
   TABELA JIRA
   ========================================================== */

function statusPillClass(status) {
  switch (status) {
    case 'Concluido':  return 'pill-concluido';
    case 'Cancelado':  return 'pill-cancelado';
    case 'Em Análise': return 'pill-analise';
    default:           return 'pill-andamento';
  }
}
function classePillClass(classe) {
  return classe === 'A' ? 'pill-a' : classe === 'B' ? 'pill-b' : 'pill-c';
}

function renderJiraTable(jiraFiltrado) {
  animateTableUpdate('jiraTable', () => {
    const tbody = document.querySelector('#jiraTable tbody');
    tbody.innerHTML = '';

    let lista = jiraFiltrado.slice().sort(
      (a, b) => (parseBrDate(b.criado) || 0) - (parseBrDate(a.criado) || 0)
    );
    if (jiraClienteFiltroValue !== 'all') lista = lista.filter(t => t.cliente === jiraClienteFiltroValue);
    if (jiraTipoFiltroValue    !== 'all') lista = lista.filter(t => t.tipo    === jiraTipoFiltroValue);
    if (jiraPrioFiltroValue    !== 'all') lista = lista.filter(t => t.classe  === jiraPrioFiltroValue);

    if (lista.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="7" style="text-align:center;color:var(--mute);padding:20px;">Sem registros para o período selecionado</td>`;
      tbody.appendChild(tr);
      return;
    }
    lista.forEach((t, index) => {
      const tr = document.createElement('tr');
      tr.style.animationDelay = `${index * 0.03}s`;
      tr.className = 'table-row-animate';
      tr.innerHTML = `
        <td class="mono">${t.ticket}</td>
        <td class="titulo-cell">${t.titulo}</td>
        <td>${t.tipo}</td>
        <td>${t.cliente}</td>
        <td><span class="pill ${statusPillClass(t.status)}">${t.status}</span></td>
        <td><span class="pill ${classePillClass(t.classe)}">${t.classe}</span></td>
        <td class="mono">${t.tempo}</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

function rebuildJiraFilters(jiraFiltrado) {
  const clientes = [...new Set(jiraFiltrado.map(t => t.cliente))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const tipos    = [...new Set(jiraFiltrado.map(t => t.tipo))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const prios    = [...new Set(jiraFiltrado.map(t => t.classe))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const buildSelect = (id, optionsArr, labelFn) => {
    const sel    = document.getElementById(id);
    const prevVal = sel.value;
    sel.innerHTML = '';
    const all = document.createElement('option');
    all.value = 'all';
    all.textContent = sel.dataset.placeholder || 'Todos';
    sel.appendChild(all);
    optionsArr.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = labelFn ? labelFn(v) : v;
      sel.appendChild(opt);
    });
    sel.value = optionsArr.includes(prevVal) ? prevVal : 'all';
  };

  buildSelect('jiraClienteFiltro', clientes);
  buildSelect('jiraTipoFiltro',    tipos);
  buildSelect('jiraPrioFiltro',    prios, v => `Prioridade ${v}`);

  jiraClienteFiltroValue = document.getElementById('jiraClienteFiltro').value;
  jiraTipoFiltroValue    = document.getElementById('jiraTipoFiltro').value;
  jiraPrioFiltroValue    = document.getElementById('jiraPrioFiltro').value;
}

/* ==========================================================
   TABELA MULTI360
   ========================================================== */

function extrairClienteMulti(nome) {
  if (!nome) return 'Não identificado';
  const partes = nome.split(/\s*-\s*/);
  return partes[0].trim() || 'Não identificado';
}

function renderMultiTable(multiFiltrado) {
  animateTableUpdate('multiTable', () => {
    const tbody = document.querySelector('#multiTable tbody');
    tbody.innerHTML = '';

    let lista = multiFiltrado.slice().sort(
      (a, b) => (parseBrDate(b.data) || 0) - (parseBrDate(a.data) || 0)
    );
    if (multiClienteFiltroValue !== 'all') lista = lista.filter(m => extrairClienteMulti(m.nome) === multiClienteFiltroValue);
    if (multiMotivoFiltroValue  !== 'all') lista = lista.filter(m => m.motivo === multiMotivoFiltroValue);
    if (multiNotaFiltroValue    !== 'all') {
      if (multiNotaFiltroValue === 'sem-nota') {
        lista = lista.filter(m => m.avaliacao === null || m.avaliacao === undefined);
      } else {
        lista = lista.filter(m => m.avaliacao !== null && m.avaliacao !== undefined && m.avaliacao.toString() === multiNotaFiltroValue);
      }
    }

    if (lista.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" style="text-align:center;color:var(--mute);padding:20px;">Sem registros para o período selecionado</td>`;
      tbody.appendChild(tr);
      return;
    }
    lista.forEach((m, index) => {
      const tr = document.createElement('tr');
      tr.style.animationDelay = `${index * 0.03}s`;
      tr.className = 'table-row-animate';
      let notaHtml = '<span class="nota-vazia">—</span>';
      if (m.avaliacao !== null && m.avaliacao !== undefined) {
        notaHtml = `<span class="${m.avaliacao >= 9 ? 'nota-alta' : 'nota-baixa'}">${m.avaliacao.toFixed(1)}</span>`;
      }
      tr.innerHTML = `
        <td class="mono">${m.protocolo}</td>
        <td>${m.nome || '<span style="color:var(--mute)">—</span>'}</td>
        <td>${m.motivo}</td>
        <td class="mono">${m.data}</td>
        <td>${notaHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

function rebuildMultiFilters(multiFiltrado) {
  const clientes   = [...new Set(multiFiltrado.map(m => extrairClienteMulti(m.nome)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const motivos    = [...new Set(multiFiltrado.map(m => m.motivo))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const notasRaw   = multiFiltrado.map(m => m.avaliacao);
  const notasSet   = new Set();
  notasRaw.forEach(n => notasSet.add(n === null || n === undefined ? 'sem-nota' : n.toString()));
  const notasUnique = ['sem-nota', ...Array.from(notasSet).filter(n => n !== 'sem-nota').sort((a, b) => parseFloat(b) - parseFloat(a))];

  const buildSelect = (id, optionsArr, labelFn) => {
    const sel     = document.getElementById(id);
    const prevVal = sel.value;
    sel.innerHTML = '';
    const all = document.createElement('option');
    all.value = 'all';
    all.textContent = sel.dataset.placeholder || 'Todos';
    sel.appendChild(all);
    optionsArr.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = labelFn ? labelFn(v) : v;
      sel.appendChild(opt);
    });
    sel.value = optionsArr.includes(prevVal) ? prevVal : 'all';
  };

  buildSelect('multiClienteFiltro', clientes);
  buildSelect('multiMotivoFiltro',  motivos);
  buildSelect('multiNotaFiltro', notasUnique, v => v === 'sem-nota' ? 'Sem nota' : `Nota ${v}`);

  multiClienteFiltroValue = document.getElementById('multiClienteFiltro').value;
  multiMotivoFiltroValue  = document.getElementById('multiMotivoFiltro').value;
  multiNotaFiltroValue    = document.getElementById('multiNotaFiltro').value;
}

/* ==========================================================
   LISTENERS DAS TABELAS
   ========================================================== */

let _currentJira  = getAllJira();
let _currentMulti = getAllMulti();

document.getElementById('jiraClienteFiltro').addEventListener('change', e => {
  jiraClienteFiltroValue = e.target.value;
  renderJiraTable(_currentJira);
});
document.getElementById('jiraTipoFiltro').addEventListener('change', e => {
  jiraTipoFiltroValue = e.target.value;
  renderJiraTable(_currentJira);
});
document.getElementById('jiraPrioFiltro').addEventListener('change', e => {
  jiraPrioFiltroValue = e.target.value;
  renderJiraTable(_currentJira);
});
document.getElementById('multiClienteFiltro').addEventListener('change', e => {
  multiClienteFiltroValue = e.target.value;
  renderMultiTable(_currentMulti);
});
document.getElementById('multiMotivoFiltro').addEventListener('change', e => {
  multiMotivoFiltroValue = e.target.value;
  renderMultiTable(_currentMulti);
});
document.getElementById('multiNotaFiltro').addEventListener('change', e => {
  multiNotaFiltroValue = e.target.value;
  renderMultiTable(_currentMulti);
});

/* ==========================================================
   FILTRO DE PERÍODO
   ========================================================== */

function getMesesDisponiveis() {
  const set = new Set();
  [...getAllJira().map(r => r.criado), ...getAllMulti().map(r => r.data)].forEach(str => {
    const m = str && str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) set.add(`${m[3]}-${m[2]}`);
  });
  return Array.from(set).sort();
}

const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function labelMes(anoMes) {
  const [y, mo] = anoMes.split('-');
  return `${MESES_LABEL[+mo - 1]} ${y}`;
}

/** Popula um <select> com os meses disponíveis, preservando seleção atual. */
function popularSelectMeses(selectId, valorPadrao) {
  const sel    = document.getElementById(selectId);
  if (!sel) return;
  const prevVal = sel.value;
  sel.innerHTML = '';
  getMesesDisponiveis().forEach(am => {
    const opt = document.createElement('option');
    opt.value = am;
    opt.textContent = labelMes(am);
    sel.appendChild(opt);
  });
  if (prevVal && [...sel.options].some(o => o.value === prevVal)) {
    sel.value = prevVal;
  } else if (valorPadrao && [...sel.options].some(o => o.value === valorPadrao)) {
    sel.value = valorPadrao;
  } else if (sel.options.length > 0) {
    sel.value = sel.options[sel.options.length - 1].value;
  }
}

const mesesDisp = getMesesDisponiveis();

// Popula o select de mês principal
popularSelectMeses('periodoMes', mesesDisp[mesesDisp.length - 1]);

// Popula os selects dos comparadores
popularSelectMeses('compMesA', mesesDisp.length >= 2 ? mesesDisp[mesesDisp.length - 2] : mesesDisp[0]);
popularSelectMeses('compMesB', mesesDisp[mesesDisp.length - 1]);

/** Popula o select de meses de referência na importação (inclui opção automática). */
function popularImportMeses() {
  const sel = document.getElementById('importMesRef');
  if (!sel) return;
  const prevVal = sel.value;
  // Limpa e mantém a opção automática
  while (sel.options.length > 1) sel.remove(1);
  getMesesDisponiveis().forEach(am => {
    const opt = document.createElement('option');
    opt.value = am;
    opt.textContent = labelMes(am);
    sel.appendChild(opt);
  });
  if (prevVal && [...sel.options].some(o => o.value === prevVal)) {
    sel.value = prevVal;
  }
}
popularImportMeses();

/* ---- Filtragem por período ---- */
function filtrarPorPeriodo(modo, jiraBase, multiBase) {
  const jd = jiraBase  || getAllJira();
  const md = multiBase || getAllMulti();

  if (modo === 'todos') return { jira: jd, multi: md };

  if (modo === 'mes') {
    const val = document.getElementById('periodoMes').value;
    if (!val) return { jira: jd, multi: md };
    const [y, mo] = val.split('-').map(Number);
    return {
      jira:  jd.filter(r => { const d = parseBrDate(r.criado); return d && d.getFullYear() === y && (d.getMonth() + 1) === mo; }),
      multi: md.filter(r => { const d = parseBrDate(r.data);   return d && d.getFullYear() === y && (d.getMonth() + 1) === mo; })
    };
  }

  if (modo === 'intervalo') {
    const dtIniStr = document.getElementById('periodoInicio').value;
    const dtFimStr = document.getElementById('periodoFim').value;
    if (!dtIniStr || !dtFimStr) return { jira: jd, multi: md };
    const [yi, mi, di] = dtIniStr.split('-').map(Number);
    const [yf, mf, df] = dtFimStr.split('-').map(Number);
    const dtIni = new Date(yi, mi - 1, di, 0, 0, 0);
    const dtFim = new Date(yf, mf - 1, df, 23, 59, 59);
    return {
      jira:  jd.filter(r => { const d = parseBrDate(r.criado); return d && d >= dtIni && d <= dtFim; }),
      multi: md.filter(r => { const d = parseBrDate(r.data);   return d && d >= dtIni && d <= dtFim; })
    };
  }
  return { jira: jd, multi: md };
}

function aplicarFiltro() {
  const modo       = document.querySelector('input[name="periodoModo"]:checked').value;
  const porPeriodo = filtrarPorPeriodo(modo);
  const { jira, multi } = filtrarPorOrigem(porPeriodo.jira, porPeriodo.multi);

  _currentJira  = jira;
  _currentMulti = multi;

  jiraClienteFiltroValue  = 'all';
  jiraTipoFiltroValue     = 'all';
  jiraPrioFiltroValue     = 'all';
  multiClienteFiltroValue = 'all';
  multiMotivoFiltroValue  = 'all';
  multiNotaFiltroValue    = 'all';

  atualizarVisibilidadeOrigem();
  atualizarFooter(modo);
  renderDashboard(jira, multi);
}

function atualizarFooter(modo) {
  const footer = document.querySelector('.footer span');
  const topbar = document.getElementById('topbarPeriodo');
  let label    = '';

  if (modo === 'todos') {
    label = 'Todo o período';
    if (footer) footer.textContent = 'Painel gerado a partir de todos os registros disponíveis';
  } else if (modo === 'mes') {
    const val = document.getElementById('periodoMes').value;
    label = labelMes(val);
    if (footer) footer.textContent = `Painel gerado a partir dos indicadores de ${label}`;
  } else if (modo === 'intervalo') {
    const ini = document.getElementById('periodoInicio').value;
    const fim = document.getElementById('periodoFim').value;
    if (ini && fim) {
      const fmt = s => s.split('-').reverse().join('/');
      label = `${fmt(ini)} – ${fmt(fim)}`;
      if (footer) footer.textContent = `Painel gerado a partir dos indicadores de ${fmt(ini)} a ${fmt(fim)}`;
    }
  }
  if (topbar) animateValueUpdate('topbarPeriodo', label);
}

function atualizarModoFiltro() {
  const modo = document.querySelector('input[name="periodoModo"]:checked').value;
  document.getElementById('filtroMesWrap').style.display       = modo === 'mes'       ? 'flex' : 'none';
  document.getElementById('filtroIntervaloWrap').style.display = modo === 'intervalo' ? 'flex' : 'none';
  // Intervalo usa coluna — garante direção correta quando exibido
  if (modo === 'intervalo') {
    document.getElementById('filtroIntervaloWrap').style.flexDirection = 'column';
  }
}

document.querySelectorAll('input[name="periodoModo"]').forEach(radio => {
  radio.addEventListener('change', () => {
    atualizarModoFiltro();
    const modo = radio.value;
    if (modo === 'mes' || modo === 'todos') aplicarFiltro();
  });
});

document.getElementById('periodoMes').addEventListener('change', () => aplicarFiltro());

document.querySelectorAll('input[name="origemModo"]').forEach(radio => {
  radio.addEventListener('change', () => {
    origemFiltroValue = radio.value;
    aplicarFiltro();
  });
});

document.getElementById('periodoInicio').addEventListener('change', validarEAplicarIntervalo);
document.getElementById('periodoFim').addEventListener('change',    validarEAplicarIntervalo);

function validarEAplicarIntervalo() {
  const ini = document.getElementById('periodoInicio').value;
  const fim = document.getElementById('periodoFim').value;
  const err = document.getElementById('periodoErro');
  if (!ini || !fim) return;
  if (ini > fim) {
    err.textContent = 'A data inicial não pode ser posterior à data final.';
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  aplicarFiltro();
}

document.getElementById('btnAplicarFiltro').addEventListener('click', () => {
  const ini  = document.getElementById('periodoInicio').value;
  const fim  = document.getElementById('periodoFim').value;
  const err  = document.getElementById('periodoErro');
  const modo = document.querySelector('input[name="periodoModo"]:checked').value;
  if (modo === 'intervalo') {
    if (!ini || !fim) { err.textContent = 'Informe as duas datas para filtrar por intervalo.'; err.style.display = 'block'; return; }
    if (ini > fim)    { err.textContent = 'A data inicial não pode ser posterior à data final.'; err.style.display = 'block'; return; }
    err.style.display = 'none';
  }
  aplicarFiltro();
});

/* ==========================================================
   BARRA LATERAL — controle de abertura / fechamento
   ========================================================== */

const sidebar         = document.getElementById('sidebar');
const sidebarToggle   = document.getElementById('sidebarToggle');
const sidebarClose    = document.getElementById('sidebarClose');
const sidebarOverlay  = document.getElementById('sidebarOverlay');

let sidebarOpen = true; // começa aberta em desktop

function setSidebarState(open) {
  sidebarOpen = open;
  if (open) {
    sidebar.classList.remove('is-collapsed');
    sidebarOverlay.classList.add('is-visible');
    sidebarToggle.classList.add('is-active');
    sidebarToggle.setAttribute('aria-expanded', 'true');
    sidebar.removeAttribute('aria-hidden');
    // Em desktop, não mostra overlay
    if (window.innerWidth > 900) {
      sidebarOverlay.classList.remove('is-visible');
    }
  } else {
    sidebar.classList.add('is-collapsed');
    sidebarOverlay.classList.remove('is-visible');
    sidebarToggle.classList.remove('is-active');
    sidebarToggle.setAttribute('aria-expanded', 'false');
    sidebar.setAttribute('aria-hidden', 'true');
  }
  // Redesenha os gráficos após a transição (sidebar muda a largura do conteúdo)
  setTimeout(() => renderDashboard(_currentJira, _currentMulti), 340);
}

sidebarToggle.addEventListener('click', () => setSidebarState(!sidebarOpen));
sidebarClose.addEventListener('click',  () => setSidebarState(false));
sidebarOverlay.addEventListener('click', () => setSidebarState(false));

// Fecha a sidebar com Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sidebarOpen) setSidebarState(false);
});

/* ==========================================================
   SEÇÕES COLAPSÁVEIS DA SIDEBAR (Comparação e Importação)
   ========================================================== */

function setupSidebarToggle(toggleId, panelId) {
  const toggle = document.getElementById(toggleId);
  const panel  = document.getElementById(panelId);
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.classList.contains('is-open');
    if (isOpen) {
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      // Animação de fechar: slideUp
      panel.style.overflow   = 'hidden';
      panel.style.height     = panel.scrollHeight + 'px';
      requestAnimationFrame(() => {
        panel.style.transition = 'height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease';
        panel.style.height     = '0';
        panel.style.opacity    = '0';
      });
      setTimeout(() => {
        panel.style.display = 'none';
        panel.style.height  = '';
        panel.style.opacity = '';
        panel.style.overflow = '';
        panel.style.transition = '';
      }, 290);
    } else {
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      // Animação de abrir: slideDown
      panel.style.display  = 'block';
      panel.style.height   = '0';
      panel.style.opacity  = '0';
      panel.style.overflow = 'hidden';
      const targetH = panel.scrollHeight;
      requestAnimationFrame(() => {
        panel.style.transition = 'height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease';
        panel.style.height     = targetH + 'px';
        panel.style.opacity    = '1';
      });
      setTimeout(() => {
        panel.style.height   = '';
        panel.style.overflow = '';
        panel.style.transition = '';
      }, 290);
    }
  });

  // Suporte a teclado
  toggle.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); }
  });
}

setupSidebarToggle('compToggle',   'compPanel');
setupSidebarToggle('importToggle', 'importPanel');

/* ==========================================================
   MODOS DOS CAMPOS DO COMPARADOR — stubs para compatibilidade
   com os inputs ocultos mantidos no HTML.
   ========================================================== */

function setupCompModoToggle() {} // noop — novo seletor não usa radios A/B

setupCompModoToggle('compModoA', 'compMesAWrap', 'compIntervaloAWrap');
setupCompModoToggle('compModoB', 'compMesBWrap', 'compIntervaloBWrap');

/* ==========================================================
   COMPARAÇÃO DE MÚLTIPLOS MESES
   ========================================================== */

const MESES_NOME_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function getAnosDisponiveis() {
  const set = new Set();
  [...getAllJira().map(r => r.criado), ...getAllMulti().map(r => r.data)].forEach(str => {
    const m = str && str.match(/\d{2}\/\d{2}\/(\d{4})/);
    if (m) set.add(parseInt(m[1], 10));
  });
  return Array.from(set).sort((a, b) => a - b);
}

function getMesesComDados(ano) {
  const set = new Set();
  [...getAllJira().map(r => r.criado), ...getAllMulti().map(r => r.data)].forEach(str => {
    const m = str && str.match(/\d{2}\/(\d{2})\/(\d{4})/);
    if (m && parseInt(m[2], 10) === ano) set.add(parseInt(m[1], 10));
  });
  return set;
}

function popularSeletorComparacao() {
  const selAno = document.getElementById('compAno');
  if (!selAno) return;
  const anos     = getAnosDisponiveis();
  const anoAtual = parseInt(selAno.value, 10) || 0;
  selAno.innerHTML = '';
  anos.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a; opt.textContent = a;
    selAno.appendChild(opt);
  });
  if (anos.includes(anoAtual)) selAno.value = anoAtual;
  else if (anos.length)        selAno.value = anos[anos.length - 1];
  popularGradeMeses();
}

function popularGradeMeses() {
  const grid = document.getElementById('compMesesGrid');
  if (!grid) return;
  const ano      = parseInt(document.getElementById('compAno')?.value, 10);
  const comDados = getMesesComDados(ano);
  const marcados = getMesesMarcados();

  grid.innerHTML = '';
  for (let mo = 1; mo <= 12; mo++) {
    const temDados = comDados.has(mo);
    const estaMarc = marcados.has(mo) && temDados;
    const lbl = document.createElement('label');
    lbl.className = 'comp-mes-label' + (temDados ? '' : ' sem-dados');
    lbl.innerHTML = `
      <input type="checkbox" name="compMeses" value="${mo}"
        ${estaMarc ? 'checked' : ''} ${temDados ? '' : 'disabled'}
        aria-label="${MESES_NOME_CURTO[mo - 1]}">
      <span class="comp-mes-chip">${MESES_NOME_CURTO[mo - 1]}</span>`;
    grid.appendChild(lbl);
  }
}

function getMesesMarcados() {
  const checks = document.querySelectorAll('input[name="compMeses"]:checked');
  return new Set([...checks].map(c => parseInt(c.value, 10)));
}

document.getElementById('compAno')?.addEventListener('change', popularGradeMeses);

document.getElementById('btnCompSelecionarTodos')?.addEventListener('click', () => {
  const ano      = parseInt(document.getElementById('compAno')?.value, 10);
  const comDados = getMesesComDados(ano);
  document.querySelectorAll('input[name="compMeses"]').forEach(cb => {
    if (!cb.disabled) cb.checked = comDados.has(parseInt(cb.value, 10));
  });
});

/* -- Dados de um mês específico -- */

function getDadosMes(ano, mes) {
  return {
    jira:  getAllJira().filter(r  => { const d = parseBrDate(r.criado); return d && d.getFullYear() === ano && (d.getMonth() + 1) === mes; }),
    multi: getAllMulti().filter(r => { const d = parseBrDate(r.data);   return d && d.getFullYear() === ano && (d.getMonth() + 1) === mes; })
  };
}

/* ==========================================================
   MAPA DE CLASSIFICAÇÃO JIRA → MULTI
   Usa o campo cliente do Jira (extraído do título) e o
   prefixo do campo nome do Multi para relacioná-los.
   Normalização: lowercase + só alfanuméricos.
   ========================================================== */

function _normNome(s) {
  if (!s) return '';
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

let _mapaClasseJira = null;

function getMapaClasseJira() {
  if (_mapaClasseJira) return _mapaClasseJira;
  const contagem = {}; // normNome → { A:0, B:0, C:0 }
  getAllJira().forEach(r => {
    if (!r.cliente || !r.classe) return;
    const n = _normNome(r.cliente);
    if (!contagem[n]) contagem[n] = { A: 0, B: 0, C: 0 };
    contagem[n][r.classe] = (contagem[n][r.classe] || 0) + 1;
  });
  _mapaClasseJira = new Map();
  Object.entries(contagem).forEach(([n, cnt]) => {
    const melhor = ['A','B','C'].reduce((acc, cls) => cnt[cls] > cnt[acc] ? cls : acc);
    _mapaClasseJira.set(n, melhor);
  });
  return _mapaClasseJira;
}

function invalidarMapaClasseJira() { _mapaClasseJira = null; }

function getClasseMultiRegistro(m) {
  const cliente = extrairClienteMulti(m.nome);
  return getMapaClasseJira().get(_normNome(cliente)) || null;
}

/* ==========================================================
   ESTADO DOS FILTROS DO PAINEL DE COMPARAÇÃO
   ========================================================== */

// Filtros por bloco: 'jira' e 'multi'
const _compFiltros = {
  jira: {
    classe:    'all',   // 'all' | 'A' | 'B' | 'C' | 'sem'
    categoria: 'all',   // 'all' | <tipo>
    sla:       'todos', // 'todos' | 'com-sla' | 'sem-sla'
  },
  multi: {
    classe:    'all',
    categoria: 'all',   // 'all' | <motivo>
    sla:       'todos', // 'todos' | 'com-sla' | 'sem-sla' (multi usa tempo de atendimento como proxy)
  }
};

/** Aplica filtros de comparação sobre arrays de um mês. */
function aplicarFiltrosComp(jira, multi) {
  const fj = _compFiltros.jira;
  const fm = _compFiltros.multi;

  let j = jira;
  let m = multi.map(r => ({ ...r, _classe: getClasseMultiRegistro(r) }));

  // Jira: filtro de classe
  if (fj.classe !== 'all') {
    j = j.filter(r => fj.classe === 'sem' ? !r.classe : r.classe === fj.classe);
  }
  // Jira: filtro de categoria (tipo)
  if (fj.categoria !== 'all') {
    j = j.filter(r => r.tipo === fj.categoria);
  }
  // Jira: filtro de SLA
  if (fj.sla === 'com-sla')  j = j.filter(r => typeof r.sla === 'number' && r.sla >= 0);
  if (fj.sla === 'sem-sla')  j = j.filter(r => r.sla === null);

  // Multi: filtro de classe (via mapa Jira)
  if (fm.classe !== 'all') {
    m = m.filter(r => fm.classe === 'sem' ? !r._classe : r._classe === fm.classe);
  }
  // Multi: filtro de categoria (motivo)
  if (fm.categoria !== 'all') {
    m = m.filter(r => r.motivo === fm.categoria);
  }
  // Multi: SLA proxy — filtra por presença de tempo de atendimento válido
  if (fm.sla === 'com-sla') {
    m = m.filter(r => calcTempoAtendimentoMin(r.data, r.dataFinalizacao) !== null);
  }
  if (fm.sla === 'sem-sla') {
    m = m.filter(r => calcTempoAtendimentoMin(r.data, r.dataFinalizacao) === null);
  }

  return { jira: j, multi: m };
}

function calcMetricasJira(jira) {
  const sla = jira.filter(t => typeof t.sla === 'number' && t.sla >= 0);
  return {
    chamados:   jira.length,
    concluidos: jira.filter(t => t.status === 'Concluido').length,
    slaMedio:   sla.length ? Math.round(sla.reduce((a, t) => a + t.sla, 0) / sla.length) : null
  };
}

function calcMetricasMulti(multi) {
  const notas  = multi.filter(m => m.avaliacao !== null && m.avaliacao !== undefined && !isNaN(m.avaliacao));
  const tempos = multi.map(m => calcTempoAtendimentoMin(m.data, m.dataFinalizacao)).filter(v => v !== null && v >= 0);
  return {
    atendimentos: multi.length,
    notaMedia:    notas.length  ? parseFloat((notas.reduce((a, b) => a + b.avaliacao, 0) / notas.length).toFixed(2)) : null,
    tempoMedio:   tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null
  };
}

/* -- Execução -- */

function executarComparacao() {
  const ano   = parseInt(document.getElementById('compAno')?.value, 10);
  const meses = [...getMesesMarcados()].sort((a, b) => a - b);

  if (!ano || meses.length < 1) { alert('Selecione pelo menos um mês para comparar.'); return; }

  const panel = document.getElementById('compResultPanel');

  // Badges dos meses
  const labelsEl = document.getElementById('compResultLabels');
  if (labelsEl) {
    labelsEl.innerHTML = meses
      .map(mo => `<span class="comp-mes-badge">${MESES_NOME_CURTO[mo - 1]} ${ano}</span>`)
      .join('');
  }

  // Dados por mês (com filtros de comparação aplicados)
  const dadosPorMes = meses.map(mo => {
    const { jira, multi } = getDadosMes(ano, mo);
    const j0 = origemFiltroValue === 'multi' ? [] : jira;
    const m0 = origemFiltroValue === 'jira'  ? [] : multi;
    const { jira: j, multi: m } = aplicarFiltrosComp(j0, m0);
    return { mes: mo, label: MESES_NOME_CURTO[mo - 1], jira: j, multi: m, mJira: calcMetricasJira(j), mMulti: calcMetricasMulti(m) };
  });

  // Seção Jira
  const secJira  = document.getElementById('compSecaoJira');
  const gridJira = document.getElementById('compResultGridJira');
  if (gridJira) gridJira.innerHTML = '';
  if (origemFiltroValue !== 'multi' && secJira && gridJira) {
    secJira.style.display = 'block';
    criarCompCardMultiMes('Chamados Jira',    dadosPorMes.map(d => ({ label: d.label, val: d.mJira.chamados })),   null, gridJira, 0.05);
    criarCompCardMultiMes('Concluídos Jira',  dadosPorMes.map(d => ({ label: d.label, val: d.mJira.concluidos })), null, gridJira, 0.10);
    criarCompCardMultiMes('Média SLA Jira',   dadosPorMes.map(d => ({ label: d.label, val: d.mJira.slaMedio })),   v => v !== null ? formatMinutesAsDuration(v) : '—', gridJira, 0.15);
  } else if (secJira) { secJira.style.display = 'none'; }

  // Seção Multi
  const secMulti  = document.getElementById('compSecaoMulti');
  const gridMulti = document.getElementById('compResultGridMulti');
  if (gridMulti) gridMulti.innerHTML = '';
  if (origemFiltroValue !== 'jira' && secMulti && gridMulti) {
    secMulti.style.display = 'block';
    criarCompCardMultiMes('Atendimentos Multi',    dadosPorMes.map(d => ({ label: d.label, val: d.mMulti.atendimentos })), null, gridMulti, 0.20);
    criarCompCardMultiMes('Satisfação Média Multi',dadosPorMes.map(d => ({ label: d.label, val: d.mMulti.notaMedia })),    v => v !== null ? v.toFixed(1) : '—', gridMulti, 0.25);
    criarCompCardMultiMes('Tempo Médio Multi',     dadosPorMes.map(d => ({ label: d.label, val: d.mMulti.tempoMedio })),   v => v !== null ? formatMinutesAsDuration(v) : '—', gridMulti, 0.30);
  } else if (secMulti) { secMulti.style.display = 'none'; }

  renderCompCharts(dadosPorMes, ano);

  panel.style.display   = 'block';
  panel.style.opacity   = '0';
  panel.style.transform = 'translateY(10px)';
  requestAnimationFrame(() => {
    panel.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    panel.style.opacity    = '1';
    panel.style.transform  = 'translateY(0)';
  });
  setTimeout(() => { panel.style.transition = ''; }, 360);
  if (window.innerWidth <= 900) setSidebarState(false);
}

document.getElementById('btnComparar').addEventListener('click', executarComparacao);

function criarCompCardMultiMes(labelTitulo, entradas, formatFn, gridEl, delay) {
  const card = document.createElement('div');
  card.className = 'comp-card';
  card.style.animationDelay = `${delay}s`;

  let linhas = '';
  entradas.forEach((e, idx) => {
    const fVal = formatFn ? formatFn(e.val) : (e.val !== null ? String(e.val) : '—');

    // Variação percentual em relação ao mês anterior
    let pctHTML = '';
    if (idx > 0) {
      const prev = entradas[idx - 1].val;
      if (e.val !== null && prev !== null) {
        if (prev === 0 && e.val !== 0) {
          pctHTML = `<span class="comp-card-pct comp-delta-up">↑ novo</span>`;
        } else if (prev !== 0) {
          const pct = ((e.val - prev) / prev) * 100;
          const sign = pct > 0 ? '↑' : pct < 0 ? '↓' : '=';
          const cls  = pct > 0 ? 'comp-delta-up' : pct < 0 ? 'comp-delta-down' : 'comp-delta-neutral';
          pctHTML = `<span class="comp-card-pct ${cls}">${sign} ${Math.abs(pct).toFixed(1)}%</span>`;
        }
      }
    }

    linhas += `
      <div class="comp-card-mes-row">
        <span>${e.label}</span>
        <span class="comp-card-mes-val-wrap">
          <strong>${fVal}</strong>${pctHTML}
        </span>
      </div>`;
  });

  card.innerHTML = `<div class="comp-card-label">${labelTitulo}</div>${linhas}`;
  gridEl.appendChild(card);
}

/* ==========================================================
   GRÁFICOS DE LINHAS — eixo X = meses, linhas = indicadores
   ========================================================== */

const CORES_MESES = [
  '#123877','#0E8F82','#FFC400','#C23A5D','#2F5AA8','#8A6100',
  '#4DD9C8','#F4829A','#5C7EC0','#1B6E66','#D4870A','#8C2042'
];

/**
 * Popula o div.comp-filtros-inline já criado dentro de um bloco de gráfico.
 * Chamada após o bloco ser inserido no DOM para que os selects possam referenciar o wrap.
 */
function _renderFiltrosNoBlocoLinhas(block, origem, dadosPorMes, ano, wrap) {
  const filtrosEl = block.querySelector('.comp-filtros-inline');
  if (!filtrosEl) return;

  const fState    = _compFiltros[origem];
  const categorias = origem === 'jira'
    ? [...new Set(dadosPorMes.flatMap(d => d.jira.map(r => r.tipo)).filter(Boolean))].sort()
    : [...new Set(dadosPorMes.flatMap(d => d.multi.map(r => r.motivo)).filter(Boolean))].sort();

  const labelSla = origem === 'jira' ? 'SLA Jira' : 'Tempo Multi';

  filtrosEl.innerHTML = `
    <div class="cfi-wrap">
      <div class="cfi-grupo">
        <span class="cfi-label">Classificação</span>
        <select class="cfi-select" data-campo="classe" aria-label="Filtrar por classificação">
          <option value="all">Todas</option>
          <option value="A" ${fState.classe==='A'?'selected':''}>Classe A</option>
          <option value="B" ${fState.classe==='B'?'selected':''}>Classe B</option>
          <option value="C" ${fState.classe==='C'?'selected':''}>Classe C</option>
          <option value="sem" ${fState.classe==='sem'?'selected':''}>Sem class.</option>
        </select>
      </div>
      <div class="cfi-grupo">
        <span class="cfi-label">Categoria</span>
        <select class="cfi-select" data-campo="categoria" aria-label="Filtrar por categoria">
          <option value="all">Todas</option>
          ${categorias.map(c => `<option value="${c}" ${fState.categoria===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="cfi-grupo">
        <span class="cfi-label">${labelSla}</span>
        <select class="cfi-select" data-campo="sla" aria-label="Filtrar por SLA">
          <option value="todos" ${fState.sla==='todos'?'selected':''}>Todos</option>
          <option value="com-sla" ${fState.sla==='com-sla'?'selected':''}>Com SLA</option>
          <option value="sem-sla" ${fState.sla==='sem-sla'?'selected':''}>Sem SLA</option>
        </select>
      </div>
    </div>`;

  filtrosEl.querySelectorAll('.cfi-select').forEach(sel => {
    sel.addEventListener('change', () => {
      _compFiltros[origem][sel.dataset.campo] = sel.value;
      executarComparacao();
    });
  });
}

function renderCompCharts(dadosPorMes, ano) {
  const section = document.getElementById('compChartSection');
  const wrap    = document.getElementById('compChartsWrap');
  if (!section || !wrap) return;
  wrap.innerHTML = '';
  section.style.display = 'block';
  // Guarda dados no wrap para que criarBlocoLinhas possa acessar ao renderizar filtros
  wrap._dadosPorMes = dadosPorMes;
  wrap._ano         = ano;
  const graficos = [];

  if (origemFiltroValue !== 'multi') {
    const ctx = criarBlocoLinhas('Comparação Mensal — Jira',
      dadosPorMes.map(d => d.label),
      [
        { nome: 'Chamados',   unidade: 'count',   formatFn: null, valores: dadosPorMes.map(d => d.mJira.chamados)   },
        { nome: 'Concluídos', unidade: 'count',   formatFn: null, valores: dadosPorMes.map(d => d.mJira.concluidos) },
        { nome: 'Média SLA',  unidade: 'minutos', formatFn: v => v !== null ? formatMinutesAsDuration(v) : '—', valores: dadosPorMes.map(d => d.mJira.slaMedio) }
      ], wrap);
    if (ctx) graficos.push(ctx);
  }
  if (origemFiltroValue !== 'jira') {
    const ctx = criarBlocoLinhas('Comparação Mensal — Multi',
      dadosPorMes.map(d => d.label),
      [
        { nome: 'Atendimentos', unidade: 'count',   formatFn: null, valores: dadosPorMes.map(d => d.mMulti.atendimentos) },
        { nome: 'Nota Média',   unidade: 'nota',    formatFn: v => v !== null ? v.toFixed(1) : '—', valores: dadosPorMes.map(d => d.mMulti.notaMedia)    },
        { nome: 'Tempo Médio',  unidade: 'minutos', formatFn: v => v !== null ? formatMinutesAsDuration(v) : '—', valores: dadosPorMes.map(d => d.mMulti.tempoMedio) }
      ], wrap);
    if (ctx) graficos.push(ctx);
  }
  if (!graficos.length) {
    wrap.innerHTML = '<p style="color:var(--mute);font-size:12px;text-align:center;padding:16px 0;">Sem dados para exibir no gráfico.</p>';
  }
  wrap._compGraficos = graficos;
}

function criarBlocoLinhas(titulo, labels, series, wrap) {
  const block = document.createElement('div');
  block.className = 'comp-chart-block';

  const tituloEl = document.createElement('div');
  tituloEl.className = 'comp-chart-block-label';
  tituloEl.textContent = titulo;
  block.appendChild(tituloEl);

  // Filtros inline — Jira ou Multi dependendo do título
  const origemBloco = titulo.toLowerCase().includes('jira') ? 'jira' : 'multi';
  const filtrosEl = document.createElement('div');
  filtrosEl.className = 'comp-filtros-inline';
  // Populado após o block ser adicionado ao wrap (necessita de dados)
  block._origemBloco = origemBloco;
  block.appendChild(filtrosEl);

  const canvas = document.createElement('canvas');
  block.appendChild(canvas);

  const legend = document.createElement('div');
  legend.className = 'comp-chart-legend';
  series.forEach((s, i) => {
    const cor = CORES_MESES[i % CORES_MESES.length];
    legend.innerHTML += `<span class="comp-chart-legend-item"><span class="comp-chart-legend-dot" style="background:${cor};border-radius:50%"></span>${s.nome}</span>`;
  });
  block.appendChild(legend);

  const painelDetalhe = document.createElement('div');
  painelDetalhe.className = 'comp-detail-panel';
  painelDetalhe.style.display = 'none';
  const painelInner = document.createElement('div');
  painelInner.className = 'comp-detail-inner';
  painelDetalhe.appendChild(painelInner);
  block.appendChild(painelDetalhe);
  wrap.appendChild(block);

  // Popula os filtros inline agora que o bloco está no DOM
  const dadosParaFiltros = wrap._dadosPorMes || [];
  const anoParaFiltros   = wrap._ano || 0;
  _renderFiltrosNoBlocoLinhas(block, origemBloco, dadosParaFiltros, anoParaFiltros, wrap);

  const ctx = { canvas, block, painelDetalhe, painelInner, dados: { titulo, labels, series }, hitZones: [], pontoAtivo: null };
  desenharLinhasComparativas(ctx);
  canvas.addEventListener('mousemove',  e => tratarHoverComp(e, ctx));
  canvas.addEventListener('mouseleave', ()  => limparHoverComp(ctx));
  canvas.addEventListener('touchstart', e  => { e.preventDefault(); tratarHoverComp(e.touches[0], ctx); }, { passive: false });
  canvas.addEventListener('touchend', () => setTimeout(() => limparHoverComp(ctx), 2500));
  return ctx;
}

/* -- Renderização do canvas de linhas -- */

function desenharLinhasComparativas(ctx) {
  const { canvas, block, dados } = ctx;
  const { labels, series }       = dados;

  const dpr    = window.devicePixelRatio || 1;
  const ps     = getComputedStyle(block);
  const padCSS = (parseFloat(ps.paddingLeft) || 0) + (parseFloat(ps.paddingRight) || 0);
  const cssW   = Math.max(1, block.clientWidth - padCSS);
  const mobile = cssW < 520;
  const n      = labels.length;  // pontos no eixo X
  const cssH   = mobile ? 220 : 280;

  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width  = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, cssW, cssH);

  if (!n || !series.length) {
    c.fillStyle = COLORS.mute; c.font = `12px ${FONT}`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Sem dados para o período', cssW / 2, cssH / 2);
    return;
  }

  // Padding — garante que pontos e rótulos das extremidades não sejam cortados.
  const padL      = mobile ? 42  : 50;   // eixo Y
  const padTop    = mobile ? 28  : 34;   // rótulo de valor acima do ponto mais alto
  const padBottom = mobile ? 48  : 56;   // rótulos dos meses no eixo X
  const padR      = mobile ? 20  : 24;
  const chartW    = cssW - padL - padR;
  const chartH    = cssH - padTop - padBottom;

  // Distribui n pontos deixando meia "slot" de cada lado,
  // evitando que o 1º e o último ponto fiquem na borda exata.
  const slotW  = chartW / Math.max(n + 1, 2);
  const startX = padL + slotW;
  const stepX  = n > 1 ? (chartW - 2 * slotW) / (n - 1) : 0;

  function xPos(i) { return n > 1 ? startX + i * stepX : padL + chartW / 2; }

  // Normalização global por série: [min, max] dos valores da série → [0..1].
  const innerMarg = 0.10;
  function normalizarSerie(serie) {
    const vals = serie.valores.filter(v => v !== null);
    if (!vals.length) return serie.valores.map(() => null);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    return serie.valores.map(v => {
      if (v === null) return null;
      const norm    = hi === lo ? 0.5 : (v - lo) / (hi - lo);
      return innerMarg + norm * (1 - 2 * innerMarg);
    });
  }
  function yPos(norm) { return padTop + chartH - norm * chartH; }

  const todasAsSeries = series.map((s, si) => {
    const normas = normalizarSerie(s);
    const pontos = labels.map((lbl, i) => {
      const norm = normas[i];
      return norm !== null ? { x: xPos(i), y: yPos(norm), label: lbl, val: s.valores[i], si, i } : null;
    });
    return { ...s, pontos, cor: CORES_MESES[si % CORES_MESES.length] };
  });

  // Grade horizontal
  const nGrid = mobile ? 3 : 4;
  c.strokeStyle = COLORS.grid; c.lineWidth = 1; c.setLineDash([3, 5]);
  c.beginPath();
  for (let g = 0; g <= nGrid; g++) {
    const gy = padTop + (g / nGrid) * chartH;
    c.moveTo(padL, gy); c.lineTo(padL + chartW, gy);
  }
  c.stroke(); c.setLineDash([]);

  // Eixo Y
  c.fillStyle = COLORS.mute; c.font = `${mobile ? 9 : 10}px ${FONT}`;
  c.textAlign = 'right'; c.textBaseline = 'middle';
  for (let g = 0; g <= nGrid; g++) {
    const gy  = padTop + (g / nGrid) * chartH;
    c.fillText(`${100 - g * (100 / nGrid)}%`, padL - 5, gy);
  }

  // Linhas verticais guia
  c.strokeStyle = 'rgba(18,56,119,.05)'; c.lineWidth = 1;
  c.beginPath();
  labels.forEach((_, i) => { c.moveTo(xPos(i), padTop); c.lineTo(xPos(i), padTop + chartH); });
  c.stroke();

  // Séries
  ctx.hitZones = [];
  todasAsSeries.forEach(serie => {
    const { pontos, cor } = serie;
    const validos = pontos.filter(Boolean);
    if (!validos.length) return;

    // Área
    if (validos.length >= 2) {
      c.beginPath();
      c.moveTo(validos[0].x, validos[0].y);
      for (let k = 1; k < validos.length; k++) {
        const p0 = validos[k-1], p1 = validos[k];
        c.bezierCurveTo((p0.x+p1.x)/2, p0.y, (p0.x+p1.x)/2, p1.y, p1.x, p1.y);
      }
      c.lineTo(validos[validos.length-1].x, padTop + chartH);
      c.lineTo(validos[0].x, padTop + chartH);
      c.closePath();
      const grad = c.createLinearGradient(0, padTop, 0, padTop + chartH);
      grad.addColorStop(0, cor + '20'); grad.addColorStop(1, cor + '04');
      c.fillStyle = grad; c.fill();
    }

    // Linha
    c.shadowColor = 'rgba(0,0,0,.12)'; c.shadowBlur = 4; c.shadowOffsetY = 1;
    c.beginPath(); c.strokeStyle = cor; c.lineWidth = mobile ? 2 : 2.5;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.moveTo(validos[0].x, validos[0].y);
    for (let k = 1; k < validos.length; k++) {
      const p0 = validos[k-1], p1 = validos[k];
      c.bezierCurveTo((p0.x+p1.x)/2, p0.y, (p0.x+p1.x)/2, p1.y, p1.x, p1.y);
    }
    c.stroke();
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;

    // Pontos + rótulos
    validos.forEach(p => {
      const fmt = serie.formatFn || (v => v !== null ? String(v) : '—');
      c.beginPath(); c.arc(p.x, p.y, mobile ? 7 : 9, 0, Math.PI * 2);
      c.fillStyle = cor + '20'; c.fill();
      c.beginPath(); c.arc(p.x, p.y, mobile ? 3.5 : 4.5, 0, Math.PI * 2);
      c.fillStyle = cor; c.strokeStyle = '#fff'; c.lineWidth = 1.5;
      c.fill(); c.stroke();
      c.fillStyle = cor; c.font = `600 ${mobile ? 8.5 : 9.5}px ${FONT}`;
      c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.fillText(fmt(p.val), p.x, p.y - (mobile ? 12 : 15));
      ctx.hitZones.push({ px: p.x, py: p.y, r: mobile ? 16 : 20, label: p.label, val: p.val, serie });
    });
  });

  // Rótulos eixo X
  const yLbl   = padTop + chartH + 7;
  const maxWlbl = Math.max(28, stepX > 0 ? stepX - 4 : slotW * 2 - 4);
  c.textBaseline = 'top'; c.textAlign = 'center';
  labels.forEach((lbl, i) => {
    c.fillStyle = COLORS.ink; c.font = `${mobile ? 9 : 10}px ${FONT}`;
    c.fillText(truncateText(c, lbl, maxWlbl), xPos(i), yLbl);
  });

  // Linha de base
  c.strokeStyle = COLORS.line; c.lineWidth = 1;
  c.beginPath();
  c.moveTo(padL, padTop + chartH); c.lineTo(padL + chartW, padTop + chartH);
  c.stroke();
}

/* -- Hover: painel estático de detalhe -- */

function tratarHoverComp(e, ctx) {
  const canvas = ctx.canvas;
  const rect   = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.offsetWidth  || rect.width)  / rect.width;
  const my = (e.clientY - rect.top)  * (canvas.offsetHeight || rect.height) / rect.height;

  let melhor = null, distMin = Infinity;
  for (const z of ctx.hitZones) {
    const d = Math.hypot(mx - z.px, my - z.py);
    if (d < z.r && d < distMin) { melhor = z; distMin = d; }
  }
  if (!melhor) { limparHoverComp(ctx); return; }

  const chave = `${melhor.serie.nome}-${melhor.label}`;
  if (ctx.pontoAtivo === chave) return;
  ctx.pontoAtivo = chave;

  const serie = melhor.serie;
  const iMes  = ctx.dados.labels.indexOf(melhor.label);
  const fmt   = serie.formatFn || (v => v !== null ? String(v) : '—');
  const cor   = serie.cor;

  let deltaHTML = '';
  if (iMes > 0) {
    const valPrev = serie.valores[iMes - 1];
    const lblPrev = ctx.dados.labels[iMes - 1];
    if (melhor.val !== null && valPrev !== null) {
      const diff = melhor.val - valPrev;
      let dTxt;
      if      (serie.unidade === 'minutos') { dTxt = `${diff >= 0 ? '+' : '−'}${formatMinutesShort(Math.abs(diff))}`; }
      else if (serie.unidade === 'nota')    { dTxt = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`; }
      else                                   { dTxt = `${diff >= 0 ? '+' : ''}${diff}`; }
      let pct = '';
      if (valPrev !== 0)   pct = ` (${((diff / valPrev) * 100).toFixed(1)}%)`;
      else if (diff !== 0) pct = ' (N/A%)';
      const icon = diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
      const cls  = diff > 0 ? 'comp-tooltip-up' : diff < 0 ? 'comp-tooltip-down' : 'comp-tooltip-same';
      deltaHTML = `<div class="comp-tooltip-delta"><span>vs ${lblPrev}</span><span class="comp-tooltip-delta-val ${cls}">${icon} ${dTxt}${pct}</span></div>`;
    } else if (valPrev === null) {
      deltaHTML = `<div class="comp-tooltip-delta"><span>vs ${lblPrev}</span><span class="comp-tooltip-delta-val comp-tooltip-same">sem dados</span></div>`;
    }
  }

  const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${cor};margin-right:6px;vertical-align:middle;"></span>`;
  ctx.painelInner.innerHTML = `
    <div class="comp-tooltip-label">${dot}${serie.nome}</div>
    <div class="comp-tooltip-row"><span>${melhor.label}</span><strong>${fmt(melhor.val)}</strong></div>
    ${deltaHTML}`;
  ctx.painelDetalhe.style.display = 'block';
}

function limparHoverComp(ctx) { ctx.pontoAtivo = null; }

/* ==========================================================
   FECHAMENTO DO PAINEL DE COMPARAÇÃO
   ========================================================== */

/* ---------- Formato curto de minutos ---------- */
function formatMinutesShort(min) {
  if (min === null || isNaN(min)) return '—';
  const abs   = Math.abs(min);
  const days  = Math.floor(abs / 1440);
  const hours = Math.floor((abs % 1440) / 60);
  const mins  = Math.round(abs % 60);
  if (days > 0) return `${days}d${hours}h`;
  if (hours > 0) return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  return `${mins}m`;
}

/* ---------- Stubs de compatibilidade ---------- */
function mostrarTooltipComp() {}
function ocultarTooltipComp() {}

/* ---------- Redimensiona quando a janela muda ---------- */

function redimensionarCompCharts() {
  const wrap = document.getElementById('compChartsWrap');
  if (!wrap || !wrap._compGraficos) return;
  for (const ctx of wrap._compGraficos) {
    desenharLinhasComparativas(ctx);
  }
}

// Fecha painel de comparação
document.getElementById('compCloseBtn').addEventListener('click', () => {
  const panel        = document.getElementById('compResultPanel');
  const chartSection = document.getElementById('compChartSection');

  panel.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  panel.style.opacity    = '0';
  panel.style.transform  = 'translateY(8px)';
  setTimeout(() => {
    panel.style.display    = 'none';
    panel.style.transition = '';
    panel.style.transform  = '';
    if (chartSection) chartSection.style.display = 'none';
    const wrap = document.getElementById('compChartsWrap');
    if (wrap) {
      wrap.innerHTML      = '';
      wrap._compGraficos  = null;
    }
    // Limpa o elemento legado (compatibilidade)
    const legacyTip = document.getElementById('compTooltip');
    if (legacyTip) { legacyTip.style.display = 'none'; legacyTip.innerHTML = ''; }
  }, 260);
});

/* ==========================================================
   RESIZE — consolidado na seção de INICIALIZAÇÃO abaixo
   ========================================================== */

let resizeTimer = null;

/* ==========================================================
   INICIALIZAÇÃO
   ========================================================== */

/**
 * Mede a altura real da topbar e ajusta o padding-top do app-layout
 * e o top da sidebar/sticky, garantindo que a topbar fixed não sobreponha
 * o conteúdo independente de quantas linhas ela ocupe.
 * Em mobile (≤ 900px) a sidebar é position:fixed top:0, não precisa ajuste.
 */
function ajustarAlturaTopbar() {
  const topbar    = document.querySelector('.topbar');
  const appLayout = document.querySelector('.app-layout');
  const sidebarEl = document.getElementById('sidebar');
  if (!topbar || !appLayout) return;
  const h = topbar.offsetHeight;
  appLayout.style.paddingTop = h + 'px';
  // Só ajusta top e height da sidebar em desktop (sticky)
  if (sidebarEl && window.innerWidth > 900) {
    const altSidebar     = `calc(100vh - ${h}px)`;
    sidebarEl.style.top       = h + 'px';
    sidebarEl.style.height    = altSidebar;
    sidebarEl.style.maxHeight = altSidebar;
  }
}

atualizarModoFiltro();
aplicarFiltro();

// Aguarda o layout estabilizar antes de medir a topbar
requestAnimationFrame(() => {
  // Em mobile, começa com sidebar fechada para não sobrepor o conteúdo
  if (window.innerWidth <= 900) {
    setSidebarState(false);
  }
  ajustarAlturaTopbar();
  // Popula o seletor de comparação (ano + grade de meses)
  popularSeletorComparacao();
});

// Reavalia ao redimensionar (topbar pode mudar de altura em telas menores)
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    ajustarAlturaTopbar();
    renderDashboard(_currentJira, _currentMulti);
    redimensionarCompCharts(); // redesenha gráficos comparativos se visíveis
    if (window.innerWidth > 900) {
      sidebarOverlay.classList.remove('is-visible');
    }
  }, 150);
});
