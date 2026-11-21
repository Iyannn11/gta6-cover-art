# Vice Cover Lab — GTA 6-style Cover Art Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Iyannn11/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Iyannn11/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn a photo and a caption into GTA 6-style cover art: a multi-panel Vice City
poster with a neon-sunset colour grade, bold caption lettering and a magazine
masthead — exported as a PNG to share. Fully offline, no account, no upload.

## Try it

```sh
node serve.ts        # serves app/ at http://localhost:8080
```

Open `app/index.html` in desktop Chrome. It works with no network request:
every script, style and sample photo is a file under `app/`.

## What it does

- **6 panel layouts** — Hero Split, Four Grid, Three Strips, One Photo,
  Diagonal Split, and Magazine Cover (big hero + masthead + cover lines).
  Switching layout visibly re-arranges the poster.
- **5 colour grades** — Sunset, Neon Night, Midnight, Vice Dawn, Mono Noir.
  Each is a real grade: warm magenta-orange sky wash, teal-shadow /
  orange-highlight split tone, glow/bloom on the highlights, plus film grain
  and vignette toggles.
- **Per-panel control** — every panel gets its own photo, its own grade
  override, and its own zoom. Drag a panel to pan it, scroll over it to zoom,
  click it to select it.
- **Caption & masthead** — bold condensed caption with letter-spacing,
  outline and neon glow, positioned top / middle / bottom / off; an optional
  "LEONIDA" style masthead with rule and subline.
- **One-click looks** — six presets (Sunset Heist, Neon Nights, Midnight Run,
  Dawn Patrol, Noir Story, Vice Classic) plus a deterministic-seed
  "Randomize look" button: the same seed always rolls the same look.
- **Export PNG** — 1080 × 1080, 1080 × 1350 and 1920 × 1080, rendered at full
  size from the same code that draws the live preview.

## Photos

Two bundled sample photos (`app/samples/`, made with an image model for
make.fun and free to use) plus any photo uploaded from your machine. Uploaded
photos are read locally in the browser and never leave it.

## Originality

Everything here is original: no Rockstar Games logo, wordmark, official
artwork, character or font file. Lettering uses the system font stack only.

## Hand-in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the kit's
`buildDossier` from `vendor/makefun-app.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.
