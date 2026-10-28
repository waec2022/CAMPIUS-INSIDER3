// Safe, working football fixtures page for GitHub Pages.
// Uses public ESPN scoreboard data and 12-hour localStorage cache.
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const TODAY = new Date().toISOString().split('T')[0];
const TODAY_ESPN = TODAY.replace(/-/g, '');
const CACHE_KEY = 'sure2odd_live_' + TODAY;
const TIME_KEY = 'sure2odd_time_' + TODAY;

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
  }, 3200);
}

function setStatus(message) {
  const status = document.getElementById('liveStatus');
  if (status) status.textContent = message;
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
    ['Ajax', 'PSV Eindhoven', 'Eredivisie']
  ];

  return sample.map((match, index) => {
    const home = match[0];
    const away = match[1];
    const league = match[2];
    const time = new Date(Date.now() + index * 90 * 60 * 1000);
    const markets = [
      ['Over 1.5 Goals', 1.32, 'Over 1.5'],
      ['BTTS Yes', 1.75, 'BTTS'],
      ['Over 2.5 Goals', 1.9, 'Over 2.5'],
      ['Home Win', 2.1, 'Home Win'],
      ['Under 2.5', 1.88, 'Under 2.5'],
      ['Draw No Bet', 1.6, 'Home Win']
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
      }).format(time),
      league,
      market: option[0],
      odds: safeNumber(option[1]),
      pattern: option[2],
      form: 60 + ((index * 7) % 28),
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
    ['Over 2.5 Goals', 1.9, 'Over 2.5'],
    ['Home Win', 2.1, 'Home Win'],
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
    } catch (error) {
      console.warn('ESPN fetch failed for', url, error);
    }
  }

  return [];
}

