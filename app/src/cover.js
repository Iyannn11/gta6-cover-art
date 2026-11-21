// Vice Cover Lab — poster renderer (Round 2).
// Draws a GTA 6-style multi-panel cover onto a canvas: photos, neon-sunset
// colour grades, masthead, bold caption lettering, grain and vignette.
// Everything runs offline; no network, no fonts beyond the system stack.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    skyTop: '#ff9a3c', skyBottom: '#ff2e63',
    shadow: 'rgba(0,110,130,0.55)', highlight: 'rgba(255,150,60,0.45)',
    glow: 'rgba(255,120,40,0.55)', glowStrength: 0.5,
    filter: 'saturate(1.28) contrast(1.1) brightness(1.03)',
    captionGlow: '#ff5e3a',
  },
  neon: {
    label: 'Neon Night',
    skyTop: '#2b0a4a', skyBottom: '#ff2ea6',
    shadow: 'rgba(90,0,160,0.6)', highlight: 'rgba(0,229,255,0.4)',
    glow: 'rgba(255,46,166,0.6)', glowStrength: 0.85,
    filter: 'saturate(1.45) contrast(1.14) brightness(0.98)',
    captionGlow: '#00e5ff',
  },
  midnight: {
    label: 'Midnight',
    skyTop: '#050914', skyBottom: '#123a6b',
    shadow: 'rgba(2,8,30,0.7)', highlight: 'rgba(70,140,255,0.35)',
    glow: 'rgba(40,90,200,0.45)', glowStrength: 0.35,
    filter: 'saturate(1.05) contrast(1.12) brightness(0.95)',
    captionGlow: '#7db8ff',
  },
  dawn: {
    label: 'Vice Dawn',
    skyTop: '#ffd9a0', skyBottom: '#ff7e5f',
    shadow: 'rgba(150,60,120,0.45)', highlight: 'rgba(255,214,120,0.5)',
    glow: 'rgba(255,190,90,0.5)', glowStrength: 0.45,
    filter: 'saturate(1.22) contrast(1.06) brightness(1.06)',
    captionGlow: '#ffc46b',
  },
  noir: {
    label: 'Mono Noir',
    skyTop: '#3a3a3a', skyBottom: '#000000',
    shadow: 'rgba(0,0,0,0.65)', highlight: 'rgba(255,255,255,0.3)',
    glow: 'rgba(255,255,255,0.35)', glowStrength: 0.25,
    filter: 'grayscale(1) contrast(1.22) brightness(1.05)',
    captionGlow: '#ffffff',
  },
};

export const LAYOUTS = {
  hero:     { label: 'Hero Split',    panels: 2 },
  four:     { label: 'Four Grid',     panels: 4 },
  strips:   { label: 'Three Strips',  panels: 3 },
  single:   { label: 'One Photo',     panels: 1 },
  diagonal: { label: 'Diagonal Split', panels: 2 },
  magazine: { label: 'Magazine Cover', panels: 1 },
};

export const PRESETS = [
  { name: 'Sunset Heist', layout: 'hero',     grade: 'sunset',   captionPos: 'bottom', masthead: true,  caption: 'SUNSET HEIST' },
  { name: 'Neon Nights',  layout: 'diagonal', grade: 'neon',     captionPos: 'middle', masthead: false, caption: 'NEON NIGHTS' },
  { name: 'Midnight Run', layout: 'four',     grade: 'midnight', captionPos: 'top',    masthead: true,  caption: 'MIDNIGHT RUN' },
  { name: 'Dawn Patrol',  layout: 'strips',   grade: 'dawn',     captionPos: 'bottom', masthead: false, caption: 'DAWN PATROL' },
  { name: 'Noir Story',   layout: 'magazine', grade: 'noir',     captionPos: 'bottom', masthead: true,  caption: 'NOIR STORY' },
  { name: 'Vice Classic', layout: 'single',   grade: 'sunset',   captionPos: 'bottom', masthead: true,  caption: 'VICE CLASSIC' },
];

export const SAMPLE_PHOTOS = ['pier', 'boulevard'];

// Deterministic PRNG so "Randomize look" is reproducible from its seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    caption: 'SUNSET HEIST',
    captionPos: 'bottom',
    masthead: true,
    mastheadText: 'LEONIDA',
    grain: true,
    vignette: true,
    seed: 7,
    coverLines: ['THE HEIST OF THE CENTURY', 'PALMS, PORSCHES & PAYDAY', 'PLUS: 100 PAGES OF LEONIDA'],
    panels: [
      { photo: 'pier', grade: null, zoom: 1, ox: 0, oy: 0 },
      { photo: 'boulevard', grade: null, zoom: 1, ox: 0, oy: 0 },
    ],
  };
}

// Roll a fresh look from a seed: layout, grade, caption position, masthead.
export function randomizeState(state, seed) {
  const rnd = mulberry32(seed);
  const layoutKeys = Object.keys(LAYOUTS);
  const gradeKeys = Object.keys(GRADES);
  const positions = ['top', 'middle', 'bottom'];
  state.seed = seed;
  state.layout = layoutKeys[Math.floor(rnd() * layoutKeys.length)];
  state.grade = gradeKeys[Math.floor(rnd() * gradeKeys.length)];
  state.captionPos = positions[Math.floor(rnd() * positions.length)];
  state.masthead = rnd() > 0.4;
  syncPanels(state);
  return state;
}

