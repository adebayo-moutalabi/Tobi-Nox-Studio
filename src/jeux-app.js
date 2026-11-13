// Les jeux de Tobi et Nox : trois mini-jeux dans une seule page, avec le vrai Nox en 3D.
// Chaque jeu est un objet { id, nom, start(), stop() } ; l'accueil, le score et le partage sont communs.
import * as THREE from 'three';
import { createNox } from './nox.js';

const $ = (id) => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a), pick = (list) => list[Math.floor(Math.random() * list.length)];
const store = { // le meilleur score reste dans le navigateur ; si le stockage est bloqué, le jeu marche quand même
  get(k) { try { return Number(localStorage.getItem('tn-jeux-' + k)) || 0; } catch { return 0; } },
  set(k, v) { try { localStorage.setItem('tn-jeux-' + k, String(v)); } catch { /* navigation privée */ } },
};
// Sons fabriqués dans le navigateur : aucun fichier à charger. Le réglage « son coupé » reste en mémoire.
const son = (() => {
  let ctx, on = store.get('son') !== 2;
  const tone = (f, d = 0.12, type = 'sine', v = 0.1, slide = 0, wait = 0) => {
    if (!on) return;
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume();
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + wait;
      o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + 0.02);
    } catch { /* pas de son sur cet appareil : le jeu continue */ }
  };
  return {
    piece: (n = 0) => tone(784 * 2 ** (Math.min(n, 14) / 12), 0.09, 'triangle'), // la note monte avec le combo
    bonus: () => { tone(660, 0.1, 'triangle'); tone(990, 0.16, 'triangle', 0.1, 0, 0.07); },
    rate: () => tone(190, 0.28, 'sawtooth', 0.11, 0.4),
    clic: () => tone(430, 0.05, 'square', 0.04),
    bien: () => tone(740, 0.08, 'triangle', 0.09),
    fin: () => [523, 415, 330].forEach((f, i) => tone(f, 0.24, 'triangle', 0.1, 0, i * 0.16)),
    record: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, 0, i * 0.11)),
    toggle() { on = !on; store.set('son', on ? 1 : 2); if (on) tone(660, 0.08, 'triangle'); return on; },
    get on() { return on; },
  };
})();
// Les cinq meilleurs scores de chaque jeu, gardés sur cet appareil
const top = {
  get(id) { try { return JSON.parse(localStorage.getItem('tn-jeux-top-' + id)) || []; } catch { return []; } },
  add(id, score) { const l = [...top.get(id), score].filter((x) => x > 0).sort((a, b) => b - a).slice(0, 5); try { localStorage.setItem('tn-jeux-top-' + id, JSON.stringify(l)); } catch { /* navigation privée */ } return l; },
};
let toastT = 0;
function toast(text, ms = 1500) { const t = $('toast'); t.textContent = text; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
const hud = (items) => { $('hud').innerHTML = items.map(([lib, val]) => `<div><small>${lib}</small><b>${val}</b></div>`).join(''); };

// Un seul moteur de rendu pour tous les jeux en 3D : ils partagent le même canevas.
let glr = null;
function sharedRenderer() {
  if (!glr) {
    glr = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
    glr.setPixelRatio(Math.min(devicePixelRatio, 2)); glr.shadowMap.enabled = true; glr.shadowMap.type = THREE.PCFSoftShadowMap;
    glr.toneMapping = THREE.ACESFilmicToneMapping; glr.toneMappingExposure = 1.15;
  }
  return glr;
}

// ---------------------------------------------------------------- Jeu 1 : Nox, attrape !
// Tobi lance ses idées par la fenêtre. Nox attrape les pièces et les kebabs, et évite les « idées de génie » et les factures.
const TOBI = ['« Nox, aie la vision ! »', '« C\'est un investissement ! »', '« Fais-moi confiance. »', '« Cette fois, c\'est la bonne ! »', '« J\'ai une idée de génie. »'];
function attrape() {
  const canvas = $('gl');
  let renderer, scene, camera, hero, rig, ring, raf = 0, last = 0, items = [], sparks = [], halfW = 1, target = 0, x = 0, vx = 0, shake = 0;
  let score = 0, combo = 0, lives = 3, t = 0, spawn = 0, over = false, keys = 0;
  const geo = {}, mat = {};
  function build() {
    renderer = sharedRenderer();
    scene = new THREE.Scene(); scene.background = new THREE.Color('#0b0a18'); scene.fog = new THREE.Fog('#0b0a18', 7, 19);
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
    scene.add(new THREE.HemisphereLight('#8f86ff', '#1a1630', 1.1));
    const key = new THREE.SpotLight('#ffd9a0', 60, 12, 0.5, 0.6, 1.2); key.position.set(1.5, 4.5, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005; scene.add(key, key.target);
    const rim = new THREE.PointLight('#7f70ff', 14, 8); rim.position.set(-2, 1.6, -1.5); scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: '#1b1836', roughness: 0.85 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    for (let i = 0; i < 7; i++) { // lignes du sol : elles donnent la profondeur
      const l = new THREE.Mesh(new THREE.RingGeometry(1 + i * 0.9, 1.012 + i * 0.9, 96), new THREE.MeshBasicMaterial({ color: '#3a3470', transparent: true, opacity: 0.5 - i * 0.06 })); l.rotation.x = -Math.PI / 2; l.position.y = 0.002; scene.add(l);
    }
    const stars = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 260; i++) sp.push(rnd(-9, 9), rnd(0.5, 7), rnd(-9, -3));
    stars.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: '#cfc9ff', size: 0.035, transparent: true, opacity: 0.8 })));
    { // la résidence, derrière : c'est de la fenêtre allumée du haut que Tobi lance ses idées
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshStandardMaterial({ color: '#141230', roughness: 1 })); wall.position.set(0, 4, -6); wall.scale.setScalar(2); scene.add(wall);
      const win = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshBasicMaterial({ fog: true }), 70), o = new THREE.Object3D(), c = new THREE.Color(); let n = 0;
      for (let r = 0; r < 5; r++) for (let k = 0; k < 14; k++) { o.position.set(-8.45 + k * 1.3, 1.2 + r * 1.25, -5.98); o.updateMatrix(); win.setMatrixAt(n, o.matrix); win.setColorAt(n, c.set(Math.random() < 0.32 ? (Math.random() < 0.5 ? '#ffcf7a' : '#ffe9b8') : '#1d1a40')); n++; }
      scene.add(win);
      const tobi = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.64), new THREE.MeshBasicMaterial({ color: '#f2b92e' })); tobi.position.set(0, 4.95, -5.97); scene.add(tobi);
    }
    ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.44, 48), new THREE.MeshBasicMaterial({ color: '#f2b92e', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.006; scene.add(ring);
    hero = createNox({ scale: 1.7 }); hero.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); rig = new THREE.Group(); rig.add(hero.root); scene.add(rig); // on penche le groupe, pas le personnage : ses propres animations restent intactes
    // Les objets qui tombent : de vrais volumes, reconnaissables d'un coup d'œil
    geo.coin = new THREE.CylinderGeometry(0.075, 0.075, 0.018, 28); mat.coin = new THREE.MeshStandardMaterial({ color: '#f2c14e', metalness: 0.9, roughness: 0.25, emissive: '#5a3d00', emissiveIntensity: 0.5 });
    geo.bulb = new THREE.SphereGeometry(0.075, 20, 14); mat.bulb = new THREE.MeshStandardMaterial({ color: '#ff5f57', emissive: '#ff2a1f', emissiveIntensity: 1.6, roughness: 0.3 });
    geo.base = new THREE.CylinderGeometry(0.035, 0.03, 0.05, 12); mat.base = new THREE.MeshStandardMaterial({ color: '#8b8fa3', metalness: 0.8, roughness: 0.35 });
    geo.bill = new THREE.BoxGeometry(0.15, 0.2, 0.006); mat.bill = new THREE.MeshStandardMaterial({ map: billTexture(), roughness: 0.8 });
    geo.wrap = new THREE.CapsuleGeometry(0.05, 0.12, 6, 14); mat.wrap = new THREE.MeshStandardMaterial({ color: '#e8cf9c', roughness: 0.7 });
    geo.salad = new THREE.SphereGeometry(0.052, 12, 8); mat.salad = new THREE.MeshStandardMaterial({ color: '#5ccb74', roughness: 0.6 });
    geo.spark = new THREE.SphereGeometry(0.018, 8, 6);
  }
  function billTexture() {
    const c = document.createElement('canvas'); c.width = 150; c.height = 200; const g = c.getContext('2d');
    g.fillStyle = '#f8f4ea'; g.fillRect(0, 0, 150, 200); g.fillStyle = '#d4453a'; g.fillRect(0, 0, 150, 44); g.fillStyle = '#fff'; g.font = '900 26px sans-serif'; g.textAlign = 'center'; g.fillText('FACTURE', 75, 32);
    g.fillStyle = '#b9b3a4'; for (let i = 0; i < 5; i++) g.fillRect(18, 64 + i * 22, 114 - (i % 2) * 30, 8); g.fillStyle = '#d4453a'; g.font = '900 30px sans-serif'; g.fillText('847 €', 75, 188);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }
  function make(kind) {
    const g = new THREE.Group();
    if (kind === 'coin') g.add(new THREE.Mesh(geo.coin, mat.coin));
    if (kind === 'bulb') { const b = new THREE.Mesh(geo.bulb, mat.bulb), s = new THREE.Mesh(geo.base, mat.base); s.position.y = -0.085; g.add(b, s); }
    if (kind === 'bill') g.add(new THREE.Mesh(geo.bill, mat.bill));
    if (kind === 'kebab') { const w = new THREE.Mesh(geo.wrap, mat.wrap), s = new THREE.Mesh(geo.salad, mat.salad); s.position.y = 0.1; s.scale.set(1, 0.5, 1); g.add(w, s); }
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); g.scale.setScalar(1.6);
    return g;
  }
  function size() {
    const r = canvas.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height;
    const tall = camera.aspect < 0.8, d = tall ? 4.4 : 3.6; camera.position.set(0, tall ? 1.5 : 1.2, d); camera.lookAt(0, tall ? 1.05 : 0.9, 0); camera.updateProjectionMatrix();
    halfW = Math.max(0.5, Math.tan((camera.fov * Math.PI) / 360) * d * camera.aspect - 0.36);
  }
  const aim = (e) => { const r = canvas.getBoundingClientRect(); target = ((e.clientX - r.left) / r.width * 2 - 1) * halfW; };
  const down = (e) => { if (e.key === 'ArrowLeft' || e.key === 'q' || e.key === 'a') keys = -1; if (e.key === 'ArrowRight' || e.key === 'd') keys = 1; };
  const up = () => { keys = 0; };
  function burst(p, color, n = 10) {
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo.spark, new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.copy(p); scene.add(m); sparks.push({ m, v: new THREE.Vector3(rnd(-1, 1), rnd(0.8, 2.4), rnd(-0.6, 0.6)), life: 0.6 }); }
  }
  function show() { hud([['Score', score], ['Combo', 'x' + (1 + Math.floor(combo / 5))], ['Vies', '❤'.repeat(lives) || '—']]); }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000 || 0)); last = now;
    if (over) { hero.update(dt); renderer.render(scene, camera); return; }
    t += dt;
    const level = Math.min(1, t / 75); // la difficulté monte doucement pendant 75 secondes
    if (keys) target = THREE.MathUtils.clamp(target + keys * dt * 3.2, -halfW, halfW);
    const want = THREE.MathUtils.clamp(target, -halfW, halfW); // ressort : il part vite et se pose, sans glisser
    vx += ((want - x) * 90 - vx * 16) * dt; x += vx * dt;
    rig.position.x = x; rig.rotation.z = THREE.MathUtils.clamp(-vx * 0.06, -0.16, 0.16); rig.rotation.y = THREE.MathUtils.clamp(vx * 0.2, -0.5, 0.5);
    ring.position.x = x; ring.scale.setScalar(1 + 0.08 * Math.sin(t * 6) + Math.min(0.5, combo * 0.02)); ring.material.color.set(combo >= 10 ? '#8feaff' : '#f2b92e');
    spawn -= dt;
    if (spawn <= 0) {
      spawn = THREE.MathUtils.lerp(0.85, 0.32, level) * rnd(0.8, 1.2);
      const r = Math.random(), bad = 0.3 + 0.18 * level, kind = r < 0.07 ? 'kebab' : r < 0.07 + bad ? (Math.random() < 0.6 ? 'bulb' : 'bill') : 'coin';
      const m = make(kind); m.position.set(rnd(-halfW, halfW), 2.9, 0); scene.add(m);
      items.push({ m, kind, v: THREE.MathUtils.lerp(1.15, 2.5, level) * rnd(0.9, 1.15), spin: rnd(2, 6), sway: rnd(0, 6) });
      if (kind === 'bulb' && Math.random() < 0.25) toast('Tobi : ' + pick(TOBI));
    }
    for (const it of items) {
      it.m.position.y -= it.v * dt; it.m.rotation.y += it.spin * dt;
      if (it.kind === 'coin') it.m.rotation.x = Math.PI / 2; if (it.kind === 'bill') { it.m.position.x += Math.sin(t * 2 + it.sway) * 0.25 * dt; it.m.rotation.z = Math.sin(t * 3 + it.sway) * 0.35; }
      const y = it.m.position.y, near = Math.abs(it.m.position.x - x) < 0.36;
      if (!it.done && near && y < 0.9 && y > 0.2) {
        it.done = true;
        if (it.kind === 'coin' || it.kind === 'kebab') {
          combo++; if (it.kind === 'kebab') son.bonus(); else son.piece(combo); const gain = (it.kind === 'kebab' ? 5 : 1) * (1 + Math.floor(combo / 5)); score += gain;
          burst(it.m.position, it.kind === 'kebab' ? '#5ccb74' : '#f2c14e', it.kind === 'kebab' ? 18 : 9);
          hero.setExpression(combo % 5 === 0 ? 'joie' : 'sourire'); if (combo % 10 === 0) { hero.play('cheer'); toast(`Combo x${1 + Math.floor(combo / 5)} !`); }
        } else {
          lives--; combo = 0; shake = 0.35; son.rate(); burst(it.m.position, '#ff5f57', 16); hero.setExpression('colere'); hero.play('facepalm');
          toast(it.kind === 'bill' ? 'Une facture. Tobi : « C\'est rien. »' : 'Tobi : « C\'était un investissement ! »');
          if (lives <= 0) return end();
        }
        show();
      } else if (!it.done && y < 0.05) { it.done = true; if (it.kind === 'coin' && combo) { combo = 0; show(); } }
      if (it.done) it.m.scale.multiplyScalar(Math.max(0, 1 - dt * 14));
    }
    items = items.filter((it) => { const keep = it.m.position.y > -0.3 && it.m.scale.x > 0.05; if (!keep) scene.remove(it.m); return keep; });
    for (const s of sparks) { s.life -= dt; s.v.y -= 6 * dt; s.m.position.addScaledVector(s.v, dt); s.m.material.opacity = Math.max(0, s.life / 0.6); }
    sparks = sparks.filter((s) => { if (s.life <= 0) { scene.remove(s.m); s.m.material.dispose(); } return s.life > 0; });
    shake = Math.max(0, shake - dt); camera.position.x = Math.sin(t * 70) * shake * 0.12;
    hero.update(dt); renderer.render(scene, camera);
  }
  function end() {
    over = true; hero.setExpression('tristesse');
    finish('attrape', score, 'points', score >= 150 ? 'Nox : « Avec ça, on paie le loyer. »' : score >= 60 ? 'Nox : « Pas mal. Tobi aurait tout dépensé. »' : score >= 15 ? 'Nox : « C\'est un début. Un petit. »' : 'Nox : « J\'appelle ta mère. »');
  }
  return {
    id: 'attrape', nom: 'Nox, attrape !', ico: '🪙', canvas: true,
    pitch: 'Tobi jette ses idées par la fenêtre. Attrape les pièces et les kebabs, évite les ampoules rouges et les factures.',
    start() {
      if (!renderer) build();
      for (const it of items) scene.remove(it.m); for (const s of sparks) scene.remove(s.m);
      items = []; sparks = []; score = 0; combo = 0; lives = 3; t = 0; spawn = 0.6; over = false; x = vx = target = 0; last = performance.now();
      hero.setExpression('sourire'); hero.play('wave'); size(); show();
      addEventListener('resize', size); canvas.addEventListener('pointermove', aim); canvas.addEventListener('pointerdown', aim); addEventListener('keydown', down); addEventListener('keyup', up);
      toast('Glisse ou utilise les flèches pour déplacer Nox', 2600);
      cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    },
    stop() { cancelAnimationFrame(raf); removeEventListener('resize', size); canvas.removeEventListener('pointermove', aim); canvas.removeEventListener('pointerdown', aim); removeEventListener('keydown', down); removeEventListener('keyup', up); },
  };
}

