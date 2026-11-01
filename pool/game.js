/* Clubhouse 8-Ball — an original, ad-free 8-ball pool game.
   All graphics are drawn procedurally on a <canvas>; no external assets. */
'use strict';
(() => {
// ───────────────────────────── constants ─────────────────────────────
const TAU = Math.PI * 2;
const W = 2000, H = 1000, R = 25;            // playing surface & ball radius
const CUSH = 45, WOOD = 85, OUT = CUSH + WOOD;
const HEAD_X = W * 0.25, FOOT_X = W * 0.75;
const MAX_SPEED = 5200;
const FR_A = 140, FR_K = 0.32;               // rolling friction: dv/dt = -(A + K v)
const E_BALL = 0.95, E_CUSH = 0.78;
const DT = 1 / 480;
const DW = 2620, DH = 1460, TX = 310, TY = 310; // design space & table origin
const COLORS = ['#f6f3e8', '#f2b705', '#1d4fd8', '#d62828', '#6a2c91', '#f26b0f', '#11823b', '#7f1d1d', '#141414'];
const ballColor = n => COLORS[n > 8 ? n - 8 : n];
const groupOf = n => (n >= 1 && n <= 7 ? 'solids' : n >= 9 ? 'stripes' : null);

// ───────────────────────────── table geometry ─────────────────────────────
const C = 72, M = 56, J = 45, S2 = Math.SQRT1_2;
const POCKETS = [
  { x: -12, y: -12, r: 50, ax: 6, ay: 6, nx: S2, ny: S2, side: false },
  { x: W / 2, y: -24, r: 44, ax: W / 2, ay: -6, nx: 0, ny: 1, side: true },
  { x: W + 12, y: -12, r: 50, ax: W - 6, ay: 6, nx: -S2, ny: S2, side: false },
  { x: -12, y: H + 12, r: 50, ax: 6, ay: H - 6, nx: S2, ny: -S2, side: false },
  { x: W / 2, y: H + 24, r: 44, ax: W / 2, ay: H + 6, nx: 0, ny: -1, side: true },
  { x: W + 12, y: H + 12, r: 50, ax: W - 6, ay: H - 6, nx: -S2, ny: -S2, side: false },
];
const SEGS = [], CUSHIONS = [];
function seg(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; SEGS.push({ ax, ay, dx, dy, l2: dx * dx + dy * dy }); }
function cushion(ax, ay, bx, by, jax, jay, jbx, jby) {
  seg(ax, ay, bx, by); seg(ax, ay, jax, jay); seg(bx, by, jbx, jby);
  CUSHIONS.push([[ax, ay], [bx, by], [jbx, jby], [jax, jay]]);
}
cushion(C, 0, W / 2 - M, 0, C - 26, -J, W / 2 - M + 10, -J);
cushion(W / 2 + M, 0, W - C, 0, W / 2 + M - 10, -J, W - C + 26, -J);
cushion(C, H, W / 2 - M, H, C - 26, H + J, W / 2 - M + 10, H + J);
cushion(W / 2 + M, H, W - C, H, W / 2 + M - 10, H + J, W - C + 26, H + J);
cushion(0, C, 0, H - C, -J, C - 26, -J, H - C + 26);
cushion(W, C, W, H - C, W + J, C - 26, W + J, H - C + 26);

// ───────────────────────────── physics engine ─────────────────────────────
function newEv() { return { first: null, railAfter: false, potted: [], railBalls: new Set(), hits: [], cush: [] }; }

function rot(v, ax, ay, ang) {               // Rodrigues rotation about (ax, ay, 0)
  const c = Math.cos(ang), s = Math.sin(ang);
  const x = v[0], y = v[1], z = v[2], d = ax * x + ay * y;
  v[0] = x * c + ay * z * s + ax * d * (1 - c);
  v[1] = y * c - ax * z * s + ay * d * (1 - c);
  v[2] = z * c + (ax * y - ay * x) * s;
}
function rollBall(b, sp, dt) {
  const a = sp * dt / R, ax = -b.vy / sp, ay = b.vx / sp;
  rot(b.p, ax, ay, a); rot(b.q, ax, ay, a);
}

function step(S, dt, ev) {
  const B = S.balls;
  for (const b of B) {
    if (!b.on) continue;
    let sp = Math.hypot(b.vx, b.vy);
    if (sp === 0) continue;
    const dec = (FR_A + FR_K * sp) * dt;
    if (dec >= sp) { b.vx = b.vy = 0; continue; }
    const k = (sp - dec) / sp; b.vx *= k; b.vy *= k; sp -= dec;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.n === 0) S.cueTravel += sp * dt;
    if (S.render) rollBall(b, sp, dt);
  }
  // cushions
  for (const b of B) {
    if (!b.on || (b.x > R + 2 && b.x < W - R - 2 && b.y > R + 2 && b.y < H - R - 2)) continue;
    for (const s of SEGS) {
      let t = ((b.x - s.ax) * s.dx + (b.y - s.ay) * s.dy) / s.l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      let nx = b.x - (s.ax + s.dx * t), ny = b.y - (s.ay + s.dy * t);
      const d2 = nx * nx + ny * ny;
      if (d2 >= R * R || d2 === 0) continue;
      const d = Math.sqrt(d2); nx /= d; ny /= d;
      b.x += nx * (R - d); b.y += ny * (R - d);
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        const sp = Math.hypot(b.vx, b.vy), ix = b.vx / sp, iy = b.vy / sp;
        b.vx -= (1 + E_CUSH) * vn * nx; b.vy -= (1 + E_CUSH) * vn * ny;
        if (b.n === 0 && S.spinS) {            // running / reverse english off the rail
          const add = S.spinS * 0.45 * -vn;
          b.vx += -iy * add; b.vy += ix * add; S.spinS *= 0.5;
        }
        if (ev.first !== null) ev.railAfter = true;
        ev.railBalls.add(b.n);
        if (ev.cush) ev.cush.push(-vn);
      }
    }
  }
  // ball–ball
  for (let i = 0; i < B.length; i++) {
    const a = B[i]; if (!a.on) continue;
    for (let j = i + 1; j < B.length; j++) {
      const b = B[j]; if (!b.on) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 >= 4 * R * R) continue;
      const d = Math.sqrt(d2) || 1e-4, nx = dx / d, ny = dy / d, ov = (2 * R - d) / 2;
      a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
      const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rv <= 0) continue;
      const cue = a.n === 0 ? a : b.n === 0 ? b : null;
      let pvx = 0, pvy = 0, psp = 0;
      if (cue) { pvx = cue.vx; pvy = cue.vy; psp = Math.hypot(pvx, pvy); }
      const imp = (1 + E_BALL) / 2 * rv;
      a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny;
      if (cue) {
        if (ev.first === null) ev.first = cue === a ? b.n : a.n;
        if (!S.spinUsed && psp > 0) {         // follow / draw after first contact
          S.spinUsed = true;
          const f = 0.28 + (S.spinF * 0.9 - 0.28) * Math.exp(-S.cueTravel / 1400);
          cue.vx += pvx / psp * f * psp; cue.vy += pvy / psp * f * psp;
        }
      }
      ev.hits.push(rv);
    }
  }
  // pockets
  for (const b of B) {
    if (!b.on) continue;
    let k = -1;
    for (let i = 0; i < 6; i++) {
      const p = POCKETS[i], dx = b.x - p.x, dy = b.y - p.y;
      if (dx * dx + dy * dy < p.r * p.r) { k = i; break; }
    }
    if (k < 0 && (b.x < -R || b.x > W + R || b.y < -R || b.y > H + R)) {
      let bd = Infinity;
      POCKETS.forEach((p, i) => { const d = Math.hypot(b.x - p.x, b.y - p.y); if (d < bd) { bd = d; k = i; } });
    }
    if (k >= 0) { ev.potted.push({ n: b.n, pocket: k, x: b.x, y: b.y }); b.on = false; b.vx = b.vy = 0; }
  }
}
const stopped = B => B.every(b => !b.on || (b.vx === 0 && b.vy === 0));

