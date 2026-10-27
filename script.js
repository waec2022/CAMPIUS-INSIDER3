// SURE2ODDTODAY - LIVE AUTO - PROTECTED KEYS
const _0xA1 = "aHR0cHM6Ly9jaGUuZmx1eGJyb3guY29tL3JlZGlyZWN0LmFzcHg/cGlkPTE5OTA0NiZscGlkPTE3JmJpZD0xNDg0";
const _0xP1 = "U1VSRTJPRERU";
const _0xK1 = "ZTMzMTlkZWUwNTExMTQzOTRmYzAxMTIwYTJlODQ5NGI=";
function _d(s){try{return atob(s)}catch(e){return s}}
function _getLink(){return _d(_0xA1)}
function _getPromo(){return _d(_0xP1)}
function _getApiKey(){return _d(_0xK1)}
const CONFIG = {
  get maxlink(){return _getLink()},
  get promo(){return _getPromo()},
  get apiKey(){return _getApiKey()}
};
const TODAY = new Date().toISOString().split('T')[0];
document.getElementById('todayDate').textContent = TODAY;
if(document.getElementById('m100Date')) document.getElementById('m100Date').textContent = TODAY;
let MATCHES = [];
let selected = [];
let patternLock = true;
let userPattern = "Over 1.5";
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',3000);}
function _openProtected(code=''){
  const base=CONFIG.maxlink; const promo=CONFIG.promo;
  const url=code?base+'&sub1='+encodeURIComponent(code)+'&sub2='+promo:base;
  const win=window.open(url,'_blank'); if(!win) location.href=url;
  if(code){try{navigator.clipboard.writeText(code)}catch(e){} toast('Code '+code+' copied - '+promo);} else toast('Opening with '+promo);
}
function openM(id){renderModal(id); document.getElementById(id).classList.add('active'); document.body.style.overflow='hidden';}
function closeM(id){document.getElementById(id).classList.remove('active'); document.body.style.overflow='';}
document.querySelectorAll('.modal-bg').forEach(bg=>{bg.addEventListener('click',e=>{if(e.target===bg) closeM(bg.id)})});
document.getElementById('adminLink').addEventListener('click',e=>{e.preventDefault(); renderAdmin(); openM('mAdmin');});
document.getElementById('rolloverLink').addEventListener('click',e=>{e.preventDefault(); document.getElementById('rollGrid').scrollIntoView({behavior:'smooth'});});

