/*
 * Refreshes assets/data/price-data.js, price-summary.js and price-summary.json
 * with fresh daily price history pulled from Yahoo Finance's public chart API.
 * Run with: node tools/update-prices.js
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

const outDir = path.join(__dirname, '..', 'assets', 'data');

function fetchChart(symbol) {
  return new Promise((resolve, reject) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3y&interval=1d`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const priceData = {};
  const summary = {};

  for (const [symbol, key] of Object.entries(TICKERS)) {
    const raw = await fetchChart(symbol);
    const result = raw.chart.result[0];
    const meta = result.meta;
    const ts = result.timestamp;
    const closes = result.indicators.quote[0].close;

    const series = [];
    for (let i = 0; i < ts.length; i++) {
      if (closes[i] === null || closes[i] === undefined) continue;
      const d = new Date(ts[i] * 1000).toISOString().slice(0, 10);
      series.push([d, Math.round(closes[i] * 100) / 100]);
    }

    priceData[key] = { symbol: key, currency: meta.currency, series };

    const first = series[0];
    const last = series[series.length - 1];
    const yearAgo = series[Math.max(0, series.length - 253)];

    summary[key] = {
      symbol: key,
      currency: meta.currency,
      currentPrice: meta.regularMarketPrice,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      threeYearReturnPct: first ? Math.round(((last[1] - first[1]) / first[1]) * 1000) / 10 : null,
      oneYearReturnPct: yearAgo ? Math.round(((last[1] - yearAgo[1]) / yearAgo[1]) * 1000) / 10 : null,
      dataPoints: series.length,
      lastDate: last ? last[0] : null
    };

    console.log(key, '->', series.length, 'points, last close', last, '1y%', summary[key].oneYearReturnPct);
  }

  fs.writeFileSync(path.join(outDir, 'price-data.js'), 'window.PRICE_DATA = ' + JSON.stringify(priceData) + ';\n');
  fs.writeFileSync(path.join(outDir, 'price-summary.js'), 'window.PRICE_SUMMARY = ' + JSON.stringify(summary) + ';\n');
  fs.writeFileSync(path.join(outDir, 'price-summary.json'), JSON.stringify(summary, null, 2));
  console.log('\nDone. Updated price-data.js, price-summary.js, price-summary.json for', Object.keys(TICKERS).length, 'tickers.');
}

main().catch((e) => { console.error(e); process.exit(1); });
