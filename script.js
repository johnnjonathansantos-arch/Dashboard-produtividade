/* =========================================================
   Painel SAC — lógica de dados e renderização reativa
   Depende de: data.js (jiraData, multiData)
   Gráficos em <canvas> puro (sem bibliotecas externas).
   ========================================================= */

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
   ========================================================== */

const LS_KEY_JIRA  = 'sac_importedJira';
const LS_KEY_MULTI = 'sac_importedMulti';

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

function salvarDadosImportados() {
  try {
    localStorage.setItem(LS_KEY_JIRA,  JSON.stringify(_importedJira));
    localStorage.setItem(LS_KEY_MULTI, JSON.stringify(_importedMulti));
  } catch (e) {
    console.warn('[localStorage] Falha ao salvar dados importados:', e);
  }
}

let _importedJira  = [];
let _importedMulti = [];

carregarDadosImportados();

function getAllJira()  { return [...jiraData,  ..._importedJira]; }
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

function calcTempoAtendimentoMin(dataInicio, dataFim) {
  const d1 = parseBrDate(dataInicio);
  const d2 = parseBrDate(dataFim);
  if (!d1 || !d2) return null;
  const diff = Math.round((d2 - d1) / 60000);
  return diff >= 0 ? diff : null;
}

function isMobile() { return window.innerWidth <= 640; }

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
   CANVAS HELPERS
   ========================================================== */

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
   TOOLTIP HELPER — gráficos principais (canvas puro)
   ========================================================== */

let _floatTooltip = null;

function _getFloatTooltip() {
  if (!_floatTooltip) {
    _floatTooltip = document.createElement('div');
    _floatTooltip.className = 'chart-tooltip-float';
    _floatTooltip.style.display = 'none';
    document.body.appendChild(_floatTooltip);
  }
  return _floatTooltip;
}

function _posicionarTooltip(tip, cx, cy) {
  const off = 14, tw = tip.offsetWidth || 180, th = tip.offsetHeight || 60;
  let left = cx + off, top = cy - th / 2;
  if (left + tw > window.innerWidth  - 8) left = cx - tw - off;
  if (top < 8)                             top  = 8;
  if (top + th > window.innerHeight - 8)   top  = window.innerHeight - th - 8;
  tip.style.left = left + 'px';
  tip.style.top  = top  + 'px';
}

function _esconderTooltip() {
  if (_floatTooltip) _floatTooltip.style.display = 'none';
}

/**
 * Registra (ou substitui) os listeners de tooltip num canvas de gráfico principal.
 * @param {HTMLCanvasElement} canvas
 * @param {Function} hitFn — recebe (mx, my) em coords do canvas (DPR-scaled) e
 *   retorna {label, value, color} ou null.
 */
function _setupChartTooltip(canvas, hitFn) {
  if (canvas._tooltipMouseMove)  canvas.removeEventListener('mousemove',  canvas._tooltipMouseMove);
  if (canvas._tooltipMouseLeave) canvas.removeEventListener('mouseleave', canvas._tooltipMouseLeave);

  const onMove = e => {
    const rect = canvas.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    const mx   = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const my   = (e.clientY - rect.top)  * (canvas.height / rect.height);
    const hit  = hitFn(mx, my);
    const tip  = _getFloatTooltip();
    if (!hit) { tip.style.display = 'none'; return; }
    tip.innerHTML = `
      <div class="tt-label">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${hit.color};margin-right:5px;vertical-align:middle;"></span>
        ${hit.label}
      </div>
      <div class="tt-value">${hit.value}</div>`;
    tip.style.display = 'block';
    _posicionarTooltip(tip, e.clientX, e.clientY);
  };
  const onLeave = () => _esconderTooltip();

  canvas._tooltipMouseMove  = onMove;
  canvas._tooltipMouseLeave = onLeave;
  canvas.addEventListener('mousemove',  onMove);
  canvas.addEventListener('mouseleave', onLeave);
}

/* ==========================================================
   GRÁFICOS PRINCIPAIS
   ========================================================== */

