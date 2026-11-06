/* Clubhouse 8-Ball — everything drawn on the canvas: rooms, table, balls, cue and HUD. */
'use strict';
// ───────────────────────────── canvas & layout ─────────────────────────────
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const stat = document.createElement('canvas'), sctx = stat.getContext('2d');
let scale = 1, offX = 0, offY = 0, dpr = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  cv.width = stat.width = Math.round(w * dpr); cv.height = stat.height = Math.round(h * dpr);
  PORT = h > w * 1.05;
  LAY = PORT ? LAY_P : LAY_L; DW = LAY.dw; DH = LAY.dh;
  scale = Math.min(cv.width / DW, cv.height / DH);
  offX = (cv.width - DW * scale) / 2; offY = (cv.height - DH * scale) / 2;
  drawStatic();
}
// Layouts: landscape puts controls at the sides; portrait stands the table upright
// with the scores on top and the power / fine-aim sliders underneath.
const LAY_L = {
  dw: 2620, dh: 1460, menu: { x: 90, y: 90, r: 62 }, spin: { x: 2530, y: 90, r: 64 },
  panels: [{ x: 180, y: 22, w: 900, h: 136, left: true }, { x: 1540, y: 22, w: 900, h: 136, left: false }],
  center: { x: 1310, y: 90, wide: true }, power: { x: 35, y: 180, w: 110, h: 1260 }, fine: { x: 2475, y: 180, w: 110, h: 1100 },
  banner: { x: TX + W / 2, y: TY + 84, max: W - 100 }, lightC: { x: TX + W / 2, y: TY + H / 2 }, replayBtn: { x: TX + W - 300, y: TY + H - 120, w: 260, h: 80 }, chat: { x: 2530, y: 1375, r: 58 },
  props: [['stool', -170, 1180, 0.3], ['table', -200, 470, 0], ['stool', 2800, 330, 1.2], ['table', 2810, 1090, 1], ['stool', 300, 1720, 2], ['stool', 2300, -260, 0.8]],
};
const LAY_P = {
  dw: 1300, dh: 2930, menu: { x: 86, y: 250, r: 54 }, spin: { x: 1214, y: 250, r: 58 },
  panels: [{ x: 20, y: 24, w: 620, h: 150, left: true }, { x: 660, y: 24, w: 620, h: 150, left: false }],
  center: { x: 650, y: 250, wide: false }, power: { x: 20, y: 2610, w: 1260, h: 120, horiz: true }, fine: { x: 20, y: 2765, w: 1260, h: 130, horiz: true },
  banner: { x: 650, y: 410, max: 1160 }, lightC: { x: PCX, y: PCY }, replayBtn: { x: 990, y: 2470, w: 260, h: 80 }, chat: { x: 1080, y: 250, r: 50 },
  props: [['stool', -150, 700, 0.3], ['table', -170, 1900, 0], ['stool', 1450, 2250, 1.2], ['table', 1470, 900, 1], ['stool', 300, 3120, 2], ['stool', 1050, -150, 0.8]],
};
let LAY = LAY_L;
// left-handed play: power on the right (landscape) or nearest the thumb (portrait)
function applyHand() {
  const L = LAY_L, P = LAY_P;
  const lx = 35, rx = 2475; L.power.x = lefty ? rx : lx; L.fine.x = lefty ? lx : rx; L.chat.x = L.fine.x + 55;
  L.power.y = 180; L.power.h = 1260;
  P.power.y = lefty ? 2765 : 2610; P.power.h = lefty ? 130 : 120; P.fine.y = lefty ? 2610 : 2765; P.fine.h = lefty ? 120 : 130;
}
function tableXform(c) { if (PORT) { c.translate(PCX, PCY); c.rotate(-Math.PI / 2); c.translate(-W / 2, -H / 2); } else c.translate(TX, TY); }
const toTable = d => (PORT ? { x: W / 2 - (d.y - PCY), y: H / 2 + (d.x - PCX) } : { x: d.x - TX, y: d.y - TY });
// map a touch to design units using the canvas's real on-screen size (robust while the phone rotates)
const toDesign = e => {
  const r = cv.getBoundingClientRect(), kx = cv.width / (r.width || 1), ky = cv.height / (r.height || 1);
  return { x: ((e.clientX - r.left) * kx - offX) / scale, y: ((e.clientY - r.top) * ky - offY) / scale };
};

function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

// ── lighting: a three-shade lamp hangs over the table ──
const LAMPS = [{ x: W * 0.2, y: H / 2 }, { x: W / 2, y: H / 2 }, { x: W * 0.8, y: H / 2 }], LAMP_H = 1100;
const CLOTHS = [
  { name: 'Green', felt: ['#33c06d', '#17904a', '#0a552c'], cush: ['#1a9a4d', '#0a5129'], price: 0 },
  { name: 'Blue', felt: ['#4a9cea', '#1f68b4', '#0d3565'], cush: ['#2774c2', '#0e3563'], price: 0 },
  { name: 'Burgundy', felt: ['#cf4b55', '#972631', '#4f0d15'], cush: ['#a62f3a', '#4d0e16'], price: 100 },
  { name: 'Slate', felt: ['#6d7682', '#454c57', '#22262c'], cush: ['#525a65', '#202429'], price: 100 },
  { name: 'Royal Purple', felt: ['#8f62dc', '#5b2fa0', '#2a1252'], cush: ['#6a39b4', '#28104c'], price: 200 },
  { name: 'Teal', felt: ['#36c7bd', '#14857f', '#07403c'], cush: ['#1a9e96', '#073b37'], price: 200 },
];
// aim = guide length, spin = how much english the cue can put on, power = top speed
const CUES = [
  { name: 'Maple House', aim: 1, spin: 0.85, power: 1, price: 0, tip: '#3c7fd6', fer: '#f5efe0', shaft: ['#f2dcab', '#d4a462'], joint: '#d9d9d9', fore: '#3d1a0b', inlay: '#d4a63c', wrap: '#151515', butt: '#2a2a2a' },
  { name: 'Ebony Classic', aim: 1.15, spin: 0.95, power: 1, price: 250, tip: '#2f6fd0', fer: '#f4f1ea', shaft: ['#efd9ab', '#d8b278'], joint: '#c0c4ca', fore: '#0e0e0f', inlay: '#e6e8ee', wrap: '#5b0f14', butt: '#0e0e0f' },
  { name: 'Brass Breaker', aim: 0.95, spin: 0.9, power: 1.12, price: 400, tip: '#3a6fc2', fer: '#f0e6cc', shaft: ['#ecd3a0', '#c99a55'], joint: '#d8b45a', fore: '#1c1208', inlay: '#e2bd5c', wrap: '#3b2a10', butt: '#d8b45a' },
  { name: 'Carbon Spin', aim: 1.05, spin: 1.2, power: 1.05, price: 700, tip: '#2a5fb8', fer: '#e8e8e8', shaft: ['#34373c', '#16171a'], joint: '#c62828', fore: '#1d1f23', inlay: '#c62828', wrap: '#0c0c0c', butt: '#c62828' },
  { name: 'Rosewood Pro', aim: 1.3, spin: 1.05, power: 1.05, price: 1100, tip: '#2f6fd0', fer: '#f6f2e8', shaft: ['#f3dfb2', '#d9ad6c'], joint: '#e8e8ee', fore: '#5a1610', inlay: '#f1eadc', wrap: '#1d0b08', butt: '#5a1610' },
  { name: "Champion's Cue", aim: 1.4, spin: 1.25, power: 1.12, price: -1, tip: '#2a62c8', fer: '#fffaf0', shaft: ['#f6e3b8', '#dcb06e'], joint: '#f2cf6a', fore: '#0b1530', inlay: '#f2cf6a', wrap: '#0b1530', butt: '#f2cf6a' },
];
// Rooms: the pool halls of the career, plus one bought in the shop
const ROOMS = [
  { name: 'The Corner Pocket', kind: 'bar', price: 0, carpet: { base: '#2a0f15', line: '205,160,80', medal: '#10292b', dot: '30,90,90' },
    wood: ['#4d220b', '#9a5428', '#b4672f', '#7c3f19', '#55260c', '#2a1205'], metal: 'brass', light: '255,170,80', vig: 0.88 },
  { name: 'Kingsley Club', kind: 'club', price: 500, carpet: { base: '#0f2418', line: '196,170,110', medal: '#3a1410', dot: '150,40,30' },
    wood: ['#2a0d06', '#6b2412', '#8a3219', '#5a1d0c', '#3a1006', '#1a0603'], metal: 'brass', light: '255,200,140', vig: 0.9 },
  { name: 'Grand Arena', kind: 'arena', price: 900, carpet: { base: '#0c1426', line: '200,170,90', medal: '#1d2c55', dot: '200,170,90' },
    wood: ['#0b0b0d', '#34343b', '#46464f', '#24242b', '#141418', '#050506'], metal: 'chrome', light: '215,228,255', vig: 0.93 },
  { name: 'Neon Lounge', kind: 'neon', price: 1200, carpet: { base: '#120f1c', line: '255,60,200', medal: '#0d3b44', dot: '60,220,255' },
    wood: ['#151018', '#2c2236', '#3a2d48', '#221a2c', '#140f1a', '#08060a'], metal: 'chrome', light: '200,120,255', vig: 0.9 },
];
let clothIdx = 0, cueIdx = 0, roomIdx = 0, roomOverride = -1, bigNums = false, lefty = false;
const curRoom = () => ROOMS[roomOverride >= 0 ? roomOverride : roomIdx];

