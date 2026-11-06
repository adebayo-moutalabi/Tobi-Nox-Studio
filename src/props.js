// Objets low-poly à taille réelle (mètres). Origine = point de prise, +Y = haut de l'objet.
import * as THREE from 'three';
import { V, Part, jit, ring } from './lowpoly.js';

const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.68, metalness: 0, side: THREE.DoubleSide });
MAT.name = 'objet';

export function box(p, c, s, color, o = {}) { // centre, tailles
  const [x, y, z] = c, [w, h, d] = s.map((v) => v / 2);
  const P = [[-w, -h, -d], [w, -h, -d], [w, h, -d], [-w, h, -d], [-w, -h, d], [w, -h, d], [w, h, d], [-w, h, d]].map(([a, b, e]) => V(x + a, y + b, z + e));
  const ref = V(x, y, z), op = { color, skin: 'x', vary: 0.04, ...o };
  if (o.m) { P.forEach((v) => v.applyMatrix4(o.m)); ref.applyMatrix4(o.m); }
  for (const [a, b, e, f] of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]]) p.quad(P[a], P[b], P[e], P[f], op, ref);
}
export function mesh(part, name) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(part.p, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(part.c, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, MAT);
  m.name = name; m.castShadow = true; m.receiveShadow = true;
  return m;
}
export const yLoft = (p, secs, n, color, o = {}) => p.loft(secs.map(([y, r]) => ring(V(0, y, 0), r, r, n, 1, 0.2)), { color, skin: 'x', capStart: true, capEnd: true, vary: 0.05, ...o });