// ───────────────────────────── rules ─────────────────────────────
function judge(st, ev) {
  const me = st.turn, myG = st.groups[me];
  const pot = ev.potted.filter(p => p.n !== 0);
  const scratch = ev.potted.some(p => p.n === 0);
  const eight = pot.find(p => p.n === 8);
  let foul = null;
  if (scratch) foul = 'Scratch — the cue ball was potted';
  else if (ev.first === null) foul = 'No ball was hit';
  else if (!st.isBreak) {
    if (!myG) { if (ev.first === 8) foul = 'You cannot hit the 8-ball first on an open table'; }
    else if (st.onEight) { if (ev.first !== 8) foul = 'You must hit the 8-ball first'; }
    else if (groupOf(ev.first) !== myG) foul = `You must hit ${myG === 'solids' ? 'a solid' : 'a striped'} ball first`;
    if (!foul && pot.length === 0 && !ev.railAfter) foul = 'No ball hit a cushion after contact';
  }
  if (eight) {
    if (st.isBreak) return { respot8: true, foul, keep: !foul && pot.length > 1 };
    if (!st.onEight) return { lose: true, reason: 'The 8-ball was potted too early' };
    if (foul) return { lose: true, reason: 'Foul while potting the 8-ball' };
    if (eight.pocket !== st.called) return { lose: true, reason: 'The 8-ball went into the wrong pocket' };
    return { win: true, reason: 'Potted the 8-ball in the called pocket' };
  }
  let assign = null;
  if (!foul && !myG && !st.isBreak && pot.length) assign = groupOf(pot[0].n);
  const g = myG || assign;
  let keep = false;
  if (!foul) keep = st.isBreak ? pot.length > 0 : !!g && pot.some(p => groupOf(p.n) === g);
  return { foul, assign, keep };
}
function remaining(B, g) { return B.filter(b => b.on && groupOf(b.n) === g).length; }
function legalTargets(B, groups, turn, isBreak) {
  const g = groups[turn];
  if (isBreak) return B.filter(b => b.on && b.n !== 0).map(b => b.n);
  if (!g) return B.filter(b => b.on && b.n !== 0 && b.n !== 8).map(b => b.n);
  const r = B.filter(b => b.on && groupOf(b.n) === g).map(b => b.n);
  return r.length ? r : [8];
}

// ───────────────────────────── balls & rack ─────────────────────────────
function rndOrient() {
  // q = number spot (faces up), p = stripe pole (perpendicular), then a small random tilt
  const a = Math.random() * TAU, b = { p: [Math.cos(a), Math.sin(a), 0], q: [0, 0, 1] };
  const t = Math.random() * TAU, tilt = Math.random() * 0.7;
  rot(b.p, Math.cos(t), Math.sin(t), tilt); rot(b.q, Math.cos(t), Math.sin(t), tilt);
  return b;
}
function mkBall(n, x, y) { const o = rndOrient(); return { n, x, y, vx: 0, vy: 0, on: true, p: o.p, q: o.q }; }
function rackBalls() {
  const slots = new Array(15).fill(0);
  slots[0] = 1; slots[4] = 8;
  const sol = [2, 3, 4, 5, 6, 7], str = [9, 10, 11, 12, 13, 14, 15];
  const s = sol.splice(Math.random() * sol.length | 0, 1)[0], t = str.splice(Math.random() * str.length | 0, 1)[0];
  if (Math.random() < 0.5) { slots[10] = s; slots[14] = t; } else { slots[10] = t; slots[14] = s; }
  const rest = sol.concat(str).sort(() => Math.random() - 0.5);
  for (let i = 0; i < 15; i++) if (!slots[i]) slots[i] = rest.pop();
  const B = [mkBall(0, HEAD_X - 40, H / 2)];
  const sp = 2 * R + 0.4, dx = sp * Math.sqrt(3) / 2;
  let k = 0;
  for (let i = 0; i < 5; i++) for (let j = 0; j <= i; j++) {
    B.push(mkBall(slots[k++], FOOT_X + i * dx + (Math.random() - 0.5) * 0.3, H / 2 + (j - i / 2) * sp + (Math.random() - 0.5) * 0.3));
  }
  return B;
}
function freeAt(B, x, y, skip) {
  return x >= R && x <= W - R && y >= R && y <= H - R && B.every(b => !b.on || b === skip || Math.hypot(b.x - x, b.y - y) >= 2 * R + 0.5);
}
function findFree(B, x, y, skip, maxX = W - R) {
  for (let r = 0; r < 900; r += 6) for (let a = 0; a < TAU; a += Math.max(0.15, 6 / (r || 1))) {
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (px <= maxX && freeAt(B, px, py, skip)) return { x: px, y: py };
  }
  return { x, y };
}

