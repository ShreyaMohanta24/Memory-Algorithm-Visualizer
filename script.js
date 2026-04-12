/*
 * ============================================================
 *  MemoryScope AI – script.js
 *  Virtual Memory Optimization Simulator
 *  Algorithms: FIFO · LRU · Optimal Page Replacement
 * ============================================================
 */

'use strict';

// SECTION 1 – DOM References

let dom = {};

// SECTION 2 – State

const chartInstances = { faults: null, hits: null };

// SECTION 3 – Utility Helpers

function parsePageString(raw) {
  if (!raw || !raw.trim()) return null;
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map(Number);
  if (nums.some(n => isNaN(n) || !Number.isInteger(n) || n < 0)) return null;
  return nums;
}

// Error display

function setError(el, msg, field) {
  el.textContent = msg;
  if (msg) {
    field.classList.add('error');
  } else {
    field.classList.remove('error');
  }
}

// Validate all inputs. Returns parsed values or null if invalid.

function validateInputs() {
  let valid = true;

  const rawPages = dom.pageStringInput.value.trim();
  const pages = parsePageString(rawPages);
  if (!pages || pages.length === 0) {
    setError(dom.pageStringError, '⚠ Enter at least one valid non-negative integer, comma-separated.', dom.pageStringInput);
    valid = false;
  } else if (pages.length > 50) {
    setError(dom.pageStringError, '⚠ Maximum 50 page references allowed.', dom.pageStringInput);
    valid = false;
  } else {
    setError(dom.pageStringError, '', dom.pageStringInput);
  }

  const frames = parseInt(dom.frameCountInput.value, 10);
  if (isNaN(frames) || frames < 1 || frames > 10) {
    setError(dom.frameCountError, '⚠ Number of frames must be between 1 and 10.', dom.frameCountInput);
    valid = false;
  } else {
    setError(dom.frameCountError, '', dom.frameCountInput);
  }

  if (!valid) return null;
  return { pages, frames };
}

// Animate a numeric stat from 0 to target.

function animateCounter(el, target, suffix = '') {
  const duration = 800;
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); 
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ============================================================
   SECTION 4 – Page Replacement Algorithms
   ============================================================ */

// FIFO 

/*
 * FIFO – First In First Out page replacement algorithm.
 * Maintains a queue; the oldest page (head of queue) is evicted.
 */

function runFIFO(pages, frames) {
  const queue  = [];           
  const memory = new Set();   
  const steps  = [];
  let totalFaults = 0;
  let totalHits   = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    const framesBefore = snapshotFrames(queue, frames);

    if (memory.has(page)) {
      // HIT – page is already in memory 
      totalHits++;
      steps.push({
        page,
        framesBefore,
        framesAfter: snapshotFrames(queue, frames),
        isFault    : false,
        evictedPage: null,
        newPage    : page,
      });
    } else {
      // FAULT – page not in memory
      totalFaults++;
      let evictedPage = null;

      if (queue.length === frames) {
        // Evict the oldest page
        evictedPage = queue.shift();
        memory.delete(evictedPage);
      }

      // Load new page
      queue.push(page);
      memory.add(page);

      steps.push({
        page,
        framesBefore,
        framesAfter: snapshotFrames(queue, frames),
        isFault    : true,
        evictedPage,
        newPage    : page,
      });
    }
  }

  return { pages, frames, steps, totalFaults, totalHits };
}

// LRU

/*
 * LRU – Least Recently Used page replacement algorithm.
 * Evicts the page whose most-recent use is farthest in the past.
 *
 * @param {number[]} pages  - Page reference string
 * @param {number}   frames - Number of available frames
 * @returns {object} Simulation result
 */