// ---------------------------------------------------------------- Jeu 2 : Fin de mois
// Trente jours, quatre jauges. Chaque carte propose deux choix. Si une jauge tombe à zéro, c'est fini.
const J = ['argent', 'energie', 'notes', 'moral'];
const CARTES = [ // [situation, choix A, effets A, réplique de Nox, choix B, effets B, réplique de Nox] ; effets = argent, énergie, notes, moral
  ['Il est minuit. Le kebab d\'en bas est encore ouvert.', 'Kebab. Évidemment.', [-9, 6, 0, 10], 'Quatrième de la semaine.', 'Pâtes au sel.', [0, 3, 0, -8], 'Sel nature. Ton plat signature.'],
  ['Partiel de droit demain, à 8 h.', 'Réviser toute la nuit', [0, -22, 16, -6], 'Tu as lu le titre. Bravo.', 'Dormir, « ça ira »', [0, 16, -18, 6], 'Dormir, c\'est réviser en silence.'],
  ['Codex propose de « booster » ton compte en banque.', 'C\'est fait.', [-20, 0, 0, 8], 'Il a acheté 340 noms de domaine.', 'Tobi. Non.', [0, 0, 0, -3], 'Enfin une bonne décision.'],
  ['Ta mère appelle. Trois fois.', 'Décrocher', [12, -6, 0, 8], 'Elle t\'envoie vingt euros. Et une liste.', 'Laisser en « Vu »', [0, 4, 0, -12], 'Elle prend le train de 19 h.'],
  ['Karim organise une soirée à l\'étage.', 'J\'y vais', [-8, -14, -6, 18], 'Tu as dansé. Karim a filmé.', 'Je reste travailler', [0, 0, 10, -10], 'Tu as rangé ton bureau. Pas travaillé.'],
  ['Une appli promet de « devenir riche en 7 jours ».', 'C\'est un investissement', [-18, 0, 0, 10], 'Jour 7. Tu es moins riche.', 'Je passe', [0, 0, 0, -2], 'Tu progresses.'],
  ['Le CROUS annonce un contrôle des chambres demain.', 'Tout ranger', [0, -16, 0, 6], 'Tout est sous le lit. Comme d\'habitude.', 'Dire que c\'est un « campus tech »', [-6, 0, 0, 8], 'Ils ont ri. Puis verbalisé.'],
  ['Inès te propose de réviser à la BU.', 'Oui, bien sûr', [0, -8, 12, 14], 'Tu as révisé son profil.', 'Trop de pression', [0, 4, -6, -10], 'Elle révise avec Karim, du coup.'],
  ['Le prof demande ton DM. Il était pour hier.', 'Dire la vérité', [0, 0, -8, 6], 'Il a apprécié. Un peu.', 'Demander 500 excuses à Codex', [0, 0, -14, 10], 'Ton chat est mort deux fois.'],
  ['Promo : sweat moutarde, le même que le tien, à moitié prix.', 'Deux, c\'est mieux', [-14, 0, 0, 12], 'Tu portes le même. Depuis deux ans.', 'Je résiste', [0, 0, 0, -4], 'Fort.'],
  ['Nox te réveille à 7 h, comme prévu.', 'Me lever', [0, -10, 10, -4], 'Tu es dans l\'amphi. Endormi, mais dedans.', 'Snooze. Cinq fois.', [0, 12, -10, 4], 'Tu as rêvé du cours. Ça compte pas.'],
  ['Gemini a résumé ton cours en 40 pages.', 'Tout lire', [0, -14, 14, -4], 'Le résumé est plus long que le cours.', 'Lire la page une', [0, 0, 4, 4], 'Elle disait : « Lis la suite. »'],
  ['Un ami te propose un job : distribuer des flyers.', 'J\'accepte', [16, -16, -4, -2], 'Tu en as distribué douze. Sur quatre cents.', 'Mon temps vaut plus', [0, 6, 0, 4], 'Ton temps vaut douze euros.'],
  ['Le frigo est vide. Vraiment vide.', 'Courses sérieuses', [-14, -4, 0, 8], 'Des légumes. Je suis ému.', 'Un yaourt périmé, ça passe', [0, -14, 0, -6], 'Ça n\'est pas passé.'],
  ['Idée : lancer une chaîne YouTube avec Nox.', 'On tourne ce soir', [0, -12, -4, 16], 'Douze vues. Dont ta mère, onze fois.', 'Plus tard', [0, 0, 0, -6], '« Demain. Promis. »'],
  ['Claude a relu ton exposé. Il a « quelques remarques ».', 'Les écouter', [0, -8, 14, -8], 'Il en avait quarante-deux.', 'Lui dire merci et fermer', [0, 4, -8, 6], 'Il a dit : « Intéressant. »'],
  ['La laverie coûte 4 €. Il te reste des chaussettes propres pour un jour.', 'Lessive', [-4, -6, 0, 6], 'Tu sens le propre. C\'est nouveau.', 'Retourner les chaussettes', [0, 0, 0, -8], 'Karim a ouvert sa fenêtre.'],
  ['Centi propose de gérer tes abonnements pour trente centimes.', 'Pas cher, je prends', [-12, 0, 0, 4], 'Elle a tout renouvelé. « En promo ! »', 'Je garde Nox', [0, 0, 0, 6], 'Sage décision. Gratuite, en plus.'],
  ['Projet de groupe : tu es le seul à avoir ouvert le document.', 'Tout faire seul', [0, -20, 14, -8], 'Les autres ont mis leur nom en premier.', 'Attendre les autres', [0, 4, -14, 2], 'Ils attendaient aussi.'],
  ['Ta bourse est arrivée ce matin.', 'Tout mettre de côté', [20, 0, 0, -4], 'Qui es-tu, et qu\'as-tu fait de Tobi ?', 'Fêter ça', [8, -6, 0, 14], 'Tu as fêté la moitié de la bourse.'],
  ['Il pleut. L\'amphi est à vingt minutes à pied.', 'J\'y vais quand même', [0, -12, 10, -4], 'Trempé, mais présent.', 'Cours en ligne depuis le lit', [0, 8, -6, 4], 'Tu t\'es endormi à la diapo deux.'],
  ['Un inconnu vend une trottinette pour 15 €.', 'Affaire du siècle', [-15, 10, 0, 8], 'Elle est à Karim. Il la cherche.', 'Trop beau pour être vrai', [0, 0, 0, 2], 'Tu apprends.'],
  ['Nox propose une heure de sport.', 'Allez, une série', [0, -10, 0, 12], 'Tu as fait une pompe. Bravo.', 'Le sport, c\'est demain', [0, 4, 0, -6], '« Demain » est ton mot préféré.'],
  ['Stage de rêve : la candidature se termine ce soir.', 'Postuler sérieusement', [0, -12, 6, 10], 'Lettre envoyée. Honnête, en plus.', 'Demander à Codex', [0, 0, -4, 6], 'Il a postulé. Pour lui.'],
  ['Trois abonnements que tu n\'utilises plus te coûtent 18 € par mois.', 'Tout résilier', [14, -4, 0, -4], 'Dix-huit euros. Soit quatre kebabs.', 'On sait jamais', [-10, 0, 0, 2], 'Tu ne sais jamais, en effet.'],
  ['Tu as promis d\'aider Karim à déménager samedi.', 'Tenir parole', [0, -18, 0, 12], 'Il t\'a payé en pizza.', '« Je suis malade »', [0, 6, 0, -12], 'Il a vu ta story.'],
  ['Le wifi de la résidence est coupé.', 'Aller à la BU', [0, -8, 12, 0], 'Tu as travaillé. Par accident.', 'Partage de connexion', [-8, 0, 2, 4], 'Ton forfait a tenu une heure.'],
  ['Insomnie. Il est 3 h.', 'Lire le cours', [0, -8, 8, -4], 'Tu dors enfin. Merci, le droit.', 'Vidéos de chats', [0, -14, 0, 8], 'Trois heures de chats.'],
];
const FINS = { argent: 'Découvert. Ta mère est déjà au courant.', energie: 'Tu t\'es endormi en amphi. Au premier rang.', notes: 'Rattrapages. En juin. Courage.', moral: 'Pour te consoler, tu as acheté 340 noms de domaine.' };
function mois() {
  let el, v, jour, pile, lock;
  const ICO = { argent: '💶', energie: '🔋', notes: '📚', moral: '🙂' }, NOM = { argent: 'Argent', energie: 'Énergie', notes: 'Notes', moral: 'Moral' };
  function draw(moved = []) {
    for (const k of J) { const j = el.querySelector(`[data-j="${k}"]`); j.querySelector('span').style.width = Math.max(0, Math.min(100, v[k])) + '%'; j.classList.toggle('bas', v[k] <= 25); if (moved.includes(k)) { j.classList.remove('bouge'); void j.offsetWidth; j.classList.add('bouge'); } }
    hud([['Jour', `${jour} / 30`]]);
  }
  function next() {
    if (!pile.length) pile = [...CARTES].sort(() => Math.random() - 0.5);
    const c = pile.pop(), f = el.querySelector('.fiche');
    f.classList.remove('sort-g', 'sort-d'); f.querySelector('.jour').textContent = `Jour ${jour}`; f.querySelector('.txt').textContent = c[0]; f.querySelector('.nox').textContent = 'Nox : « À toi de voir. »';
    const [a, b] = el.querySelectorAll('.choix button'); a.textContent = c[1]; b.textContent = c[4];
    a.onclick = () => choose(c, 0); b.onclick = () => choose(c, 1); lock = false;
  }
  function choose(c, side) {
    if (lock) return; lock = true; son.clic();
    const eff = c[side ? 5 : 2], moved = [];
    J.forEach((k, i) => { if (eff[i]) { v[k] = Math.min(100, v[k] + eff[i]); moved.push(k); } });
    const f = el.querySelector('.fiche'); f.querySelector('.nox').textContent = `Nox : « ${c[side ? 6 : 3]} »`; draw(moved);
    const dead = J.find((k) => v[k] <= 0);
    setTimeout(() => {
      if (dead) return finish('mois', jour, jour > 1 ? 'jours tenus' : 'jour tenu', FINS[dead]);
      if (jour >= 30) return finish('mois', 30, 'jours tenus', 'Fin de mois atteinte. Nox est presque fier.');
      f.classList.add(side ? 'sort-d' : 'sort-g'); setTimeout(() => { jour++; draw(); next(); }, 260);
    }, 1050);
  }
  return {
    id: 'mois', nom: 'Fin de mois', ico: '📅',
    pitch: 'Trente jours à tenir. Chaque choix touche ton argent, ton énergie, tes notes ou ton moral. Une jauge à zéro, et c\'est fini.',
    start() {
      el = document.createElement('div'); el.className = 'mois';
      el.innerHTML = `<div class="jauges">${J.map((k) => `<div class="jauge" data-j="${k}"><i>${ICO[k]}</i>${NOM[k]}<div class="t"><span></span></div></div>`).join('')}</div><div class="fiche"><div class="jour"></div><div class="txt"></div><div class="nox"></div></div><div class="choix"><button></button><button></button></div>`;
      $('play').append(el); v = { argent: 50, energie: 55, notes: 50, moral: 55 }; jour = 1; pile = []; draw(); next();
    },
    stop() { el?.remove(); el = null; },
  };
}

