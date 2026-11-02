/* Clubhouse 8-Ball — synthesised table sounds: cue, balls, cushions and pockets. */
'use strict';
// ───────────────────────────── audio ─────────────────────────────
// All sounds are synthesised: a master bus with a gentle compressor (so big breaks don't
// distort) and a short room reverb send that gives the pool-hall body.
const Snd = {
  ac: null, on: true, noise: null, last: 0, out: null,
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
  tick() { if (this.on && this.ac) this.tone(1800, 1800, 0.06, 0.25, this.ac.currentTime, 'square'); },
};

