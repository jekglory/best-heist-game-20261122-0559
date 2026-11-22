// MIDNIGHT VAULT — all drawing on one canvas.
// One frame shows the whole room: floor, furniture, loot, the diamond,
// guards with their vision cones, sweeping cameras, the thief, and the
// alarm state. Overlays draw the title, caught, room-clear and win screens.

import { ROOM_W, ROOM_H, WALL } from './levels.js';
import { PLAYER_R, GUARD_R, INTERACT_RANGE } from './engine.js';

const FLOOR_A = '#1b2436';
const FLOOR_B = '#171e2e';
const WALL_COLOR = '#2c3a55';
const WALL_TOP = '#3d5178';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, half, color) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function obstacleColor(kind) {
  switch (kind) {
    case 'case': return '#4a5a7a';
    case 'pedestal': return '#6b5a3e';
    case 'bench': return '#7a5c33';
    case 'planter': return '#2e5d3a';
    case 'statue': return '#8a8f98';
    case 'vault': return '#5a6b8c';
    case 'desk': return '#6e4f2a';
    case 'pillar': return '#55688a';
    case 'counter': return '#74552e';
    case 'sofa': return '#7a3b4d';
    case 'table': return '#6e4f2a';
    case 'bed': return '#4d5a8a';
    case 'pool': return '#2e6b4f';
    default: return '#555f75';
  }
}

function drawLootIcon(ctx, loot) {
  const { x, y, kind } = loot;
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'painting') {
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(-14, -10, 28, 20);
    ctx.fillStyle = '#274b73';
    ctx.fillRect(-11, -7, 22, 14);
    ctx.fillStyle = '#e8d27a';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'vase') {
    ctx.fillStyle = '#b06a9e';
    ctx.beginPath();
    ctx.ellipse(0, 2, 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-3, -12, 6, 6);
  } else if (kind === 'watch' || kind === 'necklace') {
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff5d7a';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'cash') {
    ctx.fillStyle = '#3f9e4d';
    ctx.fillRect(-13, -8, 26, 16);
    ctx.fillStyle = '#d8f0c0';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'gold') {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.moveTo(-12, 8);
    ctx.lineTo(-8, -8);
    ctx.lineTo(8, -8);
    ctx.lineTo(12, 8);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'wine') {
    ctx.fillStyle = '#5d2a6b';
    ctx.fillRect(-4, -12, 8, 20);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(-4, -12, 8, 4);
  } else {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDiamond(ctx, x, y, t) {
  const pulse = 1 + Math.sin(t * 3) * 0.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = '#7fe7ff';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#aef3ff';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(13, -4);
  ctx.lineTo(9, 13);
  ctx.lineTo(-9, 13);
  ctx.lineTo(-13, -4);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-13, -4);
  ctx.lineTo(13, -4);
  ctx.moveTo(0, -16);
  ctx.lineTo(0, 13);
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, g, t) {
  const coneColor = g.state === 'chase' ? 'rgba(255,60,70,0.30)' : g.alert > 0.45 ? 'rgba(255,150,40,0.26)' : 'rgba(255,220,90,0.20)';
  drawCone(ctx, g.x, g.y, g.angle, g.range, 0.6, coneColor);
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.fillStyle = g.state === 'chase' ? '#a3333d' : '#33456b';
  ctx.beginPath();
  ctx.arc(0, 0, GUARD_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#dfe6f5';
  ctx.lineWidth = 2;
  ctx.stroke();
  // facing tick + cap brim
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(g.angle) * (GUARD_R + 6), Math.sin(g.angle) * (GUARD_R + 6));
  ctx.stroke();
  // alert mark
  if (g.alert > 0.45) {
    ctx.fillStyle = g.state === 'chase' ? '#ff3c46' : '#ffb02e';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.state === 'chase' ? '!' : '?', 0, -GUARD_R - 8);
  }
  ctx.restore();
}

