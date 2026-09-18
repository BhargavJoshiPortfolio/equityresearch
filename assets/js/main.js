/* Shared render helpers for index.html and stock.html */
(function () {
  const POS = '#3ecf8e';
  const NEG = '#f2685c';

  // One fixed color per company (validated categorical palette, dark surface).
  const STOCK_COLORS = {
    PLTR: '#3987e5', GILD: '#d95926', HIMX: '#199e70', CRWD: '#c98500',
    IFX: '#d55181', MU: '#008300', RTX: '#9085e9'
  };
  const STANCE_RANK = { 'Bullish': 0, 'Cautiously Bullish': 1, 'Neutral': 2, 'Cautiously Bearish': 3, 'Bearish': 4 };
  const MONTHS_LONG = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function shortTicker(stock) {
    return stock.ticker.split(' ')[0].replace(/[^A-Z]/g, '');
  }
  function stanceClass(stance) {
    return 'stance-' + (stance || 'neutral').toLowerCase().replace(/\s+/g, '-');
  }
  function fmtPct(n) {
    if (n === null || n === undefined || isNaN(n)) return '-';
    return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function fmtLongDate(iso) {
    if (!iso) return '';
    const p = iso.slice(0, 10).split('-');
    return MONTHS_LONG[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0];
  }
  function currencySymbol(code) {
    return code === 'EUR' ? '€' : '$';
  }
  function money(v, code, compact) {
    const dec = compact && Math.abs(v - Math.round(v)) < 0.005 ? 0 : 2;
    return currencySymbol(code) + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function asOfLine() {
    const meta = window.PRICE_META || {};
    const rmeta = window.RESEARCH_META || {};
    const bits = [];
    if (meta.lastDate) bits.push('Prices through ' + fmtLongDate(meta.lastDate));
    if (rmeta.fundamentalsAsOf) bits.push('fundamentals as of ' + fmtLongDate(rmeta.fundamentalsAsOf));
    return bits.join(' · ');
  }

  /* ---------------- Home page ---------------- */
  function renderCard(stock) {
    const price = window.PRICE_DATA[stock.priceKey];
    const summary = window.PRICE_SUMMARY[stock.priceKey];
    const oneYear = ChartEngine.filterRange(price.series, 12);
    const yr = summary.oneYearReturnPct;

    const card = document.createElement('a');
    card.href = 'stock.html?t=' + stock.id;
    card.className = 'stock-card';

    const top = el('div', 'stock-card-top');
    const block = el('div', 'ticker-block');
    block.appendChild(el('span', 'ticker', shortTicker(stock)));
    block.appendChild(el('span', 'company-name', stock.companyName));
    block.appendChild(el('span', 'sector-tag', stock.sector + (stock.industry ? ' · ' + stock.industry : '')));
    top.appendChild(block);
    top.appendChild(el('span', 'return-badge ' + (yr >= 0 ? 'pos' : 'neg'), fmtPct(yr) + ' · 1Y'));
    card.appendChild(top);

    const spark = el('div', 'spark-wrap');
    spark.innerHTML = ChartEngine.sparkline(oneYear);
    card.appendChild(spark);

    card.appendChild(el('p', 'stock-card-tagline', stock.tagline));
    const bottom = el('div', 'stock-card-bottom');
    bottom.appendChild(el('span', 'stance-badge ' + stanceClass(stock.stance), stock.stance));
    bottom.appendChild(el('span', 'card-link', 'View research →'));
    card.appendChild(bottom);
    return card;
  }

  function renderGrid(gridId, controlsId) {
    const grid = document.getElementById(gridId);
    const controls = document.getElementById(controlsId);
    const stocks = window.RESEARCH_DATA;
    const sectors = ['All'].concat(stocks.map(function (s) { return s.sector; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    const state = { sector: 'All', sort: 'default' };

    function paint() {
      let list = stocks.filter(function (s) { return state.sector === 'All' || s.sector === state.sector; });
      const ret = function (s) { return window.PRICE_SUMMARY[s.priceKey].oneYearReturnPct; };
      if (state.sort === 'ret-desc') list = list.slice().sort(function (a, b) { return ret(b) - ret(a); });
      else if (state.sort === 'ret-asc') list = list.slice().sort(function (a, b) { return ret(a) - ret(b); });
      else if (state.sort === 'stance') list = list.slice().sort(function (a, b) { return STANCE_RANK[a.stance] - STANCE_RANK[b.stance]; });
      grid.textContent = '';
      if (!list.length) grid.appendChild(el('p', 'empty-note', 'No companies match this filter.'));
      list.forEach(function (s) { grid.appendChild(renderCard(s)); });
      controls.querySelectorAll('.chip').forEach(function (c) {
        c.setAttribute('aria-pressed', String(c.dataset.sector === state.sector));
      });
    }

    const sectorCtl = el('div', 'control');
    sectorCtl.appendChild(el('span', 'control-label', 'Sector'));
    const chips = el('div', 'chip-group');
    sectors.forEach(function (name) {
      const b = el('button', 'chip', name);
      b.type = 'button';
      b.dataset.sector = name;
      b.addEventListener('click', function () { state.sector = name; paint(); });
      chips.appendChild(b);
    });
    sectorCtl.appendChild(chips);

    const sortCtl = el('div', 'control');
    sortCtl.appendChild(el('label', 'control-label', 'Sort'));
    const sel = el('select', 'select');
    [['default', 'Research order'], ['ret-desc', '1Y return, high to low'], ['ret-asc', '1Y return, low to high'], ['stance', 'Stance, most bullish first']]
      .forEach(function (o) { const opt = el('option', null, o[1]); opt.value = o[0]; sel.appendChild(opt); });
    sel.addEventListener('change', function () { state.sort = sel.value; paint(); });
    sortCtl.firstChild.setAttribute('for', 'sort-select');
    sel.id = 'sort-select';
    sortCtl.appendChild(sel);

    controls.appendChild(sectorCtl);
    controls.appendChild(sortCtl);
    paint();

    setText('asof', asOfLine());
  }

  /* ---------------- Stock page ---------------- */
  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function renderTargets(stock, summary, code) {
    const host = document.getElementById('targets-section');
    const pt = stock.priceTarget;
    if (!pt || !pt.avg) { host.hidden = true; return; }
    const price = summary.currentPrice;
    const panel = document.getElementById('targets-panel');
    panel.textContent = '';

    if (pt.low && pt.high) {
      const lo = Math.min(pt.low, price), hi = Math.max(pt.high, price);
      const pad = (hi - lo) * 0.06;
      const min = lo - pad, max = hi + pad;
      const pos = function (v) { return ((v - min) / (max - min) * 100).toFixed(2) + '%'; };
      const track = el('div', 'pt-track');
      const range = el('div', 'pt-range');
      range.style.left = pos(pt.low);
      range.style.right = (100 - parseFloat(pos(pt.high))) + '%';
      track.appendChild(range);
      const avg = el('div', 'pt-marker avg');
      avg.style.left = pos(pt.avg);
      avg.appendChild(el('span', null, 'Avg target'));
      track.appendChild(avg);
      const now = el('div', 'pt-marker now');
      now.style.left = pos(price);
      now.appendChild(el('span', null, 'Price now'));
      track.appendChild(now);
      panel.appendChild(track);
    }

    const upside = (pt.avg / price - 1) * 100;
    const p = el('p', 'pt-summary');
    const parts = [];
    if (pt.low && pt.high) parts.push('Analyst targets range from ' + money(pt.low, code, true) + ' to ' + money(pt.high, code, true) + ', averaging ');
    else parts.push('The average analyst target is ');
    p.appendChild(document.createTextNode(parts[0]));
    p.appendChild(el('strong', null, money(pt.avg, code, true)));
    p.appendChild(document.createTextNode(', which is '));
    p.appendChild(el('strong', null, (upside >= 0 ? '+' : '') + upside.toFixed(1) + '%'));
    p.appendChild(document.createTextNode(' versus the latest close of ' + money(price, code) + '.'));
    panel.appendChild(p);

    const meta = [];
    if (pt.analysts) meta.push(pt.analysts + ' analysts');
    if (pt.asof) meta.push('as of ' + fmtLongDate(pt.asof));
    setText('targets-asof', meta.join(' · '));
  }

  function renderStockPage() {
    const id = getQueryParam('t');
    const stock = window.RESEARCH_DATA.find(function (s) { return s.id === id; }) || window.RESEARCH_DATA[0];
    const price = window.PRICE_DATA[stock.priceKey];
    const summary = window.PRICE_SUMMARY[stock.priceKey];
    const code = price.currency;
    const cur = currencySymbol(code);
    const tk = shortTicker(stock);

    document.title = tk + ' · ' + stock.companyName + ' | Equity Research';
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', stock.tagline);

    setText('sh-ticker', tk);
    setText('sh-company', stock.companyName);
    setText('sh-sector', stock.sector);
    setText('sh-industry', stock.industry);
    const badge = document.getElementById('sh-stance');
    badge.textContent = stock.stance;
    badge.className = 'stance-badge ' + stanceClass(stock.stance);
    setText('sh-tagline', stock.tagline);

    const priceEl = document.getElementById('sh-price');
    priceEl.textContent = cur + summary.currentPrice.toFixed(2);
    priceEl.appendChild(el('span', 'price-currency', code));
    setText('sh-range', '52w range: ' + cur + summary.fiftyTwoWeekLow.toFixed(2) + ' - ' + cur + summary.fiftyTwoWeekHigh.toFixed(2));
    setText('sh-asof', asOfLine());

    // interactive price chart
    const allPoints = ChartEngine.toPoints(price.series);
    const chartHost = document.getElementById('chart');
    const chart = ChartEngine.line(chartHost, { series: [], height: 320, yPrefix: cur, ariaLabel: tk + ' closing price. Focus the chart and use the left and right arrow keys to read values.' });
    function setRange(months) {
      const pts = ChartEngine.sliceMonths(allPoints, months);
      const change = (pts[pts.length - 1][1] / pts[0][1] - 1) * 100;
      const color = change >= 0 ? POS : NEG;
      chart.update({ series: [{ key: tk, label: 'Close', color: color, points: pts, area: true }], valueFormat: function (v) { return money(v, code); } });
      const r = document.getElementById('chart-return');
      r.textContent = fmtPct(change);
      r.style.color = color;
    }
    document.querySelectorAll('#chart-panel .range-toggle button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#chart-panel .range-toggle button').forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        setRange(parseInt(btn.dataset.months, 10) || null);
      });
    });
    setRange(12);

    // metrics
    const metricsGrid = document.getElementById('metrics-grid');
    stock.metrics.forEach(function (m) {
      const c = el('div', 'metric-card');
      c.appendChild(el('div', 'metric-label', m.label));
      c.appendChild(el('div', 'metric-value', m.value));
      metricsGrid.appendChild(c);
    });

    renderTargets(stock, summary, code);

    setText('business-overview', stock.businessOverview);

    if (stock.myTake) {
      document.getElementById('take-section').hidden = false;
      setText('my-take', stock.myTake);
    }

    function fillList(id, items) {
      const ul = document.getElementById(id);
      items.forEach(function (t) { ul.appendChild(el('li', null, t)); });
    }
    fillList('bull-list', stock.bullCase);
    fillList('bear-list', stock.bearCase);

    const catList = document.getElementById('catalyst-list');
    stock.catalysts.forEach(function (t) {
      const item = el('div', 'catalyst-item');
      item.appendChild(el('div', 'catalyst-dot'));
      item.appendChild(el('div', 'catalyst-text', t));
      catList.appendChild(item);
    });

    if (stock.updates && stock.updates.length) {
      document.getElementById('updates-section').hidden = false;
      const list = document.getElementById('updates-list');
      stock.updates.forEach(function (t) { list.appendChild(el('div', 'update-item', t)); });
      setText('updates-asof', 'Added ' + fmtLongDate((window.RESEARCH_META || {}).updatesAsOf));
    }

    setText('valuation-view', stock.valuationView);

    const sourcesList = document.getElementById('sources-list');
    stock.sources.forEach(function (url) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      if (/^https?:\/\//.test(url)) a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = url;
      li.appendChild(a);
      sourcesList.appendChild(li);
    });

    const idx = window.RESEARCH_DATA.findIndex(function (s) { return s.id === stock.id; });
    const n = window.RESEARCH_DATA.length;
    const prev = window.RESEARCH_DATA[(idx - 1 + n) % n];
    const next = window.RESEARCH_DATA[(idx + 1) % n];
    const pl = document.getElementById('prev-link');
    pl.href = 'stock.html?t=' + prev.id;
    pl.querySelector('.pnav-ticker').textContent = shortTicker(prev);
    const nl = document.getElementById('next-link');
    nl.href = 'stock.html?t=' + next.id;
    nl.querySelector('.pnav-ticker').textContent = shortTicker(next);
  }

  window.SiteRender = { renderGrid: renderGrid, renderStockPage: renderStockPage };
  window.SiteUtil = { STOCK_COLORS: STOCK_COLORS, shortTicker: shortTicker, fmtPct: fmtPct, fmtLongDate: fmtLongDate, asOfLine: asOfLine, el: el, setText: setText };
})();