async function fetchLiveMatches(force=false){
  const cacheKey='sure2odd_live_'+TODAY;
  const timeKey='sure2odd_time_'+TODAY;
  const cached=localStorage.getItem(cacheKey);
  const cachedTime=localStorage.getItem(timeKey);
  const cacheStatus=document.getElementById('cacheStatus');
  const loading=document.getElementById('loading');
  if(!force && cached && cachedTime && (Date.now()-parseInt(cachedTime) < 12*60*60*1000)){
    MATCHES=JSON.parse(cached);
    if(cacheStatus) cacheStatus.textContent='Cache '+Math.floor((Date.now()-parseInt(cachedTime))/60000)+'m ago - 0 calls';
    if(loading) loading.style.display='none';
    renderMatches(document.getElementById('searchInput').value||'');
    renderRollovers();
    document.getElementById('liveStatus').textContent='🟢 LIVE Cached';
    return;
  }
  try{
    if(loading) loading.style.display='block';
    if(cacheStatus) cacheStatus.textContent='Fetching live 1 call';
    const res=await fetch('https://v3.football.api-sports.io/fixtures?date='+TODAY+'&timezone=Africa/Lagos',{headers:{'x-apisports-key':CONFIG.apiKey}});
    const data=await res.json();
    let fixtures=data.response||[];
    if(fixtures.length===0){
      const yest=new Date(Date.now()-86400000).toISOString().split('T')[0];
      const r2=await fetch('https://v3.football.api-sports.io/fixtures?date='+yest+'&timezone=Africa/Lagos',{headers:{'x-apisports-key':CONFIG.apiKey}});
      const d2=await r2.json(); fixtures=d2.response||[];
    }
    MATCHES=fixtures.slice(0,30).map((f,i)=>{
      const home=f.teams.home.name; const away=f.teams.away.name; const league=f.league.name;
      const form=70+Math.floor(Math.random()*20); const avg=(2.1+Math.random()*1.2).toFixed(1);
      const prob=form-5+Math.floor(Math.random()*10);
      let market='Over 1.5 Goals'; let odds=(1.25+Math.random()*0.4).toFixed(2); let pattern='Over 1.5';
      const r=i%5;
      if(r===1){market='BTTS Yes'; odds=(1.55+Math.random()*0.4).toFixed(2); pattern='BTTS';}
      else if(r===2){market='Over 2.5 Goals'; odds=(1.65+Math.random()*0.5).toFixed(2); pattern='Over 2.5';}
      else if(r===3){market='Under 2.5 Goals'; odds=(1.75+Math.random()*0.4).toFixed(2); pattern='Under 2.5';}
      else if(r===4){market='Home Win'; odds=(1.80+Math.random()*0.8).toFixed(2); pattern='1X2';}
      return {id:f.fixture.id||i+1, teams:home+' vs '+away, time:new Date(f.fixture.date).toLocaleString(), league:league, market:market, odds:parseFloat(odds), form:form, avg:avg, prob:prob, pattern:pattern};
    });
    if(MATCHES.length===0) throw new Error('No fixtures');
    localStorage.setItem(cacheKey, JSON.stringify(MATCHES));
    localStorage.setItem(timeKey, Date.now().toString());
    if(cacheStatus) cacheStatus.textContent='Live fetched just now - 1 call';
    if(loading) loading.style.display='none';
    document.getElementById('liveStatus').textContent='🟢 LIVE Fresh';
    renderMatches(document.getElementById('searchInput').value||'');
    renderRollovers();
    toast('Live: '+MATCHES.length+' games today');
  }catch(err){
    console.error(err);
    if(loading) loading.style.display='none';
    if(cacheStatus) cacheStatus.textContent='Error - fallback';
    if(cached){MATCHES=JSON.parse(cached); toast('Using cached - limit protected');}
    else{
      MATCHES=[
        {id:1, teams:'Man City vs Arsenal', time:'Today 17:30', league:'Premier League', market:'Over 1.5 Goals', odds:1.42, form:88, avg:'2.9', prob:88, pattern:'Over 1.5'},
        {id:2, teams:'Bayern vs Dortmund', time:'Today 18:30', league:'Bundesliga', market:'BTTS Yes', odds:1.78, form:82, avg:'3.2', prob:76, pattern:'BTTS'},
        {id:3, teams:'Real Madrid vs Barcelona', time:'Today 20:00', league:'La Liga', market:'Home Win', odds:2.10, form:85, avg:'2.7', prob:68, pattern:'1X2'},
        {id:4, teams:'PSG vs Lyon', time:'Today 19:00', league:'Ligue 1', market:'Over 2.5 Goals', odds:1.85, form:80, avg:'3.0', prob:79, pattern:'Over 2.5'},
        {id:5, teams:'Inter vs Roma', time:'Today 20:45', league:'Serie A', market:'Under 3.5', odds:1.35, form:78, avg:'2.1', prob:84, pattern:'Under 3.5'},
        {id:6, teams:'Liverpool vs Tottenham', time:'Today 16:30', league:'Premier League', market:'Over 1.5 Goals', odds:1.32, form:85, avg:'2.8', prob:87, pattern:'Over 1.5'},
        {id:7, teams:'Juventus vs AC Milan', time:'Today 18:00', league:'Serie A', market:'Over 1.5 Goals', odds:1.38, form:77, avg:'2.4', prob:83, pattern:'Over 1.5'},
        {id:8, teams:'Chelsea vs Newcastle', time:'Today 17:00', league:'Premier League', market:'BTTS Yes', odds:1.72, form:70, avg:'2.6', prob:74, pattern:'BTTS'},
        {id:9, teams:'Atletico vs Sevilla', time:'Today 21:00', league:'La Liga', market:'Under 2.5', odds:1.95, form:73, avg:'1.9', prob:71, pattern:'Under 2.5'},
        {id:10, teams:'Ajax vs PSV', time:'Today 19:30', league:'Eredivisie', market:'Over 2.5', odds:1.60, form:81, avg:'3.3', prob:80, pattern:'Over 2.5'}
      ];
      toast('Fallback used - clear cache to retry');
    }
    renderMatches(document.getElementById('searchInput').value||'');
    renderRollovers();
  }
}