function drawCamera(ctx, c) {
  if (c.disabled) {
    ctx.fillStyle = '#3a3f4a';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7dff9a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.x - 5, c.y - 5);
    ctx.lineTo(c.x + 5, c.y + 5);
    ctx.moveTo(c.x + 5, c.y - 5);
    ctx.lineTo(c.x - 5, c.y + 5);
    ctx.stroke();
    return;
  }
  drawCone(ctx, c.x, c.y, c.angle, c.range, 0.45, 'rgba(110,200,255,0.20)');
  ctx.fillStyle = '#c8d6ea';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22304a';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6ec8ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x + Math.cos(c.angle) * 16, c.y + Math.sin(c.angle) * 16);
  ctx.stroke();
}

function drawThief(ctx, p, invuln, t) {
  const blink = invuln > 0 && Math.floor(t * 8) % 2 === 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (blink) ctx.globalAlpha = 0.35;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // body: dark hood
  ctx.fillStyle = '#14161f';
  ctx.beginPath();
  ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.sneaking ? '#7dff9a' : '#e8ecf5';
  ctx.lineWidth = 2;
  ctx.stroke();
  // mask eyes + facing
  ctx.fillStyle = '#e8ecf5';
  ctx.beginPath();
  ctx.arc(Math.cos(p.angle - 0.35) * 5, Math.sin(p.angle - 0.35) * 5, 2, 0, Math.PI * 2);
  ctx.arc(Math.cos(p.angle + 0.35) * 5, Math.sin(p.angle + 0.35) * 5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,10,18,0.78)';
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(title, ROOM_W / 2, 218);
  // thin gold rule under the title
  ctx.fillStyle = 'rgba(255,211,77,0.6)';
  ctx.fillRect(ROOM_W / 2 - 120, 236, 240, 2);
  ctx.fillStyle = '#e8ecf5';
  ctx.font = '18px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, ROOM_W / 2, 268 + i * 30);
  });
}