function runLRU(pages, frames) {
  /**
   * We maintain an ordered list where the last element is the
   * most-recently used page; the first element is the LRU page.
   */
  const order  = [];     // LRU → MRU order (index 0 = LRU)
  const memory = new Set();
  const steps  = [];
  let totalFaults = 0;
  let totalHits   = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const framesBefore = snapshotFrames(order, frames);

    if (memory.has(page)) {
      /* HIT – move page to MRU position */
      totalHits++;
      const idx = order.indexOf(page);
      order.splice(idx, 1);
      order.push(page);

      steps.push({
        page,
        framesBefore,
        framesAfter: snapshotFrames(order, frames),
        isFault    : false,
        evictedPage: null,
        newPage    : page,
      });
    } else {
      /* FAULT */
      totalFaults++;
      let evictedPage = null;

      if (order.length === frames) {
        // Evict LRU page (front of order list)
        evictedPage = order.shift();
        memory.delete(evictedPage);
      }

      order.push(page);
      memory.add(page);

      steps.push({
        page,
        framesBefore,
        framesAfter: snapshotFrames(order, frames),
        isFault    : true,
        evictedPage,
        newPage    : page,
      });
    }
  }

  return { pages, frames, steps, totalFaults, totalHits };
}

// Optimal

/*
 * Optimal Page Replacement (OPT / MIN / Bélády's algorithm).
 * Evicts the page whose next use is farthest in the future.
 * Requires knowledge of the future reference string.
 *
 * @param {number[]} pages  - Page reference string
 * @param {number}   frames - Number of available frames
 * @returns {object} Simulation result
 */

function runOptimal(pages, frames) {
  let memory = [];           // Current pages in memory (unordered)
  const steps = [];
  let totalFaults = 0;
  let totalHits   = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const framesBefore = snapshotFrames(memory, frames);

    if (memory.includes(page)) {
      /* HIT */
      totalHits++;
      steps.push({
        page,
        framesBefore,
        framesAfter: snapshotFrames(memory, frames),
        isFault    : false,
        evictedPage: null,
        newPage    : page,
      });
    } else {
      /* FAULT */
      totalFaults++;
      let evictedPage = null;

      if (memory.length === frames) {
        // Find the page used farthest in the future
        evictedPage = findOptimalVictim(memory, pages, i + 1);
        memory = memory.filter(p => p !== evictedPage);
      }

      memory.push(page);

      steps.push({
        page,
        framesBefore,
        framesAfter: snapshotFrames(memory, frames),
        isFault    : true,
        evictedPage,
        newPage    : page,
      });
    }
  }

  return { pages, frames, steps, totalFaults, totalHits };
}

/**
 * Given the current memory contents, find the page whose next
 * reference is farthest away (or never referenced again).
 *
 * @param {number[]} memory  - Current pages in frames
 * @param {number[]} pages   - Full reference string
 * @param {number}   fromIdx - Index to start looking from
 * @returns {number} The page to evict
 */
function findOptimalVictim(memory, pages, fromIdx) {
  let farthestPage  = -1;
  let farthestIndex = -1;

  for (const p of memory) {
    // Find the next use of this page starting at fromIdx
    let nextUse = pages.indexOf(p, fromIdx);
    if (nextUse === -1) nextUse = Infinity; // Never used again → immediate victim

    if (nextUse > farthestIndex) {
      farthestIndex = nextUse;
      farthestPage  = p;
    }
  }

  return farthestPage;
}

/**
 * Create a fixed-length snapshot array of current page order.
 * Filled with null for empty frame slots.
 *
 * @param {number[]} loaded - Pages currently loaded (in order)
 * @param {number}   frames - Frame count
 * @returns {(number|null)[]}
 */
function snapshotFrames(loaded, frames) {
  const snap = Array.from({ length: frames }, () => null);
  loaded.forEach((page, idx) => {
    if (idx < frames) snap[idx] = page;
  });
  return snap;
}

/* ============================================================
   SECTION 5 – Render: Build HTML Tables
   ============================================================ */

/**
 * Build the table header row.
 * Columns: Step | Page | Frame 1 … Frame N | Status
 *
 * @param {HTMLElement} thead  - The <thead> element
 * @param {number}      frames - Frame count
 */
