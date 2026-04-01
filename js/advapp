/* ============================================================
   1stLOOK — app.js
   Full data loading, chart rendering, table, modal, race chart
   ============================================================ */

'use strict';

// ── GLOBAL STATE ──────────────────────────────────────────────
let DEALS = [];
let filteredDeals = [];
let sortCol = 'totalValue';
let sortDir = 'desc';
let charts = {};
let raceInterval = null;
let raceFrame = 0;
let raceYears = [];
let raceRunning = false;

// ── STUDIO COLOR MAP ──────────────────────────────────────────
const STUDIO_COLORS = {
  'Netflix':                    '#e50914',
  'Amazon Studios':             '#00a8e0',
  'HBO':                        '#9b59b6',
  'WarnerMedia':                '#9b59b6',
  'Warner Bros TV':             '#8e44ad',
  'Warner Bros Pictures':       '#7d3c98',
  'Apple TV+':                  '#a8b2be',
  'Walt Disney Studios':        '#003087',
  'Walt Disney Pictures':       '#003087',
  '20th Century Studios / Disney': '#0057b8',
  'CBS Studios / Paramount+':   '#0038a8',
  'Paramount Network / Paramount+': '#003580',
  'Universal Pictures':         '#ff6b00',
  'NBC Universal TV':           '#ff8c00',
  'NBCUniversal':               '#ff9500',
  'Hulu':                       '#1ce783',
  'Amazon MGM':                 '#00a8e0',
  'Starz':                      '#333',
  'Sony Pictures TV':           '#002855',
  'FX / Hulu':                  '#1a6b3a',
  'default':                    '#4a5568'
};

function studioColor(studio) {
  if (!studio) return STUDIO_COLORS.default;
  const key = Object.keys(STUDIO_COLORS).find(k => studio.startsWith(k));
  return key ? STUDIO_COLORS[key] : STUDIO_COLORS.default;
}

// ── ROLE COLOR MAP ────────────────────────────────────────────
const ROLE_COLORS = {
  'Showrunner':           '#e8b84b',
  'Showrunner/Director':  '#e8a020',
  'Writer/Showrunner':    '#d4a017',
  'Director/Producer':    '#6384ff',
  'Actor/Producer':       '#ff6b9d',
  'Producer':             '#a78bfa',
  'Director':             '#4aaeff',
  'Actor/Showrunner':     '#ff9f6b',
  'default':              '#888ba0'
};

function roleColor(role) {
  if (!role) return ROLE_COLORS.default;
  const key = Object.keys(ROLE_COLORS).find(k => role.startsWith(k));
  return key ? ROLE_COLORS[key] : ROLE_COLORS.default;
}

// ── CHART.JS DEFAULTS ─────────────────────────────────────────
Chart.defaults.color = '#888ba0';
Chart.defaults.borderColor = '#1e2130';
Chart.defaults.font.family = "'IBM Plex Mono', monospace";
Chart.defaults.font.size = 11;

function baseOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0d0f14',
        borderColor: '#252838',
        borderWidth: 1,
        titleColor: '#e8b84b',
        bodyColor: '#e0e2ec',
        padding: 12,
        titleFont: { family: "'IBM Plex Mono', monospace", weight: '600', size: 11 },
        bodyFont: { family: "'IBM Plex Mono', monospace", size: 10 },
        callbacks: {}
      }
    },
    ...extra
  };
}

