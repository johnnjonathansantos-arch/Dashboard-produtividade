/* =========================================================
   Painel SAC — lógica de dados e renderização
   Depende apenas de: data.js (jiraData, multiData)
   Os gráficos são desenhados em <canvas> puro (sem bibliotecas
   externas), para que o painel funcione mesmo sem internet.
   ========================================================= */

const COLORS = {
  amber: '#FFC400',
  amberText: '#8A6100',
  teal: '#0E8F82',
  rose: '#C23A5D',
  brand: '#123877',
  blue: '#2F5AA8',
  ink: '#1B2A4A',
  mute: '#64708C',
  grid: 'rgba(18,56,119,.10)'
};

const FONT = 'Inter, sans-serif';

/* ---------- Estado global de filtro de mês ---------- */
let mesSelecionado = 'Setembro 2026';

/* ---------- Helpers de dados ---------- */

function parseBrDate(str){
  if(!str || typeof str !== 'string') return null;
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if(!m) return null;
  const [, d, mo, y, h, mi] = m;
  return new Date(+y, +mo - 1, +d, +h, +mi);
}

function parseTempoMin(str){
  if(!str || typeof str !== 'string' || !str.includes(':')) return null;
  const neg = str.trim().startsWith('-');
  const clean = str.trim().replace('-', '');
  const [h, m] = clean.split(':').map(Number);
  const total = h * 60 + m;
  return neg ? -total : total;
}

function formatMinutesAsDuration(min){
  if(min === null || isNaN(min)) return '—';
  const abs = Math.abs(min);
  const days = Math.floor(abs / 1440);
  const hours = Math.floor((abs % 1440) / 60);
  const mins = Math.round(abs % 60);
  let out = '';
  if(days > 0) out += `${days}d `;
  out += `${hours}h ${mins}min`;
  return out;
}

