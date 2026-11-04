// Animations de Nox. Mêmes conventions que le personnage humain :
// bras rz = +s*a écarte, rx < 0 vers l'avant ; jambe rx < 0 vers l'avant ; tête rx > 0 baisse.
import { sample, aimHand } from './clips.js';

const TAU = Math.PI * 2;
const SIDES = [['L', 1], ['R', -1]];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => ease((t - a) / (b - a));
const bell = (t, a, b, c, d) => seg(t, a, b) * (1 - seg(t, c, d));
const NAMES = ['hips', 'chest', 'head', 'arm_L', 'forearm_L', 'hand_L', 'leg_L', 'foot_L', 'arm_R', 'forearm_R', 'hand_R', 'leg_R', 'foot_R'];
const add = (P, k, x = 0, y = 0, z = 0) => { const v = P[k] || [0, 0, 0]; P[k] = [v[0] + x, v[1] + y, v[2] + z]; };
const mix = (P, k, target, w) => { const v = P[k] || [0, 0, 0]; P[k] = v.map((c, i) => c + (target[i] - c) * w); };

function base(t = 0) {
  const b = Math.sin(t * TAU);
  const P = { pos: [0, 0.004 * b, 0] };
  P.chest = [0.012 * b, 0, 0];
  P.head = [-0.018 * b, 0, 0];
  for (const [n, s] of SIDES) {
    P[`arm_${n}`] = [0, 0, -s * (0.06 + 0.025 * b)];
    P[`forearm_${n}`] = [-0.1, 0, 0];
    P[`hand_${n}`] = [0, 0, 0];
    P[`leg_${n}`] = [0, 0, 0];
    P[`foot_${n}`] = [0, 0, 0];
  }
  return P;
}
function crouch(P, c) { // petites jambes : on descend surtout le bassin
  for (const [n] of SIDES) { add(P, `leg_${n}`, -c * 0.4); add(P, `foot_${n}`, c * 0.4); }
  P.pos[1] -= 0.075 * c;
}

function waddle(t, { stride, rock, bob, lean, swing, lift = 0 }) {
  const P = base(t * 2), ph = t * TAU, sw = Math.sin(ph);
  P.pos = [0.012 * sw, -bob + bob * Math.abs(Math.cos(ph)) * 2 + lift, 0];
  add(P, 'hips', lean * 0.5, -0.12 * sw, rock * sw);
  add(P, 'chest', lean * 0.5, 0.12 * sw, -rock * 0.4 * sw);
  add(P, 'head', -lean * 0.6, 0.06 * sw, -rock * 0.55 * sw);
  for (const [n, s] of SIDES) {
    const q = Math.sin(ph + (s > 0 ? 0 : Math.PI));
    add(P, `leg_${n}`, -stride * q - lean * 0.4, 0, -rock * sw);
    add(P, `foot_${n}`, stride * q * 0.7 + Math.max(0, -Math.cos(ph + (s > 0 ? 0 : Math.PI))) * 0.25, 0, 0);
    add(P, `arm_${n}`, swing * q, 0, 0);
    add(P, `forearm_${n}`, -swing * 0.5, 0, 0);
  }
  return P;
}

