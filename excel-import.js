/* =========================================================
   excel-import.js — Importação de arquivos Excel para o Painel SAC
   Dependências: script.js (getAllJira, getAllMulti, _importedJira,
                             _importedMulti, aplicarFiltro,
                             popularSelectMeses, popularImportMeses,
                             parseBrDate, MESES_LABEL)
   Leitura XLSX via FileReader + parsing manual do formato ZIP/XML.
   Não usa bibliotecas externas.
   ========================================================= */

/* ==========================================================
   PARSER XLSX MINIMALISTA
   Um arquivo .xlsx é um ZIP contendo XML. Aqui usamos uma
   abordagem que lê o XML bruto via ArrayBuffer, sem depender
   de JSZip ou SheetJS, extraindo apenas o que precisamos.
   ========================================================= */

/**
 * Lê um ArrayBuffer de um arquivo .xlsx e retorna uma Promise
 * que resolve para um array de objetos { sheetName, rows }
 * onde cada row é um array de strings (valores das células).
 *
 * Estratégia: descompacta o ZIP manualmente buscando as entradas
 * xl/worksheets/sheet*.xml e xl/sharedStrings.xml.
 */
async function parseXlsx(buffer) {
  // Verifica assinatura PK (ZIP)
  const sig = new Uint8Array(buffer, 0, 4);
  if (sig[0] !== 0x50 || sig[1] !== 0x4B) {
    throw new Error('Arquivo não reconhecido como XLSX/ZIP válido.');
  }

  const entries = extractZipEntries(buffer);
  const sharedStrings = parseSharedStrings(entries);
  const sheets = [];

  // Pega os arquivos de planilha em ordem numérica
  const sheetEntries = Object.keys(entries)
    .filter(k => k.match(/^xl\/worksheets\/sheet\d+\.xml$/i))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] || '0');
      const nb = parseInt(b.match(/\d+/)?.[0] || '0');
      return na - nb;
    });

  for (const key of sheetEntries) {
    const xml  = entries[key];
    const rows = parseSheetXml(xml, sharedStrings);
    sheets.push({ sheetName: key, rows });
  }

  return sheets;
}

/* ---------- Extração de entradas ZIP ---------- */

function extractZipEntries(buffer) {
  const bytes  = new Uint8Array(buffer);
  const entries = {};
  let offset   = 0;

  while (offset < bytes.length - 4) {
    // Localiza assinatura de entrada local: PK\x03\x04
    if (bytes[offset] === 0x50 && bytes[offset+1] === 0x4B &&
        bytes[offset+2] === 0x03 && bytes[offset+3] === 0x04) {

      const comprMethod = bytes[offset+8]  | (bytes[offset+9]  << 8);
      const compSize    = bytes[offset+18] | (bytes[offset+19] << 8) | (bytes[offset+20] << 16) | (bytes[offset+21] << 24);
      const uncompSize  = bytes[offset+22] | (bytes[offset+23] << 8) | (bytes[offset+24] << 16) | (bytes[offset+25] << 24);
      const nameLen     = bytes[offset+26] | (bytes[offset+27] << 8);
      const extraLen    = bytes[offset+28] | (bytes[offset+29] << 8);
      const nameStart   = offset + 30;
      const dataStart   = nameStart + nameLen + extraLen;

      // Decodifica nome do arquivo
      let name = '';
      for (let i = nameStart; i < nameStart + nameLen; i++) name += String.fromCharCode(bytes[i]);
      name = name.toLowerCase();

      // Só processa entradas relevantes
      if (name.match(/xl\/worksheets\/sheet\d+\.xml/) || name === 'xl/sharedstrings.xml') {
        const compData = bytes.slice(dataStart, dataStart + compSize);
        let text = '';
        if (comprMethod === 0) {
          // Sem compressão — decodifica direto
          text = decodeUtf8Uint8(compData);
        } else if (comprMethod === 8) {
          // DEFLATE — usa DecompressionStream se disponível
          text = decompressDeflate(compData, uncompSize);
        }
        if (text) entries[name] = text;
      }

      offset = dataStart + compSize;
    } else {
      offset++;
    }
  }
  return entries;
}