function countBy(arr, keyFn){
  const map = {};
  arr.forEach(item => {
    const k = keyFn(item);
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

function sortEntriesDesc(obj){
  return Object.entries(obj).sort((a,b) => b[1]-a[1]);
}

/* ---------- Helpers de canvas ---------- */

function setupCanvas(canvas, cssHeight){
  const dpr = window.devicePixelRatio || 1;
  const parent = canvas.parentElement;
  const parentStyle = getComputedStyle(parent);
  const paddingX = (parseFloat(parentStyle.paddingLeft) || 0) + (parseFloat(parentStyle.paddingRight) || 0);
  const cssWidth = parent.clientWidth - paddingX;
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width = Math.max(1, Math.round(cssWidth * dpr));
  canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  return { ctx, width: cssWidth, height: cssHeight };
}

function truncateText(ctx, text, maxWidth){
  if(ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while(out.length > 1 && ctx.measureText(out + '…').width > maxWidth){
    out = out.slice(0, -1);
  }
  return out + '…';
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, Math.abs(h)/2, Math.abs(w)/2);
  ctx.beginPath();
  if(h >= 0){
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

/* ---------- Donut chart com legenda ---------- */

function drawDonutChart(canvasId, segments){
  const canvas = document.getElementById(canvasId);
  const cssHeight = 190;
  const { ctx, width, height } = setupCanvas(canvas, cssHeight);

  const total = segments.reduce((a,s) => a + s.value, 0);
  if(total === 0){
    ctx.fillStyle = COLORS.mute;
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sem dados', width/2, height/2);
    return;
  }
  const radius = Math.min(height, width * 0.42) / 2 - 4;
  const cx = radius + 8;
  const cy = height / 2;
  const lineWidth = radius * 0.42;

  let startAngle = -Math.PI / 2;
  segments.forEach(seg => {
    const angle = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - lineWidth/2, startAngle, startAngle + angle);
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = segments.length > 1 ? 'butt' : 'round';
    ctx.stroke();
    startAngle += angle;
  });

  ctx.fillStyle = COLORS.ink;
  ctx.font = `600 20px Space Grotesk, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), cx, cy - 6);
  ctx.fillStyle = COLORS.mute;
  ctx.font = `10px ${FONT}`;
  ctx.fillText('total', cx, cy + 12);

  const legendX = cx + radius + 22;
  const rowH = Math.min(22, (height - 8) / segments.length);
  let y = (height - rowH * segments.length) / 2 + rowH/2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  segments.forEach(seg => {
    ctx.fillStyle = seg.color;
    ctx.beginPath();
    ctx.arc(legendX, y, 4, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = COLORS.ink;
    ctx.font = `500 11.5px ${FONT}`;
    const pct = ((seg.value/total)*100).toFixed(0);
    const label = truncateText(ctx, seg.label, width - legendX - 46);
    ctx.fillText(label, legendX + 12, y);

    ctx.fillStyle = COLORS.mute;
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${seg.value} · ${pct}%`, width - 2, y);
    ctx.textAlign = 'left';

    y += rowH;
  });
}

/* ---------- Barra horizontal ---------- */

function drawHBarChart(canvasId, items, color){
  const canvas = document.getElementById(canvasId);
  const rowH = 26;
  const cssHeight = Math.max(items.length * rowH + 10, 40);
  const { ctx, width, height } = setupCanvas(canvas, cssHeight);

  if(items.length === 0){
    ctx.fillStyle = COLORS.mute;
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sem dados', width/2, height/2);
    return;
  }

  const maxVal = Math.max(...items.map(i => i.value));
  const labelW = Math.min(width * 0.42, 190);
  const barAreaW = width - labelW - 46;
  const barX = labelW;

  ctx.textBaseline = 'middle';
  items.forEach((item, i) => {
    const y = i * rowH + rowH/2 + 4;
    const barW = Math.max(3, (item.value / maxVal) * barAreaW);

    ctx.fillStyle = COLORS.ink;
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'left';
    const label = truncateText(ctx, item.label, labelW - 10);
    ctx.fillText(label, 0, y);

    roundRect(ctx, barX, y - 7, barW, 14, 5);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.fillStyle = COLORS.mute;
    ctx.font = `11px ${FONT}`;
    ctx.fillText(String(item.value), barX + barW + 8, y);
  });
}

/* ---------- Barra vertical ---------- */

function drawVBarChart(canvasId, items){
  const canvas = document.getElementById(canvasId);
  const cssHeight = 190;
  const { ctx, width, height } = setupCanvas(canvas, cssHeight);

  if(items.length === 0){
    ctx.fillStyle = COLORS.mute;
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sem dados', width/2, height/2);
    return;
  }

  const padBottom = 22;
  const padTop = 22;
  const chartH = height - padBottom - padTop;
  const maxVal = Math.max(...items.map(i => i.value));
  const gap = 18;
  const barW = Math.min(46, (width - gap * (items.length + 1)) / items.length);
  const totalBarsW = barW * items.length + gap * (items.length - 1);
  const startX = (width - totalBarsW) / 2;

  items.forEach((item, i) => {
    const x = startX + i * (barW + gap);
    const barH = (item.value / maxVal) * chartH;
    const y = padTop + (chartH - barH);

    roundRect(ctx, x, y, barW, barH, 6);
    ctx.fillStyle = item.color;
    ctx.fill();

    ctx.fillStyle = COLORS.ink;
    ctx.font = `600 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(String(item.value), x + barW/2, y - 5);

    ctx.fillStyle = COLORS.mute;
    ctx.font = `11px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.fillText(item.label, x + barW/2, padTop + chartH + 6);
  });
}

/* ---------- Animação de contadores para KPIs ---------- */

function animateCounter(elementId, targetValue, duration = 800){
  const element = document.getElementById(elementId);
  if(!element) return;
  const startTime = performance.now();
  const isFloat = typeof targetValue === 'string' && targetValue.includes('.');
  const numericTarget = parseFloat(targetValue);

  function animate(currentTime){
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - (1 - progress) * (1 - progress);
    if(isFloat){
      element.textContent = (numericTarget * easeProgress).toFixed(1);
    } else {
      element.textContent = Math.floor(numericTarget * easeProgress);
    }
    if(progress < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

/* ---------- Filtros de tabela (estado) ---------- */
let jiraClienteFiltroValue = 'all';
let jiraTipoFiltroValue = 'all';
let jiraPrioFiltroValue = 'all';
let multiClienteFiltroValue = 'all';
let multiMotivoFiltroValue = 'all';
let multiNotaFiltroValue = 'all';

/* ---------- Helpers de tabelas ---------- */

function statusPillClass(status){
  switch(status){
    case 'Concluido': return 'pill-concluido';
    case 'Cancelado': return 'pill-cancelado';
    case 'Em Análise': return 'pill-analise';
    default: return 'pill-andamento';
  }
}
function classePillClass(classe){
  return classe === 'A' ? 'pill-a' : classe === 'B' ? 'pill-b' : 'pill-c';
}

function extrairClienteMulti(nome){
  if(!nome) return 'Não identificado';
  const partes = nome.split(/\s*-\s*/);
  return partes[0].trim() || 'Não identificado';
}

/* ---------- Renderização principal — chamada ao trocar o mês ---------- */

function renderDashboard(){
  // Filtra dados pelo mês selecionado
  const jira = jiraData.filter(t => t.mes === mesSelecionado);
  const multi = multiData.filter(m => m.mes === mesSelecionado);

  const jiraConcluidos = jira.filter(t => t.status === 'Concluido');
  const jiraTemposValidos = jira
    .map(t => parseTempoMin(t.tempo))
    .filter(v => v !== null && v > 0);
  const tempoMedioJiraMin = jiraTemposValidos.length
    ? jiraTemposValidos.reduce((a,b) => a+b, 0) / jiraTemposValidos.length
    : null;

  const multiComNota = multi.filter(m => m.avaliacao !== null && m.avaliacao !== undefined);
  const notaMedia = multiComNota.length
    ? multiComNota.reduce((a,b) => a + b.avaliacao, 0) / multiComNota.length
    : null;

  // -- KPIs --
  document.getElementById('kpiJiraTotal').textContent = '0';
  document.getElementById('kpiJiraConcluido').textContent = `0/${jira.length}`;
  document.getElementById('kpiJiraTempo').textContent = formatMinutesAsDuration(tempoMedioJiraMin);
  document.getElementById('kpiMultiTotal').textContent = '0';
  document.getElementById('kpiMultiNota').textContent = notaMedia !== null ? notaMedia.toFixed(1) : '—';
  document.getElementById('statTempoMedio').textContent = calcularTempoMedioMulti(multi);
  document.getElementById('statTotalAvaliacoes').textContent = '0';
  document.getElementById('statNota10').textContent = '0';
  document.getElementById('statNotaMin').textContent = multiComNota.length
    ? Math.min(...multiComNota.map(m => m.avaliacao)).toFixed(1)
    : '—';

  setTimeout(() => {
    animateCounter('kpiJiraTotal', jira.length, 700);
    animateCounter('kpiMultiTotal', multi.length, 700);
    animateCounter('statTotalAvaliacoes', multiComNota.length, 700);
    animateCounter('statNota10', multiComNota.filter(m => m.avaliacao === 10).length, 700);
  }, 50);

  // -- Atualiza label do KPI concluídos --
  document.getElementById('kpiJiraConcluido').textContent = `${jiraConcluidos.length}/${jira.length}`;

  // -- Footer --
  document.getElementById('footerLabel').textContent =
    `Painel gerado a partir dos indicadores do mês de ${mesSelecionado}`;

  // -- Gráficos Jira --
  const statusColorMap = {
    'Concluido': COLORS.teal,
    'Aguarda Externo': COLORS.blue,
    'Aguarda Dev': COLORS.amber,
    'Cancelado': COLORS.rose,
    'Em Análise': COLORS.amber
  };
  const statusSegments = sortEntriesDesc(countBy(jira, t => t.status))
    .map(([label, value]) => ({ label, value, color: statusColorMap[label] || COLORS.mute }));

  const classeColorMap = { 'A': COLORS.rose, 'B': COLORS.amber, 'C': COLORS.mute };
  const classeSegments = sortEntriesDesc(countBy(jira, t => t.classe))
    .map(([label, value]) => ({ label: `Classe ${label}`, value, color: classeColorMap[label] || COLORS.mute }));

  const clienteItems = sortEntriesDesc(countBy(jira, t => t.cliente))
    .map(([label, value]) => ({ label, value }));

  // -- Gráficos Multi --
  const motivoItems = sortEntriesDesc(countBy(multi, m => m.motivo))
    .map(([label, value]) => ({ label, value }));

  const notaCounts = countBy(multiComNota, m => m.avaliacao.toFixed(0));
  const notaItems = Object.keys(notaCounts).sort((a,b) => a-b).map(n => ({
    label: `Nota ${n}`,
    value: notaCounts[n],
    color: +n >= 9 ? COLORS.teal : COLORS.rose
  }));

  drawDonutChart('statusChart', statusSegments);
  drawDonutChart('classeChart', classeSegments);
  drawHBarChart('clienteChart', clienteItems, COLORS.amber);
  drawHBarChart('motivoChart', motivoItems, COLORS.blue);
  drawVBarChart('notaChart', notaItems);

  // -- Recarrega filtros das tabelas --
  resetFiltros();
  populateFiltrosJira(jira);
  populateFiltrosMulti(multi);
  renderJiraTable(jira);
  renderMultiTable(multi);
}

/* ---------- Tempo médio Multi360 ---------- */

function calcularTempoMedioMulti(multi){
  const duracoes = multi.map(m => {
    const inicio = parseBrDate(m.data);
    // usamos dataFinalizacao se disponível; caso contrário, sem cálculo
    return null;
  }).filter(v => v !== null);
  if(duracoes.length === 0) return '—';
  const media = duracoes.reduce((a,b) => a+b, 0) / duracoes.length;
  return formatMinutesAsDuration(media);
}

/* ---------- Filtros das tabelas ---------- */

function resetFiltros(){
  jiraClienteFiltroValue = 'all';
  jiraTipoFiltroValue = 'all';
  jiraPrioFiltroValue = 'all';
  multiClienteFiltroValue = 'all';
  multiMotivoFiltroValue = 'all';
  multiNotaFiltroValue = 'all';
  document.getElementById('jiraClienteFiltro').value = 'all';
  document.getElementById('jiraTipoFiltro').value = 'all';
  document.getElementById('jiraPrioFiltro').value = 'all';
  document.getElementById('multiClienteFiltro').value = 'all';
  document.getElementById('multiMotivoFiltro').value = 'all';
  document.getElementById('multiNotaFiltro').value = 'all';
}

function populateFiltrosJira(jira){
  const clientes = [...new Set(jira.map(t => t.cliente))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
  const tipos    = [...new Set(jira.map(t => t.tipo))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
  const prios    = [...new Set(jira.map(t => t.classe))].sort();

  const clienteEl = document.getElementById('jiraClienteFiltro');
  clienteEl.innerHTML = '<option value="all">Todos os clientes</option>';
  clientes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    clienteEl.appendChild(opt);
  });

  const tipoEl = document.getElementById('jiraTipoFiltro');
  tipoEl.innerHTML = '<option value="all">Todos os tipos</option>';
  tipos.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    tipoEl.appendChild(opt);
  });

  const prioEl = document.getElementById('jiraPrioFiltro');
  prioEl.innerHTML = '<option value="all">Todas as prio.</option>';
  prios.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = `Prioridade ${p}`;
    prioEl.appendChild(opt);
  });
}

