/* =========================================================
   Painel SAC — lógica de dados e renderização reativa
   Depende de: data.js (jiraData, multiData)
   Gráficos em <canvas> puro (sem bibliotecas externas).
   ========================================================= */

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
  const abs  = Math.abs(min);
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

function setupCanvas(canvas, cssHeight) {
  const dpr      = window.devicePixelRatio || 1;
  const parent   = canvas.parentElement;
  const ps       = getComputedStyle(parent);
  const padX     = (parseFloat(ps.paddingLeft) || 0) + (parseFloat(ps.paddingRight) || 0);
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
  const cssHeight = 190;
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
  if (items.length === 0) {
    const { ctx, width, height } = setupCanvas(canvas, 40);
    ctx.fillStyle = COLORS.mute;
    ctx.font      = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sem dados para o período', width / 2, 20);
    return;
  }
  const rowH    = 26;
  const cssHeight = items.length * rowH + 10;
  const { ctx, width } = setupCanvas(canvas, cssHeight);
  const maxVal  = Math.max(...items.map(i => i.value));
  const labelW  = Math.min(width * 0.42, 190);
  const barAreaW = width - labelW - 46;
  const barX    = labelW;

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
  const cssHeight = 190;
  const { ctx, width, height } = setupCanvas(canvas, cssHeight);

  if (items.length === 0) {
    ctx.fillStyle = COLORS.mute;
    ctx.font      = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sem dados para o período', width / 2, height / 2);
    return;
  }

  const padBottom = 22;
  const padTop    = 22;
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
  const startTime    = performance.now();
  const isFloat      = typeof targetValue === 'string' && targetValue.includes('.');
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

/* ==========================================================
   ESTADO DOS FILTROS DAS TABELAS
   ========================================================== */

let jiraClienteFiltroValue = 'all';
let jiraTipoFiltroValue    = 'all';
let jiraPrioFiltroValue    = 'all';
let multiClienteFiltroValue = 'all';
let multiMotivoFiltroValue  = 'all';
let multiNotaFiltroValue    = 'all';

/* ==========================================================
   FUNÇÃO CENTRAL: renderDashboard
   Recebe os conjuntos já filtrados pelo período e redesenha
   KPIs, gráficos, estatísticas e tabelas.
   ========================================================== */

function renderDashboard(jira, multi) {

  /* ---- KPIs ---- */
  const jiraConcluidos = jira.filter(t => t.status === 'Concluido');

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

  // Setar valores iniciais (sem animação) para nota/tempo Multi
  document.getElementById('kpiMultiNota').textContent  = multiComNota.length ? notaMedia.toFixed(1) : '—';
  document.getElementById('statTempoMedio').textContent = formatMinutesAsDuration(tempoMedioMultiMin);
  document.getElementById('statNotaMin').textContent   = multiComNota.length
    ? Math.min(...multiComNota.map(m => m.avaliacao)).toFixed(0)
    : '—';

  // Contadores animados
  animateCounter('kpiJiraTotal',       jira.length,           900);
  animateCounter('kpiJiraConcluido',   jiraConcluidos.length, 900);
  animateCounter('kpiMultiTotal',      multi.length,          900);
  animateCounter('statTotalAvaliacoes', multiComNota.length,  900);
  animateCounter('statNota10', multiComNota.filter(m => m.avaliacao === 10).length, 900);

  /* ---- Gráficos ---- */
  const statusColorMap = {
    'Concluido':      COLORS.teal,
    'Aguarda Externo': COLORS.blue,
    'Aguarda Dev':    COLORS.amber,
    'Cancelado':      COLORS.rose,
    'Em Análise':     COLORS.amber
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

  /* ---- Tabela Jira ---- */
  rebuildJiraFilters(jira);
  renderJiraTable(jira);

  /* ---- Tabela Multi ---- */
  rebuildMultiFilters(multi);
  renderMultiTable(multi);
}

/* ==========================================================
   TABELA JIRA
   ========================================================== */

function statusPillClass(status) {
  switch (status) {
    case 'Concluido':      return 'pill-concluido';
    case 'Cancelado':      return 'pill-cancelado';
    case 'Em Análise':     return 'pill-analise';
    default:               return 'pill-andamento';
  }
}
function classePillClass(classe) {
  return classe === 'A' ? 'pill-a' : classe === 'B' ? 'pill-b' : 'pill-c';
}

function renderJiraTable(jiraFiltrado) {
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
}

function rebuildJiraFilters(jiraFiltrado) {
  const clientes = [...new Set(jiraFiltrado.map(t => t.cliente))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const tipos    = [...new Set(jiraFiltrado.map(t => t.tipo))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const prios    = [...new Set(jiraFiltrado.map(t => t.classe))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const buildSelect = (id, optionsArr, currentVal, labelFn) => {
    const sel = document.getElementById(id);
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
    // restaura seleção prévia se ainda existe no novo conjunto
    sel.value = optionsArr.includes(prevVal) ? prevVal : 'all';
  };

  buildSelect('jiraClienteFiltro', clientes, jiraClienteFiltroValue);
  buildSelect('jiraTipoFiltro',    tipos,    jiraTipoFiltroValue);
  buildSelect('jiraPrioFiltro',    prios,    jiraPrioFiltroValue, v => `Prioridade ${v}`);

  // Sincroniza estado
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
}

function rebuildMultiFilters(multiFiltrado) {
  const clientes = [...new Set(multiFiltrado.map(m => extrairClienteMulti(m.nome)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const motivos  = [...new Set(multiFiltrado.map(m => m.motivo))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const notasRaw = multiFiltrado.map(m => m.avaliacao);
  const notasSet = new Set();
  notasRaw.forEach(n => notasSet.add(n === null || n === undefined ? 'sem-nota' : n.toString()));
  const notasUnique = ['sem-nota', ...Array.from(notasSet).filter(n => n !== 'sem-nota').sort((a, b) => parseFloat(b) - parseFloat(a))];

  const buildSelect = (id, optionsArr, labelFn) => {
    const sel = document.getElementById(id);
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
   LISTENERS DAS TABELAS (delegados, não precisam ser
   recriados a cada renderDashboard)
   ========================================================== */

// Referências ao conjunto atual filtrado por período
// (atualizado pelo filtro de período antes de chamar renderDashboard)
let _currentJira  = jiraData;
let _currentMulti = multiData;

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

// --- Descobrir meses/anos disponíveis nos dados ---
function getMesesDisponiveis() {
  const set = new Set();
  [...jiraData.map(r => r.criado), ...multiData.map(r => r.data)].forEach(str => {
    const m = str && str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) set.add(`${m[3]}-${m[2]}`); // "2026-08"
  });
  return Array.from(set).sort();
}

const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function labelMes(anoMes) {
  const [y, mo] = anoMes.split('-');
  return `${MESES_LABEL[+mo - 1]} ${y}`;
}

// --- Popula select de mês ---
const periodoMesSelect = document.getElementById('periodoMes');
getMesesDisponiveis().forEach(am => {
  const opt = document.createElement('option');
  opt.value = am;
  opt.textContent = labelMes(am);
  periodoMesSelect.appendChild(opt);
});
// Padrão: mês mais recente disponível
if (periodoMesSelect.options.length > 0) {
  periodoMesSelect.value = periodoMesSelect.options[periodoMesSelect.options.length - 1].value;
}

// --- Lógica de filtragem por período ---
function filtrarPorPeriodo(modo) {
  if (modo === 'todos') {
    return { jira: jiraData, multi: multiData };
  }

  if (modo === 'mes') {
    const val = periodoMesSelect.value; // "2026-09"
    if (!val) return { jira: jiraData, multi: multiData };
    const [y, mo] = val.split('-').map(Number);
    const jira  = jiraData.filter(r => {
      const d = parseBrDate(r.criado);
      return d && d.getFullYear() === y && (d.getMonth() + 1) === mo;
    });
    const multi = multiData.filter(r => {
      const d = parseBrDate(r.data);
      return d && d.getFullYear() === y && (d.getMonth() + 1) === mo;
    });
    return { jira, multi };
  }

  if (modo === 'intervalo') {
    const dtIniStr = document.getElementById('periodoInicio').value; // "yyyy-mm-dd"
    const dtFimStr = document.getElementById('periodoFim').value;
    if (!dtIniStr || !dtFimStr) return { jira: jiraData, multi: multiData };

    const [yi, mi, di] = dtIniStr.split('-').map(Number);
    const [yf, mf, df] = dtFimStr.split('-').map(Number);
    const dtIni = new Date(yi, mi - 1, di, 0, 0, 0);
    const dtFim = new Date(yf, mf - 1, df, 23, 59, 59);

    const jira  = jiraData.filter(r => {
      const d = parseBrDate(r.criado);
      return d && d >= dtIni && d <= dtFim;
    });
    const multi = multiData.filter(r => {
      const d = parseBrDate(r.data);
      return d && d >= dtIni && d <= dtFim;
    });
    return { jira, multi };
  }

  return { jira: jiraData, multi: multiData };
}

// --- Aplicar filtro e atualizar painel ---
function aplicarFiltro() {
  const modo = document.querySelector('input[name="periodoModo"]:checked').value;
  const { jira, multi } = filtrarPorPeriodo(modo);

  _currentJira  = jira;
  _currentMulti = multi;

  // Reseta filtros de tabela ao trocar período
  jiraClienteFiltroValue  = 'all';
  jiraTipoFiltroValue     = 'all';
  jiraPrioFiltroValue     = 'all';
  multiClienteFiltroValue = 'all';
  multiMotivoFiltroValue  = 'all';
  multiNotaFiltroValue    = 'all';

  // Atualiza footer com rótulo do período ativo
  atualizarFooter(modo);

  renderDashboard(jira, multi);
}

function atualizarFooter(modo) {
  const footer  = document.querySelector('.footer span');
  const topbar  = document.getElementById('topbarPeriodo');

  let label = '';
  if (modo === 'todos') {
    label = 'Todo o período';
    if (footer) footer.textContent = 'Painel gerado a partir de todos os registros disponíveis';
  } else if (modo === 'mes') {
    const val = periodoMesSelect.value;
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
  if (topbar) topbar.textContent = label;
}

// --- Controle de visibilidade dos campos do filtro ---
function atualizarModoFiltro() {
  const modo = document.querySelector('input[name="periodoModo"]:checked').value;
  document.getElementById('filtroMesWrap').style.display      = modo === 'mes'       ? 'flex' : 'none';
  document.getElementById('filtroIntervaloWrap').style.display = modo === 'intervalo' ? 'flex' : 'none';
}

document.querySelectorAll('input[name="periodoModo"]').forEach(radio => {
  radio.addEventListener('change', () => {
    atualizarModoFiltro();
    // Aplica imediatamente para "mes" e "todos"; intervalo espera as datas
    const modo = radio.value;
    if (modo === 'mes' || modo === 'todos') {
      aplicarFiltro();
    }
  });
});

document.getElementById('periodoMes').addEventListener('change', () => {
  aplicarFiltro();
});

document.getElementById('periodoInicio').addEventListener('change', validarEAplicarIntervalo);
document.getElementById('periodoFim').addEventListener('change',    validarEAplicarIntervalo);

function validarEAplicarIntervalo() {
  const ini = document.getElementById('periodoInicio').value;
  const fim = document.getElementById('periodoFim').value;
  const err = document.getElementById('periodoErro');
  if (!ini || !fim) return; // aguarda as duas datas
  if (ini > fim) {
    err.textContent = 'A data inicial não pode ser posterior à data final.';
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  aplicarFiltro();
}

document.getElementById('btnAplicarFiltro').addEventListener('click', () => {
  const ini = document.getElementById('periodoInicio').value;
  const fim = document.getElementById('periodoFim').value;
  const err = document.getElementById('periodoErro');
  const modo = document.querySelector('input[name="periodoModo"]:checked').value;

  if (modo === 'intervalo') {
    if (!ini || !fim) {
      err.textContent = 'Informe as duas datas para filtrar por intervalo.';
      err.style.display = 'block';
      return;
    }
    if (ini > fim) {
      err.textContent = 'A data inicial não pode ser posterior à data final.';
      err.style.display = 'block';
      return;
    }
    err.style.display = 'none';
  }
  aplicarFiltro();
});

// --- Resize ---
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renderDashboard(_currentJira, _currentMulti), 150);
});

/* ==========================================================
   INICIALIZAÇÃO
   ========================================================== */

// Ativa modo inicial (mês mais recente) e desenha
atualizarModoFiltro();
aplicarFiltro();
