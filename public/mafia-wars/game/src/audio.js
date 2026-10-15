// Audio: ElevenLabs-generated samples (assets/sfx/*.mp3) on three buses (sfx / ambience / music),
// positional playback for anything that happens in the world (distance falloff + stereo pan),
// and the old WebAudio synth kept as a fallback whenever a sample is missing or not decoded yet.
const NAMES = ['shot', 'shot_far', 'reload', 'impact', 'bodyhit', 'hitmarker', 'kill', 'step', 'hurt', 'death',
  'explode', 'ability', 'snitch', 'homies', 'victory', 'defeat', 'ambience', 'rocket', 'rocket_reload', 'rubble'];
const raw = {};            // name -> ArrayBuffer (fetched at boot, before the audio context may exist)
const buf = {};            // name -> AudioBuffer (decoded after the first user gesture)
let ctx = null, master = null, sfxBus = null, ambBus = null, noiseBuf = null, ambSrc = null;
let muted = false;
try { muted = localStorage.getItem('hw_muted') === '1'; } catch (e) { /* storage blocked */ }

// fetch the files early so they're ready the moment the player taps
export const audioReady = Promise.all(NAMES.map((n) =>
  fetch(`assets/sfx/${n}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => { if (b) raw[n] = b; }).catch(() => {})));

export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
  // gentle bus compressor so stacked gunfire doesn't clip
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
  sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(comp); comp.connect(master);
  ambBus = ctx.createGain(); ambBus.gain.value = 0.55; ambBus.connect(master);
  const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = b;
  audioReady.then(() => Promise.all(NAMES.map((k) => raw[k] ? ctx.decodeAudioData(raw[k].slice(0)).then((ab) => { buf[k] = ab; }).catch(() => {}) : null)))
    .then(startAmbience);
}
export function setMuted(m) { muted = m; try { localStorage.setItem('hw_muted', m ? '1' : '0'); } catch (e) { /* ignore */ } if (master) master.gain.value = m ? 0 : 0.9; }
export const isMuted = () => muted;

// ---------- listener (set every frame from the camera) ----------
const L = { x: 0, y: 0, z: 0, yaw: 0 };
export function setListener(pos, yaw) { L.x = pos.x; L.y = pos.y; L.z = pos.z; L.yaw = yaw; }
function spatial(p) {
  const dx = p.x - L.x, dz = p.z - L.z, dist = Math.hypot(dx, dz, (p.y || 0) - L.y);
  // right vector of a camera looking down -z rotated by yaw
  const rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw);
  const pan = dist > 0.5 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / dist)) : 0;
  return { dist, pan };
}

// ---------- sample playback ----------
function play(name, { vol = 1, rate = 1, pan = 0, jitter = 0.05, delay = 0, bus = sfxBus, lowpass = 0 } = {}) {
  if (!ctx || !buf[name]) return false;
  const s = ctx.createBufferSource(); s.buffer = buf[name];
  s.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * jitter);
  const g = ctx.createGain(); g.gain.value = vol;
  let node = s;
  if (lowpass) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass; node.connect(f); node = f; }
  node.connect(g);
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan * 0.85; g.connect(p); p.connect(bus); } else g.connect(bus);
  s.start(ctx.currentTime + delay);
  return true;
}
// play a sample at a world position: falloff, pan, and air absorption (distant = darker)
function playAt(name, pos, { vol = 1, ref = 4, max = 120, rate = 1 } = {}) {
  const { dist, pan } = spatial(pos);
  if (dist > max) return false;
  const att = Math.min(1, ref / Math.max(ref, dist));
  const lp = dist > 25 ? Math.max(1200, 16000 - dist * 160) : 0;
  return play(name, { vol: vol * att, pan, rate, lowpass: lp });
}

// ---------- synth fallback (the v0.1 sounds) ----------
const now = () => ctx.currentTime;
function noise(dur, { f = 1200, q = 0.7, type = 'bandpass', gain = 1, decay = dur, delay = 0 } = {}) {
  if (!ctx) return;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
  const g = ctx.createGain(); const t = now() + delay; g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  s.connect(flt).connect(g).connect(sfxBus); s.start(t); s.stop(t + dur + 0.05);
}
function tone(f0, f1, dur, { type = 'sine', gain = 0.5, delay = 0 } = {}) {
  if (!ctx) return;
  const o = ctx.createOscillator(); o.type = type; const t = now() + delay;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
}

// ---------- the game-facing API ----------
export const sfx = {
  // the player's own AK: full-range sample, no panning
  shot({ rate = 1, vol = 0.85 } = {}) { if (!ctx) return; if (!play('shot', { vol, rate, jitter: 0.04 })) { noise(0.18, { f: 900, q: 0.5, gain: 1.1, decay: 0.16 }); noise(0.4, { f: 180, q: 0.8, type: 'lowpass', gain: 0.9, decay: 0.35 }); tone(160, 40, 0.12, { gain: 0.7 }); } },
  // someone else's AK somewhere in the world: near = the close sample, far = the distant burst sample
  shotAt(pos) {
    if (!ctx) return; const { dist } = spatial(pos);
    if (dist < 35) { if (!playAt('shot', pos, { vol: 0.75, ref: 5 })) noise(0.18, { f: 900, gain: 0.6 / (1 + dist * 0.06), decay: 0.16 }); }
    else playAt('shot_far', pos, { vol: 0.5, ref: 35, max: 160 });
  },
  dry() { if (!ctx) return; tone(1200, 900, 0.03, { type: 'square', gain: 0.12 }); },
  // player's bullet connects: crisp marker + body thud (the ElevenLabs thud is quiet, so a small synth thump sits under it)
  hit() { if (!ctx) return; if (!play('hitmarker', { vol: 0.55, jitter: 0.02 })) tone(2200, 1800, 0.05, { type: 'triangle', gain: 0.22 }); play('bodyhit', { vol: 0.6, delay: 0.01 }); tone(140, 60, 0.09, { gain: 0.18 }); },
  kill() { if (!ctx) return; if (!play('kill', { vol: 0.7, jitter: 0 })) { tone(880, 1320, 0.12, { type: 'triangle', gain: 0.25 }); tone(1320, 1760, 0.16, { type: 'triangle', gain: 0.2, delay: 0.08 }); } },
  impactAt(pos) { if (!ctx) return; if (!playAt('impact', pos, { vol: 0.6, ref: 3, max: 50 })) noise(0.06, { f: 2400, gain: 0.08, decay: 0.05 }); },
  hurt() { if (!ctx) return; if (!play('hurt', { vol: 0.75, jitter: 0.08 })) { noise(0.25, { f: 400, q: 0.6, type: 'lowpass', gain: 0.6, decay: 0.22 }); tone(120, 60, 0.3, { gain: 0.3 }); } },
  death() { if (!ctx) return; play('death', { vol: 0.8, jitter: 0.03 }); },
  deathAt(pos) { if (!ctx) return; playAt('death', pos, { vol: 0.6, ref: 4, max: 45 }); },
  reload({ rate = 1, vol } = {}) { if (!ctx) return; if (!play('reload', { vol: vol ?? 0.7, rate, jitter: 0 })) { tone(700, 300, 0.05, { type: 'square', gain: 0.1 }); noise(0.08, { f: 3000, gain: 0.3, decay: 0.07, delay: 1.5 }); } },
  ability() { if (!ctx) return; if (!play('ability', { vol: 0.75, jitter: 0 })) tone(660, 1320, 0.3, { type: 'sine', gain: 0.18 }); },
  ding() { this.ability(); },
  snitch() { if (!ctx) return; play('snitch', { vol: 0.7, jitter: 0 }); },
  homies() { if (!ctx) return; play('homies', { vol: 0.75, jitter: 0 }); },
  explode(pos) {
    if (!ctx) return;
    const ok = pos ? playAt('explode', pos, { vol: 1, ref: 10, max: 200 }) : play('explode', { vol: 1, jitter: 0.03 });
    if (!ok) { noise(1.2, { f: 120, q: 0.5, type: 'lowpass', gain: 1.4, decay: 1.1 }); tone(90, 25, 0.8, { gain: 0.8 }); }
  },
  rocket() { if (!ctx) return; if (!play('rocket', { vol: 0.9, jitter: 0.03 })) { noise(0.5, { f: 600, q: 0.4, gain: 1.0, decay: 0.45 }); noise(1.2, { f: 2200, q: 0.3, gain: 0.25, decay: 1.1 }); tone(220, 60, 0.35, { gain: 0.6 }); } },
  rocketReload() { if (!ctx) return; if (!play('rocket_reload', { vol: 0.7, jitter: 0 })) { tone(500, 300, 0.08, { type: 'square', gain: 0.1 }); noise(0.1, { f: 2500, gain: 0.25, decay: 0.09, delay: 1.6 }); tone(700, 400, 0.08, { type: 'square', gain: 0.12, delay: 2.4 }); } },
  rubbleAt(pos) { if (!ctx) return; if (!playAt('rubble', pos, { vol: 0.8, ref: 6, max: 60 })) noise(0.6, { f: 300, q: 0.5, type: 'lowpass', gain: 0.5, decay: 0.55 }); },
  step() { if (!ctx) return; if (!play('step', { vol: 0.35, jitter: 0.12 })) noise(0.08, { f: 500, q: 0.8, type: 'lowpass', gain: 0.12, decay: 0.07 }); },
  victory() { if (!ctx) return; duckAmbience(4); play('victory', { vol: 0.85, jitter: 0 }); },
  defeat() { if (!ctx) return; duckAmbience(4); play('defeat', { vol: 0.85, jitter: 0 }); },
  // a random far-off burst somewhere in the neighbourhood, for atmosphere
  distantGunfire() { if (!ctx) return; const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 60; playAt('shot_far', { x: L.x + Math.cos(a) * r, y: 0, z: L.z + Math.sin(a) * r }, { vol: 0.35, ref: 70, max: 200 }); },
};

// ---------- ambience: the 20 s ElevenLabs loop, cross-faded at the seam ----------
function startAmbience() {
  if (!ctx || ambSrc) return;
  if (!buf.ambience) { // fallback: filtered noise hum
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    const g = ctx.createGain(); g.gain.value = 0.05; s.connect(f).connect(g).connect(ambBus); s.start(); ambSrc = s; return;
  }
  const s = ctx.createBufferSource(); s.buffer = buf.ambience; s.loop = true;
  s.loopStart = 0.05; s.loopEnd = buf.ambience.duration - 0.05;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
  s.connect(g).connect(ambBus); s.start(); ambSrc = s;
}
function duckAmbience(sec) {
  if (!ctx) return; const t = ctx.currentTime;
  ambBus.gain.cancelScheduledValues(t); ambBus.gain.setValueAtTime(ambBus.gain.value, t);
  ambBus.gain.linearRampToValueAtTime(0.15, t + 0.3); ambBus.gain.linearRampToValueAtTime(0.55, t + sec);
}

// QA helper: which samples are decoded and whether the context is running
export function audioStatus() { return { state: ctx ? ctx.state : 'none', decoded: Object.keys(buf).sort(), missing: NAMES.filter((n) => !buf[n]), ambience: !!ambSrc }; }
