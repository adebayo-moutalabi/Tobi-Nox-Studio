// Animations : chaque geste est une fonction de pose échantillonnée en AnimationClip.
// Conventions (os alignés sur le monde, le personnage regarde +Z) :
//  - bras : rz = +s*a écarte, rx < 0 vers l'avant ; avant-bras rx < 0 plie le coude
//  - jambe : rx < 0 vers l'avant ; genou rx > 0 plie
//  - tête / buste : rx > 0 penche en avant, ry tourne
import * as THREE from 'three';

const TAU = Math.PI * 2;
const SIDES = [['L', 1], ['R', -1]];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => ease((t - a) / (b - a));       // 0→1 entre a et b
const bell = (t, a, b, c, d) => seg(t, a, b) * (1 - seg(t, c, d)); // monte puis redescend

function bonesList() {
  const l = ['hips', 'spine', 'chest', 'neck', 'head'];
  for (const [n] of SIDES) {
    l.push(`shoulder_${n}`, `arm_${n}`, `forearm_${n}`, `hand_${n}`, `th_a_${n}`, `th_b_${n}`, `upleg_${n}`, `leg_${n}`, `foot_${n}`, `toe_${n}`);
    for (let i = 0; i < 4; i++) l.push(`f${i}a_${n}`, `f${i}b_${n}`);
  }
  return l;
}

function fingers(P, n, s, curl, thumb = curl * 0.6) {
  for (let i = 0; i < 4; i++) {
    const c = curl * (1 + i * 0.05);
    P[`f${i}a_${n}`] = [0, 0, -s * c];
    P[`f${i}b_${n}`] = [0, 0, -s * c * 1.15];
  }
  P[`th_a_${n}`] = [thumb * 0.5, 0, -s * thumb * 0.3];
  P[`th_b_${n}`] = [0, 0, -s * thumb * 0.7];
}

function base(t = 0) { // posture détendue, bras le long du corps comme sur la vue de face
  const b = Math.sin(t * TAU);
  const P = { pos: [0, 0, 0] };
  P.spine = [0.005 * b, 0, 0];
  P.chest = [0.012 * b, 0, 0];
  P.head = [-0.012 * b, 0, 0];
  for (const [n, s] of SIDES) {
    P[`arm_${n}`] = [0.03, 0, -s * (0.3 - 0.008 * b)];
    P[`forearm_${n}`] = [-0.2, 0, 0];
    P[`hand_${n}`] = [0, 0, -s * 0.06];
    P[`shoulder_${n}`] = [0, 0, s * 0.004 * b];
    fingers(P, n, s, 0.22);
    P[`upleg_${n}`] = [0, s * 0.04, 0];
    P[`leg_${n}`] = [0, 0, 0];
    P[`foot_${n}`] = [0, 0, 0];
  }
  return P;
}
const add = (P, k, x = 0, y = 0, z = 0) => { const v = P[k] || [0, 0, 0]; P[k] = [v[0] + x, v[1] + y, v[2] + z]; };
const mix = (P, k, target, w) => { const v = P[k] || [0, 0, 0]; P[k] = v.map((c, i) => c + (target[i] - c) * w); };
const mixHand = (P, n, s, curl, w, thumb) => {
  const Q = {}; fingers(Q, n, s, curl, thumb);
  for (const k in Q) mix(P, k, Q[k], w);
};
function crouch(P, c) { // flexion des deux jambes, pieds qui restent au sol
  for (const [n] of SIDES) { add(P, `upleg_${n}`, -c); add(P, `leg_${n}`, 2 * c); add(P, `foot_${n}`, -c); }
  P.pos[1] -= 0.6 * (1 - Math.cos(c));
}

// Oriente une main : thumb = direction du pouce, along = direction des doigts (repère du buste)
export function aimHand(P, n, s, armAngle, thumb, along) {
  const eu = (r) => new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], 'XYZ'));
  const parent = eu(P[`arm_${n}`]).multiply(eu(P[`forearm_${n}`]));
  const Z = _v(thumb).normalize(), f = _v(along);
  f.addScaledVector(Z, -f.dot(Z)).normalize();
  const Y = f.clone().negate(), X = Y.clone().cross(Z);
  const M = new THREE.Matrix4().makeBasis(X, Y, Z);
  const C = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), s * armAngle);
  const Q = new THREE.Quaternion().setFromRotationMatrix(M).multiply(C.invert());
  const e = new THREE.Euler(0, 0, 0, 'XYZ').setFromQuaternion(parent.invert().multiply(Q));
  P[`hand_${n}`] = [e.x, e.y, e.z];
}
const aim = (P, n, s, thumb, along) => aimHand(P, n, s, 0.46, thumb, along);

