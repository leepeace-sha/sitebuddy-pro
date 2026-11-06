/* Clubhouse 8-Ball — game flow and everything around it: career, quick play, trick shots, tutorial,
   shop, stats and achievements, replays, shot clock, settings, input and menus. */
'use strict';

// ───────────────────────────── storage, settings, profile ─────────────────────────────
const store = {
  get(k, d) { try { const v = localStorage.getItem('c8b_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('c8b_' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};
const SET = Object.assign({ sound: store.get('sound', true), haptics: true, guide: store.get('guide', true), clock: 0, bigNums: false, lefty: false, voices: true }, store.get('settings', {}));
let longGuide = SET.guide;
const saveSet = () => store.set('settings', SET);

const STATS0 = { played: 0, won: 0, lost: 0, streak: 0, bestStreak: 0, potted: 0, shots: 0, fouls: 0, bestRun: 0, banks: 0, bestMulti: 0, eightBreaks: 0, golden: 0, coinsEarned: 0, games2p: 0 };
const PROFILE0 = () => ({ coins: 150, owned: { cue: [0], cloth: [0, 1], room: [0] }, equip: { cue: 0, cloth: 0, room: 0 }, career: [], puzzles: [], ach: {}, tutorial: false, stats: Object.assign({}, STATS0),
  name: '', look: L_({ skin: SKINS[1], hair: 'short', hairColor: HAIR_COLORS[1], top: 'tee', topColor: TOP_COLORS[0], bg: BG_COLORS[0], seed: 0 }),
  xp: 0, level: 1, cueLv: {}, trophies: [0, 0, 0, 0], tour: null, daily: { last: '', streak: 0 }, lockOwned: [] });
let prof = Object.assign(PROFILE0(), store.get('profile', {}));
prof.stats = Object.assign({}, STATS0, prof.stats);
prof.look = Object.assign(PROFILE0().look, prof.look);
// earlier versions had a career ladder; finished halls become World Tour trophies
if (prof.ach.hall1 && !prof.trophies[0]) prof.trophies[0] = 1;
if (prof.ach.hall2 && !prof.trophies[1]) prof.trophies[1] = 1;
const saveProf = () => store.set('profile', prof);
function applyEquip() { cueIdx = prof.equip.cue; clothIdx = prof.equip.cloth; roomIdx = prof.equip.room; }
applyEquip(); bigNums = SET.bigNums; lefty = SET.lefty; applyHand(); Snd.on = SET.sound; Snd.voices = SET.voices;

// ───────────────────────────── achievements & coins ─────────────────────────────
const ACH = [
  { id: 'tutorial', name: 'Fast Learner', desc: 'Finish the tutorial', coins: 50 },
  { id: 'first_win', name: 'First Win', desc: 'Beat the computer', coins: 50 },
  { id: 'ten_wins', name: 'Regular', desc: 'Win 10 games', coins: 150 },
  { id: 'fifty_wins', name: 'Hustler', desc: 'Win 50 games', coins: 500 },
  { id: 'streak3', name: 'Hot Streak', desc: 'Win 3 games in a row', coins: 120 },
  { id: 'clean', name: 'Clean Game', desc: 'Win without a single foul', coins: 100 },
  { id: 'break_run', name: 'Break and Run', desc: 'Win an 8-ball game before your opponent takes a shot', coins: 250 },
  { id: 'comeback', name: 'Comeback Kid', desc: 'Win after your opponent was on the 8-ball', coins: 150 },
  { id: 'eight_break', name: '8 on the Break', desc: 'Pot the 8-ball on the break', coins: 100 },
  { id: 'golden', name: 'Golden Break', desc: 'Pot the 9 on the break in 9-ball', coins: 200 },
  { id: 'run5', name: 'On a Roll', desc: 'Pot 5 balls in one visit', coins: 75 },
  { id: 'run8', name: 'Table Runner', desc: 'Pot 8 balls in one visit', coins: 200 },
  { id: 'double', name: 'Double Trouble', desc: 'Pot 2 balls with one shot (not the break)', coins: 50 },
  { id: 'triple', name: 'Hat Trick', desc: 'Pot 3 balls with one shot (not the break)', coins: 150 },
  { id: 'bank', name: 'Bank Shot', desc: 'Pot a ball off a cushion', coins: 50 },
  { id: 'banker', name: 'Bank Manager', desc: 'Pot 10 bank shots', coins: 150 },
  { id: 'century', name: 'Century', desc: 'Pot 100 balls', coins: 100 },
  { id: 'nine_win', name: 'Nine Lives', desc: 'Win a game of 9-ball', coins: 75 },
  { id: 'straight_win', name: 'Straight Shooter', desc: 'Win a game of straight pool', coins: 100 },
  { id: 'hall1', name: 'Local Legend', desc: 'Win the Corner Pocket Cup', coins: 200 },
  { id: 'hall2', name: 'Club Champion', desc: 'Win the Kingsley Club Open', coins: 400 },
  { id: 'hall_neon', name: 'Night Owl', desc: 'Win Neon Nights 9-Ball', coins: 600 },
  { id: 'hall3', name: 'World Champion', desc: 'Win the Grand Championship', coins: 1000 },
  { id: 'puzzle5', name: 'Trick Shot Artist', desc: 'Solve 5 trick shots', coins: 150 },
  { id: 'puzzle_all', name: 'Trick Shot Master', desc: 'Solve every trick shot', coins: 400 },
  { id: 'shop', name: 'Treat Yourself', desc: 'Buy something in the shop', coins: 25 },
];
function addCoins(n) { prof.coins += n; prof.stats.coinsEarned += n; if (G && !G.demo) G.earned += n; saveProf(); syncCoins(); }
function unlock(id) {
  if (prof.ach[id] || (G && G.demo)) return;
  const a = ACH.find(x => x.id === id); if (!a) return;
  prof.ach[id] = Date.now(); addCoins(a.coins);
  notify(`🏆 ${a.name} · +${a.coins} credits`);
  if (G) G.newAch.push(a);
}

// ───────────────────────────── trick shots ─────────────────────────────
// Each puzzle: cue position, balls [number, x, y], balls that must be potted, shots allowed.
const PUZZLES = [
  { title: 'Warm Up', text: 'Pot the 1-ball. Take your time lining it up.', cue: [1250, 520], balls: [[1, 1780, 190]], pot: [1], shots: 1, coins: 30 },
  { title: 'Side Door', text: 'Pot the 1-ball in the side pocket.', cue: [600, 760], balls: [[1, 1060, 130]], pot: [1], shots: 1, coins: 30 },
  { title: 'Stop Right There', text: 'Pot the 1-ball without the cue ball following it in. Try backspin.', cue: [1450, 450], balls: [[1, 1800, 800]], pot: [1], shots: 1, coins: 40 },
  { title: 'Thin Cut', text: 'Cut the 1-ball along the rail into the corner.', cue: [1100, 560], balls: [[1, 1720, 60], [9, 1300, 260]], pot: [1], shots: 1, coins: 40 },
  { title: 'Combination', text: 'Hit the 1-ball first and use it to pot the 2-ball.', cue: [1000, 300], balls: [[1, 1560, 600], [2, 1780, 820]], pot: [2], first: 1, shots: 1, coins: 50 },
  { title: 'Two Pockets', text: 'Pot both balls. You have two shots, so think about position.', cue: [1000, 500], balls: [[1, 1800, 230], [2, 300, 800]], pot: [1, 2], shots: 2, coins: 50 },
  { title: 'Bank Job', text: 'The direct path is blocked. Bank the 1-ball in off a cushion.', cue: [600, 560], balls: [[1, 1000, 330], [9, 960, 120], [10, 1060, 120], [11, 1000, 80]], pot: [1], shots: 1, coins: 60 },
  { title: 'Kick Shot', text: 'You cannot see the 1-ball. Bounce the cue ball off a cushion to pot it.', cue: [1500, 500], balls: [[1, 150, 860], [9, 900, 420], [10, 900, 520], [11, 900, 620], [12, 900, 320], [13, 900, 720], [14, 900, 820], [15, 900, 220]], pot: [1], shots: 2, coins: 70 },
  { title: 'Double Down', text: 'Pot both balls with a single shot.', cue: [1300, 330], balls: [[1, 1940, 60], [2, 1720, 70]], pot: [1, 2], shots: 1, coins: 70 },
  { title: 'Clear Up', text: 'Clear all four balls in four shots.', cue: [1000, 500], balls: [[1, 1700, 300], [2, 1500, 750], [3, 450, 300], [4, 600, 780]], pot: [1, 2, 3, 4], shots: 4, coins: 80 },
  { title: 'Ball in Hand', text: 'Place the cue ball anywhere, then pot all three in three shots.', cue: [500, 500], hand: true, balls: [[1, 1000, 120], [2, 1880, 880], [3, 140, 140], [8, 1000, 500]], pot: [1, 2, 3], shots: 3, coins: 80 },
  { title: 'The Masterpiece', text: 'Five balls, five shots, no mistakes.', cue: [400, 500], balls: [[1, 900, 300], [2, 1300, 700], [3, 1700, 250], [4, 1550, 850], [5, 300, 860]], pot: [1, 2, 3, 4, 5], shots: 5, coins: 120 },
];

// ───────────────────────────── game state ─────────────────────────────
let G = null, lastRoom = -2;
const human = () => G && !G.players[G.turn].cpu;
const onEight = (t = G.turn) => G.game === '8ball' && !!G.groups[t] && remaining(G.balls, G.groups[t]) === 0;
const needCall = () => G.game === '8ball' && !G.isBreak && onEight();
const turnMsg = i => (G.players[i].me ? 'Your turn' : `${G.players[i].name}'s turn`);
const handMsg = i => (G.players[i].me ? 'You have ball in hand' : `${G.players[i].name} has ball in hand`);
const tracked = () => G && !G.demo && G.vs !== '2p' && !G.players[G.turn].cpu;
function toast(text, dur = 2.4) { if (G && !G.demo) G.msg = { text, t: 0, dur }; }

function newGame(o) {
  const solo = o.vs === 'solo';
  const me = { name: prof.name || 'You', me: true, cpu: false, look: prof.look, level: prof.level };
  const ch = o.char || BOT;
  const players = o.vs === 'cpu' ? [me, { name: ch.name, cpu: true, char: ch, look: ch.look, level: ch.id === 'bot' ? 0 : 3 + Math.round((ch.skill || 0) * 6) }]
    : o.vs === '2p' ? [Object.assign({}, me, { name: prof.name || 'Player 1', me: false }), { name: 'Player 2', cpu: false, look: P2_LOOK }]
      : [{ name: o.game === 'puzzle' ? o.puzzle.title : o.game === 'tutorial' ? 'Tutorial' : 'Practice', cpu: false }, { name: '', cpu: false }];
  G = {
    game: o.game, vs: o.vs, solo, persona: o.persona || { skill: 2, style: 'balanced' }, players, opts: o,
    balls: null, turn: o.breaker || 0, breaker: o.breaker || 0, groups: [null, null], isBreak: true, ballInHand: true, kitchen: true,
    phase: 'aim', aim: 0, power: 0, spin: { x: 0, y: 0 }, called: -1, sinking: [], fx: [], strike: null, msg: null,
    ai: null, aiGen: null, ev: null, S: null, fine: 0, over: false, shots: 0, shotsBy: [0, 0], score: [0, 0], target: o.target || 25,
    match: o.match || null, clock: !solo && !o.demo ? SET.clock : 0, clockLeft: 0, lastTick: 99, run: 0, fouls: [0, 0], oppOnEight: false,
    newAch: [], earned: 0, xpGained: 0, talk: [], expr: ['neutral', 'neutral'], exprT: [0, 0], onEightSaid: false, demo: !!o.demo, puzzle: o.puzzle || null, tut: null, hint: null, replayOffer: 0, lastShot: null, rp: null,
  };
  if (o.game === 'puzzle') setupPuzzle();
  else if (o.game === 'tutorial') setupTutorial(0);
  else G.balls = (RULES[o.game] ? RULES[o.game].rack : rackBalls)();
  if (o.game !== 'puzzle' && o.game !== 'tutorial') G.aim = Math.atan2(H / 2 - G.balls[0].y, FOOT_X - G.balls[0].x);
  roomOverride = o.room === undefined ? -1 : o.room;
  const rk = roomOverride >= 0 ? roomOverride : roomIdx;
  if (rk !== lastRoom) { lastRoom = rk; drawStatic(); }
  setTip(o.game === 'puzzle' ? G.puzzle.text : G.tut ? G.tut.tip : null);
  if (!G.demo && o.game !== 'puzzle' && o.game !== 'tutorial') {
    const mt = G.match ? `Frame ${G.match.score[0] + G.match.score[1] + 1} · ` : '';
    toast(o.game === 'practice' ? 'Practice — break when ready' : `${mt}${G.turn === 0 && G.players[0].me ? 'Your break' : G.players[G.turn].name + ' to break'}`);
    const g0 = G; setTimeout(() => { if (G === g0 && !G.over && !G.shots) react('greet', 1, true); }, 1400);
  }
  startTurn();
}

function startTurn() {
  G.phase = 'aim'; G.power = 0; G.called = -1; G.spin = { x: 0, y: 0 }; G.clockLeft = G.clock; G.lastTick = 99; updateSpinBtn();
  if (G.over) return;
  if (G.players[G.turn].cpu) {
    G.phase = 'cpu'; G.ai = null;
    const g0 = G;
    setTimeout(() => { if (G === g0 && G.phase === 'cpu' && !G.over) G.aiGen = aiPlanGen(G, G.persona); }, 450);
  } else {
    if (needCall()) { toast('On the 8-ball — tap a pocket to call it', 3); if (!G.onEightSaid) { G.onEightSaid = true; react('pressure', 0.8); } }
  }
}

const snapBalls = B => B.map(b => ({ n: b.n, x: b.x, y: b.y, vx: 0, vy: 0, on: b.on, p: b.p.slice(), q: b.q.slice() }));
function launch(B, aim, power, spin, mul) {
  const cue = B[0], sp = Math.max(0.03, power) * MAX_SPEED * mul;
  cue.vx = Math.cos(aim) * sp; cue.vy = Math.sin(aim) * sp;
  return { balls: B, spinF: spin.y, spinS: spin.x, spinUsed: false, cueTravel: 0, render: true };
}
function chalkPuff(cue, aim) {
  for (let i = 0; i < 12; i++) {
    const a = aim + Math.PI + (Math.random() - 0.5) * 2.2, v = 40 + Math.random() * 160;
    G.fx.push({ x: cue.x - Math.cos(aim) * R, y: cue.y - Math.sin(aim) * R, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2 + Math.random() * 4, t: 0, life: 0.4 + Math.random() * 0.3 });
  }
}
function shoot(power) {
  const cue = G.balls[0];
  if (needCall() && G.called < 0) { toast('Tap a pocket to call the 8-ball first'); return false; }
  const cpu = G.players[G.turn].cpu, K = cpu ? CUES[0] : cueStat(cueIdx);
  const lim = v => Math.max(-1.25, Math.min(1.25, v));
  const spin = cpu ? G.spin : { x: lim(G.spin.x * K.spin), y: lim(G.spin.y * K.spin) }, mul = cpu ? 1 : K.power;
  G.lastShot = { balls: snapBalls(G.balls), aim: G.aim, power, spin, mul };
  Snd.play('cue', 0.3 + power * 0.7); buzz(8 + power * 30);
  G.strike = { x: cue.x, y: cue.y, ang: G.aim, pull: power * 240, t: 0 };
  chalkPuff(cue, G.aim);
  G.S = launch(G.balls, G.aim, power, spin, mul);
  G.stBefore = RULES[G.game] ? RULES[G.game].snapshot(G) : {};
  G.ev = newEv(); G.phase = 'moving'; G.ballInHand = false; G.power = 0; G.acc = 0; G.potSeen = 0;
  G.shots++; G.shotsBy[G.turn]++; G.replayOffer = 0;
  if (tracked()) prof.stats.shots++;
  if (G.game === 'puzzle') setTip(null);
  return true;
}

function respotCue() {
  const cue = G.balls[0]; cue.on = true; cue.vx = cue.vy = 0;
  const p = findFree(G.balls, HEAD_X, H / 2, cue); cue.x = p.x; cue.y = p.y;
}
function respotBall(n) {
  const b = G.balls.find(x => x.n === n); b.on = true; b.vx = b.vy = 0;
  let x = FOOT_X; while (!freeAt(G.balls, x, H / 2, b) && x < W - R) x += 2;
  if (freeAt(G.balls, x, H / 2, b)) { b.x = x; b.y = H / 2; } else { const p = findFree(G.balls, FOOT_X, H / 2, b); b.x = p.x; b.y = p.y; }
}
// straight pool: when one object ball is left, rack the other 14 again
function rerack14() {
  const pos = trianglePos(), left = G.balls.find(b => b.on && b.n), cue = G.balls[0];
  const inRack = b => b && b.on && pos.some(p => Math.hypot(p.x - b.x, p.y - b.y) < 2 * R);
  if (inRack(left)) { left.x = HEAD_X; left.y = H / 2; if (Math.hypot(cue.x - left.x, cue.y - left.y) < 2 * R) { const p = findFree(G.balls, HEAD_X, H / 2, left); left.x = p.x; left.y = p.y; } }
  let k = left ? 1 : 0;
  for (const b of G.balls) if (b.n && b !== left) { b.on = true; b.vx = b.vy = 0; b.x = pos[k].x; b.y = pos[k].y; k++; }
  if (inRack(cue)) { G.ballInHand = true; G.kitchen = true; respotCue(); }
  toast('Re-rack! Keep shooting', 2);
}

function endShot() {
  const ev = G.ev, me = G.turn, other = 1 - me, trk = tracked();
  const scratched = ev.potted.some(p => p.n === 0), objPots = ev.potted.filter(p => p.n !== 0);
  const banks = objPots.filter(p => p.bank).length;
  if (ev.maxHit > 3200 && G.isBreak) buzz([25, 30, 25]);
  // great shot: offer a replay and let the room react
  if (!scratched && ((!G.isBreak && objPots.length >= 2) || banks)) { G.replayOffer = 7; }
  if (trk) {
    const S = prof.stats; S.potted += objPots.length; S.banks += banks;
    if (!G.isBreak) S.bestMulti = Math.max(S.bestMulti, objPots.length);
    if (!G.isBreak && objPots.length >= 2) unlock('double');
    if (!G.isBreak && objPots.length >= 3) unlock('triple');
    if (banks) unlock('bank');
    if (S.banks >= 10) unlock('banker');
    if (S.potted >= 100) unlock('century');
    saveProf();
  }
  if (G.game === 'practice') return endPractice(scratched);
  if (G.game === 'puzzle') return endPuzzle();
  if (G.game === 'tutorial') return endTutorial();

  const rules = RULES[G.game], res = rules.judge(G.stBefore, ev);
  if (res.foul) { G.fouls[me]++; if (trk) prof.stats.fouls++; }
  if (G.game === '8ball' && G.isBreak && objPots.some(p => p.n === 8) && trk) { prof.stats.eightBreaks++; unlock('eight_break'); }
  if (res.win || res.lose) return finishGame(res.win ? me : other, res.reason, res);
  // the rival reacts, and faces change
  if (G.vs === 'cpu' && !G.isBreak) {
    const cpuShot = G.players[me].cpu, great = objPots.length >= 2 || banks > 0;
    if (cpuShot) {
      if (res.foul) react('myFoul', 0.8); else if (res.keep) react('myGood', great ? 0.9 : 0.35); else react('myMiss', 0.45);
    } else {
      if (res.foul) react('youFoul', 0.75); else if (res.keep) react('youGood', great ? 0.9 : G.run >= 2 ? 0.4 : 0.15); else react('youMiss', 0.4);
    }
    G.expr[me] = res.foul ? 'sad' : res.keep ? 'grin' : 'neutral'; G.exprT[me] = 2.2;
  }
  if (tracked() && res.keep && !res.foul) addXP(5 * objPots.length);
  if (res.keep && !res.foul) {
    G.run += objPots.filter(p => rules.counts(p.n, G.stBefore, res, me)).length;
    if (trk) { prof.stats.bestRun = Math.max(prof.stats.bestRun, G.run); if (G.run >= 5) unlock('run5'); if (G.run >= 8) unlock('run8'); }
  }
  let kitchen = false;
  if (G.game === '8ball') {
    if (res.respot8) { respotBall(8); toast('8-ball potted on the break — respotted'); }
    if (scratched) respotCue();
    if (res.assign) {
      G.groups[me] = res.assign; G.groups[other] = other8(res.assign);
      toast(`${G.players[me].me ? 'You are' : G.players[me].name + ' is'} ${res.assign === 'solids' ? 'solids (1–7)' : 'stripes (9–15)'}`);
    }
    if (G.vs === 'cpu' && onEight(1)) G.oppOnEight = true;
  } else if (G.game === '9ball') {
    if (res.respot9) { respotBall(9); toast('The 9 went in on a foul — respotted'); }
    if (scratched) respotCue();
  } else if (G.game === 'straight') {
    G.score[me] += res.points; if (res.foul) G.score[me] -= 1;
    if (scratched) { respotCue(); kitchen = true; }
    if (G.balls.filter(b => b.on && b.n).length <= 1) rerack14();
  }
  G.isBreak = false; G.kitchen = false;
  if (res.foul) {
    G.turn = other; G.run = 0;
    G.ballInHand = G.game !== 'straight' || kitchen; G.kitchen = kitchen;
    const pen = G.game === 'straight' ? ' (−1 point)' : '';
    toast(`Foul: ${res.foul}${pen}. ${G.ballInHand ? handMsg(other) : turnMsg(other)}`, 3.2);
  } else if (!res.keep) {
    G.turn = other; G.run = 0;
    if (!res.assign) toast(turnMsg(other), 1.6);
  }
  startTurn();
}
const other8 = g => (g === 'solids' ? 'stripes' : 'solids');

function endPractice(scratched) {
  const ev = G.ev;
  if (scratched) { respotCue(); G.ballInHand = true; G.kitchen = false; toast('Scratch — ball in hand'); }
  if (ev.potted.some(p => p.n === 8) && G.balls.some(b => b.on && b.n !== 0 && b.n !== 8)) { respotBall(8); toast('8-ball respotted'); }
  if (!G.balls.some(b => b.on && b.n !== 0)) { toast('Table cleared! New rack'); G.balls = rackBalls(); G.ballInHand = true; G.kitchen = true; G.isBreak = true; return startTurn(); }
  G.isBreak = false; G.kitchen = false; startTurn();
}

function finishGame(winner, reason, res = {}) {
  G.over = true; G.phase = 'over';
  if (G.demo) { setTimeout(() => { if (G && G.demo) startDemo(); }, 2500); return; }
  const youWon = winner === 0 && G.vs === 'cpu', S = prof.stats;
  buzz(youWon ? [40, 60, 40] : 30);
  if (G.vs === 'cpu') { react(youWon ? 'lose' : 'win', 1, true); G.expr = youWon ? ['grin', 'sad'] : ['sad', 'grin']; G.exprT = [9, 9]; addXP(youWon ? 40 + 20 * G.persona.skill : 15); }
  if (youWon || G.vs === '2p') confetti(youWon ? 90 : 60);
  if (G.vs === 'cpu') {
    S.played++;
    if (youWon) {
      S.won++; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak);
      unlock('first_win'); if (S.won >= 10) unlock('ten_wins'); if (S.won >= 50) unlock('fifty_wins'); if (S.streak >= 3) unlock('streak3');
      if (G.fouls[0] === 0) unlock('clean');
      if (G.game === '8ball' && G.breaker === 0 && G.shotsBy[1] === 0) unlock('break_run');
      if (G.game === '8ball' && G.oppOnEight) unlock('comeback');
      if (G.game === '9ball') unlock('nine_win');
      if (G.game === 'straight') unlock('straight_win');
      if (res.golden) { S.golden++; unlock('golden'); }
      if (!G.match) addCoins(25 + 20 * G.persona.skill);
    } else { S.lost++; S.streak = 0; if (!G.match) addCoins(5); }
  } else if (G.vs === '2p') S.games2p++;
  saveProf();
  const name = G.players[winner].name;
  if (G.match) {
    const m = G.match; m.score[winner]++;
    if (m.score[winner] < m.raceTo) {
      const g1 = G;
      setTimeout(() => G === g1 && showResult({
        title: `${G.players[winner].me ? 'You win' : name + ' wins'} the frame`, reason: `${reason}. Match ${m.score[0]}–${m.score[1]}, first to ${m.raceTo}.`,
        primary: ['Next frame', () => { newGame(Object.assign({}, G.opts, { match: m, breaker: 1 - G.breaker })); hideAll(); }], quit: true,
      }), 900);
      return;
    }
    if (m.tour) { const g1 = G; setTimeout(() => { if (G === g1) tourMatchDone(winner === 0); }, 1600); return; }
  }
  const title = G.vs === 'cpu' ? (youWon ? 'You win! 🏆' : `${name} wins`) : `${name} wins! 🏆`;
  const g2 = G;
  setTimeout(() => G === g2 && showResult({ title, reason, primary: ['Play again', () => { newGame(Object.assign({}, G.opts, { breaker: 1 - G.breaker })); hideAll(); }] }), 1600);
}

// ───────────────────────────── trick shots ─────────────────────────────
function setupPuzzle() {
  const P = G.puzzle;
  G.balls = [mkBall(0, P.cue[0], P.cue[1])].concat(P.balls.map(([n, x, y]) => mkBall(n, x, y)));
  G.ballInHand = !!P.hand; G.kitchen = false; G.isBreak = false;
  const t = G.balls.find(b => b.n === P.pot[0]); G.aim = Math.atan2(t.y - P.cue[1], t.x - P.cue[0]);
}
function endPuzzle() {
  const P = G.puzzle, ev = G.ev;
  let fail = null;
  if (ev.potted.some(p => p.n === 0)) fail = 'The cue ball went in';
  else if (P.first && G.shots === 1 && ev.first !== P.first) fail = `You must hit the ${P.first}-ball first`;
  const left = P.pot.filter(n => G.balls.find(b => b.n === n).on);
  if (!fail && !left.length) return puzzleSolved();
  if (!fail && G.shots >= P.shots) fail = left.length === 1 ? `The ${left[0]}-ball is still on the table` : `${left.length} balls are still on the table`;
  if (fail) {
    G.over = true; G.phase = 'over';
    setTimeout(() => showResult({ title: 'Not quite', reason: fail + '.', primary: ['Try again', () => playPuzzle(PUZZLES.indexOf(P))], back: ['All trick shots', openPuzzles] }), 700);
    return;
  }
  G.ballInHand = !!P.hand; startTurn();
}
function puzzleSolved() {
  const k = PUZZLES.indexOf(G.puzzle), P = G.puzzle;
  G.over = true; G.phase = 'over'; setTip(null);
  let reason = 'Nicely done.';
  if (!prof.puzzles.includes(k)) {
    prof.puzzles.push(k); addCoins(P.coins); reason = `Nicely done. +${P.coins} credits.`; addXP(60);
    if (prof.puzzles.length >= 5) unlock('puzzle5');
    if (prof.puzzles.length >= PUZZLES.length) unlock('puzzle_all');
    saveProf();
  }
  const next = k + 1 < PUZZLES.length ? ['Next trick shot', () => playPuzzle(k + 1)] : ['All trick shots', openPuzzles];
  setTimeout(() => showResult({ title: `Solved: ${P.title} ✓`, reason, primary: next, back: ['All trick shots', openPuzzles] }), 700);
}

// ───────────────────────────── tutorial ─────────────────────────────
const TUT = [
  { text: 'Welcome! Drag anywhere on the table to aim the cue ball at the yellow 1-ball. The white line shows where the balls will go.',
    cue: [1326, 326], balls: [[1, 1750, 750]], goal: 'aim', target: 1 },
  { text: 'Good aim! Now drag the POWER bar and let go to shoot. Pot the 1-ball in the corner.', ui: 'power', keep: true, goal: 'pot', target: 1,
    cue: [1326, 326], balls: [[1, 1750, 750]] },
  { text: 'Small adjustments: drag the FINE AIM wheel for precise aiming. Line up the 2-ball and pot it.', ui: 'fine',
    cue: [900, 640], balls: [[2, 1520, 200]], goal: 'pot', target: 2 },
  { text: 'Spin! Tap the cue ball icon, choose the BOTTOM of the ball (backspin), then pot the 3-ball and watch the cue ball come back.', ui: 'spin',
    cue: [1500, 500], balls: [[3, 1800, 800]], goal: 'draw', target: 3 },
  { text: 'Ball in hand! After your opponent fouls you can place the cue ball anywhere. Drag it to a good spot, then pot the 4-ball.',
    cue: [500, 500], hand: true, balls: [[4, 1060, 110]], goal: 'pot', target: 4 },
];
function setupTutorial(k, keepBalls = false) {
  const T = TUT[k];
  if (!keepBalls) {
    G.balls = [mkBall(0, T.cue[0], T.cue[1])].concat(T.balls.map(([n, x, y]) => mkBall(n, x, y)));
    const t = G.balls[1]; G.aim = Math.atan2(t.y - T.cue[1], t.x - T.cue[0]) + (k === 0 ? 0.6 : k === 2 ? 0.04 : 0);
  }
  G.tut = { step: k, tip: `${k + 1}/${TUT.length} · ${T.text}` };
  G.ballInHand = !!T.hand; G.kitchen = false; G.isBreak = false;
  G.hint = T.ui ? { ui: T.ui } : (T.goal === 'aim' ? { table: { x: T.balls[0][1], y: T.balls[0][2], r: 55 } } : null);
  setTip(G.tut.tip);
}
function tutorialAimed() {
  if (!G || G.game !== 'tutorial' || TUT[G.tut.step].goal !== 'aim') return;
  const cue = G.balls[0], p = predict(cue.x, cue.y, G.aim);
  if (p.hit && p.hit.n === 1 && p.cosA > 0.93) setupTutorial(G.tut.step + 1, true);
}
function endTutorial() {
  const k = G.tut.step, T = TUT[k], ev = G.ev, cue = G.balls[0];
  const potted = ev.potted.some(p => p.n === T.target), scratch = ev.potted.some(p => p.n === 0);
  let ok = potted && !scratch;
  if (ok && T.goal === 'draw') { const b = T.balls[0]; ok = Math.hypot(cue.x - b[1], cue.y - b[2]) > 2 * R + 140; }
  if (!ok) {
    toast(scratch ? 'The cue ball went in. Try again!' : T.goal === 'draw' && potted ? 'Potted! Now use more backspin so the cue ball comes back.' : 'Not quite. Try again!', 2.8);
    setupTutorial(k); return startTurn();
  }
  if (k + 1 < TUT.length) { toast('Nice!', 1.2); setupTutorial(k + 1); return startTurn(); }
  G.over = true; G.phase = 'over'; setTip(null);
  prof.tutorial = true; saveProf(); unlock('tutorial'); addXP(100); syncMenu();
  setTimeout(() => showResult({
    title: "You're ready to play!", reason: '8-ball in a nutshell: pot all of your group (solids or stripes), then call a pocket and pot the 8-ball. Fouls give your opponent ball in hand.',
    primary: ['Play the computer', () => { $('quick').dataset.game = '8ball'; startQuick('cpu', 1); }],
  }), 700);
}

// ───────────────────────────── replays ─────────────────────────────
function startReplay(after) {
  if (!G || !G.lastShot || G.phase === 'replay') return;
  const L = G.lastShot, balls = L.balls.map(b => Object.assign({}, b, { p: b.p.slice(), q: b.q.slice() }));
  G.rp = { saved: G.balls, savedPhase: G.phase, savedAim: G.aim, after, ev: newEv(), acc: 0, hold: 0, potSeen: 0 };
  G.balls = balls; G.aim = L.aim; G.sinking = []; G.fx = []; G.replayOffer = 0;
  G.rp.S = launch(balls, L.aim, L.power, L.spin, L.mul);
  G.strike = { x: balls[0].x, y: balls[0].y, ang: L.aim, pull: L.power * 240, t: 0 }; chalkPuff(balls[0], L.aim);
  Snd.play('cue', 0.3 + L.power * 0.7);
  G.phase = 'replay';
}
function endReplay() {
  const rp = G.rp; if (!rp) return;
  G.balls = rp.saved; G.phase = rp.savedPhase; G.aim = rp.savedAim; G.rp = null; G.sinking = [];
  if (rp.after) rp.after();
}

// ───────────────────────────── shot clock & haptics ─────────────────────────────
function timeFoul() {
  const me = G.turn, other = 1 - me;
  G.fouls[me]++; if (G.game === 'straight') G.score[me] -= 1;
  G.turn = other; G.run = 0; G.ballInHand = G.game !== 'straight'; G.kitchen = false; G.isBreak = false;
  toast(`Time foul! ${G.ballInHand ? handMsg(other) : turnMsg(other)}`, 3);
  startTurn();
}
let lastBuzz = 0;
function buzz(pattern) {
  if (!SET.haptics || (G && G.demo)) return;
  const now = performance.now(); if (now - lastBuzz < 40) return; lastBuzz = now;
  try {
    if (window.AndroidHaptics) window.AndroidHaptics.vibrate(JSON.stringify(Array.isArray(pattern) ? pattern : [pattern]));
    else if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) { /* no haptics */ }
}

// ───────────────────────────── update loop ─────────────────────────────
function update(dt) {
  if (!G) return;
  if (G.msg) { G.msg.t += dt; if (G.msg.t > G.msg.dur) G.msg = null; }
  G.sinking = G.sinking.filter(s => (s.t += dt) < 0.25);
  G.fx = G.fx.filter(f => {
    f.t += dt; f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt;
    if (f.conf) { f.vx += f.gx * dt; f.vy += f.gy * dt; f.vx *= 0.99; f.vy *= 0.99; } else if (f.vx) { f.vx *= 0.9; f.vy *= 0.9; }
    return f.t < f.life;
  });
  G.talk = G.talk.filter(b => (b.t += dt) < b.dur);
  G.exprT[0] -= dt; G.exprT[1] -= dt;
  if (G.strike && (G.strike.t += dt * (G.phase === 'replay' ? 0.45 : 1)) > 0.3) G.strike = null;
  if (G.replayOffer > 0 && G.phase === 'aim') G.replayOffer = Math.max(0, G.replayOffer - dt);
  if (G.phase === 'moving' || G.phase === 'replay') {
    const live = G.phase === 'moving', box = live ? G : G.rp, S = live ? G.S : G.rp.S, ev = live ? G.ev : G.rp.ev;
    box.acc += live ? dt : dt * 0.45;
    let n = 0;
    while (box.acc >= DT && n < 40) { step(S, DT, ev); box.acc -= DT; n++; }
    for (const v of ev.hits) { Snd.play('ball', v / 2500); if (v > 2600 && live) buzz(6); }
    for (const v of ev.cush) Snd.play('cush', v / 2500);
    ev.hits.length = 0; ev.cush.length = 0;
    for (; box.potSeen < ev.potted.length; box.potSeen++) {
      const p = ev.potted[box.potSeen]; Snd.play('pocket', 0.6);
      G.sinking.push({ b: G.balls.find(b => b.n === p.n), x: p.x, y: p.y, pocket: p.pocket, t: 0 });
      G.fx.push({ ring: true, x: POCKETS[p.pocket].x, y: POCKETS[p.pocket].y, t: 0, life: 0.5 });
      if (live) buzz(18);
    }
    let rl = 0; for (const b of G.balls) if (b.on) rl += Math.hypot(b.vx, b.vy);
    if (stopped(G.balls)) {
      if (live) endShot();
      else if ((G.rp.hold += dt) > 0.9) endReplay();
    }
  } else if (G.phase === 'cpu') {
    if (G.aiGen) {
      const t0 = performance.now(); let r;
      do { r = G.aiGen.next(); } while (!r.done && performance.now() - t0 < 7);
      if (r.done) { G.aiGen = null; G.ai = { plan: r.value, t: 0, a0: G.aim, from: { x: G.balls[0].x, y: G.balls[0].y } }; }
    } else if (G.ai) {
      const ai = G.ai, pl = ai.plan; ai.t += dt;
      const cue = G.balls[0];
      if (pl.place) { const k = Math.min(1, ai.t / 0.5); cue.x = ai.from.x + (pl.place.x - ai.from.x) * k; cue.y = ai.from.y + (pl.place.y - ai.from.y) * k; }
      if (pl.called >= 0 && needCall()) G.called = pl.called;
      G.spin = pl.spin;
      let d = pl.ang - ai.a0; d = Math.atan2(Math.sin(d), Math.cos(d));
      const ka = Math.min(1, Math.max(0, (ai.t - 0.3) / 0.9)), e = ka * ka * (3 - 2 * ka);
      G.aim = ai.a0 + d * e;
      if (ai.t > 1.3) G.power = Math.min(pl.power, (ai.t - 1.3) / 0.6 * pl.power);
      if (ai.t > 2.1) { G.ai = null; G.aim = pl.ang; shoot(pl.power); }
    }
  } else if (G.phase === 'aim' && G.clock && human() && !overlayOpen() && !G.demo) {
    G.clockLeft -= dt;
    const s = Math.ceil(G.clockLeft);
    if (s <= 5 && s < G.lastTick && s > 0) { G.lastTick = s; Snd.tick(); }
    if (G.clockLeft <= 0) timeFoul();
  }
}

// ───────────────────────────── input ─────────────────────────────
const ptrs = new Map();
const inC = (d, b) => Math.hypot(d.x - b.x, d.y - b.y) < b.r + 10;
const inRect = (d, r) => d.x >= r.x - 12 && d.x <= r.x + r.w + 12 && d.y >= r.y - 12 && d.y <= r.y + r.h + 12;
const along = d => (LAY.power.horiz ? d.x : d.y);
function tryPlace(tx, ty) {
  const cue = G.balls[0], maxX = G.kitchen ? HEAD_X : W - R;
  tx = Math.max(R, Math.min(maxX, tx)); ty = Math.max(R, Math.min(H - R, ty));
  if (freeAt(G.balls, tx, ty, cue)) { cue.x = tx; cue.y = ty; }
}
function pocketAt(tx, ty) { for (let i = 0; i < 6; i++) if (Math.hypot(tx - POCKETS[i].x, ty - POCKETS[i].y) < 90) return i; return -1; }
cv.addEventListener('pointerdown', e => {
  Snd.init();
  if (!G || overlayOpen() || G.demo) return;
  if (G.phase === 'replay') return endReplay();
  const d = toDesign(e);
  if (inC(d, LAY.menu)) return openPause();
  if (inC(d, LAY.spin)) { if (G.phase === 'aim' && human()) openSpin(); return; }
  if (G.vs === 'cpu' && !G.over && inC(d, LAY.chat)) return openChat();
  if (G.replayOffer && G.phase === 'aim' && inRect(d, LAY.replayBtn)) return startReplay();
  if (G.phase !== 'aim' || !human()) return;
  cv.setPointerCapture(e.pointerId);
  const st = { mode: null, a0: along(d), la: along(d) };
  if (inRect(d, LAY.power)) st.mode = 'power';
  else if (inRect(d, LAY.fine)) st.mode = 'fine';
  else {
    const tp = toTable(d), tx = tp.x, ty = tp.y, cue = G.balls[0];
    if (G.ballInHand && Math.hypot(tx - cue.x, ty - cue.y) < R * 2.8) { st.mode = 'place'; st.dx = cue.x - tx; st.dy = cue.y - ty; }
    else if (needCall() && pocketAt(tx, ty) >= 0) { G.called = pocketAt(tx, ty); toast('Pocket called', 1.2); return; }
    else { st.mode = 'aim'; if (Math.hypot(tx - cue.x, ty - cue.y) > R) G.aim = Math.atan2(ty - cue.y, tx - cue.x); }
  }
  ptrs.set(e.pointerId, st);
});
cv.addEventListener('pointermove', e => {
  const st = ptrs.get(e.pointerId); if (!st || !G || G.phase !== 'aim') return;
  const d = toDesign(e), v = along(d), tp = toTable(d);
  if (st.mode === 'power') G.power = Math.max(0, Math.min(1, (v - st.a0) / 850));
  else if (st.mode === 'fine') { G.aim += (v - st.la) * 0.0007; G.fine += v - st.la; st.la = v; }
  else if (st.mode === 'place') tryPlace(tp.x + st.dx, tp.y + st.dy);
  else if (st.mode === 'aim') { const cue = G.balls[0]; if (Math.hypot(tp.x - cue.x, tp.y - cue.y) > R) G.aim = Math.atan2(tp.y - cue.y, tp.x - cue.x); }
});
const endPtr = e => {
  const st = ptrs.get(e.pointerId); ptrs.delete(e.pointerId);
  if (!st || !G || G.phase !== 'aim') return;
  if (st.mode === 'power') { const p = G.power; G.power = 0; if (p > 0.02 && e.type === 'pointerup') shoot(p); }
  if (st.mode === 'aim' || st.mode === 'fine') tutorialAimed();
};
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
window.addEventListener('keydown', e => {
  if (!G || G.phase !== 'aim' || !human() || overlayOpen() || G.demo) return;
  const s = e.shiftKey ? 0.002 : 0.02;
  if (e.key === 'ArrowLeft') G.aim -= s; else if (e.key === 'ArrowRight') G.aim += s;
  else if (e.key === 'ArrowUp') G.power = Math.max(0, G.power - 0.05); else if (e.key === 'ArrowDown') G.power = Math.min(1, G.power + 0.05);
  else if (e.key === ' ' && G.power > 0.02) { Snd.init(); const p = G.power; G.power = 0; shoot(p); }
  else return;
  e.preventDefault(); tutorialAimed();
});

// ───────────────────────────── menus & overlays ─────────────────────────────
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const overlayOpen = () => document.querySelector('.overlay.show') !== null;
function show(id) { document.querySelectorAll('.overlay').forEach(o => o.classList.toggle('show', o.id === id)); setTipVisible(!id); }
function hideAll() { show(null); }
function setTip(text) { const t = $('tip'); t.textContent = text || ''; t.hidden = !text || overlayOpen(); }
function setTipVisible(v) { const t = $('tip'); if (t.textContent) t.hidden = !v; }
function notify(text) {
  const box = $('notes'), el = document.createElement('div'); el.className = 'note'; el.textContent = text;
  box.appendChild(el); setTimeout(() => el.classList.add('out'), 3200); setTimeout(() => el.remove(), 3800);
}
function syncCoins() { document.querySelectorAll('.coins').forEach(el => { el.textContent = `● ${prof.coins.toLocaleString()}`; }); }
function openPause() { if (G.phase === 'moving' || G.phase === 'replay') return; show('pause'); }
function updateSpinBtn() { const dot = $('spinDot'); if (!dot || !G) return; dot.style.left = 50 + G.spin.x * 40 + '%'; dot.style.top = 50 - G.spin.y * 40 + '%'; }
function openSpin() { show('spinPanel'); updateSpinBtn(); }

// one result screen for game over, frame won, trick shot solved or failed
function showResult({ title, reason, primary, back, quit }) {
  $('overTitle').textContent = title; $('overReason').textContent = reason || '';
  const rw = [];
  if (G && G.earned) rw.push(`<li>● +${G.earned} credits</li>`);
  if (G && G.xpGained) rw.push(`<li>★ +${G.xpGained} XP · Level ${prof.level}</li>`);
  if (G) for (const a of G.newAch) rw.push(`<li>🏆 ${esc(a.name)}</li>`);
  if (G) { G.newAch = []; G.earned = 0; G.xpGained = 0; }
  $('overRewards').innerHTML = rw.join(''); $('overRewards').hidden = !rw.length;
  const btns = $('overBtns'); btns.innerHTML = '';
  const add = (label, fn, cls) => { const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = fn; btns.appendChild(b); };
  if (primary) add(primary[0], primary[1], 'gold');
  if (G && G.lastShot) add('▶ Watch the last shot', () => { hideAll(); startReplay(() => show('over')); });
  if (back) add(back[0], back[1]);
  add(quit ? 'Quit match' : 'Main menu', goMenu);
  syncCoins(); show('over');
}

function startQuick(vs, skill) {
  const game = $('quick').dataset.game || '8ball';
  Snd.init(); fullscreen();
  if (vs !== 'cpu') { newGame({ game, vs }); hideAll(); return; }
  const pool = CAST.filter(c => c.skill === skill && c.id !== 'queen'), ch = pick(pool);
  const gname = { '8ball': '8-Ball', '9ball': '9-Ball', straight: 'Straight Pool' }[game];
  showVS({ opp: { name: ch.name, look: ch.look, title: ch.title, char: ch }, stage: `Quick Play · ${gname}`, stakes: `Win ${25 + 20 * skill} credits`,
    go: () => newGame({ game, vs, persona: { skill, style: ch.style }, char: ch }) });
}
function playPuzzle(k) { Snd.init(); newGame({ game: 'puzzle', vs: 'solo', puzzle: PUZZLES[k] }); hideAll(); setTip(PUZZLES[k].text); }
function startTutorial() { Snd.init(); fullscreen(); newGame({ game: 'tutorial', vs: 'solo' }); hideAll(); setTip(G.tut.tip); }
function startPractice() { Snd.init(); fullscreen(); newGame({ game: 'practice', vs: 'solo' }); hideAll(); }
function startDemo() { newGame({ game: '8ball', vs: 'cpu', demo: true, persona: { skill: 2, style: 'balanced' } }); G.players.forEach(p => { p.cpu = true; }); G.msg = null; startTurn(); }
function goMenu() { syncMenu(); show('menu'); if (!G || !G.demo) startDemo(); setTip(null); if (!dailyShown) { dailyShown = true; dailyCheck(); } }
let dailyShown = false;
function fullscreen() { try { const de = document.documentElement; if (de.requestFullscreen && !document.fullscreenElement) de.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (e) { /* not available */ } }

function syncMenu() {
  syncCoins();
  $('meName').textContent = prof.name || 'You'; $('meRank').textContent = `Level ${prof.level} · ${rankOf(prof.level)}`;
  $('meXp').style.width = Math.round(100 * prof.xp / xpNeed(prof.level)) + '%';
  drawPortraitCanvas($('meFace'), prof.look, 'happy');
  const T = prof.tour; $('btnCareer').textContent = T && !T.out && T.round < 3 ? `World Tour · ${ROUND_NAMES[T.round]}` : 'World Tour';
  $('btnTutorial').classList.toggle('gold', !prof.tutorial);
  $('btnTutorial').textContent = prof.tutorial ? 'Tutorial' : 'New here? Learn to play';
}
function openPuzzles() {
  const list = $('puzzleList'); list.innerHTML = '';
  PUZZLES.forEach((P, k) => {
    const solved = prof.puzzles.includes(k), open = k === 0 || prof.puzzles.includes(k - 1) || solved;
    const b = document.createElement('button'); b.className = 'pz' + (solved ? ' done' : ''); b.disabled = !open;
    b.innerHTML = `<b>${k + 1}</b><span>${esc(P.title)}</span><small>${solved ? '✓ solved' : open ? `● ${P.coins}` : '🔒'}</small>`;
    b.onclick = () => playPuzzle(k); list.appendChild(b);
  });
  $('puzzleCount').textContent = `${prof.puzzles.length} of ${PUZZLES.length} solved`;
  show('puzzles');
}
let shopTab = 'cue';
const ROOM_BLURB = ['A friendly neighbourhood bar', 'An old-money private club', 'The championship arena', 'Late-night neon'];
function openShop(tab = shopTab) {
  shopTab = tab;
  document.querySelectorAll('#shop [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const cat = tab === 'cue' ? CUES : tab === 'cloth' ? CLOTHS : ROOMS, list = $('shopList'); list.innerHTML = '';
  cat.forEach((it, k) => {
    const owned = prof.owned[tab].includes(k), eq = prof.equip[tab] === k, row = document.createElement('div'); row.className = 'item';
    let detail = '';
    if (tab === 'cue') {
      const st = cueStat(k), u = cueLv(k);
      detail = [['Aim', st.aim, 0.9, 1.75], ['Spin', st.spin, 0.8, 1.6], ['Power', st.power, 0.95, 1.25]]
        .map(([l, v, lo, hi], si) => `<span class="bar"><i>${l}</i><em><u style="width:${Math.round(10 + 90 * (v - lo) / (hi - lo))}%"></u></em>${'★'.repeat(u[si])}${'☆'.repeat(3 - u[si])}${owned && u[si] < 3 ? ` <button class="upg${prof.coins < upgCost(k, si) ? '" disabled' : '"'} data-upg="${k}:${si}">+ ● ${upgCost(k, si)}</button>` : ''}</span>`).join('');
    }
    else if (tab === 'cloth') detail = `<span class="swatch" style="background:${it.felt[1]}"></span>`;
    else detail = `<small>${esc(ROOM_BLURB[k])}</small>`;
    let action;
    if (eq) action = '<button disabled>Equipped</button>';
    else if (owned) action = `<button data-eq="${k}">Use</button>`;
    else if (it.price < 0) action = '<button disabled>Championship prize</button>';
    else action = `<button data-buy="${k}" class="gold"${prof.coins < it.price ? ' disabled' : ''}>● ${it.price}</button>`;
    row.innerHTML = `<div class="info"><b>${esc(it.name)}</b>${detail}</div><div class="act">${action}</div>`;
    list.appendChild(row);
  });
  list.querySelectorAll('[data-upg]').forEach(b => { b.onclick = () => {
    const [k, si] = b.dataset.upg.split(':').map(Number), cost = upgCost(k, si);
    if (prof.coins < cost) return;
    prof.coins -= cost; const u = cueLv(k).slice(); u[si]++; prof.cueLv[k] = u; saveProf();
    notify(`${CUES[k].name}: ${UPG[si][0]} upgraded to ★${u[si]}`); unlock('shop'); openShop('cue');
  }; });
  list.querySelectorAll('[data-eq]').forEach(b => { b.onclick = () => { prof.equip[tab] = +b.dataset.eq; saveProf(); applyEquip(); refreshLook(); openShop(tab); }; });
  list.querySelectorAll('[data-buy]').forEach(b => { b.onclick = () => {
    const k = +b.dataset.buy, it = cat[k];
    if (prof.coins < it.price) return;
    prof.coins -= it.price; prof.owned[tab].push(k); prof.equip[tab] = k; saveProf(); applyEquip(); refreshLook();
    notify(`Bought ${it.name}`); unlock('shop'); openShop(tab);
  }; });
  $('shopNote').textContent = tab === 'room' ? 'Rooms change the menu and quick play. World Tour events are played in their own venue.' : tab === 'cue' ? 'Better cues give a longer aim guide, more spin or more power. Upgrade cues you own up to ★3 in each stat.' : '';
  syncCoins(); show('shop');
}
function refreshLook() { lastRoom = roomOverride >= 0 ? roomOverride : roomIdx; drawStatic(); }
function openStats() {
  const S = prof.stats, rate = S.played ? Math.round(100 * S.won / S.played) : 0;
  const rows = [['Games vs computer', S.played], ['Wins', S.won], ['Win rate', S.played ? rate + '%' : '—'], ['Best win streak', S.bestStreak],
    ['Balls potted', S.potted], ['Pot rate', S.shots ? Math.round(100 * S.potted / S.shots) + '%' : '—'], ['Longest run', S.bestRun],
    ['Most balls in one shot', S.bestMulti], ['Bank shots', S.banks], ['Fouls', S.fouls], ['8 on the break', S.eightBreaks], ['Golden breaks', S.golden],
    ['Trick shots solved', `${prof.puzzles.length}/${PUZZLES.length}`], ['Tour titles', prof.trophies.reduce((a, b) => a + b, 0)], ['Level', `${prof.level} · ${rankOf(prof.level)}`], ['Credits earned', S.coinsEarned]];
  $('statGrid').innerHTML = rows.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('');
  const got = ACH.filter(a => prof.ach[a.id]).length;
  $('achCount').textContent = `${got} of ${ACH.length} unlocked`;
  $('achList').innerHTML = ACH.map(a => `<li class="${prof.ach[a.id] ? 'got' : ''}"><span>${prof.ach[a.id] ? '🏆' : '🔒'}</span><b>${esc(a.name)}</b><small>${esc(a.desc)} · ● ${a.coins}</small></li>`).join('');
  show('stats');
}
let settingsBack = 'menu';
function openSettings(from) { settingsBack = from; syncToggles(); show('settings'); }
function syncToggles() {
  const lab = { sound: ['Sound', SET.sound ? 'On' : 'Off'], haptics: ['Vibration', SET.haptics ? 'On' : 'Off'],
    guide: ['Aim guide', SET.guide ? 'Long' : 'Short'], clock: ['Shot clock', SET.clock ? SET.clock + ' s' : 'Off'], bigNums: ['Large ball numbers', SET.bigNums ? 'On' : 'Off'],
    lefty: ['Controls', SET.lefty ? 'Left-handed' : 'Right-handed'], voices: ['Character voices', SET.voices ? 'On' : 'Off'] };
  document.querySelectorAll('[data-set]').forEach(b => { const [k, v] = lab[b.dataset.set]; b.innerHTML = `<span>${k}</span><b>${v}</b>`; });
}
document.querySelectorAll('[data-set]').forEach(b => { b.onclick = () => {
  const k = b.dataset.set;
  if (k === 'clock') SET.clock = SET.clock === 0 ? 30 : SET.clock === 30 ? 15 : 0; else SET[k] = !SET[k];
  saveSet(); Snd.on = SET.sound; Snd.voices = SET.voices; longGuide = SET.guide; bigNums = SET.bigNums;
  if (k === 'lefty') { lefty = SET.lefty; applyHand(); resize(); }
  if (k === 'sound') Snd.init();
  if (k === 'clock' && G && !G.demo && !G.solo) { G.clock = SET.clock; G.clockLeft = SET.clock; }
  if (k === 'haptics' && SET.haptics) buzz(30);
  syncToggles();
}; });

// spin picker
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

// wiring
$('tip').onclick = () => { $('tip').hidden = true; $('tip').textContent = ''; };
$('btnCareer').onclick = () => (prof.tour && !prof.tour.out && prof.tour.round < 3 ? openBracket() : openTour());
$('tourResume').onclick = openBracket;
$('btnLocker').onclick = openLocker; $('meCard').onclick = openLocker;
$('lockName').addEventListener('input', () => { prof.name = $('lockName').value.trim().slice(0, 14); saveProf(); });
$('btnLeaveBracket').onclick = goMenu;
$('btnQuick').onclick = () => show('quick');
$('btnPuzzles').onclick = openPuzzles;
$('btnPractice').onclick = startPractice;
$('btnTutorial').onclick = startTutorial;
$('btnShop').onclick = () => openShop();
$('btnStats').onclick = openStats;
$('btnSettings').onclick = () => openSettings('menu');
document.querySelectorAll('[data-back]').forEach(b => { b.onclick = () => (b.dataset.back === 'game' ? hideAll() : b.dataset.back === 'settings' && settingsBack === 'pause' ? show('pause') : goMenu()); });
$('chat').addEventListener('pointerdown', e => { if (e.target.id === 'chat') hideAll(); });
document.querySelectorAll('#shop [data-tab]').forEach(b => { b.onclick = () => openShop(b.dataset.tab); });
document.querySelectorAll('#quick [data-game]').forEach(b => { b.onclick = () => { $('quick').dataset.game = b.dataset.game; document.querySelectorAll('#quick [data-game]').forEach(x => x.classList.toggle('on', x === b)); }; });
document.querySelectorAll('#quick [data-skill]').forEach(b => { b.onclick = () => startQuick('cpu', +b.dataset.skill); });
$('btn2p').onclick = () => startQuick('2p', 0);
$('btnResume').onclick = hideAll;
$('btnRestart').onclick = () => {
  if (!G) return;
  const o = Object.assign({}, G.opts); if (o.match) o.match = Object.assign({}, o.match, { score: [0, 0] });
  newGame(o); hideAll();
};
$('btnPauseSettings').onclick = () => openSettings('pause');
$('btnQuit').onclick = goMenu;

// Android back button (called from the app wrapper): returns true when handled
window.__back = () => {
  if ($('menu').classList.contains('show')) return false;
  if (G && G.phase === 'replay') { endReplay(); return true; }
  if (['quick', 'tour', 'bracket', 'locker', 'puzzles', 'shop', 'stats', 'over', 'vs', 'daily'].some(id => $(id).classList.contains('show'))) { goMenu(); return true; }
  if ($('settings').classList.contains('show')) { settingsBack === 'pause' ? show('pause') : goMenu(); return true; }
  if (overlayOpen()) { hideAll(); return true; }
  if (G && !G.demo) { openPause(); return true; }
  return false;
};

// ───────────────────────────── main loop ─────────────────────────────
let last = performance.now();
let frameErr = 0;
function frame(now) {
  requestAnimationFrame(frame);                   // schedule first: an error below can never freeze the game
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  // after a rotation some phones report the new size late: re-layout whenever the canvas is out of step
  const want = Math.round(window.innerWidth * Math.min(2, window.devicePixelRatio || 1));
  if (Math.abs(cv.width - want) > 2 || Math.abs(cv.height - Math.round(window.innerHeight * Math.min(2, window.devicePixelRatio || 1))) > 2) resize();
  try { update(dt); render(now / 1000); } catch (e) { if (frameErr++ < 5) console.error(e); }
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => { setTimeout(resize, 200); setTimeout(resize, 600); });
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize(); goMenu(); requestAnimationFrame(frame);

// test hooks (harmless in production)
window.__pool = { get G() { return G; }, newGame, shoot, endShot, startReplay, endReplay, aiPlan, step, stopped, newEv, simulate, PUZZLES, prof: () => prof, DT, playPuzzle, startTutorial, unlock, startTour, openBracket, tourMatchDone, react, say, addXP };