function decodeUtf8Uint8(arr) {
  try {
    return new TextDecoder('utf-8').decode(arr);
  } catch {
    let out = '';
    for (let i = 0; i < arr.length; i++) out += String.fromCharCode(arr[i]);
    return out;
  }
}

function decompressDeflate(compData, _uncompSize) {
  // DecompressionStream (Chrome 80+, Firefox 113+, Edge 80+, Safari 16.4+)
  // Dados DEFLATE brutos precisam de wrapper para DecompressionStream "deflate-raw"
  if (typeof DecompressionStream !== 'undefined') {
    try {
      // Retorna uma Promise — mas como não podemos await aqui de forma síncrona,
      // usamos um hack com XMLHttpRequest síncrono embutido em um blob URL.
      // Alternativa mais segura: retornar string vazia e avisar ao usuário.
      // Para compatibilidade ampla, usamos a estratégia de blob + sync XHR.
      const blob = new Blob([compData]);
      const url  = URL.createObjectURL(blob);
      const xhr  = new XMLHttpRequest();
      xhr.open('GET', url, false); // síncrono
      xhr.responseType = 'arraybuffer';
      xhr.send();
      URL.revokeObjectURL(url);
      if (xhr.status === 200) {
        // Tenta DecompressionStream com um Reader síncrono emulado
        // Como DecompressionStream é assíncrono, não podemos usá-lo aqui de forma
        // verdadeiramente síncrona. Usamos a abordagem de pré-processamento
        // indicada abaixo no parseXlsx assíncrono.
      }
    } catch {}
  }
  // Fallback: retorna string vazia (processado de forma assíncrona em parseXlsx)
  return '';
}

/** Versão assíncrona real do DEFLATE usando DecompressionStream. */
async function decompressDeflateAsync(compData) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Seu navegador não suporta descompressão nativa. Tente um navegador mais recente.');
  }
  const ds     = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  writer.write(compData);
  writer.close();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((a, c) => a + c.length, 0);
  const merged   = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.length; }
  return new TextDecoder('utf-8').decode(merged);
}

/** Versão assíncrona correta do parseXlsx. */
async function parseXlsxAsync(buffer) {
  const sig = new Uint8Array(buffer, 0, 4);
  if (sig[0] !== 0x50 || sig[1] !== 0x4B) {
    throw new Error('Arquivo não reconhecido como XLSX/ZIP válido. Verifique se é um arquivo .xlsx válido.');
  }

  const rawEntries = extractZipEntriesRaw(buffer);
  const entries    = {};

  for (const [name, { comprMethod, compData, uncompSize }] of Object.entries(rawEntries)) {
    if (comprMethod === 0) {
      entries[name] = decodeUtf8Uint8(compData);
    } else if (comprMethod === 8) {
      try {
        entries[name] = await decompressDeflateAsync(compData);
      } catch (e) {
        throw new Error(`Erro ao descompactar ${name}: ${e.message}`);
      }
    }
  }

  const sharedStrings = parseSharedStrings(entries);
  const sheets        = [];

  const sheetEntries = Object.keys(entries)
    .filter(k => k.match(/^xl\/worksheets\/sheet\d+\.xml$/i))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] || '0');
      const nb = parseInt(b.match(/\d+/)?.[0] || '0');
      return na - nb;
    });

  for (const key of sheetEntries) {
    const xml  = entries[key];
    const rows = parseSheetXml(xml, sharedStrings);
    sheets.push({ sheetName: key, rows });
  }

  return sheets;
}

