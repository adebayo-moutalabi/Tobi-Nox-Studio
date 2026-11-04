// Son du film : bruitages synthétisés et musique de fond qui s'efface sous les voix.
const noises = new WeakMap();
function noise(ctx) {
  if (noises.has(ctx)) return noises.get(ctx);
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < d.length; i++) { s = (s * 1664525 + 1013904223) % 4294967296; d[i] = s / 2147483648 - 1; }
  noises.set(ctx, b);
  return b;
}
function env(ctx, dest, t, peak, attack, release) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  g.connect(dest);
  return g;
}
function tone(ctx, dest, t, freq, peak, release, type = 'sine', to = 0) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + release);
  o.connect(env(ctx, dest, t, peak, 0.004, release));
  o.start(t); o.stop(t + release + 0.05);
}
function burst(ctx, dest, t, peak, release, filter, freq, q = 1, to = 0) {
  const s = ctx.createBufferSource(); s.buffer = noise(ctx);
  const f = ctx.createBiquadFilter(); f.type = filter; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + release);
  s.connect(f); f.connect(env(ctx, dest, t, peak, 0.002, release));
  s.start(t, (t * 7.31) % 0.8, release + 0.05);
}

export function playSfx(ctx, dest, type, t) {
  if (type === 'key') { burst(ctx, dest, t, 0.16, 0.028, 'highpass', 2200); tone(ctx, dest, t, 190, 0.08, 0.03); }
  if (type === 'pop') { tone(ctx, dest, t, 420, 0.2, 0.09, 'sine', 900); burst(ctx, dest, t, 0.05, 0.05, 'highpass', 3000); }
  if (type === 'ding') { tone(ctx, dest, t, 1320, 0.15, 0.6); tone(ctx, dest, t + 0.01, 1980, 0.08, 0.45); }
  if (type === 'whoosh') burst(ctx, dest, t, 0.09, 0.24, 'bandpass', 500, 1.2, 2600);
}

// Boucle lo-fi discrète, jouée à partir d'accords : aucune licence à gérer.
const CHORDS = [[220, 261.63, 329.63, 392], [174.61, 220, 261.63, 329.63], [130.81, 196, 246.94, 329.63], [196, 246.94, 293.66, 440]];
function loFi(ctx, dest, seconds) {
  const beat = 60 / 86, bar = beat * 4;
  const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 1400; soft.connect(dest);
  for (let t = 0, b = 0; t < seconds; t += bar, b++) {
    const c = CHORDS[b % 4];
    c.forEach((f, i) => { tone(ctx, soft, t + i * 0.018, f, 0.075, bar * 0.95, 'triangle'); tone(ctx, soft, t + beat * 2.5 + i * 0.018, f, 0.04, beat * 1.3, 'triangle'); });
    tone(ctx, soft, t, c[0] / 2, 0.2, beat * 1.7); tone(ctx, soft, t + beat * 2, c[0] / 2, 0.14, beat * 1.2);
    for (let k = 0; k < 8; k++) burst(ctx, dest, t + k * beat / 2, k % 2 ? 0.012 : 0.022, 0.035, 'highpass', 6500);
    for (const k of [1, 3]) burst(ctx, soft, t + k * beat, 0.05, 0.11, 'bandpass', 900, 0.7);
  }
}

// Baisse la musique pendant les voix, pour que les répliques restent devant.
export function addMusic(ctx, dest, seconds, clips, file) {
  const bus = ctx.createGain(), high = 0.3, low = 0.12;
  bus.gain.setValueAtTime(high, 0);
  for (const c of [...clips].sort((a, b) => a.start - b.start)) {
    bus.gain.setTargetAtTime(low, Math.max(0, c.start - 0.08), 0.03);
    bus.gain.setTargetAtTime(high, c.start + c.buffer.duration + 0.05, 0.12);
  }
  bus.gain.setTargetAtTime(0, Math.max(0, seconds - 0.8), 0.2);
  bus.connect(dest);
  if (file) { const s = ctx.createBufferSource(); s.buffer = file; s.loop = true; s.connect(bus); s.start(0); } else loFi(ctx, bus, seconds);
}