// ── FORMAT HELPERS ─────────────────────────────────────────────
function fmtM(v) {
  if (!v || v === 0) return 'N/D';
  if (v >= 1000) return `$${(v / 1000).toFixed(2)}B`;
  return `$${v}M`;
}
function fmtMShort(v) {
  if (!v || v === 0) return '—';
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`;
  return `$${v}M`;
}

// ── DATA LOADING ──────────────────────────────────────────────
async function loadDeals() {
  const res = await fetch('data/deals.json');
  DEALS = await res.json();
  filteredDeals = [...DEALS];
  init();
}

// ── INIT ──────────────────────────────────────────────────────
function init() {
  setHeaderDate();
  buildTicker();
  buildKPIs();
  buildTabNav();
  buildFilters();
  renderTable();
  renderAllCharts();
}

// ── DATE ──────────────────────────────────────────────────────
function setHeaderDate() {
  const el = document.getElementById('headerDate');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

// ── TICKER ────────────────────────────────────────────────────
function buildTicker() {
  const inner = document.getElementById('tickerInner');
  if (!inner) return;
  const items = [...DEALS].filter(d => d.totalValue > 0).sort((a, b) => b.totalValue - a.totalValue);
  // Double for seamless loop
  const doubled = [...items, ...items];
  inner.innerHTML = doubled.map(d => `
    <div class="ticker-item">
      <span class="ticker-talent">${d.talent}</span>
      <span class="ticker-studio">${d.studio}</span>
      <span class="ticker-val">${fmtMShort(d.totalValue)}</span>
      <span class="${d.status === 'Active' ? 'ticker-status-active' : 'ticker-status-expired'}">${d.status.toUpperCase()}</span>
    </div>
  `).join('');
}

// ── KPIs ──────────────────────────────────────────────────────
function buildKPIs() {
  const withVal = DEALS.filter(d => d.totalValue > 0);
  const active = DEALS.filter(d => d.status === 'Active');
  const activeWithVal = active.filter(d => d.annualValue > 0);
  const totalVal = withVal.reduce((s, d) => s + d.totalValue, 0);
  const avgDeal = withVal.length ? totalVal / withVal.length : 0;
  const avgAnnual = activeWithVal.length ? activeWithVal.reduce((s, d) => s + d.annualValue, 0) / activeWithVal.length : 0;
  const studios = new Set(DEALS.map(d => d.studio)).size;
  const talent = new Set(DEALS.map(d => d.talent)).size;

  animateCount('kpiTotal', totalVal, v => fmtMShort(v));
  animateCount('kpiActive', active.length, v => Math.round(v).toString());
  animateCount('kpiAvg', avgDeal, v => fmtMShort(v));
  animateCount('kpiAnnual', avgAnnual, v => fmtMShort(v));
  animateCount('kpiStudios', studios, v => Math.round(v).toString());
  animateCount('kpiTalent', talent, v => Math.round(v).toString());
}

function animateCount(id, target, formatter, duration = 1200) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = Date.now();
  function tick() {
    const t = Math.min(1, (Date.now() - start) / duration);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = formatter(target * ease);
    if (t < 1) requestAnimationFrame(tick);
  }
  tick();
}

// ── TABS ──────────────────────────────────────────────────────
function buildTabNav() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      const tab = document.getElementById('tab-' + btn.dataset.tab);
      if (tab) tab.classList.add('active');
    });
  });
}

// ── FILTERS ───────────────────────────────────────────────────
function buildFilters() {
  // Populate studio dropdown
  const studioSel = document.getElementById('filterStudio');
  const studios = [...new Set(DEALS.map(d => d.studio))].sort();
  studios.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    studioSel.appendChild(opt);
  });

  // Populate role dropdown
  const roleSel = document.getElementById('filterRole');
  const roles = [...new Set(DEALS.map(d => d.role))].sort();
  roles.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r; opt.textContent = r;
    roleSel.appendChild(opt);
  });

  // Events
  ['tableSearch', 'filterStudio', 'filterType', 'filterRole', 'filterStatus', 'filterConfidence'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', applyFilters);
  });

  // Sort
  document.querySelectorAll('.deals-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (sortCol === col) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortCol = col;
        sortDir = 'desc';
      }
      document.querySelectorAll('.deals-table th').forEach(t => t.classList.remove('sort-asc', 'sort-desc'));
      th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      renderTable();
    });
  });
}

function applyFilters() {
  const q = (document.getElementById('tableSearch')?.value || '').toLowerCase();
  const studio = document.getElementById('filterStudio')?.value || '';
  const type = document.getElementById('filterType')?.value || '';
  const role = document.getElementById('filterRole')?.value || '';
  const status = document.getElementById('filterStatus')?.value || '';
  const conf = document.getElementById('filterConfidence')?.value || '';

  filteredDeals = DEALS.filter(d => {
    if (q && !`${d.talent} ${d.studio} ${d.company} ${d.notes} ${d.role} ${d.network}`.toLowerCase().includes(q)) return false;
    if (studio && d.studio !== studio) return false;
    if (type && d.type !== type) return false;
    if (role && d.role !== role) return false;
    if (status && d.status !== status) return false;
    if (conf && d.valueConfidence !== conf) return false;
    return true;
  });

  renderTable();
}

// ── TABLE ─────────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('dealsTableBody');
  const countEl = document.getElementById('tableCount');
  if (!tbody) return;

  const sorted = [...filteredDeals].sort((a, b) => {
    let av = a[sortCol] ?? 0;
    let bv = b[sortCol] ?? 0;
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  if (countEl) countEl.textContent = `${sorted.length} deals`;

  tbody.innerHTML = sorted.map(d => {
    const typeClass = d.type === 'Overall' ? 'tag-overall' : d.type === 'First Look' ? 'tag-first-look' : 'tag-exclusive';
    const statusClass = d.status === 'Active' ? 'tag-active' : 'tag-expired';
    const confClass = `tag-${d.valueConfidence?.toLowerCase().replace(' ', '-')}`;
    const valClass = d.totalValue > 0 ? 'mono-val' : 'zero-val';
    const annClass = d.annualValue > 0 ? 'mono-val' : 'zero-val';
    return `
      <tr data-id="${d.id}">
        <td>${d.talent}</td>
        <td>${d.studio}</td>
        <td><span class="tag ${typeClass}">${d.type}</span></td>
        <td>${d.role}</td>
        <td class="${valClass}">${fmtMShort(d.totalValue)}</td>
        <td class="${annClass}">${d.annualValue > 0 ? fmtMShort(d.annualValue) + '/yr' : '—'}</td>
        <td class="mono-val">${d.duration ? d.duration + 'yr' : '—'}</td>
        <td class="mono-val">${d.startYear}–${d.endYear}</td>
        <td><span class="tag ${statusClass}">${d.status}</span></td>
        <td class="${confClass}" style="font-family:var(--mono);font-size:0.65rem;">${d.valueConfidence}</td>
      </tr>
    `;
  }).join('');

  // Row click → modal
  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => {
      const id = parseInt(row.dataset.id);
      const deal = DEALS.find(d => d.id === id);
      if (deal) openModal(deal);
    });
  });
}

// ── MODAL ─────────────────────────────────────────────────────
function openModal(d) {
  document.getElementById('modalBadge').textContent = `${d.type} · ${d.status}`;
  document.getElementById('modalTalent').textContent = d.talent;
  document.getElementById('modalCompany').textContent = d.company && d.company !== 'N/A' ? d.company : 'Independent';
  document.getElementById('modalStudio').textContent = d.studio;
  document.getElementById('modalNetwork').textContent = d.network;
  document.getElementById('modalType').textContent = d.type;
  document.getElementById('modalRole').textContent = d.role;
  document.getElementById('modalTotal').textContent = d.totalValue > 0 ? fmtM(d.totalValue) : 'Undisclosed';
  document.getElementById('modalAnnual').textContent = d.annualValue > 0 ? fmtM(d.annualValue) + '/yr' : '—';
  document.getElementById('modalDuration').textContent = d.duration ? `${d.duration} years` : '—';
  document.getElementById('modalPeriod').textContent = `${d.startYear} – ${d.endYear}`;
  document.getElementById('modalCategory').textContent = d.category;
  document.getElementById('modalConfidence').textContent = d.valueConfidence;

  const proj = document.getElementById('modalProjects');
  proj.innerHTML = (d.notableProjects || []).map(p => `<span class="modal-project-tag">${p}</span>`).join('');

  document.getElementById('modalNotes').textContent = d.notes || '';
  document.getElementById('modalOverlay').classList.add('open');
}

document.getElementById('modalClose')?.addEventListener('click', closeModal);
document.getElementById('modalOverlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// ── ALL CHARTS ────────────────────────────────────────────────
function renderAllCharts() {
  renderBubbleChart();
  renderTimelineChart();
  renderStatusChart();
  renderTalentValueChart();
  renderRoleValueChart();
  renderStudioSpendChart();
  renderStudioCountChart();
  renderStudioAvgChart();
  renderTypeValueChart();
  renderDurationChart();
  renderCategoryChart();
  renderTypeAnnualChart();
  buildRaceChart();
}

// ── BUBBLE CHART ──────────────────────────────────────────────
function renderBubbleChart() {
  const ctx = document.getElementById('bubbleChart');
  if (!ctx) return;
  if (charts.bubble) charts.bubble.destroy();

  const roleGroups = {};
  DEALS.filter(d => d.totalValue > 0).forEach(d => {
    const role = d.role.split('/')[0].split('(')[0].trim();
    if (!roleGroups[role]) roleGroups[role] = [];
    roleGroups[role].push(d);
  });

  const datasets = Object.entries(roleGroups).map(([role, deals]) => ({
    label: role,
    data: deals.map(d => ({
      x: d.duration || 3,
      y: d.annualValue || d.totalValue / (d.duration || 3),
      r: Math.max(4, Math.min(28, Math.sqrt(d.totalValue) * 1.4)),
      deal: d
    })),
    backgroundColor: roleColor(role) + 'cc',
    borderColor: roleColor(role),
    borderWidth: 1,
    hoverBorderWidth: 2,
  }));

  charts.bubble = new Chart(ctx, {
    type: 'bubble',
    data: { datasets },
    options: {
      ...baseOptions(),
      plugins: {
        ...baseOptions().plugins,
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            font: { family: "'IBM Plex Mono', monospace", size: 9 },
            padding: 12,
            boxWidth: 8,
            color: '#888ba0'
          }
        },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            title: items => items[0]?.raw?.deal?.talent || '',
            label: item => {
              const d = item.raw.deal;
              return [
                `  Studio: ${d.studio}`,
                `  Type: ${d.type} · ${d.role}`,
                `  Total: ${fmtM(d.totalValue)}`,
                `  Annual: ${fmtM(d.annualValue)}/yr`,
                `  Duration: ${d.duration}yr`,
                `  Status: ${d.status}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'DURATION (YEARS)', color: '#444760', font: { family: "'IBM Plex Mono'", size: 9 } },
          grid: { color: '#1e2130' },
          ticks: { color: '#888ba0' },
          min: 0, max: 8
        },
        y: {
          title: { display: true, text: 'ANNUAL VALUE ($M)', color: '#444760', font: { family: "'IBM Plex Mono'", size: 9 } },
          grid: { color: '#1e2130' },
          ticks: { color: '#888ba0', callback: v => `$${v}M` }
        }
      },
      onClick: (e, els) => {
        if (!els.length) return;
        const el = els[0];
        const deal = charts.bubble.data.datasets[el.datasetIndex].data[el.index].deal;
        openModal(deal);
      }
    }
  });
}

