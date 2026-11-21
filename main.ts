/**
 * Vice Cover Lab — hand-in program for make.fun gta6-cover-art-01.
 *
 * Copies app/ and screenshots/ from this repository into the output
 * directory and writes dossier.json there with buildDossier from
 * vendor/makefun-app.ts. Node 22 standard library only, deterministic:
 * two runs write the same bytes.
 *
 * The output directory is a mount point in the grader, so it is never
 * removed itself: it is created if missing, only its children are cleared,
 * and files are copied in over it.
 */
import { buildDossier } from './vendor/makefun-app.ts';
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BOT_DIR =
  process.env.MAKEFUN_BOT_DIR ??
  dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/**
 * Give a copied tree owner-write permission, top down. The repository is
 * read-only, and the copy keeps its modes, so without this a second run
 * could not clear what the first run wrote.
 */
function makeWritable(path: string): void {
  const st = lstatSync(path);
  if (st.isDirectory()) {
    for (const entry of readdirSync(path)) makeWritable(join(path, entry));
    chmodSync(path, 0o755);
  } else if (st.isFile()) {
    chmodSync(path, 0o644);
  }
}

/** Remove a child of the output directory, whatever mode it was copied with. */
function removeChild(path: string): void {
  makeWritable(path);
  rmSync(path, { recursive: true, force: true });
}

/** Clear only the children of a directory, never the directory itself. */
function clearChildren(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    removeChild(join(dir, entry.name));
  }
}

function main(): void {
  // The output directory may be a mount point: create it if missing and
  // empty it by removing its children, never the directory itself.
  mkdirSync(OUT_DIR, { recursive: true });
  clearChildren(OUT_DIR);

  for (const name of ['app', 'screenshots']) {
    const src = join(BOT_DIR, name);
    if (!existsSync(src)) continue;
    cpSync(src, join(OUT_DIR, name), { recursive: true });
  }

  const dossier = buildDossier(OUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);
}

main();
