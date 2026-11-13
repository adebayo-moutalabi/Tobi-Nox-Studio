// Autres lieux : la laverie, le kebab, la bibliothèque universitaire (BU), l'amphi, le couloir de la résidence et l'extérieur.
// Chaque lieu « rhabille » la chambre : mêmes murs, et des meubles posés là où étaient le bureau, l'armoire,
// la kitchenette et le lit. La caméra, les places (gauche, milieu, droite, tapis) et « NOX assis » marchent donc sans rien changer.
// Dans un script : DECOR laverie | kebab | bu | amphi | couloir | dehors | chambre.
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

function amphi(g) {
  floor(g, tiles('#b88a5a', '#ad7f50', 2), '#ffffff', 0.55);
  // Le tableau vert, devant la fenêtre
  box(g, [0, 1.55, -1.95], [2.6, 1.46, 0.05], '#5a3d26'); panel(g, sign(['DROIT CONSTITUTIONNEL', 'Chapitre 7 · Partiel jeudi, 8 h'], { w: 1024, bg: '#1f4d3a', colors: ['#f4f1ec', '#ffd23f'], size: [84, 52] }), [0, 1.55, -1.92], [2.5, 1.3]);
  box(g, [0, 0.86, -1.88], [2.5, 0.03, 0.08], '#5a3d26'); for (const [x, c] of [[-0.4, '#ffffff'], [-0.28, '#ffd23f'], [0.5, '#ff8fab']]) box(g, [x, 0.89, -1.87], [0.08, 0.02, 0.02], c);
  // Le bureau du prof, à la place du bureau de Tobi
  box(g, [RX, 0.725, -1.0], [RD, 0.045, 1.76], '#6a3f1f', { r: 0.45 }); box(g, [0.79, 0.36, -1.0], [0.03, 0.72, 1.76], '#7a4a25'); for (const z of [-1.86, -0.14]) box(g, [RX, 0.36, z], [RD, 0.72, 0.03], '#7a4a25');
  box(g, [1.12, 0.8, -1.35], [0.3, 0.11, 0.24], '#f4f1ec'); box(g, [1.12, 0.87, -1.35], [0.26, 0.03, 0.2], '#d92f2f'); // la pile de copies, et le stylo rouge
  cyl(g, [1.2, 0.8, -0.45], 0.04, 0.11, '#2f6fa8'); box(g, [1.22, 1.5, -0.6], [0.03, 0.5, 0.7], '#f4f1ec', { e: '#dfeeff', ei: 0.5 }); // gobelet et écran de projection replié
  // Porte de sortie et armoire à polycopiés
  box(g, [RX, 1.02, 0.39], [RD, 2.04, 1.0], '#7a4a25', { r: 0.55 }); box(g, [0.775, 1.0, 0.39], [0.012, 1.9, 0.8], '#8c5a2e'); cyl(g, [0.765, 1.0, 0.7], 0.02, 0.12, '#cfd5da', { axis: 'x', m: 0.9, r: 0.3 });
  box(g, [0.77, 2.16, 0.39], [0.02, 0.16, 0.5], '#1f7a4d', { e: '#39c27b', ei: 1.6 }); box(g, [RX, 1.02, 1.25], [RD, 2.04, 0.66], '#6a3f1f');
  // Les gradins : un banc devant, une tablette derrière
  box(g, [BENCH.x, BENCH.top - 0.03, BENCH.z], [BENCH.w, 0.06, BENCH.l], '#c08a4f', { r: 0.5 }); box(g, [BENCH.x, 0.26, BENCH.z], [BENCH.w - 0.06, 0.52, BENCH.l - 0.04], '#7a4a25');
  box(g, [-1.3, 0.86, BENCH.z], [0.2, 0.05, BENCH.l], '#c08a4f'); for (const [z, c] of [[-0.7, '#5b8def'], [0.1, '#f2b92e'], [0.7, '#ff8fab']]) box(g, [-1.29, 0.9, z], [0.16, 0.02, 0.22], c);
  const l = new THREE.PointLight('#fff0d6', 2.0, 6, 1.6); l.position.set(0, 2.25, -0.3); g.add(l);
  return null;
}