// Make the panels array match the current layout's panel count, keeping
// any per-panel settings that already exist.
export function syncPanels(state) {
  const want = LAYOUTS[state.layout].panels;
  const next = [];
  for (let i = 0; i < want; i++) {
    const old = state.panels[i];
    next.push(old || {
      photo: SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length],
      grade: null, zoom: 1, ox: 0, oy: 0,
    });
  }
  state.panels = next;
  return state;
}

// Panel shapes in pixels for a poster of W x H.
// Each entry: { kind: 'rect', x, y, w, h } or { kind: 'poly', pts: [[x,y], ...] }.
export function layoutPanels(layout, W, H) {
  const g = Math.max(3, Math.round(W * 0.006)); // divider gap
  switch (layout) {
    case 'hero': {
      const split = Math.round(W * 0.58);
      return [
        { kind: 'rect', x: 0, y: 0, w: split - g, h: H },
        { kind: 'rect', x: split + g, y: 0, w: W - split - g, h: H },
      ];
    }
    case 'four': {
      const hw = (W - g) / 2, hh = (H - g) / 2;
      return [
        { kind: 'rect', x: 0, y: 0, w: hw, h: hh },
        { kind: 'rect', x: hw + g, y: 0, w: hw, h: hh },
        { kind: 'rect', x: 0, y: hh + g, w: hw, h: hh },
        { kind: 'rect', x: hw + g, y: hh + g, w: hw, h: hh },
      ];
    }
    case 'strips': {
      const sh = (H - 2 * g) / 3;
      return [
        { kind: 'rect', x: 0, y: 0, w: W, h: sh },
        { kind: 'rect', x: 0, y: sh + g, w: W, h: sh },
        { kind: 'rect', x: 0, y: 2 * (sh + g), w: W, h: sh },
      ];
    }
    case 'diagonal': {
      const ax = Math.round(W * 0.72), bx = Math.round(W * 0.28);
      return [
        { kind: 'poly', pts: [[0, 0], [ax, 0], [bx, H], [0, H]] },
        { kind: 'poly', pts: [[ax, 0], [W, 0], [W, H], [bx, H]] },
      ];
    }
    case 'magazine':
    case 'single':
    default:
      return [{ kind: 'rect', x: 0, y: 0, w: W, h: H }];
  }
}

function panelBounds(shape) {
  if (shape.kind === 'rect') return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  const xs = shape.pts.map((p) => p[0]);
  const ys = shape.pts.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}

function traceShape(ctx, shape) {
  ctx.beginPath();
  if (shape.kind === 'rect') {
    ctx.rect(shape.x, shape.y, shape.w, shape.h);
  } else {
    shape.pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
  }
}

// A small deterministic film-grain tile, generated once and reused.
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 128; tile.height = 128;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(128, 128);
  const rnd = mulberry32(20261121);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

function drawPhotoCover(ctx, img, bounds, panel) {
  const { x, y, w, h } = bounds;
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const s = base * (panel.zoom || 1);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  const dx = x + (w - dw) / 2 + (panel.ox || 0) * w;
  const dy = y + (h - dh) / 2 + (panel.oy || 0) * h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function applyGrade(ctx, shape, grade) {
  const b = panelBounds(shape);
  ctx.save();
  traceShape(ctx, shape);
  ctx.clip();
  // Warm magenta-orange sky wash, top to bottom.
  const sky = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(1, grade.skyBottom);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = sky;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  // Split tone: dark tint from the bottom, warm light from the top.
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.5;
  const sh = ctx.createLinearGradient(0, b.y + b.h * 0.45, 0, b.y + b.h);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, grade.shadow);
  ctx.fillStyle = sh;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.55;
  const hi = ctx.createLinearGradient(0, b.y, 0, b.y + b.h * 0.55);
  hi.addColorStop(0, grade.highlight);
  hi.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hi;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  // Bloom: a soft glow blooming from the top centre.
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = grade.glowStrength * 0.5;
  const glow = ctx.createRadialGradient(
    b.x + b.w / 2, b.y + b.h * 0.08, 0,
    b.x + b.w / 2, b.y + b.h * 0.08, Math.max(b.w, b.h) * 0.75,
  );
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startPx, family, weight) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 12 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

const DISPLAY = `'Arial Black', Impact, 'Helvetica Neue', Arial, sans-serif`;

