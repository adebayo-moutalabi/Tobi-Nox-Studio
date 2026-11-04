// La chambre : maison de poupée sans plafond, murs visibles seulement de l'intérieur.
// Repère : fenêtre en -Z, lit à gauche (-X), bureau à droite (+X), entrée en +Z. Mètres.
import * as THREE from 'three';
import { V, Part, jit, hash, ring } from './lowpoly.js';
import { box as rawBox, mesh, yLoft, createProp } from './props.js';
import { createLaptop, createBoard } from './desk-screen.js';

export const C = {
  wall: '#f1e9dc', wallSoft: '#ebe2d4', red: '#b8222a', floor: '#b5aca2', rug: '#5a5b61', white: '#f1eee8',
  wood: '#d3a267', woodDark: '#c8975a', woodIn: '#b98a4d', sheet: '#f3f0ea', frame: '#f4f2ec', metal: '#a9a8a4', dark: '#2e2f33', door: '#d9cdbd',
};
const H = 2.5;
let WOOD = null; // tout le bois va dans une pièce à part, rendue avec un veinage procédural
const box = (p, c, s, color, o) => rawBox(color === C.woodDark || color === C.woodIn || color === C.wood ? WOOD : p, c, s, color, o);
const wood = (p, c, s, { cut = 'x', n = 4, color = C.wood } = {}) => { // panneau découpé en lames
  const i = { x: 0, y: 1, z: 2 }[cut], L = s[i];
  for (let k = 0; k < n; k++) {
    const cc = [...c], ss = [...s];
    ss[i] = L / n; cc[i] = c[i] - L / 2 + (k + 0.5) * (L / n);
    const col = new THREE.Color(color).multiplyScalar(0.94 + hash(c[0] * 7 + k, c[1] * 5, c[2] * 3) * 0.12);
    rawBox(WOOD, cc, ss, col, { vary: 0.012 });
  }
};
// Surfaces subdivisées : l'ombre douce des angles et la lumière de la fenêtre sont cuites dans les couleurs
const WIN = V(0, 1.4, -1.9);
function surface(sh, o, u, v, nu, nv, color, inward, edge = [1, 1, 1, 1]) {
  const base = new THREE.Color(color), lu = u.length(), lv = v.length(), cu = Math.max(1, Math.round(lu / 0.14)), cv = Math.max(1, Math.round(lv / 0.14));
  const shade = (a, b) => {
    const q = o.clone().addScaledVector(u, a).addScaledVector(v, b);
    const d = [a * lu, (1 - a) * lu, b * lv, (1 - b) * lv].map((x, k) => (edge[k] ? x : 9));
    let ao = 1;
    for (const x of d) ao *= 1 - 0.2 * Math.exp(-x / 0.3);
    const glow = Math.exp(-q.distanceTo(WIN) / 1.9);
    const c = base.clone().multiplyScalar(ao * (0.8 + 0.34 * glow));
    c.r *= 1 + 0.03 * glow; c.b *= 1 - 0.06 * glow;
    return [q, c];
  };
  const put = (t) => { for (const [q, c] of t) { sh.p.push(q.x, q.y, q.z); sh.c.push(c.r, c.g, c.b); } };
  const flip = u.clone().cross(v).dot(inward) < 0;
  for (let i = 0; i < cu; i++) for (let k = 0; k < cv; k++) {
    const a = shade(i / cu, k / cv), b = shade((i + 1) / cu, k / cv), c = shade((i + 1) / cu, (k + 1) / cv), d = shade(i / cu, (k + 1) / cv);
    put(flip ? [a, c, b, a, d, c] : [a, b, c, a, c, d]);
  }
}
function wall(p, a, b, y0, y1, color, inside, edge) {
  const o = V(a[0], y0, a[1]), u = V(b[0] - a[0], 0, b[1] - a[1]), v = V(0, y1 - y0, 0);
  const m = o.clone().addScaledVector(u, 0.5).addScaledVector(v, 0.5);
  surface(p, o, u, v, 0, 0, color, inside.clone().sub(m), edge);
}
const floorQ = (p, x0, x1, z0, z1, color, y = 0, down = false, edge) => surface(p, V(x0, y, z0), V(x1 - x0, 0, 0), V(0, 0, z1 - z0), 0, 0, color, V(0, down ? -1 : 1, 0), edge);

