// Autres lieux : la laverie, le kebab et la bibliothèque universitaire (BU).
// Chaque lieu « rhabille » la chambre : mêmes murs, et des meubles posés là où étaient le bureau, l'armoire,
// la kitchenette et le lit. La caméra, les places (gauche, milieu, droite, tapis) et « NOX assis » marchent donc sans rien changer.
// Dans un script : DECOR laverie | kebab | bu | chambre.
import * as THREE from 'three';

const unit = new THREE.BoxGeometry(1, 1, 1), tube = new THREE.CylinderGeometry(1, 1, 1, 28), cache = new Map();
const mat = (color, o = {}) => { // une seule matière par couleur et par réglage
  const k = color + JSON.stringify(o);
  if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.7, metalness: o.m ?? 0, emissive: o.e || '#000000', emissiveIntensity: o.ei ?? 1 }));
  return cache.get(k);
};
const box = (g, c, s, color, o) => { const m = new THREE.Mesh(unit, mat(color, o)); m.position.set(...c); m.scale.set(...s); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
const cyl = (g, c, r, h, color, o = {}) => { const m = new THREE.Mesh(tube, mat(color, o)); m.position.set(...c); m.scale.set(r, h, r); if (o.axis === 'x') m.rotation.z = Math.PI / 2; m.castShadow = m.receiveShadow = true; g.add(m); return m; };
function sign(lines, { w = 512, h = 256, bg = '#141018', colors = ['#ffb347'], font = 900, size = 84 } = {}) { // enseigne ou affiche dessinée, lisible de loin
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((t, i) => { g.font = `${font} ${Array.isArray(size) ? size[i] : size}px "Inter", "Segoe UI", sans-serif`; g.fillStyle = colors[i % colors.length]; g.shadowColor = colors[i % colors.length]; g.shadowBlur = 18; g.fillText(t, w / 2, (h * (i + 0.5)) / lines.length + 4, w - 30); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const panel = (g, tex, c, s, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s[0], s[1]), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); m.position.set(...c); m.rotation.y = ry; g.add(m); return m; };
function tiles(a, b, n = 8) { // carrelage en damier
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), s = 256 / n;
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) { g.fillStyle = (i + k) % 2 ? a : b; g.fillRect(i * s, k * s, s, s); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); return t;
}
function floor(g, map, color = '#ffffff', r = 0.6) {
  const m = new THREE.MeshStandardMaterial({ map, color, roughness: r });
  for (const [x, z, w, d] of [[0, -0.15, 2.8, 3.5], [-0.05, 2.3, 1.1, 1.4]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.004, z); p.receiveShadow = true; g.add(p); }
}
// Le fond de la fenêtre (ouverture de 1,52 m sur 1,30 m, au fond de la pièce)
const WIN = [0, 1.55, -1.93];
const RX = 1.09, RD = 0.62; // mur de droite : centre et profondeur des meubles
const BENCH = { x: -0.95, w: 0.9, z: -0.075, l: 2.05, top: 0.55 }; // à la place du lit : c'est là que Nox s'assoit

