/* Proof-Carrying Review — single-page board.
   Data: data.js (scorer output). Real Bob runs in ../evidence/runs/pr<NN>/ override a PR's findings.
   Live: PR titles, branches and diffs come from the GitHub API. */

const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const wait = ms => new Promise(r => setTimeout(r, ms));

const SLUG = (DATA.repo || 'github.com/chiragshah2357/IBM-Bob-Hackathon-TestCases').replace(/^https?:\/\//,'').replace('github.com/','');
const RUNS_BASE = '../evidence/runs/';
const BRANCH = {'01':'feat/search-tasks','02':'feat/overdue-tasks','03':'feat/priority-validation','04':'feat/completion-rate',
  '05':'feat/add-tag','06':'feat/delete-task','07':'feat/export-token-config','08':'feat/export-csv','09':'feat/task-summary',
  '10':'feat/pagination','11':'feat/bulk-complete-by-tag','12':'feat/relative-due-dates'};
const SIZE = {S:'Small',M:'Medium',L:'Large'};

const PRS = DATA.prs;
PRS.forEach(p => {
  p.source = 'demo';
  p.branch = BRANCH[p.pr];
  p.url = `https://github.com/${SLUG}/pull/${parseInt(p.pr,10)}`;
});

/* ---------- data loading ---------- */
async function loadRealRuns(){
  await Promise.all(PRS.map(async p => {
    try{
      const r = await fetch(`${RUNS_BASE}pr${p.pr}/findings.json`, {cache:'no-cache'});
      if(!r.ok) return;
      const list = await r.json();
      if(!Array.isArray(list)) return;
      p.source = 'bob';
      p.findings = list.filter(f => f.test_status === 'FAIL').map(f => ({
        id:f.id, category:f.category, severity:f.severity, claim:f.claim, file:f.file, line:f.line,
        test:f.test_file, fail:f.test_output, fix:f.fix_diff,
      }));
    }catch(e){}
  }));
}
async function loadLivePRs(){
  try{
    const r = await fetch(`https://api.github.com/repos/${SLUG}/pulls?state=open&per_page=100`, {headers:{Accept:'application/vnd.github+json'}});
    if(!r.ok) return;
    const byNum = {};
    (await r.json()).forEach(g => byNum[String(g.number).padStart(2,'0')] = g);
    PRS.forEach(p => {
      const g = byNum[p.pr]; if(!g) return;
      p.title = g.title.replace(/^TICKET-\d+:\s*/i,'');
      p.url = g.html_url;
      p.branch = (g.head && g.head.ref) || p.branch;
    });
  }catch(e){}
}
const textCache = {}, filesCache = {};
function getText(url){ return textCache[url] ??= fetch(url).then(r => r.ok ? r.text() : Promise.reject(r.status)); }
function prFiles(p){
  return filesCache[p.pr] ??= fetch(`https://api.github.com/repos/${SLUG}/pulls/${parseInt(p.pr,10)}/files?per_page=100`,
    {headers:{Accept:'application/vnd.github+json'}}).then(r => r.ok ? r.json() : Promise.reject(r.status));
}

/* ---------- code rendering ---------- */
function codeBox(title, inner){
  return `<div class="code"><div class="cbar"><i></i><i></i><i></i><span>${esc(title)}</span></div>${inner}</div>`;
}
function patchRows(patch){
  const rows = []; let o = 0, n = 0;
  patch.split('\n').forEach(l => {
    const h = l.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)/);
    if(h){ o = +h[1]; n = +h[2]; rows.push({t:'hunk', s:l}); return; }
    if(l.startsWith('+')) rows.push({t:'add', no:n++, s:l});
    else if(l.startsWith('-')) rows.push({t:'del', no:o++, s:l});
    else if(!l.startsWith('\\')){ rows.push({t:'', no:n++, s:l}); o++; }
  });
  return rows;
}
function patchHTML(patch, near){
  const rows = patchRows(patch);
  let best = 0, bd = 1e9;
  rows.forEach((r,i) => { if(r.t === 'add'){ const d = Math.abs(r.no - near); if(d < bd){ bd = d; best = i; } } });
  let hs = best; while(hs > 0 && rows[hs].t !== 'hunk') hs--;
  let he = best; while(he < rows.length-1 && rows[he+1].t !== 'hunk') he++;
  const from = Math.max(hs+1, best-7), to = Math.min(he+1, from+16);
  return `<pre>${rows.slice(from,to).map(r =>
    `<span class="ln ${r.t}"><b>${r.t==='del'?'':r.no}</b>${esc(r.s)||' '}</span>`).join('')}</pre>`;
}
function srcHTML(src, from, hit){
  return `<pre>${src.split('\n').map((l,i) =>
    `<span class="ln${from+i===hit?' hit':''}"><b>${from+i}</b>${esc(l)||' '}</span>`).join('')}</pre>`;
}
function diffHTML(d){
  return String(d||'').split('\n').map(l => {
    const c = /^\+(?!\+\+)/.test(l) ? 'add' : /^-(?!--)/.test(l) ? 'del' : '';
    return `<span class="ln ${c}">${esc(l)||' '}</span>`; }).join('');
}

