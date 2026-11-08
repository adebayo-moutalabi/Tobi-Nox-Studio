// Les Aînés : chaque logo devient un personnage. Le tracé vient du logo, le squelette et les gestes de Nox.
// Une forme fournit ses repères et build(), qui pose les volumes et rend deux fonctions :
// face(w) traduit les poids du visage de Nox, update(dt, s) donne au logo sa façon de vivre.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, smooth } from './lowpoly.js';
import { addRot } from './talk.js';

const CODEX_PATH = 'M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z';
const GEMINI_PATH = 'M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z';

// Le tracé SVG devient des contours centrés, en unités de modèle, y vers le haut.
function outlines(d, size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}"/></svg>`;
  const shapes = new SVGLoader().parse(svg).paths.flatMap((p) => SVGLoader.createShapes(p));
  const area = (s) => Math.abs(THREE.ShapeUtils.area(s.getPoints(8)));
  const main = shapes.reduce((a, b) => (area(a) > area(b) ? a : b));
  const k = size / 24, fit = (pts) => pts.map((q) => new THREE.Vector2((q.x - 12) * k, (12 - q.y) * k));
  const { shape, holes } = main.extractPoints(40);
  return { outer: fit(shape), holes: holes.map(fit) };
}
// Volume gonflé : le contour se resserre vers le centre, ce qui donne un bord arrondi sans aucune pointe.
const RINGS = [1, 0.996, 0.985, 0.96, 0.92, 0.85, 0.72, 0.5, 0.25];
function volume(points, depth, tint) {
  const pts = points.filter((q, i) => q.distanceTo(points[(i + 1) % points.length]) > 1e-5), n = pts.length, pos = [], idx = [];
  const lift = (k) => depth * Math.sqrt(Math.max(0, 1 - k ** 8));
  const rim = pos.length / 3; for (const q of pts) pos.push(q.x, q.y, 0);
  for (const side of [1, -1]) {
    let last = rim;
    const flip = (a, b, c) => (side > 0 ? idx.push(a, b, c) : idx.push(a, c, b));
    for (const k of RINGS.slice(1)) {
      const at = pos.length / 3;
      for (const q of pts) pos.push(q.x * k, q.y * k, side * lift(k));
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; flip(last + i, last + j, at + j); flip(last + i, at + j, at + i); }
      last = at;
    }
    const tip = pos.length / 3; pos.push(0, 0, side * depth);
    for (let i = 0; i < n; i++) flip(last + i, last + ((i + 1) % n), tip);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  if (THREE.ShapeUtils.isClockWise(pts)) g.index.array.reverse();
  g.computeVertexNormals();
  const P = g.attributes.position, c = new Float32Array(P.count * 3), col = new THREE.Color();
  for (let i = 0; i < P.count; i++) { tint(col, P.getX(i), P.getY(i)); c.set([col.r, col.g, col.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
const glossy = (name) => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0 }); m.name = name; return m; };
const solid = (mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
const ink = (color) => new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, side: THREE.DoubleSide });

// Une bouche souple : une bande dont les bords s'ouvrent et se courbent, comme celle de Nox.
function bandMouth(width, thick, material, gape = 0.62) {
  const n = 14, g = new THREE.PlaneGeometry(2, 2, n, 1), P = g.attributes.position;
  const mesh = new THREE.Mesh(g, material);
  mesh.draw = (w) => {
    const wide = width * (1 + 0.35 * w.flat - 0.35 * w.round + 0.2 * w.smile), bend = (w.smile - w.frown) * 0.5 * width, tilt = w.smirk * 0.3 * width;
    for (let i = 0; i < P.count; i++) {
      const u = ((i % (n + 1)) / n) * 2 - 1, top = i <= n, c = Math.sqrt(Math.max(0, 1 - u * u)), edge = thick * Math.sqrt(Math.max(0, 1 - u ** 6));
      const y = bend * (u * u - 0.4) + tilt * u;
      const up = edge + 0.3 * thick * w.round * c, down = edge + (w.open * 1.5 + w.round * 0.8) * width * gape * c;
      P.setXYZ(i, u * wide, y + (top ? up : -down), 0);
    }
    P.needsUpdate = true;
  };
  mesh.frustumCulled = false;
  return mesh;
}