function laverie(g) {
  floor(g, tiles('#dfe9ee', '#b9cbd6'));
  panel(g, sign(['☁'], { bg: '#bfe3ff', colors: ['#ffffff'], size: 150 }), WIN, [1.52, 1.3]);
  // Table de pliage, à la place du bureau
  box(g, [RX, 0.725, -1.0], [RD, 0.04, 1.76], '#e9edf0', { r: 0.4 }); for (const z of [-1.8, -0.2]) box(g, [RX, 0.35, z], [RD - 0.06, 0.7, 0.04], '#9aa6b0', { m: 0.6, r: 0.4 });
  box(g, [1.15, 0.8, -1.5], [0.34, 0.11, 0.26], '#5b8def'); box(g, [1.15, 0.9, -1.5], [0.3, 0.08, 0.24], '#f2b92e'); box(g, [1.2, 0.78, -1.1], [0.22, 0.07, 0.3], '#ff8fab'); // linge plié
  // Lessives sur l'étagère
  box(g, [1.22, 1.42, -0.6], [0.34, 0.03, 0.95], '#c9d3da');
  ['#ff5f57', '#5ccb74', '#5b8def', '#f2b92e', '#b98cff'].forEach((c, i) => box(g, [1.22, 1.56, -1.0 + i * 0.2], [0.2, 0.25, 0.13], c, { r: 0.5 }));
  // Machines : lave-linge en bas, sèche-linge au-dessus, à la place de l'armoire et de la kitchenette
  const drums = [];
  for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) {
    const z = 0.2 + i * 0.86, y = 0.5 + k * 1.0;
    box(g, [RX, y, z], [RD, 0.98, 0.82], k ? '#dfe4e8' : '#f3f5f7', { r: 0.35 });
    cyl(g, [0.775, y - 0.04, z], 0.27, 0.03, '#b7c0c8', { axis: 'x', m: 0.8, r: 0.3 });
    cyl(g, [0.765, y - 0.04, z], 0.215, 0.03, '#16222e', { axis: 'x', r: 0.15, m: 0.3 });
    const d = new THREE.Group(); d.position.set(0.752, y - 0.04, z); g.add(d); // le linge qui tourne derrière le hublot
    [['#ff8fab', 0.09, 0.05], ['#5b8def', -0.08, 0.06], ['#f2b92e', 0.02, -0.1]].forEach(([c, a, b]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), mat(c)); s.position.set(0, a, b); s.scale.x = 0.2; d.add(s); });
    drums.push([d, (i + k) % 2 ? 0 : 5 + i]);
    box(g, [0.776, y + 0.4, z], [0.012, 0.1, 0.7], '#2b3540'); box(g, [0.77, y + 0.4, z + 0.25], [0.012, 0.03, 0.05], k ? '#ff5f57' : '#5ccb74', { e: k ? '#ff5f57' : '#5ccb74', ei: 2 });
  }
  // Banc et paniers, à la place du lit
  box(g, [BENCH.x, BENCH.top - 0.03, BENCH.z], [BENCH.w, 0.06, BENCH.l], '#d7a56a', { r: 0.6 });
  for (const z of [-1.0, -0.05, 0.85]) box(g, [BENCH.x, 0.26, z], [BENCH.w - 0.1, 0.5, 0.05], '#7c8791', { m: 0.6, r: 0.4 });
  cyl(g, [-1.05, BENCH.top + 0.17, -0.8], 0.2, 0.32, '#5b8def', { r: 0.8 }); cyl(g, [-1.05, BENCH.top + 0.35, -0.8], 0.18, 0.06, '#f4f1ec');
  panel(g, sign(['LAVERIE', 'Lavage 4 € · Séchage 1 €'], { bg: '#103a5c', colors: ['#ffffff', '#8feaff'], size: [96, 40] }), [-1.385, 1.6, -0.3], [1.1, 0.55], Math.PI / 2);
  for (const z of [-0.9, 0.6]) box(g, [0, 2.46, z], [1.4, 0.03, 0.09], '#ffffff', { e: '#dff1ff', ei: 2.2 }); // néons
  const l = new THREE.PointLight('#dff1ff', 2.2, 6, 1.6); l.position.set(0, 2.2, -0.2); g.add(l);
  return (dt) => { for (const [d, v] of drums) d.rotation.x += v * dt; };
}