function drawDonutChart(canvasId, segments) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const cssHeight = isMobile() ? 150 : 190;
  const { ctx, width, height } = setupCanvas(canvas, cssHeight);
  const total = segments.reduce((a, s) => a + s.value, 0);

  if (total === 0) {
    ctx.fillStyle = COLORS.mute; ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Sem dados para o período', width / 2, height / 2);
    canvas._hitZones = []; return;
  }

  const radius    = Math.min(height, width * 0.42) / 2 - 4;
  const cx        = radius + 8;
  const cy        = height / 2;
  const lineWidth = radius * 0.42;
  let startAngle  = -Math.PI / 2;

  const hitZones = [];
  segments.forEach(seg => {
    const angle = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - lineWidth / 2, startAngle, startAngle + angle);
    ctx.strokeStyle = seg.color; ctx.lineWidth = lineWidth;
    ctx.lineCap = segments.length > 1 ? 'butt' : 'round';
    ctx.stroke();
    hitZones.push({ cx, cy, r1: radius - lineWidth, r2: radius, aStart: startAngle, aEnd: startAngle + angle, label: seg.label, value: seg.value, total, color: seg.color });
    startAngle += angle;
  });
  canvas._hitZones = hitZones;

  ctx.fillStyle = COLORS.ink;
  ctx.font = `600 20px ${FONT.replace('Inter', 'Space Grotesk')}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(total), cx, cy - 6);
  ctx.fillStyle = COLORS.mute; ctx.font = `10px ${FONT}`;
  ctx.fillText('total', cx, cy + 12);

  const legendX = cx + radius + 22;
  const rowH    = Math.min(22, (height - 8) / segments.length);
  let y         = (height - rowH * segments.length) / 2 + rowH / 2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';

  segments.forEach(seg => {
    ctx.fillStyle = seg.color;
    ctx.beginPath(); ctx.arc(legendX, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.ink; ctx.font = `500 11.5px ${FONT}`;
    const pct   = ((seg.value / total) * 100).toFixed(0);
    const label = truncateText(ctx, seg.label, width - legendX - 46);
    ctx.fillText(label, legendX + 12, y);
    ctx.fillStyle = COLORS.mute; ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${seg.value} · ${pct}%`, width - 2, y);
    ctx.textAlign = 'left';
    y += rowH;
  });

  _setupChartTooltip(canvas, (mx, my) => {
    const dpr = window.devicePixelRatio || 1;
    const px = mx / dpr, py = my / dpr;
    for (const z of (canvas._hitZones || [])) {
      const dist  = Math.hypot(px - z.cx, py - z.cy);
      const angle = Math.atan2(py - z.cy, px - z.cx);
      const norm  = ((angle - (-Math.PI / 2)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const aS    = ((z.aStart - (-Math.PI / 2)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const aE    = ((z.aEnd   - (-Math.PI / 2)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const inArc = aE > aS ? norm >= aS && norm <= aE : norm >= aS || norm <= aE;
      if (dist >= z.r1 && dist <= z.r2 && inArc) {
        const pct = ((z.value / z.total) * 100).toFixed(1);
        return { label: z.label, value: `${z.value} (${pct}%)`, color: z.color };
      }
    }
    return null;
  });
}

function drawHBarChart(canvasId, items, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const scrollContainer = canvas.parentElement;
  const panel           = scrollContainer ? scrollContainer.parentElement : canvas.parentElement;

  if (items.length === 0) {
    const dpr = window.devicePixelRatio || 1;
    const ps  = getComputedStyle(panel);
    const padX = (parseFloat(ps.paddingLeft) || 0) + (parseFloat(ps.paddingRight) || 0);
    const cssWidth = panel.clientWidth - padX;
    canvas.style.width  = cssWidth + 'px'; canvas.style.height = '40px';
    canvas.width  = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(40 * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssWidth, 40);
    ctx.fillStyle = COLORS.mute; ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Sem dados para o período', cssWidth / 2, 20);
    return;
  }

  const rowH      = isMobile() ? 22 : 26;
  const cssHeight = items.length * rowH + 10;
  const dpr       = window.devicePixelRatio || 1;
  const ps        = getComputedStyle(panel);
  const padX      = (parseFloat(ps.paddingLeft) || 0) + (parseFloat(ps.paddingRight) || 0);
  const cssWidth  = panel.clientWidth - padX;

  canvas.style.width  = cssWidth + 'px'; canvas.style.height = cssHeight + 'px';
  canvas.width  = Math.max(1, Math.round(cssWidth * dpr));
  canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, cssWidth, cssHeight);

  const maxVal  = Math.max(...items.map(i => i.value));
  const labelW  = Math.min(cssWidth * 0.42, 190);
  const barAreaW = cssWidth - labelW - 46;
  const barX    = labelW;

  ctx.textBaseline = 'middle';
  items.forEach((item, i) => {
    const y    = i * rowH + rowH / 2 + 4;
    const barW = Math.max(3, (item.value / maxVal) * barAreaW);
    ctx.fillStyle = COLORS.ink; ctx.font = `12px ${FONT}`; ctx.textAlign = 'left';
    const label = truncateText(ctx, item.label, labelW - 10);
    ctx.fillText(label, 0, y);
    roundRect(ctx, barX, y - 7, barW, 14, 5);
    ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = COLORS.mute; ctx.font = `11px ${FONT}`;
    ctx.fillText(String(item.value), barX + barW + 8, y);
  });

  _setupChartTooltip(canvas, (mx, my) => {
    const dpr = window.devicePixelRatio || 1;
    const px  = mx / dpr, py = my / dpr;
    for (let i = 0; i < items.length; i++) {
      const yBar = i * rowH + rowH / 2 + 4;
      const bW   = Math.max(3, (items[i].value / maxVal) * barAreaW);
      if (px >= barX && px <= barX + bW && py >= yBar - 7 && py <= yBar + 7)
        return { label: items[i].label, value: String(items[i].value), color };
    }
    return null;
  });
}

function drawVBarChart(canvasId, items) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const cssHeight = isMobile() ? 150 : 190;
  const { ctx, width, height } = setupCanvas(canvas, cssHeight);

  if (items.length === 0) {
    ctx.fillStyle = COLORS.mute; ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
    ctx.fillStyle = item.color; ctx.fill();
    ctx.fillStyle = COLORS.ink; ctx.font = `600 12px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(String(item.value), x + barW / 2, y - 5);
    ctx.fillStyle = COLORS.mute; ctx.font = `11px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.fillText(item.label, x + barW / 2, padTop + chartH + 6);
  });

  _setupChartTooltip(canvas, (mx, my) => {
    const dpr = window.devicePixelRatio || 1;
    const px  = mx / dpr, py = my / dpr;
    for (let i = 0; i < items.length; i++) {
      const x    = startX + i * (barW + gap);
      const barH = (items[i].value / maxVal) * chartH;
      const y    = padTop + (chartH - barH);
      if (px >= x && px <= x + barW && py >= y && py <= y + barH)
        return { label: items[i].label, value: String(items[i].value), color: items[i].color };
    }
    return null;
  });
}

/* ==========================================================
   ANIMAÇÕES
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
    element.textContent = isFloat ? (numericTarget * ease).toFixed(1) : Math.floor(numericTarget * ease);
    if (progress < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

function animateValueUpdate(elementId, newValue) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = newValue; return; }
  el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  el.style.opacity = '0'; el.style.transform = 'translateY(4px)';
  setTimeout(() => { el.textContent = newValue; el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, 200);
}

function animateTableUpdate(tableId, updateFn) {
  const wrap = document.querySelector(`#${tableId}`)?.closest('.table-scroll');
  if (!wrap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { updateFn(); return; }
  wrap.style.opacity = '0';
  setTimeout(() => { updateFn(); wrap.style.opacity = '1'; }, 180);
}

/* ==========================================================
   ESTADOS DOS FILTROS
   ========================================================== */

let jiraClienteFiltroValue  = 'all';
let jiraTipoFiltroValue     = 'all';
let jiraPrioFiltroValue     = 'all';
let multiClienteFiltroValue = 'all';
let multiMotivoFiltroValue  = 'all';
let multiNotaFiltroValue    = 'all';

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
   RENDER DASHBOARD
   ========================================================== */

function renderDashboard(jira, multi) {
  const jiraConcluidos = jira.filter(t => t.status === 'Concluido');
  const jiraSlaValidos  = jira.filter(t => typeof t.sla === 'number' && t.sla >= 0);
  const jiraSlaMedioMin = jiraSlaValidos.length
    ? jiraSlaValidos.reduce((a, t) => a + t.sla, 0) / jiraSlaValidos.length : null;

  const multiTemposValidos = multi
    .map(m => calcTempoAtendimentoMin(m.data, m.dataFinalizacao))
    .filter(v => v !== null && v >= 0);
  const tempoMedioMultiMin = multiTemposValidos.length
    ? multiTemposValidos.reduce((a, b) => a + b, 0) / multiTemposValidos.length : null;

  const multiComNota = multi.filter(m => m.avaliacao !== null && m.avaliacao !== undefined && !isNaN(m.avaliacao));
  const notaMedia = multiComNota.length
    ? multiComNota.reduce((a, b) => a + b.avaliacao, 0) / multiComNota.length : null;

  animateValueUpdate('kpiMultiNota', notaMedia !== null ? notaMedia.toFixed(1) : '—');
  animateValueUpdate('kpiJiraSlaMedio', jiraSlaValidos.length ? formatMinutesAsDuration(Math.round(jiraSlaMedioMin)) : '—');
  animateValueUpdate('statTempoMedio', formatMinutesAsDuration(tempoMedioMultiMin));
  animateValueUpdate('statNotaMin', multiComNota.length ? Math.min(...multiComNota.map(m => m.avaliacao)).toFixed(0) : '—');

  /* Média de atendimentos por dia no Multi:
     conta os dias únicos com ao menos um atendimento e divide o total */
  const diasUnicos = new Set(
    multi
      .map(m => { const d = parseBrDate(m.data); return d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : null; })
      .filter(Boolean)
  ).size;
  const mediaPorDia = diasUnicos > 0 ? (multi.length / diasUnicos).toFixed(1) : '—';
  animateValueUpdate('statMediaPorDia', mediaPorDia);

  animateCounter('kpiJiraTotal',        jira.length,           900);
  animateCounter('kpiJiraConcluido',    jiraConcluidos.length, 900);
  animateCounter('kpiMultiTotal',       multi.length,          900);
  animateCounter('statTotalAvaliacoes', multiComNota.length,   900);
  animateCounter('statNota10', multiComNota.filter(m => m.avaliacao === 10).length, 900);

  const statusColorMap = {
    'Concluido':       '#0E8F82',  // teal (mantido — indica sucesso)
    'Aguarda Externo': '#2F5AA8',  // azul secundário apLIS
    'Aguarda Dev':     '#FFC400',  // dourado apLIS
    'Cancelado':       COLORS.rose,
    'Em Análise':      '#8A6100'   // dourado escuro apLIS
  };
  const statusSegments = sortEntriesDesc(countBy(jira, t => t.status))
    .map(([label, value]) => ({ label, value, color: statusColorMap[label] || COLORS.mute }));
  const classeColorMap = { A: '#123877', B: '#FFC400', C: COLORS.mute };  // A=azul-marinho, B=dourado, C=neutro
  const classeSegments = sortEntriesDesc(countBy(jira, t => t.classe))
    .map(([label, value]) => ({ label: `Classe ${label}`, value, color: classeColorMap[label] || COLORS.mute }));
  const clienteItems = sortEntriesDesc(countBy(jira, t => t.cliente)).map(([label, value]) => ({ label, value }));
  const motivoItems  = sortEntriesDesc(countBy(multi, m => m.motivo)).map(([label, value]) => ({ label, value }));
  const notaCounts   = countBy(multiComNota, m => m.avaliacao.toFixed(0));
  const notaItems    = Object.keys(notaCounts).sort((a, b) => a - b).map(n => ({
    label: `Nota ${n}`, value: notaCounts[n],
    color: +n >= 9 ? '#123877' : +n >= 7 ? '#2F5AA8' : '#FFC400'  // azul apLIS para boas notas, dourado para baixas
  }));

  drawDonutChart('statusChart', statusSegments);
  drawDonutChart('classeChart', classeSegments);
  drawHBarChart('clienteChart', clienteItems, '#FFC400');  // dourado apLIS
  drawHBarChart('motivoChart',  motivoItems,  '#123877');  // azul-marinho apLIS
  drawVBarChart('notaChart',    notaItems);

  rebuildJiraFilters(jira);
  renderJiraTable(jira);
  rebuildMultiFilters(multi);
  renderMultiTable(multi);
}

/* ==========================================================
   TABELAS
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
    let lista = jiraFiltrado.slice().sort((a, b) => (parseBrDate(b.criado) || 0) - (parseBrDate(a.criado) || 0));
    if (jiraClienteFiltroValue !== 'all') lista = lista.filter(t => t.cliente === jiraClienteFiltroValue);
    if (jiraTipoFiltroValue    !== 'all') lista = lista.filter(t => t.tipo    === jiraTipoFiltroValue);
    if (jiraPrioFiltroValue    !== 'all') lista = lista.filter(t => t.classe  === jiraPrioFiltroValue);
    if (lista.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="7" style="text-align:center;color:var(--mute);padding:20px;">Sem registros para o período selecionado</td>`;
      tbody.appendChild(tr); return;
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
        <td class="mono">${t.tempo}</td>`;
      tbody.appendChild(tr);
    });
  });
}

function rebuildJiraFilters(jiraFiltrado) {
  const clientes = [...new Set(jiraFiltrado.map(t => t.cliente))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const tipos    = [...new Set(jiraFiltrado.map(t => t.tipo))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const prios    = [...new Set(jiraFiltrado.map(t => t.classe))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const buildSelect = (id, optionsArr, labelFn) => {
    const sel = document.getElementById(id); if (!sel) return;
    const prevVal = sel.value; sel.innerHTML = '';
    const all = document.createElement('option'); all.value = 'all'; all.textContent = sel.dataset.placeholder || 'Todos';
    sel.appendChild(all);
    optionsArr.forEach(v => { const opt = document.createElement('option'); opt.value = v; opt.textContent = labelFn ? labelFn(v) : v; sel.appendChild(opt); });
    sel.value = optionsArr.includes(prevVal) ? prevVal : 'all';
  };
  buildSelect('jiraClienteFiltro', clientes);
  buildSelect('jiraTipoFiltro',    tipos);
  buildSelect('jiraPrioFiltro',    prios, v => `Prioridade ${v}`);
  jiraClienteFiltroValue = document.getElementById('jiraClienteFiltro').value;
  jiraTipoFiltroValue    = document.getElementById('jiraTipoFiltro').value;
  jiraPrioFiltroValue    = document.getElementById('jiraPrioFiltro').value;
}

function extrairClienteMulti(nome) {
  if (!nome) return 'Não identificado';
  return (nome.split(/\s*-\s*/)[0] || 'Não identificado').trim();
}