function populateFiltrosMulti(multi){
  const clientes = [...new Set(multi.map(m => extrairClienteMulti(m.nome)))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
  const motivos  = [...new Set(multi.map(m => m.motivo))].sort((a,b) => a.localeCompare(b, 'pt-BR'));

  const multiComNota = multi.filter(m => m.avaliacao !== null && m.avaliacao !== undefined);
  const notasUnicas = ['sem-nota', ...([...new Set(multiComNota.map(m => m.avaliacao.toString()))].sort((a,b) => parseFloat(b)-parseFloat(a)))];

  const clienteEl = document.getElementById('multiClienteFiltro');
  clienteEl.innerHTML = '<option value="all">Todos os clientes</option>';
  clientes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    clienteEl.appendChild(opt);
  });

  const motivoEl = document.getElementById('multiMotivoFiltro');
  motivoEl.innerHTML = '<option value="all">Todos os motivos</option>';
  motivos.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    motivoEl.appendChild(opt);
  });

  const notaEl = document.getElementById('multiNotaFiltro');
  notaEl.innerHTML = '<option value="all">Todas as notas</option>';
  notasUnicas.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n === 'sem-nota' ? 'Sem nota' : `Nota ${n}`;
    notaEl.appendChild(opt);
  });
}

/* ---------- Tabela Jira ---------- */

