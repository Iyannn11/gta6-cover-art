// Draws the multi-panel Vice City poster onto a canvas 2D context.
// Pure drawing: given a width, a height and a plain state object, it paints
// the panels, the colour grade, the caption band and the finishing grain.
// No network, no DOM reads — the editor (main.js) owns state and events.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

export const LAYOUTS = ['hero-split', 'grid4', 'strips', 'single'];
export const GRADES = ['sunset', 'neon', 'midnight'];

/** Panel names shown in the editor, one per layout, in panel order. */
const PANEL_NAMES = {
  'hero-split': ['hero', 'lower left', 'lower right'],
  grid4: ['top left', 'top right', 'bottom left', 'bottom right'],
  strips: ['left strip', 'middle strip', 'right strip'],
  single: ['full photo'],
};

export function panelName(layout, index) {
  return PANEL_NAMES[layout]?.[index] ?? `panel ${index + 1}`;
}

/** Panel rectangles for a layout, as fractions of the cover (x, y, w, h). */
export function panelRectsForLayout(layout) {
  if (layout === 'grid4') {
    return [
      [0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5],
    ];
  }
  if (layout === 'strips') {
    return [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]];
  }
  if (layout === 'single') return [[0, 0, 1, 1]];
  // hero-split: one wide hero over two smaller panels.
  return [[0, 0, 1, 0.6], [0, 0.6, 0.5, 0.4], [0.5, 0.6, 0.5, 0.4]];
}

/** The three grades: sky gradient stops and the caption band colour. */
const GRADE_DEFS = {
  sunset: {
    stops: [[0, '#ff7a18'], [0.55, '#ff2d78'], [1, '#7b2ff7']],
    band: '#ff2d78', bandText: '#ffffff', pill: '#ff7a18',
  },
  neon: {
    stops: [[0, '#00e5ff'], [0.5, '#ff00a8'], [1, '#2b1055']],
    band: '#00e5ff', bandText: '#14081f', pill: '#ff00a8',
  },
  midnight: {
    stops: [[0, '#1b2a6b'], [0.55, '#5b2a86'], [1, '#ff7a18']],
    band: '#5b2a86', bandText: '#ffffff', pill: '#ffb347',
  },
};

export function gradeDef(grade) {
  return GRADE_DEFS[grade] ?? GRADE_DEFS.sunset;
}

