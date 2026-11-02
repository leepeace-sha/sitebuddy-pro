/* Clubhouse 8-Ball — synthesised sound: table sounds, room ambience and crowd reactions. */
'use strict';
// ───────────────────────────── audio ─────────────────────────────
// All sounds are synthesised: a master bus with a gentle compressor (so big breaks don't
// distort) and a short room reverb send that gives the pool-hall body.
const Snd = {
  ac: null, on: true, noise: null, last: 0, out: null, rollG: null,
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try {
      const ac = this.ac = new (window.AudioContext || window.webkitAudioContext)();
      const sr = ac.sampleRate, len = sr * 1, buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.002; comp.release.value = 0.15;
      const warm = ac.createBiquadFilter(); warm.type = 'highshelf'; warm.frequency.value = 5000; warm.gain.value = -6;
      warm.connect(comp); comp.connect(ac.destination);
      this.out = ac.createGain(); this.out.gain.value = 0.9; this.out.connect(warm);
      // room reverb: decaying stereo noise impulse, low-passed so it sounds like a carpeted hall
      const irLen = Math.floor(sr * 0.9), ir = ac.createBuffer(2, irLen, sr);
      for (let ch = 0; ch < 2; ch++) {
        const x = ir.getChannelData(ch); let lp = 0;
        for (let i = 0; i < irLen; i++) { lp += 0.25 * ((Math.random() * 2 - 1) - lp); x[i] = lp * Math.pow(1 - i / irLen, 2.6) * (i < sr * 0.012 ? 0.3 : 1); }
      }
      const conv = ac.createConvolver(); conv.buffer = ir;
      const wet = ac.createGain(); wet.gain.value = 0.32;
      this.out.connect(conv); conv.connect(wet); wet.connect(warm);
      // rolling rumble, driven by how fast the balls are moving
      const rs = ac.createBufferSource(); rs.buffer = buf; rs.loop = true;
      const rf = ac.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 170; rf.Q.value = 0.7;
      this.rollG = ac.createGain(); this.rollG.gain.value = 0;
      rs.connect(rf); rf.connect(this.rollG); this.rollG.connect(this.out); rs.start();
    } catch (e) { this.ac = null; }
  },
  tone(freq, endFreq, dur, gain, t, type = 'sine') {
    const ac = this.ac, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (endFreq !== freq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.02);
  },
  burst(ftype, freq, q, dur, gain, t) {
    const ac = this.ac, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = this.noise; src.playbackRate.value = 0.8 + Math.random() * 0.4;
    f.type = ftype; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.out); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  },
  play(type, vol) {
    if (!this.on || !this.ac || vol < 0.02 || (G && G.demo)) return;
    const t = this.ac.currentTime; vol = Math.min(1, vol);
    if (type === 'ball') {
      if (t - this.last < 0.015) return; this.last = t;
      const p = 0.94 + Math.random() * 0.12, v = 0.15 + vol * 0.85;
      this.burst('bandpass', 2600 * p, 0.9, 0.012, 0.55 * v, t);     // sharp contact
      this.tone(1480 * p, 1400 * p, 0.05, 0.32 * v, t);              // phenolic ring, low
      this.tone(2350 * p, 2250 * p, 0.03, 0.16 * v, t);              // phenolic ring, high
      this.tone(320, 180, 0.05, 0.22 * v, t);                         // body
    } else if (type === 'cush') {
      this.burst('lowpass', 260, 0.7, 0.1, 0.7 * vol, t);
      this.tone(120, 70, 0.12, 0.45 * vol, t);
    } else if (type === 'pocket') {
      this.tone(170, 55, 0.28, 0.6 * vol, t);
      this.burst('lowpass', 500, 0.8, 0.18, 0.5 * vol, t);
      for (let i = 1; i <= 5; i++) {                                  // ball rattling down the return
        const dt = 0.12 + i * (0.07 + Math.random() * 0.03);
        this.burst('bandpass', 900 + Math.random() * 300, 2, 0.03, 0.22 * vol * (1 - i / 7), t + dt);
        this.tone(600 + Math.random() * 100, 500, 0.03, 0.06 * vol, t + dt);
      }
    } else {                                                          // cue tip on ball
      this.burst('bandpass', 1300, 1.1, 0.02, 0.5 * vol, t);
      this.tone(760, 620, 0.04, 0.25 * vol, t);
      this.tone(240, 160, 0.07, 0.35 * vol, t);
    }
  },
  // ── room ambience: distant tables, the odd glass, and a soft murmur of voices ──
  // Voices are buzzy tones shaped by vowel formants with syllable-length envelopes, so they read
  // as far-off conversation rather than noise. Nothing here plays continuously.
  amb: null, ambLevel: 0,
  ambience(level) {
    this.ambLevel = level;
    if (!this.ac) return;
    const ac = this.ac;
    if (!this.amb) {
      const bus = ac.createGain(); bus.gain.value = 0;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      bus.connect(lp); lp.connect(this.out);
      const VOWELS = [[730, 1090], [270, 2290], [530, 1840], [570, 840], [300, 870], [660, 1720], [440, 1020]];
      const voices = [];
      for (let i = 0; i < 4; i++) {
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100 + Math.random() * 110;
        const f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.Q.value = 9; f2.Q.value = 12;
        const g = ac.createGain(); g.gain.value = 0;
        const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
        o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g);
        if (pan) { pan.pan.value = (i / 3) * 1.6 - 0.8; g.connect(pan); pan.connect(bus); } else g.connect(bus);
        o.start();
        voices.push({ o, f1, f2, g, base: o.frequency.value, talk: 0, quiet: Math.random() * 4 });
      }
      this.amb = { bus, voices };
      let last = ac.currentTime;
      setInterval(() => {
        if (!this.amb || !this.ambLevel || !this.on || ac.state !== 'running') return;
        const t = ac.currentTime, dt = t - last; last = t;
        for (const v of this.amb.voices) {
          if (v.quiet > 0) { v.quiet -= dt; if (v.quiet <= 0) v.talk = 1 + Math.random() * 3.5; continue; }
          if (v.talk <= 0) { v.quiet = 1.5 + Math.random() * 5; continue; }
          // one syllable
          const len = 0.12 + Math.random() * 0.16, [F1, F2] = VOWELS[(Math.random() * VOWELS.length) | 0], amp = 0.25 + Math.random() * 0.75;
          v.f1.frequency.setTargetAtTime(F1, t, 0.03); v.f2.frequency.setTargetAtTime(F2, t, 0.03);
          v.o.frequency.setTargetAtTime(v.base * (0.9 + Math.random() * 0.25), t, 0.08);
          v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(amp, t, 0.025); v.g.gain.setTargetAtTime(0, t + len, 0.04);
          v.talk -= len + 0.04;
        }
        // other tables and the bar, far away
        if (Math.random() < 0.05) { const vol = 0.06 + Math.random() * 0.08, k = 1 + (Math.random() * 3 | 0);
          for (let i = 0; i < k; i++) this.distant(t + i * (0.08 + Math.random() * 0.25), vol * (1 - i * 0.2)); }
        if (Math.random() < 0.012) for (const [fr, d] of [[2950, 0], [4400, 0.004]]) this.tone(fr, fr, 0.45, 0.02 * this.ambLevel, t + d);
      }, 170);
    }
    this.amb.bus.gain.setTargetAtTime(this.on ? 0.022 * level : 0, ac.currentTime, 0.5);
  },
  distant(t, vol) {            // a muffled ball click from another table
    const v = vol * this.ambLevel, p = 0.9 + Math.random() * 0.2;
    this.tone(1300 * p, 1250 * p, 0.04, 0.5 * v, t);
    this.tone(2100 * p, 2050 * p, 0.025, 0.25 * v, t);
    this.tone(260, 170, 0.05, 0.3 * v, t);
  },
  // ── crowd reaction: a burst of applause, built once from hundreds of tiny claps ──
  clapBuf: null,
  crowd(strength) {
    if (!this.on || !this.ac || (G && G.demo) || !this.ambLevel) return;
    const ac = this.ac, sr = ac.sampleRate;
    if (!this.clapBuf) {
      const len = Math.floor(sr * 2.6), buf = ac.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let k = 0; k < 420; k++) {
          const t0 = Math.pow(Math.random(), 1.6) * 2.2, at = Math.floor(t0 * sr), amp = (0.3 + Math.random() * 0.7) * Math.exp(-t0 * 1.1);
          const dl = Math.floor(sr * (0.004 + Math.random() * 0.006));
          for (let i = 0; i < dl && at + i < len; i++) d[at + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / (dl * 0.3));
        }
        for (let i = 0; i < Math.floor(sr * 0.05); i++) d[i] *= i / (sr * 0.05);
      }
      this.clapBuf = buf;
    }
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = this.clapBuf; f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 0.6;
    g.gain.value = 0.22 * Math.min(1.5, strength) * this.ambLevel;
    src.connect(f); f.connect(g); g.connect(this.out); src.start();
  },
  tick() { if (this.on && this.ac) this.tone(1800, 1800, 0.06, 0.25, this.ac.currentTime, 'square'); },
  roll(level) {
    if (!this.rollG) return;
    const v = this.on && !(G && G.demo) ? Math.min(0.12, level * 0.35) : 0;
    this.rollG.gain.setTargetAtTime(v, this.ac.currentTime, 0.08);
  },
};

