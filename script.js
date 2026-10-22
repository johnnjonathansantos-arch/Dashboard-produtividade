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
   ARMAZENAMENTO EM SESSÃO (dados importados via Excel)
   Os dados importados são mantidos em memória e combinados
   com jiraData / multiData originais durante a sessão.
   Não é possível persistir no data.js pelo navegador —
   essa limitação é informada ao usuário na UI.
   ========================================================== */

let _importedJira  = [];  // registros importados do Jira nesta sessão
let _importedMulti = [];  // registros importados do Multi nesta sessão

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

  /* ---- KPIs ---- */
  const jiraConcluidos    = jira.filter(t => t.status === 'Concluido');
  const jiraSlaValidos    = jira.filter(t => t.sla !== null && t.sla !== undefined);
  const jiraSlaMedioMin   = jiraSlaValidos.length
    ? jiraSlaValidos.reduce((a, t) => a + t.sla, 0) / jiraSlaValidos.length
    : null;

  const multiTemposValidos = multi
    .map(m => calcTempoAtendimentoMin(m.data, m.dataFinalizacao))
    .filter(v => v !== null);
  const tempoMedioMultiMin = multiTemposValidos.length
    ? multiTemposValidos.reduce((a, b) => a + b, 0) / multiTemposValidos.length
    : null;

  const multiComNota = multi.filter(m => m.avaliacao !== null && m.avaliacao !== undefined);
  const notaMedia    = multiComNota.length
    ? multiComNota.reduce((a, b) => a + b.avaliacao, 0) / multiComNota.length
    : 0;

  animateValueUpdate('kpiMultiNota',    multiComNota.length ? notaMedia.toFixed(1) : '—');
  animateValueUpdate('kpiJiraSlaMedio', jiraSlaValidos.length
    ? formatMinutesAsDuration(Math.round(jiraSlaMedioMin))
    : '—');
  animateValueUpdate('statTempoMedio', formatMinutesAsDuration(tempoMedioMultiMin));
  animateValueUpdate('statNotaMin',    multiComNota.length
    ? Math.min(...multiComNota.map(m => m.avaliacao)).toFixed(0)
    : '—');

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

let sidebarOpen = true; // começa aberta

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
   MODOS DOS CAMPOS DO COMPARADOR (mês / intervalo)
   ========================================================== */

function setupCompModoToggle(nomeRadio, mesWrapId, intervaloWrapId) {
  document.querySelectorAll(`input[name="${nomeRadio}"]`).forEach(radio => {
    radio.addEventListener('change', () => {
      const modo = radio.value;
      const mesWrap       = document.getElementById(mesWrapId);
      const intervaloWrap = document.getElementById(intervaloWrapId);
      if (mesWrap)       mesWrap.style.display       = modo === 'mes'       ? 'flex' : 'none';
      if (intervaloWrap) intervaloWrap.style.display = modo === 'intervalo' ? 'block' : 'none';
    });
  });
}

setupCompModoToggle('compModoA', 'compMesAWrap', 'compIntervaloAWrap');
setupCompModoToggle('compModoB', 'compMesBWrap', 'compIntervaloBWrap');

/* ==========================================================
   COMPARAÇÃO DE RELATÓRIOS
   ========================================================== */

/**
 * Obtém os dados filtrados para um período do comparador (A ou B).
 * @param {'A'|'B'} lado
 * @returns {{ jira: Array, multi: Array, label: string }}
 */
