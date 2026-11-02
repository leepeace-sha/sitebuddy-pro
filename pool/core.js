/* Clubhouse 8-Ball — engine: table geometry, physics, rules for each game type, and the computer player.
   Pure logic (no DOM), shared by the game and by the test scripts. */
'use strict';
// ───────────────────────────── constants ─────────────────────────────
const TAU = Math.PI * 2;
const W = 2000, H = 1000, R = 25;            // playing surface & ball radius
const CUSH = 45, WOOD = 85, OUT = CUSH + WOOD;
const HEAD_X = W * 0.25, FOOT_X = W * 0.75;
const MAX_SPEED = 5200;
const FR_A = 140, FR_K = 0.32;               // rolling friction: dv/dt = -(A + K v)
const E_BALL = 0.95, E_CUSH = 0.78;
const DT = 1 / 480;
const TX = 310, TY = 310;                    // landscape table origin
const PCX = 650, PCY = 1450;                 // portrait table centre
let DW = 2620, DH = 1460, PORT = false;      // design space (switches with orientation)
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
function seg(ax, ay, bx, by, jaw = false) { const dx = bx - ax, dy = by - ay; SEGS.push({ ax, ay, dx, dy, l2: dx * dx + dy * dy, jaw }); }
function cushion(ax, ay, bx, by, jax, jay, jbx, jby) {
  seg(ax, ay, bx, by); seg(ax, ay, jax, jay, true); seg(bx, by, jbx, jby, true);
  CUSHIONS.push([[ax, ay], [bx, by], [jbx, jby], [jax, jay]]);
}
cushion(C, 0, W / 2 - M, 0, C - 26, -J, W / 2 - M + 10, -J);
cushion(W / 2 + M, 0, W - C, 0, W / 2 + M - 10, -J, W - C + 26, -J);
cushion(C, H, W / 2 - M, H, C - 26, H + J, W / 2 - M + 10, H + J);
cushion(W / 2 + M, H, W - C, H, W / 2 + M - 10, H + J, W - C + 26, H + J);
cushion(0, C, 0, H - C, -J, C - 26, -J, H - C + 26);
cushion(W, C, W, H - C, W + J, C - 26, W + J, H - C + 26);

// ───────────────────────────── physics engine ─────────────────────────────
function newEv() { return { first: null, railAfter: false, potted: [], railBalls: new Set(), hits: [], cush: [], maxHit: 0 }; }

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
    if (b.n === 0) {
      S.cueTravel += sp * dt;
      // swerve: side spin bends the cue ball slightly before it reaches the object ball
      if (S.spinS && !S.spinUsed && sp > 250) {
        const a = S.spinS * 240 * Math.exp(-S.cueTravel / 1000) * dt, nx = -b.vy / sp, ny = b.vx / sp;
        b.vx += nx * a; b.vy += ny * a;
      }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
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
        if (!s.jaw) ev.railBalls.add(b.n);
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
      // cut-induced throw: contact friction drags the object ball slightly along the cue ball's path
      const tx = -ny, ty = nx, vt = (a.vx - b.vx) * tx + (a.vy - b.vy) * ty;
      const jt = Math.sign(vt) * Math.min(Math.abs(vt) / 7, 0.035 * imp);
      a.vx -= jt * tx; a.vy -= jt * ty; b.vx += jt * tx; b.vy += jt * ty;
      if (rv > ev.maxHit) ev.maxHit = rv;
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
      if (dx * dx + dy * dy < p.r * p.r) {
        // a fast ball arriving off-line rattles in the jaws instead of dropping
        const sp = Math.hypot(b.vx, b.vy), cosA = sp ? -(b.vx * p.nx + b.vy * p.ny) / sp : 1;
        const vmax = p.side ? 2600 * Math.max(0.12, cosA * cosA * cosA) : 3300 * (0.35 + 0.65 * cosA * cosA);
        if (sp > vmax) {
          const d = Math.sqrt(dx * dx + dy * dy) || 1, rx = dx / d, ry = dy / d, vn = b.vx * rx + b.vy * ry;
          if (vn > 0) { b.vx -= 1.45 * vn * rx; b.vy -= 1.45 * vn * ry; b.vx *= 0.7; b.vy *= 0.7; }
          b.x = p.x + rx * (p.r + 0.5); b.y = p.y + ry * (p.r + 0.5);
          if (ev.cush) ev.cush.push(sp * 0.5);
          continue;
        }
        k = i; break;
      }
    }
    if (k < 0 && (b.x < -R || b.x > W + R || b.y < -R || b.y > H + R)) {
      let bd = Infinity;
      POCKETS.forEach((p, i) => { const d = Math.hypot(b.x - p.x, b.y - p.y); if (d < bd) { bd = d; k = i; } });
    }
    if (k >= 0) { ev.potted.push({ n: b.n, pocket: k, x: b.x, y: b.y, bank: ev.railBalls.has(b.n) && b.n !== 0 }); b.on = false; b.vx = b.vy = 0; }
  }
}
const stopped = B => B.every(b => !b.on || (b.vx === 0 && b.vy === 0));