// ── TIMELINE CHART ────────────────────────────────────────────
function renderTimelineChart() {
  const ctx = document.getElementById('timelineChart');
  if (!ctx) return;
  if (charts.timeline) charts.timeline.destroy();

  const years = {};
  DEALS.forEach(d => {
    const y = d.startYear;
    years[y] = (years[y] || 0) + 1;
  });
  const labels = Object.keys(years).sort();
  const counts = labels.map(y => years[y]);
  let cum = 0;
  const cumCounts = counts.map(c => (cum += c));

  charts.timeline = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Deals Signed',
          data: counts,
          backgroundColor: '#e8b84b55',
          borderColor: '#e8b84b',
          borderWidth: 1,
          order: 2
        },
        {
          label: 'Cumulative',
          data: cumCounts,
          type: 'line',
          borderColor: '#6384ff',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#6384ff',
          tension: 0.3,
          order: 1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      ...baseOptions(),
      plugins: {
        ...baseOptions().plugins,
        legend: {
          display: true, position: 'top',
          labels: { font: { family: "'IBM Plex Mono'", size: 9 }, padding: 8, boxWidth: 8, color: '#888ba0' }
        }
      },
      scales: {
        x: { grid: { color: '#1e2130' }, ticks: { color: '#888ba0' } },
        y: { grid: { color: '#1e2130' }, ticks: { color: '#888ba0', stepSize: 1 } },
        y1: {
          position: 'right',
          grid: { display: false },
          ticks: { color: '#6384ff' }
        }
      }
    }
  });
}