/** Extrai entradas ZIP retornando metadados + dados brutos (sem descomprimir). */
function extractZipEntriesRaw(buffer) {
  const bytes  = new Uint8Array(buffer);
  const result = {};
  let offset   = 0;

  while (offset < bytes.length - 4) {
    if (bytes[offset] === 0x50 && bytes[offset+1] === 0x4B &&
        bytes[offset+2] === 0x03 && bytes[offset+3] === 0x04) {

      const comprMethod = bytes[offset+8]  | (bytes[offset+9]  << 8);
      const compSize    = (bytes[offset+18] | (bytes[offset+19] << 8) | (bytes[offset+20] << 16) | (bytes[offset+21] << 24)) >>> 0;
      const uncompSize  = (bytes[offset+22] | (bytes[offset+23] << 8) | (bytes[offset+24] << 16) | (bytes[offset+25] << 24)) >>> 0;
      const nameLen     = bytes[offset+26] | (bytes[offset+27] << 8);
      const extraLen    = bytes[offset+28] | (bytes[offset+29] << 8);
      const nameStart   = offset + 30;
      const dataStart   = nameStart + nameLen + extraLen;

      let name = '';
      for (let i = nameStart; i < nameStart + nameLen; i++) name += String.fromCharCode(bytes[i]);
      name = name.toLowerCase();

      if (name.match(/xl\/worksheets\/sheet\d+\.xml/) || name === 'xl/sharedstrings.xml') {
        result[name] = {
          comprMethod,
          compData: bytes.slice(dataStart, dataStart + compSize),
          uncompSize
        };
      }

      offset = dataStart + compSize;
    } else {
      offset++;
    }
  }
  return result;
}

/* ---------- Parser de Shared Strings ---------- */

function parseSharedStrings(entries) {
  const xml = entries['xl/sharedstrings.xml'];
  if (!xml) return [];
  const strings = [];
  const re = /<si>[\s\S]*?<\/si>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block = m[0];
    // Extrai texto de todos os elementos <t>...</t> dentro de <si>
    const textRe = /<t(?:\s[^>]*)?>([^<]*)<\/t>/g;
    let t, val = '';
    while ((t = textRe.exec(block)) !== null) val += t[1];
    strings.push(decodeXmlEntities(val));
  }
  return strings;
}

/* ---------- Parser de Sheet XML ---------- */

function parseSheetXml(xml, sharedStrings) {
  const rows   = [];
  const rowRe  = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;

  while ((rowMatch = rowRe.exec(xml)) !== null) {
    const rowContent = rowMatch[1];
    const cells      = [];
    const cellRe     = /<c\s([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch;

    while ((cellMatch = cellRe.exec(rowContent)) !== null) {
      const attrs  = cellMatch[1];
      const inner  = cellMatch[2];
      const typeM  = attrs.match(/t="([^"]*)"/);
      const type   = typeM ? typeM[1] : '';
      const colRef = (attrs.match(/r="([A-Z]+)/i) || [])[1] || '';
      const colIdx = colRefToIndex(colRef);

      // Extrai valor de <v>...</v>
      const vMatch = inner.match(/<v>([^<]*)<\/v>/);
      let val = vMatch ? vMatch[1] : '';

      if (type === 's') {
        // String compartilhada
        const idx = parseInt(val, 10);
        val = (!isNaN(idx) && sharedStrings[idx] !== undefined) ? sharedStrings[idx] : val;
      } else if (type === 'inlineStr') {
        // String inline
        const tM = inner.match(/<t>([^<]*)<\/t>/);
        val = tM ? decodeXmlEntities(tM[1]) : '';
      } else {
        val = decodeXmlEntities(val);
      }

      // Preenche colunas vazias até colIdx
      while (cells.length < colIdx) cells.push('');
      cells[colIdx] = val;
    }
    rows.push(cells);
  }
  return rows;
}

function colRefToIndex(ref) {
  if (!ref) return 0;
  let n = 0;
  for (let i = 0; i < ref.length; i++) {
    n = n * 26 + (ref.toUpperCase().charCodeAt(i) - 64);
  }
  return n - 1;
}

function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/* ==========================================================
   DETECÇÃO DE ESTRUTURA E NORMALIZAÇÃO
   ========================================================== */

/**
 * Detecta se um conjunto de linhas corresponde ao formato Jira.
 * Procura pelos cabeçalhos obrigatórios (case-insensitive).
 */
function detectarFormatoJira(rows) {
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i].map(c => (c || '').trim().toLowerCase());
    // Cabeçalhos esperados no Jira
    const temTicket = row.some(c => c.includes('ticket') || c.includes('issue') || c.includes('key') || c.includes('sac-') || /^sac-\d+$/.test(c));
    const temStatus = row.some(c => c.includes('status'));
    const temTitulo = row.some(c => c.includes('título') || c.includes('titulo') || c.includes('summary') || c.includes('resumo'));
    if ((temTicket || temTitulo) && temStatus) return i;
  }
  return -1;
}

/**
 * Detecta se um conjunto de linhas corresponde ao formato Multi.
 * Procura pelos cabeçalhos do relatório Multi360.
 */
function detectarFormatoMulti(rows) {
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i].map(c => (c || '').trim().toLowerCase());
    const temProtocolo = row.some(c => c.includes('protocolo'));
    const temMotivo    = row.some(c => c.includes('motivo'));
    const temData      = row.some(c => c.includes('data') || c.includes('início') || c.includes('inicio'));
    if (temProtocolo && (temMotivo || temData)) return i;
  }
  return -1;
}