function buildTableHeader(thead, frames) {
  thead.innerHTML = '';
  const tr = document.createElement('tr');

  const headers = ['Step', 'Page'];
  for (let f = 1; f <= frames; f++) headers.push(`Frame ${f}`);
  headers.push('Status');
  if (frames <= 6) headers.push('Evicted');

  headers.forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    tr.appendChild(th);
  });

  thead.appendChild(tr);
}

/**
 * Populate the table body row-by-row with staggered animation.
 *
 * @param {HTMLElement} tbody  - The <tbody> element
 * @param {object}      result - Algorithm result object
 */
function buildTableBody(tbody, result) {
  tbody.innerHTML = '';
  const { steps, frames } = result;
  const showEvict = frames <= 6;

  steps.forEach((step, idx) => {
    const tr = document.createElement('tr');
    tr.classList.add(step.isFault ? 'row-fault' : 'row-hit', 'row-anim');
    tr.style.animationDelay = `${idx * 30}ms`;

    // Step number
    appendTd(tr, idx + 1);

    // Page referenced
    const pageTd = appendTd(tr, step.page, 'page-cell');

    // Frame slots
    for (let f = 0; f < frames; f++) {
      const val = step.framesAfter[f];
      const prev = step.framesBefore[f];
      const isNew = (val !== null) && (val !== prev) && step.isFault && val === step.page;
      const td = appendTd(tr, val !== null ? val : '–', 'frame-cell');
      if (isNew) td.classList.add('frame-new');
    }

    // Status badge
    const statusTd = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `status-badge ${step.isFault ? 'badge-fault' : 'badge-hit'}`;
    badge.textContent = step.isFault ? 'FAULT' : 'HIT';
    statusTd.appendChild(badge);
    tr.appendChild(statusTd);

    // Evicted page (only when frames ≤ 6 to keep table readable)
    if (showEvict) {
      appendTd(tr, step.evictedPage !== null ? step.evictedPage : '–');
    }

    tbody.appendChild(tr);
  });
}

/**
 * Helper: create and append a <td> with text content.
 */
function appendTd(tr, text, className = '') {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  tr.appendChild(td);
  return td;
}

/**
 * Render the stats chips (faults, hits, hit ratio) above each table.
 *
 * @param {HTMLElement} container - The stats div
 * @param {object}      result    - Algorithm result
 */
function renderStats(container, result) {
  const { totalFaults, totalHits } = result;
  const total    = totalFaults + totalHits;
  const hitRatio = total > 0 ? ((totalHits / total) * 100).toFixed(1) : '0.0';

  container.innerHTML = `
    <div class="stat-chip chip-fault">
      <span>❌ Page Faults</span>
      <strong>${totalFaults}</strong>
    </div>
    <div class="stat-chip chip-hit">
      <span>✅ Page Hits</span>
      <strong>${totalHits}</strong>
    </div>
    <div class="stat-chip chip-ratio">
      <span>📈 Hit Ratio</span>
      <strong>${hitRatio}%</strong>
    </div>
    <div class="stat-chip">
      <span>📄 References</span>
      <strong>${total}</strong>
    </div>
  `;
}

/* ============================================================
   SECTION 6 – Render: Comparison Panel
   ============================================================ */

/**
 * Populate the Compare tab with summary cards, charts, and the
 * best-algorithm callout.
 *
 * @param {object} fifoResult    - FIFO result object
 * @param {object} lruResult     - LRU result object
 * @param {object} optimalResult - Optimal result object
 */
