/* Root of the PAUSE repository under test.
   Override with:  PAUSE_ROOT=/path/to/pause node <script>  */
const PAUSE_ROOT = process.env.PAUSE_ROOT || require('path').resolve(__dirname, '..');
/* Test harness: load scoring.js + markdown.js in a stub window and probe edge cases. */
global.window = {};
global.btoa = s => Buffer.from(s, 'binary').toString('base64');
global.atob = s => Buffer.from(s, 'base64').toString('binary');
require(PAUSE_ROOT + '/js/scoring.js');
require(PAUSE_ROOT + '/js/markdown.js');
const S = window.PAUSE_SCORING;
const MD = window.PAUSE_MD;
const fs = require('fs');
const R = [];
const log = (k, v) => { R.push([k, v]); console.log(k, '=>', JSON.stringify(v)); };

// ---- 1. Paper worked example (Appendix C): D1 items sum 20/7 -> 71
const items = [4,3,2,3,3,3].map(v => ({type:'likert', raw:v, reverse:false})).concat([{type:'b7', b7Score:2}]);
log('workedExample_D1', S.scoreDimension(items).score);

// ---- 2. C7 rubric gap: fluency>=8 with flexibility 3-4
log('c7_f9_flex4_band', (() => {  // simulate: scoreC7 needs dict; call band logic via scoreC7 with synthetic dict
  const dict = {dictionaries: {obj: {a:['aaa'], b:['bbb'], c:['ccc'], d:['ddd']}}};
  const text = ['aaa1','aaa2','bbb1','bbb2','ccc1','ccc2','ddd1','ddd2','ddd3'].join('\n');
  return S.scoreC7(text, 'obj', dict); })());
log('c7_f3_flex1_band', (() => {
  const dict = {dictionaries: {obj: {a:['aaa']}}};
  return S.scoreC7('aaa1\naaa2\naaa3', 'obj', dict).score; })());

// ---- 3. Paper's brick worked example with the real dictionary
const c7d = JSON.parse(fs.readFileSync(PAUSE_ROOT + '/data/instrument/c7_dictionaries.json'));
log('c7_objects', c7d.objects);
const brickKey = c7d.objects.find(o => /brick/.test(o));
const brickResp = 'build a wall\nuse as a doorstop\nsharpen a knife on it\nhold down papers\nas a step';
log('paper_brick_example', S.scoreC7(brickResp, brickKey, c7d));

// ---- 4. C7 gaming: 8 lines each stuffed with keywords from many categories
const dict = c7d.dictionaries[brickKey];
const kws = Object.values(dict).slice(0,6).map(a => a[0]);
const spam = Array.from({length:8}, (_,i) => kws.join(' ') + ' x' + i).join('\n');
log('c7_keyword_stuffing', S.scoreC7(spam, brickKey, c7d).score);

// ---- 5. Token fuzzing
const mk = o => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'');
const fuzz = {
  garbage: S.decodeReturnToken('!!!not-base64!!!'),
  empty: S.decodeReturnToken(''),
  d_out_of_range: S.decodeReturnToken(mk({v:1,t:1,d:[0,0,0,101]})),
  d_string: S.decodeReturnToken(mk({v:1,t:1,d:[0,'x',0,0]})),
  t_missing: S.decodeReturnToken(mk({v:1,d:[1,2,3,4]})),
  t_string: S.decodeReturnToken(mk({v:1,t:'evil',d:[1,2,3,4]})),
  t_negative: S.decodeReturnToken(mk({v:1,t:-99999,d:[1,2,3,4]})),
  html_in_v: S.decodeReturnToken(mk({v:'<img src=x onerror=alert(1)>',t:1,d:[1,2,3,4]})),
  extra_fields: S.decodeReturnToken(mk({v:1,t:1,d:[1,2,3,4],evil:'payload'})),
};
for (const [k,v] of Object.entries(fuzz)) log('token_'+k, v);
// what compare.js would show for t='evil' / missing t:
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dayToDate = d => { const dt=new Date(d*86400000); return MONTHS[dt.getUTCMonth()]+' '+dt.getUTCDate()+', '+dt.getUTCFullYear(); };
log('date_from_string_t', dayToDate('evil'));
log('date_from_missing_t', dayToDate(undefined));

// ---- 6. Round-trip + day-epoch privacy granularity
const tok = S.makeReturnToken({D1:41,D2:62,D3:18,D4:80,trajectory:1.1,lastB7FallacyType:'cb',lastC7Category:'wrn'});
log('roundtrip', S.decodeReturnToken(tok));

// ---- 7. B7 picker: avoidance guarantee + degenerate pools
const pool = JSON.parse(fs.readFileSync(PAUSE_ROOT + '/data/instrument/b7_pool.json')).pool;
const types = [...new Set(pool.map(p=>p.fallacy_type))];
log('b7_pool_size_types', {items: pool.length, types: types.length});
let violations = 0;
for (let i=0;i<2000;i++){ const avoid = types[i%types.length]; const p = S.pickB7Item(pool, avoid); if (p.fallacy_type===avoid) violations++; }
log('b7_avoidance_violations_in_2000', violations);
log('b7_single_type_pool', S.pickB7Item([{fallacy_type:'ss',correct:'a'}], 'ss') !== null);

