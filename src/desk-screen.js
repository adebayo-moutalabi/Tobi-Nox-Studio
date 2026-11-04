// Ordinateur vivant : touches qui s'enfoncent, écran qui affiche ce qui est tapé. Tableau blanc lisible.
import * as THREE from 'three';
import { Part } from './lowpoly.js';
import { box, mesh } from './props.js';

const hasDom = typeof document !== 'undefined';

export function createLaptop() {
  const group = new THREE.Group(); group.name = 'ordinateur';
  const p = new Part({});
  box(p, [0, 0.008, 0], [0.34, 0.016, 0.24], '#bdbcb9');
  box(p, [0, 0.0168, 0.078], [0.1, 0.0012, 0.06], '#a9a8a5', { vary: 0 }); // pavé tactile
  box(p, [0, 0.0165, -0.03], [0.31, 0.001, 0.125], '#2c2d30', { vary: 0 });
  group.add(mesh(p, 'base'));

  // Touches
  const cols = 13, rows = 4, kw = 0.0205, gap = 0.0029;
  const geo = new THREE.BoxGeometry(kw, 0.005, kw);
  const keys = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.5 }), cols * rows + 1);
  keys.name = 'touches'; keys.castShadow = false;
  const base = [], m = new THREE.Matrix4(), col = new THREE.Color();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    base.push([(c - (cols - 1) / 2) * (kw + gap) + (r % 2) * 0.004, 0.0195, -0.08 + r * (kw + gap), 1]);
  }
  base.push([0, 0.0195, -0.08 + rows * (kw + gap), 5.6]); // barre d'espace
  const heat = new Float32Array(base.length);
  const LAYOUT = ['1234567890', 'azertyuiop', 'qsdfghjklm', 'wxcvbn,;:!'];
  const keyOf = (ch) => { // la touche enfoncée est la vraie, disposition AZERTY
    if (ch === ' ' || ch === '\n') return base.length - 1;
    const c = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const r = LAYOUT.findIndex((l) => l.includes(c));
    return r < 0 ? 2 * cols + 6 : r * cols + 1 + LAYOUT[r].indexOf(c);
  };
  const put = (i) => {
    const [x, y, z, sx] = base[i], t = heat[i];
    m.makeScale(sx, 1, 1).setPosition(x, y - 0.0036 * Math.min(1, t * 2), z);
    keys.setMatrixAt(i, m);
    keys.setColorAt(i, col.set('#3f4146').lerp(col.clone().set('#ffd27a'), Math.min(1, t * 1.3)));
  };
  base.forEach((_, i) => put(i));
  group.add(keys);

  // Écran
  const hinge = new THREE.Group(); hinge.position.set(0, 0.012, -0.115); hinge.rotation.x = -0.3;
  const sp = new Part({});
  box(sp, [0, 0.115, 0], [0.34, 0.23, 0.01], '#bdbcb9');
  hinge.add(mesh(sp, 'capot'));
  let canvas = null, ctx = null, tex = null;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.312, 0.2), new THREE.MeshBasicMaterial({ color: '#20242f', toneMapped: false }));
  scr.name = 'ecran_pc'; scr.position.set(0, 0.115, 0.0056);
  hinge.add(scr); group.add(hinge);
  const S = { title: 'notes.txt', text: '', caret: 0 };
  function draw() {
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#20242f'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2d3342'; ctx.fillRect(0, 0, W, 54);
    for (const [i, c] of ['#ff6b5e', '#f6c14e', '#5ccb74'].entries()) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(30 + i * 28, 27, 9, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#c9cfdd'; ctx.font = '26px Consolas, "Courier New", monospace'; ctx.textBaseline = 'middle'; ctx.fillText(S.title, 130, 28);
    ctx.fillStyle = '#eef1f7'; ctx.font = '60px Consolas, "Courier New", monospace'; ctx.textBaseline = 'top';
    const lines = [];
    for (const para of S.text.split('\n')) {
      let cur = '';
      for (const w of para.split(' ')) {
        if (ctx.measureText(`${cur} ${w}`).width > W - 70 && cur) { lines.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
      }
      lines.push(cur);
    }
    const show = lines.slice(-6);
    show.forEach((l, i) => ctx.fillText(l, 34, 84 + i * 76));
    const last = show[show.length - 1] || '';
    if (S.caret < 0.5) { ctx.fillStyle = '#ffd27a'; ctx.fillRect(38 + ctx.measureText(last).width, 86 + (show.length - 1) * 76, 28, 58); }
    tex.needsUpdate = true;
  }
  if (hasDom) {
    canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 656;
    ctx = canvas.getContext('2d');
    tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    scr.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    draw();
  }
  return {
    group,
    type(ch) {
      if (ch === '\b') S.text = S.text.slice(0, -1); else S.text += ch;
      const i = keyOf(ch);
      heat[i] = 1;
      S.caret = 0; draw();
      return base[i][0] < 0 ? 'L' : 'R';
    },
    clear(title) { S.text = ''; if (title) S.title = title; draw(); },
    update(dt) {
      let dirty = false;
      for (let i = 0; i < heat.length; i++) if (heat[i] > 0) { heat[i] = Math.max(0, heat[i] - dt * 9); put(i); dirty = true; }
      if (dirty) { keys.instanceMatrix.needsUpdate = true; if (keys.instanceColor) keys.instanceColor.needsUpdate = true; }
      const c = S.caret; S.caret = (S.caret + dt) % 1;
      if ((c < 0.5) !== (S.caret < 0.5)) draw();
    },
  };
}

export function createBoard() {
  const group = new THREE.Group(); group.name = 'tableau';
  const p = new Part({});
  box(p, [0, 0, -0.008], [0.48, 0.34, 0.014], '#c8c7c2');
  box(p, [0, -0.175, 0.012], [0.46, 0.012, 0.03], '#b5b4af');
  box(p, [0.1, -0.165, 0.016], [0.12, 0.012, 0.014], '#2e8b57'); box(p, [-0.05, -0.165, 0.016], [0.12, 0.012, 0.014], '#c9352c');
  group.add(mesh(p, 'cadre'));
  let canvas, ctx, tex;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.32), new THREE.MeshBasicMaterial({ color: '#f7f6f1' }));
  plane.name = 'ecriture'; group.add(plane);
  let lines = ['Examen vendredi !', '- Réviser chapitres 3 et 4', '- Fiches de maths', '- Rendre le rapport', '- Dormir un peu...'];
  function draw() {
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#f8f7f2'; ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'top'; ctx.fillStyle = '#c9352c';
    ctx.font = '700 86px Caveat, "Segoe Print", "Comic Sans MS", cursive';
    ctx.fillText(lines[0] || '', 44, 30);
    ctx.strokeStyle = '#c9352c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(44, 124); ctx.lineTo(W - 120, 120); ctx.stroke();
    ctx.fillStyle = '#23252b'; ctx.font = '600 70px Caveat, "Segoe Print", "Comic Sans MS", cursive';
    lines.slice(1).forEach((l, i) => ctx.fillText(l, 50, 146 + i * 86));
    tex.needsUpdate = true;
  }
  if (hasDom) {
    canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 712; ctx = canvas.getContext('2d');
    tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    plane.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
    draw();
    document.fonts?.load?.('700 86px Caveat').then(draw).catch(() => {});
  }
  return { group, write(l) { lines = l; draw(); } };
}
