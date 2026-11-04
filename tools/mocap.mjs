// Transpose des mouvements enregistrés (Universal Animation Library de Quaternius, CC0) sur le squelette de Tobi.
// Usage : node tools/mocap.mjs chemin/UAL1_Standard.glb   ->  écrit src/mocap.json
import { readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { createCharacter } from '../src/character.js';

const CLIPS = { Idle_Loop: 'idle', Walk_Loop: 'walk', Sitting_Idle_Loop: 'sitting', Sitting_Talking_Loop: 'talk_sit', Idle_Talking_Loop: 'talk_stand' };
const SEATED = new Set(['sitting', 'talk_sit']);
const FPS = 20;

const buf = readFileSync(process.argv[2]);
const jsonLen = buf.readUInt32LE(12), gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString());
const bin = buf.subarray(20 + jsonLen + 8);
const comps = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 };
function accessor(i) {
  const a = gltf.accessors[i], v = gltf.bufferViews[a.bufferView], n = comps[a.type], out = new Float32Array(a.count * n);
  const off = (v.byteOffset || 0) + (a.byteOffset || 0), stride = v.byteStride || n * 4;
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = bin.readFloatLE(off + k * stride + c * 4);
  return out;
}

// Hiérarchie source
const nodes = gltf.nodes.map((n, i) => ({ i, name: n.name, kids: n.children || [], parent: -1, t: new THREE.Vector3(...(n.translation || [0, 0, 0])), r: new THREE.Quaternion(...(n.rotation || [0, 0, 0, 1])), s: new THREE.Vector3(...(n.scale || [1, 1, 1])) }));
nodes.forEach((n) => n.kids.forEach((k) => { nodes[k].parent = n.i; }));
const byName = Object.fromEntries(nodes.map((n) => [n.name, n]));
const order = []; const walk = (n) => { order.push(n); n.kids.forEach((k) => walk(nodes[k])); };
nodes.filter((n) => n.parent < 0).forEach(walk);

function pose(local) { // positions et rotations monde
  const W = new Map(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  for (const n of order) {
    const l = local.get(n.i) || n;
    m.compose(l.t, l.r, n.s);
    const w = n.parent >= 0 ? W.get(n.parent).clone().multiply(m) : m.clone();
    W.set(n.i, w);
  }
  const out = {};
  for (const n of order) { W.get(n.i).decompose(p, q, sc); out[n.name] = { p: p.clone(), q: q.clone() }; }
  return out;
}

const MAP = { hips: 'pelvis', spine: 'spine_01', chest: 'spine_03', neck: 'neck_01', head: 'Head' };
for (const [n, s] of [['L', 'l'], ['R', 'r']]) {
  Object.assign(MAP, { [`shoulder_${n}`]: `clavicle_${s}`, [`arm_${n}`]: `upperarm_${s}`, [`forearm_${n}`]: `lowerarm_${s}`, [`hand_${n}`]: `hand_${s}`, [`upleg_${n}`]: `thigh_${s}`, [`leg_${n}`]: `calf_${s}`, [`foot_${n}`]: `foot_${s}`, [`toe_${n}`]: `ball_${s}` });
  ['index', 'middle', 'ring', 'pinky'].forEach((f, i) => { MAP[`f${i}a_${n}`] = `${f}_01_${s}`; MAP[`f${i}b_${n}`] = `${f}_02_${s}`; });
  MAP[`th_a_${n}`] = `thumb_01_${s}`; MAP[`th_b_${n}`] = `thumb_02_${s}`;
}
// Chaque os vise son enfant : sert à aligner les poses de repos des deux squelettes.
const AIM = {}; // le tronc reste tel quel : les deux squelettes sont déjà droits
for (const n of ['L', 'R']) {
  Object.assign(AIM, { [`shoulder_${n}`]: `arm_${n}`, [`arm_${n}`]: `forearm_${n}`, [`forearm_${n}`]: `hand_${n}`, [`hand_${n}`]: `f1a_${n}`, [`upleg_${n}`]: `leg_${n}`, [`leg_${n}`]: `foot_${n}`, [`foot_${n}`]: `toe_${n}`, [`th_a_${n}`]: `th_b_${n}` });
  for (let i = 0; i < 4; i++) AIM[`f${i}a_${n}`] = `f${i}b_${n}`;
}

const hero = createCharacter();
hero.root.updateMatrixWorld(true);
const T = hero.bones, tp = (b) => T[b].getWorldPosition(new THREE.Vector3());
const rest = pose(new Map());
const side = rest.upperarm_l.p.x;
console.log('repos source : hanche', rest.pelvis.p.toArray().map((x) => +x.toFixed(3)), 'bras gauche x', +side.toFixed(3));

// A : amène la direction de repos de Tobi sur celle de la source
const A = {};
for (const b of Object.keys(MAP)) {
  A[b] = new THREE.Quaternion();
  const c = AIM[b];
  if (!c) { const p = T[b].parent?.name; if (p && A[p]) A[b].copy(A[p]); continue; }
  const dt = tp(c).sub(tp(b)).normalize(), ds = rest[MAP[c]].p.clone().sub(rest[MAP[b]].p).normalize();
  A[b].setFromUnitVectors(dt, ds);
}
const bonesInOrder = Object.keys(MAP).sort((a, b) => { const d = (n) => { let k = 0, x = T[n]; while (x.parent?.isBone) { k++; x = x.parent; } return k; }; return d(a) - d(b); });
const scale = T.hips.getWorldPosition(new THREE.Vector3()).y / rest.pelvis.p.y;

const at = (c, t, n) => {
  let k = 0; const ts = c.times;
  while (k < ts.length - 2 && ts[k + 1] <= t) k++;
  const u = ts.length < 2 ? 0 : Math.min(1, Math.max(0, (t - ts[k]) / (ts[k + 1] - ts[k] || 1)));
  if (n === 4) { const a = new THREE.Quaternion().fromArray(c.vals, k * 4), b = new THREE.Quaternion().fromArray(c.vals, Math.min(ts.length - 1, k + 1) * 4); return a.slerp(b, u); }
  const a = new THREE.Vector3().fromArray(c.vals, k * 3), b = new THREE.Vector3().fromArray(c.vals, Math.min(ts.length - 1, k + 1) * 3); return a.lerp(b, u);
};
const channels = (anim) => anim.channels.map((c) => {
  const s = anim.samplers[c.sampler];
  return { node: c.target.node, path: c.target.path, times: accessor(s.input), vals: accessor(s.output) };
});
const frameAt = (ch, t) => {
  const local = new Map();
  for (const c of ch) {
    if (c.path === 'scale') continue;
    const n = nodes[c.node], l = local.get(n.i) || { t: n.t.clone(), r: n.r.clone() };
    if (c.path === 'rotation') l.r = at(c, t, 4); else l.t = at(c, t, 3);
    local.set(n.i, l);
  }
  return pose(local);
};
// Le tronc source penche vers l'avant par rapport à sa pose de repos : on le redresse d'après la pose debout.
const LEVEL = {};
{
  const P = frameAt(channels(gltf.animations.find((a) => a.name === 'Idle_Loop')), 0);
  for (const b of ['spine', 'chest', 'neck', 'head']) {
    const D = P[MAP[b]].q.clone().multiply(rest[MAP[b]].q.clone().invert()), v = new THREE.Vector3(0, 0, 1).applyQuaternion(D);
    LEVEL[b] = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.asin(v.y));
  }
}

