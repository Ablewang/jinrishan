'use strict';
/* global MC_MANIFEST, MC_SUMMARY, MC_ITEMS */

const CAT_ZH = {
  'Building Blocks': '建筑方块',
  'Combat':          '战斗',
  'Decorations':     '装饰',
  'Food & Drinks':   '食物与饮料',
  'Materials':       '材料',
  'Miscellaneous':   '杂项',
  'Redstone':        '红石',
  'Spawn Eggs':      '刷怪蛋',
  'Tools':           '工具',
};

let manifest = null;
let summary  = null;

// ─── Layer Stack ─────────────────────────────────────────────────────────────

const EASE       = 'cubic-bezier(0.4,0,0.2,1)';
const LAYER_CSS  = 'position:absolute;inset:0;overflow-y:auto;-webkit-overflow-scrolling:touch;background:#f5f4f0;will-change:transform;';

let stackEl       = null;
let layerStack    = [];   // [{ el, hash }]
let transitioning = false;

const topLayer   = () => layerStack[layerStack.length - 1];
const belowLayer = () => layerStack[layerStack.length - 2];

function pushLayer(hash, animate = true) {
  const el = document.createElement('div');
  el.style.cssText = LAYER_CSS + `z-index:${layerStack.length + 1};`;
  const w = stackEl.offsetWidth || window.innerWidth;
  if (animate) el.style.transform = `translateX(${w}px)`;
  stackEl.appendChild(el);
  layerStack.push({ el, hash });
  renderHash(hash, el);
  if (animate) {
    transitioning = true;
    el.animate(
      [{ transform: `translateX(${w}px)` }, { transform: 'translateX(0)' }],
      { duration: 280, easing: EASE }
    ).onfinish = () => { el.style.transform = ''; transitioning = false; };
  }
}

function popLayer(startDx = 0, gestureActive = false) {
  if (layerStack.length <= 1) return;
  transitioning = true;
  const { el } = layerStack.pop();
  const w   = stackEl.offsetWidth || window.innerWidth;
  const rem = w - startDx;
  const dur = Math.round(Math.min(280, Math.max(120, rem * 0.65)));

  el.animate(
    [{ transform: `translateX(${startDx}px)` }, { transform: `translateX(${w}px)` }],
    { duration: dur, easing: EASE, fill: 'forwards' }
  ).onfinish = () => { el.remove(); transitioning = false; };

  const below = topLayer();
  if (below) {
    const fromT = gestureActive ? (below.el.style.transform || 'translateX(-30%)') : 'translateX(-30%)';
    below.el.style.transform = '';
    below.el.animate(
      [{ transform: fromT }, { transform: 'translateX(0)' }],
      { duration: dur, easing: EASE }
    );
  }
}

function navigate(hash, back = false, gestureDx = 0) {
  if (!back && topLayer()?.hash === hash) return;
  history.pushState(null, '', hash);
  if (back) popLayer(gestureDx, gestureDx > 0);
  else      pushLayer(hash);
}

function renderHash(fullHash, el) {
  const hash = fullHash.slice(1) || '/';
  if (hash === '/' || hash === '') {
    renderHome(el);
  } else if (hash.startsWith('/category/')) {
    renderCategory(el, decodeURIComponent(hash.slice('/category/'.length)));
  } else if (hash.startsWith('/item/')) {
    const rest = hash.slice('/item/'.length);
    const i    = rest.indexOf('/');
    renderItem(el, decodeURIComponent(rest.slice(0, i)), decodeURIComponent(rest.slice(i + 1)));
  } else if (hash === '/summary') {
    renderSummary(el);
  } else {
    renderHome(el);
  }
}

// ─── Swipe Gesture ───────────────────────────────────────────────────────────

function backTarget() {
  const h = location.hash.slice(1) || '/';
  if (h.startsWith('/item/')) {
    const rest = h.slice(6);
    return '#/category/' + rest.slice(0, rest.indexOf('/'));
  }
  if (h.startsWith('/category/') || h === '/summary') return '#/';
  return null;
}

