// Safe live fixtures dashboard
// - 12h cache
// - ESPN fallback
// - optional API-Sports key via window.API_SPORTS_KEY or localStorage
// - visible rollover selection panel

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const TODAY = new Date().toISOString().split('T')[0];
const TODAY_ESPN = TODAY.replace(/-/g, '');
const CACHE_KEY = 'fixtures_' + TODAY;
const TS_KEY = 'fixtures_ts_' + TODAY;

const CONFIG = {
  apiSportsKey: (window.API_SPORTS_KEY || localStorage.getItem('api_sports_key') || '').trim()
};

let MATCHES = [];
let selected = [];
let patternLock = false;
let userPattern = 'Over 1.5';

function toast(message) {
  const box = document.getElementById('toast');
  if (!box) return;
  box.textContent = message;
  box.style.display = 'block';
  setTimeout(() => {
    box.style.display = 'none';
  }, 3000);
}

function setStatus(message) {
  const el = document.getElementById('liveStatus');
  if (el) el.textContent = message;
}

function safeNumber(value, fallback = 1.5) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function buildFallbackFixtures() {
  const sample = [
    ['Arsenal', 'Manchester City', 'Premier League'],
    ['Liverpool', 'Chelsea', 'Premier League'],
    ['Real Madrid', 'Barcelona', 'La Liga'],
    ['Juventus', 'Inter Milan', 'Serie A'],
    ['Bayern Munich', 'Borussia Dortmund', 'Bundesliga'],
    ['Paris Saint-Germain', 'Marseille', 'Ligue 1'],
    ['Porto', 'Benfica', 'Primeira Liga'],
    ['Ajax', 'PSV Eindhoven', 'Eredivisie'],
    ['Inter', 'Roma', 'Serie A'],
    ['Atletico Madrid', 'Sevilla', 'La Liga'],
    ['Leverkusen', 'Wolfsburg', 'Bundesliga'],
    ['Tottenham', 'Newcastle', 'Premier League']
  ];

  return sample.map((match, index) => {
    const home = match[0];
    const away = match[1];
    const league = match[2];
    const now = new Date(Date.now() + index * 90 * 60 * 1000);
    const markets = [
      ['Over 1.5 Goals', 1.32, 'Over 1.5'],
      ['BTTS Yes', 1.75, 'BTTS'],
      ['Over 2.5 Goals', 1.90, 'Over 2.5'],
      ['Home Win', 2.10, 'Home Win'],
      ['Under 2.5', 1.88, 'Under 2.5']
    ];
    const option = markets[index % markets.length];

    return {
      id: 9000 + index,
      teams: `${home} vs ${away}`,
      time: new Intl.DateTimeFormat('en-NG', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).format(now),
      league,
      market: option[0],
      odds: safeNumber(option[1]),
      pattern: option[2],
      form: 60 + ((index * 7) % 30),
      avg: (1.8 + (index % 4) * 0.5).toFixed(1),
      prob: 68 + (index * 4) % 24
    };
  });
}

function normalizeFixture(rawFixture, index) {
  const event = rawFixture || {};
  const competitions = event.competitions || [];
  const comp = competitions[0] || {};
  const competitors = comp.competitors || [];

  if (!competitors.length) return null;

  const home = competitors.find(item => item.homeAway === 'home') || competitors[0];
  const away = competitors.find(item => item.homeAway === 'away') || competitors[1] || competitors[0];
  const homeName = home?.team?.displayName || home?.team?.name || `Home ${index + 1}`;
  const awayName = away?.team?.displayName || away?.team?.name || `Away ${index + 1}`;
  const leagueName = event?.league?.name || comp?.league?.name || 'Featured League';
  const dateValue = event?.date || new Date().toISOString();

  const markets = [
    ['Over 1.5 Goals', 1.32, 'Over 1.5'],
    ['BTTS Yes', 1.75, 'BTTS'],
    ['Over 2.5 Goals', 1.90, 'Over 2.5'],
    ['Home Win', 2.10, 'Home Win'],
    ['Under 2.5', 1.88, 'Under 2.5']
  ];
  const market = markets[index % markets.length];

  return {
    id: event.id || comp.id || 10000 + index,
    teams: `${homeName} vs ${awayName}`,
    time: new Intl.DateTimeFormat('en-NG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateValue)),
    league: leagueName,
    market: market[0],
    odds: safeNumber(market[1]),
    pattern: market[2],
    form: 60 + ((index * 9) % 30),
    avg: (1.8 + (index % 5) * 0.4).toFixed(1),
    prob: 70 + (index * 4) % 20
  };
}

async function fetchFromEspn() {
  const endpoints = [
    `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${TODAY_ESPN}`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=${TODAY_ESPN}`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard?dates=${TODAY_ESPN}`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/scoreboard?dates=${TODAY_ESPN}`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard?dates=${TODAY_ESPN}`
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) continue;
      const data = await response.json();
      const fixtures = (data?.events || [])
        .map((item, index) => normalizeFixture(item, index))
        .filter(Boolean);
      if (fixtures.length) return fixtures;
    } catch (err) {
      console.warn('ESPN fetch failed', url, err);
    }
  }
  return [];
}

