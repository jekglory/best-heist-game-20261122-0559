// Canvas rendering for Midnight Vault. Every picture is drawn in code —
// no image assets — so the game is a handful of static files and the
// dossier carries the whole game. One frame shows the entire room: the
// thief, the guards and their vision cones, the sweeping cameras, the loot
// and the alarm state.

import { ROOM_W, ROOM_H } from './levels.js';

const FLOOR_A = '#1b1b2a';
const FLOOR_B = '#181826';

function drawCone(ctx, x, y, dir, range, halfAngle, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - halfAngle, dir + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawBox(ctx, r, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  }
}

function text(ctx, str, x, y, color, size) {
  ctx.font = `700 ${size}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function render(ctx, game) {
  const room = game.room;
  ctx.clearRect(0, 0, ROOM_W, ROOM_H);

  // --- floor: checker tiles ---
  const tile = 48;
  for (let ty = 0; ty < ROOM_H / tile; ty += 1) {
    for (let tx = 0; tx < ROOM_W / tile; tx += 1) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(tx * tile, ty * tile, tile, tile);
    }
  }

  if (!room) {
    text(ctx, 'MIDNIGHT VAULT', ROOM_W / 2, ROOM_H / 2 - 20, '#ffd75e', 44);
    text(ctx, 'press ENTER to start the job', ROOM_W / 2, ROOM_H / 2 + 30, '#b9b3c4', 16);
    return;
  }

  const def = room.def;
  const camerasOff = room.time < room.camerasOffUntil;

  // --- exit door (green, glows once the diamond is taken) ---
  const ex = def.exit;
  drawBox(ctx, ex, room.diamondTaken ? '#1f7a37' : '#2a4a32', '#4caf6d');
  text(ctx, 'EXIT', ex.x + ex.w / 2, ex.y + ex.h / 2, room.diamondTaken ? '#b8ffcf' : '#7fae8d', 11);
  if (room.diamondTaken) {
    ctx.strokeStyle = 'rgba(120,255,160,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ex.x - 4, ex.y - 4, ex.w + 8, ex.h + 8);
  }

  // --- hack terminal ---
  const term = def.terminal;
  drawBox(ctx, term, '#232338', '#6f6f9e');
  text(ctx, 'CAM', term.x + term.w / 2, term.y + 12, '#9fb4ff', 10);
  text(ctx, 'HACK', term.x + term.w / 2, term.y + 22, '#9fb4ff', 8);
  if (room.hackProgress > 0) {
    ctx.fillStyle = '#9fb4ff';
    ctx.fillRect(term.x - 4, term.y + term.h + 4, term.w + 8, 5);
    ctx.fillStyle = '#ffd75e';
    ctx.fillRect(term.x - 4, term.y + term.h + 4, (term.w + 8) * room.hackProgress, 5);
  }

  // --- vision cones sit under everything else ---
  for (const c of room.cameras) {
    drawCone(ctx, c.x, c.y, c.dir, c.range, c.halfAngle,
      camerasOff ? 'rgba(120,120,140,0.05)'
        : c.seesThief ? 'rgba(255,60,60,0.28)' : 'rgba(255,190,60,0.13)',
      camerasOff ? 'rgba(120,120,140,0.15)'
        : c.seesThief ? 'rgba(255,60,60,0.55)' : 'rgba(255,190,60,0.30)');
  }
  for (const g of room.guards) {
    drawCone(ctx, g.x, g.y, g.dir, g.range, g.halfAngle,
      g.seesThief ? 'rgba(255,60,60,0.30)'
        : g.mode === 'chase' ? 'rgba(255,120,60,0.24)' : 'rgba(255,220,90,0.14)',
      g.seesThief ? 'rgba(255,60,60,0.6)' : 'rgba(255,220,90,0.35)');
  }

  // --- furniture and walls ---
  for (const s of def.solids) {
    if (s.kind === 'wall') {
      drawBox(ctx, s, '#2c2c40', '#45455e');
    } else if (s.kind === 'case') {
      drawBox(ctx, s, '#3a2f1d', '#c9a227');
      text(ctx, '◆', s.x + s.w / 2, s.y + s.h / 2, '#ffd75e', 13);
    } else if (s.kind === 'desk') {
      drawBox(ctx, s, '#4a3226', '#8a6a4a');
    } else if (s.kind === 'sofa') {
      drawBox(ctx, s, '#3d2b4a', '#7a5a9e');
    } else if (s.kind === 'plant') {
      ctx.fillStyle = '#2f6b3a';
      ctx.beginPath();
      ctx.arc(s.x + 10, s.y + 10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4caf6d';
      ctx.stroke();
    }
  }

  // --- side loot, gently bobbing ---
  for (const l of room.loot) {
    if (l.taken) continue;
    const bob = Math.sin(room.time * 2 + l.bob) * 2;
    if (l.kind === 'painting') {
      drawBox(ctx, { x: l.x - 14, y: l.y - 10 + bob, w: 28, h: 20 }, '#5a3a1a', '#ffd75e');
      text(ctx, '$', l.x, l.y + bob, '#ffd75e', 13);
    } else if (l.kind === 'gold') {
      ctx.fillStyle = '#ffd75e';
      ctx.beginPath();
      ctx.moveTo(l.x - 10, l.y + 6 + bob);
      ctx.lineTo(l.x - 6, l.y - 6 + bob);
      ctx.lineTo(l.x + 6, l.y - 6 + bob);
      ctx.lineTo(l.x + 10, l.y + 6 + bob);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#7ec8e3';
      ctx.beginPath();
      ctx.ellipse(l.x, l.y + bob, 8, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d8f4ff';
      ctx.stroke();
    }
  }

  // --- the diamond, pulsing to catch the eye ---
  const d = def.diamond;
  if (!room.diamondTaken) {
    const pulse = 1 + Math.sin(room.time * 3) * 0.12;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#bfe9ff';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(12, -4);
    ctx.lineTo(0, 16);
    ctx.lineTo(-12, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = `rgba(191,233,255,${0.35 + 0.25 * Math.sin(room.time * 3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 26, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, 'THE DIAMOND', d.x, d.y + 34, '#bfe9ff', 10);
  }

  // --- tossed coins on the floor ---
  for (const c of room.coinsOnFloor) {
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6a00';
    ctx.stroke();
  }

  // --- cameras on their wall mounts ---
  for (const c of room.cameras) {
    ctx.fillStyle = camerasOff ? '#55555f' : '#3a3a4a';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = camerasOff ? '#888' : c.seesThief ? '#ff4d4d' : '#ffc23d';
    ctx.lineWidth = 2;
    ctx.stroke();
    const exx = c.x + Math.cos(c.dir) * 14;
    const eyy = c.y + Math.sin(c.dir) * 14;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(exx, eyy);
    ctx.stroke();
    ctx.fillStyle = camerasOff ? '#888' : c.seesThief ? '#ff4d4d' : '#ff4d4d';
    ctx.beginPath();
    ctx.arc(exx, eyy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- guards, with a facing tick and a cap ---
  // Red = chasing, amber = investigating, blue = patrolling.
  for (const g of room.guards) {
    ctx.fillStyle = g.mode === 'chase' ? '#c22f2f' : g.mode === 'investigate' ? '#c27a1e' : '#2f4a7a';
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d8d2c2';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.dir) * (g.r + 5), g.y + Math.sin(g.dir) * (g.r + 5));
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, '!', g.x, g.y - g.r - 10, g.seesThief ? '#ff4d4d' : 'rgba(255,77,77,0)', 14);
    if (g.mode === 'investigate') text(ctx, '?', g.x, g.y - g.r - 10, '#ffd75e', 14);
  }

  // --- the thief, masked, eyes toward the movement direction ---
  const t = room.thief;
  ctx.save();
  ctx.translate(t.x, t.y);
  if (t.sneaking) {
    ctx.globalAlpha = 0.75;
  }
  ctx.fillStyle = '#22222e';
  ctx.beginPath();
  ctx.arc(0, 0, t.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd75e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.rotate(t.dir);
  ctx.fillStyle = '#ffd75e';
  ctx.fillRect(2, -7, 8, 4);
  ctx.fillRect(2, 3, 8, 4);
  ctx.restore();
  if (t.sneaking) text(ctx, 'sneaking', t.x, t.y - t.r - 10, '#b9b3c4', 9);

  // --- sparkles on pickup ---
  for (const s of room.sparkles) {
    const a = 1 - s.t / 0.8;
    ctx.fillStyle = `rgba(255,215,94,${a})`;
    for (let i = 0; i < 6; i += 1) {
      const ang = (i / 6) * Math.PI * 2 + s.t;
      ctx.beginPath();
      ctx.arc(s.x + Math.cos(ang) * s.t * 40, s.y + Math.sin(ang) * s.t * 40, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- room name, hint line, messages ---
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '700 13px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = 'rgba(232,228,216,0.85)';
  ctx.fillText(def.name, 24, 24);
  ctx.font = '12px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = 'rgba(185,179,196,0.9)';
  const hint = room.diamondTaken
    ? 'Diamond secured — reach the green EXIT door.'
    : 'Grab the diamond, then slip out the green EXIT door. Hold E at the CAM terminal to kill the cameras.';
  ctx.fillText(hint, 24, 44);
  if (room.time < room.messageUntil && room.message) {
    ctx.font = '700 14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = room.alarm >= 75 ? '#ff6b6b' : '#ffd75e';
    ctx.textAlign = 'center';
    ctx.fillText(room.message, ROOM_W / 2, ROOM_H - 34);
  }
  if (camerasOff) {
    ctx.font = '700 12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#9fb4ff';
    ctx.textAlign = 'right';
    ctx.fillText(`CAMERAS OFF ${Math.ceil(room.camerasOffUntil - room.time)}s`, ROOM_W - 24, 24);
  }
}