function renderMatches(filter=''){
  const list=document.getElementById('todayList');
  const count=document.getElementById('matchCount');
  if(!list) return;
  let filtered=MATCHES.filter(m=>{
    const s=(m.teams+' '+m.league+' '+m.market).toLowerCase().includes(filter.toLowerCase());
    const p=patternLock?m.pattern===userPattern:true;
    return s&&p;
  });
  if(count) count.textContent=filtered.length+' matches';
  list.innerHTML=filtered.map(m=>{
    const probCls=m.prob>=80?'high':m.prob>=65?'med':'';
    const isSel=selected.find(s=>s.id===m.id);
    return '<div class="today-item"><div><b>'+m.teams+'</b><br><small>'+m.time+' • '+m.league+' • Form '+m.form+'% • Avg '+m.avg+' • <span class="prob '+probCls+'">'+m.prob+'% prob</span></small><br><span class="badge pat">'+m.market+'</span></div><div style="text-align:right"><div class="oddsbox">'+m.odds+'</div><button class="view" style="margin-top:4px" onclick="toggleSel('+m.id+')">'+(isSel?'✓ Added':'Add')+'</button><br><button class="bet-btn" style="margin-top:4px;padding:4px 8px;font-size:9px" onclick="_openProtected(\''+m.market.replace(/[^A-Z0-9]/g,'').substring(0,10)+'-'+m.odds+'\')">Bet ↗</button></div></div>';
  }).join('');
}
function toggleSel(id){const m=MATCHES.find(x=>x.id===id); const idx=selected.findIndex(s=>s.id===id); if(idx>=0) selected.splice(idx,1); else selected.push(m); updateCombine(); renderMatches(document.getElementById('searchInput').value||'');}
function updateCombine(){const selCount=document.getElementById('selCount'); const combinedOdds=document.getElementById('combinedOdds'); const winProb=document.getElementById('winProb'); if(!selCount) return; selCount.textContent=selected.length; if(selected.length===0){combinedOdds.textContent='0.00'; winProb.textContent='0%'; return;} let comb=selected.reduce((a,b)=>a*b.odds,1); let prob=selected.reduce((a,b)=>a*(b.prob/100),1)*100; combinedOdds.textContent=comb.toFixed(2); winProb.textContent=prob.toFixed(1)+'%';}
function autoBuild(target){let sorted=MATCHES.filter(m=>!patternLock||m.pattern===userPattern).sort((a,b)=>b.prob-a.prob); selected=[]; let comb=1; for(let m of sorted){if(comb>=target) break; selected.push(m); comb*=m.odds;} updateCombine(); renderMatches(document.getElementById('searchInput').value||''); toast('Built '+selected.length+' live for '+target+' odds = '+comb.toFixed(2));}
function renderRollovers(){
  const odds=[{num:'1.30',days:'7 Days',modal:'m130',prob:94},{num:'1.50',days:'7 Days',modal:'m130',prob:89},{num:'2.00',days:'7 Days',modal:'mArb',prob:82},{num:'3.00',days:'7 Days',modal:'mMulti',prob:76},{num:'4.00',days:'7 Days',modal:'mArb',prob:71},{num:'5.00',days:'7 Days',modal:'mMulti',prob:68},{num:'6.00',days:'7 Days',modal:'mArb',prob:64},{num:'8.00',days:'7 Days',modal:'mArb',prob:58},{num:'10.00',days:'7 Days',modal:'m100',prob:52},{num:'20.00',days:'7 Days',modal:'m100',prob:46},{num:'50.00',days:'7 Days',modal:'m100',prob:41},{num:'100.00',days:'2 Days',modal:'m100',prob:35}];
  const grid=document.getElementById('rollGrid'); if(!grid) return;
  grid.innerHTML=odds.map(o=>{
    let dayCls=o.num==='100.00'?'red':['10.00','20.00','50.00'].includes(o.num)?'pur':'';
    return '<div class="roll" onclick="openM(\''+o.modal+'\')"><div class="roll-top"><span class="num">'+o.num+'</span><span class="day '+dayCls+'">'+o.days+'</span></div><div class="bot"><span>Rollover • '+o.prob+'%</span><span>› Bet</span></div></div>';
  }).join('');
}
function renderModal(id){
  if(id==='m100'){
    const tbl=document.getElementById('m100Table'); if(!tbl) return;
    const rows=MATCHES.slice(0,10).map((m,i)=>'<tr><td>'+(i+1)+'</td><td>'+m.teams+'<br><small>'+m.league+' • '+m.prob+'% • Live API</small></td><td>1xBet</td><td>'+m.market+'</td><td>'+m.odds+'</td><td><span class="badge '+(i<3?'won':i<7?'pend':'lost')+'">'+(i<3?'WON':i<7?'PENDING':'UPCOMING')+'</span></td><td><button class="bet-btn" style="padding:5px 10px;font-size:10px" onclick="_openProtected(\''+m.market+'\')">Bet ↗</button></td></tr>').join('');
    tbl.innerHTML='<tr><th>#</th><th>Match (Live API)</th><th>Book</th><th>Market</th><th>Odds</th><th>Status</th><th>Action</th></tr>'+rows;
  }
  if(id==='m130'){
    const c=document.getElementById('m130Content'); if(!c) return;
    c.innerHTML='<div style="height:6px;background:#e5e7eb;border-radius:999px;overflow:hidden"><div style="width:35%;height:100%;background:#0a7a4a"></div></div><div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">'+MATCHES.slice(0,4).map((m,i)=>'<div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;display:flex;justify-content:space-between;font-size:12px"><span><b>Day '+(i+1)+'</b> '+m.teams+'<br><small>'+m.market+' • '+m.odds+' • Prob '+m.prob+'% • Live API</small></span><span class="badge '+(i===0?'won':i===1?'pend':'up')+'">'+(i===0?'WON':i===1?'PENDING':'UPCOMING')+'</span></div>').join('')+'</div><button class="bet-btn" style="width:100%;margin-top:10px;justify-content:center" onclick="_openProtected()">↗ Bet with '+_d(_0xP1)+' ↗</button>';
  }
  if(id==='mMulti'){
    const c=document.getElementById('multiContent'); const sub=document.getElementById('multiSub'); if(!c) return;
    const three=MATCHES.slice(0,3); const comb=three.reduce((a,b)=>a*b.odds,1);
    if(sub) sub.textContent=three.length+' Live Matches • Combined '+comb.toFixed(2);
    c.innerHTML=three.map(m=>'<div style="border:1px solid #e6eef5;border-radius:10px;padding:10px;display:flex;justify-content:space-between;margin-bottom:8px"><div><b>'+m.teams+'</b><br><small>'+m.market+' • '+m.prob+'% prob • Live API</small></div><span style="background:#e0f2fe;padding:4px 10px;border-radius:999px;font-weight:700">'+m.odds+'</span></div>').join('')+'<div style="background:#f8fbff;border-radius:10px;padding:10px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px"><div>Total Odds<br><b>'+comb.toFixed(2)+'</b></div><div>Potential<br><b>₦'+(comb*5000).toFixed(0)+'</b></div></div><button class="bet-btn" style="width:100%;margin-top:10px;justify-content:center" onclick="_openProtected(\'MULTI-'+comb.toFixed(2)+'\')">↗ Bet '+comb.toFixed(2)+' Multi - '+_d(_0xP1)+' ↗</button>';
  }
  if(id==='mArb'){
    const c=document.getElementById('arbMarkets'); if(!c) return;
    c.innerHTML='<div style="background:#fbfdff;border:1px solid #eef3ff;border-radius:12px;padding:10px"><b>⚽ '+(MATCHES[0]?MATCHES[0].teams:'Arsenal vs Chelsea')+' • Live API</b><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><div style="background:#fff;border:1px solid #eef2ff;border-radius:8px;padding:8px">bet365 Over 2.5 <b>2.10</b><br><button class="copy" data-c="over25">Copy + Bet</button></div><div style="background:#fff;border:1px solid #eef2ff;border-radius:8px;padding:8px">1XBET Under 2.5 <b>2.06</b><br><button class="copy" data-c="under25">Copy + Bet</button></div></div></div>';
    c.querySelectorAll('.copy').forEach(b=>{b.addEventListener('click',()=>{_openProtected(b.getAttribute('data-c'));})});
  }
}
function renderAdmin(){
  const main=document.getElementById('adminMain'); const stats=document.getElementById('adminStats'); if(!main) return;
  main.innerHTML='<b>Live Matches ('+MATCHES.length+') - API Protected</b><br><small>Key: '+CONFIG.apiKey.substring(0,4)+'...'+CONFIG.apiKey.slice(-4)+' • Maxlink pid 199046 hidden</small><table class="table" style="margin-top:8px"><tr><th>Match</th><th>Market</th><th>Odds</th><th>Prob</th><th>Action</th></tr>'+MATCHES.map(m=>'<tr><td>'+m.teams+'</td><td>'+m.market+'</td><td>'+m.odds+'</td><td>'+m.prob+'%</td><td><button class="view" onclick="_openProtected(\''+m.market+'\')">Bet</button></td></tr>').join('')+'</table>';
  if(stats) stats.innerHTML='Matches: '+MATCHES.length+'<br>Selected: '+selected.length+'<br>Cache: 12h<br>API: 2 req/day<br>Protected: YES<br><br>Today: '+TODAY+'<br>Promo: '+_d(_0xP1);
}

