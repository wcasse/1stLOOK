/* ============================================
   1stLOOK — Hollywood Deals Tracker
   Main Application
   ============================================ */

(function () {
  'use strict';

  // ── State ──────────────────────────────────
  let allDeals = [];
  let filtered = [];
  let sortCol = 'announcedDate';
  let sortDir = 'desc';
  let charts = {};

  // ── Color palette ──────────────────────────
  const COLORS = [
    '#6c5ce7', '#fdcb6e', '#00b894', '#e17055', '#74b9ff',
    '#a29bfe', '#ffeaa7', '#55efc4', '#fab1a0', '#81ecec',
    '#fd79a8', '#636e72', '#d63031', '#e84393', '#0984e3',
    '#00cec9', '#2d3436', '#b2bec3'
  ];

  // ── Bootstrap ──────────────────────────────
  async function init() {
    const resp = await fetch('data/deals.json');
    const data = await resp.json();
    allDeals = data.deals;

    document.getElementById('lastUpdated').textContent = data.meta.lastUpdated;

    populateStudioFilter();
    attachEvents();
    applyFilters();
  }

  // ── Filters ────────────────────────────────
  function populateStudioFilter() {
    const studios = [...new Set(allDeals.map(d => d.studio))].sort();
    const sel = document.getElementById('filterStudio');
    studios.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      sel.appendChild(opt);
    });
  }

  function attachEvents() {
    ['filterStudio', 'filterType', 'filterCategory', 'filterStatus'].forEach(id => {
      document.getElementById(id).addEventListener('change', applyFilters);
    });
    document.getElementById('searchBox').addEventListener('input', applyFilters);

    // Table sorting
    document.querySelectorAll('#dealsTable thead th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortCol = col; sortDir = 'asc'; }
        renderTable();
      });
    });

    // Modal
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function applyFilters() {
    const studio = document.getElementById('filterStudio').value;
    const type = document.getElementById('filterType').value;
    const category = document.getElementById('filterCategory').value;
    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('searchBox').value.toLowerCase().trim();

    filtered = allDeals.filter(d => {
      if (studio && d.studio !== studio) return false;
      if (type && d.dealType !== type) return false;
      if (category && d.category !== category) return false;
      if (status && d.status !== status) return false;
      if (search) {
        const hay = [d.talent, d.company, d.studio, d.notes].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    renderKPIs();
    renderTable();
    renderCharts();
  }

  // ── KPIs ───────────────────────────────────
  function renderKPIs() {
    document.getElementById('kpiTotal').textContent = filtered.length;
    document.getElementById('kpiActive').textContent = filtered.filter(d => d.status === 'active').length;

    const totalValue = filtered.reduce((s, d) => s + (d.estimatedValue || 0), 0);
    document.getElementById('kpiValue').textContent = totalValue > 0
      ? '$' + (totalValue / 1e9).toFixed(2) + 'B'
      : 'N/A';

    const studios = new Set(filtered.map(d => d.studio));
    document.getElementById('kpiStudios').textContent = studios.size;
  }

  // ── Table ──────────────────────────────────
  function renderTable() {
    const sorted = [...filtered].sort((a, b) => {
      let va = a[sortCol];
      let vb = b[sortCol];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (sortCol === 'estimatedValue') {
        va = va || 0; vb = vb || 0;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    // Update column headers
    document.querySelectorAll('#dealsTable thead th').forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.sort === sortCol) {
        th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      }
    });

    const tbody = document.getElementById('dealsBody');
    tbody.innerHTML = sorted.map(d => `
      <tr data-id="${d.id}">
        <td><strong>${esc(d.talent)}</strong></td>
        <td>${esc(d.company || '—')}</td>
        <td>${esc(d.studio)}</td>
        <td><span class="badge badge-type">${esc(d.dealType)}</span></td>
        <td>${esc(d.category)}</td>
        <td>${formatDate(d.announcedDate)}</td>
        <td>${d.estimatedValue ? '$' + (d.estimatedValue / 1e6).toFixed(0) + 'M' : '—'}</td>
        <td><span class="badge badge-${d.status}">${d.status}</span></td>
      </tr>
    `).join('');

    document.getElementById('tableCount').textContent = sorted.length;

    // Row click
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => {
        const deal = allDeals.find(d => d.id === Number(tr.dataset.id));
        if (deal) openModal(deal);
      });
    });
  }

  // ── Charts ─────────────────────────────────
  function renderCharts() {
    renderTimelineChart();
    renderStudioChart();
    renderTypeChart();
    renderStatusChart();
    renderBubbleChart();
  }

  function renderTimelineChart() {
    const ctx = document.getElementById('chartTimeline');
    if (charts.timeline) charts.timeline.destroy();

    // Group by year
    const years = {};
    filtered.forEach(d => {
      const y = d.announcedDate.substring(0, 4);
      years[y] = (years[y] || 0) + 1;
    });

    const labels = Object.keys(years).sort();
    const data = labels.map(y => years[y]);

    // Cumulative
    const cumulative = [];
    data.reduce((acc, v, i) => { cumulative[i] = acc + v; return cumulative[i]; }, 0);

    charts.timeline = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'New Deals',
            data,
            backgroundColor: 'rgba(108,92,231,.6)',
            borderColor: '#6c5ce7',
            borderWidth: 1,
            borderRadius: 4,
            order: 2
          },
          {
            label: 'Cumulative',
            data: cumulative,
            type: 'line',
            borderColor: '#fdcb6e',
            backgroundColor: 'rgba(253,203,110,.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#fdcb6e',
            order: 1,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: '#8888a0' } } },
        scales: {
          x: { ticks: { color: '#8888a0' }, grid: { color: 'rgba(35,35,58,.5)' } },
          y: { ticks: { color: '#8888a0' }, grid: { color: 'rgba(35,35,58,.5)' }, title: { display: true, text: 'New Deals', color: '#8888a0' } },
          y1: { position: 'right', ticks: { color: '#fdcb6e' }, grid: { display: false }, title: { display: true, text: 'Cumulative', color: '#fdcb6e' } }
        }
      }
    });
  }

  function renderStudioChart() {
    const ctx = document.getElementById('chartStudios');
    if (charts.studios) charts.studios.destroy();

    const counts = {};
    filtered.forEach(d => { counts[d.studio] = (counts[d.studio] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(e => e[0]);
    const data = sorted.map(e => e[1]);

    charts.studios = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8888a0' }, grid: { color: 'rgba(35,35,58,.5)' } },
          y: { ticks: { color: '#8888a0', font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
  }

  function renderTypeChart() {
    const ctx = document.getElementById('chartTypes');
    if (charts.types) charts.types.destroy();

    const counts = {};
    filtered.forEach(d => { counts[d.dealType] = (counts[d.dealType] || 0) + 1; });
    const labels = Object.keys(counts);
    const data = labels.map(l => counts[l]);

    charts.types = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.map(l => l.replace('-', ' ')),
        datasets: [{
          data,
          backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
          borderColor: '#13131a',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#8888a0', padding: 12, font: { size: 13 } } }
        }
      }
    });
  }

  function renderStatusChart() {
    const ctx = document.getElementById('chartStatus');
    if (charts.status) charts.status.destroy();

    const active = filtered.filter(d => d.status === 'active').length;
    const expired = filtered.filter(d => d.status === 'expired').length;

    charts.status = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Expired'],
        datasets: [{
          data: [active, expired],
          backgroundColor: ['#00b894', '#e17055'],
          borderColor: '#13131a',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#8888a0', padding: 12, font: { size: 13 } } }
        }
      }
    });
  }

  function renderBubbleChart() {
    const ctx = document.getElementById('chartBubble');
    if (charts.bubble) charts.bubble.destroy();

    // Group by studio for coloring
    const studioColors = {};
    const studios = [...new Set(filtered.map(d => d.studio))];
    studios.forEach((s, i) => { studioColors[s] = COLORS[i % COLORS.length]; });

    const datasets = studios.map(studio => {
      const deals = filtered.filter(d => d.studio === studio);
      return {
        label: studio,
        data: deals.map(d => ({
          x: new Date(d.announcedDate).getTime(),
          y: studios.indexOf(studio),
          r: d.estimatedValue ? Math.max(6, Math.sqrt(d.estimatedValue / 1e6) * 1.2) : 5,
          deal: d
        })),
        backgroundColor: studioColors[studio] + '99',
        borderColor: studioColors[studio],
        borderWidth: 1
      };
    });

    charts.bubble = new Chart(ctx, {
      type: 'bubble',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const d = context.raw.deal;
                let label = `${d.talent} → ${d.studio}`;
                if (d.estimatedValue) label += ` ($${(d.estimatedValue / 1e6).toFixed(0)}M)`;
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: { unit: 'year' },
            ticks: { color: '#8888a0' },
            grid: { color: 'rgba(35,35,58,.5)' },
            title: { display: true, text: 'Year Announced', color: '#8888a0' }
          },
          y: {
            ticks: {
              color: '#8888a0',
              callback: function (value) {
                return studios[value] || '';
              },
              stepSize: 1,
              font: { size: 10 }
            },
            grid: { color: 'rgba(35,35,58,.3)' },
            min: -0.5,
            max: studios.length - 0.5
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const el = elements[0];
            const deal = charts.bubble.data.datasets[el.datasetIndex].data[el.index].deal;
            openModal(deal);
          }
        }
      }
    });
  }

  // ── Modal ──────────────────────────────────
  function openModal(deal) {
    const html = `
      <h3>${esc(deal.talent)}</h3>
      ${deal.company ? `<div class="meta-line"><strong>Company:</strong> ${esc(deal.company)}</div>` : ''}
      <div class="meta-line"><strong>Studio / Buyer:</strong> ${esc(deal.studio)}</div>
      <div class="meta-line"><strong>Deal Type:</strong> <span class="badge badge-type">${esc(deal.dealType)}</span></div>
      <div class="meta-line"><strong>Category:</strong> ${esc(deal.category)}</div>
      <div class="meta-line"><strong>Announced:</strong> ${formatDate(deal.announcedDate)}</div>
      <div class="meta-line"><strong>Period:</strong> ${formatDate(deal.startDate)} — ${formatDate(deal.endDate)}</div>
      <div class="meta-line"><strong>Status:</strong> <span class="badge badge-${deal.status}">${deal.status}</span></div>
      ${deal.estimatedValue ? `<div class="meta-line"><strong>Estimated Value:</strong> $${(deal.estimatedValue / 1e6).toFixed(0)}M</div>` : ''}
      <div class="deal-notes">${esc(deal.notes)}</div>
    `;
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('open');
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
  }

  // ── Helpers ────────────────────────────────
  function esc(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }

  // ── Go ─────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