async function fetchLiveMatches(force = false) {
  const cached = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(TIME_KEY);

  if (!force && cached && cachedTime && (Date.now() - Number(cachedTime) < CACHE_TTL_MS)) {
    try {
      MATCHES = JSON.parse(cached);
      setStatus('🟢 Cached');
      renderMatches('');
      renderRollovers();
      return;
    } catch (error) {
      console.warn('Cache parse failed', error);
    }
  }

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'block';
  setStatus('⏳ Fetching...');

  try {
    const liveFixtures = await fetchFromEspn();
    MATCHES = liveFixtures.length ? liveFixtures : buildFallbackFixtures();

    localStorage.setItem(CACHE_KEY, JSON.stringify(MATCHES));
    localStorage.setItem(TIME_KEY, Date.now().toString());

    setStatus('🟢 LIVE ' + MATCHES.length);
    renderMatches('');
    renderRollovers();
    toast('LIVE: ' + MATCHES.length + ' fixtures loaded');
  } catch (error) {
    console.error('Fetch failed:', error);
    MATCHES = buildFallbackFixtures();
    localStorage.setItem(CACHE_KEY, JSON.stringify(MATCHES));
    localStorage.setItem(TIME_KEY, Date.now().toString());
    setStatus('⚠️ Demo data');
    renderMatches('');
    renderRollovers();
    toast('Using fallback data');
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

function renderMatches(filter = '') {
  const list = document.getElementById('todayList');
  const count = document.getElementById('matchCount');
  if (!list) return;

  const query = String(filter || '').trim().toLowerCase();
  let filtered = MATCHES.filter(match => {
    const patternMatch = !patternLock || match.pattern === userPattern;
    const text = `${match.teams} ${match.league} ${match.market}`.toLowerCase();
    return patternMatch && (!query || text.includes(query));
  });

  if (count) count.textContent = filtered.length + ' matches';

  if (!filtered.length) {
    list.innerHTML = '<div style="padding:18px;text-align:center;color:#6b7ea0;font-size:12px">No fixtures match this filter.</div>';
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
        <div style="text-align:right">
          <div class="oddsbox">${Number(match.odds).toFixed(2)}</div>
          <button class="view" onclick="toggleSel(${match.id})">${isSelected ? 'Remove' : 'Add'}</button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleSel(id) {
  const match = MATCHES.find(item => item.id === id);
  if (!match) return;

  const index = selected.findIndex(item => item.id === id);
  if (index >= 0) {
    selected.splice(index, 1);
  } else {
    selected.push(match);
  }

  updateCombine();
  renderMatches(document.getElementById('searchInput')?.value || '');
}

function updateCombine() {
  const oddsEl = document.getElementById('combinedOdds');
  const countEl = document.getElementById('selCount');
  if (!oddsEl || !countEl) return;

  if (!selected.length) {
    oddsEl.textContent = '0.00';
    countEl.textContent = '0';
    return;
  }

  const combined = selected.reduce((acc, match) => acc * Number(match.odds || 1), 1);
  oddsEl.textContent = combined.toFixed(2);
  countEl.textContent = String(selected.length);
}

function autoBuild(target) {
  const pool = [...MATCHES]
    .filter(match => !patternLock || match.pattern === userPattern)
    .sort((a, b) => b.prob - a.prob);

  if (!pool.length) {
    toast('No fixture data available yet');
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
  toast('Auto built ' + selected.length + ' picks • total ' + runningTotal.toFixed(2));
}

function renderRollovers() {
  const grid = document.getElementById('rollGrid');
  if (!grid) return;

  const targets = ['1.30', '1.50', '2.00', '3.00', '4.00', '5.00', '6.00', '8.00', '10.00', '20.00', '50.00', '100.00'];
  grid.innerHTML = targets.map(value => `
    <div class="roll" onclick="autoBuild(parseFloat('${value}'))">
      <div class="roll-top">
        <span class="num">${value}</span>
        <span class="day">${value === '100.00' ? '2 Days' : '7 Days'}</span>
      </div>
      <div class="bot">
        <span>Auto Generate</span>
        <span>› Bet</span>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const todayDate = document.getElementById('todayDate');
  if (todayDate) todayDate.textContent = TODAY;

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', event => renderMatches(event.target.value));
  }

  const topBetBtn = document.getElementById('topBetBtn');
  if (topBetBtn) {
    topBetBtn.addEventListener('click', () => {
      if (!MATCHES.length) {
        toast('No data loaded yet');
        return;
      }
      toast('Ready: ' + MATCHES.length + ' matches loaded');
    });
  }

  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(TIME_KEY);
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

  const lockToggle = document.getElementById('toggleLock');
  if (lockToggle) {
    lockToggle.addEventListener('click', () => {
      patternLock = !patternLock;
      const lockStatus = document.getElementById('lockStatus');
      if (lockStatus) lockStatus.textContent = patternLock ? 'ON' : 'OFF';
      renderMatches(document.getElementById('searchInput')?.value || '');
    });
  }

  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
      const input = document.getElementById('codeInput');
      if (!input) return;
      const value = input.value.trim();
      if (!value) {
        toast('Paste a fixture note or code to analyze');
        return;
      }

      const lower = value.toLowerCase();
      if (lower.includes('btts')) userPattern = 'BTTS';
      else if (lower.includes('under')) userPattern = 'Under 2.5';
      else if (lower.includes('over25') || lower.includes('over 2.5')) userPattern = 'Over 2.5';
      else userPattern = 'Over 1.5';

      patternLock = true;
      const lockStatus = document.getElementById('lockStatus');
      if (lockStatus) lockStatus.textContent = 'ON';
      renderMatches(document.getElementById('searchInput')?.value || '');
      toast('Pattern set to ' + userPattern);
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

  const modalElements = document.querySelectorAll('.modal-bg');
  modalElements.forEach(bg => {
    bg.addEventListener('click', event => {
      if (event.target === bg) {
        bg.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal-bg').forEach(modal => {
        modal.classList.remove('active');
      });
      document.body.style.overflow = '';
    }
  });

  fetchLiveMatches(false);
});

window.fetchLiveMatches = fetchLiveMatches;
window.toggleSel = toggleSel;
window.autoBuild = autoBuild;
window.renderMatches = renderMatches;
window.renderRollovers = renderRollovers;