// ---------------------------------------------------------------- Jeu 3 : Tobi. Non.
// Les idées de Tobi s'allument. On touche les mauvaises pour dire « Non », on laisse passer les bonnes.
const MAUVAISES = ['Acheter 340 noms de domaine', 'Sécher le partiel pour dormir', 'Louer ma chambre comme « campus »', 'Miser ma bourse sur un cheval', 'Vendre le chargeur de Karim', 'Répondre « yo » à Maman', 'Un sixième kebab cette semaine', 'Laisser Codex gérer ma banque', 'Écrire « expert en tout » sur mon CV', 'Chauffer la chambre avec le PC', 'Une start-up de plus', 'Réviser « demain, promis »', 'Faire bouillir un kebab', 'Sous-louer le lit de Nox', 'Envoyer 500 excuses au prof', 'Mentir à Maman sur mes notes', 'Tout mettre sous le lit', 'Prendre une prof à 30 centimes', 'Éteindre Nox avec une sonnette', 'Payer le loyer en idées'];
const BONNES = ['Appeler Maman', 'Réviser une heure', 'Dire merci à Nox', 'Manger un légume', 'Dormir avant 2 h', 'Rendre le chargeur de Karim', 'Rendre le DM à l\'heure', 'Aller en amphi', 'Ranger la chambre', 'Écouter Claude', 'Payer le loyer', 'Boire de l\'eau'];
function non() {
  let el, cells, score, left, total, raf = 0, last = 0, wait = 0, combo, ended;
  function light() {
    const free = cells.filter((c) => !c.on); if (!free.length) return;
    const c = pick(free), bad = Math.random() < 0.68, k = 1 - left / total; c.on = true; c.bad = bad; c.t = c.life = THREE.MathUtils.lerp(2.3, 1.15, k);
    c.el.className = 'idee vive'; c.el.querySelector('.txt').textContent = pick(bad ? MAUVAISES : BONNES); c.el.querySelector('.cercle').style.animationDuration = c.life + 's';
  }
  function off(c, cls) { c.on = false; c.el.className = 'idee ' + (cls || ''); setTimeout(() => { if (!c.on) { c.el.className = 'idee'; c.el.querySelector('.txt').textContent = ''; } }, 260); }
  function tap(c) {
    if (!c.on || ended) return;
    if (c.bad) { combo++; son.bien(); score += 1 + Math.floor(combo / 4); off(c, 'bien'); if (combo && combo % 8 === 0) toast(`Nox : « Tobi. Non. » x${combo}`); }
    else { combo = 0; son.rate(); score = Math.max(0, score - 3); left = Math.max(0, left - 3); off(c, 'mal'); toast('C\'était une bonne idée ! −3 points'); }
    hud([['Score', score]]);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame); const dt = Math.max(0, Math.min(0.05, (now - last) / 1000 || 0)); last = now; if (ended) return;
    left -= dt; el.querySelector('.temps span').style.transform = `scaleX(${Math.max(0, left / total)})`;
    wait -= dt; if (wait <= 0) { wait = THREE.MathUtils.lerp(0.75, 0.36, 1 - left / total); light(); }
    for (const c of cells) if (c.on && (c.t -= dt) <= 0) { if (c.bad) { combo = 0; son.rate(); score = Math.max(0, score - 2); off(c, 'mal'); toast('Tobi l\'a fait. −2 points'); hud([['Score', score]]); } else { score += 1; off(c, 'bien'); hud([['Score', score]]); } }
    if (left <= 0) { ended = true; finish('non', score, 'points', score >= 70 ? 'Nox : « Aucune idée n\'est passée. Je suis fatigué. »' : score >= 35 ? 'Nox : « Tu connais bien Tobi. »' : score >= 12 ? 'Nox : « Il a quand même acheté un domaine. »' : 'Nox : « Tobi a tout fait. Tout. »'); }
  }
  return {
    id: 'non', nom: 'Tobi. Non.', ico: '🚫',
    pitch: 'Les idées de Tobi s\'allument. Touche les mauvaises avant qu\'il les fasse, et laisse passer les bonnes. Quarante-cinq secondes.',
    start() {
      el = document.createElement('div'); el.className = 'non';
      el.innerHTML = `<div class="temps"><span></span></div><div class="plateau">${'<div class="idee"><div class="cercle"></div><div class="txt"></div></div>'.repeat(6)}</div>`;
      $('play').append(el); cells = [...el.querySelectorAll('.idee')].map((e) => ({ el: e, on: false }));
      cells.forEach((c) => c.el.addEventListener('pointerdown', () => tap(c)));
      score = 0; combo = 0; total = left = 45; wait = 0.5; ended = false; last = performance.now(); hud([['Score', 0]]);
      toast('Touche les mauvaises idées. Laisse les bonnes.', 2600); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    },
    stop() { cancelAnimationFrame(raf); el?.remove(); el = null; },
  };
}

