'use strict';

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

// ─── Init ───────────────────────────────────────────────────────────────────

async function init() {
  try {
    [manifest, summary] = await Promise.all([
      fetch('./output/manifest.json').then(r => { if (!r.ok) throw r; return r.json(); }),
      fetch('./output/summary.json').then(r  => { if (!r.ok) throw r; return r.json(); }),
    ]);
  } catch (e) {
    document.getElementById('app').innerHTML =
      '<div class="err-state">数据加载失败' +
      '<div class="err-hint">请通过 HTTP 服务器访问<br>python3 -m http.server 8080</div></div>';
    return;
  }
  initGesture();
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    navigate(a.getAttribute('href'), !!a.closest('.h-back'));
  });
  window.addEventListener('popstate', () => {
    _isBack = true;
    _preSnap = takeCurrentSnap(document.getElementById('app'));
    route();
  });
  route();
}

// ─── Router ─────────────────────────────────────────────────────────────────

const scrollCache  = {};
let _isBack        = false;
let prevHash       = location.hash || '#/';
let _gestureSnap   = null;
let _gestureSnapDx = 0;
let _preSnap       = null;

function navigate(hash, back = false) {
  if (hash === (location.hash || '#/')) return;
  _isBack = back;
  if (!_gestureSnap) {
    _preSnap = takeCurrentSnap(document.getElementById('app'));
  }
  history.pushState(null, '', hash);
  route();
}

function render(hash, app) {
  if (hash === '/' || hash === '') {
    renderHome(app);
  } else if (hash.startsWith('/category/')) {
    renderCategory(app, decodeURIComponent(hash.slice('/category/'.length)));
  } else if (hash.startsWith('/item/')) {
    const rest = hash.slice('/item/'.length);
    const i    = rest.indexOf('/');
    renderItem(app, decodeURIComponent(rest.slice(0, i)), decodeURIComponent(rest.slice(i + 1)));
  } else if (hash === '/summary') {
    renderSummary(app);
  } else {
    renderHome(app);
  }
}

function route() {
  const fullHash = location.hash || '#/';
  const hash     = fullHash.slice(1) || '/';
  const app      = document.getElementById('app');
  const isBack   = _isBack;
  _isBack = false;

  scrollCache[prevHash] = window.scrollY;
  prevHash = fullHash;

  const curSnap = _gestureSnap || _preSnap || null;
  const snapDx  = _gestureSnapDx;
  _gestureSnap = _preSnap = null;
  _gestureSnapDx = 0;

  if (!isBack && app.firstElementChild && !app.querySelector('.splash')) {
    pushPage(snapHTML(app), window.scrollY);
  }

  render(hash, app);

  if (isBack) runBackTransition(curSnap, snapDx);
  else        runForwardTransition(curSnap);

  const saved = isBack ? (scrollCache[fullHash] || 0) : 0;
  requestAnimationFrame(() => window.scrollTo(0, saved));
}

// ─── Transition ──────────────────────────────────────────────────────────────

let transitioning  = false;
let pageHTMLStack  = [];
let persistedEl    = null;

const SNAP_CSS = 'position:fixed;inset:0;max-width:768px;width:100%;margin:0 auto;overflow:hidden;pointer-events:none;background:#f5f4f0;will-change:transform;';

function snapHTML(app) {
  app.querySelectorAll('canvas').forEach(c => {
    try {
      const img = new Image();
      img.src = c.toDataURL();
      img.style.cssText = `width:${c.offsetWidth}px;height:${c.offsetHeight}px;display:block;`;
      c.replaceWith(img);
    } catch (_) {}
  });
  return app.innerHTML;
}

function makeEl(html, scrollY, zIndex, transformX) {
  if (!html) return null;
  const el = document.createElement('div');
  el.style.cssText = `${SNAP_CSS}z-index:${zIndex};transform:translateX(${transformX});`;
  const inner = document.createElement('div');
  inner.style.transform = `translateY(-${scrollY || 0}px)`;
  inner.innerHTML = html;
  el.appendChild(inner);
  document.body.appendChild(el);
  return el;
}

function refreshPersistedEl() {
  persistedEl?.remove(); persistedEl = null;
  const entry = pageHTMLStack[pageHTMLStack.length - 1];
  if (entry) persistedEl = makeEl(entry.html, entry.scrollY, 0, '-30%');
}

function pushPage(html, scrollY) { pageHTMLStack.push({ html, scrollY: scrollY || 0 }); refreshPersistedEl(); }
function popPage()                { pageHTMLStack.pop(); refreshPersistedEl(); }

