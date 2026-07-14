/* ============================================================
   PAUSE - app.js
   Shared page engine. No dependencies, no network beyond the
   site's own static data/ files.

   Every HTML file is an empty backbone with <body data-page="x">.
   This script:

     1. fetches data/site.json (chrome shared by every page) and
        data/pages/<x>.json (that page's own texts),
     2. injects the banner(s), top navigation, and footer into the
        #chrome-top / #chrome-bottom placeholders,
     3. renders the page content into #page-main from declarative
        "blocks" in the page JSON, or from a Markdown document in
        data/content/ (rendered by js/markdown.js),
     4. exposes window.PAUSE_APP.ready, a promise the interactive
        page scripts (quiz.js, compare.js) await before booting,
        which resolves to { site, page }.

   The result: chrome is defined once (data/site.json), texts are
   editable without touching HTML or JS, and design stays in CSS.
   ============================================================ */

(function (global) {
  'use strict';

  // ----- tiny DOM helper (shared with quiz.js via PAUSE_APP) -----

  /**
   * el(tag, attrs, ...children) - create an element.
   *   attrs.class -> className, attrs.html -> innerHTML,
   *   attrs.onXxx -> event listener, boolean true -> bare attribute.
   * Children may be nodes, strings, numbers, or null (skipped).
   */
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v === true) node.setAttribute(k, '');
      else if (v !== false && v !== null && v !== undefined) node.setAttribute(k, v);
    }
    for (const child of children) {
      if (child === null || child === undefined || child === false) continue;
      node.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  /**
   * fmt(template, values) - fill "{name}" placeholders in a data
   * string. Used so message templates can live in JSON while the
   * numbers are computed in code.
   */
  function fmt(template, values) {
    return String(template).replace(/\{(\w+)\}/g, (m, k) =>
      (values && k in values) ? values[k] : m);
  }

  function getJSON(url) {
    return fetch(url).then(r => {
      if (!r.ok) throw new Error(url + ' -> ' + r.status);
      return r.json();
    });
  }
  function getText(url) {
    return fetch(url).then(r => {
      if (!r.ok) throw new Error(url + ' -> ' + r.status);
      return r.text();
    });
  }

  // ----- chrome: banner, nav, footer -------------------------

  function renderChromeTop(site, page) {
    const top = document.getElementById('chrome-top');
    if (!top) return;

    // Two-tier banner first: the sign + its meaning, then the quiet
    // disclaimer strip. Shown at the very top of every page.
    top.appendChild(el('div', { class: 'validation-banner' },
      el('span', { class: 'pip' }, site.banner.pip), ' ',
      el('span', { html: site.banner.html })));
    top.appendChild(el('div', { class: 'validation-banner validation-banner-secondary', html: site.disclaimerBanner.html }));

    // Navigation directly below the banner.
    const links = el('div', { class: 'topnav-links' });
    site.nav.links.forEach(l => links.appendChild(el('a', { href: l.href }, l.label)));
    top.appendChild(el('nav', { class: 'topnav' },
      el('div', { class: 'wrap topnav-inner' },
        el('a', { class: 'topnav-brand', href: 'index.html' },
          el('span', { class: 'brand-name', html: site.nav.brandHtml })),
        links)));
  }

  function renderChromeBottom(site) {
    const bottom = document.getElementById('chrome-bottom');
    if (!bottom) return;
    const f = site.footer;
    const c = f.citation;

    bottom.appendChild(el('footer', { class: 'app-footer' },
      el('div', { class: 'wrap' },
        el('div', { class: 'footer-no-collect' }, el('p', {}, f.noCollect)),
        el('div', { class: 'footer-row' },
          el('div', { html: f.leftHtml }),
          el('div', { html: f.rightHtml })),
        el('div', { class: 'footer-row footer-quiet' }, f.quiet),
        f.contactHtml
          ? el('div', { class: 'footer-row footer-quiet', html: f.contactHtml })
          : null,
        el('details', { class: 'footer-citation', open: false },
          el('summary', { class: 'fc-summary' },
            el('span', { class: 'fc-plus' }, '+'), c.summary),
          el('div', { class: 'fc-body' },
            el('p', { class: 'fc-text', html: c.textHtml }),
            el('details', { class: 'fc-bibtex', open: true },
              el('summary', { class: 'fc-bibtex-summary' },
                el('span', { class: 'fc-plus' }, '+'), c.bibtexSummary),
              el('pre', { class: 'fc-pre' }, c.bibtex)))))));
  }

  // ----- content blocks ---------------------------------------

  /**
   * A section body is an ordered list of flow items, each an object
   * with exactly one key:
   *   { "p": "<html>" }                       paragraph
   *   { "callout": "<html>" }                 callout-quiet box
   *   { "ul": {"class": "x", "items": []} }   unordered list
   */
  function renderFlow(parent, body) {
    (body || []).forEach(item => {
      if (item.p) parent.appendChild(el('p', { html: item.p }));
      else if (item.callout) parent.appendChild(el('p', { class: 'callout-quiet', html: item.callout }));
      else if (item.ul) {
        const list = el('ul', { class: item.ul.class || '' });
        item.ul.items.forEach(i => list.appendChild(el('li', { html: i })));
        parent.appendChild(list);
      }
    });
  }

  const BLOCKS = {

    // Landing hero: eyebrow + title + tagline + lede + actions + meta.
    hero(b) {
      const actions = el('div', { class: 'hero-actions' });
      (b.actions || []).forEach(a =>
        actions.appendChild(el('a', { class: 'btn btn-' + (a.style || 'ghost'), href: a.href }, a.label)));
      return el('section', { class: 'intro-hero' },
        el('h1', { class: 'hero-title' },
          el('span', { class: 'hero-eyebrow', html: b.eyebrowHtml }),
          el('span', { html: b.titleHtml })),
        el('p', { class: 'hero-tagline' }, b.tagline),
        el('p', { class: 'hero-lede', html: b.ledeHtml }),
        actions,
        el('div', { class: 'hero-meta' }, el('span', { html: b.metaHtml })));
    },

    // Generic content section: optional heading, then a flow body.
    // On the landing page sections carry the intro-section/section-h
    // styling hooks; on content pages (about, privacy) the styling
    // comes from .content-page descendant selectors, so the elements
    // stay bare.
    section(b, ctx) {
      const cls = [ctx.sectionClass, b.class].filter(Boolean).join(' ');
      const s = el('section', cls ? { class: cls } : {});
      if (b.id) s.id = b.id;
      if (b.heading) s.appendChild(el('h2', ctx.headingClass ? { class: ctx.headingClass, html: b.heading } : { html: b.heading }));
      renderFlow(s, b.body);
      return s;
    },

    // The four-dimension card grid on the landing page.
    cards(b) {
      const grid = el('div', { class: 'dim-grid' });
      (b.items || []).forEach(c => grid.appendChild(
        el('article', { class: 'dim-card' },
          el('div', { class: 'dim-card-num' }, c.num),
          el('h3', {}, c.title),
          el('p', { html: c.text }))));
      const s = el('section', { class: 'intro-section' });
      if (b.heading) s.appendChild(el('h2', { class: 'section-h', html: b.heading }));
      s.appendChild(grid);
      return s;
    },

    // Closing call-to-action on the landing page.
    cta(b) {
      return el('section', { class: 'intro-section intro-cta' },
        el('h2', { class: 'section-h', html: b.heading }),
        el('p', { class: 'cta-lede', html: b.ledeHtml }),
        el('a', { class: 'btn btn-primary btn-large', href: b.action.href }, b.action.label),
        el('p', { class: 'cta-fine', html: b.fineHtml }));
    }
  };

  function renderPageContent(site, page) {
    const main = document.getElementById('page-main');
    if (!main) return Promise.resolve();
    if (page.mainClass) main.className = 'wrap ' + page.mainClass;

    // Content-page header (title + lede), shared by about/privacy/compare.
    if (page.header) {
      if (page.header.eyebrow) main.appendChild(el('div', { class: page.header.eyebrowClass || 'compare-eyebrow' }, page.header.eyebrow));
      if (page.header.titleHtml) main.appendChild(el('h1', { class: 'page-title', html: page.header.titleHtml }));
      if (page.header.ledeHtml) main.appendChild(el('p', { class: 'lede', html: page.header.ledeHtml }));
    }

    // Content pages get bare sections; the landing page gets the
    // intro-section styling hooks.
    const isContent = (page.mainClass || '').indexOf('content-page') !== -1;
    const ctx = {
      sectionClass: isContent ? '' : 'intro-section',
      headingClass: isContent ? '' : 'section-h'
    };

    (page.blocks || []).forEach(b => {
      const renderer = BLOCKS[b.type];
      if (renderer) main.appendChild(renderer(b, ctx));
    });

    // Markdown document pages (essay, paper, privacy-explained).
    if (page.markdown) {
      const article = el('article', { class: page.articleClass || 'paper-content' });
      main.appendChild(article);
      return getText(page.markdown).then(md => {
        article.innerHTML = global.PAUSE_MD.render(md);
      });
    }
    return Promise.resolve();
  }

  // ----- boot --------------------------------------------------

  const pageId = document.body.getAttribute('data-page');

  const ready = Promise.all([
    getJSON('data/site.json'),
    getJSON('data/pages/' + pageId + '.json')
  ]).then(([site, page]) => {
    document.title = site.meta.titlePrefix + (page.titleSuffix ? ' \u00b7 ' + page.titleSuffix : '');
    if (page.bodyClass) document.body.classList.add(page.bodyClass);
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', page.description || site.meta.description);

    renderChromeTop(site, page);
    renderChromeBottom(site);
    return renderPageContent(site, page).then(() => ({ site, page }));
  }).catch(err => {
    // Most common cause: the page was opened from disk (file://),
    // where browsers block fetch() of local files.
    console.error('PAUSE: page data failed to load', err);
    const main = document.getElementById('page-main') || document.body;
    main.innerHTML =
      '<section class="stage-card"><h2 class="section-title">Could not load</h2>' +
      '<p>This page could not load its data files. If you opened it directly from disk, ' +
      'browsers block local file access for security. Serve the folder with a small web ' +
      'server (for example <code>python -m http.server</code>) and reopen it.</p></section>';
    throw err;
  });

  global.PAUSE_APP = { ready: ready, el: el, fmt: fmt, getJSON: getJSON };

})(window);
