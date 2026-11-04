// Nox, la mascotte : robot low-poly à visage écran. Modèle déterministe.
// Construit sur une base de 1 unité, puis ramené à sa taille réelle : 45 cm, celle d'un chat ou d'un petit chien.
import * as THREE from 'three';
import { V, clamp, lerp, Part, jit, ring, ringOn, blendSkin } from './lowpoly.js';
import { buildNoxClips } from './nox-clips.js';
import { createMotion } from './motion.js';

export const NOX_HEIGHT = 0.45;

export const NOX_PALETTE = {
  body: '#c8992a', bezel: '#94701a', metal: '#9b9994', panel: '#8f8d8b', dark: '#6d625b',
  screen: '#07090d', ball: '#3f9fd0', light: '#8feaff', halo: '#39d0f2',
};

// Repères relevés sur l'image (1 m = 590 px)
const HEAD_Y = 0.59, HEAD_PIVOT = 0.4, SCREEN_Y = 0.576, SCREEN_Z = 0.148;
const ARM_ANGLE = 0.476, ARM_LEN = 0.19;
const SHOULDER = (s) => V(s * 0.15, 0.347, 0);
const ARM_DIR = (s) => V(s * Math.sin(ARM_ANGLE), -Math.cos(ARM_ANGLE), 0);
const ELBOW = (s) => SHOULDER(s).addScaledVector(ARM_DIR(s), ARM_LEN * 0.5);
const WRIST = (s) => SHOULDER(s).addScaledVector(ARM_DIR(s), ARM_LEN);

function ringZ(z, w, h, cy, pow, n = 16) { // anneau dans le plan XY
  const out = [];
  for (let j = 0; j < n; j++) {
    const a = ((j + 0.5) / n) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    out.push(V(w * Math.sign(c) * Math.abs(c) ** pow, cy + h * Math.sign(s) * Math.abs(s) ** pow, z));
  }
  return out;
}
const ringX = (x, cy, r, n = 10) => {
  const out = [];
  for (let j = 0; j < n; j++) { const a = (j / n) * Math.PI * 2; out.push(V(x, cy + Math.sin(a) * r, Math.cos(a) * r)); }
  return out;
};

function makeBones() {
  const defs = [
    ['hips', null, V(0, 0.15, 0)], ['chest', 'hips', V(0, 0.29, 0)], ['head', 'chest', V(0, HEAD_PIVOT, 0)], ['antenna', 'head', V(0, 0.795, 0)],
  ];
  for (const [n, s] of [['L', 1], ['R', -1]]) {
    defs.push([`arm_${n}`, 'chest', SHOULDER(s)]);
    defs.push([`forearm_${n}`, `arm_${n}`, ELBOW(s)]);
    defs.push([`hand_${n}`, `forearm_${n}`, WRIST(s)]);
    defs.push([`leg_${n}`, 'hips', V(s * 0.088, 0.13, 0)]);
    defs.push([`foot_${n}`, `leg_${n}`, V(s * 0.082, 0.06, 0)]);
  }
  return defs;
}

const BODY = [ // y, rx, rz
  [0.092, 0.06, 0.05], [0.118, 0.13, 0.1], [0.165, 0.168, 0.128], [0.235, 0.17, 0.13],
  [0.305, 0.152, 0.118], [0.365, 0.118, 0.094], [0.402, 0.07, 0.06],
];
const PANEL_Z = 0.134;
const bodyZ = (x, y) => {
  let i = 0; while (i < BODY.length - 2 && y > BODY[i + 1][0]) i++;
  const [y0, rx0, rz0] = BODY[i], [y1, rx1, rz1] = BODY[i + 1];
  const t = (y - y0) / (y1 - y0), rx = lerp(rx0, rx1, t), rz = lerp(rz0, rz1, t);
  return rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
};