function initGesture() {
  let sw = null;

  document.addEventListener('touchstart', e => {
    if (transitioning) return;
    sw = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, decided: false, active: false };
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!sw) return;
    const dx = e.touches[0].clientX - sw.x0;
    const dy = e.touches[0].clientY - sw.y0;

    if (!sw.decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      sw.decided = true;
      const target = backTarget();
      if (dx <= 0 || Math.abs(dy) > Math.abs(dx) || !target || layerStack.length < 2) { sw = null; return; }
      sw.active = true;
      sw.target = target;
    }

    if (!sw?.active) return;
    e.preventDefault();
    const d = Math.max(0, dx), w = window.innerWidth;
    const top   = topLayer();
    const below = belowLayer();
    if (top)   top.el.style.transform   = `translateX(${d}px)`;
    if (below) below.el.style.transform = `translateX(${-30 + (d / w) * 30}%)`;
  }, { passive: false });

  function onEnd(e) {
    if (!sw?.active) { sw = null; return; }
    const dx = (e.changedTouches?.[0]?.clientX ?? sw.x0) - sw.x0;
    const { target } = sw;
    sw = null;

    const top = topLayer();
    const w   = top ? (top.el.offsetWidth || window.innerWidth) : window.innerWidth;

    if (dx > w * 0.3) {
      navigate(target, true, dx);
    } else {
      if (top) top.el.animate(
        [{ transform: top.el.style.transform }, { transform: 'translateX(0)' }],
        { duration: 200, easing: 'ease-out' }
      ).onfinish = () => { top.el.style.transform = ''; };

      const below = belowLayer();
      if (below) below.el.animate(
        [{ transform: below.el.style.transform }, { transform: 'translateX(0)' }],
        { duration: 200, easing: 'ease-out' }
      ).onfinish = () => { below.el.style.transform = ''; };
    }
  }

  document.addEventListener('touchend',    onEnd, { passive: true });
  document.addEventListener('touchcancel', onEnd, { passive: true });
}

// ─── Init ────────────────────────────────────────────────────────────────────

async function init() {
  try {
    if (typeof MC_MANIFEST !== 'undefined' && typeof MC_SUMMARY !== 'undefined') {
      manifest = MC_MANIFEST;
      summary  = MC_SUMMARY;
    } else {
      [manifest, summary] = await Promise.all([
        fetch('./output/manifest.json').then(r => { if (!r.ok) throw r; return r.json(); }),
        fetch('./output/summary.json').then(r  => { if (!r.ok) throw r; return r.json(); }),
      ]);
    }
  } catch (e) {
    document.getElementById('app').innerHTML =
      '<div class="err-state">数据加载失败' +
      '<div class="err-hint">请通过 HTTP 服务器访问<br>python3 -m http.server 8080</div></div>';
    return;
  }

  stackEl = document.getElementById('app');
  stackEl.innerHTML = '';

  // 构建初始层栈（无动画）
  const initHash = location.hash || '#/';
  pushLayer('#/', false);
  if (initHash !== '#/' && initHash !== '#') {
    const h = initHash.slice(1);
    if (h.startsWith('/item/')) {
      const rest = h.slice(6);
      pushLayer(`#/category/${rest.slice(0, rest.indexOf('/'))}`, false);
    }
    pushLayer(initHash, false);
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    navigate(a.getAttribute('href'), !!a.closest('.h-back'));
  });

  window.addEventListener('popstate', () => {
    if (layerStack.length > 1) popLayer();
  });

  initGesture();
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const BACK_SVG = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M401.066667 512l302.933333 302.933333-59.733333 59.733334L341.333333 571.733333 281.6 512 341.333333 452.266667l302.933334-302.933334 59.733333 59.733334L401.066667 512z" fill="currentColor"/></svg>`;
function enc(s)         { return encodeURIComponent(s); }
function zh(cat)        { return CAT_ZH[cat] || cat; }
function fmt(n)         { return n.toLocaleString('zh-CN'); }
function rgb(r)         { return `rgb(${r[0]},${r[1]},${r[2]})`; }
function gImg(cat, nm)  { return `./gallery/${enc(cat)}/${nm}.png`; }