function couloir(g) {
  floor(g, tiles('#9fb0bd', '#8ea1af', 4), '#ffffff', 0.4);
  panel(g, sign(['SORTIE'], { bg: '#0f5132', colors: ['#ffffff'], size: 110 }), [0, 2.0, -1.93], [0.9, 0.34]); box(g, [0, 1.25, -1.95], [1.5, 1.34, 0.05], '#3d4a57'); box(g, [0, 1.25, -1.92], [0.03, 1.3, 0.02], '#232b33');
  // Console et tableau d'affichage, à la place du bureau
  box(g, [RX, 0.725, -1.0], [RD, 0.04, 1.76], '#e9edf0', { r: 0.4 }); box(g, [RX, 0.36, -1.0], [RD - 0.1, 0.72, 1.7], '#c9d3da');
  panel(g, sign(['RÉSIDENCE · ÉTAGE 2', 'Silence après 22 h', 'Laverie : 4 €'], { bg: '#a8743f', colors: ['#ffffff', '#fff1c9', '#fff1c9'], size: [58, 44, 44], h: 320 }), [1.385, 1.6, -1.0], [1.3, 0.8], -Math.PI / 2);
  box(g, [1.12, 0.79, -1.4], [0.24, 0.1, 0.32], '#a8743f'); // un colis qui attend
  // Les portes des chambres 212 et 213
  [['212', 0.39, 1.0], ['213', 1.25, 0.66]].forEach(([n, z, w]) => {
    box(g, [RX, 1.15, z], [RD, 2.3, w], '#ece4d6', { r: 0.8 }); box(g, [0.775, 1.0, z], [0.012, 1.96, Math.min(0.78, w - 0.1)], '#2f6fa8', { r: 0.5 });
    cyl(g, [0.762, 1.0, z + 0.26], 0.02, 0.1, '#cfd5da', { axis: 'x', m: 0.9, r: 0.3 }); panel(g, sign([n], { w: 128, h: 64, bg: '#f4f1ec', colors: ['#1d1b2e'], size: 48 }), [0.766, 1.72, z], [0.2, 0.1], -Math.PI / 2);
  });
  box(g, [0.72, 0.012, 0.39], [0.1, 0.02, 0.6], '#8a6a3c'); // le paillasson de Karim
  // Banc le long du mur, et la petite annonce de Karim
  box(g, [BENCH.x, BENCH.top - 0.03, BENCH.z], [BENCH.w, 0.06, BENCH.l], '#7c8791', { m: 0.5, r: 0.4 }); for (const z of [-1.0, -0.05, 0.85]) box(g, [BENCH.x, 0.26, z], [BENCH.w - 0.1, 0.5, 0.05], '#5a6570', { m: 0.6, r: 0.4 });
  panel(g, sign(['À VENDRE', 'Trottinette · 15 €', 'Voir Karim, ch. 213'], { bg: '#fff7df', colors: ['#d92f2f', '#1d1b2e', '#1d1b2e'], size: [70, 46, 40], h: 320 }), [-1.385, 1.55, 0.2], [0.6, 0.38], Math.PI / 2);
  for (const z of [-1.0, 0.5]) box(g, [0, 2.46, z], [0.5, 0.03, 0.5], '#ffffff', { e: '#fff3d6', ei: 2 });
  const l = new THREE.PointLight('#fff3d6', 2.0, 6, 1.6); l.position.set(0, 2.2, -0.2); g.add(l);
  return null;
}