function renderComparison(fifoResult, lruResult, optimalResult) {
  const results = [
    { key: 'fifo',    label: 'FIFO',    icon: '🔄', cssClass: 'fifo-card',    result: fifoResult },
    { key: 'lru',     label: 'LRU',     icon: '🕰',  cssClass: 'lru-card',     result: lruResult },
    { key: 'optimal', label: 'Optimal', icon: '🎯', cssClass: 'optimal-card', result: optimalResult },
  ];

  // Find best (fewest faults; tie → fewest hits needed = highest hit ratio? keep first)
  const minFaults = Math.min(...results.map(r => r.result.totalFaults));
  const bestResults = results.filter(r => r.result.totalFaults === minFaults);

  // ── Summary Cards ──────────────────────────────────────────
  dom.summaryCards.innerHTML = '';
  results.forEach(({ label, icon, cssClass, result }) => {
    const isBest = result.totalFaults === minFaults;
    const total  = result.totalFaults + result.totalHits;
    const ratio  = total > 0 ? ((result.totalHits / total) * 100).toFixed(1) : '0.0';

    const card = document.createElement('div');
    card.className = `summary-card ${cssClass}${isBest ? ' best-card' : ''}`;
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <span class="summary-icon">${icon}</span>
      <div class="summary-info">
        <div class="summary-title">${label}</div>
        <div class="summary-faults">${result.totalFaults} <small style="font-size:0.55em;opacity:0.7">faults</small></div>
        <div class="summary-sub">Hit ratio: ${ratio}% · Total refs: ${total}</div>
      </div>
    `;
    dom.summaryCards.appendChild(card);
  });

  // ── Charts ─────────────────────────────────────────────────
  renderFaultsChart(results);
  renderHitsChart(results);

  // ── Best Algorithm Callout ──────────────────────────────────
  const bestNames = bestResults.map(r => r.label).join(' & ');
  const allTied   = bestResults.length === 3;

  dom.bestAlgoCallout.innerHTML = allTied
    ? `🏆 All three algorithms produced <strong>${minFaults} page faults</strong> — a perfect tie!`
    : `🏆 <strong>${bestNames}</strong> is the most efficient algorithm for this input with only
       <strong>${minFaults} page fault${minFaults !== 1 ? 's' : ''}</strong>.
       Optimal always provides the theoretical minimum; LRU closely approximates it in practice.`;
}

/* ── Chart.js helpers ─────────────────────────────────────── */

/** Shared color palette for charts */
const CHART_COLORS = {
  fifo   : { solid: '#4f8ef7', alpha: 'rgba(79,142,247,0.75)' },
  lru    : { solid: '#9b59b6', alpha: 'rgba(155,89,182,0.75)' },
  optimal: { solid: '#2ecc71', alpha: 'rgba(46,204,113,0.75)' },
};

/**
 * Render (or re-render) the bar chart for page faults comparison.
 */
function renderFaultsChart(results) {
  if (chartInstances.faults) {
    chartInstances.faults.destroy();
    chartInstances.faults = null;
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#8892b0' : '#4a5568';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  chartInstances.faults = new Chart(dom.faultsChart, {
    type: 'bar',
    data: {
      labels   : results.map(r => r.label),
      datasets : [{
        label          : 'Page Faults',
        data           : results.map(r => r.result.totalFaults),
        backgroundColor: results.map(r => CHART_COLORS[r.key].alpha),
        borderColor    : results.map(r => CHART_COLORS[r.key].solid),
        borderWidth    : 2,
        borderRadius   : 8,
        borderSkipped  : false,
      }],
    },
    options: {
      responsive         : true,
      maintainAspectRatio: false,
      animation          : { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} page fault${ctx.parsed.y !== 1 ? 's' : ''}`,
          },
        },
      },
      scales: {
        x: {
          ticks : { color: textColor, font: { family: "'Inter', sans-serif", weight: '600' } },
          grid  : { color: gridColor },
          border: { color: gridColor },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color    : textColor,
            precision: 0,
            font     : { family: "'Inter', sans-serif" },
          },
          grid  : { color: gridColor },
          border: { color: gridColor },
        },
      },
    },
  });
}

/**
 * Render (or re-render) the doughnut chart for hit ratios.
 */