function header(left, right = '') {
  return `<header class="header">${left}${right ? '<span style="flex:1"></span>' + right : ''}</header>`;
}

function matsHtml(mats, withPct) {
  return mats.map(m => `
    <div class="mat-row" data-code="${m.code}">
      <div class="mat-swatch" style="background:${rgb(m.rgb)}"></div>
      <span class="mat-code">${m.code}</span>
      <span class="mat-name">${m.name}</span>
      <span class="mat-count">${fmt(m.count)}</span>
      ${withPct ? `<span class="mat-pct">(${m.pct}%)</span>` : ''}
    </div>`
  ).join('');
}

// ─── Home ────────────────────────────────────────────────────────────────────

function renderHome(app) {
  const cats = Object.entries(manifest.categories);
  app.innerHTML = `
    <div class="page">
      ${header(
        `<span class="h-logo active">分类</span>`,
        `<a href="#/summary" class="h-link">清单汇总</a>`
      )}
      <main class="home-grid">
        ${cats.map(([cat, data]) => {
          const previews = data.items.filter(i => i.has_gallery).slice(0, 4);
          const catSum   = summary.categories[cat];
          const total    = catSum ? fmt(catSum.total_beads) : '—';
          const thumbs   = Array.from({ length: 4 }, (_, k) => {
            const item = previews[k];
            return item
              ? `<div class="cat-thumb-cell"><img src="${gImg(cat, item.name)}" alt="${item.display_name}"
                      loading="lazy" onerror="this.style.display='none'"></div>`
              : `<div class="cat-thumb-cell thumb-ph"></div>`;
          }).join('');
          return `
            <a href="#/category/${enc(cat)}" class="cat-card">
              <div class="cat-thumbs">${thumbs}</div>
              <div class="cat-info">
                <span class="cat-name">${zh(cat)}</span>
                <span class="cat-meta">${data.count} 款 · ${total} 颗</span>
              </div>
            </a>`;
        }).join('')}
      </main>
    </div>`;
}

// ─── Category ────────────────────────────────────────────────────────────────

function renderCategory(app, cat) {
  const data = manifest.categories[cat];
  if (!data) { renderHome(app); return; }

  app.innerHTML = `
    <div class="page cat-page">
      ${header(
        `<a href="#/" class="h-back">${BACK_SVG}</a><span class="h-title">${zh(cat)}</span>`,
        `<a href="#/summary" class="h-link">清单汇总</a>`
      )}
      <div class="search-wrap">
        <input class="search-input" id="q" type="text" placeholder="搜索物品名称...">
      </div>
      <div class="item-list-scroll" id="list">${itemListHtml(cat, data.items)}</div>
    </div>`;

  const input = app.querySelector('#q');
  const list  = app.querySelector('#list');
  let composing = false;

  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend',   () => {
    composing = false;
    list.innerHTML = itemListHtml(cat, filter(input.value, data.items));
  });
  input.addEventListener('input', () => {
    if (!composing) list.innerHTML = itemListHtml(cat, filter(input.value, data.items));
  });
}

function filter(q, items) {
  const s = q.trim().toLowerCase();
  if (!s) return items;
  return items.filter(i =>
    i.display_name.toLowerCase().includes(s) ||
    i.name.toLowerCase().includes(s)
  );
}

function itemListHtml(cat, items) {
  if (!items.length)
    return '<div class="empty-state">没有找到相关物品</div>';

  return items.map(item => `
    <a href="#/item/${enc(cat)}/${enc(item.name)}" class="item-row">
      <div class="item-thumb">
        <img src="${gImg(cat, item.name)}" alt="${item.display_name}" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="item-thumb-fb">${item.display_name.charAt(0)}</div>
      </div>
      <div class="item-info">
        <span class="item-name">${item.display_name}</span>
        <span class="item-en">${item.name}</span>
      </div>
      <div class="item-beads">
        <span class="item-bead-n">${fmt(item.total_beads)}</span>
        <span class="item-bead-u">颗</span>
      </div>
    </a>`
  ).join('');
}