function buildNox(p, ball) {
  // Tête : anneaux d'arrière en avant, puis retour vers l'écran
  const headRings = [
    [-0.203, 0.05, 0.044, HEAD_Y, 0.7], [-0.19, 0.11, 0.095, HEAD_Y, 0.7], [-0.13, 0.19, 0.168, HEAD_Y, 0.68], [-0.05, 0.22, 0.195, HEAD_Y, 0.66],
    [0.05, 0.222, 0.197, HEAD_Y, 0.64], [0.112, 0.206, 0.186, HEAD_Y, 0.62], [0.15, 0.2, 0.167, 0.586, 0.56],
    [0.166, 0.197, 0.138, 0.578, 0.5], [0.164, 0.19, 0.129, 0.576, 0.46], [SCREEN_Z, 0.184, 0.122, SCREEN_Y, 0.46],
  ];
  p.loft(headRings.map(([z, w, h, cy, pow]) => ringZ(z, w, h, cy, pow).map((q) => jit(q, 0.0015))), {
    colorAt: (i) => (i >= 7 ? 'bezel' : 'body'), skin: 'head', capStart: 'body', vary: 0.11, perQuad: true, ref: () => V(0, HEAD_Y, 0),
  });

  // Oreillettes
  for (const s of [1, -1]) {
    p.loft([ringX(s * 0.205, 0.576, 0.075), ringX(s * 0.232, 0.576, 0.074), ringX(s * 0.25, 0.576, 0.062), ringX(s * 0.258, 0.576, 0.04)], {
      color: 'metal', skin: 'head', capEnd: true, vary: 0.05,
    });
  }

  // Antenne
  const yb = 0.782;
  p.loft([ring(V(0, yb, 0), 0.06, 0.06, 12), ring(V(0, yb + 0.012, 0), 0.058, 0.058, 12), ring(V(0, yb + 0.022, 0), 0.05, 0.05, 12)], {
    color: 'metal', skin: 'head', capEnd: true, vary: 0.04,
  });
  p.loft([ring(V(0, yb + 0.02, 0), 0.0115, 0.0115, 8), ring(V(0, 0.9, 0), 0.0105, 0.0105, 8)], { color: 'metal', skin: 'antenna', vary: 0.03 });
  const b = new THREE.IcosahedronGeometry(0.058, 4);
  b.translate(0, 0.944, 0);
  ball.geo(b, { color: 'ball', skin: 'antenna', vary: 0 });

  // Cou et corps
  p.loft([ring(V(0, 0.385, 0), 0.05, 0.05, 10), ring(V(0, 0.43, 0), 0.05, 0.05, 10)], { color: 'dark', skin: (q) => (q.y > 0.405 ? [['head', 1]] : [['chest', 1]]), vary: 0.03 });
  const bodySkin = (q) => blendSkin(['hips', 'chest'], [0.235], q.y, 0.06);
  p.loft(BODY.map(([y, rx, rz]) => ring(V(0, y, 0), rx, rz, 12, 0.92, 0.2618, 0.002)), {
    color: 'body', skin: bodySkin, capStart: true, capEnd: true, vary: 0.13, perQuad: true,
  });

  // Plaque de poitrine
  const hw = 0.068, y0 = 0.254, y1 = 0.327;
  const outline = (m, off) => {
    const pts = [];
    for (let i = 0; i <= 4; i++) pts.push([lerp(-hw + m, hw - m, i / 4), y1 - m]);
    for (let i = 1; i <= 3; i++) pts.push([hw - m, lerp(y1 - m, y0 + m, i / 4)]);
    for (let i = 0; i <= 4; i++) pts.push([lerp(hw - m, -hw + m, i / 4), y0 + m]);
    for (let i = 1; i <= 3; i++) pts.push([-hw + m, lerp(y0 + m, y1 - m, i / 4)]);
    return pts.map(([x, y]) => V(x, y, off === null ? bodyZ(x, y) - 0.002 : PANEL_Z + off));
  };
  p.loft([outline(0, null), outline(0, 0), outline(0.003, 0.003)], { color: 'panel', skin: 'chest', capEnd: true, vary: 0.035, ref: () => V(0, 0.29, 0) });

  // Bras et mains
  for (const [n, s] of [['L', 1], ['R', -1]]) {
    const d = ARM_DIR(s), S = SHOULDER(s);
    const armSkin = (q) => blendSkin([`arm_${n}`, `forearm_${n}`], [ARM_LEN * 0.5], q.clone().sub(S).dot(d), 0.03);
    const secs = [[-0.03, 0.012, 0.016], [-0.016, 0.026, 0.032], [0.02, 0.034, 0.042], [0.09, 0.043, 0.046], [0.145, 0.04, 0.042], [0.183, 0.03, 0.034], [0.19, 0.022, 0.024]];
    p.loft(secs.map(([t, r1, r2]) => ringOn(S.clone().addScaledVector(d, t), d, r1, r2, 8, 0.0015, 0.39)), {
      color: 'body', skin: armSkin, capStart: true, capEnd: 'dark', vary: 0.08,
    });
    const W = WRIST(s);
    const hand = [[0.0, 0.018, 0.02], [0.012, 0.026, 0.03], [0.04, 0.026, 0.03], [0.054, 0.018, 0.024]];
    p.loft(hand.map(([t, r1, r2]) => ringOn(W.clone().addScaledVector(d, t), d, r1, r2, 7, 0.001, 0.2)), {
      color: 'dark', skin: `hand_${n}`, capEnd: true, vary: 0.07,
    });
    for (const [z, l, r] of [[0.018, 0.02, 0.0115], [-0.003, 0.024, 0.012], [-0.023, 0.019, 0.011]]) { // doigts
      const a = W.clone().addScaledVector(d, 0.045).add(V(0, 0, z)), c = a.clone().addScaledVector(d, l);
      p.loft([ringOn(a, d, r, r, 5), ringOn(c, d, r * 0.72, r * 0.72, 5)], { color: 'dark', skin: `hand_${n}`, capEnd: true, vary: 0.06 });
    }
    const t0 = W.clone().addScaledVector(d, 0.02).add(V(0, 0, 0.026)), t1 = t0.clone().addScaledVector(d, 0.03).add(V(0, 0, 0.02));
    const td = t1.clone().sub(t0).normalize();
    p.loft([ringOn(t0, td, 0.0105, 0.0105, 5), ringOn(t1, td, 0.0078, 0.0078, 5)], { color: 'dark', skin: `hand_${n}`, capEnd: true, vary: 0.06 });

    // Jambe et pied
    p.loft([ring(V(s * 0.09, 0.15, 0), 0.044, 0.052, 8, 0.9, 0.39, 0.001), ring(V(s * 0.086, 0.1, 0), 0.044, 0.05, 8, 0.9, 0.39, 0.001), ring(V(s * 0.082, 0.056, 0), 0.04, 0.046, 8, 0.9, 0.39, 0.001)], {
      color: 'body', skin: `leg_${n}`, capEnd: 'dark', vary: 0.07,
    });
    const fx = s * 0.082, foot = [[-0.05, 0.03, 0.05], [-0.042, 0.036, 0.064], [0.02, 0.038, 0.066], [0.06, 0.037, 0.052], [0.078, 0.03, 0.034]];
    const sec = ([z, w, h]) => [V(fx - w, 0, z), V(fx - w, h * 0.72, z), V(fx - w * 0.7, h, z), V(fx + w * 0.7, h, z), V(fx + w, h * 0.72, z), V(fx + w, 0, z)];
    p.loft(foot.map(sec), { color: 'dark', skin: `foot_${n}`, capStart: true, capEnd: true, vary: 0.06, ref: () => V(fx, 0.02, 0.01) });
  }
}