function renderJiraTable(jiraFiltrado){
  const source = jiraFiltrado || jiraData.filter(t => t.mes === mesSelecionado);
  let lista = source.slice().sort((a,b) => (parseBrDate(b.criado)||0) - (parseBrDate(a.criado)||0));

  if(jiraClienteFiltroValue !== 'all') lista = lista.filter(t => t.cliente === jiraClienteFiltroValue);
  if(jiraTipoFiltroValue !== 'all')    lista = lista.filter(t => t.tipo === jiraTipoFiltroValue);
  if(jiraPrioFiltroValue !== 'all')    lista = lista.filter(t => t.classe === jiraPrioFiltroValue);

  const tbody = document.querySelector('#jiraTable tbody');
  tbody.innerHTML = '';
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

/* ---------- Tabela Multi360 ---------- */

function renderMultiTable(multiFiltrado){
  const source = multiFiltrado || multiData.filter(m => m.mes === mesSelecionado);
  let lista = source.slice().sort((a,b) => (parseBrDate(b.data)||0) - (parseBrDate(a.data)||0));

  if(multiClienteFiltroValue !== 'all') lista = lista.filter(m => extrairClienteMulti(m.nome) === multiClienteFiltroValue);
  if(multiMotivoFiltroValue !== 'all')  lista = lista.filter(m => m.motivo === multiMotivoFiltroValue);
  if(multiNotaFiltroValue !== 'all'){
    if(multiNotaFiltroValue === 'sem-nota'){
      lista = lista.filter(m => m.avaliacao === null || m.avaliacao === undefined);
    } else {
      lista = lista.filter(m => m.avaliacao !== null && m.avaliacao !== undefined && m.avaliacao.toString() === multiNotaFiltroValue);
    }
  }

  const tbody = document.querySelector('#multiTable tbody');
  tbody.innerHTML = '';
  lista.forEach((m, index) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${index * 0.03}s`;
    tr.className = 'table-row-animate';
    let notaHtml = '<span class="nota-vazia">—</span>';
    if(m.avaliacao !== null && m.avaliacao !== undefined){
      notaHtml = `<span class="${m.avaliacao >= 9 ? 'nota-alta' : 'nota-baixa'}">${m.avaliacao.toFixed(1)}</span>`;
    }
    tr.innerHTML = `
      <td class="mono">${m.protocolo}</td>
      <td>${m.nome}</td>
      <td>${m.motivo}</td>
      <td class="mono">${m.data}</td>
      <td>${notaHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ---------- Event listeners ---------- */

document.getElementById('mesFiltro').addEventListener('change', (e) => {
  mesSelecionado = e.target.value;
  renderDashboard();
});

document.getElementById('jiraClienteFiltro').addEventListener('change', (e) => {
  jiraClienteFiltroValue = e.target.value;
  renderJiraTable();
});
document.getElementById('jiraTipoFiltro').addEventListener('change', (e) => {
  jiraTipoFiltroValue = e.target.value;
  renderJiraTable();
});
document.getElementById('jiraPrioFiltro').addEventListener('change', (e) => {
  jiraPrioFiltroValue = e.target.value;
  renderJiraTable();
});
document.getElementById('multiClienteFiltro').addEventListener('change', (e) => {
  multiClienteFiltroValue = e.target.value;
  renderMultiTable();
});
document.getElementById('multiMotivoFiltro').addEventListener('change', (e) => {
  multiMotivoFiltroValue = e.target.value;
  renderMultiTable();
});
document.getElementById('multiNotaFiltro').addEventListener('change', (e) => {
  multiNotaFiltroValue = e.target.value;
  renderMultiTable();
});

/* ---------- Redimensionamento ---------- */

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const jira  = jiraData.filter(t => t.mes === mesSelecionado);
    const multi = multiData.filter(m => m.mes === mesSelecionado);
    const statusColorMap = { 'Concluido': COLORS.teal, 'Aguarda Externo': COLORS.blue, 'Aguarda Dev': COLORS.amber, 'Cancelado': COLORS.rose, 'Em Análise': COLORS.amber };
    const classeColorMap = { 'A': COLORS.rose, 'B': COLORS.amber, 'C': COLORS.mute };
    drawDonutChart('statusChart', sortEntriesDesc(countBy(jira, t => t.status)).map(([l,v]) => ({ label: l, value: v, color: statusColorMap[l]||COLORS.mute })));
    drawDonutChart('classeChart', sortEntriesDesc(countBy(jira, t => t.classe)).map(([l,v]) => ({ label: `Classe ${l}`, value: v, color: classeColorMap[l]||COLORS.mute })));
    drawHBarChart('clienteChart', sortEntriesDesc(countBy(jira, t => t.cliente)).map(([l,v]) => ({ label: l, value: v })), COLORS.amber);
    drawHBarChart('motivoChart',  sortEntriesDesc(countBy(multi, m => m.motivo)).map(([l,v]) => ({ label: l, value: v })), COLORS.blue);
    const multiComNota = multi.filter(m => m.avaliacao !== null && m.avaliacao !== undefined);
    const notaCounts = countBy(multiComNota, m => m.avaliacao.toFixed(0));
    drawVBarChart('notaChart', Object.keys(notaCounts).sort((a,b) => a-b).map(n => ({ label: `Nota ${n}`, value: notaCounts[n], color: +n >= 9 ? COLORS.teal : COLORS.rose })));
  }, 150);
});

/* ---------- Inicialização ---------- */
renderDashboard();