const shadowSpr = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.4, 'rgba(0,0,0,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c;
})();

function carpetPattern(c, px, rm) {
  const K = rm.carpet;
  const t = document.createElement('canvas'); t.width = t.height = Math.max(8, Math.round(px));
  const x = t.getContext('2d'), s = t.width / 200; x.scale(s, s);
  x.fillStyle = K.base; x.fillRect(0, 0, 200, 200);
  x.strokeStyle = `rgba(${K.line},0.13)`; x.lineWidth = 3;
  x.beginPath(); x.moveTo(100, 0); x.lineTo(200, 100); x.lineTo(100, 200); x.lineTo(0, 100); x.closePath(); x.stroke();
  x.beginPath(); x.moveTo(100, 22); x.lineTo(178, 100); x.lineTo(100, 178); x.lineTo(22, 100); x.closePath(); x.strokeStyle = `rgba(${K.line},0.10)`; x.stroke();
  for (const [cx, cy] of [[0, 0], [200, 0], [0, 200], [200, 200]]) {
    x.fillStyle = K.medal; x.beginPath(); x.arc(cx, cy, 30, 0, TAU); x.fill();
    x.strokeStyle = `rgba(${K.line},0.18)`; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, 40, 0, TAU); x.stroke();
    x.fillStyle = `rgba(${K.line},0.4)`; x.beginPath(); x.arc(cx, cy, 8, 0, TAU); x.fill();
  }
  x.save(); x.translate(100, 100); x.rotate(Math.PI / 4); x.fillStyle = `rgba(${K.line},0.38)`; x.fillRect(-14, -14, 28, 28);
  x.fillStyle = K.medal; x.fillRect(-7, -7, 14, 14); x.restore();
  for (const [cx, cy] of [[100, 0], [0, 100], [200, 100], [100, 200]]) { x.fillStyle = `rgba(${K.dot},0.7)`; x.beginPath(); x.arc(cx, cy, 6, 0, TAU); x.fill(); }
  const r = rng(11);
  for (let i = 0; i < 1400; i++) { x.fillStyle = r() < 0.55 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.035)'; x.fillRect(r() * 200, r() * 200, 1.6, 1.6); }
  return c.createPattern(t, 'repeat');
}

function propShadow(c, r, ox = 30, oy = 40, a = 0.55) { c.globalAlpha = a; c.drawImage(shadowSpr, -r + ox, -r + oy, 2 * r, 2 * r); c.globalAlpha = 1; }
function stool(c, x, y, rot) {
  c.save(); c.translate(x, y); c.rotate(rot);
  propShadow(c, 210);
  c.strokeStyle = '#8f959e'; c.lineWidth = 12; c.beginPath(); c.arc(0, 0, 165, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 162, -2.4, -1.0); c.stroke();
  for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.4; c.beginPath(); c.moveTo(Math.cos(a) * 110, Math.sin(a) * 110); c.lineTo(Math.cos(a) * 165, Math.sin(a) * 165); c.lineWidth = 14; c.strokeStyle = '#5c616a'; c.stroke(); }
  const g = c.createRadialGradient(-35, -40, 10, 0, 0, 120);
  g.addColorStop(0, '#b0414a'); g.addColorStop(0.65, '#6b161d'); g.addColorStop(1, '#360a0e');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 118, 0, TAU); c.fill();
  c.lineWidth = 9; c.strokeStyle = '#c9ccd2'; c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 78, 0, TAU); c.stroke();
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.beginPath(); c.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); c.lineTo(Math.cos(a) * 78, Math.sin(a) * 78); c.stroke(); }
  c.fillStyle = '#3e0b10'; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fill();
  c.restore();
}
function woodDisc(c, r) {
  const g = c.createRadialGradient(-r * 0.3, -r * 0.35, 10, 0, 0, r);
  g.addColorStop(0, '#8a4c25'); g.addColorStop(0.8, '#5a2c12'); g.addColorStop(1, '#3a1a08');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(30,10,0,0.25)'; c.lineWidth = 2;
  for (let k = 20; k < r; k += 17) { c.beginPath(); c.ellipse(8, -4, k, k * 0.92, 0.3, 0, TAU); c.stroke(); }
  c.strokeStyle = 'rgba(255,210,160,0.28)'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, r - 4, -2.6, -0.9); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
}
function glass(c, x, y, r, liquid, foam) {
  c.save(); c.translate(x, y);
  propShadow(c, r * 1.5, 14, 18, 0.5);
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  const g = c.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r * 0.88); g.addColorStop(0, liquid[0]); g.addColorStop(1, liquid[1]);
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 0.86, 0, TAU); c.fill();
  if (foam) { c.strokeStyle = 'rgba(250,245,230,0.9)'; c.lineWidth = r * 0.22; c.beginPath(); c.arc(0, 0, r * 0.74, 0, TAU); c.stroke(); }
  c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, r * 0.82, -2.5, -1.7); c.stroke();
  c.restore();
}
function chalk(c, x, y, rot, s = 34) {
  c.save(); c.translate(x, y); c.rotate(rot);
  propShadow(c, s * 1.1, 6, 9, 0.6);
  const g = c.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2); g.addColorStop(0, '#5b9cf0'); g.addColorStop(1, '#1d4f9e');
  c.fillStyle = g; rr(c, -s / 2, -s / 2, s, s, 4); c.fill();
  c.fillStyle = '#163d7a'; rr(c, -s * 0.28, -s * 0.28, s * 0.56, s * 0.56, 6); c.fill();
  c.fillStyle = 'rgba(160,200,255,0.5)'; c.beginPath(); c.arc(0, 0, s * 0.16, 0, TAU); c.fill();
  c.restore();
}
function sideTable(c, x, y, kind) {
  c.save(); c.translate(x, y);
  propShadow(c, 240, 35, 45, 0.6);
  woodDisc(c, 175);
  c.fillStyle = 'rgba(240,235,220,0.9)'; c.beginPath(); c.arc(-48, -30, 58, 0, TAU); c.fill();
  c.strokeStyle = '#8b2b2b'; c.lineWidth = 4; c.beginPath(); c.arc(-48, -30, 50, 0, TAU); c.stroke();
  if (kind === 0) {
    glass(c, -48, -30, 44, ['#f6c45a', '#b9761a'], true);
    glass(c, 62, 52, 36, ['#c87a2c', '#6e3410'], false);
    chalk(c, 70, -70, 0.3);
  } else {
    glass(c, -48, -30, 42, ['#3a1d0c', '#140700'], true);
    c.save(); c.translate(60, 40); c.rotate(-0.25);
    c.strokeStyle = '#6b3a18'; c.lineWidth = 16; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(0, -95); c.lineTo(82, 48); c.lineTo(-82, 48); c.closePath(); c.stroke();
    c.strokeStyle = 'rgba(255,210,150,0.35)'; c.lineWidth = 3; c.stroke(); c.restore();
    chalk(c, -70, 80, -0.5);
  }
  c.restore();
}

