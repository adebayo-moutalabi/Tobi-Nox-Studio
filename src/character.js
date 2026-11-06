// Personnage low-poly : géométrie, squelette, morphs du visage.
// Tout est généré par code à partir de constantes fixes : le modèle est
// strictement identique à chaque exécution (aucun aléa, hash déterministe).
import * as THREE from 'three';
import { buildClips } from './clips.js';
import { createMotion } from './motion.js';
import { V, clamp, lerp, smooth, hash, Part, jit, ring, ringOn, blendSkin } from './lowpoly.js';
import { createTalk, stepTalk, talkShape, talkBody, lifeBody, addRot, clearRot, keepHandsApart, keepHandsOut, handLife } from './talk.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

export const PALETTE = {
  skin: '#8b6a53', skinDeep: '#6c5243', neck: '#655044',
  hair: '#5a5049', brow: '#4f463f', beard: '#4b4038',
  hoodie: '#cc8726', rib: '#bd7a20', pocket: '#c58022', string: '#a99a84',
  pants: '#565651', pantsIn: '#3c3c39',
  shoe: '#c9c7c2', lace: '#b0aea8', sole: '#d6702a',
  lip: '#6e4e3c', mouth: '#3f1c1a', teeth: '#e8e2d6',
  eye: '#120e0c', frame: '#6a6057',
};
const col = (k) => new THREE.Color(PALETTE[k]);

// ---- Repères du corps (mètres, le personnage mesure 1,80) ------------------
const ARM_ANGLE = 0.46;             // A-pose de la fiche de référence
const C = V(0, 1.575, 0.01);        // centre de la tête
const SHOULDER = (s) => V(s * 0.178, 1.222, 0);
const ARM_DIR = (s) => V(s * Math.sin(ARM_ANGLE), -Math.cos(ARM_ANGLE), 0);
const ELBOW = (s) => SHOULDER(s).addScaledVector(ARM_DIR(s), 0.27);
const WRIST = (s) => ELBOW(s).addScaledVector(ARM_DIR(s), 0.25);
const HIP = (s) => V(s * 0.09, 0.72, 0);
const KNEE = (s) => V(s * 0.095, 0.41, 0.005);
const ANKLE = (s) => V(s * 0.097, 0.125, -0.01);
const FINGERS = [ // z dans la paume, longueur
  { z: 0.034, l: 0.072 }, { z: 0.012, l: 0.08 }, { z: -0.011, l: 0.074 }, { z: -0.032, l: 0.058 },
];
const handPoint = (s, p) => p.clone().applyAxisAngle(V(0, 0, 1), s * ARM_ANGLE).add(WRIST(s));