/* ---------- the proof theatre ---------- */
let cur = {pr:0, f:0}, playToken = 0;

function renderBar(){
  $('#prbar').innerHTML = PRS.map((p,i) =>
    `<button class="prchip${p.clean?' clean':''}${i===cur.pr?' on':''}" role="tab" aria-selected="${i===cur.pr}" onclick="selectPR(${i},true)">
      <span class="d"></span>#${p.pr}</button>`).join('');
}
function selectPR(i, play){
  cur = {pr:i, f:0};
  renderBar();
  const bar = $('#prbar'), chip = bar.children[i];
  if(chip) bar.scrollTo({left: chip.offsetLeft - bar.clientWidth/2 + chip.offsetWidth/2, behavior:'smooth'});
  const p = PRS[i];
  const tags = p.clean ? '<span class="tag clean">clean</span>' : p.categories.map(c => `<span class="tag ${c}">${c}</span>`).join('');
  const src = p.source === 'bob' ? '<span class="src real">real Bob run</span>' : '<span class="src demo">sample data</span>';
  let body;
  if(p.clean){
    body = `<div class="stagebody" style="grid-template-columns:1fr"><div class="cleanbox"><div class="e">🧹</div>
      <b>Clean PR — Bob said nothing.</b><p>No bugs were planted here, so the right answer is zero comments. That’s what it gave.</p></div></div>`;
  }else if(!p.findings.length){
    body = `<div class="stagebody" style="grid-template-columns:1fr"><div class="cleanbox"><div class="e">🤷</div><b>No proven findings.</b></div></div>`;
  }else{
    body = `<div class="stagebody">
      <div><div class="panel-t">🔍 The code</div><div id="codeSlot"></div></div>
      <div>
        <div class="panel-t">🧪 The proof</div>
        <div class="fnav">${p.findings.map((f,fi) =>
          `<button class="fbtn${fi===0?' on':''}" onclick="selectFinding(${fi},true)"><span class="sev ${esc(f.severity)}">${esc(f.severity)}</span>${esc(f.id)}</button>`).join('')}</div>
        <div id="proofSlot"></div>
      </div>
    </div>`;
  }
  $('#stage').innerHTML = `
    <div class="prhead">
      <div><div class="num">PR #${p.pr} · ${SIZE[p.size]||''} change</div><h3>${esc(p.title)}</h3><p class="desc">${esc(p.desc)}</p>
        <div class="tags">${tags}</div></div>
      <div class="right">${src}<a class="btn small ghost" href="${esc(p.url)}/files" target="_blank" rel="noopener">View on GitHub ↗</a></div>
    </div>${body}`;
  if(!p.clean && p.findings.length) selectFinding(0, play);
}
function selectFinding(fi, play){
  cur.f = fi;
  const p = PRS[cur.pr], f = p.findings[fi], real = p.source === 'bob';
  document.querySelectorAll('.fbtn').forEach((b,j) => b.classList.toggle('on', j===fi));
  const fileUrl = real ? `https://github.com/${SLUG}/blob/${p.branch}/${f.file}#L${f.line}` : `${p.url}/files`;
  const hasFix = real ? !!f.fix : true;
  $('#proofSlot').innerHTML = `
    <div class="claim">${esc(f.claim)}</div>
    <div class="loc"><span class="tag ${esc(f.category)}">${esc(f.category)}</span> <a href="${esc(fileUrl)}" target="_blank" rel="noopener">${esc(f.file)}${real?':'+esc(f.line):''}</a></div>
    <div class="proofs">
      <div class="pf"><div class="e">🕵️</div><div><div class="t">Bob suspects a bug</div><div class="s">${esc(f.claim)}</div></div></div>
      <div class="pf"><div class="e">✍️</div><div><div class="t">Writes a test for it</div><div class="s mini">${esc(f.test)}</div><div id="testCode"></div></div></div>
      <div class="pf fail"><div class="e">▶</div><div><div class="t">Runs it on the PR</div><span class="stamp red">FAILED ✗</span>
        <div class="s">So the bug is real — it gets reported.</div>${real && f.fail ? `<pre>${esc(f.fail)}</pre>` : ''}</div></div>
      ${hasFix ? `<div class="pf pass"><div class="e">🔧</div><div><div class="t">Fixes it &amp; re-runs</div><span class="stamp green">PASSED ✓</span>
        ${real ? `<div class="code" style="margin-top:8px"><pre>${diffHTML(f.fix)}</pre></div>` : '<div class="s">The same test now goes green.</div>'}</div></div>`
      : `<div class="pf"><div class="e">🙋</div><div><div class="t">Left for a human</div><div class="s">Not a mechanical fix, so Bob flags it without patching.</div></div></div>`}
    </div>
    <div class="playrow">
      <button class="btn small" onclick="playProof()">▶ Replay</button>
      ${fi < p.findings.length-1 ? `<button class="btn small ghost" onclick="selectFinding(${fi+1},true)">Next finding →</button>` : ''}
      ${real ? '' : '<span class="demo-note">Sample data — this PR hasn’t had a real Bob run yet.</span>'}
    </div>`;
  loadCode(p, f);
  if(real) getText(`${RUNS_BASE}pr${p.pr}/${f.test}`).then(src => {
    const el = $('#testCode'); if(el && cur.f === fi) el.innerHTML = `<pre>${esc(src.trim())}</pre>`;
  }).catch(() => {});
  if(play) playProof(); else document.querySelectorAll('.pf').forEach(x => x.classList.add('go'));
}
function loadCode(p, f){
  const slot = $('#codeSlot'), key = p.pr + f.id;
  slot.dataset.key = key;
  slot.innerHTML = codeBox(f.file, '<div class="msg">Loading the code from GitHub…</div>');
  const put = html => { if(slot.dataset.key === key) slot.innerHTML = html; };
  if(p.source === 'bob'){
    getText(`https://raw.githubusercontent.com/${SLUG}/${p.branch}/${f.file}`).then(src => {
      const all = src.split('\n'), line = +f.line || 1, from = Math.max(1, line-6), to = Math.min(all.length, line+6);
      put(codeBox(`${f.file} · line ${line}`, srcHTML(all.slice(from-1,to).join('\n'), from, line)));
    }).catch(() => put(codeBox(f.file, '<div class="msg">Couldn’t load this file from GitHub.</div>')));
  }else{
    prFiles(p).then(files => {
      const e = files.find(x => x.filename === f.file);
      put(e && e.patch ? codeBox(`${f.file} · what this PR changed`, patchHTML(e.patch, +f.line || 1))
        : codeBox(f.file, `<div class="msg">This file isn’t touched by the PR — the problem is what’s <b>missing</b> from it.</div>`));
    }).catch(() => put(codeBox(f.file, `<div class="msg">GitHub is rate-limiting us right now. <a href="${esc(p.url)}/files" target="_blank" rel="noopener">See the diff on GitHub ↗</a></div>`)));
  }
}
async function playProof(){
  const token = ++playToken;
  const steps = [...document.querySelectorAll('.pf')];
  steps.forEach(s => s.classList.remove('go'));
  for(const s of steps){
    await wait(s === steps[0] ? 150 : 650);
    if(token !== playToken) return;
    s.classList.add('go');
  }
}
function playFeatured(){
  const i = Math.max(0, PRS.findIndex(p => p.source === 'bob') >= 0 ? PRS.findIndex(p => p.source === 'bob') : PRS.findIndex(p => p.pr === '02'));
  setTimeout(() => selectPR(i, true), 450);
}

