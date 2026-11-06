// Parole : la bouche suit le volume réel de la voix, partagé par Tobi et Nox.
import * as THREE from 'three';

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

// Retire le silence au début et à la fin d'une réplique : les personnages s'enchaînent comme une vraie discussion.
export function trimSilence(buffer, ctx, limit = 0.012) {
  const data = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c)), n = buffer.length;
  const loud = (i) => data.some((d) => Math.abs(d[i]) > limit);
  let a = 0, b = n - 1;
  while (a < n && !loud(a)) a++;
  while (b > a && !loud(b)) b--;
  if (a >= b) return buffer;
  const rate = buffer.sampleRate, start = Math.max(0, a - Math.round(rate * 0.02)), end = Math.min(n, b + Math.round(rate * 0.05));
  const out = ctx.createBuffer(buffer.numberOfChannels, end - start, rate);
  data.forEach((d, c) => out.copyToChannel(d.subarray(start, end), c));
  return out;
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

// Petits mouvements ajoutés par-dessus l'animation, retirés à l'image suivante.
const euler = new THREE.Euler(), q = new THREE.Quaternion();
export function addRot(bone, x, y, z) {
  if (!bone) return;
  q.setFromEuler(euler.set(x, y, z));
  bone.quaternion.multiply(q);
  (bone.userData.off ||= new THREE.Quaternion()).multiply(q);
}
export function clearRot(bones) {
  for (const b of bones) {
    if (!b?.userData.off) continue;
    b.quaternion.multiply(b.userData.off.invert());
    b.userData.off = null;
  }
}
// Le corps accompagne la voix : chaque mot appuyé déclenche un petit élan, jamais les deux mains en même temps.
export function talkBody(state, dt, head, chest, gain = 1, arms = null) {
  const T = state.talk, target = T ? (T.env ? T.level : 0.7) : 0;
  state.beat = (state.beat || 0) + (target - (state.beat || 0)) * (1 - Math.exp(-dt * 12));
  state.beatT = (state.beatT || 0) + dt;
  state.sincePush = (state.sincePush || 9) + dt;
  const level = T ? (T.env ? T.level : 0.62 + 0.38 * Math.sin(state.beatT * 7.3)) : 0, slow = state.slowLevel || 0;
  if (T && level > 0.5 && level - slow > 0.1 && state.sincePush > 0.32) { // un mot appuyé
    state.sincePush = 0; state.push = 0.65 + 0.35 * level;
    if (Math.random() < 0.35) state.hand = 1 - (state.hand || 0);
  }
  state.slowLevel = slow + (level - slow) * Math.min(1, dt * 9);
  state.push = (state.push || 0) * Math.exp(-dt * 4.8);
  state.swing = (state.swing || 0) + (state.push - (state.swing || 0)) * (1 - Math.exp(-dt * 20)); // part vite, retombe doucement
  const b = state.beat * gain, p = state.swing * gain, t = state.beatT, h = state.hand || 0;
  if (b < 0.01 && p < 0.01) return;
  addRot(head, -0.02 * b - 0.1 * p, 0.05 * b * Math.sin(t * 2.1), 0.03 * b * Math.sin(t * 1.7));
  addRot(chest, -0.03 * p, 0.025 * b * Math.sin(t * 1.3), 0);
  if (arms) {
    addRot(arms[h], -0.14 * b - 0.62 * p, 0, 0);
    addRot(arms[1 - h], -0.08 * b - 0.16 * p, 0, 0);
  }
}

// Corps au repos : respiration et transferts de poids lents, jamais répétitifs.
const drift = (t, a, b) => Math.sin(t * a) + 0.6 * Math.sin(t * b + 1.3);
export function lifeBody(state, dt, b) {
  state.lifeT = (state.lifeT || Math.random() * 40) + dt;
  const t = state.lifeT, air = Math.sin(t * 1.7), calm = state.talk ? 0.6 : 1;
  addRot(b.chest, 0.014 * air, 0, 0);
  addRot(b.spine, 0.012 * calm * drift(t, 0.37, 0.61), 0.016 * calm * drift(t, 0.23, 0.53), 0.012 * calm * drift(t, 0.31, 0.47));
  addRot(b.neck, 0.014 * calm * drift(t, 0.43, 0.79), 0.028 * calm * drift(t, 0.29, 0.67), 0.01 * calm * drift(t, 0.51, 0.37));
  addRot(b.armL, 0.012 * air, 0, 0.01 * drift(t, 0.33, 0.71));
  addRot(b.armR, 0.012 * air, 0, -0.01 * drift(t, 0.27, 0.59));
}

// Garde-fou pour tous les mouvements libres : une main ne passe ni dans l'autre, ni dans le buste.
// La correction pivote le haut du bras, elle reste donc continue et invisible quand rien ne se touche.
const hand = new THREE.Vector3(), shoulder = new THREE.Vector3(), from = new THREE.Vector3(), to = new THREE.Vector3(), turnBy = new THREE.Quaternion();
const MIDDLE = 0.15, TORSO_X = 0.17, TORSO_FRONT = 0.17;
export function keepHandsApart(root, bones) {
  root.updateMatrixWorld(true);
  for (const [n, s] of [['L', 1], ['R', -1]]) {
    const arm = bones[`arm_${n}`], parent = arm.parent;
    bones[`hand_${n}`].getWorldPosition(hand); arm.getWorldPosition(shoulder);
    bones.chest.worldToLocal(hand);
    let dx = Math.max(0, MIDDLE - s * hand.x), dz = 0;
    if (Math.abs(hand.x) < TORSO_X && hand.y > -0.34 && hand.y < 0.2) dz = Math.max(0, TORSO_FRONT - hand.z);
    if (!dx && !dz) continue;
    hand.x += s * dx; hand.z += dz;
    bones.chest.localToWorld(hand); // position voulue
    to.copy(hand); parent.worldToLocal(to);
    bones[`hand_${n}`].getWorldPosition(from); parent.worldToLocal(from);
    parent.worldToLocal(shoulder);
    from.sub(shoulder).normalize(); to.sub(shoulder).normalize();
    arm.quaternion.premultiply(turnBy.setFromUnitVectors(from, to));
  }
}