export function drawGame(ctx, game, t) {
  const def = game.room.def;
  const room = game.room;

  // --- floor
  ctx.fillStyle = FLOOR_A;
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  ctx.fillStyle = FLOOR_B;
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 24; x++) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * 40, y * 40, 40, 40);
    }
  }
  // floor border glow
  ctx.strokeStyle = 'rgba(127,231,255,0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(WALL, WALL, ROOM_W - WALL * 2, ROOM_H - WALL * 2);

  // --- walls
  ctx.fillStyle = WALL_COLOR;
  ctx.fillRect(0, 0, ROOM_W, WALL);
  ctx.fillRect(0, ROOM_H - WALL, ROOM_W, WALL);
  ctx.fillRect(0, 0, WALL, ROOM_H);
  ctx.fillRect(ROOM_W - WALL, 0, WALL, ROOM_H);
  ctx.fillStyle = WALL_TOP;
  ctx.fillRect(0, 0, ROOM_W, 5);
  ctx.fillRect(0, ROOM_H - 5, ROOM_W, 5);
  ctx.fillRect(0, 0, 5, ROOM_H);
  ctx.fillRect(ROOM_W - 5, 0, 5, ROOM_H);

  // --- exit door
  const ex = def.exit;
  ctx.fillStyle = room.diamondTaken ? '#2fae5f' : '#5a3a3a';
  ctx.fillRect(ex.x - 26, ROOM_H - WALL, 52, WALL);
  ctx.fillStyle = '#e8ecf5';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', ex.x, ROOM_H - 8);

  // --- obstacles
  for (const o of def.obstacles) {
    ctx.fillStyle = obstacleColor(o.kind);
    roundRect(ctx, o.x, o.y, o.w, o.h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,236,245,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(232,236,245,0.75)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(o.label, o.x + o.w / 2, o.y + o.h / 2 + 3);
  }

  // --- terminal
  const term = def.terminal;
  ctx.fillStyle = room.camerasHacked ? '#2e5d3a' : '#1d5c33';
  roundRect(ctx, term.x - 16, term.y - 12, 32, 24, 4);
  ctx.fill();
  ctx.strokeStyle = room.camerasHacked ? '#7dff9a' : '#7dff9a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#7dff9a';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText(room.camerasHacked ? 'OFF' : 'HACK', term.x, term.y + 3);

  // --- loot
  for (const l of room.loot) {
    if (l.taken) continue;
    const bob = Math.sin(t * 2 + l.x) * 2;
    ctx.save();
    ctx.translate(0, bob);
    drawLootIcon(ctx, l);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,211,77,0.9)';
    ctx.font = '9px sans-serif';
    ctx.fillText(l.label, l.x, l.y + 26);
  }

  // --- diamond
  if (!room.diamondTaken) {
    drawDiamond(ctx, def.diamond.x, def.diamond.y, t);
    ctx.fillStyle = '#aef3ff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('BERLIAN', def.diamond.x, def.diamond.y + 32);
  }

  // --- tossed coin
  if (game.coin) {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(game.coin.x, game.coin.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,211,77,0.5)';
    ctx.beginPath();
    ctx.arc(game.coin.x, game.coin.y, 12 + Math.sin(t * 6) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- cameras (cones under guards, over floor)
  for (const c of room.cameras) drawCamera(ctx, c);

  // --- guards
  for (const g of room.guards) drawGuard(ctx, g, t);

  // --- thief
  drawThief(ctx, game.player, game.invulnTimer, t);

  // --- particles
  for (const pt of game.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / 0.55);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- interact ring
  const p = game.player;
  ctx.strokeStyle = 'rgba(127,231,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, INTERACT_RANGE, 0, Math.PI * 2);
  ctx.stroke();

  // --- alarm flash when high
  if (game.alarm > 70 && game.phase === 'playing') {
    const a = 0.05 + Math.sin(t * 8) * 0.03;
    ctx.fillStyle = `rgba(255,60,70,${Math.max(0, a)})`;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
  }

  // --- overlays
  if (game.phase === 'title') {
    overlay(ctx, 'MIDNIGHT VAULT', [
      'Pencurian tiga ruangan. Ambil Berlian Tengah Malam, lalu kabur.',
      'WASD / panah — bergerak    SHIFT — menyelinap',
      'Klik — lempar koin pengalih    E — ambil / retas / keluar',
      'Hindari kerucut pandang penjaga dan kamera. Alarm 100 = ketahuan.',
      '',
      'Tekan ENTER untuk mulai',
    ], '#ffd34d');
  } else if (game.phase === 'paused') {
    overlay(ctx, 'JEDA', ['Tekan P untuk lanjut.', 'M — suara hidup/mati'], '#e8ecf5');
  } else if (game.phase === 'caught') {
    overlay(ctx, 'KETAHUAN!', [
      game.caughtReason,
      'Nyawa tersisa: ' + game.lives,
      'Kamu kembali ke pintu masuk ruangan ini.',
    ], '#ff3c46');
  } else if (game.phase === 'roomclear') {
    overlay(ctx, 'RUANGAN BERSIH!', [
      def.name + ' selesai. Loot sejauh ini: $' + game.loot.toLocaleString('en-US'),
      'Ruangan berikutnya segera dibuka…',
    ], '#7dff9a');
  } else if (game.phase === 'win') {
    overlay(ctx, 'PELARIAN SEMPURNA!', [
      'Tiga berlian, tiga ruangan, satu malam.',
      'Total loot: $' + game.loot.toLocaleString('en-US'),
      'Waktu: ' + Math.round(game.timeMs / 1000) + ' detik',
      'Gelar: ' + (game.gradeTitle || ''),
      '',
      'Tekan R untuk bermain lagi',
    ], '#ffd34d');
  } else if (game.phase === 'gameover') {
    overlay(ctx, 'PENJARA', [
      'Nyawa habis. Malam ini berakhir di balik jeruji.',
      'Loot yang sempat dibawa: $' + game.loot.toLocaleString('en-US'),
      '',
      'Tekan R untuk mencoba lagi',
    ], '#ff3c46');
  }
}
