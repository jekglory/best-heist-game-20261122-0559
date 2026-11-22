// MIDNIGHT VAULT — entry point: game loop, input, HUD, screenshot states,
// and the in-page self-test (?selftest=1, 14 assertions on the engine).

import { LEVELS } from './levels.js';
import {
  createGame, loadRoom, updateGame, tossCoin, tryInteract, interactHint,
  advanceRoom, finishRoomClear, gradeTitle,
  lineBlocked, inCone, canSee,
} from './engine.js';
import { drawGame } from './render.js';
import { sfx } from './audio.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ---------------------------------------------------------------------------
// Self-test: 14 assertions on pure engine logic. Runs on ?selftest=1 and
// writes its verdict into the page and the document title.
// ---------------------------------------------------------------------------
function runSelfTest() {
  const results = [];
  function check(name, ok) {
    results.push({ name, ok: !!ok });
  }

  // 1 — line of sight is clear across an empty floor.
  check('LOS clear on empty floor', lineBlocked(10, 10, 50, 10, []) === false);
  // 2 — line of sight is blocked by a rectangle between the points.
  check('LOS blocked by furniture', lineBlocked(10, 10, 100, 10, [{ x: 40, y: 0, w: 20, h: 20 }]) === true);
  // 3 — a guard sees the thief inside its cone with a clear line.
  check('guard sees thief in cone', canSee({ x: 100, y: 100, angle: 0 }, 175, 0.6, 180, 100, [], false) === true);
  // 4 — a guard does not see the thief outside its cone.
  check('guard blind outside cone', canSee({ x: 100, y: 100, angle: 0 }, 175, 0.6, 100, 220, [], false) === false);
  // 5 — a guard does not see the thief behind furniture.
  check('guard blind behind furniture', canSee({ x: 100, y: 100, angle: 0 }, 175, 0.6, 200, 100, [{ x: 140, y: 90, w: 20, h: 20 }], false) === false);
  // 6 — sneaking shrinks the distance a guard can spot the thief.
  check('sneak shrinks spotting range',
    canSee({ x: 100, y: 100, angle: 0 }, 175, 0.6, 250, 100, [], false) === true &&
    canSee({ x: 100, y: 100, angle: 0 }, 175, 0.6, 250, 100, [], true) === false);
  // 7 — tossing a coin spends one and drops it where aimed.
  {
    const g = createGame();
    loadRoom(g, 0);
    g.phase = 'playing';
    const ok = tossCoin(g, 600, 300);
    check('coin toss spends a coin', ok === true && g.coins === 2 && g.coin !== null && g.coin.x === 600 && g.coin.y === 300);
  }
  // 8 — no coins left means no toss.
  {
    const g = createGame();
    loadRoom(g, 0);
    g.phase = 'playing';
    g.coins = 0;
    const ok = tossCoin(g, 600, 300);
    check('empty coin pouch cannot toss', ok === false && g.coin === null);
  }
  // 9 — grabbing side loot banks its value and marks it taken.
  {
    const g = createGame();
    loadRoom(g, 0);
    g.phase = 'playing';
    const first = g.room.loot[0];
    g.player.x = first.x;
    g.player.y = first.y;
    const kind = tryInteract(g);
    check('loot pickup banks value', kind === 'loot' && first.taken === true && g.loot === first.value);
  }
  // 10 — the exit stays locked until the diamond is taken.
  {
    const g = createGame();
    loadRoom(g, 0);
    g.phase = 'playing';
    g.player.x = g.room.def.exit.x;
    g.player.y = g.room.def.exit.y - 10;
    check('exit locked without diamond', tryInteract(g) === 'locked');
  }
  // 11 — with the diamond, the exit opens.
  {
    const g = createGame();
    loadRoom(g, 0);
    g.phase = 'playing';
    g.room.diamondTaken = true;
    g.player.x = g.room.def.exit.x;
    g.player.y = g.room.def.exit.y - 10;
    check('exit opens with diamond', tryInteract(g) === 'exit');
  }
  // 12 — the alarm reaching 100 triggers a lockdown: a life is lost and
  // the alarm resets to 25 (it never sits above 100).
  {
    const g = createGame();
    loadRoom(g, 0);
    g.phase = 'playing';
    g.alarm = 99.5;
    const guard = g.room.guards[0];
    guard.state = 'chase';
    guard.alert = 1;
    guard.x = 470;
    guard.y = 500;
    guard.angle = Math.atan2(45, 10);
    g.player.x = 480;
    g.player.y = 545;
    updateGame(g, {}, 0.05);
    check('alarm 100 triggers lockdown, never above 100',
      g.phase === 'caught' && g.lives === 2 && g.alarm === 25 && g.caughtReason.includes('100'));
  }
  // 13 — being caught costs one life and respawns the thief at the start.
  {
    const g = createGame();
    loadRoom(g, 0);
    g.phase = 'playing';
    const guard = g.room.guards[0];
    guard.state = 'chase';
    guard.alert = 1;
    guard.x = g.player.x + 5;
    guard.y = g.player.y;
    updateGame(g, {}, 0.05);
    check('caught costs a life and respawns',
      g.lives === 2 && g.phase === 'caught' &&
      g.player.x === g.room.def.playerStart.x && g.player.y === g.room.def.playerStart.y);
  }
  // 14 — hacking the terminal disables every camera in the room.
  {
    const g = createGame();
    loadRoom(g, 0);
    g.phase = 'playing';
    g.player.x = g.room.def.terminal.x;
    g.player.y = g.room.def.terminal.y;
    const kind = tryInteract(g);
    check('hack disables all cameras', kind === 'hack' && g.room.cameras.every((c) => c.disabled));
  }

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  const verdict = passed === total ? 'PASS' : 'FAIL';
  const lines = results.map((r, i) => `${i + 1}. ${r.ok ? 'PASS' : 'FAIL'} — ${r.name}`);
  lines.push(`SELFTEST ${passed}/${total} ${verdict}`);
  const box = document.getElementById('selftest');
  box.style.display = 'block';
  box.textContent = lines.join('\n');
  document.title = `SELFTEST ${passed}/${total} ${verdict}`;
  return passed === total;
}