const loops = {
  idle: [3.2, (t) => {
    const P = base(t);
    add(P, 'head', 0, 0.06 * Math.sin(t * TAU), 0.025 * Math.sin(t * TAU * 0.5 + 1));
    return P;
  }],
  walk: [0.72, (t) => waddle(t, { stride: 0.62, rock: 0.11, bob: 0.008, lean: 0.05, swing: 0.5 })],
  run: [0.42, (t) => {
    const P = waddle(t, { stride: 0.95, rock: 0.09, bob: 0.016, lean: 0.24, swing: 0.95, lift: 0.006 });
    for (const [n] of SIDES) add(P, `forearm_${n}`, -0.7);
    return P;
  }],
  dance: [1.4, (t) => {
    const P = base(t * 2), ph = t * TAU, beat = Math.sin(ph * 2), sw = Math.sin(ph);
    P.pos = [0.03 * sw, -0.006 + 0.012 * Math.abs(beat), 0];
    add(P, 'hips', 0, 0.28 * sw, 0.13 * sw);
    add(P, 'chest', 0.03, -0.2 * sw, -0.1 * sw);
    add(P, 'head', 0.1 * Math.abs(beat) - 0.04, 0.2 * sw, 0.14 * Math.sin(ph + 0.6));
    for (const [n, s] of SIDES) {
      const q = Math.sin(ph + (s > 0 ? 0 : Math.PI));
      P[`arm_${n}`] = [-0.3 * q, 0, s * (0.75 + 0.55 * q)];
      P[`forearm_${n}`] = [-0.5, 0, s * 0.3 * beat];
      add(P, `leg_${n}`, 0, s * 0.12, -0.13 * sw);
      add(P, `foot_${n}`, 0, 0, 0.13 * sw);
    }
    return P;
  }],
  sad: [4.5, (t) => {
    const P = base(t);
    add(P, 'chest', 0.12); add(P, 'head', 0.34, 0.06 * Math.sin(t * TAU), 0);
    for (const [n, s] of SIDES) add(P, `arm_${n}`, 0.08, 0, -s * 0.16);
    return P;
  }],
};

const gestures = {
  wave: [2.4, (t) => {
    const P = base(t), w = bell(t, 0, 0.13, 0.86, 1), f = Math.sin(t * TAU * 4);
    mix(P, 'arm_L', [-0.1, 0, 2.0], w);
    mix(P, 'forearm_L', [-0.25, 0, 0.42 * f], w);
    mix(P, 'hand_L', [0, 0, 0.3 * f], w);
    add(P, 'head', 0, 0.1 * w, 0.14 * w); add(P, 'chest', 0, 0, -0.06 * w);
    return P;
  }],
  nod: [1.5, (t) => {
    const P = base(t), w = bell(t, 0, 0.1, 0.8, 1);
    add(P, 'head', 0.28 * w * Math.max(-0.3, Math.sin(t * TAU * 2)));
    return P;
  }],
  no: [1.7, (t) => {
    const P = base(t), w = bell(t, 0, 0.12, 0.8, 1);
    add(P, 'head', 0, 0.48 * w * Math.sin(t * TAU * 2.5));
    return P;
  }],
  shrug: [1.9, (t) => {
    const P = base(t), w = bell(t, 0.05, 0.28, 0.72, 0.96);
    for (const [n, s] of SIDES) {
      mix(P, `arm_${n}`, [-0.15, 0, s * 0.62], w);
      mix(P, `forearm_${n}`, [-0.8, 0, s * 0.45], w);
      mix(P, `hand_${n}`, [0, 0, s * 0.5], w);
    }
    add(P, 'head', -0.02 * w, 0, 0.2 * w);
    return P;
  }],
  think: [3.4, (t) => {
    const P = base(t), w = bell(t, 0, 0.13, 0.88, 1);
    mix(P, 'arm_R', [-1.15, 0, 0.1], w);
    mix(P, 'forearm_R', [-1.15, 0, 0.5], w);
    mix(P, 'hand_R', [-0.3, 0, 0.3], w);
    add(P, 'head', -0.1 * w + 0.03 * Math.sin(t * TAU * 2) * w, -0.22 * w, 0.17 * w);
    return P;
  }],
  point: [2.1, (t) => {
    const P = base(t), w = bell(t, 0, 0.15, 0.82, 1);
    mix(P, 'arm_L', [-1.4, 0, 0.2], w);
    mix(P, 'forearm_L', [-0.12, 0, 0], w);
    add(P, 'chest', 0, 0.2 * w, 0); add(P, 'head', 0, 0.28 * w, 0);
    return P;
  }],
  clap: [2.2, (t) => {
    const P = base(t), w = bell(t, 0, 0.13, 0.86, 1), c = 0.5 + 0.5 * Math.sin(t * TAU * 5);
    for (const [n, s] of SIDES) {
      mix(P, `arm_${n}`, [-1.25, 0, -s * (1.04 - 0.34 * c)], w);
      mix(P, `forearm_${n}`, [-0.2, 0, 0], w);
    }
    add(P, 'head', 0.03 * w * c);
    return P;
  }],
  bow: [2.4, (t) => {
    const P = base(t), w = bell(t, 0.04, 0.34, 0.66, 0.96);
    add(P, 'hips', 0.32 * w); add(P, 'chest', 0.22 * w); add(P, 'head', 0.16 * w);
    for (const [n] of SIDES) { add(P, `leg_${n}`, -0.32 * w); add(P, `arm_${n}`, -0.4 * w); }
    P.pos[2] -= 0.03 * w;
    return P;
  }],
  jump: [1.3, (t) => {
    const P = base(t);
    const prep = bell(t, 0, 0.18, 0.24, 0.32), land = bell(t, 0.7, 0.77, 0.84, 1);
    crouch(P, 0.75 * prep + 0.7 * land);
    add(P, 'head', 0.12 * prep + 0.14 * land, 0, 0);
    const u = clamp((t - 0.3) / 0.42), air = t > 0.3 && t < 0.72 ? 4 * u * (1 - u) : 0;
    P.pos[1] += 0.3 * air;
    const up = bell(t, 0.26, 0.34, 0.62, 0.74);
    for (const [n, s] of SIDES) {
      mix(P, `arm_${n}`, [-0.1, 0, s * 1.5], up);
      add(P, `leg_${n}`, -0.22 * air); add(P, `foot_${n}`, 0.5 * air);
    }
    add(P, 'head', -0.1 * air);
    return P;
  }],
  cheer: [2.0, (t) => {
    const P = base(t), w = bell(t, 0.02, 0.15, 0.84, 1), b = Math.abs(Math.sin(t * TAU * 2.2));
    P.pos[1] += 0.07 * b * w;
    for (const [n, s] of SIDES) {
      mix(P, `arm_${n}`, [-0.1, 0, s * (1.8 + 0.25 * b)], w);
      mix(P, `forearm_${n}`, [-0.2, 0, 0], w);
    }
    add(P, 'head', -0.12 * w, 0, 0.08 * w * Math.sin(t * TAU * 2.2));
    return P;
  }],
};