function dehors(g) { // devant la résidence : pas de murs, le ciel vient de l'ambiance (jour ou soir)
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: '#4c8259', roughness: 1 })); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.004; grass.receiveShadow = true; g.add(grass);
  floor(g, tiles('#6b6677', '#625d6e', 6), '#ffffff', 0.9);
  // La façade de la résidence, avec ses fenêtres allumées
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const q = c.getContext('2d'); q.fillStyle = '#c9b79c'; q.fillRect(0, 0, 512, 512); let seed = 11; const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 7; i++) for (let k = 0; k < 5; k++) { q.fillStyle = rand() < 0.4 ? (rand() < 0.5 ? '#ffd98a' : '#fff1c9') : '#2a2850'; q.fillRect(22 + i * 70, 24 + k * 96, 46, 62); }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(9, 7, 0.4), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9 })); wall.position.set(0, 3.5, -2.35); wall.receiveShadow = true; g.add(wall);
  box(g, [0, 1.1, -2.13], [1.3, 2.2, 0.06], '#3a2a1a'); box(g, [0, 1.15, -2.1], [1.0, 1.8, 0.04], '#ffe9b8', { e: '#ffd98a', ei: 1.5 }); panel(g, sign(['RÉSIDENCE CROUS'], { w: 1024, h: 128, bg: '#2b2840', colors: ['#ffffff'], size: 84 }), [0, 2.55, -2.12], [2.2, 0.28]);
  // Muret et plantes à droite, panneau lumineux et distributeur
  box(g, [RX, 0.36, -1.0], [RD, 0.72, 1.76], '#8d8799', { r: 0.95 }); box(g, [RX, 0.735, -1.0], [RD + 0.04, 0.03, 1.8], '#a39db0');
  for (const z of [-1.6, -1.2]) { cyl(g, [1.2, 0.85, z], 0.1, 0.2, '#b55d2b', { r: 0.9 }); const p = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat('#3c9460', { r: 1 })); p.position.set(1.2, 1.05, z); p.castShadow = true; g.add(p); }
  box(g, [RX, 1.02, 0.39], [RD, 2.04, 1.0], '#2b2840', { r: 0.5 }); panel(g, sign(['KEBAB', 'DU CAMPUS', '→ 200 m'], { bg: '#1a0f14', colors: ['#ff9a3c', '#ff5fa2', '#ffffff'], size: [96, 60, 44], h: 400 }), [0.772, 1.1, 0.39], [0.84, 1.5], -Math.PI / 2);
  box(g, [RX, 1.02, 1.25], [RD, 2.04, 0.66], '#c9412f', { r: 0.4 }); box(g, [0.775, 1.2, 1.25], [0.012, 1.1, 0.5], '#eaf6ff', { e: '#cfe9ff', ei: 1.3 });
  // Banc et haie à gauche, réverbère
  box(g, [BENCH.x, BENCH.top - 0.03, BENCH.z], [BENCH.w, 0.06, BENCH.l], '#d7a56a', { r: 0.6 }); for (const z of [-0.95, 0.8]) box(g, [BENCH.x, 0.26, z], [BENCH.w - 0.1, 0.5, 0.07], '#5a5d6a', { m: 0.5 });
  box(g, [-1.6, 0.5, BENCH.z], [0.3, 1.0, 2.4], '#2f7d4f', { r: 1 });
  box(g, [-1.25, 1.6, -1.65], [0.07, 3.2, 0.07], '#2b2840', { m: 0.6 }); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffe2a8' })); bulb.position.set(-1.25, 3.25, -1.65); g.add(bulb);
  const l = new THREE.PointLight('#ffd9a0', 3.2, 9, 1.4); l.position.set(-1.1, 3.0, -1.4); g.add(l);
  const st = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 160; i++) sp.push(-12 + rand() * 24, 4 + rand() * 7, -9 + rand() * 4); st.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); g.add(new THREE.Points(st, new THREE.PointsMaterial({ color: '#e8e4ff', size: 0.05 })));
  return null;
}

const BUILD = { laverie, kebab, bu, amphi, couloir, dehors };
const TINT = { laverie: '#dff3ee', kebab: '#ffe0bd', bu: '#efe2c8', amphi: '#f1e6d2', couloir: '#e3e9ee', dehors: null }; // null : pas de murs, on est dehors
export const DECORS = ['chambre', ...Object.keys(BUILD)];

export function createDecors(room, scene) {
  const sets = {}; let now = 'chambre';
  function make(name) {
    const g = new THREE.Group(); g.name = 'decor-' + name;
    if (TINT[name]) { const shell = new THREE.Mesh(room.walls.geometry, new THREE.MeshStandardMaterial({ vertexColors: true, color: TINT[name], roughness: 0.82 })); shell.receiveShadow = true; g.add(shell); } // les mêmes murs, d'une autre couleur
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