/**
 * Mapeia índices de colunas a partir de uma linha de cabeçalho.
 * @param {string[]} headerRow
 * @param {Object.<string, string[]>} mapping  ex: { ticket: ['ticket','key','issue'] }
 * @returns {Object.<string, number>}  índices encontrados
 */
function mapearColunas(headerRow, mapping) {
  const result = {};
  const norm   = headerRow.map(c => (c || '').trim().toLowerCase());
  for (const [campo, aliases] of Object.entries(mapping)) {
    const idx = norm.findIndex(c => aliases.some(a => c.includes(a)));
    if (idx >= 0) result[campo] = idx;
  }
  return result;
}

/* ---------- Parsers de data ---------- */

/**
 * Tenta converter um valor de célula Excel em uma string "dd/mm/aaaa hh:mm".
 * Aceita: serial numérico Excel, "dd/mm/aaaa", "yyyy-mm-dd", "dd/mm/aaaa hh:mm".
 */
function normalizeDataExcel(valor) {
  if (!valor && valor !== 0) return null;
  const s = String(valor).trim();

  // Formato já compatível: "dd/mm/aaaa hh:mm"
  if (/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}/.test(s)) return s.slice(0, 16);

  // "dd/mm/aaaa"
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return `${s} 00:00`;

  // "yyyy-mm-dd"
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parts = s.split('-');
    const timePart = s.includes('T') ? s.split('T')[1].slice(0, 5) : '00:00';
    return `${parts[2].slice(0,2)}/${parts[1]}/${parts[0]} ${timePart}`;
  }

  // "dd/mm/aaaa hh:mm:ss"
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}:\d{2})/);
  if (m) return `${m[1]}/${m[2]}/${m[3]} ${m[4]}`;

  // Serial numérico Excel (dias desde 1900-01-00)
  const num = parseFloat(s);
  if (!isNaN(num) && num > 1000 && num < 100000) {
    // Converte serial Excel para Date (ajuste p/ bug do 1900)
    const d = new Date(Date.UTC(1900, 0, 1) + (num - (num >= 60 ? 2 : 1)) * 86400000);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yy = d.getUTCFullYear();
    return `${dd}/${mo}/${yy} 00:00`;
  }

  return null;
}

/**
 * Detecta o mês de referência predominante em um array de strings de data "dd/mm/aaaa hh:mm".
 * Retorna "aaaa-mm" ou null.
 */
function detectarMesPredom(datas) {
  const contagem = {};
  for (const d of datas) {
    if (!d) continue;
    const m = d.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) {
      const key = `${m[3]}-${m[2]}`;
      contagem[key] = (contagem[key] || 0) + 1;
    }
  }
  const entries = Object.entries(contagem);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

/* ---------- Normalização de registros ---------- */

/**
 * Converte texto de duração para minutos inteiros.
 * Aceita: "2d 3h 15min", "3h 15min", "45min", "2d", "1h"
 * Retorna null se não reconhecer o formato.
 */
function parseDurationToMinutes(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim().toLowerCase();
  let total = 0;
  let matched = false;
  const dMatch = s.match(/(\d+)\s*d/);
  const hMatch = s.match(/(\d+)\s*h/);
  const mMatch = s.match(/(\d+)\s*min/);
  if (dMatch) { total += parseInt(dMatch[1], 10) * 1440; matched = true; }
  if (hMatch) { total += parseInt(hMatch[1], 10) * 60;   matched = true; }
  if (mMatch) { total += parseInt(mMatch[1], 10);         matched = true; }
  return matched ? total : null;
}