function renderMultiTable(multiFiltrado) {
  animateTableUpdate('multiTable', () => {
    const tbody = document.querySelector('#multiTable tbody');
    tbody.innerHTML = '';
    let lista = multiFiltrado.slice().sort((a, b) => (parseBrDate(b.data) || 0) - (parseBrDate(a.data) || 0));
    if (multiClienteFiltroValue !== 'all') lista = lista.filter(m => extrairClienteMulti(m.nome) === multiClienteFiltroValue);
    if (multiMotivoFiltroValue  !== 'all') lista = lista.filter(m => m.motivo === multiMotivoFiltroValue);
    if (multiNotaFiltroValue    !== 'all') {
      if (multiNotaFiltroValue === 'sem-nota') lista = lista.filter(m => m.avaliacao === null || m.avaliacao === undefined);
      else lista = lista.filter(m => m.avaliacao !== null && m.avaliacao !== undefined && m.avaliacao.toString() === multiNotaFiltroValue);
    }
    if (lista.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" style="text-align:center;color:var(--mute);padding:20px;">Sem registros para o período selecionado</td>`;
      tbody.appendChild(tr); return;
    }
    lista.forEach((m, index) => {
      const tr = document.createElement('tr');
      tr.style.animationDelay = `${index * 0.03}s`;
      tr.className = 'table-row-animate';
      let notaHtml = '<span class="nota-vazia">—</span>';
      if (m.avaliacao !== null && m.avaliacao !== undefined)
        notaHtml = `<span class="${m.avaliacao >= 9 ? 'nota-alta' : 'nota-baixa'}">${m.avaliacao.toFixed(1)}</span>`;
      tr.innerHTML = `
        <td class="mono">${m.protocolo}</td>
        <td>${m.nome || '<span style="color:var(--mute)">—</span>'}</td>
        <td>${m.motivo}</td>
        <td class="mono">${m.data}</td>
        <td>${notaHtml}</td>`;
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
    const sel = document.getElementById(id); if (!sel) return;
    const prevVal = sel.value; sel.innerHTML = '';
    const all = document.createElement('option'); all.value = 'all'; all.textContent = sel.dataset.placeholder || 'Todos';
    sel.appendChild(all);
    optionsArr.forEach(v => { const opt = document.createElement('option'); opt.value = v; opt.textContent = labelFn ? labelFn(v) : v; sel.appendChild(opt); });
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

document.getElementById('jiraClienteFiltro').addEventListener('change', e => { jiraClienteFiltroValue = e.target.value; renderJiraTable(_currentJira); });
document.getElementById('jiraTipoFiltro').addEventListener('change',    e => { jiraTipoFiltroValue    = e.target.value; renderJiraTable(_currentJira); });
document.getElementById('jiraPrioFiltro').addEventListener('change',    e => { jiraPrioFiltroValue    = e.target.value; renderJiraTable(_currentJira); });
document.getElementById('multiClienteFiltro').addEventListener('change', e => { multiClienteFiltroValue = e.target.value; renderMultiTable(_currentMulti); });
document.getElementById('multiMotivoFiltro').addEventListener('change',  e => { multiMotivoFiltroValue  = e.target.value; renderMultiTable(_currentMulti); });
document.getElementById('multiNotaFiltro').addEventListener('change',    e => { multiNotaFiltroValue    = e.target.value; renderMultiTable(_currentMulti); });

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

function popularSelectMeses(selectId, valorPadrao) {
  const sel = document.getElementById(selectId); if (!sel) return;
  const prevVal = sel.value; sel.innerHTML = '';
  getMesesDisponiveis().forEach(am => {
    const opt = document.createElement('option'); opt.value = am; opt.textContent = labelMes(am); sel.appendChild(opt);
  });
  if (prevVal && [...sel.options].some(o => o.value === prevVal)) sel.value = prevVal;
  else if (valorPadrao && [...sel.options].some(o => o.value === valorPadrao)) sel.value = valorPadrao;
  else if (sel.options.length > 0) sel.value = sel.options[sel.options.length - 1].value;
}

const mesesDisp = getMesesDisponiveis();
popularSelectMeses('periodoMes', mesesDisp[mesesDisp.length - 1]);
popularSelectMeses('compMesA',   mesesDisp.length >= 2 ? mesesDisp[mesesDisp.length - 2] : mesesDisp[0]);
popularSelectMeses('compMesB',   mesesDisp[mesesDisp.length - 1]);

function popularImportMeses() {
  const sel = document.getElementById('importMesRef'); if (!sel) return;
  const prevVal = sel.value;
  while (sel.options.length > 1) sel.remove(1);
  getMesesDisponiveis().forEach(am => {
    const opt = document.createElement('option'); opt.value = am; opt.textContent = labelMes(am); sel.appendChild(opt);
  });
  if (prevVal && [...sel.options].some(o => o.value === prevVal)) sel.value = prevVal;
}
popularImportMeses();

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
  jiraClienteFiltroValue  = 'all'; jiraTipoFiltroValue     = 'all'; jiraPrioFiltroValue     = 'all';
  multiClienteFiltroValue = 'all'; multiMotivoFiltroValue  = 'all'; multiNotaFiltroValue    = 'all';
  atualizarVisibilidadeOrigem();
  atualizarFooter(modo);
  renderDashboard(jira, multi);
}

function atualizarFooter(modo) {
  const footer = document.querySelector('.footer span');
  const topbar = document.getElementById('topbarPeriodo');
  let label = '';
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
  if (modo === 'intervalo') document.getElementById('filtroIntervaloWrap').style.flexDirection = 'column';
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
  radio.addEventListener('change', () => { origemFiltroValue = radio.value; aplicarFiltro(); });
});
document.getElementById('periodoInicio').addEventListener('change', validarEAplicarIntervalo);
document.getElementById('periodoFim').addEventListener('change',    validarEAplicarIntervalo);

function validarEAplicarIntervalo() {
  const ini = document.getElementById('periodoInicio').value;
  const fim = document.getElementById('periodoFim').value;
  const err = document.getElementById('periodoErro');
  if (!ini || !fim) return;
  if (ini > fim) { err.textContent = 'A data inicial não pode ser posterior à data final.'; err.style.display = 'block'; return; }
  err.style.display = 'none'; aplicarFiltro();
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
   BARRA LATERAL
   ========================================================== */

const sidebar        = document.getElementById('sidebar');
const sidebarToggle  = document.getElementById('sidebarToggle');
const sidebarClose   = document.getElementById('sidebarClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');

let sidebarOpen = true;

function setSidebarState(open) {
  sidebarOpen = open;
  if (open) {
    sidebar.classList.remove('is-collapsed');
    sidebarOverlay.classList.add('is-visible');
    sidebarToggle.classList.add('is-active');
    sidebarToggle.setAttribute('aria-expanded', 'true');
    sidebar.removeAttribute('aria-hidden');
    if (window.innerWidth > 900) sidebarOverlay.classList.remove('is-visible');
  } else {
    sidebar.classList.add('is-collapsed');
    sidebarOverlay.classList.remove('is-visible');
    sidebarToggle.classList.remove('is-active');
    sidebarToggle.setAttribute('aria-expanded', 'false');
    sidebar.setAttribute('aria-hidden', 'true');
  }
  setTimeout(() => renderDashboard(_currentJira, _currentMulti), 340);
}

sidebarToggle.addEventListener('click', () => setSidebarState(!sidebarOpen));
sidebarClose.addEventListener('click',  () => setSidebarState(false));
sidebarOverlay.addEventListener('click', () => setSidebarState(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sidebarOpen) setSidebarState(false); });

function setupSidebarToggle(toggleId, panelId) {
  const toggle = document.getElementById(toggleId);
  const panel  = document.getElementById(panelId);
  if (!toggle || !panel) return;
  toggle.addEventListener('click', () => {
    const isOpen = toggle.classList.contains('is-open');
    if (isOpen) {
      toggle.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false');
      panel.style.overflow = 'hidden'; panel.style.height = panel.scrollHeight + 'px';
      requestAnimationFrame(() => { panel.style.transition = 'height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease'; panel.style.height = '0'; panel.style.opacity = '0'; });
      setTimeout(() => { panel.style.display = 'none'; panel.style.height = ''; panel.style.opacity = ''; panel.style.overflow = ''; panel.style.transition = ''; }, 290);
    } else {
      toggle.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true');
      panel.style.display = 'block'; panel.style.height = '0'; panel.style.opacity = '0'; panel.style.overflow = 'hidden';
      const targetH = panel.scrollHeight;
      requestAnimationFrame(() => { panel.style.transition = 'height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease'; panel.style.height = targetH + 'px'; panel.style.opacity = '1'; });
      setTimeout(() => { panel.style.height = ''; panel.style.overflow = ''; panel.style.transition = ''; }, 290);
    }
  });
  toggle.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); } });
}