// ---- Claude Code : le petit crabe en pixels du logo -----------------------
const U = 0.045; // une case du logo
// Au repos, les bras restent à l'horizontale comme sur le logo ; pendant un geste, ils reprennent leur place.
const armsOut = (bones, rest) => {
  for (const [n, s] of [['L', 1], ['R', -1]]) {
    const b = bones[`arm_${n}`], swung = 2 * Math.acos(clamp(Math.abs(b.quaternion.w)));
    addRot(b, 0, 0, s * rest * (1 - smooth(0.3, 1.1, swung)));
  }
};
export const CLAUDE_CODE = {
  pivot: 9 * U, shoulder: (s) => new THREE.Vector3(s * 9 * U, 7.5 * U, 0), armLen: 3 * U, legY: 3 * U, legX: 5.25 * U, footY: 0.01, eyeY: 10.5 * U,
  build({ bones, dir }) {
    const skin = new THREE.MeshStandardMaterial({ color: '#d97757', roughness: 0.55 }); skin.name = 'claude';
    const block = (w, h, d, r = 0.014) => solid(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), skin));
    const logo = new THREE.Group(); bones.head.add(logo);
    logo.add(block(18 * U, 12 * U, 8 * U, 0.02));
    for (const [n, s] of [['L', 1], ['R', -1]]) {
      const a = block(3.2 * U, 3.1 * U, 5 * U), d = dir(s);
      a.position.copy(d).multiplyScalar(1.3 * U); a.rotation.z = Math.atan2(d.y, d.x);
      bones[`arm_${n}`].add(a);
      for (const [x, leg] of [[6.75, n], [3.75, n === 'L' ? 'R' : 'L']]) { // les pattes voisines alternent
        const l = block(1.5 * U, 3.1 * U, 3 * U, 0.008), bone = bones[`leg_${leg}`];
        l.position.set(s * x * U - bone.position.x, -1.5 * U, 0);
        bone.add(l);
      }
    }
    const dark = new THREE.MeshStandardMaterial({ color: '#2a1610', roughness: 0.4 }); dark.name = 'claude-yeux';
    const z = 4 * U + 0.002, pix = (w, h) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.004), dark); m.position.z = z; logo.add(m); return m; };
    const eyes = [1, -1].map((s) => Object.assign(pix(1.5 * U, 2.85 * U), { side: s }));
    const mouth = [pix(3 * U, 1), pix(U, 1), pix(U, 1)];
    let hop = 0;
    return {
      face(w) {
        for (const e of eyes) {
          const blink = e.side > 0 ? w.blinkL : w.blinkR;
          e.scale.set(1 + 0.25 * w.wide + 0.5 * w.happy, (1 - 0.92 * blink) * (1 - 0.55 * w.happy) * (1 + 0.25 * w.wide), 1);
          e.position.x = e.side * 5.25 * U + (w.lookL - w.lookR) * 0.9 * U;
          e.position.y = 1.5 * U + (w.lookU - w.lookD) * 0.7 * U + 0.5 * w.happy * U;
          e.rotation.z = e.side * (w.sad - w.angry) * 0.5;
        }
        const h = (0.45 + 2.6 * w.open + 1.7 * w.round) * U, wide = 1 + 0.5 * w.flat - 0.45 * w.round, lift = (w.smile - w.frown) * 0.8 * U;
        const y = -2.1 * U - h / 2, shown = w.open + w.round + w.flat + w.smile + w.frown + w.smirk > 0.05;
        mouth.forEach((m, i) => {
          const corner = [0, 1, -1][i];
          m.visible = shown;
          m.scale.set(wide, corner ? 0.45 * U + h * 0.55 : h, 1);
          m.position.x = corner * 2 * U * wide;
          m.position.y = corner ? y + h * 0.22 + lift + (corner > 0 ? w.smirk * 0.8 * U : 0) : y;
        });
      },
      update(dt, s) {
        armsOut(bones, Math.PI / 2 - 0.476);
        // Il sautille par petites cases, comme un sprite : un mouvement net, jamais fondu.
        const beat = 0.5 + 0.5 * Math.sin(s.time * (s.talking ? 15 : 2));
        hop += (beat * (s.talking ? 0.5 + s.level : 0.12) - hop) * (1 - Math.exp(-dt * 20));
        const step = Math.round(hop * 3) / 3;
        logo.position.y = step * 0.5 * U;
        logo.scale.set(1 + 0.03 * step, 1 - 0.03 * step, 1);
      },
    };
  },
};

