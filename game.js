/* =========================================================
   PATRULHA CANINA — SUPER RESGATE DELUXE
   Motor 2D: plataforma, poderes, seis mundos e resgate.
   ========================================================= */
(() => {
'use strict';

const $ = id => document.getElementById(id);
const canvas = $('game');
const g = canvas.getContext('2d');
const W = 960, H = 540, TAU = Math.PI * 2, GROUND = 458;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, t, d) => v < t ? Math.min(v + d, t) : Math.max(v - d, t);
const mod = (v, m) => ((v % m) + m) % m;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------------- heróis e mundos ---------------- */
const HEROES = [
  { id:'chase',    name:'Chase',    color:'#2575e4', color2:'#083b80', icon:'⚡',  power:'DASH POLICIAL',   desc:'Avança com supervelocidade e derruba inimigos.' },
  { id:'marshall', name:'Marshall', color:'#ef4a4a', color2:'#8b1616', icon:'💦',  power:'JATO D’ÁGUA',     desc:'Apaga o fogo num raio largo e afasta inimigos.' },
  { id:'skye',     name:'Skye',     color:'#ee85ba', color2:'#913b6a', icon:'🪽',  power:'PLANEIO',         desc:'Segure o pulo para planar por cima dos perigos.' },
  { id:'rubble',   name:'Rubble',   color:'#e8b324', color2:'#8b6200', icon:'🔨',  power:'ONDA DE CHOQUE',  desc:'Quebra tijolos e derruba inimigos próximos.' },
  { id:'rocky',    name:'Rocky',    color:'#4db86a', color2:'#176b33', icon:'🛠️', power:'PONTE RÁPIDA',    desc:'Constrói uma ponte sobre o próximo buraco.' },
  { id:'zuma',     name:'Zuma',     color:'#ef903a', color2:'#8c4410', icon:'🌊',  power:'IMPULSO AQUÁTICO',desc:'Atravessa a água por alguns segundos.' }
];

const THEMES = [
  { tag:'1-1', name:'BAÍA DA AVENTURA', sky:['#63c9ff','#ddf9ff'], soil:'#9a5a2f', soilDark:'#5b2f16', grass:'#58cc3f', far:'#6fb798', mid:'#4c947b', sun:'#fff3b0', water:true,  bridge:.62, enemy:'crab',  cap:'grass' },
  { tag:'1-2', name:'FLORESTA',         sky:['#8fd6e8','#cdf6d0'], soil:'#7c4a2a', soilDark:'#422815', grass:'#43b957', far:'#2f7a63', mid:'#225c4b', sun:'#eaffb0', water:false, bridge:0,   enemy:'bird',  cap:'grass' },
  { tag:'1-3', name:'CAVERNA',          sky:['#1d2347','#5a4a85'], soil:'#5b4560', soilDark:'#2c2033', grass:'#9b6fa0', far:'#352b4f', mid:'#28213f', sun:'#c9a6ff', water:false, bridge:0,   enemy:'chest', cap:'cave',  tint:'#c08ad0' },
  { tag:'1-4', name:'NEVE',             sky:['#8ccdf5','#e9fbff'], soil:'#6e8ba4', soilDark:'#415970', grass:'#f2fbff', far:'#b6d4ea', mid:'#8fb4d0', sun:'#ffffff', water:false, bridge:0,   enemy:'bird',  cap:'snow',  tint:'#c6dff2', lighten:'rgba(255,255,255,.24)' },
  { tag:'1-5', name:'CIDADE',           sky:['#6fb8f5','#ecefff'], soil:'#766b77', soilDark:'#443a48', grass:'#86c0a0', far:'#7e9cc4', mid:'#5c7ba6', sun:'#ffeab0', water:true,  bridge:.42, enemy:'crab',  cap:'grass' },
  { tag:'1-6', name:'TORRE FINAL',      sky:['#3a2358','#a85c52'], soil:'#554052', soilDark:'#2a1d2c', grass:'#e49a58', far:'#4a2d58', mid:'#34203e', sun:'#ff9b61', water:true,  bridge:.5,  enemy:'chest', cap:'lava',  tint:'#c78068' }
];

/* ---------------- assets ---------------- */
const ART_NAMES = ['dirt','grass','water','brick','question','coin','star','bone','rope'];
const art = {};
let artLoaded = 0;
const artTotal = ART_NAMES.length + 1;
const thumbCanvases = [];
const panorama = new Image();
const sprites = HEROES.map(h => Array.from({ length: 8 }, (_, i) => {
  const im = new Image();
  im.src = `assets/characters/${h.id}_${i}.png`;
  return im;
}));

ART_NAMES.forEach(name => {
  const im = new Image();
  im.onload = () => { artLoaded++; art[name] = im; repaintThumbs(); };
  im.onerror = () => { artLoaded++; };
  im.src = `assets/textures/${name}.png`;
  art[name] = im;
});
panorama.onload = () => { artLoaded++; repaintThumbs(); };
panorama.onerror = () => { artLoaded++; };
panorama.src = 'assets/cenario/baia-panorama.png';

function paintThumb(c, index) {
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height;
  ctx.clearRect(0, 0, w, h);
  drawBackdrop(ctx, index, index * 90 + 30, 2.4, w, h);
  const th = THEMES[index];
  const gy = h * .77;
  ctx.fillStyle = th.soil; ctx.fillRect(0, gy, w, h - gy);
  ctx.fillStyle = th.soilDark; ctx.fillRect(0, gy + 4, w, h - gy - 4);
  ctx.fillStyle = th.grass; ctx.fillRect(0, gy - 3, w, 5);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, gy - 3, w, 1);
  // mini herói + estrela para dar vida ao cartão
  const sp = sprites[(index + 1) % HEROES.length][0];
  if (sp && sp.complete && sp.naturalWidth) {
    const sh = h * .46, sw = sh * (128 / 174);
    ctx.drawImage(sp, w * .22 - sw / 2, gy - sh + 2, sw, sh);
  }
  if (art.star.complete && art.star.naturalWidth) {
    const s = h * .17;
    ctx.drawImage(art.star, w * .67, gy - s * .75, s, s);
  }
}
function repaintThumbs() {
  for (const item of thumbCanvases) paintThumb(item.canvas, item.index);
}

/* ---------------- progresso ---------------- */
const SAVE_KEY = 'patrol-super-resgate-deluxe-v2';
let saved = { unlocked: 1, bests: [0, 0, 0, 0, 0, 0], hero: 0 };
try { Object.assign(saved, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
if (!Array.isArray(saved.bests)) saved.bests = [0, 0, 0, 0, 0, 0];
saved.unlocked = clamp(saved.unlocked | 0, 1, 6);
let hero = clamp(saved.hero | 0, 0, HEROES.length - 1);

function persist() {
  saved.hero = hero;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch (e) {}
}

/* ---------------- estado ---------------- */
let stage = 0, level = null, player = null;
let running = false, paused = false, overlayOpen = false, gameOver = false;
let camX = 0, camY = 0, shake = 0, timeSec = 0, gameTime = 240;
let stars = 0, bones = 0, coins = 0, shield = 0, score = 0, lives = 3;
let combo = 0, comboTimer = 0, lastPickup = 0;
let checkpoint = { x: 70, y: GROUND };
let powerType = '', powerTime = 0;
let abilityCd = 0, abilityFlash = 0;
let introTime = 0, introOut = false;
let particles = [], floaters = [];
let prevJump = false, prevPower = false;
let hurtFlash = 0, gateMsgCd = 0, dustCd = 0;
let last = 0, raf = 0;
let toastTimer = 0;
let hitStop = 0;
let lastHud = { lives: -1, stars: -1, bones: -1, coins: -1, shield: -1, time: -1, hero: -1 };

/* ---------------- áudio ---------------- */
let actx = null, master = null;
let musicOn = false, sfxOn = true;
let musicTick = 0, musicStep = 0;
const MELODIES = [
  [0,4,7,9,12,9,7,4, 0,4,7,11,12,11,7,4],
  [0,2,5,7,9,7,5,2, 0,2,5,9,7,5,2,0],
  [0,3,7,10,7,3,5,7, 0,-2,3,7,5,3,0,-2],
  [0,4,7,12,9,7,4,7, 2,5,9,12,9,5,2,0],
  [0,5,9,7,5,4,2,0, -3,2,5,9,7,5,2,0],
  [0,3,5,8,7,5,3,0, -1,3,7,10,8,7,5,3]
];

function ensureAudio() {
  try {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = .55;
      master.connect(actx.destination);
    }
    if (actx.state === 'suspended') actx.resume();
  } catch (e) {}
}

function tone(freq, dur = .1, type = 'sine', vol = .05, slide = 0) {
  if (!sfxOn || !actx) return;
  const t = actx.currentTime;
  const o = actx.createOscillator(), v = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  v.gain.setValueAtTime(0.0001, t);
  v.gain.exponentialRampToValueAtTime(vol, t + .012);
  v.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(v); v.connect(master);
  o.start(t); o.stop(t + dur + .02);
}

function sfx(name) {
  if (!sfxOn) return;
  ensureAudio();
  if (!actx) return;
  switch (name) {
    case 'jump':   tone(430, .12, 'square', .035, 320); break;
    case 'land':   tone(150, .06, 'sine', .03, -40); break;
    case 'coin':   tone(880, .07, 'triangle', .045); setTimeout(() => tone(1320, .09, 'triangle', .04), 55); break;
    case 'bone':   tone(620, .08, 'triangle', .045); setTimeout(() => tone(940, .1, 'triangle', .04), 60); break;
    case 'star':   [660, 880, 1100, 1480].forEach((f, i) => setTimeout(() => tone(f, .16, 'triangle', .05), i * 70)); break;
    case 'hurt':   tone(220, .28, 'sawtooth', .05, -150); break;
    case 'stomp':  tone(320, .09, 'square', .045, -170); break;
    case 'power':  [520, 780, 1040].forEach((f, i) => setTimeout(() => tone(f, .13, 'square', .035), i * 55)); break;
    case 'checkpoint': [660, 990].forEach((f, i) => setTimeout(() => tone(f, .14, 'triangle', .045), i * 90)); break;
    case 'gate':   tone(130, .3, 'sine', .06, 60); break;
    case 'goal':   [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, .22, 'triangle', .05), i * 100)); break;
    case 'click':  tone(600, .05, 'triangle', .03); break;
    case 'water':  tone(380, .16, 'sine', .04, -140); break;
    case 'wrong':  tone(190, .14, 'square', .04, -50); break;
  }
}

function updateMusic(dt) {
  if (!musicOn || !actx || paused || overlayOpen) return;
  musicTick -= dt;
  if (musicTick > 0) return;
  musicTick = .235;
  const seq = MELODIES[stage] || MELODIES[0];
  const note = seq[musicStep % seq.length];
  const f = 261.63 * Math.pow(2, note / 12);
  tone(f, .2, 'triangle', .016);
  if (musicStep % 4 === 0) tone(f / 4, .34, 'sine', .025);
  if (musicStep % 8 === 4) tone(f * 1.5, .12, 'sine', .01);
  musicStep++;
}

/* ---------------- entrada ---------------- */
const held = new Set();
const KEYMAP = {
  arrowleft:'left', a:'left', arrowright:'right', d:'right',
  arrowup:'jump', w:'jump', ' ':'jump', spacebar:'jump',
  e:'power', x:'power', shift:'run', arrowdown:'down', s:'down'
};
let padPrev = { jump:false, power:false };

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'escape') {
    e.preventDefault();
    if (overflowPause()) return;
    if (running) togglePause();
    return;
  }
  if (k === 'p' && running && !overlayOpen) { e.preventDefault(); togglePause(); return; }
  if (k === 'r' && running && !overlayOpen) { e.preventDefault(); launch(stage); return; }
  if (k === 'enter' && triggerAdvance()) { e.preventDefault(); return; }
  if (k === 'enter' && !$('menu').hidden) { e.preventDefault(); launch(0); return; }
  const a = KEYMAP[k];
  if (a) {
    e.preventDefault();
    held.add(a);
    ensureAudio();
  }
}, { passive:false });

window.addEventListener('keyup', e => {
  const a = KEYMAP[e.key.toLowerCase()];
  if (a) held.delete(a);
});
window.addEventListener('blur', () => held.clear());

function overflowPause() {
  if (!overlayOpen) return false;
  if (paused) { closeOverlay(); paused = false; last = performance.now(); }
  return true;
}

function triggerAdvance() {
  if (!overlayOpen || !overlayAdvance) return false;
  const go = overlayAdvance;
  closeOverlay();
  go();
  return true;
}

function advanceHint(action) {
  return `<span class="dialog-hint">${hasPad() ? `Controle: botão Y ${action}` : `Teclado: Enter ${action}`}</span>`;
}

// Botão Y (índice 3) avança a tela de fase concluída, mesmo com o jogo parado.
let padAdvancePrev = false;
setInterval(() => {
  const pressed = readPad().advance;
  if (pressed && !padAdvancePrev && overlayOpen && overlayAdvance && performance.now() - overlayShownAt > 250) triggerAdvance();
  padAdvancePrev = pressed;
}, 60);

document.querySelectorAll('[data-action]').forEach(btn => {
  const action = btn.dataset.action;
  const down = e => {
    e.preventDefault();
    ensureAudio();
    held.add(action);
    btn.classList.add('pressed');
    try { btn.setPointerCapture(e.pointerId); } catch (err) {}
  };
  const up = () => { held.delete(action); btn.classList.remove('pressed'); };
  btn.addEventListener('pointerdown', down);
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, up);
  btn.addEventListener('contextmenu', e => e.preventDefault());
});

function readPad() {
  try {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = Array.from(pads).find(q => q && q.connected);
    if (!p) return { x:0, jump:false, power:false, run:false, advance:false };
    const ax = p.axes && p.axes[0] || 0;
    const x = (Math.abs(ax) > .24 ? ax : 0) + (p.buttons[15] && p.buttons[15].pressed ? 1 : 0) - (p.buttons[14] && p.buttons[14].pressed ? 1 : 0);
    return {
      x: clamp(x, -1, 1),
      jump: !!(p.buttons[0] && p.buttons[0].pressed || p.buttons[12] && p.buttons[12].pressed),
      power: !!(p.buttons[2] && p.buttons[2].pressed || p.buttons[1] && p.buttons[1].pressed),
      run: !!(p.buttons[10] && p.buttons[10].pressed),
      advance: !!(p.buttons[3] && p.buttons[3].pressed)
    };
  } catch (e) { return { x:0, jump:false, power:false, run:false, advance:false }; }
}

function hasPad() {
  try {
    return !!Array.from(navigator.getGamepads ? navigator.getGamepads() : []).find(p => p && p.connected);
  } catch (e) { return false; }
}

function readInput() {
  const p = readPad();
  const left = held.has('left') || p.x < -.24;
  const right = held.has('right') || p.x > .24;
  return {
    x: clamp((right ? 1 : 0) - (left ? 1 : 0) + p.x, -1, 1),
    jump: held.has('jump') || p.jump,
    power: held.has('power') || p.power,
    run: held.has('run') || p.run,
    down: held.has('down')
  };
}