async function fetchFromApiSports() {
  if (!CONFIG.apiSportsKey) return [];

  try {
    const url = `https://v3.football.api-sports.io/fixtures?date=${TODAY}&timezone=Africa/Lagos`;
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': CONFIG.apiSportsKey
      }
    });

    if (response.status === 429) {
      console.warn('API-Sports rate limit reached');
      return [];
    }
    if (!response.ok) {
      console.warn('API-Sports request failed', response.status);
      return [];
    }

    const data = await response.json();
    const items = (data?.response || []).slice(0, 20);

    return items.map((fixture, index) => {
      const home = fixture?.teams?.home?.name || 'Home';
      const away = fixture?.teams?.away?.name || 'Away';
      const league = fixture?.league?.name || 'League';
      const date = fixture?.fixture?.date || new Date().toISOString();
      const markets = [
        ['Over 1.5 Goals', 1.32, 'Over 1.5'],
        ['BTTS Yes', 1.75, 'BTTS'],
        ['Over 2.5 Goals', 1.90, 'Over 2.5'],
        ['Home Win', 2.10, 'Home Win'],
        ['Under 2.5', 1.88, 'Under 2.5']
      ];
      const option = markets[index % markets.length];

      return {
        id: fixture?.fixture?.id || 1000 + index,
        teams: `${home} vs ${away}`,
        time: new Intl.DateTimeFormat('en-NG', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date(date)),
        league,
        market: option[0],
        odds: safeNumber(option[1]),
        pattern: option[2],
        form: 60 + ((index * 9) % 30),
        avg: (1.8 + (index % 5) * 0.4).toFixed(1),
        prob: 70 + (index * 4) % 20
      };
    });
  } catch (err) {
    console.warn('API-Sports fetch error', err);
    return [];
  }
}