// ---- Codex : le nuage et son invite de commande ---------------------------
const CODEX_SIZE = 0.86, CODEX_DEPTH = 0.1, HOME = 0.16;
export const CODEX = {
  pivot: 0.4, shoulder: (s) => new THREE.Vector3(s * 0.3, 0.34, 0.15), armLen: 0.19, legY: 0.13, legX: 0.14, footY: 0.06, eyeY: 0.56,
  build({ bones }) {
    const { outer, holes } = outlines(CODEX_PATH, CODEX_SIZE);
    const top = new THREE.Color('#b1a7ff'), mid = new THREE.Color('#7a9dff'), low = new THREE.Color('#3941ff');
    const tint = (col, x, y) => { const t = clamp(y / 0.43, -1, 1); col.copy(mid).lerp(t > 0 ? top : low, Math.abs(t)); };
    const logo = new THREE.Group(); logo.position.y = HOME; bones.head.add(logo);
    logo.add(solid(new THREE.Mesh(volume(outer, CODEX_DEPTH, tint), glossy('codex'))));
    const box = (pts) => new THREE.Box2().setFromPoints(pts), [chevron, cursor] = [...holes].sort((a, b) => box(a).min.x - box(b).min.x);
    const front = CODEX_DEPTH + 0.003, cen = box(chevron).getCenter(new THREE.Vector2());
    const eye = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(chevron.map((q) => q.clone().sub(cen)))), ink('#ffffff'));
    eye.position.set(cen.x, cen.y, front); logo.add(eye);
    const b = box(cursor), at = b.getCenter(new THREE.Vector2()), bar = ink('#ffffff');
    const mouth = bandMouth((b.max.x - b.min.x) / 2, (b.max.y - b.min.y) / 2, bar, 0.36);
    mouth.position.set(at.x, at.y, front); logo.add(mouth);

    const hand = new THREE.MeshStandardMaterial({ color: '#7a9dff', roughness: 0.42 }), foot = new THREE.MeshStandardMaterial({ color: '#3941ff', roughness: 0.5 });
    hand.name = 'codex-mains'; foot.name = 'codex-pieds';
    for (const n of ['L', 'R']) {
      bones[`hand_${n}`].add(solid(new THREE.Mesh(new THREE.SphereGeometry(0.056, 20, 14), hand)));
      const f = solid(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), foot));
      f.scale.set(0.075, 0.05, 0.1); f.position.set(0, -0.012, 0.015); bones[`foot_${n}`].add(f);
    }
    return {
      face(w) {
        const big = 1 + 0.28 * w.wide;
        eye.rotation.z = w.happy * 0.16 - w.sad * 0.3 + w.angry * 0.16; // le chevron reste lisible : il bascule sans perdre la forme du logo
        eye.scale.set(big, big * (1 - 0.9 * Math.max(w.blinkL, w.blinkR)), 1);
        eye.position.x = cen.x + (w.lookL - w.lookR) * 0.03;
        eye.position.y = cen.y + (w.lookU - w.lookD) * 0.025;
        mouth.draw(w);
      },
      update(dt, s) {
        const puff = 0.012 * Math.sin(s.time * 1.9) + 0.05 * s.level;
        logo.scale.set(1 + puff, 1 - puff * 0.8, 1 + puff * 0.5);
        logo.position.y = HOME + 0.008 * Math.sin(s.time * 1.3);
        logo.rotation.z = 0.025 * Math.sin(s.time * 0.8);
        bar.opacity = s.talking || s.time % 1.1 < 0.68 ? 1 : 0.25; // le curseur clignote quand il attend
      },
    };
  },
};