// ---- Tête : surface paramétrique ------------------------------------------
// Gabarit relevé sur les vues de face et de profil : y -> demi-largeur, avant, arrière.
const HA = 0.168, HB = 0.225, HC = 0.198;
const HEAD_W = [[-0.232, 0.012], [-0.226, 0.055], [-0.215, 0.088], [-0.2, 0.112], [-0.17, 0.134], [-0.14, 0.142], [-0.1, 0.152], [-0.06, 0.156], [-0.01, 0.157], [0.05, 0.153], [0.1, 0.142], [0.15, 0.119], [0.19, 0.086], [0.214, 0.05], [0.226, 0.006]];
const HEAD_F = [[-0.232, 0.115], [-0.215, 0.156], [-0.195, 0.176], [-0.16, 0.183], [-0.12, 0.184], [-0.06, 0.186], [-0.01, 0.186], [0.05, 0.18], [0.1, 0.168], [0.165, 0.138], [0.205, 0.085], [0.226, 0.01]];
const HEAD_B = [[-0.232, -0.09], [-0.2, -0.06], [-0.17, 0.0], [-0.14, 0.06], [-0.1, 0.12], [-0.06, 0.163], [0.0, 0.178], [0.08, 0.175], [0.15, 0.14], [0.2, 0.09], [0.226, 0.01]];
const table = (T, y) => {
  if (y <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (y <= T[i][0]) return lerp(T[i - 1][1], T[i][1], (y - T[i - 1][0]) / (T[i][0] - T[i - 1][0]));
  return T[T.length - 1][1];
};
const gauss = (a, b, sa, sb) => Math.exp(-(a * a) / (2 * sa * sa) - (b * b) / (2 * sb * sb));
function relief(x, y) { // volumes du visage : orbites, arcade, pommettes, museau, menton
  const ax = Math.abs(x);
  return 0.008 * gauss(ax - 0.092, y + 0.085, 0.032, 0.03) // joues rondes
    - 0.005 * gauss(ax - 0.135, y - 0.05, 0.02, 0.04);
}
const PF = 2.5, PB = 2.1;
function headField(x, y, z) { // < 1 à l'intérieur de la tête
  if (y > 0.226 || y < -0.232) return 2;
  const W = table(HEAD_W, y), F = table(HEAD_F, y), B = table(HEAD_B, y);
  const m = Math.max(0, 0.03 - B);
  const fr = z >= m;
  const u = fr ? (z - m) / Math.max(F - m, 1e-3) : (m - z) / Math.max(m + B, 1e-3);
  const p = fr ? PF : PB;
  return Math.abs(x / W) ** p + Math.abs(u) ** p;
}
function headSurf(d) {
  const r = V(d.x * HA, d.y * HB, d.z * HC);
  let lo = 0, hi = 1.8;
  for (let i = 0; i < 26; i++) {
    const t = (lo + hi) / 2;
    if (headField(r.x * t, r.y * t, r.z * t) < 1) lo = t; else hi = t;
  }
  const p = r.multiplyScalar(lo);
  p.z += relief(p.x, p.y) * smooth(0.02, 0.1, p.z);
  return p;
}
function faceAt(x, y) { // point de la surface frontale pour (x, y) relatifs au centre
  const W = table(HEAD_W, y), F = table(HEAD_F, y), B = table(HEAD_B, y);
  const m = Math.max(0, 0.03 - B);
  const u = Math.max(0, 1 - Math.abs(x / W) ** PF) ** (1 / PF);
  const z = m + u * (F - m);
  return V(x, y, z + relief(x, y) * smooth(0.02, 0.1, z));
}

// ---- Squelette -------------------------------------------------------------
function makeBones() {
  const defs = [
    ['hips', null, V(0, 0.8, 0)], ['spine', 'hips', V(0, 0.92, 0)], ['chest', 'spine', V(0, 1.08, 0)],
    ['neck', 'chest', V(0, 1.3, -0.01)], ['head', 'neck', V(0, 1.375, 0)],
  ];
  for (const [n, s] of [['L', 1], ['R', -1]]) {
    defs.push([`shoulder_${n}`, 'chest', V(s * 0.07, 1.24, 0)]);
    defs.push([`arm_${n}`, `shoulder_${n}`, SHOULDER(s)]);
    defs.push([`forearm_${n}`, `arm_${n}`, ELBOW(s)]);
    defs.push([`hand_${n}`, `forearm_${n}`, WRIST(s)]);
    FINGERS.forEach((f, i) => {
      const a = handPoint(s, V(0, -0.09, f.z)), b = handPoint(s, V(0, -0.09 - f.l * 0.44, f.z)), c = handPoint(s, V(0, -0.09 - f.l * 0.74, f.z));
      defs.push([`f${i}a_${n}`, `hand_${n}`, a]);
      defs.push([`f${i}b_${n}`, `f${i}a_${n}`, b]);
      defs.push([`f${i}c_${n}`, `f${i}b_${n}`, c]);
    });
    const ta = handPoint(s, V(-s * 0.006, -0.025, 0.036)), tb = handPoint(s, V(-s * 0.009, -0.062, 0.058));
    defs.push([`th_a_${n}`, `hand_${n}`, ta]);
    defs.push([`th_b_${n}`, `th_a_${n}`, tb]);
    defs.push([`upleg_${n}`, 'hips', HIP(s)]);
    defs.push([`leg_${n}`, `upleg_${n}`, KNEE(s)]);
    defs.push([`foot_${n}`, `leg_${n}`, ANKLE(s)]);
    defs.push([`toe_${n}`, `foot_${n}`, V(s * 0.097, 0.03, 0.115)]);
    defs.push([`string_${n}`, 'chest', V(s * 0.036, 1.3, 0.14)]);
  }
  return defs;
}

// ---- Construction du corps -------------------------------------------------
function buildBody(body, tails) {
  const torsoRings = [ // y, rx, rz, z
    [0.745, 0.17, 0.13, 0.0], [0.775, 0.176, 0.137, 0.0], [0.782, 0.186, 0.147, 0.0],
    [0.88, 0.19, 0.152, 0.0], [1.0, 0.185, 0.147, 0.0], [1.12, 0.186, 0.142, 0.0],
    [1.2, 0.184, 0.134, 0.0], [1.262, 0.165, 0.122, 0.0], [1.31, 0.115, 0.105, -0.005],
  ];
  const torsoSkin = (p) => blendSkin(['hips', 'spine', 'chest'], [0.86, 1.05], p.y, 0.095);
  body.loft(torsoRings.map(([y, rx, rz, z]) => ring(V(0, y, z), rx, rz, 16, 0.78, 0.2, 0.012)), {
    colorAt: (i) => (i < 1 ? 'rib' : 'hoodie'), skin: torsoSkin, capStart: 'pantsIn', vary: 0.06,
  });
  const torsoZ = (x, y) => {
    let i = 0; while (i < torsoRings.length - 2 && y > torsoRings[i + 1][0]) i++;
    const [y0, rx0, rz0] = torsoRings[i], [y1, rx1, rz1] = torsoRings[i + 1];
    const t = (y - y0) / (y1 - y0), rx = lerp(rx0, rx1, t), rz = lerp(rz0, rz1, t);
    return rz * Math.pow(Math.max(0, 1 - Math.abs(x / rx) ** 2.5), 1 / 2.5);
  };

  // Poche kangourou
  const pk = [[-0.082, 0.945], [0.082, 0.945], [0.14, 0.865], [0.14, 0.795], [-0.14, 0.795], [-0.14, 0.865]];
  const pOuter = pk.map(([x, y]) => V(x, y, torsoZ(x, y) + 0.002));
  const pInner = pk.map(([x, y]) => V(x * 0.95, lerp(y, 0.865, 0.06), torsoZ(x, y) + 0.015));
  const oP = { color: 'pocket', skin: torsoSkin, vary: 0.05 };
  body.loft([pOuter, pInner], { ...oP, capEnd: true, ref: () => V(0, 0.87, 0) });
  // ouvertures de poche (biais)
  for (const s of [1, -1]) {
    const a = V(s * 0.08, 0.94, torsoZ(0.08, 0.94) + 0.0165), b = V(s * 0.134, 0.868, torsoZ(0.134, 0.868) + 0.0165);
    const a2 = a.clone().add(V(s * 0.006, 0.006, -0.008)), b2 = b.clone().add(V(s * 0.006, 0.006, -0.008));
    body.quad(a, b, b2, a2, { color: 'rib', skin: torsoSkin, vary: 0 }, V(0, 0.87, 0));
  }

  // Capuche : col montant + masse dans le dos
  const hoodSkin = (p) => (p.y > 1.33 ? [['chest', 0.75], ['neck', 0.25]] : [['chest', 1]]);
  const collar = [
    [1.215, 0.13, 0.115, -0.015], [1.3, 0.152, 0.15, -0.035], [1.36, 0.146, 0.155, -0.045],
    [1.392, 0.122, 0.135, -0.045], [1.388, 0.096, 0.103, -0.025], [1.33, 0.072, 0.074, -0.012], [1.28, 0.05, 0.05, -0.01],
  ];
  const tilt = (r, y) => r.map((p) => { const k = smooth(1.3, 1.39, y) * clamp((p.z + 0.06) / 0.14); return p.clone().add(V(0, -0.062 * k, 0)); });
  body.loft(collar.map(([y, rx, rz, z]) => tilt(ring(V(0, y, z), rx, rz, 14, 0.9, 0.1, 0.004), y)), {
    color: 'hoodie', skin: hoodSkin, vary: 0.06,
    colorAt: (i) => (i >= 4 ? 'rib' : 'hoodie'),
    ref: (i) => (i >= 3 ? V(0, 1.5, -0.03) : null),
  });
  const hoodBack = [[1.385, 0.1, 0.05], [1.335, 0.15, 0.075], [1.26, 0.155, 0.08], [1.19, 0.115, 0.06], [1.13, 0.05, 0.03]];
  body.loft(hoodBack.map(([y, rx, rz]) => ring(V(0, y, -0.145 + (1.26 - y) * -0.04), rx, rz, 10, 0.95, 0.3, 0.008)), {
    color: 'hoodie', skin: hoodSkin, capEnd: true, capStart: true, vary: 0.06,
  });

  // Cordons
  for (const [n, s] of [['L', 1], ['R', -1]]) {
    const top = V(s * 0.036, 1.3, torsoZ(0.04, 1.25) + 0.012), end = V(s * 0.04, 1.13, torsoZ(0.04, 1.13) + 0.009);
    const rg = (c, r) => [c.clone().add(V(r, 0, 0)), c.clone().add(V(-r, 0, 0.001)), c.clone().add(V(0, 0, r * 0.9))];
    const mid = end.clone().add(V(0, 0.018, 0));
    const tip = end.clone().add(V(0, -0.016, 0));
    body.loft([rg(top, 0.0052), rg(mid, 0.0048), rg(end, 0.0072), rg(tip, 0.0058)], {
      color: 'string', skin: `string_${n}`, capEnd: true, vary: 0.04,
    });
  }

  // Cou
  body.loft([ring(V(0, 1.28, -0.02), 0.052, 0.06, 8), ring(V(0, 1.39, -0.028), 0.053, 0.076, 8), ring(V(0, 1.47, -0.03), 0.06, 0.085, 8)], {
    color: 'neck', skin: (p) => (p.y > 1.39 ? [['head', 1]] : [['neck', 1]]), vary: 0.04,
  });

  for (const [n, s] of [['L', 1], ['R', -1]]) {
    // Manche
    const d = ARM_DIR(s), S = SHOULDER(s);
    const armSkin = (p) => {
      const t = p.clone().sub(S).dot(d);
      return blendSkin([`arm_${n}`, `forearm_${n}`], [0.27], t, 0.055);
    };
    const secs = [ // distance, r1, r2
      [-0.062, 0.02, 0.03], [-0.04, 0.05, 0.06], [0.0, 0.069, 0.078], [0.1, 0.07, 0.078], [0.24, 0.064, 0.07],
      [0.31, 0.06, 0.065], [0.43, 0.056, 0.06], [0.462, 0.055, 0.059], [0.468, 0.05, 0.053], [0.525, 0.047, 0.049], [0.522, 0.034, 0.036],
    ];
    body.loft(secs.map(([t, r1, r2], i) => ringOn(S.clone().addScaledVector(d, t), d, r1, r2, 10, i > 0 && i < 8 ? 0.007 : 0.002, 0.3)), {
      colorAt: (i) => (i >= 7 ? 'rib' : 'hoodie'), skin: armSkin, capStart: true, capEnd: 'neck', vary: 0.06,
    });

    // Main (repère local : -Y le long des doigts, Z vers le pouce, X = épaisseur)
    const P = (x, y, z) => handPoint(s, V(x, y, z));
    const palm = [[-0.005, 0.016, 0.03], [-0.03, 0.021, 0.04], [-0.07, 0.019, 0.047], [-0.095, 0.012, 0.046]];
    const palmRing = (y, t, w) => [P(t, y, -w), P(t, y, 0), P(t, y, w), P(0, y, w * 1.08), P(-t, y, w), P(-t, y, 0), P(-t, y, -w), P(0, y, -w * 1.08)];
    body.loft(palm.map(([y, t, w]) => palmRing(y, t, w)), { color: 'skin', skin: `hand_${n}`, capEnd: true, vary: 0.08 });
    const prism = (c, r, sides = 5) => {
      const out = [];
      for (let j = 0; j < sides; j++) { const a = (j / sides) * Math.PI * 2 + 0.4; out.push(c.clone().add(V(Math.cos(a) * r, 0, Math.sin(a) * r))); }
      return out;
    };
    const fingerRings = (y, z, r, x = 0) => prism(V(x, y, z), r).map((p) => handPoint(s, p));
    FINGERS.forEach((f, i) => {
      const y0 = -0.086, y1 = -0.09 - f.l * 0.44, y2 = -0.09 - f.l * 0.74, y3 = -0.09 - f.l;
      body.loft([fingerRings(y0, f.z, 0.0118), fingerRings(y1 + 0.004, f.z, 0.0108)], { color: 'skin', skin: `f${i}a_${n}`, vary: 0.08 });
      body.loft([fingerRings(y1 + 0.005, f.z, 0.0108), fingerRings(y2 + 0.003, f.z, 0.0098)], { color: 'skin', skin: `f${i}b_${n}`, vary: 0.08 });
      body.loft([fingerRings(y2 + 0.004, f.z, 0.0098), fingerRings(y3 + 0.006, f.z, 0.0084), fingerRings(y3, f.z, 0.0056)], { color: 'skin', skin: `f${i}c_${n}`, capEnd: true, vary: 0.08 });
    });
    const t0 = V(-s * 0.004, -0.018, 0.03), t1 = V(-s * 0.008, -0.062, 0.058), t2 = V(-s * 0.01, -0.098, 0.068);
    const thumb = (c, r) => prism(c, r).map((p) => handPoint(s, p));
    body.loft([thumb(t0, 0.017), thumb(t1.clone().add(V(0, 0.006, 0)), 0.0132)], { color: 'skin', skin: `th_a_${n}`, vary: 0.08 });
    body.loft([thumb(t1.clone().add(V(0, 0.01, 0)), 0.0132), thumb(t2, 0.0085)], { color: 'skin', skin: `th_b_${n}`, capEnd: true, vary: 0.08 });

    // Jambe de pantalon
    const legSkin = (p) => {
      if (p.y > 0.7) { const w = smooth(0.7, 0.82, p.y); return [[`upleg_${n}`, 1 - w], ['hips', w]]; }
      return blendSkin([`leg_${n}`, `upleg_${n}`], [0.41], p.y, 0.05);
    };
    const leg = [ // y, x, r1, r2, z
      [0.85, 0.08, 0.07, 0.096, 0], [0.76, 0.085, 0.074, 0.1, 0], [0.7, 0.09, 0.083, 0.102, 0], [0.655, 0.093, 0.09, 0.104, 0], [0.54, 0.094, 0.082, 0.092, 0.002], [0.43, 0.095, 0.074, 0.08, 0.004],
      [0.37, 0.095, 0.071, 0.077, 0.002], [0.26, 0.096, 0.066, 0.071, -0.006], [0.155, 0.097, 0.061, 0.066, -0.012],
    ];
    body.loft(leg.map(([y, x, r1, r2, z]) => {
      const r = ring(V(s * x, y, z), r1, r2, 12, 0.9, 0.25, 0.01);
      return r.map((p) => { // pli central du pantalon
        const a = Math.atan2(p.x - s * x, p.z - z);
        return p.clone().add(V(0, 0, 0.012 * Math.exp(-a * a * 9) - 0.012 * Math.exp(-((Math.abs(a) - Math.PI) ** 2) * 9) * 0 ));
      });
    }), { color: 'pants', skin: legSkin, capEnd: 'pantsIn', vary: 0.07 });
    // Cheville
    body.loft([ring(V(s * 0.097, 0.19, -0.012), 0.03, 0.032, 7), ring(V(s * 0.097, 0.09, -0.012), 0.033, 0.036, 7)], {
      color: 'neck', skin: (p) => blendSkin([`foot_${n}`, `leg_${n}`], [0.125], p.y, 0.02), vary: 0.04,
    });

    // Chaussure
    const fx = s * 0.097, fz0 = -0.01;
    const footSkin = (p) => blendSkin([`foot_${n}`, `toe_${n}`], [0.115], p.z, 0.03);
    const shoe = [ // z, demi-largeur, hauteur
      [-0.092, 0.03, 0.05], [-0.082, 0.056, 0.095], [-0.04, 0.066, 0.135], [0.02, 0.07, 0.122], [0.075, 0.073, 0.09], [0.135, 0.074, 0.074], [0.178, 0.06, 0.06], [0.2, 0.035, 0.042],
    ];
    const secShoe = ([z, w, h]) => {
      const y0 = 0.03, c = V(fx, 0, fz0 + z);
      return [V(-w, y0, 0), V(-w * 1.02, y0 + h * 0.45, 0), V(-w * 0.72, y0 + h * 0.84, 0), V(0, y0 + h, 0), V(w * 0.72, y0 + h * 0.84, 0), V(w * 1.02, y0 + h * 0.45, 0), V(w, y0, 0)].map((p) => jit(p.add(c), 0.003));
    };
    body.loft(shoe.map(secShoe), { color: 'shoe', skin: footSkin, capStart: true, capEnd: true, vary: 0.035 });
    // Lacets
    for (let i = 0; i < 3; i++) {
      const z = fz0 + 0.03 + i * 0.033, h = lerp(0.142, 0.118, i / 2), w = 0.034;
      const y = h + 0.008 - i * 0.003;
      const q = [V(fx - w, y - 0.012, z), V(fx, y + 0.003, z - 0.002), V(fx + w, y - 0.012, z)];
      const q2 = q.map((p) => p.clone().add(V(0, -0.002, 0.012)));
      const o = { color: 'lace', skin: `foot_${n}`, vary: 0.02 };
      body.quad(q[0], q[1], q2[1], q2[0], o, V(fx, 0, z));
      body.quad(q[1], q[2], q2[2], q2[1], o, V(fx, 0, z));
    }
    // Semelle
    const soleOutline = (y, g) => {
      const pts = [[-0.1, 0.038], [-0.082, 0.066], [-0.03, 0.074], [0.06, 0.082], [0.135, 0.084], [0.19, 0.068], [0.218, 0.036]];
      const out = [];
      pts.forEach(([z, w]) => out.push(V(fx + w * g, y, fz0 + z * g)));
      [...pts].reverse().forEach(([z, w]) => out.push(V(fx - w * g, y, fz0 + z * g)));
      return out;
    };
    body.loft([soleOutline(0.0, 1.0), soleOutline(0.018, 1.04), soleOutline(0.036, 1.0)], {
      color: 'sole', skin: footSkin, capStart: true, capEnd: true, vary: 0.04,
    });
  }

  buildHair(body, tails);
}

// ---- Tresses collées -------------------------------------------------------
function buildHair(body, tails) {
  const N = 5;
  const dirOf = (a, e) => V(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  const toW = (p) => p.clone().add(C);
  const block = (c, T, Nn, w, h, l, o) => {
    const B = T.clone().cross(Nn).normalize();
    const mk = (tt, nn, ww) => c.clone().addScaledVector(T, tt).addScaledVector(Nn, nn).addScaledVector(B, ww);
    const b = [mk(-l, -0.006, -w), mk(l, -0.006, -w), mk(l, -0.006, w), mk(-l, -0.006, w)];
    const m = [mk(-l, h * 0.7, -w), mk(l, h * 0.7, -w), mk(l, h * 0.7, w), mk(-l, h * 0.7, w)];
    const t = [mk(-l * 0.85, h, -w * 0.55), mk(l * 0.85, h, -w * 0.55), mk(l * 0.85, h, w * 0.55), mk(-l * 0.85, h, w * 0.55)];
    const ref = c.clone().addScaledVector(Nn, -0.02);
    for (let j = 0; j < 4; j++) {
      const k = (j + 1) % 4;
      body.quad(b[j], b[k], m[k], m[j], o, ref);
      body.quad(m[j], m[k], t[k], t[j], o, ref);
    }
    body.quad(t[0], t[1], t[2], t[3], o, ref);
  };
  for (let i = -N; i <= N; i++) {
    const u = i / N, au = Math.abs(u);
    const S = dirOf(u * 1.62, lerp(0.76, 0.2, au ** 1.4));
    const E = dirOf(Math.PI - u * lerp(0.62, 0.78, au), lerp(-0.62, -0.26, au ** 2));
    const M = V(u * 1.5, lerp(1.9, 0.55, au * au), -0.15);
    const pts = [];
    const steps = 60;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const d = S.clone().multiplyScalar((1 - t) ** 2).addScaledVector(M, 2 * t * (1 - t)).addScaledVector(E, t * t).normalize();
      pts.push({ d, p: headSurf(d) });
    }
    let acc = 0, idx = 0;
    const step = 0.0172;
    const o = { color: 'hair', skin: 'head', vary: 0.08 };
    let last = null;
    for (let k = 1; k <= steps; k++) {
      acc += pts[k].p.distanceTo(pts[k - 1].p);
      if (acc < step) continue;
      acc = 0; idx++;
      const a = pts[k], T = a.p.clone().sub(pts[k - 1].p).normalize();
      const Nn = a.d.clone().sub(T.clone().multiplyScalar(a.d.dot(T))).normalize();
      const end = clamp((steps - k) / 8, 0.55, 1);
      block(toW(a.p), T, Nn, 0.0148 * end, (idx % 2 ? 0.019 : 0.0155) * end, 0.0096, o);
      last = { p: toW(a.p), T, Nn };
    }
    // Mèches qui pendent derrière les oreilles
    if (Math.abs(i) >= 3 && last) {
      const s = Math.sign(i), name = `tail_${s > 0 ? 'L' : 'R'}${Math.abs(i)}`;
      const p0 = last.p.clone().add(V(0, -0.002, 0.0));
      tails.push({ name, pos: p0.clone(), side: s });
      const len = 0.05 + (Math.abs(i) - 3) * 0.018;
      const n = Math.round(len / 0.017);
      for (let k = 0; k < n; k++) {
        const c = p0.clone().add(V(s * 0.002 * k, -0.012 - k * 0.0165, -0.002 * k));
        const w = lerp(0.0115, 0.0072, k / n);
        block(c, V(0, -1, 0), V(s * 0.4, 0, -0.9).normalize(), w, (k % 2 ? 0.02 : 0.016) * lerp(1, 0.7, k / n), 0.0085, { ...o, skin: name });
      }
    }
  }
}

// ---- Visage ----------------------------------------------------------------
const FACE = { eyeX: 0.066, eyeY: -0.04, mouthY: -0.133, mouthW: 0.027 };

function buildHead(head, eyes, lids) {
  const o = {
    color: 'skin', skin: 'head', tag: 'skin', vary: 0.025,
    tint: (c, m) => { const t = smooth(1.38, 1.7, m.y); c.lerp(col('skinDeep'), (1 - t) * 0.3); },
  };
  const ico = new THREE.IcosahedronGeometry(1, 4);
  const a = ico.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const d = V(a.getX(i), a.getY(i), a.getZ(i)).normalize();
    const p = headSurf(d);
    const q = jit(V(Math.abs(p.x), p.y, p.z), 0.0035);
    q.x = Math.abs(p.x) < 1e-5 ? 0 : q.x * Math.sign(p.x);
    q.add(C);
    a.setXYZ(i, q.x, q.y, q.z);
  }
  head.geo(ico, o);

  const at = (x, y, off = 0) => { const q = faceAt(x, y); q.z += off; return q.add(C); };
  // Petit nez triangulaire
  const nose = { ...o, tag: 'nose', vary: 0.03 };
  const under = { ...nose, tint: (c) => c.multiplyScalar(0.8) };
  const n0 = C.clone().add(V(0, -0.08, 0.08));
  const N = (x, y, dz) => { const q = V(x, y, faceAt(0, y).z + dz); return q.add(C); };
  const Tp = N(0, -0.058, 0.002), Tip = N(0, -0.088, 0.02), Bs = N(0, -0.097, 0.002);
  for (const s of [1, -1]) {
    const W = N(s * 0.019, -0.094, 0.001);
    head.tri(Tp, Tip, W, nose, n0); head.tri(Tip, Bs, W, under, n0);
  }

  // Oreilles
  for (const s of [1, -1]) {
    const e = new THREE.IcosahedronGeometry(1, 1);
    e.scale(0.012, 0.05, 0.037);
    e.rotateX(-0.22); e.rotateY(s * 0.26);
    e.translate(s * 0.152, -0.04, -0.042);
    e.translate(C.x, C.y, C.z);
    const p = e.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = jit(V(p.getX(i), p.getY(i), p.getZ(i)), 0.004); p.setXYZ(i, v.x, v.y, v.z); }
    head.geo(e, { ...o, tag: 'ear', vary: 0.06 });
  }

  // Sourcils : deux traits droits
  for (const sd of [1, -1]) {
    const op = { color: 'brow', skin: 'head', tag: sd > 0 ? 'browL' : 'browR', vary: 0.06 };
    const pts = [[0.03, 0.03], [0.06, 0.036], [0.1, 0.03]];
    const rings = pts.map(([x, y]) => { const c = at(sd * x, y, 0); return [c.clone().add(V(0, 0.0085, 0.002)), c.clone().add(V(0, 0.0085, 0.011)), c.clone().add(V(0, -0.0085, 0.011)), c.clone().add(V(0, -0.0085, 0.002))]; });
    head.loft(rings, { ...op, capStart: true, capEnd: true, ref: () => C, open: true });
  }

  // Bouche : un simple aplat sombre, qui change de forme selon l'émotion
  const { mouthY: yM, mouthW: mw } = FACE;
  const cols = 10, hh = 0.0048;
  const mo = { color: 'mouth', skin: 'head', tag: 'mouth', vary: 0.02 };
  const rows = [[], []];
  for (let j = 0; j <= cols; j++) { const x = lerp(-mw, mw, j / cols); rows[0].push(at(x, yM + hh, 0.0065)); rows[1].push(at(x, yM - hh, 0.0065)); }
  for (let j = 0; j < cols; j++) head.quad(rows[0][j], rows[0][j + 1], rows[1][j + 1], rows[1][j], mo, C);

  // Yeux : pavés noirs avec un reflet carré
  for (const sd of [1, -1]) {
    const ex = sd * FACE.eyeX, ey = FACE.eyeY, hw = 0.0185, hh2 = 0.023;
    const grid = (x0, x1, y0, y1, off, opt) => {
      const n = 2, pt = (i, k) => at(lerp(x0, x1, i / n), lerp(y0, y1, k / n), off);
      for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) eyes.quad(pt(i, k), pt(i + 1, k), pt(i + 1, k + 1), pt(i, k + 1), opt, C);
    };
    grid(ex - hw, ex + hw, ey - hh2, ey + hh2, 0.003, { color: 'eye', skin: 'head', tag: 'eye', vary: 0 });
    grid(ex - 0.003 * sd - 0.0065, ex - 0.003 * sd + 0.0065, ey + 0.0055, ey + 0.0175, 0.0042, { color: '#fbfaf5', skin: 'head', tag: 'hi', vary: 0 });
  }
}