function renderHitsChart(results) {
  if (chartInstances.hits) {
    chartInstances.hits.destroy();
    chartInstances.hits = null;
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#8892b0' : '#4a5568';

  const hitRatios = results.map(r => {
    const total = r.result.totalFaults + r.result.totalHits;
    return total > 0 ? parseFloat(((r.result.totalHits / total) * 100).toFixed(1)) : 0;
  });

  chartInstances.hits = new Chart(dom.hitsChart, {
    type: 'doughnut',
    data: {
      labels  : results.map(r => `${r.label} (${hitRatios[results.indexOf(r)]}%)`),
      datasets: [{
        data           : hitRatios,
        backgroundColor: results.map(r => CHART_COLORS[r.key].alpha),
        borderColor    : results.map(r => CHART_COLORS[r.key].solid),
        borderWidth    : 2,
        hoverOffset    : 6,
      }],
    },
    options: {
      responsive         : true,
      maintainAspectRatio: false,
      animation          : { duration: 800, easing: 'easeOutQuart' },
      cutout             : '62%',
      plugins: {
        legend: {
          position : 'bottom',
          labels   : {
            color    : textColor,
            font     : { family: "'Inter', sans-serif", size: 12 },
            boxWidth : 12,
            padding  : 16,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` Hit ratio: ${ctx.parsed}%`,
          },
        },
      },
    },
  });
}

/* ============================================================
   SECTION 7 – Main Simulation Runner
   ============================================================ */

/**
 * Orchestrate input validation, algorithm execution, and rendering.
 */
function runSimulation() {
  const inputs = validateInputs();
  if (!inputs) return;

  const { pages, frames } = inputs;

  // Loading state
  dom.runBtn.classList.add('loading');
  dom.runBtn.querySelector('span:last-child').textContent = ' Running…';

  // Short async delay so the browser can repaint the loading state
  setTimeout(() => {
    try {
      /* ── Run all three algorithms ── */
      const fifoResult    = runFIFO(pages, frames);
      const lruResult     = runLRU(pages, frames);
      const optimalResult = runOptimal(pages, frames);

      /* ── FIFO table ── */
      buildTableHeader(dom.fifoThead, frames);
      buildTableBody(dom.fifoTbody, fifoResult);
      renderStats(dom.fifoStats, fifoResult);

      /* ── LRU table ── */
      buildTableHeader(dom.lruThead, frames);
      buildTableBody(dom.lruTbody, lruResult);
      renderStats(dom.lruStats, lruResult);

      /* ── Optimal table ── */
      buildTableHeader(dom.optimalThead, frames);
      buildTableBody(dom.optimalTbody, optimalResult);
      renderStats(dom.optimalStats, optimalResult);

      /* ── Comparison panel ── */
      renderComparison(fifoResult, lruResult, optimalResult);

      /* ── Show results ── */
      dom.resultsArea.hidden = false;
      dom.resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Activate FIFO tab by default
      activateTab('fifo');

    } catch (err) {
      console.error('Simulation error:', err);
      alert('An unexpected error occurred. Please check your inputs and try again.');
    } finally {
      // Restore button
      dom.runBtn.classList.remove('loading');
      dom.runBtn.querySelector('span:last-child').textContent = ' Run Simulation';
    }
  }, 120);
}

/* ============================================================
   SECTION 8 – Tab Navigation
   ============================================================ */

/**
 * Activate a specific algorithm tab by key name.
 * @param {'fifo'|'lru'|'optimal'|'compare'} key
 */
function activateTab(key) {
  dom.tabButtons.forEach(btn => {
    const isActive = btn.dataset.algo === key;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${key}`);
  });
}

/* ============================================================
   SECTION 9 – Theme Toggle
   ============================================================ */

function initTheme() {
  // Prefer system setting on first load
  const prefersDark  = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme   = localStorage.getItem('memoryscope-theme');
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  applyTheme(initialTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  dom.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('memoryscope-theme', theme);

  // Re-render charts with new palette if they exist
  if (chartInstances.faults || chartInstances.hits) {
    const fifo    = dom.fifoTbody.rows.length;
    if (fifo > 0) {
      // Re-run comparison render to update chart colours
      const f = gatherResult('fifo');
      const l = gatherResult('lru');
      const o = gatherResult('optimal');
      if (f && l && o) renderComparison(f, l, o);
    }
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/**
 * Reconstruct a minimal result object from the DOM stats chips
 * (used only for chart re-colouring on theme change).
 */
function gatherResult(algo) {
  const statsEl = document.getElementById(`${algo}-stats`);
  if (!statsEl || !statsEl.querySelector('.chip-fault')) return null;

  const chips   = statsEl.querySelectorAll('.stat-chip strong');
  if (chips.length < 2) return null;

  const faults = parseInt(chips[0].textContent, 10);
  const hits   = parseInt(chips[1].textContent, 10);
  return { totalFaults: faults, totalHits: hits };
}

/* ============================================================
   SECTION 10 – Reset
   ============================================================ */

function resetSimulation() {
  dom.pageStringInput.value = '';
  dom.frameCountInput.value = '';
  setError(dom.pageStringError, '', dom.pageStringInput);
  setError(dom.frameCountError, '', dom.frameCountInput);

  dom.resultsArea.hidden = true;

  // Destroy charts
  ['faults', 'hits'].forEach(key => {
    if (chartInstances[key]) {
      chartInstances[key].destroy();
      chartInstances[key] = null;
    }
  });

  // Clear table bodies
  [dom.fifoTbody, dom.lruTbody, dom.optimalTbody].forEach(el => (el.innerHTML = ''));
  [dom.fifoThead, dom.lruThead, dom.optimalThead].forEach(el => (el.innerHTML = ''));
  [dom.fifoStats, dom.lruStats, dom.optimalStats].forEach(el => (el.innerHTML = ''));

  dom.summaryCards.innerHTML    = '';
  dom.bestAlgoCallout.innerHTML = '';

  // Scroll back to top of simulator
  document.getElementById('simulator').scrollIntoView({ behavior: 'smooth' });
}

/* ============================================================
   SECTION 11 – Preset Buttons
   ============================================================ */

function loadPreset(btn) {
  dom.pageStringInput.value = btn.dataset.pages;
  dom.frameCountInput.value = btn.dataset.frames;
  setError(dom.pageStringError, '', dom.pageStringInput);
  setError(dom.frameCountError, '', dom.frameCountInput);
}

/* ============================================================
   SECTION 12 – Navbar active-link on scroll
   ============================================================ */

function updateNavActiveLink() {
  const sections = [
    { el: document.getElementById('home'),      link: dom.navHome },
    { el: document.getElementById('simulator'), link: dom.navSimulator },
    { el: document.getElementById('about'),     link: dom.navAbout },
  ];

  const scrollY = window.scrollY + 100;

  sections.forEach(({ el, link }) => {
    if (!el) return;
    const top    = el.offsetTop;
    const bottom = top + el.offsetHeight;
    link.classList.toggle('active', scrollY >= top && scrollY < bottom);
  });

  // Scroll-to-top button visibility
  dom.scrollTopBtn.hidden = window.scrollY < 400;
}

/* ============================================================
   SECTION 13 – Hero animated counters
   ============================================================ */

function startHeroCounters() {
  const nums = document.querySelectorAll('.stat-num[data-target]');
  nums.forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    animateCounter(el, target, suffix);
  });
}

/* ============================================================
   SECTION 14 – Intersection Observer (scroll animations)
   ============================================================ */

function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  // Animate about cards and howto card on scroll
  document.querySelectorAll('.about-card, .howto-card, .stat-card').forEach(el => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(30px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

/* ============================================================
   SECTION 15 – Mobile Menu Toggle
   ============================================================ */

function toggleMobileMenu() {
  const isOpen = dom.mobileMenu.classList.toggle('open');
  dom.hamburger.classList.toggle('open', isOpen);
  dom.hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  dom.mobileMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

/* ============================================================
   SECTION 16 – Event Listeners & Init
   ============================================================ */

function init() {
  /* ── Populate DOM references now that the document is ready ── */
  dom = {
    // Inputs
    pageStringInput : document.getElementById('pageString'),
    frameCountInput : document.getElementById('frameCount'),
    pageStringError : document.getElementById('pageStringError'),
    frameCountError : document.getElementById('frameCountError'),

    // Buttons
    runBtn          : document.getElementById('runBtn'),
    resetBtn        : document.getElementById('resetBtn'),
    themeToggle     : document.getElementById('themeToggle'),
    themeIcon       : document.getElementById('themeIcon'),
    hamburger       : document.getElementById('hamburger'),
    mobileMenu      : document.getElementById('mobileMenu'),
    scrollTopBtn    : document.getElementById('scrollTopBtn'),

    // Preset buttons
    preset1         : document.getElementById('preset1'),
    preset2         : document.getElementById('preset2'),
    preset3         : document.getElementById('preset3'),

    // Results
    resultsArea     : document.getElementById('resultsArea'),

    // Tabs
    tabButtons      : document.querySelectorAll('.tab-btn'),

    // FIFO
    fifoStats       : document.getElementById('fifo-stats'),
    fifoThead       : document.getElementById('fifo-thead'),
    fifoTbody       : document.getElementById('fifo-tbody'),

    // LRU
    lruStats        : document.getElementById('lru-stats'),
    lruThead        : document.getElementById('lru-thead'),
    lruTbody        : document.getElementById('lru-tbody'),

    // Optimal
    optimalStats    : document.getElementById('optimal-stats'),
    optimalThead    : document.getElementById('optimal-thead'),
    optimalTbody    : document.getElementById('optimal-tbody'),

    // Compare
    summaryCards    : document.getElementById('summary-cards'),
    bestAlgoCallout : document.getElementById('best-algo-callout'),
    faultsChart     : document.getElementById('faultsChart'),
    hitsChart       : document.getElementById('hitsChart'),

    // Navbar
    navbar          : document.getElementById('navbar'),
    navHome         : document.getElementById('nav-home'),
    navSimulator    : document.getElementById('nav-simulator'),
    navAbout        : document.getElementById('nav-about'),
  };

  /* Theme */
  initTheme();

  /* Scroll effects */
  window.addEventListener('scroll', updateNavActiveLink, { passive: true });
  updateNavActiveLink();

  /* Scroll-to-top */
  dom.scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* Hamburger */
  dom.hamburger.addEventListener('click', toggleMobileMenu);

  /* Close mobile menu when a link is clicked */
  dom.mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      dom.mobileMenu.classList.remove('open');
      dom.hamburger.classList.remove('open');
      dom.hamburger.setAttribute('aria-expanded', 'false');
      dom.mobileMenu.setAttribute('aria-hidden', 'true');
    });
  });

  /* Theme toggle */
  dom.themeToggle.addEventListener('click', toggleTheme);

  /* Run & Reset */
  dom.runBtn.addEventListener('click', runSimulation);
  dom.resetBtn.addEventListener('click', resetSimulation);

  /* Preset buttons */
  [dom.preset1, dom.preset2, dom.preset3].forEach(btn => {
    btn.addEventListener('click', () => loadPreset(btn));
  });

  /* Tab switching */
  dom.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.algo));
  });

  /* Run simulation on Enter within inputs */
  [dom.pageStringInput, dom.frameCountInput].forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') runSimulation();
    });
  });

  /* Hero stat counters */
  startHeroCounters();

  /* Scroll animations for cards */
  initScrollAnimations();

  /* Smooth anchor navigation – close mobile menu */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', () => {
      if (dom.mobileMenu.classList.contains('open')) toggleMobileMenu();
    });
  });
}

// Kick everything off once the DOM is ready
document.addEventListener('DOMContentLoaded', init);