function kebab(g) {
  floor(g, tiles('#f4e9d8', '#c9412f'));
  panel(g, sign(['KEBAB', 'DU CAMPUS'], { bg: '#1a0f14', colors: ['#ff9a3c', '#ff5fa2'], size: [120, 58] }), WIN, [1.52, 1.3]);
  // Comptoir, à la place du bureau : carrelage rouge devant, inox dessus
  box(g, [RX, 0.36, -1.0], [RD, 0.72, 1.76], '#c9412f', { r: 0.35 }); box(g, [RX, 0.735, -1.0], [RD + 0.04, 0.03, 1.8], '#cfd5da', { m: 0.9, r: 0.25 });
  box(g, [0.785, 0.5, -1.0], [0.012, 0.06, 1.7], '#f4e9d8');
  // La broche qui tourne, devant sa résistance rouge
  const spit = new THREE.Group(); spit.position.set(1.2, 0.76, -1.45); g.add(spit);
  cyl(spit, [0, 0.36, 0], 0.012, 0.76, '#b7c0c8', { m: 0.9, r: 0.3 });
  [[0.16, 0.12, '#8a4b2a'], [0.3, 0.14, '#9c5a33'], [0.44, 0.13, '#8a4b2a'], [0.56, 0.1, '#7a4024']].forEach(([y, r, c]) => { const m = cyl(spit, [0, y, 0], r, 0.15, c, { r: 0.9 }); m.scale.x = r * 1.08; });
  box(g, [1.36, 1.1, -1.45], [0.03, 0.7, 0.34], '#ff5a1f', { e: '#ff4a10', ei: 2.6 }); cyl(g, [1.2, 0.765, -1.45], 0.17, 0.02, '#cfd5da', { m: 0.9, r: 0.3 });
  ['#d92f2f', '#f4f1ec', '#5ccb74'].forEach((c, i) => { cyl(g, [0.95, 0.83, -0.95 + i * 0.12], 0.032, 0.16, c, { r: 0.4 }); cyl(g, [0.95, 0.93, -0.95 + i * 0.12], 0.012, 0.05, c); }); // sauces
  box(g, [1.05, 0.83, -0.4], [0.26, 0.16, 0.22], '#2b2f36'); box(g, [0.93, 0.87, -0.4], [0.02, 0.1, 0.16], '#8feaff', { e: '#8feaff', ei: 1.2 }); // caisse
  panel(g, sign(['KEBAB 6 €', 'FRITES 2 €', 'SAUCE : OUI'], { bg: '#20141a', colors: ['#ffd23f', '#ffffff', '#ff9a3c'], size: 60, h: 320 }), [1.03, 1.85, -0.6], [0.9, 0.62], -Math.PI / 2);
  box(g, [1.2, 1.85, -0.6], [0.34, 0.7, 0.98], '#20141a');
  // Frigo à boissons, à la place de l'armoire et de la kitchenette
  box(g, [RX, 1.02, 0.39], [RD, 2.04, 1.0], '#2b2f36', { r: 0.4 }); box(g, [0.775, 1.05, 0.39], [0.012, 1.7, 0.84], '#eaf6ff', { e: '#cfe9ff', ei: 1.5 });
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) cyl(g, [0.765, 0.42 + r * 0.42, 0.04 + k * 0.14], 0.045, 0.14, ['#d92f2f', '#f2b92e', '#5ccb74', '#5b8def'][(r + k) % 4], { r: 0.3, m: 0.4 });
  box(g, [RX, 1.02, 1.25], [RD, 2.04, 0.66], '#c9412f', { r: 0.4 });
  // Banquette rouge, à la place du lit
  box(g, [BENCH.x, BENCH.top - 0.14, BENCH.z], [BENCH.w, 0.28, BENCH.l], '#b3261e', { r: 0.5 }); box(g, [BENCH.x, 0.2, BENCH.z], [BENCH.w - 0.04, 0.4, BENCH.l - 0.04], '#3a2a22');
  box(g, [-1.385, 0.95, BENCH.z], [0.03, 0.7, BENCH.l], '#b3261e', { r: 0.5 }); // dossier plaqué au mur : la caméra ne doit jamais se retrouver dedans
  const l = new THREE.PointLight('#ffb070', 2.6, 6, 1.5); l.position.set(0.2, 2.1, -0.4); g.add(l);
  return (dt) => { spit.rotation.y += dt * 0.9; };
}

