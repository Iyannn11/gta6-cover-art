'use strict';
/* Vice Cover Lab — cover rendering engine.
 * Pure canvas, no network. Draws a GTA-style multi-panel cover from a
 * plain state object: layout, grade, caption, panels (photo + pan/zoom).
 * Everything is deterministic for a given state and seed. */

const ViceCover = (() => {
  // ------------------------------------------------------------- utilities
  /** Deterministic PRNG (mulberry32) so Randomize replays from its seed. */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function next() {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // ------------------------------------------------------------- layouts
  // Slots are normalised rects (0..1 of the cover). `poly` clips a slot to
  // a polygon instead of a rectangle, for the diagonal split.
  const LAYOUTS = [
    {
      id: 'hero', name: 'Hero split',
      slots: [
        { x: 0, y: 0, w: 0.615, h: 1 },
        { x: 0.625, y: 0, w: 0.375, h: 0.4925 },
        { x: 0.625, y: 0.5075, w: 0.375, h: 0.4925 },
      ],
    },
    {
      id: 'grid', name: 'Four grid',
      slots: [
        { x: 0, y: 0, w: 0.4925, h: 0.4925 },
        { x: 0.5075, y: 0, w: 0.4925, h: 0.4925 },
        { x: 0, y: 0.5075, w: 0.4925, h: 0.4925 },
        { x: 0.5075, y: 0.5075, w: 0.4925, h: 0.4925 },
      ],
    },
    {
      id: 'strips', name: 'Three strips',
      slots: [
        { x: 0, y: 0, w: 0.3267, h: 1 },
        { x: 0.3367, y: 0, w: 0.3267, h: 1 },
        { x: 0.6733, y: 0, w: 0.3267, h: 1 },
      ],
    },
    { id: 'single', name: 'One photo', slots: [{ x: 0, y: 0, w: 1, h: 1 }] },
    {
      id: 'diagonal', name: 'Diagonal split',
      slots: [
        { x: 0, y: 0, w: 1, h: 1, poly: [[0, 0], [1, 0], [0, 1]] },
        { x: 0, y: 0, w: 1, h: 1, poly: [[1, 0], [1, 1], [0, 1]] },
      ],
    },
    { id: 'magazine', name: 'Magazine cover', slots: [{ x: 0, y: 0, w: 1, h: 1 }] },
  ];

  function layoutById(id) {
    return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
  }

  // ------------------------------------------------------------- grades
  // Neon-sunset colour science: each grade is a canvas filter plus a warm
  // sky wash (magenta-orange), a teal-shadow / orange-highlight split tone
  // and a soft highlight glow, drawn as gradient overlays.
  const GRADES = [
    {
      id: 'sunset', name: 'Sunset',
      filter: 'saturate(1.28) contrast(1.08) brightness(1.03)',
      washTop: 'rgba(255, 94, 120, 0.34)', washBottom: 'rgba(255, 140, 40, 0.22)',
      shadowTint: 'rgba(0, 128, 140, 0.20)', accent: '#ff5e78',
      glow: 'rgba(255, 170, 80, 0.30)',
    },
    {
      id: 'neon', name: 'Neon night',
      filter: 'saturate(1.45) contrast(1.14) brightness(0.98) hue-rotate(-10deg)',
      washTop: 'rgba(190, 60, 255, 0.36)', washBottom: 'rgba(0, 220, 255, 0.20)',
      shadowTint: 'rgba(40, 0, 90, 0.26)', accent: '#00e5ff',
      glow: 'rgba(255, 0, 200, 0.30)',
    },
    {
      id: 'midnight', name: 'Midnight',
      filter: 'saturate(0.72) contrast(1.18) brightness(0.88)',
      washTop: 'rgba(20, 40, 120, 0.34)', washBottom: 'rgba(0, 10, 40, 0.30)',
      shadowTint: 'rgba(0, 20, 70, 0.30)', accent: '#7fb2ff',
      glow: 'rgba(120, 160, 255, 0.20)',
    },
    {
      id: 'dawn', name: 'Vice Dawn',
      filter: 'saturate(1.15) contrast(0.96) brightness(1.09)',
      washTop: 'rgba(255, 150, 190, 0.30)', washBottom: 'rgba(255, 200, 120, 0.22)',
      shadowTint: 'rgba(120, 60, 120, 0.14)', accent: '#ff9ecf',
      glow: 'rgba(255, 220, 170, 0.30)',
    },
    {
      id: 'noir', name: 'Mono Noir',
      filter: 'grayscale(1) contrast(1.28) brightness(1.06)',
      washTop: 'rgba(255, 255, 255, 0.10)', washBottom: 'rgba(0, 0, 0, 0.22)',
      shadowTint: 'rgba(0, 0, 0, 0.18)', accent: '#ffffff',
      glow: 'rgba(255, 255, 255, 0.16)',
    },
  ];

  function gradeById(id) {
    return GRADES.find((g) => g.id === id) || GRADES[0];
  }

  // ------------------------------------------------------------- grain
  const grainCache = new Map();
  /** A 192x192 tile of deterministic film grain for a seed. */
  function grainTile(seed) {
    const key = seed >>> 0;
    if (grainCache.has(key)) return grainCache.get(key);
    const tile = document.createElement('canvas');
    tile.width = 192; tile.height = 192;
    const tctx = tile.getContext('2d');
    const img = tctx.createImageData(192, 192);
    const rnd = mulberry32(key);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rnd() * 255);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    grainCache.set(key, tile);
    return tile;
  }

  // ------------------------------------------------------------- drawing
  function clipSlot(ctx, slot, W, H) {
    ctx.beginPath();
    if (slot.poly) {
      slot.poly.forEach(([px, py], i) => {
        const x = px * W, y = py * H;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
    } else {
      ctx.rect(slot.x * W, slot.y * H, slot.w * W, slot.h * H);
    }
    ctx.clip();
  }

  /** Draw one photo into one slot: cover-fit, pan/zoom, grade, glow. */
  function drawPanel(ctx, slot, panel, grade, W, H, images) {
    const sx = slot.x * W, sy = slot.y * H, sw = slot.w * W, sh = slot.h * H;
    ctx.save();
    clipSlot(ctx, slot, W, H);
    const img = panel && images[panel.src];
    if (!img || !img.naturalWidth) {
      const g = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
      g.addColorStop(0, '#2a1638'); g.addColorStop(1, '#120a1e');
      ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
    } else {
      const base = Math.max(sw / img.naturalWidth, sh / img.naturalHeight);
      const scale = base * (panel.zoom || 1);
      const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      const cx = panel.cx == null ? 0.5 : panel.cx;
      const cy = panel.cy == null ? 0.5 : panel.cy;
      const dx = sx + sw / 2 - cx * dw, dy = sy + sh / 2 - cy * dh;
      ctx.filter = grade.filter;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.filter = 'none';
    }
    // Warm sky wash (top) + split-tone shadow tint (bottom).
    let wash = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    wash.addColorStop(0, grade.washTop);
    wash.addColorStop(0.55, 'rgba(0,0,0,0)');
    wash.addColorStop(1, grade.washBottom);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = wash; ctx.fillRect(sx, sy, sw, sh);
    ctx.globalCompositeOperation = 'source-over';
    wash = ctx.createLinearGradient(sx, sy + sh * 0.45, sx, sy + sh);
    wash.addColorStop(0, 'rgba(0,0,0,0)');
    wash.addColorStop(1, grade.shadowTint);
    ctx.fillStyle = wash; ctx.fillRect(sx, sy, sw, sh);
    // Highlight bloom: a soft warm glow from the top corner.
    const glow = ctx.createRadialGradient(
      sx + sw * 0.82, sy + sh * 0.08, 0,
      sx + sw * 0.82, sy + sh * 0.08, Math.max(sw, sh) * 0.75,
    );
    glow.addColorStop(0, grade.glow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = glow; ctx.fillRect(sx, sy, sw, sh);
    ctx.globalCompositeOperation = 'source-over';
    // Thin inner frame so panels read as a poster grid.
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = Math.max(1, W * 0.0015);
    if (slot.poly) {
      ctx.beginPath();
      slot.poly.forEach(([px, py], i) => {
        const x = px * W, y = py * H;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath(); ctx.stroke();
    } else {
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
    }
    ctx.restore();
  }

  function drawMasthead(ctx, state, grade, W, H) {
    const size = H * 0.082;
    ctx.save();
    // Top scrim: a soft dark wash so the masthead stays legible on any
    // photo, however bright the sky behind it is.
    const scrim = ctx.createLinearGradient(0, 0, 0, H * 0.17);
    scrim.addColorStop(0, 'rgba(8,2,16,0.55)');
    scrim.addColorStop(1, 'rgba(8,2,16,0)');
    ctx.fillStyle = scrim; ctx.fillRect(0, 0, W, H * 0.17);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `900 ${size}px "Arial Black", "Arial Narrow", Impact, sans-serif`;
    try { ctx.letterSpacing = `${size * 0.14}px`; } catch (e) { /* older canvas */ }
    const y = H * 0.085;
    ctx.shadowColor = grade.accent; ctx.shadowBlur = size * 0.35;
    ctx.lineWidth = size * 0.09; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10, 4, 18, 0.9)';
    ctx.strokeText('LEONIDA', W / 2, y);
    const fill = ctx.createLinearGradient(0, y - size, 0, y);
    fill.addColorStop(0, '#ffffff'); fill.addColorStop(0.55, '#ffe9c4'); fill.addColorStop(1, '#ff9e57');
    ctx.fillStyle = fill;
    ctx.fillText('LEONIDA', W / 2, y);
    ctx.shadowBlur = 0;
    // Rule + place line under the masthead.
    const ruleY = y + size * 0.22;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1, H * 0.002);
    ctx.beginPath(); ctx.moveTo(W * 0.18, ruleY); ctx.lineTo(W * 0.82, ruleY); ctx.stroke();
    ctx.font = `700 ${H * 0.02}px "Arial Narrow", Arial, sans-serif`;
    try { ctx.letterSpacing = `${H * 0.008}px`; } catch (e) { /* older canvas */ }
    ctx.fillStyle = '#ffffff';
    ctx.fillText('V I C E   C I T Y', W / 2, ruleY + H * 0.028);
    ctx.restore();
  }

  function drawCoverLines(ctx, state, W, H) {
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    const small = H * 0.019;
    ctx.font = `800 ${small}px "Arial Narrow", Arial, sans-serif`;
    try { ctx.letterSpacing = `${small * 0.12}px`; } catch (e) { /* older canvas */ }
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = small * 0.4;
    ctx.textAlign = 'left';
    ctx.fillText('THE HEAT IS ON', W * 0.035, H * 0.16);
    ctx.fillText('WELCOME BACK TO', W * 0.035, H * 0.185);
    ctx.fillText('VICE CITY', W * 0.035, H * 0.21);
    ctx.textAlign = 'right';
    ctx.fillText('ISSUE 06 — 2026', W * 0.965, H * 0.16);
    ctx.fillText('TWO STORIES.', W * 0.965, H * 0.185);
    ctx.fillText('ONE CITY.', W * 0.965, H * 0.21);
    // Barcode strip, bottom-right, magazine style.
    const bw = W * 0.11, bh = H * 0.038, bx = W * 0.965 - bw, by = H - H * 0.055 - bh;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(bx - W * 0.008, by - H * 0.008, bw + W * 0.016, bh + H * 0.016);
    ctx.fillStyle = '#111111';
    const rnd = mulberry32(606);
    let x = bx;
    while (x < bx + bw - 2) {
      const wBar = 1 + Math.floor(rnd() * 4);
      if (rnd() > 0.45) ctx.fillRect(x, by, wBar, bh);
      x += wBar + 1 + Math.floor(rnd() * 3);
    }
    ctx.restore();
  }

  function drawCaption(ctx, state, grade, W, H) {
    const text = (state.caption || 'VICE CITY').toUpperCase();
    const sub = (state.sub || '').toUpperCase();
    const scale = state.captionScale || 1;
    const size = H * 0.085 * scale;
    const pos = state.captionPos || 'bottom';
    let bandY, bandH = H * 0.19 * scale;
    if (pos === 'top') bandY = H * 0.14;
    else if (pos === 'middle') bandY = H * 0.5 - bandH / 2;
    else bandY = H - bandH - H * 0.02;
    ctx.save();
    // Caption band: dark gradient so the lettering pops on any photo.
    const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    band.addColorStop(0, 'rgba(8,2,16,0)');
    band.addColorStop(0.25, 'rgba(8,2,16,0.55)');
    band.addColorStop(1, 'rgba(8,2,16,0.72)');
    ctx.fillStyle = band; ctx.fillRect(0, bandY, W, bandH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${size}px "Arial Black", "Arial Narrow", Impact, sans-serif`;
    try { ctx.letterSpacing = `${size * 0.1}px`; } catch (e) { /* older canvas */ }
    const cy = bandY + bandH * (sub ? 0.42 : 0.52);
    ctx.shadowColor = grade.accent; ctx.shadowBlur = size * 0.3;
    ctx.lineWidth = size * 0.085; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(8,2,16,0.95)';
    ctx.strokeText(text, W / 2, cy);
    const fill = ctx.createLinearGradient(0, cy - size * 0.6, 0, cy + size * 0.6);
    fill.addColorStop(0, '#ffffff'); fill.addColorStop(0.5, '#ffe6b8'); fill.addColorStop(1, grade.accent);
    ctx.fillStyle = fill;
    ctx.fillText(text, W / 2, cy);
    if (sub) {
      ctx.shadowBlur = size * 0.08;
      ctx.font = `800 ${size * 0.26}px "Arial Narrow", Arial, sans-serif`;
      try { ctx.letterSpacing = `${size * 0.09}px`; } catch (e) { /* older canvas */ }
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sub, W / 2, bandY + bandH * 0.86);
    }
    ctx.restore();
  }

  function drawVignette(ctx, W, H) {
    const g = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.78,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(5,0,12,0.38)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function drawGrain(ctx, state, W, H) {
    const tile = grainTile(state.seed || 1);
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.globalCompositeOperation = 'overlay';
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ------------------------------------------------------------- entry point
  /**
   * Draw the whole cover onto `canvas` (resized to W x H) from state.
   * `images` maps a photo src to a loaded HTMLImageElement.
   */
  function drawCover(canvas, state, images, W, H) {
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    // Outer frame base.
    ctx.fillStyle = '#0d0616'; ctx.fillRect(0, 0, W, H);
    const layout = layoutById(state.layout);
    const globalGrade = gradeById(state.grade);
    layout.slots.forEach((slot, i) => {
      const panel = (state.panels || [])[i] || null;
      const grade = panel && panel.grade ? gradeById(panel.grade) : globalGrade;
      drawPanel(ctx, slot, panel, grade, W, H, images);
    });
    const isMagazine = state.layout === 'magazine';
    if (state.masthead || isMagazine) drawMasthead(ctx, state, globalGrade, W, H);
    if (state.coverLines || isMagazine) drawCoverLines(ctx, state, W, H);
    drawCaption(ctx, state, globalGrade, W, H);
    if (state.vignette !== false) drawVignette(ctx, W, H);
    if (state.grain !== false) drawGrain(ctx, state, W, H);
    // Outer poster frame.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
    return canvas;
  }

  /** Render a fresh offscreen cover at W x H. */
  function renderCover(state, images, W, H) {
    return drawCover(document.createElement('canvas'), state, images, W, H);
  }

  const EXPORT_SIZES = [
    { id: 'square', name: '1080 × 1080', w: 1080, h: 1080 },
    { id: 'portrait', name: '1080 × 1350', w: 1080, h: 1350 },
    { id: 'wide', name: '1920 × 1080', w: 1920, h: 1080 },
  ];

  function exportSizeById(id) {
    return EXPORT_SIZES.find((s) => s.id === id) || EXPORT_SIZES[0];
  }

  return {
    LAYOUTS, GRADES, EXPORT_SIZES,
    layoutById, gradeById, exportSizeById,
    mulberry32, drawCover, renderCover,
  };
})();

if (typeof window !== 'undefined') window.ViceCover = ViceCover;
