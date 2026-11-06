// Image du film : ambiance du soir, vignettage et écrans plein cadre (factures, chiffres).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const NIGHT = '#0b0a18';
const FONT = '"Inter", "Segoe UI", sans-serif', DISPLAY = '"Fraunces", Georgia, serif', NOX = '#f2b92e';
const ease = (t) => { const c = 1.7, u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };

// Chaque type d'écran a sa couleur : on comprend d'un coup d'œil s'il s'agit du temps, d'un message ou d'argent.
const CARDS = {
  base: { bg: '#16181c', top: '#1e2126', ink: '#f4f1ec', big: NOX, small: '#a8a49c' },
  temps: { bg: '#102a3c', top: '#173a50', ink: '#e6f7ff', big: '#8feaff', small: '#a9d6e6' },
  message: { bg: '#143427', top: '#1b4634', ink: '#edfff5', big: '#8df0b8', small: '#b6e8cc' },
  argent: { bg: '#351a1c', top: '#4a2124', ink: '#fff0ee', big: '#ffb35c', small: '#e5bcb6' },
  abonne: { bg: NOX, top: '#ffd978', ink: '#14161b', big: '#14161b', small: '#37332a' },
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
  composer.addPass(new UnrealBloomPass(size.clone(), 0.28, 0.55, 0.82));
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
  const wash = new THREE.PointLight('#6a48e0', 1.5, 7, 1.4); wash.position.set(-0.9, 1.9, 0.9);
  const back = new THREE.PointLight('#4d38d8', 0.9, 4, 1.5); back.position.set(0.1, 1.5, -1.6);
  const screen = new THREE.PointLight('#a9cfff', 0.7, 1.7, 1.5); screen.position.set(1.0, 1.02, -1.0);
  const face = new THREE.PointLight('#ffcfa8', 2.6, 6, 1.1); face.position.set(0.25, 0.1, 0.1); camera.add(face); face.visible = false;
  const bedside = new THREE.PointLight('#ffb27a', 1.8, 3.2, 1.4); bedside.position.set(-0.55, 1.5, 0.75); // lampe de chevet : le lit reste lisible
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
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: NIGHT, depthTest: false, depthWrite: false, toneMapped: false }));
  backdrop.renderOrder = 900; backdrop.position.z = -0.45; backdrop.visible = false; backdrop.frustumCulled = false; ui.add(backdrop);
  const cd = canvasTexture(900, 1100);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1, 1100 / 900), overlay(cd.tex));
  card.renderOrder = 910; card.position.z = -0.42; card.visible = false; card.frustumCulled = false; ui.add(card);
  const I = { on: false, t: 0, title: '', big: '', small: '', value: null };

  function drawCard(f) {
    const { ctx, canvas, tex } = cd, W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const K = CARDS[I.kind] || CARDS.base;
    ctx.fillStyle = K.bg; ctx.strokeStyle = 'rgba(244,241,236,.14)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(10, 10, W - 20, H - 20, 44); ctx.fill(); ctx.stroke();
    ctx.fillStyle = K.top; ctx.beginPath(); ctx.roundRect(10, 10, W - 20, 120, [44, 44, 0, 0]); ctx.fill();
    for (const [i, c] of ['#ff6b5e', '#f6c14e', '#5ccb74'].entries()) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(68 + i * 44, 70, 13, 0, 7); ctx.fill(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = K.ink; ctx.font = `500 58px ${FONT}`; ctx.fillText(I.title, W / 2, 262, W - 110);
    let big = I.big;
    if (I.value) big = `${I.value.head}${Math.round(I.value.n * Math.min(1, f))}${I.value.tail}`;
    const size = Math.min(210, Math.floor((W - 90) / Math.max(1, big.length) * 1.75));
    ctx.fillStyle = I.value?.head.includes('-') || I.value?.head.includes('−') ? '#ff7a6b' : K.big;
    ctx.font = `400 ${size}px ${DISPLAY}`; ctx.fillText(big, W / 2, 560);
    ctx.fillStyle = K.small; ctx.font = `500 50px ${FONT}`; ctx.fillText(I.small, W / 2, 850, W - 110);
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
      soir.visible = on; vignette.visible = on; face.visible = on; v.mood = name; polish = on;
      exposure = on ? 1 : 1.05; v.renderer.toneMappingExposure = exposure;
      v.room?.sky.material.color.set(on ? '#141a3a' : '#fffdf4');
      v.room?.setShutter(on ? false : true);
      const L = lights;
      scene.background = on ? new THREE.Color(NIGHT) : day.bg;
      L.hemi.intensity = on ? 0.46 : day.hemi;
      L.hemi.color.set(on ? '#4d3f6e' : day.hc); L.hemi.groundColor.set(on ? '#17132c' : day.hg);
      scene.environmentIntensity = on ? 0.1 : day.env;
      L.key.intensity = on ? 0 : day.key; L.fill.intensity = on ? 0 : day.fill;
      L.key.visible = !on; L.fill.visible = !on; // pas d'ombre de soleil à calculer la nuit
    },
    insert(title, big, small) {
      const text = `${title} ${big} ${small}`;
      const kind = /abonne/i.test(big) ? 'abonne' : /plus tard|lendemain|suivante|\bnuit\b/i.test(title) ? 'temps' : /message|réponse|avis|offre/i.test(title) ? 'message' : /[€$]|facture|frais|virement/i.test(text) ? 'argent' : 'base';
      Object.assign(I, { on: true, t: 0, title, big, small, done: false, kind });
      const m = /^([^\d]*)(\d+)(.*)$/.exec(big);
      I.value = m && Number(m[2]) >= 10 ? { head: m[1], n: Number(m[2]), tail: m[3] } : null;
      backdrop.visible = true; card.visible = true; drawCard(0);
    },
    hideInsert() { I.on = false; backdrop.visible = false; card.visible = false; },
    update(dt) {
      uiCam.aspect = camera.aspect; uiCam.updateProjectionMatrix();
      const d = 0.45, h = 2 * Math.tan((uiCam.fov * Math.PI) / 360);
      vignette.scale.set(h * 0.4 * camera.aspect * 1.02, h * 0.4 * 1.02, 1);
      if (!I.on) return;
      I.t += dt;
      backdrop.scale.set(h * d * camera.aspect * 1.05, h * d * 1.05, 1);
      const w = Math.min(h * 0.42 * camera.aspect * 0.86, h * 0.42 * 0.62), s = 0.86 + 0.14 * ease(Math.min(1, I.t / 0.2));
      card.scale.set(w * s, w * s, 1);
      card.rotation.set(-0.07, 0.2 - 0.06 * Math.min(1, I.t / 2), 0.015);
      if (I.value && I.t < 0.6) drawCard(I.t / 0.45); else if (I.value && !I.done) { drawCard(1); I.done = true; }
    },
  };
  return look;
}
