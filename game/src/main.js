// Midnight Vault — bootstrap, input, game loop, overlays, deterministic
// screenshot states (?shot=start|play|spotted|win) and the in-page logic
// self-test (?selftest=1). The game runs from static files with no network
// request; all art is canvas code and all sound is synthesized.

import { LEVELS, ROOM_W, ROOM_H } from './levels.js';
import {
  newGame, loadLevel, stepGame, tossCoinAt, nextLevel, restartRoom,
  canSee, hasLineOfSight, seeded,
} from './engine.js';
import { render } from './render.js';
import { sfx, setMuted } from './audio.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const selftest = params.get('selftest') === '1';
const seedParam = Number(params.get('seed') || '7');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');

const game = newGame();
// Debug handle for automated play-testing (read-only state inspection).
window.__vault = { game, input: null };
let lastScoreShown = -1;
let lastAlarmShown = -1;

const input = {
  left: false, right: false, up: false, down: false,
  sneak: false, interact: false,
};
window.__vault.input = input;

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
  KeyE: 'interact',
};

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function updateHud() {
  const room = game.room;
  document.getElementById('hud-level').textContent = `${game.levelIndex + 1}/3`;
  document.getElementById('hud-loot').textContent = `$${game.score.toLocaleString()}`;
  document.getElementById('hud-lives').textContent = '●'.repeat(Math.max(0, game.lives)) + '○'.repeat(Math.max(0, 3 - game.lives));
  document.getElementById('hud-coins').textContent = String(game.coins);
  document.getElementById('hud-time').textContent = fmtTime(game.totalTime);
  if (room) {
    const alarm = Math.round(room.alarm);
    if (alarm !== lastAlarmShown) {
      lastAlarmShown = alarm;
      document.getElementById('alarm-fill').style.width = `${alarm}%`;
      const text = document.getElementById('alarm-text');
      text.textContent = room.alarmState;
      text.style.color = alarm >= 75 ? '#ff4d4d' : alarm >= 40 ? '#ffd75e' : alarm >= 12 ? '#ffb84d' : '#3fae5a';
    }
  }
  if (game.score !== lastScoreShown) lastScoreShown = game.score;
}

function showOverlay(html) {
  overlay.innerHTML = html;
  overlay.classList.add('show');
}

function hideOverlay() {
  overlay.classList.remove('show');
  overlay.innerHTML = '';
}

function titlePanel() {
  // Title screen: the pitch, the rules, the controls, one call to action.
  return `<div class="panel"><h1>MIDNIGHT VAULT</h1>
    <p class="big">One room. Two guards. One diamond.</p>
    <p>Cross the room unseen. Guards and cameras watch with cones of
    vision — walls and furniture break their sight. Grab the diamond, then
    slip out the green door. The alarm climbs while anyone sees you; at 100%
    the job is blown.</p>
    <p>Hold <b>E</b> at the CAM terminal to kill the cameras for 12 seconds.
    Click to toss a coin and pull a guard away. Three rooms, three diamonds,
    one last job.</p>
    <p class="keys">WASD / Arrows move · Shift sneak · Click toss coin · E grab / hack / exit · P pause · R restart · M mute</p>
    <p class="big">Press ENTER to start</p></div>`;
}

function caughtPanel() {
  return `<div class="panel"><h2>CAUGHT!</h2>
    <p>${game.room ? game.room.message : 'The job is blown.'}</p>
    <p>Lives left: ${game.lives}. Score: $${game.score.toLocaleString()}.</p>
    <p class="big">Press R to try the room again</p></div>`;
}

function roomClearPanel() {
  const room = game.room;
  return `<div class="panel"><h2>ROOM CLEAR</h2>
    <p class="big">Diamond secured — $${room.def.diamond.value.toLocaleString()}</p>
    <p>Time bonus: $${(room.timeBonus || 0).toLocaleString()} · Total score: $${game.score.toLocaleString()}</p>
    <p class="big">Press ENTER for the next room</p></div>`;
}