function buildShell(w) {
  const main = V(0, 1, 0), cor = V(0, 1, 2.3), col = C.wall;
  floorQ(w, -1.4, -0.6, -1.9, 0.95, C.floor); floorQ(w, -0.6, 1.4, -1.9, 1.6, C.floor, 0, false, [0, 1, 1, 0]); floorQ(w, -0.6, 0.5, 1.6, 3, C.floor, 0, false, [1, 1, 0, 1]);
  const ce = '#f3ecdf';
  floorQ(w, -1.4, -0.6, -1.9, 0.95, ce, H, true); floorQ(w, -0.6, 1.4, -1.9, 1.6, ce, H, true, [0, 1, 1, 0]); floorQ(w, -0.6, 0.5, 1.6, 3, ce, 2.12, true, [1, 1, 0, 1]);
  wall(w, [-1.4, -1.9], [-0.76, -1.9], 0, H, C.wallSoft, main, [1, 0, 1, 1]); wall(w, [0.76, -1.9], [1.4, -1.9], 0, H, C.wallSoft, main, [0, 1, 1, 1]);
  wall(w, [-0.76, -1.9], [0.76, -1.9], 0, 0.9, C.wallSoft, main, [0, 0, 1, 0]); wall(w, [-0.76, -1.9], [0.76, -1.9], 2.2, H, C.wallSoft, main, [0, 0, 0, 1]);
  wall(w, [-1.4, -1.9], [-1.4, 0.95], 0, H, col, main);
  wall(w, [-1.4, 0.95], [-0.6, 0.95], 0, H, C.red, main);
  wall(w, [-0.6, 0.95], [-0.6, 3], 0, H, col, cor);
  wall(w, [1.4, -1.9], [1.4, 1.6], 0, H, col, main);
  wall(w, [0.5, 1.6], [1.4, 1.6], 0, H, col, main);
  wall(w, [0.5, 1.6], [0.5, 3], 0, 2.12, col, cor);
  wall(w, [-0.6, 3], [0.5, 3], 0, 2.12, col, cor);
  wall(w, [-0.6, 1.6], [0.5, 1.6], 2.12, H, C.wallSoft, main);
  // Interrupteurs et prises, plaqués sur les murs
  for (const x of [-0.72, -0.85]) wall(w, [x - 0.04, 0.944], [x + 0.04, 0.944], 1.06, 1.14, C.white, main, [0, 0, 0, 0]);
  wall(w, [-1.394, 0.24], [-1.394, 0.36], 1.09, 1.17, C.white, main, [0, 0, 0, 0]);
  wall(w, [-0.594, 1.16], [-0.594, 1.24], 1.06, 1.14, C.white, cor, [0, 0, 0, 0]);
  // Embrasure de la fenêtre
  for (const [a, b] of [[[-0.76, -1.9], [-0.76, -2.05]], [[0.76, -2.05], [0.76, -1.9]]]) wall(w, a, b, 0.9, 2.2, '#f6f1e6', V(0, 1.5, -1.98), [0, 0, 0, 0]);
  surface(w, V(-0.76, 2.2, -2.05), V(1.52, 0, 0), V(0, 0, 0.15), 0, 0, '#f0eadd', V(0, -1, 0), [0, 0, 0, 0]);
}
function buildStatic(p) {
  // Plinthes
  for (const [c, s] of [[[-1.39, 0.04, -0.5], [0.02, 0.08, 2.8]], [[-0.59, 0.04, 2], [0.02, 0.08, 2]], [[0.49, 0.04, 2.3], [0.02, 0.08, 1.4]], [[0, 0.04, -1.89], [2.8, 0.08, 0.02]]]) box(p, c, s, C.white);

  // Tapis
  box(p, [0.12, 0.006, -0.3], [1.15, 0.012, 1.9], C.rug, { vary: 0.03 });

  // Fenêtre
  const fx = 0.73, y0 = 0.9, y1 = 2.2, fz = -2.02;
  box(p, [0, y0 - 0.02, -1.93], [1.72, 0.04, 0.32], C.frame);
  for (const [c, s] of [[[0, y1 - 0.03, fz], [1.52, 0.07, 0.06]], [[0, y0 + 0.03, fz], [1.52, 0.06, 0.06]], [[-fx, 1.55, fz], [0.07, 1.3, 0.06]], [[fx, 1.55, fz], [0.07, 1.3, 0.06]], [[0, 1.55, fz], [0.08, 1.3, 0.06]]]) box(p, c, s, C.frame);
  box(p, [0.03, 1.32, -1.98], [0.03, 0.13, 0.03], C.white);
  box(p, [0, 2.32, -1.885], [0.44, 0.02, 0.012], C.white); // aération
  // Radiateur sous la fenêtre
  box(p, [0, 0.46, -1.86], [1.25, 0.56, 0.05], C.white);
  for (let i = 0; i < 16; i++) box(p, [-0.58 + i * 0.077, 0.46, -1.825], [0.036, 0.52, 0.03], C.frame);
  box(p, [0.66, 0.68, -1.83], [0.05, 0.08, 0.07], C.frame);

  // Bureau (mur est)
  const dz0 = -1.88, dz1 = -0.12, dc = (dz0 + dz1) / 2, dl = dz1 - dz0, dx = 1.09;
  wood(p, [dx, 0.725, dc], [0.62, 0.04, dl], { cut: 'z', n: 6 });
  box(p, [0.8, 0.645, dc - 0.2], [0.02, 0.12, dl - 0.42], C.red, { vary: 0.01 });
  box(p, [dx, 0.65, dc - 0.2], [0.6, 0.015, dl - 0.42], C.woodDark);
  wood(p, [1.385, 0.98, dc], [0.03, 0.48, dl], { cut: 'z', n: 8 });
  box(p, [dx, 0.35, dz0 + 0.02], [0.6, 0.7, 0.03], C.woodDark);
  // Casier sous le plateau
  const sz = -0.32;
  wood(p, [dx, 0.35, dz1 - 0.02], [0.6, 0.7, 0.03], { cut: 'y', n: 4 });
  wood(p, [dx, 0.35, dz1 - 0.38], [0.6, 0.7, 0.03], { cut: 'y', n: 4 });
  box(p, [dx, 0.04, sz], [0.6, 0.03, 0.36], C.woodDark); box(p, [dx, 0.35, sz], [0.6, 0.025, 0.36], C.woodDark);
  box(p, [1.38, 0.35, sz], [0.02, 0.7, 0.36], C.woodIn);

  // Armoire deux portes
  const az = 0.39;
  wood(p, [1.09, 1.03, az - 0.5], [0.62, 2.0, 0.03], { cut: 'y', n: 6 });
  wood(p, [1.09, 1.03, az + 0.5], [0.62, 2.0, 0.03], { cut: 'y', n: 6 });
  box(p, [1.09, 2.04, az], [0.62, 0.03, 1.03], C.woodDark); box(p, [1.09, 0.05, az], [0.62, 0.1, 1.03], C.woodDark);
  for (const s of [-1, 1]) {
    wood(p, [0.78, 1.07, az + s * 0.245], [0.02, 1.92, 0.48], { cut: 'z', n: 5 });
    box(p, [0.76, 1.08, az + s * 0.04], [0.014, 0.22, 0.016], C.metal);
  }
  // Valise
  box(p, [1.05, 2.2, az], [0.3, 0.28, 0.7], '#3a3b3f', { vary: 0.06 });
  box(p, [0.895, 2.2, az], [0.012, 0.04, 0.2], '#26272a');

  // Placard mural au-dessus du bureau
  const cz0 = -1.08, cz1 = -0.13, cc = (cz0 + cz1) / 2, cl = cz1 - cz0, cx = 1.215, cd = 0.35;
  for (const z of [cz0, cc, cz1]) wood(p, [cx, 1.82, z], [cd, 0.8, 0.022], { cut: 'y', n: 3 });
  for (const y of [1.42, 1.82, 2.22]) box(p, [cx, y, cc], [cd, 0.022, cl], C.woodDark);
  box(p, [1.38, 1.62, cc], [0.015, 0.4, cl], C.woodIn);
  for (const s of [-1, 1]) {
    wood(p, [1.04, 2.02, cc + s * cl / 4], [0.016, 0.38, cl / 2 - 0.02], { cut: 'z', n: 4 });
    box(p, [1.025, 1.88, cc + s * 0.045], [0.02, 0.022, 0.022], C.metal);
  }
  shelfBooks(p, 1.2, 1.432, cz0 + 0.03, 'z', 0.4, 2);
  shelfBooks(p, 1.2, 1.432, cc + 0.03, 'z', 0.34, 5);

  // Niche kitchenette
  const kz = 1.24;
  wood(p, [1.09, 1.03, 0.93], [0.62, 2.06, 0.03], { cut: 'y', n: 6 }); wood(p, [1.09, 1.03, 1.58], [0.62, 2.06, 0.03], { cut: 'y', n: 6 });
  box(p, [1.09, 2.07, kz], [0.62, 0.03, 0.68], C.woodDark);
  wood(p, [1.385, 1.5, kz], [0.02, 1.1, 0.64], { cut: 'z', n: 4, color: C.woodIn });
  wood(p, [1.09, 0.885, kz], [0.62, 0.035, 0.64], { cut: 'z', n: 3 });
  box(p, [1.14, 0.908, kz], [0.4, 0.008, 0.52], '#27282b');
  wood(p, [1.17, 1.72, kz], [0.36, 0.66, 0.62], { cut: 'z', n: 3 });
  box(p, [0.98, 1.5, kz + 0.2], [0.014, 0.18, 0.016], C.metal);
  for (const [z, r, h] of [[1.08, 0.095, 0.1], [1.4, 0.07, 0.085]]) {
    const q = new Part({});
    q.loft([ring(V(1.14, 0.915, z), r * 0.95, r * 0.95, 10), ring(V(1.14, 0.915 + h, z), r, r, 10), ring(V(1.14, 0.925 + h, z), r * 0.5, r * 0.5, 10)], { color: '#303136', skin: 'x', capEnd: true, vary: 0.04 });
    p.p.push(...q.p); p.c.push(...q.c);
    box(p, [1.14, 0.935 + h, z], [0.03, 0.02, 0.03], '#111');
    box(p, [1.14 - r - 0.07, 0.915 + h * 0.8, z], [0.14, 0.012, 0.024], '#1e1f22');
  }
  box(p, [1.38, 1.0, 1.24], [0.01, 0.075, 0.075], C.white);

  // Armoire miroir (près de la fenêtre, côté lit)
  const mz = -1.5;
  wood(p, [-1.1, 1.1, -1.875], [0.6, 2.2, 0.03], { cut: 'y', n: 6 }); wood(p, [-1.1, 1.1, -1.13], [0.6, 2.2, 0.03], { cut: 'y', n: 6 });
  box(p, [-1.1, 2.2, mz], [0.6, 0.03, 0.75], C.woodDark);
  wood(p, [-0.805, 1.1, mz], [0.02, 2.14, 0.72], { cut: 'z', n: 6 });
  box(p, [-0.79, 1.02, -1.2], [0.022, 0.022, 0.022], C.metal);

  // Lit
  const bx = -0.95, bz = -0.075, bl = 2.05;
  for (const s of [-1, 1]) {
    wood(p, [-0.51, 0.19, bz + s * 0.505], [0.02, 0.27, 0.98], { cut: 'z', n: 5 });
    box(p, [-0.5, 0.29, bz + s * 0.505], [0.01, 0.035, 0.2], '#3c2b1c');
  }
  box(p, [bx, 0.34, bz], [0.9, 0.03, bl], C.woodDark);
  box(p, [bx, 0.04, bz], [0.86, 0.08, bl - 0.04], C.woodDark);
  box(p, [bx, 0.19, bz - bl / 2 + 0.012], [0.9, 0.3, 0.024], C.woodDark);
  // Tête de lit arrondie, le long du mur (profil continu)
  const hb = (t) => 0.3 + 0.62 + 0.3 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.72);
  for (let i = 0; i < 16; i++) {
    const t0 = i / 16, t1 = (i + 1) / 16, z0 = bz - 0.98 + t0 * 1.96, z1 = bz - 0.98 + t1 * 1.96, x = -1.372;
    const o = { color: C.wood, skin: 'x', vary: 0.01 };
    WOOD.quad(V(x, 0.3, z0), V(x, 0.3, z1), V(x, hb(t1), z1), V(x, hb(t0), z0), o, V(-2, 0.6, z0));
    WOOD.quad(V(x, hb(t0), z0), V(x, hb(t1), z1), V(x - 0.02, hb(t1), z1), V(x - 0.02, hb(t0), z0), o, V(-1.38, 0, z0));
  }
  wood(p, [-1.2, 1.0, 0.72], [0.34, 0.025, 0.42], { cut: 'z', n: 3 });
  buildBedding(p, bx, bz, bl);

  // Placard mural au-dessus du lit
  const uz0 = -1.1, uz1 = 0.2, uc = (uz0 + uz1) / 2, ul = uz1 - uz0, ux = -1.22, ud = 0.34;
  for (const z of [uz0, uc, uz1]) wood(p, [ux, 1.72, z], [ud, 0.84, 0.022], { cut: 'y', n: 3 });
  for (const y of [1.3, 1.68, 2.14]) box(p, [ux, y, uc], [ud, 0.022, ul], C.woodDark);
  box(p, [-1.385, 1.49, uc], [0.015, 0.38, ul], C.woodIn);
  for (const s of [-1, 1]) {
    wood(p, [-1.05, 1.91, uc + s * ul / 4], [0.016, 0.44, ul / 2 - 0.02], { cut: 'z', n: 4 });
    box(p, [-1.035, 1.75, uc + s * 0.05], [0.02, 0.022, 0.022], C.metal);
  }
  box(p, [-1.22, 1.35, -0.8], [0.24, 0.08, 0.34], '#2b3657', { vary: 0.08 }); box(p, [-1.22, 1.42, -0.78], [0.2, 0.06, 0.26], '#e8e4dc', { vary: 0.08 });
  box(p, [-1.22, 1.34, -0.15], [0.25, 0.06, 0.36], '#7d2230', { vary: 0.08 }); box(p, [-1.22, 1.39, -0.15], [0.22, 0.04, 0.3], '#3b3d41', { vary: 0.08 });

  // Applique sur le mur rouge
  box(p, [-0.95, 1.5, 0.94], [0.06, 0.1, 0.02], C.metal);
  box(p, [-0.95, 1.5, 0.87], [0.012, 0.012, 0.14], C.metal);
  const lamp = new Part({});
  lamp.loft([ring(V(-0.95, 1.46, 0.8), 0.06, 0.06, 10), ring(V(-0.95, 1.55, 0.8), 0.028, 0.028, 10)], { color: '#d8d6d0', skin: 'x', capEnd: true, vary: 0.03 });
  p.p.push(...lamp.p); p.c.push(...lamp.c);
  // Interrupteurs, prises

  // Portes et couloir
  const door = (x, z, axis, w, color) => {
    const hz = axis === 'z';
    box(p, [x, 1.02, z], hz ? [0.03, 2.04, w] : [w, 2.04, 0.03], color, { vary: 0.01 });
    for (const [o, l] of [[-w / 2 - 0.03, 2.1], [w / 2 + 0.03, 2.1]]) box(p, hz ? [x, l / 2, z + o] : [x + o, l / 2, z], hz ? [0.05, l, 0.06] : [0.06, l, 0.05], C.white);
    box(p, hz ? [x, 2.08, z] : [x, 2.08, z], hz ? [0.05, 0.06, w + 0.1] : [w + 0.1, 0.06, 0.05], C.white);
  };
  door(-0.585, 2.05, 'z', 0.8, C.door);
  box(p, [-0.555, 1.02, 1.74], [0.03, 0.02, 0.13], C.metal);
  for (const x of [-0.53, 0.43]) box(p, [x, 1.05, 2.985], [0.06, 2.1, 0.05], C.white);
  box(p, [-0.05, 2.08, 2.985], [1.0, 0.06, 0.05], C.white);

  // Objets du bureau et de la chambre
  buildDeskItems(p);
}
function shelfBooks(p, x, y, z, axis, len, seed) {
  const cols = ['#2f8f9d', '#d6702a', '#6a8f3c', '#3b4fa0', '#e0c14f', '#b5232b', '#7a5aa8'];
  let o = 0, i = seed;
  while (o < len) {
    const w = 0.02 + hash(i, 1, 2) * 0.022, h = 0.17 + hash(i, 3, 4) * 0.1;
    box(p, [x, y + h / 2, z + o + w / 2], [0.2, h, w], cols[i % cols.length], { vary: 0.05 });
    o += w + 0.002; i += 1;
    if (hash(i, 5, 6) > 0.8) o += 0.05;
  }
}
function buildBedding(p, bx, bz, bl) {
  // Drap facetté : grille déformée qui retombe à droite et au pied
  const nx = 7, nz = 12, top = 0.52, pts = [];
  for (let i = 0; i <= nx; i++) {
    pts[i] = [];
    for (let j = 0; j <= nz; j++) {
      const u = i / nx, v = j / nz;
      let x = bx - 0.45 + u * 1.0, z = bz - bl / 2 - 0.04 + v * (bl - 0.45), y = top;
      if (u > 0.9) { y = top - (u - 0.9) * 2.6; x = bx + 0.47; }
      if (v < 0.08) { y -= (0.08 - v) * 3.2; z = bz - bl / 2 - 0.035; }
      y = Math.max(y, 0.3);
      const q = jit(V(x, y + (u > 0.88 || v < 0.1 ? 0 : (hash(i, j, 1) - 0.5) * 0.024 + 0.012), z), u > 0.88 || v < 0.1 ? 0.006 : 0.016);
      pts[i][j] = q;
    }
  }
  const o = { color: C.sheet, skin: 'x', vary: 0.035 };
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) p.quad(pts[i][j], pts[i + 1][j], pts[i + 1][j + 1], pts[i][j + 1], o, V(bx, 0, bz));
  box(p, [bx, 0.425, bz], [0.88, 0.16, bl - 0.04], '#e6e3dc'); // matelas
  box(p, [bx + 0.0, 0.535, bz + bl / 2 - 0.5], [0.9, 0.03, 0.26], '#faf8f3', { vary: 0.03 }); // drap replié
  const pil = new THREE.IcosahedronGeometry(1, 1); pil.scale(0.3, 0.075, 0.2); pil.translate(bx, 0.6, bz + bl / 2 - 0.23);
  p.geo(pil, { color: '#faf8f3', skin: 'x', vary: 0.04 });
}
function buildDeskItems(p) {
  const y = 0.745, x = 1.1;
  // Imprimante sans marque
  box(p, [x, y + 0.085, -1.58], [0.34, 0.17, 0.42], '#e9e7e2'); box(p, [x, y + 0.178, -1.6], [0.3, 0.02, 0.38], '#dcdad5');
  box(p, [x - 0.2, y + 0.03, -1.58], [0.14, 0.012, 0.26], '#d4d2cc');
  // Ordinateurs : l'un sur l'imprimante, l'autre devant la chaise
  const laptop = (cx, cy, cz, yaw) => {
    const m = new THREE.Matrix4().makeRotationY(yaw), t = new THREE.Matrix4().makeTranslation(cx, cy, cz);
    box(p, [0, 0.008, 0], [0.34, 0.016, 0.24], '#bdbcb9', { m: t.clone().multiply(m) });
    box(p, [0, 0.018, 0.02], [0.3, 0.003, 0.12], '#3a3b3e', { m: t.clone().multiply(m) });
    const h = t.clone().multiply(m).multiply(new THREE.Matrix4().makeTranslation(0, 0.012, -0.115)).multiply(new THREE.Matrix4().makeRotationX(-0.28));
    box(p, [0, 0.115, 0], [0.34, 0.23, 0.01], '#bdbcb9', { m: h });
    box(p, [0, 0.115, 0.0055], [0.31, 0.2, 0.002], '#2a2c30', { m: h, vary: 0 });
  };
  laptop(x + 0.02, y + 0.19, -1.6, -Math.PI / 2);
  // Gourde, bouteille, mouchoirs, biscuits
  const small = new Part({});
  yLoft(small, [[0, 0.033], [0.17, 0.033], [0.2, 0.024], [0.235, 0.024]], 10, '#efece6');
  const m = new THREE.Matrix4().makeTranslation(1.26, y, -0.72);
  for (let i = 0; i < small.p.length; i += 3) { const v = V(small.p[i], small.p[i + 1], small.p[i + 2]).applyMatrix4(m); p.p.push(v.x, v.y, v.z); }
  p.c.push(...small.c);
  const b2 = new Part({});
  yLoft(b2, [[0, 0.033], [0.16, 0.033], [0.22, 0.016], [0.255, 0.016]], 8, '#a9cfdb');
  const m2 = new THREE.Matrix4().makeTranslation(1.28, y, -1.27);
  for (let i = 0; i < b2.p.length; i += 3) { const v = V(b2.p[i], b2.p[i + 1], b2.p[i + 2]).applyMatrix4(m2); p.p.push(v.x, v.y, v.z); }
  p.c.push(...b2.c);
  box(p, [1.2, y + 0.045, -0.45], [0.13, 0.09, 0.24], '#c9dfe0'); box(p, [1.2, y + 0.11, -0.45], [0.05, 0.05, 0.09], '#faf8f3');
  box(p, [0.95, y + 0.012, -0.5], [0.08, 0.024, 0.17], '#3f4fa8'); box(p, [0.93, y + 0.03, -0.6], [0.06, 0.012, 0.06], '#d09a4e');
  // Post-it
  for (const [z, yy] of [[-1.2, 1.1], [-1.1, 1.1], [-0.88, 1.11], [-0.78, 1.11], [-0.8, 0.99]]) box(p, [1.367, yy, z], [0.004, 0.075, 0.075], '#f0d84c', { vary: 0.05 });
  // Détecteur de fumée
  const d = new THREE.CylinderGeometry(0.07, 0.075, 0.035, 10); d.translate(0.96, y + 0.018, -1.82); p.geo(d, { color: '#e9e7e2', skin: 'x', vary: 0.02 });
  // Corbeille
  const c = new Part({});
  c.loft([ring(V(1.15, 0, -1.25), 0.1, 0.1, 10), ring(V(1.15, 0.3, -1.25), 0.135, 0.135, 10)], { color: '#2d2e31', skin: 'x', capStart: true, vary: 0.05 });
  p.p.push(...c.p); p.c.push(...c.c);
  // Claquettes devant la kitchenette
  for (const s of [-1, 1]) { box(p, [0.66, 0.012, 0.86 + s * 0.06], [0.24, 0.024, 0.09], '#4b4e6a'); box(p, [0.62, 0.05, 0.86 + s * 0.06], [0.09, 0.05, 0.09], '#3a3d55'); }
}