// Cinématique inverse à deux os : place le poignet sur une cible (repère du buste au repos)
const RIG = {};
const _v = (a) => new THREE.Vector3(...a);
function reach(P, n, s, target, pole = [s * 0.6, -0.7, -0.25]) {
  const S = RIG[n].shoulder, d = RIG[n].dir, L1 = RIG[n].l1, L2 = RIG[n].l2;
  const T = _v(target).sub(S);
  const dist = Math.min(T.length(), (L1 + L2) * 0.995);
  const dirT = T.clone().normalize();
  const a = (L1 * L1 + dist * dist - L2 * L2) / (2 * dist);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const pl = _v(pole); pl.addScaledVector(dirT, -pl.dot(dirT)).normalize();
  const E = dirT.clone().multiplyScalar(a).addScaledVector(pl, h);
  const u = E.clone().normalize();
  const f = dirT.clone().multiplyScalar(dist).sub(E).normalize();
  const qa = new THREE.Quaternion().setFromUnitVectors(d, u);
  const wf = new THREE.Quaternion().setFromUnitVectors(u, f).multiply(qa);
  const qf = qa.clone().invert().multiply(wf);
  const e = new THREE.Euler(0, 0, 0, 'XYZ');
  e.setFromQuaternion(qa); P[`arm_${n}`] = [e.x, e.y, e.z];
  e.setFromQuaternion(qf); P[`forearm_${n}`] = [e.x, e.y, e.z];
}
const restWrist = (n) => {
  const P = base(0), e = new THREE.Euler(...P[`arm_${n}`], 'XYZ'), f = new THREE.Euler(...P[`forearm_${n}`], 'XYZ');
  const qa = new THREE.Quaternion().setFromEuler(e), qf = new THREE.Quaternion().setFromEuler(f);
  const { shoulder, dir, l1, l2 } = RIG[n];
  return shoulder.clone().addScaledVector(dir.clone().applyQuaternion(qa), l1).addScaledVector(dir.clone().applyQuaternion(qf).applyQuaternion(qa), l2);
};
const lerp3 = (a, b, w) => [0, 1, 2].map((i) => a.getComponent(i) + (b[i] - a.getComponent(i)) * w);

function gait(t, { thigh, knee, bob, lean, armSwing, elbow, twist, lift = 0 }) {
  const P = base(t * 2);
  const ph = t * TAU;
  P.pos = [Math.sin(ph) * 0.014, bob * Math.cos(2 * ph) - lift, 0];
  add(P, 'hips', 0, -0.13 * twist * Math.sin(ph), 0.03 * Math.sin(ph));
  add(P, 'spine', lean * 0.55, 0.08 * twist * Math.sin(ph), 0);
  add(P, 'chest', lean * 0.45, 0.2 * twist * Math.sin(ph), -0.025 * Math.sin(ph));
  add(P, 'head', -lean * 0.8, -0.1 * twist * Math.sin(ph), 0);
  for (const [n, s] of SIDES) {
    const p = s > 0 ? ph : ph + Math.PI;
    const sw = Math.sin(p);
    const flex = knee * Math.pow(Math.max(0, Math.cos(p + 0.55)), 1.4) + 0.06;
    const th = -thigh * sw - lean * 0.35;
    P[`upleg_${n}`] = [th, s * 0.03, 0];
    P[`leg_${n}`] = [flex, 0, 0];
    const contact = Math.max(0, sw);
    P[`foot_${n}`] = [-(th + flex) * 0.72 - 0.16 * contact, 0, 0];
    P[`toe_${n}`] = [Math.max(0, -sw) * 0.4, 0, 0];
    P[`arm_${n}`] = [armSwing * sw - elbow * 0.2, 0, -s * 0.3];
    P[`forearm_${n}`] = [-elbow - 0.22 * armSwing * (1 - sw), 0, 0];
    fingers(P, n, s, 0.34);
  }
  return P;
}