function gameOverPanel() {
  return `<div class="panel"><h2>THE JOB IS BLOWN</h2>
    <p>Three strikes and the crew walks. Final score: $${game.score.toLocaleString()}.</p>
    <p class="big">Press R to start over</p></div>`;
}

function winPanel() {
  return `<div class="panel"><h1>CLEAN GETAWAY</h1>
    <p class="big">All three diamonds. No alarms that stuck.</p>
    <p>Final score: $${game.score.toLocaleString()} in ${fmtTime(game.totalTime)}.</p>
    <p class="keys">The crew retires. The vault never saw it coming.</p>
    <p class="big">Press R to run it again</p></div>`;
}

function pausedPanel() {
  return `<div class="panel"><h2>PAUSED</h2><p class="big">Press P to keep going</p></div>`;
}

function syncOverlay() {
  if (game.state === 'title') showOverlay(titlePanel());
  else if (game.state === 'caught') showOverlay(caughtPanel());
  else if (game.state === 'roomclear') showOverlay(roomClearPanel());
  else if (game.state === 'gameover') showOverlay(gameOverPanel());
  else if (game.state === 'win') showOverlay(winPanel());
  else if (game.state === 'paused') showOverlay(pausedPanel());
  else hideOverlay();
}

function startJob() {
  game.levelIndex = 0;
  game.score = 0;
  game.lives = 3;
  game.coins = 3;
  game.totalTime = 0;
  loadLevel(game, 0);
  sfx.click();
}

let prevState = game.state;
let prevAlarm = 0;
let prevDiamond = false;

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastNow) / 1000 || 0.016);
  lastNow = now;
  if (game.state !== 'playing') {
    if (game.state !== prevState) {
      prevState = game.state;
      syncOverlay();
    }
    render(ctx, game);
    updateHud();
    return;
  }
  const room = game.room;
  const alarmBefore = room ? room.alarm : 0;
  const diamondBefore = room ? room.diamondTaken : false;
  stepGame(game, input, dt);
  if (game.state === 'playing') {
    if (room.alarm >= 40 && alarmBefore < 40) sfx.spotted();
    if (room.diamondTaken && !diamondBefore) sfx.diamond();
    const takenNow = room.loot.filter((l) => l.taken).length;
    if (takenNow > lootTakenCount) {
      lootTakenCount = takenNow;
      sfx.pickup();
    }
    if (room.time < room.camerasOffUntil && !camerasWereOff) {
      camerasWereOff = true;
      sfx.hack();
    }
    if (room.time >= room.camerasOffUntil) camerasWereOff = false;
  } else {
    if (game.state === 'caught' || game.state === 'gameover') sfx.caught();
    if (game.state === 'roomclear') sfx.clear();
    if (game.state === 'win') sfx.win();
    prevState = game.state;
    syncOverlay();
  }
  prevAlarm = alarmBefore;
  prevDiamond = diamondBefore;
  render(ctx, game);
  updateHud();
}

let lastNow = 0;
let lootTakenCount = 0;
let camerasWereOff = false;

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (KEYMAP[e.code] !== undefined) input[KEYMAP[e.code]] = true;
  if (e.code === 'Enter') {
    if (game.state === 'title') startJob();
    else if (game.state === 'roomclear') nextLevel(game);
  }
  if (e.code === 'KeyR') {
    if (game.state === 'caught' || game.state === 'gameover' || game.state === 'win') {
      if (game.state === 'win' || game.state === 'gameover') startJob();
      else restartRoom(game);
    } else if (game.state === 'playing' || game.state === 'paused') {
      restartRoom(game);
    }
  }
  if (e.code === 'KeyP') {
    if (game.state === 'playing') {
      game.state = 'paused';
      syncOverlay();
    } else if (game.state === 'paused') {
      game.state = 'playing';
      hideOverlay();
    }
  }
  if (e.code === 'KeyM') {
    const muted = document.body.classList.toggle('muted');
    setMuted(muted);
    game.muted = muted;
  }
});