// ── STATUS CHART ──────────────────────────────────────────────
function renderStatusChart() {
  const ctx = document.getElementById('statusChart');
  if (!ctx) return;
  if (charts.status) charts.status.destroy();

  const activeVal = DEALS.filter(d => d.status === 'Active' && d.totalValue > 0).reduce((s, d) => s + d.totalValue, 0);
  const expiredVal = DEALS.filter(d => d.status === 'Expired' && d.totalValue > 0).reduce((s, d) => s + d.totalValue, 0);

  charts.status = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Active', 'Expired'],
      datasets: [{
        data: [activeVal, expiredVal],
        backgroundColor: ['rgba(0,230,118,0.7)', 'rgba(255,255,255,0.08)'],
        borderColor: ['#00e676', '#252838'],
        borderWidth: 1,
        hoverOffset: 6
      }]
    },
    options: {
      ...baseOptions(),
      cutout: '65%',
      plugins: {
        ...baseOptions().plugins,
        legend: {
          display: true, position: 'bottom',
          labels: { font: { family: "'IBM Plex Mono'", size: 9 }, color: '#888ba0', padding: 12, boxWidth: 10 }
        },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: { label: item => ` ${fmtM(item.raw)} total value` }
        }
      }
    }
  });
}

// ── TALENT VALUE CHART ────────────────────────────────────────
function renderTalentValueChart() {
  const ctx = document.getElementById('talentValueChart');
  if (!ctx) return;
  if (charts.talentVal) charts.talentVal.destroy();

  // Group by talent, sum total values
  const byTalent = {};
  DEALS.forEach(d => {
    if (!byTalent[d.talent]) byTalent[d.talent] = { total: 0, deals: [] };
    byTalent[d.talent].total += d.totalValue;
    byTalent[d.talent].deals.push(d);
  });

  const sorted = Object.entries(byTalent)
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 25);

  const labels = sorted.map(([t]) => t);
  const vals = sorted.map(([, v]) => v.total);
  const colors = sorted.map(([, v]) => {
    const d = v.deals[0];
    return studioColor(d.studio) + 'cc';
  });
  const borderColors = sorted.map(([, v]) => studioColor(v.deals[0].studio));

  charts.talentVal = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Total Deal Value',
        data: vals,
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 0
      }]
    },
    options: {
      ...baseOptions(),
      indexAxis: 'y',
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            label: item => {
              const talent = labels[item.dataIndex];
              const info = byTalent[talent];
              const dealCount = info.deals.length;
              return [
                `  Total: ${fmtM(item.raw)}`,
                `  Deals: ${dealCount}`,
                `  Studios: ${[...new Set(info.deals.map(d => d.studio))].join(', ')}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#1e2130' },
          ticks: { color: '#888ba0', callback: v => fmtMShort(v) }
        },
        y: { grid: { display: false }, ticks: { color: '#e0e2ec', font: { size: 10 } } }
      },
      onClick: (e, els) => {
        if (!els.length) return;
        const talent = labels[els[0].index];
        const deal = byTalent[talent].deals.sort((a, b) => b.totalValue - a.totalValue)[0];
        openModal(deal);
      }
    }
  });
}

// ── ROLE VALUE CHART ──────────────────────────────────────────
function renderRoleValueChart() {
  const ctx = document.getElementById('roleValueChart');
  if (!ctx) return;
  if (charts.roleVal) charts.roleVal.destroy();

  const byRole = {};
  DEALS.filter(d => d.annualValue > 0).forEach(d => {
    const role = d.role.split('/')[0].split('(')[0].trim();
    if (!byRole[role]) byRole[role] = [];
    byRole[role].push(d.annualValue);
  });

  const entries = Object.entries(byRole)
    .map(([role, vals]) => ({
      role,
      avg: vals.reduce((s, v) => s + v, 0) / vals.length,
      max: Math.max(...vals),
      count: vals.length
    }))
    .filter(e => e.count >= 1)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 12);

  charts.roleVal = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: entries.map(e => e.role),
      datasets: [
        {
          label: 'Avg Annual Value',
          data: entries.map(e => e.avg),
          backgroundColor: entries.map(e => roleColor(e.role) + 'aa'),
          borderColor: entries.map(e => roleColor(e.role)),
          borderWidth: 1
        },
        {
          label: 'Max Annual Value',
          data: entries.map(e => e.max),
          backgroundColor: 'transparent',
          borderColor: entries.map(e => roleColor(e.role) + '66'),
          borderWidth: 1,
          borderDash: [4, 4],
          type: 'line',
          pointRadius: 3,
          pointBackgroundColor: entries.map(e => roleColor(e.role))
        }
      ]
    },
    options: {
      ...baseOptions(),
      plugins: {
        ...baseOptions().plugins,
        legend: {
          display: true, position: 'top',
          labels: { font: { family: "'IBM Plex Mono'", size: 9 }, color: '#888ba0', padding: 8, boxWidth: 8 }
        },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            label: item => ` ${item.dataset.label}: ${fmtM(item.raw)}/yr`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#888ba0', maxRotation: 30, font: { size: 9 } } },
        y: { grid: { color: '#1e2130' }, ticks: { color: '#888ba0', callback: v => fmtMShort(v) } }
      }
    }
  });
}

// ── STUDIO SPEND CHART ────────────────────────────────────────
function renderStudioSpendChart() {
  const ctx = document.getElementById('studioSpendChart');
  if (!ctx) return;
  if (charts.studioSpend) charts.studioSpend.destroy();

  const byStudio = {};
  DEALS.filter(d => d.totalValue > 0).forEach(d => {
    byStudio[d.studio] = (byStudio[d.studio] || 0) + d.totalValue;
  });

  const sorted = Object.entries(byStudio).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(([s]) => s);
  const vals = sorted.map(([, v]) => v);

  charts.studioSpend = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: vals,
        backgroundColor: labels.map(s => studioColor(s) + 'bb'),
        borderColor: labels.map(s => studioColor(s)),
        borderWidth: 1
      }]
    },
    options: {
      ...baseOptions(),
      indexAxis: 'y',
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: { label: item => ` Total committed: ${fmtM(item.raw)}` }
        }
      },
      scales: {
        x: { grid: { color: '#1e2130' }, ticks: { color: '#888ba0', callback: v => fmtMShort(v) } },
        y: { grid: { display: false }, ticks: { color: '#e0e2ec', font: { size: 10 } } }
      }
    }
  });
}

// ── STUDIO COUNT CHART ────────────────────────────────────────
function renderStudioCountChart() {
  const ctx = document.getElementById('studioCountChart');
  if (!ctx) return;
  if (charts.studioCount) charts.studioCount.destroy();

  const byStudio = {};
  DEALS.forEach(d => { byStudio[d.studio] = (byStudio[d.studio] || 0) + 1; });
  const sorted = Object.entries(byStudio).sort((a, b) => b[1] - a[1]).slice(0, 12);

  charts.studioCount = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(([s]) => s),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: sorted.map(([s]) => studioColor(s) + '88'),
        borderColor: sorted.map(([s]) => studioColor(s)),
        borderWidth: 1
      }]
    },
    options: {
      ...baseOptions(),
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: { label: item => ` ${item.raw} deals` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#888ba0', maxRotation: 35, font: { size: 9 } } },
        y: { grid: { color: '#1e2130' }, ticks: { color: '#888ba0', stepSize: 1 } }
      }
    }
  });
}

// ── STUDIO AVG CHART ──────────────────────────────────────────
function renderStudioAvgChart() {
  const ctx = document.getElementById('studioAvgChart');
  if (!ctx) return;
  if (charts.studioAvg) charts.studioAvg.destroy();

  const byStudio = {};
  DEALS.filter(d => d.totalValue > 0).forEach(d => {
    if (!byStudio[d.studio]) byStudio[d.studio] = [];
    byStudio[d.studio].push(d.totalValue);
  });

  const sorted = Object.entries(byStudio)
    .map(([s, vals]) => ({ studio: s, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  charts.studioAvg = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(e => e.studio),
      datasets: [{
        data: sorted.map(e => e.avg),
        backgroundColor: sorted.map(e => studioColor(e.studio) + '88'),
        borderColor: sorted.map(e => studioColor(e.studio)),
        borderWidth: 1
      }]
    },
    options: {
      ...baseOptions(),
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: { label: item => ` Avg deal: ${fmtM(item.raw)}` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#888ba0', maxRotation: 35, font: { size: 9 } } },
        y: { grid: { color: '#1e2130' }, ticks: { color: '#888ba0', callback: v => fmtMShort(v) } }
      }
    }
  });
}

// ── TYPE VALUE CHART ──────────────────────────────────────────
function renderTypeValueChart() {
  const ctx = document.getElementById('typeValueChart');
  if (!ctx) return;
  if (charts.typeVal) charts.typeVal.destroy();

  const byType = {};
  DEALS.filter(d => d.totalValue > 0).forEach(d => {
    byType[d.type] = (byType[d.type] || 0) + d.totalValue;
  });

  const labels = Object.keys(byType);
  const vals = labels.map(l => byType[l]);

  charts.typeVal = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: vals,
        backgroundColor: ['rgba(232,184,75,0.7)', 'rgba(99,132,255,0.7)', 'rgba(255,107,107,0.7)'],
        borderColor: ['#e8b84b', '#6384ff', '#ff6b6b'],
        borderWidth: 1,
        hoverOffset: 6
      }]
    },
    options: {
      ...baseOptions(),
      cutout: '60%',
      plugins: {
        ...baseOptions().plugins,
        legend: {
          display: true, position: 'bottom',
          labels: { font: { family: "'IBM Plex Mono'", size: 9 }, color: '#888ba0', padding: 12, boxWidth: 10 }
        },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: { label: item => ` ${fmtM(item.raw)} total` }
        }
      }
    }
  });
}

// ── DURATION CHART ────────────────────────────────────────────
function renderDurationChart() {
  const ctx = document.getElementById('durationChart');
  if (!ctx) return;
  if (charts.duration) charts.duration.destroy();

  const bins = { '1yr': 0, '2yr': 0, '3yr': 0, '4yr': 0, '5yr': 0, '6yr+': 0 };
  DEALS.forEach(d => {
    if (!d.duration) return;
    if (d.duration === 1) bins['1yr']++;
    else if (d.duration === 2) bins['2yr']++;
    else if (d.duration === 3) bins['3yr']++;
    else if (d.duration === 4) bins['4yr']++;
    else if (d.duration === 5) bins['5yr']++;
    else bins['6yr+']++;
  });

  charts.duration = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(bins),
      datasets: [{
        data: Object.values(bins),
        backgroundColor: Object.keys(bins).map((_, i) => {
          const colors = ['#ff6b6b88', '#ff9f6b88', '#e8b84b88', '#00e67688', '#6384ff88', '#a78bfa88'];
          return colors[i];
        }),
        borderColor: Object.keys(bins).map((_, i) => {
          const colors = ['#ff6b6b', '#ff9f6b', '#e8b84b', '#00e676', '#6384ff', '#a78bfa'];
          return colors[i];
        }),
        borderWidth: 1
      }]
    },
    options: {
      ...baseOptions(),
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: { label: item => ` ${item.raw} deals` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#888ba0' } },
        y: { grid: { color: '#1e2130' }, ticks: { color: '#888ba0', stepSize: 1 } }
      }
    }
  });
}

// ── CATEGORY CHART ────────────────────────────────────────────
function renderCategoryChart() {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  if (charts.category) charts.category.destroy();

  const byCategory = {};
  DEALS.forEach(d => { byCategory[d.category] = (byCategory[d.category] || 0) + 1; });
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(([c]) => c),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: ['rgba(232,184,75,0.7)', 'rgba(99,132,255,0.7)', 'rgba(255,107,107,0.7)', 'rgba(0,230,118,0.7)'],
        borderColor: ['#e8b84b', '#6384ff', '#ff6b6b', '#00e676'],
        borderWidth: 1,
        hoverOffset: 6
      }]
    },
    options: {
      ...baseOptions(),
      cutout: '55%',
      plugins: {
        ...baseOptions().plugins,
        legend: {
          display: true, position: 'bottom',
          labels: { font: { family: "'IBM Plex Mono'", size: 9 }, color: '#888ba0', padding: 10, boxWidth: 10 }
        },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: { label: item => ` ${item.raw} deals` }
        }
      }
    }
  });
}

// ── TYPE ANNUAL VALUE CHART ───────────────────────────────────
function renderTypeAnnualChart() {
  const ctx = document.getElementById('typeAnnualChart');
  if (!ctx) return;
  if (charts.typeAnnual) charts.typeAnnual.destroy();

  const byType = {};
  DEALS.filter(d => d.annualValue > 0).forEach(d => {
    if (!byType[d.type]) byType[d.type] = [];
    byType[d.type].push(d.annualValue);
  });

  const types = Object.keys(byType);
  const avgs = types.map(t => byType[t].reduce((s, v) => s + v, 0) / byType[t].length);
  const maxes = types.map(t => Math.max(...byType[t]));
  const mins = types.map(t => Math.min(...byType[t]));

  const colors = { 'Overall': '#e8b84b', 'First Look': '#6384ff', 'Exclusive': '#ff6b6b' };

  charts.typeAnnual = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: types,
      datasets: [
        {
          label: 'Average Annual',
          data: avgs,
          backgroundColor: types.map(t => (colors[t] || '#888') + 'aa'),
          borderColor: types.map(t => colors[t] || '#888'),
          borderWidth: 1
        },
        {
          label: 'Max Annual',
          data: maxes,
          type: 'line',
          borderColor: types.map(t => colors[t] || '#888'),
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 5,
          pointBackgroundColor: types.map(t => colors[t] || '#888'),
          borderDash: [4, 4]
        }
      ]
    },
    options: {
      ...baseOptions(),
      plugins: {
        ...baseOptions().plugins,
        legend: {
          display: true, position: 'top',
          labels: { font: { family: "'IBM Plex Mono'", size: 9 }, color: '#888ba0', padding: 8, boxWidth: 8 }
        },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: { label: item => ` ${item.dataset.label}: ${fmtM(item.raw)}/yr` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#888ba0' } },
        y: {
          grid: { color: '#1e2130' },
          ticks: { color: '#888ba0', callback: v => fmtMShort(v) }
        }
      }
    }
  });
}

// ── RACE CHART ────────────────────────────────────────────────
function buildRaceChart() {
  const ctx = document.getElementById('raceChart');
  if (!ctx) return;

  // Build cumulative spend per studio per year
  const allYears = [...new Set(DEALS.map(d => d.startYear))].sort();
  const minYear = Math.min(...allYears);
  const maxYear = 2026;
  raceYears = [];
  for (let y = minYear; y <= maxYear; y++) raceYears.push(y);

  const studios = [...new Set(DEALS.filter(d => d.totalValue > 0).map(d => d.studio))];

  // For each studio, cumulative spend through each year
  const studioCumulative = {};
  studios.forEach(s => {
    let cum = 0;
    studioCumulative[s] = raceYears.map(y => {
      DEALS.filter(d => d.studio === s && d.startYear === y && d.totalValue > 0).forEach(d => {
        cum += d.totalValue;
      });
      return cum;
    });
  });

  // Build initial chart (at minYear)
  raceFrame = 0;
  const yearData = getRaceDataForFrame(studios, studioCumulative, raceFrame);

  if (charts.race) charts.race.destroy();
  charts.race = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: yearData.labels,
      datasets: [{
        data: yearData.values,
        backgroundColor: yearData.colors.map(c => c + 'bb'),
        borderColor: yearData.colors,
        borderWidth: 1
      }]
    },
    options: {
      ...baseOptions(),
      indexAxis: 'y',
      animation: { duration: 600, easing: 'easeInOutQuart' },
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: { label: item => ` ${fmtM(item.raw)} committed` }
        }
      },
      scales: {
        x: {
          grid: { color: '#1e2130' },
          ticks: { color: '#888ba0', callback: v => fmtMShort(v) },
          min: 0,
          max: 1600
        },
        y: {
          grid: { display: false },
          ticks: { color: '#e0e2ec', font: { size: 10 } }
        }
      }
    },
    // store for race
    _studios: studios,
    _studioCumulative: studioCumulative
  });

  document.getElementById('racePlay')?.addEventListener('click', toggleRace);
  document.getElementById('raceReset')?.addEventListener('click', resetRace);
  updateRaceYearDisplay();
}

function getRaceDataForFrame(studios, studioCumulative, frame) {
  const entries = studios
    .map(s => ({ studio: s, value: studioCumulative[s][frame] }))
    .filter(e => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  return {
    labels: entries.map(e => e.studio),
    values: entries.map(e => e.value),
    colors: entries.map(e => studioColor(e.studio))
  };
}

function toggleRace() {
  if (raceRunning) {
    clearInterval(raceInterval);
    raceRunning = false;
    document.getElementById('racePlay').textContent = '▶ PLAY';
  } else {
    if (raceFrame >= raceYears.length - 1) raceFrame = 0;
    raceRunning = true;
    document.getElementById('racePlay').textContent = '⏸ PAUSE';
    raceInterval = setInterval(advanceRace, 700);
  }
}

function advanceRace() {
  if (raceFrame >= raceYears.length - 1) {
    clearInterval(raceInterval);
    raceRunning = false;
    document.getElementById('racePlay').textContent = '▶ PLAY';
    return;
  }
  raceFrame++;
  updateRaceChart();
}

function resetRace() {
  clearInterval(raceInterval);
  raceRunning = false;
  raceFrame = 0;
  document.getElementById('racePlay').textContent = '▶ PLAY';
  updateRaceChart();
}

function updateRaceChart() {
  if (!charts.race) return;
  const { _studios, _studioCumulative } = charts.race;
  const yearData = getRaceDataForFrame(_studios, _studioCumulative, raceFrame);
  charts.race.data.labels = yearData.labels;
  charts.race.data.datasets[0].data = yearData.values;
  charts.race.data.datasets[0].backgroundColor = yearData.colors.map(c => c + 'bb');
  charts.race.data.datasets[0].borderColor = yearData.colors;
  charts.race.update();
  updateRaceYearDisplay();
}

function updateRaceYearDisplay() {
  const el = document.getElementById('raceYearVal');
  if (el && raceYears[raceFrame]) el.textContent = raceYears[raceFrame];
}

// ── KICK IT OFF ────────────────────────────────────────────────
loadDeals();