function bu(g) {
  floor(g, tiles('#a8743f', '#9c6a38', 2), '#ffffff', 0.5);
  panel(g, sign(['☾'], { bg: '#22345a', colors: ['#f4f1ec'], size: 120 }), WIN, [1.52, 1.3]);
  // Table de lecture avec ses lampes vertes, à la place du bureau
  box(g, [RX, 0.725, -1.0], [RD, 0.045, 1.76], '#7a4a25', { r: 0.45 }); for (const z of [-1.82, -0.18]) box(g, [RX, 0.35, z], [RD - 0.04, 0.7, 0.05], '#6a3f1f');
  for (const z of [-1.45, -0.6]) { cyl(g, [1.22, 0.76, z], 0.06, 0.02, '#b08d3c', { m: 0.8, r: 0.3 }); cyl(g, [1.22, 0.86, z], 0.01, 0.2, '#b08d3c', { m: 0.8, r: 0.3 }); box(g, [1.2, 0.98, z], [0.1, 0.06, 0.26], '#1f7a4d', { e: '#39c27b', ei: 0.9, r: 0.3 }); const p = new THREE.PointLight('#fff1c9', 0.9, 1.6, 1.8); p.position.set(1.12, 0.9, z); g.add(p); }
  box(g, [1.02, 0.762, -1.05], [0.3, 0.03, 0.22], '#f4f1ec'); box(g, [1.0, 0.79, -1.05], [0.26, 0.025, 0.2], '#5b8def'); // livres ouverts
  // Rayonnages remplis de livres : au-dessus de la table, puis du sol au plafond
  const books = new THREE.InstancedMesh(unit, new THREE.MeshStandardMaterial({ roughness: 0.75 }), 420), o = new THREE.Object3D(), col = new THREE.Color(), PAL = ['#8c2f39', '#1f4e79', '#2f6b4f', '#c9a227', '#5a3d7a', '#b55d2b', '#e6dcc6', '#34495e'];
  let n = 0, seed = 7; const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const shelf = (x, y0, y1, z0, z1, depth) => {
    box(g, [x, (y0 + y1) / 2, (z0 + z1) / 2], [depth, y1 - y0, z1 - z0], '#5f3a1c', { r: 0.6 });
    for (let y = y0 + 0.04; y < y1 - 0.25; y += 0.36) {
      box(g, [x - 0.02, y, (z0 + z1) / 2], [depth, 0.025, z1 - z0 - 0.04], '#7a4a25');
      for (let z = z0 + 0.06; z < z1 - 0.06 && n < 420;) { const w = 0.03 + rand() * 0.035, h = 0.2 + rand() * 0.1; o.position.set(x - depth / 2 - 0.004, y + 0.012 + h / 2, z + w / 2); o.scale.set(0.05, h, w); o.rotation.z = rand() < 0.06 ? 0.18 : 0; o.updateMatrix(); books.setMatrixAt(n, o.matrix); books.setColorAt(n, col.set(PAL[Math.floor(rand() * PAL.length)])); n++; z += w + 0.004; }
    }
  };
  shelf(1.24, 1.38, 2.3, -1.85, -0.14, 0.3); shelf(RX + 0.06, 0.02, 2.3, -0.1, 1.56, 0.5);
  books.count = n; books.castShadow = true; g.add(books);
  // Banquette basse en bois, à la place du lit
  box(g, [BENCH.x, BENCH.top - 0.05, BENCH.z], [BENCH.w, 0.1, BENCH.l], '#2f6b4f', { r: 0.8 }); box(g, [BENCH.x, 0.25, BENCH.z], [BENCH.w, 0.5, BENCH.l], '#6a3f1f', { r: 0.6 });
  panel(g, sign(['SILENCE', 'Merci pour ceux qui révisent'], { bg: '#f4f1ec', colors: ['#8c2f39', '#34495e'], size: [96, 34] }), [-1.385, 1.6, -0.3], [1.0, 0.5], Math.PI / 2);
  const l = new THREE.PointLight('#ffe2b0', 1.6, 6, 1.6); l.position.set(0, 2.2, -0.2); g.add(l);
  return null;
}

const BUILD = { laverie, kebab, bu };
const TINT = { laverie: '#dff3ee', kebab: '#ffe0bd', bu: '#efe2c8' };
export const DECORS = ['chambre', ...Object.keys(BUILD)];

export function createDecors(room, scene) {
  const sets = {}; let now = 'chambre';
  function make(name) {
    const g = new THREE.Group(); g.name = 'decor-' + name;
    const shell = new THREE.Mesh(room.walls.geometry, new THREE.MeshStandardMaterial({ vertexColors: true, color: TINT[name], roughness: 0.82 })); shell.receiveShadow = true; g.add(shell); // les mêmes murs, d'une autre couleur
    const update = BUILD[name](g); scene.add(g);
    return { g, update };
  }
  return {
    get current() { return now; },
    set(name) { // les meubles de la chambre restent en place pour la caméra, mais on ne les voit plus
      if (!BUILD[name]) name = 'chambre';
      if (name !== 'chambre' && !sets[name]) sets[name] = make(name);
      for (const [k, s] of Object.entries(sets)) s.g.visible = k === name;
      room.group.visible = name === 'chambre'; now = name;
    },
    update(dt) { sets[now]?.update?.(dt); },
  };
}