setupSidebarToggle('compToggle',   'compPanel');
setupSidebarToggle('importToggle', 'importPanel');

function setupCompModoToggle() {}
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
  const selAno = document.getElementById('compAno'); if (!selAno) return;
  const anos = getAnosDisponiveis(); const anoAtual = parseInt(selAno.value, 10) || 0;
  selAno.innerHTML = '';
  anos.forEach(a => { const opt = document.createElement('option'); opt.value = a; opt.textContent = a; selAno.appendChild(opt); });
  if (anos.includes(anoAtual)) selAno.value = anoAtual;
  else if (anos.length)        selAno.value = anos[anos.length - 1];
  popularGradeMeses();
}

function popularGradeMeses() {
  const grid = document.getElementById('compMesesGrid'); if (!grid) return;
  const ano      = parseInt(document.getElementById('compAno')?.value, 10);
  const comDados = getMesesComDados(ano);
  const marcados = getMesesMarcados();
  const algumMarcado = marcados.size > 0;
  grid.innerHTML = '';
  for (let mo = 1; mo <= 12; mo++) {
    const temDados = comDados.has(mo);
    const estaMarc = temDados && (algumMarcado ? marcados.has(mo) : true);
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
  const ano = parseInt(document.getElementById('compAno')?.value, 10);
  const comDados = getMesesComDados(ano);
  document.querySelectorAll('input[name="compMeses"]').forEach(cb => {
    if (!cb.disabled) cb.checked = comDados.has(parseInt(cb.value, 10));
  });
});

