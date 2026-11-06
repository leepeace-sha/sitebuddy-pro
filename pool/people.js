/* Clubhouse 8-Ball — people: cartoon portraits drawn in code, the cast of rival characters,
   what they say during a match, and the speech-bubble system. */
'use strict';

// ───────────────────────────── portrait renderer ─────────────────────────────
// A look describes a face: { skin, hair, hairColor, eyes, beard, hat, hatColor, glasses, top, topColor, bg, earring }
// Expressions: neutral, happy, grin, smirk, angry, sad, shock. `talk` animates the mouth.
const SKINS = ['#f6d3b3', '#eabf98', '#d39b6f', '#b07a4f', '#8a5634', '#5f3a22'];
const HAIR_COLORS = ['#1c1410', '#3b2414', '#6b4423', '#b06a2b', '#d9b26b', '#9aa0a8', '#e8e6e2', '#d6336c', '#2b8fd6', '#38a169'];
const TOP_COLORS = ['#2b6cb0', '#c53030', '#2f855a', '#6b46c1', '#1a202c', '#b7791f', '#d53f8c', '#4a5568', '#e2e8f0', '#0f766e'];
const BG_COLORS = ['#2c5282', '#742a2a', '#22543d', '#44337a', '#1a202c', '#975a16', '#702459', '#234e52'];
const HAIRS = ['short', 'side', 'spiky', 'curly', 'long', 'bun', 'bald', 'mohawk', 'afro', 'pony', 'buzz', 'slick'];
const BEARDS = ['none', 'stubble', 'mustache', 'goatee', 'full'];
const HATS = ['none', 'cap', 'beanie', 'fedora', 'headband', 'crown', 'headphones'];
const GLASSES = ['none', 'round', 'shades', 'aviator'];
const TOPS = ['tee', 'hoodie', 'vest', 'jacket', 'suit'];

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), k = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`;
}
// draws a portrait centred at (x, y) filling a circle of radius r
function drawFace(c, L, x, y, r, expr = 'neutral', talk = 0, t = 0, round = true) {
  const s = r / 100;
  c.save(); c.translate(x, y);
  if (round) { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip(); }
  c.scale(s, s);
  // background
  const bg = c.createRadialGradient(0, -30, 10, 0, 0, 140);
  bg.addColorStop(0, shade(L.bg, 1.5)); bg.addColorStop(1, shade(L.bg, 0.6));
  c.fillStyle = bg; c.fillRect(-150, -150, 300, 300);
  const skin = L.skin, skinD = shade(skin, 0.82), hairC = L.hairColor;
  // long hair behind the head
  c.fillStyle = hairC;
  if (L.hair === 'long') { c.beginPath(); c.ellipse(0, 10, 66, 82, 0, 0, TAU); c.fill(); }
  if (L.hair === 'pony') { c.beginPath(); c.ellipse(52, 18, 16, 46, -0.3, 0, TAU); c.fill(); }
  if (L.hair === 'afro') { for (const [ax, ay, ar] of [[0, -40, 62], [-48, -10, 34], [48, -10, 34], [-38, -48, 30], [38, -48, 30]]) { c.beginPath(); c.arc(ax, ay, ar, 0, TAU); c.fill(); } }
  // body / top
  const tc = L.topColor;
  c.fillStyle = tc; c.beginPath(); c.ellipse(0, 128, 92, 62, 0, 0, TAU); c.fill();
  c.fillStyle = skinD; c.fillRect(-16, 48, 32, 30);                       // neck
  if (L.top === 'tee') { c.fillStyle = skinD; c.beginPath(); c.ellipse(0, 72, 22, 12, 0, 0, Math.PI); c.fill(); }
  if (L.top === 'hoodie') {
    c.fillStyle = shade(tc, 0.8); c.beginPath(); c.ellipse(0, 76, 42, 18, 0, 0, TAU); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(-10, 84); c.lineTo(-12, 110); c.moveTo(10, 84); c.lineTo(12, 110); c.stroke();
  }
  if (L.top === 'vest' || L.top === 'jacket' || L.top === 'suit') {
    c.fillStyle = L.top === 'vest' ? '#f7fafc' : L.top === 'suit' ? '#f7fafc' : shade(tc, 1.25);
    c.beginPath(); c.moveTo(-22, 70); c.lineTo(0, 118); c.lineTo(22, 70); c.closePath(); c.fill();
    c.fillStyle = shade(tc, 0.75);
    c.beginPath(); c.moveTo(-24, 68); c.lineTo(-2, 120); c.lineTo(-40, 110); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(24, 68); c.lineTo(2, 120); c.lineTo(40, 110); c.closePath(); c.fill();
    if (L.top === 'suit') { c.fillStyle = '#c53030'; c.beginPath(); c.moveTo(-9, 76); c.lineTo(9, 76); c.lineTo(0, 86); c.closePath(); c.fill(); c.beginPath(); c.moveTo(0, 84); c.lineTo(-6, 110); c.lineTo(0, 116); c.lineTo(6, 110); c.closePath(); c.fill(); }
  }
  // ears
  c.fillStyle = skin; c.beginPath(); c.ellipse(-56, 2, 11, 16, 0, 0, TAU); c.ellipse(56, 2, 11, 16, 0, 0, TAU); c.fill();
  if (L.earring) { c.fillStyle = '#f6e05e'; c.beginPath(); c.arc(-57, 20, 5, 0, TAU); c.fill(); }
  // head
  const hg = c.createRadialGradient(-14, -18, 10, 0, 0, 80); hg.addColorStop(0, shade(skin, 1.06)); hg.addColorStop(1, skinD);
  c.fillStyle = hg; c.beginPath(); c.ellipse(0, 0, 55, 64, 0, 0, TAU); c.fill();
  // cheeks
  c.fillStyle = 'rgba(230,90,90,0.18)'; c.beginPath(); c.ellipse(-32, 20, 11, 7, 0, 0, TAU); c.ellipse(32, 20, 11, 7, 0, 0, TAU); c.fill();
  // beard
  if (L.beard === 'stubble') { c.fillStyle = shade(hairC, 1) + ''; c.globalAlpha = 0.28; c.beginPath(); c.ellipse(0, 32, 44, 32, 0, 0, Math.PI); c.fill(); c.globalAlpha = 1; }
  if (L.beard === 'full') { c.fillStyle = hairC; c.beginPath(); c.moveTo(-52, 6); c.quadraticCurveTo(-50, 70, 0, 76); c.quadraticCurveTo(50, 70, 52, 6); c.quadraticCurveTo(30, 30, 0, 30); c.quadraticCurveTo(-30, 30, -52, 6); c.fill(); }
  if (L.beard === 'goatee') { c.fillStyle = hairC; c.beginPath(); c.ellipse(0, 52, 13, 14, 0, 0, TAU); c.fill(); }
  // hair on top
  c.fillStyle = hairC;
  const H = L.hair;
  if (H === 'short' || H === 'side' || H === 'pony' || H === 'bun' || H === 'long' || H === 'slick') {
    // crown of hair with a natural hairline: low at the temples, higher at the parting
    c.beginPath(); c.moveTo(-57, 4);
    c.bezierCurveTo(-64, -50, -30, -74, 0, -72); c.bezierCurveTo(30, -74, 64, -50, 57, 4);
    c.lineTo(52, 2); c.quadraticCurveTo(50, -28, 30, -36);
    c.quadraticCurveTo(H === 'side' ? -6 : 0, H === 'side' ? -22 : -42, -30, -36);
    c.quadraticCurveTo(-50, -28, -52, 2); c.closePath(); c.fill();
    if (H === 'side') { c.beginPath(); c.moveTo(-50, -30); c.quadraticCurveTo(-10, -60, 34, -40); c.quadraticCurveTo(-4, -30, -50, -14); c.closePath(); c.fill(); }
    if (H === 'slick') { c.strokeStyle = shade(hairC, 1.6); c.lineWidth = 3; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 14 - 10, -60); c.quadraticCurveTo(i * 14 + 6, -45, i * 14 + 22, -40); c.stroke(); } }
    if (H === 'bun') { c.beginPath(); c.arc(0, -72, 20, 0, TAU); c.fill(); }
    if (H === 'long') { c.beginPath(); c.ellipse(-50, 10, 12, 40, 0, 0, TAU); c.ellipse(50, 10, 12, 40, 0, 0, TAU); c.fill(); }
  } else if (H === 'spiky') {
    c.beginPath(); c.moveTo(-58, -20);
    for (let i = 0; i <= 8; i++) { const a = Math.PI + i * Math.PI / 8; c.lineTo(Math.cos(a) * 66, Math.sin(a) * 74 - 10 - (i % 2 ? 18 : 0)); }
    c.lineTo(58, -20); c.quadraticCurveTo(0, -30, -58, -20); c.fill();
  } else if (H === 'curly') {
    for (let i = 0; i < 11; i++) { const a = Math.PI * 1.02 + i * Math.PI * 0.96 / 10; c.beginPath(); c.arc(Math.cos(a) * 50, Math.sin(a) * 56 - 14, 17, 0, TAU); c.fill(); }
  } else if (H === 'mohawk') {
    c.beginPath(); c.moveTo(-12, -40); for (let i = 0; i < 5; i++) { c.lineTo(-12 + i * 6, -96 + (i % 2) * 14); } c.lineTo(14, -40); c.closePath(); c.fill();
    c.globalAlpha = 0.25; c.beginPath(); c.ellipse(0, -36, 56, 30, 0, Math.PI, TAU); c.fill(); c.globalAlpha = 1;
  } else if (H === 'buzz') {
    c.globalAlpha = 0.75; c.beginPath(); c.ellipse(0, -30, 56, 38, 0, Math.PI, TAU); c.fill(); c.globalAlpha = 1;
  } else if (H === 'afro') { /* drawn behind */ } else if (H === 'bald') {
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(-16, -46, 14, 8, -0.4, 0, TAU); c.fill();
  }
  // eyes
  const blink = (Math.sin(t * 1.3 + (L.seed || 0)) > 0.985) ? 1 : 0;
  const eye = (ex) => {
    if (blink || expr === 'happy') { c.strokeStyle = '#1a1a1a'; c.lineWidth = 4; c.beginPath(); c.arc(ex, 4, 8, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); return; }
    const wide = expr === 'shock' ? 1.35 : 1;
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, 0, 10 * wide, 11 * wide, 0, 0, TAU); c.fill();
    c.fillStyle = '#2d2016'; c.beginPath(); c.arc(ex + 2, 1, 5.5, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + 4, -2, 1.8, 0, TAU); c.fill();
    if (expr === 'smirk' || expr === 'angry') { c.fillStyle = skinD; c.fillRect(ex - 12, -14, 24, 9); }
  };
  eye(-21); eye(21);
  // brows
  const bA = expr === 'angry' ? 0.35 : expr === 'sad' ? -0.3 : expr === 'shock' ? -0.1 : expr === 'smirk' ? 0.15 : 0;
  const bY = expr === 'shock' ? -24 : -17;
  c.strokeStyle = shade(hairC === '#e8e6e2' ? '#9aa0a8' : hairC, 0.9); c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-31, bY - 10 * bA); c.lineTo(-11, bY + 10 * bA); c.moveTo(31, bY - 10 * (expr === 'smirk' ? -0.3 : bA)); c.lineTo(11, bY + 10 * (expr === 'smirk' ? -0.3 : bA)); c.stroke();
  // nose
  c.strokeStyle = shade(skin, 0.7); c.lineWidth = 3; c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(-6, 20, 2, 22); c.stroke();
  // mustache
  if (L.beard === 'mustache' || L.beard === 'full') { c.fillStyle = hairC; c.beginPath(); c.ellipse(-11, 31, 13, 6, 0.2, 0, TAU); c.ellipse(11, 31, 13, 6, -0.2, 0, TAU); c.fill(); }
  // mouth
  c.lineWidth = 4; c.strokeStyle = '#5a1f1f'; c.fillStyle = '#5a1f1f';
  const open = talk ? (Math.sin(t * 22) * 0.5 + 0.5) : 0;
  if (open > 0.15 || expr === 'shock') {
    const h = expr === 'shock' ? 10 : 4 + 8 * open;
    c.beginPath(); c.ellipse(0, 40, expr === 'shock' ? 8 : 12, h, 0, 0, TAU); c.fill();
  } else if (expr === 'grin' || expr === 'happy') {
    c.beginPath(); c.moveTo(-20, 36); c.quadraticCurveTo(0, 58, 20, 36); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.fillRect(-14, 37, 28, 5);
  } else if (expr === 'smirk') { c.beginPath(); c.moveTo(-12, 42); c.quadraticCurveTo(6, 44, 18, 34); c.stroke(); }
  else if (expr === 'sad' || expr === 'angry') { c.beginPath(); c.moveTo(-14, 46); c.quadraticCurveTo(0, 34, 14, 46); c.stroke(); }
  else { c.beginPath(); c.moveTo(-13, 40); c.quadraticCurveTo(0, 46, 13, 40); c.stroke(); }
  // glasses
  if (L.glasses === 'round') { c.strokeStyle = '#2d2d2d'; c.lineWidth = 3.5; c.beginPath(); c.arc(-21, 0, 15, 0, TAU); c.moveTo(36, 0); c.arc(21, 0, 15, 0, TAU); c.moveTo(-6, 0); c.lineTo(6, 0); c.stroke(); }
  if (L.glasses === 'shades' || L.glasses === 'aviator') {
    c.fillStyle = L.glasses === 'aviator' ? 'rgba(160,110,40,0.85)' : '#111';
    c.beginPath(); if (L.glasses === 'aviator') { c.ellipse(-21, 3, 17, 14, 0, 0, TAU); c.ellipse(21, 3, 17, 14, 0, 0, TAU); } else { rr(c, -40, -10, 34, 22, 6); c.rect(6, -10, 34, 22); }
    c.fill(); c.strokeStyle = '#111'; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, -2); c.lineTo(6, -2); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-27, -3, 6, 3, -0.4, 0, TAU); c.ellipse(15, -3, 6, 3, -0.4, 0, TAU); c.fill();
  }
  // headwear
  const hc = L.hatColor || '#c53030';
  if (L.hat === 'cap') {
    c.fillStyle = hc; c.beginPath(); c.ellipse(0, -40, 58, 36, 0, Math.PI, TAU); c.fill();
    c.fillStyle = shade(hc, 0.75); c.beginPath(); c.ellipse(22, -40, 46, 11, -0.05, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -62, 8, 0, TAU); c.fill();
  } else if (L.hat === 'beanie') {
    c.fillStyle = hc; c.beginPath(); c.ellipse(0, -38, 58, 40, 0, Math.PI, TAU); c.fill(); c.fillRect(-58, -44, 116, 16);
    c.fillStyle = shade(hc, 0.8); c.fillRect(-58, -36, 116, 12); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -80, 9, 0, TAU); c.fill();
  } else if (L.hat === 'fedora') {
    c.fillStyle = shade(hc, 0.7); c.beginPath(); c.ellipse(0, -40, 84, 14, 0, 0, TAU); c.fill();
    c.fillStyle = hc; c.beginPath(); c.moveTo(-44, -42); c.quadraticCurveTo(-46, -92, 0, -86); c.quadraticCurveTo(46, -92, 44, -42); c.closePath(); c.fill();
    c.fillStyle = '#1a1a1a'; c.fillRect(-44, -54, 88, 10);
  } else if (L.hat === 'headband') {
    c.fillStyle = hc; c.fillRect(-57, -38, 114, 13);
  } else if (L.hat === 'crown') {
    c.fillStyle = '#f6c344'; c.beginPath(); c.moveTo(-40, -50); c.lineTo(-44, -92); c.lineTo(-20, -68); c.lineTo(0, -98); c.lineTo(20, -68); c.lineTo(44, -92); c.lineTo(40, -50); c.closePath(); c.fill();
    c.strokeStyle = '#a0701a'; c.lineWidth = 2; c.stroke();
    for (const [gx, gc] of [[-24, '#e53e3e'], [0, '#3182ce'], [24, '#38a169']]) { c.fillStyle = gc; c.beginPath(); c.arc(gx, -60, 5, 0, TAU); c.fill(); }
  } else if (L.hat === 'headphones') {
    c.strokeStyle = '#222'; c.lineWidth = 9; c.beginPath(); c.arc(0, -8, 62, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    c.fillStyle = hc; c.beginPath(); rr(c, -74, -14, 20, 34, 8); c.fill(); c.beginPath(); rr(c, 54, -14, 20, 34, 8); c.fill();
  }
  c.restore();
}

// ───────────────────────────── the cast ─────────────────────────────
// skill 0–4 (see SKILLS in core.js), style from STYLES. voice = pitch of their chatter blips.
const L_ = (o) => Object.assign({ skin: SKINS[1], hair: 'short', hairColor: HAIR_COLORS[1], beard: 'none', hat: 'none', hatColor: '#c53030', glasses: 'none', top: 'tee', topColor: TOP_COLORS[0], bg: BG_COLORS[0], earring: false }, o);
const CAST = [
  { id: 'rusty', name: 'Rusty', full: 'Rusty McGraw', title: 'The Bar Brawler', skill: 0, style: 'aggressive', voice: 140, look: L_({ skin: SKINS[0], hair: 'short', hairColor: HAIR_COLORS[3], beard: 'stubble', hat: 'cap', hatColor: '#c53030', top: 'tee', topColor: '#c53030', bg: BG_COLORS[1], seed: 1 }),
    bio: 'Hits every ball like it owes him money.',
    lines: { intro: ['Rack \'em up! I\'ll have this done before my drink gets warm.', 'You? Against ME? Somebody call your mum.'], greet: ['Let\'s make some noise!', 'Hope you brought a helmet.'],
      myGood: ['BOOM! Did you see that?!', 'That\'s how we do it down the Corner Pocket!', 'Hit it hard, hit it proud!'], myMiss: ['The table\'s crooked, I swear.', 'Aw, come ON!', 'That pocket moved!'], myFoul: ['Who put that ball there?!', 'Ref! ...wait, there\'s no ref.'],
      youGood: ['Lucky. Pure luck.', 'Okay, okay, not bad.', 'Beginner\'s luck lasts one game, pal.'], youMiss: ['HA! My nan hits it better than that!', 'Ooh, that\'s gotta sting.'], youFoul: ['Free shot for Rusty! Thank you kindly!'],
      pressure: ['Don\'t choke now!', 'Nerves kicking in, eh?'], win: ['Told ya! Drinks are on you!', 'Rusty wins again! Write it on the wall!'], lose: ['Fine. Best of 99?', 'I was going easy on you. Obviously.'],
      chat: { nice: ['Yeah, I know.', 'Tell me something I don\'t know!'], luck: ['I don\'t need luck!', 'Keep it, you\'ll need it.'], oops: ['HA! Classic.'], wow: ['Wait till you see my next one!'], taunt: ['Big words for someone so small!', 'Oh it\'s ON now!'] } } },
  { id: 'dot', name: 'Granny Dot', full: 'Dorothy "Dot" Pembrook', title: 'The Sweet Hustler', skill: 1, style: 'safe', voice: 330, look: L_({ skin: SKINS[0], hair: 'bun', hairColor: HAIR_COLORS[6], glasses: 'round', top: 'jacket', topColor: '#6b46c1', bg: BG_COLORS[3], earring: true, seed: 2 }),
    bio: 'Bakes on Sundays, hustles on Mondays.',
    lines: { intro: ['Oh, what a lovely young thing. This won\'t hurt a bit, dear.', 'I\'ve been playing since before your parents were born, sweetie.'], greet: ['Good luck, dearie!', 'Shall we have a nice little game?'],
      myGood: ['Oh my, did I do that?', 'Just like my late husband taught me.', 'Silly me, it went in again!'], myMiss: ['Oh, my eyes aren\'t what they were.', 'Fiddlesticks!'], myFoul: ['Oh dear, oh dear. Butterfingers.'],
      youGood: ['Well aren\'t you clever!', 'Lovely shot, dear. Have a biscuit.'], youMiss: ['Never mind, dear. Practice makes perfect.', 'Oh, bless.'], youFoul: ['Granny will just take that, thank you.'],
      pressure: ['Steady hands now, sweetheart.'], win: ['That was fun! Same time next week, dear?', 'Don\'t tell your friends you lost to a granny.'], lose: ['Well done, dear! You\'ve earned a cup of tea.', 'Oh, you\'re a natural!'],
      chat: { nice: ['Thank you, dear!'], luck: ['Aren\'t you sweet.'], oops: ['Oh, these things happen, dear.'], wow: ['Oh stop it, you\'ll make me blush!'], taunt: ['Mind your manners, young one.', 'I\'ll be telling your mother.'] } } },
  { id: 'lou', name: 'Big Lou', full: 'Louis "Big Lou" Moretti', title: 'The Bank Man', skill: 1, style: 'banker', voice: 95, look: L_({ skin: SKINS[2], hair: 'bald', hairColor: HAIR_COLORS[0], beard: 'mustache', top: 'vest', topColor: '#1a202c', bg: BG_COLORS[5], seed: 3 }),
    bio: 'Owns the bar. Owns the cushions too.',
    lines: { intro: ['Welcome to my bar. House rules: I bank everything.', 'Every cushion in this place is my friend.'], greet: ['Let\'s see what you got, kid.'],
      myGood: ['Off the rail and in. Like I planned it.', 'The cushion never lies.', 'Bank on it.'], myMiss: ['Huh. That cushion\'s getting old.', 'Needs new rubber, this table.'], myFoul: ['Eh, I meant that.'],
      youGood: ['Not bad, kid. Not bad at all.', 'You\'ve been practising.'], youMiss: ['Ooh. Should\'ve banked it.'], youFoul: ['Ball in hand. My favourite.'],
      pressure: ['Big moment, kid. Breathe.'], win: ['The house always wins.', 'Come back anytime. Bring credits.'], lose: ['Kid, you just earned a free soda.', 'You\'re alright. You\'re alright.'],
      chat: { nice: ['Appreciate it, kid.'], luck: ['Luck\'s for amateurs.'], oops: ['Happens to everybody.'], wow: ['Forty years of practice, kid.'], taunt: ['Careful. I own the jukebox.'] } } },
  { id: 'ziggy', name: 'Ziggy', full: 'Ziggy Park', title: 'The Speedrunner', skill: 0, style: 'aggressive', voice: 260, look: L_({ skin: SKINS[1], hair: 'spiky', hairColor: HAIR_COLORS[8], hat: 'headphones', hatColor: '#38a169', top: 'hoodie', topColor: '#2f855a', bg: BG_COLORS[2], seed: 4 }),
    bio: 'Plays pool like it\'s a video game. Mostly on hard mode.',
    lines: { intro: ['Speedrun any%: beat you in under five minutes. Let\'s go!', 'Loading victory... 99%...'], greet: ['GG in advance!', 'Let\'s goooo!'],
      myGood: ['Clip that!', 'No-scope pot!', 'Easy mode.'], myMiss: ['Lag! That was lag!', 'Bro the hitbox is broken.'], myFoul: ['Controller disconnected, I swear.'],
      youGood: ['Okay that was actually cracked.', 'Wait, are you hacking?'], youMiss: ['Skill issue!', 'L + ratio... kidding, kidding.'], youFoul: ['Free respawn for me!'],
      pressure: ['Boss fight music intensifies!'], win: ['GG EZ! ...okay, GG close.', 'New personal best!'], lose: ['GG! Rematch, rematch!', 'Okay you\'re actually good. Respect.'],
      chat: { nice: ['Thanks! I\'m kind of a big deal.'], luck: ['Don\'t need luck, got skill!'], oops: ['F in the chat.'], wow: ['I KNOW right?!'], taunt: ['Oof, toxic! Reported! ...jk.'] } } },
  { id: 'marguerite', name: 'Marguerite', full: 'Marguerite Delacroix', title: 'The Duchess', skill: 2, style: 'safe', voice: 290, look: L_({ skin: SKINS[0], hair: 'long', hairColor: HAIR_COLORS[0], top: 'suit', topColor: '#742a2a', bg: BG_COLORS[6], earring: true, seed: 5 }),
    bio: 'Plays 9-ball like chess. Never rushes. Never smiles.',
    lines: { intro: ['How quaint. Do try to keep up.', 'Pool is chess with round pieces, darling.'], greet: ['Shall we?', 'Charmed, I\'m sure.'],
      myGood: ['As expected.', 'Elementary.', 'Precision, darling.'], myMiss: ['How tiresome.', 'A rare lapse.'], myFoul: ['That was... deliberate. Probably.'],
      youGood: ['Hm. Acceptable.', 'Not entirely without talent.'], youMiss: ['Tragic.', 'Oh dear. Do take your time.'], youFoul: ['How very generous of you.'],
      pressure: ['Hands trembling, darling?'], win: ['Do come again. When you\'ve improved.', 'Checkmate.'], lose: ['Well played. I suppose.', 'I shall remember this.'],
      chat: { nice: ['I know, darling.'], luck: ['Luck is for those without a plan.'], oops: ['Indeed.'], wow: ['Merci.'], taunt: ['How terribly common.'] } } },
  { id: 'hector', name: 'Hurricane', full: 'Hector "Hurricane" Ruiz', title: 'The Storm', skill: 2, style: 'aggressive', voice: 170, look: L_({ skin: SKINS[3], hair: 'curly', hairColor: HAIR_COLORS[0], beard: 'goatee', top: 'jacket', topColor: '#c05621', bg: BG_COLORS[1], seed: 6 }),
    bio: 'Fast, loud and dangerous. Never takes more than three seconds a shot.',
    lines: { intro: ['Category five, baby! Batten down the hatches!', 'You hear that? That\'s the storm coming.'], greet: ['Let\'s dance!', 'Vamos!'],
      myGood: ['WHOOSH! Gone!', 'The hurricane strikes!', 'Too fast for you!'], myMiss: ['Ay! Too much power.', 'Just a breeze, that one.'], myFoul: ['Even storms make mistakes!'],
      youGood: ['Ooh, you got some wind in you!', 'Respect, amigo.'], youMiss: ['Calm before the storm, eh?'], youFoul: ['The storm thanks you!'],
      pressure: ['Feel the wind, amigo?'], win: ['Blown away! Hasta luego!', 'Nobody survives the Hurricane!'], lose: ['You weathered the storm. Respect.', 'Next time, I bring the thunder.'],
      chat: { nice: ['Gracias!'], luck: ['Suerte to you too!'], oops: ['Ay, happens.'], wow: ['Hurricane style!'], taunt: ['You want the storm? You GOT the storm!'] } } },
  { id: 'professor', name: 'The Professor', full: 'Professor Alastair Quill', title: 'The Geometrist', skill: 3, style: 'banker', voice: 120, look: L_({ skin: SKINS[0], hair: 'side', hairColor: HAIR_COLORS[5], glasses: 'round', beard: 'none', top: 'suit', topColor: '#744210', bg: BG_COLORS[4], seed: 7 }),
    bio: 'Calculates every angle to three decimal places.',
    lines: { intro: ['Angle of incidence equals angle of reflection. Class is in session.', 'I have calculated a 94.7 percent chance of victory.'], greet: ['Let us begin the lesson.'],
      myGood: ['Simple geometry.', 'Precisely as calculated.', 'Q.E.D.'], myMiss: ['A rounding error.', 'Fascinating. The cloth has a nap.'], myFoul: ['An experimental shot. For science.'],
      youGood: ['Remarkable intuition!', 'You\'ve been studying.'], youMiss: ['Your angle was off by four degrees.', 'Tsk. Revise your fundamentals.'], youFoul: ['A teachable moment.'],
      pressure: ['The variables are against you.'], win: ['Class dismissed.', 'Your homework: practise banks.'], lose: ['Extraordinary. I must revise my model.', 'You\'ve surpassed the teacher.'],
      chat: { nice: ['Thank you. It was trigonometry.'], luck: ['Luck is merely unexplained probability.'], oops: ['A data point, nothing more.'], wow: ['Elementary, really.'], taunt: ['Detention!'] } } },
  { id: 'nina', name: 'Neon Nina', full: 'Nina Voss', title: 'The DJ', skill: 2, style: 'aggressive', voice: 300, look: L_({ skin: SKINS[1], hair: 'mohawk', hairColor: HAIR_COLORS[7], glasses: 'shades', top: 'jacket', topColor: '#d53f8c', bg: BG_COLORS[6], earring: true, seed: 8 }),
    bio: 'Runs the decks at the Neon Lounge. Drops balls like beats.',
    lines: { intro: ['Turn it UP! Tonight the table is my dancefloor.', 'Hope you can keep the tempo, babe.'], greet: ['Let\'s drop this beat!', 'Ready to party?'],
      myGood: ['Drop the bass!', 'And THAT\'S the hook!', 'On the beat!'], myMiss: ['Record scratch!', 'Off-beat, my bad.'], myFoul: ['Skipped a track there.'],
      youGood: ['Ooh, you\'ve got rhythm!', 'Okay, that was a banger.'], youMiss: ['Bit of a flat note, babe.'], youFoul: ['Encore for me!'],
      pressure: ['Here comes the drop... or does it?'], win: ['That\'s a wrap! Mic drop!', 'Thank you, goodnight!'], lose: ['You stole the show tonight.', 'Okay, you\'re headlining next time.'],
      chat: { nice: ['Thanks, babe!'], luck: ['Vibes over luck!'], oops: ['Scratch that!'], wow: ['I know, right?!'], taunt: ['Ooh, spicy! Love it.'] } } },
  { id: 'duke', name: 'Duke', full: 'Duke Delmar', title: 'The Smooth Operator', skill: 3, style: 'balanced', voice: 110, look: L_({ skin: SKINS[4], hair: 'short', hairColor: HAIR_COLORS[0], beard: 'mustache', hat: 'fedora', hatColor: '#2d3748', top: 'suit', topColor: '#2d3748', bg: BG_COLORS[7], seed: 9 }),
    bio: 'Never raises his voice. Never needs to.',
    lines: { intro: ['Evening. Let\'s keep this classy.', 'They say I play like velvet. Let\'s find out.'], greet: ['After you.'],
      myGood: ['Smooth.', 'Like butter.', 'Mm-hm.'], myMiss: ['Well now.', 'A little jazz in that one.'], myFoul: ['Pardon me.'],
      youGood: ['Now that\'s style.', 'Well played, friend.'], youMiss: ['Easy now.'], youFoul: ['Much obliged.'],
      pressure: ['Stay cool. Stay smooth.'], win: ['A pleasure doing business.', 'Goodnight, friend.'], lose: ['Tip of the hat to you.', 'Class act. Well deserved.'],
      chat: { nice: ['Much appreciated.'], luck: ['And to you, friend.'], oops: ['Happens to the best of us.'], wow: ['Just a little finesse.'], taunt: ['Now, now. Let\'s keep it classy.'] } } },
  { id: 'ice', name: 'Ice', full: 'Ingrid "Ice" Holm', title: 'The Silent Assassin', skill: 3, style: 'safe', voice: 200, look: L_({ skin: SKINS[0], hair: 'buzz', hairColor: HAIR_COLORS[6], glasses: 'shades', top: 'jacket', topColor: '#1a202c', bg: BG_COLORS[4], seed: 10 }),
    bio: 'Has never been heard to say more than four words in a row.',
    lines: { intro: ['...', 'Rack.'], greet: ['...'],
      myGood: ['.', 'Next.', '...'], myMiss: ['Hm.', '...'], myFoul: ['...noted.'],
      youGood: ['...good.', 'Hm.'], youMiss: ['...'], youFoul: ['Thanks.'],
      pressure: ['Cold yet?'], win: ['Done.', 'Next.'], lose: ['...well played.', 'You. Good.'],
      chat: { nice: ['...'], luck: ['Don\'t need it.'], oops: ['...'], wow: ['...'], taunt: ['...cute.'] } } },
  { id: 'viper', name: 'Viper', full: 'Vince "Viper" Kade', title: 'The Trash Talker', skill: 3, style: 'aggressive', voice: 150, look: L_({ skin: SKINS[2], hair: 'slick', hairColor: HAIR_COLORS[0], beard: 'stubble', glasses: 'aviator', top: 'jacket', topColor: '#2f855a', bg: BG_COLORS[2], seed: 11 }),
    bio: 'Strikes first, strikes fast, never shuts up.',
    lines: { intro: ['Ssssay goodbye to your trophy dreams.', 'I\'ve eaten better players than you for breakfast.'], greet: ['Let\'s get this over with.'],
      myGood: ['Sssssunk!', 'Too easy.', 'Venom in every shot.'], myMiss: ['You distracted me!', 'Whatever. Still winning.'], myFoul: ['That doesn\'t count.'],
      youGood: ['Even a blind squirrel finds a nut.', 'Luck runs out, friend.'], youMiss: ['Choke much?', 'Hahaha! Seriously?'], youFoul: ['Thanksss for the gift.'],
      pressure: ['Hear that hissing? That\'s your nerves.'], win: ['Bow to the Viper!', 'Another one bites the dust.'], lose: ['This isn\'t over.', 'Rematch. Now.'],
      chat: { nice: ['I know I\'m good.'], luck: ['Luck can\'t save you.'], oops: ['Hahaha!'], wow: ['Get used to it.'], taunt: ['Big talk. Let\'s see the game.'] } } },
  { id: 'queen', name: 'The Queen', full: 'Victoria "The Queen" Vale', title: 'World Champion', skill: 4, style: 'balanced', voice: 240, look: L_({ skin: SKINS[3], hair: 'pony', hairColor: HAIR_COLORS[4], hat: 'crown', top: 'suit', topColor: '#b7791f', bg: BG_COLORS[5], earring: true, seed: 12 }),
    bio: 'Undefeated World Champion for six seasons.',
    lines: { intro: ['Six seasons. Zero defeats. Shall we make it seven?', 'Welcome to the big stage. Try to enjoy it.'], greet: ['May the better player win. It\'ll be me.', 'Good luck. Genuinely.'],
      myGood: ['Champion\'s touch.', 'That\'s why I wear the crown.', 'Textbook.'], myMiss: ['Interesting.', 'You\'ve got a window. Use it.'], myFoul: ['Even queens slip.'],
      youGood: ['Now you\'re playing!', 'Impressive. Truly.'], youMiss: ['Composure is everything.'], youFoul: ['I\'ll take that.'],
      pressure: ['This is where champions are made.', 'Feel the weight of the crown?'], win: ['Seven seasons it is.', 'Come back stronger. I\'ll be waiting.'], lose: ['The crown is yours. Wear it well.', 'Remarkable. A new champion.'],
      chat: { nice: ['Thank you.'], luck: ['Same to you. You\'ll need it.'], oops: ['It happens. Shake it off.'], wow: ['Years of practice.'], taunt: ['Talk is cheap. Trophies aren\'t.'] } } },
];
const castById = id => CAST.find(c => c.id === id);

// generic computer opponent for quick play
const BOT_LOOK = L_({ skin: '#cfd8e3', hair: 'bald', hairColor: '#4a5568', glasses: 'shades', top: 'jacket', topColor: '#4a5568', bg: '#2d3748', seed: 13 });
const BOT = { id: 'bot', name: 'Computer', title: 'Practice Bot', voice: 180, look: BOT_LOOK, lines: { intro: ['Ready to play.'], greet: ['Good luck.'], myGood: ['Nice.'], myMiss: ['Miss.'], myFoul: ['Foul.'], youGood: ['Good shot.'], youMiss: ['Unlucky.'], youFoul: ['Ball in hand.'], pressure: ['On the 8.'], win: ['Good game.'], lose: ['Well played.'], chat: { nice: ['Thanks.'], luck: ['You too.'], oops: ['Unlucky.'], wow: ['Thanks.'], taunt: ['...'] } } };
const P2_LOOK = L_({ skin: SKINS[2], hair: 'curly', hairColor: HAIR_COLORS[2], top: 'hoodie', topColor: '#d53f8c', bg: BG_COLORS[6], seed: 14 });

// ───────────────────────────── speech bubbles ─────────────────────────────
// G.talk = [{ who: 0|1, text, t, dur }] drawn by render.js; say() picks a line for an event.
const pick = a => a[(Math.random() * a.length) | 0];
let lastSay = 0;
function say(who, text, force) {
  if (!G || G.demo || !text) return;
  const now = performance.now();
  if (!force && now - lastSay < 2500) return;
  lastSay = now;
  const dur = Math.min(5.5, 1.8 + text.length * 0.045);
  G.talk = G.talk.filter(b => b.who !== who);
  G.talk.push({ who, text, t: 0, dur });
  const ch = G.players[who].char;
  if (ch) Snd.babble(ch.voice || 180, text);
}
// a character reacts to something; chance < 1 keeps the chatter from being constant
function react(event, chance = 0.5, force = false) {
  if (!G || G.vs !== 'cpu' || G.demo) return;
  const ch = G.players[1].char; if (!ch) return;
  if (!force && Math.random() > chance) return;
  const lines = ch.lines[event]; if (!lines) return;
  say(1, pick(lines), force);
  G.expr[1] = { myGood: 'grin', win: 'grin', youMiss: 'smirk', youFoul: 'smirk', myMiss: 'angry', myFoul: 'sad', youGood: 'shock', lose: 'sad', pressure: 'smirk', intro: 'smirk', greet: 'happy' }[event] || 'neutral';
  G.exprT[1] = 3;
}
