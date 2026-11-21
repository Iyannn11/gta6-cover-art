// Vice Cover Lab — editor wiring (Round 2).
// Loads the sample photos, binds every control, renders the live preview,
// and exports PNGs in the three post sizes. All offline, all local.

import {
  GRADES, LAYOUTS, PRESETS, SAMPLE_PHOTOS,
  defaultState, syncPanels, randomizeState,
  layoutPanels, renderPoster, exportCanvas,
} from './cover.js';
import { readShotParams } from './shots.js';

const $ = (id) => document.getElementById(id);

const state = defaultState();
const photos = new Map();       // photo id -> loaded HTMLImageElement
const photoNames = new Map();   // photo id -> display name
let selectedPanel = 0;
let aspect = 'square';          // square | portrait | wide
let shotMode = null;

const ASPECTS = {
  square:   { w: 900,  h: 900,  label: 'Square 1080 × 1080' },
  portrait: { w: 720,  h: 900,  label: 'Portrait 1080 × 1350' },
  wide:     { w: 900,  h: 506,  label: 'Wide 1920 × 1080' },
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function loadSamples() {
  for (const id of SAMPLE_PHOTOS) {
    try {
      const img = await loadImage(`samples/${id}.jpg`);
      photos.set(id, img);
      photoNames.set(id, id === 'pier' ? 'Pier — fishing' : 'Boulevard — sunset');
    } catch (e) {
      console.warn(e.message);
    }
  }
  render();
}

function previewSize() {
  return ASPECTS[aspect];
}

function render() {
  const canvas = $('preview');
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  syncPanels(state);
  renderPoster(canvas, state, photos);
  document.body.dataset.layout = state.layout;
  document.body.dataset.grade = state.grade;
  $('seedLabel').textContent = `seed #${state.seed}`;
  markActiveButtons();
}

function markActiveButtons() {
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('[data-grade]').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('[data-aspect]').forEach((b) => {
    b.classList.toggle('active', b.dataset.aspect === aspect);
  });
  document.querySelectorAll('[data-pos]').forEach((b) => {
    b.classList.toggle('active', b.dataset.pos === state.captionPos);
  });
}

function buildControlRows() {
  // Layout buttons.
  const layoutRow = $('layoutRow');
  layoutRow.innerHTML = '';
  for (const [key, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.layout = key;
    b.textContent = def.label;
    b.addEventListener('click', () => {
      state.layout = key;
      selectedPanel = 0;
      buildPanelRows();
      render();
    });
    layoutRow.appendChild(b);
  }
  // Grade buttons.
  const gradeRow = $('gradeRow');
  gradeRow.innerHTML = '';
  for (const [key, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.grade = key;
    b.textContent = def.label;
    b.addEventListener('click', () => {
      state.grade = key;
      render();
    });
    gradeRow.appendChild(b);
  }
  // Preset bar.
  const presetRow = $('presetRow');
  presetRow.innerHTML = '';
  for (const preset of PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'preset';
    b.textContent = preset.name;
    b.addEventListener('click', () => {
      Object.assign(state, {
        layout: preset.layout,
        grade: preset.grade,
        captionPos: preset.captionPos,
        masthead: preset.masthead,
        caption: preset.caption,
      });
      syncPanels(state);
      selectedPanel = 0;
      syncCaptionInputs();
      buildPanelRows();
      render();
    });
    presetRow.appendChild(b);
  }
}

function buildPanelRows() {
  const list = $('panelList');
  list.innerHTML = '';
  syncPanels(state);
  state.panels.forEach((panel, i) => {
    const row = document.createElement('div');
    row.className = 'panel-row' + (i === selectedPanel ? ' selected' : '');
    row.addEventListener('click', () => {
      selectedPanel = i;
      buildPanelRows();
      render();
    });

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = `Panel ${i + 1}`;
    row.appendChild(title);

    const photoSel = document.createElement('select');
    photoSel.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    for (const [id, name] of photoNames) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = name;
      photoSel.appendChild(opt);
    }
    photoSel.value = panel.photo;
    photoSel.addEventListener('change', () => {
      panel.photo = photoSel.value;
      render();
    });
    photoSel.addEventListener('click', (e) => e.stopPropagation());
    row.appendChild(photoSel);

    const gradeSel = document.createElement('select');
    gradeSel.setAttribute('aria-label', `Grade override for panel ${i + 1}`);
    const inherit = document.createElement('option');
    inherit.value = '';
    inherit.textContent = 'Grade: follow cover';
    gradeSel.appendChild(inherit);
    for (const [key, def] of Object.entries(GRADES)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `Grade: ${def.label}`;
      gradeSel.appendChild(opt);
    }
    gradeSel.value = panel.grade || '';
    gradeSel.addEventListener('change', () => {
      panel.grade = gradeSel.value || null;
      render();
    });
    gradeSel.addEventListener('click', (e) => e.stopPropagation());
    row.appendChild(gradeSel);

    const zoomLabel = document.createElement('label');
    zoomLabel.className = 'zoom-label';
    zoomLabel.textContent = 'Zoom';
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '3';
    zoom.step = '0.05';
    zoom.value = String(panel.zoom || 1);
    zoom.addEventListener('input', () => {
      panel.zoom = Number(zoom.value);
      render();
    });
    zoom.addEventListener('click', (e) => e.stopPropagation());
    zoomLabel.appendChild(zoom);
    row.appendChild(zoomLabel);

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'mini';
    reset.textContent = 'Reset pan / zoom';
    reset.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.zoom = 1;
      panel.ox = 0;
      panel.oy = 0;
      buildPanelRows();
      render();
    });
    row.appendChild(reset);

    list.appendChild(row);
  });
}