function getDadosMes(ano, mes) {
  return {
    jira:  getAllJira().filter(r  => { const d = parseBrDate(r.criado); return d && d.getFullYear() === ano && (d.getMonth() + 1) === mes; }),
    multi: getAllMulti().filter(r => { const d = parseBrDate(r.data);   return d && d.getFullYear() === ano && (d.getMonth() + 1) === mes; })
  };
}

/* ==========================================================
   MAPA DE CLASSIFICAÇÃO JIRA → MULTI
   ========================================================== */

function _normNome(s) {
  if (!s) return '';
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

let _mapaClasseJira = null;

function getMapaClasseJira() {
  if (_mapaClasseJira) return _mapaClasseJira;
  const contagem = {};
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
  return getMapaClasseJira().get(_normNome(extrairClienteMulti(m.nome))) || null;
}

/* ==========================================================
   ESTADO DOS FILTROS DO COMPARATIVO
   ========================================================== */

const _compIndicador = { jira: 0, multi: 0 };

const _compFiltros = {
  jira:  { classe: 'all', categoria: 'all', sla: 'todos' },
  multi: { classe: 'all', categoria: 'all', sla: 'todos' }
};

function aplicarFiltrosComp(jira, multi) {
  const fj = _compFiltros.jira;
  const fm = _compFiltros.multi;
  let j = jira;
  let m = multi.map(r => ({ ...r, _classe: getClasseMultiRegistro(r) }));
  if (fj.classe !== 'all')    j = j.filter(r => fj.classe === 'sem' ? !r.classe : r.classe === fj.classe);
  if (fj.categoria !== 'all') j = j.filter(r => r.tipo === fj.categoria);
  if (fj.sla === 'com-sla')   j = j.filter(r => typeof r.sla === 'number' && r.sla >= 0);
  if (fj.sla === 'sem-sla')   j = j.filter(r => r.sla === null);
  if (fm.classe !== 'all')    m = m.filter(r => fm.classe === 'sem' ? !r._classe : r._classe === fm.classe);
  if (fm.categoria !== 'all') m = m.filter(r => r.motivo === fm.categoria);
  if (fm.sla === 'com-sla')   m = m.filter(r => calcTempoAtendimentoMin(r.data, r.dataFinalizacao) !== null);
  if (fm.sla === 'sem-sla')   m = m.filter(r => calcTempoAtendimentoMin(r.data, r.dataFinalizacao) === null);
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

/* ==========================================================
   EXECUÇÃO DA COMPARAÇÃO
   ========================================================== */

function executarComparacao() {
  const ano   = parseInt(document.getElementById('compAno')?.value, 10);
  const meses = [...getMesesMarcados()].sort((a, b) => a - b);
  if (!ano || meses.length < 1) { alert('Selecione pelo menos um mês para comparar.'); return; }

  const panel = document.getElementById('compResultPanel');

  /* badges */
  const labelsEl = document.getElementById('compResultLabels');
  if (labelsEl) labelsEl.innerHTML = meses.map(mo => `<span class="comp-mes-badge">${MESES_NOME_CURTO[mo - 1]} ${ano}</span>`).join('');

  /* dados por mês */
  const dadosPorMes = meses.map(mo => {
    const { jira, multi } = getDadosMes(ano, mo);
    const j0 = origemFiltroValue === 'multi' ? [] : jira;
    const m0 = origemFiltroValue === 'jira'  ? [] : multi;
    const { jira: j, multi: m } = aplicarFiltrosComp(j0, m0);
    return { mes: mo, label: MESES_NOME_CURTO[mo - 1], jira: j, multi: m, mJira: calcMetricasJira(j), mMulti: calcMetricasMulti(m) };
  });

  /* exibe o painel ANTES de montar os gráficos, para que os containers
     tenham dimensões reais quando o canvas for desenhado */
  panel.style.display   = 'block';
  panel.style.opacity   = '0';
  panel.style.transform = 'translateY(10px)';
  requestAnimationFrame(() => {
    panel.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    panel.style.opacity    = '1';
    panel.style.transform  = 'translateY(0)';
  });
  setTimeout(() => { panel.style.transition = ''; }, 360);

  /* --- seção Jira: cards + gráfico --- */
  const secJira = document.getElementById('compSecaoJira');
  if (origemFiltroValue !== 'multi' && secJira) {
    secJira.style.display = 'block';
    const gridJira = document.getElementById('compResultGridJira');
    if (gridJira) {
      gridJira.innerHTML = '';
      criarCompCardMultiMes('Chamados Jira',   dadosPorMes.map(d => ({ label: d.label, val: d.mJira.chamados })),   null, gridJira, 0.05);
      criarCompCardMultiMes('Concluídos Jira', dadosPorMes.map(d => ({ label: d.label, val: d.mJira.concluidos })), null, gridJira, 0.10);
      criarCompCardMultiMes('Média SLA Jira',  dadosPorMes.map(d => ({ label: d.label, val: d.mJira.slaMedio })),   v => v !== null ? formatMinutesAsDuration(v) : '—', gridJira, 0.15);
    }
    montarGraficoComparativo('compBlocoJira', dadosPorMes.map(d => d.label), [
      { nome: 'Chamados',   unidade: 'count',   formatFn: null,                                               valores: dadosPorMes.map(d => d.mJira.chamados)   },
      { nome: 'Concluídos', unidade: 'count',   formatFn: null,                                               valores: dadosPorMes.map(d => d.mJira.concluidos) },
      { nome: 'Média SLA',  unidade: 'minutos', formatFn: v => v !== null ? formatMinutesAsDuration(v) : '—', valores: dadosPorMes.map(d => d.mJira.slaMedio)   }
    ], dadosPorMes, 'jira');
  } else if (secJira) { secJira.style.display = 'none'; }

  /* --- seção Multi: cards + gráfico --- */
  const secMulti = document.getElementById('compSecaoMulti');
  if (origemFiltroValue !== 'jira' && secMulti) {
    secMulti.style.display = 'block';
    const gridMulti = document.getElementById('compResultGridMulti');
    if (gridMulti) {
      gridMulti.innerHTML = '';
      criarCompCardMultiMes('Atendimentos Multi',     dadosPorMes.map(d => ({ label: d.label, val: d.mMulti.atendimentos })), null, gridMulti, 0.20);
      criarCompCardMultiMes('Satisfação Média Multi', dadosPorMes.map(d => ({ label: d.label, val: d.mMulti.notaMedia })),    v => v !== null ? v.toFixed(1) : '—', gridMulti, 0.25);
      criarCompCardMultiMes('Tempo Médio Multi',      dadosPorMes.map(d => ({ label: d.label, val: d.mMulti.tempoMedio })),   v => v !== null ? formatMinutesAsDuration(v) : '—', gridMulti, 0.30);
    }
    montarGraficoComparativo('compBlocoMulti', dadosPorMes.map(d => d.label), [
      { nome: 'Atendimentos', unidade: 'count',   formatFn: null,                                               valores: dadosPorMes.map(d => d.mMulti.atendimentos) },
      { nome: 'Nota Média',   unidade: 'nota',    formatFn: v => v !== null ? v.toFixed(1) : '—',               valores: dadosPorMes.map(d => d.mMulti.notaMedia)    },
      { nome: 'Tempo Médio',  unidade: 'minutos', formatFn: v => v !== null ? formatMinutesAsDuration(v) : '—', valores: dadosPorMes.map(d => d.mMulti.tempoMedio)   }
    ], dadosPorMes, 'multi');
  } else if (secMulti) { secMulti.style.display = 'none'; }

  if (window.innerWidth <= 900) setSidebarState(false);
}

document.getElementById('btnComparar').addEventListener('click', executarComparacao);

function criarCompCardMultiMes(labelTitulo, entradas, formatFn, gridEl, delay) {
  const card = document.createElement('div');
  card.className = 'comp-card'; card.style.animationDelay = `${delay}s`;
  let linhas = '';
  entradas.forEach((e, idx) => {
    const fVal = formatFn ? formatFn(e.val) : (e.val !== null ? String(e.val) : '—');
    let pctHTML = '';
    if (idx > 0) {
      const prev = entradas[idx - 1].val;
      if (e.val !== null && prev !== null) {
        if (prev === 0 && e.val !== 0) {
          pctHTML = `<span class="comp-card-pct comp-delta-up">↑ novo</span>`;
        } else if (prev !== 0) {
          const pct  = ((e.val - prev) / prev) * 100;
          const sign = pct > 0 ? '↑' : pct < 0 ? '↓' : '=';
          const cls  = pct > 0 ? 'comp-delta-up' : pct < 0 ? 'comp-delta-down' : 'comp-delta-neutral';
          pctHTML = `<span class="comp-card-pct ${cls}">${sign} ${Math.abs(pct).toFixed(1)}%</span>`;
        }
      }
    }
    linhas += `
      <div class="comp-card-mes-row">
        <span>${e.label}</span>
        <span class="comp-card-mes-val-wrap"><strong>${fVal}</strong>${pctHTML}</span>
      </div>`;
  });
  card.innerHTML = `<div class="comp-card-label">${labelTitulo}</div>${linhas}`;
  gridEl.appendChild(card);
}

/* ==========================================================
   GRÁFICOS COMPARATIVOS — barras verticais por mês
   ========================================================== */

const CORES_MESES = [
  '#123877', // azul-marinho apLIS
  '#FFC400', // dourado apLIS
  '#2F5AA8', // azul secundário apLIS
  '#8A6100', // dourado escuro apLIS
  '#1A4FA0', // azul médio
  '#E6A800', // âmbar escuro
  '#0D2D5E', // azul profundo
  '#FFD84D', // dourado claro
  '#4B7CC8', // azul claro
  '#B38600', // dourado fosco
  '#5C8FD6', // azul suave
  '#CC9200'  // dourado quente
];

/**
 * Popula os filtros inline num elemento já no DOM.
 */
function _popularFiltros(filtrosEl, origem, dadosPorMes) {
  const fState = _compFiltros[origem];
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
          <option value="A"   ${fState.classe==='A'  ?'selected':''}>Classe A</option>
          <option value="B"   ${fState.classe==='B'  ?'selected':''}>Classe B</option>
          <option value="C"   ${fState.classe==='C'  ?'selected':''}>Classe C</option>
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
          <option value="todos"   ${fState.sla==='todos'  ?'selected':''}>Todos</option>
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

function niceTicks(min, max, count) {
  if (!isFinite(min) || !isFinite(max) || min === max) { min = (min || 0) - 1; max = (max || 1) + 1; }
  const range = max - min, step0 = range / count;
  const mag   = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm  = step0 / mag;
  let step = norm < 1.5 ? 1 * mag : norm < 3 ? 2 * mag : norm < 7 ? 5 * mag : 10 * mag;
  const start = Math.floor(min / step) * step, end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step * 1e-6; v += step) ticks.push(Math.round(v / step) * step);
  return ticks;
}

function formatTickY(value, unidade) {
  if (unidade === 'count') return String(Math.round(value));
  if (unidade === 'nota')  return value.toFixed(1);
  if (unidade === 'dia')   return value === 0 ? '0' : (value / 1440).toFixed(1) + 'd';
  if (unidade === 'horas') return value === 0 ? '0' : (value / 60).toFixed(1) + 'h';
  return String(Math.round(value));
}

/**
 * Monta o bloco de gráfico comparativo num container fixo do HTML.
 * O container é limpo e repreenchido a cada chamada — sem mover elementos do DOM.
 */
function montarGraficoComparativo(containerId, labels, series, dadosPorMes, origem) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';   /* limpa sem tocar em outros elementos */

  /* seletor de indicador */
  const idxAtual = _compIndicador[origem] || 0;
  const wrapInd = document.createElement('div');
  wrapInd.className = 'comp-filtros-inline comp-indicador-inline';
  wrapInd.innerHTML = `
    <div class="cfi-wrap">
      <div class="cfi-grupo">
        <span class="cfi-label">Indicador</span>
        <select class="cfi-select" aria-label="Selecionar indicador">
          ${series.map((s, i) => `<option value="${i}" ${i === idxAtual ? 'selected' : ''}>${s.nome}</option>`).join('')}
        </select>
      </div>
    </div>`;
  container.appendChild(wrapInd);

  /* filtros inline */
  const wrapFilt = document.createElement('div');
  wrapFilt.className = 'comp-filtros-inline';
  container.appendChild(wrapFilt);
  _popularFiltros(wrapFilt, origem, dadosPorMes);

  /* canvas */
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  container.appendChild(canvas);

  /* legenda */
  const legend = document.createElement('div');
  legend.className = 'comp-chart-legend';
  container.appendChild(legend);

  const ctx = { canvas, container, legend, origem, dados: { labels, series }, serieIndex: idxAtual, hitZones: [], pontoAtivo: null };

  _atualizarLegendaComp(ctx);
  /* Adia o desenho para garantir que o browser calculou o layout do container
     antes de medir container.clientWidth (evita cssW = 0 / 1). */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => desenharBarrasComparativas(ctx));
  });

  /* troca de indicador — só redesenha, não reexecuta comparação */
  wrapInd.querySelector('select').addEventListener('change', e => {
    ctx.serieIndex = parseInt(e.target.value, 10) || 0;
    _compIndicador[origem] = ctx.serieIndex;
    _atualizarLegendaComp(ctx);
    requestAnimationFrame(() => desenharBarrasComparativas(ctx));
  });

  canvas.addEventListener('mousemove',  e => _hoverBarrasComp(e, ctx));
  canvas.addEventListener('mouseleave', ()  => _esconderTooltip());
  canvas.addEventListener('touchstart', e  => { e.preventDefault(); _hoverBarrasComp(e.touches[0], ctx); }, { passive: false });
  canvas.addEventListener('touchend',   ()  => setTimeout(_esconderTooltip, 2000));

  container._barCtx = ctx;
}