// ---------------------------------------------------------------------------
// Screenshot states (?shot=start|play|spotted|win). Each one sets a fixed,
// deterministic scene so the screenshots are reproducible.
// ---------------------------------------------------------------------------
function applyShot(game, shot) {
  if (shot === 'start') {
    loadRoom(game, 0);
    game.phase = 'title';
    game.timeMs = 0;
    return;
  }
  if (shot === 'play') {
    loadRoom(game, 1);
    game.phase = 'playing';
    game.timeMs = 92000;
    game.player.x = 430;
    game.player.y = 392;
    game.player.angle = -0.6;
    game.room.loot[0].taken = true;
    game.room.loot[1].taken = true;
    game.loot = game.room.loot[0].value + game.room.loot[1].value;
    game.alarm = 34;
    game.coins = 2;
    game.coin = { x: 600, y: 300, timer: 5 };
    const g = game.room.guards[0];
    g.state = 'investigate';
    g.tx = 600;
    g.ty = 300;
    g.x = 600;
    g.y = 382;
    g.angle = Math.atan2(300 - 382, 600 - 600);
    g.alert = 0.5;
    game.message = 'Koin dilempar — penjaga memeriksa suara itu.';
    game.messageTimer = 99;
    return;
  }
  if (shot === 'spotted') {
    loadRoom(game, 1);
    game.phase = 'playing';
    game.timeMs = 148000;
    game.player.x = 480;
    game.player.y = 382;
    game.player.angle = Math.PI / 2;
    game.room.loot[2].taken = true;
    game.loot = game.room.loot[2].value;
    game.alarm = 82;
    game.coins = 1;
    const g = game.room.guards[0];
    g.state = 'chase';
    g.alert = 1;
    g.x = 420;
    g.y = 250;
    g.angle = Math.atan2(382 - 250, 480 - 420);
    const g2 = game.room.guards[1];
    g2.alert = 0.6;
    game.message = 'TERLIHAT! Lari dari kerucut merah!';
    game.messageTimer = 99;
    return;
  }
  if (shot === 'win') {
    loadRoom(game, 2);
    game.phase = 'win';
    game.timeMs = 312000;
    game.loot = 48750;
    game.room.diamondTaken = true;
    game.gradeTitle = gradeTitle(game);
    return;
  }
  loadRoom(game, 0);
}

// ---------------------------------------------------------------------------
// Normal play
// ---------------------------------------------------------------------------
const game = createGame();

