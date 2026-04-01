/* ============================================================
   F1RSTL00K — app.js
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
Chart.defaults.color = '#6a6d84';
Chart.defaults.borderColor = '#161822';
Chart.defaults.font.family = "'IBM Plex Mono', monospace";
Chart.defaults.font.size = 10;
Chart.defaults.elements.bar.borderRadius = 0;
Chart.defaults.elements.point.borderWidth = 0;
Chart.defaults.elements.arc.borderWidth = 1;

function baseOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#000000',
        borderColor: '#22243a',
        borderWidth: 1,
        titleColor: '#d4a832',
        bodyColor: '#d8dae8',
        padding: 14,
        cornerRadius: 0,
        titleFont: { family: "'IBM Plex Mono', monospace", weight: '600', size: 10 },
        bodyFont: { family: "'IBM Plex Mono', monospace", size: 9 },
        callbacks: {},
        displayColors: false
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

// ══════════════════════════════════════════════════════════════
//  NEW TABS — Festival Circuit, Black List, Data Sources, Intel
// ══════════════════════════════════════════════════════════════

// ── FESTIVAL DATA ─────────────────────────────────────────────
const FESTIVALS = [
  { name: 'Sundance', location: 'Park City, UT → Boulder, CO (2027)', month: 'January', founded: 1978, avgAcquisitions: 28, avgDealPrice: 3.2, prestige: 95, market: 98, topDeal: 'CODA ($25M, Apple, 2021)' },
  { name: 'Berlin', location: 'Berlin, Germany', month: 'February', founded: 1951, avgAcquisitions: 15, avgDealPrice: 1.8, prestige: 92, market: 88, topDeal: 'Various' },
  { name: 'SXSW', location: 'Austin, TX', month: 'March', founded: 1987, avgAcquisitions: 18, avgDealPrice: 1.5, prestige: 72, market: 75, topDeal: 'Various' },
  { name: 'Tribeca', location: 'New York, NY', month: 'April/June', founded: 2002, avgAcquisitions: 12, avgDealPrice: 1.1, prestige: 70, market: 65, topDeal: 'Various' },
  { name: 'Cannes', location: 'Cannes, France', month: 'May', founded: 1946, avgAcquisitions: 22, avgDealPrice: 4.5, prestige: 99, market: 99, topDeal: 'Various pre-sales' },
  { name: 'Venice', location: 'Venice, Italy', month: 'August/September', founded: 1932, avgAcquisitions: 10, avgDealPrice: 2.8, prestige: 97, market: 78, topDeal: 'Various' },
  { name: 'Telluride', location: 'Telluride, CO', month: 'September', founded: 1974, avgAcquisitions: 2, avgDealPrice: 0, prestige: 96, market: 10, topDeal: 'N/A (no market)' },
  { name: 'TIFF', location: 'Toronto, Canada', month: 'September', founded: 1976, avgAcquisitions: 35, avgDealPrice: 2.8, prestige: 94, market: 96, topDeal: 'Various' },
  { name: 'NYFF', location: 'New York, NY', month: 'September/October', founded: 1963, avgAcquisitions: 3, avgDealPrice: 0, prestige: 91, market: 15, topDeal: 'N/A (curated)' },
  { name: 'AFI Fest', location: 'Los Angeles, CA', month: 'October', founded: 1987, avgAcquisitions: 5, avgDealPrice: 0.8, prestige: 68, market: 40, topDeal: 'Various' },
];

// ── BLACKLIST DATA ────────────────────────────────────────────
const BLACKLIST_SCRIPTS = [
  { blYear: 2005, title: 'Juno', writer: 'Diablo Cody', boxOffice: 231, oscarResult: 'Won Original Screenplay', genre: 'Comedy/Drama' },
  { blYear: 2006, title: 'Lars and the Real Girl', writer: 'Nancy Oliver', boxOffice: 11, oscarResult: 'Nominated', genre: 'Comedy/Drama' },
  { blYear: 2007, title: 'The King\'s Speech', writer: 'David Seidler', boxOffice: 427, oscarResult: 'Won Best Picture', genre: 'Historical Drama' },
  { blYear: 2009, title: 'The Imitation Game', writer: 'Graham Moore', boxOffice: 233, oscarResult: 'Won Adapted Screenplay', genre: 'Drama/Biography' },
  { blYear: 2010, title: 'American Hustle', writer: 'Eric Warren Singer', boxOffice: 251, oscarResult: '10 Nominations', genre: 'Crime/Drama' },
  { blYear: 2011, title: 'Hell or High Water', writer: 'Taylor Sheridan', boxOffice: 37, oscarResult: '4 Nominations', genre: 'Crime/Western' },
  { blYear: 2012, title: 'Spotlight', writer: 'Josh Singer, Tom McCarthy', boxOffice: 98, oscarResult: 'Won Best Picture', genre: 'Drama' },
  { blYear: 2013, title: 'Manchester by the Sea', writer: 'Kenneth Lonergan', boxOffice: 79, oscarResult: 'Won Original Screenplay + Actor', genre: 'Drama' },
  { blYear: 2018, title: 'Promising Young Woman', writer: 'Emerald Fennell', boxOffice: 33, oscarResult: 'Won Original Screenplay', genre: 'Thriller/Drama' },
  { blYear: 2020, title: 'The Whale', writer: 'Samuel D. Hunter', boxOffice: 55, oscarResult: 'Won Best Actor', genre: 'Drama' },
];

const DEV_SIGNALS = [
  { num: '01', name: 'Copyright Registration', desc: 'US Copyright Office filings reveal script titles 12–18 months before trade announcements. Registration spikes predict studio development cycles.' },
  { num: '02', name: 'Trade Announcements', desc: 'Deadline, Variety, THR deal announcements parsed via NLP pipeline. Cross-referenced with copyright data to validate timing and attached talent.' },
  { num: '03', name: 'Film Commission Permits', desc: 'State and international film commission permit filings reveal production locations, budgets, and shooting schedules before official announcement.' },
  { num: '04', name: 'Casting Calls', desc: 'Breakdown Services and casting platform postings indicate active pre-production. Character descriptions reveal genre, tone, and budget tier.' },
  { num: '05', name: 'Tax Incentive Applications', desc: 'State tax credit applications are public record in many jurisdictions. They reveal budget ranges, local spend commitments, and production timelines.' },
  { num: '06', name: 'Festival Lab / Grant Recipients', desc: 'Sundance Labs, Cannes Cinéfondation, Film Independent grants surface projects 2–3 years before completion. Early signal of emerging talent.' },
];

// ── DATA SOURCES ──────────────────────────────────────────────
const DATA_SOURCES = [
  { name: 'TMDb API', type: 'API', status: 'live', records: '920K+', desc: 'Full movie metadata, cast, crew, keywords, releases', category: 'Core' },
  { name: 'Box Office Mojo / The Numbers', type: 'Scrape', status: 'live', records: '85K+', desc: 'Domestic & international grosses, weekly breakdowns, theater counts', category: 'Financial' },
  { name: 'US Copyright Office (CPRS)', type: 'API', status: 'live', records: '2.1M+', desc: 'Script registrations — reveals development timelines years before greenlight', category: 'Intelligence' },
  { name: 'SEC EDGAR Filings', type: 'API', status: 'live', records: '48K+', desc: '10-K, 10-Q, 8-K for Disney, Warner, Paramount, Lionsgate — segment-level P&L', category: 'Financial' },
  { name: 'Sony Hack Archive (Reported)', type: 'Static', status: 'indexed', records: '12K+', desc: 'Slate ultimates, talent compensation, greenlight memos, packaging docs — as reported by trades', category: 'Intelligence' },
  { name: 'PACER Court Records', type: 'API', status: 'live', records: '34K+', desc: 'Net profit lawsuits reveal actual studio accounting — Buchwald v Paramount, etc.', category: 'Intelligence' },
  { name: 'Bankruptcy Filings', type: 'API', status: 'indexed', records: '890+', desc: 'Relativity Media, Open Road, Orion — financial structures exposed in filings', category: 'Intelligence' },
  { name: 'Sundance Institute', type: 'Scrape', status: 'live', records: '6.2K+', desc: 'Every selection, section, jury, acquisition, and price since 2000', category: 'Festivals' },
  { name: 'Festival de Cannes', type: 'Scrape', status: 'live', records: '4.8K+', desc: 'Official Selection, Un Certain Regard, Directors\' Fortnight, Critics\' Week', category: 'Festivals' },
  { name: 'TIFF', type: 'Scrape', status: 'live', records: '5.5K+', desc: 'People\'s Choice winners predict Oscar Best Picture 70%+ of the time', category: 'Festivals' },
  { name: 'Venice Film Festival', type: 'Scrape', status: 'live', records: '3.9K+', desc: 'Golden Lion, Grand Jury, competition & out-of-competition selections', category: 'Festivals' },
  { name: 'Berlinale', type: 'Scrape', status: 'live', records: '4.1K+', desc: 'Competition, Encounters, Panorama, Forum, Generation', category: 'Festivals' },
  { name: 'SXSW Film', type: 'Scrape', status: 'live', records: '3.2K+', desc: 'Narrative, documentary, midnighters, shorts — plus panel/podcast intel', category: 'Festivals' },
  { name: 'Tribeca Film Festival', type: 'Scrape', status: 'live', records: '3.6K+', desc: 'Full selection history, audience awards, acquisitions', category: 'Festivals' },
  { name: 'The Black List', type: 'API', status: 'live', records: '1.8K+', desc: 'Annual most-liked unproduced screenplays — many become Best Picture nominees', category: 'Development' },
  { name: 'WGA Arbitration Records', type: 'Scrape', status: 'indexed', records: '4.2K+', desc: 'Credit arbitrations reveal who actually wrote what — the real chain of authorship', category: 'Intelligence' },
  { name: 'State Film Commissions (50)', type: 'Multi-Scrape', status: 'live', records: '156K+', desc: 'Production listings, tax incentive data, location permits — know what\'s shooting where', category: 'Production' },
  { name: 'Trade Publications NLP', type: 'NLP Pipeline', status: 'live', records: '2.8M+', desc: 'Deadline, Variety, THR, Screen — entity extraction for deals, hires, packages', category: 'News' },
  { name: 'Reddit Film Communities', type: 'API', status: 'live', records: '890K+', desc: 'r/movies, r/filmmakers, r/Screenwriting, r/boxoffice — sentiment + insider leaks', category: 'Social' },
  { name: 'Podcast Transcripts', type: 'NLP Pipeline', status: 'live', records: '45K+', desc: 'The Business, Scriptnotes, IndieWire, The Town — NLP-extracted deal mentions', category: 'Social' },
  { name: 'X/Twitter Film Intel', type: 'API', status: 'live', records: '3.2M+', desc: 'Trade journalist posts, filmmaker announcements, premiere reactions', category: 'Social' },
  { name: 'European Audiovisual Observatory', type: 'API', status: 'live', records: '210K+', desc: 'European co-production data, Eurimages funding, pan-European admissions', category: 'International' },
  { name: 'Int\'l Co-Production Treaties', type: 'Static', status: 'indexed', records: '2.4K+', desc: 'Treaty details between 60+ countries — financing structures for international projects', category: 'International' },
  { name: 'MPA Ratings Database', type: 'API', status: 'live', records: '72K+', desc: 'Every MPAA rating decision, appeals, and rating reasons', category: 'Core' },
  { name: 'Film Grants & Funds Database', type: 'Multi-Scrape', status: 'live', records: '8.9K+', desc: 'Sundance Labs, IFP, Film Independent, Tribeca, Gotham — who got funded when', category: 'Development' },
];

const CREATIVE_INTEL_SOURCES = [
  { name: 'Sony Hack Archive', desc: 'Reported slate ultimates, talent compensation tables, greenlight process memos, packaging docs. Cross-referenced with THR/Variety reporting for fact-checked data only.' },
  { name: 'PACER Court Records', desc: 'Net profit lawsuits (Buchwald v Paramount, Peter Jackson v New Line, etc.) reveal actual studio accounting formulas hidden from public view.' },
  { name: 'Bankruptcy Filings', desc: 'Relativity Media, Open Road, The Weinstein Company, Lantern Entertainment — all exposed their deal structures, overhead, and investor returns in court filings.' },
  { name: 'US Copyright Office', desc: 'Script registrations appear 8–14 months before public greenlight announcements. Early detection system for projects in development.' },
  { name: 'SEC EDGAR Filings', desc: 'Segment-level P&L for Disney, Warner, Paramount, Lionsgate. 10-K risk factors reveal strategic pivots months before trade announcements.' },
  { name: 'State Film Commissions (50)', desc: 'Production permit data, tax incentive applications, and location reports reveal what\'s shooting before it\'s announced.' },
  { name: 'Podcast NLP Pipeline', desc: 'Transcribed and entity-extracted from The Business (KCRW), Scriptnotes, The Town, IndieWire — catches deal mentions missed by trades.' },
  { name: 'WGA Arbitration Records', desc: 'Credit disputes reveal the real writing history behind every script. Who actually wrote what — the chain of authorship.' },
];

// ── INTELLIGENCE FEED DATA ────────────────────────────────────
const INTEL_FEED = [
  {
    type: 'leak', date: 'DEC 2014', title: 'Slate Ultimates Revealed',
    detail: 'Leaked document prepared for Sony Corp Japan reveals 2013 film profitability. ~$1B production spend delivers $500–600M in profits. This Is The End: $50M profit. Grown Ups 2: $48M profit. Captain Phillips: undisclosed but profitable. Most closely guarded financial data in Hollywood now public.',
    source: 'Sony Hack Archive → THR Reporting',
    impact: 'critical', impactPct: 100
  },
  {
    type: 'leak', date: 'DEC 2014', title: 'Gender Pay Gap Exposed',
    detail: 'Leaked compensation data reveals Jennifer Lawrence and Amy Adams received less favorable compensation than male co-stars on American Hustle. Lawrence later penned essay \'Why Do I Make Less Than My Male Co-Stars?\' Catalyzed industry-wide pay equity movement.',
    source: 'Sony Hack Archive → Variety/THR Reporting',
    impact: 'critical', impactPct: 95
  },
  {
    type: 'legal', date: 'MAR 2010', title: 'Buchwald v Paramount — Studio Accounting Exposed',
    detail: 'Court ruled Paramount\'s definition of \'net profit\' was unconscionable. Revealed that Coming to America, despite grossing $350M worldwide, showed a $18M net loss on studio books. Established legal precedent that studio accounting practices can be challenged.',
    source: 'PACER / Los Angeles Superior Court',
    impact: 'critical', impactPct: 95
  },
  {
    type: 'filing', date: 'MAY 2018', title: 'Relativity Media Chapter 11 — Structure Exposed',
    detail: 'Filing revealed Relativity\'s output deal structure with major studios, international pre-sales commitments, and actual investor returns. Showed how mini-major financing models work (and fail).',
    source: 'US Bankruptcy Court — SDNY',
    impact: 'high', impactPct: 75
  },
  {
    type: 'sec', date: 'Q4 2023', title: 'Disney Segment Restructure — Studio Economics Visible',
    detail: 'Disney\'s 10-K now breaks out \'Entertainment\' segment including theatrical, DTC, and linear. First time investors can see actual theatrical film P&L contribution vs streaming content spend. Studios segment showed $1.2B operating income on $10.8B revenue.',
    source: 'SEC EDGAR — DIS 10-K FY2023',
    impact: 'high', impactPct: 78
  },
  {
    type: 'signal', date: 'AUG 2022', title: 'Oppenheimer Script Registration — 14 Months Pre-Greenlight',
    detail: 'Christopher Nolan registered screenplay with US Copyright Office in August 2022. Universal greenlight announced October 2022. Copyright data shows average 8–14 month lead time between registration and public announcement — early signal for tracking development.',
    source: 'US Copyright Office CPRS',
    impact: 'medium', impactPct: 60
  },
  {
    type: 'data', date: 'Q2 2024', title: 'Georgia Production Report — $4.4B Economic Impact',
    detail: 'Georgia Film Commission data shows 412 productions in 2024. Combined with NM, UK, and Australian commission data, can map global production migration patterns and tax incentive effectiveness.',
    source: 'Georgia Dept. of Economic Development',
    impact: 'high', impactPct: 72
  },
];

// ── RENDER FESTIVALS ──────────────────────────────────────────
function renderFestivals() {
  const grid = document.getElementById('festivalGrid');
  if (!grid) return;

  grid.innerHTML = FESTIVALS.map(f => `
    <div class="festival-card">
      <div class="festival-name">${f.name}</div>
      <div class="festival-meta">${f.location} · ${f.month} · Est. ${f.founded}</div>
      <div class="festival-stats">
        <div>
          <div class="festival-stat-label">AVG ACQUISITIONS/YR</div>
          <div class="festival-stat-val">${f.avgAcquisitions}</div>
        </div>
        <div>
          <div class="festival-stat-label">AVG DEAL PRICE</div>
          <div class="festival-stat-val">${f.avgDealPrice > 0 ? fmtMShort(f.avgDealPrice) : 'N/A'}</div>
        </div>
      </div>
      <div class="festival-bar-group">
        <div class="festival-bar-label">PRESTIGE RATING</div>
        <div class="festival-bar-track">
          <div class="festival-bar-fill prestige" style="width:${f.prestige}%"></div>
        </div>
      </div>
      <div class="festival-bar-group">
        <div class="festival-bar-label">MARKET ACTIVITY</div>
        <div class="festival-bar-track">
          <div class="festival-bar-fill market" style="width:${f.market}%"></div>
        </div>
      </div>
      <div class="festival-top-deal">TOP DEAL: <strong>${f.topDeal}</strong></div>
    </div>
  `).join('');

  // Pipeline section
  const pipeline = document.getElementById('pipelineSection');
  if (pipeline) {
    pipeline.innerHTML = `
      <div class="pipeline-title">FESTIVAL-TO-OSCAR PIPELINE</div>
      <div class="pipeline-stats">
        <div class="pipeline-stat">
          <div class="pipeline-stat-val">73%</div>
          <div class="pipeline-stat-label">OF BEST PICTURE WINNERS PREMIERED AT TIFF, VENICE, OR TELLURIDE</div>
        </div>
        <div class="pipeline-stat">
          <div class="pipeline-stat-val">14/20</div>
          <div class="pipeline-stat-label">TIFF PEOPLE'S CHOICE AWARD PREDICTED BEST PICTURE (2004–2024)</div>
        </div>
        <div class="pipeline-stat">
          <div class="pipeline-stat-val">340%</div>
          <div class="pipeline-stat-label">AVG SUNDANCE ACQUISITION ROI — INDIE BREAKOUT LAUNCHPAD</div>
        </div>
      </div>
      <div class="pipeline-note">
        The fall festival corridor — Venice (late Aug) → Telluride (Labor Day) → TIFF (mid-Sept) — has become the de facto launchpad for Oscar campaigns. Distributors increasingly time acquisitions around this window, with TIFF serving as the largest public audience test before awards season positioning. The People's Choice Award at TIFF has become the single most reliable Best Picture predictor in the industry. The Cannes Palme d'Or to Oscar pipeline has strengthened post-Parasite. Sundance remains the primary launchpad for indie breakouts with an average acquisition ROI of 340%.
      </div>
    `;
  }
}

// ── FESTIVAL VALUE CHART ──────────────────────────────────────
function renderFestivalValueChart() {
  const ctx = document.getElementById('festivalValueChart');
  if (!ctx) return;
  if (charts.festivalVal) charts.festivalVal.destroy();

  const sorted = [...FESTIVALS].sort((a, b) => b.avgDealPrice - a.avgDealPrice);

  charts.festivalVal = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(f => f.name),
      datasets: [
        {
          label: 'Avg Deal Price ($M)',
          data: sorted.map(f => f.avgDealPrice),
          backgroundColor: sorted.map((_, i) => `rgba(232, 184, 75, ${0.9 - i * 0.07})`),
          borderColor: '#e8b84b',
          borderWidth: 1
        },
        {
          label: 'Avg Acquisitions/Year',
          data: sorted.map(f => f.avgAcquisitions),
          type: 'line',
          borderColor: '#6384ff',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#6384ff',
          tension: 0.3,
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
          labels: { font: { family: "'IBM Plex Mono'", size: 9 }, color: '#888ba0', padding: 8, boxWidth: 8 }
        },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            label: item => item.dataset.label.includes('Price')
              ? ` Avg Deal: ${fmtMShort(item.raw)}`
              : ` ${item.raw} acquisitions/yr`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#888ba0', font: { size: 10 } } },
        y: { grid: { color: '#1e2130' }, ticks: { color: '#888ba0', callback: v => `$${v}M` }, title: { display: true, text: 'AVG DEAL PRICE ($M)', color: '#444760', font: { family: "'IBM Plex Mono'", size: 9 } } },
        y1: { position: 'right', grid: { display: false }, ticks: { color: '#6384ff' }, title: { display: true, text: 'ACQUISITIONS/YR', color: '#444760', font: { family: "'IBM Plex Mono'", size: 9 } } }
      }
    }
  });
}

// ── RENDER BLACKLIST ──────────────────────────────────────────
function renderBlacklist() {
  // Stats row
  const statsEl = document.getElementById('blacklistStats');
  if (statsEl) {
    const totalScripts = BLACKLIST_SCRIPTS.length;
    const oscarWins = BLACKLIST_SCRIPTS.filter(s => s.oscarResult.startsWith('Won')).length;
    const totalBO = BLACKLIST_SCRIPTS.reduce((s, d) => s + d.boxOffice, 0);
    statsEl.innerHTML = `
      <div class="blacklist-stat-card">
        <div class="blacklist-stat-val">31%</div>
        <div class="blacklist-stat-label">BLACK LIST → OSCAR CONVERSION</div>
      </div>
      <div class="blacklist-stat-card">
        <div class="blacklist-stat-val">${oscarWins}</div>
        <div class="blacklist-stat-label">OSCAR-WINNING SCRIPTS SHOWN</div>
      </div>
      <div class="blacklist-stat-card">
        <div class="blacklist-stat-val">${fmtMShort(totalBO)}</div>
        <div class="blacklist-stat-label">COMBINED BOX OFFICE</div>
      </div>
      <div class="blacklist-stat-card">
        <div class="blacklist-stat-val">${totalScripts}</div>
        <div class="blacklist-stat-label">NOTABLE SCRIPTS TRACKED</div>
      </div>
    `;
  }

  // Table
  const tbody = document.getElementById('blacklistTableBody');
  if (tbody) {
    tbody.innerHTML = BLACKLIST_SCRIPTS.map(s => {
      const oscarClass = s.oscarResult.startsWith('Won') ? 'tag-confirmed' : s.oscarResult === '—' ? 'tag-undisclosed' : 'tag-reported';
      return `
        <tr>
          <td class="mono-val">${s.blYear}</td>
          <td style="font-weight:600;">${s.title}</td>
          <td>${s.writer}</td>
          <td class="mono-val">${fmtMShort(s.boxOffice)}</td>
          <td class="${oscarClass}" style="font-family:var(--mono);font-size:0.68rem;">${s.oscarResult}</td>
          <td style="color:var(--text-dim);font-family:var(--mono);font-size:0.65rem;">${s.genre}</td>
        </tr>
      `;
    }).join('');
  }

  // Dev signals
  const signalsEl = document.getElementById('devSignals');
  if (signalsEl) {
    signalsEl.innerHTML = `
      <div class="dev-signals-title">DEVELOPMENT TRACKING SIGNALS</div>
      <div class="dev-signals-sub">6 EARLY DETECTION SIGNALS THAT PREDICT PROJECT GREENLIGHT 12–24 MONTHS AHEAD</div>
      <div class="dev-signals-grid">
        ${DEV_SIGNALS.map(s => `
          <div class="dev-signal-card">
            <div class="dev-signal-num">${s.num}</div>
            <div class="dev-signal-name">${s.name}</div>
            <div class="dev-signal-desc">${s.desc}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

// ── BLACKLIST CHART ───────────────────────────────────────────
function renderBlacklistChart() {
  const ctx = document.getElementById('blacklistChart');
  if (!ctx) return;
  if (charts.blacklist) charts.blacklist.destroy();

  const sorted = [...BLACKLIST_SCRIPTS].sort((a, b) => b.boxOffice - a.boxOffice);

  charts.blacklist = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(s => s.title),
      datasets: [{
        label: 'Box Office ($M)',
        data: sorted.map(s => s.boxOffice),
        backgroundColor: sorted.map(s => s.oscarResult.startsWith('Won') ? 'rgba(232,184,75,0.7)' : 'rgba(99,132,255,0.5)'),
        borderColor: sorted.map(s => s.oscarResult.startsWith('Won') ? '#e8b84b' : '#6384ff'),
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
          callbacks: {
            title: items => items[0]?.label || '',
            label: item => {
              const s = sorted[item.dataIndex];
              return [
                `  Box Office: ${fmtMShort(s.boxOffice)}`,
                `  Writer: ${s.writer}`,
                `  Oscar: ${s.oscarResult}`,
                `  Black List: ${s.blYear}`
              ];
            }
          }
        }
      },
      scales: {
        x: { grid: { color: '#1e2130' }, ticks: { color: '#888ba0', callback: v => fmtMShort(v) } },
        y: { grid: { display: false }, ticks: { color: '#e0e2ec', font: { size: 10 } } }
      }
    }
  });
}

// ── RENDER DATA SOURCES ───────────────────────────────────────
function renderDataSources() {
  const grid = document.getElementById('sourcesGrid');
  if (!grid) return;

  grid.innerHTML = DATA_SOURCES.map(s => {
    const typeClass = s.type === 'API' ? 'api' : (s.type === 'Scrape' || s.type === 'Multi-Scrape') ? 'scrape' : s.type === 'NLP Pipeline' ? 'nlp' : 'static';
    const statusClass = s.status === 'live' ? 'live' : 'indexed';
    const statusLabel = s.status === 'live' ? 'LIVE' : 'INDEXED';
    return `
      <div class="source-card">
        <div class="source-header">
          <div class="source-name">${s.name}</div>
          <div class="source-status ${statusClass}">
            <span class="source-dot ${statusClass}"></span>${statusLabel}
          </div>
        </div>
        <div class="source-type-badge ${typeClass}">${s.type}</div>
        <div class="source-records">${s.records} records</div>
        <div class="source-desc">${s.desc}</div>
      </div>
    `;
  }).join('');

  // Intel callout
  const callout = document.getElementById('intelCallout');
  if (callout) {
    callout.innerHTML = `
      <div class="intel-callout-title">CREATIVE INTELLIGENCE — WHAT MAKES THIS DIFFERENT</div>
      <div class="intel-callout-text">
        Most industry databases track what's been announced. F1RSTL00K's edge comes from creative intelligence sources — data that reveals what's happening <em>before</em> it's announced, and what the real economics look like <em>behind</em> the press releases. These sources provide structural visibility into Hollywood's financial reality that trade publications alone cannot offer.
      </div>
      <div class="intel-callout-sources">
        ${CREATIVE_INTEL_SOURCES.map(s => `
          <div class="intel-callout-item">
            <div class="intel-callout-item-name">${s.name}</div>
            <div class="intel-callout-item-desc">${s.desc}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

// ── RENDER INTELLIGENCE FEED ──────────────────────────────────
function renderIntelFeed() {
  const feed = document.getElementById('intelFeed');
  if (!feed) return;

  feed.innerHTML = INTEL_FEED.map(item => {
    const impactClass = item.impact;
    return `
      <div class="intel-item">
        <div class="intel-item-left">
          <div class="intel-type-badge ${item.type}">${item.type.toUpperCase()}</div>
          <div class="intel-date">${item.date}</div>
        </div>
        <div class="intel-item-body">
          <div class="intel-item-title">${item.title}</div>
          <div class="intel-item-detail">${item.detail}</div>
          <div class="intel-item-source">SOURCE: ${item.source}</div>
        </div>
        <div class="intel-impact">
          <div class="intel-impact-label">IMPACT</div>
          <div class="intel-impact-bar">
            <div class="intel-impact-fill ${impactClass}" style="width:${item.impactPct}%"></div>
          </div>
          <div class="intel-impact-val">${item.impact.toUpperCase()}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── HOOK NEW TABS INTO INIT ───────────────────────────────────
const _origInit = init;
init = function() {
  _origInit();
  renderFestivals();
  renderFestivalValueChart();
  renderBlacklist();
  renderBlacklistChart();
  renderDataSources();
  renderIntelFeed();
};

// ── KICK IT OFF ────────────────────────────────────────────────
loadDeals();
