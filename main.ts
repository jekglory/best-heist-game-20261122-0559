// MIDNIGHT VAULT — the program that hands this entry in (Node 22,
// standard library only). The game itself is plain static files under
// game/: game/index.html and its ES modules, canvas art drawn in code and
// sound synthesized with WebAudio, no network request anywhere. This file
// copies game/ and screenshots/ into the output directory and writes
// dossier.json there with the vendored make.fun library — the summary the
// judge reads.
//
// Try it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// MAKEFUN_OUTPUT_DIR stands in for /output. The run is deterministic: the
// same repository always produces the same bytes in /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

// Start from a clean output: stale files from an earlier run must never
// leak into the entry. Only game/, screenshots/ and dossier.json are written.
mkdirSync(outputDir, { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's own caps: only the text cap changes the dossier's bytes. The
// rest mirror what the scorer refuses outright — more than 4 screenshots or
// one over 256 KiB, a game/ over 993 files or 48 MiB, or any game/ path over
// 1000 bytes. game/ shares /output's own 1000-entry cap with screenshots/
// and dossier.json, so the entry is kept well inside it.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
