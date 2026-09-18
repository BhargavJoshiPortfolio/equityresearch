const fs = require('fs');
const path = require('path');

const researchDir = path.join(__dirname, 'research_text');
const priceDir = path.join(__dirname, '..', 'assets', 'data');
const outDir = path.join(__dirname, '..', 'assets', 'data');

const files = fs.readdirSync(researchDir).filter(f => f.endsWith('.txt'));

// map filename stem -> price data key (as written by update-prices.js)
const priceKeyMap = { PLTR: 'PLTR', GILD: 'GILD', HIMX: 'HIMX', CRWD: 'CRWD', IFX: 'IFX', MU: 'MU', RTX: 'RTX' };

const allPriceSummaries = JSON.parse(fs.readFileSync(path.join(priceDir, 'price-summary.json'), 'utf8'));

// Dates shown on the site. Bump these when you re-research fundamentals or add updates.
const FUNDAMENTALS_AS_OF = '2026-08-31';
const UPDATES_AS_OF = '2026-09-18';

// "low=80 avg=196.84 high=255 analysts=32 asof=2026-09-16" -> object (or null)
function parsePriceTarget(str) {
  if (!str) return null;
  const out = {};
  str.split(/\s+/).forEach(tok => {
    const m = tok.match(/^(\w+)=(.+)$/);
    if (!m) return;
    out[m[1]] = m[1] === 'asof' ? m[2] : Number(m[2]);
  });
  return out.avg ? out : null;
}

function parseBlock(text) {
  const lines = text.split(/\r?\n/);
  const data = {};
  let currentKey = null;
  const listFields = ['BULL_CASE', 'BEAR_CASE', 'RECENT_CATALYSTS', 'KEY_METRICS', 'UPDATES', 'SOURCES'];
  listFields.forEach(k => { data[k] = []; });

  const singleLineRe = /^([A-Z_]+):\s?(.*)$/;

  for (let raw of lines) {
    const line = raw;
    if (line.trim() === '') continue;
    const m = line.match(singleLineRe);
    if (m && (m[1] === m[1].toUpperCase()) && /^[A-Z_]+$/.test(m[1])) {
      currentKey = m[1];
      if (listFields.includes(currentKey)) {
        if (m[2] && m[2].trim()) data[currentKey].push(m[2].trim().replace(/^-\s*/, ''));
      } else {
        data[currentKey] = m[2].trim();
      }
    } else if (currentKey && listFields.includes(currentKey) && line.trim().startsWith('-')) {
      data[currentKey].push(line.trim().replace(/^-\s*/, ''));
    } else if (currentKey && !listFields.includes(currentKey)) {
      // continuation of a paragraph field
      data[currentKey] += ' ' + line.trim();
    }
  }
  return data;
}

// parse KEY_METRICS list of "Label: value" into an object preserving order
function metricsToObj(arr) {
  const out = [];
  arr.forEach(line => {
    const idx = line.indexOf(':');
    if (idx > -1) {
      out.push({ label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() });
    }
  });
  return out;
}

const allStocks = [];

files.forEach(f => {
  const stem = path.basename(f, '.txt');
  const text = fs.readFileSync(path.join(researchDir, f), 'utf8');
  const parsed = parseBlock(text);

  const priceKey = priceKeyMap[stem];
  if (!allPriceSummaries[priceKey]) {
    console.error('Missing price summary for', stem, '- run tools/update-prices.js first');
  }

  const stock = {
    id: stem,
    ticker: parsed.TICKER || stem,
    companyName: parsed.COMPANY_NAME || '',
    sector: parsed.SECTOR || '',
    industry: parsed.INDUSTRY || '',
    tagline: parsed.TAGLINE || '',
    businessOverview: (parsed.BUSINESS_OVERVIEW || '').trim(),
    bullCase: parsed.BULL_CASE,
    bearCase: parsed.BEAR_CASE,
    catalysts: parsed.RECENT_CATALYSTS,
    metrics: metricsToObj(parsed.KEY_METRICS),
    valuationView: (parsed.VALUATION_VIEW || '').trim(),
    stance: (parsed.STANCE || '').trim(),
    priceTarget: parsePriceTarget(parsed.PRICE_TARGET),
    myTake: (parsed.MY_TAKE || '').trim(),
    updates: parsed.UPDATES,
    sources: parsed.SOURCES,
    priceKey: priceKey
  };
  allStocks.push(stock);
  console.log('Parsed', stem, '-', stock.companyName, '| bull:', stock.bullCase.length, 'bear:', stock.bearCase.length, 'metrics:', stock.metrics.length, 'sources:', stock.sources.length);
});

// preserve a fixed display order matching the user's original list
const order = ['PLTR', 'GILD', 'HIMX', 'CRWD', 'IFX', 'MU', 'RTX'];
allStocks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

const jsOut = 'window.RESEARCH_DATA = ' + JSON.stringify(allStocks, null, 2) + ';\n' +
  'window.RESEARCH_META = ' + JSON.stringify({ fundamentalsAsOf: FUNDAMENTALS_AS_OF, updatesAsOf: UPDATES_AS_OF }) + ';\n';
fs.writeFileSync(path.join(outDir, 'research-data.js'), jsOut);
console.log('\nWrote research-data.js with', allStocks.length, 'stocks');