// ─── Item Detail ─────────────────────────────────────────────────────────────

async function renderItem(app, cat, name) {
  app.innerHTML = `
    <div class="page">
      <header class="header">
        <a href="#/category/${enc(cat)}" class="h-back">${BACK_SVG}</a>
        <span class="h-title">加载中...</span>
      </header>
      <div class="loading-state">数据加载中</div>
    </div>`;

  let item;
  try {
    const key = `${cat}/${name}`;
    if (typeof MC_ITEMS !== 'undefined' && MC_ITEMS[key]) {
      item = MC_ITEMS[key];
    } else {
      item = await fetch(`./output/${enc(cat)}/${name}.json`).then(r => {
        if (!r.ok) throw r;
        return r.json();
      });
    }
  } catch (e) {
    app.innerHTML = `
      <div class="page">
        <header class="header">
          <a href="#/category/${enc(cat)}" class="h-back">${BACK_SVG}</a>
          <span class="h-title">加载失败</span>
        </header>
        <div class="err-state">无法加载物品数据</div>
      </div>`;
    return;
  }

  const sortedMats = [...item.materials].sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' })
  );

  app.innerHTML = `
    <div class="page detail-page">
      <header class="header">
        <a href="#/category/${enc(cat)}" class="h-back">${BACK_SVG}</a>
        <span class="h-title">${item.display_name} 拼豆预览 (${item.board_size}×${item.board_size})</span>
        <button class="h-logo" id="viewToggle">查看原图</button>
      </header>
      <div class="detail-body">
        <div class="bead-section" id="beadSection">
          <canvas class="bead-canvas" id="beadCanvas"></canvas>
        </div>
        <div class="mat-section">
          <div class="mat-header">
            <span>材料清单</span>
            <span class="mat-summary">${item.color_count} 色 · ${fmt(item.total_beads)} 颗</span>
          </div>
          <div class="mat-list-scroll" id="mats">${matsHtml(sortedMats, true)}</div>
        </div>
      </div>
    </div>`;

  initBeadCanvas(item, app, gImg(cat, item.name));
}