function drawMasthead(ctx, W, H, state, grade) {
  const text = (state.mastheadText || 'LEONIDA').toUpperCase();
  const size = Math.round(W * 0.105);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  try { ctx.letterSpacing = `${Math.round(size * 0.06)}px`; } catch (e) { /* older canvas */ }
  const px = fitFont(ctx, text, W * 0.94, size, DISPLAY, 900);
  const y = Math.round(H * 0.035);
  ctx.shadowColor = grade.captionGlow;
  ctx.shadowBlur = Math.round(W * 0.02);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, W / 2, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(text, W / 2, y);
  // Thin rule + subline under the masthead.
  const ruleY = y + px + Math.round(H * 0.012);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(W * 0.08, ruleY, W * 0.84, Math.max(2, Math.round(H * 0.002)));
  ctx.font = `700 ${Math.round(W * 0.022)}px ${DISPLAY}`;
  try { ctx.letterSpacing = `${Math.round(W * 0.012)}px`; } catch (e) { /* older canvas */ }
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText('★  VICE CITY  ★', W / 2, ruleY + Math.round(H * 0.014));
  ctx.restore();
}

function drawCaption(ctx, W, H, state, grade) {
  if (state.captionPos === 'off' || !state.caption) return;
  const text = state.caption.toUpperCase();
  const size = Math.round(W * 0.075);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${Math.round(size * 0.09)}px`; } catch (e) { /* older canvas */ }
  const px = fitFont(ctx, text, W * 0.92, size, DISPLAY, 900);
  let y;
  if (state.captionPos === 'top') {
    y = state.masthead ? H * 0.21 : H * 0.1;
  } else if (state.captionPos === 'middle') {
    y = H * 0.52;
  } else {
    y = H * 0.9;
  }
  // Dark band behind top/bottom captions so the type always reads.
  if (state.captionPos !== 'middle') {
    const bandH = px * 1.7;
    const bandY = y - bandH / 2;
    const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    band.addColorStop(0, 'rgba(0,0,0,0)');
    band.addColorStop(0.5, 'rgba(0,0,0,0.55)');
    band.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY, W, bandH);
  }
  ctx.shadowColor = grade.captionGlow;
  ctx.shadowBlur = Math.round(W * 0.025);
  ctx.lineWidth = Math.max(2, Math.round(px * 0.06));
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, W / 2, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, W / 2, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff7e6';
  ctx.fillText(text, W / 2, y);
  ctx.restore();
}

function drawCoverLines(ctx, W, H, state) {
  if (state.layout !== 'magazine') return;
  const lines = state.coverLines || [];
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const size = Math.round(W * 0.026);
  ctx.font = `800 ${size}px ${DISPLAY}`;
  // Sit above the bottom caption band so the lines never collide with it.
  let y = H * 0.58;
  lines.forEach((line, i) => {
    const w = ctx.measureText(line).width + size * 1.2;
    if (i === 0) {
      ctx.fillStyle = '#ffd60a';
      ctx.fillRect(W * 0.05, y - size * 0.95, w, size * 1.5);
      ctx.fillStyle = '#111111';
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = Math.round(W * 0.008);
    }
    ctx.fillText(line, W * 0.05 + size * 0.6, y);
    ctx.shadowBlur = 0;
    y += size * 1.9;
  });
  ctx.restore();
}

// Render the whole poster onto `canvas` (its width/height are the output
// size). `photos` maps a photo id to a loaded HTMLImageElement.
export function renderPoster(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  syncPanels(state);
  const grade = GRADES[state.grade] || GRADES.sunset;

  // Backdrop: near-black so panel gaps read as clean dividers.
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  const shapes = layoutPanels(state.layout, W, H);
  shapes.forEach((shape, i) => {
    const panel = state.panels[i] || state.panels[0];
    const img = photos.get(panel.photo);
    const pGrade = GRADES[panel.grade] || grade;
    ctx.save();
    traceShape(ctx, shape);
    ctx.clip();
    if (img && img.naturalWidth) {
      ctx.filter = pGrade.filter;
      drawPhotoCover(ctx, img, panelBounds(shape), panel);
      ctx.filter = 'none';
    } else {
      // Empty panel: a sunset gradient placeholder, never blank.
      const ph = ctx.createLinearGradient(0, 0, 0, H);
      ph.addColorStop(0, pGrade.skyTop);
      ph.addColorStop(1, pGrade.skyBottom);
      ctx.fillStyle = ph;
      ctx.fillRect(0, 0, W, H);
    }
    applyGrade(ctx, shape, pGrade);
    ctx.restore();
    // Crisp panel divider: white hairline over a dark edge.
    ctx.save();
    traceShape(ctx, shape);
    ctx.lineWidth = Math.max(2, Math.round(W * 0.004));
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
    ctx.restore();
  });

  // Film grain + vignette over the whole poster.
  if (state.grain) {
    const tile = getGrainTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.vignette) {
    const vg = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.save();
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  if (state.masthead) drawMasthead(ctx, W, H, state, grade);
  drawCoverLines(ctx, W, H, state);
  drawCaption(ctx, W, H, state, grade);

  // Thin outer frame + tiny maker credit.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(2, Math.round(W * 0.003));
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, W - 2 * ctx.lineWidth, H - 2 * ctx.lineWidth);
  ctx.font = `700 ${Math.max(10, Math.round(W * 0.013))}px ${DISPLAY}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('VICE COVER LAB', W - W * 0.02, H - H * 0.015);
  ctx.restore();
}

// Render the poster at an export size and return the canvas.
export function exportCanvas(state, photos, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  renderPoster(canvas, state, photos);
  return canvas;
}