/** Deterministic pseudo-random stream, so the grain is identical every render. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws one photo into a panel rect, cover-fit, with zoom and pan offsets. */
export function drawPhotoInPanel(ctx, photo, rect, slot) {
  const [x, y, w, h] = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (!photo) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3a1a4d');
    g.addColorStop(1, '#1b0f26');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(244, 238, 247, 0.75)';
    ctx.font = `800 ${Math.round(h * 0.05)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }
  const zoom = (slot?.zoom ?? 100) / 100;
  const base = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * zoom;
  const pw = photo.naturalWidth * base;
  const ph = photo.naturalHeight * base;
  // Default framing favours the top of a photo (where faces usually are)
  // when the panel crops vertically; the user's own pan adds on top of it.
  const topBias = ph > h ? (ph - h) * 0.18 : 0;
  const dx = x + (w - pw) / 2 + (slot?.dx ?? 0) * w;
  const dy = y + (h - ph) / 2 + (slot?.dy ?? 0) * h + topBias;
  ctx.drawImage(photo, dx, dy, pw, ph);
  // Gentle shade at the panel's foot so the caption band reads over any photo.
  const shade = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
  shade.addColorStop(0, 'rgba(20, 8, 31, 0)');
  shade.addColorStop(1, 'rgba(20, 8, 31, 0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Paints the colour grade over the whole cover: a diagonal wash plus vignette. */
export function gradeOverlay(ctx, w, h, grade) {
  const def = gradeDef(grade);
  const wash = ctx.createLinearGradient(0, 0, w, h);
  for (const [stop, colour] of def.stops) wash.addColorStop(stop, colour);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.45;
  const warm = ctx.createLinearGradient(0, h * 0.3, 0, h);
  warm.addColorStop(0, 'rgba(255, 122, 24, 0)');
  warm.addColorStop(1, 'rgba(255, 45, 120, 0.55)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // Vignette: darken the corners so the middle pops.
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(10, 4, 18, 0)');
  vig.addColorStop(1, 'rgba(10, 4, 18, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/** Sprinkles a little film grain over the cover (seeded, so it never flickers). */
export function filmGrain(ctx, w, h) {
  const rand = seededRandom(20261121);
  ctx.save();
  ctx.globalAlpha = 0.05;
  const count = Math.floor((w * h) / 9000);
  for (let i = 0; i < count; i += 1) {
    const shade = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
  }
  ctx.restore();
}

/** The bold caption band: a slanted colour bar, big outlined title, sub-caption. */
export function drawCaptionBand(ctx, w, h, state) {
  const def = gradeDef(state.grade);
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const bandH = h * 0.155;
  const top = state.captionSpot === 'top';
  const bandY = top ? 0 : h - bandH;
  const s = Math.max(20, Math.round(h * 0.085 * (state.titleSize ?? 100) / 100));

  ctx.save();
  // Slanted band.
  ctx.beginPath();
  const skew = w * 0.02;
  if (top) {
    ctx.moveTo(0, bandY);
    ctx.lineTo(w, bandY);
    ctx.lineTo(w - skew, bandY + bandH);
    ctx.lineTo(0, bandY + bandH);
  } else {
    ctx.moveTo(skew, bandY);
    ctx.lineTo(w, bandY);
    ctx.lineTo(w, bandY + bandH);
    ctx.lineTo(0, bandY + bandH);
  }
  ctx.closePath();
  ctx.fillStyle = def.band;
  ctx.fill();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = h * 0.02;
  ctx.shadowOffsetY = h * 0.004;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (title) {
    ctx.font = `900 ${s}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(s * 0.02)}px`;
    let size = s;
    while (ctx.measureText(title).width > w * 0.92 && size > 18) {
      size -= 2;
      ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ty = bandY + bandH * (subtitle ? 0.38 : 0.52);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.strokeStyle = 'rgba(20, 8, 31, 0.85)';
    ctx.strokeText(title, w / 2, ty);
    ctx.fillStyle = def.bandText;
    ctx.fillText(title, w / 2, ty);
    if (subtitle) {
      const sub = Math.round(h * 0.028);
      ctx.font = `800 ${sub}px system-ui, sans-serif`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(sub * 0.22)}px`;
      ctx.fillStyle = def.bandText;
      ctx.globalAlpha = 0.92;
      ctx.fillText(subtitle, w / 2, bandY + bandH * 0.8);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();

  // Small studio pill in the opposite corner from the band.
  const pillH = Math.round(h * 0.042);
  const pillW = Math.round(w * 0.29);
  const px = w * 0.03;
  const py = top ? h - pillH - h * 0.03 : h * 0.03;
  ctx.save();
  ctx.fillStyle = 'rgba(20, 8, 31, 0.72)';
  ctx.beginPath();
  ctx.roundRect(px, py, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(pillH * 0.38)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
  ctx.fillText('VICE COVER STUDIO', px + pillW / 2, py + pillH / 2 + 1);
  ctx.restore();
}

/**
 * Draws the whole cover. `state` carries layout, grade, title, subtitle,
 * titleSize, captionSpot, photos (HTMLImageElement[]) and slots
 * ([{ photo, zoom, dx, dy }] per panel index).
 */
export function drawCoverArt(ctx, w, h, state) {
  const gutter = Math.max(4, Math.round(Math.min(w, h) * 0.007));
  // Off-white frame the gutters show through.
  ctx.fillStyle = '#f5efe6';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRectsForLayout(state.layout);
  rects.forEach(([fx, fy, fw, fh], i) => {
    const rect = [
      Math.round(fx * w + gutter),
      Math.round(fy * h + gutter),
      Math.round(fw * w - gutter * 2),
      Math.round(fh * h - gutter * 2),
    ];
    const slot = state.slots?.[i] ?? { photo: null, zoom: 100, dx: 0, dy: 0 };
    const photo = slot.photo == null ? null : state.photos?.[slot.photo] ?? null;
    drawPhotoInPanel(ctx, photo, rect, slot);
  });
  gradeOverlay(ctx, w, h, state.grade);
  filmGrain(ctx, w, h);
  drawCaptionBand(ctx, w, h, state);
  // Thin dark outer frame.
  ctx.strokeStyle = 'rgba(20, 8, 31, 0.9)';
  ctx.lineWidth = Math.max(3, Math.round(Math.min(w, h) * 0.004));
  ctx.strokeRect(
    ctx.lineWidth / 2, ctx.lineWidth / 2,
    w - ctx.lineWidth, h - ctx.lineWidth,
  );
}
