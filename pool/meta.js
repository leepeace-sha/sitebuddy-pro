/* Clubhouse 8-Ball — the meta game: World Tour tournaments, the VS screen, levels and ranks,
   the daily bonus, cue upgrades, the avatar locker and quick chat. Loaded before game.js;
   everything here runs on demand, so it may use game.js globals (prof, G, $, notify...). */
'use strict';

// ───────────────────────────── levels & ranks ─────────────────────────────
const RANKS = [[1, 'Rookie'], [4, 'Amateur'], [8, 'Contender'], [12, 'Semi-Pro'], [17, 'Pro'], [23, 'Master'], [30, 'Legend']];
const rankOf = lv => RANKS.filter(r => lv >= r[0]).pop()[1];
const xpNeed = lv => 150 + lv * 100;
function addXP(n) {
  if (!n || (G && G.demo)) return;
  prof.xp += n; if (G) G.xpGained += n;
  while (prof.xp >= xpNeed(prof.level)) {
    prof.xp -= xpNeed(prof.level); const before = rankOf(prof.level); prof.level++;
    const r = 100 + 25 * prof.level; addCoins(r);
    const nr = rankOf(prof.level);
    notify(`⬆ Level ${prof.level}${nr !== before ? ` — you are now a ${nr}!` : ''} · +${r} credits`);
  }
  saveProf();
}