// ---- Gemini : l'étoile à quatre branches, en lévitation --------------------
const STAR = 1.04, STAR_DEPTH = 0.075, STAR_Y = 0.2;
export const GEMINI = {
  pivot: 0.4, shoulder: (s) => new THREE.Vector3(s * 0.24, 0.42, 0.1), armLen: 0.19, legY: 0.13, legX: 0.1, footY: 0.06, eyeY: 0.63,
  build({ bones }) {
    const { outer } = outlines(GEMINI_PATH, STAR);
    const blue = new THREE.Color('#3186ff'), k = 24 / STAR;
    const along = (a, b, x, y) => clamp(((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2));
    const spots = [['#08b962', [7, 15.5], [11, 12]], ['#f94543', [8, 5.5], [11.5, 11]], ['#fabc12', [3.5, 13.5], [10, 12.7]]].map(([c, a, b]) => [new THREE.Color(c), a, b]);
    const tint = (col, x, y) => {
      col.copy(blue);
      for (const [c, a, b] of spots) col.lerp(c, 1 - along(a, b, x * k + 12, 12 - y * k));
    };
    const logo = new THREE.Group(); logo.position.y = STAR_Y; bones.head.add(logo);
    const star = solid(new THREE.Mesh(volume(outer, STAR_DEPTH, tint), glossy('gemini')));
    logo.add(star);
    const white = ink('#ffffff'), z = STAR_DEPTH + 0.003;
    const eyes = [1, -1].map((s) => { const e = new THREE.Mesh(new THREE.CircleGeometry(1, 28), white); e.userData.side = s; e.position.z = z; logo.add(e); return e; });
    const mouth = bandMouth(0.04, 0.0075, white); mouth.position.set(0, -0.06, z); logo.add(mouth);
    const small = outlines(GEMINI_PATH, 0.15).outer, sparks = ['L', 'R'].map((n) => {
      const m = solid(new THREE.Mesh(volume(small, 0.02, (c) => c.set('#a9ccff')), glossy('gemini-mains')));
      bones[`hand_${n}`].add(m); return m;
    });
    let spin = 0, turns = 0, wait = 3, spoke = false;
    return {
      face(w) {
        for (const e of eyes) {
          const s = e.userData.side, blink = s > 0 ? w.blinkL : w.blinkR, big = 1 + 0.25 * w.wide;
          e.scale.set(0.029 * big * (1 + 0.2 * w.happy), 0.043 * big * (1 - 0.9 * blink) * (1 - 0.5 * w.happy), 1);
          e.position.x = s * 0.07 + (w.lookL - w.lookR) * 0.012;
          e.position.y = 0.024 + (w.lookU - w.lookD) * 0.012 + 0.008 * w.happy;
          e.rotation.z = s * (w.sad - w.angry) * 0.4;
        }
        mouth.draw(w);
      },
      update(dt, s) {
        // L'étoile a quatre branches : elle pivote d'un quart de tour et retombe sur sa forme. C'est son scintillement.
        wait -= dt;
        if ((s.talking && !spoke) || wait <= 0) { turns++; wait = s.talking ? 2.2 : 5.5; }
        spoke = s.talking;
        spin += ((turns * Math.PI) / 2 - spin) * (1 - Math.exp(-dt * 9));
        star.rotation.z = -spin;
        const glint = 1 + 0.05 * s.level + 0.012 * Math.sin(s.time * 2.3);
        star.scale.set(glint, glint, 1);
        logo.position.y = STAR_Y + 0.018 * Math.sin(s.time * 1.8);
        sparks.forEach((m, i) => { m.rotation.z = s.time * (i ? 1.3 : -1.3); });
      },
    };
  },
};

// ---- Promo : l'IA à trente centimes. Un petit mochi gourmand, inventé pour la série ----
// Une boule moelleuse vert menthe, joues roses, grands yeux brillants, une antenne et une casquette « PROMO » de travers.
// Elle s'écrase et rebondit comme une pâte molle quand elle parle.
export const PROMO = {
  pivot: 0.4, shoulder: (s) => new THREE.Vector3(s * 0.26, 0.36, 0.1), armLen: 0.15, legY: 0.13, legX: 0.1, footY: 0.06, eyeY: 0.58,
  build({ bones }) {
    const mint = new THREE.MeshStandardMaterial({ color: '#a8ecc9', roughness: 0.75 }); mint.name = 'promo';
    const logo = new THREE.Group(); logo.position.y = 0.17; bones.head.add(logo);
    const body = solid(new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 28), mint)); body.scale.set(1.08, 0.8, 0.9); logo.add(body);
    const face = new THREE.Group(); logo.add(face); // visage collé au ventre du mochi
    const eyeInk = ink('#21302a'), shine = ink('#ffffff');
    const eyes = [1, -1].map((side) => {
      const e = new THREE.Group(); e.userData.side = side; face.add(e);
      e.add(new THREE.Mesh(new THREE.CircleGeometry(1, 24), eyeInk));
      const glint = new THREE.Mesh(new THREE.CircleGeometry(0.38, 14), shine); glint.position.set(0.28, 0.32, 0.001); e.add(glint);
      e.position.z = 0.262; e.rotation.y = side * 0.32; return e;
    });
    for (const s of [1, -1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.042, 18), ink('#ff8fab')); c.material.opacity = 0.7; c.position.set(s * 0.17, -0.045, 0.235); c.rotation.y = s * 0.6; face.add(c); }
    const mouth = bandMouth(0.03, 0.006, eyeInk); mouth.position.set(0, -0.06, 0.268); face.add(mouth);
    const red = new THREE.MeshStandardMaterial({ color: '#e5383b', roughness: 0.5 });
    const cap = new THREE.Group(); cap.position.set(0.03, 0.2, 0); cap.rotation.z = -0.35; logo.add(cap);
    cap.add(solid(new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), red)));
    const visor = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.012, 24, 1, false, -Math.PI / 2, Math.PI), red)); visor.position.set(0, 0.005, 0.09); cap.add(visor);
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas'); c.width = 192; c.height = 64; const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.font = '900 46px "Inter", "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PROMO', 96, 36);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.057), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
      label.position.set(0, 0.07, 0.135); label.rotation.x = -0.45; cap.add(label);
    }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), new THREE.MeshStandardMaterial({ color: '#5a6b63' })); stem.position.set(-0.05, 0.2, 0); stem.rotation.z = 0.25; logo.add(stem);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.025, 14, 10), new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb000', emissiveIntensity: 0.6 })); bulb.position.set(-0.066, 0.265, 0); logo.add(bulb);
    let squish = 0;
    return {
      face(w) {
        for (const e of eyes) {
          const s = e.userData.side, blink = s > 0 ? w.blinkL : w.blinkR, big = 1 + 0.3 * w.wide;
          e.scale.set(0.048 * big * (1 + 0.15 * w.happy), 0.055 * big * (1 - 0.9 * blink) * (1 - 0.5 * w.happy), 1);
          e.position.x = s * 0.1 + (w.lookL - w.lookR) * 0.012;
          e.position.y = 0.03 + (w.lookU - w.lookD) * 0.012;
        }
        mouth.draw(w);
      },
      update(dt, s) {
        // Pâte molle : elle s'écrase en parlant puis reprend sa forme, et respire doucement au repos.
        const want = s.talking ? (0.4 + 0.6 * Math.abs(Math.sin(s.time * 9))) * (0.5 + s.level) : 0.15 + 0.15 * Math.sin(s.time * 2);
        squish += (want - squish) * (1 - Math.exp(-dt * 12));
        body.scale.set(1.08 + 0.06 * squish, 0.8 - 0.06 * squish, 0.9 + 0.03 * squish);
        face.position.y = -0.02 * squish; cap.position.y = 0.2 - 0.04 * squish; stem.position.y = 0.2 - 0.04 * squish; bulb.position.y = 0.265 - 0.04 * squish;
        bulb.material.emissiveIntensity = 0.4 + 0.4 * Math.abs(Math.sin(s.time * (s.talking ? 8 : 2)));
      },
    };
  },
};