// ---------------------------------------------------------------- Jeu 4 : Nox en ville
// Monde ouvert : Nox se promène librement sur le campus, à pied ou sur la trottinette de Karim, et fait des courses pour Tobi.
// Chaque mission : aller chercher quelque chose à un endroit, le livrer à un autre, avant la fin du temps.
const LIEUX_VILLE = { // centre du bâtiment, taille, hauteur, couleur, point d'arrivée devant la porte
  res: { nom: 'Résidence', c: [-14, -14], s: [12, 8], h: 9, col: '#c9b79c', sign: 'RÉSIDENCE CROUS', m: [-14, -8.6] },
  kebab: { nom: 'Kebab', c: [11, -11], s: [7, 5], h: 3.6, col: '#c9412f', sign: 'KEBAB DU CAMPUS', m: [11, -7.4], neon: '#ff9a3c' },
  lav: { nom: 'Laverie', c: [14, 12], s: [7, 5], h: 3.6, col: '#8fc7d6', sign: 'LAVERIE', m: [14, 8.4], neon: '#8feaff' },
  bu: { nom: 'BU', c: [-13, 13], s: [10, 6], h: 5.6, col: '#a8743f', sign: 'BIBLIOTHÈQUE', m: [-13, 8.9] },
  amphi: { nom: 'Amphi', c: [0, -27], s: [14, 7], h: 6.2, col: '#b9b4c9', sign: 'AMPHI A', m: [0, -22.4] },
};
const MISSIONS = [ // [départ, arrivée, phrase de Tobi, objet, gain]
  ['kebab', 'res', 'Tobi : « J\'ai faim. Un kebab, vite ! »', 'le kebab', 6],
  ['res', 'lav', 'Tobi : « Rends le chargeur de Karim. Il fait sa lessive. »', 'le chargeur', 5],
  ['res', 'amphi', 'Tobi : « Mon DM ! Dépose-le à l\'amphi avant la fin du cours. »', 'le DM', 7],
  ['lav', 'res', 'Tobi : « J\'ai oublié mon linge à la laverie. Depuis mardi. »', 'le linge', 5],
  ['res', 'bu', 'Tobi : « Rapporte mes livres à la BU. Avant l\'amende. »', 'les livres', 6],
  ['bu', 'amphi', 'Tobi : « Inès a oublié son cahier à la BU. Apporte-le-lui ! »', 'le cahier d\'Inès', 8],
  ['kebab', 'bu', 'Tobi : « Un kebab pour réviser. Discrètement. »', 'le kebab', 7],
  ['amphi', 'kebab', 'Tobi : « J\'ai laissé mes 5 € en amphi. Rapporte-les au kebab. »', 'les 5 €', 6],
];
function ville() {
  const canvas = $('gl'), solids = [], cars = [], coins = [], keys = {};
  let renderer, scene, camera, hero, rig, scooter, beam, sun, ui, map, raf = 0, last = 0, built = false;
  let x, z, yaw, speed, riding, stick, money, chances, mission, phase, left, limit, order, bumpT, over, t;
  const free = (px, pz, r = 1) => !solids.some(([a, b, c, d]) => px > a - r && px < b + r && pz > c - r && pz < d + r) && Math.abs(px) > 3.6 && Math.abs(pz) > 3.6;
  function facade(w, h, col, lit = 0.35) { // fenêtres dessinées : quelques-unes allumées, comme un soir de révisions
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'), nx = Math.max(2, Math.round(w / 1.5)), ny = Math.max(1, Math.round(h / 1.6));
    g.fillStyle = col; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < nx; i++) for (let k = 0; k < ny; k++) { g.fillStyle = Math.random() < lit ? (Math.random() < 0.5 ? '#ffd98a' : '#fff1c9') : '#26244a'; g.fillRect((i + 0.22) * 256 / nx, (k + 0.2) * 256 / ny, 0.56 * 256 / nx, 0.55 * 256 / ny); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }
  function label(text, color = '#ffffff', bg = 'rgba(20,16,40,.9)') {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d');
    g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, 512, 96, 18); g.fill(); g.fillStyle = color; g.font = '900 54px "Inter", "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = color; g.shadowBlur = 14; g.fillText(text, 256, 50, 480);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }
  const B = (c, s, color, o = {}) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...s), new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.85, metalness: o.m ?? 0, emissive: o.e || '#000', emissiveIntensity: o.ei ?? 1, map: o.map || null })); m.position.set(...c); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  function build() {
    renderer = sharedRenderer();
    scene = new THREE.Scene(); scene.background = new THREE.Color('#231d4f'); scene.fog = new THREE.Fog('#231d4f', 28, 70);
    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
    scene.add(new THREE.HemisphereLight('#b8aeff', '#4a3f66', 1.8));
    sun = new THREE.DirectionalLight('#ffd2a1', 2.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006;
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 }); scene.add(sun, sun.target);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: '#4c8259', roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    // Routes en croix, trottoirs clairs et lignes blanches
    for (const [w, d] of [[90, 6.4], [6.4, 90]]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: '#b9b2a6', roughness: 1 })); r.rotation.x = -Math.PI / 2; r.position.y = 0.01; r.receiveShadow = true; scene.add(r); }
    for (const [w, d] of [[90, 5], [5, 90]]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: '#2f2d3d', roughness: 0.95 })); r.rotation.x = -Math.PI / 2; r.position.y = 0.02; r.receiveShadow = true; scene.add(r); }
    for (let i = -42; i <= 42; i += 3) if (Math.abs(i) > 4) { for (const [px, pz, w, d] of [[i, 0, 1.4, 0.16], [0, i, 0.16, 1.4]]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: '#f4f1ec' })); l.rotation.x = -Math.PI / 2; l.position.set(px, 0.03, pz); scene.add(l); } }
    // Les bâtiments du campus
    for (const [id, L] of Object.entries(LIEUX_VILLE)) {
      const [cx, cz] = L.c, [w, d] = L.s, tx = facade(w, L.h, L.col, id === 'res' ? 0.45 : 0.3);
      B([cx, L.h / 2, cz], [w, L.h, d], '#ffffff', { map: tx }); B([cx, L.h + 0.15, cz], [w + 0.5, 0.3, d + 0.5], '#2b2840');
      solids.push([cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2]);
      const side = L.m[1] > cz ? 1 : -1, fz = cz + side * (d / 2 + 0.03);
      B([cx, 1.1, fz], [1.5, 2.2, 0.08], '#3a2a1a'); B([cx, 1.2, fz + side * 0.03], [1.1, 1.7, 0.04], '#ffe9b8', { e: '#ffd98a', ei: 1.4 }); // la porte éclairée
      const s = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w - 0.6, 6), 1.1), new THREE.MeshBasicMaterial({ map: label(L.sign, L.neon || '#ffffff'), transparent: true, toneMapped: false })); s.position.set(cx, Math.min(L.h - 0.9, 3.4), fz + side * 0.06); if (side < 0) s.rotation.y = Math.PI; scene.add(s);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.8, 40), new THREE.MeshBasicMaterial({ color: '#f2b92e', transparent: true, opacity: 0.55 })); ring.rotation.x = -Math.PI / 2; ring.position.set(L.m[0], 0.04, L.m[1]); scene.add(ring);
    }
    // Arbres, réverbères et bancs
    const trunk = new THREE.CylinderGeometry(0.16, 0.22, 1.4, 7), leaf = new THREE.ConeGeometry(1.2, 2.6, 8), mt = new THREE.MeshStandardMaterial({ color: '#5a3d26', roughness: 1 });
    for (let i = 0, n = 0; i < 400 && n < 46; i++) { const px = rnd(-40, 40), pz = rnd(-40, 40); if (!free(px, pz, 2.2)) continue; n++;
      const a = new THREE.Mesh(trunk, mt), b = new THREE.Mesh(leaf, new THREE.MeshStandardMaterial({ color: pick(['#2f7d4f', '#3c9460', '#27694a']), roughness: 1 })); a.position.set(px, 0.7, pz); b.position.set(px, 2.6, pz); const k = rnd(0.8, 1.35); b.scale.setScalar(k); a.castShadow = b.castShadow = true; scene.add(a, b); solids.push([px - 0.3, px + 0.3, pz - 0.3, pz + 0.3]); }
    for (let i = -36; i <= 36; i += 12) for (const [px, pz] of [[i, 3.6], [i, -3.6], [3.6, i], [-3.6, i]]) { if (Math.abs(px) < 5 && Math.abs(pz) < 5) continue;
      B([px, 1.8, pz], [0.12, 3.6, 0.12], '#2b2840', { m: 0.6 }); const g = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffe2a8' })); g.position.set(px, 3.7, pz); scene.add(g); }
    for (const [px, pz] of [[-8, 5], [8, -5], [-6, -6], [6, 6]]) { B([px, 0.45, pz], [1.8, 0.1, 0.5], '#d7a56a'); B([px, 0.22, pz], [1.6, 0.44, 0.1], '#5a5d6a'); }
    // Voitures : elles roulent toutes seules, il faut regarder avant de traverser
    for (const [axis, lane, dir, col] of [['x', -1.25, 1, '#e5383b'], ['x', 1.25, -1, '#5b8def'], ['z', 1.25, 1, '#f2b92e'], ['z', -1.25, -1, '#5ccb74']]) {
      const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 1.3), new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.3 })), top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.15), new THREE.MeshStandardMaterial({ color: '#1c2233', roughness: 0.2 }));
      body.position.y = 0.6; top.position.set(-0.1, 1.2, 0); body.castShadow = top.castShadow = true; g.add(body, top);
      for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.3), new THREE.MeshBasicMaterial({ color: '#fff3c4' })); l.position.set(1.31, 0.62, s * 0.4); g.add(l); }
      if (axis === 'z') g.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2; else if (dir < 0) g.rotation.y = Math.PI;
      scene.add(g); cars.push({ g, axis, lane, dir, p: rnd(-40, 40), v: rnd(7, 10) });
    }
    // Pièces à ramasser en chemin
    const cg = new THREE.CylinderGeometry(0.32, 0.32, 0.07, 20), cm = new THREE.MeshStandardMaterial({ color: '#f2c14e', metalness: 0.9, roughness: 0.25, emissive: '#6a4700', emissiveIntensity: 0.6 });
    for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(cg, cm); m.rotation.x = Math.PI / 2; m.castShadow = true; scene.add(m); coins.push(m); place(m); }
    // Le faisceau qui montre où aller
    beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 30, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#f2b92e', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); beam.position.y = 15; scene.add(beam);
    // Nox et la trottinette de Karim
    hero = createNox({ scale: 1.7 }); hero.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); rig = new THREE.Group(); rig.add(hero.root); scene.add(rig);
    scooter = new THREE.Group(); const dk = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 1.1), new THREE.MeshStandardMaterial({ color: '#2b2f36', metalness: 0.5, roughness: 0.4 })), bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), new THREE.MeshStandardMaterial({ color: '#cfd5da', metalness: 0.9, roughness: 0.3 })), hd = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: '#5ccb74' }));
    dk.position.y = 0.14; bar.position.set(0, 0.62, 0.48); bar.rotation.x = -0.18; hd.position.set(0, 1.1, 0.4);
    for (const zz of [-0.48, 0.52]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 14), new THREE.MeshStandardMaterial({ color: '#111' })); w.rotation.z = Math.PI / 2; w.position.set(0, 0.11, zz); scooter.add(w); }
    scooter.add(dk, bar, hd); scooter.traverse((m) => { if (m.isMesh) m.castShadow = true; }); rig.add(scooter);
    built = true;
  }
  function place(m) { for (let i = 0; i < 60; i++) { const px = rnd(-36, 36), pz = rnd(-36, 36); if (free(px, pz, 1.2) || (Math.abs(px) < 2.2 || Math.abs(pz) < 2.2)) { m.position.set(px, 0.6, pz); return; } } }
  function size() { const r = canvas.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.fov = camera.aspect < 0.8 ? 68 : 55; camera.updateProjectionMatrix(); }
  const kd = (e) => { keys[e.key.toLowerCase()] = true; if (e.key === ' ' || e.key.toLowerCase() === 'e') { e.preventDefault(); ride(); } if (e.key.startsWith('Arrow')) e.preventDefault(); };
  const ku = (e) => { keys[e.key.toLowerCase()] = false; };
  const pd = (e) => { stick = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 }; };
  const pm = (e) => { if (stick && e.pointerId === stick.id) { stick.dx = THREE.MathUtils.clamp((e.clientX - stick.x0) / 60, -1, 1); stick.dy = THREE.MathUtils.clamp((e.clientY - stick.y0) / 60, -1, 1); } };
  const pu = (e) => { if (stick && e.pointerId === stick.id) stick = null; };
  function ride() { if (over) return; riding = !riding; scooter.visible = riding; son.clic(); toast(riding ? 'Trottinette de Karim : empruntée.' : 'À pied.', 1100); ui.querySelector('.trot').classList.toggle('on', riding); }
  function show() { hud([['Gagné', money + ' €'], ['Temps', Math.max(0, Math.ceil(left)) + ' s'], ['Essais', '●'.repeat(chances) || '—']]); }
  function next() {
    if (!order.length) order = [...MISSIONS].sort(() => Math.random() - 0.5);
    mission = order.pop(); phase = 0; left = limit; goal(); ui.querySelector('.obj').innerHTML = `${mission[2]}<br><b>Va chercher ${mission[3]} : ${LIEUX_VILLE[mission[0]].nom}</b>`;
  }
  function goal() { const m = LIEUX_VILLE[mission[phase]].m; beam.position.set(m[0], 15, m[1]); beam.material.color.set(phase ? '#5ccb74' : '#f2b92e'); }
  function drawMap() {
    const g = map.getContext('2d'), S = map.width, k = S / 88, P = (v) => S / 2 + v * k; g.clearRect(0, 0, S, S);
    g.fillStyle = 'rgba(20,18,42,.85)'; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.fill(); g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 7); g.clip();
    g.fillStyle = '#4a4860'; g.fillRect(0, P(-2.5), S, 5 * k); g.fillRect(P(-2.5), 0, 5 * k, S);
    for (const [id, L] of Object.entries(LIEUX_VILLE)) { g.fillStyle = id === mission?.[phase] ? '#f2b92e' : '#8f8ab8'; g.fillRect(P(L.c[0] - L.s[0] / 2), P(L.c[1] - L.s[1] / 2), L.s[0] * k, L.s[1] * k); }
    const m = LIEUX_VILLE[mission[phase]].m; g.fillStyle = phase ? '#5ccb74' : '#f2b92e'; g.beginPath(); g.arc(P(m[0]), P(m[1]), 4 + 2 * Math.sin(t * 6), 0, 7); g.fill();
    g.translate(P(x), P(z)); g.rotate(-yaw); g.fillStyle = '#8feaff'; g.beginPath(); g.moveTo(0, 7); g.lineTo(5, -5); g.lineTo(-5, -5); g.closePath(); g.fill(); g.restore();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000 || 0)); last = now; t += dt;
    if (!over) {
      const f = (keys.arrowup || keys.z || keys.w ? 1 : 0) - (keys.arrowdown || keys.s ? 1 : 0) + (stick ? -stick.dy : 0), turn = (keys.arrowleft || keys.q || keys.a ? 1 : 0) - (keys.arrowright || keys.d ? 1 : 0) + (stick ? -stick.dx : 0);
      const max = riding ? 10.5 : 4.6; yaw += THREE.MathUtils.clamp(turn, -1, 1) * (riding ? 2.1 : 2.6) * dt;
      speed += (THREE.MathUtils.clamp(f, -0.5, 1) * max - speed) * (1 - Math.exp(-dt * (riding ? 2.4 : 7)));
      let nx = x + Math.sin(yaw) * speed * dt, nz = z + Math.cos(yaw) * speed * dt;
      for (const [a, b, c, d] of solids) { const r = 0.55; if (nx > a - r && nx < b + r && nz > c - r && nz < d + r) { const ox = Math.min(nx - (a - r), b + r - nx), oz = Math.min(nz - (c - r), d + r - nz); if (ox < oz) nx = nx - (a - r) < b + r - nx ? a - r : b + r; else nz = nz - (c - r) < d + r - nz ? c - r : d + r; speed *= 0.6; } }
      x = THREE.MathUtils.clamp(nx, -41, 41); z = THREE.MathUtils.clamp(nz, -41, 41);
      hero.setLocomotion(riding ? 'idle' : Math.abs(speed) > 3 ? 'run' : Math.abs(speed) > 0.3 ? 'walk' : 'idle');
      rig.position.set(x, riding ? 0.16 : 0, z); rig.rotation.y = yaw; rig.rotation.z = riding ? THREE.MathUtils.clamp(-turn * speed * 0.03, -0.3, 0.3) : 0;
      bumpT -= dt;
      for (const c of cars) { c.p += c.dir * c.v * dt; if (c.p > 46) c.p = -46; if (c.p < -46) c.p = 46; const cx = c.axis === 'x' ? c.p : c.lane, cz = c.axis === 'x' ? c.lane : c.p; c.g.position.set(cx, 0, cz);
        if (bumpT <= 0 && Math.abs(cx - x) < (c.axis === 'x' ? 1.7 : 1) && Math.abs(cz - z) < (c.axis === 'x' ? 1 : 1.7)) { bumpT = 1.6; left -= 5; speed = -3; son.rate(); hero.setExpression('surprise'); toast('Regarde avant de traverser ! −5 s'); } }
      for (const m of coins) { m.rotation.z += dt * 3; if (Math.hypot(m.position.x - x, m.position.z - z) < 1) { money++; son.piece(money % 12); place(m); show(); } }
      const m = LIEUX_VILLE[mission[phase]].m;
      if (Math.hypot(m[0] - x, m[1] - z) < 2.1) {
        if (phase === 0) { phase = 1; goal(); son.bien(); hero.setExpression('sourire'); ui.querySelector('.obj').innerHTML = `${mission[2]}<br><b>Livre ${mission[3]} : ${LIEUX_VILLE[mission[1]].nom}</b>`; }
        else { money += mission[4]; son.bonus(); hero.setExpression('joie'); hero.play('cheer'); toast(`Livré ! +${mission[4]} €`); limit = Math.max(24, limit * 0.94); next(); }
      }
      left -= dt; beam.material.opacity = 0.16 + 0.08 * Math.sin(t * 4);
      if (left <= 0) { chances--; son.rate(); hero.setExpression('tristesse'); toast('Trop tard. Tobi : « C\'était presque ça. »', 2000); if (chances <= 0) { over = true; hero.setLocomotion('idle'); finish('ville', money, '€ gagnés', money >= 60 ? 'Nox : « Avec ça, je prends ma retraite. »' : money >= 30 ? 'Nox : « Tobi me doit un salaire. »' : money >= 10 ? 'Nox : « C\'est un début. Tobi a déjà tout dépensé. »' : 'Nox : « Je vais marcher moins vite, pour voir. »'); } else next(); }
      if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) { show(); drawMap(); }
    }
    const bx = x - Math.sin(yaw) * 4.4, bz = z - Math.cos(yaw) * 4.4; camera.position.lerp(new THREE.Vector3(bx, 2.5, bz), 1 - Math.exp(-dt * 5)); camera.lookAt(x, 1.0, z);
    sun.position.set(x + 14, 26, z + 10); sun.target.position.set(x, 0, z);
    hero.update(dt); renderer.render(scene, camera);
  }
  return {
    id: 'ville', nom: 'Nox en ville', ico: '🛴', canvas: true,
    pitch: 'Un campus ouvert à explorer, à pied ou sur la trottinette de Karim. Fais les courses de Tobi avant la fin du temps, et évite les voitures.',
    start() {
      if (!built) build();
      ui = document.createElement('div'); ui.className = 'ville';
      ui.innerHTML = '<canvas class="carte" width="132" height="132"></canvas><div class="obj"></div><button class="trot" aria-label="Trottinette">🛴</button>';
      $('play').append(ui); map = ui.querySelector('.carte'); ui.querySelector('.trot').onclick = ride;
      x = -8; z = -5.6; yaw = Math.PI / 2; speed = 0; riding = false; scooter.visible = false; stick = null; money = 0; chances = 3; limit = 48; order = []; bumpT = 0; over = false; t = 0; last = performance.now();
      camera.position.set(x - 4.4, 2.5, z); hero.setExpression('sourire'); size(); next(); show(); drawMap();
      addEventListener('resize', size); addEventListener('keydown', kd); addEventListener('keyup', ku); canvas.addEventListener('pointerdown', pd); canvas.addEventListener('pointermove', pm); addEventListener('pointerup', pu);
      toast('Flèches ou glisser pour bouger. Espace ou 🛴 : trottinette.', 3200);
      cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    },
    stop() { cancelAnimationFrame(raf); ui?.remove(); ui = null; for (const k in keys) keys[k] = false; removeEventListener('resize', size); removeEventListener('keydown', kd); removeEventListener('keyup', ku); canvas.removeEventListener('pointerdown', pd); canvas.removeEventListener('pointermove', pm); removeEventListener('pointerup', pu); },
  };
}

