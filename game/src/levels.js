// Room layouts for Midnight Vault. One room = one level, all of it visible in
// a single 960x600 frame. Coordinates are canvas pixels. Walls and furniture
// block both movement and line of sight; guards patrol waypoints; cameras
// sweep from their wall mounts; the diamond is the level's loot target and
// the green door is the way out once it is taken.

export const ROOM_W = 960;
export const ROOM_H = 600;

// A wall/furniture block: {x, y, w, h, kind} where kind is 'wall' (room
// shell / pillar), 'case' (display case), 'desk', 'plant' or 'sofa'.
function rect(x, y, w, h, kind) {
  return { x, y, w, h, kind };
}

export const LEVELS = [
  {
    name: 'THE GALLERY',
    seed: 7,
    par: 75,
    start: { x: 60, y: 540 },
    exit: { x: 896, y: 40, w: 44, h: 56 },
    diamond: { x: 880, y: 300, value: 5000 },
    terminal: { x: 60, y: 60, w: 46, h: 30 },
    loot: [
      { x: 300, y: 110, value: 400, kind: 'painting' },
      { x: 620, y: 470, value: 600, kind: 'gold' },
      { x: 480, y: 300, value: 350, kind: 'vase' },
    ],
    solids: [
      rect(0, 0, 960, 16, 'wall'), rect(0, 584, 960, 16, 'wall'),
      rect(0, 0, 16, 600, 'wall'), rect(944, 0, 16, 600, 'wall'),
      rect(240, 150, 150, 26, 'case'),
      rect(560, 150, 150, 26, 'case'),
      rect(400, 330, 160, 26, 'desk'),
      rect(180, 420, 26, 120, 'sofa'),
      rect(760, 380, 26, 120, 'sofa'),
      rect(470, 60, 20, 20, 'plant'),
    ],
    guards: [
      {
        x: 480, y: 240, speed: 62, range: 165, halfAngle: 0.62,
        waypoints: [[480, 240], [480, 480], [200, 480], [200, 240]],
      },
      {
        x: 760, y: 120, speed: 58, range: 155, halfAngle: 0.62,
        waypoints: [[760, 120], [760, 300], [880, 300], [880, 120]],
      },
    ],
    cameras: [
      { x: 480, y: 16, base: Math.PI / 2, sweep: 0.9, speed: 0.55, range: 190, halfAngle: 0.5 },
    ],
  },
  {
    name: 'THE VAULT HALL',
    seed: 21,
    par: 90,
    start: { x: 60, y: 300 },
    exit: { x: 896, y: 520, w: 44, h: 56 },
    diamond: { x: 480, y: 300, value: 12000 },
    terminal: { x: 900, y: 60, w: 46, h: 30 },
    loot: [
      { x: 200, y: 90, value: 700, kind: 'gold' },
      { x: 760, y: 90, value: 700, kind: 'painting' },
      { x: 200, y: 510, value: 500, kind: 'vase' },
      { x: 760, y: 510, value: 900, kind: 'gold' },
    ],
    solids: [
      rect(0, 0, 960, 16, 'wall'), rect(0, 584, 960, 16, 'wall'),
      rect(0, 0, 16, 600, 'wall'), rect(944, 0, 16, 600, 'wall'),
      rect(430, 250, 100, 100, 'case'),
      rect(200, 200, 120, 26, 'desk'),
      rect(640, 200, 120, 26, 'desk'),
      rect(200, 380, 120, 26, 'desk'),
      rect(640, 380, 120, 26, 'desk'),
      rect(320, 90, 20, 20, 'plant'),
      rect(620, 490, 20, 20, 'plant'),
    ],
    guards: [
      {
        x: 300, y: 300, speed: 70, range: 175, halfAngle: 0.6,
        waypoints: [[300, 300], [300, 90], [660, 90], [660, 300], [660, 510], [300, 510]],
      },
      {
        x: 860, y: 300, speed: 66, range: 170, halfAngle: 0.6,
        waypoints: [[860, 300], [860, 120], [860, 480]],
      },
      {
        x: 120, y: 120, speed: 60, range: 160, halfAngle: 0.62,
        waypoints: [[120, 120], [120, 480]],
      },
    ],
    cameras: [
      { x: 480, y: 16, base: Math.PI / 2, sweep: 1.0, speed: 0.7, range: 200, halfAngle: 0.48 },
      { x: 16, y: 300, base: 0, sweep: 0.8, speed: 0.6, range: 185, halfAngle: 0.48 },
    ],
  },
  {
    name: 'THE PENTHOUSE',
    seed: 33,
    par: 105,
    start: { x: 480, y: 540 },
    exit: { x: 60, y: 40, w: 44, h: 56 },
    diamond: { x: 480, y: 110, value: 25000 },
    terminal: { x: 900, y: 540, w: 46, h: 30 },
    loot: [
      { x: 120, y: 150, value: 1000, kind: 'painting' },
      { x: 840, y: 150, value: 1000, kind: 'painting' },
      { x: 120, y: 450, value: 800, kind: 'gold' },
      { x: 840, y: 450, value: 800, kind: 'vase' },
      { x: 480, y: 300, value: 1500, kind: 'gold' },
    ],
    solids: [
      rect(0, 0, 960, 16, 'wall'), rect(0, 584, 960, 16, 'wall'),
      rect(0, 0, 16, 600, 'wall'), rect(944, 0, 16, 600, 'wall'),
      rect(380, 60, 200, 26, 'case'),
      rect(180, 240, 26, 140, 'sofa'),
      rect(754, 240, 26, 140, 'sofa'),
      rect(300, 420, 360, 26, 'desk'),
      rect(60, 260, 20, 20, 'plant'),
      rect(880, 260, 20, 20, 'plant'),
    ],
    guards: [
      {
        x: 240, y: 150, speed: 78, range: 185, halfAngle: 0.58,
        waypoints: [[240, 150], [720, 150], [720, 300], [240, 300]],
      },
      {
        x: 720, y: 450, speed: 74, range: 180, halfAngle: 0.58,
        waypoints: [[720, 450], [240, 450], [240, 300], [720, 300]],
      },
      {
        x: 480, y: 480, speed: 70, range: 175, halfAngle: 0.6,
        waypoints: [[480, 480], [480, 200]],
      },
      {
        x: 880, y: 300, speed: 64, range: 165, halfAngle: 0.62,
        waypoints: [[880, 300], [880, 120], [880, 480]],
      },
    ],
    cameras: [
      { x: 480, y: 16, base: Math.PI / 2, sweep: 1.1, speed: 0.8, range: 210, halfAngle: 0.46 },
      { x: 944, y: 300, base: Math.PI, sweep: 0.9, speed: 0.7, range: 200, halfAngle: 0.46 },
      { x: 16, y: 300, base: 0, sweep: 0.9, speed: 0.65, range: 200, halfAngle: 0.46 },
    ],
  },
];