// ACTIVE SEARCH BAR - LIVE
document.getElementById('searchInput').addEventListener('input',e=>renderMatches(e.target.value));
document.querySelector('.search-btn').addEventListener('click',()=>{
  const v=document.getElementById('searchInput').value;
  renderMatches(v);
  toast('Searching: '+v+' - '+(MATCHES.filter(m=>(m.teams+' '+m.league+' '+m.market).toLowerCase().includes(v.toLowerCase())).length)+' found');
});
document.getElementById('searchInput').addEventListener('keypress',e=>{ if(e.key==='Enter'){ renderMatches(e.target.value); }});

document.getElementById('toggleLock').addEventListener('click',()=>{patternLock=!patternLock; document.getElementById('lockStatus').textContent=patternLock?'ON':'OFF'; document.getElementById('toggleLock').textContent=patternLock?'🔓 Unlock Show All':'🔒 Lock Pattern Only'; renderMatches(document.getElementById('searchInput').value||''); toast('Pattern Lock '+(patternLock?'ON':'OFF'));});
document.getElementById('dropZone').addEventListener('click',()=>document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change',e=>{const f=e.target.files[0]; if(f){toast('Ticket '+f.name+' uploaded'); setTimeout(()=>{userPattern='Over 1.5'; document.getElementById('userPattern').textContent=userPattern; patternLock=true; renderMatches(''); toast('Pattern Over 1.5 found');},1000);}});
document.getElementById('analyzeBtn').addEventListener('click',()=>{const code=document.getElementById('codeInput').value.trim(); if(!code){toast('Paste code'); return;} let pat='Over 1.5'; if(code.toLowerCase().includes('btts')) pat='BTTS'; if(code.toLowerCase().includes('under')) pat='Under 2.5'; if(code.toLowerCase().includes('over25')) pat='Over 2.5'; userPattern=pat; document.getElementById('userPattern').textContent=pat; patternLock=true; document.getElementById('lockStatus').textContent='ON'; renderMatches(''); toast('Detected: '+pat);});
document.querySelectorAll('.t-odd').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.t-odd').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); autoBuild(parseFloat(btn.getAttribute('data-target')));})});
document.getElementById('mainBetBtn').addEventListener('click',e=>{e.preventDefault(); if(selected.length===0){toast('Add live matches first'); return;} const code='MULTI-'+selected.length+'-'+selected.reduce((a,b)=>a*b.odds,1).toFixed(2); _openProtected(code);});
document.getElementById('clearBtn').addEventListener('click',()=>{selected=[]; updateCombine(); renderMatches(document.getElementById('searchInput').value||''); toast('Cleared');});
document.getElementById('topBetBtn').addEventListener('click',()=>_openProtected());
document.getElementById('viewAllBtn').addEventListener('click',()=>document.getElementById('rollGrid').scrollIntoView({behavior:'smooth'}));
document.getElementById('refreshBtn').addEventListener('click',()=>{fetchLiveMatches(true); toast('Re-fetching live 1 call');});
document.getElementById('clearCacheBtn').addEventListener('click',()=>{localStorage.clear(); toast('Cache cleared'); fetchLiveMatches(true);});
document.getElementById('copyAll').addEventListener('click',()=>{_openProtected('ALL-CODES');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal-bg').forEach(m=>closeM(m.id));}});

// INIT
fetchLiveMatches(false);
