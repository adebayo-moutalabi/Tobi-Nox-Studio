// Ordinateur vivant : touches qui s'enfoncent, écran qui affiche ce qui est tapé. Tableau blanc lisible.
import * as THREE from 'three';
import { Part } from './lowpoly.js';
import { box, mesh } from './props.js';

const hasDom = typeof document !== 'undefined';

// Écran verrouillé du second ordinateur : un fond calme, l'heure et, si besoin, le jour de l'histoire.
export function createLockScreen() {
  const W = 620, H = 400, mat = new THREE.MeshBasicMaterial({ color: '#10121c', toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.2), mat); mesh.name = 'ecran_verrouille';
  if (!hasDom) return { mesh, set() {}, update() {} };
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'), tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  mat.map = tex; mat.color.set('#ffffff');
  const now = { time: '23:12', day: '', date: '', fixed: false };
  let run = 0;
  function draw() {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#171a35'); g.addColorStop(0.6, '#2b2358'); g.addColorStop(1, '#5a3a6e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const s = ctx.createRadialGradient(W * 0.78, H * 0.8, 10, W * 0.78, H * 0.8, 260); s.addColorStop(0, 'rgba(242,185,46,.5)'); s.addColorStop(1, 'rgba(242,185,46,0)');
    ctx.fillStyle = s; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
    ctx.font = '700 140px "Inter", "Segoe UI", sans-serif'; const line = now.day || now.date; ctx.fillText(now.time, W / 2, line ? 160 : 195);
    if (line) { ctx.fillStyle = now.day ? '#f2b92e' : '#d8d6e8'; ctx.font = `${now.day ? 700 : 500} ${now.day ? 62 : 44}px "Inter", "Segoe UI", sans-serif`; ctx.fillText(line, W / 2, 295, W - 60); }
    tex.needsUpdate = true;
  }
  draw();
  return {
    mesh,
    set(o) { Object.assign(now, o); run = 0; draw(); },
    update(dt) { // une minute de plus toutes les 10 secondes : assez pour la voir avancer pendant un épisode
      if (now.fixed) return; // heure imposée par le script
      run += dt; if (run < 10) return; run = 0;
      const [h, m] = now.time.split(':').map(Number), t = (h * 60 + m + 1) % 1440;
      now.time = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; draw();
    },
  };
}

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
  const S = { title: 'notes.txt', text: '', caret: 0, board: null, boardT: 0 };
  // Fenêtres d'applications, sans logo : on les reconnaît à leur couleur et à leur mise en page.
  const APPS = { word: ['#2b579a', 'Accueil   Insertion   Mise en page   Révision'], powerpoint: ['#c43e1c', 'Accueil   Insertion   Création   Diaporama'], excel: ['#217346', 'Accueil   Insertion   Formules   Données'], canva: ['#7d2ae8', 'Modèles   Éléments   Texte   Photos'],
    safari: ['#e6e7ea', ''], banque: ['#12355b', 'Comptes   Virements   Cartes'], terminal: ['#2b2d31', ''], code: ['#1f2228', ''], notes: ['#e9b949', ''], finder: ['#e6e7ea', ''], stats: ['#14161d', ''], discord: ['#2b2d36', ''], camera: ['#000000', ''], agenda: ['#d8483e', ''], chat: ['#ffffff', ''], jeu: ['#5c94fc', ''], claude: ['#16161a', ''] };
  const ALIAS = { chrome: 'safari', navigateur: 'safari', vscode: 'code', slack: 'discord', whatsappweb: 'discord', calendrier: 'agenda', sheets: 'excel', docs: 'word', slides: 'powerpoint', keynote: 'powerpoint', pages: 'word', numbers: 'excel', chatgpt: 'chat', assistant: 'chat', game: 'jeu', claudecode: 'claude' };
  // Outils du quotidien : navigateur, banque, terminal, code, notes, fichiers, statistiques, discussion, caméra, agenda.
  function drawTool(W, H, app, name, rows, color, F, show) {
    const dots = (y, x = 30) => { for (const [i, c] of ['#ff5f57', '#febc2e', '#28c840'].entries()) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + i * 28, y, 9, 0, 7); ctx.fill(); } };
    const each = (fn) => rows.forEach((r, i) => { const p = show(i); if (!p) return; ctx.globalAlpha = p; fn(r, i, i === rows.length - 1 && rows.length > 1); ctx.globalAlpha = 1; });
    const count = (r) => r.replace(/\d[\d ]*\d|\d/, (n) => { const k = Math.min(1, Math.max(0, (S.boardT - 0.4) / 0.7)); return Math.round(Number(n.replace(/\s/g, '')) * (1 - (1 - k) ** 3)).toLocaleString('fr-FR').replace(/\u202f/g, ' '); });
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if (app === 'claude') { // Claude Code dans un terminal : l'accueil, les demandes, puis l'alerte de limite avec sa jauge qui se remplit
      const M = '"Cascadia Code", Consolas, monospace', O = '#d97757', T = S.boardT, ease = (x) => 1 - (1 - Math.max(0, Math.min(1, x))) ** 3;
      ctx.fillStyle = '#16161a'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#2a2a30'; ctx.fillRect(0, 0, W, 48); dots(24);
      ctx.fillStyle = '#a7a7b0'; ctx.textAlign = 'center'; ctx.font = `600 24px ${F}`; ctx.fillText(name, W / 2, 25); ctx.textAlign = 'left';
      ctx.strokeStyle = O; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(24, 66, W - 48, 92, 12); ctx.stroke();
      ctx.fillStyle = O; ctx.font = `700 34px ${M}`; ctx.fillText('✻', 48, 112); ctx.fillStyle = '#ececf1'; ctx.font = `700 32px ${M}`; ctx.fillText('Bienvenue dans Claude Code', 92, 104);
      ctx.fillStyle = '#8b8b95'; ctx.font = `500 22px ${M}`; ctx.fillText('~/chambre-de-tobi', 92, 138);
      const alert = rows.findIndex((r) => /limite|termin|bloqu|refus/i.test(r)), body = alert < 0 ? rows : rows.slice(0, alert), tail = alert < 0 ? [] : rows.slice(alert);
      let y = 196;
      body.forEach((r, i) => { const p = show(i); if (!p) return; ctx.globalAlpha = p; const me = r.startsWith('>');
        ctx.fillStyle = me ? '#ececf1' : O; ctx.font = `700 32px ${M}`; ctx.fillText(me ? '>' : '⏺', 34, y);
        ctx.fillStyle = me ? '#ececf1' : '#c9c9d1'; ctx.font = `${me ? 600 : 500} 32px ${M}`; ctx.fillText(r.replace(/^>\s*/, ''), 72, y, W - 110); ctx.globalAlpha = 1; y += 54; });
      if (tail.length) { // l'alerte : la jauge d'utilisation monte jusqu'au bout, devient rouge, puis le cadre clignote
        const t0 = 0.15 + body.length * 0.24, k = ease((T - t0) / 0.9), full = k >= 1, by = Math.max(y + 10, H - 250);
        if (T > t0) {
          ctx.globalAlpha = Math.min(1, (T - t0) / 0.2);
          ctx.fillStyle = full ? 'rgba(229,56,59,.12)' : 'rgba(217,119,87,.10)'; ctx.strokeStyle = full ? (Math.sin(T * 7) > 0 ? '#e5383b' : '#ff8a8c') : O; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.roundRect(24, by, W - 48, 220, 14); ctx.fill(); ctx.stroke();
          ctx.fillStyle = full ? '#ff6b6d' : O; ctx.font = `800 38px ${M}`; ctx.fillText(`⚠ ${tail[0]}`, 52, by + 50, W - 104);
          ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.roundRect(52, by + 86, W - 104, 34, 17); ctx.fill();
          const g = ctx.createLinearGradient(52, 0, W - 52, 0); g.addColorStop(0, O); g.addColorStop(1, '#e5383b');
          ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(52, by + 86, Math.max(34, (W - 104) * (0.72 + 0.28 * k)), 34, 17); ctx.fill();
          ctx.fillStyle = '#ececf1'; ctx.font = `700 24px ${M}`; ctx.textAlign = 'right'; ctx.fillText(`${Math.round(72 + 28 * k)} %`, W - 64, by + 104); ctx.textAlign = 'left';
          tail.slice(1).forEach((r, i) => { ctx.fillStyle = '#c9c9d1'; ctx.font = `600 30px ${M}`; ctx.fillText(r, 52, by + 162 + i * 40, W - 104); });
          ctx.globalAlpha = 1;
        }
      }
      return true;
    }
    if (app === 'chat') { // discussion avec une IA : la question, la réponse qui s'écrit, puis la pub qui s'invite
      const ease = (x) => 1 - (1 - x) ** 3, back = (x) => { const c = 1.7, u = x - 1; return 1 + (c + 1) * u ** 3 + c * u ** 2; };
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f4f4f5'; ctx.fillRect(0, 0, 150, H); dots(30, 24);
      ctx.fillStyle = '#17191f'; ctx.font = `700 24px ${F}`; ctx.fillText('+ Nouveau', 22, 84, 120);
      ctx.fillStyle = '#9a9ca3'; ctx.font = `500 21px ${F}`; ['Rupture', 'Pâtes', 'CAF'].forEach((x, i) => ctx.fillText(x, 22, 140 + i * 40, 120));
      ctx.fillStyle = '#17191f'; ctx.textAlign = 'center'; ctx.font = `700 28px ${F}`; ctx.fillText(name, 150 + (W - 150) / 2, 32); ctx.textAlign = 'left';
      ctx.fillStyle = '#ececee'; ctx.fillRect(150, 62, W - 150, 2);
      const X = 172, R = W - 24, wrap = (txt, max) => { const out = []; let line = ''; for (const w of txt.split(' ')) { if (ctx.measureText(`${line} ${w}`).width > max && line) { out.push(line); line = w; } else line = line ? `${line} ${w}` : w; } out.push(line); return out; };
      let y = 80;
      rows.forEach((r, i) => {
        const p = show(i); if (!p) return;
        const ad = /^(pub|sponsoris[ée]e?)\s*:\s*/i.exec(r), me = r.startsWith('>'), text = r.replace(/^>\s*/, '').replace(ad ? ad[0] : '', '');
        ctx.globalAlpha = Math.min(1, p * 1.5);
        if (ad) { // la pub glisse depuis le bas, rebondit, et son bouton clignote doucement
          const k = Math.max(0, Math.min(1, (S.boardT - 0.15 - i * 0.24) / 0.45)), dy = (1 - back(k)) * 60, h = 150;
          ctx.fillStyle = '#fff7df'; ctx.strokeStyle = '#f2b92e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(X, y + dy, R - X, h, 18); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#9a7a1c'; ctx.font = `800 24px ${F}`; ctx.fillText('SPONSORISÉ', X + 24, y + dy + 30);
          ctx.fillStyle = '#17191f'; ctx.font = `800 46px ${F}`; ctx.fillText(text, X + 24, y + dy + 96, R - X - 250);
          ctx.globalAlpha *= 0.75 + 0.25 * Math.sin(S.boardT * 6) ** 2;
          ctx.fillStyle = '#17191f'; ctx.beginPath(); ctx.roundRect(R - 210, y + dy + 56, 190, 66, 33); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `800 28px ${F}`; ctx.fillText("Voir l'offre", R - 115, y + dy + 89); ctx.textAlign = 'left';
          y += h + 22;
        } else if (me) { // la question de Tobi, à droite
          ctx.font = `600 42px ${F}`; const lines = wrap(text, 620), w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 56, h = lines.length * 52 + 34;
          ctx.fillStyle = '#ececee'; ctx.beginPath(); ctx.roundRect(R - w, y + (1 - ease(p)) * 20, w, h, 24); ctx.fill();
          ctx.fillStyle = '#17191f'; lines.forEach((l, k) => ctx.fillText(l, R - w + 28, y + 43 + k * 52 + (1 - ease(p)) * 20));
          y += h + 22;
        } else { // la réponse de l'IA, qui s'écrit mot à mot
          ctx.fillStyle = '#17191f'; ctx.beginPath(); ctx.arc(X + 20, y + 24, 20, 0, 7); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(X + 20, y + 24, 11, 5, k * Math.PI / 3, 0, 7); ctx.stroke(); }
          const typed = Math.max(0, Math.min(1, (S.boardT - 0.15 - i * 0.24) / 0.7)), words = text.split(' '), part = words.slice(0, Math.ceil(words.length * typed)).join(' ');
          ctx.font = `500 44px ${F}`; const lines = wrap(part, R - X - 70);
          ctx.fillStyle = '#17191f'; lines.forEach((l, k) => ctx.fillText(l, X + 58, y + 26 + k * 54));
          y += Math.max(1, wrap(text, R - X - 70).length) * 54 + 24;
        }
        ctx.globalAlpha = 1;
      });
      ctx.fillStyle = '#f4f4f5'; ctx.beginPath(); ctx.roundRect(X, H - 74, R - X, 54, 27); ctx.fill();
      ctx.fillStyle = '#9a9ca3'; ctx.font = `500 24px ${F}`; ctx.fillText('Envoyer un message…', X + 26, H - 47);
      return true;
    }
    if (app === 'jeu') { // aperçu d'un jeu de plateforme : le héros saute, les ennemis avancent, le boss attend au bout
      const t = S.boardT, P = 8, px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5c94fc'); sky.addColorStop(1, '#a8c8ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      for (const [cx, cy] of [[180, 240], [560, 210], [860, 260]]) { const x = (cx - t * 18) % (W + 160); px(x, cy, 120, 28, '#fff'); px(x + 24, cy - 22, 70, 24, '#fff'); }
      const G = H - 96; for (let x = 0; x < W; x += 48) { px(x, G, 46, 46, '#c8743a'); px(x, G, 46, 8, '#e09a5a'); px(x, G + 48, 46, 46, '#a85d2c'); }
      for (const bx of [300, 348, 396]) { px(bx, G - 210, 46, 46, bx === 348 ? '#f2b92e' : '#c8743a'); if (bx === 348) { ctx.fillStyle = '#7a4a10'; ctx.font = `900 34px ${F}`; ctx.textAlign = 'center'; ctx.fillText('?', bx + 23, G - 186); ctx.textAlign = 'left'; } }
      const bossX = W - 230; px(bossX, G - 250, 190, 250, '#8b8f99'); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) px(bossX + 22 + c * 56, G - 226 + r * 62, 36, 40, r === 2 && c === 1 ? '#3a2a1a' : '#cfe3ff');
      px(bossX - 10, G - 290, 210, 44, '#c0302a'); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `800 22px ${F}`; ctx.fillText('SECRÉTARIAT', bossX + 95, G - 268); ctx.textAlign = 'left';
      for (let k = 0; k < 3; k++) { const x = 520 - k * 130 + ((t * 40) % 60) * (k % 2 ? 1 : -1), hop = Math.abs(Math.sin(t * 5 + k)) * 10; px(x, G - 46 - hop, 30, 46, '#3f9b3a'); px(x + 4, G - 50 - hop, 22, 8, '#5cc254'); px(x + 6, G - 34 - hop, 6, 6, '#fff'); px(x + 18, G - 34 - hop, 6, 6, '#fff'); }
      const hx = 90 + (t * 120) % 360, jump = Math.abs(Math.sin(t * 3.2)) * 120, hy = G - 92 - jump; // l'électricien : casque jaune, salopette bleue
      px(hx, hy, 40, 14, '#f2b92e'); px(hx + 4, hy + 14, 32, 22, '#e8b48c'); px(hx + 24, hy + 20, 6, 6, '#17191f'); px(hx, hy + 36, 40, 34, '#2f6fed'); px(hx + 6, hy + 70, 10, 22, '#3a2a1a'); px(hx + 24, hy + 70, 10, 22, '#3a2a1a');
      if (Math.sin(t * 7) > 0) { ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hx + 44, hy + 40); ctx.lineTo(hx + 58, hy + 30); ctx.lineTo(hx + 52, hy + 44); ctx.lineTo(hx + 66, hy + 36); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, 64 + rows.length * 40);
      ctx.fillStyle = '#fff'; ctx.font = `900 40px ${F}`; ctx.fillText(name.toUpperCase(), 24, 38, W - 48);
      rows.forEach((r, i) => { const p = show(i); if (!p) return; ctx.globalAlpha = p; ctx.fillStyle = i === rows.length - 1 ? '#ffd23f' : '#fff'; ctx.font = `700 30px ${F}`; ctx.fillText(r, 24 + (1 - p) * 40, 84 + i * 40, W - 48); ctx.globalAlpha = 1; });
      void P; return true;
    }
    if (app === 'safari') {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = color; ctx.fillRect(0, 0, W, 78); dots(39);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(150, 16, W - 300, 46, 12); ctx.fill(); ctx.fillStyle = '#4b4e57'; ctx.textAlign = 'center'; ctx.font = `600 27px ${F}`; ctx.fillText(name, W / 2, 40, W - 340); ctx.textAlign = 'left';
      const y0 = 104, h = (H - y0 - 20) / Math.max(rows.length, 1);
      each((r, i, last) => { const y = y0 + i * h; ctx.fillStyle = last ? '#fdecea' : '#f3f4f6'; ctx.beginPath(); ctx.roundRect(40, y, W - 80, h - 14, 14); ctx.fill(); ctx.fillStyle = last ? '#c0302a' : '#17191f'; ctx.font = `${last ? 800 : 700} ${Math.min(50, h * 0.42)}px ${F}`; ctx.fillText(r, 70, y + (h - 14) / 2, W - 140); });
    } else if (app === 'banque') {
      ctx.fillStyle = '#f2f5f9'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = color; ctx.fillRect(0, 0, W, 120); dots(30);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `700 34px ${F}`; ctx.fillText(name, W / 2, 32, W - 240); ctx.font = `500 25px ${F}`; ctx.fillText('Comptes   Virements   Cartes', W / 2, 88); ctx.textAlign = 'left';
      const h = (H - 150) / Math.max(rows.length, 1);
      each((r, i, last) => { const [a, b = ''] = r.split(/\s*:\s*/), y = 136 + i * h; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(36, y, W - 72, h - 12, 12); ctx.fill(); ctx.fillStyle = '#17191f'; ctx.font = `600 ${Math.min(42, h * 0.4)}px ${F}`; ctx.fillText(a, 62, y + (h - 12) / 2, W * 0.5); ctx.textAlign = 'right'; ctx.fillStyle = /-|−/.test(b) ? '#c0302a' : '#1b7f4b'; ctx.font = `800 ${Math.min(last ? 52 : 42, h * 0.46)}px ${F}`; ctx.fillText(b, W - 62, y + (h - 12) / 2); ctx.textAlign = 'left'; });
    } else if (app === 'terminal' || app === 'code') {
      const code = app === 'code', M = '"Cascadia Code", Consolas, monospace', bar = 56;
      ctx.fillStyle = code ? '#1f2228' : '#101114'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = color; ctx.fillRect(0, 0, W, bar); dots(28);
      ctx.fillStyle = '#d7dae0'; ctx.textAlign = 'center'; ctx.font = `600 27px ${F}`; ctx.fillText(name, W / 2, 28, W - 240); ctx.textAlign = 'left';
      if (code) { ctx.fillStyle = '#2a2e36'; ctx.fillRect(0, bar, 70, H); }
      each((r, i, last) => { const y = bar + 52 + i * 76; if (code) { ctx.fillStyle = '#6b7280'; ctx.font = `500 30px ${M}`; ctx.fillText(String(i + 1), 24, y); } ctx.fillStyle = code ? (last ? '#f6c177' : '#9ecbff') : (last ? '#ff7b72' : '#7ee787'); ctx.font = `600 48px ${M}`; ctx.fillText(code ? r : `$ ${r}`, code ? 92 : 28, y, W - 120); });
    } else if (app === 'notes') {
      ctx.fillStyle = '#fffdf3'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#f6efd4'; ctx.fillRect(0, 0, 190, H); ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(16, 84, 158, 62, 10); ctx.fill(); dots(32);
      ctx.fillStyle = '#17191f'; ctx.font = `800 46px ${F}`; ctx.fillText(name, 226, 64, W - 260);
      each((r, i) => { ctx.fillStyle = '#17191f'; ctx.font = `500 40px ${F}`; ctx.fillText(`– ${r}`, 226, 150 + i * 70, W - 260); });
    } else if (app === 'finder') {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = color; ctx.fillRect(0, 0, W, 66); ctx.fillStyle = '#f0f0f3'; ctx.fillRect(0, 66, 180, H); dots(33);
      ctx.fillStyle = '#23252b'; ctx.textAlign = 'center'; ctx.font = `700 31px ${F}`; ctx.fillText(name, W / 2, 33, W - 240); ctx.textAlign = 'left'; ctx.fillStyle = '#6b6e77'; ctx.font = `600 25px ${F}`; ['Récents', 'Documents', 'Bureau'].forEach((t, i) => ctx.fillText(t, 26, 110 + i * 46));
      each((r, i) => { const y = 100 + i * 78; ctx.fillStyle = '#5aa7ef'; ctx.beginPath(); ctx.roundRect(214, y - 24, 56, 46, 7); ctx.fill(); ctx.fillStyle = '#17191f'; ctx.font = `600 40px ${F}`; ctx.fillText(r, 292, y, W - 320); });
    } else if (app === 'stats') {
      ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); dots(30); ctx.fillStyle = '#c9ccd6'; ctx.textAlign = 'center'; ctx.font = `600 31px ${F}`; ctx.fillText(name, W / 2, 30, W - 240);
      const [label = '', big = '', small = ''] = rows; ctx.font = `600 38px ${F}`; ctx.fillStyle = '#9096a8'; ctx.fillText(label, W / 2, 104, W - 80);
      ctx.fillStyle = '#6ee7a8'; ctx.font = `800 ${big.length > 7 ? 110 : 140}px ${F}`; ctx.fillText(count(big), W / 2, 220, W - 70); ctx.textAlign = 'left';
      if (small) { ctx.textAlign = 'center'; ctx.fillStyle = '#c9ccd6'; ctx.font = `500 34px ${F}`; ctx.fillText(small, W / 2, 310, W - 80); ctx.textAlign = 'left'; }
      ctx.strokeStyle = '#6ee7a8'; ctx.lineWidth = 7; ctx.beginPath(); for (let i = 0; i <= 14; i++) { const x = 60 + (W - 120) * i / 14, up = /^0\b/.test(big) ? 1 - i / 14 : i / 14, y = H - 40 - up * up * 150 - Math.sin(i * 1.7) * 9; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    } else if (app === 'discord') {
      ctx.fillStyle = '#313338'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = color; ctx.fillRect(0, 0, 190, H); ctx.fillStyle = '#1e1f24'; ctx.fillRect(0, 0, W, 62); dots(31);
      ctx.fillStyle = '#f2f3f5'; ctx.font = `700 31px ${F}`; ctx.fillText(`# ${name}`, 214, 31, W - 240); ctx.fillStyle = '#949ba4'; ctx.font = `500 25px ${F}`; ['# général', '# cours', '# entraide'].forEach((t, i) => ctx.fillText(t, 22, 106 + i * 44, 156));
      each((r, i) => { const y = 112 + i * 92; ctx.fillStyle = ['#5865f2', '#eb459e', '#3ba55c'][i % 3]; ctx.beginPath(); ctx.arc(244, y, 28, 0, 7); ctx.fill(); ctx.fillStyle = '#f2f3f5'; ctx.font = `600 38px ${F}`; ctx.fillText(r, 288, y, W - 310); });
    } else if (app === 'camera') {
      const g = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.7); g.addColorStop(0, '#39413a'); g.addColorStop(1, '#0c0e0c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < H; i += 6) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0, i, W, 2); }
      ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(46, 42, 14, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `700 32px ${F}`; ctx.fillText('REC', 72, 43); ctx.textAlign = 'right'; ctx.fillText(name, W - 30, 43, W - 200); ctx.textAlign = 'left';
      each((r, i) => { ctx.fillStyle = '#e8ffe8'; ctx.font = `700 ${i ? 42 : 76}px ${F}`; ctx.textAlign = 'center'; ctx.fillText(r, W / 2, 150 + i * 88, W - 80); ctx.textAlign = 'left'; });
    } else if (app === 'agenda') {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = color; ctx.fillRect(0, 0, W, 76); dots(38); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `700 33px ${F}`; ctx.fillText(name, W / 2, 38, W - 240); ctx.textAlign = 'left';
      const h = (H - 100) / Math.max(rows.length, 1);
      each((r, i) => { const [a, b = ''] = r.split(/\s*:\s*/), y = 92 + i * h; ctx.fillStyle = '#fbe5e3'; ctx.beginPath(); ctx.roundRect(36, y, W - 72, h - 12, 10); ctx.fill(); ctx.fillStyle = color; ctx.fillRect(36, y, 10, h - 12); ctx.fillStyle = '#17191f'; ctx.font = `700 ${Math.min(40, h * 0.42)}px ${F}`; ctx.fillText(b ? `${a}   ${b}` : a, 66, y + (h - 12) / 2, W - 120); });
    } else return false;
    return true;
  }
  function drawApp(W, H, app, name, rows) {
    const [color, tabs] = APPS[app], t = S.boardT, F = '"Inter", "Segoe UI", sans-serif', show = (i) => Math.max(0, Math.min(1, (t - 0.15 - i * 0.24) / 0.28));
    if (drawTool(W, H, app, name, rows, color, F, show)) { tex.needsUpdate = true; return; }
    ctx.fillStyle = '#e9e9ec'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = color; ctx.fillRect(0, 0, W, 112);
    for (const [i, c] of ['#ff5f57', '#febc2e', '#28c840'].entries()) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(30 + i * 28, 30, 9, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.font = `700 32px ${F}`; ctx.fillText(name, W / 2, 30, W - 240);
    ctx.textAlign = 'left'; ctx.font = `500 25px ${F}`; ctx.fillText(tabs, 28, 84, W - 56);
    const top = 112;
    if (app === 'word') {
      ctx.fillStyle = '#f7f7f8'; ctx.fillRect(0, top, W, 44); ctx.fillStyle = '#b9bac0'; for (let i = 0; i < 9; i++) ctx.fillRect(28 + i * 52, top + 13, 32, 18);
      const x = 70, w = W - 140, y = top + 62; ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, H - y);
      rows.forEach((r, i) => { const p = show(i); if (!p) return; ctx.globalAlpha = p; ctx.fillStyle = '#17191f'; ctx.font = `${i ? 500 : 800} ${i ? 40 : 48}px ${F}`; ctx.fillText(r, x + 46, y + 56 + i * 72, w - 92); ctx.globalAlpha = 1; });
    } else if (app === 'powerpoint') {
      ctx.fillStyle = '#dcdce0'; ctx.fillRect(0, top, 170, H - top);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = '#fff'; ctx.fillRect(24, top + 22 + i * 112, 122, 86); if (!i) { ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.strokeRect(24, top + 22, 122, 86); } }
      const x = 200, y = top + 28, w = W - 230, h = H - y - 28; ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); ctx.fillStyle = color; ctx.fillRect(x, y, w, 16);
      rows.forEach((r, i) => { const p = show(i); if (!p) return; ctx.globalAlpha = p; ctx.fillStyle = '#17191f'; ctx.font = `${i ? 500 : 800} ${i ? 38 : 50}px ${F}`; ctx.fillText(i ? `• ${r}` : r, x + 34, y + 72 + i * 74, w - 68); ctx.globalAlpha = 1; });
    } else if (app === 'excel') {
      const y0 = top + 12, rowH = Math.min(84, (H - y0 - 12) / Math.max(rows.length + 1, 4)), split = W * 0.62; ctx.fillStyle = '#fff'; ctx.fillRect(0, y0, W, H - y0);
      ctx.fillStyle = '#eef3ef'; ctx.fillRect(0, y0, W, rowH * 0.6); ctx.fillStyle = '#51605a'; ctx.font = `600 24px ${F}`; ctx.fillText('A', 150, y0 + rowH * 0.3); ctx.fillText('B', split + 40, y0 + rowH * 0.3);
      rows.forEach((r, i) => {
        const p = show(i), y = y0 + rowH * 0.6 + i * rowH, [a, b = ''] = r.split(/\s*:\s*/), last = i === rows.length - 1 && rows.length > 1;
        if (p) { ctx.globalAlpha = p; if (last) { ctx.fillStyle = '#d9f0df'; ctx.fillRect(0, y, W, rowH); } ctx.fillStyle = '#17191f'; ctx.font = `${last ? 800 : 600} ${Math.min(42, rowH * 0.56)}px ${F}`; ctx.fillText(a, 66, y + rowH / 2, split - 90); ctx.fillText(b, split + 24, y + rowH / 2, W - split - 40); ctx.globalAlpha = 1; }
        ctx.strokeStyle = '#d4d9d6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, y + rowH); ctx.lineTo(W, y + rowH); ctx.stroke();
      });
      ctx.strokeStyle = '#d4d9d6'; ctx.beginPath(); ctx.moveTo(split, y0); ctx.lineTo(split, H); ctx.stroke(); ctx.fillStyle = '#eef3ef'; ctx.fillRect(0, y0 + rowH * 0.6, 44, H);
    } else {
      ctx.fillStyle = '#25262b'; ctx.fillRect(0, top, 150, H - top); ctx.fillStyle = '#4a4c55'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.roundRect(40, top + 24 + i * 72, 70, 50, 10); ctx.fill(); }
      const x = 200, y = top + 26, w = W - 250, h = H - y - 26, g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#00c4cc'); g.addColorStop(1, '#7d2ae8');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.textAlign = 'center';
      rows.forEach((r, i) => { const p = show(i); if (!p) return; ctx.globalAlpha = p; ctx.fillStyle = '#fff'; ctx.font = `${i ? 600 : 800} ${i ? 38 : 56}px ${F}`; ctx.fillText(r, x + w / 2, y + 90 + i * 78, w - 50); ctx.globalAlpha = 1; });
      ctx.textAlign = 'left';
    }
    tex.needsUpdate = true;
  }
  function drawBoard(W, H) { // écran lisible à l'image : un titre et quelques lignes en grand
    const app = /^([\p{L}]+)\s*:\s*(.*)$/iu.exec(S.board[0]), kind = app && (ALIAS[app[1].toLowerCase()] || app[1].toLowerCase());
    if (app && APPS[kind]) { drawApp(W, H, kind, app[2], S.board.slice(1)); return; }
    const [title, ...rows] = S.board, t = S.boardT, out = (x) => 1 - (1 - x) ** 3, mail = /mail|message/i.test(title);
    const sky = ctx.createLinearGradient(0, 0, W, H); sky.addColorStop(0, '#3a2f7a'); sky.addColorStop(1, '#c0537a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(20,22,27,.55)'; ctx.fillRect(0, 0, W, 34);
    ctx.fillStyle = '#fff'; ctx.font = '600 22px "Inter", "Segoe UI", sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(mail ? 'Mail   Fichier   Édition' : 'Finder   Fichier   Édition', 24, 18);
    const X = 26, Y = 52, Wn = W - 52, Hn = H - 76;
    ctx.fillStyle = '#f5f5f7'; ctx.beginPath(); ctx.roundRect(X, Y, Wn, Hn, 18); ctx.fill();
    ctx.fillStyle = '#e4e4e8'; ctx.beginPath(); ctx.roundRect(X, Y, Wn, 66, [18, 18, 0, 0]); ctx.fill();
    for (const [i, c] of ['#ff5f57', '#febc2e', '#28c840'].entries()) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X + 28 + i * 28, Y + 33, 9, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#23252b'; ctx.textAlign = 'center'; ctx.font = '700 34px "Inter", "Segoe UI", sans-serif'; ctx.fillText(title, W / 2, Y + 34, Wn - 220);
    const side = mail ? 170 : 0;
    if (mail) { ctx.fillStyle = '#dcdce2'; ctx.fillRect(X, Y + 66, side, Hn - 66); ctx.fillStyle = '#2f6fed'; ctx.beginPath(); ctx.roundRect(X + 14, Y + 86, side - 28, 48, 10); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '600 26px "Inter", "Segoe UI", sans-serif'; ctx.fillText('Réception', X + 28, Y + 111); }
    const left = X + side + 24, width = Wn - side - 48, step = (Hn - 92) / Math.max(rows.length, 1);
    ctx.textAlign = 'left';
    rows.forEach((r, i) => { // les lignes arrivent l'une après l'autre, le dernier chiffre compte
      const p = Math.max(0, Math.min(1, (t - 0.2 - i * 0.24) / 0.28)), last = i === rows.length - 1 && rows.length > 1;
      if (!p) return;
      let text = r;
      if (last) text = r.replace(/\d[\d ]*\d|\d/, (n) => { const v = Number(n.replace(/\s/g, '')); return Math.round(v * out(Math.min(1, (t - 0.45 - i * 0.24) / 0.5))).toLocaleString('fr-FR').replace(/\u202f/g, ' '); });
      const y = Y + 80 + step * i, h = step - 12;
      ctx.globalAlpha = p; ctx.fillStyle = last ? '#fff3cd' : '#ffffff'; ctx.beginPath(); ctx.roundRect(left + (1 - out(p)) * 70, y, width, h, 14); ctx.fill();
      ctx.fillStyle = '#17191f'; ctx.font = `${last ? 800 : 700} ${Math.min(58, h * 0.52)}px "Inter", "Segoe UI", sans-serif`;
      ctx.fillText(text, left + 26 + (1 - out(p)) * 70, y + h / 2, width - 52);
      ctx.globalAlpha = 1;
    });
    ctx.textAlign = 'left'; tex.needsUpdate = true;
  }
  function draw() {
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    if (S.board) { drawBoard(W, H); return; }
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
      S.board = null;
      if (ch === '\b') S.text = S.text.slice(0, -1); else S.text += ch;
      const i = keyOf(ch);
      heat[i] = 1;
      S.caret = 0; draw();
      return base[i][0] < 0 ? 'L' : 'R';
    },
    clear(title) { S.text = ''; S.board = null; if (title) S.title = title; draw(); },
    show(lines) { S.board = lines; S.boardT = 0; draw(); },
    update(dt) {
      let dirty = false;
      for (let i = 0; i < heat.length; i++) if (heat[i] > 0) { heat[i] = Math.max(0, heat[i] - dt * 9); put(i); dirty = true; }
      if (dirty) { keys.instanceMatrix.needsUpdate = true; if (keys.instanceColor) keys.instanceColor.needsUpdate = true; }
      if (S.board && S.boardT < (/^(chat|chatgpt|assistant|jeu|game|claude|claudecode)\s*:/i.test(S.board[0]) ? 30 : 2)) { S.boardT += dt; draw(); } // la discussion et le jeu restent vivants
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