// ---- Visage écran : chaque trait est une bande (bord haut / bord bas) -------
export const NOX_MORPHS = ['blinkL', 'blinkR', 'happy', 'sad', 'angry', 'wide', 'heart', 'lookL', 'lookR', 'lookU', 'lookD', 'smile', 'frown', 'open', 'round', 'flat', 'smirk'];

function eyeShape(u, side, m) {
  const r = 0.0272, c = Math.sqrt(Math.max(0, 1 - u * u));
  let x = u * r, t = c * r, b = -c * r;
  const a = Math.abs(u);
  switch (m) {
    case 'blinkL': case 'blinkR':
      if ((m === 'blinkL') === (side > 0)) { x *= 1.14; t = 0.0042 * Math.sqrt(c); b = -t; }
      break;
    case 'happy': { x *= 1.16; t = r * 0.95 * (1 - u * u) - r * 0.1; b = t - 0.0135 * Math.sqrt(c); break; }
    case 'sad': { const k = 0.5 + 0.5 * side * u; t = c * r - r * 1.0 * k * c; break; }
    case 'angry': { const k = 0.5 - 0.5 * side * u; t = c * r - r * 1.0 * k * c; break; }
    case 'wide': x *= 1.26; t *= 1.26; b *= 1.26; break;
    case 'heart': {
      x = u * r * 1.28;
      t = r * (0.72 * Math.sqrt(Math.max(0, 1 - (2 * a - 1) ** 2)) + 0.46 * (1 - a ** 6));
      b = -r * 1.3 * (1 - a ** 1.15);
      break;
    }
    case 'lookL': x += 0.017; break;
    case 'lookR': x -= 0.017; break;
    case 'lookU': t += 0.013; b += 0.013; break;
    case 'lookD': t -= 0.013; b -= 0.013; break;
    default:
  }
  return [x, t, b];
}
function mouthShape(u, m) {
  const w = 0.0262, h = 0.0074, th = h * Math.sqrt(Math.max(0, 1 - u ** 4)), c = Math.sqrt(Math.max(0, 1 - u * u));
  let x = u * w, t = th, b = -th;
  switch (m) {
    case 'smile': { const y = 0.018 * u * u - 0.008; x *= 1.42; t += y; b += y; break; }
    case 'frown': { const y = -0.017 * u * u + 0.007; x *= 1.25; t += y; b += y; break; }
    case 'open': x *= 1.18; t += 0.008 * c; b -= 0.042 * c; break;
    case 'round': x *= 0.62; t += 0.012 * c; b -= 0.02 * c; break;
    case 'flat': x *= 1.5; t *= 0.68; b *= 0.68; break;
    case 'smirk': { const y = 0.012 * (u + 1) - 0.006; x *= 1.22; t += y; b += y; break; }
    default:
  }
  return [x, t, b];
}
function faceGeometry(pad, z) {
  const parts = [
    { n: 18, cx: 0.085, cy: 0.592, fn: (u, m) => eyeShape(u, 1, m), eye: true },
    { n: 18, cx: -0.085, cy: 0.592, fn: (u, m) => eyeShape(u, -1, m), eye: true },
    { n: 14, cx: 0, cy: 0.537, fn: mouthShape, eye: false },
  ];
  const y0 = HEAD_PIVOT;
  const build = (m) => {
    const pos = [];
    for (const f of parts) {
      for (let i = 0; i <= f.n; i++) {
        const u = -Math.cos((Math.PI * i) / f.n), c = Math.sqrt(Math.max(0, 1 - u * u));
        const skip = m && (f.eye ? !['blinkL', 'blinkR', 'happy', 'sad', 'angry', 'wide', 'heart', 'lookL', 'lookR', 'lookU', 'lookD'].includes(m) : !['smile', 'frown', 'open', 'round', 'flat', 'smirk'].includes(m));
        const [x, t, b] = f.fn(u, skip ? null : m);
        const px = f.cx + x + pad * u;
        pos.push(px, f.cy - y0 + t + pad * c, z, px, f.cy - y0 + b - pad * c, z);
      }
    }
    return pos;
  };
  const neutral = build(null);
  const idx = [];
  let base = 0;
  for (const f of parts) {
    for (let i = 0; i < f.n; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
    base += (f.n + 1) * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(neutral, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.morphTargetsRelative = true;
  g.morphAttributes.position = NOX_MORPHS.map((m) => {
    const v = build(m).map((c, i) => c - neutral[i]);
    const at = new THREE.Float32BufferAttribute(v, 3); at.name = m; return at;
  });
  return g;
}

const EXPRESSIONS = {
  neutre: {},
  sourire: { smile: 0.85 },
  joie: { happy: 1, open: 0.55, smile: 0.55 },
  surprise: { wide: 1, round: 1, lookU: 0.2 },
  colere: { angry: 1, frown: 0.8, flat: 0.2 },
  tristesse: { sad: 1, frown: 1, lookD: 0.45 },
  doute: { blinkR: 0.42, smirk: 0.9, lookL: 0.5, lookU: 0.3 },
  clin: { blinkR: 1, smile: 0.9, smirk: 0.2 },
  amour: { heart: 1, smile: 0.75 },
  sommeil: { blinkL: 0.96, blinkR: 0.96, flat: 0.5 },
  dort: { blinkL: 0.96, blinkR: 0.96, flat: 0.5 },
};
const VISEMES = {
  a: { open: 0.72 }, e: { open: 0.32, flat: 0.5 }, i: { open: 0.14, flat: 0.8 }, o: { round: 0.9, open: 0.15 }, u: { round: 0.65 },
  m: { flat: 0.2 }, f: { open: 0.12 }, t: { open: 0.24 }, s: { open: 0.1, flat: 0.5 }, r: { open: 0.22, round: 0.25 }, ' ': {},
};
const visemeOf = (ch) => {
  const c = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  for (const [k, set] of [['a', 'a'], ['e', 'e'], ['i', 'iy'], ['o', 'o'], ['u', 'uw'], ['m', 'mbp'], ['f', 'fv'], ['t', 'tdnlk'], ['s', 'szcjgxq'], ['r', 'rh']]) if (set.includes(c)) return k;
  return ' ';
};

export function createNox() {
  const root = new THREE.Group(); root.name = 'nox';
  const bodyPart = new Part(NOX_PALETTE), ballPart = new Part(NOX_PALETTE);
  buildNox(bodyPart, ballPart);

  const bones = {}, world = {}, list = [];
  for (const [name, parent, pos] of makeBones()) {
    const b = new THREE.Bone(); b.name = name; bones[name] = b; world[name] = pos; list.push(b);
    if (parent) { bones[parent].add(b); b.position.copy(pos).sub(world[parent]); } else b.position.copy(pos);
  }
  root.add(bones.hips);
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(list);
  const index = Object.fromEntries(list.map((b, i) => [b.name, i]));

  const toGeo = (part) => {
    const g = new THREE.BufferGeometry(), n = part.p.length / 3;
    g.setAttribute('position', new THREE.Float32BufferAttribute(part.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(part.c, 3));
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    part.si.forEach((w, i) => w.slice(0, 4).forEach(([b, v], k) => { si[i * 4 + k] = index[b]; sw[i * 4 + k] = v; }));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    g.computeVertexNormals();
    return g;
  };
  const skinned = (part, name, mat) => {
    const m = new THREE.SkinnedMesh(toGeo(part), mat);
    m.name = name; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true;
    root.add(m); m.bind(skeleton); return m;
  };
  const matte = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.72, metalness: 0, side: THREE.DoubleSide });
  matte.name = 'nox';
  const bodyMesh = skinned(bodyPart, 'corps', matte);
  const ballMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0, emissive: NOX_PALETTE.ball, emissiveIntensity: 0.12 });
  ballMat.name = 'antenne';
  const ballMesh = skinned(ballPart, 'balle', ballMat);
  { // boule lisse : normales radiales
    const P = ballMesh.geometry.attributes.position, N = ballMesh.geometry.attributes.normal, v = V(0, 0, 0);
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); v.y -= 0.944; v.normalize(); N.setXYZ(i, v.x, v.y, v.z); }
  }

  // Écran
  const outline = ringZ(0, 0.186, 0.124, SCREEN_Y - HEAD_PIVOT, 0.46, 48);
  const shape = new THREE.Shape(outline.map((p) => new THREE.Vector2(p.x, p.y)));
  const screen = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: NOX_PALETTE.screen, roughness: 0.3, metalness: 0.1 }));
  screen.name = 'ecran'; screen.material.name = 'ecran';
  screen.position.z = SCREEN_Z + 0.001; screen.receiveShadow = false;
  bones.head.add(screen);

  const lightMat = new THREE.MeshBasicMaterial({ color: NOX_PALETTE.light, toneMapped: false, side: THREE.DoubleSide });
  lightMat.name = 'lumiere';
  const face = new THREE.Mesh(faceGeometry(0, SCREEN_Z + 0.0045), lightMat);
  face.name = 'visage'; face.updateMorphTargets();
  face.morphTargetDictionary = Object.fromEntries(NOX_MORPHS.map((k, i) => [k, i]));
  bones.head.add(face);
  const haloMat = (o) => new THREE.MeshBasicMaterial({ color: NOX_PALETTE.halo, toneMapped: false, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const halos = [[0.0022, 0.34, 0.0036], [0.0062, 0.15, 0.003], [0.0125, 0.06, 0.0024]].map(([pad, o, dz]) => {
    const h = new THREE.Mesh(faceGeometry(pad, SCREEN_Z + dz), haloMat(o));
    h.name = 'halo'; h.updateMorphTargets(); bones.head.add(h); return h;
  });

  // Voyant de poitrine
  const led = new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.0095), lightMat.clone());
  led.name = 'voyant'; led.position.set(0.032, 0.314 - 0.29, PANEL_Z + 0.0045);
  bones.chest.add(led);
  const ledHalo = new THREE.Mesh(new THREE.PlaneGeometry(0.046, 0.021), haloMat(0.24));
  ledHalo.name = 'halo'; ledHalo.position.copy(led.position); ledHalo.position.z -= 0.0006;
  bones.chest.add(ledHalo);

  const clips = buildNoxClips(bones);
  const motion = createMotion(root, bones, clips);
  const mixer = motion.mixer;

  const faceMeshes = [face, ...halos];
  const weights = Object.fromEntries(NOX_MORPHS.map((m) => [m, 0]));
  const state = {
    expr: {}, exprName: 'neutre', blinkT: 2, blink: 0, blinkDir: 0, glanceT: 3, glance: { lookL: 0, lookR: 0, lookU: 0, lookD: 0 },
    talk: null, viseme: {}, current: null, loco: 'idle', gesture: null, time: 0,
    spring: { x: 0, v: 0, z: 0, vz: 0, last: V(0, 0.8, 0), lastV: V(0, 0, 0) },
  };
  const apply = (w) => {
    for (const mesh of faceMeshes) NOX_MORPHS.forEach((m, i) => { mesh.morphTargetInfluences[i] = w[m]; });
  };
  const tip = new THREE.Vector3();
  const api = {
    root, bones, skeleton, clips, mixer, morphCount: NOX_MORPHS.length, meshes: { body: bodyMesh, face },
    motion,
    get seat() { return motion.seat; },
    get gesture() { return motion.gesture; },
    get expression() { return state.exprName; },
    get talking() { return !!state.talk; },
    setLocomotion: motion.setLocomotion,
    play: motion.play,
    setExpression(name) { state.exprName = name; state.expr = EXPRESSIONS[name] || {}; },
    say(text, onEnd) {
      const seq = [];
      for (const ch of text) {
        const v = visemeOf(ch), punct = /[.,;:!?]/.test(ch);
        seq.push({ v: punct ? ' ' : v, d: punct ? 0.24 : (v === ' ' ? 0.07 : 0.078) });
      }
      seq.push({ v: ' ', d: 0.1 });
      state.talk = { seq, i: 0, t: 0, onEnd };
    },
    setMorphs(obj) { Object.assign(weights, obj); apply(weights); },
    update(dt) {
      motion.update(dt);
      state.time += dt;
      state.blinkT -= dt;
      if (state.blinkT <= 0 && !state.blinkDir) { state.blinkDir = 1; state.blinkT = 2.4 + Math.random() * 3.4; }
      if (state.blinkDir) {
        state.blink += state.blinkDir * dt / 0.055;
        if (state.blink >= 1) { state.blink = 1; state.blinkDir = -1; }
        if (state.blink <= 0) { state.blink = 0; state.blinkDir = 0; }
      }
      state.glanceT -= dt;
      if (state.glanceT <= 0) {
        state.glanceT = 1.4 + Math.random() * 3;
        const gx = (Math.random() - 0.5) * 1.1, gy = (Math.random() - 0.5) * 0.6;
        state.glance = { lookL: Math.max(0, gx), lookR: Math.max(0, -gx), lookU: Math.max(0, gy), lookD: Math.max(0, -gy) };
      }
      state.viseme = {};
      if (state.talk) {
        const T = state.talk;
        T.t += dt;
        while (T.i < T.seq.length && T.t > T.seq[T.i].d) { T.t -= T.seq[T.i].d; T.i++; }
        if (T.i >= T.seq.length) { const f = T.onEnd; state.talk = null; f?.(); } else state.viseme = VISEMES[T.seq[T.i].v] || {};
      }
      const k = 1 - Math.exp(-dt * 9), kv = 1 - Math.exp(-dt * 20);
      const mouth = ['open', 'round', 'flat'];
      const sleeping = state.exprName === 'sommeil';
      for (const m of NOX_MORPHS) {
        let target = state.expr[m] || 0;
        if (m in state.glance && !sleeping) target += state.glance[m];
        if (state.talk && mouth.includes(m)) target = target * 0.15 + (state.viseme[m] || 0);
        weights[m] += (target - weights[m]) * (state.talk ? kv : k);
      }
      const out = { ...weights };
      out.blinkL = Math.max(out.blinkL, state.blink); out.blinkR = Math.max(out.blinkR, state.blink);
      apply(out);
      // Voyant : respiration lente, vif quand il parle
      const pulse = state.talk ? 0.72 + 0.28 * Math.sin(state.time * 24) : 0.82 + 0.18 * Math.sin(state.time * 2.2);
      led.material.color.set(NOX_PALETTE.light).multiplyScalar(pulse);
      ledHalo.material.opacity = 0.24 * pulse;
      // Antenne souple
      const sp = state.spring;
      bones.antenna.getWorldPosition(tip);
      const vel = tip.clone().sub(sp.last).multiplyScalar(1 / (Math.max(dt, 1e-3) * NOX_HEIGHT));
      sp.last.copy(tip);
      const acc = vel.clone().sub(sp.lastV); sp.lastV.copy(vel);
      const inv = root.quaternion.clone().invert();
      acc.applyQuaternion(inv);
      const steps = Math.ceil(dt / 0.008), h = dt / steps; // pas fixes : stable même à faible cadence
      for (let i = 0; i < steps; i++) {
        sp.v += (-sp.x * 130 - sp.v * 7 + clamp(acc.z, -3, 3) * 26 / steps) * h; sp.x += sp.v * h;
        sp.vz += (-sp.z * 130 - sp.vz * 7 - clamp(acc.x, -3, 3) * 26 / steps) * h; sp.z += sp.vz * h;
      }
      bones.antenna.rotation.set(clamp(sp.x, -0.5, 0.5) * -1, 0, clamp(sp.z, -0.5, 0.5) * -1);
    },
  };
  root.scale.setScalar(NOX_HEIGHT);
  // Points d'attache des objets (échelle compensée : objets réduits à 62 % dans ses mains)
  const holder = (bone, pos, rot, scale = 1) => { const g = new THREE.Group(); g.position.copy(pos); g.quaternion.copy(rot); g.scale.setScalar(scale); bones[bone].add(g); return g; };
  const handRot = (s) => new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), s * ARM_ANGLE).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2));
  const palm = (s) => V(-s * 0.012, -0.065, 0.01).applyAxisAngle(V(0, 0, 1), s * ARM_ANGLE);
  const k = 0.62 / NOX_HEIGHT;
  api.sockets = {
    R: holder('hand_R', palm(-1), handRot(-1), k),
    L: holder('hand_L', palm(1), handRot(1), k),
    back: holder('chest', V(0, -0.03, -0.125), new THREE.Quaternion(), 0.72),
  };
  api.bagOptions = { straps: false };
  api.seatProp = { name: 'stool', z: 0 };
  api.hideForExport = () => { [...halos, ledHalo].forEach((h) => { h.visible = false; }); };
  return api;
}