// ───────────────────────────── rules ─────────────────────────────
function judge8(st, ev) {
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
// 9-ball: hit the lowest ball first; any legal pot keeps the table; the 9 wins.
function judge9(st, ev) {
  const pot = ev.potted.filter(p => p.n !== 0), scratch = ev.potted.some(p => p.n === 0);
  let foul = null;
  if (scratch) foul = 'Scratch — the cue ball was potted';
  else if (ev.first === null) foul = 'No ball was hit';
  else if (ev.first !== st.lowest) foul = `You must hit the ${st.lowest}-ball first`;
  else if (!st.isBreak && pot.length === 0 && !ev.railAfter) foul = 'No ball hit a cushion after contact';
  const nine = pot.some(p => p.n === 9);
  if (nine && !foul) return { win: true, golden: st.isBreak, reason: st.isBreak ? 'Golden break — the 9 went in on the break' : 'Potted the 9-ball' };
  return { foul, respot9: nine && !!foul, keep: !foul && pot.length > 0 };
}
// Straight pool (14.1, casual): every legally potted ball scores a point, a foul costs a point.
function judge14(st, ev) {
  const pot = ev.potted.filter(p => p.n !== 0), scratch = ev.potted.some(p => p.n === 0);
  let foul = null;
  if (scratch) foul = 'Scratch — the cue ball was potted';
  else if (ev.first === null) foul = 'No ball was hit';
  else if (pot.length === 0 && !ev.railAfter) foul = 'No ball hit a cushion after contact';
  const points = foul ? 0 : pot.length;
  return { foul, points, keep: !foul && pot.length > 0, win: !foul && st.score + points >= st.target, reason: `Reached ${st.target} points` };
}
const lowestOn = B => { let m = 99; for (const b of B) if (b.on && b.n && b.n < m) m = b.n; return m; };
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
function rack9() {
  const B = [mkBall(0, HEAD_X - 40, H / 2)], sp = 2 * R + 0.4, dx = sp * Math.sqrt(3) / 2;
  const rows = [1, 2, 3, 2, 1], others = [2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5);
  let k = 0;
  rows.forEach((n, i) => { for (let j = 0; j < n; j++) {
    const num = k === 0 ? 1 : k === 4 ? 9 : others.pop(); k++;
    B.push(mkBall(num, FOOT_X + i * dx + (Math.random() - 0.5) * 0.3, H / 2 + (j - (n - 1) / 2) * sp + (Math.random() - 0.5) * 0.3));
  } });
  return B;
}
// 15-ball triangle positions (apex first) for straight pool racks and re-racks
function trianglePos() {
  const out = [], sp = 2 * R + 0.4, dx = sp * Math.sqrt(3) / 2;
  for (let i = 0; i < 5; i++) for (let j = 0; j <= i; j++) out.push({ x: FOOT_X + i * dx, y: H / 2 + (j - i / 2) * sp });
  return out;
}
function rack14() {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].sort(() => Math.random() - 0.5);
  return [mkBall(0, HEAD_X - 40, H / 2)].concat(trianglePos().map((p, i) => mkBall(nums[i], p.x, p.y)));
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
  if (!pathClear(B, b.x, b.y, P.ax, P.ay, 0, b.n)) return null;
  return aimAt(B, cx, cy, b, dx, dy, d2, k, 1);
}
// shared: aim the object ball along (dx, dy) for a remaining travel `d2`
function aimAt(B, cx, cy, b, dx, dy, d2, k, quality) {
  const gx = b.x - dx * 2 * R, gy = b.y - dy * 2 * R;
  let ex = gx - cx, ey = gy - cy; const d1 = Math.hypot(ex, ey); if (d1 < 2) return null; ex /= d1; ey /= d1;
  const cosCut = ex * dx + ey * dy; if (cosCut < 0.26) return null;
  if (!pathClear(B, cx, cy, gx, gy, 0, b.n)) return null;
  const vObj = speedFor(d2 + 120);
  const vHit = vObj / Math.max(cosCut, 0.3) / ((1 + E_BALL) / 2);
  const v0 = speedFor(d1, vHit);
  const score = quality * cosCut * cosCut * 1000 / (1 + (d1 + d2 * 1.4) / 1400);
  return { ang: Math.atan2(ey, ex), speed: v0, score, pocket: k, n: b.n, cut: cosCut };
}
// one-cushion bank: mirror the pocket across a rail and aim the object ball at the mirror image
function analyticBank(B, cx, cy, b, k) {
  const P = POCKETS[k], out = [];
  const rails = [{ ax: 'y', v: R }, { ax: 'y', v: H - R }, { ax: 'x', v: R }, { ax: 'x', v: W - R }];
  for (const rl of rails) {
    const mx = rl.ax === 'x' ? 2 * rl.v - P.ax : P.ax, my = rl.ax === 'y' ? 2 * rl.v - P.ay : P.ay;
    let dx = mx - b.x, dy = my - b.y; const dm = Math.hypot(dx, dy); dx /= dm; dy /= dm;
    const t = rl.ax === 'x' ? (rl.v - b.x) / dx : (rl.v - b.y) / dy;
    if (!(t > 3 * R) || !isFinite(t)) continue;
    const qx = b.x + dx * t, qy = b.y + dy * t;
    if (rl.ax === 'y' && (qx < C + 2 * R || qx > W - C - 2 * R || Math.abs(qx - W / 2) < M + 2 * R)) continue;
    if (rl.ax === 'x' && (qy < C + 2 * R || qy > H - C - 2 * R)) continue;
    let px = P.ax - qx, py = P.ay - qy; const dp = Math.hypot(px, py); px /= dp; py /= dp;
    if (-px * P.nx - py * P.ny < (P.side ? 0.55 : 0.6)) continue;
    if (!pathClear(B, b.x, b.y, qx, qy, 0, b.n) || !pathClear(B, qx, qy, P.ax, P.ay, 0, b.n)) continue;
    const a = aimAt(B, cx, cy, b, dx, dy, (t + dp) / 0.78, k, 0.55);
    if (a) { a.bank = true; out.push(a); }
  }
  return out;
}
function bestShots(B, cx, cy, targets, banks = false) {
  const out = [];
  for (const n of targets) {
    const b = B.find(x => x.n === n && x.on); if (!b) continue;
    for (let k = 0; k < 6; k++) { const a = analytic(B, cx, cy, b, k); if (a) out.push(a); if (banks) out.push(...analyticBank(B, cx, cy, b, k)); }
  }
  return out.sort((a, b) => b.score - a.score);
}
function positionValue(B, targets) {
  const cue = B.find(b => b.n === 0); if (!cue || !cue.on) return 0;
  const s = bestShots(B, cue.x, cue.y, targets);
  return s.length ? s[0].score + (s[1] ? s[1].score * 0.3 : 0) : 0;
}
function simulate(B0, cuePos, ang, power, spin, powerMul = 1) {
  const balls = B0.map(b => ({ n: b.n, x: b.x, y: b.y, vx: 0, vy: 0, on: b.on }));
  const cue = balls.find(b => b.n === 0); cue.on = true;
  if (cuePos) { cue.x = cuePos.x; cue.y = cuePos.y; }
  const sp = power * MAX_SPEED * powerMul; cue.vx = Math.cos(ang) * sp; cue.vy = Math.sin(ang) * sp;
  const S = { balls, spinF: spin.y, spinS: spin.x, spinUsed: false, cueTravel: 0 };
  const ev = newEv(); ev.cush = null;
  const dt = 1 / 360;
  for (let i = 0; i < 25 / dt; i++) { step(S, dt, ev); if (i % 6 === 0 && stopped(balls)) break; }
  return { balls, ev };
}
// ───────────────────────────── rule sets ─────────────────────────────
// Each game type tells the shared flow (and the AI) how to rack, judge a shot and find legal targets.
const other = g => (g === 'solids' ? 'stripes' : g === 'stripes' ? 'solids' : null);
const RULES = {
  '8ball': {
    rack: rackBalls,
    snapshot: G => ({ groups: G.groups.slice(), turn: G.turn, isBreak: G.isBreak, called: G.called,
      onEight: !!G.groups[G.turn] && remaining(G.balls, G.groups[G.turn]) === 0 }),
    judge: judge8,
    targets: (B, st, who) => legalTargets(B, st.groups, who, st.isBreak),
    next: (st, res, me) => { const g = st.groups.slice(); if (res.assign) { g[me] = res.assign; g[1 - me] = other(res.assign); } return { groups: g, isBreak: false }; },
    counts: (n, st, res, me) => { const g = st.groups[me] || res.assign; return n !== 8 && (!g || groupOf(n) === g); },
  },
  '9ball': {
    rack: rack9,
    snapshot: G => ({ turn: G.turn, isBreak: G.isBreak, lowest: lowestOn(G.balls) }),
    judge: judge9,
    targets: B => [lowestOn(B)],
    next: () => ({}),
    counts: () => true,
  },
  'straight': {
    rack: rack14,
    snapshot: G => ({ turn: G.turn, isBreak: G.isBreak, score: G.score[G.turn], target: G.target }),
    judge: judge14,
    targets: B => B.filter(b => b.on && b.n).map(b => b.n),
    next: () => ({}),
    counts: () => true,
  },
};

