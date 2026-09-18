/* Dependency-free SVG line chart engine: price axis, time axis, crosshair + tooltip. */
(function (global) {
  const POS = '#3ecf8e';
  const NEG = '#f2685c';
  const GRID = '#1e2738';
  const AXIS = '#5c6a84';
  const SURFACE = '#131926';
  const NS = 'http://www.w3.org/2000/svg';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------- data helpers ---------- */
  function parseDate(s) {
    const p = s.split('-');
    return Date.UTC(+p[0], +p[1] - 1, +p[2]);
  }
  function toPoints(series) {
    return series.map(function (p) { return [parseDate(p[0]), p[1]]; });
  }
  function sliceMonths(points, months) {
    if (!months) return points;
    const cutoff = new Date(points[points.length - 1][0]);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
    const ms = cutoff.getTime();
    return points.filter(function (p) { return p[0] >= ms; });
  }
  // legacy string-date variant, used by the home page sparklines
  function filterRange(series, months) {
    if (!months) return series;
    const cutoff = new Date(series[series.length - 1][0]);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
    return series.filter(function (p) { return new Date(p[0]) >= cutoff; });
  }
  function fmtDate(ms, long) {
    const d = new Date(ms);
    if (long) return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
    return MONTHS[d.getUTCMonth()] + ' ' + String(d.getUTCFullYear()).slice(2);
  }
  // index of the last point at or before t (-1 if t precedes the series)
  function lastAtOrBefore(points, t) {
    let lo = 0, hi = points.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (points[mid][0] <= t) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans;
  }
  function nearestIndex(points, t) {
    const i = lastAtOrBefore(points, t);
    if (i < 0) return 0;
    if (i >= points.length - 1) return points.length - 1;
    return (t - points[i][0]) <= (points[i + 1][0] - t) ? i : i + 1;
  }

  /* ---------- tick helpers ---------- */
  function niceStep(range, n) {
    const raw = range / n;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }
  function linearTicks(min, max, n) {
    const step = niceStep(max - min, n);
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(v);
    return { ticks: out, step: step };
  }
  function logTicks(min, max) {
    let out = [];
    for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
      [1, 2, 3, 5, 7].forEach(function (m) {
        const v = m * Math.pow(10, e);
        if (v >= min && v <= max) out.push(v);
      });
    }
    while (out.length > 6) out = out.filter(function (_, i) { return i % 2 === 0; });
    return { ticks: out, step: out.length > 1 ? out[1] - out[0] : 1 };
  }
  function timeTicks(minMs, maxMs, maxCount) {
    const steps = [1, 2, 3, 6, 12];
    const start = new Date(minMs);
    for (let s = 0; s < steps.length; s++) {
      const stepM = steps[s];
      const out = [];
      let y = start.getUTCFullYear();
      let m = start.getUTCMonth();
      let d = Date.UTC(y, m, 1);
      if (d < minMs) { m++; }
      m = Math.ceil(m / stepM) * stepM;
      for (;;) {
        d = Date.UTC(y, m, 1);
        if (d > maxMs) break;
        if (d >= minMs) out.push(d);
        m += stepM;
      }
      if (out.length <= maxCount || s === steps.length - 1) return out;
    }
    return [];
  }

  /* ---------- sparkline (home page cards) ---------- */
  function sparkline(series, opts) {
    opts = opts || {};
    const w = 240, h = 52, pad = 4;
    const values = series.map(function (p) { return p[1]; });
    const min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    const span = (max - min) || 1;
    const n = series.length;
    const pts = series.map(function (p, i) {
      return [(i / (n - 1)) * w, pad + (1 - (p[1] - min) / span) * (h - pad * 2)];
    });
    const d = pts.map(function (pt, i) { return (i ? 'L' : 'M') + pt[0].toFixed(1) + ',' + pt[1].toFixed(1); }).join(' ');
    const positive = values[n - 1] >= values[0];
    const color = opts.color || (positive ? POS : NEG);
    const gid = 'sg' + Math.random().toString(36).slice(2, 9);
    const lastY = (pts[n - 1][1] / h * 100).toFixed(1);
    return '<div class="spark">' +
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.28"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + d + ' L' + w + ',' + h + ' L0,' + h + ' Z" fill="url(#' + gid + ')"/>' +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.6" vector-effect="non-scaling-stroke"/>' +
      '</svg>' +
      '<i class="spark-dot" style="top:' + lastY + '%;background:' + color + '"></i></div>';
  }

  /* ---------- main line chart ---------- */
  /*
   * opts: {
   *   series: [{ key, label, color, points: [[ms, value], ...], dashed?, area? }],
   *   height, log, yPrefix, yFormat(v, step), valueFormat(v, series), ariaLabel
   * }
   */
  function line(container, initial) {
    let opts = initial;
    let geom = null;
    let svg = null;
    let lastWidth = 0;
    let keyIdx = null;

    container.classList.add('lc');
    container.tabIndex = 0;
    container.setAttribute('role', 'img');

    const tip = document.createElement('div');
    tip.className = 'lc-tip';
    tip.hidden = true;

    function fmtY(v, step) {
      const dec = step >= 1 ? 0 : Math.min(2, Math.ceil(-Math.log10(step)));
      if (opts.yFormat) return opts.yFormat(v, step);
      return (opts.yPrefix || '') + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    function fmtVal(v, s) {
      if (opts.valueFormat) return opts.valueFormat(v, s);
      return (opts.yPrefix || '') + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function draw() {
      const w = Math.max(280, container.clientWidth);
      const h = opts.height || 320;
      lastWidth = w;
      const ml = 8, mr = w < 520 ? 48 : 58, mt = 12, mb = 26;
      const series = opts.series.filter(function (s) { return s.points && s.points.length > 1; });
      if (!series.length) { container.innerHTML = ''; return; }

      let tMin = Infinity, tMax = -Infinity, vMin = Infinity, vMax = -Infinity;
      series.forEach(function (s) {
        tMin = Math.min(tMin, s.points[0][0]);
        tMax = Math.max(tMax, s.points[s.points.length - 1][0]);
        s.points.forEach(function (p) { if (p[1] < vMin) vMin = p[1]; if (p[1] > vMax) vMax = p[1]; });
      });
      const log = !!opts.log && vMin > 0;
      let lo, hi;
      if (log) { lo = Math.log(vMin); hi = Math.log(vMax); const pad = (hi - lo) * 0.05 || 0.05; lo -= pad; hi += pad; }
      else { const pad = (vMax - vMin) * 0.06 || 1; lo = vMin - pad; hi = vMax + pad; }

      const pw = w - ml - mr, ph = h - mt - mb;
      const x = function (t) { return ml + (t - tMin) / (tMax - tMin || 1) * pw; };
      const yv = function (v) { return mt + (1 - ((log ? Math.log(v) : v) - lo) / (hi - lo)) * ph; };
      const invX = function (px) { return tMin + (px - ml) / pw * (tMax - tMin); };

      const yt = log ? logTicks(Math.exp(lo), Math.exp(hi)) : linearTicks(lo, hi, 4);
      const xt = timeTicks(tMin, tMax, Math.max(2, Math.floor(pw / 84)));

      let g = '';
      yt.ticks.forEach(function (v) {
        const yy = yv(v).toFixed(1);
        g += '<line x1="' + ml + '" x2="' + (w - mr) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + GRID + '" stroke-width="1"/>';
        g += '<text x="' + (w - mr + 8) + '" y="' + (+yy + 4) + '" fill="' + AXIS + '" font-size="11" font-family="IBM Plex Mono, monospace">' + fmtY(v, yt.step) + '</text>';
      });
      xt.forEach(function (t) {
        const xx = x(t).toFixed(1);
        g += '<text x="' + xx + '" y="' + (h - 8) + '" fill="' + AXIS + '" font-size="11" text-anchor="middle" font-family="IBM Plex Mono, monospace">' + fmtDate(t) + '</text>';
      });

      let marks = '';
      series.forEach(function (s, si) {
        const d = s.points.map(function (p, i) { return (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ',' + yv(p[1]).toFixed(1); }).join(' ');
        if (s.area) {
          const gid = 'lg' + si + Math.random().toString(36).slice(2, 7);
          const base = (h - mb).toFixed(1);
          marks += '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + s.color + '" stop-opacity="0.22"/><stop offset="100%" stop-color="' + s.color + '" stop-opacity="0"/></linearGradient></defs>';
          marks += '<path d="' + d + ' L' + x(s.points[s.points.length - 1][0]).toFixed(1) + ',' + base + ' L' + x(s.points[0][0]).toFixed(1) + ',' + base + ' Z" fill="url(#' + gid + ')"/>';
        }
        marks += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="' + (s.dashed ? 1.5 : 2) + '"' +
          (s.dashed ? ' stroke-dasharray="5 4"' : '') + ' stroke-linejoin="round" stroke-linecap="round"/>';
      });

      let cross = '<g class="lc-x" style="display:none"><line y1="' + mt + '" y2="' + (h - mb) + '" stroke="' + AXIS + '" stroke-width="1"/>';
      series.forEach(function () { cross += '<circle r="4.5" stroke="' + SURFACE + '" stroke-width="2" style="display:none"/>'; });
      cross += '</g>';

      container.innerHTML = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' + g + marks + cross + '</svg>';
      svg = container.firstChild;
      container.appendChild(tip);
      container.setAttribute('aria-label', opts.ariaLabel || 'Line chart. Focus the chart and use the left and right arrow keys to read values.');

      // reference series for x-snapping: the one with the most points
      let ref = series[0];
      series.forEach(function (s) { if (s.points.length > ref.points.length) ref = s; });
      geom = { w: w, h: h, ml: ml, mr: mr, mt: mt, mb: mb, x: x, yv: yv, invX: invX, series: series, ref: ref };
    }

    function hide() {
      tip.hidden = true;
      const xg = svg && svg.querySelector('.lc-x');
      if (xg) xg.style.display = 'none';
    }

    function showAt(t) {
      if (!geom) return;
      const g = geom;
      const xx = g.x(t);
      const xg = svg.querySelector('.lc-x');
      xg.style.display = '';
      const ln = xg.querySelector('line');
      ln.setAttribute('x1', xx); ln.setAttribute('x2', xx);
      const circles = xg.querySelectorAll('circle');

      const rows = [];
      g.series.forEach(function (s, i) {
        const idx = lastAtOrBefore(s.points, t);
        const c = circles[i];
        if (idx < 0) { c.style.display = 'none'; return; }
        const v = s.points[idx][1];
        c.style.display = '';
        c.setAttribute('cx', xx); c.setAttribute('cy', g.yv(v)); c.setAttribute('fill', s.color);
        rows.push({ s: s, v: v });
      });
      if (rows.length > 1) rows.sort(function (a, b) { return b.v - a.v; });

      tip.textContent = '';
      const head = document.createElement('div');
      head.className = 'lc-tip-date';
      head.textContent = fmtDate(t, true);
      tip.appendChild(head);
      rows.forEach(function (r) {
        const row = document.createElement('div');
        row.className = 'lc-tip-row';
        const key = document.createElement('i');
        key.className = 'lc-tip-key' + (r.s.dashed ? ' dashed' : '');
        key.style.borderTopColor = r.s.color;
        const val = document.createElement('b');
        val.textContent = fmtVal(r.v, r.s);
        const lab = document.createElement('span');
        lab.textContent = r.s.label || '';
        row.appendChild(key); row.appendChild(val);
        if (r.s.label && g.series.length > 1) row.appendChild(lab);
        tip.appendChild(row);
      });
      tip.hidden = false;
      const tw = tip.offsetWidth;
      let left = xx + 14;
      if (left + tw > g.w - 4) left = xx - tw - 14;
      tip.style.left = Math.max(4, left) + 'px';
      tip.style.top = (g.mt + 4) + 'px';
    }

    function onPointer(e) {
      if (!geom || !svg) return;
      const r = svg.getBoundingClientRect();
      const px = e.clientX - r.left;
      if (px < geom.ml - 4 || px > geom.w - geom.mr + 4) { hide(); return; }
      const idx = nearestIndex(geom.ref.points, geom.invX(px));
      keyIdx = idx;
      showAt(geom.ref.points[idx][0]);
    }

    container.addEventListener('pointermove', onPointer);
    container.addEventListener('pointerdown', onPointer);
    container.addEventListener('pointerleave', function () { if (document.activeElement !== container) hide(); });
    container.addEventListener('focus', function () {
      if (!geom) return;
      if (keyIdx === null) keyIdx = geom.ref.points.length - 1;
      showAt(geom.ref.points[Math.min(keyIdx, geom.ref.points.length - 1)][0]);
    });
    container.addEventListener('blur', hide);
    container.addEventListener('keydown', function (e) {
      if (!geom || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End')) return;
      e.preventDefault();
      const n = geom.ref.points.length;
      if (keyIdx === null) keyIdx = n - 1;
      if (e.key === 'ArrowLeft') keyIdx = Math.max(0, keyIdx - 1);
      else if (e.key === 'ArrowRight') keyIdx = Math.min(n - 1, keyIdx + 1);
      else if (e.key === 'Home') keyIdx = 0;
      else keyIdx = n - 1;
      showAt(geom.ref.points[keyIdx][0]);
    });

    let ro = null;
    if (global.ResizeObserver) {
      ro = new ResizeObserver(function () {
        if (Math.abs(container.clientWidth - lastWidth) > 1) draw();
      });
      ro.observe(container);
    } else {
      global.addEventListener('resize', function () { if (Math.abs(container.clientWidth - lastWidth) > 1) draw(); });
    }

    draw();
    return {
      update: function (patch) { opts = Object.assign({}, opts, patch); keyIdx = null; draw(); },
      destroy: function () { if (ro) ro.disconnect(); container.innerHTML = ''; }
    };
  }

  global.ChartEngine = { line: line, sparkline: sparkline, filterRange: filterRange, toPoints: toPoints, sliceMonths: sliceMonths, fmtDate: fmtDate };
})(window);