function woodMaterial() { // veinage calculé dans le shader : aucune texture à charger
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide, name: 'bois' });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = position; vWN = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; varying vec3 vWN;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
        return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
      float fb(vec2 p){ return .5*vn(p) + .3*vn(p*2.1) + .2*vn(p*4.3); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec3 an = abs(vWN);
      vec2 g = an.y > .5 ? vec2(vWP.x, vWP.z) : (an.x > an.z ? vec2(vWP.z, vWP.y) : vec2(vWP.x, vWP.y));
      float wob = fb(vec2(g.x*3.5, g.y*.9)) * 1.4;
      float ring = sin((g.x*22. + wob*7.) * 3.1415);
      float fine = fb(vec2(g.x*170., g.y*5.));
      diffuseColor.rgb *= .94 + .05*ring + .1*(fine-.5);`);
  };
  return m;
}

export function createRoom({ Reflector } = {}) {
  const group = new THREE.Group(); group.name = 'chambre';
  const shell = new Part(C), p = new Part(C);
  WOOD = new Part(C);
  buildShell(shell);
  buildStatic(p);
  const wm = mesh(shell, 'murs');
  wm.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, side: THREE.FrontSide, shadowSide: THREE.DoubleSide, name: 'murs' });
  wm.castShadow = true;
  const fm = mesh(p, 'mobilier');
  group.userData.solid = [];
  const wd = mesh(WOOD, 'bois');
  wd.material = woodMaterial();
  group.add(wm, fm, wd);
  group.userData.solid.push(fm, wd, wm);

  // Vue extérieure et volet roulant
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.3), new THREE.MeshBasicMaterial({ color: '#fffdf4', toneMapped: false }));
  sky.name = 'dehors'; sky.position.set(0, 1.55, -2.05); group.add(sky);
  const sp = new Part(C);
  for (let i = 0; i < 16; i++) box(sp, [0, -0.02 - i * 0.04, 0], [1.42, 0.034, 0.012], '#e0ddd5', { vary: 0.02 });
  const shutter = mesh(sp, 'volet'); shutter.position.set(0, 2.17, -2.0); group.add(shutter);

  // Porte du frigo, articulée côté mur
  const fr = new Part(C);
  for (const [c, z] of [[[1.1, 0.02, 1.24], [0.5, 0.04, 0.54]], [[1.1, 0.82, 1.24], [0.5, 0.04, 0.54]], [[1.1, 0.42, 0.98], [0.5, 0.8, 0.03]], [[1.1, 0.42, 1.5], [0.5, 0.8, 0.03]], [[1.34, 0.42, 1.24], [0.03, 0.8, 0.54]]]) box(fr, c, z, '#f0efeb');
  box(fr, [1.1, 0.4, 1.24], [0.46, 0.012, 0.5], '#cfdadf', { vary: 0 });
  box(fr, [1.14, 0.47, 1.1], [0.14, 0.13, 0.12], '#d9703a'); box(fr, [1.16, 0.08, 1.3], [0.2, 0.09, 0.2], '#8fb06a');
  const fridge = mesh(fr, 'frigo'); group.add(fridge);
  const dp = new Part(C);
  box(dp, [0, 0.42, 0.26], [0.04, 0.8, 0.52], '#f6f5f1');
  box(dp, [-0.024, 0.7, 0.44], [0.01, 0.03, 0.12], '#b9b8b3');
  const fridgeDoor = new THREE.Group(); fridgeDoor.name = 'porte_frigo'; fridgeDoor.position.set(0.83, 0, 0.98);
  fridgeDoor.add(mesh(dp, 'porte')); group.add(fridgeDoor);

  // Miroir
  let mirror;
  if (Reflector) {
    mirror = new Reflector(new THREE.PlaneGeometry(0.46, 1.6), { textureWidth: 384, textureHeight: 1024, color: 0xc4ccd0, clipBias: 0.002 });
  } else mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 1.6), new THREE.MeshStandardMaterial({ color: '#c8d4da', roughness: 0.08, metalness: 0.8 }));
  mirror.name = 'miroir'; mirror.rotation.y = Math.PI / 2; mirror.position.set(-0.792, 1.15, -1.5); group.add(mirror);
  // Le reflet coûte un second rendu : il n'est calculé que quand quelqu'un est devant le miroir
  const plainMirror = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 1.6), new THREE.MeshStandardMaterial({ color: '#cdd8dc', roughness: 0.12, metalness: 0.55 }));
  plainMirror.name = 'miroir_repos'; plainMirror.rotation.y = Math.PI / 2; plainMirror.position.copy(mirror.position); group.add(plainMirror);
  mirror.visible = !Reflector; plainMirror.visible = !!Reflector;

  // Chaise de bureau et sac sur le rebord
  const chair = createProp('chair'); chair.position.set(0.42, 0, -1.05); chair.rotation.y = Math.PI / 2; group.add(chair);
  const sillBag = createProp('bag', { straps: false }); sillBag.position.set(-0.42, 1.1, -1.76); group.add(sillBag);

  // Ordinateur et tableau, vivants
  const laptop = createLaptop(); laptop.group.position.set(0.98, 0.745, -1.05); laptop.group.rotation.y = -Math.PI / 2; group.add(laptop.group);
  const board = createBoard(); board.group.position.set(0.42, 1.08, -1.84); board.group.rotation.x = -0.08; group.add(board.group);

  // Porte d'entrée, articulée, avec ses affiches (contenu neutre)
  const ed = new Part(C);
  box(ed, [0.46, 1.02, 0], [0.9, 2.04, 0.03], C.white, { vary: 0.008 });
  box(ed, [0.82, 1.02, -0.04], [0.13, 0.02, 0.03], C.metal); box(ed, [0.86, 1.0, -0.018], [0.035, 0.16, 0.01], C.metal);
  box(ed, [0.46, 2.0, -0.03], [0.3, 0.05, 0.03], C.metal);
  const poster = (x, y, w, h, colr) => {
    box(ed, [x, y, -0.019], [w, h, 0.004], '#f6f3ea', { vary: 0 });
    box(ed, [x, y + h / 2 - 0.03, -0.022], [w * 0.9, 0.035, 0.004], colr, { vary: 0 });
    for (let i = 0; i < 4; i++) box(ed, [x, y + h / 2 - 0.08 - i * 0.035, -0.022], [w * 0.8, 0.012, 0.004], '#8c8c86', { vary: 0 });
  };
  poster(0.28, 1.45, 0.2, 0.27, '#c7372f'); poster(0.6, 1.5, 0.21, 0.16, '#2f8f9d'); poster(0.6, 1.22, 0.17, 0.22, '#d9d6cc');
  const entryDoor = new THREE.Group(); entryDoor.name = 'porte_entree'; entryDoor.position.set(-0.5, 0, 2.985);
  entryDoor.add(mesh(ed, 'porte')); group.add(entryDoor);

  // Applique
  const lamp = new THREE.PointLight('#ffb070', 0, 3, 1.6); lamp.position.set(-0.95, 1.4, 0.75); group.add(lamp);

  const rect = [[-0.42, 0.72, -1.6, 1.58], [-0.42, 0.42, 1.58, 2.8]];
  const room = {
    group, lamp, fridgeDoor, entryDoor, shutter, chair, sillBag, laptop, board, walls: wm, solid: group.userData.solid,
    update(dt) { laptop.update(dt); },
    surfaceNear(q, from) { return from.x > 0.2 && from.z < 0 ? { x: 0.92, y: 0.745, z: Math.min(-0.3, Math.max(-0.7, q.z)) } : null; },
    center: V(0, 0.7, 0.3),
    clamp(q) { // ramène un point dans la zone où l'on peut marcher
      let best = null, bd = Infinity;
      for (const [x0, x1, z0, z1] of rect) {
        const x = Math.min(x1, Math.max(x0, q.x)), z = Math.min(z1, Math.max(z0, q.z)), d = (x - q.x) ** 2 + (z - q.z) ** 2;
        if (d < bd) { bd = d; best = [x, z]; }
      }
      q.x = best[0]; q.z = best[1]; return q;
    },
    mirrorLive(on) { if (Reflector) { mirror.visible = on; plainMirror.visible = !on; } },
    setShutter(open) { shutter.userData.open = open; shutter.scale.y = open ? 0.12 : 1; },
  };
  room.setShutter(false);
  return room;
}