// ---- Morphs : champs de déplacement partagés par toutes les pièces du visage
export const MORPHS = [
  'jawOpen', 'smileL', 'smileR', 'frown', 'pucker', 'wide', 'press', 'sneer',
  'browUpL', 'browUpR', 'browAngry', 'browSad', 'blinkL', 'blinkR', 'lookL', 'lookR', 'lookU', 'lookD',
];
function morphField(name, p, tag) {
  const { mouthY: yM, mouthW: mw, eyeX, eyeY } = FACE;
  const x = p.x, y = p.y, ax = Math.abs(x), ry = y - yM, u = clamp(x / mw, -1, 1), au = Math.abs(u);
  const mouth = tag === 'mouth', brow = tag === 'browL' || tag === 'browR', eye = tag === 'eye' || tag === 'hi';
  switch (name) {
    case 'jawOpen': if (!mouth) return null; return ry < 0 ? [-x * 0.12, -0.036 * (1 - au ** 4 * 0.5), 0.002] : [-x * 0.12, 0.002, 0.001];
    case 'smileL': case 'smileR': {
      if (!mouth) return null;
      const s = name === 'smileL' ? 1 : -1, g = Math.max(0, s * u);
      return [s * 0.009 * g, 0.018 * g * g - 0.0035 * (1 - au), 0];
    }
    case 'frown': return mouth ? [0, -0.016 * u * u + 0.004, 0] : null;
    case 'pucker': return mouth ? [-x * 0.5, ry > 0 ? 0.006 : -0.006, 0] : null;
    case 'wide': return mouth ? [x * 0.4, 0, 0] : null;
    case 'press': return mouth ? [0, -ry * 0.55, 0] : null;
    case 'sneer': return mouth ? [0, 0.006 * Math.max(0, u), 0] : null;
    case 'browUpL': case 'browUpR':
      if (tag !== (name === 'browUpL' ? 'browL' : 'browR')) return null;
      return [0, 0.019, 0.001];
    case 'browAngry': {
      if (!brow) return null;
      const w = clamp(1 - (ax - 0.03) / 0.07), s = Math.sign(x);
      return [-s * 0.006 * w, -0.019 * w + 0.004, 0.002];
    }
    case 'browSad': {
      if (!brow) return null;
      const w = clamp(1 - (ax - 0.03) / 0.07);
      return [0, 0.02 * w - 0.008 * (1 - w), 0];
    }
    case 'blinkL': case 'blinkR': {
      if (!eye || (name === 'blinkL') !== (x > 0)) return null;
      const r = tag === 'hi' ? 1 : 0.9;
      return [0, -(y - eyeY) * r - 0.002, 0];
    }
    case 'lookL': return eye ? [0.0075, 0, 0] : null;
    case 'lookR': return eye ? [-0.0075, 0, 0] : null;
    case 'lookU': return eye ? [0, 0.0065, 0] : null;
    case 'lookD': return eye ? [0, -0.0065, 0] : null;
    default: return null;
  }
}