const res = { fps: FPS, bones: bonesInOrder, clips: {} };
for (const anim of gltf.animations) {
  const out = CLIPS[anim.name];
  if (!out) continue;
  const ch = channels(anim);
  const dur = Math.max(...ch.map((c) => c.times[c.times.length - 1]));
  const frames = Math.round(dur * FPS), q = new Float32Array((frames + 1) * bonesInOrder.length * 4), pos = new Float32Array((frames + 1) * 3);
  for (let f = 0; f <= frames; f++) {
    const t = (f / frames) * dur;
    const P = frameAt(ch, t), world = {}, iq = new THREE.Quaternion();
    bonesInOrder.forEach((b, i) => {
      const s = MAP[b], D = P[s].q.clone().multiply(rest[s].q.clone().invert());
      world[b] = D.multiply(A[b]);
      if (LEVEL[b]) world[b].multiply(LEVEL[b]);
      const par = T[b].parent?.isBone ? world[T[b].parent.name] : null;
      iq.copy(world[b]); if (par) iq.premultiply(par.clone().invert());
      iq.toArray(q, (f * bonesInOrder.length + i) * 4);
    });
    P.pelvis.p.clone().multiplyScalar(scale).toArray(pos, f * 3);
  }
  // La position du bassin garde sa place dans la scène
  const mean = [0, 1, 2].map((a) => { let s = 0; for (let f = 0; f <= frames; f++) s += pos[f * 3 + a]; return s / (frames + 1); });
  const goal = SEATED.has(out) ? [0, 0.8 - 0.262, -0.3] : [0, mean[1], 0];
  for (let f = 0; f <= frames; f++) for (let a = 0; a < 3; a++) pos[f * 3 + a] += goal[a] - mean[a];
  const i16 = Int16Array.from(q, (x) => Math.round(Math.max(-1, Math.min(1, x)) * 32767));
  res.clips[out] = { d: dur, q: Buffer.from(i16.buffer).toString('base64'), p: Array.from(pos, (x) => +x.toFixed(4)) };
  console.log(anim.name, '->', out, dur.toFixed(2) + ' s', 'bassin', mean.map((x) => +x.toFixed(3)));
}
writeFileSync('src/mocap.json', JSON.stringify(res));