function normalizarRegistroJira(row, colMap, extrairClienteFn) {
  const get = (campo) => {
    const idx = colMap[campo];
    return idx !== undefined ? (row[idx] || '').trim() : '';
  };

  const ticket  = get('ticket') || get('key');
  const titulo  = get('titulo') || get('summary');
  const tipo    = get('tipo');
  const status  = get('status');
  const criadoRaw = get('criado') || get('created');
  const limiteRaw = get('limite') || get('due');
  const classeRaw = get('classe') || get('class') || get('priority');
  const slaRaw    = get('sla');

  // Valida campos obrigatórios mínimos
  if (!ticket && !titulo) return null;

  const criado = normalizeDataExcel(criadoRaw) || '';
  const limite = normalizeDataExcel(limiteRaw) || '';

  // sla: aceita número direto (minutos) OU texto "Xd Xh Xmin" / "Xh Xmin"
  let sla = null;
  if (slaRaw) {
    const slaNum = parseFloat(slaRaw);
    if (!isNaN(slaNum) && slaNum >= 0) {
      // Número direto — assume minutos
      sla = Math.round(slaNum);
    } else {
      // Tenta parsear formato textual "Xd Xh Xmin" ou "Xh Xmin"
      sla = parseDurationToMinutes(slaRaw);
    }
  }

  // Normaliza status
  const statusMap = {
    'concluido': 'Concluido', 'concluído': 'Concluido', 'done': 'Concluido',
    'closed': 'Concluido', 'resolved': 'Concluido', 'fechado': 'Concluido',
    'em análise': 'Em Análise', 'em analise': 'Em Análise', 'in progress': 'Em Análise',
    'cancelado': 'Cancelado', 'cancelled': 'Cancelado',
    'aguarda': 'Aguarda Externo', 'aguardando': 'Aguarda Externo',
  };
  const statusNorm = statusMap[status.toLowerCase()] || status || 'Em Análise';

  // Normaliza classe/prioridade (A/B/C)
  let classe = 'B';
  const cl   = classeRaw.toUpperCase();
  if (cl === 'A' || cl === 'HIGH' || cl === 'ALTA')   classe = 'A';
  else if (cl === 'B' || cl === 'MEDIUM' || cl === 'MEDIA' || cl === 'MÉDIA') classe = 'B';
  else if (cl === 'C' || cl === 'LOW' || cl === 'BAIXA') classe = 'C';

  const cliente = get('cliente') || (titulo ? extrairClienteFn(titulo) : '');

  // Calcula tempo (campo tempo é derivado de criado + limite)
  let tempo = '—';
  if (criado && limite) {
    const parse = (s) => {
      const p = s.trim().split(' ');
      const [d, mo, y] = p[0].split('/').map(Number);
      const [h, mi]    = (p[1] || '00:00').split(':').map(Number);
      return new Date(y, mo - 1, d, h, mi);
    };
    const diff = Math.round((parse(limite) - parse(criado)) / 60000);
    if (!isNaN(diff) && diff >= 0) {
      const days  = Math.floor(diff / 1440);
      const hours = Math.floor((diff % 1440) / 60);
      const mins  = diff % 60;
      tempo = days > 0 ? `${days}d ${hours}h ${mins}min` : `${hours}h ${mins}min`;
    }
  }

  return {
    ticket:  ticket || `IMP-${Date.now()}`,
    titulo:  titulo || '',
    tipo:    tipo   || 'Solicitação de serviço',
    cliente,
    status:  statusNorm,
    criado,
    limite,
    tempo,
    classe,
    sla
  };
}