if (params.get('selftest') === '1') {
  loadRoom(game, 0);
  runSelfTest();
} else {
  const shot = params.get('shot');
  applyShot(game, shot || 'start');
  // A screenshot scene is frozen: the frame is drawn but the simulation
  // does not advance, so the shot is exactly the state applyShot set.
  const frozenShot = shot !== null;

  const hud = {
    room: document.getElementById('hud-room'),
    alarmFill: document.getElementById('alarm-fill'),
    alarmText: document.getElementById('alarm-text'),
    loot: document.getElementById('hud-loot'),
    lives: document.getElementById('hud-lives'),
    coins: document.getElementById('hud-coins'),
    objective: document.getElementById('hud-objective'),
    hint: document.getElementById('hud-hint'),
    message: document.getElementById('hud-message'),
  };

  const input = { left: false, right: false, up: false, down: false, sneak: false };
  let wasChasing = false;

  function startGame() {
    const fresh = createGame();
    Object.assign(game, fresh);
    loadRoom(game, 0);
    game.phase = 'playing';
  }

  window.addEventListener('keydown', (e) => {
    sfx.unlock();
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === 'arrowleft' || k === 'a') input.left = true;
    if (k === 'arrowright' || k === 'd') input.right = true;
    if (k === 'arrowup' || k === 'w') input.up = true;
    if (k === 'arrowdown' || k === 's') input.down = true;
    if (k === 'shift') input.sneak = true;
    if (e.key === 'Enter') {
      if (game.phase === 'title') {
        game.phase = 'playing';
      }
    }
    if (k === 'e' && game.phase === 'playing') {
      const result = tryInteract(game);
      if (result === 'loot') sfx.pickup();
      else if (result === 'diamond') sfx.diamond();
      else if (result === 'hack') sfx.hack();
      else if (result === 'locked') sfx.locked();
      else if (result === 'exit') {
        const next = advanceRoom(game);
        if (next === 'win') {
          game.gradeTitle = gradeTitle(game);
          sfx.win();
        } else {
          sfx.roomClear();
        }
      }
    }
    if (k === 'p' && (game.phase === 'playing' || game.phase === 'paused')) {
      game.phase = game.phase === 'playing' ? 'paused' : 'playing';
    }
    if (k === 'm') {
      const muted = sfx.toggleMute();
      game.message = muted ? 'Suara dimatikan (M untuk menyalakan).' : 'Suara dinyalakan.';
      game.messageTimer = 2;
    }
    if (k === 'r' && (game.phase === 'win' || game.phase === 'gameover')) startGame();
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') input.left = false;
    if (k === 'arrowright' || k === 'd') input.right = false;
    if (k === 'arrowup' || k === 'w') input.up = false;
    if (k === 'arrowdown' || k === 's') input.down = false;
    if (k === 'shift') input.sneak = false;
  });

  canvas.addEventListener('click', (e) => {
    sfx.unlock();
    if (game.phase !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    if (tossCoin(game, x, y)) sfx.coin();
  });

  function updateHud() {
    const def = game.room.def;
    hud.room.textContent = def.name + '  ·  RUANG ' + (game.roomIndex + 1) + '/3';
    const alarm = Math.round(game.alarm);
    hud.alarmFill.style.width = alarm + '%';
    hud.alarmFill.style.background = alarm >= 70 ? '#ff3c46' : alarm >= 35 ? '#ffb02e' : '#2fae5f';
    hud.alarmText.textContent = 'ALARM ' + alarm + (alarm >= 70 ? ' — TERPICU' : alarm >= 35 ? ' — WASPADA' : ' — AMAN');
    hud.loot.textContent = '$' + game.loot.toLocaleString('en-US');
    hud.lives.textContent = '♥'.repeat(Math.max(0, game.lives)) + '♡'.repeat(Math.max(0, 3 - game.lives));
    hud.coins.textContent = '●'.repeat(game.coins) + '○'.repeat(Math.max(0, 3 - game.coins));
    hud.objective.textContent = game.room.diamondTaken
      ? 'Berlian didapat — kabur lewat pintu EXIT!'
      : 'Ambil BERLIAN, lalu kabur lewat pintu EXIT.';
    hud.hint.textContent = game.phase === 'playing' ? interactHint(game) : '';
    hud.message.textContent = game.messageTimer > 0 ? game.message : '';
  }

  let last = performance.now();
  let chasingSoundAt = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;

    if (game.phase === 'playing' && !frozenShot) {
      updateGame(game, input, dt);
      const chasing = game.room.guards.some((g) => g.state === 'chase');
      if (chasing && !wasChasing && now - chasingSoundAt > 3000) {
        sfx.alert();
        chasingSoundAt = now;
      }
      wasChasing = chasing;
    } else if (game.phase === 'caught') {
      game.caughtTimer -= dt;
      if (game.caughtTimer <= 0) game.phase = 'playing';
    } else if (game.phase === 'roomclear') {
      game.clearTimer -= dt;
      if (game.clearTimer <= 0) finishRoomClear(game);
    }

    drawGame(ctx, game, t);
    updateHud();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Keep the geometry helpers reachable for the self-test import graph.
export { lineBlocked, inCone, canSee };
