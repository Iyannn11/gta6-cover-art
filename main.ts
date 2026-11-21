// Vice Cover Lab — hand-in program for make.fun (gta6-cover-art-01).
// Copies app/ and screenshots/ into the output directory and writes the
// dossier with the kit's buildDossier. Node 22 standard library only, so it
// runs twice with byte-identical output and no install step.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from a clean output directory so a rerun cannot leave stale files.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Hand in the app and its screenshots exactly as they sit in the repo.
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

// The dossier the scorer rebuilds and compares byte for byte.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`vice-cover-lab: wrote ${outDir} (${dossier.length} byte dossier)`);