function armchair(c, x, y, rot) {
  c.save(); c.translate(x, y); c.rotate(rot);
  propShadow(c, 240, 30, 40, 0.6);
  const g = c.createLinearGradient(0, -140, 0, 140); g.addColorStop(0, '#5a1b10'); g.addColorStop(1, '#2c0b06');
  rr(c, -150, -140, 300, 280, 60); c.fillStyle = g; c.fill();
  const s2 = c.createRadialGradient(-20, 10, 10, 0, 30, 140); s2.addColorStop(0, '#9a3b26'); s2.addColorStop(1, '#5c1d10');
  rr(c, -98, -72, 196, 192, 40); c.fillStyle = s2; c.fill();
  c.strokeStyle = 'rgba(255,200,150,0.22)'; c.lineWidth = 3; rr(c, -150, -140, 300, 280, 60); c.stroke();
  c.fillStyle = '#2a0904';
  for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(-80 + i * 40, -108, 5, 0, TAU); c.fill(); }
  for (const sx of [-125, 125]) for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(sx, -60 + i * 60, 4, 0, TAU); c.fill(); }
  c.restore();
}
function neonStool(c, x, y, rot, col) {
  c.save(); c.translate(x, y); c.rotate(rot); propShadow(c, 200);
  c.strokeStyle = '#9aa0aa'; c.lineWidth = 10; c.beginPath(); c.arc(0, 0, 150, 0, TAU); c.stroke();
  c.shadowColor = col; c.shadowBlur = 40 * scale; c.strokeStyle = col; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 118, 0, TAU); c.stroke(); c.shadowBlur = 0;
  const g = c.createRadialGradient(-30, -35, 8, 0, 0, 115); g.addColorStop(0, '#3a3346'); g.addColorStop(1, '#100c16');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 112, 0, TAU); c.fill();
  c.restore();
}
// tiers of seated spectators around the table, drawn in table coordinates
function crowd(c) {
  const r = rng(21), shirts = ['#2a3b6b', '#6b2a2a', '#2f5a3a', '#55555f', '#7a6a3a', '#3a2a5a', '#1f1f24'], hair = ['#1b120c', '#3b2414', '#6b4a2a', '#c9a46a', '#8a8a8a', '#0c0c0c'];
  const row = (x0, y0, x1, y1, nx, ny) => {
    const len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    for (let s = 0; s < len; s += 120) {
      const x = x0 + ux * s, y = y0 + uy * s;
      c.save(); c.translate(x, y); c.rotate(Math.atan2(ny, nx) - Math.PI / 2);
      rr(c, -50, -45, 100, 90, 16); c.fillStyle = '#2a0e12'; c.fill();
      if (r() < 0.82) {
        c.fillStyle = shirts[(r() * shirts.length) | 0]; c.beginPath(); c.ellipse(0, -8, 44, 26, 0, 0, TAU); c.fill();
        c.fillStyle = hair[(r() * hair.length) | 0]; c.beginPath(); c.arc((r() - 0.5) * 6, -4, 20, 0, TAU); c.fill();
      }
      c.restore();
    }
  };
  for (let k = 0; k < 4; k++) {
    const d = OUT + 260 + k * 125;
    row(-d + 60, -d, W + d - 60, -d, 0, 1); row(-d + 60, H + d, W + d - 60, H + d, 0, -1);
    row(-d, -d + 100, -d, H + d - 100, 1, 0); row(W + d, -d + 100, W + d, H + d - 100, -1, 0);
  }
}
function drawTable(c) {
  const rm = curRoom();
  const cl = CLOTHS[clothIdx], r = rng(7);
  // drop shadow under the whole table
  c.save(); c.globalAlpha = 0.75; c.drawImage(shadowSpr, -OUT - 160, -OUT - 110, W + 2 * OUT + 320, H + 2 * OUT + 300); c.restore();
  if (rm.kind === 'neon') for (const [col, d] of [['#ff3cc8', 26], ['#3ce0ff', 46]]) {
    c.save(); c.shadowColor = col; c.shadowBlur = 50 * scale; c.strokeStyle = col; c.lineWidth = 7;
    rr(c, -OUT - d, -OUT - d, W + 2 * (OUT + d), H + 2 * (OUT + d), 70 + d); c.stroke(); c.restore();
  }
  // ── rails: four mitred pieces of lacquered wood ──
  const rails = [
    { poly: [[-OUT, -OUT], [W + OUT, -OUT], [W + CUSH, -CUSH], [-CUSH, -CUSH]], h: true, a: -OUT, b: -CUSH },
    { poly: [[-OUT, H + OUT], [W + OUT, H + OUT], [W + CUSH, H + CUSH], [-CUSH, H + CUSH]], h: true, a: H + OUT, b: H + CUSH },
    { poly: [[-OUT, -OUT], [-CUSH, -CUSH], [-CUSH, H + CUSH], [-OUT, H + OUT]], h: false, a: -OUT, b: -CUSH },
    { poly: [[W + OUT, -OUT], [W + CUSH, -CUSH], [W + CUSH, H + CUSH], [W + OUT, H + OUT]], h: false, a: W + OUT, b: W + CUSH },
  ];
  c.save(); rr(c, -OUT, -OUT, W + 2 * OUT, H + 2 * OUT, 55); c.clip();
  for (const rl of rails) {
    c.save(); c.beginPath(); rl.poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
    const g = rl.h ? c.createLinearGradient(0, rl.a, 0, rl.b) : c.createLinearGradient(rl.a, 0, rl.b, 0);
    [0, 0.12, 0.3, 0.65, 0.92, 1].forEach((o, i) => g.addColorStop(o, rm.wood[i]));
    c.fillStyle = g; c.fillRect(-OUT - 10, -OUT - 10, W + 2 * OUT + 20, H + 2 * OUT + 20);
    const len = rl.h ? W + 2 * OUT : H + 2 * OUT;
    for (let k = 0; k < 70; k++) {
      const pos = rl.a + (rl.b - rl.a) * r(), f = 0.004 + r() * 0.01, ph = r() * TAU, amp = 1 + r() * 4;
      c.strokeStyle = r() < 0.6 ? `rgba(45,15,0,${0.12 + r() * 0.2})` : `rgba(255,200,140,${0.05 + r() * 0.08})`;
      c.lineWidth = 0.8 + r() * 2.2; c.beginPath();
      for (let s = -OUT; s <= len - OUT; s += 30) { const w = pos + Math.sin(s * f + ph) * amp; rl.h ? (s === -OUT ? c.moveTo(s, w) : c.lineTo(s, w)) : (s === -OUT ? c.moveTo(w, s) : c.lineTo(w, s)); }
      c.stroke();
    }
    c.restore();
  }
  // mitre joints
  c.strokeStyle = 'rgba(20,6,0,0.55)'; c.lineWidth = 2;
  for (const [ax, ay, bx, by] of [[-OUT, -OUT, -CUSH, -CUSH], [W + OUT, -OUT, W + CUSH, -CUSH], [-OUT, H + OUT, -CUSH, H + CUSH], [W + OUT, H + OUT, W + CUSH, H + CUSH]]) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
  // lamp sheen on the lacquer
  for (const L of LAMPS) for (const yy of [-OUT * 0.62, H + OUT * 0.62]) {
    const g = c.createRadialGradient(L.x, yy, 0, L.x, yy, 260); g.addColorStop(0, 'rgba(255,225,180,0.22)'); g.addColorStop(1, 'rgba(255,225,180,0)');
    c.fillStyle = g; c.fillRect(L.x - 260, yy - 60, 520, 120);
  }
  c.restore();
  c.lineWidth = 3; c.strokeStyle = 'rgba(255,215,170,0.35)'; rr(c, -OUT + 3, -OUT + 3, W + 2 * OUT - 6, H + 2 * OUT - 6, 52); c.stroke();
  c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.6)'; rr(c, -OUT, -OUT, W + 2 * OUT, H + 2 * OUT, 55); c.stroke();
  // mother-of-pearl diamonds
  const dia = (x, y) => {
    c.save(); c.translate(x, y); const g = c.createLinearGradient(-9, -6, 9, 6); g.addColorStop(0, '#fffdf6'); g.addColorStop(0.5, '#d9d2c3'); g.addColorStop(1, '#f4ecdc');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 0); c.lineTo(0, 9); c.lineTo(-6, 0); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.2; c.stroke(); c.restore();
  };
  for (let i = 1; i < 8; i++) if (i !== 4) { dia(W * i / 8, -CUSH - WOOD / 2); dia(W * i / 8, H + CUSH + WOOD / 2); }
  for (let i = 1; i < 4; i++) { dia(-CUSH - WOOD / 2, H * i / 4); dia(W + CUSH + WOOD / 2, H * i / 4); }
  // ── cloth ──
  c.save(); c.beginPath(); c.rect(-CUSH, -CUSH, W + 2 * CUSH, H + 2 * CUSH); c.clip();
  c.fillStyle = cl.felt[2]; c.fillRect(-CUSH, -CUSH, W + 2 * CUSH, H + 2 * CUSH);
  const fg = c.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.62);
  fg.addColorStop(0, cl.felt[1]); fg.addColorStop(1, hexA(cl.felt[1], 0.25)); c.fillStyle = fg; c.fillRect(-CUSH, -CUSH, W + 2 * CUSH, H + 2 * CUSH);
  for (const L of LAMPS) {
    const g = c.createRadialGradient(L.x, L.y, 0, L.x, L.y, 620); g.addColorStop(0, hexA(cl.felt[0], 0.75)); g.addColorStop(1, hexA(cl.felt[0], 0));
    c.fillStyle = g; c.fillRect(-CUSH, -CUSH, W + 2 * CUSH, H + 2 * CUSH);
  }
  const r2 = rng(3);
  for (let i = 0; i < 9000; i++) { c.fillStyle = r2() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'; c.fillRect(r2() * (W + 2 * CUSH) - CUSH, r2() * (H + 2 * CUSH) - CUSH, 2.2, 2.2); }
  const edge = (x0, y0, x1, y1, x, y, w, h) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(0,0,0,0.38)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x, y, w, h); };
  edge(0, 0, 0, 70, -CUSH, 0, W + 2 * CUSH, 70); edge(0, H, 0, H - 70, -CUSH, H - 70, W + 2 * CUSH, 70);
  edge(0, 0, 70, 0, 0, -CUSH, 70, H + 2 * CUSH); edge(W, 0, W - 70, 0, W - 70, -CUSH, 70, H + 2 * CUSH);
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.13)'; c.lineWidth = 2; c.beginPath(); c.moveTo(HEAD_X, 0); c.lineTo(HEAD_X, H); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.arc(FOOT_X, H / 2, 5, 0, TAU); c.fill(); c.beginPath(); c.arc(HEAD_X, H / 2, 4, 0, TAU); c.fill();
  // cushions with a rounded nose
  for (const p of CUSHIONS) {
    const [a, b2] = p, mx = (a[0] + b2[0]) / 2, my = (a[1] + b2[1]) / 2;
    const nx = a[1] === b2[1] ? 0 : (a[0] <= 0 ? -1 : 1), ny = a[1] === b2[1] ? (a[1] <= 0 ? -1 : 1) : 0;
    const g = c.createLinearGradient(mx, my, mx + nx * CUSH, my + ny * CUSH);
    g.addColorStop(0, cl.cush[0]); g.addColorStop(0.25, cl.cush[0]); g.addColorStop(1, cl.cush[1]);
    c.beginPath(); p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 3; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b2[0], b2[1]); c.stroke();
  }
  // brass pocket plates
  c.save(); c.beginPath(); rr(c, -OUT - 2, -OUT - 2, W + 2 * OUT + 4, H + 2 * OUT + 4, 57); c.rect(-CUSH, -CUSH, W + 2 * CUSH, H + 2 * CUSH); c.clip('evenodd');
  for (const p of POCKETS) {
    const pr = p.side ? 80 : 98, px = p.x - p.nx * (p.side ? 0 : 8), py = p.y - p.ny * (p.side ? 0 : 8);
    c.save(); c.globalAlpha = 0.6; c.drawImage(shadowSpr, px - pr - 14, py - pr - 6, 2 * pr + 40, 2 * pr + 40); c.restore();
    const g = c.createLinearGradient(px - pr, py - pr, px + pr, py + pr);
    const mt = rm.metal === 'chrome' ? ['#ffffff', '#9aa1ab', '#e6e9ee', '#4c525b'] : ['#fbe6a0', '#c9973c', '#f2d283', '#7a5418'];
    g.addColorStop(0, mt[0]); g.addColorStop(0.35, mt[1]); g.addColorStop(0.6, mt[2]); g.addColorStop(1, mt[3]);
    c.fillStyle = g; c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(60,35,5,0.6)'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = 'rgba(255,245,210,0.45)'; c.lineWidth = 2; c.beginPath(); c.arc(px, py, pr - 12, 0, TAU); c.stroke();
    for (const a of [0.9, 2.2, 3.6, 5.0]) { c.fillStyle = rm.metal === 'chrome' ? '#3a3f46' : '#6d4a14'; c.beginPath(); c.arc(px + Math.cos(a) * (pr - 24), py + Math.sin(a) * (pr - 24), 4, 0, TAU); c.fill(); }
  }
  c.restore();
  for (const p of POCKETS) {
    const pr = p.r + 7, g = c.createRadialGradient(p.x, p.y, 2, p.x, p.y, pr);
    g.addColorStop(0, '#000'); g.addColorStop(0.62, '#050505'); g.addColorStop(0.86, '#1d140d'); g.addColorStop(1, '#3a2617');
    c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, pr, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 3; c.stroke();
  }
  chalk(c, W * 0.88, -CUSH - WOOD / 2, 0.35, 30);
}