function getDadosComparacao(lado) {
  const modoRadio = document.querySelector(`input[name="compModo${lado}"]:checked`);
  const modo      = modoRadio ? modoRadio.value : 'mes';
  const origem    = origemFiltroValue;
  let jira  = getAllJira();
  let multi = getAllMulti();
  let label = '';

  if (modo === 'mes') {
    const sel = document.getElementById(`compMes${lado}`);
    const val = sel ? sel.value : '';
    if (!val) return null;
    const [y, mo] = val.split('-').map(Number);
    jira  = jira.filter(r  => { const d = parseBrDate(r.criado); return d && d.getFullYear() === y && (d.getMonth() + 1) === mo; });
    multi = multi.filter(r => { const d = parseBrDate(r.data);   return d && d.getFullYear() === y && (d.getMonth() + 1) === mo; });
    label = labelMes(val);
  } else {
    const ini = document.getElementById(`compInicio${lado}`)?.value;
    const fim = document.getElementById(`compFim${lado}`)?.value;
    if (!ini || !fim) return null;
    const [yi, mi, di] = ini.split('-').map(Number);
    const [yf, mf, df] = fim.split('-').map(Number);
    const dtIni = new Date(yi, mi - 1, di, 0, 0, 0);
    const dtFim = new Date(yf, mf - 1, df, 23, 59, 59);
    jira  = jira.filter(r  => { const d = parseBrDate(r.criado); return d && d >= dtIni && d <= dtFim; });
    multi = multi.filter(r => { const d = parseBrDate(r.data);   return d && d >= dtIni && d <= dtFim; });
    const fmt = s => s.split('-').reverse().join('/');
    label = `${fmt(ini)} – ${fmt(fim)}`;
  }

  // Aplica filtro de origem
  if (origem === 'jira')  { multi = []; }
  if (origem === 'multi') { jira  = []; }

  return { jira, multi, label };
}

/**
 * Formata variação percentual entre dois números.
 * Retorna { text, cssClass }
 */
function formatVariacao(valA, valB) {
  if (valA === null || valB === null) return { text: 'N/A', cssClass: 'comp-delta-neutral' };
  if (valA === 0 && valB === 0)      return { text: '=',   cssClass: 'comp-delta-neutral' };
  if (valA === 0) return { text: '↑ novo', cssClass: 'comp-delta-up' };
  const pct  = ((valB - valA) / valA) * 100;
  const sign = pct > 0 ? '↑' : pct < 0 ? '↓' : '=';
  const cls  = pct > 0 ? 'comp-delta-up' : pct < 0 ? 'comp-delta-down' : 'comp-delta-neutral';
  return { text: `${sign} ${Math.abs(pct).toFixed(1)}%`, cssClass: cls };
}

/**
 * Formata diferença absoluta entre dois valores numéricos.
 */
function formatDeltaAbs(valA, valB, formatFn) {
  if (valA === null && valB === null) return 'N/A';
  const a = valA ?? 0;
  const b = valB ?? 0;
  const diff = b - a;
  const sign = diff > 0 ? '+' : '';
  return formatFn ? `${sign}${formatFn(diff)}` : `${sign}${diff}`;
}

/**
 * Constrói um card de comparação e insere no grid.
 */
function criarCompCard(label, valA, valB, formatFn, gridEl, delay) {
  const fA    = formatFn ? formatFn(valA) : (valA !== null ? String(valA) : '—');
  const fB    = formatFn ? formatFn(valB) : (valB !== null ? String(valB) : '—');
  const delta = formatVariacao(valA, valB);
  const deltaAbs = formatDeltaAbs(valA, valB, formatFn);

  const card = document.createElement('div');
  card.className = 'comp-card';
  card.style.animationDelay = `${delay}s`;
  card.innerHTML = `
    <div class="comp-card-label">${label}</div>
    <div class="comp-card-row">
      <span>Período A</span>
      <strong>${fA}</strong>
    </div>
    <div class="comp-card-row">
      <span>Período B</span>
      <strong>${fB}</strong>
    </div>
    <div class="comp-card-delta">
      <span>Variação (Δ): ${deltaAbs}</span>
      <span class="comp-delta-val ${delta.cssClass}">${delta.text}</span>
    </div>
  `;
  gridEl.appendChild(card);
}

