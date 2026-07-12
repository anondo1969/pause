/* Root of the PAUSE repository under test.
   Override with:  PAUSE_ROOT=/path/to/pause node <script>  */
const PAUSE_ROOT = process.env.PAUSE_ROOT || require('path').resolve(__dirname, '..');
/* Smoke test: serve /home/claude/pause, load every page in jsdom,
   and assert the chrome + content actually rendered. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = PAUSE_ROOT;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0].split('#')[0]));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'text/plain' });
    res.end(data);
  });
});

function loadPage(page) {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', e => { if (!/css|stylesheet/i.test(String(e))) errors.push(String(e.message || e)); });
  vc.on('error', (...a) => errors.push(a.join(' ')));
  return JSDOM.fromURL('http://127.0.0.1:8931/' + page, {
    resources: 'usable',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      // jsdom has no fetch/scroll/alert; polyfill minimal versions.
      window.fetch = (url, opts) =>
        globalThis.fetch(new URL(url, window.document.baseURI || window.location.href).href, opts);
      window.TextEncoder = TextEncoder; window.TextDecoder = TextDecoder;
      window.HTMLElement.prototype.scrollIntoView = () => {};
      window.scrollTo = () => {};
      window.alert = () => {};
    }
  }).then(dom => new Promise(res => setTimeout(() => res({ dom, errors }), 1200)));
}

async function main() {
  await new Promise(r => server.listen(8931, r));
  const pages = ['index.html', 'pages/about.html', 'pages/privacy.html',
    'pages/privacy-explained.html', 'pages/essay.html', 'pages/paper.html',
    'pages/compare.html', 'pages/quiz.html'];
  let failures = 0;

  for (const page of pages) {
    const { dom, errors } = await loadPage(page);
    const d = dom.window.document;
    const c = {
      title: d.title,
      banner: !!d.querySelector('.validation-banner'),
      navLinks: d.querySelectorAll('.topnav-links a').length,
      footer: !!d.querySelector('.app-footer .footer-no-collect'),
      bibtex: !!(d.querySelector('.fc-pre') || {}).textContent
    };
    if (page === 'index.html') c.extra = 'hero=' + !!d.querySelector('.intro-hero') + ' cards=' + d.querySelectorAll('.dim-card').length + ' sections=' + d.querySelectorAll('.intro-section').length;
    if (/about|privacy\.html/.test(page)) c.extra = 'h2s=' + d.querySelectorAll('#page-main h2').length;
    if (/essay|paper|explained/.test(page)) {
      const art = d.querySelector('.paper-content');
      c.extra = 'mdParas=' + (art ? art.querySelectorAll('p').length : 0) +
        ' mdH2s=' + (art ? art.querySelectorAll('h2').length : 0) +
        ' banners=' + d.querySelectorAll('.validation-banner').length;
    }
    if (page.endsWith('compare.html')) {
      c.extra = 'form=' + !!d.getElementById('token-input');
      d.getElementById('btn-demo').click();
      await new Promise(r => setTimeout(r, 400));
      c.demo = 'analysisEms=' + d.querySelectorAll('.compare-analysis-dim em').length +
        ' chartPaths=' + d.querySelectorAll('#chart-svg path').length +
        ' dots=' + d.querySelectorAll('#chart-svg .chart-dot').length +
        ' deltas=' + d.querySelectorAll('.compare-delta-card').length +
        ' analysisRows=' + d.querySelectorAll('.compare-analysis-dim').length +
        ' summary=' + !!d.querySelector('.compare-analysis-summary') +
        ' demoBanner=' + !!d.getElementById('demo-banner') +
        ' watermark=' + !!d.querySelector('.chart-watermark');
    }
    if (page.endsWith('quiz.html')) {
      c.extra = 'welcome=' + !!d.querySelector('.welcome-card') +
        ' next="' + (d.getElementById('btn-next') || {}).textContent + '"' +
        ' progress="' + (d.getElementById('progress-num') || {}).textContent + '"';
      const yes = d.querySelector('.single-option');
      if (yes) {
        yes.click();
        await new Promise(r => setTimeout(r, 150));
        const next = d.getElementById('btn-next');
        c.afterAge = 'nextEnabled=' + !next.disabled;
        next.click();
        await new Promise(r => setTimeout(r, 150));
        c.stage2 = 'label="' + d.getElementById('stage-label').textContent + '" qCards=' + d.querySelectorAll('.q-card').length;
      }
    }
    // chrome order + open citation checks
    const kids = [...d.getElementById('chrome-top').children].map(x => x.className.split(' ')[0]);
    c.chromeOrder = kids.join('>');
    c.banners = d.querySelectorAll('.validation-banner').length;
    c.footerContact = !!d.querySelector('.app-footer a[href^="mailto:"]');
    c.citationOpen = d.querySelector('.footer-citation').hasAttribute('open') &&
                     d.querySelector('.fc-bibtex').hasAttribute('open');
    const bad = !c.banner || c.navLinks !== 7 || !c.footer || errors.length ||
                c.chromeOrder !== 'validation-banner>validation-banner>topnav' ||
                c.banners !== 2 || !c.citationOpen || !c.footerContact;
    if (bad) failures++;
    console.log((bad ? 'FAIL ' : 'PASS ') + page, JSON.stringify(c), errors.length ? 'ERRORS: ' + errors.slice(0,3).join(' | ') : '');
    dom.window.close();
  }
  server.close();
  process.exit(failures ? 1 : 0);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