function takeCurrentSnap(app) {
  if (!app.firstElementChild || app.querySelector('.splash')) return null;
  const el = document.createElement('div');
  el.style.cssText = `${SNAP_CSS}z-index:500;transform:translateX(0);`;
  const inner = document.createElement('div');
  inner.style.transform = `translateY(-${window.scrollY}px)`;
  const clone = app.cloneNode(true);
  // 复制内部可滚动容器的 scrollTop
  const origEls  = [...app.querySelectorAll('*')];
  const cloneEls = [...clone.querySelectorAll('*')];
  origEls.forEach((orig, i) => {
    if (orig.scrollTop || orig.scrollLeft) {
      cloneEls[i].scrollTop  = orig.scrollTop;
      cloneEls[i].scrollLeft = orig.scrollLeft;
    }
  });
  // canvas → img
  const canvases = app.querySelectorAll('canvas');
  clone.querySelectorAll('canvas').forEach((cc, i) => {
    try {
      const src = canvases[i]?.toDataURL();
      if (!src) return;
      const img = new Image();
      img.src = src;
      img.style.cssText = `width:${canvases[i].offsetWidth}px;height:${canvases[i].offsetHeight}px;display:block;`;
      cc.replaceWith(img);
    } catch (_) {}
  });
  inner.appendChild(clone);
  el.appendChild(inner);
  document.body.appendChild(el);
  return el;
}

function runForwardTransition(curSnap) {
  curSnap?.remove();
  if (!persistedEl) return;
  transitioning = true;
  const app  = document.getElementById('app');
  const w    = app.offsetWidth || window.innerWidth;
  const page = app.firstElementChild;
  const done = () => { transitioning = false; };
  if (page) page.animate(
    [{ transform: `translateX(${w}px)` }, { transform: 'translateX(0)' }],
    { duration: 280, easing: 'cubic-bezier(0.4,0,0.2,1)' }
  ).onfinish = done;
  else done();
}

function runBackTransition(curSnap, startDx) {
  if (!curSnap && !persistedEl) { transitioning = false; return; }
  transitioning = true;
  const app  = document.getElementById('app');
  const w    = app.offsetWidth || window.innerWidth;
  const rem  = w - (startDx || 0);
  const dur  = Math.round(Math.min(280, Math.max(120, rem * 0.65)));
  const ease = 'cubic-bezier(0.4,0,0.2,1)';

  const done = () => {
    curSnap?.remove();
    if (persistedEl) { persistedEl.remove(); persistedEl = null; }
    transitioning = false;
    popPage();
  };

  if (curSnap) {
    curSnap.style.zIndex = '500';
    curSnap.animate(
      [{ transform: `translateX(${startDx || 0}px)` }, { transform: `translateX(${w}px)` }],
      { duration: dur, easing: ease, fill: 'forwards' }
    ).onfinish = done;
  } else {
    done();
  }

  if (persistedEl) {
    persistedEl.style.zIndex = '2';
    const fromT = persistedEl.style.transform || 'translateX(-30%)';
    persistedEl.animate(
      [{ transform: fromT }, { transform: 'translateX(0)' }],
      { duration: dur, easing: ease }
    );
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
      if (dx <= 0 || Math.abs(dy) > Math.abs(dx) || !target || !persistedEl) { sw = null; return; }
      sw.active  = true;
      sw.target  = target;
      sw.app     = document.getElementById('app');
    }

    if (!sw?.active) return;
    e.preventDefault();
    const d = Math.max(0, dx);
    const w = window.innerWidth;
    sw.app.style.transform = `translateX(${d}px)`;
    if (persistedEl) persistedEl.style.transform = `translateX(${-30 + (d / w) * 30}%)`;
  }, { passive: false });

  function onEnd(e) {
    if (!sw?.active) { sw = null; return; }
    const dx  = (e.changedTouches?.[0]?.clientX ?? sw.x0) - sw.x0;
    const { app, target } = sw;
    sw = null;

    const w = app.offsetWidth || window.innerWidth;
    if (dx > w * 0.3) {
      const curSnap = takeCurrentSnap(app);
      if (curSnap) curSnap.style.transform = `translateX(${dx}px)`;
      app.style.transform = '';
      _gestureSnap   = curSnap;
      _gestureSnapDx = curSnap ? dx : 0;
      navigate(target, true);
    } else {
      const fromT = app.style.transform;
      app.animate(
        [{ transform: fromT }, { transform: 'translateX(0)' }],
        { duration: 200, easing: 'ease-out' }
      ).onfinish = () => { app.style.transform = ''; };
      if (persistedEl) persistedEl.animate(
        [{ transform: persistedEl.style.transform }, { transform: 'translateX(-30%)' }],
        { duration: 200, easing: 'ease-out' }
      ).onfinish = () => { if (persistedEl) persistedEl.style.transform = 'translateX(-30%)'; };
    }
  }

  document.addEventListener('touchend',    onEnd, { passive: true });
  document.addEventListener('touchcancel', onEnd, { passive: true });
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
    <div class="page">
      ${header(
        `<a href="#/" class="h-back">${BACK_SVG}</a><span class="h-title">${zh(cat)}</span>`,
        `<a href="#/summary" class="h-link">清单汇总</a>`
      )}
      <div class="search-wrap">
        <input class="search-input" id="q" type="text" placeholder="搜索物品名称...">
      </div>
      <div class="item-list" id="list">${itemListHtml(cat, data.items)}</div>
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
    item = await fetch(`./output/${enc(cat)}/${name}.json`).then(r => {
      if (!r.ok) throw r;
      return r.json();
    });
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

  initBeadCanvas(item, app);
}

