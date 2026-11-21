[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Iyannn11/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Iyannn11/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover Studio

A GTA-style cover art maker: load your own photos, fill several panels with
one photo or several, write a bold caption, pick a Vice City sunset or neon
colour grade, and export a PNG in 1080 × 1080, 1080 × 1350 or 1920 × 1080.

## How it works

1. **Add photos** — from your machine, or try the two bundled samples.
2. **Pick a layout** — Hero split, Four grid, Three strips, or One photo.
3. **Pick a grade** — Sunset, Neon night, or Midnight.
4. **Write the caption** — title, sub-caption, size, top or bottom.
5. **Arrange each panel** — click a panel to select it, then click a photo to
   place it; drag to move the photo, scroll to zoom, or use the sliders.
6. **Export** — one click downloads the PNG at the chosen post size.

Everything runs offline from the static files under `app/` — no build step,
no network request, and your photos are read on your own machine, never
uploaded.

## Try it

Serve `app/` with any static server and open `index.html` in desktop Chrome:

```sh
node serve.ts   # http://localhost:8080
```

## Originality

All design, lettering and code are original. No Rockstar Games logo,
wordmark, artwork, character or font is used. The lettering is a bold system
sans-serif stack drawn on canvas, and the two sample photos under
`app/samples/` were made for make.fun and are free to use.

## Files

- `app/index.html` — the editor page
- `app/style.css` — the Vice City dark theme
- `app/src/cover.js` — the cover renderer (panels, grade, caption, grain)
- `app/src/main.js` — the editor wiring (photos, panels, export)
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=`)
- `main.ts` — hands the app in: copies `app/` + `screenshots/` and writes
  `dossier.json` with the kit's `vendor/makefun-app.ts`

## License

MIT — see `LICENSE`.