// ───────────────────────────── AI ─────────────────────────────
const travel = v => v / FR_K - FR_A / (FR_K * FR_K) * Math.log(1 + FR_K * v / FR_A);
function speedFor(dist, vEnd = 0) {
  const target = dist + travel(vEnd);
  let lo = 0, hi = MAX_SPEED * 3;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (travel(m) < target) lo = m; else hi = m; }
  return hi;
}
function pathClear(B, x1, y1, x2, y2, ex1, ex2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  for (const b of B) {
    if (!b.on || b.n === ex1 || b.n === ex2) continue;
    let t = ((b.x - x1) * dx + (b.y - y1) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    if (Math.hypot(b.x - x1 - dx * t, b.y - y1 - dy * t) < 2 * R - 1) return false;
  }
  return true;
}
function analytic(B, cx, cy, b, k) {
  const P = POCKETS[k];
  let dx = P.ax - b.x, dy = P.ay - b.y; const d2 = Math.hypot(dx, dy); dx /= d2; dy /= d2;
  if (-dx * P.nx - dy * P.ny < (P.side ? 0.55 : 0.6)) return null;      // bad approach angle
  const gx = b.x - dx * 2 * R, gy = b.y - dy * 2 * R;
  let ex = gx - cx, ey = gy - cy; const d1 = Math.hypot(ex, ey); if (d1 < 2) return null; ex /= d1; ey /= d1;
  const cosCut = ex * dx + ey * dy; if (cosCut < 0.26) return null;
  if (!pathClear(B, cx, cy, gx, gy, 0, b.n) || !pathClear(B, b.x, b.y, P.ax, P.ay, 0, b.n)) return null;
  const vObj = speedFor(d2 + 120);
  const vHit = vObj / Math.max(cosCut, 0.3) / ((1 + E_BALL) / 2);
  const v0 = speedFor(d1, vHit);
  const score = cosCut * cosCut * 1000 / (1 + (d1 + d2 * 1.4) / 1400);
  return { ang: Math.atan2(ey, ex), speed: v0, score, pocket: k, n: b.n, cut: cosCut };
}
function bestShots(B, cx, cy, targets) {
  const out = [];
  for (const n of targets) { const b = B.find(x => x.n === n && x.on); if (!b) continue; for (let k = 0; k < 6; k++) { const a = analytic(B, cx, cy, b, k); if (a) out.push(a); } }
  return out.sort((a, b) => b.score - a.score);
}
function positionValue(B, targets) {
  const cue = B.find(b => b.n === 0); if (!cue || !cue.on) return 0;
  const s = bestShots(B, cue.x, cue.y, targets);
  return s.length ? s[0].score + (s[1] ? s[1].score * 0.3 : 0) : 0;
}
function simulate(B0, cuePos, ang, power, spin) {
  const balls = B0.map(b => ({ n: b.n, x: b.x, y: b.y, vx: 0, vy: 0, on: b.on }));
  const cue = balls.find(b => b.n === 0); cue.on = true;
  if (cuePos) { cue.x = cuePos.x; cue.y = cuePos.y; }
  const sp = power * MAX_SPEED; cue.vx = Math.cos(ang) * sp; cue.vy = Math.sin(ang) * sp;
  const S = { balls, spinF: spin.y, spinS: spin.x, spinUsed: false, cueTravel: 0 };
  const ev = newEv(); ev.cush = null;
  const dt = 1 / 360;
  for (let i = 0; i < 25 / dt; i++) { step(S, dt, ev); if (i % 6 === 0 && stopped(balls)) break; }
  return { balls, ev };
}
function aiPlan(G) {
  const me = G.turn, opp = 1 - me, B = G.balls, cue = B[0];
  const diff = G.diff;
  if (G.isBreak) {
    const pos = { x: HEAD_X - 30 - Math.random() * 60, y: H / 2 + (Math.random() - 0.5) * 160 };
    return { place: pos, ang: Math.atan2(H / 2 - pos.y, FOOT_X - pos.x) + (Math.random() - 0.5) * 0.004, power: 0.97, spin: { x: 0, y: 0 }, called: -1 };
  }
  const targets = legalTargets(B, G.groups, me, false);
  const onEight = G.groups[me] && targets[0] === 8;
  let cands = [];
  if (G.ballInHand) {
    const seen = [];
    for (const n of targets) {
      const b = B.find(x => x.n === n && x.on); if (!b) continue;
      for (let k = 0; k < 6; k++) {
        const P = POCKETS[k]; let dx = P.ax - b.x, dy = P.ay - b.y; const d = Math.hypot(dx, dy); dx /= d; dy /= d;
        for (const dist of [170, 320]) for (const off of [-0.25, 0, 0.25]) {
          const c = Math.cos(off), s = Math.sin(off), ux = dx * c - dy * s, uy = dx * s + dy * c;
          const x = b.x - dx * 2 * R - ux * dist, y = b.y - dy * 2 * R - uy * dist;
          if (!freeAt(B, x, y, cue)) continue;
          const a = analytic(B, x, y, b, k); if (a) { a.place = { x, y }; seen.push(a); }
        }
      }
    }
    cands = seen.sort((a, b) => b.score - a.score);
  } else cands = bestShots(B, cue.x, cue.y, targets);

  const st = { groups: G.groups, turn: me, isBreak: false, onEight, called: -1 };
  const tries = [];
  const top = cands.slice(0, G.ballInHand ? 6 : 8);
  for (const c of top) for (const pm of [1.1, 1.5]) for (const sy of [0, -0.5, 0.5]) {
    tries.push({ ang: c.ang, power: Math.min(1, c.speed * pm / MAX_SPEED), spin: { x: 0, y: sy }, place: c.place, called: c.pocket });
  }
  // safety shots: a direct legal hit on every target ball
  const sPos = G.ballInHand ? (cands[0] && cands[0].place) || findFree(B, W / 2, H / 2, cue) : null;
  const from = sPos || cue;
  for (const n of targets) {
    const b = B.find(x => x.n === n && x.on); if (!b) continue;
    const base = Math.atan2(b.y - from.y, b.x - from.x), dist = Math.hypot(b.y - from.y, b.x - from.x);
    for (const off of [0, 0.6, -0.6]) tries.push({ ang: base + Math.asin(Math.min(0.95, off * 2 * R / Math.max(dist, 2 * R))), power: 0.32, spin: { x: 0, y: 0 }, place: sPos, called: 0 });
  }
  const evalTry = t => {
    const r = simulate(B, t.place, t.ang, t.power, t.spin);
    const res = judge(Object.assign({}, st, { called: t.called }), r.ev);
    let sc;
    if (res.win) sc = 1e6; else if (res.lose) sc = -1e6;
    else if (res.foul) sc = -5000;
    else if (res.keep) {
      const g = G.groups[me] || res.assign;
      sc = 3000 + 150 * r.ev.potted.filter(p => groupOf(p.n) === g).length + positionValue(r.balls, legalTargets(r.balls, { [me]: g, [opp]: g === 'solids' ? 'stripes' : 'solids' }, me, false));
    } else {
      const og = G.groups[opp] || (res.assign ? (res.assign === 'solids' ? 'stripes' : 'solids') : null);
      sc = -800 - 0.6 * positionValue(r.balls, legalTargets(r.balls, { [opp]: og }, opp, false));
    }
    if (diff === 0) sc += Math.random() * 1500;
    return sc;
  };
  let best = null;
  for (const t of tries) { const sc = evalTry(t); if (!best || sc > best.sc) best = Object.assign({ sc }, t); }
  if (!best || best.sc <= -5000) {           // snookered: search kick / bank shots
    const n = diff === 0 ? 36 : 120;
    for (let i = 0; i < n; i++) for (const pw of [0.4, 0.65]) {
      const t = { ang: i / n * TAU, power: pw, spin: { x: 0, y: 0 }, place: sPos, called: 0 };
      const sc = evalTry(t); if (!best || sc > best.sc) best = Object.assign({ sc }, t);
    }
  }
  if (!best) best = { ang: Math.random() * TAU, power: 0.5, spin: { x: 0, y: 0 }, called: 0 };
  const noise = [0.035, 0.012, 0.004][diff], pn = [0.12, 0.06, 0.02][diff];
  const g = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  best.ang += g() * noise; best.power = Math.max(0.05, Math.min(1, best.power * (1 + g() * pn)));
  return best;
}

// ───────────────────────────── audio ─────────────────────────────
const Snd = {
  ac: null, on: true, noise: null, last: 0,
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      const len = this.ac.sampleRate * 0.3, buf = this.ac.createBuffer(1, len, this.ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    } catch (e) { this.ac = null; }
  },
  play(type, vol) {
    if (!this.on || !this.ac || vol < 0.02 || (G && G.demo)) return;
    const ac = this.ac, t = ac.currentTime;
    if (t - this.last < 0.012) return; this.last = t;
    const src = ac.createBufferSource(); src.buffer = this.noise;
    const f = ac.createBiquadFilter(), g = ac.createGain();
    let dur = 0.05;
    if (type === 'ball') {                   // phenolic 'clack': two bright partials plus a noise transient
      f.type = 'bandpass'; f.frequency.value = 3800; f.Q.value = 1.5; dur = 0.025;
      for (const [fr, gn] of [[2650, 0.5], [4300, 0.3]]) {
        const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = fr * (0.97 + Math.random() * 0.06);
        og.gain.setValueAtTime(gn * Math.min(1, vol), t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + 0.06);
      }
    }
    else if (type === 'cush') { f.type = 'lowpass'; f.frequency.value = 380; dur = 0.09; vol *= 1.6; }
    else if (type === 'pocket') { f.type = 'lowpass'; f.frequency.value = 220; dur = 0.22; vol *= 2.2; }
    else { f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1.2; dur = 0.05; }
    g.gain.setValueAtTime(Math.min(1, vol), t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(ac.destination); src.start(t); src.stop(t + dur + 0.02);
    if (type === 'pocket') { const o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.2); og.gain.setValueAtTime(0.25 * Math.min(1, vol), t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + 0.3); }
  },
};