function initBeadCanvas(item, app) {
  const section = app.querySelector('#beadSection');
  const canvas  = app.querySelector('#beadCanvas');
  const mats    = app.querySelector('#mats');
  const ctx     = canvas.getContext('2d');
  const dpr     = window.devicePixelRatio || 1;

  const { grid, materials, board_size, grid_size } = item;
  const off = (board_size - grid_size) / 2;

  const cmap = {};
  materials.forEach(m => { cmap[m.code] = m.rgb; });

  const PAD  = 4;
  const NUMW = 20;
  const GAP  = 2;

  let cs = 16;          // cell size in CSS px, updated in setup()
  let activeCode = null;

  function setup() {
    const availW = section.clientWidth - PAD * 2;
    cs = Math.max(10, Math.floor((availW - NUMW - GAP) / board_size));
    const W = PAD + NUMW + GAP + board_size * cs + PAD;
    const H = PAD + NUMW + GAP + board_size * cs + PAD;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
  }

  function txtColor(r, g, b) {
    return (r * 0.299 + g * 0.587 + b * 0.114) > 135 ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)';
  }

  function draw() {
    const W = PAD + NUMW + GAP + board_size * cs + PAD;
    const H = W;
    ctx.clearRect(0, 0, W, H);

    // Board background
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

        // Fill
        if (code && cmap[code]) {
          const [rv, gv, bv] = cmap[code];
          ctx.globalAlpha = (activeCode && activeCode !== code) ? 0.18 : 1;
          ctx.fillStyle = `rgb(${rv},${gv},${bv})`;
          ctx.fillRect(x, y, cs, cs);

          // Color code label
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

        // Highlight border
        if (activeCode && code === activeCode) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#1a7a5e';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, cs - 2, cs - 2);
        }

        // Cell grid lines
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

  requestAnimationFrame(() => { setup(); draw(); });

  // Click
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const col  = Math.floor((e.clientX - rect.left  - PAD - NUMW) / cs);
    const row  = Math.floor((e.clientY - rect.top - PAD - NUMW) / cs);

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

  // Mat list click → canvas highlight
  if (mats) {
    mats.addEventListener('click', e => {
      const row = e.target.closest('.mat-row[data-code]');
      if (!row) return;
      const code = row.dataset.code;
      activeCode = (activeCode === code) ? null : code;
      draw();
      if (activeCode) highlightMat(mats, activeCode);
      else clearMatHL(mats);
    });
  }

  // Auto-resize
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => { setup(); draw(); });
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

  const tabBar = app.querySelector('#tabs');
  const content = app.querySelector('#sumContent');

  tabBar.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    cur = +btn.dataset.i;
    tabBar.innerHTML = tabHtml();
    content.innerHTML = contentHtml();
    window.scrollTo(0, 0);
  });

  tabBar.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { cur = Math.max(0, cur - 1); tabBar.innerHTML = tabHtml(); content.innerHTML = contentHtml(); }
    if (e.key === 'ArrowRight') { cur = Math.min(tabs.length - 1, cur + 1); tabBar.innerHTML = tabHtml(); content.innerHTML = contentHtml(); }
  });

  // Tab drag
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