function normalizarRegistroMulti(row, colMap) {
  const get = (campo) => {
    const idx = colMap[campo];
    return idx !== undefined ? (row[idx] || '').trim() : '';
  };

  const protocolo     = get('protocolo');
  const motivo        = get('motivo');
  const nome          = get('nome') || get('cliente') || get('contato');
  const dataRaw       = get('data') || get('inicio');
  const dataFimRaw    = get('datafim') || get('fim') || get('encerramento');
  const avaliacaoRaw  = get('avaliacao') || get('nota');

  // Campo obrigatório mínimo
  if (!protocolo && !dataRaw) return null;

  const data            = normalizeDataExcel(dataRaw) || '';
  const dataFinalizacao = normalizeDataExcel(dataFimRaw) || '';
  const avalNum         = parseFloat(avaliacaoRaw);
  const avaliacao       = !isNaN(avalNum) && avalNum >= 0 && avalNum <= 10 ? avalNum : null;

  return {
    protocolo:       protocolo || `M${Date.now()}`,
    motivo:          motivo    || 'Resolução de dúvida',
    nome:            nome      || '',
    data:            data      || '',
    dataFinalizacao: dataFinalizacao || '',
    avaliacao
  };
}

/* ==========================================================
   DEDUPLICAÇÃO
   ========================================================== */

/**
 * Remove registros duplicados de 'novos' que já existam em 'existentes'
 * com base em uma chave identificadora única.
 * @returns {{ unicos: Array, duplicatas: number }}
 */
function deduplicarJira(existentes, novos) {
  const chaves = new Set(existentes.map(r => r.ticket));
  const unicos     = [];
  let duplicatas   = 0;
  for (const r of novos) {
    if (chaves.has(r.ticket)) {
      duplicatas++;
    } else {
      unicos.push(r);
      chaves.add(r.ticket);
    }
  }
  return { unicos, duplicatas };
}

function deduplicarMulti(existentes, novos) {
  const chaves = new Set(existentes.map(r => r.protocolo));
  const unicos   = [];
  let duplicatas = 0;
  for (const r of novos) {
    if (chaves.has(r.protocolo)) {
      duplicatas++;
    } else {
      unicos.push(r);
      chaves.add(r.protocolo);
    }
  }
  return { unicos, duplicatas };
}

/* ==========================================================
   INTERFACE DE IMPORTAÇÃO
   ========================================================== */

const importFileInput  = document.getElementById('importFile');
const importFileLabel  = document.getElementById('importFileName');
const btnImportar      = document.getElementById('btnImportar');
const importStatus     = document.getElementById('importStatus');

let _arquivoSelecionado = null;

function setImportStatus(msg, tipo) {
  // tipo: 'ok' | 'error' | 'warn' | ''
  importStatus.textContent = msg;
  importStatus.className   = 'import-status' + (tipo ? ` is-${tipo}` : '');
}

// Seleção de arquivo
importFileInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls'].includes(ext)) {
    setImportStatus('Formato não suportado. Use arquivos .xlsx ou .xls.', 'error');
    btnImportar.disabled = true;
    _arquivoSelecionado  = null;
    return;
  }

  // Limita tamanho a 20 MB
  if (file.size > 20 * 1024 * 1024) {
    setImportStatus('Arquivo muito grande (máx. 20 MB).', 'error');
    btnImportar.disabled = true;
    _arquivoSelecionado  = null;
    return;
  }

  _arquivoSelecionado  = file;
  importFileLabel.textContent = file.name;
  btnImportar.disabled = false;
  setImportStatus('Arquivo selecionado. Clique em "Importar dados" para processar.', 'warn');
});

