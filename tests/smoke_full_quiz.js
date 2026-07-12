/* Root of the PAUSE repository under test.
   Override with:  PAUSE_ROOT=/path/to/pause node <script>  */
const PAUSE_ROOT = process.env.PAUSE_ROOT || require('path').resolve(__dirname, '..');
const SKIP_PROBES = process.env.SKIP_PROBES === '1';
/* Drive the quiz end-to-end to the result stage. */
const http = require('http'); const fs = require('fs'); const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = PAUSE_ROOT;
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.md':'text/plain','.svg':'image/svg+xml' };
const server = http.createServer((req,res)=>{ const p=path.join(ROOT,decodeURIComponent(req.url.split('?')[0].split('#')[0]));
  fs.readFile(p,(e,d)=>{ if(e){res.writeHead(404);return res.end('nf');} res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'text/plain'}); res.end(d); });});

const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function main(){
  await new Promise(r=>server.listen(8932,r));
  const vc = new VirtualConsole(); const errors=[];
  vc.on('jsdomError', e=>{ if(!/css|stylesheet/i.test(String(e))) errors.push(String(e.message||e)); });
  const dom = await JSDOM.fromURL('http://127.0.0.1:8932/pages/quiz.html',{
    resources:'usable', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(w){ w.fetch=(u,o)=>globalThis.fetch(new URL(u,w.document.baseURI||w.location.href).href,o);
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      w.HTMLElement.prototype.scrollIntoView=()=>{}; w.scrollTo=()=>{}; w.alert=()=>{}; }
  });
  await sleep(1200);
  const d = dom.window.document;
  const next = () => { d.getElementById('btn-next').click(); };

  // Stage 0: welcome -> age yes
  d.querySelector('.single-option').click(); await sleep(80); next(); await sleep(120);

  // Stage 1: context -> pick first option of each of the 3 questions
  d.querySelectorAll('.q-card').forEach(card => { const o=card.querySelector('.single-option'); if(o) o.click(); });
  await sleep(120);
  // re-render replaces nodes; ensure all answered (click again on fresh nodes if needed)
  for (let i=0;i<3;i++){ const un=[...d.querySelectorAll('.q-card')].find(c=>!c.querySelector('.single-option.selected')); if(!un) break; un.querySelector('.single-option').click(); await sleep(80); }
  next(); await sleep(150);

  // Stage 2: BL -> answer BL0..BL4 (first radio of each likert)
  async function answerLikerts(){
    for(let guard=0; guard<40; guard++){
      const un=[...d.querySelectorAll('.q-card')].find(c=>{ const f=c.querySelector('.likert'); if(!f) return false; return ![...c.querySelectorAll('.likert-options input')].some(i=>i.checked); });
      if(!un) return;
      const inputs = un.querySelectorAll('.likert-options input');
      const input = process.env.HIGH === '1' ? inputs[inputs.length-1] : inputs[0];
      input.click(); await sleep(60);
    }
  }
  await answerLikerts(); next(); await sleep(150);

  // Stages 3-6: four dimensions; each may include B7/C7 probes
  for (let s=0; s<4; s++){
    [...d.querySelectorAll('.q-number')].forEach(n => { if (/_item/.test(n.textContent)) dom.window.__sawRawId = true; });
    // B7 probe: options must be locked until the timer starts
    const b7 = d.getElementById('mt-b7');
    if (b7 && SKIP_PROBES){
      [...b7.querySelectorAll('button')].find(x=>/skip/i.test(x.textContent)).click(); await sleep(120);
    } else
    if (b7){
      const inputBefore = b7.querySelector('.mt-options input');
      if (!inputBefore.disabled) console.log('BUG: B7 selectable before timer');
      b7.querySelector('.mt-option').click(); await sleep(80);
      if (d.getElementById('btn-next') && !dom.window.document.querySelector('#mt-b7 .mt-option.selected')){
        // good: click was rejected; now start the timer and answer
        [...b7.querySelectorAll('button')].find(x=>/timer/i.test(x.textContent)).click(); await sleep(120);
        b7.querySelector('.mt-option').click(); await sleep(120);
      } else if (dom.window.document.querySelector('#mt-b7 .mt-option.selected')) {
        console.log('BUG: B7 answer accepted without timer');
      }
    }
    // C7 probe: start timer, type; the "I'm done" button appears on the next
    // stage re-render (triggered here by answering the Likert items after),
    // exactly as in the real user flow.
    const c7 = d.getElementById('mt-c7');
    if (c7 && SKIP_PROBES){
      [...c7.querySelectorAll('button')].find(x=>/skip/i.test(x.textContent)).click(); await sleep(120);
    } else if (c7){
      [...c7.querySelectorAll('button')].find(b=>/timer/i.test(b.textContent)).click(); await sleep(120);
      const ta = d.getElementById('mt-c7-textarea');
      ta.value = 'hold papers down\nbuild a tiny wall\ndoorstop\nheat and warm a bed\ngrind grain\nhammer a nail\ngarden border\nexercise weight\nsharpen knives\nart canvas';
      ta.dispatchEvent(new dom.window.Event('input',{bubbles:true})); await sleep(80);
    }
    await answerLikerts();      // re-renders the stage; done button now exists
    if (c7 && !SKIP_PROBES){
      const done=[...(d.getElementById('mt-c7')||c7).querySelectorAll('button')].find(b=>/done/i.test(b.textContent));
      if(done){ done.click(); await sleep(150); }
    }
    await answerLikerts();
    const btn = d.getElementById('btn-next');
    if (btn.disabled){ console.log('STUCK at stage', d.getElementById('stage-label').textContent); break; }
    next(); await sleep(150);
  }

  // Result stage
  const label = d.getElementById('stage-label').textContent;
  // no raw internal ids should ever have been shown
  if (dom.window.__sawRawId) console.log('BUG: raw _item id displayed');
  const out = {
    stage: label,
    bars: d.querySelectorAll('.dim-row').length,
    bands: [...d.querySelectorAll('.dim-band')].map(b=>b.textContent.replace(/\d+$/,'').trim()).slice(0,4),
    feedbacks: d.querySelectorAll('.dim-feedback').length,
    summary: (d.querySelector('.standing-message-summary') || {textContent:''}).textContent.slice(0,90),
    summaryEmRendered: (d.querySelector('.standing-message-summary')||{querySelectorAll:()=>[]}).querySelectorAll('em').length,
    summaryNoRawTags: !((d.querySelector('.standing-message-summary')||{textContent:''}).textContent.includes('<em>')),
    trajectory: !!d.querySelector('.trajectory-card'),
    naTags: [...d.querySelectorAll('.dim-tag')].map(t=>t.textContent).slice(0,3),
    token: ((d.querySelector('.return-token code')||{}).textContent||'').slice(0,25) + '...',
    actions: d.querySelectorAll('.result-actions .btn').length
  };
  // decode the token with scoring.js from the same window to prove round-trip
  const tok = (d.querySelector('.return-token code')||{}).textContent;
  out.tokenDecodes = !!dom.window.PAUSE_SCORING.decodeReturnToken(tok);
  console.log(JSON.stringify(out, null, 1));
  console.log('errors:', errors.length ? errors.slice(0,5) : 'none');
  dom.window.close(); server.close();
}
main().catch(e=>{ console.error('FATAL', e); process.exit(1); });
