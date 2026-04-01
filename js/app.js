/* ============================================
   1stLOOK — Hollywood Deals Tracker
   Cinematic Edition — Main Application
   ============================================ */

(function () {
  'use strict';

  let allDeals = [];
  let filtered = [];
  let sortCol = 'announcedDate';
  let sortDir = 'desc';
  let charts = {};

  // Studio color map — consistent across all visualizations
  const STUDIO_COLORS = {
    'Netflix':                '#e50914',
    'Amazon Studios':         '#00a8e1',
    'Apple TV+':              '#a3aaae',
    'HBO/Max':                '#b530fc',
    'Disney (FX/Hulu/Disney+)': '#0057e7',
    'Hulu/Disney':            '#1ce783',
    'Disney/Lucasfilm':       '#ffe81f',
    'Warner Bros.':           '#004db5',
    'Warner Bros. TV':        '#2563eb',
    'Paramount':              '#0064ff',
    'Paramount+':             '#0064ff',
    'Universal Pictures':     '#00b300',
    'Universal Pictures/MRC': '#22c55e',
    'NBCUniversal/Peacock':   '#6366f1',
    'Legendary Entertainment':'#f59e0b',
  };

  const FALLBACK_COLORS = [
    '#f472b6','#fb923c','#a78bfa','#34d399','#60a5fa',
    '#fbbf24','#f87171','#818cf8','#2dd4bf','#c084fc'
  ];

  function studioColor(studio) {
    if (STUDIO_COLORS[studio]) return STUDIO_COLORS[studio];
    const idx = Object.keys(STUDIO_COLORS).length;
    const allStudios = [...new Set(allDeals.map(d => d.studio))].sort();
    const i = allStudios.indexOf(studio);
    return FALLBACK_COLORS[i % FALLBACK_COLORS.length];
  }

  // ═══════════════════════════════════════════
  //  PARTICLE BACKGROUND
  // ═══════════════════════════════════════════
  function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let w, h;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.3 + 0.1,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139,92,246,${0.06 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${p.alpha})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      });

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ═══════════════════════════════════════════
  //  ANIMATED NUMBER COUNTER
  // ═══════════════════════════════════════════
  function animateCounter(el, target, prefix, suffix) {
    prefix = prefix || '';
    suffix = suffix || '';
    const duration = 1200;
    const start = performance.now();
    const from = 0;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (target - from) * eased);
      el.textContent = prefix + current.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ═══════════════════════════════════════════
  //  DEAL TICKER
  // ═══════════════════════════════════════════
  function buildTicker() {
    const container = document.getElementById('ticker');
    const items = allDeals
      .filter(d => d.status === 'active')
      .sort((a, b) => b.announcedDate.localeCompare(a.announcedDate))
      .map(d => {
        const val = d.estimatedValue ? `<span class="deal-value">$${(d.estimatedValue / 1e6).toFixed(0)}M</span>` : '';
        return `<span class="ticker-item">
          <span class="talent-name">${esc(d.talent)}</span>
          <span class="arrow">&rarr;</span>
          <span class="studio-name">${esc(d.studio)}</span>
          ${val}
          <span class="ticker-sep">&bull;</span>
        </span>`;
      }).join('');

    // Duplicate for seamless loop
    container.innerHTML = items + items;
  }

  // ═══════════════════════════════════════════
  //  FORCE-DIRECTED NETWORK GRAPH
  // ═══════════════════════════════════════════
  function buildNetworkGraph() {
    const canvas = document.getElementById('networkCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 550;

    const W = canvas.width;
    const H = canvas.height;

    // Build nodes: studios (large) and talent (small)
    const studios = [...new Set(allDeals.map(d => d.studio))];
    const talents = [...new Set(allDeals.map(d => d.talent))];

    const nodes = [];
    const nodeMap = {};

    studios.forEach((s, i) => {
      const node = {
        id: 'studio:' + s,
        label: s,
        type: 'studio',
        r: 18 + (allDeals.filter(d => d.studio === s).length * 2),
        color: studioColor(s),
        x: W / 2 + (Math.cos(i / studios.length * Math.PI * 2) * W * 0.3),
        y: H / 2 + (Math.sin(i / studios.length * Math.PI * 2) * H * 0.3),
        vx: 0, vy: 0,
      };
      nodes.push(node);
      nodeMap[node.id] = node;
    });

    talents.forEach((t, i) => {
      const deals = allDeals.filter(d => d.talent === t);
      const node = {
        id: 'talent:' + t,
        label: t,
        type: 'talent',
        r: 5 + deals.length * 2,
        color: '#e4e4ef',
        x: W / 2 + (Math.random() - 0.5) * W * 0.7,
        y: H / 2 + (Math.random() - 0.5) * H * 0.7,
        vx: 0, vy: 0,
        deals: deals,
      };
      nodes.push(node);
      nodeMap[node.id] = node;
    });

    // Build edges
    const edges = allDeals.map(d => ({
      source: nodeMap['talent:' + d.talent],
      target: nodeMap['studio:' + d.studio],
      deal: d,
      color: studioColor(d.studio),
    }));

    // Legend
    const legendEl = document.getElementById('networkLegend');
    legendEl.innerHTML = studios.map(s =>
      `<span class="legend-item"><span class="legend-dot" style="background:${studioColor(s)}"></span>${esc(s)}</span>`
    ).join('');

    // Simulation
    let hoveredNode = null;
    let dragNode = null;
    let animFrame;

    function simulate() {
      const alpha = 0.3;
      const repulsion = 800;
      const attraction = 0.005;
      const centerForce = 0.01;

      // Center gravity
      nodes.forEach(n => {
        n.vx += (W / 2 - n.x) * centerForce;
        n.vy += (H / 2 - n.y) * centerForce;
      });

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = a.r + b.r + 10;
          if (dist < minDist) dist = minDist;
          const force = repulsion / (dist * dist);
          const fx = dx / dist * force;
          const fy = dy / dist * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }

      // Attraction along edges
      edges.forEach(e => {
        const dx = e.target.x - e.source.x;
        const dy = e.target.y - e.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * attraction;
        const fx = dx / dist * force;
        const fy = dy / dist * force;
        e.source.vx += fx; e.source.vy += fy;
        e.target.vx -= fx; e.target.vy -= fy;
      });

      // Apply velocity
      nodes.forEach(n => {
        if (n === dragNode) return;
        n.vx *= alpha;
        n.vy *= alpha;
        n.x += n.vx;
        n.y += n.vy;
        // Bounds
        n.x = Math.max(n.r, Math.min(W - n.r, n.x));
        n.y = Math.max(n.r, Math.min(H - n.r, n.y));
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Edges
      edges.forEach(e => {
        const isHovered = hoveredNode &&
          (e.source === hoveredNode || e.target === hoveredNode);
        ctx.beginPath();
        ctx.moveTo(e.source.x, e.source.y);
        ctx.lineTo(e.target.x, e.target.y);
        if (isHovered) {
          ctx.strokeStyle = e.color + 'cc';
          ctx.lineWidth = 2;
        } else if (hoveredNode) {
          ctx.strokeStyle = 'rgba(255,255,255,0.02)';
          ctx.lineWidth = 0.5;
        } else {
          ctx.strokeStyle = e.color + '33';
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();
      });

      // Nodes
      nodes.forEach(n => {
        const isHovered = n === hoveredNode;
        const isConnected = hoveredNode && edges.some(e =>
          (e.source === hoveredNode && e.target === n) ||
          (e.target === hoveredNode && e.source === n)
        );
        const dimmed = hoveredNode && !isHovered && !isConnected;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);

        if (n.type === 'studio') {
          if (isHovered) {
            ctx.shadowColor = n.color;
            ctx.shadowBlur = 25;
          }
          ctx.fillStyle = dimmed ? n.color + '22' : n.color + (isHovered ? 'ff' : 'cc');
          ctx.fill();
          ctx.shadowBlur = 0;

          // Label
          ctx.fillStyle = dimmed ? 'rgba(255,255,255,0.1)' : '#fff';
          ctx.font = `bold ${Math.max(9, n.r * 0.55)}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Abbreviate long names
          let label = n.label;
          if (label.length > 14) label = label.split(/[\s/()]+/).map(w => w[0]).join('').toUpperCase();
          ctx.fillText(label, n.x, n.y);
        } else {
          if (isHovered) {
            ctx.shadowColor = '#a78bfa';
            ctx.shadowBlur = 15;
          }
          ctx.fillStyle = dimmed ? 'rgba(228,228,239,0.05)' : (isHovered ? '#fff' : 'rgba(228,228,239,0.7)');
          ctx.fill();
          ctx.shadowBlur = 0;

          // Talent label on hover
          if (isHovered || isConnected) {
            ctx.fillStyle = '#fff';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(n.label, n.x, n.y - n.r - 6);
          }
        }
      });

      simulate();
      animFrame = requestAnimationFrame(draw);
    }

    // Mouse interaction
    function getNode(mx, my) {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = mx - n.x;
        const dy = my - n.y;
        if (dx * dx + dy * dy < (n.r + 4) * (n.r + 4)) return n;
      }
      return null;
    }

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);

      if (dragNode) {
        dragNode.x = mx;
        dragNode.y = my;
        dragNode.vx = 0;
        dragNode.vy = 0;
        return;
      }
      hoveredNode = getNode(mx, my);
      canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
    });

    canvas.addEventListener('mousedown', e => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      dragNode = getNode(mx, my);
      if (dragNode) canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mouseup', () => { dragNode = null; });
    canvas.addEventListener('mouseleave', () => { hoveredNode = null; dragNode = null; });

    canvas.addEventListener('click', e => {
      if (hoveredNode && hoveredNode.deals && hoveredNode.deals.length > 0) {
        openModal(hoveredNode.deals[hoveredNode.deals.length - 1]);
      }
    });

    draw();
  }

  // ═══════════════════════════════════════════
  //  RACING BAR CHART
  // ═══════════════════════════════════════════
  function buildRaceChart() {
    const container = document.getElementById('raceContainer');
    const yearEl = document.getElementById('raceYear');
    const playBtn = document.getElementById('racePlayBtn');
    const resetBtn = document.getElementById('raceResetBtn');

    const years = [];
    const minYear = 2014;
    const maxYear = 2026;
    for (let y = minYear; y <= maxYear; y++) years.push(y);

    // Pre-compute cumulative counts per studio per year
    const studios = [...new Set(allDeals.map(d => d.studio))];
    const data = {};
    studios.forEach(s => { data[s] = {}; });

    years.forEach(y => {
      studios.forEach(s => {
        data[s][y] = allDeals.filter(d =>
          d.studio === s && parseInt(d.announcedDate.substring(0, 4)) <= y
        ).length;
      });
    });

    const barHeight = 34;
    const maxBars = 12;
    container.style.height = (maxBars * barHeight + 20) + 'px';

    function renderYear(year) {
      yearEl.textContent = year;

      // Sort studios by count this year
      const ranked = studios
        .map(s => ({ studio: s, count: data[s][year] }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, maxBars);

      const maxCount = ranked.length > 0 ? ranked[0].count : 1;
      const barAreaWidth = container.offsetWidth - 200;

      // Create/update bars
      ranked.forEach((d, i) => {
        let row = container.querySelector(`[data-studio="${CSS.escape(d.studio)}"]`);
        if (!row) {
          row = document.createElement('div');
          row.className = 'race-bar-row';
          row.dataset.studio = d.studio;
          row.innerHTML = `
            <div class="race-bar-label"></div>
            <div class="race-bar"></div>
            <div class="race-bar-count"></div>
          `;
          container.appendChild(row);
        }

        row.style.top = (i * barHeight) + 'px';
        row.style.opacity = '1';
        row.querySelector('.race-bar-label').textContent = d.studio;
        row.querySelector('.race-bar').style.width = Math.max(4, (d.count / maxCount) * barAreaWidth) + 'px';
        row.querySelector('.race-bar').style.background = `linear-gradient(90deg, ${studioColor(d.studio)}cc, ${studioColor(d.studio)}66)`;
        row.querySelector('.race-bar-count').textContent = d.count;
      });

      // Hide bars not in top
      container.querySelectorAll('.race-bar-row').forEach(row => {
        const inRank = ranked.find(d => d.studio === row.dataset.studio);
        if (!inRank) {
          row.style.opacity = '0';
          row.style.top = (maxBars * barHeight) + 'px';
        }
      });
    }

    // Controls
    let playing = false;
    let currentIdx = 0;
    let interval;

    renderYear(years[0]);

    playBtn.addEventListener('click', () => {
      if (playing) {
        clearInterval(interval);
        playing = false;
        playBtn.textContent = 'Play';
        playBtn.classList.remove('active');
        return;
      }

      playing = true;
      playBtn.textContent = 'Pause';
      playBtn.classList.add('active');

      interval = setInterval(() => {
        currentIdx++;
        if (currentIdx >= years.length) {
          clearInterval(interval);
          playing = false;
          playBtn.textContent = 'Play';
          playBtn.classList.remove('active');
          return;
        }
        renderYear(years[currentIdx]);
      }, 800);
    });

    resetBtn.addEventListener('click', () => {
      clearInterval(interval);
      playing = false;
      playBtn.textContent = 'Play';
      playBtn.classList.remove('active');
      currentIdx = 0;
      renderYear(years[0]);
    });
  }

  // ═══════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════
  async function init() {
    initParticles();

    const resp = await fetch('data/deals.json');
    const data = await resp.json();
    allDeals = data.deals;

    document.getElementById('lastUpdated').textContent = data.meta.lastUpdated;

    // Header stats
    const totalVal = allDeals.reduce((s, d) => s + (d.estimatedValue || 0), 0);
    animateCounter(document.getElementById('headerDeals'), allDeals.length);
    animateCounter(document.getElementById('headerValue'), Math.round(totalVal / 1e9 * 100) / 100, '$', 'B');

    buildTicker();
    buildNetworkGraph();
    buildRaceChart();

    populateStudioFilter();
    attachEvents();
    applyFilters();
  }

  // ═══════════════════════════════════════════
  //  FILTERS & TABLE (same as before, polished)
  // ═══════════════════════════════════════════
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

    document.querySelectorAll('#dealsTable thead th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortCol = col; sortDir = 'asc'; }
        renderTable();
      });
    });

    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
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

  function renderKPIs() {
    const totalEl = document.getElementById('kpiTotal');
    const activeEl = document.getElementById('kpiActive');
    const valueEl = document.getElementById('kpiValue');
    const studiosEl = document.getElementById('kpiStudios');

    animateCounter(totalEl, filtered.length);
    animateCounter(activeEl, filtered.filter(d => d.status === 'active').length);

    const totalValue = filtered.reduce((s, d) => s + (d.estimatedValue || 0), 0);
    if (totalValue > 0) {
      valueEl.textContent = '$' + (totalValue / 1e9).toFixed(2) + 'B';
    } else {
      valueEl.textContent = 'N/A';
    }

    animateCounter(studiosEl, new Set(filtered.map(d => d.studio)).size);
  }

  function renderTable() {
    const sorted = [...filtered].sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (sortCol === 'estimatedValue') { va = va || 0; vb = vb || 0; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    document.querySelectorAll('#dealsTable thead th').forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.sort === sortCol)
        th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
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

    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => {
        const deal = allDeals.find(d => d.id === Number(tr.dataset.id));
        if (deal) openModal(deal);
      });
    });
  }

  // ═══════════════════════════════════════════
  //  CHART.JS CHARTS
  // ═══════════════════════════════════════════
  function renderCharts() {
    renderTimelineChart();
    renderStudioChart();
    renderTypeChart();
    renderStatusChart();
    renderBubbleChart();
  }

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#6b6b85', font: { family: 'Inter' } } }
    }
  };

  function renderTimelineChart() {
    const ctx = document.getElementById('chartTimeline');
    if (charts.timeline) charts.timeline.destroy();

    const years = {};
    filtered.forEach(d => {
      const y = d.announcedDate.substring(0, 4);
      years[y] = (years[y] || 0) + 1;
    });

    const labels = Object.keys(years).sort();
    const data = labels.map(y => years[y]);
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
            backgroundColor: 'rgba(139,92,246,.5)',
            borderColor: '#8b5cf6',
            borderWidth: 1,
            borderRadius: 6,
            order: 2
          },
          {
            label: 'Cumulative',
            data: cumulative,
            type: 'line',
            borderColor: '#fbbf24',
            backgroundColor: 'rgba(251,191,36,.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#fbbf24',
            pointBorderColor: '#06060b',
            pointBorderWidth: 2,
            order: 1,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        ...chartDefaults,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { ticks: { color: '#6b6b85' }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: { ticks: { color: '#6b6b85' }, grid: { color: 'rgba(255,255,255,.04)' }, title: { display: true, text: 'New Deals', color: '#6b6b85' } },
          y1: { position: 'right', ticks: { color: '#fbbf24' }, grid: { display: false }, title: { display: true, text: 'Cumulative', color: '#fbbf24' } }
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
          backgroundColor: labels.map(s => studioColor(s) + '99'),
          borderColor: labels.map(s => studioColor(s)),
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        ...chartDefaults,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#6b6b85' }, grid: { color: 'rgba(255,255,255,.04)' } },
          y: { ticks: { color: '#6b6b85', font: { size: 11, family: 'Inter' } }, grid: { display: false } }
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
    const colors = ['#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

    charts.types = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.map(l => l.replace('-', ' ')),
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: '#0e0e16',
          borderWidth: 3
        }]
      },
      options: {
        ...chartDefaults,
        cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { color: '#6b6b85', padding: 14, font: { size: 12, family: 'Inter' } } }
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
          backgroundColor: ['#10b981', '#ef4444'],
          borderColor: '#0e0e16',
          borderWidth: 3
        }]
      },
      options: {
        ...chartDefaults,
        cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { color: '#6b6b85', padding: 14, font: { size: 12, family: 'Inter' } } }
        }
      }
    });
  }

  function renderBubbleChart() {
    const ctx = document.getElementById('chartBubble');
    if (charts.bubble) charts.bubble.destroy();

    const studios = [...new Set(filtered.map(d => d.studio))];

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
        backgroundColor: studioColor(studio) + '77',
        borderColor: studioColor(studio),
        borderWidth: 1.5
      };
    });

    charts.bubble = new Chart(ctx, {
      type: 'bubble',
      data: { datasets },
      options: {
        ...chartDefaults,
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
            type: 'time', time: { unit: 'year' },
            ticks: { color: '#6b6b85' },
            grid: { color: 'rgba(255,255,255,.04)' },
            title: { display: true, text: 'Year Announced', color: '#6b6b85' }
          },
          y: {
            ticks: {
              color: '#6b6b85',
              callback: v => studios[v] || '',
              stepSize: 1,
              font: { size: 10 }
            },
            grid: { color: 'rgba(255,255,255,.03)' },
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

  // ═══════════════════════════════════════════
  //  MODAL
  // ═══════════════════════════════════════════
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

  // ═══════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════
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

  document.addEventListener('DOMContentLoaded', init);
})();