// ───────────────────────────── settings ─────────────────────────────
const store = {
  get(k, d) { try { const v = localStorage.getItem('c8b_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('c8b_' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};
Snd.on = store.get('sound', true);
let longGuide = store.get('guide', true);

// ───────────────────────────── game state ─────────────────────────────
let G = null;
function newGame(mode, diff) {
  G = {
    mode, diff: diff || 0, balls: rackBalls(), turn: 0, groups: [null, null], isBreak: true,
    ballInHand: true, kitchen: true, phase: 'aim', aim: 0, power: 0, spin: { x: 0, y: 0 }, called: -1,
    players: mode === 'cpu' ? [{ name: 'You', cpu: false }, { name: 'Computer', cpu: true }]
      : mode === '2p' ? [{ name: 'Player 1', cpu: false }, { name: 'Player 2', cpu: false }]
        : [{ name: 'Practice', cpu: false }, { name: '—', cpu: false }],
    sinking: [], fx: [], strike: null, msg: null, ai: null, ev: null, S: null, fine: 0, over: false, shots: 0,
  };
  G.aim = Math.atan2(H / 2 - G.balls[0].y, FOOT_X - G.balls[0].x);
  toast(mode === 'practice' ? 'Practice — break when ready' : `${G.players[0].name} to break`);
  startTurn();
}
const human = () => G && !G.players[G.turn].cpu;
const onEight = (t = G.turn) => !!G.groups[t] && remaining(G.balls, G.groups[t]) === 0;
const needCall = () => G.mode !== 'practice' && !G.isBreak && onEight();
function toast(text, dur = 2.4) { if (!G.demo) G.msg = { text, t: 0, dur }; }

function startTurn() {
  G.phase = 'aim'; G.power = 0; G.called = -1; G.spin = { x: 0, y: 0 }; updateSpinBtn();
  if (G.players[G.turn].cpu && !G.over) {
    G.phase = 'cpu';
    const g0 = G;
    setTimeout(() => {
      if (G !== g0 || G.phase !== 'cpu') return;
      const plan = aiPlan(G);
      G.ai = { plan, t: 0, a0: G.aim, from: { x: G.balls[0].x, y: G.balls[0].y } };
    }, 650);
  } else if (needCall()) toast('On the 8-ball — tap a pocket to call it', 3);
}

function shoot(power) {
  const cue = G.balls[0];
  if (needCall() && G.called < 0) { toast('Tap a pocket to call the 8-ball first'); return false; }
  Snd.play('cue', 0.3 + power * 0.7);
  G.strike = { x: cue.x, y: cue.y, ang: G.aim, pull: power * 240, t: 0 };
  for (let i = 0; i < 12; i++) { const a = G.aim + Math.PI + (Math.random() - 0.5) * 2.2, v = 40 + Math.random() * 160; G.fx.push({ x: cue.x - Math.cos(G.aim) * R, y: cue.y - Math.sin(G.aim) * R, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2 + Math.random() * 4, t: 0, life: 0.4 + Math.random() * 0.3 }); }
  const sp = Math.max(0.03, power) * MAX_SPEED;
  cue.vx = Math.cos(G.aim) * sp; cue.vy = Math.sin(G.aim) * sp;
  G.stBefore = { groups: G.groups.slice(), turn: G.turn, isBreak: G.isBreak, onEight: onEight(), called: G.called };
  G.S = { balls: G.balls, spinF: G.spin.y, spinS: G.spin.x, spinUsed: false, cueTravel: 0, render: true };
  G.ev = newEv(); G.phase = 'moving'; G.ballInHand = false; G.power = 0; G.acc = 0; G.potSeen = 0; G.shots++;
  return true;
}

function respotCue() {
  const cue = G.balls[0]; cue.on = true; cue.vx = cue.vy = 0;
  const p = findFree(G.balls, HEAD_X, H / 2, cue); cue.x = p.x; cue.y = p.y;
}
function respot8() {
  const b = G.balls.find(x => x.n === 8); b.on = true; b.vx = b.vy = 0;
  let x = FOOT_X; while (!freeAt(G.balls, x, H / 2, b) && x < W - R) x += 2;
  if (!freeAt(G.balls, x, H / 2, b)) { const p = findFree(G.balls, FOOT_X, H / 2, b); x = p.x; b.y = p.y; } else b.y = H / 2;
  b.x = x;
}

function endShot() {
  const ev = G.ev, st = G.stBefore, me = G.turn, other = 1 - me;
  const scratched = ev.potted.some(p => p.n === 0);
  if (G.mode === 'practice') {
    if (scratched) { respotCue(); G.ballInHand = true; G.kitchen = false; toast('Scratch — ball in hand'); }
    if (ev.potted.some(p => p.n === 8) && G.balls.some(b => b.on && b.n !== 0 && b.n !== 8)) { respot8(); toast('8-ball respotted'); }
    if (!G.balls.some(b => b.on && b.n !== 0)) { toast('Table cleared! New rack'); G.balls = rackBalls(); G.ballInHand = true; G.kitchen = true; G.isBreak = true; return startTurn(); }
    G.isBreak = false; G.kitchen = false; return startTurn();
  }
  const res = judge(st, ev);
  if (res.win || res.lose) {
    const winner = res.win ? me : other;
    G.over = true; G.phase = 'over';
    if (G.demo) setTimeout(() => { if (G && G.demo) startDemo(); }, 2500);
    else setTimeout(() => showOver(winner, res.reason), 900);
    return;
  }
  if (res.respot8) { respot8(); toast('8-ball potted on the break — respotted'); }
  if (scratched) respotCue();
  if (res.assign) {
    G.groups[me] = res.assign; G.groups[other] = res.assign === 'solids' ? 'stripes' : 'solids';
    toast(`${G.players[me].name}: ${res.assign === 'solids' ? 'Solids (1–7)' : 'Stripes (9–15)'}`);
  }
  G.isBreak = false; G.kitchen = false;
  if (res.foul) {
    G.turn = other; G.ballInHand = true;
    toast(`Foul: ${res.foul}. ${G.players[other].name} has ball in hand`, 3.2);
  } else if (!res.keep) {
    G.turn = other;
    if (!res.assign) toast(`${G.players[other].name}'s turn`, 1.6);
  }
  startTurn();
}

// ───────────────────────────── canvas & layout ─────────────────────────────
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const stat = document.createElement('canvas'), sctx = stat.getContext('2d');
let scale = 1, offX = 0, offY = 0, dpr = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  cv.width = stat.width = Math.round(w * dpr); cv.height = stat.height = Math.round(h * dpr);
  scale = Math.min(cv.width / DW, cv.height / DH);
  offX = (cv.width - DW * scale) / 2; offY = (cv.height - DH * scale) / 2;
  drawStatic();
}
const toDesign = e => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) * dpr - offX) / scale, y: ((e.clientY - r.top) * dpr - offY) / scale }; };

