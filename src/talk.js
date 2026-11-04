// Parole : la bouche suit le volume réel de la voix, partagé par Tobi et Nox.
const RATE = 50;

// Volume de la voix, 50 fois par seconde. `cum` dit quelle part de la phrase est déjà dite.
export function envelope(buffer) {
  const n = Math.max(1, Math.ceil(buffer.duration * RATE)), raw = new Float32Array(n), step = buffer.sampleRate / RATE;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  for (let i = 0; i < n; i++) {
    let sum = 0, count = 0;
    const end = Math.min(channels[0].length, Math.floor((i + 1) * step));
    for (let s = Math.floor(i * step); s < end; s += 8) { for (const ch of channels) { sum += ch[s] * ch[s]; count++; } }
    raw[i] = count ? Math.sqrt(sum / count) : 0;
  }
  const peak = [...raw].sort((a, b) => a - b)[Math.floor(n * 0.95)] || 1;
  const level = new Float32Array(n), cum = new Float32Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.min(1, raw[i] / peak);
    level[i] = x < 0.08 ? 0 : x;
    total += level[i];
    cum[i] = total;
  }
  if (total) for (let i = 0; i < n; i++) cum[i] /= total;
  return { rate: RATE, seconds: buffer.duration, level, cum };
}

export function createTalk(seq, onEnd, duration, env) {
  if (env) seq.forEach((x) => { x.d = x.v === ' ' ? 0.02 : 0.078; }); // les silences viennent de l'audio
  else if (duration) { const k = duration / seq.reduce((n, x) => n + x.d, 0); seq.forEach((x) => { x.d *= k; }); }
  return { seq, i: 0, t: 0, onEnd, env, clock: 0, done: 0, level: 1, total: seq.reduce((n, x) => n + x.d, 0) };
}

// Avance la parole. Renvoie true quand la réplique est finie.
export function stepTalk(T, dt) {
  if (!T.env) {
    T.t += dt;
    while (T.i < T.seq.length && T.t > T.seq[T.i].d) { T.t -= T.seq[T.i].d; T.i++; }
    return T.i >= T.seq.length;
  }
  T.clock += dt;
  if (T.clock >= T.env.seconds) return true;
  const n = Math.min(T.env.level.length - 1, Math.floor(T.clock * T.env.rate)), said = T.env.cum[n] * T.total;
  while (T.i < T.seq.length - 1 && said > T.done + T.seq[T.i].d) { T.done += T.seq[T.i].d; T.i++; }
  T.level = T.env.level[n];
  return false;
}

// Forme de bouche de l'instant, ouverte selon le volume de la voix.
export function talkShape(viseme, T) {
  if (!T.env) return viseme;
  const k = Math.min(1.1, T.level * 1.25);
  return Object.fromEntries(Object.entries(viseme).map(([m, w]) => [m, w * k]));
}