function toGeometry(part, boneIndex, morphs, lids) {
  const g = new THREE.BufferGeometry();
  const n = part.p.length / 3;
  g.setAttribute('position', new THREE.Float32BufferAttribute(part.p, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(part.c, 3));
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  part.si.forEach((w, i) => w.slice(0, 4).forEach(([b, v], k) => {
    if (!(b in boneIndex)) throw new Error('Os inconnu ' + b);
    si[i * 4 + k] = boneIndex[b]; sw[i * 4 + k] = v;
  }));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.computeVertexNormals();
  if (morphs) {
    g.morphTargetsRelative = true;
    g.morphAttributes.position = MORPHS.map((name) => {
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const p = V(part.p[i * 3], part.p[i * 3 + 1], part.p[i * 3 + 2]).sub(C);
        const d = morphField(name, p, part.tag[i]);
        if (d) { arr[i * 3] = d[0]; arr[i * 3 + 1] = d[1]; arr[i * 3 + 2] = d[2]; }
      }
      const at = new THREE.Float32BufferAttribute(arr, 3); at.name = name; return at;
    });
  }
  return g;
}

function buildGlasses(headBone) {
  const grp = new THREE.Group(); grp.name = 'glasses';
  const mat = new THREE.MeshStandardMaterial({ color: PALETTE.frame, roughness: 0.72, metalness: 0, flatShading: true });
  const lensMat = new THREE.MeshStandardMaterial({ color: '#cfd8dc', roughness: 0.6, metalness: 0, transparent: true, opacity: 0.05, depthWrite: false });
  const add = (g, m = mat, name) => { const x = new THREE.Mesh(g, m); if (name) x.name = name; x.castShadow = m === mat; grp.add(x); return x; };
  const R = 0.05, cx = 0.0625, y = FACE.eyeY - 0.005;
  const z = faceAt(cx, y).z + 0.024;
  for (const s of [1, -1]) {
    const rim = add(new THREE.TorusGeometry(R, 0.0048, 5, 24), mat, 'rim');
    rim.position.set(s * cx, y, z); rim.rotation.y = s * 0.13;
    const lens = add(new THREE.CircleGeometry(R, 24), lensMat, 'lens');
    lens.position.copy(rim.position); lens.rotation.copy(rim.rotation);
    const from = V(s * (cx + R * 0.985), y + 0.006, z - 0.012), to = V(s * 0.156, y + 0.003, -0.05);
    const len = from.distanceTo(to);
    const arm = add(new THREE.CylinderGeometry(0.0034, 0.0034, len, 5), mat, 'temple');
    arm.position.copy(from).add(to).multiplyScalar(0.5);
    arm.quaternion.setFromUnitVectors(V(0, 1, 0), to.clone().sub(from).normalize());
  }
  const bridge = add(new THREE.TorusGeometry(0.0115, 0.0036, 5, 8, Math.PI), mat, 'bridge');
  bridge.position.set(0, y + 0.012, z + 0.004);
  const head = headBone.getWorldPosition(new THREE.Vector3());
  grp.position.copy(C).sub(head);
  headBone.add(grp);
  return grp;
}

