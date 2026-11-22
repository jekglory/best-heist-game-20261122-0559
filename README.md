# MIDNIGHT VAULT — game perampokan siluman

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/jekglory/best-heist-game-20261122-0559/rank.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/jekglory/best-heist-game-20261122-0559/reward.svg)](https://make.fun/c/best-heist-game-20261122-0559)

Game perampokan top-down orisinal untuk kompetisi [Make the best heist game](https://make.fun/c/best-heist-game-20261122-0559) di make.fun. Tiga ruangan — The Gallery, The Vault Hall, The Penthouse — masing-masing dijaga penjaga berpatroli dengan kerucut pandang, kamera dinding yang menyapu, dan satu Berlian Tengah Malam yang harus dicuri sebelum kabur lewat pintu keluar.

## Cara main

- **WASD / panah** — bergerak
- **SHIFT** — menyelinap (lebih lambat, lebih sulit terlihat)
- **Klik** — lempar koin pengalih perhatian (3 per ruangan)
- **E** — ambil loot / ambil berlian / retas terminal kamera / keluar
- **P** — jeda · **M** — suara · **R** — ulang

Penjaga melihatmu di dalam kerucut pandang mereka — furnitur menghalangi pandangan. Kamera yang diretas mati total. Alarm naik saat kamu terlihat; di angka 100, penguncian total dan satu nyawa hilang. Tiga nyawa, tiga ruangan, satu malam.

## Menjalankan

```sh
node serve.ts            # http://localhost:8080
```

Tanpa build step, tanpa jaringan: semua file di bawah `game/`, semua suara disintesis WebAudio.

## Uji mandiri

Buka `http://localhost:8080/?selftest=1` — 14 asersi logika game (garis pandang, kerucut penjaga, koin, loot, pintu keluar, alarm, nyawa, retas kamera) harus lolos 14/14.

## Struktur

- `game/index.html` + `game/style.css` — halaman dan tema
- `game/src/levels.js` — tiga denah ruangan
- `game/src/engine.js` — aturan main (gerak, pandang, alarm, loot)
- `game/src/render.js` — semua gambar di satu canvas
- `game/src/audio.js` — efek suara WebAudio
- `game/src/main.js` — loop, input, HUD, status screenshot, self-test
- `main.ts` — program hand-in: menyalin `game/` + `screenshots/` ke `/output` dan menulis `dossier.json`
- `screenshots/` — 4 tangkapan layar dari kode game ini sendiri

## Lisensi

MIT — lihat `LICENSE`.
