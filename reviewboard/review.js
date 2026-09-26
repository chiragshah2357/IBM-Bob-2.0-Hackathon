/* Review page: scan the repo -> list open PRs in order -> run the review -> results.
   Findings/scores come from data.js (scorer output) for the benchmark repo. PRs listed in REAL_RUNS
   hold genuine IBM Bob output (scorer/runs/ours/pr<NN>.json); the rest are sample fixtures.
   PR list and diffs are live from the GitHub API. */

const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const wait = ms => new Promise(r => setTimeout(r, ms));
const gh = url => fetch('https://api.github.com/' + url, {headers:{Accept:'application/vnd.github+json'}});

const BENCH = (DATA.repo || '').replace(/^https?:\/\//,'').replace('github.com/','').replace(/\/+$/,'');
const SLUG = (new URLSearchParams(location.search).get('repo') || BENCH).replace(/^https?:\/\//,'').replace('github.com/','').replace(/\/+$/,'');
const IS_BENCH = SLUG.toLowerCase() === BENCH.toLowerCase();
// PRs whose scorer/runs/ours/pr<NN>.json came from a real Spec Reviewer session in IBM Bob.
// Add a PR number here when its real run is committed.
const REAL_RUNS = new Set(['02','05','09']);
const RUNS_BASE = '../scorer/runs/ours/';
const SIZE = {S:'Small',M:'Medium',L:'Large'};
const pad = n => String(n).padStart(2,'0');

let PRS = [];          // [{n, pr, title, desc, author, branch, url, data}]  data = DATA.prs entry (benchmark only)
let reviewed = false;

$('#repoName').textContent = SLUG;
document.title = SLUG.split('/')[1] + ' · Proof-Carrying Review';

/* ---------- 1 · scan ---------- */
async function scan(){
  const log = $('#scanlog'), bar = $('#scanbar');
  const steps = [
    `Connecting to github.com/${SLUG}`,
    'Cloning the repository',
    'Looking for open pull requests',
    'Reading each PR’s title, ticket & description',
  ];
  log.innerHTML = steps.map(s => `<div><span class="spinner"></span><span>${esc(s)}</span></div>`).join('');
  const rows = [...log.children];

  const fetchP = (async () => {
    const r = await gh(`repos/${SLUG}/pulls?state=open&per_page=100&sort=created&direction=asc`);
    if(r.status === 404) throw new Error('notfound');
    if(!r.ok) throw new Error('api');
    return r.json();
  })();

  let live, error;
  for(let i = 0; i < rows.length; i++){
    rows[i].classList.add('in');
    await wait(i === 2 ? 1300 : 950);           // ~4.1s total: Bob "goes through" the repo
    if(i === 2){
      try{ live = await fetchP; }catch(e){ error = e.message; }
      if(error){ rows[i].querySelector('.spinner').outerHTML = '<span class="ok" style="color:var(--red)">✗</span>'; break; }
      rows[i].lastChild.textContent = `Found ${live.length} open pull request${live.length===1?'':'s'}`;
    }
    rows[i].querySelector('.spinner').outerHTML = '<span class="ok">✓</span>';
    bar.style.width = ((i+1) / rows.length * 100) + '%';
  }

  if(error === 'api' && IS_BENCH){
    useSnapshot();                    // GitHub rate-limited: carry on from the saved snapshot
  }else if(error || !live.length){
    $('#scanTitle').textContent = error === 'notfound' ? 'Bob couldn’t find that repo.'
      : error ? 'GitHub isn’t answering right now.' : 'No open pull requests here.';
    log.insertAdjacentHTML('beforeend', `<div class="in" style="font-family:inherit;margin-top:6px">
      <a class="btn small" href="index.html">← Try another repo</a></div>`);
    return;
  }else{
    PRS = live.map(g => ({
      n:g.number, pr:pad(g.number), title:g.title.replace(/^TICKET-\d+:\s*/i,''),
      desc:((g.body||'').split('\n').map(s => s.trim()).find(s => s && !s.startsWith('#')) || '').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[*_`]/g,'').slice(0,140),
      author:g.user && g.user.login, branch:g.head && g.head.ref, url:g.html_url,
    })).sort((a,b) => a.n - b.n);
    if(IS_BENCH) PRS.forEach(p => p.data = DATA.prs.find(d => d.pr === p.pr));
  }
  await wait(400);
  $('#scan').classList.add('hidden');
  listPRs();
}
function useSnapshot(){            // GitHub API unreachable: fall back to the scorer snapshot
  PRS = DATA.prs.map(d => ({n:+d.pr, pr:d.pr, title:d.title, desc:d.desc, author:null, branch:null,
    url:`https://github.com/${SLUG}/pull/${+d.pr}`, data:d}));
}
DATA.prs.forEach(d => d.source = REAL_RUNS.has(d.pr) ? 'bob' : 'demo');

/* ---------- 2 · list PRs in order ---------- */
function prRow(p, i){
  return `<div class="pr" id="pr${i}">
    <button class="head" onclick="togglePR(${i})" tabindex="-1">
      <span class="num">#${p.n}</span>
      <div class="meta"><div class="title">${esc(p.title)}</div>
        <div class="sub">${p.author?`<span>by @${esc(p.author)}</span>`:''}${p.branch?`<span class="br">${esc(p.branch)}</span>`:''}${p.desc?`<span>${esc(p.desc)}</span>`:''}</div></div>
      <div class="res" id="res${i}"><span class="status">waiting for review</span></div>
    </button>
    <div class="body" id="body${i}"></div>
  </div>`;
}
async function listPRs(){
  $('#prSection').classList.remove('hidden');
  $('#prHeading').textContent = `${PRS.length} open pull request${PRS.length===1?'':'s'}.`;
  $('#prSub').textContent = `Bob read each one’s title and description, oldest first.`;
  $('#prlist').innerHTML = PRS.map(prRow).join('');
  const rows = [...document.querySelectorAll('.pr')];
  for(const r of rows){ await wait(170); r.classList.add('in'); }
  await wait(250);
  $('#runcta').classList.remove('hidden');
  $('#runcta').classList.add('rise');
  $('#runBtn').focus({preventScroll:true});
}

/* ---------- 3 · run the review ---------- */
$('#runBtn').onclick = async () => {
  $('#runBtn').disabled = true;
  $('#runcta').classList.add('hidden');
  $('#runprog').classList.add('show');
  const labels = ['Reading ticket, SPEC.md & STYLE_GUIDE.md','Four subagents hunting: spec · bugs · tests · style',
    'Writing a test for every suspicion','Running the tests — keeping only the ones that fail'];
  const rows = [...document.querySelectorAll('.pr')];
  for(let i = 0; i < rows.length; i++){
    const p = PRS[i];
    $('#runLabel').textContent = `#${p.n} · ${labels[i % labels.length]}`;
    rows[i].classList.add('reviewing');
    rows[i].scrollIntoView({block:'nearest', behavior:'smooth'});
    $(`#res${i}`).innerHTML = '<span class="status"><span class="spinner"></span>Bob is reviewing…</span>';
    await wait(380);
    rows[i].classList.remove('reviewing');
    rows[i].classList.add('done');
    rows[i].querySelector('.head').removeAttribute('tabindex');
    $(`#res${i}`).innerHTML = resultHTML(p);
    const pct = Math.round((i+1) / rows.length * 100);
    $('#runPct').textContent = pct + '%';
    $('#runbar').style.width = pct + '%';
  }
  $('#runLabel').textContent = 'Review complete';
  reviewed = true;
  await wait(500);
  $('#runprog').classList.remove('show');
  showResults();
};
function resultHTML(p){
  const d = p.data;
  if(!d) return '<span class="src demo">no Bob run yet</span><span class="chev">▶</span>';
  const src = `<span class="src ${d.source==='bob'?'real':'demo'}">${d.source==='bob'?'real Bob run':'sample'}</span>`;
  if(d.clean) return `${src}<span class="tag clean">clean ✓</span><span class="chev">▶</span>`;
  const tags = d.categories.map(c => `<span class="tag ${c}">${c}</span>`).join('');
  const pips = `<span class="pips" title="${d.found} of ${d.planted} planted bugs caught">${Array.from({length:d.planted}, (_,j) => `<i class="${j < d.found ? 'on' : ''}"></i>`).join('')}</span>`;
  return `${src}${tags}${pips}<span class="found">${d.findings.length} proven</span><span class="chev">▶</span>`;
}

/* ---------- 4 · results ---------- */
function showResults(){
  $('#results').classList.remove('hidden');
  $('#results').classList.add('rise');
  $('#prKicker').textContent = 'Reviewed';
  $('#prSub').textContent = 'Tap a pull request to see what Bob found — and the test that proves it.';
  const withData = PRS.filter(p => p.data);
  const total = withData.reduce((s,p) => s + p.data.findings.length, 0);
  const real = withData.filter(p => p.data.source === 'bob').length;
  if(!IS_BENCH || !withData.length){
    $('#tiles').innerHTML = '';
    $('#scoreSection').classList.add('hidden');
    $('#truthText').innerHTML = `<b>No Bob runs for this repo yet.</b> Bob’s reviews are published for the benchmark repo so far — run the Spec Reviewer mode in IBM Bob on this repo to add them.`;
    return;
  }
  const L = DATA.leaderboard.ours, clean = withData.filter(p => p.data.clean).length;
  $('#tiles').innerHTML = [
    [total,'findings','each backed by a failing test'],
    [withData.length,'PRs reviewed',`${clean} clean, ${withData.length-clean} with planted bugs`],
    [L.recall+'%','bugs caught','of the planted issues'],
    [L.false_alarms,'false alarm'+(L.false_alarms===1?'':'s'),'comments on non-bugs'],
  ].map(([v,k,d]) => `<div class="card tile"><div class="v">${v}</div><div class="k">${k}</div><div class="d">${d}</div></div>`).join('');
  $('#truth').classList.toggle('live', real > 0);
  $('#truthText').innerHTML = real === 0
    ? '<b>Heads up: sample data.</b> The PRs and code are live from GitHub; findings and scores are placeholders until real Bob runs are added.'
    : real === withData.length ? `<b>Every PR here was reviewed by a real IBM Bob run.</b> Tests and outputs are Bob’s own.`
    : `<b>${real} of ${withData.length} PRs reviewed by a real IBM Bob run</b> (tagged “real Bob run”). The rest show sample data for now.`;
  $('#scoreSrc').textContent = real === withData.length ? '' : '(Sample runs for now.)';
  paintPodium('recall'); paintSide();
  const first = PRS.findIndex(p => p.data && p.data.source === 'bob');
  const pick = first >= 0 ? first : PRS.findIndex(p => p.data && !p.data.clean && p.data.findings.length);
  if(pick >= 0){ togglePR(pick); setTimeout(() => document.getElementById('pr'+pick).scrollIntoView({block:'start', behavior:'smooth'}), 100); }
}

/* ---------- proof stage inside an opened PR ---------- */
let open = -1, cur = {pr:-1, f:0}, playToken = 0;
function togglePR(i){
  if(!reviewed) return;
  if(open >= 0 && open !== i){ $('#pr'+open).classList.remove('open'); $('#body'+open).innerHTML = ''; }
  const el = $('#pr'+i);
  if(open === i){ el.classList.remove('open'); $('#body'+i).innerHTML = ''; open = -1; return; }
  open = i; el.classList.add('open');
  const p = PRS[i], d = p.data, body = $('#body'+i);
  const links = `<div class="stagelinks"><a class="btn small ghost" href="${esc(p.url)}/files" target="_blank" rel="noopener">View the diff on GitHub ↗</a>
    ${d && d.source==='bob' ? `<a class="btn small ghost" href="${RUNS_BASE}pr${d.pr}.json" target="_blank" rel="noopener">Bob’s findings.json ↗</a>` : ''}</div>`;
  if(!d){ body.innerHTML = links + `<div class="stagebody" style="grid-template-columns:1fr"><div class="cleanbox"><div class="e">⏳</div><b>Not reviewed by Bob yet.</b><p>Run the Spec Reviewer mode in IBM Bob on this PR to see its findings here.</p></div></div>`; return; }
  if(d.clean){ body.innerHTML = links + `<div class="stagebody" style="grid-template-columns:1fr"><div class="cleanbox"><div class="e">🧹</div><b>Clean PR — Bob said nothing.</b><p>No bugs were planted here, so the right answer is zero comments.</p></div></div>`; return; }
  if(!d.findings.length){ body.innerHTML = links + `<div class="stagebody" style="grid-template-columns:1fr"><div class="cleanbox"><div class="e">🤷</div><b>No proven findings.</b></div></div>`; return; }
  body.innerHTML = links + `<div class="stagebody">
    <div><div class="panel-t">🔍 The code</div><div id="codeSlot"></div></div>
    <div><div class="panel-t">🧪 The proof</div>
      <div class="fnav">${d.findings.map((f,fi) => `<button class="fbtn${fi===0?' on':''}" onclick="selectFinding(${fi})"><span class="sev ${esc(f.severity)}">${esc(f.severity)}</span>${esc(f.id)}</button>`).join('')}</div>
      <div id="proofSlot"></div></div></div>`;
  cur = {pr:i, f:0};
  selectFinding(0);
}
function selectFinding(fi){
  cur.f = fi;
  const p = PRS[cur.pr], d = p.data, f = d.findings[fi], real = d.source === 'bob';
  document.querySelectorAll('.fbtn').forEach((b,j) => b.classList.toggle('on', j === fi));
  const fileUrl = real && p.branch ? `https://github.com/${SLUG}/blob/${p.branch}/${f.file}#L${f.line}` : `${p.url}/files`;
  const hasFix = real ? !!f.fix : true;
  $('#proofSlot').innerHTML = `
    <div class="claim">${esc(f.claim)}</div>
    <div class="loc"><span class="tag ${esc(f.category)}">${esc(f.category)}</span><a href="${esc(fileUrl)}" target="_blank" rel="noopener">${esc(f.file)}${real?':'+esc(f.line):''}</a></div>
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
      ${fi < d.findings.length-1 ? `<button class="btn small ghost" onclick="selectFinding(${fi+1})">Next finding →</button>` : ''}
      ${real ? '' : '<span class="demo-note">Sample data — this PR hasn’t had a real Bob run yet.</span>'}
    </div>`;
  loadCode(p, f, real);
  playProof();
}
async function playProof(){
  const token = ++playToken, steps = [...document.querySelectorAll('.pf')];
  steps.forEach(s => s.classList.remove('go'));
  for(const s of steps){ await wait(s === steps[0] ? 150 : 650); if(token !== playToken) return; s.classList.add('go'); }
}

/* ---------- code loading & rendering ---------- */
const textCache = {}, filesCache = {};
function getText(url){ return textCache[url] ??= fetch(url).then(r => r.ok ? r.text() : Promise.reject(r.status)); }
function prFiles(p){ return filesCache[p.n] ??= gh(`repos/${SLUG}/pulls/${p.n}/files?per_page=100`).then(r => r.ok ? r.json() : Promise.reject(r.status)); }
function codeBox(title, inner){ return `<div class="code"><div class="cbar"><i></i><i></i><i></i><span>${esc(title)}</span></div>${inner}</div>`; }
function loadCode(p, f, real){
  const slot = $('#codeSlot'), key = p.n + f.id;
  slot.dataset.key = key;
  slot.innerHTML = codeBox(f.file, '<div class="msg">Loading the code from GitHub…</div>');
  const put = html => { if(slot.dataset.key === key) slot.innerHTML = html; };
  if(real && p.branch){
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
function patchHTML(patch, near){
  const rows = []; let o = 0, n = 0;
  patch.split('\n').forEach(l => {
    const h = l.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)/);
    if(h){ o = +h[1]; n = +h[2]; rows.push({t:'hunk', s:l}); return; }
    if(l.startsWith('+')) rows.push({t:'add', no:n++, s:l});
    else if(l.startsWith('-')) rows.push({t:'del', no:o++, s:l});
    else if(!l.startsWith('\\')){ rows.push({t:'', no:n++, s:l}); o++; }
  });
  let best = 0, bd = 1e9;
  rows.forEach((r,i) => { if(r.t === 'add'){ const d = Math.abs(r.no - near); if(d < bd){ bd = d; best = i; } } });
  let hs = best; while(hs > 0 && rows[hs].t !== 'hunk') hs--;
  let he = best; while(he < rows.length-1 && rows[he+1].t !== 'hunk') he++;
  const from = Math.max(hs+1, best-7), to = Math.min(he+1, from+16);
  return `<pre>${rows.slice(from,to).map(r => `<span class="ln ${r.t}"><b>${r.t==='del'?'':r.no}</b>${esc(r.s)||' '}</span>`).join('')}</pre>`;
}
function srcHTML(src, from, hit){
  return `<pre>${src.split('\n').map((l,i) => `<span class="ln${from+i===hit?' hit':''}"><b>${from+i}</b>${esc(l)||' '}</span>`).join('')}</pre>`;
}
function diffHTML(d){
  return String(d||'').split('\n').map(l => {
    const c = /^\+(?!\+\+)/.test(l) ? 'add' : /^-(?!--)/.test(l) ? 'del' : '';
    return `<span class="ln ${c}">${esc(l)||' '}</span>`; }).join('');
}

/* ---------- scoreboard ---------- */
const WHO = {ours:['Proof-Carrying','our Bob mode'], bob:['Bob built-in','default review'], naive:['Naive LLM','one-line prompt']};
const EXPL = {recall:'Share of the hidden bugs each reviewer found.', precision:'Share of each reviewer’s comments that were about real bugs.',
  trust:'Share of comments backed by a test that actually fails.'};
function paintPodium(m){
  document.querySelectorAll('#seg button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  $('#segExpl').textContent = EXPL[m];
  const L = DATA.leaderboard, order = Object.keys(WHO).sort((a,b) => L[b][m] - L[a][m]);
  const medal = {[order[0]]:'🥇',[order[1]]:'🥈',[order[2]]:'🥉'}, place = {[order[0]]:'p1',[order[1]]:'p2',[order[2]]:'p3'};
  $('#podium').innerHTML = [order[1], order[0], order[2]].map(k => `<div class="pod ${place[k]}"><div class="medal">${medal[k]}</div>
    <div class="who">${WHO[k][0]}<small>${WHO[k][1]}</small></div><div class="col" data-h="${Math.max(52, L[k][m]/100*200)}"><b>${L[k][m]}%</b></div></div>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('.pod .col').forEach(c => c.style.height = c.dataset.h + 'px')));
}
function paintSide(){
  const L = DATA.leaderboard;
  $('#alarms').innerHTML = Object.keys(WHO).map(k => { const n = L[k].false_alarms;
    return `<div class="arow"><div class="nm">${WHO[k][0]}</div><div class="sirens">${n ? '🚨'.repeat(Math.min(n,14)) + (n>14?' +'+(n-14):'')
      + ` <span class="mono" style="font-size:13px;font-weight:700">${n}</span>` : '<span class="zero">none 🎉</span>'}</div></div>`; }).join('');
  $('#sizes').innerHTML = DATA.sizeBuckets.map(s => `<div class="srow"><div class="lb">${s.size}<small>${s.lines}</small></div>
    <div class="sbars">${['ours','bob','naive'].map(k => `<div class="sbar ${k}"><i data-w="${s[k]}"></i><span>${s[k]}%</span></div>`).join('')}</div></div>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('.sbar i').forEach(i => i.style.width = i.dataset.w + '%')));
}
document.querySelectorAll('#seg button').forEach(b => b.onclick = () => paintPodium(b.dataset.m));

scan();
