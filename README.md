# Vice Cover Lab — GTA 6-style cover art maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Iyannn11/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Iyannn11/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn a photo and a caption into GTA 6-style cover art: a multi-panel
poster with a Vice City neon-sunset grade, bold outlined caption lettering,
and a LEONIDA masthead — exported as a PNG to share. Fully offline, static
files, no build step.

## How to use

1. Serve `app/` with any static server, e.g. `node serve.ts`, and open it.
2. Pick a layout (6: Hero split, Four grid, Three strips, One photo,
   Diagonal split, Magazine cover) and a colour grade (5: Sunset, Neon
   night, Midnight, Vice Dawn, Mono Noir).
3. Click a panel to select it, then set its photo (bundled samples or your
   own upload), drag to pan, scroll to zoom, or override its grade.
4. Write the caption, choose its position and size, toggle the LEONIDA
   masthead, magazine cover lines, film grain and vignette.
5. Hit a preset or **Randomize** (deterministic seed — same seed, same
   cover), then export PNG in **1080×1080**, **1080×1350** or **1920×1080**.

## Colour science

Every grade is a canvas filter plus a warm magenta-orange sky wash, a
teal-shadow / orange-highlight split tone, and a soft highlight bloom —
the neon-sunset look of Vice City posters. Film grain is seeded noise,
so the same state always renders the same cover.

## Files

- `app/index.html` — the editor page
- `app/style.css` — dark editor theme with neon accents
- `app/src/cover.js` — the rendering engine (layouts, grades, caption,
  masthead, grain, vignette, export sizes)
- `app/src/main.js` — editor state, controls, drag pan / scroll zoom,
  presets, deterministic Randomize, PNG export
- `app/samples/` — two bundled photos (made with an image model, free to use)
- `screenshots/` — renders of the real app: exported covers and the editor

## Originality

All art is original. No Rockstar Games logo, wordmark, official artwork,
character or font is used. Photos are read on your own machine and never
uploaded.

## License

MIT — see `LICENSE`.
