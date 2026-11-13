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
let toastT = 0;
function toast(text, ms = 1500) { const t = $('toast'); t.textContent = text; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
const hud = (items) => { $('hud').innerHTML = items.map(([lib, val]) => `<div><small>${lib}</small><b>${val}</b></div>`).join(''); };

// ---------------------------------------------------------------- Jeu 1 : Nox, attrape !
// Tobi lance ses idées par la fenêtre. Nox attrape les pièces et les kebabs, et évite les « idées de génie » et les factures.
const TOBI = ['« Nox, aie la vision ! »', '« C\'est un investissement ! »', '« Fais-moi confiance. »', '« Cette fois, c\'est la bonne ! »', '« J\'ai une idée de génie. »'];
function attrape() {
  const canvas = $('gl');
  let renderer, scene, camera, hero, rig, ring, raf = 0, last = 0, items = [], sparks = [], halfW = 1, target = 0, x = 0, vx = 0, shake = 0;
  let score = 0, combo = 0, lives = 3, t = 0, spawn = 0, over = false, keys = 0;
  const geo = {}, mat = {};
  function build() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
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
          combo++; const gain = (it.kind === 'kebab' ? 5 : 1) * (1 + Math.floor(combo / 5)); score += gain;
          burst(it.m.position, it.kind === 'kebab' ? '#5ccb74' : '#f2c14e', it.kind === 'kebab' ? 18 : 9);
          hero.setExpression(combo % 5 === 0 ? 'joie' : 'sourire'); if (combo % 10 === 0) { hero.play('cheer'); toast(`Combo x${1 + Math.floor(combo / 5)} !`); }
        } else {
          lives--; combo = 0; shake = 0.35; burst(it.m.position, '#ff5f57', 16); hero.setExpression('colere'); hero.play('facepalm');
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
    if (lock) return; lock = true;
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
    if (c.bad) { combo++; score += 1 + Math.floor(combo / 4); off(c, 'bien'); if (combo && combo % 8 === 0) toast(`Nox : « Tobi. Non. » x${combo}`); }
    else { combo = 0; score = Math.max(0, score - 3); left = Math.max(0, left - 3); off(c, 'mal'); toast('C\'était une bonne idée ! −3 points'); }
    hud([['Score', score]]);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame); const dt = Math.max(0, Math.min(0.05, (now - last) / 1000 || 0)); last = now; if (ended) return;
    left -= dt; el.querySelector('.temps span').style.transform = `scaleX(${Math.max(0, left / total)})`;
    wait -= dt; if (wait <= 0) { wait = THREE.MathUtils.lerp(0.75, 0.36, 1 - left / total); light(); }
    for (const c of cells) if (c.on && (c.t -= dt) <= 0) { if (c.bad) { combo = 0; score = Math.max(0, score - 2); off(c, 'mal'); toast('Tobi l\'a fait. −2 points'); hud([['Score', score]]); } else { score += 1; off(c, 'bien'); hud([['Score', score]]); } }
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

// ---------------------------------------------------------------- Accueil, fin de partie et partage
const JEUX = [attrape(), mois(), non()];
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