// ---- 8. scoreB7 null vs timeout inconsistency (documented behavior check)
log('scoreB7_null', S.scoreB7(null, pool[0]));
log('scoreB7_d', S.scoreB7('d', pool[0]));

// ---- 9. scoreDimension boundary: exactly 3 valid of 7
const three = [{type:'likert',raw:4,reverse:false},{type:'likert',raw:4,reverse:false},{type:'likert',raw:4,reverse:false},
  {type:'likert',raw:null},{type:'likert',raw:null},{type:'likert',raw:null},{type:'likert',raw:null}];
log('dim_3_of_7_valid', S.scoreDimension(three));

// ---- 10. Markdown renderer: XSS probes
log('md_script', MD.render('<script>alert(1)</script>'));
log('md_img_onerror', MD.render('<img src=x onerror=alert(1)>'));
log('md_js_link', MD.render('[click](javascript:alert(1))'));
log('md_nul_collision', MD.render('text with \u0000 char and `code`'));

expect('Markdown: javascript: image src is not rendered', !/<img/.test(MD.render('![x](javascript:alert(1))')));
expect('Markdown: autolinks accept only http(s)/mailto', !/href/.test(MD.render('<ftp://evil.example>')));

// ---- 11. WCAG contrast of key pairs
function lum(hex){const c=hex.match(/\w\w/g).map(h=>parseInt(h,16)/255).map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4));return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];}
const ratio=(a,b)=>{const[l1,l2]=[lum(a),lum(b)].sort((x,y)=>y-x);return ((l1+0.05)/(l2+0.05)).toFixed(2);}
const css = fs.readFileSync(PAUSE_ROOT + '/css/style.css', 'utf8');
const cssVar = name => (css.match(new RegExp('--' + name + ':\\s*#([0-9a-fA-F]{6})')) || [])[1];
const inkFaint = cssVar('ink-faint');
log('contrast_ink_on_paper', ratio('2a2a28','e8e4d4'));
log('contrast_inkfaint_on_paper', ratio(inkFaint,'e8e4d4'));
log('contrast_inksoft_on_paper', ratio('5a5a55','e8e4d4'));
log('contrast_white_on_ink', ratio('ffffff','2a2a28'));

// ============================================================
// Assertions: the paper's checkable claims, as pass/fail
// ============================================================
let failures = 0;
function expect(name, cond) {
  console.log((cond ? 'PASS ' : 'FAIL ') + name);
  if (!cond) failures++;
}
const get = k => (R.find(r => r[0] === k) || [])[1];

expect('Appendix C worked example: D1 scores 71', get('workedExample_D1') === 71);
expect('Appendix C brick example: band 1, categories {building, weight, tool}',
  get('paper_brick_example').score === 1 &&
  JSON.stringify(get('paper_brick_example').categories.sort()) === JSON.stringify(['building','tool','weight']));
expect('Appendix B rubric: fluency 9 / flexibility 4 is band 1 (monotonic)', get('c7_f9_flex4_band').score === 1);
expect('Appendix B rubric: fluency>=5 with flexibility<3 is band 4 (near-duplicates)',
  (() => { const d = {dictionaries:{o:{a:['zz']}}}; return S.scoreC7('zz1\nzz2\nzz3\nzz4\nzz5','o',d).score === 4; })());
expect('Token: rejects malformed day field (t missing/string/negative)',
  get('token_t_missing') === null && get('token_t_string') === null && get('token_t_negative') === null);
expect('Token: rejects out-of-range and non-numeric scores',
  get('token_d_out_of_range') === null && get('token_d_string') === null);
expect('Token: round-trips its own output', get('roundtrip') && get('roundtrip').D4 === 80);
expect('Section 3.5: B7 rotation never repeats the avoided type (2000 draws)', get('b7_avoidance_violations_in_2000') === 0);
expect('Section 3.3: fewer than 3 answered items suppresses the reading',
  S.scoreDimension([{type:'likert',raw:4,reverse:false},{type:'likert',raw:null},{type:'likert',raw:null}]).limited_basis === true);
expect('scoreB7: non-response is null, not the worst option', get('scoreB7_null') === null && get('scoreB7_d') === 4);
expect('Markdown: raw HTML is escaped', /&lt;script&gt;/.test(get('md_script')));
expect('Markdown: javascript: links are not rendered as links', !/href/.test(get('md_js_link')));
expect('Section 4.3: ink-faint on paper meets WCAG AA (>= 4.5)', parseFloat(get('contrast_inkfaint_on_paper')) >= 4.5);
expect('Section 4.1: no third-party requests in the stylesheet', !/googleapis|gstatic/.test(css));

console.log('\n' + (failures === 0 ? 'ALL ASSERTIONS PASSED' : failures + ' ASSERTION(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);