function syncCaptionInputs() {
  $('captionInput').value = state.caption;
  $('mastheadInput').value = state.mastheadText;
  $('mastheadToggle').checked = state.masthead;
  $('grainToggle').checked = state.grain;
  $('vignetteToggle').checked = state.vignette;
}

function bindControls() {
  $('captionInput').addEventListener('input', (e) => {
    state.caption = e.target.value;
    render();
  });
  document.querySelectorAll('[data-pos]').forEach((b) => {
    b.addEventListener('click', () => {
      state.captionPos = b.dataset.pos;
      render();
    });
  });
  $('mastheadToggle').addEventListener('change', (e) => {
    state.masthead = e.target.checked;
    render();
  });
  $('mastheadInput').addEventListener('input', (e) => {
    state.mastheadText = e.target.value;
    render();
  });
  $('grainToggle').addEventListener('change', (e) => {
    state.grain = e.target.checked;
    render();
  });
  $('vignetteToggle').addEventListener('change', (e) => {
    state.vignette = e.target.checked;
    render();
  });
  document.querySelectorAll('[data-aspect]').forEach((b) => {
    b.addEventListener('click', () => {
      aspect = b.dataset.aspect;
      render();
    });
  });
  $('randomBtn').addEventListener('click', () => {
    randomizeState(state, state.seed + 1);
    selectedPanel = 0;
    syncCaptionInputs();
    buildPanelRows();
    render();
  });
  $('uploadInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const id = `upload-${Date.now()}`;
        photos.set(id, img);
        photoNames.set(id, file.name);
        state.panels[selectedPanel].photo = id;
        buildPanelRows();
        buildPhotoThumbs();
        render();
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
  document.querySelectorAll('[data-export]').forEach((b) => {
    b.addEventListener('click', () => {
      const [w, h] = b.dataset.export.split('x').map(Number);
      const canvas = exportCanvas(state, photos, w, h);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `vice-cover-${w}x${h}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        $('exportNote').textContent = `Exported ${w} × ${h} PNG — check your downloads.`;
      }, 'image/png');
    });
  });
  bindCanvasDrag();
}

function buildPhotoThumbs() {
  const wrap = $('sampleThumbs');
  wrap.innerHTML = '';
  for (const [id, name] of photoNames) {
    const img = photos.get(id);
    if (!img) continue;
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = name;
    thumb.title = `${name} — click to put in panel ${selectedPanel + 1}`;
    thumb.className = 'thumb';
    thumb.addEventListener('click', () => {
      state.panels[selectedPanel].photo = id;
      buildPanelRows();
      render();
    });
    wrap.appendChild(thumb);
  }
}

// Drag to pan, scroll to zoom, click to select — per panel, on the preview.
function bindCanvasDrag() {
  const canvas = $('preview');
  let drag = null;

  function panelAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    const shapes = layoutPanels(state.layout, canvas.width, canvas.height);
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      if (s.kind === 'rect') {
        if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return i;
      } else {
        // Point-in-polygon for the diagonal split.
        let inside = false;
        const pts = s.pts;
        for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
          const [x1, y1] = pts[a];
          const [x2, y2] = pts[b];
          if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) {
            inside = !inside;
          }
        }
        if (inside) return i;
      }
    }
    return -1;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const i = panelAt(e.clientX, e.clientY);
    if (i < 0) return;
    selectedPanel = i;
    buildPanelRows();
    render();
    drag = { panel: state.panels[i], startX: e.clientX, startY: e.clientY, ox: state.panels[i].ox, oy: state.panels[i].oy };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    drag.panel.ox = drag.ox + (e.clientX - drag.startX) / rect.width;
    drag.panel.oy = drag.oy + (e.clientY - drag.startY) / rect.height;
    drag.panel.ox = Math.max(-0.5, Math.min(0.5, drag.panel.ox));
    drag.panel.oy = Math.max(-0.5, Math.min(0.5, drag.panel.oy));
    render();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const i = panelAt(e.clientX, e.clientY);
    if (i < 0) return;
    const panel = state.panels[i];
    panel.zoom = Math.max(1, Math.min(3, (panel.zoom || 1) * (e.deltaY < 0 ? 1.1 : 0.9)));
    selectedPanel = i;
    buildPanelRows();
    render();
  }, { passive: false });
}

function applyShot() {
  const params = readShotParams();
  if (!params) return;
  shotMode = params.shot;
  if (params.layout && LAYOUTS[params.layout]) state.layout = params.layout;
  if (params.grade && GRADES[params.grade]) state.grade = params.grade;
  if (params.caption) state.caption = params.caption;
  if (params.seed) randomizeState(state, Number(params.seed));
  if (params.aspect && ASPECTS[params.aspect]) aspect = params.aspect;
  syncPanels(state);
  // Shot photos alternate between the requested photo and the other sample,
  // so multi-panel layouts show different photos in each panel.
  if (params.photo && photos.has(params.photo)) {
    const other = SAMPLE_PHOTOS.find((p) => p !== params.photo) || params.photo;
    state.panels.forEach((p, i) => { p.photo = i % 2 === 0 ? params.photo : other; });
  }
  if (shotMode === 'cover') {
    document.body.classList.add('shot-cover');
    const canvas = $('preview');
    canvas.width = params.w || 1280;
    canvas.height = params.h || 720;
    renderPoster(canvas, state, photos);
  }
}

// Exposed for the shot harness and for quick checks in the console.
window.__viceCover = { state, photos, render, exportCanvas, ASPECTS };

buildControlRows();
bindControls();
syncCaptionInputs();
buildPanelRows();
loadSamples().then(() => {
  applyShot();
  if (shotMode !== 'cover') {
    buildPhotoThumbs();
    render();
  } else {
    buildPhotoThumbs();
  }
});
