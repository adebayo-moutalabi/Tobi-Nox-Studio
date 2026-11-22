// Image du film : ambiance du soir, vignettage et écrans plein cadre (factures, chiffres).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const NIGHT = '#0b0a18';
const FONT = '"Inter", "Segoe UI", sans-serif', DISPLAY = '"Fraunces", Georgia, serif', NOX = '#f2b92e';
const ease = (t) => { const c = 1.7, u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; }; // arrive, dépasse un peu, puis se pose
// Mouvement des écrans : une entrée qui ralentit en arrivant, une sortie qui accélère en partant, jamais de mouvement linéaire.
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (t) => 1 - (1 - clamp01(t)) ** 3;
const easeIn = (t) => clamp01(t) ** 3;
const pop = (t) => ease(clamp01(t)); // petit rebond, pour ce qui doit attirer l'œil
const ENTER = 0.3, LEAVE = 0.16, STEP = 0.08; // durées en secondes : entrée, sortie, décalage entre deux éléments

// Chaque type d'écran a sa couleur : on comprend d'un coup d'œil s'il s'agit du temps, d'un message ou d'argent.
const CARDS = {
  base: { bg: '#16181c', top: '#1e2126', ink: '#f4f1ec', big: NOX, small: '#a8a49c' },
  temps: { bg: '#102a3c', top: '#173a50', ink: '#e6f7ff', big: '#8feaff', small: '#a9d6e6' },
  message: { bg: '#143427', top: '#1b4634', ink: '#edfff5', big: '#8df0b8', small: '#b6e8cc' },
  argent: { bg: '#351a1c', top: '#4a2124', ink: '#fff0ee', big: '#ffb35c', small: '#e5bcb6' },
};

function canvasTexture(w, h) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx: canvas.getContext('2d'), tex };
}
const overlay = (map, order) => new THREE.MeshBasicMaterial({ map, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false });

// Ombres de contact (les objets se posent vraiment) et halo des écrans.
function createPost(v) {
  const { renderer, scene, camera } = v;
  const size = renderer.getDrawingBufferSize(new THREE.Vector2()), now = new THREE.Vector2();
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setPixelRatio(1); composer.setSize(size.x, size.y);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, size.x, size.y);
  ao.updateGtaoMaterial({ radius: 0.2, distanceExponent: 1.3, thickness: 1, scale: 1.1, samples: 8, distanceFallOff: 1, screenSpaceRadius: false });
  ao.blendIntensity = 0.85;
  composer.addPass(ao);
  composer.addPass(new UnrealBloomPass(size.clone(), 0.14, 0.5, 0.94));
  composer.addPass(new OutputPass());

  v.composer = composer;
  return () => {
    renderer.getDrawingBufferSize(now);
    if (!now.equals(size)) { size.copy(now); composer.setPixelRatio(1); composer.setSize(size.x, size.y); }
    composer.render();
  };
}

