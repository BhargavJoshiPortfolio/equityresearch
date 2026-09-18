/* Compare page: every stock rebased to 100, optional benchmark, log/linear scale. */
(function () {
  const U = window.SiteUtil;
  const el = U.el;
  const BENCH_COLOR = '#c3c2b7';
  const BENCH_LABEL = { SPX: 'S&P 500', SOX: 'SOX' };

  const stocks = window.RESEARCH_DATA;
  const points = {};
  stocks.forEach(function (s) { points[s.id] = ChartEngine.toPoints(window.PRICE_DATA[s.priceKey].series); });
  ['SPX', 'SOX'].forEach(function (k) { points[k] = ChartEngine.toPoints(window.PRICE_DATA[k].series); });

  const state = { months: 12, log: true, bench: 'SPX', hidden: {} };

  function periodReturn(pts, months) {
    const p = ChartEngine.sliceMonths(pts, months);
    return (p[p.length - 1][1] / p[0][1] - 1) * 100;
  }
  function rebased(pts, months) {
    const p = ChartEngine.sliceMonths(pts, months);
    const base = p[0][1];
    return p.map(function (q) { return [q[0], q[1] / base * 100]; });
  }

  function entries() {
    const list = stocks.map(function (s) {
      return { id: s.id, label: U.shortTicker(s), color: U.STOCK_COLORS[s.id], dashed: false };
    });
    if (state.bench !== 'none') list.push({ id: state.bench, label: BENCH_LABEL[state.bench], color: BENCH_COLOR, dashed: true });
    return list;
  }

  const chart = ChartEngine.line(document.getElementById('cmp-chart'), {
    series: [],
    height: 420,
    log: true,
    valueFormat: function (v) { return v.toFixed(1) + ' (' + U.fmtPct(v - 100) + ')'; },
    ariaLabel: 'Performance of all covered stocks rebased to 100. Focus the chart and use the left and right arrow keys to read values.'
  });

  function paintLegend() {
    const host = document.getElementById('legend');
    host.textContent = '';
    entries().forEach(function (e) {
      const b = el('button', 'legend-item');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(!state.hidden[e.id]));
      const key = el('span', 'key' + (e.dashed ? ' dashed' : ''));
      key.style.borderTopColor = e.color;
      b.appendChild(key);
      b.appendChild(el('span', 'name', e.label));
      b.appendChild(el('span', 'ret', U.fmtPct(periodReturn(points[e.id], state.months))));
      b.addEventListener('click', function () { state.hidden[e.id] = !state.hidden[e.id]; paint(); });
      host.appendChild(b);
    });
  }

  function paintTable() {
    const rows = stocks.map(function (s) { return { name: U.shortTicker(s) + ' · ' + s.companyName.replace(/,? (Inc\.|Corporation|AG).*$/, ''), id: s.id, bench: false }; });
    rows.push({ name: 'S&P 500', id: 'SPX', bench: true });
    rows.push({ name: 'Semiconductor index (SOX)', id: 'SOX', bench: true });
    rows.forEach(function (r) {
      r.r6 = periodReturn(points[r.id], 6);
      r.r12 = periodReturn(points[r.id], 12);
      r.r36 = periodReturn(points[r.id], 36);
    });
    const key = state.months === 6 ? 'r6' : state.months === 36 ? 'r36' : 'r12';
    rows.sort(function (a, b) { return b[key] - a[key]; });
    const body = document.querySelector('#returns-table tbody');
    body.textContent = '';
    rows.forEach(function (r) {
      const tr = el('tr', r.bench ? 'hl' : '');
      tr.appendChild(el('td', null, r.name));
      [r.r6, r.r12, r.r36].forEach(function (v) {
        tr.appendChild(el('td', v >= 0 ? 'pos' : 'neg', U.fmtPct(v)));
      });
      body.appendChild(tr);
    });
  }

  function paint() {
    const series = entries().filter(function (e) { return !state.hidden[e.id]; }).map(function (e) {
      return { key: e.id, label: e.label, color: e.color, dashed: e.dashed, points: rebased(points[e.id], state.months) };
    });
    chart.update({ series: series, log: state.log });
    paintLegend();
    paintTable();
  }

  function wireToggle(id, attr, onPick) {
    const btns = document.querySelectorAll('#' + id + ' button');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) { o.classList.remove('active'); o.setAttribute('aria-pressed', 'false'); });
        b.classList.add('active');
        b.setAttribute('aria-pressed', 'true');
        onPick(b.dataset[attr]);
        paint();
      });
    });
  }
  wireToggle('range-toggle', 'months', function (v) { state.months = parseInt(v, 10); });
  wireToggle('scale-toggle', 'scale', function (v) { state.log = v === 'log'; });
  document.getElementById('bench-select').addEventListener('change', function (e) { state.bench = e.target.value; paint(); });

  U.setText('asof', U.asOfLine());
  paint();
})();