function drawStatic() {
  const c = sctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  const rm = curRoom();
  c.fillStyle = carpetPattern(c, 220 * scale, rm); c.fillRect(0, 0, stat.width, stat.height);
  c.setTransform(scale, 0, 0, scale, offX, offY);
  // furniture around the table (mostly visible on wide phones)
  if (rm.kind === 'arena') { c.save(); tableXform(c); crowd(c); c.restore(); }
  else for (const [k, x, y, a] of LAY.props) {
    if (rm.kind === 'club') k === 'stool' ? armchair(c, x, y, a) : sideTable(c, x, y, 1);
    else if (rm.kind === 'neon') k === 'stool' ? neonStool(c, x, y, a, a > 1 ? '#3ce0ff' : '#ff3cc8') : sideTable(c, x, y, 0);
    else k === 'stool' ? stool(c, x, y, a) : sideTable(c, x, y, a);
  }
  // warm light over the table, darkness at the edges of the room
  c.setTransform(1, 0, 0, 1, 0, 0);
  const cx = offX + LAY.lightC.x * scale, cy = offY + LAY.lightC.y * scale, far = Math.hypot(stat.width, stat.height) * 0.6;
  const lg = c.createRadialGradient(cx, cy, (H / 2) * scale, cx, cy, Math.max(far, (W * 0.75) * scale));
  lg.addColorStop(0, `rgba(${rm.light},0.10)`); lg.addColorStop(0.4, 'rgba(10,4,2,0.5)'); lg.addColorStop(1, `rgba(0,0,0,${rm.vig})`);
  c.fillStyle = lg; c.fillRect(0, 0, stat.width, stat.height);
  c.setTransform(scale, 0, 0, scale, offX, offY); tableXform(c);
  drawTable(c);
}

