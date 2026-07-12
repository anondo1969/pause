/* ============================================================
   PAUSE - compare.js
   Compare page: decode return tokens, render the trajectory
   chart, delta cards, and text analysis. Pure client-side.

   Structure notes:
     - All user-facing text lives in data/pages/compare.json
       ("strings"); message templates use {placeholders} filled
       by PAUSE_APP.fmt.
     - All colors and typography live in css/style.css. SVG chart
       elements are styled through classes (per-dimension classes
       are keyed by the dimension id, e.g. .dim-stroke-d1).
     - The page scaffold (form, results containers) is built here
       from the same strings, so compare.html stays an empty
       backbone.
   ============================================================ */

(function () {
  'use strict';

  const S = window.PAUSE_SCORING;

  let STR;               // strings from data/pages/compare.json
  let DIMS;              // [{key, name, cls}] - cls is the CSS suffix, e.g. 'd1'
  let isDemoMode = false; // set by loadDemo(), read+cleared by decodeAndRender()

  // -------------------------------------------------------
  // Small helpers
  // -------------------------------------------------------

  const el = window.PAUSE_APP.el;
  const fmt = window.PAUSE_APP.fmt;

  /** Pluralization values for the {n} token{s} style templates. */
  function plural(n) {
    return { n: n, s: n === 1 ? '' : 's', was: n === 1 ? 'was' : 'were' };
  }

  function dayToDate(d) {
    const dt = new Date(d * 86400000);
    return STR.months[dt.getUTCMonth()] + ' ' + dt.getUTCDate() + ', ' + dt.getUTCFullYear();
  }

  function dayToShort(d) {
    const dt = new Date(d * 86400000);
    return STR.months[dt.getUTCMonth()] + ' \u2019' + String(dt.getUTCFullYear()).slice(2);
  }

  function bandLabel(score) {
    if (score <= 24) return STR.bands.minimal;
    if (score <= 49) return STR.bands.mild;
    if (score <= 74) return STR.bands.moderate;
    return STR.bands.strong;
  }

  function svgEl(tag, attrs) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  // -------------------------------------------------------
  // Page scaffold (built once from strings, into #page-main)
  // -------------------------------------------------------

  function buildScaffold() {
    const main = document.getElementById('page-main');

    main.appendChild(el('div', { class: 'compare-privacy' },
      el('span', { class: 'compare-privacy-icon' }, STR.privacyNote.icon),
      ' ' + STR.privacyNote.text));

    main.appendChild(el('div', { class: 'compare-input-area' },
      el('label', { class: 'compare-label', for: 'token-input' }, STR.form.label),
      el('textarea', { class: 'compare-textarea', id: 'token-input', rows: 4, placeholder: STR.form.placeholder }),
      el('div', { class: 'compare-buttons' },
        el('button', { class: 'btn btn-primary', id: 'btn-decode', type: 'button' }, STR.form.decodeButton),
        el('button', { class: 'btn btn-ghost', id: 'btn-demo', type: 'button' }, STR.form.demoButton)),
      el('div', { class: 'compare-error', id: 'decode-error', hidden: true })));

    main.appendChild(el('div', { id: 'compare-results', hidden: true },
      el('div', { class: 'compare-chart-card', id: 'chart-card' },
        el('div', { class: 'compare-chart-legend', id: 'chart-legend' }),
        svgEl('svg', { id: 'chart-svg', class: 'compare-chart-svg', role: 'img', 'aria-label': STR.chartAria }),
        el('div', { class: 'compare-chart-tooltip', id: 'chart-tooltip', hidden: true })),
      el('div', { class: 'compare-deltas', id: 'deltas' }),
      el('div', { class: 'compare-analysis', id: 'analysis' })));
  }

  // -------------------------------------------------------
  // SVG chart
  // -------------------------------------------------------

  const CHART = { W: 620, H: 260, PAD: { top: 20, right: 30, bottom: 36, left: 40 } };

  function chartX(i, n) {
    const usable = CHART.W - CHART.PAD.left - CHART.PAD.right;
    if (n <= 1) return CHART.PAD.left + usable / 2;
    return CHART.PAD.left + (i / (n - 1)) * usable;
  }

  function chartY(val) {
    const usable = CHART.H - CHART.PAD.top - CHART.PAD.bottom;
    return CHART.PAD.top + (1 - val / 100) * usable;
  }

  /** Smooth cubic bezier path through points (Catmull-Rom -> bezier). */
  function smoothPath(points) {
    if (points.length === 0) return '';
    if (points.length === 1) return 'M' + points[0][0] + ',' + points[0][1];
    if (points.length === 2) {
      return 'M' + points[0][0] + ',' + points[0][1] +
             'L' + points[1][0] + ',' + points[1][1];
    }
    let d = 'M' + points[0][0] + ',' + points[0][1];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const tension = 0.35;
      const cp1x = p1[0] + (p2[0] - p0[0]) * tension / 3;
      const cp1y = p1[1] + (p2[1] - p0[1]) * tension / 3;
      const cp2x = p2[0] - (p3[0] - p1[0]) * tension / 3;
      const cp2y = p2[1] - (p3[1] - p1[1]) * tension / 3;
      d += 'C' + Math.round(cp1x) + ',' + Math.round(cp1y) +
           ' ' + Math.round(cp2x) + ',' + Math.round(cp2y) +
           ' ' + Math.round(p2[0]) + ',' + Math.round(p2[1]);
    }
    return d;
  }

  function renderChart(sessions, demoActive) {
    const svg = document.getElementById('chart-svg');
    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 ' + CHART.W + ' ' + CHART.H);

    // Demo watermark: one large diagonal "DEMO" behind everything, so
    // that a screenshot also reads as demo at a glance.
    if (demoActive) {
      const cx = CHART.W / 2, cy = CHART.H / 2;
      const wm = svgEl('text', {
        x: cx, y: cy, class: 'chart-watermark',
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
        transform: 'rotate(-18 ' + cx + ' ' + cy + ')',
        'pointer-events': 'none'
      });
      wm.textContent = STR.demoWatermark;
      svg.appendChild(wm);
    }

    const n = sessions.length;
    const yBottom = chartY(0);

    // Grid lines and y-axis labels.
    [0, 25, 50, 75, 100].forEach(v => {
      const y = chartY(v);
      svg.appendChild(svgEl('line', {
        x1: CHART.PAD.left, y1: y, x2: CHART.W - CHART.PAD.right, y2: y,
        class: v === 0 ? 'chart-grid chart-grid-base' : 'chart-grid'
      }));
      const label = svgEl('text', {
        x: CHART.PAD.left - 8, y: y + 4, class: 'chart-axis-text', 'text-anchor': 'end'
      });
      label.textContent = v;
      svg.appendChild(label);
    });

    // X-axis labels and ticks.
    sessions.forEach((s, i) => {
      const x = chartX(i, n);
      const label = svgEl('text', {
        x: x, y: CHART.H - 8, class: 'chart-axis-text', 'text-anchor': 'middle'
      });
      label.textContent = dayToShort(s.t);
      svg.appendChild(label);
      svg.appendChild(svgEl('line', {
        x1: x, y1: yBottom, x2: x, y2: yBottom + 5, class: 'chart-grid'
      }));
    });

    // Each dimension: area fill, line, dots, end label.
    DIMS.forEach(dim => {
      const pts = sessions.map((s, i) => [chartX(i, n), chartY(s[dim.key])]);
      const lineD = smoothPath(pts);
      const areaD = lineD +
        'L' + Math.round(pts[pts.length - 1][0]) + ',' + Math.round(yBottom) +
        'L' + Math.round(pts[0][0]) + ',' + Math.round(yBottom) + 'Z';

      svg.appendChild(svgEl('path', { d: areaD, class: 'chart-area dim-area-' + dim.cls }));
      svg.appendChild(svgEl('path', { d: lineD, class: 'chart-line dim-stroke-' + dim.cls }));
      pts.forEach(p => svg.appendChild(svgEl('circle', {
        cx: p[0], cy: p[1], r: '4.5', class: 'chart-dot dim-fill-' + dim.cls
      })));

      const last = pts[pts.length - 1];
      const end = svgEl('text', {
        x: last[0] + 10, y: last[1] + 4, class: 'chart-endlabel dim-text-' + dim.cls
      });
      end.textContent = Math.round(sessions[sessions.length - 1][dim.key]);
      svg.appendChild(end);
    });

    // Invisible hover columns for the tooltip.
    sessions.forEach((s, i) => {
      const x = chartX(i, n);
      const colW = n <= 1 ? CHART.W : (CHART.W - CHART.PAD.left - CHART.PAD.right) / n;
      const rect = svgEl('rect', {
        x: x - colW / 2, y: CHART.PAD.top,
        width: colW, height: CHART.H - CHART.PAD.top - CHART.PAD.bottom,
        class: 'chart-hover-col', 'data-idx': i
      });
      rect.addEventListener('mouseenter', () => showTooltip(s, x));
      rect.addEventListener('mouseleave', hideTooltip);
      svg.appendChild(rect);
    });

    // Legend.
    const legend = document.getElementById('chart-legend');
    legend.innerHTML = '';
    DIMS.forEach(dim => legend.appendChild(
      el('span', { class: 'compare-legend-item' },
        el('span', { class: 'compare-legend-swatch dim-bg-' + dim.cls }),
        dim.name)));
  }

  function showTooltip(session, x) {
    const tip = document.getElementById('chart-tooltip');
    tip.hidden = false;
    tip.innerHTML = '';
    tip.appendChild(el('div', { class: 'compare-tip-date' }, dayToDate(session.t)));
    DIMS.forEach(dim => tip.appendChild(
      el('div', { class: 'compare-tip-row' },
        el('span', { class: 'compare-tip-swatch dim-bg-' + dim.cls }),
        dim.name + ': ',
        el('strong', {}, Math.round(session[dim.key])))));

    const cardRect = document.getElementById('chart-card').getBoundingClientRect();
    const svgRect = document.getElementById('chart-svg').getBoundingClientRect();
    const px = (x * (svgRect.width / CHART.W)) + svgRect.left - cardRect.left;
    tip.style.left = Math.min(Math.max(px - 70, 8), cardRect.width - 160) + 'px';
    tip.style.top = '12px';
  }

  function hideTooltip() {
    document.getElementById('chart-tooltip').hidden = true;
  }

  // -------------------------------------------------------
  // Delta cards (first vs last session)
  // -------------------------------------------------------

  function deltaCard(dim, value, deltaEl) {
    return el('div', { class: 'compare-delta-card' },
      el('div', { class: 'compare-delta-dim' },
        el('span', { class: 'compare-delta-swatch dim-bg-' + dim.cls }),
        dim.name),
      el('div', { class: 'compare-delta-row' },
        el('span', { class: 'compare-delta-score' }, Math.round(value)),
        deltaEl),
      el('div', { class: 'compare-delta-band' }, bandLabel(value) + STR.bandSuffix));
  }

  function renderDeltas(sessions) {
    const container = document.getElementById('deltas');
    container.innerHTML = '';
    const first = sessions[0];
    const last = sessions[sessions.length - 1];

    DIMS.forEach(dim => {
      const delta = Math.round(last[dim.key] - first[dim.key]);
      let cls, arrow;
      if (delta <= -5)      { cls = 'down'; arrow = '\u25be '; }
      else if (delta >= 5)  { cls = 'up';   arrow = '\u25b4 '; }
      else                  { cls = 'flat'; arrow = '~ '; }
      const sign = delta > 0 ? '+' : '';
      container.appendChild(deltaCard(dim, last[dim.key],
        el('span', { class: 'compare-delta-change ' + cls }, arrow + sign + delta)));
    });
  }

  // -------------------------------------------------------
  // Text analysis
  // -------------------------------------------------------

  function renderAnalysis(sessions) {
    const container = document.getElementById('analysis');
    container.innerHTML = '';
    const A = STR.analysis;
    const first = sessions[0];
    const last = sessions[sessions.length - 1];
    const span = dayToDate(first.t) + ' \u2013 ' + dayToDate(last.t);

    container.appendChild(el('div', { class: 'compare-analysis-h' }, A.heading));
    container.appendChild(el('div', { class: 'compare-analysis-meta' },
      fmt(A.meta, Object.assign(plural(sessions.length), { span: span }))));

    let improving = 0, worsening = 0;

    DIMS.forEach(dim => {
      const delta = Math.round(last[dim.key] - first[dim.key]);
      const vals = {
        dim: dim.name,
        delta: delta,
        abs: Math.abs(delta),
        signed: (delta > 0 ? '+' : '') + delta,
        fromBand: bandLabel(first[dim.key]).toLowerCase(),
        toBand: bandLabel(last[dim.key]).toLowerCase(),
        band: bandLabel(last[dim.key]).toLowerCase()
      };

      let tagCls, tagText, text;
      if (delta <= -10)     { tagCls = 'improving'; tagText = A.tags.improving; text = fmt(A.messages.bigDrop, vals); improving++; }
      else if (delta <= -5) { tagCls = 'improving'; tagText = A.tags.improving; text = fmt(A.messages.drop, vals); improving++; }
      else if (delta >= 10) { tagCls = 'worsening'; tagText = A.tags.attention; text = fmt(A.messages.bigRise, vals); worsening++; }
      else if (delta >= 5)  { tagCls = 'worsening'; tagText = A.tags.drifting;  text = fmt(A.messages.rise, vals); worsening++; }
      else                  { tagCls = 'stable';    tagText = A.tags.stable;    text = fmt(A.messages.stable, vals); }

      // html: so the message templates in compare.json can use inline
      // markup such as <em>{dim}</em>. Repo-controlled data only.
      container.appendChild(el('p', { class: 'compare-analysis-dim' },
        el('span', { class: 'compare-tag compare-tag-' + tagCls }, tagText),
        el('span', { html: ' ' + text })));
    });

    let summary;
    if (improving > worsening && improving >= 2)      summary = A.summaries.positive;
    else if (worsening > improving && worsening >= 2) summary = A.summaries.attention;
    else                                              summary = A.summaries.mixed;
    container.appendChild(el('p', { class: 'compare-analysis-summary', html: summary }));
  }

  // -------------------------------------------------------
  // Single-token snapshot (no comparison possible)
  // -------------------------------------------------------

  function renderSnapshot(session) {
    const container = document.getElementById('deltas');
    container.innerHTML = '';
    DIMS.forEach(dim => container.appendChild(deltaCard(dim, session[dim.key], null)));

    const analysis = document.getElementById('analysis');
    analysis.innerHTML = '';
    analysis.appendChild(el('div', { class: 'compare-analysis-h' },
      fmt(STR.snapshot.heading, { date: dayToDate(session.t) })));
    analysis.appendChild(el('p', { class: 'compare-analysis-dim', html: STR.snapshot.body }));
  }

  // -------------------------------------------------------
  // Decode + orchestrate
  // -------------------------------------------------------

  function decodeAndRender() {
    // Capture the demo flag before doing anything; reset immediately so
    // a future click on "Decode & compare" (after the user edits the
    // textarea) is treated as real data.
    const demoActive = isDemoMode;
    isDemoMode = false;

    const raw = document.getElementById('token-input').value.trim();
    const errorEl = document.getElementById('decode-error');
    const resultsEl = document.getElementById('compare-results');

    function fail(message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      resultsEl.hidden = true;
      removeDemoMarkers();
    }

    if (!raw) return fail(STR.errors.empty);

    let lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    // Enforce the documented 12-token limit, but say so instead of
    // silently dropping the extras.
    let truncated = 0;
    if (lines.length > 12) {
      truncated = lines.length - 12;
      lines = lines.slice(0, 12);
    }

    const sessions = [];
    let badCount = 0;
    lines.forEach(line => {
      const decoded = S.decodeReturnToken(line);
      if (decoded) sessions.push(decoded);
      else badCount++;
    });

    if (sessions.length === 0) return fail(fmt(STR.errors.noneDecoded, plural(lines.length)));

    // Non-fatal notices: skipped tokens, truncation, mixed versions.
    const notices = [];
    if (badCount > 0)  notices.push(fmt(STR.errors.skipped, plural(badCount)));
    if (truncated > 0) notices.push(fmt(STR.errors.truncated, plural(truncated)));
    const versions = [...new Set(sessions.map(s => String(s.v)))];
    if (versions.length > 1) {
      notices.push(fmt(STR.errors.mixedVersions, { versions: versions.join(', ') }));
    }
    errorEl.hidden = notices.length === 0;
    errorEl.textContent = notices.join(' ');

    sessions.sort((a, b) => a.t - b.t);
    resultsEl.hidden = false;

    // Demo markers go in/out before chart render so the chart code can
    // also branch on demoActive.
    if (demoActive) addDemoMarkers();
    else removeDemoMarkers();

    if (sessions.length === 1) {
      document.getElementById('chart-card').hidden = true;
      renderSnapshot(sessions[0]);
    } else {
      document.getElementById('chart-card').hidden = false;
      renderChart(sessions, demoActive);
      renderDeltas(sessions);
      renderAnalysis(sessions);
    }

    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // -------------------------------------------------------
  // Demo markers: banner above the results + footer note below
  // -------------------------------------------------------

  function addDemoMarkers() {
    const resultsEl = document.getElementById('compare-results');

    if (!document.getElementById('demo-banner')) {
      resultsEl.insertBefore(
        el('div', { id: 'demo-banner', class: 'demo-banner' },
          el('span', { class: 'demo-banner-pip' }, STR.demo.bannerPip),
          el('span', { class: 'demo-banner-text', html: STR.demo.bannerHtml })),
        resultsEl.firstChild);
    }
    if (!document.getElementById('demo-footer')) {
      resultsEl.appendChild(
        el('div', { id: 'demo-footer', class: 'demo-footer' },
          el('span', { class: 'demo-footer-label' }, STR.demo.footerLabel),
          el('span', { html: STR.demo.footerHtml })));
    }
  }

  function removeDemoMarkers() {
    ['demo-banner', 'demo-footer'].forEach(id => {
      const node = document.getElementById(id);
      if (node) node.parentNode.removeChild(node);
    });
  }

  // -------------------------------------------------------
  // Demo data
  // -------------------------------------------------------

  function loadDemo() {
    // Six monthly sessions, designed so each dimension traces a distinct
    // path and the four lines stay >= 10 points apart at every session:
    //   D1 (Reasoning):  steady decline             (64 -> 41)
    //   D2 (Creativity): high, slow to ease          (88 -> 62)
    //   D3 (Research):   fastest, steady decline     (52 -> 18)
    //   D4 (Social):     rises throughout, emerging  (35 -> 80)
    // Token format follows scoring.js#makeReturnToken exactly, including
    // the optional lb/lc fields; the first session has neither (modelling
    // a first-time user).
    const todayDay = Math.floor(Date.now() / 86400000);
    const demo = [
      { v: 'v0.1-alpha', t: todayDay - 150, d: [64, 88, 52, 35], tr: -1.2 },
      { v: 'v0.1-alpha', t: todayDay - 120, d: [63, 86, 50, 40], tr: -1.0, lb: 'cb', lc: 'wrn' },
      { v: 'v0.1-alpha', t: todayDay -  90, d: [61, 82, 40, 51], tr: -0.4, lb: 'es', lc: 'shl' },
      { v: 'v0.1-alpha', t: todayDay -  60, d: [50, 76, 30, 61], tr:  0.4, lb: 'cf', lc: 'fst' },
      { v: 'v0.1-alpha', t: todayDay -  30, d: [44, 74, 23, 64], tr:  0.9, lb: 'sb', lc: 'bld' },
      { v: 'v0.1-alpha', t: todayDay      , d: [41, 62, 18, 80], tr:  1.1, lb: 'rm', lc: 'ctr' }
    ];
    const tokens = demo.map(o =>
      btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, ''));
    document.getElementById('token-input').value = tokens.join('\n');
    isDemoMode = true;
    decodeAndRender();
  }

  // -------------------------------------------------------
  // Boot: wait for the shared page engine, then build and bind
  // -------------------------------------------------------

  window.PAUSE_APP.ready.then(({ page }) => {
    STR = page.strings;
    DIMS = STR.dims.map(d => ({ key: d.key, name: d.name, cls: d.key.toLowerCase() }));

    buildScaffold();
    document.getElementById('btn-decode').addEventListener('click', decodeAndRender);
    document.getElementById('btn-demo').addEventListener('click', loadDemo);

    // If a token is passed via URL hash (from the result page), auto-fill,
    // then strip the hash so the token does not linger in the address bar
    // or accumulate in browser history entries beyond this navigation.
    if (window.location.hash && window.location.hash.length > 1) {
      document.getElementById('token-input').value =
        decodeURIComponent(window.location.hash.slice(1));
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '',
          window.location.pathname + window.location.search);
      }
      decodeAndRender();
    }
  });

})();