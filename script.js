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

// Prepara um canvas para desenho nítido em telas HiDPI.
// Usa a largura real do elemento pai e a altura em CSS px passada.
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

/* ---------- Gráfico de linha com área (Pulso do mês) ---------- */

/* ---------- Donut chart com legenda ---------- */

function drawDonutChart(canvasId, segments){
  // segments: [{label, value, color}]
  const canvas = document.getElementById(canvasId);
  const cssHeight = 190;
  const { ctx, width, height } = setupCanvas(canvas, cssHeight);

  const total = segments.reduce((a,s) => a + s.value, 0);
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

  // centro: total
  ctx.fillStyle = COLORS.ink;
  ctx.font = `600 20px ${FONT.replace('Inter','Space Grotesk')}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), cx, cy - 6);
  ctx.fillStyle = COLORS.mute;
  ctx.font = `10px ${FONT}`;
  ctx.fillText('total', cx, cy + 12);

  // legenda à direita
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
  // items: [{label, value}] já ordenado desc
  const canvas = document.getElementById(canvasId);
  const rowH = 26;
  const cssHeight = items.length * rowH + 10;
  const { ctx, width, height } = setupCanvas(canvas, cssHeight);

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
  // items: [{label, value, color}]
  const canvas = document.getElementById(canvasId);
  const cssHeight = 190;
  const { ctx, width, height } = setupCanvas(canvas, cssHeight);

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

/* ---------- Cálculo dos KPIs ---------- */

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
    
    // Easing: easeOutQuad
    const easeProgress = 1 - (1 - progress) * (1 - progress);
    
    if(isFloat){
      const current = numericTarget * easeProgress;
      element.textContent = current.toFixed(1);
    } else {
      const current = Math.floor(numericTarget * easeProgress);
      element.textContent = current;
    }
    
    if(progress < 1){
      requestAnimationFrame(animate);
    }
  }
  
  requestAnimationFrame(animate);
}

/* Aguardar um pouco para o DOM estar pronto, depois animar */
setTimeout(() => {
  animateCounter('kpiJiraTotal', jiraData.length, 900);
  animateCounter('kpiJiraConcluido', `${jiraConcluidos.length}`, 900);
  animateCounter('kpiMultiTotal', multiData.length, 900);
  animateCounter('statTotalAvaliacoes', multiComNota.length, 900);
  animateCounter('statNota10', multiComNota.filter(m => m.avaliacao === 10).length, 900);
}, 100);

const jiraConcluidos = jiraData.filter(t => t.status === 'Concluido');
const jiraTemposValidos = jiraData
  .map(t => parseTempoMin(t.tempo))
  .filter(v => v !== null && v > 0);
const tempoMedioJiraMin = jiraTemposValidos.reduce((a,b) => a+b, 0) / jiraTemposValidos.length;

const multiComNota = multiData.filter(m => m.avaliacao !== null && m.avaliacao !== undefined);
const notaMedia = multiComNota.reduce((a,b) => a + b.avaliacao, 0) / multiComNota.length;

document.getElementById('kpiJiraTotal').textContent = '0';
document.getElementById('kpiJiraConcluido').textContent = '0/0';
document.getElementById('kpiJiraTempo').textContent = formatMinutesAsDuration(tempoMedioJiraMin);
document.getElementById('kpiMultiTotal').textContent = '0';
document.getElementById('kpiMultiNota').textContent = notaMedia.toFixed(1);

document.getElementById('statTempoMedio').textContent = '1h 02min';
document.getElementById('statTotalAvaliacoes').textContent = '0';
document.getElementById('statNota10').textContent = '0';
document.getElementById('statNotaMin').textContent = Math.min(...multiComNota.map(m => m.avaliacao)).toFixed(1);

/* ---------- Preparação dos dados para os gráficos ---------- */

const statusColorMap = {
  'Concluido': COLORS.teal,
  'Aguarda Externo': COLORS.blue,
  'Aguarda Dev': COLORS.amber,
  'Cancelado': COLORS.rose,
  'Em Análise': COLORS.amber
};
const statusCounts = sortEntriesDesc(countBy(jiraData, t => t.status));
const statusSegments = statusCounts.map(([label, value]) => ({
  label, value, color: statusColorMap[label] || COLORS.mute
}));

const classeColorMap = { 'A': COLORS.rose, 'B': COLORS.amber, 'C': COLORS.mute };
const classeCounts = sortEntriesDesc(countBy(jiraData, t => t.classe));
const classeSegments = classeCounts.map(([label, value]) => ({
  label: `Classe ${label}`, value, color: classeColorMap[label] || COLORS.mute
}));

const clienteItems = sortEntriesDesc(countBy(jiraData, t => t.cliente))
  .map(([label, value]) => ({ label, value }));

const motivoItems = sortEntriesDesc(countBy(multiData, m => m.motivo))
  .map(([label, value]) => ({ label, value }));

const notaCounts = countBy(multiComNota, m => m.avaliacao.toFixed(0));
const notaItems = Object.keys(notaCounts).sort((a,b) => a-b).map(n => ({
  label: `Nota ${n}`,
  value: notaCounts[n],
  color: +n >= 9 ? COLORS.teal : COLORS.rose
}));

/* ---------- Renderização de todos os gráficos ---------- */

function renderCharts(){
  drawDonutChart('statusChart', statusSegments);
  drawDonutChart('classeChart', classeSegments);
  drawHBarChart('clienteChart', clienteItems, COLORS.amber);
  drawHBarChart('motivoChart', motivoItems, COLORS.blue);
  drawVBarChart('notaChart', notaItems);
}

renderCharts();

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderCharts, 150);
});

/* ---------- Tabela Jira ---------- */

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

const jiraOrdenado = jiraData
  .slice()
  .sort((a,b) => (parseBrDate(b.criado) || 0) - (parseBrDate(a.criado) || 0));

const jiraTbody = document.querySelector('#jiraTable tbody');

// State dos filtros
let jiraClienteFiltroValue = 'all';
let jiraTipoFiltroValue = 'all';
let jiraPrioFiltroValue = 'all';

function renderJiraTable(){
  jiraTbody.innerHTML = '';
  let lista = jiraOrdenado;
  
  if(jiraClienteFiltroValue !== 'all'){
    lista = lista.filter(t => t.cliente === jiraClienteFiltroValue);
  }
  if(jiraTipoFiltroValue !== 'all'){
    lista = lista.filter(t => t.tipo === jiraTipoFiltroValue);
  }
  if(jiraPrioFiltroValue !== 'all'){
    lista = lista.filter(t => t.classe === jiraPrioFiltroValue);
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
    jiraTbody.appendChild(tr);
  });
}

const jiraClientes = [...new Set(jiraData.map(t => t.cliente))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
const jiraTipos = [...new Set(jiraData.map(t => t.tipo))].sort((a,b) => a.localeCompare(b, 'pt-BR'));

const jiraClienteFiltroEl = document.getElementById('jiraClienteFiltro');
jiraClientes.forEach(c => {
  const opt = document.createElement('option');
  opt.value = c;
  opt.textContent = c;
  jiraClienteFiltroEl.appendChild(opt);
});

const jiraTipoFiltroEl = document.getElementById('jiraTipoFiltro');
jiraTipos.forEach(t => {
  const opt = document.createElement('option');
  opt.value = t;
  opt.textContent = t;
  jiraTipoFiltroEl.appendChild(opt);
});

jiraClienteFiltroEl.addEventListener('change', (e) => {
  jiraClienteFiltroValue = e.target.value;
  renderJiraTable();
});

jiraTipoFiltroEl.addEventListener('change', (e) => {
  jiraTipoFiltroValue = e.target.value;
  renderJiraTable();
});

const jiraPrios = [...new Set(jiraData.map(t => t.classe))].sort((a,b) => a.localeCompare(b, 'pt-BR'));

const jiraPrioFiltroEl = document.getElementById('jiraPrioFiltro');
jiraPrios.forEach(p => {
  const opt = document.createElement('option');
  opt.value = p;
  opt.textContent = `Prioridade ${p}`;
  jiraPrioFiltroEl.appendChild(opt);
});

jiraPrioFiltroEl.addEventListener('change', (e) => {
  jiraPrioFiltroValue = e.target.value;
  renderJiraTable();
});

renderJiraTable();

/* ---------- Tabela Multichat ---------- */

// O nome vem no formato "Cliente - Contato"; extrai o cliente para o filtro.
function extrairClienteMulti(nome){
  if(!nome) return 'Não identificado';
  const partes = nome.split(/\s*-\s*/);
  return partes[0].trim() || 'Não identificado';
}

const multiOrdenado = multiData
  .slice()
  .sort((a,b) => (parseBrDate(b.data) || 0) - (parseBrDate(a.data) || 0));

const multiTbody = document.querySelector('#multiTable tbody');

// State dos filtros
let multiClienteFiltroValue = 'all';
let multiMotivoFiltroValue = 'all';
let multiNotaFiltroValue = 'all';

function renderMultiTable(){
  multiTbody.innerHTML = '';
  let lista = multiOrdenado;
  
  if(multiClienteFiltroValue !== 'all'){
    lista = lista.filter(m => extrairClienteMulti(m.nome) === multiClienteFiltroValue);
  }
  if(multiMotivoFiltroValue !== 'all'){
    lista = lista.filter(m => m.motivo === multiMotivoFiltroValue);
  }
  if(multiNotaFiltroValue !== 'all'){
    if(multiNotaFiltroValue === 'sem-nota'){
      lista = lista.filter(m => m.avaliacao === null || m.avaliacao === undefined);
    } else {
      lista = lista.filter(m => m.avaliacao !== null && m.avaliacao !== undefined && m.avaliacao.toString() === multiNotaFiltroValue);
    }
  }
  
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
    multiTbody.appendChild(tr);
  });
}

const multiClientes = [...new Set(multiData.map(m => extrairClienteMulti(m.nome)))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
const multiMotivos = [...new Set(multiData.map(m => m.motivo))].sort((a,b) => a.localeCompare(b, 'pt-BR'));

// Extrair notas únicas: "sem-nota" (null) + valores numéricos ordenados
const multiNotasRaw = multiData.map(m => m.avaliacao);
const multiNotasSet = new Set();
multiNotasRaw.forEach(n => {
  if(n === null || n === undefined){
    multiNotasSet.add('sem-nota');
  } else {
    multiNotasSet.add(n.toString());
  }
});
const multiNotas = Array.from(multiNotasSet);
// Ordenar: sem-nota primeiro, depois notas em ordem descendente
const multiNotasUnique = ['sem-nota'].concat(
  multiNotas.filter(n => n !== 'sem-nota').sort((a,b) => parseFloat(b) - parseFloat(a))
);

const multiClienteFiltroEl = document.getElementById('multiClienteFiltro');
multiClientes.forEach(c => {
  const opt = document.createElement('option');
  opt.value = c;
  opt.textContent = c;
  multiClienteFiltroEl.appendChild(opt);
});

const multiMotivoFiltroEl = document.getElementById('multiMotivoFiltro');
multiMotivos.forEach(m => {
  const opt = document.createElement('option');
  opt.value = m;
  opt.textContent = m;
  multiMotivoFiltroEl.appendChild(opt);
});

const multiNotaFiltroEl = document.getElementById('multiNotaFiltro');
multiNotasUnique.forEach(n => {
  const opt = document.createElement('option');
  opt.value = n;
  opt.textContent = n === 'sem-nota' ? 'Sem nota' : `Nota ${n}`;
  multiNotaFiltroEl.appendChild(opt);
});

multiClienteFiltroEl.addEventListener('change', (e) => {
  multiClienteFiltroValue = e.target.value;
  renderMultiTable();
});

multiMotivoFiltroEl.addEventListener('change', (e) => {
  multiMotivoFiltroValue = e.target.value;
  renderMultiTable();
});

multiNotaFiltroEl.addEventListener('change', (e) => {
  multiNotaFiltroValue = e.target.value;
  renderMultiTable();
});

renderMultiTable();
