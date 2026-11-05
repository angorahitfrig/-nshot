'use strict';

(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ------------------------------------------------------------------ */
  /* Icons                                                               */
  /* ------------------------------------------------------------------ */
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    fit: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
    fill: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    center: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    expand: '<path d="M14 4h6v6M10 20H4v-6"/>',
    ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
    reels: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 8.5h18M8 3l3 5.5M14 3l3 5.5"/><path d="M10 12v5l4.5-2.5z" fill="currentColor"/>',
    crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
    drop: '<path d="M12 2.7l5.7 5.6a8 8 0 1 1-11.4 0z"/>',
    rotate: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    flip: '<path d="M12 2v20"/><path d="M8 6L3 18h5z"/><path d="M16 6l5 12h-5z"/>',
    reset: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4M12 2v13"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    picker: '<path d="M2 22l1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="M15 6l3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3z"/>',
  };
  const svg = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  const paintIcons = (root = document) =>
    root.querySelectorAll('i[data-icon]').forEach((el) => { el.innerHTML = svg(el.dataset.icon); });

  /* ------------------------------------------------------------------ */
  /* Config                                                              */
  /* ------------------------------------------------------------------ */
  const RATIOS = [
    { id: 'original', label: 'Orijinal', icon: 'expand' },
    { id: '1:1', w: 1, h: 1, icon: 'ig' },
    { id: '4:5', w: 4, h: 5, icon: 'ig' },
    { id: '3:4', w: 3, h: 4, icon: 'ig' },
    { id: '9:16', w: 9, h: 16, icon: 'reels' },
    { id: '16:9', w: 16, h: 9 },
    { id: '1.91:1', w: 1.91, h: 1, icon: 'ig' },
    { id: '4:3', w: 4, h: 3 },
    { id: '2:3', w: 2, h: 3 },
    { id: '3:2', w: 3, h: 2 },
    { id: '5:4', w: 5, h: 4 },
  ];
  const BLUR_RADII = [1, 2, 4, 6, 9];  // box-blur radius on a 120px canvas, per level
  const COLORS = ['#000000', '#ffffff', '#1e1e1e', '#7f7f7f', '#f3e9dc', '#ff3b30', '#ff9500', '#ffcc00',
                  '#34c759', '#00c7be', '#007aff', '#5856d6', '#af52de', '#ff2d55'];
  const QUALITIES = [1080, 1440, 2160];
  const ZMIN = 0.2, ZMAX = 8;
  const PREVIEW_MAX = 2048;           // long side of the downscaled source used for the live preview
  const MAX_PIXELS = 16000000;        // stay under mobile Safari's canvas size limit

  /* ------------------------------------------------------------------ */
  /* Persisted preferences                                               */
  /* ------------------------------------------------------------------ */
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem('nshot.' + k); return v == null ? d : JSON.parse(v); } catch { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('nshot.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ }
    },
  };

  const validBg = (bg) =>
    bg && ((bg.type === 'blur' && bg.level >= 1 && bg.level <= BLUR_RADII.length) ||
           (bg.type === 'color' && /^#[0-9a-f]{6}$/i.test(bg.color)));

  const state = {
    img: null,          // full resolution image (used for export)
    prev: null,         // downscaled copy (used for preview + blur)
    imgId: 0,
    imgUrl: null,
    fileBase: 'nshot',
    avgColor: '#000000',
    ratio: RATIOS.some((r) => r.id === store.get('ratio')) ? store.get('ratio') : '4:5',
    mode: store.get('mode', 'fit') === 'fill' ? 'fill' : 'fit',   // fit | fill | custom
    bg: validBg(store.get('bg')) ? store.get('bg') : { type: 'blur', level: 3 },
    quality: QUALITIES.includes(store.get('quality')) ? store.get('quality') : 1080,
    format: store.get('format') === 'png' ? 'png' : 'jpeg',
    zoom: 1,
    offX: 0,            // image centre offset, as a fraction of canvas width
    offY: 0,            // ... and of canvas height
    rot: 0,             // quarter turns, clockwise
    flip: false,
  };

  /* ------------------------------------------------------------------ */
  /* Elements                                                            */
  /* ------------------------------------------------------------------ */
  const stage = $('#stage');
  const canvas = $('#preview');
  const ctx = canvas.getContext('2d');
  const zoomInput = $('#zoom');
  const fileInput = $('#file');
  const hint = $('#hint');
  let view = { w: 0, h: 0, dpr: 1 };
  const guides = { v: false, h: false };

  /* ------------------------------------------------------------------ */
  /* Geometry                                                            */
  /* ------------------------------------------------------------------ */
  const natural = () => [state.img.naturalWidth, state.img.naturalHeight];
  const rotated = () => { const [w, h] = natural(); return state.rot % 2 ? [h, w] : [w, h]; };
  const ratioDef = () => RATIOS.find((r) => r.id === state.ratio);
  function aspect() {
    const r = ratioDef();
    if (!r.w) { const [w, h] = rotated(); return w / h; }
    return r.w / r.h;
  }
  const fitScale = (W, H) => { const [w, h] = rotated(); return Math.min(W / w, H / h); };
  const coverScale = (W, H) => { const [w, h] = rotated(); return Math.max(W / w, H / h); };
  const fillZoom = () => { const a = aspect(); return coverScale(a, 1) / fitScale(a, 1); };

  function drawSource(c, src, W, H, scale, cx, cy) {
    const [nw, nh] = natural();
    c.save();
    c.translate(cx, cy);
    if (state.flip) c.scale(-1, 1);
    c.rotate((state.rot * Math.PI) / 2);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(src, (-nw * scale) / 2, (-nh * scale) / 2, nw * scale, nh * scale);
    c.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Blur background (box blur on a tiny canvas, then upscaled)          */
  /* Works on every browser — no reliance on ctx.filter.                 */
  /* ------------------------------------------------------------------ */
  const blurCache = new Map();

  function blurLine(src, dst, w, h, r, horizontal) {
    const len = horizontal ? w : h;
    const lines = horizontal ? h : w;
    const step = horizontal ? 4 : w * 4;
    const div = 2 * r + 1;
    const last = len - 1;
    for (let l = 0; l < lines; l++) {
      const base = horizontal ? l * w * 4 : l * 4;
      for (let ch = 0; ch < 4; ch++) {
        let sum = 0;
        for (let i = -r; i <= r; i++) sum += src[base + clamp(i, 0, last) * step + ch];
        for (let i = 0; i < len; i++) {
          dst[base + i * step + ch] = sum / div;
          sum += src[base + Math.min(last, i + r + 1) * step + ch] - src[base + Math.max(0, i - r) * step + ch];
        }
      }
    }
  }

  function boxBlur(data, w, h, r, passes = 3) {
    const tmp = new Uint8ClampedArray(data.length);
    for (let p = 0; p < passes; p++) {
      blurLine(data, tmp, w, h, r, true);
      blurLine(tmp, data, w, h, r, false);
    }
  }

  function blurCanvas(a, level) {
    const key = [state.imgId, a.toFixed(4), level, state.rot, state.flip].join('|');
    const hit = blurCache.get(key);
    if (hit) return hit;
    const L = 120;
    const w = a >= 1 ? L : Math.max(8, Math.round(L * a));
    const h = a >= 1 ? Math.max(8, Math.round(L / a)) : L;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    drawSource(x, state.prev, w, h, coverScale(w, h), w / 2, h / 2);
    const d = x.getImageData(0, 0, w, h);
    boxBlur(d.data, w, h, BLUR_RADII[level - 1]);
    x.putImageData(d, 0, 0);
    if (blurCache.size > 40) blurCache.clear();
    blurCache.set(key, c);
    return c;
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */
  function renderTo(c, W, H, src, preview) {
    c.clearRect(0, 0, W, H);
    if (state.bg.type === 'color') {
      c.fillStyle = state.bg.color;
      c.fillRect(0, 0, W, H);
    } else {
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
      c.drawImage(blurCanvas(W / H, state.bg.level), 0, 0, W, H);
    }

    const s = fitScale(W, H) * state.zoom;
    drawSource(c, src, W, H, s, W / 2 + state.offX * W, H / 2 + state.offY * H);

    if (preview && (guides.v || guides.h)) {
      c.save();
      c.strokeStyle = 'rgba(255, 210, 90, 0.95)';
      c.lineWidth = Math.max(1, view.dpr);
      c.setLineDash([6 * view.dpr, 4 * view.dpr]);
      c.beginPath();
      if (guides.v) { c.moveTo(W / 2, 0); c.lineTo(W / 2, H); }
      if (guides.h) { c.moveTo(0, H / 2); c.lineTo(W, H / 2); }
      c.stroke();
      c.restore();
    }
  }

  let raf = 0;
  function draw() {
    if (raf || !state.img) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      renderTo(ctx, canvas.width, canvas.height, state.prev, true);
    });
  }

  function layout() {
    if (!state.img) return;
    const box = stage.getBoundingClientRect();
    const pad = 16;
    const maxW = Math.max(40, box.width - pad * 2);
    const maxH = Math.max(40, box.height - pad * 2);
    const a = aspect();
    const w = Math.min(maxW, maxH * a);
    const h = w / a;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    view = { w, h, dpr };
    cancelAnimationFrame(raf);
    raf = 0;
    draw();
  }
  new ResizeObserver(layout).observe(stage);

  /* ------------------------------------------------------------------ */
  /* Zoom slider (logarithmic)                                           */
  /* ------------------------------------------------------------------ */
  const LMIN = Math.log(ZMIN), LMAX = Math.log(ZMAX);
  const zoomToSlider = (z) => ((Math.log(z) - LMIN) / (LMAX - LMIN)) * 1000;
  const sliderToZoom = (v) => Math.exp(LMIN + (v / 1000) * (LMAX - LMIN));

  function syncUI() {
    const v = zoomToSlider(clamp(state.zoom, ZMIN, ZMAX));
    zoomInput.value = v;
    zoomInput.style.setProperty('--p', v / 10 + '%');
    const near = (a, b) => Math.abs(a - b) < 0.005 && Math.abs(state.offX) < 1e-4 && Math.abs(state.offY) < 1e-4;
    $('#btnFit').classList.toggle('on', near(state.zoom, 1));
    $('#btnFill').classList.toggle('on', !near(state.zoom, 1) && near(state.zoom, fillZoom()));
  }

  function snapZoom(z) {
    for (const t of [1, fillZoom()]) if (Math.abs(z / t - 1) < 0.025) return t;
    return z;
  }

  zoomInput.addEventListener('input', () => {
    state.zoom = snapZoom(sliderToZoom(+zoomInput.value));
    state.mode = 'custom';
    syncUI();
    draw();
  });

  function applyMode(mode) {
    state.mode = mode;
    state.zoom = mode === 'fill' ? fillZoom() : 1;
    state.offX = state.offY = 0;
    if (mode !== 'custom') store.set('mode', mode);
    syncUI();
    draw();
  }

  $('#btnFit').addEventListener('click', () => applyMode('fit'));
  $('#btnFill').addEventListener('click', () => applyMode('fill'));
  $('#btnCenter').addEventListener('click', () => { state.offX = state.offY = 0; syncUI(); draw(); });

  /* ------------------------------------------------------------------ */
  /* Gestures: drag to move, pinch / wheel to zoom, double-tap fit⇄fill  */
  /* ------------------------------------------------------------------ */
  const pointers = new Map();
  let gesture = null;
  let lastTap = 0;

  const mid = (pts) => ({
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function beginGesture() {
    const pts = [...pointers.values()];
    if (!pts.length) { gesture = null; return; }
    gesture = {
      m0: mid(pts),
      d0: pts.length > 1 ? dist(pts[0], pts[1]) : 0,
      zoom0: state.zoom,
      off0: [state.offX, state.offY],
      moved: false,
      t0: performance.now(),
      multi: pts.length > 1,
    };
  }

  function moveGesture() {
    const pts = [...pointers.values()];
    if (!gesture || !pts.length) return;
    const m = mid(pts);
    if (Math.hypot(m.x - gesture.m0.x, m.y - gesture.m0.y) > 4) gesture.moved = true;
    let zoom = gesture.zoom0;
    if (pts.length > 1 && gesture.d0 > 0) {
      zoom = snapZoom(clamp((gesture.zoom0 * dist(pts[0], pts[1])) / gesture.d0, ZMIN, ZMAX));
      gesture.moved = true;
    }
    const k = zoom / gesture.zoom0;
    const r = canvas.getBoundingClientRect();
    const ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    let cx = m.x - ox + (gesture.off0[0] * r.width - (gesture.m0.x - ox)) * k;
    let cy = m.y - oy + (gesture.off0[1] * r.height - (gesture.m0.y - oy)) * k;

    const SNAP = 8;
    guides.v = Math.abs(cx) < SNAP;
    guides.h = Math.abs(cy) < SNAP;
    if (guides.v) cx = 0;
    if (guides.h) cy = 0;

    state.zoom = zoom;
    state.offX = cx / r.width;
    state.offY = cy / r.height;
    state.mode = 'custom';
    syncUI();
    draw();
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    beginGesture();
    hideHint();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moveGesture();
  });
  const endPointer = (e) => {
    if (!pointers.has(e.pointerId)) return;
    const g = gesture;
    pointers.delete(e.pointerId);
    if (g && !g.moved && !g.multi && pointers.size === 0 && performance.now() - g.t0 < 300) {
      const now = performance.now();
      if (now - lastTap < 320) {
        lastTap = 0;
        applyMode(Math.abs(state.zoom - 1) < 0.01 && !state.offX && !state.offY ? 'fill' : 'fit');
      } else {
        lastTap = now;
      }
    }
    beginGesture();
    if (!pointers.size) { guides.v = guides.h = false; draw(); }
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const z = snapZoom(clamp(state.zoom * Math.exp(-e.deltaY * 0.0015), ZMIN, ZMAX));
    const k = z / state.zoom;
    const r = canvas.getBoundingClientRect();
    const ax = e.clientX - (r.left + r.width / 2);
    const ay = e.clientY - (r.top + r.height / 2);
    state.offX = (ax + (state.offX * r.width - ax) * k) / r.width;
    state.offY = (ay + (state.offY * r.height - ay) * k) / r.height;
    state.zoom = z;
    state.mode = 'custom';
    syncUI();
    draw();
  }, { passive: false });

  let hintTimer = 0;
  function showHint() {
    hint.hidden = false;
    hint.classList.remove('fade');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideHint, 3500);
  }
  function hideHint() {
    if (hint.hidden) return;
    hint.classList.add('fade');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { hint.hidden = true; }, 400);
  }

  /* ------------------------------------------------------------------ */
  /* Ratio chips                                                         */
  /* ------------------------------------------------------------------ */
  function chipSize(r) {
    if (!r.w || r.w === r.h) return [66, 66];
    const L = 76, S = 50;
    const a = r.w / r.h;
    return a > 1 ? [L, Math.max(S, L / a)] : [Math.max(S, L * a), L];
  }

  const ratioBox = $('#ratios');
  RATIOS.forEach((r) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ratio';
    b.dataset.id = r.id;
    b.setAttribute('role', 'option');
    const [w, h] = chipSize(r);
    b.style.width = w + 'px';
    b.style.height = h + 'px';
    b.innerHTML = (r.icon ? `<i data-icon="${r.icon}"></i>` : '') + `<span>${r.label || r.id}</span>`;
    b.addEventListener('click', () => setRatio(r.id));
    ratioBox.appendChild(b);
  });

  function markRatio() {
    $$('.ratio').forEach((b) => {
      const on = b.dataset.id === state.ratio;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
  }

  function setRatio(id) {
    state.ratio = id;
    store.set('ratio', id);
    markRatio();
    if (!state.img) return;
    state.zoom = state.mode === 'fill' ? fillZoom() : 1;
    state.offX = state.offY = 0;
    if (state.mode === 'custom') state.mode = 'fit';
    layout();
    syncUI();
    paintBlurThumbs();
  }

  /* ------------------------------------------------------------------ */
  /* Background panel                                                    */
  /* ------------------------------------------------------------------ */
  const blurBox = $('#blurs');
  const colorBox = $('#colors');

  function buildBlurChips() {
    blurBox.innerHTML = '';
    BLUR_RADII.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.dataset.level = i + 1;
      b.setAttribute('aria-label', `Bulanık ${i + 1}`);
      b.innerHTML = `<canvas width="96" height="96"></canvas><span class="lvl">${i + 1}</span>`;
      b.addEventListener('click', () => setBg({ type: 'blur', level: i + 1 }));
      blurBox.appendChild(b);
    });
  }

  function paintBlurThumbs() {
    if (!state.img) return;
    const a = aspect();
    $$('#blurs canvas').forEach((c, i) => {
      const x = c.getContext('2d');
      const src = blurCanvas(a, i + 1);
      const s = Math.max(c.width / src.width, c.height / src.height);
      x.imageSmoothingQuality = 'high';
      x.drawImage(src, (c.width - src.width * s) / 2, (c.height - src.height * s) / 2, src.width * s, src.height * s);
    });
  }

  function buildColors() {
    colorBox.innerHTML = '';
    const add = (color, extra) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (extra ? ' ' + extra : '');
      b.style.background = color;
      b.dataset.color = color;
      b.setAttribute('aria-label', color);
      b.addEventListener('click', () => setBg({ type: 'color', color }));
      colorBox.appendChild(b);
      return b;
    };
    const picked = add(state.avgColor, 'picked');
    picked.title = 'Fotoğrafın ortalama rengi';
    picked.innerHTML = '<i data-icon="picker"></i>';
    COLORS.forEach((c) => add(c));

    const custom = document.createElement('label');
    custom.className = 'swatch custom';
    custom.title = 'Özel renk';
    custom.innerHTML = '<input type="color" aria-label="Özel renk">';
    const input = custom.querySelector('input');
    input.value = state.bg.type === 'color' ? state.bg.color : '#336699';
    input.addEventListener('input', () => setBg({ type: 'color', color: input.value }));
    colorBox.appendChild(custom);
    paintIcons(colorBox);
  }

  function markBg() {
    $$('#blurs .swatch').forEach((b) =>
      b.classList.toggle('active', state.bg.type === 'blur' && +b.dataset.level === state.bg.level));
    let matched = false;
    $$('#colors .swatch[data-color]').forEach((b) => {
      const on = !matched && state.bg.type === 'color' && b.dataset.color.toLowerCase() === state.bg.color.toLowerCase();
      if (on) matched = true;
      b.classList.toggle('active', on);
    });
    const custom = $('#colors .custom');
    if (custom) custom.classList.toggle('active', state.bg.type === 'color' && !matched);
  }

  function setBg(bg) {
    state.bg = bg;
    store.set('bg', bg);
    markBg();
    draw();
  }

  function averageColor(src) {
    const c = document.createElement('canvas');
    const N = 24;
    c.width = c.height = N;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, N, N);
    const d = x.getImageData(0, 0, N, N).data;
    const sum = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) { sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]; }
    return '#' + sum.map((v) => Math.round(v / (N * N)).toString(16).padStart(2, '0')).join('');
  }

  /* ------------------------------------------------------------------ */
  /* Tabs & actions                                                      */
  /* ------------------------------------------------------------------ */
  const TITLES = { canvas: 'Tuval', bg: 'Arka Plan' };
  $$('.tab[data-tab]').forEach((t) =>
    t.addEventListener('click', () => {
      $$('.tab[data-tab]').forEach((x) => x.classList.toggle('active', x === t));
      $('#panel-canvas').hidden = t.dataset.tab !== 'canvas';
      $('#panel-bg').hidden = t.dataset.tab !== 'bg';
      $('#panelTitle').textContent = TITLES[t.dataset.tab];
      if (t.dataset.tab === 'bg') paintBlurThumbs();
    }));

  function refit() {
    state.zoom = state.mode === 'fill' ? fillZoom() : 1;
    state.offX = state.offY = 0;
    if (state.mode === 'custom') state.mode = 'fit';
  }

  $('#btnRotate').addEventListener('click', () => {
    if (!state.img) return;
    state.rot = (state.rot + 1) % 4;
    refit();
    layout();
    syncUI();
    paintBlurThumbs();
  });
  $('#btnFlip').addEventListener('click', () => {
    if (!state.img) return;
    state.flip = !state.flip;
    draw();
    paintBlurThumbs();
  });
  $('#btnReset').addEventListener('click', () => {
    if (!state.img) return;
    state.rot = 0;
    state.flip = false;
    refit();
    layout();
    syncUI();
    paintBlurThumbs();
    toast('Sıfırlandı');
  });

  /* ------------------------------------------------------------------ */
  /* Loading images                                                      */
  /* ------------------------------------------------------------------ */
  function openPicker() { fileInput.click(); }
  $('#btnOpen').addEventListener('click', openPicker);
  $('#btnPick').addEventListener('click', openPicker);
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (f) loadFile(f);
  });

  ['dragenter', 'dragover'].forEach((ev) =>
    document.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    document.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.remove('dragover'); }));
  document.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });
  document.addEventListener('paste', (e) => {
    const item = [...(e.clipboardData ? e.clipboardData.items : [])].find((i) => i.type.startsWith('image/'));
    if (item) loadFile(item.getAsFile());
  });

  function makePreviewSource(img) {
    const [w, h] = [img.naturalWidth, img.naturalHeight];
    const k = Math.min(1, PREVIEW_MAX / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k));
    c.height = Math.max(1, Math.round(h * k));
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  async function loadFile(file) {
    if (!file || (file.type && !file.type.startsWith('image/'))) {
      toast('Lütfen bir fotoğraf seçin');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      toast('Bu fotoğraf açılamadı');
      return;
    }
    if (state.imgUrl) URL.revokeObjectURL(state.imgUrl);
    state.imgUrl = url;
    state.img = img;
    state.imgId++;
    blurCache.clear();
    state.prev = makePreviewSource(img);
    state.avgColor = averageColor(state.prev);
    state.fileBase = (file.name || 'foto').replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '_').slice(0, 40) || 'foto';
    state.rot = 0;
    state.flip = false;
    state.zoom = state.mode === 'fill' ? fillZoom() : 1;
    state.offX = state.offY = 0;
    if (state.mode === 'custom') state.mode = 'fit';

    $('#empty').hidden = true;
    canvas.hidden = false;
    $('#editor').hidden = false;
    $('#btnExport').disabled = false;
    buildColors();
    markBg();
    // Let the editor panel take its space before measuring the stage.
    requestAnimationFrame(() => {
      layout();
      syncUI();
      paintBlurThumbs();
      showHint();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Export                                                              */
  /* ------------------------------------------------------------------ */
  const sheet = $('#sheet');
  let exportBlob = null;
  let exportUrl = null;
  let exportToken = 0;
  const canShareFiles = (() => {
    try {
      return !!(navigator.canShare && navigator.canShare({ files: [new File([''], 'x.jpg', { type: 'image/jpeg' })] }));
    } catch { return false; }
  })();
  $('#btnShare').hidden = !canShareFiles;

  function outSize() {
    const a = aspect();
    const s = state.quality;
    let W, H;
    if (a >= 1) { H = s; W = Math.round(s * a); } else { W = s; H = Math.round(s / a); }
    if (W * H > MAX_PIXELS) {
      const k = Math.sqrt(MAX_PIXELS / (W * H));
      W = Math.floor(W * k);
      H = Math.floor(H * k);
    }
    return [W, H];
  }

  const fmtBytes = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB');

  function fileName() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    return `nshot_${stamp}.${state.format === 'png' ? 'png' : 'jpg'}`;
  }

  function markSegs() {
    $$('#segQuality button').forEach((b) => b.classList.toggle('on', +b.dataset.q === state.quality));
    $$('#segFormat button').forEach((b) => b.classList.toggle('on', b.dataset.f === state.format));
  }

  async function buildExport() {
    const token = ++exportToken;
    exportBlob = null;
    $('#btnShare').disabled = $('#btnDownload').disabled = true;
    $('#outInfo').textContent = 'Hazırlanıyor…';
    await new Promise((r) => setTimeout(r, 30));   // let the UI paint first
    if (token !== exportToken) return;

    const [W, H] = outSize();
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    renderTo(c.getContext('2d'), W, H, state.img, false);
    const type = state.format === 'png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((r) => c.toBlob(r, type, 0.92));
    if (token !== exportToken) return;
    if (!blob) {
      $('#outInfo').textContent = 'Görsel oluşturulamadı. Daha düşük çözünürlük deneyin.';
      return;
    }
    exportBlob = blob;
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    exportUrl = URL.createObjectURL(blob);
    $('#outThumb').src = exportUrl;
    $('#outInfo').textContent = `${W} × ${H} px · ${state.format === 'png' ? 'PNG' : 'JPG'} · ${fmtBytes(blob.size)}`;
    $('#btnShare').disabled = $('#btnDownload').disabled = false;
  }

  function openExport() {
    if (!state.img) return;
    markSegs();
    sheet.hidden = false;
    buildExport();
  }
  function closeExport() {
    sheet.hidden = true;
    exportToken++;
  }

  $('#btnExport').addEventListener('click', openExport);
  $$('[data-close]').forEach((el) => el.addEventListener('click', closeExport));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeExport(); });

  $$('#segQuality button').forEach((b) => b.addEventListener('click', () => {
    state.quality = +b.dataset.q;
    store.set('quality', state.quality);
    markSegs();
    buildExport();
  }));
  $$('#segFormat button').forEach((b) => b.addEventListener('click', () => {
    state.format = b.dataset.f;
    store.set('format', state.format);
    markSegs();
    buildExport();
  }));

  $('#btnDownload').addEventListener('click', () => {
    if (!exportBlob) return;
    const a = document.createElement('a');
    a.href = exportUrl;
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('Kaydedildi');
  });

  $('#btnShare').addEventListener('click', async () => {
    if (!exportBlob) return;
    const file = new File([exportBlob], fileName(), { type: exportBlob.type });
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      if (err && err.name !== 'AbortError') toast('Paylaşılamadı, "Cihaza Kaydet"i deneyin');
    }
  });

  /* ------------------------------------------------------------------ */
  /* Misc                                                                */
  /* ------------------------------------------------------------------ */
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 1800);
  }

  paintIcons();
  buildBlurChips();
  markRatio();
  markBg();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
