// Wires the Vice Cover Studio editor: photos, panels, layout, grade, caption,
// size and export. The preview canvas is the live cover; every control redraws
// it through drawCoverArt (cover.js). A `?shot=` query instead sets up a fixed
// scene for a screenshot (shots.js) and skips the interactive defaults.

import { SIZES, LAYOUTS, GRADES, drawCoverArt, panelRectsForLayout, panelName } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const trayEl = document.getElementById('tray');
const panelLabelEl = document.getElementById('panelLabel');
const zoomEl = document.getElementById('zoom');

const state = {
  layout: 'hero-split',
  grade: 'sunset',
  size: 'square',
  title: 'VICE CITY',
  subtitle: 'SUNSET HEIST • 2026',
  titleSize: 100,
  captionSpot: 'bottom',
  photos: [],
  slots: [],
  selected: 0,
};

function slotCount() {
  return panelRectsForLayout(state.layout).length;
}

/** Keeps one slot per panel; new panels start empty, kept panels keep photos. */
function syncSlots() {
  const n = slotCount();
  while (state.slots.length < n) state.slots.push({ photo: null, zoom: 100, dx: 0, dy: 0 });
  state.slots.length = n;
  if (state.selected >= n) state.selected = 0;
}

function redraw() {
  const { w, h } = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCoverArt(ctx, w, h, state);
  panelLabelEl.textContent = `Panel ${state.selected + 1} — ${panelName(state.layout, state.selected)}`;
  const slot = state.slots[state.selected];
  if (slot) zoomEl.value = String(slot.zoom);
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Loads an image from a URL, resolving once it can be drawn on a canvas. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

function addPhoto(img, name) {
  state.photos.push(img);
  const thumb = document.createElement('img');
  thumb.src = img.src;
  thumb.alt = name;
  thumb.title = name;
  const index = state.photos.length - 1;
  thumb.addEventListener('click', () => assignPhotoToSelected(index));
  trayEl.appendChild(thumb);
  if (trayEl.querySelector('.tray-empty')) trayEl.querySelector('.tray-empty').remove();
  return index;
}

function assignPhotoToSelected(photoIndex) {
  syncSlots();
  state.slots[state.selected].photo = photoIndex;
  state.slots[state.selected].zoom = 100;
  state.slots[state.selected].dx = 0;
  state.slots[state.selected].dy = 0;
  [...trayEl.children].forEach((el, i) => el.classList.toggle('is-picked', i === photoIndex));
  setStatus(`Photo ${photoIndex + 1} placed in panel ${state.selected + 1}.`);
  redraw();
}

async function loadSampleFile(name, label) {
  try {
    const img = await loadImage(`samples/${name}.jpg`);
    const index = addPhoto(img, label);
    assignPhotoToSelected(index);
  } catch {
    setStatus(`Could not load the ${label} sample.`);
  }
}

document.getElementById('photoFiles').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file));
      const index = addPhoto(img, file.name);
      // First photo fills the hero panel automatically; the rest wait in the tray.
      if (state.photos.length === 1) assignPhotoToSelected(index);
    } catch {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} loaded. Click a panel, then a photo, to place it.`);
  redraw();
});

document.getElementById('samplePier').addEventListener('click', () => loadSampleFile('pier', 'Pier day'));
document.getElementById('sampleBoulevard').addEventListener('click', () => loadSampleFile('boulevard', 'Boulevard sunset'));

document.getElementById('fillAll').addEventListener('click', () => {
  if (!state.photos.length) {
    setStatus('Load a photo first — or try a sample below.');
    return;
  }
  syncSlots();
  state.slots.forEach((slot) => { slot.photo = 0; slot.zoom = 100; slot.dx = 0; slot.dy = 0; });
  setStatus('Every panel now shows the first photo.');
  redraw();
});

function bindChoiceGroup(id, key, values, onPick) {
  const group = document.getElementById(id);
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-' + key + ']');
    if (!btn) return;
    const value = btn.dataset[key];
    if (!values.includes(value)) return;
    state[key] = value;
    [...group.children].forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    onPick?.(value);
    redraw();
  });
}

bindChoiceGroup('layouts', 'layout', LAYOUTS, () => syncSlots());
bindChoiceGroup('grades', 'grade', GRADES);
bindChoiceGroup('sizes', 'size', Object.keys(SIZES));

document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});
document.getElementById('titleSize').addEventListener('input', (e) => {
  state.titleSize = Number(e.target.value);
  redraw();
});
document.getElementById('captionSpot').addEventListener('change', (e) => {
  state.captionSpot = e.target.value;
  redraw();
});

zoomEl.addEventListener('input', () => {
  syncSlots();
  state.slots[state.selected].zoom = Number(zoomEl.value);
  redraw();
});
document.getElementById('centerPhoto').addEventListener('click', () => {
  syncSlots();
  const slot = state.slots[state.selected];
  slot.dx = 0;
  slot.dy = 0;
  redraw();
});
document.getElementById('useEverywhere').addEventListener('click', () => {
  syncSlots();
  const slot = state.slots[state.selected];
  if (slot.photo == null) {
    setStatus('Put a photo in this panel first.');
    return;
  }
  state.slots.forEach((s) => { s.photo = slot.photo; });
  setStatus('That photo now fills every panel.');
  redraw();
});

/** Maps a mouse position on the preview to a panel index (or -1). */
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const { w, h } = SIZES[state.size];
  const px = ((clientX - r.left) / r.width) * w;
  const py = ((clientY - r.top) / r.height) * h;
  return panelRectsForLayout(state.layout).findIndex(([fx, fy, fw, fh]) => (
    px >= fx * w && px < (fx + fw) * w && py >= fy * h && py < (fy + fh) * h
  ));
}

let dragging = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  state.selected = i;
  syncSlots();
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const r = canvas.getBoundingClientRect();
  const { w, h } = SIZES[state.size];
  const slot = state.slots[state.selected];
  slot.dx += ((e.clientX - lastX) / r.width);
  slot.dy += ((e.clientY - lastY) / r.height);
  slot.dx = Math.max(-0.6, Math.min(0.6, slot.dx));
  slot.dy = Math.max(-0.6, Math.min(0.6, slot.dy));
  lastX = e.clientX;
  lastY = e.clientY;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  syncSlots();
  const slot = state.slots[state.selected];
  slot.zoom = Math.max(100, Math.min(260, slot.zoom - Math.sign(e.deltaY) * 12));
  redraw();
}, { passive: false });

document.getElementById('export').addEventListener('click', () => {
  const { w, h } = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCoverArt(off.getContext('2d'), w, h, state);
  off.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed — try again.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-cover-${w}x${h}.png`);
  }, 'image/png');
});

// Fixed scenes for screenshots: ?shot=cover shows the cover alone at the
// chosen size; ?shot=editor shows the full editor with photos loaded.
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), state, {
    canvas, loadImage, addPhoto, assignPhotoToSelected, syncSlots, redraw,
  });
} else {
  const empty = document.createElement('span');
  empty.className = 'tray-empty';
  empty.textContent = 'No photos yet — add yours or try a sample.';
  trayEl.appendChild(empty);
  syncSlots();
  redraw();
}
