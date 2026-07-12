/* ============================================================
   PAUSE - quiz.js
   Single-page self-check state machine. Vanilla JS, no framework.

   Structure notes:
     - All user-facing text lives in data/pages/quiz.json
       ("strings", UI below); instrument content (questions, probe
       pools, feedback) lives in the other data/*.json files.
     - All scoring maths lives in js/scoring.js (window.PAUSE_SCORING).
     - Design lives in css/style.css; this file only assigns classes.
     - Boot: waits for the shared page engine (js/app.js), then
       fetches the instrument data and renders the first stage.
   ============================================================ */

(function () {
  'use strict';

  const S = window.PAUSE_SCORING;
  const el = window.PAUSE_APP.el;
  const fmt = window.PAUSE_APP.fmt;
  const getJSON = window.PAUSE_APP.getJSON;

  let UI;                                // strings from data/pages/quiz.json
  let ITEMS, B7_POOL, C7_DICT, FEEDBACK; // instrument data

  // ----------------------------------------------------------
  // App state
  // ----------------------------------------------------------

  const STATE = {
    stageIndex: 0,
    answers: {},                      // {itemId: value, or null for N/A}
    contextAnswers: {},               // A1, A2, A3
    blAnswers: { BL0: null, BL1: null, BL2: null, BL3: null, BL4: null },
    blSkipped: false,
    b7: { poolItem: null, selected: null, score: null, timeUp: false, skipped: false },
    c7: { object: null, text: '', result: null, timeUp: false, skipped: false },
    age: null,
    // Anti-memorization avoidance hints, read at init from URL token or
    // sessionStorage. Used by pickB7Item / pickC7Object to avoid the
    // fallacy type / object category the respondent saw most recently.
    // Null = no hint = first session.
    avoidB7Type: null,
    avoidC7Category: null
  };

  // ----------------------------------------------------------
  // Anti-memorization init: read avoidance hints from URL token or
  // sessionStorage. All purely client-side; no network call.
  // ----------------------------------------------------------

  function initAvoidanceHints() {
    // Priority 1: ?token=... query parameter from a return visit.
    try {
      const tokenStr = new URLSearchParams(window.location.search).get('token');
      if (tokenStr) {
        const decoded = S.decodeReturnToken(tokenStr);
        if (decoded) {
          if (decoded.lb) STATE.avoidB7Type = decoded.lb;
          if (decoded.lc) STATE.avoidC7Category = decoded.lc;
          // Clean the URL so the token doesn't end up in browser history
          // or referrer headers. The token is not sensitive (only scores
          // + last-seen tags), but defence in depth.
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      }
    } catch (e) { /* ignore: malformed URL or token */ }

    // Priority 2: sessionStorage from an earlier session in this tab.
    try {
      if (!STATE.avoidB7Type)     STATE.avoidB7Type     = sessionStorage.getItem('pause_last_b7_type') || null;
      if (!STATE.avoidC7Category) STATE.avoidC7Category = sessionStorage.getItem('pause_last_c7_cat')  || null;
    } catch (e) { /* sessionStorage unavailable: silently degrade */ }
  }

  // ----------------------------------------------------------
  // Stage definitions
  // ----------------------------------------------------------

  const STAGES = [];

  function buildStages() {
    STAGES.length = 0;
    STAGES.push({ id: 'welcome', label: UI.stageLabels.welcome,    render: renderWelcome, validate: validateWelcome });
    STAGES.push({ id: 'context', label: UI.stageLabels.context,    render: renderContext, validate: validateContext });
    STAGES.push({ id: 'bl',      label: UI.stageLabels.trajectory, render: renderBL,      validate: validateBL });

    ITEMS.dimensions.forEach(dim => {
      STAGES.push({
        id: 'dim-' + dim.id,
        label: dim.name,
        render: () => renderDimension(dim),
        validate: () => validateDimension(dim)
      });
    });

    STAGES.push({ id: 'result', label: UI.stageLabels.result, render: renderResult, validate: () => true });
  }

  // ----------------------------------------------------------
  // DOM references (filled at boot, after the backbone exists)
  // ----------------------------------------------------------

  let $stage, $stageLabel, $progressNum, $progressFill, $nav, $btnPrev, $btnNext;

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  // ----------------------------------------------------------
  // Three-part question structure
  // Task (visible) + Explanation (expand) + Reference (expand)
  // ----------------------------------------------------------

  function makeExplanation(item) {
    if (!item.explanation) return null;
    return el('details', { class: 'explanation' },
      el('summary', {}, UI.item.explanationSummary),
      el('div', { class: 'details-body', html: '<p>' + item.explanation + '</p>' }));
  }

  function makeReference(item) {
    if (!item.reference) return null;
    return el('details', { class: 'reference' },
      el('summary', {}, UI.item.referenceSummary),
      el('div', { class: 'details-body', html:
        '<blockquote class="quote">' + item.reference.quote + '</blockquote>' +
        '<span class="citation">' + item.reference.citation + '</span>' }));
  }

  /**
   * Item ids are also state keys, so section D uses "D1_item" etc. to
   * avoid colliding with the dimension ids D1-D4. The suffix is an
   * internal detail; strip it from anything shown to the respondent.
   */
  function displayId(id) {
    return String(id).replace(/_item$/, '');
  }

  function makeQNumber(label, reverse) {
    const parts = [label];
    if (reverse) parts.push(el('span', { class: 'reverse-tag' }, UI.item.reverseTag));
    return el('div', { class: 'q-number' }, ...parts);
  }

  /** Standard question card: number + task + extra nodes (nulls skipped). */
  function makeCard(numberLabel, task, reverse, ...extras) {
    const card = el('article', { class: 'q-card' });
    card.appendChild(makeQNumber(numberLabel, reverse));
    card.appendChild(el('h3', { class: 'q-text' }, task));
    extras.forEach(x => { if (x) card.appendChild(x); });
    return card;
  }

  // ----------------------------------------------------------
  // Stage 1: Welcome (disclaimer + age check)
  // ----------------------------------------------------------

  function renderWelcome() {
    const root = el('section', { class: 'stage-card welcome-card' });
    root.appendChild(el('div', { class: 'section-sublabel' }, UI.welcome.sublabel));
    root.appendChild(el('h2', { class: 'section-title', html: UI.welcome.titleHtml }));
    root.appendChild(el('div', { class: 'welcome-disclaimer', html: UI.welcome.disclaimerHtml }));

    const ageCard = el('div', { class: 'q-card age-check' });
    ageCard.appendChild(el('div', { class: 'q-number' }, UI.welcome.ageLabel));
    ageCard.appendChild(el('h3', { class: 'q-text' }, UI.welcome.ageQuestion));

    const ageOptions = el('div', { class: 'single-options' });
    [['yes', UI.welcome.ageYes], ['no', UI.welcome.ageNo]].forEach(([val, label]) => {
      ageOptions.appendChild(el('label', {
        class: 'single-option' + (STATE.age === val ? ' selected' : ''),
        onclick: () => { STATE.age = val; renderStage(); }
      },
        el('input', { type: 'radio', name: 'age', value: val, checked: STATE.age === val }),
        el('span', {}, label)));
    });
    ageCard.appendChild(ageOptions);

    if (STATE.age === 'no') {
      ageCard.appendChild(el('div', { class: 'na-note', html: UI.welcome.under18Html }));
    }

    root.appendChild(ageCard);
    return root;
  }

  function validateWelcome() {
    return STATE.age === 'yes';
  }

  // ----------------------------------------------------------
  // Stage 2: Context (A1, A2, A3)
  // ----------------------------------------------------------

  function renderContext() {
    const root = el('section', { class: 'stage-card' });
    root.appendChild(el('div', { class: 'section-sublabel' }, UI.context.sublabel));
    root.appendChild(el('h2', { class: 'section-title', html: UI.context.titleHtml }));
    root.appendChild(el('p', { class: 'section-intro' }, UI.context.intro));

    ITEMS.context.forEach(q => {
      const opts = el('div', { class: 'single-options' });
      q.options.forEach(o => {
        const isSelected = STATE.contextAnswers[q.id] === o.value;
        opts.appendChild(el('label', {
          class: 'single-option' + (isSelected ? ' selected' : ''),
          onclick: () => { STATE.contextAnswers[q.id] = o.value; renderStage(); }
        },
          el('input', { type: 'radio', name: q.id, value: o.value, checked: isSelected }),
          el('span', {}, o.label)));
      });
      root.appendChild(makeCard(UI.item.labelPrefix + displayId(q.id), q.task, false, opts));
    });

    return root;
  }

  function validateContext() {
    return ITEMS.context.every(q => STATE.contextAnswers[q.id]);
  }

  // ----------------------------------------------------------
  // Stage 3: BL (trajectory, skippable on short AI tenure)
  // ----------------------------------------------------------

  function renderBL() {
    const root = el('section', { class: 'stage-card' });
    root.appendChild(el('div', { class: 'section-sublabel' }, UI.trajectory.sublabel));
    root.appendChild(el('h2', { class: 'section-title', html: UI.trajectory.titleHtml }));
    root.appendChild(el('p', { class: 'section-intro' }, ITEMS.trajectory.intro));

    // Skip option for short tenure.
    const tenure = STATE.contextAnswers.A3;
    if (tenure === '<6m' || tenure === '6-12m') {
      const skipCard = el('div', { class: 'callout-quiet', html: UI.trajectory.skipCalloutHtml });
      skipCard.appendChild(el('div', { class: 'bl-skip-actions' },
        el('button', {
          class: 'btn btn-ghost',
          onclick: () => { STATE.blSkipped = true; goNext(); }
        }, STATE.blSkipped ? UI.trajectory.skippedButton : UI.trajectory.skipButton)));
      root.appendChild(skipCard);
    }

    // BL0: baseline stability.
    const bl0 = ITEMS.trajectory.bl0;
    root.appendChild(makeCard(
      UI.item.labelPrefix + displayId(bl0.id) + UI.trajectory.baselineTag, bl0.task, false,
      makeLikert(bl0.id, bl0.scale, STATE.blAnswers.BL0,
        v => { STATE.blAnswers.BL0 = v; renderStage(); },
        bl0.scale_legend || UI.trajectory.baselineLegendFallback, false),
      makeExplanation(bl0), makeReference(bl0)));

    // BL1-BL4.
    ITEMS.trajectory.items.forEach(item => {
      root.appendChild(makeCard(
        UI.item.labelPrefix + displayId(item.id), item.task, false,
        makeLikert(item.id, item.scale, STATE.blAnswers[item.id],
          v => { STATE.blAnswers[item.id] = v; renderStage(); },
          UI.trajectory.itemsLegend, false),
        makeExplanation(item), makeReference(item)));
    });

    return root;
  }

  function validateBL() {
    if (STATE.blSkipped) return true;
    if (STATE.blAnswers.BL0 === null) return false;
    return ['BL1', 'BL2', 'BL3', 'BL4'].every(k => STATE.blAnswers[k] !== null);
  }

  // ----------------------------------------------------------
  // Likert renderer (shared by BL and dimension items)
  // ----------------------------------------------------------

  function makeLikert(itemId, scale, currentValue, onChange, legend, allowNa) {
    const wrap = el('fieldset', { class: 'likert' });
    if (legend) wrap.appendChild(el('div', { class: 'likert-legend' }, legend));

    const opts = el('div', { class: 'likert-options' });
    scale.forEach(s => {
      opts.appendChild(el('label', { class: 'likert-option' },
        el('input', {
          type: 'radio', name: itemId, value: s.value,
          checked: currentValue === s.value,
          onchange: () => onChange(s.value)
        }),
        el('span', { class: 'box' },
          el('span', { class: 'dot' }),
          el('span', { class: 'label', html: s.label.replace(/\s+/g, '<br>') }))));
    });
    wrap.appendChild(opts);

    if (allowNa) {
      wrap.appendChild(el('div', { class: 'likert-na' },
        el('label', {},
          el('input', {
            type: 'checkbox',
            checked: currentValue === null && itemId in STATE.answers,
            onchange: (e) => {
              if (e.target.checked) onChange(null);
              else if (STATE.answers[itemId] === null) {
                delete STATE.answers[itemId];
                renderStage();
              }
            }
          }),
          el('span', {}, UI.item.notApplicable))));
    }

    return wrap;
  }

  // ----------------------------------------------------------
  // Dimension stage (sections B/C/D/E)
  // ----------------------------------------------------------

  function renderDimension(dim) {
    const root = el('section', { class: 'stage-card' });
    root.appendChild(el('div', { class: 'section-sublabel' },
      fmt(UI.dimension.sublabel, { id: dim.id, letter: dim.section_letter })));
    root.appendChild(el('h2', { class: 'section-title' }, el('em', {}, dim.name)));
    root.appendChild(el('p', { class: 'section-intro' }, UI.dimension.intro));

    dim.items.forEach(item => {
      if (item.type === 'likert') {
        root.appendChild(makeCard(
          UI.item.labelPrefix + displayId(item.id), item.task, item.reverse,
          makeLikert(item.id, dim.scale, STATE.answers[item.id],
            v => { STATE.answers[item.id] = v; renderStage(); }, dim.section_legend, true),
          makeExplanation(item), makeReference(item)));
      } else if (item.type === 'b7_claim') {
        root.appendChild(renderB7Card(item));
      } else if (item.type === 'c7_aut') {
        root.appendChild(renderC7Card(item));
      }
    });

    return root;
  }

  function validateDimension(dim) {
    for (const item of dim.items) {
      if (item.type === 'likert'   && !(item.id in STATE.answers)) return false;
      // Probes are complete when answered, skipped (scored as N/A), or
      // timed out with no answer (B7: also scored as N/A, never as the
      // worst option; non-response is a different thing from uncritical
      // acceptance).
      if (item.type === 'b7_claim' &&
          STATE.b7.score === null && !STATE.b7.skipped && !STATE.b7.timeUp) return false;
      if (item.type === 'c7_aut' &&
          STATE.c7.result === null && !STATE.c7.skipped)                    return false;
    }
    return true;
  }

  // ----------------------------------------------------------
  // Shared countdown for the two micro-tasks
  // ----------------------------------------------------------

  function fmtTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  /**
   * Run a countdown into #timerId, ticking every second and calling
   * onExpire at zero. Returns a handle with stop(). The two micro-task
   * timers below guard against double-starts themselves.
   */
  function startCountdown(timerId, seconds, onExpire) {
    const timer = document.getElementById(timerId);
    if (!timer) return null;
    timer.textContent = fmtTime(seconds);
    timer.classList.add('running');

    const interval = setInterval(() => {
      seconds--;
      const t = document.getElementById(timerId);
      if (t) {
        t.textContent = fmtTime(seconds);
        t.classList.add('running');
      }
      if (seconds <= 0) {
        clearInterval(interval);
        if (t) {
          t.classList.remove('running');
          t.classList.add('expired');
        }
        onExpire();
      }
    }, 1000);

    return { stop: () => clearInterval(interval) };
  }

  // ----------------------------------------------------------
  // B7: claim-evaluation micro-task
  // ----------------------------------------------------------

  let b7Timer = null;

  function renderB7Card(item) {
    if (!STATE.b7.poolItem) {
      // Stratified pick: avoid the fallacy type the respondent saw most
      // recently (via URL token or sessionStorage). First-time visitors
      // get fully random selection; pickB7Item handles both cases.
      const pool = B7_POOL.pool;
      STATE.b7.poolItem = S.pickB7Item(pool, STATE.avoidB7Type) ||
                          pool[Math.floor(Math.random() * pool.length)];
    }
    const p = STATE.b7.poolItem;

    const mt = el('div', { class: 'micro-task', id: 'mt-b7' });
    // aria-live is explicitly off on the timer: the stage container is a
    // polite live region, and a once-per-second tick would otherwise be
    // announced by screen readers for the whole 45 seconds.
    mt.appendChild(el('div', { class: 'mt-header' },
      el('span', { class: 'mt-label' }, UI.b7.taskLabel),
      el('span', { class: 'mt-timer', id: 'mt-b7-timer', 'aria-live': 'off' }, UI.b7.timerInitial)));
    mt.appendChild(el('p', { class: 'mt-prompt' }, p.paragraph));

    // Options are locked until the timer starts (mirroring C7's
    // textarea): answering must happen under the clock. They lock
    // again once an answer is given or time runs out with the
    // auto-selected option.
    const opts = el('div', { class: 'mt-options' });
    p.options.forEach(opt => {
      const isSelected = STATE.b7.selected === opt.key;
      // Enabled only while the timer runs: before it starts, after an
      // answer, after a skip, and after time-up the options are locked.
      const isDisabled = STATE.b7.selected !== null || b7Timer === null;
      const optEl = el('label', {
        class: 'mt-option' + (isSelected ? ' selected' : ''),
        onclick: (e) => {
          if (STATE.b7.selected !== null) return;
          if (b7Timer === null) return;
          if (e.target.tagName !== 'INPUT') {
            const input = optEl.querySelector('input');
            if (input) input.checked = true;
          }
          STATE.b7.selected = opt.key;
          STATE.b7.score = S.scoreB7(opt.key, p);
          stopB7Timer();
          renderStage();
        }
      },
        el('input', { type: 'radio', name: 'b7', value: opt.key, checked: isSelected, disabled: isDisabled }),
        el('span', { class: 'opt-letter' }, '(' + opt.key + ')'),
        el('span', {}, opt.text));
      opts.appendChild(optEl);
    });
    mt.appendChild(opts);

    const b7Done = STATE.b7.selected !== null || STATE.b7.skipped || STATE.b7.timeUp;
    mt.appendChild(el('div', { class: 'mt-start-row' },
      el('button', {
        class: 'btn btn-ghost',
        disabled: b7Done || b7Timer !== null,
        onclick: startB7Timer
      },
        STATE.b7.timeUp ? UI.b7.timeUpButton :
        STATE.b7.skipped ? UI.b7.skippedButton :
        STATE.b7.selected !== null ? UI.b7.answeredButton :
        b7Timer !== null ? UI.b7.runningButton : UI.b7.startButton),
      // Skip path: the probe scores as Not Applicable and is dropped
      // from the dimension mean, matching the Likert items' N/A option.
      !b7Done ? el('button', {
        class: 'btn btn-ghost',
        onclick: () => {
          stopB7Timer();
          STATE.b7.skipped = true;
          STATE.b7.selected = null;
          STATE.b7.score = null;
          renderStage();
        }
      }, UI.b7.skipButton) : null,
      el('span', { class: 'mt-hint' }, UI.b7.hint)));

    // After a no-answer time-up, say plainly how it is counted.
    if (STATE.b7.timeUp && STATE.b7.selected === null) {
      mt.appendChild(el('div', { class: 'mt-hint' }, UI.b7.timeUpNote));
    }

    return makeCard(UI.item.labelPrefix + displayId(item.id) + UI.b7.qLabelSuffix, item.task, false,
      mt, makeExplanation(item), makeReference(item));
  }

  function startB7Timer() {
    if (b7Timer !== null) return;
    b7Timer = startCountdown('mt-b7-timer', UI.b7.seconds, () => {
      b7Timer = null;
      STATE.b7.timeUp = true;
      // Time-up with no answer scores as N/A (null), dropped from the
      // dimension mean, exactly like a Likert item marked Not Applicable.
      // It is never scored as option (d): running out of time is
      // non-response, not uncritical acceptance.
      renderStage();
    });
    // Re-render so the options unlock and the button states update.
    renderStage();
  }

  function stopB7Timer() {
    if (b7Timer !== null) { b7Timer.stop(); b7Timer = null; }
  }

  // ----------------------------------------------------------
  // C7: Alternative Uses Task
  // ----------------------------------------------------------

  let c7Timer = null;

  function autLineCount(text) {
    if (!text) return 0;
    return text.split('\n').filter(line => line.trim().length > 0).length;
  }

  function renderC7Card(item) {
    if (!STATE.c7.object) {
      // Stratified pick: avoid the object category the respondent saw
      // most recently. First-time visitors get fully random selection.
      STATE.c7.object = S.pickC7Object(C7_DICT, STATE.avoidC7Category) ||
                        C7_DICT.objects[Math.floor(Math.random() * C7_DICT.objects.length)];
    }

    const objKey = STATE.c7.object;
    const objLabel = (C7_DICT.object_display && C7_DICT.object_display[objKey])
      ? C7_DICT.object_display[objKey]
      : objKey.replace(/_/g, ' ');
    const objBare = objLabel.replace(/^an?\s+/i, '');

    const mt = el('div', { class: 'micro-task', id: 'mt-c7' });
    mt.appendChild(el('div', { class: 'mt-header' },
      el('span', { class: 'mt-label' }, UI.c7.taskLabel, el('span', { class: 'aut-object' }, objBare)),
      el('span', { class: 'mt-timer', id: 'mt-c7-timer', 'aria-live': 'off' }, UI.c7.timerInitial)));
    mt.appendChild(el('p', { class: 'mt-prompt', html: fmt(UI.c7.promptHtml, { object: objLabel }) }));

    const isDisabled = STATE.c7.result !== null || (c7Timer === null && !STATE.c7.timeUp);
    mt.appendChild(el('textarea', {
      class: 'aut-textarea',
      id: 'mt-c7-textarea',
      rows: 8,
      placeholder: STATE.c7.timeUp ? UI.c7.placeholderTimeUp :
                   c7Timer !== null ? UI.c7.placeholderRunning : UI.c7.placeholderIdle,
      disabled: isDisabled,
      oninput: (e) => { STATE.c7.text = e.target.value; updateAutCounter(); }
    }, STATE.c7.text));

    mt.appendChild(el('div', { class: 'aut-counter', id: 'mt-c7-counter' },
      fmt(UI.c7.counter, { n: autLineCount(STATE.c7.text) })));

    const c7Done = STATE.c7.result !== null || STATE.c7.skipped;
    mt.appendChild(el('div', { class: 'mt-start-row' },
      el('button', {
        class: 'btn btn-ghost',
        disabled: c7Done || c7Timer !== null || STATE.c7.timeUp,
        onclick: startC7Timer
      },
        STATE.c7.skipped ? UI.c7.skippedButton :
        STATE.c7.timeUp ? UI.c7.timeUpButton :
        STATE.c7.result !== null ? UI.c7.submittedButton :
        c7Timer !== null ? UI.c7.runningButton : UI.c7.startButton),
      c7Timer !== null ? el('button', { class: 'btn btn-primary', onclick: submitC7 }, UI.c7.doneButton) : null,
      // Skip path: scores as Not Applicable, dropped from the D2 mean.
      !c7Done && c7Timer === null && !STATE.c7.timeUp ? el('button', {
        class: 'btn btn-ghost',
        onclick: () => {
          STATE.c7.skipped = true;
          STATE.c7.result = null;
          renderStage();
        }
      }, UI.c7.skipButton) : null,
      el('span', { class: 'mt-hint' }, UI.c7.hint)));

    return makeCard(UI.item.labelPrefix + displayId(item.id) + UI.c7.qLabelSuffix, item.task, false,
      mt, makeExplanation(item), makeReference(item));
  }

  function startC7Timer() {
    if (c7Timer !== null) return;
    c7Timer = startCountdown('mt-c7-timer', UI.c7.seconds, () => {
      c7Timer = null;
      STATE.c7.timeUp = true;
      submitC7();
    });
    // Re-render so the textarea unlocks and the "I'm done" button is
    // visible immediately (previously it only appeared after some other
    // interaction happened to re-render the stage), then focus the box.
    renderStage();
    const textarea = document.getElementById('mt-c7-textarea');
    if (textarea) textarea.focus();
  }

  function updateAutCounter() {
    const counter = document.getElementById('mt-c7-counter');
    if (counter) counter.textContent = fmt(UI.c7.counter, { n: autLineCount(STATE.c7.text) });
  }

  function submitC7() {
    if (c7Timer !== null) { c7Timer.stop(); c7Timer = null; }
    STATE.c7.result = S.scoreC7(STATE.c7.text, STATE.c7.object, C7_DICT);
    renderStage();
  }

  // ----------------------------------------------------------
  // Result stage
  // ----------------------------------------------------------

  /**
   * Build the overall summary paragraph from the band templates in
   * UI.result.summaries. Same branching as before, with the sentence
   * fragments filled from data instead of concatenated literals.
   */
  function buildSummaryText(dimScores, role) {
    const R = UI.result;
    const roleNote = R.rolePreamble[role] || '';
    const scores = ITEMS.dimensions.map(d => dimScores[d.id].score || 0);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highDims = ITEMS.dimensions.filter(d => (dimScores[d.id].score || 0) >= 50);
    const lowDims  = ITEMS.dimensions.filter(d => (dimScores[d.id].score || 0) <= 24);

    if (avgScore <= 24) {
      return fmt(R.summaries.minimal, { role: roleNote });
    }

    if (avgScore <= 49) {
      let text = fmt(R.summaries.mild, { role: roleNote });
      if (highDims.length > 0) {
        text += fmt(R.summaries.mildHighAppend, {
          list: highDims.map(d => '<em>' + d.name.toLowerCase() + '</em>').join(' and '),
          area: highDims.length === 1 ? R.words.thatArea : R.words.thoseAreas
        });
      }
      return text;
    }

    if (avgScore <= 74) {
      let text = fmt(R.summaries.moderate, { role: roleNote });
      if (highDims.length > 0) {
        text += fmt(R.summaries.moderateHighAppend, {
          list: highDims.map(d => '<em>' + d.name + '</em>').join(' and '),
          standOut: highDims.length === 1 ? R.words.standsOut : R.words.standOutPlural
        });
      }
      text += R.summaries.moderateTail;
      if (lowDims.length > 0) {
        text += fmt(R.summaries.moderateLowAppend, {
          list: lowDims.map(d => '<em>' + d.name.toLowerCase() + '</em>').join(' and '),
          look: lowDims.length === 1 ? R.words.looks : R.words.look
        });
      }
      return text;
    }

    return fmt(R.summaries.strong, { role: roleNote });
  }

  function renderResult() {
    const R = UI.result;
    const dimScores = computeDimensionScores();
    const traj = STATE.blSkipped ? null : S.scoreTrajectory(
      ['BL1', 'BL2', 'BL3', 'BL4'].map(k => STATE.blAnswers[k]));
    const trajLabel = traj === null ? null : S.trajectoryLabel(traj);
    const role = STATE.contextAnswers.A1;

    const root = el('section', { class: 'stage-card result' });
    root.appendChild(el('h1', { class: 'result-header', html: R.headerHtml }));
    root.appendChild(el('div', { class: 'result-banner', html: R.bannerHtml }));

    // ------ dimension bars + per-dimension feedback ------
    const dimsWrap = el('div', { class: 'dimensions' });
    ITEMS.dimensions.forEach(dim => {
      const score = dimScores[dim.id];
      const band = score.score !== null ? S.bandFor(score.score) : null;
      const row = el('div', { class: 'dim-row' });

      row.appendChild(el('div', { class: 'dim-row-header' },
        el('div', { class: 'dim-name' }, dim.name),
        el('div', { class: 'dim-band' },
          band ? band.label : R.limitedBasisBand,
          el('span', { class: 'dim-value' }, score.score !== null ? score.score : '\u2014'))));

      // The bar width is data (the score itself), so it stays a
      // per-element style; the bar's look lives in CSS.
      row.appendChild(el('div', { class: 'dim-bar-track' },
        el('div', { class: 'dim-bar-fill', style: 'width: ' + (score.score !== null ? score.score : 0) + '%;' })));

      if (score.limited_basis) {
        row.appendChild(el('span', { class: 'dim-tag' }, R.limitedBasisTag));
      } else if (score.n_na > 0) {
        row.appendChild(el('span', { class: 'dim-tag' }, fmt(R.naTag, { n: score.n_na })));
      }
      if (dim.id === 'D2') {
        row.appendChild(el('span', { class: 'dim-tag' }, R.c7ProvisionalTag));
      }

      // Feedback: band 1 gets the "minimal" message; everything above
      // gets the role-branched practice suggestion.
      const fbLib = FEEDBACK[dim.id];
      if (fbLib && band) {
        let fbText;
        if (band.band === 1 && fbLib.minimal && fbLib.minimal._all) {
          fbText = fbLib.minimal._all;
        } else if (fbLib.moderate_and_above) {
          fbText = fbLib.moderate_and_above[role] || fbLib.moderate_and_above.other;
        }
        if (fbText) {
          // html: so feedback.json may also use inline <em> markup.
          row.appendChild(el('div', { class: 'dim-feedback' },
            el('strong', {}, R.practiceHeading),
            el('span', { html: fbText })));
        }
      }
      dimsWrap.appendChild(row);
    });
    root.appendChild(dimsWrap);

    // ------ overall summary ------
    // Rendered as HTML (not a text node) so the data files can use
    // inline markup such as <em> around dimension names. Safe: every
    // string flowing in here is repo-controlled data, never user input.
    root.appendChild(el('div', { class: 'standing-message standing-message-summary' },
      el('strong', {}, R.summaryLabel),
      el('span', { html: ' ' + buildSummaryText(dimScores, role) })));

    // ------ N/A + limited-basis note ------
    // Count probe N/As (skips and B7 no-answer time-ups) alongside the
    // Likert N/As so the note triggers whenever anything was dropped.
    const probeNa = (STATE.b7.score === null ? 1 : 0) + (STATE.c7.result === null ? 1 : 0);
    const totalNa = Object.values(STATE.answers).filter(v => v === null).length + probeNa;
    const limitedDims = ['D1', 'D2', 'D3', 'D4']
      .filter(id => dimScores[id] && dimScores[id].limited_basis);

    if (totalNa > 0 || limitedDims.length > 0) {
      let noteHtml = R.naNoteHtml;
      if (limitedDims.length > 0) {
        noteHtml += fmt(limitedDims.length > 1 ? R.limitedNotePlural : R.limitedNoteSingular,
          { list: limitedDims.join(', ') });
      }
      root.appendChild(el('div', { class: 'na-note', html: noteHtml }));
    }

    // ------ trajectory card ------
    if (traj !== null && trajLabel) {
      const bl0 = STATE.blAnswers.BL0;
      root.appendChild(el('div', { class: 'trajectory-card' },
        el('div', { class: 'trajectory-label' }, R.trajectoryLabel),
        el('div', { class: 'trajectory-value' }, trajLabel),
        el('div', { class: 'trajectory-note' },
          (bl0 !== null && bl0 <= 1) ? R.trajectoryNoteUnstable : R.trajectoryNoteNormal)));
    }

    // ------ standing message ------
    root.appendChild(el('div', { class: 'standing-message', html: R.standingHtml }));

    // ------ return token ------
    // Include the fallacy type / object category the respondent just
    // saw, so a future session (entered via the Compare flow with this
    // token in ?token=...) can avoid presenting the same item type.
    // These fields are optional: older tokens without them still decode.
    const lastB7Type = STATE.b7.poolItem ? (STATE.b7.poolItem.fallacy_type || null) : null;
    const lastC7Cat = STATE.c7.object
      ? (C7_DICT.object_categories ? (C7_DICT.object_categories[STATE.c7.object] || null) : null)
      : null;

    // Mirror the same hints into sessionStorage so a within-tab re-take
    // (without going through the Compare flow) also avoids repetition.
    try {
      if (lastB7Type) sessionStorage.setItem('pause_last_b7_type', lastB7Type);
      if (lastC7Cat)  sessionStorage.setItem('pause_last_c7_cat',  lastC7Cat);
    } catch (e) { /* sessionStorage unavailable: degrade silently */ }

    const returnToken = S.makeReturnToken({
      D1: dimScores.D1.score, D2: dimScores.D2.score,
      D3: dimScores.D3.score, D4: dimScores.D4.score,
      trajectory: traj,
      lastB7FallacyType: lastB7Type,
      lastC7Category: lastC7Cat
    });

    root.appendChild(el('div', { class: 'return-token' },
      el('div', { class: 'return-token-label' }, R.tokenLabel),
      el('code', {}, returnToken)));

    // ------ actions ------
    root.appendChild(el('div', { class: 'result-actions' },
      el('button', {
        class: 'btn btn-ghost',
        onclick: () => downloadResults(dimScores, traj, returnToken)
      }, R.downloadButton),
      el('button', {
        class: 'btn btn-ghost',
        onclick: () => navigator.clipboard && navigator.clipboard.writeText(returnToken)
          .then(() => alert(R.copyAlert))
      }, R.copyButton),
      el('a', { class: 'btn btn-ghost', href: 'pages/compare.html#' + encodeURIComponent(returnToken) }, R.compareLink),
      el('a', { class: 'btn btn-ghost', href: 'index.html' }, R.homeLink)));

    return root;
  }

  // ----------------------------------------------------------
  // Dimension scoring orchestration
  // ----------------------------------------------------------

  function computeDimensionScores() {
    const results = {};
    ITEMS.dimensions.forEach(dim => {
      const items = dim.items.map(item => {
        if (item.type === 'likert')   return { type: 'likert', raw: STATE.answers[item.id], reverse: !!item.reverse };
        if (item.type === 'b7_claim') return { type: 'b7', b7Score: STATE.b7.score };
        if (item.type === 'c7_aut')   return { type: 'c7', c7Score: STATE.c7.result ? STATE.c7.result.score : null };
        return null;
      }).filter(Boolean);
      results[dim.id] = S.scoreDimension(items);
    });
    return results;
  }

  // ----------------------------------------------------------
  // Download my data (JSON)
  // ----------------------------------------------------------

  function downloadResults(dimScores, traj, returnToken) {
    const data = {
      pause_version: S.version,
      timestamp_utc: new Date().toISOString(),
      return_token: returnToken,
      context: STATE.contextAnswers,
      trajectory: {
        skipped: STATE.blSkipped,
        baseline_stable_BL0: STATE.blAnswers.BL0,
        items: STATE.blAnswers,
        mean: traj
      },
      dimension_scores: {
        D1: dimScores.D1, D2: dimScores.D2, D3: dimScores.D3, D4: dimScores.D4
      },
      answers: STATE.answers,
      b7: STATE.b7,
      c7: { ...STATE.c7 }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', {
      href: url,
      download: 'pause-result-' + new Date().toISOString().slice(0, 10) + '.json'
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ----------------------------------------------------------
  // Stage navigation
  // ----------------------------------------------------------

  function renderStage() {
    const stage = STAGES[STATE.stageIndex];
    if (!stage) return;

    clear($stage);
    $stage.appendChild(stage.render());
    $stageLabel.textContent = stage.label;

    // Progress: stage index out of stages (result stage excluded).
    const total = STAGES.length - 1;
    const num = Math.min(STATE.stageIndex, total);
    $progressNum.textContent = num + ' / ' + total;
    $progressFill.style.width = (100 * num / total) + '%';

    // Nav visibility per stage.
    if (stage.id === 'welcome') {
      $nav.hidden = false;
      $btnPrev.style.visibility = 'hidden';
      $btnNext.textContent = UI.nav.begin;
      $btnNext.disabled = !validateWelcome();
    } else if (stage.id === 'result') {
      $nav.hidden = true;
    } else {
      $nav.hidden = false;
      $btnPrev.style.visibility = 'visible';
      $btnNext.textContent = UI.nav.next;
      $btnNext.disabled = !stage.validate();
    }
  }

  function stopAllTimers() {
    stopB7Timer();
    if (c7Timer !== null) { c7Timer.stop(); c7Timer = null; }
  }

  function goNext() {
    const stage = STAGES[STATE.stageIndex];
    if (!stage || !stage.validate()) return;
    stopAllTimers();
    if (STATE.stageIndex < STAGES.length - 1) {
      STATE.stageIndex++;
      renderStage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function goPrev() {
    if (STATE.stageIndex > 0) {
      STATE.stageIndex--;
      renderStage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ----------------------------------------------------------
  // Boot: wait for the page engine, load instrument data, start
  // ----------------------------------------------------------

  window.PAUSE_APP.ready
    .then(({ page }) => Promise.all([
      page,
      getJSON('data/instrument/items.json'),
      getJSON('data/instrument/b7_pool.json'),
      getJSON('data/instrument/c7_dictionaries.json'),
      getJSON('data/instrument/feedback.json')
    ]))
    .then(([page, items, b7pool, c7dict, feedback]) => {
      UI = page.strings;
      ITEMS = items; B7_POOL = b7pool; C7_DICT = c7dict; FEEDBACK = feedback;

      $stage = document.getElementById('stage');
      $stageLabel = document.getElementById('stage-label');
      $progressNum = document.getElementById('progress-num');
      $progressFill = document.getElementById('progress-fill');
      $nav = document.getElementById('nav-controls');
      $btnPrev = document.getElementById('btn-prev');
      $btnNext = document.getElementById('btn-next');
      $btnPrev.textContent = UI.nav.prev;
      $btnNext.textContent = UI.nav.next;
      $btnNext.addEventListener('click', goNext);
      $btnPrev.addEventListener('click', goPrev);

      initAvoidanceHints();
      buildStages();
      renderStage();
    })
    .catch(err => {
      // app.js already rendered its load-error card for chrome failures;
      // this catches instrument-data failures as well.
      console.error('PAUSE: quiz data load failed', err);
    });

})();