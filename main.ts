// Vice Cover Studio — the program that hands the app in (Node 22, standard
// library only). It copies this repository's app/ and screenshots/ into the
// output directory and writes output/dossier.json with the make.fun library
// (vendor/makefun-app.ts, the kit's copy, unchanged). The grader runs this
// program twice in a fresh container with no network and requires both runs
// to write the same bytes; MAKEFUN_OUTPUT_DIR stands in for /output outside
// the grader, so locally:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's own caps, so a build that passes here passes the scorer: at most
// 4 screenshots of 256 KiB, app/ at most 993 files and 48 MiB, and the dossier
// text capped at 160 KiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
