/*
 * Refreshes assets/data/price-data.js, price-summary.js/.json and price-meta.js
 * with fresh daily price history pulled from Yahoo Finance's public chart API.
 * Run with: node tools/update-prices.js
 *
 * Nothing is written unless every symbol downloads and parses cleanly, so a
 * failed run (rate limit, blocked request) never leaves half-updated data.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

// Yahoo symbol -> the key used across the site (RESEARCH_DATA[].priceKey)
const TICKERS = {
  'PLTR': 'PLTR',
  'GILD': 'GILD',
  'HIMX': 'HIMX',
  'CRWD': 'CRWD',
  'IFX.DE': 'IFX',
  'MU': 'MU',
  'RTX': 'RTX'
};

// Benchmarks shown as dashed reference lines on the compare page
const BENCHMARKS = {
  '^GSPC': { key: 'SPX', name: 'S&P 500' },
  '^SOX': { key: 'SOX', name: 'PHLX Semiconductor (SOX)' }
};

const outDir = path.join(__dirname, '..', 'assets', 'data');

function fetchOnce(symbol) {
  return new Promise((resolve, reject) => {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(symbol) + '?range=3y&interval=1d';
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(symbol + ': HTTP ' + res.statusCode));
        try {
          const json = JSON.parse(body);
          const result = json.chart && json.chart.result && json.chart.result[0];
          if (!result || !result.timestamp) return reject(new Error(symbol + ': no data in response'));
          resolve(result);
        } catch (e) { reject(new Error(symbol + ': bad JSON (' + e.message + ')')); }
      });
    }).on('error', reject);
  });
}

async function fetchChart(symbol) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { return await fetchOnce(symbol); } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
  throw lastErr;
}

function toSeries(result) {
  const closes = result.indicators.quote[0].close;
  const series = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    if (closes[i] === null || closes[i] === undefined) continue;
    series.push([new Date(result.timestamp[i] * 1000).toISOString().slice(0, 10), Math.round(closes[i] * 100) / 100]);
  }
  if (series.length < 200) throw new Error('suspiciously short series (' + series.length + ' points)');
  return series;
}

async function main() {
  const priceData = {};
  const summary = {};

  for (const [symbol, key] of Object.entries(TICKERS)) {
    const result = await fetchChart(symbol);
    const meta = result.meta;
    const series = toSeries(result);
    priceData[key] = { symbol: key, currency: meta.currency, series };

    const last = series[series.length - 1];
    // Calendar-based windows, matching the chart's 1Y / 3Y range buttons exactly
    const since = (months) => {
      const cutoff = new Date(last[0] + 'T00:00:00Z');
      cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
      const cut = cutoff.toISOString().slice(0, 10);
      return series.find((p) => p[0] >= cut) || series[0];
    };
    const retSince = (months) => {
      const base = since(months);
      return Math.round(((last[1] - base[1]) / base[1]) * 1000) / 10;
    };

    summary[key] = {
      symbol: key,
      currency: meta.currency,
      currentPrice: meta.regularMarketPrice,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      threeYearReturnPct: retSince(36),
      oneYearReturnPct: retSince(12),
      dataPoints: series.length,
      lastDate: last[0]
    };
    console.log(key, '->', series.length, 'points, last close', last, '1y%', summary[key].oneYearReturnPct);
  }

  for (const [symbol, info] of Object.entries(BENCHMARKS)) {
    const result = await fetchChart(symbol);
    const series = toSeries(result);
    priceData[info.key] = { symbol: info.key, name: info.name, currency: result.meta.currency, benchmark: true, series };
    console.log(info.key, '->', series.length, 'points (benchmark)');
  }

  const lastDate = Object.keys(TICKERS).map((k) => summary[TICKERS[k]].lastDate).sort().pop();
  const meta = { updatedAt: new Date().toISOString(), lastDate };

  fs.writeFileSync(path.join(outDir, 'price-data.js'), 'window.PRICE_DATA = ' + JSON.stringify(priceData) + ';\n');
  fs.writeFileSync(path.join(outDir, 'price-summary.js'), 'window.PRICE_SUMMARY = ' + JSON.stringify(summary) + ';\n');
  fs.writeFileSync(path.join(outDir, 'price-summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outDir, 'price-meta.js'), 'window.PRICE_META = ' + JSON.stringify(meta) + ';\n');
  console.log('\nDone. Latest close date:', lastDate);
}

main().catch((e) => { console.error('FAILED, no files were changed:', e.message); process.exit(1); });
