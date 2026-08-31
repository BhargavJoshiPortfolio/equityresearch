/* Shared render helpers for index.html and stock.html */
(function () {
  function stanceClass(stance) {
    return 'stance-' + (stance || 'neutral').toLowerCase().replace(/\s+/g, '-');
  }

  function fmtPct(n) {
    if (n === null || n === undefined) return '-';
    return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
  }

  function renderCard(stock) {
    const price = window.PRICE_DATA[stock.priceKey];
    const summary = window.PRICE_SUMMARY ? window.PRICE_SUMMARY[stock.priceKey] : null;
    const series = price.series;
    const oneYear = ChartEngine.filterRange(series, 12);
    const yr = summary ? summary.oneYearReturnPct : null;
    const posNeg = yr >= 0 ? 'pos' : 'neg';

    const card = document.createElement('a');
    card.href = 'stock.html?t=' + stock.id;
    card.className = 'stock-card';
    card.innerHTML = `
      <div class="stock-card-top">
        <div class="ticker-block">
          <span class="ticker">${stock.ticker.split(' ')[0].replace(/[^A-Z]/g, '')}</span>
          <span class="company-name">${stock.companyName}</span>
          <span class="sector-tag">${stock.sector}${stock.industry ? ' · ' + stock.industry : ''}</span>
        </div>
        <span class="return-badge ${posNeg}">${fmtPct(yr)} · 1Y</span>
      </div>
      <div class="spark-wrap">${ChartEngine.sparkline(oneYear)}</div>
      <p class="stock-card-tagline">${stock.tagline}</p>
      <div class="stock-card-bottom">
        <span class="stance-badge ${stanceClass(stock.stance)}">${stock.stance}</span>
        <span class="card-link">View research →</span>
      </div>
    `;
    return card;
  }

  function renderGrid(containerId) {
    const container = document.getElementById(containerId);
    window.RESEARCH_DATA.forEach(stock => {
      container.appendChild(renderCard(stock));
    });
  }

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function renderStockPage() {
    const id = getQueryParam('t');
    const stock = window.RESEARCH_DATA.find(s => s.id === id) || window.RESEARCH_DATA[0];
    const price = window.PRICE_DATA[stock.priceKey];
    const summary = window.PRICE_SUMMARY ? window.PRICE_SUMMARY[stock.priceKey] : null;

    document.title = stock.ticker + ' · ' + stock.companyName + ' | Equity Research';

    document.getElementById('sh-ticker').textContent = stock.ticker.split(' ')[0].replace(/[^A-Z]/g, '');
    document.getElementById('sh-company').textContent = stock.companyName;
    document.getElementById('sh-sector').textContent = stock.sector;
    document.getElementById('sh-industry').textContent = stock.industry;
    document.getElementById('sh-stance').textContent = stock.stance;
    document.getElementById('sh-stance').className = 'stance-badge ' + stanceClass(stock.stance);
    document.getElementById('sh-tagline').textContent = stock.tagline;

    const currency = price.currency === 'EUR' ? '€' : '$';
    document.getElementById('sh-price').innerHTML = currency + summary.currentPrice.toFixed(2) + '<span class="price-currency">' + price.currency + '</span>';
    document.getElementById('sh-range').textContent = '52w range: ' + currency + summary.fiftyTwoWeekLow.toFixed(2) + ' – ' + currency + summary.fiftyTwoWeekHigh.toFixed(2);

    // chart
    fullChartInit(price.series);

    // metrics
    const metricsGrid = document.getElementById('metrics-grid');
    stock.metrics.forEach(m => {
      const el = document.createElement('div');
      el.className = 'metric-card';
      el.innerHTML = `<div class="metric-label">${m.label}</div><div class="metric-value">${m.value}</div>`;
      metricsGrid.appendChild(el);
    });

    // business overview
    document.getElementById('business-overview').textContent = stock.businessOverview;

    // bull / bear
    const bullList = document.getElementById('bull-list');
    stock.bullCase.forEach(t => { const li = document.createElement('li'); li.textContent = t; bullList.appendChild(li); });
    const bearList = document.getElementById('bear-list');
    stock.bearCase.forEach(t => { const li = document.createElement('li'); li.textContent = t; bearList.appendChild(li); });

    // catalysts
    const catList = document.getElementById('catalyst-list');
    stock.catalysts.forEach(t => {
      const item = document.createElement('div');
      item.className = 'catalyst-item';
      item.innerHTML = `<div class="catalyst-dot"></div><div class="catalyst-text">${t}</div>`;
      catList.appendChild(item);
    });

    // valuation view
    document.getElementById('valuation-view').textContent = stock.valuationView;

    // sources
    const sourcesList = document.getElementById('sources-list');
    stock.sources.forEach(url => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = url;
      li.appendChild(a);
      sourcesList.appendChild(li);
    });

    // prev/next nav
    const idx = window.RESEARCH_DATA.findIndex(s => s.id === stock.id);
    const prev = window.RESEARCH_DATA[(idx - 1 + window.RESEARCH_DATA.length) % window.RESEARCH_DATA.length];
    const next = window.RESEARCH_DATA[(idx + 1) % window.RESEARCH_DATA.length];
    document.getElementById('prev-link').href = 'stock.html?t=' + prev.id;
    document.getElementById('prev-link').querySelector('.pnav-ticker').textContent = prev.ticker.split(' ')[0].replace(/[^A-Z]/g, '');
    document.getElementById('next-link').href = 'stock.html?t=' + next.id;
    document.getElementById('next-link').querySelector('.pnav-ticker').textContent = next.ticker.split(' ')[0].replace(/[^A-Z]/g, '');
  }

  function fullChartInit(series) {
    const container = document.getElementById('chart-panel');
    ChartEngine.fullChart(container, series, { defaultMonths: 12 });
  }

  window.SiteRender = { renderGrid, renderStockPage };
})();