function _atualizarLegendaComp(ctx) {
  if (!ctx.legend) return;
  const serie = ctx.dados.series[ctx.serieIndex];
  if (!serie) { ctx.legend.innerHTML = ''; return; }
  const cor = CORES_MESES[ctx.serieIndex % CORES_MESES.length];
  ctx.legend.innerHTML = `<span class="comp-chart-legend-item"><span class="comp-chart-legend-dot" style="background:${cor}"></span>${serie.nome}</span>`;
}

function desenharBarrasComparativas(ctx) {
  const { canvas, container, dados, serieIndex } = ctx;
  const { labels } = dados;
  const serie = dados.series[serieIndex];
  if (!serie) return;

  const dpr  = window.devicePixelRatio || 1;
  const ps   = getComputedStyle(container);
  const padC = (parseFloat(ps.paddingLeft) || 0) + (parseFloat(ps.paddingRight) || 0);
  // Se clientWidth for 0, o browser ainda não calculou o layout — tenta de novo no próximo frame
  const rawW = container.clientWidth;
  if (rawW === 0) { requestAnimationFrame(() => desenharBarrasComparativas(ctx)); return; }
  const cssW = Math.max(1, rawW - padC);
  const mob  = cssW < 400;
  const n    = labels.length;
  const cssH = mob ? 200 : 260;

  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  canvas.width  = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, cssW, cssH);

  if (!n) {
    c.fillStyle = COLORS.mute; c.font = `12px ${FONT}`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Sem dados para o período', cssW / 2, cssH / 2);
    return;
  }

  const padB = mob ? 40 : 48, padT = mob ? 28 : 34;
  const padL = mob ? 42 : 52, padR = mob ? 12 : 16;
  const cW = cssW - padL - padR, cH = cssH - padT - padB;

  const vals = serie.valores.filter(v => v !== null);
  let yMin = 0, yMax = vals.length ? Math.max(...vals) : 1;
  if (serie.unidade === 'nota')       { yMin = Math.max(0, Math.min(...vals) - 0.5); yMax = Math.min(10, yMax + 0.5); }
  else if (serie.unidade !== 'count') { const span = (yMax - yMin) || 1; yMax += span * 0.1; }
  if (yMax <= yMin) yMax = yMin + 1;

  let unidadeAxis = serie.unidade;
  if (unidadeAxis === 'minutos') unidadeAxis = yMax >= 1440 ? 'dia' : 'horas';

  let ticks = niceTicks(yMin, yMax, mob ? 4 : 5);
  if (serie.unidade === 'count') {
    ticks = [...new Set(ticks.map(t => Math.round(t)))];
    if (ticks.length < 2) ticks = [0, Math.max(1, Math.round(yMax))];
  }
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const yPos = v => hi === lo ? padT + cH / 2 : padT + cH - ((v - lo) / (hi - lo)) * cH;

  c.strokeStyle = COLORS.grid; c.lineWidth = 1; c.setLineDash([3, 5]);
  c.beginPath();
  ticks.forEach(t => { c.moveTo(padL, yPos(t)); c.lineTo(padL + cW, yPos(t)); });
  c.stroke(); c.setLineDash([]);

  c.fillStyle = COLORS.mute; c.font = `${mob ? 9 : 10}px ${FONT}`;
  c.textAlign = 'right'; c.textBaseline = 'middle';
  ticks.forEach(t => c.fillText(formatTickY(t, unidadeAxis), padL - 5, yPos(t)));

  c.strokeStyle = COLORS.grid; c.lineWidth = 1;
  c.beginPath(); c.moveTo(padL, padT + cH); c.lineTo(padL + cW, padT + cH); c.stroke();

  ctx.hitZones = [];
  const gap  = mob ? 6 : 8;
  const barW = Math.min(mob ? 32 : 44, (cW - gap * (n + 1)) / n);
  const totW = barW * n + gap * (n - 1);
  const stX  = padL + (cW - totW) / 2;
  const fmt  = serie.formatFn || (v => v !== null ? String(Math.round(v)) : '—');

  for (let i = 0; i < n; i++) {
    const v   = serie.valores[i];
    const cor = CORES_MESES[i % CORES_MESES.length];
    const x   = stX + i * (barW + gap);
    const yB  = padT + cH;

    if (v === null) {
      c.fillStyle = 'rgba(100,112,140,.10)';
      roundRect(c, x, yB - 4, barW, 4, 3); c.fill();
    } else {
      const bH = Math.max(3, ((v - lo) / (hi - lo)) * cH);
      const yT = yB - bH;
      const gr = c.createLinearGradient(0, yT, 0, yB);
      gr.addColorStop(0, cor); gr.addColorStop(1, cor + 'BB');
      c.shadowColor = cor + '44'; c.shadowBlur = 6; c.shadowOffsetY = 2;
      roundRect(c, x, yT, barW, bH, Math.min(6, barW * 0.2));
      c.fillStyle = gr; c.fill();
      c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
      c.fillStyle = cor; c.font = `700 ${mob ? 8.5 : 10}px ${FONT}`;
      c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.fillText(fmt(v), x + barW / 2, yT - 3);
      ctx.hitZones.push({ x, y: yT, w: barW, h: bH, label: labels[i], val: v, cor, serie, iMes: i });
    }
    c.fillStyle = COLORS.ink; c.font = `${mob ? 9 : 10}px ${FONT}`;
    c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText(labels[i], x + barW / 2, yB + 6);
  }
}

