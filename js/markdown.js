/* ============================================================
   PAUSE - markdown.js
   Minimal Markdown -> HTML renderer. No dependencies, no network.

   Written in-house so the site keeps its "no third-party scripts"
   promise. Supports exactly the subset used by the project's
   Markdown documents (essay.md, paper.md, privacy-explained.md):

     # .. ####      headings
     ---            horizontal rule
     > quote        blockquotes
     - item         unordered lists (loose or tight)
     1. item        ordered lists (loose or tight)
     | a | b |      pipe tables with :---: alignment row
     ![alt](src)    images (a line that is only an image
                    becomes <figure class="paper-figure">)
     ``` .. ```     fenced code blocks
     `code`         inline code
     ***x*** **x** *x*   bold-italic / bold / italic
     [text](url)    links
     <https://x>    autolinks (also <name@host> for email)
     [^1] / [^1]:   footnote references and definitions
     line\          hard line break (also two trailing spaces)
     \*             backslash-escaped literal punctuation

   Everything else is treated as a paragraph. All input is
   HTML-escaped before inline markup is applied, so document text
   can never inject markup or script.
   ============================================================ */

(function (global) {
  'use strict';

  // ----- escaping ------------------------------------------

  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Only safe URL schemes become links or image sources
   * (https/http/mailto or relative); anything else (javascript:,
   * data:, ...) is left as plain text. The documents are
   * repo-controlled today, but this keeps the renderer safe if
   * Markdown ever becomes contributor-supplied.
   */
  function safeUrl(url) {
    if (!/^(https?:|mailto:|[./#a-z0-9_-])/i.test(url)) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^(https?|mailto):/i.test(url)) return false;
    return true;
  }

  // ----- inline markup --------------------------------------

  /**
   * Apply inline transforms to one already-escaped run of text.
   * Order matters: code spans and backslash escapes are protected
   * first so that markdown characters inside them are left alone;
   * then footnote references, images, links, autolinks; then the
   * emphasis ladder from most to least specific; then the protected
   * spans are restored and hard-break markers become <br />.
   *
   * Placeholders: \u0000 wraps code spans, \u0002 wraps escaped
   * characters, \u0001 marks a hard line break. None can occur in
   * document text (they are control characters), and escapeHtml
   * passes them through untouched.
   */
  function inline(s) {
    const codeSpans = [];
    const escaped = [];

    // 1. Pull out `code` spans and replace with placeholders.
    s = s.replace(/`([^`]+)`/g, (_, code) => {
      codeSpans.push('<code>' + code + '</code>');
      return '\u0000' + (codeSpans.length - 1) + '\u0000';
    });

    // 2. Pull out backslash-escaped punctuation (e.g. \[ \* \_) so
    //    the escaped character can never act as a markup marker.
    s = s.replace(/\\([\\`*_{}[\]()#+\-.!|~])/g, (_, ch) => {
      escaped.push(ch);
      return '\u0002' + (escaped.length - 1) + '\u0002';
    });

    // 3. Footnote references: [^id] -> superscript link. The
    //    definition lines are consumed at block level, so anything
    //    left here is a reference.
    s = s.replace(/\[\^([A-Za-z0-9_-]+)\]/g, (_, id) =>
      '<sup class="fn-ref" id="fnref-' + id + '"><a href="#fn-' + id + '">' + id + '</a></sup>');

    // 4. Images: ![alt](src). Must run before links so the leading
    //    "!" is not left behind as literal text.
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) =>
      safeUrl(src) ? '<img src="' + src + '" alt="' + alt + '" loading="lazy" />' : m);

    // 5. Links: [text](url). Text may itself contain emphasis.
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) =>
      safeUrl(url) ? '<a href="' + url + '" target="_blank" rel="noopener">' + text + '</a>' : m);

    // 6. Autolinks: <https://...> and <name@host>. The angle
    //    brackets were HTML-escaped in step 0 of the pipeline, so
    //    they appear here as entities.
    s = s.replace(/&lt;(https?:\/\/[^\s]+?)&gt;/g, (_, url) =>
      '<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>');
    s = s.replace(/&lt;([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})&gt;/g, (_, addr) =>
      '<a href="mailto:' + addr + '">' + addr + '</a>');

    // 7. Emphasis, most specific first. Non-greedy, must have a
    //    closing marker; unmatched markers are left as literal text.
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    // 8. Hard line breaks recorded by the block parser.
    s = s.replace(/\u0001 ?/g, '<br />');

    // 9. Restore escaped characters, then code spans.
    s = s.replace(/\u0002(\d+)\u0002/g, (_, i) => escapeHtml(escaped[Number(i)]));
    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => codeSpans[Number(i)]);

    return s;
  }

  // ----- block parsing ---------------------------------------

  /**
   * Render a whole Markdown document to an HTML string.
   * Single pass over the lines with a small state machine for the
   * multi-line constructs (lists, blockquotes, code fences, tables).
   */
  function render(md) {
    const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];

    let para = [];      // pending paragraph lines
    let list = null;    // { tag: 'ul'|'ol', start: n, items: [] }
    let listGap = false;// blank line seen inside a (possibly loose) list
    let quote = [];     // pending blockquote lines
    let code = null;    // pending fenced-code lines, or null
    let table = [];     // pending raw table lines
    const notes = [];   // footnote definitions, in document order

    function flushPara() {
      if (para.length) {
        out.push('<p>' + inline(escapeHtml(para.join(' '))) + '</p>');
        para = [];
      }
    }
    function flushList() {
      if (list) {
        const start = list.tag === 'ol' && list.start !== 1 ? ' start="' + list.start + '"' : '';
        out.push('<' + list.tag + start + '>' +
          list.items.map(i => '<li>' + inline(escapeHtml(i)) + '</li>').join('') +
          '</' + list.tag + '>');
        list = null;
      }
      listGap = false;
    }
    function flushQuote() {
      if (quote.length) {
        out.push('<blockquote><p>' + inline(escapeHtml(quote.join(' '))) + '</p></blockquote>');
        quote = [];
      }
    }
    function flushTable() {
      if (!table.length) return;
      const rows = table;
      table = [];

      // A real table needs a header row and a separator row whose
      // cells are all dashes with optional alignment colons.
      const cells = r => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
      const sepOk = rows.length >= 2 && cells(rows[1]).every(c => /^:?-{3,}:?$/.test(c));
      if (!sepOk) { para = para.concat(rows); flushPara(); return; }

      const aligns = cells(rows[1]).map(c => {
        if (/^:-+:$/.test(c)) return ' class="align-center"';
        if (/^-+:$/.test(c)) return ' class="align-right"';
        return '';
      });
      const row = (r, tag) =>
        '<tr>' + cells(r).map((c, i) =>
          '<' + tag + (aligns[i] || '') + '>' + inline(escapeHtml(c)) + '</' + tag + '>').join('') + '</tr>';

      out.push('<table><thead>' + row(rows[0], 'th') + '</thead><tbody>' +
        rows.slice(2).map(r => row(r, 'td')).join('') + '</tbody></table>');
    }
    function flushAll() { flushPara(); flushList(); flushQuote(); flushTable(); }

    for (const raw of lines) {
      let line = raw.trimEnd();

      // Fenced code blocks swallow everything until the closing fence.
      if (code !== null) {
        if (/^```/.test(line)) {
          out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
          code = null;
        } else {
          code.push(raw);
        }
        continue;
      }
      if (/^```/.test(line)) { flushAll(); code = []; continue; }

      // A hard line break: the raw line ends with a backslash or
      // two-plus trailing spaces. Recorded as \u0001 and turned
      // into <br /> by inline().
      let br = '';
      if (/( {2,}|\\)$/.test(raw)) {
        br = '\u0001';
        line = line.replace(/\\$/, '').trimEnd();
      }

      // Blank line: ends paragraph, quote, and table. A list is
      // kept open (loose lists put blank lines between items) and
      // only closed when the next block is not a matching item.
      if (line.trim() === '') {
        flushPara(); flushQuote(); flushTable();
        if (list) listGap = true;
        continue;
      }

      // Footnote definitions: [^id]: text (one line each).
      const fn = line.match(/^\[\^([A-Za-z0-9_-]+)\]:\s+(.*)$/);
      if (fn) { flushAll(); notes.push({ id: fn[1], html: inline(escapeHtml(fn[2])) }); continue; }

      // Tables: consecutive lines that start with a pipe.
      if (/^\s*\|/.test(line)) {
        flushPara(); flushList(); flushQuote();
        table.push(line);
        continue;
      }
      flushTable();

      // A line that is only an image becomes a figure.
      const fig = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (fig && safeUrl(fig[2])) {
        flushAll();
        out.push('<figure class="paper-figure"><img src="' + fig[2] + '" alt="' +
          escapeHtml(fig[1]) + '" loading="lazy" /></figure>');
        continue;
      }

      // Headings.
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        flushAll();
        const level = h[1].length;
        out.push('<h' + level + '>' + inline(escapeHtml(h[2])) + '</h' + level + '>');
        continue;
      }

      // Horizontal rule.
      if (/^(-{3,}|\*{3,})$/.test(line.trim())) { flushAll(); out.push('<hr />'); continue; }

      // Blockquote.
      const q = line.match(/^>\s?(.*)$/);
      if (q) { flushPara(); flushList(); quote.push(q[1] + br); continue; }

      // List items. A matching item after a blank line continues
      // the same (loose) list instead of starting a new one.
      const ul = line.match(/^[-*]\s+(.*)$/);
      const ol = line.match(/^(\d+)\.\s+(.*)$/);
      if (ul || ol) {
        flushPara(); flushQuote();
        const tag = ul ? 'ul' : 'ol';
        if (!list || list.tag !== tag) {
          flushList();
          list = { tag: tag, start: ol ? parseInt(ol[1], 10) : 1, items: [] };
        }
        list.items.push((ul ? ul[1] : ol[2]) + br);
        listGap = false;
        continue;
      }

      // Plain text: continuation of a list item, quote, or paragraph.
      // After a blank line a list no longer absorbs plain text.
      if (list && !listGap) { list.items[list.items.length - 1] += ' ' + line.trim() + br; continue; }
      if (list && listGap) flushList();
      if (quote.length) { quote.push(line.trim() + br); continue; }
      para.push(line.trim() + br);
    }

    flushAll();
    if (code !== null) out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');

    // Footnotes, if any, close the document.
    if (notes.length) {
      out.push('<section class="footnotes"><hr /><ol>' +
        notes.map(n => '<li id="fn-' + n.id + '">' + n.html +
          ' <a href="#fnref-' + n.id + '" class="fn-back" aria-label="Back to reference">\u21a9</a></li>').join('') +
        '</ol></section>');
    }

    return out.join('\n');
  }

  global.PAUSE_MD = { render: render };

})(window);