const BUILD = {
  paper(p) { // feuille A4, prise par un coin bas
    const W = 0.21, H = 0.297, cols = 3, rows = 4, pt = (i, j) => V(-(i / cols) * W, (j / rows) * H - 0.03, 0.006 * Math.sin((i / cols) * Math.PI));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) p.quad(pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1), { color: '#e9e6df', skin: 'x', vary: 0.03 }, V(-0.1, 0.1, -1));
    for (let k = 0; k < 6; k++) {
      const y = 0.215 - k * 0.032, x0 = -0.03, x1 = k === 5 ? -0.11 : -0.18;
      const a = V(x0, y, 0.0075), b = V(x1, y, 0.0075), c = V(x1, y + 0.009, 0.0075), d = V(x0, y + 0.009, 0.0075);
      p.quad(a, b, c, d, { color: '#8d8c88', skin: 'x', vary: 0 }, V(-0.1, 0.1, -1));
    }
  },
  book(p) {
    box(p, [-0.075, 0.08, 0], [0.15, 0.21, 0.03], '#2e4a7d');
    box(p, [-0.076, 0.08, 0], [0.14, 0.2, 0.034], '#e6e2d8');
    box(p, [-0.075, 0.08, 0.0165], [0.15, 0.21, 0.004], '#2e4a7d');
    box(p, [-0.075, 0.08, -0.0165], [0.15, 0.21, 0.004], '#2e4a7d');
    box(p, [-0.075, 0.13, 0.0195], [0.09, 0.022, 0.002], '#d98d24');
  },
  bottle(p) { // gourde
    yLoft(p, [[-0.1, 0.03], [-0.094, 0.037], [0.05, 0.037], [0.075, 0.03], [0.087, 0.024]], 10, '#2f93a6');
    yLoft(p, [[-0.04, 0.0378], [-0.015, 0.0378]], 10, '#e0dcd2');
    yLoft(p, [[0.086, 0.0265], [0.114, 0.0265], [0.12, 0.02]], 10, '#55575c');
    box(p, [0, 0.13, 0], [0.034, 0.008, 0.008], '#55575c');
    box(p, [0.016, 0.122, 0], [0.006, 0.02, 0.008], '#55575c'); box(p, [-0.016, 0.122, 0], [0.006, 0.02, 0.008], '#55575c');
  },
  mug(p) {
    yLoft(p, [[-0.045, 0.036], [-0.04, 0.04], [0.045, 0.042]], 10, '#e6e2da', { capEnd: '#5a3a25' });
    box(p, [0.056, 0.012, 0], [0.008, 0.05, 0.012], '#e6e2da');
    box(p, [0.048, 0.034, 0], [0.018, 0.008, 0.012], '#e6e2da'); box(p, [0.048, -0.01, 0], [0.018, 0.008, 0.012], '#e6e2da');
  },
  phone(p) {
    box(p, [-0.03, 0.05, 0], [0.078, 0.158, 0.015], '#1f2126');
    box(p, [-0.03, 0.05, 0.0082], [0.068, 0.144, 0.001], '#12141a', { vary: 0 });
    box(p, [-0.03, 0.05, -0.0082], [0.072, 0.15, 0.001], '#c8342c', { vary: 0 });
    box(p, [-0.05, 0.11, -0.0092], [0.022, 0.022, 0.002], '#16171b', { vary: 0 });
  },
  bag(p, { straps }) { // le sac à dos noir : ouvert sur le dessus, Nox peut s'y glisser
    const c = '#2a2b30', d = '#35363c', sec = (y, w, dd, z = -0.085) => { const r = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; r.push(V(Math.cos(a) * w, y, z + Math.sin(a) * dd)); } return r; };
    p.loft([sec(-0.21, 0.12, 0.065), sec(-0.185, 0.14, 0.082), sec(0.08, 0.14, 0.088), sec(0.19, 0.122, 0.078), sec(0.205, 0.116, 0.074)], { color: c, skin: 'x', capStart: true, vary: 0.06 });
    p.loft([sec(0.205, 0.116, 0.074), sec(0.215, 0.104, 0.064), sec(0.15, 0.1, 0.06)], { color: '#1b1c20', skin: 'x', vary: 0.03, ref: () => V(0, 0.25, -0.085) });
    p.loft([sec(-0.17, 0.105, 0.03, -0.165), sec(0.0, 0.105, 0.03, -0.165)], { color: d, skin: 'x', capStart: true, capEnd: true, vary: 0.05 });
    box(p, [0, 0.0, -0.198], [0.16, 0.008, 0.004], '#55565c');
    box(p, [0, 0.24, -0.02], [0.08, 0.012, 0.02], c);
    if (straps) for (const s of [1, -1]) {
      const x = s * 0.1, pts = [V(x, 0.16, -0.002), V(x * 1.05, 0.255, 0.02), V(x * 1.1, 0.29, 0.13), V(x * 1.15, 0.245, 0.31), V(x * 1.35, 0.1, 0.355), V(x * 1.5, -0.03, 0.335)];
      for (let i = 0; i < pts.length - 1; i++) {
        const w = V(0.022, 0, 0), o = { color: '#1f2024', skin: 'x', vary: 0.04 };
        p.quad(pts[i].clone().sub(w), pts[i].clone().add(w), pts[i + 1].clone().add(w), pts[i + 1].clone().sub(w), o, V(0, 0, 0.1));
      }
    }
  },
  chair(p) { // coque blanche, assise à 42 cm ; origine au sol, sous le centre de l'assise
    const w = '#f4f2ed', g = '#aeb0b3', o = { color: w, skin: 'x', vary: 0.04 }, ref = V(0, 0.2, 0.3);
    const pt = (u, v) => { // u : largeur, v : de l'avant de l'assise jusqu'en haut du dossier
      const x = u * (v > 0.5 ? 0.2 : 0.22) * (v > 0.9 ? 0.85 : 1);
      const y = v < 0.45 ? 0.415 - 0.02 * Math.abs(u) : 0.415 + (v - 0.45) * 0.86;
      const z = v < 0.45 ? 0.21 - v * 0.9 : -0.195 - (v - 0.45) * 0.1;
      return V(x, y + 0.012 * Math.abs(u) * (v > 0.45 ? 0 : 1), z);
    };
    const U = [-1, -0.45, 0.45, 1], Vs = [0, 0.2, 0.45, 0.6, 0.8, 1];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) p.quad(pt(U[i], Vs[j]), pt(U[i + 1], Vs[j]), pt(U[i + 1], Vs[j + 1]), pt(U[i], Vs[j + 1]), o, V(0, 0.9, 0.6));
    void ref;
    const leg = (x, z, tx, tz) => { const a = V(x, 0, z), b = V(tx, 0.41, tz), d = b.clone().sub(a), m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()), V(1, 1, 1)); box(p, [0, 0, 0], [0.018, d.length(), 0.018], g, { m }); };
    leg(-0.21, 0.2, -0.15, 0.12); leg(0.21, 0.2, 0.15, 0.12); leg(-0.2, -0.22, -0.14, -0.12); leg(0.2, -0.22, 0.14, -0.12);
  },
  stool(p) { // pouf de Nox, 7 cm
    yLoft(p, [[0.0, 0.075], [0.008, 0.088], [0.055, 0.09], [0.07, 0.072]], 10, '#3f9fd0');
  },
};

// Réglages par objet : position dans la main, posé au sol, usage
export const PROPS = {
  paper: { label: 'Papier', use: 'read', grip: { rot: [0, Math.PI / 2, 0] }, floor: { y: 0.008, rx: -Math.PI / 2 } },
  book: { label: 'Livre', use: 'read', grip: { rot: [0, Math.PI / 2, 0] }, floor: { y: 0.02, rx: -Math.PI / 2 } },
  bottle: { label: 'Gourde', use: 'drink', grip: { rot: [0, 0, 0] }, floor: { y: 0.1, rx: 0 } },
  mug: { label: 'Tasse', use: 'drink', grip: { rot: [0, 0, 0], y: 0.045 }, floor: { y: 0.045, rx: 0 } },
  phone: { label: 'Téléphone', use: 'phone', grip: { rot: [0, Math.PI / 2, 0] }, floor: { y: 0.006, rx: -Math.PI / 2 } },
  bag: { label: 'Sac', use: null },
};

export function createProp(name, opts = {}) {
  const p = new Part({});
  BUILD[name](p, opts);
  const m = mesh(p, name);
  const g = new THREE.Group(); g.name = `objet_${name}`; g.add(m);
  return g;
}