function executarComparacao() {
  const dadosA = getDadosComparacao('A');
  const dadosB = getDadosComparacao('B');

  if (!dadosA) { alert('Configure o Período A para comparar.'); return; }
  if (!dadosB) { alert('Configure o Período B para comparar.'); return; }

  const panel = document.getElementById('compResultPanel');
  const grid  = document.getElementById('compResultGrid');

  // Atualiza labels
  document.getElementById('compLabelA').textContent = dadosA.label || 'Período A';
  document.getElementById('compLabelB').textContent = dadosB.label || 'Período B';

  // Limpa e reconstrói os cards
  grid.innerHTML = '';

  const { jira: jA, multi: mA } = dadosA;
  const { jira: jB, multi: mB } = dadosB;

  // ---- Métricas Jira ----
  if (origemFiltroValue !== 'multi') {
    // Chamados
    criarCompCard('Chamados Jira', jA.length, jB.length, null, grid, 0.05);

    // Concluídos
    const concA = jA.filter(t => t.status === 'Concluido').length;
    const concB = jB.filter(t => t.status === 'Concluido').length;
    criarCompCard('Concluídos Jira', concA, concB, null, grid, 0.10);

    // Média de SLA (tempo de atendimento)
    const slaA = jA.filter(t => t.sla !== null && t.sla !== undefined);
    const slaB = jB.filter(t => t.sla !== null && t.sla !== undefined);
    const slaMediaA = slaA.length ? Math.round(slaA.reduce((a, t) => a + t.sla, 0) / slaA.length) : null;
    const slaMediaB = slaB.length ? Math.round(slaB.reduce((a, t) => a + t.sla, 0) / slaB.length) : null;
    criarCompCard('Média SLA Jira', slaMediaA, slaMediaB, v => v !== null ? formatMinutesAsDuration(v) : '—', grid, 0.15);
  }

  // ---- Métricas Multi ----
  if (origemFiltroValue !== 'jira') {
    // Atendimentos
    criarCompCard('Atendimentos Multi', mA.length, mB.length, null, grid, 0.20);

    // Satisfação média (recalculado a partir dos registros válidos)
    const notasA = mA.filter(m => m.avaliacao !== null && m.avaliacao !== undefined);
    const notasB = mB.filter(m => m.avaliacao !== null && m.avaliacao !== undefined);
    const notaMediaA = notasA.length ? parseFloat((notasA.reduce((a, b) => a + b.avaliacao, 0) / notasA.length).toFixed(2)) : null;
    const notaMediaB = notasB.length ? parseFloat((notasB.reduce((a, b) => a + b.avaliacao, 0) / notasB.length).toFixed(2)) : null;
    criarCompCard('Satisfação Média Multi', notaMediaA, notaMediaB, v => v !== null ? v.toFixed(1) : '—', grid, 0.25);

    // Tempo médio Multi (recalculado a partir dos registros válidos)
    const temposA = mA.map(m => calcTempoAtendimentoMin(m.data, m.dataFinalizacao)).filter(v => v !== null);
    const temposB = mB.map(m => calcTempoAtendimentoMin(m.data, m.dataFinalizacao)).filter(v => v !== null);
    const tempoMedioA = temposA.length ? Math.round(temposA.reduce((a, b) => a + b, 0) / temposA.length) : null;
    const tempoMedioB = temposB.length ? Math.round(temposB.reduce((a, b) => a + b, 0) / temposB.length) : null;
    criarCompCard('Tempo Médio Multi', tempoMedioA, tempoMedioB, v => v !== null ? formatMinutesAsDuration(v) : '—', grid, 0.30);
  }

  // Exibe o painel com animação slideUp
  panel.style.display = 'block';
  panel.style.opacity = '0';
  panel.style.transform = 'translateY(10px)';
  requestAnimationFrame(() => {
    panel.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    panel.style.opacity    = '1';
    panel.style.transform  = 'translateY(0)';
  });
  setTimeout(() => {
    panel.style.transition = '';
  }, 360);

  // Fecha a barra lateral em mobile para dar espaço
  if (window.innerWidth <= 900) setSidebarState(false);
}

document.getElementById('btnComparar').addEventListener('click', executarComparacao);

// Fecha painel de comparação
document.getElementById('compCloseBtn').addEventListener('click', () => {
  const panel = document.getElementById('compResultPanel');
  panel.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  panel.style.opacity    = '0';
  panel.style.transform  = 'translateY(8px)';
  setTimeout(() => {
    panel.style.display    = 'none';
    panel.style.transition = '';
    panel.style.transform  = '';
  }, 260);
});

/* ==========================================================
   RESIZE
   ========================================================== */

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    renderDashboard(_currentJira, _currentMulti);
    // Em desktop ao expandir a janela, garante sidebar visível
    if (window.innerWidth > 900 && !sidebarOpen) {
      // Não força — respeita a escolha do usuário
    }
    if (window.innerWidth > 900) {
      sidebarOverlay.classList.remove('is-visible');
    }
  }, 150);
});

/* ==========================================================
   INICIALIZAÇÃO
   ========================================================== */

atualizarModoFiltro();
aplicarFiltro();