// ───────────────────────────── daily bonus ─────────────────────────────
const DAILY = [50, 75, 100, 150, 200, 300, 500];
const dayKey = (off = 0) => { const d = new Date(Date.now() + off * 864e5); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function dailyCheck() {
  if (prof.daily.last === dayKey()) return false;
  const streak = prof.daily.last === dayKey(-1) ? (prof.daily.streak % 7) + 1 : 1;
  $('dailyDays').innerHTML = DAILY.map((v, k) => `<div class="day${k + 1 < streak ? ' got' : k + 1 === streak ? ' now' : ''}"><small>Day ${k + 1}</small><b>${v}</b></div>`).join('');
  $('dailyClaim').textContent = `Claim ${DAILY[streak - 1]} credits`;
  $('dailyClaim').onclick = () => {
    prof.daily = { last: dayKey(), streak }; addCoins(DAILY[streak - 1]); saveProf();
    notify(`Daily bonus · +${DAILY[streak - 1]} credits`); goMenu();
  };
  show('daily'); return true;
}

// ───────────────────────────── cues with upgrades ─────────────────────────────
const UPG = [['Aim', 0.07], ['Spin', 0.08], ['Power', 0.03]];
const cueLv = k => prof.cueLv[k] || [0, 0, 0];
function cueStat(k) { const C = CUES[k], u = cueLv(k); return { aim: C.aim * (1 + UPG[0][1] * u[0]), spin: C.spin * (1 + UPG[1][1] * u[1]), power: C.power * (1 + UPG[2][1] * u[2]) }; }
const upgCost = (k, s) => Math.round((Math.max(CUES[k].price, 150) * 0.3 + 60) * (cueLv(k)[s] + 1));

// ───────────────────────────── the locker (your character) ─────────────────────────────
// price 0 = free, >0 = credits, 'T<n>' = win World Tour event n
const LOCKER = [
  { key: 'skin', label: 'Skin', opts: SKINS.map(v => [v, 0]) },
  { key: 'hair', label: 'Hair', opts: HAIRS.map(v => [v, ['short', 'side', 'long', 'bald', 'buzz', 'bun'].includes(v) ? 0 : v === 'mohawk' ? 300 : 150]) },
  { key: 'hairColor', label: 'Hair colour', opts: HAIR_COLORS.map((v, k) => [v, k < 7 ? 0 : 120]) },
  { key: 'beard', label: 'Facial hair', opts: BEARDS.map(v => [v, 0]) },
  { key: 'hat', label: 'Headwear', opts: [['none', 0], ['cap', 100], ['beanie', 100], ['headband', 80], ['headphones', 250], ['fedora', 400], ['crown', 'T3']] },
  { key: 'hatColor', label: 'Hat colour', opts: TOP_COLORS.map((v, k) => [v, k < 5 ? 0 : 60]) },
  { key: 'glasses', label: 'Glasses', opts: [['none', 0], ['round', 100], ['shades', 200], ['aviator', 350]] },
  { key: 'top', label: 'Outfit', opts: [['tee', 0], ['hoodie', 100], ['vest', 200], ['jacket', 300], ['suit', 600]] },
  { key: 'topColor', label: 'Outfit colour', opts: TOP_COLORS.map((v, k) => [v, k < 5 ? 0 : 80]) },
  { key: 'bg', label: 'Background', opts: BG_COLORS.map((v, k) => [v, k < 4 ? 0 : 100]).concat([['#b7791f', 'T1'], ['#1c4532', 'T2']]) },
  { key: 'earring', label: 'Earring', opts: [[false, 0], [true, 120]] },
];
const ownedItem = (cat, v, price) => price === 0 || prof.lockOwned.includes(cat + ':' + v) || (typeof price === 'string' && prof.trophies[+price.slice(1)] > 0);
let lockerTab = 0;
function drawPortraitCanvas(cv, look, expr = 'happy') {
  const d = Math.min(2, window.devicePixelRatio || 1), sz = cv.clientWidth || +cv.getAttribute('width');
  cv.width = sz * d; cv.height = sz * d;
  const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, sz, sz);
  drawFace(c, look, sz / 2, sz / 2, sz / 2, expr, 0, 0);
}
function openLocker() {
  $('lockName').value = prof.name || '';
  const tabs = $('lockTabs'); tabs.innerHTML = '';
  LOCKER.forEach((cat, k) => { const b = document.createElement('button'); b.className = 'small' + (k === lockerTab ? ' on' : ''); b.textContent = cat.label; b.onclick = () => { lockerTab = k; openLocker(); }; tabs.appendChild(b); });
  const cat = LOCKER[lockerTab], grid = $('lockGrid'); grid.innerHTML = '';
  cat.opts.forEach(([v, price]) => {
    const own = ownedItem(cat.key, v, price), on = prof.look[cat.key] === v, b = document.createElement('button');
    b.className = 'opt' + (on ? ' on' : '');
    const cv = document.createElement('canvas'); cv.width = cv.height = 72; cv.style.width = cv.style.height = '72px';
    b.appendChild(cv);
    const lab = document.createElement('small');
    lab.textContent = on ? 'Wearing' : own ? 'Owned' : typeof price === 'string' ? `🏆 ${VENUES[+price.slice(1)].short}` : `● ${price}`;
    b.appendChild(lab);
    b.onclick = () => {
      if (!own) {
        if (typeof price === 'string') return notify(`Win the ${VENUES[+price.slice(1)].name} to unlock this`);
        if (prof.coins < price) return notify('Not enough credits yet. Win matches and tournaments to earn more.');
        prof.coins -= price; prof.lockOwned.push(cat.key + ':' + v); unlock('shop'); notify('Unlocked!');
      }
      prof.look[cat.key] = v; saveProf(); openLocker();
    };
    grid.appendChild(b);
    drawPortraitCanvas(cv, Object.assign({}, prof.look, { [cat.key]: v }), 'neutral');
  });
  drawPortraitCanvas($('lockPreview'), prof.look, 'grin');
  $('lockRank').textContent = `Level ${prof.level} · ${rankOf(prof.level)}`;
  $('lockXp').style.width = Math.round(100 * prof.xp / xpNeed(prof.level)) + '%';
  $('lockTrophies').innerHTML = VENUES.map((V, k) => `<span class="tro${prof.trophies[k] ? ' got' : ''}" title="${esc(V.name)}">🏆<small>${esc(V.short)}${prof.trophies[k] > 1 ? ' ×' + prof.trophies[k] : ''}</small></span>`).join('');
  syncCoins(); show('locker');
}