function _hoverBarrasComp(e, ctx) {
  const canvas = ctx.canvas;
  const rect   = canvas.getBoundingClientRect();
  const sx = rect.width  > 0 ? canvas.offsetWidth  / rect.width  : 1;
  const sy = rect.height > 0 ? canvas.offsetHeight / rect.height : 1;
  const mx = (e.clientX - rect.left) * sx;
  const my = (e.clientY - rect.top)  * sy;

  let hit = null;
  for (const z of ctx.hitZones) {
    if (mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h) { hit = z; break; }
  }

  const tip = _getFloatTooltip();
  if (!hit) { tip.style.display = 'none'; ctx.pontoAtivo = null; return; }

  const chave = `${hit.serie.nome}-${hit.label}`;
  if (ctx.pontoAtivo === chave && tip.style.display !== 'none') { _posicionarTooltip(tip, e.clientX, e.clientY); return; }
  ctx.pontoAtivo = chave;

  const fmt = hit.serie.formatFn || (v => v !== null ? String(Math.round(v)) : '—');
  let deltaHTML = '';
  if (hit.iMes > 0) {
    const vP = hit.serie.valores[hit.iMes - 1];
    const lP = ctx.dados.labels[hit.iMes - 1];
    if (hit.val !== null && vP !== null) {
      const diff = hit.val - vP;
      let dTxt = hit.serie.unidade === 'minutos' ? `${diff >= 0 ? '+' : '−'}${formatMinutesShort(Math.abs(diff))}`
               : hit.serie.unidade === 'nota'    ? `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`
               : `${diff >= 0 ? '+' : ''}${diff}`;
      const pct  = vP !== 0 ? ` (${((diff / vP) * 100).toFixed(1)}%)` : '';
      const icon = diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
      const cls  = diff > 0 ? 'tt-delta-up' : diff < 0 ? 'tt-delta-down' : 'tt-delta-same';
      deltaHTML = `<div class="tt-delta"><span class="${cls}">${icon} ${dTxt}${pct}</span><span style="color:rgba(255,255,255,.45);margin-left:4px;">vs ${lP}</span></div>`;
    }
  }
  const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${hit.cor};margin-right:5px;vertical-align:middle;flex-shrink:0"></span>`;
  tip.innerHTML = `
    <div class="tt-label">${dot}${hit.serie.nome}</div>
    <div class="tt-value">${fmt(hit.val)} <span style="font-size:11px;font-weight:400;color:rgba(255,255,255,.6);">${hit.label}</span></div>
    ${deltaHTML}`;
  tip.style.display = 'block';
  _posicionarTooltip(tip, e.clientX, e.clientY);
}

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