function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

// ── lighting: a three-shade lamp hangs over the table ──
const LAMPS = [{ x: W * 0.2, y: H / 2 }, { x: W / 2, y: H / 2 }, { x: W * 0.8, y: H / 2 }], LAMP_H = 1100;
const CLOTHS = [
  { name: 'Green', felt: ['#33c06d', '#17904a', '#0a552c'], cush: ['#1a9a4d', '#0a5129'] },
  { name: 'Blue', felt: ['#4a9cea', '#1f68b4', '#0d3565'], cush: ['#2774c2', '#0e3563'] },
  { name: 'Burgundy', felt: ['#cf4b55', '#972631', '#4f0d15'], cush: ['#a62f3a', '#4d0e16'] },
  { name: 'Slate', felt: ['#6d7682', '#454c57', '#22262c'], cush: ['#525a65', '#202429'] },
];
const CUES = [
  { name: 'Maple', tip: '#3c7fd6', fer: '#f5efe0', shaft: ['#f2dcab', '#d4a462'], joint: '#d9d9d9', fore: '#3d1a0b', inlay: '#d4a63c', wrap: '#151515', butt: '#2a2a2a' },
  { name: 'Ebony', tip: '#2f6fd0', fer: '#f4f1ea', shaft: ['#efd9ab', '#d8b278'], joint: '#c0c4ca', fore: '#0e0e0f', inlay: '#e6e8ee', wrap: '#5b0f14', butt: '#0e0e0f' },
  { name: 'Carbon', tip: '#2a5fb8', fer: '#e8e8e8', shaft: ['#34373c', '#16171a'], joint: '#c62828', fore: '#1d1f23', inlay: '#c62828', wrap: '#0c0c0c', butt: '#c62828' },
];
let clothIdx = store.get('cloth', 0) % CLOTHS.length, cueIdx = store.get('cue', 0) % CUES.length;

const shadowSpr = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.4, 'rgba(0,0,0,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c;
})();