// ---- Assis, objets, gestes supplémentaires --------------------------------
const aim = (P, n, s, thumb, along) => aimHand(P, n, s, 0.476, thumb, along);
const armTo = (P, n, s, x, z, f = -0.1, w = 1) => { mix(P, `arm_${n}`, [x, 0, s * z], w); mix(P, `forearm_${n}`, [f, 0, 0], w); };
function seat(P, w) { // sur son pouf de 7 cm
  for (const [n, s] of SIDES) { add(P, `leg_${n}`, -1.2 * w); add(P, `foot_${n}`, 0.5 * w); armTo(P, n, s, -0.5, -0.32, -0.4, w); }
  P.pos[1] += 0.066 * w;
}
function floorSit(P, w) {
  for (const [n, s] of SIDES) { add(P, `leg_${n}`, -1.5 * w, s * 0.2 * w); armTo(P, n, s, -0.1, 0.1, -0.1, w); }
  P.pos[1] -= 0.088 * w; add(P, 'head', -0.05 * w);
}
Object.assign(loops, {
  sitting: [3.6, (t) => { const P = base(t); seat(P, 1); add(P, 'head', 0, 0.08 * Math.sin(t * TAU), 0); for (const [n] of SIDES) add(P, `leg_${n}`, 0.1 * Math.sin(t * TAU * 2 + (n === 'L' ? 0 : 2))); return P; }],
  floor_sit: [3.6, (t) => { const P = base(t); floorSit(P, 1); add(P, 'head', 0, 0.09 * Math.sin(t * TAU), 0); return P; }],
});
const POSES = {
  hold_R: [3, (t) => { const P = base(t); armTo(P, 'R', -1, -0.85, -0.26, -0.5); aim(P, 'R', -1, [0.03, 1, 0.12], [0.75, 0, 0.65]); return P; }],
  crossed: [4, (t) => { const P = base(t); for (const [n, s] of SIDES) armTo(P, n, s, -1.0, -1.0, -0.65); add(P, 'head', -0.04); return P; }],
  hips: [4, (t) => { const P = base(t); for (const [n, s] of SIDES) { armTo(P, n, s, 0.1, 0.5, -0.5); P[`forearm_${n}`] = [0, 0, -s * 1.15]; } return P; }],
  read: [4, (t) => { const P = base(t); for (const [n, s] of SIDES) { armTo(P, n, s, -1.2, -0.62, -0.3); aim(P, n, s, [0, 0.9, 0.45], [-s, 0, 0]); } add(P, 'head', 0.16 + 0.02 * Math.sin(t * TAU)); return P; }],
  phone: [4, (t) => { const P = base(t); armTo(P, 'R', -1, -1.25, -0.72, -0.3); aim(P, 'R', -1, [0, 0.9, 0.45], [1, 0, 0]); armTo(P, 'L', 1, -1.0, -0.8, -0.4); add(P, 'head', 0.22); return P; }],
  carry: [4, (t) => base(t)],
};
const MORE = {
  thumb: [1.9, (t) => { const P = base(t), w = bell(t, 0, 0.16, 0.84, 1); armTo(P, 'L', 1, -1.1, 0.25, -0.9, w); add(P, 'head', 0, 0.08 * w, 0.1 * w); return P; }],
  scratch: [2.2, (t) => { const P = base(t), w = bell(t, 0, 0.18, 0.84, 1), f = Math.sin(t * TAU * 6); armTo(P, 'L', 1, -0.2, 1.72 + 0.08 * f, -0.9, w); add(P, 'head', 0, -0.1 * w, 0.14 * w); return P; }],
  stop: [1.8, (t) => { const P = base(t), w = bell(t, 0, 0.14, 0.82, 1); armTo(P, 'L', 1, -1.45, -0.1, -0.2, w); mix(P, 'hand_L', [-1.1, 0, 0], w); return P; }],
  come: [2.2, (t) => { const P = base(t), w = bell(t, 0, 0.13, 0.86, 1), f = Math.sin(t * TAU * 4); armTo(P, 'L', 1, -1.2, 0.2, -0.5 - 0.55 * f, w); add(P, 'head', 0, 0, 0.1 * w); return P; }],
  facepalm: [2.4, (t) => { const P = base(t), w = bell(t, 0.03, 0.2, 0.82, 1); armTo(P, 'L', 1, -2.0, -0.32, -0.5, w); add(P, 'head', 0.26 * w, 0.06 * w * Math.sin(t * TAU * 2), 0); return P; }],
  look: [3.0, (t) => { const P = base(t), a = Math.sin(t * TAU) * bell(t, 0, 0.1, 0.9, 1); add(P, 'head', -0.04, 0.85 * a, 0); add(P, 'chest', 0, 0.2 * a, 0); return P; }],
  stretch: [2.8, (t) => { const P = base(t), w = bell(t, 0.03, 0.3, 0.72, 0.97); for (const [n, s] of SIDES) armTo(P, n, s, 0, 2.1, -0.1, w); add(P, 'head', -0.16 * w); add(P, 'chest', -0.08 * w); return P; }],
  drink: [2.8, (t) => { const P = POSES.hold_R[1](0), w = bell(t, 0.04, 0.3, 0.72, 0.96); armTo(P, 'R', -1, -2.15, -0.3, -0.35, w); aim(P, 'R', -1, [0.03, 1 - 0.5 * w, 0.12 - 0.97 * w], [0.75 + 0.25 * w, 0, 0.65 - 0.45 * w]); add(P, 'head', -0.26 * bell(t, 0.2, 0.36, 0.68, 0.84)); return P; }],
};
Object.assign(gestures, {
  sit_down: [0.9, (t) => { const P = base(t), e = ease(t); seat(P, e); P.pos[1] += 0.08 * Math.sin(t * Math.PI); return P; }],
  stand_up: [0.8, (t) => { const P = base(t), e = 1 - ease(t); seat(P, e); P.pos[1] += 0.08 * Math.sin(t * Math.PI); return P; }],
  floor_down: [0.9, (t) => { const P = base(t); floorSit(P, ease(t)); return P; }],
  floor_up: [0.9, (t) => { const P = base(t); floorSit(P, 1 - ease(t)); P.pos[1] += 0.05 * Math.sin(t * Math.PI); return P; }],
  pickup: [1.3, (t) => {
    const P = base(t), w = bell(t, 0.02, 0.42, 0.56, 0.98);
    crouch(P, 0.9 * w); add(P, 'hips', 0.38 * w); add(P, 'chest', 0.32 * w); add(P, 'head', -0.3 * w);
    for (const [n] of SIDES) add(P, `leg_${n}`, -0.38 * w);
    armTo(P, 'R', -1, -0.85, -0.36, -0.1, w);
    return P;
  }],
  reach_up: [2.0, (t) => {
    const P = base(t), w = bell(t, 0.02, 0.25, 0.75, 0.98);
    for (const [n, s] of SIDES) armTo(P, n, s, -1.35, -0.3, -0.3, w);
    add(P, 'head', -0.22 * w);
    return P;
  }],
  highfive: [1.5, (t) => {
    const P = base(t), w = bell(t, 0.02, 0.28, 0.66, 0.98), u = clamp((t - 0.25) / 0.4), air = t > 0.25 && t < 0.65 ? 4 * u * (1 - u) : 0;
    armTo(P, 'R', -1, -1.9, 0.0, -0.05, w);
    P.pos[1] += 0.24 * air;
    add(P, 'head', -0.22 * w);
    return P;
  }],
});
function lie(P, w) {
  add(P, 'hips', -1.5708 * w); P.pos[1] -= 0.02 * w; P.pos[2] += 0 * w;
  for (const [n, s] of SIDES) armTo(P, n, s, 0, -0.05, -0.1, w);
}
Object.assign(loops, { in_bag: [3, (t) => { const P = base(t); for (const [n, s] of SIDES) { armTo(P, n, s, 0, -0.46, 0); add(P, `leg_${n}`, -0.3); } add(P, 'head', 0.05 * Math.sin(t * TAU), 0.1 * Math.sin(t * TAU * 0.5), 0); return P; }] });
Object.assign(loops, { lying: [4, (t) => { const P = base(t); lie(P, 1); return P; }] });
Object.assign(gestures, {
  lie_down: [0.9, (t) => { const P = base(t); lie(P, ease(t)); return P; }],
  get_up: [0.9, (t) => { const P = base(t); lie(P, 1 - ease(t)); return P; }],
});
POSES.type = [1.2, (t) => { const P = base(t); for (const [n, s] of SIDES) armTo(P, n, s, -1.1, -0.5, -0.4 + 0.08 * Math.sin(t * TAU * 3 + (s > 0 ? 0 : 2))); return P; }];
Object.assign(gestures, MORE);
for (const [k, v] of Object.entries(POSES)) loops[k] = v;
const UPPER = new Set(['wave', 'nod', 'no', 'shrug', 'think', 'point', 'clap', ...Object.keys(MORE), ...Object.keys(POSES)]);

export function buildNoxClips(bones) {
  const out = [];
  for (const [k, [d, fn]] of Object.entries(loops)) out.push(sample(k, d, fn, true, bones, NAMES));
  for (const [k, [d, fn]] of Object.entries(gestures)) out.push(sample(k, d, fn, false, bones, NAMES));
  for (const c of out) if (UPPER.has(c.name)) c.userData.layer = 'upper';
  return out;
}
