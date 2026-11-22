// MIDNIGHT VAULT — hand-in program (Node 22, standard library only).
//
// It assembles the entry in the output directory the grader provides:
// the playable game under game/, the maker's screenshots under
// screenshots/, and dossier.json, the summary the judge reads, built by
// the vendored make.fun library from exactly those files.
//
// The program runs twice and must write identical bytes both times, so it
// first empties the output directory's contents (never the directory
// itself — the grader owns it) and then copies fresh files in.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast with a clear message when the game folder is missing, instead
// of writing a dossier for an empty entry.
if (!existsSync(join(repoRoot, 'game', 'index.html'))) {
  throw new Error('game/index.html not found — nothing to hand in');
}

// Empty the output directory without removing the directory itself.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

// The game: plain static files, playable offline from game/index.html.
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });

// The screenshots: real renders of the game's own code, first by name is
// the cover. The folder is created even when empty so the layout is stable.
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The dossier: byte-for-byte what the vendored library writes from the
// files above, under the scorer's caps for this competition.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// One line on stdout so a local run shows what it wrote; the bytes in
// /output are the same on every run.
console.log('wrote', join(outDir, 'dossier.json'));
