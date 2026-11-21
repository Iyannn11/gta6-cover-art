// Fixed scenes for screenshots: ?shot=cover shows the cover alone at the
// chosen size, ?shot=editor shows the full editor with photos loaded.
// Query knobs: photo, photo2 (samples/pier|boulevard), title, subtitle,
// layout, grade, size (square|portrait|wide), spot (top|bottom).
// window.__shotReady is set once the scene has painted.

import { LAYOUTS, GRADES, SIZES } from './cover.js';

function markChoice(groupId, attr, value) {
  const group = document.getElementById(groupId);
  if (!group) return;
  [...group.children].forEach((b) => {
    const on = b.dataset[attr] === value;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

export async function runShot(shot, query, state, api) {
  const pick = (key, fallback) => query.get(key) ?? fallback;
  state.layout = LAYOUTS.includes(pick('layout', '')) ? pick('layout', '') : 'hero-split';
  state.grade = GRADES.includes(pick('grade', '')) ? pick('grade', '') : 'sunset';
  state.size = pick('size', '') in SIZES ? pick('size', '') : 'square';
  state.title = pick('title', 'VICE CITY');
  state.subtitle = pick('subtitle', 'SUNSET HEIST • 2026');
  state.captionSpot = pick('spot', 'bottom') === 'top' ? 'top' : 'bottom';

  const titleInput = document.getElementById('title');
  const subtitleInput = document.getElementById('subtitle');
  if (titleInput) titleInput.value = state.title;
  if (subtitleInput) subtitleInput.value = state.subtitle;
  const spotSelect = document.getElementById('captionSpot');
  if (spotSelect) spotSelect.value = state.captionSpot;
  markChoice('layouts', 'layout', state.layout);
  markChoice('grades', 'grade', state.grade);
  markChoice('sizes', 'size', state.size);

  // Load the sample photos and spread them across the panels.
  const first = await api.loadImage(`samples/${pick('photo', 'pier')}.jpg`);
  const firstIndex = api.addPhoto(first, 'sample 1');
  const secondName = pick('photo2', '');
  let secondIndex = firstIndex;
  if (secondName) {
    const second = await api.loadImage(`samples/${secondName}.jpg`);
    secondIndex = api.addPhoto(second, 'sample 2');
  }
  api.syncSlots();
  state.slots.forEach((slot, i) => {
    slot.photo = i % 2 === 0 ? firstIndex : secondIndex;
    slot.zoom = 100;
    slot.dx = 0;
    slot.dy = 0;
  });
  // Nudge the hero photo so the subject sits off-centre, like a poster.
  if (state.slots[0]) state.slots[0].dx = 0.04;
  state.selected = 0;
  api.redraw();

  if (shot === 'cover') document.body.classList.add('shot-cover');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
