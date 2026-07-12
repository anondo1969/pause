# PAUSE verification suite

A reproducible test harness for the claims in the paper "PAUSE: A
Privacy-Preserving Self-Reflection Tool for AI-Associated Cognitive
Offloading". Every check runs against the production code of the PAUSE
repository itself (the deployed `js/scoring.js`, `js/markdown.js`, the
instrument JSON files, the stylesheet, and the live pages), not against
copies or mocks. Nothing in the tool under test is modified.

## What each script verifies

**`audit.js`** (no browser needed) executes the scoring module directly and
asserts the paper's checkable claims, ending in PASS/FAIL lines and a
non-zero exit code on any failure:

- Section 5 worked example: the D1 item set scores exactly 71, and the
  brick Alternative Uses example scores band 1 with categories
  {building, weight, tool}, using the shipped category dictionary.
- Appendix B rubric monotonicity: fluency 9 with flexibility 4 is band 1;
  fluency >= 5 with flexibility < 3 is the band-4 near-duplicates case.
- Section 3.5 rotation guarantee: over 2,000 randomised draws with an
  avoidance hint, the avoided fallacy type is never selected.
- Section 3.3: a domain with fewer than three answered items shows no
  number (limited basis).
- Return token: round-trips its own output; rejects malformed scores and
  malformed day fields; non-response in B7 is null, never option (d).
- Markdown renderer: escapes raw HTML; refuses javascript: link schemes.
- Section 4.3: the palette's faint-ink text meets WCAG 2.1 AA (computed
  from the actual CSS variable, not a hardcoded value).
- Section 4.1: the stylesheet contains no third-party font requests.

It also prints (without asserting) token fuzzing results, keyword-stuffing
behaviour, and the full contrast table.

**`smoke.js`** boots all eight pages of the site in a simulated browser
(jsdom) over a local static server and asserts: chrome order (banner,
disclaimer strip, navigation), seven navigation links, footer with open
citation and BibTeX, page content rendered (hero and cards on the landing
page, sections on content pages, Markdown documents on essay/paper pages),
the Compare demo (chart paths, dots, delta cards, analysis, watermark,
demo banner), and a clean console on every page.

**`smoke_full_quiz.js`** drives the entire self-check end to end: age gate,
context, trajectory, all four dimensions including the timed B7 and C7
probes, through to the result page, then asserts four domain bars with
bands, role-branched feedback, the trajectory card, and that the produced
return token decodes. It also asserts that B7 options are locked before the
timer starts and that no internal item ids leak into visible labels.
Run with `SKIP_PROBES=1` to exercise the skip-as-not-applicable path
instead; the run then asserts the "1 marked N/A" basis tags on D1 and D2.

**`smoke_hash.js`** verifies the result-to-compare handoff: a token passed
in the URL fragment auto-fills the Compare page, renders the single-token
snapshot (four cards, chart hidden), and produces no console errors.

## Requirements

- Node.js 18 or newer (global `fetch` is used)
- The PAUSE repository on disk

## Running

```bash
npm install                 # installs jsdom (the only dependency)

# Optional: point the suite at another checkout. Default: the parent
# directory, i.e. this repository itself.
# export PAUSE_ROOT=/path/to/pause

npm run verify              # paper-claim assertions (audit.js)
npm run smoke               # all eight pages
npm run quiz                # full self-check to the result page
npm run quiz:skip-probes    # same, exercising the probe N/A path
npm run compare-hash        # token-via-URL-fragment flow
npm run all                 # everything, stops on first failure
```

Every script exits non-zero on failure, so the suite drops into CI as-is
(GitHub Actions: checkout, setup-node, `npm ci`, `PAUSE_ROOT=$GITHUB_WORKSPACE npm run all`).

Note that `smoke.js` and the quiz scripts start a throwaway HTTP server on
ports 8931 to 8933 for the duration of the run.

## Scope and honesty

The suite verifies mechanical claims: scoring arithmetic, rubric bands,
rotation, token handling, rendering, escaping, contrast, and the absence of
third-party requests. It cannot verify psychometric claims, and the paper
makes none; PAUSE is a self-reflection tool, not a validated instrument,
and this suite is evidence of implementation fidelity, not construct
validity.