window.addEventListener('keyup', (e) => {
  if (KEYMAP[e.code] !== undefined) input[KEYMAP[e.code]] = false;
});

canvas.addEventListener('mousedown', (e) => {
  if (game.state !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * ROOM_W;
  const y = ((e.clientY - rect.top) / rect.height) * ROOM_H;
  if (tossCoinAt(game, x, y)) sfx.coin();
});

// ---------- deterministic screenshot states ----------
// Each shot renders exactly one frame from a fixed state, so the same
// seed always produces the same pixels.
function applyShot(name) {
  if (name === 'start') {
    loadLevel(game, 0);
    game.state = 'title';
    game.room.time = 4;
    game.room.thief.x = 60;
    game.room.thief.y = 540;
    syncOverlay();
    render(ctx, game);
    updateHud();
    return;
  }
  if (name === 'play') {
    loadLevel(game, 0);
    game.state = 'playing';
    const room = game.room;
    room.time = 23.5;
    room.alarm = 34;
    room.alarmState = 'WARY';
    room.thief.x = 470;
    room.thief.y = 380;
    room.thief.dir = -Math.PI / 2;
    room.loot[0].taken = true;
    game.score = 400;
    room.guards[0].x = 480;
    room.guards[0].y = 470;
    room.guards[0].dir = Math.PI / 2;
    room.guards[1].x = 800;
    room.guards[1].y = 200;
    room.guards[1].dir = Math.PI;
    room.cameras[0].dir = Math.PI / 2 + 0.5;
    room.message = 'Pocketed loot +$400.';
    room.messageUntil = 99;
    render(ctx, game);
    updateHud();
    return;
  }
  if (name === 'spotted') {
    loadLevel(game, 1);
    game.levelIndex = 1;
    game.state = 'playing';
    const room = game.room;
    room.time = 41;
    room.alarm = 82;
    room.alarmState = 'TRIPPED!';
    room.thief.x = 360;
    room.thief.y = 300;
    room.thief.dir = Math.PI;
    room.guards[0].x = 300;
    room.guards[0].y = 300;
    room.guards[0].dir = 0;
    room.guards[0].mode = 'chase';
    room.guards[0].seesThief = true;
    room.guards[0].alert = 0.9;
    room.cameras[0].dir = Math.PI / 2 - 0.4;
    room.cameras[0].seesThief = true;
    room.message = 'ALARM! Get out of sight!';
    room.messageUntil = 99;
    render(ctx, game);
    updateHud();
    return;
  }
  if (name === 'win') {
    loadLevel(game, 2);
    game.levelIndex = 2;
    game.score = 48750;
    game.totalTime = 241;
    game.state = 'win';
    game.room.time = 60;
    game.room.diamondTaken = true;
    game.room.thief.x = 480;
    game.room.thief.y = 540;
    syncOverlay();
    render(ctx, game);
    updateHud();
    return;
  }
  // Unknown shot name: fall back to the live title screen.
  loadLevel(game, 0);
  game.state = 'title';
  syncOverlay();
  render(ctx, game);
  updateHud();
}

// ---------- in-page logic self-test ----------
// Runs the engine headlessly (?selftest=1) and writes the verdict into the
// page so a headless browser dump can read it. Fourteen checks, no
// rendering needed — the DOM verdict is the whole output.
function runSelfTest() {
  const out = [];
  function check(name, ok) {
    out.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  }
  const rng1 = seeded(7);
  const rng2 = seeded(7);
  check('seeded rng replays', rng1() === rng2() && rng1() === rng2());
  const solids = [{ x: 100, y: 100, w: 50, h: 50, kind: 'wall' }];
  const open = [];
  check('sees thief in open cone',
    canSee(0, 0, 0, 200, 0.6, { x: 100, y: 0, sneaking: false }, open));
  check('blind outside cone',
    !canSee(0, 0, 0, 200, 0.6, { x: 0, y: 100, sneaking: false }, open));
  check('wall blocks sight',
    !canSee(0, 125, 0, 300, 0.6, { x: 300, y: 125, sneaking: false }, solids));
  check('sneak halves spotting range',
    !canSee(0, 0, 0, 200, 0.6, { x: 150, y: 0, sneaking: true }, open)
    && canSee(0, 0, 0, 200, 0.6, { x: 150, y: 0, sneaking: false }, open));
  check('wall blocks segment',
    !hasLineOfSight(0, 125, 300, 125, solids));
  check('clear segment passes',
    hasLineOfSight(0, 0, 300, 0, solids));
  // Full playthrough of room 1, scripted: walk to the diamond, take it, exit.
  const g = newGame();
  loadLevel(g, 0);
  const idle = { left: false, right: false, up: false, down: false, sneak: false, interact: false };
  const room = g.room;
  room.thief.x = 880;
  room.thief.y = 300;
  stepGame(g, { ...idle, interact: true }, 0.05);
  check('diamond pickup scores', room.diamondTaken && g.score === 5000);
  room.thief.x = 918;
  room.thief.y = 68;
  stepGame(g, { ...idle, interact: true }, 0.05);
  check('exit with diamond clears room', g.state === 'roomclear');
  // Alarm: stand inside a guard cone and watch it climb, then hide.
  const g2 = newGame();
  loadLevel(g2, 0);
  const r2 = g2.room;
  r2.guards[0].x = 480;
  r2.guards[0].y = 240;
  r2.guards[0].dir = 0;
  r2.thief.x = 560;
  r2.thief.y = 240;
  stepGame(g2, idle, 0.5);
  check('alarm climbs while seen', r2.alarm > 5);
  r2.thief.x = 60;
  r2.thief.y = 540;
  const alarmThen = r2.alarm;
  stepGame(g2, idle, 1);
  check('alarm drains while hidden', r2.alarm < alarmThen);
  // Caught: guard touches the thief.
  const g3 = newGame();
  loadLevel(g3, 0);
  g3.room.guards[0].x = g3.room.thief.x + 10;
  g3.room.guards[0].y = g3.room.thief.y;
  stepGame(g3, idle, 0.05);
  check('guard touch catches thief', g3.state === 'caught' && g3.lives === 2);
  // Coin toss sends a guard to investigate.
  const g4 = newGame();
  loadLevel(g4, 0);
  const before = g4.coins;
  const ok = tossCoinAt(g4, 700, 400);
  check('coin toss investigates', ok && g4.coins === before - 1
    && g4.room.guards.some((x) => x.mode === 'investigate'));
  // Hack terminal disables cameras.
  const g5 = newGame();
  loadLevel(g5, 0);
  g5.room.thief.x = 83;
  g5.room.thief.y = 75;
  for (let i = 0; i < 60; i += 1) stepGame(g5, { ...idle, interact: true }, 0.05);
  check('hack disables cameras', g5.room.camerasOffUntil > g5.room.time);
  const passed = out.filter((l) => l.startsWith('PASS')).length;
  const verdict = `SELFTEST ${passed}/${out.length} ${passed === out.length ? 'PASS' : 'FAIL'}`;
  const el = document.getElementById('selftest');
  el.hidden = false;
  el.textContent = [verdict, ...out].join('\n');
  document.title = verdict;
}

if (selftest) {
  runSelfTest();
} else if (shot) {
  applyShot(shot);
} else {
  loadLevel(game, 0);
  game.state = 'title';
  syncOverlay();
  render(ctx, game);
  updateHud();
  requestAnimationFrame((t) => { lastNow = t; tick(t); });
}