// ───────────────────────────── World Tour ─────────────────────────────
const LOCAL_NAMES = ['Tommy', 'Sal', 'Kev', 'Maya', 'Jojo', 'Benny', 'Rosa', 'Deano', 'Priya', 'Mick', 'Lena', 'Gus'];
const VENUES = [
  { name: 'Corner Pocket Cup', short: 'Corner Pocket', room: 0, game: '8ball', entry: 50, prize: 300, race: [1, 1, 1], cast: ['rusty', 'ziggy', 'dot', 'lou'], locals: 3, localSkill: 0, champ: 'lou', blurb: 'Friday night at the local. Single frames, all the way.' },
  { name: 'Kingsley Club Open', short: 'Kingsley Club', room: 1, game: '8ball', entry: 150, prize: 800, race: [1, 2, 2], cast: ['dot', 'lou', 'marguerite', 'hector', 'duke'], locals: 2, localSkill: 1, champ: 'duke', blurb: 'Members only. Best of three from the semi-finals.' },
  { name: 'Neon Nights 9-Ball', short: 'Neon Nights', room: 3, game: '9ball', entry: 300, prize: 1800, race: [1, 2, 3], cast: ['nina', 'hector', 'viper', 'ziggy', 'marguerite', 'professor'], locals: 1, localSkill: 2, champ: 'viper', blurb: '9-ball under the lights. Final is first to three.' },
  { name: 'Grand Championship', short: 'Grand Final', room: 2, game: '8ball', entry: 600, prize: 5000, race: [2, 2, 3], cast: ['queen', 'ice', 'viper', 'duke', 'professor', 'marguerite', 'nina'], locals: 0, localSkill: 3, champ: 'queen', blurb: 'The world stage. Beat The Queen for the crown.' },
];
const ROUND_NAMES = ['Quarter-final', 'Semi-final', 'Final'];
const venueOpen = v => v === 0 || prof.trophies[v - 1] > 0;
function randomLook(seed) {
  const r = rng(seed * 7919 + 13), p = a => a[Math.floor(r() * a.length)];
  return L_({ skin: p(SKINS), hair: p(HAIRS), hairColor: p(HAIR_COLORS.slice(0, 7)), beard: r() < 0.3 ? p(BEARDS) : 'none', hat: r() < 0.3 ? p(['cap', 'beanie', 'headband']) : 'none', hatColor: p(TOP_COLORS), glasses: r() < 0.25 ? p(GLASSES) : 'none', top: p(TOPS), topColor: p(TOP_COLORS), bg: p(BG_COLORS), seed });
}
// a bracket entry: 'me', a cast id, or a local { name, skill, seed }
function entryInfo(e) {
  if (e === 'me') return { name: prof.name || 'You', look: prof.look, skill: 2.5, me: true, title: `${rankOf(prof.level)} · Level ${prof.level}` };
  if (typeof e === 'string') { const c = castById(e); return { name: c.name, look: c.look, skill: c.skill, char: c, title: c.title }; }
  const look = randomLook(e.seed);
  const ch = { id: 'local', name: e.name, title: 'Local player', skill: e.skill, style: ['balanced', 'aggressive', 'safe'][e.seed % 3], voice: 150 + (e.seed % 7) * 25, look, lines: BOT.lines };
  return { name: e.name, look, skill: e.skill, char: ch, title: 'Local player' };
}
function startTour(v) {
  const V = VENUES[v];
  const free = prof.coins < V.entry;
  if (!free) prof.coins -= V.entry;
  const others = V.cast.filter(id => id !== V.champ).sort(() => Math.random() - 0.5);
  const names = LOCAL_NAMES.slice().sort(() => Math.random() - 0.5);
  for (let k = 0; k < V.locals; k++) others.push({ name: names[k], skill: V.localSkill, seed: 1 + Math.floor(Math.random() * 9999) });
  const field = others.slice(0, 6).sort(() => Math.random() - 0.5);
  prof.tour = { v, bracket: ['me', ...field, V.champ], round: 0, winners: [], out: false, paid: free ? 0 : V.entry };
  saveProf(); syncCoins();
  if (free && V.entry) notify('Free entry: you were short on credits, so this one is on the house.');
  openBracket();
}
const roundPlayers = (T, r) => (r === 0 ? T.bracket : T.winners[r - 1]);
function simMatch(a, b) {
  if (a === 'me' || b === 'me') return null;
  const sa = entryInfo(a).skill, sb = entryInfo(b).skill, p = Math.max(0.12, Math.min(0.88, 0.5 + 0.13 * (sa - sb)));
  return Math.random() < p ? a : b;
}
function myOpponent(T) { const ps = roundPlayers(T, T.round), i = ps.indexOf('me'); return ps[i ^ 1]; }
function openBracket() {
  const T = prof.tour; if (!T) return openTour();
  const V = VENUES[T.v];
  $('brTitle').textContent = V.name;
  $('brInfo').textContent = T.out ? 'You are out of this event.' : T.round > 2 ? 'Tournament complete.' : `${ROUND_NAMES[T.round]} · first to ${V.race[T.round]} · ${V.game === '9ball' ? '9-Ball' : '8-Ball'}`;
  const cols = $('brCols'); cols.innerHTML = '';
  for (let r = 0; r < 3; r++) {
    const ps = roundPlayers(T, r), col = document.createElement('div'); col.className = 'brCol';
    col.innerHTML = `<h4>${ROUND_NAMES[r]}${r === 2 ? '' : 's'}</h4>`;
    for (let m = 0; m < 4 >> r; m++) {
      const box = document.createElement('div'); box.className = 'brMatch';
      for (const e of [ps ? ps[2 * m] : null, ps ? ps[2 * m + 1] : null]) {
        const row = document.createElement('div');
        if (!e) { row.className = 'brP tbd'; row.textContent = '—'; box.appendChild(row); continue; }
        const info = entryInfo(e), won = T.winners[r] && T.winners[r].includes(e), lost = T.winners[r] && !won;
        row.className = 'brP' + (info.me ? ' me' : '') + (won ? ' won' : '') + (lost ? ' lost' : '');
        const cv = document.createElement('canvas'); cv.width = cv.height = 30; cv.style.width = cv.style.height = '30px';
        row.appendChild(cv); const nm = document.createElement('span'); nm.textContent = info.name; row.appendChild(nm);
        box.appendChild(row); setTimeout(() => drawPortraitCanvas(cv, info.look, 'neutral'));
      }
      col.appendChild(box);
    }
    cols.appendChild(col);
  }
  const champ = T.winners[2] && T.winners[2][0];
  const btn = $('brPlay');
  if (champ) { btn.textContent = 'Collect & leave'; btn.onclick = () => { prof.tour = null; saveProf(); openTour(); }; }
  else if (T.out) { btn.textContent = 'Back to the World Tour'; btn.onclick = () => { prof.tour = null; saveProf(); openTour(); }; }
  else { const o = entryInfo(myOpponent(T)); btn.textContent = `Play ${ROUND_NAMES[T.round].toLowerCase()} vs ${o.name}`; btn.onclick = () => playTourMatch(); }
  $('brChamp').textContent = champ ? `🏆 Champion: ${entryInfo(champ).name}` : '';
  show('bracket');
}
function playTourMatch() {
  const T = prof.tour, V = VENUES[T.v], o = entryInfo(myOpponent(T));
  showVS({ opp: o, stage: `${V.name} · ${ROUND_NAMES[T.round]}`, stakes: T.round === 2 ? `Winner takes ${V.prize.toLocaleString()} credits` : `First to ${V.race[T.round]}`, go: () => {
    newGame({ game: V.game, vs: 'cpu', persona: { skill: Math.min(4, Math.round(o.skill)), style: o.char.style }, char: o.char, room: V.room, match: { raceTo: V.race[T.round], score: [0, 0], tour: true } });
  } });
}
// called by finishGame when a tournament match is decided
function tourMatchDone(won) {
  const T = prof.tour, V = VENUES[T.v], ps = roundPlayers(T, T.round), winners = [];
  for (let m = 0; m < ps.length / 2; m++) {
    const a = ps[2 * m], b = ps[2 * m + 1];
    winners.push(a === 'me' || b === 'me' ? (won ? 'me' : (a === 'me' ? b : a)) : simMatch(a, b));
  }
  T.winners[T.round] = winners;
  let title, reason = '', primary;
  if (!won) {
    T.out = true;
    // play out the rest of the bracket so the champion shows
    for (let r = T.round + 1; r < 3; r++) { const p2 = T.winners[r - 1], w = []; for (let m = 0; m < p2.length / 2; m++) w.push(simMatch(p2[2 * m], p2[2 * m + 1])); T.winners[r] = w; }
    const cons = T.round === 2 ? Math.round(V.prize * 0.35) : T.round === 1 ? Math.round(V.prize * 0.12) : 0;
    if (cons) addCoins(cons);
    addXP(20 + 20 * T.round);
    title = `Knocked out in the ${ROUND_NAMES[T.round].toLowerCase()}`;
    reason = cons ? `Runner-up money: ${cons} credits.` : 'Better luck next time.';
    primary = ['See the bracket', openBracket];
  } else if (T.round === 2) {
    T.round = 3; prof.trophies[T.v]++; addCoins(V.prize); addXP(250 * (T.v + 1));
    unlock(['hall1', 'hall2', 'hall_neon', 'hall3'][T.v]);
    if (T.v + 1 < VENUES.length && !prof.owned.room.includes(VENUES[T.v + 1].room)) prof.owned.room.push(VENUES[T.v + 1].room);
    if (!prof.owned.room.includes(V.room)) prof.owned.room.push(V.room);
    if (T.v === 3 && !prof.owned.cue.includes(5)) { prof.owned.cue.push(5); notify("You won the Champion's Cue!"); }
    title = `🏆 ${V.name} champion!`;
    reason = `Prize: ${V.prize.toLocaleString()} credits.${T.v + 1 < VENUES.length && prof.trophies[T.v] === 1 ? ` The ${VENUES[T.v + 1].name} is now open.` : ''}`;
    primary = ['Lift the trophy', openBracket];
    confetti(160);
  } else {
    T.round++; addXP(60);
    title = `Through to the ${ROUND_NAMES[T.round].toLowerCase()}!`;
    reason = `Next up: ${entryInfo(myOpponent(T)).name}.`;
    primary = ['Next round', openBracket];
  }
  saveProf();
  showResult({ title, reason, primary });
}
function openTour() {
  const list = $('tourList'); list.innerHTML = '';
  VENUES.forEach((V, v) => {
    const open = venueOpen(v), card = document.createElement('div'); card.className = 'venue' + (open ? '' : ' locked');
    const champ = castById(V.champ);
    card.innerHTML = `<canvas width="64" height="64"></canvas><div class="vinfo"><b>${esc(V.name)}${prof.trophies[v] ? ' 🏆' + (prof.trophies[v] > 1 ? '×' + prof.trophies[v] : '') : ''}</b><small>${esc(V.blurb)}</small>
      <small class="tags">${V.game === '9ball' ? '9-Ball' : '8-Ball'} · Champion: ${esc(champ.name)} · Entry ● ${V.entry} · Prize ● ${V.prize.toLocaleString()}</small></div>`;
    const b = document.createElement('button'); b.className = open ? 'gold' : ''; b.disabled = !open;
    b.textContent = open ? 'Enter' : `🔒 Win ${VENUES[v - 1].short}`;
    b.onclick = () => startTour(v); card.appendChild(b);
    list.appendChild(card); drawPortraitCanvas(card.querySelector('canvas'), champ.look, 'smirk');
  });
  const T = prof.tour;
  $('tourResume').hidden = !(T && !T.out && T.round < 3);
  if (T && !T.out && T.round < 3) $('tourResume').textContent = `Continue: ${VENUES[T.v].name} (${ROUND_NAMES[T.round]})`;
  syncCoins(); show('tour');
}

