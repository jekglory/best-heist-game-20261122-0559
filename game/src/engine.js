// MIDNIGHT VAULT — game logic (no drawing, no sound here).
// Pure rules: movement and collision, line of sight, guard vision cones,
// cameras, alarm, coins, loot, hacking, lives, winning and losing.
// The in-page self-test exercises these functions directly.

import { LEVELS, ROOM_W, ROOM_H, WALL } from './levels.js';

export const PLAYER_R = 11;
export const GUARD_R = 13;
export const WALK_SPEED = 152;
export const SNEAK_SPEED = 76;
export const INTERACT_RANGE = 42;
export const COIN_RADIUS = 220;
export const CHASE_SPEED = 132;

// --- geometry ---------------------------------------------------------------

// Does the segment (x1,y1)-(x2,y2) cross the rectangle r?
export function segmentHitsRect(x1, y1, x2, y2, r) {
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

// Is the line of sight between two points blocked by any obstacle?
export function lineBlocked(x1, y1, x2, y2, obstacles) {
  for (const o of obstacles) {
    if (segmentHitsRect(x1, y1, x2, y2, o)) return true;
  }
  return false;
}

// Is the target inside the watcher's vision cone?
export function inCone(ox, oy, angle, range, halfAngle, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const d = Math.hypot(dx, dy);
  if (d > range || d < 1) return d < 1;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= halfAngle;
}

// Full sight test: cone + range + line of sight. Sneaking shrinks the
// effective range, so a sneaking thief is harder to spot from far away.
export function canSee(seer, range, halfAngle, tx, ty, obstacles, sneaking) {
  const effRange = sneaking ? range * 0.62 : range;
  if (!inCone(seer.x, seer.y, seer.angle, effRange, halfAngle, tx, ty)) return false;
  return !lineBlocked(seer.x, seer.y, tx, ty, obstacles);
}

// --- state ------------------------------------------------------------------

export function createGame() {
  return {
    roomIndex: 0,
    phase: 'title', // title | playing | paused | caught | roomclear | win | gameover
    lives: 3,
    loot: 0,
    alarm: 0,
    coins: 3,
    timeMs: 0,
    caughtReason: '',
    message: '',
    messageTimer: 0,
    invulnTimer: 0,
    room: null,
    player: { x: 480, y: 545, angle: -Math.PI / 2, moving: false, sneaking: false },
    coin: null, // {x, y, timer} — a tossed coin lying on the floor
    particles: [],
    stats: { spotted: 0, hacks: 0, coinsThrown: 0 },
  };
}

export function loadRoom(game, index) {
  const def = LEVELS[index];
  game.roomIndex = index;
  game.room = {
    def,
    guards: def.guards.map((g) => ({
      ...g,
      waypoints: g.waypoints.map((w) => [...w]),
      x: g.waypoints[0][0],
      y: g.waypoints[0][1],
    })),
    cameras: def.cameras.map((c) => ({ ...c })),
    loot: def.loot.map((l) => ({ ...l })),
    diamondTaken: false,
    camerasHacked: false,
  };
  game.player.x = def.playerStart.x;
  game.player.y = def.playerStart.y;
  game.player.angle = -Math.PI / 2;
  game.coins = def.coins;
  game.coin = null;
  game.alarm = Math.min(game.alarm, 25);
  game.invulnTimer = 0;
  game.message = def.name + ' — ' + def.sub;
  game.messageTimer = 4;
}

// --- collision --------------------------------------------------------------

function circleHitsObstacles(x, y, r, obstacles) {
  for (const o of obstacles) {
    const cx = Math.max(o.x, Math.min(x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(y, o.y + o.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

function moveWithWalls(entity, dx, dy, r, obstacles) {
  const nx = entity.x + dx;
  if (nx - r >= WALL && nx + r <= ROOM_W - WALL && !circleHitsObstacles(nx, entity.y, r, obstacles)) {
    entity.x = nx;
  }
  const ny = entity.y + dy;
  if (ny - r >= WALL && ny + r <= ROOM_H - WALL && !circleHitsObstacles(entity.x, ny, r, obstacles)) {
    entity.y = ny;
  }
}

// --- player actions ---------------------------------------------------------

export function tossCoin(game, x, y) {
  if (game.phase !== 'playing' || game.coins <= 0) return false;
  game.coins -= 1;
  game.coin = { x: Math.max(WALL + 8, Math.min(ROOM_W - WALL - 8, x)), y: Math.max(WALL + 8, Math.min(ROOM_H - WALL - 8, y)), timer: 6 };
  game.stats.coinsThrown += 1;
  for (const g of game.room.guards) {
    const d = Math.hypot(g.x - game.coin.x, g.y - game.coin.y);
    if (d < COIN_RADIUS && g.state !== 'chase') {
      g.state = 'investigate';
      g.tx = game.coin.x;
      g.ty = game.coin.y;
      g.timer = 0;
    }
  }
  game.message = 'Koin dilempar — penjaga memeriksa suara itu.';
  game.messageTimer = 2.5;
  return true;
}

// Nearest thing the thief can use with E, or null.
export function nearestInteractable(game) {
  const p = game.player;
  const room = game.room;
  const def = room.def;
  const near = (x, y) => Math.hypot(p.x - x, p.y - y) <= INTERACT_RANGE;
  for (const l of room.loot) {
    if (!l.taken && near(l.x, l.y)) return { kind: 'loot', item: l };
  }
  if (!room.diamondTaken && near(def.diamond.x, def.diamond.y)) return { kind: 'diamond', item: def.diamond };
  if (!room.camerasHacked && near(def.terminal.x, def.terminal.y)) return { kind: 'terminal', item: def.terminal };
  if (near(def.exit.x, def.exit.y)) return { kind: 'exit', item: def.exit };
  return null;
}

// Returns a short label for the HUD hint, or '' when nothing is in reach.
export function interactHint(game) {
  const t = nearestInteractable(game);
  if (!t) return '';
  if (t.kind === 'loot') return 'E — AMBIL ' + t.item.label + ' (+$' + t.item.value.toLocaleString('en-US') + ')';
  if (t.kind === 'diamond') return 'E — AMBIL BERLIAN (+$25,000)';
  if (t.kind === 'terminal') return 'E — RETAS TERMINAL (matikan kamera)';
  if (t.kind === 'exit') {
    return game.room.diamondTaken ? 'E — KABUR LEWAT PINTU INI' : 'PINTU TERKUNCI — ambil berlian dulu';
  }
  return '';
}

// E pressed: use whatever is nearest. Returns 'loot' | 'diamond' | 'hack' | 'exit' | 'locked' | null.
export function tryInteract(game) {
  if (game.phase !== 'playing') return null;
  const t = nearestInteractable(game);
  if (!t) return null;
  if (t.kind === 'loot') {
    t.item.taken = true;
    game.loot += t.item.value;
    burst(game, t.item.x, t.item.y, '#ffd34d');
    game.message = t.item.label + ' diambil! +$' + t.item.value.toLocaleString('en-US');
    game.messageTimer = 2;
    return 'loot';
  }
  if (t.kind === 'diamond') {
    game.room.diamondTaken = true;
    game.loot += t.item.value;
    burst(game, t.item.x, t.item.y, '#7fe7ff');
    game.message = 'BERLIAN DIDAPAT! Sekarang kabur lewat pintu keluar.';
    game.messageTimer = 3;
    return 'diamond';
  }
  if (t.kind === 'terminal') {
    game.room.camerasHacked = true;
    for (const c of game.room.cameras) c.disabled = true;
    game.stats.hacks += 1;
    burst(game, t.item.x, t.item.y, '#7dff9a');
    game.message = 'Kamera dimatikan! Penjaga masih berjaga.';
    game.messageTimer = 3;
    return 'hack';
  }
  if (t.kind === 'exit') {
    if (!game.room.diamondTaken) {
      game.message = 'Pintu terkunci — ambil berlian dulu.';
      game.messageTimer = 2;
      return 'locked';
    }
    return 'exit';
  }
  return null;
}

export function burst(game, x, y, color) {
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    game.particles.push({ x, y, vx: Math.cos(a) * (30 + (i % 5) * 14), vy: Math.sin(a) * (30 + (i % 5) * 14), life: 0.55, color });
  }
}

// --- being caught -----------------------------------------------------------

export function caught(game, reason) {
  game.lives -= 1;
  game.caughtReason = reason;
  game.stats.spotted += 1;
  if (game.lives <= 0) {
    game.phase = 'gameover';
    return;
  }
  game.phase = 'caught';
  game.caughtTimer = 2.2;
  game.alarm = 25;
  game.coin = null; // a stale coin must not keep distracting after respawn
  game.player.x = game.room.def.playerStart.x;
  game.player.y = game.room.def.playerStart.y;
  game.invulnTimer = 2.5;
  for (const g of game.room.guards) {
    g.state = 'patrol';
    g.alert = 0;
    g.x = g.waypoints[0][0];
    g.y = g.waypoints[0][1];
    g.wp = 0;
  }
}

// --- per-frame update -------------------------------------------------------

function updateGuard(game, g, dt, obstacles) {
  const p = game.player;
  const sees = game.invulnTimer <= 0 && canSee(g, g.range, 0.6, p.x, p.y, obstacles, p.sneaking);
  if (sees) {
    const d = Math.hypot(p.x - g.x, p.y - g.y);
    const rate = p.sneaking ? 0.55 : 1.15;
    g.alert = Math.min(1, g.alert + dt * rate * (1.6 - d / g.range));
    g.lastSeenX = p.x;
    g.lastSeenY = p.y;
    if (g.alert >= 1 && g.state !== 'chase') {
      g.state = 'chase';
      g.loseTimer = 0;
    }
  } else if (g.state !== 'chase') {
    g.alert = Math.max(0, g.alert - dt * 0.35);
  }

  if (g.state === 'patrol') {
    const target = g.waypoints[g.wp];
    const dx = target[0] - g.x;
    const dy = target[1] - g.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) {
      g.wp = (g.wp + 1) % g.waypoints.length;
    } else {
      g.angle = Math.atan2(dy, dx);
      moveWithWalls(g, (dx / d) * g.speed * dt, (dy / d) * g.speed * dt, GUARD_R, obstacles);
    }
  } else if (g.state === 'investigate') {
    const dx = g.tx - g.x;
    const dy = g.ty - g.y;
    const d = Math.hypot(dx, dy);
    if (d < 10) {
      g.timer += dt;
      g.angle += dt * 2.2; // look around, puzzled
      if (g.timer > 3.5) {
        g.state = 'patrol';
        g.timer = 0;
      }
    } else {
      g.angle = Math.atan2(dy, dx);
      moveWithWalls(g, (dx / d) * g.speed * 1.15 * dt, (dy / d) * g.speed * 1.15 * dt, GUARD_R, obstacles);
    }
  } else if (g.state === 'chase') {
    const dx = p.x - g.x;
    const dy = p.y - g.y;
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      g.angle = Math.atan2(dy, dx);
      moveWithWalls(g, (dx / d) * CHASE_SPEED * dt, (dy / d) * CHASE_SPEED * dt, GUARD_R, obstacles);
    }
    if (sees) {
      g.loseTimer = 0;
      g.lastSeenX = p.x;
      g.lastSeenY = p.y;
    } else {
      g.loseTimer += dt;
      if (g.loseTimer > 3) {
        g.state = 'investigate';
        g.tx = g.lastSeenX;
        g.ty = g.lastSeenY;
        g.timer = 0;
        g.alert = 0.5;
      }
    }
    if (d < GUARD_R + PLAYER_R + 4 && game.invulnTimer <= 0) {
      caught(game, 'Tertangkap penjaga!');
    }
  }
}

export function updateGame(game, input, dt) {
  if (game.phase !== 'playing') return;
  dt = Math.min(dt, 0.05);
  game.timeMs += dt * 1000;
  const obstacles = game.room.def.obstacles;
  const p = game.player;

  // --- player movement
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  p.sneaking = !!input.sneak;
  p.moving = mx !== 0 || my !== 0;
  if (p.moving) {
    const len = Math.hypot(mx, my);
    const speed = p.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const nx = (mx / len) * speed * dt;
    const ny = (my / len) * speed * dt;
    p.angle = Math.atan2(ny, nx);
    moveWithWalls(p, nx, ny, PLAYER_R, obstacles);
  }

  // --- timers
  if (game.messageTimer > 0) game.messageTimer -= dt;
  if (game.invulnTimer > 0) game.invulnTimer -= dt;
  if (game.coin) {
    game.coin.timer -= dt;
    if (game.coin.timer <= 0) game.coin = null;
  }
  for (const pt of game.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  game.particles = game.particles.filter((pt) => pt.life > 0);

  // --- cameras sweep
  let cameraSees = false;
  for (const c of game.room.cameras) {
    if (c.disabled) continue;
    c.t += dt;
    c.angle = c.baseAngle + Math.sin(c.t * c.speed) * c.sweep;
    if (game.invulnTimer <= 0 && canSee(c, c.range, 0.45, p.x, p.y, obstacles, p.sneaking)) {
      cameraSees = true;
    }
  }

  // --- guards
  let guardSees = false;
  let chasing = false;
  for (const g of game.room.guards) {
    updateGuard(game, g, dt, obstacles);
    if (game.phase !== 'playing') return; // caught() switched phase
    if (g.alert > 0.45) guardSees = true;
    if (g.state === 'chase') chasing = true;
  }

  // --- alarm
  if (cameraSees) game.alarm += dt * 24;
  else if (chasing) game.alarm += dt * 13;
  else if (guardSees) game.alarm += dt * 6;
  else game.alarm = Math.max(0, game.alarm - dt * 5);
  game.alarm = Math.min(100, game.alarm);
  if (game.alarm >= 100) {
    caught(game, 'Alarm mencapai 100 — penguncian total!');
  }
}

// Room finished: advance, or win after the last room.
export function advanceRoom(game) {
  if (game.roomIndex >= LEVELS.length - 1) {
    game.phase = 'win';
    return 'win';
  }
  game.phase = 'roomclear';
  game.clearTimer = 2.4;
  return 'roomclear';
}

export function finishRoomClear(game) {
  loadRoom(game, game.roomIndex + 1);
  game.phase = 'playing';
}

export function gradeTitle(game) {
  if (game.stats.spotted === 0 && game.alarm < 50) return 'HANTU — tak pernah terlihat';
  if (game.stats.spotted === 0) return 'BAYANGAN — nyaris tak terlihat';
  if (game.stats.spotted <= 2) return 'PENCURI ULUNG';
  return 'PENCURI BERUNTUNG';
}
