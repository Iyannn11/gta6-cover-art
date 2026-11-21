'use strict';
/* Vice Cover Lab — editor wiring.
 * Owns the state, loads the photos, wires every control, and renders the
 * live preview through ViceCover.drawCover. Fully offline: photos are the
 * bundled samples or a file the user picks on their own machine. */

(() => {
  const SAMPLE_A = 'samples/boulevard.jpg';
  const SAMPLE_B = 'samples/pier.jpg';

  const PRESETS = [
    { id: 'sunset', name: 'Vice Sunset', layout: 'hero', grade: 'sunset', caption: 'VICE CITY', sub: 'LEONIDA · 2026', masthead: true, coverLines: true },
    { id: 'neon', name: 'Neon Nights', layout: 'strips', grade: 'neon', caption: 'NEON NIGHTS', sub: 'AFTER DARK IN VICE CITY', masthead: true, coverLines: false },
    { id: 'midnight', name: 'Midnight Run', layout: 'diagonal', grade: 'midnight', caption: 'MIDNIGHT RUN', sub: 'NO BRAKES · NO MERCY', masthead: false, coverLines: false },
    { id: 'magazine', name: 'Magazine', layout: 'magazine', grade: 'dawn', caption: 'LEONIDA', sub: 'THE HEAT IS ON', masthead: true, coverLines: true },
  ];

  const CAPTIONS = ['VICE CITY', 'NEON NIGHTS', 'MIDNIGHT RUN', 'LEONIDA', 'SUNSET STRIP', 'VICE HEAT'];

  function defaultState() {
    return {
      layout: 'hero',
      grade: 'sunset',
      caption: 'VICE CITY',
      sub: 'LEONIDA · 2026',
      captionPos: 'bottom',
      captionScale: 1,
      masthead: true,
      coverLines: true,
      grain: true,
      vignette: true,
      seed: 7,
      panels: [
        { src: SAMPLE_A, cx: 0.5, cy: 0.45, zoom: 1, grade: '' },
        { src: SAMPLE_B, cx: 0.5, cy: 0.5, zoom: 1, grade: '' },
        { src: SAMPLE_A, cx: 0.5, cy: 0.55, zoom: 1.1, grade: '' },
        { src: SAMPLE_B, cx: 0.5, cy: 0.5, zoom: 1, grade: '' },
      ],
    };
  }

  const state = defaultState();
  const images = {}; // src -> loaded HTMLImageElement
  let selectedPanel = 0;
  let renderQueued = false;

  const $ = (id) => document.getElementById(id);

  function loadImage(src) {
    if (images[src]) return Promise.resolve(images[src]);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { images[src] = img; resolve(img); };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function loadAllPhotos() {
    const srcs = [...new Set(state.panels.map((p) => p.src))];
    return Promise.all(srcs.map(loadImage));
  }

  // ------------------------------------------------------------- rendering
  function render() {
    const canvas = $('coverCanvas');
    if (!canvas) return;
    const layout = ViceCover.layoutById(state.layout);
    const aspect = layout.id === 'magazine' || state.layout === 'single' ? 1 : 1;
    void aspect;
    ViceCover.drawCover(canvas, state, images, 1080, 1080);
    $('layoutName').textContent = layout.name;
    $('panelCountLabel').textContent = `${layout.slots.length} panel${layout.slots.length > 1 ? 's' : ''}`;
    $('seedLabel').textContent = String(state.seed);
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(); });
  }

  // ------------------------------------------------------------- controls
  function buildChips(containerId, items, currentId, onPick) {
    const box = $(containerId);
    box.innerHTML = '';
    items.forEach((item) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (item.id === currentId ? ' active' : '');
      b.textContent = item.name;
      b.addEventListener('click', () => {
        onPick(item.id);
        buildChips(containerId, items, item.id, onPick);
        queueRender();
      });
      box.appendChild(b);
    });
  }

  function refreshChips() {
    buildChips('layoutGrid', ViceCover.LAYOUTS, state.layout, (id) => {
      state.layout = id;
      selectedPanel = 0;
      syncPanelControls();
    });
    buildChips('gradeGrid', ViceCover.GRADES, state.grade, (id) => { state.grade = id; });
    buildChips('presetGrid', PRESETS, '', (id) => applyPreset(id));
  }

  function applyPreset(id) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    state.layout = p.layout;
    state.grade = p.grade;
    state.caption = p.caption;
    state.sub = p.sub;
    state.masthead = p.masthead;
    state.coverLines = p.coverLines;
    $('captionInput').value = p.caption;
    $('subInput').value = p.sub;
    $('mastheadCheck').checked = p.masthead;
    $('coverLinesCheck').checked = p.coverLines;
    selectedPanel = 0;
    syncPanelControls();
    refreshChips();
    queueRender();
  }

  function randomize() {
    const rnd = ViceCover.mulberry32((Math.random() * 1e9) | 0);
    state.seed = (rnd() * 1e9) | 0;
    const r2 = ViceCover.mulberry32(state.seed);
    state.layout = ViceCover.LAYOUTS[Math.floor(r2() * ViceCover.LAYOUTS.length)].id;
    state.grade = ViceCover.GRADES[Math.floor(r2() * ViceCover.GRADES.length)].id;
    state.caption = CAPTIONS[Math.floor(r2() * CAPTIONS.length)];
    state.masthead = r2() > 0.3;
    state.coverLines = r2() > 0.5;
    $('captionInput').value = state.caption;
    $('mastheadCheck').checked = state.masthead;
    $('coverLinesCheck').checked = state.coverLines;
    selectedPanel = 0;
    syncPanelControls();
    refreshChips();
    queueRender();
  }

  function syncPanelControls() {
    const layout = ViceCover.layoutById(state.layout);
    const n = layout.slots.length;
    if (selectedPanel >= n) selectedPanel = 0;
    const panel = state.panels[selectedPanel];
    $('panelBadge').textContent = `Panel ${selectedPanel + 1} of ${n}`;
    $('panelPhotoLabel').textContent = panel.src.split('/').pop();
    document.querySelectorAll('.photo-btn[data-photo]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-photo') === panel.src);
    });
    $('panelGradeSelect').value = panel.grade || '';
    $('zoomRange').value = String(panel.zoom || 1);
    $('zoomLabel').textContent = `${(panel.zoom || 1).toFixed(2)}×`;
  }

  function setPanelPhoto(src) {
    state.panels[selectedPanel].src = src;
    loadImage(src).then(queueRender);
    syncPanelControls();
    queueRender();
  }

  // ------------------------------------------------------------- export
  function exportCover(sizeId) {
    const size = ViceCover.exportSizeById(sizeId);
    const canvas = ViceCover.renderCover(state, images, size.w, size.h);
    $('exportStatus').textContent = `Rendering ${size.name}…`;
    canvas.toBlob((blob) => {
      if (!blob) { $('exportStatus').textContent = 'Export failed.'; return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${size.id}-${size.w}x${size.h}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      $('exportStatus').textContent = `Exported ${size.name} PNG ✓`;
    }, 'image/png');
  }

  // ------------------------------------------------------------- pointer pan/zoom
  function panelAtPoint(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    const layout = ViceCover.layoutById(state.layout);
    for (let i = layout.slots.length - 1; i >= 0; i--) {
      const s = layout.slots[i];
      if (s.poly) {
        // Point-in-polygon for the diagonal split.
        let inside = false;
        for (let a = 0, b = s.poly.length - 1; a < s.poly.length; b = a++) {
          const [ax, ay] = s.poly[a]; const [bx, by] = s.poly[b];
          if ((ay > py) !== (by > py) && px < ((bx - ax) * (py - ay)) / (by - ay) + ax) inside = !inside;
        }
        if (inside) return i;
      } else if (px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h) {
        return i;
      }
    }
    return 0;
  }

  function wirePointer() {
    const canvas = $('coverCanvas');
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      selectedPanel = panelAtPoint(canvas, e.clientX, e.clientY);
      syncPanelControls();
      drag = { x: e.clientX, y: e.clientY, panel: state.panels[selectedPanel] };
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('dragging');
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const rect = canvas.getBoundingClientRect();
      const panel = drag.panel;
      const img = images[panel.src];
      if (!img || !img.naturalWidth) return;
      const layout = ViceCover.layoutById(state.layout);
      const slot = layout.slots[selectedPanel];
      const sw = slot.w * rect.width, sh = slot.h * rect.height;
      const base = Math.max(sw / img.naturalWidth, sh / img.naturalHeight);
      const scale = base * (panel.zoom || 1);
      const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      panel.cx = clamp01(panel.cx - (e.clientX - drag.x) / dw);
      panel.cy = clamp01(panel.cy - (e.clientY - drag.y) / dh);
      drag.x = e.clientX; drag.y = e.clientY;
      queueRender();
    });
    const endDrag = () => { drag = null; canvas.classList.remove('dragging'); };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const panel = state.panels[selectedPanel];
      panel.zoom = clamp01x((panel.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.93));
      $('zoomRange').value = String(panel.zoom);
      $('zoomLabel').textContent = `${panel.zoom.toFixed(2)}×`;
      queueRender();
    }, { passive: false });
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function clamp01x(v) { return v < 1 ? 1 : v > 3 ? 3 : v; }

  // ------------------------------------------------------------- shot mode
  // ?shot=cover&size=square|portrait|wide&layout=..&grade=..&seed=..
  // renders a cover-only view for screenshots; ?shot=editor is the editor.
  function applyShotParams() {
    const q = new URLSearchParams(window.location.search);
    const shot = q.get('shot');
    if (!shot) return null;
    if (q.get('layout')) state.layout = q.get('layout');
    if (q.get('grade')) state.grade = q.get('grade');
    if (q.get('caption')) { state.caption = q.get('caption'); }
    if (q.get('seed')) state.seed = parseInt(q.get('seed'), 10) || 7;
    if (q.get('masthead') === '0') state.masthead = false;
    if (q.get('lines') === '0') state.coverLines = false;
    return shot;
  }

  function enterCoverShotMode(sizeId) {
    document.body.classList.add('shot-cover');
    const size = ViceCover.exportSizeById(sizeId || 'square');
    const canvas = document.createElement('canvas');
    canvas.id = 'shotCanvas';
    ViceCover.drawCover(canvas, state, images, size.w, size.h);
    canvas.style.aspectRatio = `${size.w} / ${size.h}`;
    document.body.appendChild(canvas);
    document.title = `Vice Cover — ${size.name}`;
  }

  // ------------------------------------------------------------- init
  function init() {
    const shot = applyShotParams();
    // Grade override options.
    const sel = $('panelGradeSelect');
    ViceCover.GRADES.forEach((g) => {
      const o = document.createElement('option');
      o.value = g.id; o.textContent = g.name;
      sel.appendChild(o);
    });
    refreshChips();
    syncPanelControls();

    $('captionInput').addEventListener('input', (e) => { state.caption = e.target.value; queueRender(); });
    $('subInput').addEventListener('input', (e) => { state.sub = e.target.value; queueRender(); });
    $('captionPosSelect').addEventListener('change', (e) => { state.captionPos = e.target.value; queueRender(); });
    $('captionSizeRange').addEventListener('input', (e) => {
      state.captionScale = parseFloat(e.target.value);
      $('captionSizeLabel').textContent = `${Math.round(state.captionScale * 100)}%`;
      queueRender();
    });
    $('mastheadCheck').addEventListener('change', (e) => { state.masthead = e.target.checked; queueRender(); });
    $('coverLinesCheck').addEventListener('change', (e) => { state.coverLines = e.target.checked; queueRender(); });
    $('grainCheck').addEventListener('change', (e) => { state.grain = e.target.checked; queueRender(); });
    $('vignetteCheck').addEventListener('change', (e) => { state.vignette = e.target.checked; queueRender(); });
    $('randomizeBtn').addEventListener('click', randomize);
    $('panelGradeSelect').addEventListener('change', (e) => {
      state.panels[selectedPanel].grade = e.target.value;
      queueRender();
    });
    $('zoomRange').addEventListener('input', (e) => {
      state.panels[selectedPanel].zoom = parseFloat(e.target.value);
      $('zoomLabel').textContent = `${state.panels[selectedPanel].zoom.toFixed(2)}×`;
      queueRender();
    });
    $('resetPanelBtn').addEventListener('click', () => {
      const p = state.panels[selectedPanel];
      p.cx = 0.5; p.cy = 0.5; p.zoom = 1;
      syncPanelControls(); queueRender();
    });
    document.querySelectorAll('.photo-btn[data-photo]').forEach((b) => {
      b.addEventListener('click', () => setPanelPhoto(b.getAttribute('data-photo')));
    });
    $('uploadInput').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      loadImage(url).then(() => { setPanelPhoto(url); });
    });
    document.querySelectorAll('.export-btn').forEach((b) => {
      b.addEventListener('click', () => exportCover(b.getAttribute('data-export')));
    });
    wirePointer();

    loadAllPhotos().then(() => {
      if (shot === 'cover') {
        enterCoverShotMode(new URLSearchParams(window.location.search).get('size'));
      } else {
        render();
      }
      window.__viceCoverReady = true;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