// ───────────────────────────── computer players ─────────────────────────────
// Skill = how accurately the chosen shot is executed. Style = how shots are chosen.
const STYLES = {
  balanced:   { pos: 1.0, def: 0.6, miss: -800, pm: [1.1, 1.5], banks: false },
  aggressive: { pos: 0.5, def: 0.2, miss: -350, pm: [1.3, 1.9], banks: false, noSafety: true },
  safe:       { pos: 1.2, def: 1.4, miss: -1000, pm: [1.05, 1.35], banks: false },
  banker:     { pos: 1.0, def: 0.6, miss: -800, pm: [1.15, 1.6], banks: true },
};
const SKILLS = [
  { noise: 0.035, pn: 0.12, rand: 1500, kicks: 36 },   // 0 rookie
  { noise: 0.016, pn: 0.07, rand: 400, kicks: 72 },    // 1 regular
  { noise: 0.009, pn: 0.04, rand: 0, kicks: 120 },     // 2 shark
  { noise: 0.004, pn: 0.02, rand: 0, kicks: 120 },     // 3 pro
  { noise: 0.0018, pn: 0.012, rand: 0, kicks: 160 },   // 4 champion
];
// The planner is a generator so the game can spread its work across animation frames.
function aiPlan(G, persona) { const it = aiPlanGen(G, persona); let r; while (!(r = it.next()).done); return r.value; }
function* aiPlanGen(G, persona = { skill: 2, style: 'balanced' }) {
  const rules = RULES[G.game], me = G.turn, opp = 1 - me, B = G.balls, cue = B[0];
  const sk = SKILLS[persona.skill], sty = STYLES[persona.style] || STYLES.balanced;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  if (G.isBreak) {
    const pos = { x: HEAD_X - 30 - Math.random() * 60, y: H / 2 + (Math.random() - 0.5) * 160 };
    return { place: pos, ang: Math.atan2(H / 2 - pos.y, FOOT_X - pos.x) + gauss() * sk.noise * 0.3, power: sty.noSafety ? 1 : 0.95, spin: { x: 0, y: 0 }, called: -1 };
  }
  const st = rules.snapshot(G), targets = rules.targets(B, st, me);
  const placeOk = (x, y) => freeAt(B, x, y, cue) && (!G.kitchen || x <= HEAD_X);
  let cands = [];
  if (G.ballInHand) {
    for (const n of targets) {
      const b = B.find(x => x.n === n && x.on); if (!b) continue;
      for (let k = 0; k < 6; k++) {
        const P = POCKETS[k]; let dx = P.ax - b.x, dy = P.ay - b.y; const d = Math.hypot(dx, dy); dx /= d; dy /= d;
        for (const dist of [170, 320]) for (const off of [-0.25, 0, 0.25]) {
          const c = Math.cos(off), s = Math.sin(off), ux = dx * c - dy * s, uy = dx * s + dy * c;
          const x = b.x - dx * 2 * R - ux * dist, y = b.y - dy * 2 * R - uy * dist;
          if (!placeOk(x, y)) continue;
          const a = analytic(B, x, y, b, k); if (a) { a.place = { x, y }; cands.push(a); }
        }
      }
    }
    cands.sort((a, b) => b.score - a.score);
  } else cands = bestShots(B, cue.x, cue.y, targets, sty.banks);

  const tries = [];
  for (const c of cands.slice(0, G.ballInHand ? 6 : 8)) for (const pm of sty.pm) for (const sy of [0, -0.5, 0.5]) {
    tries.push({ ang: c.ang, power: Math.min(1, c.speed * pm / MAX_SPEED), spin: { x: 0, y: sy }, place: c.place, called: c.pocket });
  }
  let sPos = null;
  if (G.ballInHand) {
    sPos = cands[0] && cands[0].place;
    if (!sPos) { const p = findFree(B, G.kitchen ? HEAD_X * 0.6 : W / 2, H / 2, cue, G.kitchen ? HEAD_X : W - R); sPos = p; }
  }
  const from = sPos || cue;
  if (!(sty.noSafety && tries.length)) for (const n of targets) {      // safeties: a soft legal hit on each target
    const b = B.find(x => x.n === n && x.on); if (!b) continue;
    const base = Math.atan2(b.y - from.y, b.x - from.x), dist = Math.hypot(b.y - from.y, b.x - from.x);
    for (const off of [0, 0.6, -0.6]) for (const pw of [0.22, 0.34]) tries.push({ ang: base + Math.asin(Math.min(0.95, off * 2 * R / Math.max(dist, 2 * R))), power: pw, spin: { x: 0, y: 0 }, place: sPos, called: 0 });
  }
  const evalTry = t => {
    const r = simulate(B, t.place, t.ang, t.power, t.spin);
    const res = rules.judge(Object.assign({}, st, { called: t.called }), r.ev);
    let sc;
    if (res.win) sc = 1e6; else if (res.lose) sc = -1e6;
    else if (res.foul) sc = -5000;
    else if (res.keep) {
      const nx = rules.next(st, res, me);
      const mine = r.ev.potted.filter(p => p.n && rules.counts(p.n, st, res, me)).length;
      sc = 3000 + 150 * mine + (res.points || 0) * 100 + sty.pos * positionValue(r.balls, rules.targets(r.balls, nx, me));
    } else {
      const nx = rules.next(st, res, me);
      sc = sty.miss - sty.def * positionValue(r.balls, rules.targets(r.balls, nx, opp));
    }
    return sc + Math.random() * sk.rand;
  };
  let best = null;
  for (const t of tries) { const sc = evalTry(t); if (!best || sc > best.sc) best = Object.assign({ sc }, t); yield; }
  if (!best || best.sc <= -5000) {           // snookered: search kick / bank shots
    for (let i = 0; i < sk.kicks; i++) for (const pw of [0.4, 0.65]) {
      const t = { ang: i / sk.kicks * TAU, power: pw, spin: { x: 0, y: 0 }, place: sPos, called: 0 };
      const sc = evalTry(t); if (!best || sc > best.sc) best = Object.assign({ sc }, t); yield;
    }
  }
  if (!best) best = { ang: Math.random() * TAU, power: 0.5, spin: { x: 0, y: 0 }, called: 0 };
  best.ang += gauss() * sk.noise; best.power = Math.max(0.05, Math.min(1, best.power * (1 + gauss() * sk.pn)));
  return best;
}