/* ---------- scores ---------- */
const WHO = {ours:['Proof-Carrying','our Bob mode'], naive:['Single-pass LLM','no spec, no tests']};
const EXPL = {
  recall:'Share of the hidden bugs each reviewer found.',
  precision:'Share of each reviewer’s comments that were about real bugs.',
  trust:'Share of comments backed by a test that actually fails.',
};
function paintPodium(m){
  document.querySelectorAll('#seg button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  $('#segExpl').textContent = EXPL[m];
  const L = DATA.leaderboard;
  const order = Object.keys(WHO).sort((a,b) => L[b][m] - L[a][m]);
  const slots = [order[1], order[0], order[2]];          // silver · gold · bronze
  const medal = {[order[0]]:'🥇',[order[1]]:'🥈',[order[2]]:'🥉'};
  const place = {[order[0]]:'p1',[order[1]]:'p2',[order[2]]:'p3'};
  $('#podium').innerHTML = slots.map(k => `<div class="pod ${place[k]}"><div class="medal">${medal[k]}</div>
    <div class="who">${WHO[k][0]}<small>${WHO[k][1]}</small></div>
    <div class="col" data-h="${Math.max(52, L[k][m] / 100 * 210)}"><b>${L[k][m]}%</b></div></div>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() =>
    document.querySelectorAll('.pod .col').forEach(c => c.style.height = c.dataset.h + 'px')));
}
function paintSide(){
  const L = DATA.leaderboard;
  $('#alarms').innerHTML = Object.keys(WHO).map(k => {
    const n = L[k].false_alarms;
    return `<div class="arow"><div class="nm">${WHO[k][0]}</div><div class="sirens">${
      n ? '🚨'.repeat(Math.min(n,14)) + (n>14?' +'+(n-14):'') + ` <span class="mono" style="font-size:13px;font-weight:700">${n}</span>` : '<span class="zero">none 🎉</span>'}</div></div>`;
  }).join('');
  $('#sizes').innerHTML = DATA.sizeBuckets.map(s => `<div class="srow"><div class="lb">${s.size}<small>${s.lines}</small></div>
    <div class="sbars">${['ours','naive'].map(k => `<div class="sbar ${k}"><i data-w="${s[k]}"></i><span>${s[k]}%</span></div>`).join('')}</div></div>`).join('');
}
function growSizes(){ document.querySelectorAll('.sbar i').forEach(i => i.style.width = i.dataset.w + '%'); }

/* ---------- grid, banners, marquee ---------- */
function renderGrid(){
  $('#prgrid').innerHTML = PRS.map((p,i) => {
    const tags = p.clean ? '<span class="tag clean">clean</span>' : p.categories.map(c => `<span class="tag ${c}">${c}</span>`).join('');
    const pips = p.clean ? '<span>🧹 no bugs to find</span>'
      : `<span class="pips">${Array.from({length:p.planted}, (_,j) => `<i class="${j < p.found ? 'on' : ''}"></i>`).join('')}</span><span>${p.found}/${p.planted} caught</span>`;
    return `<button class="card prcard reveal" onclick="selectPR(${i},true);document.getElementById('watch').scrollIntoView({behavior:'smooth'})">
      <div class="top"><span class="num">#${p.pr}</span><span class="src ${p.source==='bob'?'real':'demo'}">${p.source==='bob'?'Bob run':'sample'}</span><span class="sz">${p.size}</span></div>
      <h4>${esc(p.title)}</h4><div class="tags">${tags}</div><div class="caught">${pips}</div></button>`;
  }).join('');
}
function renderTruth(){
  const n = PRS.length, real = PRS.filter(p => p.source === 'bob').length;
  $('#truth').classList.toggle('live', real > 0);
  $('#truthText').innerHTML = real === 0
    ? '<b>Heads up: sample data.</b> The PRs and code are live from GitHub, but the findings and scores are placeholders until real Bob runs are added.'
    : real === n ? `<b>All ${n} PRs were reviewed by real IBM Bob runs.</b> Every test and output here is Bob’s own.`
    : `<b>${real} of ${n} PRs reviewed by a real IBM Bob run</b> (tagged “real Bob run”). The rest show sample data for now.`;
  $('#scoreSrc').textContent = real === n ? '' : '(Sample runs for now.)';
  const total = PRS.reduce((s,p) => s + p.findings.length, 0);
  $('#heroFound').textContent = `🐞 ${total} findings across ${n} PRs`;
}
function renderMarquee(){
  const items = [['fail','✗ test_due_today_not_overdue'],['pass','✓ fixed service.py:60'],['fail','✗ test_rejects_sql_injection'],
    ['pass','✓ ORDER BY id'],['fail','✗ test_page_one_starts_at_1'],['pass','✓ raise RuntimeError'],['fail','✗ test_snake_case_name'],
    ['pass','✓ logger.info()'],['fail','✗ test_missing_token_raises'],['pass','✓ 0 comments on clean PRs']];
  const html = items.map(([c,t]) => `<span class="${c}">${esc(t)}</span><span class="dot">●</span>`).join('');
  $('#marq').innerHTML = html + html;
}

/* ---------- boot ---------- */
function observe(){
  const io = new IntersectionObserver(es => es.forEach(e => {
    if(!e.isIntersecting) return;
    e.target.classList.add('in');
    if(e.target.classList.contains('podiumcard')) paintPodium(document.querySelector('#seg .on').dataset.m);
    if(e.target.classList.contains('sizes')) growSizes();
    io.unobserve(e.target);
  }), {threshold:.15});
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  let played = false;
  new IntersectionObserver((es, o) => es.forEach(e => {
    if(e.isIntersecting && !played){ played = true; playProof(); o.disconnect(); }
  }), {threshold:.4}).observe($('.theatre'));
}
document.querySelectorAll('#seg button').forEach(b => b.onclick = () => paintPodium(b.dataset.m));

(async function boot(){
  renderMarquee();
  await Promise.all([loadRealRuns(), loadLivePRs()]);
  renderTruth();
  const first = PRS.findIndex(p => p.source === 'bob');
  selectPR(first >= 0 ? first : Math.max(0, PRS.findIndex(p => p.pr === '02')), false);
  document.querySelectorAll('.pf').forEach(x => x.classList.remove('go'));
  paintSide();
  renderGrid();
  observe();
})();