// ---------------------------------------------------------------- Accueil, fin de partie et partage
const JEUX = [ville(), attrape(), mois(), non()];
let current = null, lastScore = 0;
const lien = (id, s) => `${location.origin}${location.pathname}?jeu=${id}&defi=${s}`;
function open(g) {
  current?.stop(); current = g; $('fin').classList.remove('on'); $('titre').textContent = g.nom; $('gl').style.display = g.canvas ? 'block' : 'none';
  $('stage').classList.add('on'); document.body.style.overflow = 'hidden'; g.start();
}
function home() { current?.stop(); current = null; $('stage').classList.remove('on'); document.body.style.overflow = ''; cards(); }
function finish(id, score, lib, mot) {
  lastScore = score; const best = store.get(id), rec = score > best; if (rec) store.set(id, score);
  $('finScore').textContent = score; $('finLib').textContent = lib; $('finMot').textContent = mot;
  $('finRec').textContent = rec && score > 0 ? 'Nouveau record !' : `Ton record : ${Math.max(best, score)}`;
  const l = top.add(id, score); $('finTop').textContent = l.length > 1 ? 'Tes meilleurs scores : ' + l.join(' · ') : '';
  if (rec && score > 0) son.record(); else son.fin();
  $('fin').classList.add('on');
}
function cards() {
  $('cartes').innerHTML = '';
  for (const g of JEUX) {
    const b = document.createElement('button'); b.className = 'card'; const best = store.get(g.id);
    b.innerHTML = `<span class="ico">${g.ico}</span><h2>${g.nom}</h2><p>${g.pitch}</p><span class="best">${best ? 'Ton record : ' + best : 'Pas encore de score'}</span><span class="go">▶</span>`;
    b.onclick = () => open(g); $('cartes').append(b);
  }
}
$('son').textContent = son.on ? '🔊' : '🔇'; $('son').onclick = () => { $('son').textContent = son.toggle() ? '🔊' : '🔇'; };
$('retour').onclick = home; $('autres').onclick = home; $('rejouer').onclick = () => open(current);
$('partager').onclick = async () => {
  const url = lien(current.id, lastScore), text = `J'ai fait ${lastScore} à « ${current.nom} », le jeu de Tobi & Nox. Fais mieux !`;
  try { if (navigator.share) await navigator.share({ title: 'Tobi & Nox · Les jeux', text, url }); else { await navigator.clipboard.writeText(`${text} ${url}`); toast('Lien copié. Envoie-le à un ami !', 2200); } }
  catch { /* partage annulé */ }
};
cards();
{ // lien de défi : ?jeu=attrape&defi=42
  const q = new URLSearchParams(location.search), g = JEUX.find((x) => x.id === q.get('jeu')), s = Number(q.get('defi'));
  if (g && s > 0) { const d = $('defi'); d.style.display = 'block'; d.textContent = `Un ami a fait ${s} à « ${g.nom} ». À toi de faire mieux. `; const b = document.createElement('button'); b.className = 'pill main'; b.textContent = 'Relever le défi'; b.onclick = () => open(g); d.append(b); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && current?.id === 'attrape') toast('Jeu en pause'); });