const loops = {
  idle: [4, (t) => {
    const P = base(t);
    add(P, 'hips', 0, 0.015 * Math.sin(t * TAU), 0.008 * Math.sin(t * TAU));
    add(P, 'head', 0.006 * Math.sin(t * TAU * 2), 0.03 * Math.sin(t * TAU), 0);
    return P;
  }],
  walk: [1.0, (t) => gait(t, { thigh: 0.46, knee: 0.95, bob: 0.013, lean: 0.05, armSwing: 0.42, elbow: 0.3, twist: 0.8 })],
  run: [0.62, (t) => {
    const P = gait(t, { thigh: 0.78, knee: 1.55, bob: 0.03, lean: 0.24, armSwing: 0.75, elbow: 1.35, twist: 1.2, lift: 0.015 });
    for (const [n, s] of SIDES) fingers(P, n, s, 0.8);
    return P;
  }],
  dance: [1.6, (t) => {
    const P = base(t * 2);
    const ph = t * TAU, beat = Math.sin(ph * 2);
    P.pos = [0.05 * Math.sin(ph), -0.012 - 0.018 * Math.abs(beat), 0];
    crouch(P, 0.12 + 0.07 * Math.abs(beat));
    add(P, 'hips', 0, 0.2 * Math.sin(ph), 0.1 * Math.sin(ph));
    add(P, 'spine', 0.02, -0.1 * Math.sin(ph), -0.1 * Math.sin(ph));
    add(P, 'chest', 0.03, -0.15 * Math.sin(ph), -0.07 * Math.sin(ph));
    add(P, 'head', 0.08 * Math.abs(beat), 0.12 * Math.sin(ph), 0.06 * Math.sin(ph));
    for (const [n, s] of SIDES) {
      const q = Math.sin(ph + (s > 0 ? 0 : Math.PI));
      P[`arm_${n}`] = [-0.55 - 0.35 * q, 0, s * (-0.1 + 0.1 * q)];
      P[`forearm_${n}`] = [-1.6 - 0.35 * beat * s, 0, 0];
      fingers(P, n, s, 0.9);
      add(P, `upleg_${n}`, 0, s * 0.1, s * 0.05);
    }
    return P;
  }],
  sad: [5, (t) => {
    const P = base(t);
    add(P, 'spine', 0.14); add(P, 'chest', 0.14); add(P, 'head', 0.3, 0.05 * Math.sin(t * TAU), 0);
    for (const [n, s] of SIDES) { add(P, `shoulder_${n}`, 0.1, 0, -s * 0.05); add(P, `arm_${n}`, 0.02, 0, s * -0.06); }
    return P;
  }],
};