// ───────────────────────────── ball drawing ─────────────────────────────
function cap(c, p, alpha, r, color) {
  const sa = Math.sin(alpha), ca = Math.cos(alpha), pz = p[2];
  if (pz <= -sa) return;
  const pxy = Math.hypot(p[0], p[1]), cx = r * ca * pxy, rx = Math.max(0.01, r * sa * Math.abs(pz)), ry = r * sa;
  c.save(); c.rotate(Math.atan2(p[1], p[0])); c.fillStyle = color;
  if (pz >= sa) { c.beginPath(); c.ellipse(cx, 0, rx, ry, 0, 0, TAU); c.fill(); }
  else if (pz >= 0) {
    c.beginPath(); c.ellipse(cx, 0, rx, ry, 0, 0, TAU); c.fill();
    c.beginPath(); c.rect(cx, -r - 2, r + 2 - cx, 2 * r + 4); c.fill();
  } else {
    c.beginPath(); c.rect(cx, -r - 2, r + 2 - cx, 2 * r + 4); c.clip();
    c.beginPath(); c.rect(cx - 1, -r - 3, r + 4 - cx, 2 * r + 6); c.ellipse(cx, 0, rx, ry, 0, 0, TAU); c.fill('evenodd');
  }
  c.restore();
}
function spec(c, x, y, rad, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.45, `rgba(255,255,255,${a * 0.55})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
}
function drawBall(c, b, x, y, r, alpha = 1, lit = false) {
  c.save(); c.globalAlpha = alpha; c.translate(x, y);
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
  if (b.n === 0) { c.fillStyle = COLORS[0]; c.fill(); }
  else if (b.n > 8) {
    c.fillStyle = ballColor(b.n); c.fill();
    cap(c, b.p, 0.72, r, COLORS[0]); cap(c, [-b.p[0], -b.p[1], -b.p[2]], 0.72, r, COLORS[0]);
  } else { c.fillStyle = ballColor(b.n); c.fill(); }
  if (b.n > 0) {
    cap(c, b.q, 0.5, r, '#fbfaf5');
    const q = b.q;
    if (q[2] > 0.3) {
      const pxy = Math.hypot(q[0], q[1]) || 1, ux = q[0] / pxy, uy = q[1] / pxy, k = q[2] - 1;
      c.save(); c.translate(q[0] * r, q[1] * r);
      c.transform(1 + k * ux * ux, k * ux * uy, k * ux * uy, 1 + k * uy * uy, 0, 0);
      if (lit && PORT) c.rotate(Math.PI / 2);
      c.fillStyle = '#111'; c.font = `bold ${r * (b.n > 9 ? 0.62 : 0.72)}px system-ui, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.n, 0, r * 0.04);
      c.restore();
    }
  }
  // body shading: lit from above, darker towards the silhouette, cloth bounce at the rim
  const sh = c.createRadialGradient(0, 0, r * 0.15, 0, 0, r * 1.02);
  sh.addColorStop(0, 'rgba(255,255,255,0.14)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(0.82, 'rgba(0,0,0,0.2)'); sh.addColorStop(1, 'rgba(0,0,0,0.6)');
  c.fillStyle = sh; c.fillRect(-r, -r, 2 * r, 2 * r);
  if (lit) {
    for (let i = 0; i < LAMPS.length; i++) {
      const L = LAMPS[i], dx = L.x - x, dy = L.y - y, D = Math.hypot(dx, dy, LAMP_H), k = 1 / Math.sqrt(2 + 2 * LAMP_H / D);
      spec(c, dx / D * k * r * 1.9, dy / D * k * r * 1.9, r * 0.32, 0.95 * Math.pow(LAMP_H / D, 3));
    }
  } else spec(c, -r * 0.32, -r * 0.38, r * 0.4, 0.85);
  if (bigNums && b.n > 0 && r > 15) {             // colour-blind aid: a flat, always-upright number badge
    if (lit && PORT) c.rotate(Math.PI / 2);
    c.fillStyle = 'rgba(255,255,255,0.92)'; c.beginPath(); c.arc(0, 0, r * 0.56, 0, TAU); c.fill();
    if (b.n > 8) { c.strokeStyle = ballColor(b.n); c.lineWidth = r * 0.12; c.stroke(); }
    c.fillStyle = '#000'; c.font = `bold ${r * 0.72}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(b.n, 0, r * 0.04);
  }
  c.restore();
}

// ───────────────────────────── per-frame drawing ─────────────────────────────
function predict(cx, cy, ang) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let best = Infinity, hit = null;
  for (const b of G.balls) {
    if (!b.on || b.n === 0) continue;
    const fx = b.x - cx, fy = b.y - cy, t = fx * dx + fy * dy; if (t <= 0) continue;
    const d2 = fx * fx + fy * fy - t * t; if (d2 > 4 * R * R) continue;
    const tt = t - Math.sqrt(4 * R * R - d2); if (tt < best) { best = tt; hit = b; }
  }
  let tc = Infinity, nx = 0, ny = 0;
  if (dx > 0) { const t = (W - R - cx) / dx; if (t < tc) { tc = t; nx = -1; ny = 0; } } else if (dx < 0) { const t = (R - cx) / dx; if (t < tc) { tc = t; nx = 1; ny = 0; } }
  if (dy > 0) { const t = (H - R - cy) / dy; if (t < tc) { tc = t; nx = 0; ny = -1; } } else if (dy < 0) { const t = (R - cy) / dy; if (t < tc) { tc = t; nx = 0; ny = 1; } }
  if (hit && best <= tc) {
    const gx = cx + dx * best, gy = cy + dy * best; let ox = hit.x - gx, oy = hit.y - gy; const ol = Math.hypot(ox, oy); ox /= ol; oy /= ol;
    const cosA = dx * ox + dy * oy;
    return { hit, gx, gy, ox, oy, cosA, tx: dx - cosA * ox, ty: dy - cosA * oy };
  }
  const vn = dx * nx + dy * ny;
  return { hit: null, gx: cx + dx * tc, gy: cy + dy * tc, rx: dx - 2 * vn * nx, ry: dy - 2 * vn * ny };
}
function isLegalTarget(n) {
  if (!RULES[G.game] || G.isBreak) return true;
  const rl = RULES[G.game]; return rl.targets(G.balls, rl.snapshot(G), G.turn).includes(n);
}
function drawGuide(c) {
  const cue = G.balls[0], p = predict(cue.x, cue.y, G.aim), dx = Math.cos(G.aim), dy = Math.sin(G.aim);
  c.save(); c.lineCap = 'round';
  c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(cue.x + dx * R, cue.y + dy * R); c.lineTo(p.gx - dx * R, p.gy - dy * R); c.stroke();
  c.beginPath(); c.arc(p.gx, p.gy, R, 0, TAU); c.stroke();
  if (p.hit) {
    if (!isLegalTarget(p.hit.n)) {
      c.strokeStyle = '#ff4d4d'; c.lineWidth = 5; const s = R * 0.55;
      c.beginPath(); c.moveTo(p.gx - s, p.gy - s); c.lineTo(p.gx + s, p.gy + s); c.moveTo(p.gx + s, p.gy - s); c.lineTo(p.gx - s, p.gy + s); c.stroke();
    } else {
      const L = (longGuide ? 420 : 160) * CUES[cueIdx].aim;
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.85)';
      c.beginPath(); c.moveTo(p.hit.x + p.ox * R, p.hit.y + p.oy * R); c.lineTo(p.hit.x + p.ox * (R + L * p.cosA), p.hit.y + p.oy * (R + L * p.cosA)); c.stroke();
      const tl = Math.hypot(p.tx, p.ty);
      if (tl > 0.02) { c.strokeStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.moveTo(p.gx, p.gy); c.lineTo(p.gx + p.tx / tl * L * tl * 0.9, p.gy + p.ty / tl * L * tl * 0.9); c.stroke(); }
    }
  } else if (longGuide) {
    const L = 160 * CUES[cueIdx].aim; c.strokeStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.moveTo(p.gx, p.gy); c.lineTo(p.gx + p.rx * L, p.gy + p.ry * L); c.stroke();
  }
  c.restore();
}
function taper(c, x0, x1, w0, w1, fill) {
  c.beginPath(); c.moveTo(x0, -w0); c.lineTo(x1, -w1); c.lineTo(x1, w1); c.lineTo(x0, w0); c.closePath(); c.fillStyle = fill; c.fill();
}
function drawCue(c, x, y, ang, pull, alpha = 1) {
  const K = CUES[cueIdx];
  c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(ang);
  const tip = -(R + 8 + pull), L = 1350, w = s => 6 + 7 * (s / L);
  const xs = s => tip - s;
  c.save(); c.translate(8, 12); c.globalAlpha = 0.16 * alpha; taper(c, xs(0), xs(L), w(0) + 2, w(L) + 3, '#000'); c.restore();
  taper(c, xs(0), xs(7), w(0), w(7), K.tip);
  taper(c, xs(7), xs(26), w(7), w(26), K.fer);
  const sg = c.createLinearGradient(xs(26), 0, xs(760), 0); sg.addColorStop(0, K.shaft[0]); sg.addColorStop(1, K.shaft[1]);
  taper(c, xs(26), xs(760), w(26), w(760), sg);
  taper(c, xs(760), xs(782), w(760), w(782), K.joint);
  taper(c, xs(782), xs(1110), w(782), w(1110), K.fore);
  c.fillStyle = K.inlay;
  for (let i = 0; i < 4; i++) { const s0 = 800 + i * 70; c.beginPath(); c.moveTo(xs(s0), 0); c.lineTo(xs(s0 + 45), -w(s0 + 45) * 0.8); c.lineTo(xs(s0 + 90), 0); c.lineTo(xs(s0 + 45), w(s0 + 45) * 0.8); c.closePath(); c.fill(); }
  taper(c, xs(1105), xs(1112), w(1105), w(1112), K.joint);
  taper(c, xs(1112), xs(1300), w(1112), w(1300), K.wrap);
  c.strokeStyle = 'rgba(255,255,255,0.09)'; c.lineWidth = 2;
  for (let s = 1120; s < 1300; s += 12) { c.beginPath(); c.moveTo(xs(s), -w(s)); c.lineTo(xs(s + 6), w(s)); c.stroke(); }
  taper(c, xs(1300), xs(1306), w(1300), w(1306), K.joint);
  taper(c, xs(1306), xs(L), w(1306), w(L), K.butt);
  const sh = c.createLinearGradient(0, -15, 0, 15); sh.addColorStop(0, 'rgba(255,255,255,0.45)'); sh.addColorStop(0.35, 'rgba(255,255,255,0.05)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)');
  taper(c, xs(0), xs(L), w(0), w(L), sh);
  c.restore();
}
function statusText() {
  if (G.game === 'puzzle') return `Shots left: ${G.puzzle.shots - G.shots}`;
  if (G.game === 'tutorial' || G.game === 'practice') return G.game === 'practice' ? 'Free play' : 'Tutorial';
  if (G.isBreak) return 'Break';
  if (G.game === '9ball') return `On the ${lowestOn(G.balls)}-ball`;
  if (G.game === 'straight') return `Race to ${G.target}`;
  if (!G.groups[0]) return 'Open table';
  return G.match ? `Race to ${G.match.raceTo}` : '8-Ball';
}
function wrapText(c, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (c.measureText(tst).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; }
  if (cur) lines.push(cur); return lines;
}
// speech bubbles hang below the speaker's panel with a tail pointing at their face
function drawBubbles(c) {
  if (G.solo) return;
  for (const b of G.talk) {
    const P = LAY.panels[b.who], a = Math.min(1, b.t * 6, (b.dur - b.t) * 3); if (a <= 0) continue;
    const pop = b.t < 0.15 ? 0.85 + b.t : 1;
    c.save(); c.globalAlpha = a; c.font = 'bold 36px system-ui, sans-serif';
    const lines = wrapText(c, b.text, PORT ? 520 : 700), w = Math.max(...lines.map(l => c.measureText(l).width)) + 56, h = lines.length * 44 + 32;
    const ax = P.left ? P.x + P.h * 0.5 : P.x + P.w - P.h * 0.5, top = PORT ? 330 : P.y + P.h + 26;
    let x = P.left ? P.x + 10 : P.x + P.w - 10 - w;
    c.translate(ax, top); c.scale(pop, pop); c.translate(-ax, -top);
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 20 * scale; c.shadowOffsetY = 6 * scale;
    c.fillStyle = b.who === 0 ? '#e8f4ff' : '#fffaf0';
    rr(c, x, top, w, h, 26); c.fill();
    c.beginPath(); c.moveTo(ax - 16, top + 2); c.lineTo(ax, top - (PORT ? 40 : 22)); c.lineTo(ax + 16, top + 2); c.closePath(); c.fill();
    c.shadowColor = 'transparent';
    c.fillStyle = '#1d140f'; c.textAlign = 'left'; c.textBaseline = 'top';
    lines.forEach((l, k) => c.fillText(l, x + 28, top + 18 + k * 44));
    c.restore();
  }
}
function drawHUD(c, t) {
  const mb = LAY.menu, sb = LAY.spin;
  rr(c, mb.x - mb.r, mb.y - mb.r, mb.r * 2, mb.r * 2, mb.r * 0.42);
  { const g = c.createLinearGradient(0, mb.y - mb.r, 0, mb.y + mb.r); g.addColorStop(0, '#d9a441'); g.addColorStop(1, '#8a5a17'); c.fillStyle = g; }
  c.fill(); c.strokeStyle = 'rgba(255,240,200,0.5)'; c.lineWidth = 3; c.stroke();
  c.fillStyle = '#fff'; for (let i = -1; i <= 1; i++) { rr(c, mb.x - mb.r * 0.52, mb.y + i * mb.r * 0.36 - mb.r * 0.1, mb.r * 1.04, mb.r * 0.2, mb.r * 0.1); c.fill(); }
  const g = c.createRadialGradient(sb.x - sb.r * 0.3, sb.y - sb.r * 0.35, 4, sb.x, sb.y, sb.r);
  g.addColorStop(0, '#fff'); g.addColorStop(1, '#bdbab0'); c.fillStyle = g; c.beginPath(); c.arc(sb.x, sb.y, sb.r, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; c.beginPath(); c.arc(sb.x, sb.y, sb.r * 0.75, 0, TAU); c.stroke();
  c.fillStyle = '#e02424'; c.beginPath(); c.arc(sb.x + G.spin.x * sb.r * 0.75, sb.y - G.spin.y * sb.r * 0.75, sb.r * 0.17, 0, TAU); c.fill();
  const panel = (i, P) => {
    const active = G.turn === i && !G.over, p = G.players[i];
    if (G.solo && i === 1) return;
    rr(c, P.x, P.y, P.w, P.h, 30); c.fillStyle = active ? 'rgba(28,22,18,0.82)' : 'rgba(10,8,8,0.66)'; c.fill();
    if (active) { c.strokeStyle = `rgba(240,190,90,${0.65 + 0.35 * Math.sin(t * 5)})`; c.lineWidth = 5; c.stroke(); }
    else { c.strokeStyle = 'rgba(217,164,65,0.22)'; c.lineWidth = 3; c.stroke(); }
    const ar = P.h * 0.38, ax = P.left ? P.x + P.h * 0.5 : P.x + P.w - P.h * 0.5, ay = P.y + P.h / 2;
    if (p.look) {
      const ex = G.exprT[i] > 0 ? G.expr[i] : 'neutral', talking = G.talk.some(b => b.who === i && b.t < b.dur * 0.55);
      drawFace(c, p.look, ax, ay, ar, ex, talking, t + i * 3);
      c.strokeStyle = active ? '#f0be5a' : 'rgba(255,255,255,0.75)'; c.lineWidth = 4; c.beginPath(); c.arc(ax, ay, ar, 0, TAU); c.stroke();
      if (p.level) {
        c.font = `bold ${P.h * 0.15}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        const lw = c.measureText('Lv ' + p.level).width + 18;
        rr(c, ax - lw / 2, ay + ar - 12, lw, P.h * 0.2, 10); c.fillStyle = '#e8b64c'; c.fill();
        c.fillStyle = '#2a1700'; c.fillText('Lv ' + p.level, ax, ay + ar - 12 + P.h * 0.1);
      }
    } else {
      c.fillStyle = p.color || (i ? '#b83280' : '#2b6cb0'); c.beginPath(); c.arc(ax, ay, ar, 0, TAU); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#fff'; c.font = `bold ${ar}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(p.avatar || (p.cpu ? '🤖' : p.name[0]), ax, ay + 3);
    }
    if (active && G.clock && human() && G.phase === 'aim') {        // shot clock ring
      const f = Math.max(0, G.clockLeft / G.clock);
      c.strokeStyle = f > 0.5 ? '#3ddc84' : f > 0.25 ? '#ffd64f' : '#ff4d4d'; c.lineWidth = 8;
      c.beginPath(); c.arc(ax, ay, ar + 9, -Math.PI / 2, -Math.PI / 2 + TAU * f); c.stroke();
    }
    const nx = P.left ? ax + ar + 24 : ax - ar - 24;
    c.font = `bold ${P.h * 0.3}px system-ui, sans-serif`; c.textAlign = P.left ? 'left' : 'right'; c.textBaseline = 'alphabetic';
    c.fillStyle = '#fff'; c.fillText(p.name, nx, P.y + P.h * 0.38, P.w - P.h - 40);
    const grp = G.groups[i];
    let nums = grp === 'solids' ? [1, 2, 3, 4, 5, 6, 7] : grp === 'stripes' ? [9, 10, 11, 12, 13, 14, 15] : [];
    let slots = 8;
    if (G.game === '9ball') { nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]; slots = 9; }
    else if (G.game === 'puzzle') { nums = G.puzzle.pot.slice(); slots = nums.length; }
    else if (G.game !== '8ball') nums = [];
    if (!nums.length && G.game !== '8ball' && G.game !== 'straight') return;
    if (G.game === 'straight') {
      c.font = `bold ${P.h * 0.24}px system-ui, sans-serif`; c.fillStyle = '#e8b64c';
      c.fillText(`${G.score[i]} / ${G.target} pts`, nx, P.y + P.h * 0.8); return;
    }
    const sp = Math.min(P.h * 0.41, (P.w - P.h - 40) / slots), br = Math.min(P.h * 0.17, sp / 2.35), by = P.y + P.h * 0.72;
    for (let k = 0; k < slots; k++) {
      const bx = P.left ? nx + br + k * sp : nx - br - k * sp;
      const n = G.game === '8ball' ? (k < 7 ? nums[k] : (grp ? 8 : undefined)) : nums[k];
      if (n === undefined || (G.game === '8ball' && n === 8 && !onEight(i))) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill(); continue; }
      const b = G.balls.find(x => x.n === n), dim = b && !b.on;
      drawBall(c, { n, p: [0, 0, 1], q: [0, 0, 1] }, bx, by, br, dim ? 0.18 : 1);
    }
  };
  panel(0, LAY.panels[0]); panel(1, LAY.panels[1]);
  const status = statusText(), ce = LAY.center;
  const top = G.match ? `${G.match.score[0]} – ${G.match.score[1]}` : G.game === 'practice' ? 'PRACTICE' : G.game === 'puzzle' ? 'TRICK SHOT' : G.game === 'tutorial' ? 'LESSON' : 'VS';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (ce.wide) {
    rr(c, ce.x - 180, ce.y - 60, 360, 120, 30); c.fillStyle = 'rgba(10,8,8,0.6)'; c.fill();
    c.fillStyle = '#e8b64c'; c.font = 'bold 46px Georgia, serif'; c.fillText(top, ce.x, ce.y - 20);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = '30px system-ui, sans-serif'; c.fillText(status, ce.x, ce.y + 30);
  } else {
    c.font = 'bold 40px Georgia, serif'; const w1 = c.measureText(`${top} · `).width;
    c.font = '34px system-ui, sans-serif'; const w2 = c.measureText(status).width, x0 = ce.x - (w1 + w2) / 2;
    rr(c, x0 - 34, ce.y - 42, w1 + w2 + 68, 84, 42); c.fillStyle = 'rgba(10,8,8,0.6)'; c.fill();
    c.textAlign = 'left'; c.fillStyle = '#e8b64c'; c.font = 'bold 40px Georgia, serif'; c.fillText(`${top} · `, x0, ce.y + 2);
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.font = '34px system-ui, sans-serif'; c.fillText(status, x0 + w1, ce.y + 2);
  }
}
// A control strip, vertical (landscape) or horizontal (portrait). `along` measures the long axis.
function strip(c, P) {
  rr(c, P.x, P.y, P.w, P.h, 40); c.fillStyle = 'rgba(12,8,6,0.72)'; c.fill(); c.strokeStyle = 'rgba(217,164,65,0.35)'; c.lineWidth = 3; c.stroke();
}
function drawSide(c, t) {
  const pw = G.power, P = LAY.power, F = LAY.fine, hz = !!P.horiz;
  strip(c, P);
  // inner track: leave room for labels at both ends
  const pad = 80, tr = hz ? { x: P.x + 150, y: P.y + 32, w: P.w - 300, h: P.h - 64 } : { x: P.x + 30, y: P.y + 70, w: 50, h: P.h - 140 };
  rr(c, tr.x, tr.y, tr.w, tr.h, 25); c.fillStyle = '#0c0907'; c.fill();
  if (pw > 0) {
    const pg = hz ? c.createLinearGradient(tr.x, 0, tr.x + tr.w, 0) : c.createLinearGradient(0, tr.y, 0, tr.y + tr.h);
    pg.addColorStop(0, '#3ddc84'); pg.addColorStop(0.55, '#ffd64f'); pg.addColorStop(1, '#ff4d4d');
    c.save(); rr(c, tr.x, tr.y, tr.w, tr.h, 25); c.clip(); c.fillStyle = pg;
    hz ? c.fillRect(tr.x, tr.y, tr.w * pw, tr.h) : c.fillRect(tr.x, tr.y, tr.w, tr.h * pw); c.restore();
  }
  c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 2;
  for (let i = 1; i < 10; i++) { c.beginPath(); if (hz) { const x = tr.x + tr.w * i / 10; c.moveTo(x, tr.y + 8); c.lineTo(x, tr.y + tr.h - 8); } else { const y = tr.y + tr.h * i / 10; c.moveTo(tr.x + 8, y); c.lineTo(tr.x + tr.w - 8, y); } c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = 'bold 26px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const lab1 = hz ? [P.x + 75, P.y + P.h / 2] : [P.x + P.w / 2, P.y + 36], lab2 = hz ? [P.x + P.w - 75, P.y + P.h / 2] : [P.x + P.w / 2, P.y + P.h - 36];
  c.fillText('POWER', lab1[0], lab1[1]);
  if (G.phase === 'aim' && human() && pw === 0) { const a = 0.4 + 0.4 * Math.sin(t * 4); c.fillStyle = `rgba(255,255,255,${a})`; c.font = 'bold 50px system-ui'; c.fillText(hz ? '⇨' : '⇩', lab2[0], lab2[1]); }
  else c.fillText(Math.round(pw * 100) + '%', lab2[0], lab2[1]);
  // fine aim wheel
  strip(c, F);
  const ir = hz ? { x: F.x + 150, y: F.y + 22, w: F.w - 300, h: F.h - 44 } : { x: F.x + 20, y: F.y + 70, w: F.w - 40, h: F.h - 140 };
  c.save(); rr(c, ir.x, ir.y, ir.w, ir.h, 30); c.clip();
  const wg = hz ? c.createLinearGradient(0, ir.y, 0, ir.y + ir.h) : c.createLinearGradient(ir.x, 0, ir.x + ir.w, 0);
  wg.addColorStop(0, '#555'); wg.addColorStop(0.5, '#bbb'); wg.addColorStop(1, '#555'); c.fillStyle = wg; c.fillRect(ir.x, ir.y, ir.w, ir.h);
  c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 6;
  const off = ((G.fine % 40) + 40) % 40;
  if (hz) for (let x = ir.x + off - 40; x < ir.x + ir.w + 40; x += 40) { c.beginPath(); c.moveTo(x, ir.y); c.lineTo(x, ir.y + ir.h); c.stroke(); }
  else for (let y = ir.y + off - 40; y < ir.y + ir.h + 40; y += 40) { c.beginPath(); c.moveTo(ir.x, y); c.lineTo(ir.x + ir.w, y); c.stroke(); }
  const sh = hz ? c.createLinearGradient(ir.x, 0, ir.x + ir.w, 0) : c.createLinearGradient(0, ir.y, 0, ir.y + ir.h);
  sh.addColorStop(0, 'rgba(0,0,0,0.7)'); sh.addColorStop(0.2, 'rgba(0,0,0,0)'); sh.addColorStop(0.8, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.7)');
  c.fillStyle = sh; c.fillRect(ir.x, ir.y, ir.w, ir.h); c.restore();
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = 'bold 26px system-ui';
  if (hz) { c.fillText('FINE', F.x + 75, F.y + F.h / 2); c.fillText('AIM', F.x + F.w - 75, F.y + F.h / 2); }
  else { c.fillText('FINE', F.x + F.w / 2, F.y + 36); c.fillText('AIM', F.x + F.w / 2, F.y + F.h - 36); }
}

function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(stat, 0, 0);
  if (!G) return;
  ctx.setTransform(scale, 0, 0, scale, offX, offY);
  if (!G.demo) { drawHUD(ctx, t); drawSide(ctx, t); }
  ctx.save(); tableXform(ctx);
  const c = ctx;
  // pocket call markers
  if (needCall() && (G.phase === 'aim' || G.phase === 'cpu')) {
    POCKETS.forEach((p, i) => {
      if (G.called === i) { c.strokeStyle = '#ffd64f'; c.lineWidth = 7; c.beginPath(); c.arc(p.x, p.y, p.r + 4 + 4 * Math.sin(t * 6), 0, TAU); c.stroke(); drawBall(c, { n: 8, p: [0, 0, 1], q: [0, 0, 1] }, p.x, p.y, 20, 1, true); }
      else if (G.called < 0 && human()) { c.setLineDash([12, 10]); c.strokeStyle = `rgba(255,255,255,${0.4 + 0.3 * Math.sin(t * 5)})`; c.lineWidth = 4; c.beginPath(); c.arc(p.x, p.y, p.r + 6, 0, TAU); c.stroke(); c.setLineDash([]); }
    });
  }
  // sinking balls
  for (const s of G.sinking) {
    const k = Math.min(1, s.t / 0.25), P = POCKETS[s.pocket];
    drawBall(c, s.b, s.x + (P.x - s.x) * k, s.y + (P.y - s.y) * k, R * (1 - 0.45 * k), 1 - k * 0.8, true);
  }
  // shadows
  for (const b of G.balls) {
    if (!b.on) continue;
    for (const L of LAMPS) {
      const ox = (b.x - L.x) * R * 0.75 / LAMP_H, oy = (b.y - L.y) * R * 0.75 / LAMP_H;
      c.globalAlpha = 0.24 * LAMP_H / Math.hypot(b.x - L.x, b.y - L.y, LAMP_H); c.drawImage(shadowSpr, b.x + ox - R * 1.3, b.y + oy - R * 1.3, R * 2.6, R * 2.6);
    }
    c.globalAlpha = 0.45; c.drawImage(shadowSpr, b.x - R * 0.95, b.y - R * 0.95, R * 1.9, R * 1.9);
  }
  c.globalAlpha = 1;
  // kitchen highlight
  const cue = G.balls[0];
  if (G.ballInHand && human() && (G.phase === 'aim')) {
    if (G.kitchen) { c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(0, 0, HEAD_X, H); }
    c.strokeStyle = `rgba(255,255,255,${0.5 + 0.3 * Math.sin(t * 5)})`; c.lineWidth = 4;
    c.beginPath(); c.arc(cue.x, cue.y, R * 2.1, 0, TAU); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.save(); c.translate(cue.x + Math.cos(a) * R * 2.7, cue.y + Math.sin(a) * R * 2.7); c.rotate(a); c.beginPath(); c.moveTo(10, 0); c.lineTo(-6, -10); c.lineTo(-6, 10); c.closePath(); c.fill(); c.restore(); }
  }
  for (const b of G.balls) if (b.on) drawBall(c, b, b.x, b.y, R, 1, true);
  // effects: chalk dust, pocket flashes
  for (const f of G.fx) {
    const k = f.t / f.life;
    if (f.conf) { c.save(); c.translate(f.x, f.y); c.rotate(f.t * f.spin); c.globalAlpha = Math.min(1, (f.life - f.t) * 2); c.fillStyle = f.col; c.fillRect(-9, -5, 18, 10); c.restore(); continue; }
    if (f.ring) { c.strokeStyle = `rgba(255,214,120,${0.7 * (1 - k)})`; c.lineWidth = 6 * (1 - k) + 1; c.beginPath(); c.arc(f.x, f.y, 30 + 70 * k, 0, TAU); c.stroke(); }
    else { c.fillStyle = `rgba(120,170,255,${0.55 * (1 - k)})`; c.beginPath(); c.arc(f.x, f.y, f.r * (1 + k), 0, TAU); c.fill(); }
  }
  if (G.strike) {
    const s = G.strike, k = s.t / 0.07;
    const pull = k < 1 ? s.pull * (1 - k) - 6 * k : -6, a = k < 1 ? 1 : Math.max(0, 1 - (s.t - 0.07) / 0.18);
    c.save(); c.beginPath(); c.rect(-OUT, -OUT - 5, W + 2 * OUT, H + 2 * OUT + 200); c.clip();
    drawCue(c, s.x, s.y, s.ang, pull, a); c.restore();
  }
  if ((G.phase === 'aim' || G.phase === 'cpu') && cue.on) {
    if (G.phase === 'aim' && human()) drawGuide(c);
    c.save(); c.beginPath(); c.rect(-OUT, -OUT - 5, W + 2 * OUT, H + 2 * OUT + 200); c.clip();
    drawCue(c, cue.x, cue.y, G.aim, G.power * 240); c.restore();
  }
  if (G.hint && G.hint.table) {                     // tutorial: highlight a spot on the table
    const h = G.hint.table; c.strokeStyle = `rgba(255,214,79,${0.55 + 0.4 * Math.sin(t * 6)})`; c.lineWidth = 6;
    c.beginPath(); c.arc(h.x, h.y, h.r || 60, 0, TAU); c.stroke();
  }
  c.restore();
  if (G.hint && G.hint.ui) {                        // tutorial: highlight a control
    const a = 0.55 + 0.4 * Math.sin(t * 6), k = G.hint.ui, T = k === 'spin' ? LAY.spin : LAY[k];
    c.strokeStyle = `rgba(255,214,79,${a})`; c.lineWidth = 8;
    if (k === 'spin') { c.beginPath(); c.arc(T.x, T.y, T.r + 14, 0, TAU); c.stroke(); }
    else { rr(c, T.x - 10, T.y - 10, T.w + 20, T.h + 20, 46); c.stroke(); }
  }
  if (G.phase === 'replay') {
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    const B = LAY.banner; rr(c, B.x - 230, B.y - 42, 460, 84, 42); c.fillStyle = 'rgba(10,8,6,0.85)'; c.fill();
    c.fillStyle = Math.sin(t * 6) > 0 ? '#ff4d4d' : '#7a1f1f'; c.beginPath(); c.arc(B.x - 175, B.y, 12, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 40px system-ui, sans-serif'; c.fillText('REPLAY · tap to skip', B.x + 15, B.y + 2); c.restore();
  } else if (G.replayOffer && G.phase === 'aim' && !G.demo) {
    const Rb = LAY.replayBtn; rr(c, Rb.x, Rb.y, Rb.w, Rb.h, Rb.h / 2); c.fillStyle = 'rgba(10,8,6,0.85)'; c.fill();
    c.strokeStyle = '#e8b64c'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#e8b64c'; c.font = 'bold 34px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('↺ Replay', Rb.x + Rb.w / 2, Rb.y + Rb.h / 2 + 2);
  }
  // quick chat button (vs computer)
  if (G.vs === 'cpu' && !G.demo && !G.over) {
    const Q = LAY.chat; c.fillStyle = 'rgba(12,8,6,0.8)'; c.beginPath(); c.arc(Q.x, Q.y, Q.r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(217,164,65,0.6)'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#f6efe4'; rr(c, Q.x - Q.r * 0.5, Q.y - Q.r * 0.38, Q.r, Q.r * 0.62, 12); c.fill();
    c.beginPath(); c.moveTo(Q.x - Q.r * 0.2, Q.y + Q.r * 0.22); c.lineTo(Q.x - Q.r * 0.36, Q.y + Q.r * 0.48); c.lineTo(Q.x, Q.y + Q.r * 0.22); c.fill();
    c.fillStyle = '#3a2a20'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.arc(Q.x + k * Q.r * 0.24, Q.y - Q.r * 0.07, Q.r * 0.07, 0, TAU); c.fill(); }
  }
  drawBubbles(c);
  // message banner (screen-aligned, so it reads upright in both orientations)
  if (G.msg) {
    const m = G.msg, a = Math.min(1, m.t * 5, (m.dur - m.t) * 3), B = LAY.banner;
    if (a > 0) {
      c.save(); c.globalAlpha = a; c.font = 'bold 44px system-ui, sans-serif';
      const tw = Math.min(B.max, c.measureText(m.text).width + 80);
      rr(c, B.x - tw / 2, B.y - 42, tw, 84, 42); c.fillStyle = 'rgba(10,8,6,0.85)'; c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(m.text, B.x, B.y, B.max - 40);
      c.restore();
    }
  }
}