// ───────────────────────────── VS screen ─────────────────────────────
function showVS({ opp, stage, stakes, go }) {
  Snd.init();
  $('vsStage').textContent = stage; $('vsStakes').textContent = stakes || '';
  $('vsMeName').textContent = prof.name || 'You'; $('vsMeTitle').textContent = `${rankOf(prof.level)} · Lv ${prof.level}`;
  $('vsOppName').textContent = opp.name; $('vsOppTitle').textContent = opp.title || '';
  const line = opp.char && opp.char.lines.intro ? pick(opp.char.lines.intro) : '';
  $('vsQuote').textContent = line; $('vsQuote').hidden = !line;
  const card = $('vs'); card.classList.remove('anim'); void card.offsetWidth; card.classList.add('anim');
  show('vs');
  drawPortraitCanvas($('vsMe'), prof.look, 'smirk'); drawPortraitCanvas($('vsOpp'), opp.look, 'smirk');
  if (line && opp.char) setTimeout(() => Snd.babble(opp.char.voice || 180, line), 650);
  Snd.play('cush', 0.9);
  $('vsGo').onclick = () => { hideAll(); go(); };
}

// ───────────────────────────── quick chat ─────────────────────────────
const CHAT = [['nice', 'Nice shot!'], ['luck', 'Good luck!'], ['oops', 'Oops!'], ['wow', 'Wow!'], ['taunt', 'Is that all you\'ve got?']];
function openChat() {
  const box = $('chatList'); box.innerHTML = '';
  for (const [k, txt] of CHAT) {
    const b = document.createElement('button'); b.textContent = txt;
    b.onclick = () => {
      hideAll(); say(0, txt, true); G.expr[0] = k === 'taunt' ? 'smirk' : k === 'oops' ? 'sad' : 'grin'; G.exprT[0] = 2.5;
      const ch = G.players[1].char;
      if (ch) setTimeout(() => { if (G && !G.over) { say(1, pick(ch.lines.chat[k]), true); G.expr[1] = k === 'taunt' ? 'angry' : 'happy'; G.exprT[1] = 3; } }, 1300);
    };
    box.appendChild(b);
  }
  show('chat');
}

function confetti(n) {
  if (!G) return;
  const cols = ['#f6c344', '#e53e3e', '#3182ce', '#38a169', '#d53f8c', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const a = Math.random(), b = (Math.random() - 0.5) * 300, fall = 200 + Math.random() * 400;
    // "down the screen" is +y on the landscape table and -x on the upright (portrait) table
    G.fx.push(PORT ? { conf: true, x: W + 60 + Math.random() * 300, y: a * H, vx: -fall, vy: b, gx: -500, gy: 0 }
      : { conf: true, x: a * W, y: -60 - Math.random() * 300, vx: b, vy: fall, gx: 0, gy: 500 });
    Object.assign(G.fx[G.fx.length - 1], { spin: (Math.random() - 0.5) * 12, col: cols[i % cols.length], t: 0, life: 3 + Math.random() * 1.5 });
  }
}