function carpetPattern(c, px) {
  const t = document.createElement('canvas'); t.width = t.height = Math.max(8, Math.round(px));
  const x = t.getContext('2d'), s = t.width / 200; x.scale(s, s);
  x.fillStyle = '#2a0f15'; x.fillRect(0, 0, 200, 200);
  x.strokeStyle = 'rgba(205,160,80,0.13)'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(100, 0); x.lineTo(200, 100); x.lineTo(100, 200); x.lineTo(0, 100); x.closePath(); x.stroke();
  x.beginPath(); x.moveTo(100, 22); x.lineTo(178, 100); x.lineTo(100, 178); x.lineTo(22, 100); x.closePath(); x.strokeStyle = 'rgba(205,160,80,0.10)'; x.stroke();
  for (const [cx, cy] of [[0, 0], [200, 0], [0, 200], [200, 200]]) {
    x.fillStyle = '#10292b'; x.beginPath(); x.arc(cx, cy, 30, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(205,160,80,0.18)'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, 40, 0, TAU); x.stroke();
    x.fillStyle = 'rgba(205,160,80,0.4)'; x.beginPath(); x.arc(cx, cy, 8, 0, TAU); x.fill();
  }
  x.save(); x.translate(100, 100); x.rotate(Math.PI / 4); x.fillStyle = 'rgba(205,160,80,0.38)'; x.fillRect(-14, -14, 28, 28);
  x.fillStyle = '#123638'; x.fillRect(-7, -7, 14, 14); x.restore();
  for (const [cx, cy] of [[100, 0], [0, 100], [200, 100], [100, 200]]) { x.fillStyle = 'rgba(30,90,90,0.7)'; x.beginPath(); x.arc(cx, cy, 6, 0, TAU); x.fill(); }
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

function drawTable(c) {
  const cl = CLOTHS[clothIdx], r = rng(7);
  // drop shadow under the whole table
  c.save(); c.globalAlpha = 0.75; c.drawImage(shadowSpr, -OUT - 160, -OUT - 110, W + 2 * OUT + 320, H + 2 * OUT + 300); c.restore();
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
    g.addColorStop(0, '#4d220b'); g.addColorStop(0.12, '#9a5428'); g.addColorStop(0.3, '#b4672f'); g.addColorStop(0.65, '#7c3f19'); g.addColorStop(0.92, '#55260c'); g.addColorStop(1, '#2a1205');
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
    g.addColorStop(0, '#fbe6a0'); g.addColorStop(0.35, '#c9973c'); g.addColorStop(0.6, '#f2d283'); g.addColorStop(1, '#7a5418');
    c.fillStyle = g; c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(60,35,5,0.6)'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = 'rgba(255,245,210,0.45)'; c.lineWidth = 2; c.beginPath(); c.arc(px, py, pr - 12, 0, TAU); c.stroke();
    for (const a of [0.9, 2.2, 3.6, 5.0]) { c.fillStyle = '#6d4a14'; c.beginPath(); c.arc(px + Math.cos(a) * (pr - 24), py + Math.sin(a) * (pr - 24), 4, 0, TAU); c.fill(); }
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
  c.fillStyle = carpetPattern(c, 220 * scale); c.fillRect(0, 0, stat.width, stat.height);
  c.setTransform(scale, 0, 0, scale, offX, offY);
  // furniture around the table (mostly visible on wide phones)
  stool(c, -170, 1180, 0.3); sideTable(c, -200, 470, 0); stool(c, 2800, 330, 1.2); sideTable(c, 2810, 1090, 1);
  stool(c, 300, 1720, 2); stool(c, 2300, -260, 0.8);
  // warm light over the table, darkness at the edges of the room
  c.setTransform(1, 0, 0, 1, 0, 0);
  const cx = offX + (TX + W / 2) * scale, cy = offY + (TY + H / 2) * scale, far = Math.hypot(stat.width, stat.height) * 0.6;
  const lg = c.createRadialGradient(cx, cy, (H / 2) * scale, cx, cy, Math.max(far, (W * 0.75) * scale));
  lg.addColorStop(0, 'rgba(255,170,80,0.10)'); lg.addColorStop(0.4, 'rgba(10,4,2,0.5)'); lg.addColorStop(1, 'rgba(0,0,0,0.88)');
  c.fillStyle = lg; c.fillRect(0, 0, stat.width, stat.height);
  c.setTransform(scale, 0, 0, scale, offX, offY); c.translate(TX, TY);
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
  if (G.mode === 'practice' || G.isBreak) return true;
  return legalTargets(G.balls, G.groups, G.turn, false).includes(n);
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
      const L = longGuide ? 420 : 160;
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.85)';
      c.beginPath(); c.moveTo(p.hit.x + p.ox * R, p.hit.y + p.oy * R); c.lineTo(p.hit.x + p.ox * (R + L * p.cosA), p.hit.y + p.oy * (R + L * p.cosA)); c.stroke();
      const tl = Math.hypot(p.tx, p.ty);
      if (tl > 0.02) { c.strokeStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.moveTo(p.gx, p.gy); c.lineTo(p.gx + p.tx / tl * L * tl * 0.9, p.gy + p.ty / tl * L * tl * 0.9); c.stroke(); }
    }
  } else if (longGuide) {
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.moveTo(p.gx, p.gy); c.lineTo(p.gx + p.rx * 160, p.gy + p.ry * 160); c.stroke();
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
const MENU_BTN = { x: 90, y: 90, r: 62 }, SPIN_BTN = { x: 2530, y: 90, r: 64 };
function drawHUD(c, t) {
  // menu button
  rr(c, MENU_BTN.x - 60, MENU_BTN.y - 60, 120, 120, 26); { const g = c.createLinearGradient(0, 30, 0, 150); g.addColorStop(0, '#d9a441'); g.addColorStop(1, '#8a5a17'); c.fillStyle = g; } c.fill(); c.strokeStyle = 'rgba(255,240,200,0.5)'; c.lineWidth = 3; c.stroke();
  c.fillStyle = '#fff'; for (let i = -1; i <= 1; i++) { rr(c, MENU_BTN.x - 32, MENU_BTN.y + i * 22 - 6, 64, 12, 6); c.fill(); }
  // spin button
  const sb = SPIN_BTN; const g = c.createRadialGradient(sb.x - 20, sb.y - 22, 4, sb.x, sb.y, sb.r);
  g.addColorStop(0, '#fff'); g.addColorStop(1, '#bdbab0'); c.fillStyle = g; c.beginPath(); c.arc(sb.x, sb.y, sb.r, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; c.beginPath(); c.arc(sb.x, sb.y, sb.r * 0.75, 0, TAU); c.stroke();
  c.fillStyle = '#e02424'; c.beginPath(); c.arc(sb.x + G.spin.x * sb.r * 0.75, sb.y - G.spin.y * sb.r * 0.75, 11, 0, TAU); c.fill();
  // players
  const panel = (i, x0, align) => {
    const active = G.turn === i && !G.over, p = G.players[i];
    if (G.mode === 'practice' && i === 1) return;
    rr(c, x0, 22, 900, 136, 30); c.fillStyle = active ? 'rgba(28,22,18,0.82)' : 'rgba(10,8,8,0.66)'; c.fill(); if (!active) { c.strokeStyle = 'rgba(217,164,65,0.22)'; c.lineWidth = 3; c.stroke(); }
    if (active) { c.strokeStyle = `rgba(240,190,90,${0.65 + 0.35 * Math.sin(t * 5)})`; c.lineWidth = 5; c.stroke(); }
    const ax = align ? x0 + 72 : x0 + 900 - 72;
    c.fillStyle = i ? '#b83280' : '#2b6cb0'; c.beginPath(); c.arc(ax, 90, 54, 0, TAU); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#fff'; c.font = 'bold 54px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(p.cpu ? '🤖' : p.name[0], ax, 93);
    c.font = 'bold 42px system-ui, sans-serif'; c.textAlign = align ? 'left' : 'right'; c.textBaseline = 'alphabetic';
    const nx = align ? ax + 80 : ax - 80;
    c.fillText(p.name, nx, 72);
    const grp = G.groups[i];
    let nums = grp === 'solids' ? [1, 2, 3, 4, 5, 6, 7] : grp === 'stripes' ? [9, 10, 11, 12, 13, 14, 15] : [];
    if (G.mode === 'practice') nums = [];
    for (let k = 0; k < 8; k++) {
      const bx = align ? nx + 26 + k * 60 : nx - 26 - k * 60, by = 120;
      const n = k < 7 ? nums[k] : (grp ? 8 : undefined);
      if (n === undefined) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.arc(bx, by, 24, 0, TAU); c.fill(); continue; }
      const b = G.balls.find(x => x.n === n), dim = b && !b.on;
      if (n === 8 && !onEight(i)) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.arc(bx, by, 24, 0, TAU); c.fill(); continue; }
      drawBall(c, { n, p: [0, 0, 1], q: [0, 0, 1] }, bx, by, 24, dim ? 0.18 : 1);
    }
  };
  panel(0, 180, true); panel(1, 1540, false);
  rr(c, 1130, 30, 360, 120, 30); c.fillStyle = 'rgba(10,8,8,0.6)'; c.fill();
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#e8b64c'; c.font = 'bold 46px Georgia, serif';
  c.fillText(G.mode === 'practice' ? 'PRACTICE' : 'VS', 1310, 70);
  c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = '30px system-ui, sans-serif';
  const status = G.isBreak ? 'Break' : !G.groups[0] ? 'Open table' : G.mode === 'cpu' ? ['Easy', 'Medium', 'Hard'][G.diff] : '8-Ball';
  c.fillText(status, 1310, 120);
}
function drawSide(c, t) {
  // power meter
  const x = 35, y = TY - OUT, h = H + 2 * OUT, wdt = 110;
  rr(c, x, y, wdt, h, 40); c.fillStyle = 'rgba(12,8,6,0.72)'; c.fill(); c.strokeStyle = 'rgba(217,164,65,0.35)'; c.lineWidth = 3; c.stroke();
  const ix = x + 30, iw = 50, iy = y + 70, ih = h - 140;
  rr(c, ix, iy, iw, ih, 25); c.fillStyle = '#0c1118'; c.fill();
  const pw = G.power;
  if (pw > 0) {
    const pg = c.createLinearGradient(0, iy, 0, iy + ih); pg.addColorStop(0, '#3ddc84'); pg.addColorStop(0.55, '#ffd64f'); pg.addColorStop(1, '#ff4d4d');
    c.save(); rr(c, ix, iy, iw, ih, 25); c.clip(); c.fillStyle = pg; c.fillRect(ix, iy, iw, ih * pw); c.restore();
  }
  c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 2;
  for (let i = 1; i < 10; i++) { c.beginPath(); c.moveTo(ix + 8, iy + ih * i / 10); c.lineTo(ix + iw - 8, iy + ih * i / 10); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = 'bold 26px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('POWER', x + wdt / 2, y + 36);
  if (G.phase === 'aim' && human() && pw === 0) { const a = 0.4 + 0.4 * Math.sin(t * 4); c.fillStyle = `rgba(255,255,255,${a})`; c.font = 'bold 50px system-ui'; c.fillText('⇩', x + wdt / 2, y + h - 34); }
  else c.fillText(Math.round(pw * 100) + '%', x + wdt / 2, y + h - 36);
  // fine aim wheel
  const fx = DW - 35 - wdt;
  rr(c, fx, y, wdt, h, 40); c.fillStyle = 'rgba(12,8,6,0.72)'; c.fill(); c.strokeStyle = 'rgba(217,164,65,0.35)'; c.stroke();
  c.save(); rr(c, fx + 20, y + 70, wdt - 40, h - 140, 30); c.clip();
  const wg = c.createLinearGradient(fx, 0, fx + wdt, 0); wg.addColorStop(0, '#555'); wg.addColorStop(0.5, '#bbb'); wg.addColorStop(1, '#555');
  c.fillStyle = wg; c.fillRect(fx, y, wdt, h);
  c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 6;
  const off = ((G.fine % 40) + 40) % 40;
  for (let yy = y + 70 + off - 40; yy < y + h; yy += 40) { c.beginPath(); c.moveTo(fx, yy); c.lineTo(fx + wdt, yy); c.stroke(); }
  const shade = c.createLinearGradient(0, y + 70, 0, y + h - 70); shade.addColorStop(0, 'rgba(0,0,0,0.7)'); shade.addColorStop(0.2, 'rgba(0,0,0,0)'); shade.addColorStop(0.8, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,0.7)');
  c.fillStyle = shade; c.fillRect(fx, y, wdt, h); c.restore();
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = 'bold 26px system-ui'; c.fillText('FINE', fx + wdt / 2, y + 36); c.fillText('AIM', fx + wdt / 2, y + h - 36);
}

function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(stat, 0, 0);
  if (!G) return;
  ctx.setTransform(scale, 0, 0, scale, offX, offY);
  if (!G.demo) { drawHUD(ctx, t); drawSide(ctx, t); }
  ctx.translate(TX, TY);
  const c = ctx;
  // pocket call markers
  if (needCall() && (G.phase === 'aim' || G.phase === 'cpu')) {
    POCKETS.forEach((p, i) => {
      if (G.called === i) { c.strokeStyle = '#ffd64f'; c.lineWidth = 7; c.beginPath(); c.arc(p.x, p.y, p.r + 4 + 4 * Math.sin(t * 6), 0, TAU); c.stroke(); drawBall(c, { n: 8, p: [0, 0, 1], q: [0, 0, 1] }, p.x, p.y, 20); }
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
      const ox = (b.x - L.x) * R * 1.8 / LAMP_H, oy = (b.y - L.y) * R * 1.8 / LAMP_H;
      c.globalAlpha = 0.2; c.drawImage(shadowSpr, b.x + ox - R * 1.3, b.y + oy - R * 1.3, R * 2.6, R * 2.6);
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
  // message banner
  if (G.msg) {
    const m = G.msg, a = Math.min(1, m.t * 5, (m.dur - m.t) * 3);
    if (a > 0) {
      c.save(); c.globalAlpha = a; c.font = 'bold 44px system-ui, sans-serif';
      const tw = Math.min(W - 100, c.measureText(m.text).width + 80);
      rr(c, W / 2 - tw / 2, 40, tw, 84, 42); c.fillStyle = 'rgba(10,14,22,0.82)'; c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(m.text, W / 2, 84, W - 140);
      c.restore();
    }
  }
}

// ───────────────────────────── update loop ─────────────────────────────
function update(dt) {
  if (!G) return;
  if (G.msg) { G.msg.t += dt; if (G.msg.t > G.msg.dur) G.msg = null; }
  G.sinking = G.sinking.filter(s => (s.t += dt) < 0.25);
  G.fx = G.fx.filter(f => { f.t += dt; f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; if (f.vx) { f.vx *= 0.9; f.vy *= 0.9; } return f.t < f.life; });
  if (G.strike && (G.strike.t += dt) > 0.3) G.strike = null;
  if (G.phase === 'moving') {
    G.acc += dt;
    let n = 0;
    while (G.acc >= DT && n < 40) {
      step(G.S, DT, G.ev); G.acc -= DT; n++;
    }
    const ev = G.ev;
    for (const v of ev.hits) Snd.play('ball', v / 2500);
    for (const v of ev.cush) Snd.play('cush', v / 2500);
    ev.hits.length = 0; ev.cush.length = 0;
    for (; G.potSeen < ev.potted.length; G.potSeen++) {
      const p = ev.potted[G.potSeen]; Snd.play('pocket', 0.6);
      G.sinking.push({ b: G.balls.find(b => b.n === p.n), x: p.x, y: p.y, pocket: p.pocket, t: 0 });
      G.fx.push({ ring: true, x: POCKETS[p.pocket].x, y: POCKETS[p.pocket].y, t: 0, life: 0.5 });
      if (navigator.vibrate && !G.demo) try { navigator.vibrate(15); } catch (e) { /* ignore */ }
    }
    if (stopped(G.balls)) endShot();
  } else if (G.phase === 'cpu' && G.ai) {
    const ai = G.ai, pl = ai.plan; ai.t += dt;
    const cue = G.balls[0];
    if (pl.place) {
      const k = Math.min(1, ai.t / 0.5);
      cue.x = ai.from.x + (pl.place.x - ai.from.x) * k; cue.y = ai.from.y + (pl.place.y - ai.from.y) * k;
    }
    if (pl.called >= 0 && needCall()) G.called = pl.called;
    G.spin = pl.spin;
    let d = pl.ang - ai.a0; d = Math.atan2(Math.sin(d), Math.cos(d));
    const ka = Math.min(1, Math.max(0, (ai.t - 0.3) / 0.9)), e = ka * ka * (3 - 2 * ka);
    G.aim = ai.a0 + d * e;
    if (ai.t > 1.3) G.power = Math.min(pl.power, (ai.t - 1.3) / 0.6 * pl.power);
    if (ai.t > 2.1) { G.ai = null; G.aim = pl.ang; shoot(pl.power); }
  }
}

// ───────────────────────────── input ─────────────────────────────
const ptrs = new Map();
const inC = (d, b) => Math.hypot(d.x - b.x, d.y - b.y) < b.r + 10;
function tryPlace(tx, ty) {
  const cue = G.balls[0], maxX = G.kitchen ? HEAD_X : W - R;
  tx = Math.max(R, Math.min(maxX, tx)); ty = Math.max(R, Math.min(H - R, ty));
  if (freeAt(G.balls, tx, ty, cue)) { cue.x = tx; cue.y = ty; }
}
function pocketAt(tx, ty) { for (let i = 0; i < 6; i++) if (Math.hypot(tx - POCKETS[i].x, ty - POCKETS[i].y) < 90) return i; return -1; }
cv.addEventListener('pointerdown', e => {
  if (!G || overlayOpen()) return;
  Snd.init();
  const d = toDesign(e);
  if (inC(d, MENU_BTN)) return openPause();
  if (inC(d, SPIN_BTN)) { if (G.phase === 'aim' && human()) openSpin(); return; }
  if (G.phase !== 'aim' || !human()) return;
  cv.setPointerCapture(e.pointerId);
  const st = { mode: null, y0: d.y, ly: d.y };
  if (d.x < TX - OUT - 5) st.mode = 'power';
  else if (d.x > TX + W + OUT + 5) st.mode = 'fine';
  else {
    const tx = d.x - TX, ty = d.y - TY, cue = G.balls[0];
    if (G.ballInHand && Math.hypot(tx - cue.x, ty - cue.y) < R * 2.8) { st.mode = 'place'; st.dx = cue.x - tx; st.dy = cue.y - ty; }
    else if (needCall() && pocketAt(tx, ty) >= 0) { G.called = pocketAt(tx, ty); toast('Pocket called', 1.2); return; }
    else { st.mode = 'aim'; if (Math.hypot(tx - cue.x, ty - cue.y) > R) G.aim = Math.atan2(ty - cue.y, tx - cue.x); }
  }
  ptrs.set(e.pointerId, st);
});
cv.addEventListener('pointermove', e => {
  const st = ptrs.get(e.pointerId); if (!st || !G || G.phase !== 'aim') return;
  const d = toDesign(e);
  if (st.mode === 'power') G.power = Math.max(0, Math.min(1, (d.y - st.y0) / 850));
  else if (st.mode === 'fine') { G.aim += (d.y - st.ly) * 0.0007; G.fine += d.y - st.ly; st.ly = d.y; }
  else if (st.mode === 'place') tryPlace(d.x - TX + st.dx, d.y - TY + st.dy);
  else if (st.mode === 'aim') { const cue = G.balls[0], tx = d.x - TX, ty = d.y - TY; if (Math.hypot(tx - cue.x, ty - cue.y) > R) G.aim = Math.atan2(ty - cue.y, tx - cue.x); }
});
const endPtr = e => {
  const st = ptrs.get(e.pointerId); ptrs.delete(e.pointerId);
  if (!st || !G || G.phase !== 'aim') return;
  if (st.mode === 'power') { const p = G.power; G.power = 0; if (p > 0.02 && e.type === 'pointerup') shoot(p); }
};
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
window.addEventListener('keydown', e => {
  if (!G || G.phase !== 'aim' || !human() || overlayOpen()) return;
  const s = e.shiftKey ? 0.002 : 0.02;
  if (e.key === 'ArrowLeft') G.aim -= s; else if (e.key === 'ArrowRight') G.aim += s;
  else if (e.key === 'ArrowUp') G.power = Math.max(0, G.power - 0.05); else if (e.key === 'ArrowDown') G.power = Math.min(1, G.power + 0.05);
  else if (e.key === ' ' && G.power > 0.02) { Snd.init(); const p = G.power; G.power = 0; shoot(p); }
  else return;
  e.preventDefault();
});

// ───────────────────────────── overlays ─────────────────────────────
const $ = id => document.getElementById(id);
const overlayOpen = () => document.querySelector('.overlay.show') !== null;
function show(id) { document.querySelectorAll('.overlay').forEach(o => o.classList.toggle('show', o.id === id)); }
function hideAll() { show(null); }
function openPause() { if (G.phase === 'moving') return; show('pause'); syncToggles(); }
function showOver(winner, reason) {
  const p = G.players[winner];
  $('overTitle').textContent = G.mode === 'cpu' ? (winner === 0 ? 'You win! 🏆' : 'Computer wins') : `${p.name} wins! 🏆`;
  $('overReason').textContent = reason;
  show('over');
}
function updateSpinBtn() {
  const dot = $('spinDot'); if (!dot || !G) return;
  dot.style.left = 50 + G.spin.x * 40 + '%'; dot.style.top = 50 - G.spin.y * 40 + '%';
}
function openSpin() { show('spinPanel'); updateSpinBtn(); }
const spinBall = $('spinBall');
function setSpinFrom(e) {
  const r = spinBall.getBoundingClientRect();
  let x = ((e.clientX - r.left) / r.width - 0.5) / 0.4, y = -((e.clientY - r.top) / r.height - 0.5) / 0.4;
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  G.spin = { x, y }; updateSpinBtn();
}
spinBall.addEventListener('pointerdown', e => { spinBall.setPointerCapture(e.pointerId); setSpinFrom(e); });
spinBall.addEventListener('pointermove', e => { if (e.buttons) setSpinFrom(e); });
$('spinReset').onclick = () => { G.spin = { x: 0, y: 0 }; updateSpinBtn(); };
$('spinDone').onclick = hideAll;
$('spinPanel').addEventListener('pointerdown', e => { if (e.target.id === 'spinPanel') hideAll(); });

let pendingMode = null;
function start(mode, diff) {
  Snd.init();
  try { const de = document.documentElement; if (de.requestFullscreen && !document.fullscreenElement) de.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) { /* ignore */ }
  pendingMode = [mode, diff];
  newGame(mode, diff); hideAll();
}
$('btnCpu').onclick = () => { $('diffRow').classList.toggle('show'); };
document.querySelectorAll('[data-diff]').forEach(b => { b.onclick = () => start('cpu', +b.dataset.diff); });
$('btn2p').onclick = () => start('2p');
$('btnPractice').onclick = () => start('practice');
$('btnResume').onclick = hideAll;
$('btnRestart').onclick = () => { if (pendingMode) start(...pendingMode); };
$('btnQuit').onclick = goMenu;
$('btnAgain').onclick = () => { if (pendingMode) start(...pendingMode); };
$('btnMenu').onclick = goMenu;
function startDemo() { newGame('cpu', 1); G.demo = true; G.players.forEach(p => { p.cpu = true; }); G.msg = null; startTurn(); }
function goMenu() { $('diffRow').classList.remove('show'); show('menu'); syncToggles(); startDemo(); }
// Android back button (called from the app wrapper): returns true when handled
window.__back = () => {
  if ($('menu').classList.contains('show')) return false;
  if ($('over').classList.contains('show')) { goMenu(); return true; }
  if (overlayOpen()) { hideAll(); return true; }
  if (G && !G.demo) { if (G.phase === 'moving') return true; openPause(); return true; }
  return false;
};
function syncToggles() {
  document.querySelectorAll('.tSound').forEach(b => { b.textContent = 'Sound: ' + (Snd.on ? 'On' : 'Off'); });
  document.querySelectorAll('.tGuide').forEach(b => { b.textContent = 'Aim guide: ' + (longGuide ? 'Long' : 'Short'); });
  document.querySelectorAll('.tCloth').forEach(b => { b.textContent = 'Cloth: ' + CLOTHS[clothIdx].name; });
  document.querySelectorAll('.tCue').forEach(b => { b.textContent = 'Cue: ' + CUES[cueIdx].name; });
}
document.querySelectorAll('.tCloth').forEach(b => { b.onclick = () => { clothIdx = (clothIdx + 1) % CLOTHS.length; store.set('cloth', clothIdx); drawStatic(); syncToggles(); }; });
document.querySelectorAll('.tCue').forEach(b => { b.onclick = () => { cueIdx = (cueIdx + 1) % CUES.length; store.set('cue', cueIdx); syncToggles(); }; });
document.querySelectorAll('.tSound').forEach(b => { b.onclick = () => { Snd.on = !Snd.on; store.set('sound', Snd.on); syncToggles(); }; });
document.querySelectorAll('.tGuide').forEach(b => { b.onclick = () => { longGuide = !longGuide; store.set('guide', longGuide); syncToggles(); }; });
syncToggles();

// ───────────────────────────── main loop ─────────────────────────────
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); render(now / 1000);
  requestAnimationFrame(frame);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize(); goMenu(); requestAnimationFrame(frame);

// test hooks (harmless in production)
window.__pool = { get G() { return G; }, newGame, step, judge, simulate, aiPlan, shoot, endShot, newEv, stopped, rackBalls, DT };
})();