function initBeadCanvas(item, app, gallerySrc) {
  const section    = app.querySelector('#beadSection');
  const canvas     = app.querySelector('#beadCanvas');
  const mats       = app.querySelector('#mats');
  const toggleBtn  = app.querySelector('#viewToggle');
  const ctx        = canvas.getContext('2d');
  const dpr        = window.devicePixelRatio || 1;

  const { grid, materials, board_size, grid_size } = item;
  const off = (board_size - grid_size) / 2;

  const cmap = {};
  materials.forEach(m => { cmap[m.code] = m.rgb; });

  const PAD  = 4;
  const NUMW = 20;
  const GAP  = 2;

  let cs = 16;
  let activeCode  = null;
  let showOriginal = false;
  let cachedImg   = null;

  // preload gallery image
  const img = new Image();
  img.onload = () => { cachedImg = img; if (showOriginal) drawOriginal(); };
  img.src = gallerySrc;

  function setup() {
    const availW = section.clientWidth - PAD * 2;
    cs = Math.max(10, Math.floor((availW - NUMW - GAP) / board_size));
    const W = PAD + NUMW + GAP + board_size * cs + PAD;
    canvas.width  = W * dpr;
    canvas.height = W * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = W + 'px';
    ctx.scale(dpr, dpr);
  }

  function redraw() {
    if (showOriginal) drawOriginal(); else draw();
  }

  function txtColor(r, g, b) {
    return (r * 0.299 + g * 0.587 + b * 0.114) > 135 ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)';
  }

  function draw() {
    const W = PAD + NUMW + GAP + board_size * cs + PAD;
    const H = W;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#eeecea';
    ctx.fillRect(0, 0, W, H);

    const fontSize = Math.max(6, Math.floor(cs * 0.42));
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < board_size; r++) {
      for (let c = 0; c < board_size; c++) {
        const x = PAD + NUMW + GAP + c * cs;
        const y = PAD + NUMW + GAP + r * cs;

        const gr = r - off, gc = c - off;
        const inGrid = gr >= 0 && gr < grid_size && gc >= 0 && gc < grid_size;
        const code = inGrid ? grid[gr][gc] : null;

        if (code && cmap[code]) {
          const [rv, gv, bv] = cmap[code];
          ctx.globalAlpha = (activeCode && activeCode !== code) ? 0.18 : 1;
          ctx.fillStyle = `rgb(${rv},${gv},${bv})`;
          ctx.fillRect(x, y, cs, cs);

          if (cs >= 11) {
            ctx.globalAlpha = (activeCode && activeCode !== code) ? 0.18 : 1;
            ctx.fillStyle = txtColor(rv, gv, bv);
            ctx.fillText(code, x + cs / 2, y + cs / 2);
          }
        } else {
          ctx.globalAlpha = 1;
          ctx.fillStyle = inGrid ? '#e8e6e2' : '#dddbd7';
          ctx.fillRect(x, y, cs, cs);
        }

        if (activeCode && code === activeCode) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#1a7a5e';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, cs - 2, cs - 2);
        }

        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cs, cs);
      }
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#888';
    ctx.font = `bold ${Math.max(7, Math.floor(cs * 0.52))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < board_size; r++)
      ctx.fillText(r + 1, PAD + NUMW / 2, PAD + NUMW + GAP + r * cs + cs / 2);
    for (let c = 0; c < board_size; c++)
      ctx.fillText(c + 1, PAD + NUMW + GAP + c * cs + cs / 2, PAD + NUMW / 2);
  }

  function drawOriginal() {
    const W = PAD + NUMW + GAP + board_size * cs + PAD;
    ctx.clearRect(0, 0, W, W);
    ctx.fillStyle = '#eeecea';
    ctx.fillRect(0, 0, W, W);

    for (let r = 0; r < board_size; r++) {
      for (let c = 0; c < board_size; c++) {
        const x = PAD + NUMW + GAP + c * cs;
        const y = PAD + NUMW + GAP + r * cs;
        const gr = r - off, gc = c - off;
        const inGrid = gr >= 0 && gr < grid_size && gc >= 0 && gc < grid_size;
        ctx.globalAlpha = 1;
        ctx.fillStyle = inGrid ? '#e8e6e2' : '#dddbd7';
        ctx.fillRect(x, y, cs, cs);
      }
    }

    if (cachedImg) {
      const gx = PAD + NUMW + GAP + off * cs;
      const gy = PAD + NUMW + GAP + off * cs;
      const gw = grid_size * cs;
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 1;
      ctx.drawImage(cachedImg, gx, gy, gw, gw);
    }

    for (let r = 0; r < board_size; r++) {
      for (let c = 0; c < board_size; c++) {
        const x = PAD + NUMW + GAP + c * cs;
        const y = PAD + NUMW + GAP + r * cs;
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cs, cs);
      }
    }
    ctx.globalAlpha = 1;
  }

  requestAnimationFrame(() => { setup(); redraw(); });

  canvas.addEventListener('click', e => {
    if (showOriginal) return;
    const rect = canvas.getBoundingClientRect();
    const col  = Math.floor((e.clientX - rect.left - PAD - NUMW) / cs);
    const row  = Math.floor((e.clientY - rect.top  - PAD - NUMW) / cs);

    if (col < 0 || col >= board_size || row < 0 || row >= board_size) {
      activeCode = null; draw(); clearMatHL(mats); return;
    }
    const gr = row - off, gc = col - off;
    const code = (gr >= 0 && gr < grid_size && gc >= 0 && gc < grid_size) ? grid[gr][gc] : null;

    if (!code) { activeCode = null; draw(); clearMatHL(mats); return; }
    activeCode = (activeCode === code) ? null : code;
    draw();
    if (activeCode) highlightMat(mats, activeCode);
    else clearMatHL(mats);
  });

  if (mats) {
    mats.addEventListener('click', e => {
      if (showOriginal) return;
      const row = e.target.closest('.mat-row[data-code]');
      if (!row) return;
      const code = row.dataset.code;
      activeCode = (activeCode === code) ? null : code;
      draw();
      if (activeCode) highlightMat(mats, activeCode);
      else clearMatHL(mats);
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      showOriginal = !showOriginal;
      toggleBtn.textContent = showOriginal ? '查看拼豆' : '查看原图';
      toggleBtn.classList.toggle('active', showOriginal);
      if (showOriginal) { activeCode = null; clearMatHL(mats); drawOriginal(); }
      else draw();
    });
  }

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => { setup(); redraw(); });
    ro.observe(section);
  }
}

function highlightMat(mats, code) {
  if (!mats) return;
  clearMatHL(mats);
  const row = mats.querySelector(`.mat-row[data-code="${code}"]`);
  if (row) {
    row.classList.add('active');
    const rowRect    = row.getBoundingClientRect();
    const scrollRect = mats.getBoundingClientRect();
    mats.scrollTop += rowRect.top - scrollRect.top - mats.clientHeight / 2 + row.clientHeight / 2;
  }
}

function clearMatHL(mats) {
  if (mats) mats.querySelectorAll('.mat-row').forEach(r => r.classList.remove('active'));
}

// ─── Summary ─────────────────────────────────────────────────────────────────

function computeTotal() {
  const map = {};
  for (const cd of Object.values(summary.categories)) {
    for (const m of cd.materials) {
      if (!map[m.code]) map[m.code] = { code: m.code, name: m.name, rgb: m.rgb, count: 0 };
      map[m.code].count += m.count;
    }
  }
  return Object.values(map).sort((a, b) => a.code.localeCompare(b.code));
}

function renderSummary(app) {
  const cats = Object.keys(summary.categories);
  const tabs = ['总计', ...cats];
  let cur = 0;

  const tabHtml = () => tabs.map((t, i) =>
    `<button class="tab-btn${i === cur ? ' active' : ''}" data-i="${i}">${i === 0 ? t : zh(t)}</button>`
  ).join('');

  const contentHtml = () => {
    const mats = cur === 0
      ? computeTotal()
      : [...summary.categories[cats[cur - 1]].materials].sort((a, b) => a.code.localeCompare(b.code));
    return mats.map(m => `
      <div class="mat-row">
        <div class="mat-swatch" style="background:${rgb(m.rgb)}"></div>
        <span class="mat-code">${m.code}</span>
        <span class="mat-name">${m.name}</span>
        <span class="mat-count">${fmt(m.count)}</span>
      </div>`
    ).join('');
  };

  app.innerHTML = `
    <div class="page">
      ${header(
        `<a href="#/" class="h-link">分类</a>`,
        `<span class="h-logo active">清单汇总</span>`
      )}
      <div class="tab-bar" id="tabs">${tabHtml()}</div>
      <div class="sum-list" id="sumContent">${contentHtml()}</div>
    </div>`;

  const tabBar  = app.querySelector('#tabs');
  const content = app.querySelector('#sumContent');

  tabBar.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    cur = +btn.dataset.i;
    tabBar.innerHTML = tabHtml();
    content.innerHTML = contentHtml();
    app.scrollTo(0, 0);
  });

  tabBar.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { cur = Math.max(0, cur - 1); tabBar.innerHTML = tabHtml(); content.innerHTML = contentHtml(); }
    if (e.key === 'ArrowRight') { cur = Math.min(tabs.length - 1, cur + 1); tabBar.innerHTML = tabHtml(); content.innerHTML = contentHtml(); }
  });

  let drag = false, sx = 0, sl = 0;
  tabBar.addEventListener('mousedown', e => { drag = true; sx = e.pageX; sl = tabBar.scrollLeft; tabBar.classList.add('grabbing'); });
  tabBar.addEventListener('mouseleave', () => { drag = false; tabBar.classList.remove('grabbing'); });
  tabBar.addEventListener('mouseup',    () => { drag = false; tabBar.classList.remove('grabbing'); });
  tabBar.addEventListener('mousemove',  e => {
    if (!drag) return;
    e.preventDefault();
    tabBar.scrollLeft = sl - (e.pageX - sx);
  });
}

// ─── Boot ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
