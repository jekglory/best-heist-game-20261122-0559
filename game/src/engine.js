// Simulation for Midnight Vault: thief movement, vision cones, line of
// sight, guard patrol / chase / investigate, sweeping wall cameras, the
// alarm meter, loot, the hack terminal and the win / caught rules. The
// logic is fully deterministic — the only randomness is a seeded generator
// fixed per level — so a screenshot state and the self-test always replay
// the same way.

import { LEVELS, ROOM_W, ROOM_H } from './levels.js';

// Tiny seeded generator (mulberry32) so level flavour never depends on
// Math.random or on the wall clock. Same seed, same sequence, every run.
export function seeded(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;

function wrapAngle(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// True when the segment (x1,y1)-(x2,y2) touches rectangle r (slab test).
function segmentCrosses(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function hasLineOfSight(x1, y1, x2, y2, solids) {
  for (const s of solids) {
    if (segmentCrosses(x1, y1, x2, y2, s)) return false;
  }
  return true;
}

// Can an observer at (ox,oy) facing `dir` with this cone see the thief?
// Sneaking shrinks the distance at which the thief can be spotted.
export function canSee(ox, oy, dir, range, halfAngle, thief, solids) {
  const d = distance(ox, oy, thief.x, thief.y);
  const reach = thief.sneaking ? range * 0.55 : range;
  if (d > reach) return false;
  const ang = Math.atan2(thief.y - oy, thief.x - ox);
  if (Math.abs(wrapAngle(ang, dir)) > halfAngle) return false;
  return hasLineOfSight(ox, oy, thief.x, thief.y, solids);
}

function circleHitsSolids(x, y, r, solids) {
  for (const s of solids) {
    const cx = Math.max(s.x, Math.min(x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(y, s.y + s.h));
    if (distance(x, y, cx, cy) < r) return true;
  }
  return false;
}

// Move a circular body axis by axis so it slides along walls instead of
// sticking, then clamp it inside the room shell.
function slideCircle(e, dx, dy, solids) {
  const nx = e.x + dx;
  if (!circleHitsSolids(nx, e.y, e.r, solids)) e.x = nx;
  const ny = e.y + dy;
  if (!circleHitsSolids(e.x, ny, e.r, solids)) e.y = ny;
  e.x = Math.max(16 + e.r, Math.min(ROOM_W - 16 - e.r, e.x));
  e.y = Math.max(16 + e.r, Math.min(ROOM_H - 16 - e.r, e.y));
}

export function newGame() {
  return {
    levelIndex: 0,
    score: 0,
    lives: 3,
    coins: 3,
    totalTime: 0,
    state: 'title', // title | playing | paused | caught | roomclear | gameover | win
    stateTime: 0,
    muted: false,
    room: null,
  };
}

export function loadLevel(game, index) {
  const def = LEVELS[index];
  const rng = seeded(def.seed);
  const room = {
    def,
    index,
    time: 0,
    alarm: 0,
    alarmState: 'CALM',
    camerasOffUntil: -1,
    hackProgress: 0,
    hacking: false,
    diamondTaken: false,
    message: '',
    messageUntil: 0,
    thief: {
      x: def.start.x, y: def.start.y, r: 12, speed: 150,
      dir: 0, moving: false, sneaking: false,
    },
    guards: def.guards.map((g) => ({
      x: g.x, y: g.y, r: 13, dir: -Math.PI / 2, speed: g.speed,
      range: g.range, halfAngle: g.halfAngle,
      waypoints: g.waypoints, wp: 1, mode: 'patrol', // patrol | chase | investigate
      target: null, alert: 0, pauseUntil: 0, seesThief: false,
    })),
    cameras: def.cameras.map((c) => ({
      x: c.x, y: c.y, base: c.base, sweep: c.sweep, speed: c.speed,
      range: c.range, halfAngle: c.halfAngle, phase: rng() * TAU, dir: c.base,
      seesThief: false,
    })),
    loot: def.loot.map((l) => ({ ...l, taken: false, bob: rng() * TAU })),
    coinsOnFloor: [],
    sparkles: [],
  };
  game.room = room;
  game.state = 'playing';
  game.stateTime = 0;
  return room;
}

function closestGuard(room, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const g of room.guards) {
    const d = distance(g.x, g.y, x, y);
    if (d < bestD) { bestD = d; best = g; }
  }
  return best;
}

export function tossCoin(game) {
  const room = game.room;
  if (!room || game.state !== 'playing' || game.coins <= 0) return false;
  game.coins -= 1;
  const coin = { x: room.thief.x, y: room.thief.y, tx: 0, ty: 0, t: 0, landed: false };
  room.pendingCoin = coin;
  return true;
}

// A click tosses a coin at the clicked point; it lands there and the
// nearest guard walks over to have a look.
export function tossCoinAt(game, tx, ty) {
  const room = game.room;
  if (!room || game.state !== 'playing' || game.coins <= 0) return false;
  game.coins -= 1;
  const g = closestGuard(room, tx, ty);
  if (g) {
    g.mode = 'investigate';
    g.target = { x: tx, y: ty };
    g.alert = Math.max(g.alert, 0.4);
  }
  room.coinsOnFloor.push({ x: tx, y: ty, t: 0 });
  room.message = 'Coin tossed — a guard goes to look.';
  room.messageUntil = room.time + 2.5;
  return true;
}

function moveGuard(room, g, dt) {
  const thief = room.thief;
  if (g.mode === 'chase') {
    const d = distance(g.x, g.y, thief.x, thief.y);
    const ang = Math.atan2(thief.y - g.y, thief.x - g.x);
    g.dir = ang;
    if (d > 26) {
      const sp = g.speed * 1.55;
      slideCircle(g, Math.cos(ang) * sp * dt, Math.sin(ang) * sp * dt, room.def.solids);
    }
    if (d > g.range * 1.4) {
      g.mode = 'patrol';
      g.target = null;
    }
    return;
  }
  if (g.mode === 'investigate' && g.target) {
    const d = distance(g.x, g.y, g.target.x, g.target.y);
    const ang = Math.atan2(g.target.y - g.y, g.target.x - g.x);
    g.dir = ang;
    if (d > 14) {
      slideCircle(g, Math.cos(ang) * g.speed * dt, Math.sin(ang) * g.speed * dt, room.def.solids);
    } else if (room.time >= g.pauseUntil) {
      g.pauseUntil = room.time + 1.6;
      g.target = null;
      g.mode = 'patrol';
    }
    return;
  }
  // Patrol: walk the waypoint loop, pausing a beat at each stop to look around.
  if (room.time < g.pauseUntil) return;
  const wp = g.waypoints[g.wp % g.waypoints.length];
  const d = distance(g.x, g.y, wp[0], wp[1]);
  if (d < 10) {
    g.wp += 1;
    g.pauseUntil = room.time + 0.7;
    g.dir += 0.9;
    return;
  }
  const ang = Math.atan2(wp[1] - g.y, wp[0] - g.x);
  g.dir = ang;
  slideCircle(g, Math.cos(ang) * g.speed * dt, Math.sin(ang) * g.speed * dt, room.def.solids);
}

export function stepGame(game, input, dt) {
  const room = game.room;
  if (!room || game.state !== 'playing') return;
  room.time += dt;
  game.totalTime += dt;
  const thief = room.thief;

  // --- thief movement ---
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  thief.sneaking = !!input.sneak;
  thief.moving = mx !== 0 || my !== 0;
  if (thief.moving) {
    const len = Math.hypot(mx, my);
    const sp = thief.speed * (thief.sneaking ? 0.45 : 1);
    const nx = (mx / len) * sp * dt;
    const ny = (my / len) * sp * dt;
    slideCircle(thief, nx, ny, room.def.solids);
    thief.dir = Math.atan2(ny, nx);
  }

  // --- wall cameras sweep ---
  const camerasOff = room.time < room.camerasOffUntil;
  for (const c of room.cameras) {
    c.dir = c.base + Math.sin(room.time * c.speed + c.phase) * c.sweep;
    c.seesThief = !camerasOff && canSee(c.x, c.y, c.dir, c.range, c.halfAngle, thief, room.def.solids);
  }

  // --- guards spot / chase ---
  let anyoneSees = false;
  for (const g of room.guards) {
    g.seesThief = canSee(g.x, g.y, g.dir, g.range, g.halfAngle, thief, room.def.solids);
    if (g.seesThief) {
      anyoneSees = true;
      g.alert = Math.min(1, g.alert + dt * 1.4);
      if (g.alert > 0.55) g.mode = 'chase';
    } else {
      g.alert = Math.max(0, g.alert - dt * 0.25);
      if (g.mode === 'chase' && g.alert <= 0.05) {
        g.mode = 'investigate';
        g.target = { x: thief.x, y: thief.y };
      }
    }
    moveGuard(room, g, dt);
  }
  const cameraSees = room.cameras.some((c) => c.seesThief);
  if (cameraSees) anyoneSees = true;

  // --- alarm meter: climbs fast while seen, drains slowly while hidden ---
  const before = room.alarm;
  if (anyoneSees) {
    room.alarm = Math.min(100, room.alarm + dt * (cameraSees ? 34 : 26));
  } else {
    room.alarm = Math.max(0, room.alarm - dt * 7);
  }
  room.alarmState = room.alarm >= 75 ? 'TRIPPED!' : room.alarm >= 40 ? 'SUSPICIOUS' : room.alarm >= 12 ? 'WARY' : 'CALM';
  if (before < 40 && room.alarm >= 40) room.message = 'Someone saw something…';
  if (before < 75 && room.alarm >= 75) room.message = 'ALARM! Get out of sight!';

  // --- caught: a guard touches the thief, or the alarm maxes out ---
  // Either way the room resets and a life is lost.
  for (const g of room.guards) {
    if (distance(g.x, g.y, thief.x, thief.y) < g.r + thief.r + 2) {
      getCaught(game, 'A guard grabbed you.');
      return;
    }
  }
  if (room.alarm >= 100) {
    getCaught(game, 'The alarm went off — security swarmed the room.');
    return;
  }

  // --- loot, diamond, terminal, exit ---
  if (input.interact) {
    const d = room.def.diamond;
    if (!room.diamondTaken && distance(thief.x, thief.y, d.x, d.y) < 46) {
      room.diamondTaken = true;
      game.score += d.value;
      room.message = `The diamond is yours — $${d.value.toLocaleString()}. Now reach the green door!`;
      room.messageUntil = room.time + 4;
      room.sparkles.push({ x: d.x, y: d.y, t: 0 });
    }
    for (const l of room.loot) {
      if (!l.taken && distance(thief.x, thief.y, l.x, l.y) < 40) {
        l.taken = true;
        game.score += l.value;
        room.message = `Pocketed loot +$${l.value.toLocaleString()}.`;
        room.messageUntil = room.time + 2;
        room.sparkles.push({ x: l.x, y: l.y, t: 0 });
      }
    }
    const term = room.def.terminal;
    const tcx = term.x + term.w / 2;
    const tcy = term.y + term.h / 2;
    if (distance(thief.x, thief.y, tcx, tcy) < 58) {
      room.hacking = true;
      room.hackProgress += dt / 2.2;
      if (room.hackProgress >= 1) {
        room.camerasOffUntil = room.time + 12;
        room.hackProgress = 0;
        room.hacking = false;
        room.message = 'Cameras disabled for 12 seconds.';
        room.messageUntil = room.time + 3;
      }
    } else {
      room.hacking = false;
      room.hackProgress = Math.max(0, room.hackProgress - dt * 0.5);
    }
    const ex = room.def.exit;
    const ecx = ex.x + ex.w / 2;
    const ecy = ex.y + ex.h / 2;
    if (room.diamondTaken && distance(thief.x, thief.y, ecx, ecy) < 52) {
      clearRoom(game);
      return;
    }
  } else {
    room.hacking = false;
    room.hackProgress = Math.max(0, room.hackProgress - dt * 0.5);
  }

  for (const s of room.sparkles) s.t += dt;
  room.sparkles = room.sparkles.filter((s) => s.t < 0.8);
  for (const c of room.coinsOnFloor) c.t += dt;
}

function getCaught(game, why) {
  game.lives -= 1;
  game.state = game.lives <= 0 ? 'gameover' : 'caught';
  game.stateTime = 0;
  game.room.message = why;
}

function clearRoom(game) {
  const room = game.room;
  const timeBonus = Math.max(0, Math.round((room.def.par - room.time) * 20));
  game.score += timeBonus;
  game.state = 'roomclear';
  game.stateTime = 0;
  room.timeBonus = timeBonus;
}

export function nextLevel(game) {
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.state = 'win';
    game.stateTime = 0;
    return;
  }
  game.levelIndex += 1;
  game.coins = 3;
  loadLevel(game, game.levelIndex);
}

export function restartRoom(game) {
  game.coins = 3;
  loadLevel(game, game.levelIndex);
}