// Executa a importação
btnImportar.addEventListener('click', async () => {
  if (!_arquivoSelecionado) return;

  btnImportar.disabled = true;
  setImportStatus('Processando arquivo…', '');

  try {
    const buffer  = await _arquivoSelecionado.arrayBuffer();
    const origem  = document.querySelector('input[name="importOrigem"]:checked')?.value || 'jira';
    const mesRef  = document.getElementById('importMesRef')?.value || '';

    const sheets = await parseXlsxAsync(buffer);
    if (!sheets.length) throw new Error('Nenhuma planilha encontrada no arquivo.');

    // Processa todas as planilhas, coleta registros válidos
    const registrosJira  = [];
    const registrosMulti = [];
    let detectadoComo    = null;

    for (const sheet of sheets) {
      const { rows } = sheet;
      if (!rows.length) continue;

      // Tenta detectar formato, respeitando a seleção do usuário
      let headerIdx = -1;
      let colMap    = {};

      if (origem === 'jira') {
        headerIdx = detectarFormatoJira(rows);
        if (headerIdx < 0) {
          // Tenta a primeira linha como cabeçalho mesmo assim
          headerIdx = 0;
        }
        colMap = mapearColunas(rows[headerIdx], {
          ticket:  ['ticket', 'key', 'issue', 'sac'],
          titulo:  ['título', 'titulo', 'summary', 'resumo', 'assunto'],
          tipo:    ['tipo', 'type', 'issuetype'],
          status:  ['status'],
          criado:  ['criado', 'created', 'abertura', 'data de criação', 'data criação',
                    'data abertura', 'creation', 'dt criação', 'dt_criacao'],
          limite:  ['limite', 'due', 'prazo', 'deadline', 'data limite', 'dt limite'],
          classe:  ['classe', 'class', 'priority', 'prioridade', 'classificação',
                    'classif', 'classificacao comercial', 'class. comercial'],
          sla:     ['[sla] - tempo solução', '[sla] - tempo de solução', 'sla - tempo solução',
                    'tempo solução', 'tempo de solução', 'sla', 'tempo sla'],
          cliente: ['cliente', 'client', 'laboratório', 'lab']
        });
        detectadoComo = 'jira';
        for (let i = headerIdx + 1; i < rows.length; i++) {
          if (rows[i].every(c => !c)) continue; // linha vazia
          const reg = normalizarRegistroJira(rows[i], colMap, _extrairClienteJiraFn);
          if (reg) registrosJira.push(reg);
        }
      } else {
        headerIdx = detectarFormatoMulti(rows);
        if (headerIdx < 0) headerIdx = 0;
        colMap = mapearColunas(rows[headerIdx], {
          protocolo:  ['protocolo', 'protocol', 'id', 'número', 'numero'],
          motivo:     ['motivo', 'reason', 'assunto', 'subject', 'tipo'],
          nome:       ['nome', 'name', 'cliente', 'client', 'contato', 'contact'],
          data:       ['data início', 'data de início', 'data inicio', 'data abertura',
                       'inicio', 'início', 'data', 'created', 'start', 'dt inicio', 'dt_inicio'],
          datafim:    ['data encerramento', 'data finalização', 'data finalizacao',
                       'encerramento', 'finalização', 'finalizacao', 'fim', 'end',
                       'dt encerramento', 'dt_encerramento'],
          avaliacao:  ['avaliação', 'avaliacao', 'nota', 'score', 'nps', 'rating',
                       'nota de avaliação', 'nota de avaliacao']
        });
        detectadoComo = 'multi';
        for (let i = headerIdx + 1; i < rows.length; i++) {
          if (rows[i].every(c => !c)) continue;
          const reg = normalizarRegistroMulti(rows[i], colMap);
          if (reg) registrosMulti.push(reg);
        }
      }
    }

    if (!registrosJira.length && !registrosMulti.length) {
      throw new Error(
        'Nenhum registro válido encontrado no arquivo. ' +
        'Verifique se o arquivo está no formato correto e se os cabeçalhos correspondem ao tipo selecionado (Jira ou Multi).'
      );
    }

    // Detecta mês de referência, se não foi fornecido
    let mesDetectado = mesRef;
    if (!mesDetectado) {
      const datasAmostra = origem === 'jira'
        ? registrosJira.map(r  => r.criado)
        : registrosMulti.map(r => r.data);
      mesDetectado = detectarMesPredom(datasAmostra) || '';
    }

    // Deduplicação e relatório
    let totalImportados = 0;
    let duplicatas      = 0;
    let mensagemFinal   = '';

    if (origem === 'jira') {
      const { unicos, duplicatas: dup } = deduplicarJira(getAllJira(), registrosJira);
      duplicatas       = dup;
      totalImportados  = unicos.length;

      if (totalImportados === 0 && dup > 0) {
        setImportStatus(
          `Todos os ${dup} registros encontrados já existem (duplicatas). Nenhum dado foi adicionado.`,
          'warn'
        );
        btnImportar.disabled = false;
        return;
      }

      // Para Jira, como a chave é o ticket, não há substituição — só adição.
      _importedJira.push(...unicos);
      salvarDadosImportados(); // persiste no localStorage
      mensagemFinal = `✓ ${totalImportados} chamado${totalImportados !== 1 ? 's' : ''} Jira importado${totalImportados !== 1 ? 's' : ''}` +
        (dup > 0 ? ` · ${dup} duplicata${dup !== 1 ? 's' : ''} ignorada${dup !== 1 ? 's' : ''}` : '') +
        (mesDetectado ? ` · Mês: ${labelMes(mesDetectado)}` : '') +
        ' · Salvo no navegador';
    } else {
      const { unicos, duplicatas: dup } = deduplicarMulti(getAllMulti(), registrosMulti);
      duplicatas       = dup;
      totalImportados  = unicos.length;

      if (totalImportados === 0 && dup > 0) {
        setImportStatus(
          `Todos os ${dup} registros encontrados já existem (duplicatas). Nenhum dado foi adicionado.`,
          'warn'
        );
        btnImportar.disabled = false;
        return;
      }

      _importedMulti.push(...unicos);
      salvarDadosImportados(); // persiste no localStorage
      mensagemFinal = `✓ ${totalImportados} atendimento${totalImportados !== 1 ? 's' : ''} Multi importado${totalImportados !== 1 ? 's' : ''}` +
        (dup > 0 ? ` · ${dup} duplicata${dup !== 1 ? 's' : ''} ignorada${dup !== 1 ? 's' : ''}` : '') +
        (mesDetectado ? ` · Mês: ${labelMes(mesDetectado)}` : '') +
        ' · Salvo no navegador';
    }

    setImportStatus(mensagemFinal, 'ok');

    // Atualiza os selects de mês (pode haver novo mês nos dados importados)
    popularSelectMeses('periodoMes');
    popularSelectMeses('compMesA');
    popularSelectMeses('compMesB');
    popularImportMeses();

    // Re-aplica o filtro atual para incluir os dados importados
    aplicarFiltro();

    // Reseta seleção de arquivo para permitir nova importação
    importFileInput.value = '';
    _arquivoSelecionado = null;
    importFileLabel.textContent = 'Selecionar arquivo .xlsx';
    btnImportar.disabled = true;

  } catch (err) {
    console.error('[excel-import]', err);
    setImportStatus(
      `Erro na importação: ${err.message || 'Falha desconhecida ao processar o arquivo.'}`,
      'error'
    );
    btnImportar.disabled = false;
  }
});