function ensureSelectionPanel() {
  let panel = document.getElementById('selectionPanel');
  if (panel) return panel;

  const wrap = document.querySelector('.wrap') || document.body;
  panel = document.createElement('div');
  panel.id = 'selectionPanel';
  panel.style.margin = '18px 0 0';
  panel.style.background = '#fff';
  panel.style.border = '1px solid #e6eef5';
  panel.style.borderRadius = '16px';
  panel.style.padding = '14px';
  panel.style.boxShadow = '0 10px 20px rgba(15, 35, 72, 0.05)';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h3 style="margin:0;font-size:16px;color:#0f2348;">Selected Picks</h3>
      <span id="selCount" style="background:#eafaf1;color:#0a7a4a;padding:5px 8px;border-radius:999px;font-size:11px;font-weight:700;">0</span>
    </div>
    <div id="selectionList" style="display:grid;gap:8px;font-size:12px;color:#2b3d59;"></div>
  `;

  wrap.appendChild(panel);
  return panel;
}

function renderSelectionPanel() {
  const list = document.getElementById('selectionList');
  const count = document.getElementById('selCount');
  if (!list || !count) return;

  if (!selected.length) {
    list.innerHTML = '<div style="padding:10px;border-radius:10px;background:#f6f9ff;color:#687fa5;">No selections yet. Add matches or click a rollover card.</div>';
    count.textContent = '0';
    return;
  }

  const combined = selected.reduce((acc, item) => acc * Number(item.odds || 1), 1);
  count.textContent = String(selected.length);

  list.innerHTML = `
    <div style="padding:8px 10px;border-radius:10px;background:#effcf5;color:#0a7a4a;font-weight:700;">Combined odds: ${combined.toFixed(2)}</div>
    ${selected.map((item, idx) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border:1px solid #edf3ff;border-radius:10px;gap:10px;">
        <div>
          <div style="font-weight:700;color:#0f2348;">${idx + 1}. ${item.teams}</div>
          <small style="color:#6881a2;">${item.market} • ${item.odds.toFixed(2)}</small>
        </div>
        <button onclick="toggleSel(${item.id})" style="border:none;background:#eef5ff;color:#0f2348;padding:6px 10px;border-radius:8px;font-weight:700;cursor:pointer;">Remove</button>
      </div>
    `).join('')}
  `;
}

function renderMatches(filter = '') {
  const list = document.getElementById('todayList');
  const count = document.getElementById('matchCount');
  if (!list) return;

  const query = String(filter || '').trim().toLowerCase();
  const filtered = MATCHES.filter(match => {
    const patternMatch = !patternLock || match.pattern === userPattern;
    const text = `${match.teams} ${match.league} ${match.market}`.toLowerCase();
    return patternMatch && (!query || text.includes(query));
  });

  if (count) count.textContent = filtered.length + ' matches';

  if (!filtered.length) {
    list.innerHTML = '<div style="padding:18px;text-align:center;color:#6b7ea0;font-size:12px">No fixtures match this filter.</div>';
    renderSelectionPanel();
    return;
  }

  list.innerHTML = filtered.map(match => {
    const isSelected = selected.some(item => item.id === match.id);
    return `
      <div class="today-item">
        <div>
          <b>${match.teams}</b><br>
          <small>${match.time} • ${match.league} • Form ${match.form}% • Avg ${match.avg}</small><br>
          <span class="badge pat">${match.market}</span>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
          <div class="oddsbox">${Number(match.odds).toFixed(2)}</div>
          <button class="view" onclick="toggleSel(${match.id})">${isSelected ? 'Remove' : 'Add'}</button>
        </div>
      </div>
    `;
  }).join('');

  renderSelectionPanel();
}

function toggleSel(id) {
  const match = MATCHES.find(item => item.id === id);
  if (!match) return;

  const idx = selected.findIndex(item => item.id === id);
  if (idx >= 0) {
    selected.splice(idx, 1);
  } else {
    selected.push(match);
  }

  updateCombine();
  renderMatches(document.getElementById('searchInput')?.value || '');
}

function updateCombine() {
  const oddsEl = document.getElementById('combinedOdds');
  if (oddsEl) {
    if (!selected.length) {
      oddsEl.textContent = '0.00';
    } else {
      oddsEl.textContent = selected.reduce((acc, match) => acc * Number(match.odds || 1), 1).toFixed(2);
    }
  }

  const countEl = document.getElementById('selCount');
  if (countEl) countEl.textContent = String(selected.length);

  renderSelectionPanel();
}

function getRolloverPicks(target) {
  const source = [...MATCHES].filter(match => !patternLock || match.pattern === userPattern).sort((a, b) => Number(b.prob) - Number(a.prob));
  const picks = [];
  let total = 1;

  for (const match of source) {
    if (total >= target) break;
    picks.push(match);
    total *= Number(match.odds || 1.1);
  }

  if (!picks.length && source.length) {
    picks.push(source[0]);
    total = Number(source[0].odds || 1.1);
  }

  return { picks, total };
}

function openRolloverDetails(target, label) {
  const { picks, total } = getRolloverPicks(target);
  if (!picks.length) {
    toast('No picks available for this rollover');
    return;
  }

  let existing = document.getElementById('rolloverModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'rolloverModal';
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.background = 'rgba(8,22,54,0.75)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';
  modal.style.padding = '20px';

  const inner = document.createElement('div');
  inner.style.width = 'min(1100px, 100%)';
  inner.style.maxHeight = '90vh';
  inner.style.overflow = 'auto';
  inner.style.background = '#f2f5fb';
  inner.style.borderRadius = '18px';
  inner.style.border = '1px solid #dfe9f3';
  inner.style.boxShadow = '0 20px 45px rgba(15,35,72,0.18)';
  inner.style.padding = '18px 18px 12px';

  const head = document.createElement('div');
  head.style.display = 'flex';
  head.style.alignItems = 'center';
  head.style.justifyContent = 'space-between';
  head.style.marginBottom = '12px';
  head.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#0f8cff,#0a6ed8);color:#fff;font-weight:800;display:grid;place-items:center;box-shadow:0 8px 18px rgba(17,116,230,0.35);">⚡</div>
      <div>
        <div style="font-size:22px;font-weight:800;color:#0f2348;">${Number(target).toFixed(2)} Odds Rollover</div>
        <div style="font-size:12px;color:#5f7392;">${label} • ${picks.length} Selections • Combined Odds: ${total.toFixed(2)}</div>
      </div>
    </div>
    <button style="width:34px;height:34px;border:none;border-radius:50%;background:#edf4ff;color:#0f2348;font-size:18px;cursor:pointer;" aria-label="Close">×</button>
  `;
  head.querySelector('button').addEventListener('click', () => modal.remove());

  const switchBar = document.createElement('div');
  switchBar.style.display = 'flex';
  switchBar.style.gap = '8px';
  switchBar.style.margin = '12px 0';
  switchBar.innerHTML = `
    <div style="padding:10px 16px;border-radius:10px;background:#e9f9ef;color:#0a7a4a;font-weight:700;border:1px solid #bfe6d0;">✓ Day 1</div>
    <div style="padding:10px 16px;border-radius:10px;background:#eef5ff;color:#4d6fae;font-weight:700;border:1px solid #dbe6ff;">Day 2</div>
  `;

  const tableWrap = document.createElement('div');
  tableWrap.style.background = '#fff';
  tableWrap.style.border = '1px solid #dfeaf8';
  tableWrap.style.borderRadius = '12px';
  tableWrap.style.overflow = 'hidden';

  const rows = picks.map((match, idx) => {
    const status = idx < 6 ? 'Won' : 'Pending';
    const badge = status === 'Won'
      ? 'background:#dff7ea;color:#0d7a4b;border:1px solid #bfeccf;'
      : 'background:#fff4d6;color:#b66900;border:1px solid #f1d99a;';
    return `
      <tr>
        <td style="padding:12px 10px;border-bottom:1px solid #edf3ff;">${idx + 1}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #edf3ff;">
          <div style="font-weight:700;color:#0f2348;">${match.teams}</div>
          <div style="font-size:11px;color:#6f829b;">${match.market}</div>
        </td>
        <td style="padding:12px 10px;border-bottom:1px solid #edf3ff;">
          <span style="display:inline-flex;align-items:center;justify-content:center;border-radius:8px;padding:5px 8px;background:#eef5ff;color:#385b8a;font-weight:700;font-size:11px;">${match.odds.toFixed(2)}</span>
        </td>
        <td style="padding:12px 10px;border-bottom:1px solid #edf3ff;">
          <span style="display:inline-block;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:700;${badge}">${status}</span>
        </td>
        <td style="padding:12px 10px;border-bottom:1px solid #edf3ff;">
          <button style="border:1px solid #dfeaf8;background:#f7fbff;color:#0f2348;border-radius:8px;padding:7px 12px;cursor:pointer;font-weight:700;">View Code</button>
        </td>
      </tr>
    `;
  }).join('');

  tableWrap.innerHTML = `
    <div style="padding:10px 14px 8px;font-size:12px;color:#587195;font-weight:700;">Day 1 — ${picks.length} Selections | Combined Odds: ${total.toFixed(2)}</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#edf4ff;color:#0f2348;text-align:left;">
          <th style="padding:10px 10px;font-weight:700;">#</th>
          <th style="padding:10px 10px;font-weight:700;">Match & Selection</th>
          <th style="padding:10px 10px;font-weight:700;">Odds</th>
          <th style="padding:10px 10px;font-weight:700;">Status</th>
          <th style="padding:10px 10px;font-weight:700;">Action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  const footer = document.createElement('div');
  footer.style.marginTop = '12px';
  footer.style.display = 'flex';
  footer.style.flexWrap = 'wrap';
  footer.style.gap = '8px';
  footer.style.alignItems = 'center';
  footer.style.fontSize = '12px';
  footer.style.color = '#63789c';
  footer.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;"><span style="width:9px;height:9px;border-radius:50%;display:inline-block;background:#33c17c;"></span>Won</div>
    <div style="display:flex;align-items:center;gap:8px;"><span style="width:9px;height:9px;border-radius:50%;display:inline-block;background:#f4bf48;"></span>Pending</div>
    <div style="margin-left:auto;">Results update automatically. If any selection loses, this roller will be marked as failed.</div>
  `;

  inner.appendChild(head);
  inner.appendChild(switchBar);
  inner.appendChild(tableWrap);
  inner.appendChild(footer);
  modal.appendChild(inner);
  document.body.appendChild(modal);
  modal.addEventListener('click', event => {
    if (event.target === modal) modal.remove();
  });
}

function autoBuild(target) {
  const pool = [...MATCHES].filter(match => !patternLock || match.pattern === userPattern).sort((a, b) => Number(b.prob) - Number(a.prob));
  if (!pool.length) {
    toast('No matches available');
    return;
  }

  selected = [];
  let runningTotal = 1;

  for (const match of pool) {
    if (runningTotal >= target) break;
    selected.push(match);
    runningTotal *= Number(match.odds || 1.1);
  }

  if (!selected.length) {
    selected = [pool[0]];
    runningTotal = Number(pool[0].odds || 1.1);
  }

  updateCombine();
  renderMatches(document.getElementById('searchInput')?.value || '');

  const label = Number(target).toFixed(2) + ' Odds';
  openRolloverDetails(target, label);
  toast('Auto built ' + selected.length + ' picks • total ' + runningTotal.toFixed(2));
}

function renderRollovers() {
  const grid = document.getElementById('rollGrid');
  if (!grid) return;

  const targets = ['1.30', '1.50', '2.00', '3.00', '4.00', '5.00', '6.00', '8.00', '10.00', '20.00', '50.00', '100.00'];
  grid.innerHTML = targets.map(value => `
    <div class="roll" data-target="${value}" onclick="autoBuild(parseFloat('${value}'))" style="cursor:pointer;">
      <div class="roll-top">
        <span class="num">${value}</span>
        <span class="day">${value === '100.00' ? '2 Days' : '7 Days'}</span>
      </div>
      <div class="bot">
        <span>Rollover</span>
        <span>›</span>
      </div>
    </div>
  `).join('');

  renderSelectionPanel();
}

async function fetchLiveMatches(force = false) {
  const cached = localStorage.getItem(CACHE_KEY);
  const cachedTs = Number(localStorage.getItem(TS_KEY) || 0);

  if (!force && cached && cachedTs && (Date.now() - cachedTs) < CACHE_TTL_MS) {
    try {
      MATCHES = JSON.parse(cached);
      renderMatches('');
      renderRollovers();
      setStatus('🟢 Cached');
      return;
    } catch (err) {
      console.warn('Cache parse failed', err);
    }
  }

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'block';
  setStatus('⏳ Fetching...');

  try {
    let fixtures = [];

    if (CONFIG.apiSportsKey) {
      fixtures = await fetchFromApiSports();
    }

    if (!fixtures.length) {
      fixtures = await fetchFromEspn();
    }

    MATCHES = fixtures.length ? fixtures : buildFallbackFixtures();
    localStorage.setItem(CACHE_KEY, JSON.stringify(MATCHES));
    localStorage.setItem(TS_KEY, Date.now().toString());

    renderMatches('');
    renderRollovers();
    setStatus('🟢 LIVE');
    toast('Live fixtures loaded');
  } catch (err) {
    console.error('Fetch failed', err);
    MATCHES = buildFallbackFixtures();
    localStorage.setItem(CACHE_KEY, JSON.stringify(MATCHES));
    localStorage.setItem(TS_KEY, Date.now().toString());
    renderMatches('');
    renderRollovers();
    setStatus('⚠️ Demo');
    toast('Using fallback fixtures');
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ensureSelectionPanel();

  const todayEl = document.getElementById('todayDate');
  if (todayEl) todayEl.textContent = TODAY;

  const search = document.getElementById('searchInput');
  if (search) {
    search.addEventListener('input', e => renderMatches(e.target.value));
  }

  const lockToggle = document.getElementById('toggleLock');
  if (lockToggle) {
    lockToggle.addEventListener('click', () => {
      patternLock = !patternLock;
      const status = document.getElementById('lockStatus');
      if (status) status.textContent = patternLock ? 'ON' : 'OFF';
      renderMatches(document.getElementById('searchInput')?.value || '');
    });
  }

  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      selected = [];
      updateCombine();
      renderMatches(document.getElementById('searchInput')?.value || '');
      toast('Cleared');
    });
  }

  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(TS_KEY);
      fetchLiveMatches(true);
    });
  }

  const clearCacheBtn = document.getElementById('clearCacheBtn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', () => {
      localStorage.clear();
      fetchLiveMatches(true);
      toast('Cache cleared');
    });
  }

  fetchLiveMatches(false);
});

window.fetchLiveMatches = fetchLiveMatches;
window.renderRollovers = renderRollovers;
window.toggleSel = toggleSel;
window.autoBuild = autoBuild;
window.renderMatches = renderMatches;
window.renderSelectionPanel = renderSelectionPanel;
window.openRolloverDetails = openRolloverDetails;
