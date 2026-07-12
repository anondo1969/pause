/* ============================================================
   PAUSE v0.1-α - scoring.js
   All scoring logic. Pure functions, no DOM, no network.
   ============================================================ */

(function (global) {
  'use strict';

  const PAUSE_SCORING_VERSION = 'v0.1-alpha';

  // --------------------------------------------------------
  // Likert / reverse / N/A
  // --------------------------------------------------------

  /**
   * Returns the offloading-aligned score for one Likert item.
   * raw: 0..4 (or null if N/A)
   * reverse: boolean
   * After processing: higher = more offloading.
   */
  function scoreLikertItem(raw, reverse) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw !== 'number' || raw < 0 || raw > 4) return null;
    return reverse ? (4 - raw) : raw;
  }

  // --------------------------------------------------------
  // B7 claim-evaluation
  // --------------------------------------------------------

  /**
   * Pick a B7 item, avoiding the fallacy type the respondent saw most
   * recently. Two-stage selection:
   *   1. Determine the set of "allowed" fallacy types: all types except the
   *      one in `avoidType` (if provided and present in the pool).
   *   2. Pick a fallacy type uniformly at random from the allowed set.
   *   3. Pick an item uniformly at random from that type.
   *
   * This guarantees that across two consecutive sessions, the respondent
   * will not see the same fallacy type twice. With 10 fallacy types and
   * uniform-random selection within the 9 allowed, the probability of
   * seeing a familiar paragraph on visit 2 is at most 2/27 (roughly 7%)
   * even if the respondent perfectly remembers the previous paragraph.
   *
   * `avoidType` may be null/undefined (first session): then all types are
   * allowed. If `avoidType` is the only type in the pool (degenerate case),
   * it is allowed.
   */
  function pickB7Item(pool, avoidType, rng) {
    if (!pool || !Array.isArray(pool) || pool.length === 0) return null;
    const rand = rng || Math.random;

    // Group items by fallacy_type, falling back to "unknown" for items
    // without the tag (legacy pool compatibility).
    const byType = {};
    for (const item of pool) {
      const t = item.fallacy_type || 'unknown';
      if (!byType[t]) byType[t] = [];
      byType[t].push(item);
    }
    const allTypes = Object.keys(byType);
    if (allTypes.length === 0) return null;

    // Filter out the avoided type, unless it would leave the set empty.
    let allowed = allTypes.filter(t => t !== avoidType);
    if (allowed.length === 0) allowed = allTypes;

    const chosenType = allowed[Math.floor(rand() * allowed.length)];
    const items = byType[chosenType];
    const chosenItem = items[Math.floor(rand() * items.length)];
    return chosenItem;
  }

  /**
   * B7 scoring rubric:
   *   - 0: correct flaw identified
   *   - 2: a non-central wrong-but-not-(d) flaw identified
   *   - 4: "the conclusion seems sound" (option d) — uncritical acceptance
   *   - null: no response
   */
  function scoreB7(selectedOption, poolItem) {
    if (selectedOption === null || selectedOption === undefined) return null;
    if (!poolItem) return null;
    if (selectedOption === poolItem.correct) return 0;
    if (selectedOption === 'd') return 4;
    return 2;
  }

  // --------------------------------------------------------
  // C7 picker
  // --------------------------------------------------------

  /**
   * Pick a C7 object, avoiding the object category the respondent saw most
   * recently. Same two-stage selection as pickB7Item, on the per-object
   * category tags in c7_dictionaries.json.object_categories.
   *
   * `avoidCategory` may be null/undefined (first session): then all
   * categories are allowed.
   */
  function pickC7Object(dictionaries, avoidCategory, rng) {
    if (!dictionaries) return null;
    const rand = rng || Math.random;

    const objects = dictionaries.objects || [];
    const cats = dictionaries.object_categories || {};
    if (objects.length === 0) return null;

    // Group objects by category, falling back to "unknown" for objects
    // without a category tag (legacy compatibility).
    const byCat = {};
    for (const obj of objects) {
      const c = cats[obj] || 'unknown';
      if (!byCat[c]) byCat[c] = [];
      byCat[c].push(obj);
    }
    const allCats = Object.keys(byCat);
    if (allCats.length === 0) return null;

    let allowed = allCats.filter(c => c !== avoidCategory);
    if (allowed.length === 0) allowed = allCats;

    const chosenCat = allowed[Math.floor(rand() * allowed.length)];
    const objs = byCat[chosenCat];
    const chosenObj = objs[Math.floor(rand() * objs.length)];
    return chosenObj;
  }

  // --------------------------------------------------------
  // C7 Alternative Uses Task
  // --------------------------------------------------------

  /**
   * Normalise a single AUT response line for comparison.
   */
  function normaliseAutLine(line) {
    return String(line || '')
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s]/gu, '')   // strip punctuation
      .replace(/\s+/g, ' ');
  }

  /**
   * Split the raw textarea content into distinct, non-empty lines.
   */
  function parseAutText(text) {
    if (!text) return [];
    const seen = new Set();
    const out = [];
    text.split(/\r?\n+/).forEach(line => {
      const n = normaliseAutLine(line);
      if (n.length > 0 && !seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    });
    return out;
  }

  /**
   * For each AUT line, find the matching category in the per-object dictionary.
   * Returns the set of distinct categories spanned.
   * Matching is keyword-based: a line matches a category if any of the
   * category's keywords appears as a token or substring in the line.
   */
  function autCategories(lines, dictionary) {
    if (!dictionary) return new Set();
    const cats = new Set();
    for (const line of lines) {
      for (const [category, keywords] of Object.entries(dictionary)) {
        for (const kw of keywords) {
          if (line.includes(kw.toLowerCase())) {
            cats.add(category);
            break;
          }
        }
      }
    }
    return cats;
  }

  /**
   * Score a C7 AUT response.
   * Returns { fluency, flexibility, score (0..4) }.
   * Higher score = more offloading (less fluent / less diverse).
   *
   * Bands per paper Appendix B (disjoint fluency ranges):
   *   0: fluency >= 8 AND flexibility >= 5  (strong fluency and diversity)
   *   1: fluency in [5, 7] AND flexibility >= 3  (adequate)
   *   2: fluency in [3, 4]  (moderate fluency, limited diversity)
   *   3: fluency in [1, 2]  (low fluency)
   *   4: fluency == 0, OR fluency >= 5 but flexibility too low for bands 0/1.
   *      The high-fluency-low-flexibility case is the paper's "all
   *      near-duplicates" condition: many entries that all map to one or two
   *      categories, indicating fixation rather than divergent thinking.
   */
  function scoreC7(text, object, dictionaries) {
    const lines = parseAutText(text);
    const fluency = lines.length;
    const dict = dictionaries && dictionaries.dictionaries
      ? dictionaries.dictionaries[object]
      : null;
    const cats = autCategories(lines, dict);
    const flexibility = cats.size;

    let score;
    if (fluency >= 8 && flexibility >= 5) {
      score = 0;
    } else if (fluency >= 5 && flexibility >= 3) {
      // Adequate fluency and diversity. Deliberately open-ended on the
      // fluency side: fluency >= 8 with flexibility 3-4 belongs here,
      // not in band 4. (An earlier revision let that case fall through
      // to band 4, which was non-monotonic: nine varied ideas scored
      // worse than three ideas in one category.)
      score = 1;
    } else if (fluency >= 3 && fluency <= 4) {
      score = 2;
    } else if (fluency >= 1 && fluency <= 2) {
      score = 3;
    } else {
      // fluency == 0 (no ideas), OR fluency >= 5 with flexibility < 3:
      // the paper's "all near-duplicates" case, e.g. five ways to throw
      // a brick that all map to one or two categories.
      score = 4;
    }

    return { fluency, flexibility, score, categories: Array.from(cats) };
  }

  // --------------------------------------------------------
  // Dimension scoring
  // --------------------------------------------------------

  /**
   * Compute a dimension score from an array of {raw, reverse, type, b7, c7}
   * item answers. Returns { score (0..100 or null), n_valid, n_na, limited_basis }.
   *
   * - Likert: scoreLikertItem
   * - B7: 0/2/4 already offloading-aligned
   * - C7: 0..4 already offloading-aligned (multiplied by 1 here)
   * - N/A: dropped, not imputed; a dimension with fewer than 3 answered items
   *   returns no score (limited_basis: true).
   */
  function scoreDimension(items) {
    const scored = [];
    const naIdx = [];

    items.forEach((it, idx) => {
      let s;
      if (it.type === 'likert') {
        s = scoreLikertItem(it.raw, it.reverse);
      } else if (it.type === 'b7') {
        s = it.b7Score;       // already 0/2/4 or null
      } else if (it.type === 'c7') {
        s = it.c7Score;       // already 0..4 or null
      }
      if (s === null || s === undefined) {
        naIdx.push(idx);
        scored.push(null);
      } else {
        scored.push(s);
      }
    });

    const validValues = scored.filter(v => v !== null);
    const MIN_VALID = 3;

    // Use only the items the respondent actually answered. N/A is dropped, not
    // imputed. If too few items were answered, do not show a number: the reading
    // would rest on too little to mean anything.
    if (validValues.length < MIN_VALID) {
      return {
        score: null,
        n_valid: validValues.length,
        n_na: naIdx.length,
        limited_basis: true,
      };
    }

    const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const score100 = Math.round(mean * 25);

    return {
      score: score100,
      n_valid: validValues.length,
      n_na: naIdx.length,
      limited_basis: false,
    };
  }

  // --------------------------------------------------------
  // Bands
  // --------------------------------------------------------

  function bandFor(score) {
    if (score === null || score === undefined) return null;
    if (score <= 24) return { band: 1, label: 'Minimal offloading signal' };
    if (score <= 49) return { band: 2, label: 'Mild offloading signal' };
    if (score <= 74) return { band: 3, label: 'Moderate offloading signal' };
    return { band: 4, label: 'Strong offloading signal' };
  }

  // --------------------------------------------------------
  // Trajectory
  // --------------------------------------------------------

  /**
   * Trajectory is the unweighted mean of BL1..BL4 on a -2..+2 scale.
   * Negative = "less often than before AI" (movement toward offloading).
   * Positive = "more often than before AI" (movement away from offloading).
   */
  function scoreTrajectory(blAnswers) {
    if (!blAnswers || blAnswers.length === 0) return null;
    const valid = blAnswers.filter(v => v !== null && v !== undefined);
    if (valid.length === 0) return null;
    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    return Math.round(mean * 100) / 100;
  }

  function trajectoryLabel(mean) {
    if (mean === null || mean === undefined) return null;
    if (mean <= -0.5) return 'Habits shifted toward more offloading';
    if (mean >= 0.5) return 'Habits shifted toward less offloading';
    return 'Habits roughly stable';
  }

  // --------------------------------------------------------
  // Return token (opaque base64 of scores + version + last-seen tags)
  // --------------------------------------------------------

  /**
   * UTF-8 <-> base64 helpers. Byte-identical to the historical
   * btoa(unescape(encodeURIComponent(...))) trick, so every token
   * produced by earlier releases still decodes, without relying on
   * the deprecated escape/unescape functions.
   */
  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function base64ToUtf8(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /**
   * Encode a session result as an opaque return token.
   *
   * Payload keys:
   *   v  : scoring/instrument version string
   *   t  : day-since-epoch integer (privacy: not exact timestamp)
   *   d  : [D1, D2, D3, D4] dimension scores 0..100
   *   tr : trajectory mean (may be null)
   *   lb : last-seen B7 fallacy type code (optional; for next-session avoidance)
   *   lc : last-seen C7 object category code (optional; for next-session avoidance)
   *
   * The lb/lc fields are present only so the next session's picker can
   * avoid the same item type. They contain no personal data and are
   * decodable client-side only.
   */
  function makeReturnToken(payload) {
    const compact = {
      v: PAUSE_SCORING_VERSION,
      t: Math.floor(Date.now() / 86400000),       // day since epoch
      d: [payload.D1, payload.D2, payload.D3, payload.D4],
      tr: payload.trajectory,
    };
    if (payload.lastB7FallacyType) compact.lb = payload.lastB7FallacyType;
    if (payload.lastC7Category)    compact.lc = payload.lastC7Category;
    const json = JSON.stringify(compact);
    return utf8ToBase64(json).replace(/=+$/, ''); // trim padding
  }

  /**
   * Decode a return token back into a session object.
   * Returns { v, t, D1, D2, D3, D4, tr, lb, lc } or null on failure.
   * lb and lc are present only if the token-producing session ran a B7/C7
   * probe and the token encoder included them (older tokens won't have them).
   */
  function decodeReturnToken(str) {
    try {
      const padded = str + '===='.slice(0, (4 - str.length % 4) % 4);
      const json = base64ToUtf8(padded);
      const o = JSON.parse(json);
      if (!o.d || !Array.isArray(o.d) || o.d.length !== 4) return null;
      for (let i = 0; i < 4; i++) {
        if (typeof o.d[i] !== 'number' || o.d[i] < 0 || o.d[i] > 100) return null;
      }
      // The day-since-epoch field feeds date rendering and sorting on
      // the Compare page; a missing or non-numeric value would surface
      // as "undefined NaN, NaN" labels and NaN sort comparisons.
      if (typeof o.t !== 'number' || !isFinite(o.t) || o.t < 0) return null;
      return {
        v: o.v, t: o.t,
        D1: o.d[0], D2: o.d[1], D3: o.d[2], D4: o.d[3],
        tr: o.tr,
        lb: o.lb || null,
        lc: o.lc || null,
      };
    } catch (e) {
      return null;
    }
  }

  // --------------------------------------------------------
  // Exports
  // --------------------------------------------------------

  global.PAUSE_SCORING = {
    version: PAUSE_SCORING_VERSION,
    scoreLikertItem,
    pickB7Item,
    scoreB7,
    pickC7Object,
    parseAutText,
    autCategories,
    scoreC7,
    scoreDimension,
    bandFor,
    scoreTrajectory,
    trajectoryLabel,
    makeReturnToken,
    decodeReturnToken,
  };

})(window);