const gestures = {
  wave: [2.6, (t) => {
    const P = base(t);
    const w = bell(t, 0, 0.14, 0.86, 1), f = Math.sin(t * TAU * 4);
    mix(P, 'arm_L', [-0.18, 0, 2.05], w);
    mix(P, 'forearm_L', [-0.5, 0, 0], w);
    add(P, 'forearm_L', 0, 0, 0.32 * f * w);
    mix(P, 'hand_L', [0, 0, 0.1 * f], w);
    mixHand(P, 'L', 1, 0.04, w, 0.05);
    add(P, 'chest', 0, 0.08 * w, -0.05 * w); add(P, 'head', 0, 0.05 * w, 0.06 * w);
    add(P, 'hips', 0, 0, 0.025 * w);
    return P;
  }],
  nod: [1.6, (t) => {
    const P = base(t), w = bell(t, 0, 0.1, 0.8, 1);
    add(P, 'head', 0.2 * w * Math.max(-0.3, Math.sin(t * TAU * 2)));
    add(P, 'neck', 0.1 * w * Math.sin(t * TAU * 2));
    return P;
  }],
  no: [1.8, (t) => {
    const P = base(t), w = bell(t, 0, 0.12, 0.8, 1);
    add(P, 'head', 0, 0.4 * w * Math.sin(t * TAU * 2.5));
    add(P, 'neck', 0, 0.12 * w * Math.sin(t * TAU * 2.5));
    return P;
  }],
  shrug: [2.0, (t) => {
    const P = base(t), w = bell(t, 0.05, 0.28, 0.72, 0.96);
    for (const [n, s] of SIDES) {
      mix(P, `shoulder_${n}`, [0, 0, s * 0.22], w);
      mix(P, `arm_${n}`, [-0.1, s * 0.3, -s * 0.05], w);
      mix(P, `forearm_${n}`, [-1.4, -s * 0.5, 0], w);
      mix(P, `hand_${n}`, [0, -s * 0.5, s * 0.5], w);
      mixHand(P, n, s, 0.08, w, 0.1);
    }
    add(P, 'head', -0.02 * w, 0, 0.13 * w);
    return P;
  }],
  think: [3.6, (t) => {
    const P = base(t), w = bell(t, 0, 0.14, 0.88, 1);
    reach(P, 'R', -1, lerp3(restWrist('R'), [-0.02, 1.235, 0.225], w), [-0.75, -0.6, -0.1]);
    mix(P, 'hand_R', [-0.45, 0, 0.1], w);
    mixHand(P, 'R', -1, 1.05, w, 0.5);
    reach(P, 'L', 1, lerp3(restWrist('L'), [-0.06, 1.0, 0.21], w), [0.8, -0.5, -0.1]);
    mix(P, 'hand_L', [0, 0, 0.2], w);
    add(P, 'head', -0.1 * w + 0.03 * Math.sin(t * TAU * 2) * w, -0.16 * w, 0.08 * w);
    return P;
  }],
  point: [2.2, (t) => {
    const P = base(t), w = bell(t, 0, 0.16, 0.82, 1);
    mix(P, 'arm_L', [-1.28, -0.1, 0.2], w);
    mix(P, 'forearm_L', [-0.18, 0, 0], w);
    mix(P, 'hand_L', [0, 0, 0], w);
    mixHand(P, 'L', 1, 1.25, w, 0.7);
    mix(P, 'f0a_L', [0, 0, 0], w); mix(P, 'f0b_L', [0, 0, 0], w);
    add(P, 'chest', 0, 0.2 * w, 0); add(P, 'head', 0, 0.12 * w, 0);
    return P;
  }],
  clap: [2.4, (t) => {
    const P = base(t), w = bell(t, 0, 0.14, 0.86, 1);
    const c = 0.5 + 0.5 * Math.sin(t * TAU * 5);
    for (const [n, s] of SIDES) {
      reach(P, n, s, lerp3(restWrist(n), [s * (0.012 + 0.075 * c), 1.09, 0.3], w), [s * 0.8, -0.6, -0.2]);
      mix(P, `hand_${n}`, [-0.25, 0, s * 0.1], w);
      mixHand(P, n, s, 0.06, w, 0.1);
    }
    add(P, 'head', 0.02 * w * c, 0, 0);
    return P;
  }],
  bow: [2.6, (t) => {
    const P = base(t), w = bell(t, 0.04, 0.34, 0.66, 0.96);
    add(P, 'hips', 0.34 * w); add(P, 'spine', 0.24 * w); add(P, 'chest', 0.18 * w); add(P, 'head', 0.1 * w);
    for (const [n, s] of SIDES) {
      add(P, `upleg_${n}`, -0.34 * w);
      add(P, `arm_${n}`, -0.32 * w, 0, 0);
    }
    P.pos[2] -= 0.05 * w;
    return P;
  }],
  jump: [1.5, (t) => {
    const P = base(t);
    const prep = bell(t, 0, 0.2, 0.26, 0.34);
    const land = bell(t, 0.68, 0.76, 0.84, 1);
    crouch(P, 0.62 * prep + 0.56 * land);
    add(P, 'spine', 0.18 * prep + 0.14 * land);
    const u = clamp((t - 0.3) / 0.4);
    const air = t > 0.3 && t < 0.7 ? 4 * u * (1 - u) : 0;
    P.pos[1] += 0.46 * air;
    const tuck = air * 0.32;
    for (const [n, s] of SIDES) {
      add(P, `upleg_${n}`, -tuck * 1.1); add(P, `leg_${n}`, tuck * 2); add(P, `foot_${n}`, 0.35 * air);
      const up = bell(t, 0.27, 0.36, 0.62, 0.74);
      add(P, `arm_${n}`, 0.5 * prep, 0, 0);
      mix(P, `arm_${n}`, [-0.25, 0, s * 2.05], up);
      mix(P, `forearm_${n}`, [-0.38, 0, 0], up);
      mixHand(P, n, s, 1.0, up, 0.7);
    }
    add(P, 'head', -0.1 * air);
    return P;
  }],
  cheer: [2.2, (t) => {
    const P = base(t), w = bell(t, 0.02, 0.16, 0.84, 1);
    const b = Math.abs(Math.sin(t * TAU * 2.2));
    crouch(P, 0.1 * w * (1 - b));
    P.pos[1] += 0.1 * b * w;
    for (const [n, s] of SIDES) {
      mix(P, `arm_${n}`, [-0.08, 0, s * 2.35], w);
      mix(P, `forearm_${n}`, [-0.3 - 0.25 * b, 0, 0], w);
      mixHand(P, n, s, 1.15, w, 0.8);
    }
    add(P, 'head', -0.14 * w);
    return P;
  }],
};

