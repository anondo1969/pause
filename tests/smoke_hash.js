/* Root of the PAUSE repository under test.
   Override with:  PAUSE_ROOT=/path/to/pause node <script>  */
const PAUSE_ROOT = process.env.PAUSE_ROOT || require('path').resolve(__dirname, '..');
const http=require('http'),fs=require('fs'),path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const ROOT=PAUSE_ROOT;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.md':'text/plain','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,decodeURIComponent(req.url.split('?')[0].split('#')[0]));
 fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);return res.end('nf');}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'text/plain'});res.end(d);});});
(async()=>{
 await new Promise(r=>server.listen(8933,r));
 const tok=Buffer.from(JSON.stringify({v:'v0.1-alpha',t:Math.floor(Date.now()/86400000),d:[41,62,18,80],tr:1.1})).toString('base64').replace(/=+$/,'');
 const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>{if(!/css/i.test(String(e)))errs.push(String(e.message||e));});
 const dom=await JSDOM.fromURL('http://127.0.0.1:8933/pages/compare.html#'+encodeURIComponent(tok),{
  resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.fetch=(u,o)=>globalThis.fetch(new URL(u,w.document.baseURI||w.location.href).href,o);
   w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};w.alert=()=>{};}});
 await new Promise(r=>setTimeout(r,1400));
 const d=dom.window.document;
 console.log(JSON.stringify({
  autofilled: d.getElementById('token-input').value.length>10,
  resultsShown: !d.getElementById('compare-results').hidden,
  snapshotHeading: (d.querySelector('.compare-analysis-h')||{}).textContent,
  snapshotCards: d.querySelectorAll('.compare-delta-card').length,
  chartHidden: d.getElementById('chart-card').hidden
 }));
 // Also verify the markdown renderer handled paper.md well
 console.log('errors:', errs.length?errs:'none');
 dom.window.close(); server.close();
})();
