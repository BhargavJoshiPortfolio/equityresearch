/* Minimal dependency-free SVG line chart engine. */
(function (global) {
  const POS = '#3ecf8e';
  const NEG = '#f2685c';
  const GRID = '#1a2231';

  function filterRange(series, months) {
    if (!months) return series;
    const cutoff = new Date(series[series.length - 1][0]);
    cutoff.setMonth(cutoff.getMonth() - months);
    return series.filter(p => new Date(p[0]) >= cutoff);
  }

  function buildPath(series, w, h, padTop, padBottom) {
    const values = series.map(p => p[1]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = (max - min) || 1;
    const n = series.length;
    const points = series.map((p, i) => {
      const x = (i / (n - 1)) * w;
      const y = padTop + (1 - (p[1] - min) / span) * (h - padTop - padBottom);
      return [x, y];
    });
    const d = points.map((pt, i) => (i === 0 ? 'M' : 'L') + pt[0].toFixed(2) + ',' + pt[1].toFixed(2)).join(' ');
    return { d, points, min, max };
  }

  function sparkline(series, opts) {
    opts = opts || {};
    const w = opts.width || 240;
    const h = opts.height || 52;
    const positive = series[series.length - 1][1] >= series[0][1];
    const color = opts.color || (positive ? POS : NEG);
    const { d, points } = buildPath(series, w, h, 4, 4);
    const last = points[points.length - 1];
    const areaD = d + ` L${w},${h} L0,${h} Z`;
    const gradId = 'sg' + Math.random().toString(36).slice(2, 9);
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#${gradId})" stroke="none"/>
      <path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
      <circle cx="${last[0].toFixed(2)}" cy="${last[1].toFixed(2)}" r="2.4" fill="${color}"/>
    </svg>`;
  }

  function fullChart(container, fullSeries, opts) {
    opts = opts || {};
    const state = { months: opts.defaultMonths || 12 };

    function render() {
      const series = filterRange(fullSeries, state.months);
      const w = 1000, h = 320, padTop = 24, padBottom = 24;
      const positive = series[series.length - 1][1] >= series[0][1];
      const color = positive ? POS : NEG;
      const { d, points, min, max } = buildPath(series, w, h, padTop, padBottom);
      const areaD = d + ` L${w},${h} L0,${h} Z`;
      const gradId = 'fg' + Math.random().toString(36).slice(2, 9);

      // gridlines (4 horizontal)
      let grid = '';
      for (let i = 0; i <= 3; i++) {
        const y = padTop + (i / 3) * (h - padTop - padBottom);
        grid += `<line x1="0" y1="${y.toFixed(1)}" x2="${w}" y2="${y.toFixed(1)}" stroke="${GRID}" stroke-width="1"/>`;
      }

      const svg = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${grid}
        <path d="${areaD}" fill="url(#${gradId})" stroke="none"/>
        <path d="${d}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/>
      </svg>`;

      container.querySelector('.chart-svg-wrap').innerHTML = svg;

      const first = series[0][1];
      const last = series[series.length - 1][1];
      const pct = ((last - first) / first * 100).toFixed(1);
      const returnEl = container.querySelector('.chart-return');
      if (returnEl) {
        returnEl.textContent = (pct >= 0 ? '+' : '') + pct + '%';
        returnEl.style.color = pct >= 0 ? 'var(--pos)' : 'var(--neg)';
      }

      const axis = container.querySelector('.chart-axis-labels');
      if (axis) {
        axis.innerHTML = `<span>${series[0][0]}</span><span>${series[series.length - 1][0]}</span>`;
      }
    }

    render();

    container.querySelectorAll('.range-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.range-toggle button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.months = parseInt(btn.dataset.months, 10) || null;
        render();
      });
    });
  }

  global.ChartEngine = { sparkline, fullChart, filterRange };
})(window);
