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

  function drawCard(f) {
    const { ctx, canvas, tex } = cd, W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
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
      if (I.kind === 'temps') card.rotation.set(0, 0, 0); else card.rotation.set(-0.07, 0.2 - 0.06 * Math.min(1, I.t / 2), 0.015);
      if (I.out >= 0) { I.out += dt; if (I.out >= LEAVE) look.hideInsert(true); return; }
      if (I.kind === 'tel') { if (I.t < I.chat.length * 0.8 + 0.3) drawCard(1); return; }
      if (I.kind === 'temps') { if (I.t < 1.1) drawCard(1); return; }
      const f = (I.t - 2 * STEP) / 0.5; // le compteur démarre quand le chiffre arrive
      if (I.t < 1.05 || (I.value && f < 1.1)) drawCard(I.value ? f : 1); else if (!I.done) { drawCard(1); I.done = true; }
    },
  };
  return look;
}