/* ---------------- utilidades de desenho ---------------- */
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function label(ctx, text, x, y, size, color = '#fff', align = 'center', italic = true, stroke = null) {
  ctx.font = `${italic ? 'italic ' : ''}900 ${size}px system-ui,Segoe UI,sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = Math.max(2, size * .13); ctx.strokeStyle = stroke; ctx.strokeText(text, x, y); }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function tile(ctx, img, x, y, w, h, tw, th, alpha = 1) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const startX = Math.floor(x / tw) * tw;
  ctx.save();
  ctx.globalAlpha *= alpha;
  for (let tx = startX; tx < x + w; tx += tw) {
    for (let ty = y; ty < y + h; ty += th) ctx.drawImage(img, tx, ty, tw, th);
  }
  ctx.restore();
}

/* ---------------- geração de fases ---------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function buildLevel(index) {
  const th = THEMES[index];
  const rng = mulberry32(0x9e3779b9 ^ (index * 0x45d9f3b));
  const len = 3350 + index * 195;
  const gaps = [];
  let gx = 830;
  while (gx < len - 700) {
    const w = 84 + Math.floor(rng() * 38);
    gaps.push({ x: Math.round(gx), w, water: !!th.water, phase: rng() * 6, bridged: false });
    gx += 470 + Math.floor(rng() * 150);
  }

  const solids = [];
  let cursor = 0;
  for (const gap of gaps) {
    if (gap.x > cursor) solids.push({ x: cursor, y: GROUND, w: gap.x - cursor, h: 300, ground: true });
    cursor = gap.x + gap.w;
  }
  solids.push({ x: cursor, y: GROUND, w: len - cursor, h: 300, ground: true });

  const safeX = (px, w) => {
    let best = null;
    for (const s of solids) {
      if (s.w < w + 60) continue;
      const x = clamp(px, s.x + 38, s.x + s.w - w - 38);
      const d = Math.abs(x - px);
      if (!best || d < best.d) best = { x, d };
    }
    return Math.round(best ? best.x : clamp(px, 40, len - w - 40));
  };

  const bridges = [];
  for (const gap of gaps) {
    if (th.bridge && rng() < th.bridge) {
      bridges.push({ x: gap.x - 7, y: GROUND - 3, w: gap.w + 14, h: 14, rope: true });
      gap.bridged = true;
    }
  }

  const platforms = [];
  const starPlatforms = [];
  const fracs = [.15, .315, .48, .65, .825];
  for (let k = 0; k < 5; k++) {
    const w = 142 + Math.round(rng() * 24);
    const x = safeX(Math.round(len * fracs[k]) - w / 2, w);
    const y = GROUND - (142 + Math.round(rng() * 22));
    platforms.push({ x, y, w, h: 28, moving: false, breakable: false, phase: rng() * 6, kind: 'earth' });
    starPlatforms.push({ x, y, w, starX: x + w / 2, starY: y - 56 });
  }

  for (let x = 280; x < len - 440; x += 225 + Math.floor(rng() * 85)) {
    if (starPlatforms.some(s => Math.abs((s.x + s.w / 2) - x) < 130)) continue;
    const w = 112 + Math.round(rng() * 56);
    const y = GROUND - (88 + Math.round(rng() * 66));
    const moving = index >= 2 && rng() < .19;
    const breakable = index >= 1 && rng() < .1;
    platforms.push({
      x, y, w, h: 26, moving, breakable, broken: false, breakTimer: 0,
      origin: y, phase: rng() * 6, moveAmp: 16 + rng() * 18, kind: 'earth'
    });
  }

  const blocks = [];
  const prizes = ['speed', 'shield', 'jump', 'magnet', 'heart', 'coin'];
  for (let k = 0; k < 7 + index; k++) {
    const cluster = 2 + (k % 2);
    const bx = safeX(430 + k * ((len - 820) / (7 + index)) + Math.round(rng() * 30), cluster * 52 + 24);
    if (bx < 280 || bx > len - 300) continue;
    for (let c = 0; c < cluster; c++) {
      const b = {
        x: bx + c * 52, y: GROUND - 196, w: 48, h: 48,
        type: (k + c) % 3 === 2 ? 'brick' : 'question',
        used: false, broken: false, bump: 0,
        prize: prizes[(k + c) % prizes.length]
      };
      const clash = platforms.some(pl =>
        Math.abs((pl.x + pl.w / 2) - (b.x + 24)) < 58 &&
        Math.abs(pl.y - (b.y + 24)) < 74
      );
      if (!clash) blocks.push(b);
    }
  }

  const items = [];
  for (const pl of platforms) {
    if (starPlatforms.some(s => s.x === pl.x && s.y === pl.y)) continue;
    for (let c = -1; c <= 1; c++) {
      items.push({
        x: pl.x + pl.w / 2 + c * 34,
        y: pl.y - 46 - (c === 0 ? 5 : 0),
        type: 'coin', taken: false, phase: rng() * 6
      });
    }
    if (rng() < .34) items.push({ x: pl.x + pl.w / 2, y: pl.y - 78, type: 'bone', taken: false, phase: rng() * 6 });
  }
  for (const gap of gaps) {
    if (gap.bridged) continue;
    for (let c = 0; c < 4; c++) {
      const t = c / 3 - .5;
      items.push({
        x: gap.x + gap.w / 2 + t * gap.w * .68,
        y: GROUND - 68 - Math.cos(t * Math.PI) * 30,
        type: 'coin', taken: false, phase: rng() * 6
      });
    }
  }
  for (const s of starPlatforms) {
    items.push({ x: s.starX, y: s.starY, type: 'star', taken: false, phase: rng() * 6 });
  }
  for (let k = 0; k < 6; k++) {
    const x = safeX(320 + k * ((len - 720) / 6) + rng() * 80, 50);
    items.push({ x, y: GROUND - 34, type: 'bone', taken: false, phase: rng() * 6 });
  }

  const hazards = [];
  for (let k = 0; k < 3 + index; k++) {
    const x = safeX(560 + k * ((len - 950) / (3 + index)) + rng() * 70, 70);
    const type = (index === 2 || index === 5 || (index === 1 && k === 2)) ? 'fire' : 'spikes';
    if (x < 320 || x > len - 330) continue;
    hazards.push({
      x, y: GROUND - (type === 'fire' ? 48 : 26), w: 58,
      h: type === 'fire' ? 48 : 26, type, disabled: false, phase: rng() * 6
    });
  }

  const enemies = [];
  const count = 4 + index;
  for (let k = 0; k < count; k++) {
    const seg = solids[(k * 2 + 1) % solids.length];
    if (!seg || seg.w < 210) continue;
    const x = Math.round(seg.x + 70 + mod(k * 173, Math.max(40, seg.w - 180)));
    if (x < 300 || x > len - 270) continue;
    const bird = (th.enemy === 'bird' && k % 2 === 0) || (th.enemy !== 'bird' && k % 4 === 3);
    if (bird) {
      enemies.push({
        type: 'bird', x, y: GROUND - 182, w: 50, h: 34,
        baseX: x, baseY: GROUND - 182, range: 80 + rng() * 70,
        phase: rng() * 6, dir: 1, alive: true, hp: 1, wobble: rng() * 6
      });
    } else if (th.enemy === 'chest') {
      enemies.push({
        type: 'chest', x, y: GROUND - 44, w: 42, h: 44,
        minX: seg.x + 34, maxX: seg.x + seg.w - 76,
        phase: rng() * 6, dir: 1, alive: true, hp: 1, hop: 0
      });
    } else {
      enemies.push({
        type: 'crab', x, y: GROUND - 36, w: 46, h: 36,
        minX: seg.x + 34, maxX: seg.x + seg.w - 80,
        phase: rng() * 6, dir: rng() < .5 ? -1 : 1, alive: true, hp: 1, speed: 55
      });
    }
  }

  let boss = null;
  if (index === 5) {
    boss = {
      type: 'boss', x: len - 560, y: GROUND - 92, w: 120, h: 92,
      minX: len - 620, maxX: len - 250, dir: -1, alive: true,
      hp: 3, maxHp: 3, phase: 0, attack: 0, hurt: 0, speed: 58
    };
    enemies.push(boss);
  }

  const checkpoints = [];
  for (const f of [.46, .75]) {
    checkpoints.push({ x: safeX(Math.round(len * f), 90), y: GROUND - 96, active: false });
  }

  const decor = [];
  for (const s of solids) {
    for (let x = s.x + 38; x < s.x + s.w - 30; x += 140 + Math.floor(rng() * 90)) {
      if (rng() < .62) decor.push({ x, y: GROUND, type: rng() < .38 ? 'flower' : 'bush', s: .8 + rng() * .55 });
    }
  }

  return {
    index, len, ground: GROUND, solids, gaps, platforms, blocks, items, enemies,
    hazards, bridges, checkpoints, boss, decor,
    goal: { x: len - 152, y: GROUND - 130, w: 92, h: 130, open: false }
  };
}

/* ---------------- HUD / interface ---------------- */
const UI = {
  hudHero: $('hudHero'), hudLives: $('hudLives'), hudStars: $('hudStars'),
  hudBones: $('hudBones'), hudCoins: $('hudCoins'), hudShield: $('hudShield'),
  hudTime: $('hudTime'), hudLevel: $('hudLevel'), hudStageTag: $('hudStageTag'),
  hudPortrait: $('hudPortrait'), powerChip: $('powerChip'), powerIcon: $('powerIcon'),
  powerName: $('powerName'), powerTime: $('powerTime'), comboChip: $('comboChip'),
  timer: document.querySelector('.timer'), pauseBtn: $('pause'),
  touchPower: document.querySelector('[data-action="power"]'),
  powerCd: $('powerCd'), intro: $('intro'), toast: $('toast')
};

function setText(el, value) {
  if (el && el.textContent !== String(value)) el.textContent = value;
}

function heartsMarkup() {
  const total = Math.max(3, lives);
  let html = '';
  for (let i = 0; i < total; i++) {
    html += `<svg class="${i < lives ? '' : 'heart-empty'}" aria-hidden="true"><use href="#i-heart"/></svg>`;
  }
  return html;
}

function updateHud(force = false) {
  if (!player) return;
  if (force || lastHud.lives !== lives) {
    UI.hudLives.innerHTML = heartsMarkup();
    lastHud.lives = lives;
  }
  if (force || lastHud.stars !== stars) { setText(UI.hudStars, stars); lastHud.stars = stars; }
  if (force || lastHud.bones !== bones) { setText(UI.hudBones, bones); lastHud.bones = bones; }
  if (force || lastHud.coins !== coins) { setText(UI.hudCoins, coins); lastHud.coins = coins; }
  if (force || lastHud.shield !== shield) { setText(UI.hudShield, shield); lastHud.shield = shield; }
  const t = Math.max(0, Math.ceil(gameTime));
  if (force || lastHud.time !== t) {
    setText(UI.hudTime, t);
    UI.timer.classList.toggle('low', t <= 30);
    lastHud.time = t;
  }
  if (force || lastHud.hero !== hero) {
    const h = HEROES[hero];
    setText(UI.hudHero, h.name.toUpperCase());
    UI.hudPortrait.src = `assets/characters/${h.id}_0.png`;
    lastHud.hero = hero;
  }
  if (force) {
    setText(UI.hudLevel, THEMES[stage].name);
    setText(UI.hudStageTag, `FASE ${THEMES[stage].tag}`);
  }
  updatePowerChip();
  updateComboChip();
  updateAbilityUi();
}

function updatePowerChip() {
  if (!UI.powerChip) return;
  if (powerTime > 0 && powerType) {
    const map = { speed:['⚡','VELOCIDADE'], jump:['🚀','SUPERPULO'], magnet:['🧲','ÍMÃ'] };
    const m = map[powerType] || ['✨','PODER'];
    UI.powerChip.hidden = false;
    setText(UI.powerIcon, m[0]);
    setText(UI.powerName, m[1]);
    setText(UI.powerTime, Math.ceil(powerTime) + 's');
  } else {
    UI.powerChip.hidden = true;
  }
}

function updateComboChip() {
  if (!UI.comboChip) return;
  if (combo > 1 && comboTimer > 0) {
    UI.comboChip.hidden = false;
    UI.comboChip.innerHTML = `COMBO <b>x${Math.min(combo, 5)}</b>`;
  } else {
    UI.comboChip.hidden = true;
  }
}

function updateAbilityUi() {
  if (!UI.touchPower || !UI.powerCd) return;
  if (abilityCd > 0) {
    UI.touchPower.classList.add('cooling');
    setText(UI.powerCd, Math.ceil(abilityCd));
  } else {
    UI.touchPower.classList.remove('cooling');
    setText(UI.powerCd, '');
  }
}

function announce(text, duration = 1900) {
  const el = UI.toast;
  if (!el) return;
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

function showIntro() {
  const th = THEMES[stage];
  $('introTag').textContent = `FASE ${th.tag}`;
  $('introName').textContent = th.name;
  $('introTip').textContent = stage === 5
    ? 'Colete 5 estrelas e derrote o jacaré guardião!'
    : 'Colete 5 estrelas e abra o portão do resgate!';
  UI.intro.hidden = false;
  UI.intro.classList.remove('out');
  introOut = false;
}

function hideIntro() {
  if (!UI.intro) return;
  UI.intro.hidden = true;
  UI.intro.classList.remove('out');
}

/* ---------------- páginas, menu e modais ---------------- */
function showPage(name) {
  for (const id of ['menu', 'levels', 'play']) {
    const el = $(id);
    if (el) el.hidden = id !== name;
  }
  document.body.classList.toggle('is-playing', name === 'play');
  const ov = $('overlay');
  if (ov) ov.hidden = true;
  overlayOpen = false;
  overlayAdvance = null;
  if (name !== 'play') window.scrollTo({ top: 0, behavior: 'smooth' });
}

function stopGame() {
  running = false;
  paused = false;
  cancelAnimationFrame(raf);
  held.clear();
  prevJump = false;
  prevPower = false;
  $('intro').hidden = true;
}

function buildHeroCards() {
  const wrap = $('heroes');
  if (!wrap) return;
  wrap.replaceChildren();
  HEROES.forEach((h, i) => {
    const b = document.createElement('button');
    b.className = 'hero-card';
    b.style.setProperty('--accent', h.color);
    b.style.setProperty('--accent2', h.color2);
    b.setAttribute('aria-pressed', String(i === hero));
    b.title = `${h.name} — ${h.power}: ${h.desc}`;
    b.innerHTML = `<img src="assets/characters/${h.id}_0.png" alt=""><span>${h.name}</span>`;
    b.onclick = () => chooseHero(i);
    wrap.append(b);
  });
}

function chooseHero(i) {
  hero = clamp(i, 0, HEROES.length - 1);
  persist();
  document.querySelectorAll('.hero-card, .pup-choice, [data-pup]').forEach((el, j) => {
    if (el.classList.contains('hero-card') || el.hasAttribute('data-pup')) {
      el.setAttribute('aria-pressed', String(j === hero));
    }
  });
  document.querySelectorAll('.hero-card').forEach((el, j) => el.setAttribute('aria-pressed', String(j === hero)));
  updateHeroUi();
  updateHud(true);
  sfx('click');
}

function updateHeroUi() {
  const h = HEROES[hero];
  $('abilityName').textContent = `${h.icon} ${h.name} · ${h.power}`;
  $('abilityDesc').textContent = h.desc;
  UI.hudPortrait.src = `assets/characters/${h.id}_0.png`;
}

function buildStageGrid(container, large = false) {
  if (!container) return;
  container.replaceChildren();
  thumbCanvases.length = 0;
  THEMES.forEach((th, i) => {
    const locked = i >= saved.unlocked;
    const best = saved.bests[i] || 0;
    const b = document.createElement('button');
    b.className = 'stage-card' + (locked ? ' locked' : '') + (best > 0 ? ' cleared' : '');
    b.setAttribute('aria-label', `Fase ${th.tag} ${th.name}${locked ? ' bloqueada' : ''}`);
    const c = document.createElement('canvas');
    c.width = 320; c.height = 180;
    const meta = document.createElement('div');
    meta.className = 'stage-meta';
    meta.innerHTML = large
      ? `<b>${th.name}</b><small>FASE ${th.tag}</small>`
      : `<b>FASE ${th.tag}</b><small>${th.name.split(' ')[0]}</small>`;
    b.append(c, meta);
    if (best > 0) {
      const badge = document.createElement('span');
      badge.className = 'best';
      badge.textContent = `${best}`;
      b.append(badge);
    }
    if (locked) {
      const lock = document.createElement('span');
      lock.className = 'lock';
      lock.innerHTML = '<svg aria-hidden="true"><use href="#i-lock"/></svg>';
      b.append(lock);
    }
    b.onclick = () => {
      if (locked) { sfx('wrong'); return; }
      sfx('click');
      launch(i);
    };
    container.append(b);
    thumbCanvases.push({ canvas: c, index: i });
    paintThumb(c, i);
  });
}

function openLevels() {
  buildStageGrid($('levelCards'), true);
  showPage('levels');
}

let overlayAdvance = null;
let overlayShownAt = 0;

function openDialog(title, text, rating, buttons) {
  overlayAdvance = null;
  overlayShownAt = performance.now();
  overlayOpen = true;
  $('overlay').hidden = false;
  $('overlayTitle').textContent = title;
  $('overlayText').innerHTML = text;
  const starWrap = $('overlayStars');
  starWrap.innerHTML = '';
  if (rating > 0) {
    for (let i = 0; i < 3; i++) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add(i < rating ? 'lit' : 'dim');
      svg.innerHTML = '<use href="#i-star"/>';
      svg.style.opacity = i < rating ? '1' : '.22';
      starWrap.append(svg);
    }
  }
  const wrap = $('overlayButtons');
  wrap.replaceChildren();
  for (const item of buttons) {
    const b = document.createElement('button');
    b.textContent = item.label;
    b.onclick = () => {
      closeOverlay();
      item.fn();
    };
    wrap.append(b);
  }
}

function closeOverlay() {
  overlayOpen = false;
  overlayAdvance = null;
  $('overlay').hidden = true;
}

function togglePause() {
  if (!running || overlayOpen) return;
  paused = true;
  sfx('click');
  openDialog(
    '⏸ JOGO PAUSADO',
    `Fase ${THEMES[stage].tag} · ${THEMES[stage].name}<br>⭐ ${stars}/5 &nbsp; 🦴 ${bones} &nbsp; 🪙 ${coins} &nbsp; 🛡️ ${shield}<br>Pontos: <b>${score}</b>`,
    0,
    [
      { label: 'Continuar', fn: () => { paused = false; last = performance.now(); } },
      { label: 'Reiniciar fase', fn: () => launch(stage) },
      { label: 'Reiniciar do checkpoint', fn: () => { paused = false; respawn(); last = performance.now(); } },
      { label: 'Escolher fase', fn: () => { stopGame(); openLevels(); } },
      { label: 'Menu', fn: () => { stopGame(); showPage('menu'); } }
    ]
  );
}

function gameOverScreen() {
  running = false;
  cancelAnimationFrame(raf);
  sfx('hurt');
  openDialog(
    '💙 FIM DE JOGO',
    `Você foi muito corajoso!<br>⭐ ${stars}/5 estrelas &nbsp; · &nbsp; 🦴 ${bones} ossos &nbsp; · &nbsp; 🪙 ${coins} moedas<br>Pontos: <b>${score}</b>${advanceHint('reinicia a fase')}`,
    0,
    [
      { label: 'Tentar de novo', fn: () => launch(stage) },
      { label: 'Escolher fase', fn: () => { stopGame(); openLevels(); } },
      { label: 'Menu', fn: () => { stopGame(); showPage('menu'); } }
    ]
  );
  overlayAdvance = () => launch(stage);
}

function finishLevel() {
  running = false;
  cancelAnimationFrame(raf);
  const rating = gameTime > 85 && lives >= 3 ? 3 : (lives >= 2 ? 2 : 1);
  const total = score + coins * 20 + bones * 40 + stars * 120 + Math.ceil(gameTime) * 6 + lives * 90;
  if (total > (saved.bests[stage] || 0)) saved.bests[stage] = total;
  saved.unlocked = Math.max(saved.unlocked, Math.min(6, stage + 2));
  persist();
  sfx('goal');
  const name = THEMES[stage].name;
  const buttons = [];
  if (stage < 5) buttons.push({ label: 'Próxima fase', fn: () => launch(stage + 1) });
  buttons.push({ label: 'Jogar de novo', fn: () => launch(stage) });
  buttons.push({ label: 'Mapa de fases', fn: () => { stopGame(); openLevels(); } });
  buttons.push({ label: 'Menu', fn: () => { stopGame(); showPage('menu'); } });
  openDialog(
    stage === 5 ? '🏆 MISSÃO CUMPRIDA!' : '🎉 FASE CONCLUÍDA!',
    `<b>${name}</b><br>⭐ ${stars}/5 estrelas &nbsp; · &nbsp; 🦴 ${bones} &nbsp; · &nbsp; 🪙 ${coins} &nbsp; · &nbsp; ❤️ ${lives}<br>Tempo restante: ${Math.ceil(gameTime)}s &nbsp; · &nbsp; Pontos: <b>${total}</b>${advanceHint('avança')}`,
    rating,
    buttons
  );
  overlayAdvance = stage < 5
    ? () => launch(stage + 1)
    : () => { stopGame(); openLevels(); };
}

/* ---------------- início e loop ---------------- */
function launch(i) {
  ensureAudio();
  stage = clamp(i | 0, 0, 5);
  hero = clamp(hero, 0, HEROES.length - 1);
  level = buildLevel(stage);
  player = {
    x: 70, y: GROUND - 70, w: 44, h: 70,
    vx: 0, vy: 0, face: 1, anim: 0, grounded: false,
    coyote: 0, jumpBuffer: 0, jumps: 0, invuln: 0,
    dash: 0, dashDir: 1, glide: 0, waterWalk: 0,
    riding: null, squash: 0, hurtFlash: 0, attack: 0,
    dustAcc: 0, breath: Math.random() * 6
  };
  stars = 0; bones = 0; coins = 0; shield = 0; score = 0; lives = 3;
  combo = 0; comboTimer = 0; lastPickup = -10;
  powerType = ''; powerTime = 0; abilityCd = 0; abilityFlash = 0;
  gameTime = 240; camX = 0; camY = 0; shake = 0; timeSec = 0;
  checkpoint = { x: 70, y: GROUND };
  particles = []; floaters = [];
  prevJump = false; prevPower = false;
  hurtFlash = 0; gateMsgCd = 0; dustCd = 0; hitStop = 0;
  gameOver = false; paused = false; overlayOpen = false;
  introTime = 2.1; introOut = false;
  running = true;
  lastHud = { lives: -1, stars: -1, bones: -1, coins: -1, shield: -1, time: -1, hero: -1 };
  showPage('play');
  updateHeroUi();
  showIntro();
  updateHud(true);
  persist();
  last = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
  sfx('click');
}

function loop(t) {
  if (!running) return;
  const dt = Math.min(.033, Math.max(0, (t - last) / 1000));
  last = t;
  if (!paused && !overlayOpen) {
    if (hitStop > 0) hitStop -= dt;
    else update(dt);
    updateMusic(dt);
  } else {
    timeSec += dt * .35;
  }
  render(t);
  raf = requestAnimationFrame(loop);
}

function update(dt) {
  timeSec += dt;
  if (introTime > 0) {
    introTime -= dt;
    if (introTime < .45 && !introOut) {
      introOut = true;
      UI.intro.classList.add('out');
    }
    if (introTime <= 0) hideIntro();
    updateParticles(dt);
    updateCamera(dt);
    updateHud();
    return;
  }
  updateMovingPlatforms(dt);
  updatePlayer(dt);
  if (!running) return;
  updateItems(dt);
  updateEnemies(dt);
  updateHazards(dt);
  updateCheckpoints(dt);
  updateGoal(dt);
  updateTimers(dt);
  if (!running) return;
  updateParticles(dt);
  updateCamera(dt);
  updateHud();
}

/* ---------------- física do jogador ---------------- */
function updateMovingPlatforms(dt) {
  for (const pl of level.platforms) {
    if (!pl.moving || pl.broken) continue;
    const ny = pl.origin + Math.sin(timeSec * 1.7 + pl.phase) * pl.moveAmp;
    const dy = ny - pl.y;
    pl.y = ny;
    if (player.riding === pl && player.grounded) {
      player.y += dy;
    }
  }
}

function updatePlayer(dt) {
  const p = player;
  const inp = readInput();
  const jumpPressed = inp.jump && !prevJump;
  const jumpReleased = !inp.jump && prevJump;
  const powerPressed = inp.power && !prevPower;
  prevJump = inp.jump;
  prevPower = inp.power;

  p.invuln = Math.max(0, p.invuln - dt);
  p.attack = Math.max(0, p.attack - dt);
  p.dash = Math.max(0, p.dash - dt);
  p.glide = Math.max(0, p.glide - dt);
  p.waterWalk = Math.max(0, p.waterWalk - dt);
  p.anim += Math.abs(p.vx) * dt / 34;
  p.squash = approach(p.squash, 0, dt * 4.5);
  p.coyote = p.grounded ? .12 : Math.max(0, p.coyote - dt);
  p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);

  if (powerPressed && abilityCd <= 0) useAbility();

  if (jumpPressed) {
    p.jumpBuffer = .16;
    if (p.grounded) p.coyote = .12;
  }

  const maxSpeed = powerType === 'speed' ? 448 : (inp.run ? 388 : 302);
  const accel = p.grounded ? 2850 : 1780;
  if (p.dash > 0) {
    p.vx = p.dashDir * 720;
    p.vy = Math.min(p.vy, 80);
  } else if (Math.abs(inp.x) > .08) {
    p.vx = approach(p.vx, inp.x * maxSpeed, accel * dt);
    p.face = inp.x > 0 ? 1 : -1;
  } else {
    p.vx = approach(p.vx, 0, (p.grounded ? 2900 : 760) * dt);
  }

  if (p.jumpBuffer > 0) {
    if (p.coyote > 0) {
      p.vy = -(powerType === 'jump' ? 1150 : 1000);
      p.grounded = false; p.jumps = 1; p.coyote = 0; p.jumpBuffer = 0;
      p.squash = -.25;
      spawnDust(p.x + p.w / 2, p.y + p.h, 5);
      sfx('jump');
    } else if (powerType === 'jump' && p.jumps < 2) {
      p.vy = -1040; p.jumps = 2; p.jumpBuffer = 0; p.squash = -.3;
      sparkles(p.x + p.w / 2, p.y + p.h - 5, '#9fe8ff', 8);
      sfx('jump');
    }
  }

  if (jumpReleased && p.vy < -270) p.vy = -270;

  const wasGrounded = p.grounded;
  const prevX = p.x, prevY = p.y, prevBottom = p.y + p.h;

  if (p.glide > 0) {
    if (inp.jump && p.vy > 25) p.vy = approach(p.vy, 55, 1200 * dt);
    else p.vy = Math.min(p.vy + 1200 * dt, 260);
  } else {
    p.vy = Math.min(960, p.vy + 2350 * dt);
  }

  // movimento horizontal e colisão lateral com blocos
  p.x += p.vx * dt;
  for (const b of level.blocks) {
    if (b.broken) continue;
    if (p.x + p.w > b.x + 3 && p.x < b.x + b.w - 3 && p.y + p.h > b.y + 6 && p.y < b.y + b.h - 6) {
      if (prevX + p.w <= b.x + 4) { p.x = b.x - p.w; p.vx = 0; }
      else if (prevX >= b.x + b.w - 4) { p.x = b.x + b.w; p.vx = 0; }
    }
  }
  p.x = clamp(p.x, 0, level.len - p.w);

  // movimento vertical
  p.y += p.vy * dt;
  p.grounded = false;
  p.riding = null;

  for (const b of level.blocks) {
    if (b.broken) continue;
    if (!overlap(p, b)) continue;
    if (p.vy >= 0 && prevBottom <= b.y + 12) {
      p.y = b.y - p.h; p.vy = 0; p.grounded = true;
      p.jumps = 0; p.coyote = .12;
    } else if (p.vy < 0 && prevY >= b.y + b.h - 12) {
      p.y = b.y + b.h; p.vy = 70;
      hitBlock(b);
    } else {
      if (p.vy > 0) { p.y = b.y - p.h; p.vy = 0; p.grounded = true; }
      else { p.y = b.y + b.h; p.vy = 0; }
    }
  }

  // superfícies de um sentido: chão, pontes e plataformas
  const surfaces = [];
  for (const s of level.solids) surfaces.push({ x:s.x, y:s.y, w:s.w, h:s.h, type:'ground', ref:null });
  for (const b of level.bridges) surfaces.push({ x:b.x, y:b.y, w:b.w, h:b.h, type:'bridge', ref:b });
  for (const pl of level.platforms) {
    if (!pl.broken) surfaces.push({ x:pl.x, y:pl.y, w:pl.w, h:pl.h, type:'platform', ref:pl });
  }
  for (const s of surfaces) {
    if (p.vy >= 0 && prevBottom <= s.y + 14 && p.y + p.h >= s.y &&
        p.x + p.w > s.x + 7 && p.x < s.x + s.w - 7) {
      p.y = s.y - p.h; p.vy = 0; p.grounded = true;
      p.jumps = 0; p.coyote = .12; p.riding = s.ref;
      if (s.ref && s.ref.breakable) {
        s.ref.breakTimer = (s.ref.breakTimer || 0) + dt;
        if (s.ref.breakTimer > .55) {
          s.ref.broken = true;
          spawnDust(s.ref.x + s.ref.w / 2, s.ref.y + 8, 12);
          sfx('hurt');
        }
      }
    }
  }

  if (!wasGrounded && p.grounded) {
    p.squash = .32;
    spawnDust(p.x + p.w / 2, p.y + p.h, 6);
    sfx('land');
  }

  if (p.grounded && Math.abs(p.vx) > 80) {
    p.dustAcc += dt;
    if (p.dustAcc > .1) { p.dustAcc = 0; spawnDust(p.x + p.w / 2 - p.face * 12, p.y + p.h - 2, 2, 80); }
  }

  // água / abismo
  const cx = p.x + p.w / 2;
  const gap = level.gaps.find(q => cx > q.x - 2 && cx < q.x + q.w + 2);
  if (gap && p.y + p.h > GROUND + 10) {
    if (p.waterWalk > 0) {
      p.y = GROUND + 10 - p.h;
      p.vy = Math.min(p.vy, 0);
      p.grounded = true; p.coyote = .12; p.jumps = 0;
      if (Math.random() < .16) splash(p.x + p.w / 2, GROUND + 12, 2);
    } else {
      splash(p.x + p.w / 2, GROUND + 14, 14);
      hurt(gap.water ? 'water' : 'fall');
      return;
    }
  }
  if (p.y > H + 130) {
    hurt('fall');
    return;
  }

  // molas / blocos especiais? Apenas feedback visual de passos
  if (p.y < -40) { p.y = -40; p.vy = Math.max(0, p.vy); }
}

function hitBlock(b) {
  b.bump = 1;
  if (b.type === 'brick') {
    if (hero === 3) {
      b.broken = true;
      sparks(b.x + 24, b.y + 18, '#c27e4a', 16);
      score += 30;
      sfx('stomp');
    } else {
      sfx('stomp');
      sparks(b.x + 24, b.y + 6, '#d59a62', 5);
    }
  } else if (!b.used) {
    b.used = true;
    givePrize(b.prize);
    sparks(b.x + 24, b.y, '#ffe15a', 16);
    particles.push({
      type: 'coinpop', x: b.x + 24, y: b.y - 6, vx: 0, vy: -260,
      life: .55, max: .55, grav: 900, size: 18
    });
  } else {
    sfx('stomp');
  }
}

function givePrize(type) {
  if (type === 'heart') {
    lives = Math.min(5, lives + 1);
    announce('❤️ Vida extra!');
  } else if (type === 'shield') {
    shield = Math.min(3, shield + 1);
    announce('🛡️ Escudo equipado!');
  } else if (type === 'coin') {
    coins += 5; score += 50;
    announce('🪙 +5 moedas!');
  } else {
    powerType = type;
    powerTime = 9;
    const names = { speed:'⚡ SUPER VELOCIDADE!', jump:'🚀 SUPER PULO!', magnet:'🧲 ÍMÃ DE TESOUROS!' };
    announce(names[type] || '✨ PODER!');
  }
  sfx('power');
  updateHud(true);
}

/* ---------------- poderes dos filhotes ---------------- */
function useAbility() {
  const p = player;
  const fx = p.x + p.w / 2, fy = p.y + p.h * .45;
  abilityCd = 4.2;
  abilityFlash = .35;
  p.attack = .32;
  sfx('power');
  switch (hero) {
    case 0:
      p.dash = .32; p.dashDir = p.face;
      p.invuln = Math.max(p.invuln, .45);
      ring(fx, fy, '#66ddff', 20, 64);
      announce('⚡ DASH POLICIAL!');
      break;
    case 1:
      for (const h of level.hazards) {
        if (h.type === 'fire' && Math.abs(h.x - p.x) < 330) {
          h.disabled = true;
          steam(h.x + h.w / 2, h.y + 10, 8);
        }
      }
      for (const e of level.enemies) {
        if (e.alive && e.type !== 'boss' && Math.abs(e.x - p.x) < 160) killEnemy(e, 60);
      }
      for (let i = 0; i < 18; i++) {
        particles.push({
          type:'spark', x: fx, y: fy, vx: rnd(-260, 260), vy: rnd(-260, 40),
          life: rnd(.3, .7), max: .7, grav: 900, color:'#7fe6ff', size: rnd(3, 6)
        });
      }
      shake = 5;
      announce('💦 JATO D’ÁGUA!');
      break;
    case 2:
      p.glide = 3.4;
      p.vy = -330;
      p.grounded = false;
      sparkles(fx, fy, '#ffc2e4', 18);
      announce('🪽 PLANEIO!');
      break;
    case 3:
      for (const b of level.blocks) {
        if (b.type === 'brick' && !b.broken && Math.abs(b.x - p.x) < 240) {
          b.broken = true;
          sparks(b.x + 24, b.y + 20, '#c27e4a', 10);
        }
      }
      for (const e of level.enemies) {
        if (e.alive && e.type !== 'boss' && Math.abs(e.x - p.x) < 180) killEnemy(e, 90);
      }
      ring(fx, p.y + p.h, '#ffd95a', 24, 140);
      shake = 14;
      announce('🔨 ONDA DE CHOQUE!');
      break;
    case 4: {
      let target = null;
      for (const gap of level.gaps) {
        if (gap.x > p.x - 30 && gap.x < p.x + 360 && !gap.bridged) {
          if (!target || gap.x < target.x) target = gap;
        }
      }
      if (target) {
        level.bridges.push({ x: target.x - 7, y: GROUND - 3, w: target.w + 14, h: 14, rope: true, temp: 10 });
        target.bridged = true;
        sparks(target.x + target.w / 2, GROUND - 10, '#d9a05c', 20);
        announce('🛠️ PONTE CONSTRUÍDA!');
      } else {
        level.platforms.push({
          x: p.x + p.face * 70 - 55, y: GROUND - 110, w: 118, h: 22,
          moving:false, breakable:false, temp:8, kind:'earth'
        });
        sparks(p.x + p.face * 70, GROUND - 100, '#d9a05c', 16);
        announce('🛠️ PLATAFORMA DE APOIO!');
      }
      break;
    }
    case 5:
      p.waterWalk = 3.4;
      p.vy = -560;
      p.grounded = false;
      p.invuln = Math.max(p.invuln, .5);
      splash(fx, p.y + p.h, 20);
      announce('🌊 IMPULSO AQUÁTICO!');
      break;
  }
}

/* ---------------- dano, checkpoint e itens ---------------- */
function hurt(reason = '') {
  if (player.invuln > 0 || player.dash > 0) return;
  if (shield > 0) {
    shield--;
    player.invuln = 1.3;
    shake = 6;
    sfx('power');
    ring(player.x + player.w / 2, player.y + player.h / 2, '#9fefff', 16, 80);
    announce('🛡️ O escudo protegeu!');
    updateHud(true);
    return;
  }
  lives--;
  player.invuln = 2.2;
  shake = 16;
  hurtFlash = .45;
  hitStop = .06;
  sfx('hurt');
  sparks(player.x + player.w / 2, player.y + player.h / 2, '#ff8a8a', 16);
  updateHud(true);
  if (lives <= 0) {
    gameOver = true;
    gameOverScreen();
    return;
  }
  announce(reason === 'water' ? '💦 Cuidado com a água!' : reason === 'fall' ? '🕳️ Cuidado com o buraco!' : '💙 Vamos tentar mais uma vez!');
  respawn();
}

function respawn() {
  if (!player) return;
  player.x = checkpoint.x;
  player.y = GROUND - player.h - 2;
  player.vx = 0; player.vy = 0;
  player.grounded = false; player.coyote = 0; player.jumpBuffer = 0;
  player.dash = 0; player.glide = 0; player.waterWalk = 0;
  player.anim = 0;
  camX = clamp(checkpoint.x - W * .34, 0, Math.max(0, level.len - W));
  ring(player.x + player.w / 2, player.y + player.h / 2, '#8fe6ff', 12, 60);
  updateHud(true);
}

function updateCheckpoints(dt) {
  for (const cp of level.checkpoints) {
    if (!cp.active && player.x + player.w / 2 > cp.x) {
      cp.active = true;
      checkpoint = { x: cp.x, y: GROUND };
      sfx('checkpoint');
      announce('🚩 Checkpoint salvo!');
      sparkles(cp.x + 20, cp.y - 10, '#9dff9d', 18);
      updateHud(true);
    }
  }
}

function updateGoal(dt) {
  const gate = level.goal;
  gate.open = stars >= 5 && !(level.boss && level.boss.alive);
  if (!overlap(player, gate)) return;
  if (stars < 5) {
    if (gateMsgCd <= 0) {
      announce(`⭐ Faltam ${5 - stars} estrela${5 - stars === 1 ? '' : 's'}!`);
      sfx('wrong');
      gateMsgCd = 2.5;
    }
    player.vx = 0;
    if (player.x + player.w > gate.x) player.x = gate.x - player.w - 1;
  } else if (level.boss && level.boss.alive) {
    if (gateMsgCd <= 0) {
      announce('🐊 Derrote o jacaré guardião!');
      sfx('wrong');
      gateMsgCd = 2.5;
    }
  } else {
    finishLevel();
  }
}

function updateItems(dt) {
  const p = player;
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  for (const item of level.items) {
    if (item.taken) continue;
    const itemY = item.y + Math.sin(timeSec * 2.4 + item.phase) * 4;
    if (powerType === 'magnet') {
      const dx = cx - item.x, dy = cy - itemY;
      const d = Math.hypot(dx, dy);
      if (d < 230) {
        item.x += dx * dt * 5.2;
        item.y += dy * dt * 5.2;
      }
    }
    const dx = item.x - cx, dy = itemY - cy;
    const r = item.type === 'star' ? 46 : 39;
    if (dx * dx + dy * dy < r * r) collectItem(item);
  }
}

function collectItem(item) {
  item.taken = true;
  combo = (timeSec - lastPickup < 2.7) ? combo + 1 : 1;
  lastPickup = timeSec;
  comboTimer = 2.7;
  const mult = Math.min(combo, 5);
  let val = 20;
  if (item.type === 'star') {
    stars++; val = 200 * mult;
    sfx('star');
    sparkles(item.x, item.y, '#ffe66a', 26);
    if (stars === 5) {
      level.goal.open = true;
      announce('⭐ 5 ESTRELAS! O RESGATE ABRIU!', 2400);
      sfx('gate');
      shake = 8;
      ring(item.x, item.y, '#ffe66a', 20, 120);
    } else {
      announce(`⭐ Estrela ${stars}/5!`, 1200);
    }
  } else if (item.type === 'bone') {
    bones++; val = 50 * mult;
    sfx('bone');
    sparkles(item.x, item.y, '#fff0c8', 12);
  } else {
    coins++; val = 20 * mult;
    sfx('coin');
    sparkles(item.x, item.y, '#ffd84d', 10);
  }
  score += val;
  floaters.push({
    x: item.x, y: item.y - 18, text: '+' + val, color: item.type === 'star' ? '#ffe66a' : '#fff6c8',
    life: .9, max: .9, vy: -55
  });
  updateHud(true);
}

function updateHazards(dt) {
  for (const h of level.hazards) {
    if (h.disabled) continue;
    const box = {
      x: h.x + 11, y: h.y + (h.type === 'fire' ? 12 : 5),
      w: h.w - 22, h: h.h - (h.type === 'fire' ? 14 : 6)
    };
    if (overlap(player, box)) hurt();
  }
}

/* ---------------- inimigos ---------------- */
function updateEnemies(dt) {
  const p = player;
  const pcx = p.x + p.w / 2;
  const prevBottom = p.y + p.h; // suficiente para o toque após o movimento
  for (const e of level.enemies) {
    if (!e.alive) continue;
    e.phase = (e.phase || 0) + dt;
    if (e.type === 'bird') {
      e.x = e.baseX + Math.sin(e.phase * .9 + e.wobble) * e.range;
      e.y = e.baseY + Math.sin(e.phase * 2.4) * 16;
      e.dir = Math.cos(e.phase * .9 + e.wobble) >= 0 ? 1 : -1;
    } else if (e.type === 'boss') {
      e.hurt = Math.max(0, (e.hurt || 0) - dt);
      e.hitCd = Math.max(0, (e.hitCd || 0) - dt);
      e.hintCd = Math.max(0, (e.hintCd || 0) - dt);
      e.attack = Math.max(0, (e.attack || 0) - dt);
      e.lungeCd = (e.lungeCd === undefined ? 1.6 : e.lungeCd) - dt;
      const dx = pcx - (e.x + e.w / 2);
      if (e.attack > 0) {
        e.x += e.dir * 330 * dt;
      } else {
        if (e.lungeCd <= 0 && Math.abs(dx) < 430) {
          e.attack = .55;
          e.dir = dx > 0 ? 1 : -1;
          e.lungeCd = 2.2;
          shake = Math.max(shake, 5);
        } else {
          e.x += e.dir * e.speed * dt;
        }
      }
      if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
      if (e.x > e.maxX) { e.x = e.maxX; e.dir = -1; }
      e.y = GROUND - e.h + Math.sin(e.phase * 3) * 3;
    } else {
      e.hop = Math.abs(Math.sin(e.phase * 5)) * 15;
      const spd = (e.speed || 55) * (Math.abs(pcx - (e.x + e.w / 2)) < 240 ? 1.5 : 1);
      e.x += e.dir * spd * dt;
      if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
      if (e.x > e.maxX) { e.x = e.maxX; e.dir = -1; }
      if (e.type === 'chest') {
        e.y = GROUND - e.h - (Math.abs(Math.sin(e.phase * 5)) > .45 ? e.hop : 0);
      } else {
        e.y = GROUND - e.h + Math.sin(e.phase * 8) * 1.2;
      }
    }

    const box = { x: e.x + 5, y: e.y + 4, w: e.w - 10, h: e.h - 8 };
    if (!overlap(p, box)) continue;
    const stomp = p.vy > 65 && prevBottom <= e.y + e.h * .55;

    if (e.type === 'boss') {
      if (stomp) {
        p.y = e.y - p.h - 2;
        p.vy = -650;
        p.jumps = 0;
        p.squash = .28;
        hitStop = .035;
        damageBoss(e);
      } else if ((p.dash > 0 || p.attack > 0) && (e.hitCd || 0) <= 0) {
        damageBoss(e);
        e.hitCd = .9;
        p.dash = 0;
        p.attack = 0;
        p.vx = -p.face * 300;
        p.vy = -240;
        p.invuln = Math.max(p.invuln, 1);
      } else if (p.invuln <= 0) {
        if (e.attack > 0) {
          hurt();
          if (!running) return;
          announce('🐊 Cuidado com a investida!', 1200);
        } else {
          p.vx = -p.face * 240;
          p.vy = -200;
          p.invuln = Math.max(p.invuln, .5);
          if ((e.hintCd || 0) <= 0) {
            announce('🐊 Pule na cabeça ou use o poder especial!', 1500);
            e.hintCd = 3;
          }
        }
      }
      continue;
    }

    if (stomp) {
      p.y = e.y - p.h - 2;
      p.vy = -650;
      p.jumps = 0;
      p.squash = .28;
      hitStop = .035;
      killEnemy(e, 100);
    } else if (p.dash > 0) {
      killEnemy(e, 140);
    } else if (p.attack > 0) {
      killEnemy(e, 90);
    } else if (p.invuln <= 0) {
      hurt();
      if (!running) return;
    }
  }
}

function damageBoss(e) {
  e.hp--;
  e.hurt = .5;
  shake = 14;
  sfx('stomp');
  sparks(e.x + e.w / 2, e.y + 10, '#d9ff9a', 16);
  if (e.hp <= 0) {
    e.alive = false;
    score += 1200;
    shake = 22;
    swirl(e.x + e.w / 2, e.y + e.h / 2);
    floaters.push({ x: e.x + e.w / 2, y: e.y, text: '+1200', color: '#ffe66a', life: 1.4, max: 1.4, vy: -40 });
    announce('🏆 JACARÉ DERROTADO! O RESGATE ESTÁ LIVRE!', 2400);
    sfx('goal');
  } else {
    announce(`🐊 Jacaré: faltam ${e.hp} acerto${e.hp === 1 ? '' : 's'}!`, 1400);
  }
}

function killEnemy(e, bonus = 100) {
  e.alive = false;
  score += bonus;
  sfx('stomp');
  sparks(e.x + e.w / 2, e.y + e.h / 2, '#ffe066', 12);
  swirl(e.x + e.w / 2, e.y + e.h / 2);
  floaters.push({ x:e.x + e.w / 2, y:e.y, text:'+' + bonus, color:'#fff0a0', life: .8, max: .8, vy:-50 });
}

/* ---------------- partículas ---------------- */
function sparks(x, y, color, n = 10) {
  for (let i = 0; i < n; i++) {
    particles.push({
      type:'spark', x, y, vx: rnd(-230, 230), vy: rnd(-280, 20),
      life: rnd(.28, .75), max:.75, grav: 700, color, size: rnd(2, 5)
    });
  }
}
function sparkles(x, y, color, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rnd(60, 240);
    particles.push({
      type:'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: rnd(.35, .9), max:.9, grav: 120, color, size: rnd(2, 6)
    });
  }
}
function spawnDust(x, y, n = 5, spread = 120) {
  for (let i = 0; i < n; i++) {
    particles.push({
      type:'dust', x: x + rnd(-12, 12), y: y - rnd(0, 8),
      vx: rnd(-spread, spread) * .45, vy: rnd(-70, -15),
      life: rnd(.3, .6), max:.6, color:'#f0e6cf', size: rnd(4, 10)
    });
  }
}
function splash(x, y, n = 12) {
  for (let i = 0; i < n; i++) {
    particles.push({
      type:'spark', x, y, vx: rnd(-200, 200), vy: rnd(-360, -80),
      life: rnd(.3, .7), max:.7, grav: 900, color: i % 3 ? '#a9f1ff' : '#e9ffff', size: rnd(2, 6)
    });
  }
}
function steam(x, y, n = 6) {
  for (let i = 0; i < n; i++) {
    particles.push({
      type:'dust', x: x + rnd(-20, 20), y: y + rnd(-8, 4),
      vx: rnd(-35, 35), vy: rnd(-110, -40),
      life: rnd(.5, 1), max:1, color:'#eafaff', size: rnd(6, 14)
    });
  }
}
function ring(x, y, color, n = 1, radius = 80) {
  for (let i = 0; i < n; i++) {
    particles.push({
      type:'ring', x, y, rad: 8, maxRad: radius + rnd(-15, 20),
      life: .45 + rnd(0, .2), max: .6, color, width: rnd(3, 6)
    });
  }
}
function swirl(x, y) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      type:'spark', x: x + rnd(-15, 15), y: y + rnd(-10, 10),
      vx: rnd(-90, 90), vy: rnd(-180, -40), life: rnd(.35, .7), max:.7,
      grav: -40, color:'#ffffff', size: rnd(2, 5)
    });
  }
}

function updateParticles(dt) {
  for (const pt of particles) {
    pt.life -= dt;
    if (pt.type === 'ring') {
      pt.rad += (pt.maxRad - pt.rad) * Math.min(1, dt * 9);
      continue;
    }
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += (pt.grav || 0) * dt;
    if (pt.type === 'coinpop') pt.vy += 0;
  }
  particles = particles.filter(pt => pt.life > 0);
  for (const f of floaters) {
    f.life -= dt;
    f.y += f.vy * dt;
    f.vy *= .97;
  }
  floaters = floaters.filter(f => f.life > 0);
}

/* ---------------- câmera e tempo ---------------- */
function updateCamera(dt) {
  if (!player) return;
  const target = clamp(
    player.x - W * .33 + player.face * 38 + player.vx * .055,
    0, Math.max(0, level.len - W)
  );
  camX = lerp(camX, target, Math.min(1, dt * 7.5));
  shake = Math.max(0, shake - dt * 38);
}

function updateTimers(dt) {
  if (powerTime > 0) {
    powerTime = Math.max(0, powerTime - dt);
    if (powerTime <= 0) {
      powerType = '';
      announce('✨ O poder acabou.');
    }
  }
  abilityCd = Math.max(0, abilityCd - dt);
  abilityFlash = Math.max(0, abilityFlash - dt);
  comboTimer = Math.max(0, comboTimer - dt);
  if (comboTimer <= 0) combo = 0;
  hurtFlash = Math.max(0, hurtFlash - dt);
  gateMsgCd = Math.max(0, gateMsgCd - dt);

  // pontes temporárias
  for (const b of level.bridges) {
    if (b.temp !== undefined) b.temp -= dt;
  }
  level.bridges = level.bridges.filter(b => b.temp === undefined || b.temp > 0);

  // blocos: animação de batida
  for (const b of level.blocks) {
    if (b.bump > 0) b.bump = Math.max(0, b.bump - dt * 4);
  }

  // plataformas temporárias (criadas por habilidades)
  if (level.platforms) {
    for (const p of level.platforms) {
      if (p.temp !== undefined && !p.gone) {
        p.temp -= dt;
        if (p.temp <= 0) p.gone = true;
      }
    }
    level.platforms = level.platforms.filter(p => !p.gone);
  }

  if (level.bridges.length && level.platforms) {
    for (const gap of level.gaps) {
      gap.bridged = level.bridges.some(b => b.x <= gap.x + 2 && b.x + b.w >= gap.x + gap.w - 2);
    }
  }

  gameTime = Math.max(0, gameTime - dt);
  if (gameTime <= 0) {
    gameTime = 60;
    hurt();
    announce('⏰ Tempo esgotado!');
  }
}

/* =========================================================
   DESENHO — cenários
   ========================================================= */
function drawCloud(ctx, x, y, s, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, 30 * s, 19 * s, 0, 0, TAU);
  ctx.ellipse(x + 28 * s, y - 10 * s, 36 * s, 24 * s, 0, 0, TAU);
  ctx.ellipse(x + 64 * s, y, 26 * s, 17 * s, 0, 0, TAU);
  ctx.ellipse(x + 34 * s, y + 7 * s, 38 * s, 18 * s, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,196,235,.35)';
  ctx.beginPath();
  ctx.ellipse(x + 30 * s, y + 13 * s, 34 * s, 9 * s, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawRidge(ctx, baseY, color, amp, step, offset, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-160, H);
  ctx.lineTo(-160, baseY + 44);
  let x = -160 + mod(offset, step);
  let i = 0;
  while (x < W + 240) {
    const peak = baseY - amp * (.55 + ((i * 37 + 17) % 100) / 100 * .45);
    ctx.lineTo(x + step * .48, peak);
    ctx.lineTo(x + step, baseY + 44);
    x += step;
    i++;
  }
  ctx.lineTo(W + 240, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTree(ctx, x, baseY, s, color1, color2) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(s, s);
  ctx.fillStyle = '#5b3a22';
  ctx.fillRect(-7, -96, 14, 96);
  ctx.fillStyle = color1;
  ctx.beginPath();
  ctx.arc(-27, -108, 42, 0, TAU);
  ctx.arc(26, -108, 42, 0, TAU);
  ctx.arc(0, -146, 48, 0, TAU);
  ctx.arc(0, -104, 46, 0, TAU);
  ctx.fill();
  ctx.fillStyle = color2;
  ctx.beginPath();
  ctx.arc(-18, -126, 29, 0, TAU);
  ctx.arc(18, -120, 26, 0, TAU);
  ctx.arc(0, -158, 25, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawPine(ctx, x, baseY, s, color) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(s, s);
  ctx.fillStyle = '#4b3b33';
  ctx.fillRect(-5, -60, 10, 60);
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    const yy = -46 - i * 34;
    const ww = 44 - i * 9;
    ctx.beginPath();
    ctx.moveTo(0, yy - 55);
    ctx.lineTo(ww, yy + 10);
    ctx.lineTo(-ww, yy + 10);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.moveTo(0, -100);
  ctx.lineTo(18, -62);
  ctx.lineTo(-16, -62);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBackdrop(ctx, idx, cam, t, w, h) {
  ctx.save();
  ctx.scale(w / W, h / H);
  const th = THEMES[idx];
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, th.sky[0]);
  sky.addColorStop(1, th.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // sol / lua
  const sunX = 748, sunY = 96;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 160);
  glow.addColorStop(0, idx === 2 || idx === 5 ? 'rgba(255,160,170,.9)' : 'rgba(255,250,190,.95)');
  glow.addColorStop(.35, idx === 2 || idx === 5 ? 'rgba(255,120,110,.35)' : 'rgba(255,240,150,.35)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 180, sunY - 180, 360, 360);
  ctx.fillStyle = idx === 2 || idx === 5 ? '#ffd5c2' : '#fffbe0';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 42, 0, TAU);
  ctx.fill();

  if (idx === 0) {
    // Baía: panorama extraído da arte de referência + nuvens em primeiro plano
    if (panorama.complete && panorama.naturalWidth) {
      const shift = Math.min(170, cam * .035);
      ctx.globalAlpha = .96;
      ctx.drawImage(panorama, -42 - shift, 42, 1200, 460);
      ctx.globalAlpha = 1;
    } else {
      drawRidge(ctx, 300, '#86b9a8', 130, 260, cam * .06, .95);
      drawRidge(ctx, 360, '#5d9c83', 150, 290, cam * .1, .95);
    }
    for (let i = 0; i < 8; i++) {
      const x = mod(i * 231 - cam * .12, W + 300) - 150;
      drawCloud(ctx, x, 58 + (i % 3) * 46, .8 + (i % 3) * .16, .8);
    }
    const bayHaze = ctx.createLinearGradient(0, 248, 0, 404);
    bayHaze.addColorStop(0, 'rgba(165,235,245,0)');
    bayHaze.addColorStop(.42, 'rgba(165,235,245,.34)');
    bayHaze.addColorStop(1, 'rgba(165,235,245,0)');
    ctx.fillStyle = bayHaze;
    ctx.fillRect(0, 248, W, 156);
    // gaivotas distantes
    ctx.strokeStyle = 'rgba(40,92,110,.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const bx = mod(i * 310 + 140 - cam * .2, W + 100);
      const by = 120 + (i % 2) * 40 + Math.sin(t * .0009 + i) * 8;
      ctx.beginPath();
      ctx.arc(bx - 5, by, 7, Math.PI * 1.1, Math.PI * 1.9);
      ctx.arc(bx + 5, by, 7, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else if (idx === 1) {
    drawRidge(ctx, 250, '#83b7a9', 120, 300, cam * .04, .42);
    drawRidge(ctx, 315, th.far, 140, 250, cam * .07, .9);
    drawRidge(ctx, 390, th.mid, 110, 290, cam * .12, .95);
    for (let i = 0; i < 10; i++) {
      const x = mod(i * 170 - cam * .16, W + 300) - 130;
      drawTree(ctx, x, 420 + (i % 3) * 12, 1 + (i % 3) * .18, i % 2 ? '#317d58' : '#3a8d63', i % 2 ? '#58a978' : '#65b984');
    }
    for (let i = 0; i < 6; i++) {
      const x = mod(i * 310 - cam * .26, W + 300) - 120;
      drawTree(ctx, x, 505, 1.6 + (i % 2) * .3, '#1f6449', '#2c7955');
    }
    // raios de sol
    ctx.save();
    ctx.globalAlpha = .13;
    ctx.fillStyle = '#fff8c8';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(620 + i * 60, -30);
      ctx.lineTo(420 + i * 90, 520);
      ctx.lineTo(500 + i * 90, 520);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else if (idx === 2) {
    ctx.fillStyle = '#211a3d';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= W + 80; x += 80) {
      ctx.lineTo(x, 40 + Math.sin(x * .021 + 1) * 34 + (x % 240 === 0 ? 50 : 0));
    }
    ctx.lineTo(W, 0);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 9; i++) {
      const x = mod(i * 137 - cam * .08, W + 100);
      const hh = 90 + (i * 53) % 160;
      ctx.fillStyle = 'rgba(20,16,44,.75)';
      ctx.beginPath();
      ctx.moveTo(x - 46, H);
      ctx.lineTo(x, H - hh);
      ctx.lineTo(x + 46, H);
      ctx.closePath();
      ctx.fill();
      const cg = ctx.createRadialGradient(x, H - hh * .5, 2, x, H - hh * .5, 80);
      cg.addColorStop(0, i % 3 ? 'rgba(167,230,255,.55)' : 'rgba(232,150,255,.5)');
      cg.addColorStop(1, 'rgba(120,90,200,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(x - 80, H - hh, 160, hh);
      ctx.fillStyle = i % 3 ? '#8bd7ff' : '#da9bff';
      ctx.beginPath();
      ctx.moveTo(x, H - hh - 20);
      ctx.lineTo(x + 10, H - hh + 26);
      ctx.lineTo(x - 10, H - hh + 26);
      ctx.closePath();
      ctx.fill();
    }
    drawRidge(ctx, 425, '#2b2344', 70, 240, cam * .12, .9);
    const caveHaze = ctx.createLinearGradient(0, 300, 0, 520);
    caveHaze.addColorStop(0, 'rgba(149,128,214,0)');
    caveHaze.addColorStop(.55, 'rgba(149,128,214,.16)');
    caveHaze.addColorStop(1, 'rgba(149,128,214,.05)');
    ctx.fillStyle = caveHaze;
    ctx.fillRect(0, 300, W, 220);
  } else if (idx === 3) {
    drawRidge(ctx, 265, '#d6ecfa', 170, 300, cam * .04, .95);
    drawRidge(ctx, 340, '#aacde5', 135, 250, cam * .07, .95);
    drawRidge(ctx, 415, '#84aacb', 90, 290, cam * .11, .95);
    for (let i = 0; i < 11; i++) {
      const x = mod(i * 150 - cam * .15, W + 260) - 110;
      drawPine(ctx, x, 470 + (i % 4) * 8, .85 + (i % 3) * .16, i % 2 ? '#3c6784' : '#315b76');
    }
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 70; i++) {
      const x = mod(i * 137 - cam * .08 + t * .012, W + 40);
      const y = mod(i * 83 + t * .045, H);
      const r = 1 + (i % 3);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  } else if (idx === 4) {
    const cityHaze = ctx.createLinearGradient(0, 180, 0, 420);
    cityHaze.addColorStop(0, 'rgba(255,230,170,0)');
    cityHaze.addColorStop(.5, 'rgba(255,230,170,.24)');
    cityHaze.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = cityHaze;
    ctx.fillRect(0, 180, W, 240);
    drawRidge(ctx, 320, '#9fb5d2', 100, 280, cam * .05, .8);
    for (let layer = 0; layer < 2; layer++) {
      const alpha = layer ? 1 : .72;
      for (let i = 0; i < 10; i++) {
        const bw = 70 + (i * 47) % 70;
        const bh = 110 + (i * 73) % 170;
        const x = mod(i * 130 - cam * (.1 + layer * .06) + layer * 50, W + 260) - 130;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = layer ? '#5a7199' : '#7d94b8';
        ctx.fillRect(x, 470 - bh, bw, bh);
        ctx.fillStyle = layer ? 'rgba(255,238,170,.6)' : 'rgba(220,245,255,.35)';
        for (let wy = 470 - bh + 18; wy < 450; wy += 25) {
          for (let wx = x + 12; wx < x + bw - 10; wx += 22) {
            if ((wx + wy) % 3 === 0) ctx.fillRect(wx, wy, 8, 11);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const x = mod(i * 320 - cam * .12, W + 300) - 150;
      drawCloud(ctx, x, 100 + (i % 2) * 42, 1, .45);
    }
  } else {
    const moon = ctx.createRadialGradient(560, 110, 10, 560, 110, 210);
    moon.addColorStop(0, 'rgba(255,137,100,.75)');
    moon.addColorStop(1, 'rgba(160,60,90,0)');
    ctx.fillStyle = moon;
    ctx.fillRect(330, -100, 460, 460);
    ctx.fillStyle = '#ffcf9d';
    ctx.beginPath();
    ctx.arc(560, 110, 54, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(90,45,92,.55)';
    ctx.beginPath();
    ctx.arc(586, 92, 18, 0, TAU);
    ctx.arc(536, 132, 11, 0, TAU);
    ctx.fill();
    // torre central
    const tx = 640 - cam * .035;
    ctx.fillStyle = '#332446';
    ctx.fillRect(tx - 46, 190, 92, 320);
    ctx.fillStyle = '#432f59';
    ctx.fillRect(tx - 62, 165, 124, 30);
    ctx.fillStyle = '#e58a6a';
    ctx.fillRect(tx - 66, 158, 132, 8);
    ctx.beginPath();
    ctx.arc(tx, 120, 86, 0, TAU);
    ctx.fillStyle = '#3a2950';
    ctx.fill();
    ctx.fillStyle = '#d77d68';
    ctx.beginPath();
    ctx.arc(tx, 120, 58, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd39b';
    ctx.beginPath();
    ctx.arc(tx, 120, 18, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = 'rgba(255,170,110,.32)';
      ctx.fillRect(tx - 34, 220 + i * 42, 68, 4);
    }
    drawRidge(ctx, 400, '#3b2748', 90, 220, cam * .12, .85);
    // brasas
    for (let i = 0; i < 28; i++) {
      const x = mod(i * 131 - cam * .1 + Math.sin(t * .001 + i) * 20, W + 40);
      const y = mod(-i * 71 + t * .05, H);
      ctx.globalAlpha = .25 + (i % 4) * .14;
      ctx.fillStyle = i % 3 ? '#ffad6a' : '#ffdf7a';
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 3), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // relâmpago ocasional
    const bolt = Math.sin(t * .0012) > .975;
    if (bolt) {
      ctx.strokeStyle = 'rgba(255,230,180,.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(190, 0);
      ctx.lineTo(220, 90);
      ctx.lineTo(198, 92);
      ctx.lineTo(238, 190);
      ctx.stroke();
    }
  }

  // névoa na base para unir o cenário ao chão
  const haze = ctx.createLinearGradient(0, 330, 0, 520);
  haze.addColorStop(0, 'rgba(255,255,255,0)');
  haze.addColorStop(1, idx === 2 ? 'rgba(76,54,108,.5)' : idx === 5 ? 'rgba(140,66,70,.45)' : 'rgba(220,248,255,.45)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 330, W, 210);

  ctx.restore();
}

/* =========================================================
   DESENHO — mundo
   ========================================================= */
function render(t) {
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.clearRect(0, 0, W, H);
  if (!level || !player) return;
  const sx = rnd(-1, 1) * shake;
  const sy = rnd(-1, 1) * shake;
  g.save();
  g.translate(sx * .25, sy * .25);
  drawBackdrop(g, stage, camX, timeSec * 1000, W, H);
  g.restore();

  g.save();
  g.translate(-camX + sx, sy);
  drawWorld(t);
  g.restore();

  drawForeground(t);
  if (level.boss && level.boss.alive) drawBossBar();
  if (hurtFlash > 0) {
    g.fillStyle = `rgba(255,44,64,${hurtFlash * .45})`;
    g.fillRect(0, 0, W, H);
  }
}

function drawWorld(t) {
  const th = THEMES[stage];

  // água / abismos
  for (const gap of level.gaps) drawGap(gap, t);

  // chão
  for (const s of level.solids) drawGround(s.x, s.y, s.w, s.h, t);

  // decoração
  for (const d of level.decor) drawDecor(d);

  // pontes
  for (const b of level.bridges) drawBridge(b);

  // plataformas
  for (const pl of level.platforms) if (!pl.broken) drawPlatform(pl, t);

  // checkpoints e portal
  for (const cp of level.checkpoints) drawCheckpoint(cp, t);
  drawGoal(t);

  // blocos, perigos, itens
  for (const b of level.blocks) if (!b.broken) drawBlock(b, t);
  for (const h of level.hazards) drawHazard(h, t);
  for (const item of level.items) if (!item.taken) drawItem(item, t);

  // inimigos e jogador
  for (const e of level.enemies) if (e.alive) drawEnemy(e, t);
  drawPlayer(t);

  drawParticles();
  drawFloaters();
}

function drawGround(x, y, w, h, t) {
  const th = THEMES[stage];
  g.save();
  g.beginPath();
  g.rect(x, y - 4, w, h + 4);
  g.clip();
  g.fillStyle = th.soilDark;
  g.fillRect(x, y - 4, w, h + 4);
  tile(g, art.dirt, x, y, w, h, 128, 112);
  if (th.tint) {
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = th.tint;
    g.fillRect(x, y, w, h);
    g.globalCompositeOperation = 'source-over';
  }
  if (th.lighten) {
    g.fillStyle = th.lighten;
    g.fillRect(x, y, w, h);
  }
  const shade = g.createLinearGradient(0, y + h * .35, 0, y + h);
  shade.addColorStop(0, 'rgba(20,10,5,0)');
  shade.addColorStop(1, 'rgba(20,10,5,.5)');
  g.fillStyle = shade;
  g.fillRect(x, y, w, h);
  // borda escura nos lados dos buracos
  const side = g.createLinearGradient(x, 0, x + 16, 0);
  side.addColorStop(0, 'rgba(30,14,6,.45)');
  side.addColorStop(1, 'rgba(30,14,6,0)');
  g.fillStyle = side; g.fillRect(x, y, 16, h);
  g.save(); g.translate(x + w, 0); g.scale(-1, 1); g.fillStyle = side; g.fillRect(0, y, 16, h); g.restore();
  g.restore();

  drawCap(x, y, w, th.cap);

  // borda inferior de grama
  g.fillStyle = 'rgba(40,24,10,.28)';
  g.fillRect(x, y + 17, w, 3);
}

function drawCap(x, y, w, type) {
  if (type === 'grass') {
    g.save();
    g.beginPath();
    g.rect(x, y - 13, w, 30);
    g.clip();
    if (art.grass.complete && art.grass.naturalWidth) {
      for (let tx = Math.floor(x / 128) * 128; tx < x + w; tx += 128) {
        g.drawImage(art.grass, tx, y - 12, 128, 24);
      }
    } else {
      g.fillStyle = THEMES[stage].grass;
      g.fillRect(x, y - 8, w, 16);
    }
    g.restore();
    const capGrad = g.createLinearGradient(0, y - 4, 0, y + 14);
    capGrad.addColorStop(0, 'rgba(255,255,255,.22)');
    capGrad.addColorStop(1, 'rgba(0,40,0,.18)');
    g.fillStyle = capGrad;
    g.fillRect(x, y - 5, w, 16);
  } else if (type === 'snow') {
    g.save();
    g.fillStyle = '#f5fdff';
    g.beginPath();
    g.moveTo(x, y + 13);
    for (let tx = x; tx <= x + w; tx += 26) {
      g.quadraticCurveTo(tx + 13, y - 12, tx + 26, y + 1);
    }
    g.lineTo(x + w, y + 15);
    g.lineTo(x, y + 15);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(150,205,235,.45)';
    g.fillRect(x, y + 9, w, 5);
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.fillRect(x, y - 1, w, 3);
    g.restore();
  } else if (type === 'cave') {
    g.save();
    g.fillStyle = '#9b6fa0';
    for (let tx = x; tx < x + w; tx += 22) {
      const hh = 5 + (tx % 3) * 4;
      g.beginPath();
      g.ellipse(tx + 11, y + 1, 14, hh, 0, 0, TAU);
      g.fill();
    }
    g.fillStyle = 'rgba(66,40,82,.55)';
    g.fillRect(x, y + 6, w, 4);
    // pequenas estalactites de musgo
    g.strokeStyle = '#b98ac4';
    g.lineWidth = 3;
    for (let tx = x + 20; tx < x + w; tx += 58) {
      g.beginPath();
      g.moveTo(tx, y + 6);
      g.lineTo(tx + 4, y + 18);
      g.stroke();
    }
    g.restore();
  } else {
    // torre final: rocha quente com fissuras de lava
    g.save();
    g.fillStyle = '#4d374f';
    g.beginPath();
    g.moveTo(x, y + 14);
    for (let tx = x; tx <= x + w; tx += 24) {
      g.lineTo(tx + 12, y - 2 + (tx % 2) * 4);
    }
    g.lineTo(x + w, y + 14);
    g.fill();
    g.strokeStyle = 'rgba(255,140,62,.85)';
    g.lineWidth = 2;
    for (let tx = x + 18; tx < x + w; tx += 47) {
      g.beginPath();
      g.moveTo(tx, y + 1);
      g.lineTo(tx + 5, y + 8);
      g.lineTo(tx + 1, y + 14);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,180,90,.35)';
    g.fillRect(x, y - 2, w, 2);
    g.restore();
  }
}

function drawGap(gap, t) {
  const top = GROUND - 2;
  const water = gap.water;
  g.save();
  if (water) {
    const grad = g.createLinearGradient(0, top + 10, 0, H);
    grad.addColorStop(0, '#47cdf5');
    grad.addColorStop(.35, '#1196df');
    grad.addColorStop(1, '#054e9f');
    g.fillStyle = grad;
    g.fillRect(gap.x, top, gap.w, H - top);
    if (art.water.complete && art.water.naturalWidth) {
      g.save();
      g.beginPath(); g.rect(gap.x, top + 16, gap.w, H - top); g.clip();
      for (let tx = gap.x; tx < gap.x + gap.w; tx += 138) {
        g.globalAlpha = .23;
        g.drawImage(art.water, tx, top + 19 + Math.sin(t * .0015 + tx) * 2, 138, 80);
      }
      g.restore();
      g.globalAlpha = 1;
    }
    // ondas
    g.strokeStyle = 'rgba(220,255,255,.75)';
    g.lineWidth = 3;
    for (let k = 0; k < 2; k++) {
      g.beginPath();
      for (let x = gap.x; x <= gap.x + gap.w; x += 6) {
        const y = top + 14 + k * 12 + Math.sin(x * .085 + t * .0032 + k) * 3;
        if (x === gap.x) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,.9)';
    g.lineWidth = 2;
    g.beginPath();
    for (let x = gap.x; x <= gap.x + gap.w; x += 5) {
      const y = top + 8 + Math.sin(x * .11 - t * .004) * 3;
      if (x === gap.x) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    // espuma nas bordas
    g.fillStyle = 'rgba(235,255,255,.7)';
    for (let x = gap.x; x < gap.x + gap.w; x += 18) {
      g.beginPath();
      g.ellipse(x + 8, top + 9 + Math.sin(t * .004 + x) * 2, 9, 3, 0, 0, TAU);
      g.fill();
    }
    // olhinhos curiosos em alguns buracos de água
    if ((gap.x | 0) % 3 === 0) {
      const cx = gap.x + gap.w * .6;
      const blink = Math.sin(t * .0017 + gap.phase) > .94;
      g.fillStyle = '#f7d34a';
      g.beginPath(); g.ellipse(cx - 7, top + 22, 5, blink ? 1.2 : 5, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(cx + 7, top + 22, 5, blink ? 1.2 : 5, 0, 0, TAU); g.fill();
      g.fillStyle = '#17321f';
      g.beginPath(); g.arc(cx - 7, top + 22, 2, 0, TAU); g.fill();
      g.beginPath(); g.arc(cx + 7, top + 22, 2, 0, TAU); g.fill();
    }
  } else {
    const grad = g.createLinearGradient(0, top, 0, H);
    grad.addColorStop(0, 'rgba(25,30,60,.25)');
    grad.addColorStop(.45, 'rgba(10,15,35,.8)');
    grad.addColorStop(1, '#050a19');
    g.fillStyle = grad;
    g.fillRect(gap.x, top, gap.w, H - top);
    g.strokeStyle = 'rgba(140,220,255,.2)';
    g.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.moveTo(gap.x + 8 + k * 16, top + 14);
      g.lineTo(gap.x + gap.w - 8 - k * 12, H);
      g.stroke();
    }
  }
  g.restore();
}

function drawDecor(d) {
  const th = THEMES[stage];
  g.save();
  g.translate(d.x, d.y);
  g.scale(d.s, d.s);
  if (d.type === 'bush') {
    g.fillStyle = stage === 3 ? '#d8edf6' : '#2d8a4a';
    g.beginPath();
    g.ellipse(0, -9, 25, 16, 0, 0, TAU);
    g.ellipse(-16, -3, 16, 11, 0, 0, TAU);
    g.ellipse(17, -3, 17, 12, 0, 0, TAU);
    g.fill();
    g.fillStyle = stage === 3 ? '#ffffff' : '#4fc466';
    g.beginPath();
    g.ellipse(-4, -16, 15, 8, 0, 0, TAU);
    g.fill();
  } else {
    g.strokeStyle = '#2f8a48';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(0, -20);
    g.stroke();
    const petal = stage === 3 ? '#dff6ff' : (stage === 2 ? '#e4a0ff' : '#ffd75a');
    g.fillStyle = petal;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU;
      g.beginPath();
      g.ellipse(Math.cos(a) * 6, -22 + Math.sin(a) * 6, 5, 5, 0, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#ff9c2e';
    g.beginPath(); g.arc(0, -22, 4, 0, TAU); g.fill();
  }
  g.restore();
}

function drawBridge(b) {
  const y = b.y;
  g.save();
  // cordas de sustentação
  g.strokeStyle = '#7c4a25';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(b.x + 4, y - 14);
  g.quadraticCurveTo(b.x + b.w / 2, y + 24, b.x + b.w - 4, y - 14);
  g.stroke();
  g.strokeStyle = 'rgba(255,224,160,.4)';
  g.lineWidth = 1.5;
  g.stroke();
  // estacas
  g.fillStyle = '#5e3518';
  for (const px of [b.x + 5, b.x + b.w - 13]) {
    g.fillRect(px, y - 18, 8, 30);
    g.fillStyle = '#8a5427';
    g.fillRect(px + 1, y - 18, 3, 28);
    g.fillStyle = '#5e3518';
  }
  // tabuleiro de madeira
  g.fillStyle = '#7c451d';
  g.fillRect(b.x, y, b.w, Math.max(10, b.h));
  const wood = art.rope;
  if (wood && wood.complete && wood.naturalWidth) {
    for (let tx = b.x; tx < b.x + b.w; tx += 36) {
      g.drawImage(wood, 56, 34, 68, 32, tx, y, 38, Math.max(10, b.h));
    }
  }
  g.fillStyle = 'rgba(255,208,130,.4)';
  g.fillRect(b.x, y, b.w, 2);
  g.fillStyle = 'rgba(40,18,5,.35)';
  g.fillRect(b.x, y + b.h - 2, b.w, 2);
  g.strokeStyle = 'rgba(48,22,8,.55)';
  g.lineWidth = 1.5;
  for (let tx = b.x + 18; tx < b.x + b.w; tx += 30) {
    g.beginPath(); g.moveTo(tx, y + 2); g.lineTo(tx, y + b.h - 2); g.stroke();
  }
  g.restore();
}

function drawPlatform(pl, t) {
  const th = THEMES[stage];
  const alpha = pl.temp === undefined ? 1 : Math.min(1, pl.temp);
  g.save();
  g.globalAlpha = alpha;
  // sombra suave
  g.fillStyle = 'rgba(10,30,55,.10)';
  g.beginPath();
  g.ellipse(pl.x + pl.w / 2, pl.y + pl.h + 26, pl.w * .36, 6, 0, 0, TAU);
  g.fill();

  g.save();
  rr(g, pl.x, pl.y, pl.w, pl.h, 10);
  g.clip();
  g.fillStyle = th.soilDark;
  g.fillRect(pl.x, pl.y, pl.w, pl.h);
  tile(g, art.dirt, pl.x, pl.y, pl.w, pl.h, 96, 84);
  if (th.tint) {
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = th.tint;
    g.fillRect(pl.x, pl.y, pl.w, pl.h);
    g.globalCompositeOperation = 'source-over';
  }
  if (th.lighten) {
    g.fillStyle = th.lighten;
    g.fillRect(pl.x, pl.y, pl.w, pl.h);
  }
  g.restore();

  g.strokeStyle = 'rgba(63,37,18,.55)';
  g.lineWidth = 2;
  rr(g, pl.x, pl.y, pl.w, pl.h, 10);
  g.stroke();

  drawCap(pl.x, pl.y, pl.w, th.cap);

  if (pl.breakable) {
    g.strokeStyle = 'rgba(35,20,10,.55)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(pl.x + pl.w * .28, pl.y + 4);
    g.lineTo(pl.x + pl.w * .34, pl.y + 13);
    g.lineTo(pl.x + pl.w * .26, pl.y + 20);
    g.moveTo(pl.x + pl.w * .7, pl.y + 4);
    g.lineTo(pl.x + pl.w * .64, pl.y + 12);
    g.stroke();
    if (pl.breakTimer > 0) {
      g.fillStyle = `rgba(255,120,80,${.12 + Math.sin(t * .03) * .08})`;
      g.fillRect(pl.x, pl.y, pl.w, pl.h);
    }
  }
  if (pl.moving) {
    g.fillStyle = 'rgba(255,220,110,.9)';
    g.beginPath();
    g.arc(pl.x + 12, pl.y + pl.h - 2, 3, 0, TAU);
    g.arc(pl.x + pl.w - 12, pl.y + pl.h - 2, 3, 0, TAU);
    g.fill();
  }
}

function drawStarShape(x, y, r, fill, stroke) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rad = i % 2 ? r * .45 : r;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = Math.max(1, r * .14); g.stroke(); }
}

function drawCheckpoint(cp, t) {
  const flagY = cp.y;
  g.save();
  if (cp.active) {
    const glow = g.createRadialGradient(cp.x + 20, flagY + 18, 4, cp.x + 20, flagY + 18, 70);
    glow.addColorStop(0, 'rgba(120,255,140,.55)');
    glow.addColorStop(1, 'rgba(120,255,140,0)');
    g.fillStyle = glow;
    g.fillRect(cp.x - 50, flagY - 50, 140, 140);
  }
  // mastro
  g.fillStyle = '#f5e9c8';
  g.fillRect(cp.x, flagY, 6, GROUND - flagY);
  g.fillStyle = '#bda57d';
  g.fillRect(cp.x + 4, flagY, 2, GROUND - flagY);
  g.fillStyle = '#ffd65a';
  g.beginPath();
  g.arc(cp.x + 3, flagY - 4, 6, 0, TAU);
  g.fill();
  // bandeira
  const wave = Math.sin(t * .004 + cp.x) * 4;
  g.fillStyle = cp.active ? '#41d868' : '#ef4a4f';
  g.beginPath();
  g.moveTo(cp.x + 6, flagY + 4);
  g.quadraticCurveTo(cp.x + 36, flagY + wave, cp.x + 60, flagY + 12);
  g.lineTo(cp.x + 58, flagY + 42);
  g.quadraticCurveTo(cp.x + 32, flagY + 34 + wave, cp.x + 6, flagY + 36);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.25)';
  g.beginPath();
  g.moveTo(cp.x + 6, flagY + 4);
  g.quadraticCurveTo(cp.x + 36, flagY + wave, cp.x + 60, flagY + 12);
  g.lineTo(cp.x + 58, flagY + 20);
  g.quadraticCurveTo(cp.x + 32, flagY + 14 + wave, cp.x + 6, flagY + 18);
  g.fill();
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(cp.x + 30, flagY + 21, 10, 0, TAU);
  g.fill();
  g.fillStyle = cp.active ? '#1c9b4a' : '#c9242a';
  g.beginPath();
  g.ellipse(cp.x + 30, flagY + 24, 5, 4, 0, 0, TAU);
  g.arc(cp.x + 25, flagY + 18, 2.2, 0, TAU);
  g.arc(cp.x + 30, flagY + 16, 2.2, 0, TAU);
  g.arc(cp.x + 35, flagY + 18, 2.2, 0, TAU);
  g.fill();
  g.restore();
}

function archPath(x, y, w, h) {
  const r = w / 2;
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x, y + r);
  g.arc(x + r, y + r, r, Math.PI, 0);
  g.lineTo(x + w, y + h);
  g.closePath();
}

function drawGoal(t) {
  const gate = level.goal;
  const open = stars >= 5 && !(level.boss && level.boss.alive);
  const x = gate.x, y = gate.y, w = gate.w, h = gate.h;
  g.save();

  if (open) {
    const beam = g.createLinearGradient(0, y - 220, 0, y + h);
    beam.addColorStop(0, 'rgba(125,246,255,0)');
    beam.addColorStop(.5, 'rgba(125,246,255,.3)');
    beam.addColorStop(1, 'rgba(125,246,255,.05)');
    g.fillStyle = beam;
    g.fillRect(x - 44, y - 220, w + 88, h + 220);
  }

  // base
  g.fillStyle = 'rgba(15,32,55,.3)';
  g.beginPath();
  g.ellipse(x + w / 2, GROUND + 2, w * .7, 9, 0, 0, TAU);
  g.fill();

  // estrutura em arco (portal de resgate)
  const frame = g.createLinearGradient(x, y, x + w, y + h);
  frame.addColorStop(0, open ? '#8cefff' : '#4f8fd8');
  frame.addColorStop(.5, open ? '#2cc4ea' : '#0c56a8');
  frame.addColorStop(1, open ? '#0786c4' : '#073a7c');
  archPath(x, y, w, h, 18);
  g.fillStyle = frame;
  g.fill();
  g.strokeStyle = '#ffe16b';
  g.lineWidth = 5;
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.7)';
  g.lineWidth = 2;
  archPath(x + 6, y + 6, w - 12, h - 12, 18);
  g.stroke();

  // portal interno
  const inner = g.createLinearGradient(0, y + 20, 0, y + h);
  inner.addColorStop(0, open ? '#fff9bd' : '#0b2855');
  inner.addColorStop(.35, open ? '#8ef4ff' : '#0a1f45');
  inner.addColorStop(1, open ? '#3fb9ef' : '#061632');
  archPath(x + 15, y + 20, w - 30, h - 34, 14);
  g.fillStyle = inner;
  g.fill();
  g.strokeStyle = open ? 'rgba(255,255,255,.8)' : 'rgba(120,190,255,.25)';
  g.lineWidth = 2;
  g.stroke();

  // emblema da pata no portão
  g.fillStyle = open ? 'rgba(255,255,255,.92)' : 'rgba(160,210,255,.45)';
  g.beginPath();
  g.ellipse(x + w / 2, y + h - 52, 15, 12, 0, 0, TAU);
  g.fill();
  for (const [dx, dy, r] of [[-15, -13, 6], [-5, -20, 6], [8, -19, 6], [17, -11, 6]]) {
    g.beginPath();
    g.arc(x + w / 2 + dx, y + h - 52 + dy, r, 0, TAU);
    g.fill();
  }

  // placa superior
  rr(g, x - 12, y - 25, w + 24, 25, 8);
  g.fillStyle = 'rgba(4,41,92,.92)';
  g.fill();
  g.strokeStyle = '#ffd75a';
  g.lineWidth = 2;
  g.stroke();
  label(g, open ? 'RESGATE ABERTO' : 'RESGATE', x + w / 2, y - 12, 12, open ? '#c9ffd1' : '#fff6c0', 'center', true);

  // 5 estrelas indicadoras
  for (let i = 0; i < 5; i++) {
    const sx = x + w / 2 + (i - 2) * 20;
    const sy = y + h + 16;
    drawStarShape(sx, sy, 9, i < stars ? '#ffd84c' : 'rgba(8,38,84,.7)', i < stars ? '#fff1a8' : 'rgba(170,220,255,.55)');
  }

  if (!open) {
    // corrente / cadeado
    g.strokeStyle = 'rgba(200,230,255,.55)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(x + 18, y + h * .55);
    g.lineTo(x + w - 18, y + h * .55);
    g.stroke();
    g.fillStyle = '#ffd75a';
    rr(g, x + w / 2 - 14, y + h * .48, 28, 24, 6);
    g.fill();
    g.fillStyle = '#7b4b00';
    g.beginPath();
    g.arc(x + w / 2, y + h * .55, 4, 0, TAU);
    g.fill();
    g.strokeStyle = '#7b4b00';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x + w / 2, y + h * .48, 8, Math.PI, 0);
    g.stroke();
  } else {
    // brilho do portal
    g.fillStyle = `rgba(255,255,255,${.12 + Math.sin(t * .006) * .08})`;
    rr(g, x + 14, y + 22, w - 28, h - 36, 12);
    g.fill();
  }
  g.restore();
}

function drawBlock(b, t) {
  const bump = Math.sin((1 - b.bump) * Math.PI) * (b.bump > 0 ? 8 : 0);
  const y = b.y - bump;
  g.save();
  g.fillStyle = 'rgba(5,22,44,.22)';
  g.fillRect(b.x + 4, b.y + b.h + 2, b.w, 5);
  if (b.type === 'question' && !b.used) {
    const glow = g.createRadialGradient(b.x + 24, y + 24, 4, b.x + 24, y + 24, 40);
    glow.addColorStop(0, 'rgba(255,232,120,.55)');
    glow.addColorStop(1, 'rgba(255,220,80,0)');
    g.fillStyle = glow;
    g.fillRect(b.x - 22, y - 22, b.w + 44, b.h + 44);
  }
  if (art.question.complete && art.question.naturalWidth) {
    g.globalAlpha = b.used ? .55 : 1;
    g.drawImage(b.type === 'question' ? art.question : art.brick, b.x, y, b.w, b.h);
    g.globalAlpha = 1;
    if (b.used) {
      g.fillStyle = 'rgba(35,26,18,.6)';
      rr(g, b.x + 3, y + 3, b.w - 6, b.h - 6, 5);
      g.fill();
      g.fillStyle = 'rgba(255,235,165,.75)';
      g.beginPath();
      g.arc(b.x + 24, y + 25, 3, 0, TAU);
      g.fill();
    }
  } else {
    g.fillStyle = b.type === 'question' ? (b.used ? '#a58d63' : '#ffbd25') : '#a85e2e';
    rr(g, b.x, y, b.w, b.h, 6);
    g.fill();
    g.strokeStyle = '#7d4a1d';
    g.lineWidth = 3;
    g.stroke();
    if (b.type === 'question' && !b.used) {
      label(g, '?', b.x + 24, y + 25, 28, '#fff', 'center', false, '#a56300');
    }
  }
  if (b.type === 'question' && !b.used) {
    g.strokeStyle = `rgba(255,255,255,${.35 + Math.sin(t * .007 + b.x) * .25})`;
    g.lineWidth = 2;
    rr(g, b.x + 4, y + 4, b.w - 8, b.h - 8, 4);
    g.stroke();
  }
  g.restore();
}

function drawHazard(h, t) {
  if (h.disabled) return;
  g.save();
  if (h.type === 'spikes') {
    g.fillStyle = 'rgba(4,18,38,.28)';
    g.beginPath();
    g.ellipse(h.x + h.w / 2, h.y + h.h + 2, h.w * .48, 4, 0, 0, TAU);
    g.fill();
    const spikes = 5;
    for (let i = 0; i < spikes; i++) {
      const x = h.x + 3 + i * (h.w - 6) / spikes;
      const grad = g.createLinearGradient(x, h.y + h.h, x, h.y);
      grad.addColorStop(0, '#8393a1');
      grad.addColorStop(.45, '#e7f0f6');
      grad.addColorStop(1, '#b6c6d2');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(x, h.y + h.h);
      g.lineTo(x + (h.w - 6) / spikes * .5, h.y);
      g.lineTo(x + (h.w - 6) / spikes, h.y + h.h);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(50,70,88,.6)';
      g.lineWidth = 1;
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.75)';
      g.beginPath();
      g.moveTo(x + (h.w - 6) / spikes * .5, h.y + 5);
      g.lineTo(x + (h.w - 6) / spikes * .46, h.y + h.h - 2);
      g.lineTo(x + (h.w - 6) / spikes * .5, h.y + h.h - 2);
      g.closePath();
      g.fill();
    }
    g.fillStyle = '#40515f';
    g.fillRect(h.x, h.y + h.h - 2, h.w, 5);
    g.fillStyle = '#6e8292';
    g.fillRect(h.x, h.y + h.h - 2, h.w, 2);
  } else {
    const glow = g.createRadialGradient(h.x + h.w / 2, h.y + 24, 4, h.x + h.w / 2, h.y + 24, 50);
    glow.addColorStop(0, 'rgba(255,150,40,.45)');
    glow.addColorStop(1, 'rgba(255,100,20,0)');
    g.fillStyle = glow;
    g.fillRect(h.x - 40, h.y - 40, h.w + 80, h.h + 80);
    for (let k = 0; k < 3; k++) {
      const off = Math.sin(t * .012 + h.phase + k) * 4;
      const grad = g.createLinearGradient(0, h.y + h.h, 0, h.y);
      grad.addColorStop(0, '#ff7b12');
      grad.addColorStop(.45, '#ffd23c');
      grad.addColorStop(1, '#fff4b0');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(h.x + 10 + k * 16, h.y + h.h);
      g.quadraticCurveTo(h.x + 1 + k * 18 + off, h.y + h.h * .5, h.x + 14 + k * 16, h.y + 2);
      g.quadraticCurveTo(h.x + 28 + k * 16 + off, h.y + h.h * .5, h.x + 19 + k * 16, h.y + h.h);
      g.fill();
    }
    g.fillStyle = 'rgba(255,247,190,.85)';
    g.beginPath();
    g.ellipse(h.x + h.w / 2, h.y + h.h - 8, 9, 5, 0, 0, TAU);
    g.fill();
  }
  g.restore();
}

function drawItem(item, t) {
  const bob = Math.sin(t * .0035 + item.phase) * 4;
  const y = item.y + bob;
  g.save();
  if (item.type === 'coin') {
    const glow = g.createRadialGradient(item.x, y, 2, item.x, y, 28);
    glow.addColorStop(0, 'rgba(255,222,90,.42)');
    glow.addColorStop(1, 'rgba(255,200,40,0)');
    g.fillStyle = glow;
    g.fillRect(item.x - 30, y - 30, 60, 60);
    if (art.coin.complete && art.coin.naturalWidth) {
      const spin = .55 + .45 * Math.abs(Math.cos(t * .003 + item.phase));
      g.translate(item.x, y);
      g.scale(spin, 1);
      g.drawImage(art.coin, -16, -19, 32, 38);
    } else {
      g.fillStyle = '#ffc928';
      g.beginPath(); g.arc(item.x, y, 15, 0, TAU); g.fill();
    }
  } else if (item.type === 'star') {
    const pulse = 1 + Math.sin(t * .005 + item.phase) * .09;
    const glow = g.createRadialGradient(item.x, y, 4, item.x, y, 58);
    glow.addColorStop(0, 'rgba(255,240,120,.7)');
    glow.addColorStop(.5, 'rgba(255,210,40,.25)');
    glow.addColorStop(1, 'rgba(255,190,20,0)');
    g.fillStyle = glow;
    g.fillRect(item.x - 60, y - 60, 120, 120);
    // raios
    g.strokeStyle = `rgba(255,250,190,${.35 + Math.sin(t * .006) * .25})`;
    g.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + t * .001;
      g.beginPath();
      g.moveTo(item.x + Math.cos(a) * 30, y + Math.sin(a) * 30);
      g.lineTo(item.x + Math.cos(a) * 44, y + Math.sin(a) * 44);
      g.stroke();
    }
    g.translate(item.x, y);
    g.scale(pulse, pulse);
    if (art.star.complete && art.star.naturalWidth) g.drawImage(art.star, -27, -27, 54, 54);
    else {
      drawStarShape(0, 0, 22, '#ffd84c', '#c98b00');
      g.fillStyle = '#2575e4';
      g.beginPath(); g.arc(0, 3, 8, 0, TAU); g.fill();
    }
  } else {
    if (art.bone.complete && art.bone.naturalWidth) {
      g.translate(item.x, y);
      g.rotate(Math.sin(t * .002 + item.phase) * .22);
      g.drawImage(art.bone, -22, -11, 44, 22);
    } else {
      g.fillStyle = '#fff4dc';
      rr(g, item.x - 18, y - 5, 36, 10, 5);
      g.fill();
      g.beginPath(); g.arc(item.x - 20, y - 7, 7, 0, TAU); g.arc(item.x - 20, y + 7, 7, 0, TAU);
      g.arc(item.x + 20, y - 7, 7, 0, TAU); g.arc(item.x + 20, y + 7, 7, 0, TAU); g.fill();
    }
  }
  g.restore();
}

function drawEnemy(e, t) {
  g.save();
  if (e.hurt > 0 && Math.floor(timeSec * 22) % 2 === 0) g.globalAlpha = .55;
  // sombra
  const shadowY = e.type === 'bird' ? GROUND + 2 : e.y + e.h + 2;
  g.fillStyle = 'rgba(5,25,45,.22)';
  g.beginPath();
  g.ellipse(e.x + e.w / 2, shadowY, e.w * .48, 5, 0, 0, TAU);
  g.fill();

  if (e.type === 'crab') drawCrab(e, t);
  else if (e.type === 'bird') drawBird(e, t);
  else if (e.type === 'chest') drawChest(e, t);
  else drawBoss(e, t);
  g.restore();
}

function drawCrab(e, t) {
  const cx = e.x + e.w / 2, base = GROUND;
  g.save();
  g.translate(cx, base);
  g.scale(e.dir < 0 ? -1 : 1, 1);
  // pernas
  g.strokeStyle = '#9a2c18';
  g.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const x = -12 + i * 12;
    g.beginPath();
    g.moveTo(x, -11);
    g.lineTo(x - 7 + i * 2, -2 + Math.sin(e.phase * 8 + i) * 2);
    g.stroke();
  }
  // corpo
  const grad = g.createLinearGradient(0, -e.h, 0, 0);
  grad.addColorStop(0, '#ff8b68');
  grad.addColorStop(.55, '#e8442a');
  grad.addColorStop(1, '#a52216');
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(0, -e.h * .48, e.w * .48, e.h * .5, 0, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.25)';
  g.beginPath();
  g.ellipse(-4, -e.h * .66, e.w * .24, e.h * .16, -.2, 0, TAU);
  g.fill();
  // garras
  const open = .55 + Math.abs(Math.sin(e.phase * 4)) * .45;
  for (const side of [-1, 1]) {
    g.save();
    g.translate(side * e.w * .48, -e.h * .52);
    g.rotate(side * open * .45);
    g.fillStyle = '#d63a22';
    g.beginPath();
    g.ellipse(side * 6, 0, 12, 7, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#8f2214';
    g.lineWidth = 2;
    g.stroke();
    g.restore();
  }
  // olhos
  for (const side of [-1, 1]) {
    g.strokeStyle = '#a52216';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(side * 8, -e.h * .82);
    g.lineTo(side * 10, -e.h * 1.03);
    g.stroke();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(side * 10, -e.h * 1.06, 5.5, 0, TAU);
    g.fill();
    g.fillStyle = '#20110d';
    g.beginPath();
    g.arc(side * 10 + e.dir, -e.h * 1.06, 2.6, 0, TAU);
    g.fill();
  }
  // boca
  g.strokeStyle = '#7f170e';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, -e.h * .34, 7, .15, Math.PI - .15);
  g.stroke();
  g.restore();
}

function drawBird(e, t) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  g.save();
  g.translate(cx, cy);
  g.scale(e.dir < 0 ? -1 : 1, 1);
  const flap = Math.sin(t * .015 + e.wobble) * .65;
  // cauda
  g.fillStyle = '#e8f5fb';
  g.beginPath();
  g.moveTo(-16, 0); g.lineTo(-30, -8); g.lineTo(-29, 8); g.closePath(); g.fill();
  // asa de trás
  g.fillStyle = '#c5dfea';
  g.save();
  g.rotate(-flap - .2);
  g.beginPath(); g.ellipse(-4, -12, 18, 7, -.4, 0, TAU); g.fill();
  g.restore();
  // corpo
  g.fillStyle = '#f7fcff';
  g.beginPath();
  g.ellipse(0, 2, 22, 13, -.12, 0, TAU);
  g.fill();
  // asa da frente
  g.fillStyle = '#ffffff';
  g.save();
  g.rotate(flap - .15);
  g.beginPath(); g.ellipse(0, -10, 19, 8, -.35, 0, TAU); g.fill();
  g.strokeStyle = '#c5dfea'; g.lineWidth = 1.4; g.stroke();
  g.restore();
  // cabeça
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(14, -12, 11, 0, TAU); g.fill();
  // bico
  g.fillStyle = '#ffb21d';
  g.beginPath();
  g.moveTo(24, -12); g.lineTo(38, -8); g.lineTo(24, -4); g.closePath(); g.fill();
  g.fillStyle = '#d97c00';
  g.beginPath(); g.moveTo(24, -8); g.lineTo(38, -8); g.lineTo(24, -4); g.closePath(); g.fill();
  // olho
  g.fillStyle = '#1c2733';
  g.beginPath(); g.arc(18, -15, 2.2, 0, TAU); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(18.8, -15.8, .8, 0, TAU); g.fill();
  // pernas
  g.strokeStyle = '#e89c16';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(-2, 14); g.lineTo(-4, 20); g.moveTo(6, 14); g.lineTo(8, 20); g.stroke();
  g.restore();
}

function drawChest(e, t) {
  const cx = e.x + e.w / 2;
  const top = e.y;
  g.save();
  g.translate(cx, top + e.h);
  const wob = Math.sin(e.phase * 5) * .05;
  g.rotate(wob);
  // pés
  g.fillStyle = '#3b2466';
  g.fillRect(-16, -3, 10, 5);
  g.fillRect(7, -3, 10, 5);
  // corpo
  const body = g.createLinearGradient(0, -e.h, 0, 0);
  body.addColorStop(0, '#a584ec');
  body.addColorStop(.6, '#7956c9');
  body.addColorStop(1, '#4e2f99');
  g.fillStyle = body;
  rr(g, -e.w / 2, -e.h + 5, e.w, e.h - 5, 6);
  g.fill();
  g.strokeStyle = '#3a216d';
  g.lineWidth = 2;
  g.stroke();
  // tampa
  g.fillStyle = '#8f6dde';
  g.beginPath();
  g.moveTo(-e.w / 2, -e.h + 14);
  g.quadraticCurveTo(0, -e.h - 10, e.w / 2, -e.h + 14);
  g.closePath();
  g.fill();
  g.strokeStyle = '#3a216d';
  g.stroke();
  // faixas douradas
  g.fillStyle = '#ffcf45';
  g.fillRect(-e.w / 2 + 4, -e.h + 16, e.w - 8, 4);
  g.fillRect(-3, -e.h + 10, 6, e.h - 12);
  // fechadura com pata
  g.fillStyle = '#ffda63';
  rr(g, -9, -e.h * .62, 18, 16, 4);
  g.fill();
  g.strokeStyle = '#9a6100'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#6a3f00';
  g.beginPath();
  g.ellipse(0, -e.h * .62 + 10, 4, 3, 0, 0, TAU);
  g.arc(-4, -e.h * .62 + 5, 1.6, 0, TAU);
  g.arc(0, -e.h * .62 + 3, 1.6, 0, TAU);
  g.arc(4, -e.h * .62 + 5, 1.6, 0, TAU);
  g.fill();
  // olhos
  g.fillStyle = '#20122f';
  g.beginPath(); g.arc(-9, -e.h * .35, 2.8, 0, TAU); g.arc(9, -e.h * .35, 2.8, 0, TAU); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(-8, -e.h * .36, .9, 0, TAU); g.arc(10, -e.h * .36, .9, 0, TAU); g.fill();
  // boca
  g.strokeStyle = '#2b1745';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, -e.h * .26, 7, .1, Math.PI - .1);
  g.stroke();
  g.restore();
}

function drawBoss(e, t) {
  const cx = e.x + e.w / 2, base = GROUND;
  const flash = e.hurt > 0;
  g.save();
  g.translate(cx, base);
  g.scale(e.dir < 0 ? -1 : 1, 1);
  // cauda
  g.fillStyle = '#3f8d38';
  g.beginPath();
  g.moveTo(-e.w * .35, -e.h * .35);
  g.quadraticCurveTo(-e.w * .8, -e.h * .15, -e.w * .9, -e.h * .7);
  g.quadraticCurveTo(-e.w * .6, -e.h * .55, -e.w * .3, -e.h * .25);
  g.fill();
  // pernas
  g.fillStyle = '#2f702d';
  g.fillRect(-e.w * .32, -e.h * .28, 16, e.h * .28);
  g.fillRect(e.w * .16, -e.h * .28, 16, e.h * .28);
  g.fillStyle = '#235923';
  g.beginPath(); g.ellipse(-e.w * .28, -2, 12, 5, 0, 0, TAU); g.ellipse(e.w * .22, -2, 12, 5, 0, 0, TAU); g.fill();
  // corpo
  const body = g.createLinearGradient(0, -e.h, 0, 0);
  body.addColorStop(0, flash ? '#c4ff9f' : '#79d362');
  body.addColorStop(.55, flash ? '#a6e86c' : '#4da83f');
  body.addColorStop(1, flash ? '#8ccc58' : '#2f7d2d');
  g.fillStyle = body;
  g.beginPath();
  g.ellipse(0, -e.h * .5, e.w * .44, e.h * .46, 0, 0, TAU);
  g.fill();
  // barriga
  g.fillStyle = 'rgba(255,236,150,.8)';
  g.beginPath();
  g.ellipse(0, -e.h * .34, e.w * .27, e.h * .22, 0, 0, TAU);
  g.fill();
  // espinhos
  g.fillStyle = '#2b6329';
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(i * 18 - 5, -e.h * .9);
    g.lineTo(i * 18, -e.h * 1.12);
    g.lineTo(i * 18 + 6, -e.h * .87);
    g.closePath();
    g.fill();
  }
  // focinho
  g.fillStyle = flash ? '#b9f58c' : '#65b952';
  g.beginPath();
  g.ellipse(e.w * .34, -e.h * .46, e.w * .3, e.h * .2, .08, 0, TAU);
  g.fill();
  g.fillStyle = '#2f7d2d';
  g.beginPath();
  g.ellipse(e.w * .34, -e.h * .62, e.w * .2, e.h * .09, .1, 0, TAU);
  g.fill();
  // dentes
  g.fillStyle = '#fff9df';
  for (let i = 0; i < 5; i++) {
    const x = e.w * .15 + i * 12;
    g.beginPath();
    g.moveTo(x, -e.h * .39);
    g.lineTo(x + 5, -e.h * .28);
    g.lineTo(x + 10, -e.h * .39);
    g.closePath();
    g.fill();
  }
  // olho
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(e.w * .12, -e.h * .72, 10, 0, TAU); g.fill();
  g.fillStyle = '#1b2b14';
  g.beginPath(); g.arc(e.w * .14, -e.h * .72, 5, 0, TAU); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(e.w * .12, -e.h * .75, 1.8, 0, TAU); g.fill();
  // sobrancelha brava no ataque
  if (e.attack > 0) {
    g.strokeStyle = '#1d471b';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(e.w * .02, -e.h * .86);
    g.lineTo(e.w * .25, -e.h * .78);
    g.stroke();
  }
  g.restore();
}

/* =========================================================
   DESENHO — jogador, efeitos e HUD de chefe
   ========================================================= */
function drawPlayer(t) {
  const p = player;
  const h = HEROES[hero];
  const frames = sprites[hero];
  const run = p.grounded && Math.abs(p.vx) > 28;
  let frame = 0;
  if (!p.grounded) frame = p.vy < 0 ? 3 : 4;
  else if (run) frame = 1 + (Math.floor(p.anim) % 7);
  const img = frames[frame] || frames[0];
  if (p.invuln > 0 && Math.floor(timeSec * 18) % 2 === 0 && !p.dash) return;

  const footX = p.x + p.w / 2;
  const footY = p.y + p.h;

  g.save();
  g.fillStyle = 'rgba(3,25,50,.28)';
  g.beginPath();
  g.ellipse(footX, footY + 2, 26, 6, 0, 0, TAU);
  g.fill();
  g.restore();

  if (powerType === 'speed' || p.dash > 0) {
    g.save();
    g.globalAlpha = p.dash > 0 ? .4 : .22;
    g.fillStyle = p.dash > 0 ? '#8deaff' : '#ffec63';
    for (let i = 1; i <= 4; i++) {
      g.beginPath();
      g.ellipse(footX - p.face * (i * 18 + 14), footY - 54 - i * 2, 22 - i * 3, 17 - i * 2, 0, 0, TAU);
      g.fill();
    }
    g.restore();
  }
  if (powerType === 'magnet') {
    g.save();
    g.strokeStyle = 'rgba(255,120,120,.55)';
    g.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = timeSec * 2.2 + i * TAU / 3;
      g.beginPath();
      g.arc(footX, footY - 50, 45, a, a + .7);
      g.stroke();
    }
    g.restore();
  }

  g.save();
  g.translate(footX, footY);
  if (p.face < 0) g.scale(-1, 1);
  const sq = p.grounded ? p.squash : Math.max(0, p.squash);
  g.scale(1 + sq * .12, 1 - sq * .18);
  if (img && img.complete && img.naturalWidth) {
    g.drawImage(img, -48.5, -112, 97, 132);
  } else {
    g.fillStyle = h.color;
    rr(g, -28, -92, 56, 92, 20);
    g.fill();
    label(g, '🐕', 0, -48, 48, '#fff');
  }
  g.restore();

  if (shield > 0) {
    g.save();
    const pulse = 1 + Math.sin(timeSec * 4) * .04;
    g.translate(footX, footY - 52);
    g.scale(pulse, pulse);
    const aura = g.createRadialGradient(0, 0, 16, 0, 0, 52);
    aura.addColorStop(0, 'rgba(130,235,255,0)');
    aura.addColorStop(.7, 'rgba(130,235,255,.12)');
    aura.addColorStop(1, 'rgba(130,235,255,.32)');
    g.fillStyle = aura;
    g.beginPath(); g.arc(0, 0, 52, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(180,245,255,.85)';
    g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 43, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.45)';
    g.lineWidth = 1.5;
    g.beginPath(); g.arc(0, 0, 46, -.8, .5); g.stroke();
    g.restore();
  }

  if (p.glide > 0) {
    g.save();
    g.globalAlpha = .7;
    g.fillStyle = '#ffd6ea';
    for (let i = 0; i < 2; i++) {
      const a = timeSec * 3 + i * Math.PI;
      g.beginPath();
      g.ellipse(footX + Math.cos(a) * 34, footY - 55 + Math.sin(a) * 14, 8, 4, a, 0, TAU);
      g.fill();
    }
    g.restore();
  }
  if (p.waterWalk > 0) {
    g.save();
    g.strokeStyle = 'rgba(180,250,255,.85)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.ellipse(footX, footY + 2, 30 + Math.sin(timeSec * 8) * 4, 6, 0, 0, TAU);
    g.stroke();
    g.restore();
  }
}

function drawParticles() {
  for (const pt of particles) {
    const a = clamp(pt.life / (pt.max || 1), 0, 1);
    g.save();
    g.globalAlpha = a;
    if (pt.type === 'ring') {
      g.strokeStyle = pt.color;
      g.lineWidth = pt.width || 4;
      g.beginPath();
      g.arc(pt.x, pt.y, pt.rad, 0, TAU);
      g.stroke();
      g.globalAlpha = a * .45;
      g.lineWidth = (pt.width || 4) * .4;
      g.beginPath();
      g.arc(pt.x, pt.y, pt.rad * .8, 0, TAU);
      g.stroke();
    } else if (pt.type === 'dust') {
      g.fillStyle = pt.color;
      g.beginPath();
      g.arc(pt.x, pt.y, pt.size * (.6 + a * .7), 0, TAU);
      g.fill();
    } else if (pt.type === 'coinpop') {
      if (art.coin.complete && art.coin.naturalWidth) g.drawImage(art.coin, pt.x - 14, pt.y - 16, 28, 32);
    } else {
      g.fillStyle = pt.color;
      g.beginPath();
      g.arc(pt.x, pt.y, pt.size * (.5 + a * .6), 0, TAU);
      g.fill();
    }
    g.restore();
  }
}

function drawFloaters() {
  for (const f of floaters) {
    const a = clamp(f.life / f.max, 0, 1);
    g.save();
    g.globalAlpha = a;
    label(g, f.text, f.x, f.y, 17, f.color, 'center', true, 'rgba(28,34,20,.65)');
    g.restore();
  }
}

function drawForeground(t) {
  g.save();
  const vig = g.createRadialGradient(W / 2, H * .46, H * .34, W / 2, H * .46, H * .9);
  vig.addColorStop(0, 'rgba(2,20,45,0)');
  vig.addColorStop(1, 'rgba(2,18,42,.28)');
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);
  const top = g.createLinearGradient(0, 0, 0, 70);
  top.addColorStop(0, 'rgba(255,255,255,.16)');
  top.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 70);
  g.restore();
}

function drawBossBar() {
  const boss = level.boss;
  const bw = 380, bh = 15, bx = W / 2 - bw / 2, by = 86;
  g.save();
  g.fillStyle = 'rgba(3,23,54,.82)';
  rr(g, bx - 14, by - 24, bw + 28, 48, 13);
  g.fill();
  g.strokeStyle = 'rgba(168,230,255,.7)';
  g.lineWidth = 2;
  g.stroke();
  label(g, '🐊 JACARÉ GUARDIÃO', W / 2, by - 11, 13, '#ffe17a', 'center', true, 'rgba(0,0,0,.5)');
  g.fillStyle = '#2c1020';
  rr(g, bx, by, bw, bh, 7);
  g.fill();
  const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
  const bar = g.createLinearGradient(bx, 0, bx + bw, 0);
  bar.addColorStop(0, '#ff5b4d');
  bar.addColorStop(.5, '#ffb62d');
  bar.addColorStop(1, '#75e65a');
  g.fillStyle = bar;
  rr(g, bx, by, bw * ratio, bh, 7);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.fillRect(bx + 4, by + 2, Math.max(0, bw * ratio - 8), 2);
  g.restore();
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */
let DPR = 1;
function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (dpr === DPR && canvas.width === Math.round(W * dpr)) return;
  DPR = dpr;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.imageSmoothingEnabled = true;
}

function initUi() {
  $('start').onclick = () => { ensureAudio(); launch(clamp(saved.unlocked - 1, 0, 5)); };
  $('levelsBtn').onclick = () => { sfx('click'); openLevels(); };
  $('backLevels').onclick = () => { sfx('click'); showPage('menu'); };
  $('pause').onclick = () => togglePause();

  const musicBtn = $('music');
  const sfxBtn = $('sfx');
  musicBtn.onclick = () => {
    ensureAudio();
    musicOn = !musicOn;
    musicBtn.textContent = '♫ Música: ' + (musicOn ? 'ON' : 'OFF');
    musicBtn.setAttribute('aria-pressed', String(musicOn));
    musicStep = 0;
    musicTick = 0;
    if (musicOn) tone(660, .12, 'triangle', .04);
    sfx('click');
  };
  sfxBtn.onclick = () => {
    ensureAudio();
    sfxOn = !sfxOn;
    sfxBtn.textContent = '🔊 Efeitos: ' + (sfxOn ? 'ON' : 'OFF');
    sfxBtn.setAttribute('aria-pressed', String(sfxOn));
    if (sfxOn) sfx('coin');
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running && !overlayOpen) togglePause();
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !$('levels').hidden) {
      e.preventDefault();
      showPage('menu');
    }
  });
}

buildHeroCards();
buildStageGrid($('stagePreview'), false);
updateHeroUi();
showPage('menu');
initUi();
fitCanvas();
window.addEventListener('resize', fitCanvas);

let repaintTries = 0;
const repaintTimer = setInterval(() => {
  repaintThumbs();
  if (++repaintTries >= 4) clearInterval(repaintTimer);
}, 700);
sprites.forEach(arr => {
  if (arr[0]) arr[0].addEventListener('load', repaintThumbs);
  if (arr[1]) arr[1].addEventListener('load', repaintThumbs);
});

})();