/* ---------- Helper de extração de cliente Jira (reusa a lógica do data.js) ---------- */
function _extrairClienteJiraFn(titulo) {
  const m = titulo.match(/^([^-–]+?)\s*[-–]/);
  return m ? m[1].trim() : titulo.split(' ')[0];
}

/* ==========================================================
   LIMPAR DADOS IMPORTADOS
   Remove todos os registros importados do localStorage e
   da memória, depois reaplica os filtros com os dados base.
   ========================================================== */

document.getElementById('btnLimparImportados').addEventListener('click', () => {
  const totalJira  = _importedJira.length;
  const totalMulti = _importedMulti.length;

  if (totalJira === 0 && totalMulti === 0) {
    setImportStatus('Não há dados importados para limpar.', 'warn');
    return;
  }

  const confirma = window.confirm(
    `Isso removerá ${totalJira} registro(s) Jira e ${totalMulti} registro(s) Multi importados.\n\n` +
    `Os dados do arquivo data.js (histórico base) não serão afetados.\n\nDeseja continuar?`
  );
  if (!confirma) return;

  _importedJira.length  = 0;
  _importedMulti.length = 0;
  salvarDadosImportados();

  // Atualiza selects de mês (podem sumir meses que vieram só de importações)
  popularSelectMeses('periodoMes');
  popularSelectMeses('compMesA');
  popularSelectMeses('compMesB');
  popularImportMeses();

  aplicarFiltro();
  setImportStatus('Dados importados removidos com sucesso.', 'ok');
});