// ---- Assis, objets, gestes supplémentaires --------------------------------
function seat(P, w) { // sur une chaise de 42 cm placée 30 cm derrière les pieds
  for (const [n, s] of SIDES) {
    add(P, `upleg_${n}`, -1.48 * w); add(P, `leg_${n}`, 1.48 * w);
    mix(P, `arm_${n}`, [-0.62, 0, -s * 0.36], w);
    mix(P, `forearm_${n}`, [-0.82, 0, 0], w);
  }
  P.pos[1] -= 0.262 * w; P.pos[2] -= 0.3 * w;
}
function floorSit(P, w) { // par terre, jambes devant, appui sur les mains
  for (const [n, s] of SIDES) {
    add(P, `upleg_${n}`, -1.46 * w, s * 0.14 * w); add(P, `leg_${n}`, 0.14 * w); add(P, `foot_${n}`, 0.5 * w);
    mix(P, `arm_${n}`, [0.48, 0, -s * 0.12], w);
    mix(P, `forearm_${n}`, [0.0, 0, 0], w);
    mix(P, `hand_${n}`, [-0.9, 0, 0], w);
  }
  add(P, 'spine', -0.1 * w); add(P, 'head', 0.1 * w);
  P.pos[1] -= 0.615 * w; P.pos[2] -= 0.05 * w;
}
Object.assign(loops, {
  sitting: [4, (t) => { const P = base(t); seat(P, 1); add(P, 'head', 0, 0.05 * Math.sin(t * TAU), 0); return P; }],
  floor_sit: [4, (t) => { const P = base(t); floorSit(P, 1); add(P, 'head', 0, 0.06 * Math.sin(t * TAU), 0); return P; }],
});
const POSES = {
  hold_R: [3, (t) => {
    const P = base(t);
    reach(P, 'R', -1, [-0.27, 0.92, 0.2], [-0.8, -0.6, -0.3]);
    aim(P, 'R', -1, [0.03, 1, 0.12], [0.75, 0, 0.65]);
    mixHand(P, 'R', -1, 1.12, 1, 0.75);
    return P;
  }],
  crossed: [4, (t) => {
    const P = base(t);
    reach(P, 'L', 1, [-0.13, 1.03, 0.2], [0.9, -0.4, 0]);
    reach(P, 'R', -1, [0.13, 1.08, 0.215], [-0.9, -0.4, 0]);
    add(P, 'head', -0.03);
    return P;
  }],
  hips: [4, (t) => {
    const P = base(t);
    for (const [n, s] of SIDES) { reach(P, n, s, [s * 0.255, 0.88, 0.04], [s * 1, 0.1, -0.5]); P[`hand_${n}`] = [0, 0, s * 0.9]; }
    return P;
  }],
  read: [4, (t) => {
    const P = base(t);
    reach(P, 'R', -1, [-0.17, 1.08, 0.36], [-0.8, -0.6, -0.2]);
    reach(P, 'L', 1, [0.17, 1.08, 0.36], [0.8, -0.6, -0.2]);
    aim(P, 'R', -1, [0, 0.8, 0.6], [1, 0, 0]); aim(P, 'L', 1, [0, 0.8, 0.6], [-1, 0, 0]);
    mixHand(P, 'R', -1, 1.0, 1, 0.8); mixHand(P, 'L', 1, 0.8, 1, 0.8);
    add(P, 'head', 0.3 + 0.03 * Math.sin(t * TAU), 0.04 * Math.sin(t * TAU * 2), 0);
    return P;
  }],
  phone: [4, (t) => {
    const P = base(t);
    reach(P, 'R', -1, [-0.12, 1.08, 0.33], [-0.8, -0.6, -0.2]);
    aim(P, 'R', -1, [0, 0.8, 0.6], [1, 0, 0]);
    mixHand(P, 'R', -1, 0.95, 1, 0.7);
    reach(P, 'L', 1, [0.03, 1.02, 0.28], [0.8, -0.6, -0.2]);
    fingers(P, 'L', 1, 0.5, 0.2);
    add(P, 'head', 0.34, 0, 0);
    return P;
  }],
  carry: [4, (t) => {
    const P = base(t);
    reach(P, 'R', -1, [-0.1, 0.98, 0.3], [-0.9, -0.5, -0.1]);
    reach(P, 'L', 1, [0.1, 0.98, 0.3], [0.9, -0.5, -0.1]);
    fingers(P, 'R', -1, 0.4); fingers(P, 'L', 1, 0.4);
    add(P, 'head', 0.16);
    return P;
  }],
};
const MORE = {
  thumb: [2.0, (t) => {
    const P = base(t), w = bell(t, 0, 0.16, 0.84, 1);
    reach(P, 'L', 1, lerp3(restWrist('L'), [0.3, 1.16, 0.36], w), [1, -0.6, -0.3]);
    const Q = { ...P }; aim(Q, 'L', 1, [0.1, 0.1, 1], [0, 1, -0.1]);
    mix(P, 'hand_L', Q.hand_L, w);
    mixHand(P, 'L', 1, 1.25, w, 0);
    add(P, 'head', 0, 0.06 * w, 0.06 * w);
    return P;
  }],
  scratch: [2.4, (t) => {
    const P = base(t), w = bell(t, 0, 0.18, 0.84, 1), f = Math.sin(t * TAU * 6);
    reach(P, 'L', 1, lerp3(restWrist('L'), [0.2 + 0.012 * f, 1.47, 0.0], w), [1, -0.2, -0.3]);
    mix(P, 'hand_L', [0, 0, -0.7], w);
    mixHand(P, 'L', 1, 0.75, w, 0.3);
    add(P, 'head', 0, -0.08 * w, 0.12 * w);
    return P;
  }],
  stop: [1.9, (t) => {
    const P = base(t), w = bell(t, 0, 0.14, 0.82, 1);
    reach(P, 'L', 1, lerp3(restWrist('L'), [0.2, 1.2, 0.5], w), [1, -0.6, 0]);
    const Q = { ...P }; aim(Q, 'L', 1, [-1, 0, 0], [0, 1, 0.1]);
    mix(P, 'hand_L', Q.hand_L, w);
    mixHand(P, 'L', 1, 0.02, w, 0.05);
    return P;
  }],
  come: [2.3, (t) => {
    const P = base(t), w = bell(t, 0, 0.13, 0.86, 1), f = 0.5 + 0.5 * Math.sin(t * TAU * 4);
    reach(P, 'L', 1, lerp3(restWrist('L'), [0.27, 1.12, 0.36], w), [1, -0.6, -0.2]);
    mix(P, 'hand_L', [-0.5, 0, 0.5], w);
    mixHand(P, 'L', 1, 0.15 + 0.9 * f, w, 0.2);
    add(P, 'head', 0, 0, 0.08 * w);
    return P;
  }],
  facepalm: [2.6, (t) => {
    const P = base(t), w = bell(t, 0.03, 0.2, 0.82, 1);
    reach(P, 'L', 1, lerp3(restWrist('L'), [0.05, 1.42, 0.25], w), [1, -0.6, 0]);
    mix(P, 'hand_L', [-1, 0, 0], w);
    mixHand(P, 'L', 1, 0.2, w, 0.1);
    add(P, 'head', 0.3 * w, 0.05 * w * Math.sin(t * TAU * 2), 0);
    add(P, 'chest', 0.08 * w);
    return P;
  }],
  look: [3.2, (t) => {
    const P = base(t), a = Math.sin(t * TAU) * bell(t, 0, 0.1, 0.9, 1);
    add(P, 'head', -0.05, 0.75 * a, 0); add(P, 'chest', 0, 0.25 * a, 0);
    return P;
  }],
  stretch: [3.2, (t) => {
    const P = base(t), w = bell(t, 0.03, 0.3, 0.72, 0.97);
    for (const [n, s] of SIDES) {
      mix(P, `arm_${n}`, [-0.05, 0, s * 2.4], w);
      mix(P, `forearm_${n}`, [-0.12, 0, 0], w);
      mixHand(P, n, s, 0.05, w, 0.1);
    }
    add(P, 'chest', -0.12 * w, 0, 0.05 * Math.sin(t * TAU) * w);
    add(P, 'head', -0.22 * w);
    return P;
  }],
  drink: [3.0, (t) => {
    const P = POSES.hold_R[1](0), w = bell(t, 0.04, 0.3, 0.72, 0.96), r = base(0);
    const from = [-0.27, 0.92, 0.2];
    const T = from.map((v, i) => v + ([-0.08, 1.495, 0.31][i] - v) * w);
    reach(P, 'R', -1, T, [-0.9, -0.6, -0.1]);
    const th = [0.03 - 0.03 * w, 1 - 0.62 * w, 0.12 - 1.04 * w], al = [0.75 + 0.25 * w, 0, 0.65 - 0.45 * w];
    aim(P, 'R', -1, th, al);
    add(P, 'head', -0.34 * bell(t, 0.2, 0.36, 0.68, 0.84));
    add(P, 'neck', -0.1 * bell(t, 0.2, 0.36, 0.68, 0.84));
    void r;
    return P;
  }],
};
Object.assign(gestures, {
  sit_down: [1.1, (t) => { const P = base(t), e = ease(t); seat(P, e); add(P, 'spine', 0.3 * bell(t, 0, 0.4, 0.5, 1)); add(P, 'chest', 0.22 * bell(t, 0, 0.4, 0.5, 1)); return P; }],
  stand_up: [1.0, (t) => { const P = base(t), e = 1 - ease(t); seat(P, e); add(P, 'spine', 0.34 * bell(t, 0, 0.35, 0.5, 1)); add(P, 'chest', 0.26 * bell(t, 0, 0.35, 0.5, 1)); return P; }],
  floor_down: [1.4, (t) => { const P = base(t), e = ease(t); floorSit(P, e); add(P, 'spine', 0.3 * bell(t, 0, 0.4, 0.6, 1)); return P; }],
  floor_up: [1.4, (t) => { const P = base(t), e = 1 - ease(t); floorSit(P, e); add(P, 'spine', 0.4 * bell(t, 0, 0.4, 0.6, 1)); return P; }],
  pickup: [1.5, (t) => {
    const P = base(t), w = bell(t, 0.02, 0.42, 0.56, 0.98);
    crouch(P, 0.98 * w);
    add(P, 'spine', 0.62 * w); add(P, 'chest', 0.38 * w); add(P, 'head', -0.25 * w);
    mix(P, 'arm_R', [-0.92, 0, 0.42], w);
    mix(P, 'forearm_R', [-0.12, 0, 0], w);
    mixHand(P, 'R', -1, 0.9, w, 0.6);
    return P;
  }],
  low_reach: [2.2, (t) => { // se baisser vers Nox : donner, tape, caresse
    const P = base(t), w = bell(t, 0.02, 0.3, 0.72, 0.98);
    crouch(P, 0.9 * w);
    add(P, 'spine', 0.5 * w); add(P, 'chest', 0.3 * w); add(P, 'head', -0.25 * w);
    mix(P, 'arm_R', [-1.62, 0, 0.42], w);
    mix(P, 'forearm_R', [-0.1, 0, 0], w);
    mix(P, 'hand_R', [-0.5, 0, 0], w);
    mixHand(P, 'R', -1, 0.3, w, 0.3);
    return P;
  }],
});
function lie(P, w) { // sur le dos, tête vers +Z une fois le corps tourné de 180°
  add(P, 'hips', -1.5708 * w);
  P.pos[1] -= 0.17 * w;
  for (const [n, s] of SIDES) { add(P, `upleg_${n}`, 0, 0, s * 0.05 * w); mix(P, `arm_${n}`, [0, 0, -s * 0.24], w); mix(P, `forearm_${n}`, [-0.05, 0, 0], w); add(P, `foot_${n}`, 0.3 * w); }
  add(P, 'head', 0.16 * w);
}
Object.assign(loops, { lying: [5, (t) => { const P = base(t); lie(P, 1); return P; }] });
Object.assign(gestures, {
  lie_down: [1.2, (t) => { const P = base(t); lie(P, ease(t)); return P; }],
  get_up: [1.2, (t) => { const P = base(t); lie(P, 1 - ease(t)); return P; }],
});
const seatedPose = (t = 0) => { const P = base(t); seat(P, 1); return P; };
const lyingPose = (t = 0) => { const P = base(t); lie(P, 1); return P; };
function blend(A, B, w) {
  const P = { pos: A.pos.map((v, i) => v + (B.pos[i] - v) * w) };
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    if (k === 'pos') continue;
    const a = A[k] || [0, 0, 0], b = B[k] || [0, 0, 0];
    P[k] = a.map((v, i) => v + (b[i] - v) * w);
  }
  return P;
}
Object.assign(gestures, {
  seat_to_lie: [1.5, (t) => { const P = blend(seatedPose(), lyingPose(), ease(t)); add(P, 'spine', 0.12 * Math.sin(t * Math.PI)); return P; }],
  lie_to_seat: [1.7, (t) => { const P = blend(lyingPose(), seatedPose(), ease(t)); add(P, 'spine', 0.34 * Math.sin(t * Math.PI)); add(P, 'chest', 0.2 * Math.sin(t * Math.PI)); add(P, 'head', 0.12 * Math.sin(t * Math.PI)); return P; }],
  fridge_open: [2.0, (t) => { // main sur la poignée, tire la porte
    const P = base(t), w = bell(t, 0.02, 0.32, 0.72, 0.98), pull = seg(t, 0.34, 0.68);
    crouch(P, 0.5 * w); add(P, 'spine', 0.26 * w); add(P, 'chest', 0.1 * w); add(P, 'head', -0.08 * w, 0.2 * w);
    reach(P, 'R', -1, lerp3(restWrist('R'), [-0.02 + 0.14 * pull, 1.0, 0.4 - 0.1 * pull], w), [-0.8, -0.6, -0.2]);
    const Q = { ...P }; aim(Q, 'R', -1, [0, 1, 0.1], [0.7, -0.3, 0.6]);
    mix(P, 'hand_R', Q.hand_R, w);
    mixHand(P, 'R', -1, 1.05, w, 0.7);
    return P;
  }],
  fridge_take: [1.9, (t) => { // se penche dans le frigo et attrape
    const P = base(t), w = bell(t, 0.02, 0.4, 0.58, 0.98);
    crouch(P, 0.82 * w); add(P, 'spine', 0.42 * w); add(P, 'chest', 0.22 * w); add(P, 'head', -0.14 * w);
    mix(P, 'arm_R', [-1.3, 0, 0.42], w); mix(P, 'forearm_R', [-0.12, 0, 0], w);
    mixHand(P, 'R', -1, 0.95 * seg(t, 0.38, 0.5) + 0.1, w, 0.7);
    return P;
  }],
});
POSES.handle = [2, (t) => { // main sur la poignée de la porte
  const P = base(t);
  reach(P, 'L', 1, [0.28, 1.0, 0.38], [0.9, -0.5, -0.2]);
  aim(P, 'L', 1, [0, 1, 0.1], [-0.6, -0.1, 0.7]);
  fingers(P, 'L', 1, 1.05, 0.7);
  return P;
}];
Object.assign(gestures, {
  sill_take: [1.8, (t) => { // attrape le sac sur le rebord de la fenêtre
    const P = base(t), w = bell(t, 0.02, 0.38, 0.5, 0.92);
    add(P, 'spine', 0.14 * w); add(P, 'head', 0.12 * w);
    reach(P, 'R', -1, lerp3(restWrist('R'), [-0.05, 1.06, 0.46], w), [-0.9, -0.5, -0.2]);
    mixHand(P, 'R', -1, 1.0, w, 0.7);
    return P;
  }],
  kneel_down: [2.4, (t) => { // s'accroupit dos à Nox pour qu'il grimpe
    const P = base(t), w = bell(t, 0.02, 0.28, 0.72, 0.98);
    crouch(P, 1.02 * w); add(P, 'spine', 0.4 * w); add(P, 'head', -0.3 * w);
    return P;
  }],
});
POSES.type = [2.4, (t) => {
  const P = base(t), f = Math.sin(t * TAU * 2), g = Math.sin(t * TAU * 2 + 2);
  const dx = 0.014 * Math.sin(t * TAU), dz = 0.01 * Math.sin(t * TAU * 2 + 1); // les mains glissent sur le clavier
  reach(P, 'R', -1, [-0.085 + dx, 1.09 + 0.004 * f, 0.43 + dz], [-0.9, -0.5, -0.3]);
  reach(P, 'L', 1, [0.085 + dx, 1.09 + 0.004 * g, 0.43 - dz], [0.9, -0.5, -0.3]);
  aim(P, 'R', -1, [1, 0.12, 0], [0.1, -0.3, 1]); aim(P, 'L', 1, [-1, 0.12, 0], [-0.1, -0.3, 1]);
  for (const [n, s] of SIDES) for (let i = 0; i < 4; i++) { // chaque doigt frappe à son rythme
    const hit = 0.5 + 0.5 * Math.sin(t * TAU * 6 + i * 1.9 + s * 1.3);
    P[`f${i}a_${n}`] = [0, 0, -s * (0.34 + 0.24 * hit * hit)]; P[`f${i}b_${n}`] = [0, 0, -s * (0.38 + 0.12 * hit)];
  }
  add(P, 'head', 0.14 + 0.012 * Math.sin(t * TAU), 0, 0);
  return P;
}];
Object.assign(gestures, MORE);
for (const [k, v] of Object.entries(POSES)) loops[k] = v;
const UPPER = new Set(['wave', 'nod', 'no', 'shrug', 'think', 'point', 'clap', ...Object.keys(MORE), ...Object.keys(POSES)]);