// ---- Expressions -----------------------------------------------------------
export const EXPRESSIONS = {
  neutre: {},
  sourire: { smileL: 0.8, smileR: 0.8, browUpL: 0.15, browUpR: 0.15 },
  joie: { smileL: 1, smileR: 1, jawOpen: 0.5, browUpL: 0.5, browUpR: 0.5 },
  surprise: { jawOpen: 0.7, pucker: 0.45, browUpL: 1, browUpR: 1 },
  colere: { browAngry: 1, frown: 0.7, wide: 0.2 },
  tristesse: { browSad: 1, frown: 1, blinkL: 0.25, blinkR: 0.25, lookD: 0.6 },
  doute: { browUpL: 0.85, browAngry: 0.3, smileR: 0.5, press: 0.3, lookL: 0.5, lookU: 0.3 },
  clin: { blinkR: 1, smileL: 0.9, smileR: 0.4, browUpL: 0.4 },
  degout: { frown: 0.8, sneer: 1, browAngry: 0.6, blinkL: 0.3, blinkR: 0.3 },
  dort: { blinkL: 1, blinkR: 1, press: 0.3 },
  peur: { browSad: 0.9, browUpL: 0.5, browUpR: 0.5, wide: 0.5, jawOpen: 0.3, frown: 0.4 },
};
const VISEMES = {
  a: { jawOpen: 0.62 }, e: { jawOpen: 0.3, wide: 0.5 }, i: { jawOpen: 0.13, wide: 0.75 },
  o: { jawOpen: 0.42, pucker: 0.55 }, u: { jawOpen: 0.14, pucker: 0.8 },
  m: { press: 1 }, f: { jawOpen: 0.1, press: 0.4 }, t: { jawOpen: 0.2, wide: 0.2 }, s: { jawOpen: 0.08, wide: 0.5 }, r: { jawOpen: 0.2, pucker: 0.25 }, ' ': {},
};
const VISEME_OF = (ch) => {
  const c = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if ('a'.includes(c)) return 'a'; if ('e'.includes(c)) return 'e'; if ('iy'.includes(c)) return 'i';
  if ('o'.includes(c)) return 'o'; if ('uw'.includes(c)) return 'u'; if ('mbp'.includes(c)) return 'm';
  if ('fv'.includes(c)) return 'f'; if ('tdnlk'.includes(c)) return 't'; if ('szcjgxq'.includes(c)) return 's';
  if ('rh'.includes(c)) return 'r'; return ' ';
};

