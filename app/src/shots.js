// Vice Cover Lab — shot mode for screenshots.
// The dossier screenshots are taken from the real app with URL params:
//   ?shot=cover&photo=pier&caption=Sunset%20Heist&w=1280&h=720
//   ?shot=editor&photo=boulevard&caption=Boulevard%20Queen
// `cover` hides the editor chrome and fills the window with the poster;
// `editor` shows the full editor with the photo loaded.
// No other code depends on this file; it only reads the query string.

export function readShotParams() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  if (!shot) return null;
  const num = (key) => {
    const v = Number(q.get(key));
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  return {
    shot,
    photo: q.get('photo') || null,
    caption: q.get('caption') || null,
    layout: q.get('layout') || null,
    grade: q.get('grade') || null,
    aspect: q.get('aspect') || null,
    seed: num('seed'),
    w: num('w'),
    h: num('h'),
  };
}