export function createLook(v) {
  const { scene, camera, lights, renderer } = v;
  scene.add(camera);
  const ui = new THREE.Scene(), uiCam = new THREE.PerspectiveCamera(40, 1, 0.01, 10); // calque posé sur l'image finale
  let post = null, polish = false, exposure = 1;
  v.render = () => {
    if (polish && v.offline) { post ||= createPost(v); post(); } else renderer.render(scene, camera); // les passes coûteuses sont réservées à l'export : la lecture reste fluide
    renderer.autoClear = false; renderer.render(ui, uiCam); renderer.autoClear = true;
  };

  // Lumières du soir : écran froid, lampe chaude, mur violet
  const soir = new THREE.Group(); soir.visible = false; scene.add(soir);
  const lamp = new THREE.SpotLight('#ffa873', 2.4, 5, 0.85, 0.75, 1.3);
  lamp.position.set(-0.1, 2.25, -0.3); lamp.target.position.set(0.95, 0.75, -0.9);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0006; lamp.shadow.normalBias = 0.02; lamp.shadow.radius = 6;
  const wash = new THREE.PointLight('#7f70c9', 1.1, 7, 1.4); wash.position.set(0.1, 2.1, 0.9);
  const back = new THREE.PointLight('#6a5fc0', 0.5, 4, 1.5); back.position.set(0.1, 1.5, -1.6);
  const screen = new THREE.PointLight('#a9cfff', 0.7, 1.7, 1.5); screen.position.set(1.0, 1.02, -1.0);
  const face = new THREE.PointLight('#ffd9b8', 3, 6, 1.1); face.position.set(0.25, 0.1, 0.1); camera.add(face); face.visible = false;
  const bedside = new THREE.PointLight('#ffb27a', 1.8, 3.2, 1.4); bedside.position.set(-0.2, 1.65, 0.75); // lampe de chevet : le lit reste lisible
  soir.add(lamp, lamp.target, wash, back, screen, bedside);
  const day = { bg: scene.background, hemi: lights.hemi.intensity, hc: lights.hemi.color.clone(), hg: lights.hemi.groundColor.clone(), env: scene.environmentIntensity, key: lights.key.intensity, fill: lights.fill.intensity };

  // Vignettage : les bords s'assombrissent, le regard reste au centre
  const vg = canvasTexture(512, 512);
  const g = vg.ctx.createRadialGradient(256, 256, 120, 256, 256, 370);
  g.addColorStop(0, 'rgba(6,5,16,0)'); g.addColorStop(1, 'rgba(6,5,16,.72)');
  vg.ctx.fillStyle = g; vg.ctx.fillRect(0, 0, 512, 512); vg.tex.needsUpdate = true;
  const vignette = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), overlay(vg.tex));
  vignette.renderOrder = 950; vignette.position.z = -0.4; vignette.visible = false; vignette.frustumCulled = false; ui.add(vignette);

  // Écran plein cadre
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: NIGHT, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  backdrop.renderOrder = 955; backdrop.position.z = -0.45; backdrop.visible = false; backdrop.frustumCulled = false; ui.add(backdrop);
  const cd = canvasTexture(900, 1100);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1, 1100 / 900), overlay(cd.tex));
  card.renderOrder = 960; card.position.z = -0.42; card.visible = false; card.frustumCulled = false; ui.add(card);
  const I = { on: false, t: 0, title: '', big: '', small: '', value: null, out: -1 };


  // Écrans d'applications (audit du 22 novembre 2026) : ECRAN type | ligne | ligne…
  // Chaque ligne peut se découper en champs avec « ; ». Les éléments arrivent l'un après l'autre.
  const wrap = (ctx, text, max) => { const rows = []; let row = ''; for (const w of String(text).split(' ')) { if (ctx.measureText(`${row} ${w}`).width > max && row) { rows.push(row); row = w; } else row = row ? `${row} ${w}` : w; } rows.push(row); return rows; };
  const fields = (r) => String(r || '').split(';').map((x) => x.trim());
  function phone(ctx, W, H, bg, edge = '#30343d') { ctx.fillStyle = bg; ctx.strokeStyle = edge; ctx.lineWidth = 12; ctx.beginPath(); ctx.roundRect(60, 10, W - 120, H - 20, 70); ctx.fill(); ctx.stroke(); }
  function drawScreen(ctx, W, H) {
    const k = I.sk, R = I.rows, T = I.t, show = (n) => easeOut((T - 0.12 - n * 0.22) / 0.25); // une ligne toutes les 0,22 s
    const rise = (n) => (1 - show(n)) * 30;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if (k === 'vinted') { // annonces de seconde main
      phone(ctx, W, H, '#f6f7f7', '#d5d9da');
      ctx.fillStyle = '#0b8b8f'; ctx.beginPath(); ctx.roundRect(72, 22, W - 144, 130, [58, 58, 0, 0]); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `700 50px ${FONT}`; ctx.fillText(I.title || 'Mes annonces', 110, 88);
      R.forEach((r, n) => {
        const [name, price, badge] = fields(r), y = 190 + n * 285 + rise(n);
        ctx.save(); ctx.globalAlpha = show(n);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(100, y, W - 200, 255, 26); ctx.fill();
        ctx.fillStyle = ['#c9b79c', '#9db3c9', '#c99da8', '#a9c99d'][n % 4]; ctx.beginPath(); ctx.roundRect(124, y + 24, 200, 207, 18); ctx.fill();
        ctx.fillStyle = '#1d2326'; ctx.font = `600 40px ${FONT}`; wrap(ctx, name, W - 520).slice(0, 2).forEach((l, i) => ctx.fillText(l, 350, y + 62 + i * 46));
        ctx.fillStyle = '#0b8b8f'; ctx.font = `700 54px ${FONT}`; ctx.fillText(price || '', 350, y + 175);
        if (badge) { const red = /signal/i.test(badge); ctx.font = `700 32px ${FONT}`; const bw = ctx.measureText(badge).width + 40; ctx.fillStyle = red ? '#d64541' : '#2e9e5b'; ctx.beginPath(); ctx.roundRect(W - 140 - bw, y + 150, bw, 54, 27); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(badge, W - 120 - bw, y + 178); }
        ctx.restore();
      });
      return;
    }
    if (k === 'appel') { // appel entrant ou en cours : nom, minuteur, onde de voix
      const [name, state] = fields(R[0]), live = !/entrant/i.test(state || '');
      phone(ctx, W, H, '#14171f');
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#24314a'); g.addColorStop(1, '#0f1219'); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(72, 22, W - 144, H - 44, 58); ctx.fill();
      ctx.textAlign = 'center';
      const r = 120 * (1 + (live ? 0 : 0.06 * Math.sin(T * 9))); ctx.fillStyle = '#5b6b86'; ctx.beginPath(); ctx.arc(W / 2, 300, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `700 110px ${FONT}`; ctx.fillText((name || '?')[0].toUpperCase(), W / 2, 305);
      ctx.font = `700 64px ${FONT}`; ctx.fillText(name || '', W / 2, 500, W - 200);
      const sec = Math.floor(T) + (Number(fields(R[0])[2]) || 0);
      ctx.fillStyle = '#a9b6cc'; ctx.font = `500 40px ${FONT}`; ctx.fillText(live ? `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}` : state || 'Appel entrant', W / 2, 570);
      if (live) for (let i = 0; i < 15; i++) { const h = 20 + 70 * Math.abs(Math.sin(T * 7 + i * 1.3) * Math.sin(T * 3 + i)); ctx.fillStyle = '#7fd1ff'; ctx.beginPath(); ctx.roundRect(W / 2 - 280 + i * 40, 700 - h / 2, 18, h, 9); ctx.fill(); }
      R.slice(1).forEach((line, n) => { ctx.save(); ctx.globalAlpha = show(n + 1); ctx.fillStyle = '#e9eef7'; ctx.font = `500 38px ${FONT}`; wrap(ctx, line, W - 240).forEach((l, i) => ctx.fillText(l, W / 2, 790 + n * 60 + i * 44 + rise(n + 1))); ctx.restore(); });
      for (const [x, c] of live ? [[W / 2, '#e5484d']] : [[W / 2 - 170, '#e5484d'], [W / 2 + 170, '#2fbf71']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, H - 130, 62, 0, 7); ctx.fill(); }
      ctx.textAlign = 'left'; return;
    }
    if (k === 'document') { // relevé de notes, contrat : papier officiel et tampon
      ctx.fillStyle = '#fbfaf6'; ctx.strokeStyle = '#d8d3c6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(70, 20, W - 140, H - 40, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2b3a67'; ctx.fillRect(70, 20, W - 140, 16);
      ctx.textAlign = 'center'; ctx.fillStyle = '#1f2533'; ctx.font = `700 48px ${DISPLAY}`; ctx.fillText(I.title || 'Document', W / 2, 110, W - 200);
      ctx.strokeStyle = '#c9c3b5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(130, 160); ctx.lineTo(W - 130, 160); ctx.stroke();
      const [big, ...rest] = R;
      ctx.save(); ctx.globalAlpha = show(0); const kb = 0.7 + 0.3 * pop((T - 0.15) / 0.3); ctx.translate(W / 2, 340); ctx.scale(kb, kb);
      ctx.fillStyle = /^[0-9]/.test(big || '') && Number.parseFloat(big) < 10 ? '#c0392b' : '#1f2533'; ctx.font = `700 ${Math.min(190, Math.floor((W - 200) / Math.max(1, String(big).length) * 1.7))}px ${DISPLAY}`; ctx.fillText(big || '', 0, 0, W - 200); ctx.restore();
      ctx.textAlign = 'left';
      rest.forEach((line, n) => { if (/^tampon\s*:/i.test(line)) return; ctx.save(); ctx.globalAlpha = show(n + 1); ctx.fillStyle = '#3a4152'; ctx.font = `italic 500 40px ${FONT}`; wrap(ctx, line, W - 280).forEach((l, i) => ctx.fillText(l, 140, 560 + n * 120 + i * 48 + rise(n + 1))); ctx.restore(); });
      const st = R.find((x) => /^tampon\s*:/i.test(x)); if (st) { const u = pop((T - 0.9) / 0.25); if (u > 0) { ctx.save(); ctx.translate(W - 260, H - 210); ctx.rotate(-0.22); ctx.scale(1.6 - 0.6 * u, 1.6 - 0.6 * u); ctx.globalAlpha = Math.min(1, u) * 0.85; ctx.strokeStyle = '#c0392b'; ctx.fillStyle = '#c0392b'; ctx.lineWidth = 8; ctx.font = `800 46px ${FONT}`; const s = st.replace(/^tampon\s*:\s*/i, '').toUpperCase(), w = ctx.measureText(s).width + 50; ctx.strokeRect(-w / 2, -50, w, 100); ctx.textAlign = 'center'; ctx.fillText(s, 0, 4); ctx.restore(); } }
      return;
    }
    if (k === 'tiktok') { // vidéo verticale : compte, légende, compteur de vues qui s'emballe
      const [acc, cap, views, notif] = R;
      phone(ctx, W, H, '#050507');
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2a2140'); g.addColorStop(1, '#101828'); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(72, 22, W - 144, H - 44, 58); ctx.fill();
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.font = `700 260px ${FONT}`; ctx.fillText('▶', W / 2, H / 2 - 60);
      const m = /([\d,.]+)\s*(\D*)/.exec(views || ''), target = m ? Number.parseFloat(m[1].replace(',', '.')) : 0, f = Math.min(1, Math.max(0, (T - 0.3) / 1.1));
      const now = m ? `${(target * easeOut(f)).toFixed(/[.,]/.test(m[1]) ? 1 : 0).replace('.', ',')}${m[2] ? ` ${m[2].trim()}` : ''}` : '';
      ctx.fillStyle = '#fff'; ctx.font = `800 120px ${FONT}`; ctx.fillText(now, W / 2, 620);
      ctx.fillStyle = '#c9c4d8'; ctx.font = `600 40px ${FONT}`; ctx.fillText('vues', W / 2, 705);
      for (const [n, ic] of ['♥', '💬', '↗'].entries()) { ctx.fillStyle = '#fff'; ctx.font = `600 64px ${FONT}`; ctx.fillText(ic, W - 150, 560 + n * 130); }
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = `700 46px ${FONT}`; ctx.fillText(acc || '', 110, H - 230, W - 300);
      ctx.fillStyle = '#e6e3ee'; ctx.font = `500 38px ${FONT}`; wrap(ctx, cap || '', W - 320).slice(0, 2).forEach((l, i) => ctx.fillText(l, 110, H - 170 + i * 46));
      if (notif) { const u = easeOut((T - 1.3) / 0.3); if (u > 0) { ctx.save(); ctx.translate(0, (1 - u) * -160); ctx.globalAlpha = u; ctx.fillStyle = 'rgba(245,245,250,.96)'; ctx.beginPath(); ctx.roundRect(100, 60, W - 200, 130, 30); ctx.fill(); ctx.fillStyle = '#16131f'; ctx.font = `600 36px ${FONT}`; wrap(ctx, notif, W - 280).slice(0, 2).forEach((l, i) => ctx.fillText(l, 140, 105 + i * 44)); ctx.restore(); } }
      return;
    }
    if (k === 'scan') { // le regard de Nox : viseur cyan par-dessus l'image
      const cy = '#5ff2ff', corner = (x, y, sx, sy) => { ctx.beginPath(); ctx.moveTo(x, y + sy * 70); ctx.lineTo(x, y); ctx.lineTo(x + sx * 70, y); ctx.stroke(); };
      ctx.strokeStyle = cy; ctx.lineWidth = 8; ctx.globalAlpha = 0.9;
      corner(80, 80, 1, 1); corner(W - 80, 80, -1, 1); corner(80, H - 80, 1, -1); corner(W - 80, H - 80, -1, -1);
      const sy = 120 + ((T * 520) % (H - 240)); ctx.globalAlpha = 0.35; ctx.fillStyle = cy; ctx.fillRect(90, sy, W - 180, 6); ctx.globalAlpha = 1;
      ctx.fillStyle = cy; ctx.font = `700 40px ${FONT}`; ctx.fillText(I.title || 'ANALYSE', 120, 150);
      R.forEach((r, n) => { const [label, val] = fields(r); ctx.save(); ctx.globalAlpha = show(n); const y = 300 + n * 150 + rise(n); ctx.fillStyle = 'rgba(6,20,28,.62)'; ctx.beginPath(); ctx.roundRect(110, y - 55, W - 220, 115, 18); ctx.fill(); ctx.fillStyle = '#bff8ff'; ctx.font = `600 34px ${FONT}`; ctx.fillText(label, 140, y - 18); ctx.fillStyle = /bpm|alerte|!/i.test(r) ? '#ff5b5b' : '#fff'; ctx.font = `800 46px ${FONT}`; ctx.fillText(val || '', 140, y + 28, W - 300); ctx.restore(); });
      return;
    }
    if (k === 'banque') { // appli bancaire : le solde, puis les dernières dépenses
      phone(ctx, W, H, '#f3f5f9', '#d3d8e2');
      ctx.fillStyle = '#1d3f8f'; ctx.beginPath(); ctx.roundRect(72, 22, W - 144, 330, [58, 58, 30, 30]); ctx.fill();
      ctx.fillStyle = '#cfe0ff'; ctx.font = `600 36px ${FONT}`; ctx.fillText(I.title || 'Compte courant', 120, 100);
      const [solde, ...ops] = R; ctx.save(); const kb = 0.75 + 0.25 * pop((T - 0.1) / 0.3); ctx.translate(120, 225); ctx.scale(kb, kb); ctx.fillStyle = /-|^0|^[0-4],/.test(solde || '') ? '#ff8a80' : '#fff'; ctx.font = `800 110px ${FONT}`; ctx.fillText(solde || '', 0, 0, W - 260); ctx.restore();
      ops.forEach((r, n) => { const [what, amount] = fields(r), y = 430 + n * 140 + rise(n + 1); ctx.save(); ctx.globalAlpha = show(n + 1); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(100, y, W - 200, 116, 22); ctx.fill(); ctx.fillStyle = '#1e2430'; ctx.font = `600 38px ${FONT}`; ctx.fillText(what, 135, y + 58, W - 470); ctx.textAlign = 'right'; ctx.fillStyle = /^-/.test(amount || '') ? '#d64541' : '#2e9e5b'; ctx.font = `700 40px ${FONT}`; ctx.fillText(amount || '', W - 135, y + 58); ctx.textAlign = 'left'; ctx.restore(); });
      return;
    }
    if (k === 'interphone') { // scan du visage à l'entrée : accès refusé
      ctx.fillStyle = '#0d1014'; ctx.strokeStyle = '#3a3f47'; ctx.lineWidth = 14; ctx.beginPath(); ctx.roundRect(90, 20, W - 180, H - 40, 40); ctx.fill(); ctx.stroke();
      const [verdict, ...rest] = R, bad = !/autoris|ok|bienvenue/i.test(verdict || ''), col = bad ? '#ff4d4d' : '#3ddc84';
      ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.setLineDash([22, 14]); ctx.beginPath(); ctx.ellipse(W / 2, 330, 170, 215, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 0.5; ctx.fillStyle = col; ctx.fillRect(W / 2 - 170, 130 + ((T * 300) % 400), 340, 5); ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; const u = pop((T - 0.5) / 0.25); if (u > 0) { ctx.save(); ctx.translate(W / 2, 640); ctx.scale(u, u); ctx.fillStyle = col; ctx.font = `800 70px ${FONT}`; ctx.fillText(verdict || '', 0, 0, W - 220); ctx.restore(); }
      rest.forEach((line, n) => { ctx.save(); ctx.globalAlpha = show(n + 3); ctx.fillStyle = '#e8ecf2'; ctx.font = `500 38px ${FONT}`; wrap(ctx, line, W - 280).forEach((l, i) => ctx.fillText(l, W / 2, 760 + n * 100 + i * 44 + rise(n + 3))); ctx.restore(); });
      ctx.textAlign = 'left'; return;
    }
    if (k === 'rencontre') { // profil d'appli de rencontre
      const [name, bio, badge] = R;
      phone(ctx, W, H, '#fff', '#e3dfe4');
      const g = ctx.createLinearGradient(0, 40, 0, 560); g.addColorStop(0, '#f6c1cf'); g.addColorStop(1, '#f39a6b'); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(100, 50, W - 200, 520, 40); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(W / 2, 250, 95, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(W / 2, 520, 190, 150, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#1d1720'; ctx.font = `800 58px ${FONT}`; ctx.fillText(name || '', 120, 650, W - 240);
      ctx.save(); ctx.globalAlpha = show(1); ctx.fillStyle = '#4a4250'; ctx.font = `500 38px ${FONT}`; wrap(ctx, bio || '', W - 260).slice(0, 5).forEach((l, i) => ctx.fillText(l, 120, 730 + i * 48 + rise(1))); ctx.restore();
      if (badge) { const u = pop((T - 0.9) / 0.28); if (u > 0) { ctx.save(); ctx.translate(W - 250, 120); ctx.scale(u, u); ctx.fillStyle = '#e5486e'; ctx.font = `800 40px ${FONT}`; const bw = ctx.measureText(badge).width + 50; ctx.beginPath(); ctx.roundRect(-bw / 2, -38, bw, 76, 38); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(badge, 0, 2); ctx.restore(); } }
      return;
    }
    // type inconnu : liste simple
    ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.roundRect(10, 10, W - 20, H - 20, 44); ctx.fill();
    ctx.fillStyle = '#f4f1ec'; ctx.font = `600 44px ${FONT}`; R.forEach((r, n) => ctx.fillText(r, 80, 160 + n * 90, W - 160));
  }
  function drawCard(f) {
    const { ctx, canvas, tex } = cd, W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (I.kind === 'ecran') { ctx.save(); drawScreen(ctx, W, H); ctx.restore(); tex.needsUpdate = true; return; }
    if (I.kind === 'tel') { // une vraie conversation : le contact en haut, les bulles qui arrivent une par une
      const top = 150, X = 72, R = W - X;
      ctx.fillStyle = '#0b141a'; ctx.strokeStyle = '#30343d'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.roundRect(X - 12, 10, R - X + 24, H - 20, 70); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1f2c34'; ctx.beginPath(); ctx.roundRect(X, 22, R - X, top, [58, 58, 0, 0]); ctx.fill();
      ctx.fillStyle = '#6b7c85'; ctx.beginPath(); ctx.arc(X + 74, 96, 40, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 42px ${FONT}`; ctx.fillText(I.title[0].toUpperCase(), X + 74, 98);
      ctx.textAlign = 'left'; ctx.font = `600 44px ${FONT}`; ctx.fillText(I.title, X + 134, 78, R - X - 170);
      ctx.fillStyle = '#8fa2ad'; ctx.font = `400 30px ${FONT}`; ctx.fillText('en ligne', X + 134, 122);
      let y = top + 66;
      I.chat.forEach((m, n) => {
        if (I.t < n * 0.8) {
          if (!m.me && n > 0 && I.t > n * 0.8 - 0.5 && I.t > (n - 1) * 0.8 + 0.3) { // l'autre écrit : trois points qui sautillent
            ctx.fillStyle = '#202c33'; ctx.beginPath(); ctx.roundRect(X + 34, y, 132, 70, 24); ctx.fill();
            for (let k = 0; k < 3; k++) { ctx.fillStyle = '#8fa2ad'; ctx.beginPath(); ctx.arc(X + 72 + k * 28, y + 35 - 7 * Math.max(0, Math.sin(I.t * 11 - k * 0.9)), 8, 0, 7); ctx.fill(); }
          }
          return;
        }
        const u = (I.t - n * 0.8) / 0.26, k = 0.82 + 0.18 * pop(u);
        const size = 42, max = R - X - 190; ctx.font = `500 ${size}px ${FONT}`;
        const rows = []; let row = '';
        for (const w of m.text.split(' ')) { if (ctx.measureText(`${row} ${w}`).width > max && row) { rows.push(row); row = w; } else row = row ? `${row} ${w}` : w; }
        rows.push(row);
        const stamp = m.time ? (m.me ? `${m.time} ✓✓` : m.time) : '', sw = stamp ? stamp.length * 15 + 16 : 0;
        const bw = Math.max(sw + 40, ...rows.map((r) => ctx.measureText(r).width + 56)), bh = rows.length * size * 1.28 + 40 + (stamp ? 26 : 0), bx = m.me ? R - bw - 34 : X + 34;
        const ox = m.me ? bx + bw : bx; // la bulle grandit depuis le coin d'où elle part
        ctx.save(); ctx.globalAlpha = easeOut(u * 1.6); ctx.translate(ox, y + bh + (1 - easeOut(u)) * 26); ctx.scale(k, k); ctx.translate(-ox, -(y + bh));
        ctx.fillStyle = m.me ? '#005c4b' : '#202c33'; ctx.beginPath(); ctx.roundRect(bx, y, bw, bh, 24); ctx.fill();
        ctx.fillStyle = '#e9edef'; rows.forEach((r, k) => ctx.fillText(r, bx + 28, y + 20 + size * 0.58 + k * size * 1.28));
        if (stamp) { ctx.textAlign = 'right'; ctx.font = `400 25px ${FONT}`; ctx.fillStyle = m.me ? '#a8d8cc' : '#8fa2ad'; ctx.fillText(stamp, bx + bw - 20, y + bh - 22); ctx.textAlign = 'left'; ctx.font = `500 ${size}px ${FONT}`; }
        ctx.restore();
        y += bh + 24;
      });
      ctx.fillStyle = '#1f2c34'; ctx.beginPath(); ctx.roundRect(X + 30, H - 112, R - X - 60, 66, 33); ctx.fill();
      ctx.fillStyle = '#8fa2ad'; ctx.font = `400 30px ${FONT}`; ctx.fillText('Message', X + 66, H - 78);
      tex.needsUpdate = true; return;
    }
    if (I.kind === 'temps') { // un calendrier dont on arrache les pages : le temps passe, sans lire
      const X = 90, Y = 120, CW = W - 180, CH = H - 230, sheet = (x, y, r, fade) => {
        ctx.save(); ctx.translate(x + CW / 2, y + CH / 2); ctx.rotate(r); ctx.globalAlpha = fade; ctx.translate(-CW / 2, -CH / 2);
        ctx.fillStyle = '#f8f4ea'; ctx.beginPath(); ctx.roundRect(0, 0, CW, CH, 34); ctx.fill();
        ctx.fillStyle = '#d4453a'; ctx.beginPath(); ctx.roundRect(0, 0, CW, 190, [34, 34, 0, 0]); ctx.fill();
        ctx.restore();
      };
      sheet(X, Y, 0, 1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.font = `700 60px ${FONT}`; ctx.fillText(I.title, W / 2, Y + 96, CW - 70);
      const size = Math.min(190, Math.floor((CW - 60) / Math.max(1, I.big.length) * 1.75));
      const kb = 0.7 + 0.3 * pop((I.t - 0.35) / 0.3), ds = easeOut((I.t - 0.5) / 0.28); // la date rebondit, puis le détail monte
      ctx.save(); ctx.translate(W / 2, Y + 440); ctx.scale(kb, kb);
      ctx.fillStyle = '#20222a'; ctx.font = `700 ${size}px ${DISPLAY}`; ctx.fillText(I.big, 0, 0, CW - 60); ctx.restore();
      ctx.save(); ctx.globalAlpha = ds; ctx.fillStyle = '#6a665e'; ctx.font = `600 50px ${FONT}`; ctx.fillText(I.small, W / 2, Y + 720 + (1 - ds) * 30, CW - 70); ctx.restore();
      for (const x of [W / 2 - 170, W / 2 + 170]) { ctx.fillStyle = '#c8c4bb'; ctx.beginPath(); ctx.roundRect(x - 14, Y - 42, 28, 84, 14); ctx.fill(); }
      for (let n = 0; n < 3; n++) { // trois pages s'envolent l'une après l'autre
        const u = (I.t - n * 0.2) / 0.45; if (u >= 1) continue;
        const k = Math.max(0, u); sheet(X + k * k * 520 * (n % 2 ? -1 : 1), Y + k * k * 760, k * 0.5 * (n % 2 ? -1 : 1), 1);
      }
      tex.needsUpdate = true; return;
    }
    const K = CARDS[I.kind] || CARDS.base;
    ctx.fillStyle = K.bg; ctx.strokeStyle = 'rgba(244,241,236,.14)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(10, 10, W - 20, H - 20, 44); ctx.fill(); ctx.stroke();
    ctx.fillStyle = K.top; ctx.beginPath(); ctx.roundRect(10, 10, W - 20, 120, [44, 44, 0, 0]); ctx.fill();
    for (const [i, c] of ['#ff6b5e', '#f6c14e', '#5ccb74'].entries()) { const r = 13 * pop((I.t - 0.05 - i * 0.04) / 0.2); if (r > 0) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(68 + i * 44, 70, r, 0, 7); ctx.fill(); } }
    const rise = (d) => { const u = (I.t - d) / 0.28; ctx.globalAlpha = easeOut(u * 1.4); return (1 - easeOut(u)) * 40; }; // monte de 40 px en se posant
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save(); const ty = rise(STEP); ctx.fillStyle = K.ink; ctx.font = `500 58px ${FONT}`; ctx.fillText(I.title, W / 2, 262 + ty, W - 110); ctx.restore();
    let big = I.big;
    if (I.value) big = `${I.value.head}${Math.round(I.value.n * Math.min(1, f))}${I.value.tail}`;
    const size = Math.min(210, Math.floor((W - 90) / Math.max(1, big.length) * 1.75));
    const kb = 0.6 + 0.4 * pop((I.t - 2 * STEP) / 0.32); // le chiffre est le héros : il arrive avec un rebond
    ctx.save(); ctx.globalAlpha = easeOut((I.t - 2 * STEP) / 0.15); ctx.translate(W / 2, 560); ctx.scale(kb, kb);
    ctx.fillStyle = I.value?.head.includes('-') || I.value?.head.includes('−') ? '#ff7a6b' : K.big;
    ctx.font = `400 ${size}px ${DISPLAY}`; ctx.fillText(big, 0, 0); ctx.restore();
    ctx.save(); const sy = rise(4 * STEP); ctx.fillStyle = K.small; ctx.font = `500 50px ${FONT}`; ctx.fillText(I.small, W / 2, 850 + sy, W - 110); ctx.restore();
    const sh = (I.t - 0.4) / 0.6; // reflet : une bande de lumière traverse la carte une seule fois
    if (sh > 0 && sh < 1) {
      const x = -300 + easeOut(sh) * (W + 600), gr = ctx.createLinearGradient(x - 160, 0, x + 160, H);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.07)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save(); ctx.beginPath(); ctx.roundRect(10, 10, W - 20, H - 20, 44); ctx.clip(); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    tex.needsUpdate = true;
  }

  const look = {
    // Prépare à l'avance les effets de la lecture et de l'export, en parallèle : sinon le premier export se fige longuement.
    warm() {
      renderer.compileAsync(scene, camera).catch(() => {});
      post ||= createPost(v);
      renderer.setRenderTarget(v.composer.renderTarget1);
      renderer.compileAsync(scene, camera).catch(() => {});
      renderer.setRenderTarget(null);
    },
    setLight(name) { v.renderer.toneMappingExposure = exposure * ({ vive: 1.2, douce: 0.85 }[name] || 1); },
    setMood(name) {
      const on = name === 'soir';
      soir.visible = on; vignette.visible = on; face.visible = true; face.intensity = on ? 3 : 0.45; v.mood = name; polish = on; // la lumière de face garde le visage lisible, de jour comme de nuit
      exposure = on ? 1.02 : 0.9; v.renderer.toneMappingExposure = exposure;
      v.room?.sky.material.color.set(on ? '#141a3a' : '#fffdf4');
      v.room?.setShutter(on ? false : true);
      const L = lights;
      scene.background = on ? new THREE.Color(NIGHT) : day.bg;
      L.hemi.intensity = on ? 0.72 : day.hemi * 0.9;
      L.hemi.color.set(on ? '#7a6d92' : day.hc); L.hemi.groundColor.set(on ? '#2e2838' : day.hg);
      scene.environmentIntensity = on ? 0.1 : day.env;
      L.key.intensity = on ? 0 : day.key * 0.78; L.fill.intensity = on ? 0 : day.fill * 0.8;
      L.key.visible = !on; L.fill.visible = !on; // pas d'ombre de soleil à calculer la nuit
    },
    insert(title, big, small, forced) {
      const text = `${title} ${big} ${small}`;
      const kind = forced || (/plus tard|lendemain|suivante|\bnuit\b|^il est\b/i.test(title) ? 'temps' : /message|réponse|avis|offre/i.test(title) ? 'message' : /[€$]|facture|frais|virement/i.test(text) ? 'argent' : 'base');
      Object.assign(I, { on: true, t: 0, title, big, small, done: false, kind, out: -1 });
      const m = /^([^\d]*)(\d+)(.*)$/.exec(big);
      I.value = m && Number(m[2]) >= 10 ? { head: m[1], n: Number(m[2]), tail: m[3] } : null;
      if (kind === 'temps') I.value = null;
      backdrop.visible = true; card.visible = true; drawCard(0);
      return kind;
    },
    screen(kind, title, rows) { // écran d'application : vinted, appel, document, tiktok, scan, banque, interphone, rencontre
      Object.assign(I, { on: true, t: 0, title, big: '', small: '', done: false, kind: 'ecran', sk: kind, rows, value: null, out: -1 });
      backdrop.visible = kind !== 'scan'; card.visible = true; drawCard(1); // le viseur de Nox se pose sur l'image, sans fond
    },
    chat(name, lines) { Object.assign(I, { on: true, t: 0, title: name, big: '', small: '', done: false, kind: 'tel', chat: lines, value: null, out: -1 }); backdrop.visible = true; card.visible = true; drawCard(1); },
    // Sortie courte et accélérée ; « now » coupe net, au début ou à l'arrêt d'une lecture.
    hideInsert(now) {
      if (!now && I.on && card.visible) { if (I.out < 0) I.out = 0; return; }
      I.on = false; I.out = -1; backdrop.visible = false; card.visible = false;
    },
    update(dt) {
      uiCam.aspect = camera.aspect; uiCam.updateProjectionMatrix();
      const d = 0.45, h = 2 * Math.tan((uiCam.fov * Math.PI) / 360);
      vignette.scale.set(h * 0.4 * camera.aspect * 1.02, h * 0.4 * 1.02, 1);
      if (!I.on) return;
      I.t += dt;
      backdrop.scale.set(h * d * camera.aspect * 1.05, h * d * 1.05, 1);
      const w = Math.min(h * 0.42 * camera.aspect * 0.86, h * 0.42 * 0.62), H42 = h * 0.42;
      // Trois couches : la carte monte et se pose (principale), le fond s'assombrit (secondaire), la carte respire doucement (ambiance).
      const e = easeOut(I.t / ENTER), o = I.out < 0 ? 0 : easeIn(I.out / LEAVE);
      const s = (0.88 + 0.12 * pop(I.t / ENTER)) * (1 + 0.005 * Math.sin(I.t * 2.1)) * (1 - 0.06 * o);
      card.scale.set(w * s, w * s, 1);
      card.position.y = -(1 - e) * H42 * 0.07 - o * H42 * 0.04 + 0.002 * H42 * Math.sin(I.t * 1.6);
      card.material.opacity = easeOut(I.t / 0.16) * (1 - o); backdrop.material.opacity = easeOut(I.t / 0.2) * (1 - o);
      if (I.kind === 'temps' || I.sk === 'scan' && I.kind === 'ecran') card.rotation.set(0, 0, 0); else card.rotation.set(-0.07, 0.2 - 0.06 * Math.min(1, I.t / 2), 0.015);
      if (I.out >= 0) { I.out += dt; if (I.out >= LEAVE) look.hideInsert(true); return; }
      if (I.kind === 'tel') { if (I.t < I.chat.length * 0.8 + 0.3) drawCard(1); return; }
      if (I.kind === 'ecran') { drawCard(1); return; } // minuteur, onde, compteur : l'écran vit tant qu'il est affiché
      if (I.kind === 'temps') { if (I.t < 1.1) drawCard(1); return; }
      const f = (I.t - 2 * STEP) / 0.5; // le compteur démarre quand le chiffre arrive
      if (I.t < 1.05 || (I.value && f < 1.1)) drawCard(I.value ? f : 1); else if (!I.done) { drawCard(1); I.done = true; }
    },
  };
  return look;
}