function mostrarTooltipComp() {}
function ocultarTooltipComp() {}

/* ==========================================================
   FECHAMENTO DO PAINEL DE COMPARAÇÃO
   ========================================================== */

document.getElementById('compCloseBtn').addEventListener('click', () => {
  const panel = document.getElementById('compResultPanel');
  panel.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  panel.style.opacity    = '0';
  panel.style.transform  = 'translateY(8px)';
  setTimeout(() => {
    panel.style.display    = 'none';
    panel.style.transition = '';
    panel.style.transform  = '';
    /* oculta seções de origem */
    ['compSecaoJira','compSecaoMulti'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    /* limpa containers fixos dos gráficos */
    ['compBlocoJira','compBlocoMulti'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.innerHTML = ''; delete el._barCtx; }
    });
    /* limpa grids de cards */
    ['compResultGridJira','compResultGridMulti'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });
    _esconderTooltip();
  }, 260);
});

/* ---------- Redimensiona quando a janela muda ---------- */

function redimensionarCompCharts() {
  ['compBlocoJira','compBlocoMulti'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el._barCtx) desenharBarrasComparativas(el._barCtx);
  });
}

/* ==========================================================
   INICIALIZAÇÃO
   ========================================================== */

function ajustarAlturaTopbar() {
  const topbar    = document.querySelector('.topbar');
  const appLayout = document.querySelector('.app-layout');
  const sidebarEl = document.getElementById('sidebar');
  if (!topbar || !appLayout) return;
  const h = topbar.offsetHeight;
  appLayout.style.paddingTop = h + 'px';
  if (sidebarEl && window.innerWidth > 900) {
    const altSidebar = `calc(100vh - ${h}px)`;
    sidebarEl.style.top = h + 'px'; sidebarEl.style.height = altSidebar; sidebarEl.style.maxHeight = altSidebar;
  }
}

atualizarModoFiltro();
aplicarFiltro();

requestAnimationFrame(() => {
  if (window.innerWidth <= 900) setSidebarState(false);
  ajustarAlturaTopbar();
  popularSeletorComparacao();
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    ajustarAlturaTopbar();
    renderDashboard(_currentJira, _currentMulti);
    redimensionarCompCharts();
    if (window.innerWidth > 900) sidebarOverlay.classList.remove('is-visible');
  }, 150);
});
