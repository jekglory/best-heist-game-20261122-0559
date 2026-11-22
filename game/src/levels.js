// MIDNIGHT VAULT — room definitions.
// Three heist locations, each a self-contained top-down floor plan.
// Coordinates are pixels on a 960 x 600 canvas. Walls are the canvas border;
// every obstacle is an axis-aligned rectangle that blocks movement and sight.

export const TILE = 40;
export const ROOM_W = 960;
export const ROOM_H = 600;
export const WALL = 24;

// A guard patrols a loop of waypoints and turns at each one.
function guard(x, y, waypoints, speed, range) {
  return { x, y, waypoints, wp: 0, speed, range, angle: Math.PI / 2, alert: 0, state: 'patrol', tx: x, ty: y, timer: 0, lastSeenX: 0, lastSeenY: 0, loseTimer: 0 };
}

// A wall camera sweeps its cone back and forth around a base angle.
function camera(x, y, baseAngle, sweep, speed, range) {
  return { x, y, baseAngle, sweep, speed, range, angle: baseAngle, t: 0, disabled: false };
}

export const LEVELS = [
  {
    name: 'THE GALLERY',
    sub: 'Ruang 1 dari 3 — curi Berlian Tengah Malam, lalu kabur lewat pintu keluar.',
    playerStart: { x: 480, y: 545 },
    exit: { x: 62, y: 576, label: 'PINTU KELUAR' },
    diamond: { x: 480, y: 112, value: 25000, label: 'BERLIAN TENGAH MALAM' },
    terminal: { x: 884, y: 545, label: 'TERMINAL KAMERA' },
    coins: 3,
    obstacles: [
      { x: 440, y: 66, w: 80, h: 30, kind: 'case', label: 'ETALASE' },
      { x: 200, y: 150, w: 70, h: 70, kind: 'pedestal', label: 'PATUNG' },
      { x: 690, y: 150, w: 70, h: 70, kind: 'pedestal', label: 'PATUNG' },
      { x: 380, y: 262, w: 200, h: 44, kind: 'bench', label: 'BANGKU' },
      { x: 118, y: 300, w: 56, h: 56, kind: 'planter', label: 'TANAMAN' },
      { x: 786, y: 300, w: 56, h: 56, kind: 'planter', label: 'TANAMAN' },
      { x: 445, y: 388, w: 70, h: 88, kind: 'statue', label: 'PATUNG BESAR' },
    ],
    guards: [
      guard(240, 120, [[240, 120], [720, 120], [720, 300], [240, 300]], 68, 175),
      guard(150, 452, [[150, 452], [810, 452]], 74, 175),
    ],
    cameras: [
      camera(480, 26, Math.PI / 2, 0.9, 0.55, 210),
    ],
    loot: [
      { x: 118, y: 82, value: 1200, label: 'LUKISAN', kind: 'painting', taken: false },
      { x: 842, y: 82, value: 900, label: 'VAS', kind: 'vase', taken: false },
      { x: 884, y: 300, value: 1500, label: 'JAM EMAS', kind: 'watch', taken: false },
    ],
  },
  {
    name: 'THE VAULT HALL',
    sub: 'Ruang 2 dari 3 — brankas dijaga tiga penjaga dan dua kamera.',
    playerStart: { x: 480, y: 545 },
    exit: { x: 898, y: 576, label: 'PINTU KELUAR' },
    diamond: { x: 480, y: 122, value: 25000, label: 'BERLIAN TENGAH MALAM' },
    terminal: { x: 76, y: 545, label: 'TERMINAL KAMERA' },
    coins: 3,
    obstacles: [
      { x: 400, y: 62, w: 160, h: 40, kind: 'vault', label: 'BRANKAS' },
      { x: 180, y: 220, w: 120, h: 50, kind: 'desk', label: 'MEJA' },
      { x: 660, y: 220, w: 120, h: 50, kind: 'desk', label: 'MEJA' },
      { x: 300, y: 380, w: 50, h: 50, kind: 'pillar', label: 'PILAR' },
      { x: 610, y: 380, w: 50, h: 50, kind: 'pillar', label: 'PILAR' },
      { x: 380, y: 300, w: 200, h: 36, kind: 'counter', label: 'KONTER' },
    ],
    guards: [
      guard(200, 122, [[200, 122], [760, 122]], 72, 180),
      guard(150, 482, [[150, 482], [810, 482]], 78, 180),
      guard(480, 200, [[480, 200], [480, 420]], 66, 170),
    ],
    cameras: [
      camera(120, 26, Math.PI / 2, 0.8, 0.6, 210),
      camera(840, 26, Math.PI / 2, 0.8, 0.6, 210),
    ],
    loot: [
      { x: 118, y: 142, value: 2500, label: 'TUMPUKAN UANG', kind: 'cash', taken: false },
      { x: 842, y: 142, value: 3200, label: 'BATANGAN EMAS', kind: 'gold', taken: false },
      { x: 480, y: 472, value: 2800, label: 'KALUNG', kind: 'necklace', taken: false },
    ],
  },
  {
    name: 'THE PENTHOUSE',
    sub: 'Ruang 3 dari 3 — apartemen terakhir. Ambil berlian, lalu pulang kaya.',
    playerStart: { x: 480, y: 545 },
    exit: { x: 62, y: 576, label: 'PINTU KELUAR' },
    diamond: { x: 480, y: 112, value: 25000, label: 'BERLIAN TENGAH MALAM' },
    terminal: { x: 884, y: 92, label: 'TERMINAL KAMERA' },
    coins: 3,
    obstacles: [
      { x: 440, y: 66, w: 80, h: 30, kind: 'case', label: 'ETALASE' },
      { x: 300, y: 180, w: 180, h: 60, kind: 'sofa', label: 'SOFA' },
      { x: 620, y: 180, w: 160, h: 70, kind: 'table', label: 'MEJA MAKAN' },
      { x: 150, y: 380, w: 140, h: 90, kind: 'bed', label: 'TEMPAT TIDUR' },
      { x: 620, y: 400, w: 180, h: 80, kind: 'pool', label: 'MEJA BILYAR' },
      { x: 884, y: 380, w: 50, h: 50, kind: 'planter', label: 'TANAMAN' },
    ],
    guards: [
      guard(200, 132, [[200, 132], [760, 132]], 82, 185),
      guard(150, 502, [[150, 502], [810, 502]], 80, 185),
      guard(480, 262, [[480, 262], [480, 432]], 70, 175),
    ],
    cameras: [
      camera(240, 26, Math.PI / 2, 0.85, 0.65, 215),
      camera(720, 26, Math.PI / 2, 0.85, 0.65, 215),
    ],
    loot: [
      { x: 100, y: 100, value: 4000, label: 'LUKISAN LANGKA', kind: 'painting', taken: false },
      { x: 862, y: 100, value: 1800, label: 'ANGGUR TUA', kind: 'wine', taken: false },
      { x: 862, y: 472, value: 5200, label: 'PERHIASAN', kind: 'necklace', taken: false },
    ],
  },
];