export function sample(name, dur, fn, loop, boneMap, names = bonesList()) {
  const fps = 30, frames = Math.max(2, Math.round(dur * fps));
  const times = new Float32Array(frames + 1);
  const quats = Object.fromEntries(names.map((n) => [n, new Float32Array((frames + 1) * 4)]));
  const pos = new Float32Array((frames + 1) * 3);
  const e = new THREE.Euler(0, 0, 0, 'XYZ'), q = new THREE.Quaternion();
  const hip0 = boneMap.hips.position;
  for (let f = 0; f <= frames; f++) {
    const t = loop ? (f % frames) / frames : f / frames;
    const P = fn(t);
    times[f] = (f / frames) * dur;
    for (const n of names) {
      const r = P[n] || [0, 0, 0];
      e.set(r[0], r[1], r[2]); q.setFromEuler(e); q.toArray(quats[n], f * 4);
    }
    pos[f * 3] = hip0.x + P.pos[0]; pos[f * 3 + 1] = hip0.y + P.pos[1]; pos[f * 3 + 2] = hip0.z + P.pos[2];
  }
  const tracks = names.map((n) => new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, times, quats[n]));
  tracks.push(new THREE.VectorKeyframeTrack('hips.position', times, pos));
  const clip = new THREE.AnimationClip(name, dur, tracks);
  clip.userData = { loop };
  return clip;
}

export function buildClips(bones) {
  for (const n of ['L', 'R']) {
    const S = bones[`arm_${n}`].getWorldPosition(new THREE.Vector3());
    const E = bones[`forearm_${n}`].getWorldPosition(new THREE.Vector3());
    const W = bones[`hand_${n}`].getWorldPosition(new THREE.Vector3());
    RIG[n] = { shoulder: S, dir: E.clone().sub(S).normalize(), l1: E.distanceTo(S), l2: W.distanceTo(E) };
  }
  const out = [];
  for (const [k, [d, fn]] of Object.entries(loops)) out.push(sample(k, d, fn, true, bones));
  for (const [k, [d, fn]] of Object.entries(gestures)) out.push(sample(k, d, fn, false, bones));
  for (const c of out) if (UPPER.has(c.name)) c.userData.layer = 'upper';
  return out;
}