export function createCharacter() {
  const root = new THREE.Group(); root.name = 'tobi';

  // Os
  const tails = [];
  const body = new Part(PALETTE), head = new Part(PALETTE), eyes = new Part(PALETTE), lids = [];
  buildBody(body, tails);
  buildHead(head, eyes, lids);

  const defs = makeBones();
  tails.forEach((t) => defs.push([t.name, 'head', t.pos]));
  const bones = {}, world = {}, list = [];
  for (const [name, parent, pos] of defs) {
    const b = new THREE.Bone(); b.name = name; bones[name] = b; world[name] = pos; list.push(b);
    if (parent) { bones[parent].add(b); b.position.copy(pos).sub(world[parent]); } else { b.position.copy(pos); }
  }
  root.add(bones.hips);
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(list);
  const index = Object.fromEntries(list.map((b, i) => [b.name, i]));

  const matte = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.74, metalness: 0, side: THREE.DoubleSide });
  matte.name = 'mat';
  const gloss = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  gloss.name = 'eyes';
  const make = (part, name, mat, morph) => {
    const g = toCreasedNormals(toGeometry(part, index, morph, lids), 0.85); // volumes arrondis, arêtes franches conservées
    const m = new THREE.SkinnedMesh(g, mat);
    m.name = name; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true;
    root.add(m); m.bind(skeleton);
    if (morph) { m.updateMorphTargets(); m.morphTargetDictionary = Object.fromEntries(MORPHS.map((k, i) => [k, i])); }
    return m;
  };
  const bodyMesh = make(body, 'corps', matte, false);
  const headMesh = make(head, 'tete', matte, true);
  const eyeMesh = make(eyes, 'yeux', gloss, true);
  eyeMesh.receiveShadow = false;
  const glasses = buildGlasses(bones.head);

  const clips = buildClips(bones);
  const motion = createMotion(root, bones, clips);
  const mixer = motion.mixer;

  // État animé
  const faceMeshes = [headMesh, eyeMesh];
  const weights = Object.fromEntries(MORPHS.map((m) => [m, 0]));
  const fingerBones = ['L', 'R'].flatMap((n) => [0, 1, 2, 3].flatMap((i) => ['a', 'b', 'c'].map((k) => bones[`f${i}${k}_${n}`])).concat(bones[`th_a_${n}`], bones[`th_b_${n}`]));
  const tapBones = [...fingerBones, bones.head, bones.chest, bones.spine, bones.neck, bones.arm_L, bones.arm_R, bones.upleg_L, bones.upleg_R, bones.leg_L, bones.leg_R, ...['L', 'R'].flatMap((n) => [bones[`forearm_${n}`], bones[`hand_${n}`], ...[0, 1, 2, 3].map((k) => bones[`f${k}a_${n}`])])];
  const state = {
    expr: {}, exprName: 'neutre', blinkT: 2, blink: 0, blinkDir: 0, glanceT: 3, glance: { lookL: 0, lookR: 0, lookU: 0, lookD: 0 },
    talk: null, viseme: {}, current: null, loco: 'idle', gesture: null, taps: { L: 0, R: 0 }, tapF: { L: 1, R: 2 }, lift: 0, liftTo: 0,
    spring: { v: 0, x: 0, vz: 0, z: 0, lastPos: V(0, 0, 0), lastVel: V(0, 0, 0) },
  };

  const api = {
    root, bones, skeleton, clips, mixer, glasses, meshes: { body: bodyMesh, head: headMesh, eyes: eyeMesh },
    motion,
    get seat() { return motion.seat; },
    get gesture() { return motion.gesture; },
    get expression() { return state.exprName; },
    get talking() { return !!state.talk; },
    setLocomotion: motion.setLocomotion,
    play: motion.play,
    setExpression(name) {
      state.exprName = name;
      state.expr = EXPRESSIONS[name] || {};
    },
    say(text, onEnd, duration, env) {
      const seq = [];
      for (const ch of text) {
        const v = VISEME_OF(ch);
        const punct = /[.,;:!?]/.test(ch);
        seq.push({ v: punct ? ' ' : v, d: punct ? 0.24 : (v === ' ' ? 0.07 : 0.078) });
      }
      seq.push({ v: ' ', d: 0.1 });
      state.talk = createTalk(seq, onEnd, duration, env);
    },
    setGlasses(on) { glasses.visible = on; },
    setMorphs(obj) { Object.assign(weights, obj); faceApply(weights); },
    setLift(h, flat) { state.liftTo = h; state.liftFlat = !!flat; },
    tap(side) { state.taps[side] = 1; state.tapF[side] = (state.tapF[side] + 1 + (side === 'L' ? 0 : 1)) % 4; },
    update(dt) {
      clearRot(tapBones);
      motion.update(dt);
      lifeBody(state, dt, { chest: bones.chest, spine: bones.spine, neck: bones.neck, armL: bones.arm_L, armR: bones.arm_R });
      if (state.lift || state.liftTo) { // assis plus haut : le bassin monte, les pieds restent au sol
        state.lift += (state.liftTo - state.lift) * (1 - Math.exp(-dt * 7));
        if (Math.abs(state.lift) < 0.001 && !state.liftTo) state.lift = 0;
        root.position.y = state.lift;
        state.liftLegs = (state.liftLegs ?? 1) + ((state.liftFlat ? 0 : 1) - (state.liftLegs ?? 1)) * (1 - Math.exp(-dt * 7)); // couché, les jambes restent droites
        const k = (state.lift / 0.09) * state.liftLegs;
        for (const n of ['L', 'R']) { addRot(bones[`upleg_${n}`], 0.24 * k, 0, 0); addRot(bones[`leg_${n}`], -0.28 * k, 0, 0); }
      }
      talkBody(state, dt, bones.head, bones.chest, api.energy || 1, motion.handsFree ? [bones.forearm_L, bones.forearm_R, bones.arm_L, bones.arm_R] : null, motion.seat);
      if (motion.handsFree) keepHandsApart(root, bones);
      if (motion.handsFree) handLife(state, bones);
      keepHandsOut(root, bones, api.avoid);
      for (const n of ['L', 'R']) { // chaque frappe se voit dans la main
        const p = state.taps[n] = Math.max(0, state.taps[n] - dt * 11);
        if (p > 0) {
          addRot(bones[`forearm_${n}`], 0.1 * p, 0, 0); addRot(bones[`hand_${n}`], 0.34 * p, 0, 0);
          for (let i = 0; i < 4; i++) addRot(bones[`f${i}a_${n}`], 0.5 * p * (i === state.tapF[n] ? 1 : 0.2), 0, 0);
        }
      }
      // Clignement automatique
      state.blinkT -= dt;
      if (state.blinkT <= 0 && !state.blinkDir) { state.blinkDir = 1; state.blinkT = 2.2 + Math.random() * 3.2; }
      if (state.blinkDir) {
        state.blink += state.blinkDir * dt / 0.06;
        if (state.blink >= 1) { state.blink = 1; state.blinkDir = -1; }
        if (state.blink <= 0) { state.blink = 0; state.blinkDir = 0; }
      }
      // Regard qui bouge légèrement
      state.glanceT -= dt;
      if (state.glanceT <= 0) {
        state.glanceT = 1.6 + Math.random() * 3.5;
        const gx = (Math.random() - 0.5) * 0.7, gy = (Math.random() - 0.5) * 0.4;
        state.glance = { lookL: Math.max(0, gx), lookR: Math.max(0, -gx), lookU: Math.max(0, gy), lookD: Math.max(0, -gy) };
      }
      // Parole
      state.viseme = {};
      if (state.talk) {
        const T = state.talk;
        if (stepTalk(T, dt)) { const f = T.onEnd; state.talk = null; f?.(); }
        else state.viseme = talkShape(VISEMES[T.seq[T.i].v] || {}, T);
      }
      const k = 1 - Math.exp(-dt * 8), kv = 1 - Math.exp(-dt * 18);
      for (const m of MORPHS) {
        let target = state.expr[m] || 0;
        if (m in state.glance) target += state.glance[m];
        if (state.talk) {
          if (m === 'jawOpen' || m === 'pucker' || m === 'wide' || m === 'press') target = target * 0.2 + (state.viseme[m] || 0);
          else if (m === 'smileL' || m === 'smileR' || m === 'sneer') target *= 0.6; // la bouche reste droite quand il parle
        }
        weights[m] += (target - weights[m]) * (state.talk ? kv : k);
      }
      const out = { ...weights };
      out.blinkL = Math.max(out.blinkL, state.blink); out.blinkR = Math.max(out.blinkR, state.blink);
      faceApply(out);
      // Inertie : cordons et mèches
      const sp = state.spring;
      const pos = root.position;
      const vel = pos.clone().sub(sp.lastPos).multiplyScalar(1 / Math.max(dt, 1e-3));
      sp.lastPos.copy(pos);
      const hip = bones.hips.position.y;
      const acc = (vel.length() - sp.lastVel.length()) * 0.6 + (hip - (sp.h ?? hip)) / Math.max(dt, 1e-3) * 0.9;
      sp.h = hip; sp.lastVel.copy(vel);
      const steps = Math.ceil(dt / 0.008), h = dt / steps; // pas fixes : stable même à faible cadence
      for (let i = 0; i < steps; i++) { sp.v += (-sp.x * 90 - sp.v * 7 + clamp(acc, -6, 6) * 6 / steps) * h; sp.x += sp.v * h; }
      const a = clamp(sp.x, -0.5, 0.5);
      for (const n of ['L', 'R']) bones[`string_${n}`].rotation.set(-Math.abs(a) * 0.7 - 0.02, 0, (n === 'L' ? 1 : -1) * a * 0.3);
      for (const t of tails) bones[t.name].rotation.set(a * 0.6, 0, t.side * a * 0.4);
    },
  };
  function faceApply(w) {
    for (const mesh of faceMeshes) {
      const inf = mesh.morphTargetInfluences;
      MORPHS.forEach((m, i) => { inf[i] = w[m]; });
    }
  }
  // Points d'attache des objets
  const holder = (bone, pos, rot, scale = 1) => { const g = new THREE.Group(); g.position.copy(pos); g.quaternion.copy(rot); g.scale.setScalar(scale); bones[bone].add(g); return g; };
  const handRot = (s) => new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), s * ARM_ANGLE).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2));
  const palm = (s) => V(-s * 0.03, -0.07, 0.006).applyAxisAngle(V(0, 0, 1), s * ARM_ANGLE);
  api.sockets = {
    R: holder('hand_R', palm(-1), handRot(-1)),
    L: holder('hand_L', palm(1), handRot(1)),
    back: holder('chest', V(0, -0.1, -0.165), new THREE.Quaternion()),
    carry: holder('chest', V(0, -0.14, 0.215), new THREE.Quaternion()),
    shoulder: holder('chest', V(0.15, 0.145, -0.02), new THREE.Quaternion()),
    bagTop: holder('chest', V(0, -0.07, -0.25), new THREE.Quaternion()),
  };
  api.bagOptions = { straps: true };
  api.seatProp = { name: 'chair', z: -0.3 };
  return api;
}
