// Lecteur de scénario : lit histoire.txt ligne par ligne et le joue dans la chambre.
// Une ligne = une instruction. Terminer par « & » pour lancer la suivante sans attendre.
import * as THREE from 'three';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { mount, putDown } from './scenes.js';
import { exportVideo, save, tick } from './exporter.js';
import { mountVoices } from './voices.js';
import { nomFichier } from './publications.js';
import { mountPublications } from './publications-ui.js';
import { prononce } from './prononciation.js';
import { voixEssai } from './voix-essai.js';
import { mountWriter } from './writer.js';
import { TONS } from './tones.js';
import { envelope } from './talk.js';
import { createLook } from './look.js';
import { playSfx } from './sound.js';
import { gestures } from './mocap.js';
import { unlockGestures, syncGestures, forgetGestures } from './gestes-prives.js';

const GESTES = {
  saluer: 'wave', oui: 'nod', non: 'no', epaules: 'shrug', reflechir: 'think', montrer: 'point', applaudir: 'clap', pouce: 'thumb',
  viens: 'come', stop: 'stop', gratter: 'scratch', consterne: 'facepalm', regarder: 'look', etirer: 'stretch', saluerbas: 'bow', sauter: 'jump', victoire: 'cheer',
};
const VARIANTES = { montrer: ['montrer', 'viens'], non: ['non', 'stop'], oui: ['oui', 'pouce'] };
const OBJETS = { papier: 'paper', livre: 'book', gourde: 'bottle', tasse: 'mug', telephone: 'phone', sac: 'bag' };
const LIEUX = {
  gauche: [-0.12, 0.62], milieu: [0.26, 0.42], droite: [0.62, 0.1], // une ligne dégagée, à l'écart des jambes de Tobi : personne ne se cache derrière un autre
  centre: [0.1, 0.2], tapis: [0.1, -0.3], fenetre: [0, -1.6], lit: [0.12, 0.35], bureau: [0.42, -0.46], armoire: [0.6, 0.4],
  frigo: [0.5, 1.24], miroir: [-0.42, -1.5], couloir: [0, 1.9], porte: [0, 2.72],
};
// Places en hauteur pour les Aînés, avec apparait : x, y, z
const PERCHOIRS = { bureau: [0.96, 0.745, -0.6], chaise: [0.42, 0.5, -1.05], lit: [-0.72, 0.63, 0.72], rebord: [0.22, 1.1, -1.72] };
// position caméra, cible, focale
const PLANS = {
  large: [[0.05, 1.55, 2.75], [0, 0.9, -1.9], 58],
  bureau: [[-0.3, 1.55, -1.72], [0.85, 0.92, -0.75], 62],
  lit: [[0.1, 2.15, -1.7], [-0.75, 0.62, 0.25], 62],
  fenetre: [[0.1, 1.3, 0.7], [0, 0.95, -1.9], 52],
  frigo: [[-0.35, 1.95, 1.3], [0.9, 0.6, 1.2], 62],
  sortie: [[-0.1, 1.55, 0.95], [0.05, 1.1, 3], 46],
  porte: [[0, 1.5, -0.9], [0, 1.0, 3], 44],
  miroir: [[0.72, 1.7, -0.4], [-0.7, 1.15, -1.5], 54],
  dessus: [[-4.2, 6.6, 6.6], [0, 0.6, 0.3], 26],
  clavier: [[0.66, 1.2, -1.5], [1.0, 0.8, -1.02], 42],
  pc: [[0.42, 1.0, -1.05], [1.06, 0.86, -1.05], 46],
  ecran: [[0.8, 1.02, -0.66], [1.1, 0.92, -1.05], 44],
  tableau: [[0.34, 1.32, -1.06], [0.42, 1.08, -1.84], 38],
};
const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Découpe une réplique en lignes courtes, sans jamais dépasser le cadre.
function chunk(text) {
  const words = text.split(/\s+/), groups = [];
  let start = 0, size = 0;
  words.forEach((w, i) => {
    if (i > start && (size + w.length > 22 || /[.?!…]$/.test(words[i - 1]))) { groups.push([start, i]); start = i; size = 0; }
    size += w.length + 1;
  });
  groups.push([start, words.length]);
  return { words, groups, chars: text.length + 1 };
}

export function parseStory(text) {
  const out = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    let line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const free = line.endsWith('&');
    if (free) line = line.slice(0, -1).trim();
    const direct = /^DIRECT\s/.test(line);
    if (direct) line = line.slice(7).trim();
    const [first, ...rest] = line.split(/\s+/);
    const who = /^(TOBI|NOX|CLAUDE|CODEX|GEMINI)$/.test(first) ? first.toLowerCase() : null;
    const verb = plain(who ? rest.shift() || '' : first);
    let text = rest.join(' '), tone = null;
    const t = verb === 'dit' && text.match(/^\(([^)]+)\)\s*(.*)$/);
    if (t) { tone = plain(t[1]).replace(/[\s-]/g, ''); text = t[2]; }
    const spoken = text.replace(/\[([^|\]]+)\|([^\]]+)\]/g, '$2'); // [affiché|prononcé]
    text = text.replace(/\[([^|\]]+)\|([^\]]+)\]/g, '$1');
    out.push({ n: i + 1, who, verb, args: rest, text, spoken, tone, free, direct, raw: line });
  });
  return out;
}

// À qui parle-t-il ? Un prénom appelé dans la réplique, sinon celui à qui il répond (le dernier qui a parlé), sinon celui qui parle ensuite.
// Un prénom cité au milieu d'une phrase ne compte pas.
const APPEL = /(?:^|[.!?…]\s+|,\s*)(Nox|Tobi|Claude|Codex|Gemini)\b\s*(?:Code\s*)?(?=[,.!?…:]|$)/g; // « Nox, … » ou « …, Claude ! » : pas « insulter Claude ! »
function adresse(list) {
  const lines = list.filter((c) => c.verb === 'dit' && c.who);
  lines.forEach((c, i) => {
    const names = [...c.text.matchAll(APPEL)].map((m) => m[1].toLowerCase()).filter((n) => n !== c.who);
    const prev = lines.slice(0, i).reverse().find((x) => x.who !== c.who);
    c.to = names[names.length - 1] || prev?.who || lines.slice(i + 1).find((x) => x.who !== c.who)?.who || null;
  });
}

export function createPlayer(v, ui) {
  const actor = (id) => v.actors.find((a) => a.id === id);
  // Avec qui parle-t-il ? Le dernier qui a parlé, sinon le plus proche.
  let lastTalk = null;
  const partner = (a) => {
    if (lastTalk && lastTalk !== a && lastTalk.hero.root.visible) return lastTalk;
    const near = v.actors.filter((x) => x !== a && x.hero.root.visible).sort((p, q) => v.pos(p).distanceTo(v.pos(a)) - v.pos(q).distanceTo(v.pos(a)));
    return near[0] || v.actors.find((x) => x !== a);
  };
  const room = v.room;
  let talkTo = null, grosOf = null, lowShot = false, shotN = 0, hiddenForShot = [];
  let running = false, stopped = false, auto = false, track = null, trackT = 0, drift = 0, closing = false, playT0 = 0;
  const subtitles = [], clips = [], sfxList = [];
  const look = createLook(v);
  for (const x of v.actors) x.hero.avoid = [{ x0: 0.78, x1: 1.4, z0: -1.88, z1: -0.12, top: 0.745 }];
  // Le soir est l'ambiance par défaut : ses effets sont préparés dès l'ouverture, pas pendant l'export.
  look.setMood('soir');
  look.warm();
  const sfx = (type) => {
    if (ffing) return;
    sfxList.push({ type, start: v.simTime - playT0 });
    if (!offline) { audioCtx ||= new AudioContext(); playSfx(audioCtx, audioCtx.destination, type, audioCtx.currentTime + 0.005); }
  };
  let voices = [], lineIdx = 0, offline = false, ffing = false, cap = null, audioCtx = null;
  const lens = () => (v.camera.aspect < 1 ? 1.3 : 1); // en vertical, on ouvre un peu le cadre
  async function fast(c) { // joue une action sans la montrer : le temps de la vidéo ne bouge pas
    ffing = true; v.hold = true;
    const t0 = v.simTime; let done = false, err = null;
    Promise.resolve().then(() => run(c)).catch((e) => { err = e; }).finally(() => { done = true; });
    for (let n = 0; !done && n < 4000; n++) { v.step(1 / 30, true); await tick(); }
    track = null; playT0 += v.simTime - t0;
    ffing = false; v.hold = false;
    if (err) throw err;
  }
  const pending = new Set();

  // --- Réalisateur : champ-contrechamp quand ils parlent, panoramique quand ils marchent
  const ray = new THREE.Raycaster();
  // Les visées de caméra testent la chambre des dizaines de fois par plan : sans cet index, chaque plan bloquait l'image plusieurs secondes.
  // Tout objet de la chambre peut cacher un personnage : tableau, portes, chaise, frigo, volet...
  let blockers = [];
  function findBlockers() { // relevé au début de chaque lecture : les objets posés au sol comptent aussi
    const skip = new Set(v.actors.map((x) => x.hero.root)); skip.add(v.camera);
    blockers = [];
    const walk = (o) => {
      if (skip.has(o) || o.visible === false) return;
      if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.name !== 'dehors' && o.name !== 'miroir' && o.geometry?.attributes.position) {
        if (!o.geometry.boundsTree) { o.geometry.computeBoundsTree = computeBoundsTree; o.geometry.computeBoundsTree({ indirect: true }); }
        o.raycast = acceleratedRaycast; blockers.push(o);
      }
      o.children.forEach(walk);
    };
    walk(v.scene);
  }
  const eyes = (a) => { const h = a.hero.bones.head.getWorldPosition(new THREE.Vector3()); h.y += a.eyeUp; return h; };
  const clear = (from, to) => {
    const d = to.clone().sub(from), L = d.length();
    ray.set(from, d.normalize()); ray.far = L;
    return ray.intersectObjects(blockers, false).length === 0;
  };
  const inside = (c) => c.x > -1.34 && c.x < 1.34 && c.z > -1.84 && c.z < 2.9 && c.y > 0.25 && c.y < 2.42;
  // Caméra vivante : arrivée en douceur, léger arc, avancée lente et souffle de caméra à l'épaule.
  let shot = null, shotSide = 1;
  const shoot = (pos, target) => { shotSide = -shotSide; shot = { pos: pos.clone(), target: target.clone(), t: 0, side: shotSide }; };
  const camVec = new THREE.Vector3(), camUp = new THREE.Vector3(0, 1, 0);
  function moveShot(dt) {
    shot.t += dt;
    const t = shot.t, land = 1 - (1 - Math.min(1, t / 0.32)) ** 3, slow = 1 - Math.exp(-t / 2.2);
    camVec.copy(shot.pos).sub(shot.target).multiplyScalar(1 + 0.055 * (1 - land) - 0.07 * slow).applyAxisAngle(camUp, shot.side * (0.035 * (1 - land) + 0.05 * slow));
    const n = v.simTime, sway = (a, b) => Math.sin(n * a) + 0.5 * Math.sin(n * b + 0.7);
    v.camera.position.copy(shot.target).add(camVec);
    v.camera.position.x += 0.0035 * sway(1.3, 2.9); v.camera.position.y += 0.003 * sway(1.1, 2.3); v.camera.position.z += 0.0035 * sway(0.9, 2.1);
    v.controls.target.copy(shot.target); v.controls.target.x += 0.0022 * sway(0.8, 1.9); v.controls.target.y += 0.0022 * sway(1.2, 2.7);
    v.controls.update();
  }
  function aim(pos, target, fov) {
    room.chair.visible = true;
    v.camera.fov = fov * lens(); v.camera.updateProjectionMatrix();
    v.controls.minDistance = 0.1; v.controls.target.copy(target); v.camera.position.copy(pos); v.controls.update();
    shoot(pos, target);
  }
  // Cadrage : la tête garde toujours de l'air au-dessus d'elle. Les murs sont traversables pour reculer.
  const room2 = (c) => c.x > -1.32 && c.x < 1.32 && c.z > -1.8 && c.z < 2.85 && c.y > 0.14 && c.y < 2.4; // toujours dans la pièce : à travers un mur, on voyait l'envers du décor
  const seen = (c, p) => { const d = p.clone().sub(c), L = d.length(); ray.set(c, d.normalize()); ray.far = L - 0.12; return ray.intersectObjects(blockers, false).length === 0; };
  const blocks = (b, c, p) => { // l'autre personnage ne doit pas passer devant l'objectif
    if (!b.hero.root.visible) return false;
    const line = new THREE.Line3(c, p), o = new THREE.Vector3();
    const big = b.id === 'tobi', e = eyes(b), r = big ? 0.3 : b.extra ? 0.3 : 0.17;
    return (big ? [0, 0.35, 0.7, 1.05, 1.4].map((d) => e.clone().setY(Math.max(0.08, e.y - d))).concat(v.pos(b).clone().setY(0.1)) : [e, e.clone().setY(e.y - 0.16)]).some((x) => { line.closestPointToPoint(x, true, o); return o.distanceTo(x) < r; });
  };
  // La caméra ne se place jamais dans un autre personnage.
  const chairClear = (c) => c.y > 1.05 || Math.hypot(c.x - room.chair.position.x, c.z - room.chair.position.z) > 0.42;
  const chairAhead = (c, p) => { // le dossier ne doit pas passer devant celui qu'on filme
    const C = room.chair.position, dx = p.x - c.x, dz = p.z - c.z, t = Math.max(0, Math.min(1, ((C.x - c.x) * dx + (C.z - c.z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(c.x + dx * t - C.x, c.z + dz * t - C.z) < 0.34 && Math.hypot(p.x - C.x, p.z - C.z) > 0.45;
  };
  const chairTaken = () => v.actors.some((x) => x.hero.seat && Math.hypot(v.pos(x).x - room.chair.position.x, v.pos(x).z - room.chair.position.z) < 0.45);
  const free = (c, a) => (!chairTaken() || chairClear(c)) && v.actors.every((x) => x === a || !x.hero.root.visible || (x.id === 'tobi' ? Math.hypot(c.x - v.pos(x).x, c.z - v.pos(x).z) > 0.62 : eyes(x).distanceTo(c) > 0.38)); // ses bras bougent : on garde de la marge
  const unblock = (a) => {
    const c = v.camera.position, near = v.actors.filter((x) => x !== a && x.hero.root.visible && (x.id === 'tobi' ? Math.hypot(c.x - v.pos(x).x, c.z - v.pos(x).z) <= 0.42 : eyes(x).distanceTo(c) <= 0.38));
    for (const x of near) { x.hero.root.visible = false; hiddenForShot.push(x); }
  };
  const showHidden = () => { for (const x of hiddenForShot) x.hero.root.visible = true; hiddenForShot = []; };
  // Un meuble ne doit pas boucher le haut et le centre de l'image. Le bas peut montrer le lit ou le bureau où le personnage est assis.
  function clearFrame(c, target, fov) {
    const f = target.clone().sub(c), L = f.length(); f.normalize();
    const right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(), upv = new THREE.Vector3().crossVectors(right, f);
    const th = Math.tan((fov * Math.PI) / 360), tw = th * v.camera.aspect, free = !chairTaken();
    let hits = 0;
    for (let i = -1; i <= 3; i++) for (let j = -2; j <= 2; j++) {
      const d = f.clone().addScaledVector(right, (j / 2.6) * tw).addScaledVector(upv, (i / 3.6) * th).normalize();
      ray.set(c, d); ray.far = L * 0.55;
      if (ray.intersectObjects(blockers, false).some((h) => h.point.y > 0.06 && !(free && h.object.parent === room.chair))) hits += 1;
    }
    return hits <= 2;
  }
  function frame(a, tight, front) {
    const b = talkTo || partner(a), H = eyes(a), big = a.id === 'tobi', up = new THREE.Vector3(0, 1, 0), others = v.actors.filter((x) => x !== a);
    const near = !a.carried && !b.carried && b.hero.root.visible && eyes(b).sub(H).setY(0).length() > 0.3;
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(a.hero.root.quaternion).setY(0);
    if (talkTo && !a.hero.seat && !a.spot && a.faceYaw != null) fwd.set(Math.sin(a.faceYaw), 0, Math.cos(a.faceYaw)); // il va se tourner : on filme déjà son visage
    if (a.extra) fwd.set(0, 0, 1); // sans partenaire, un logo se filme côté porte, là où il y a du recul
    const toB = eyes(b).sub(H).setY(0).normalize(), across = !front && near && (a.extra || (a.id === 'tobi' && a.hero.seat) || fwd.clone().normalize().dot(toB) > 0.35); // face à face, ou côte à côte ?
    const to = (across ? (a.id === 'tobi' && a.hero.seat ? toB.clone().add(fwd.clone().normalize().multiplyScalar(1.4)) : toB) : fwd).normalize(); // assis, on reste du côté de son visage
    a.look = near ? b : a.extra ? a.look : null; if (near) b.look = a; // face à face, ils se regardent ; côte à côte, celui qui écoute tourne la tête
    const top = H.y + (big ? 0.24 : 0.2);
    // En vertical, le cadre est étroit : la largeur vaut 0,56 fois la hauteur. On recule pour garder le corps entier, les gestes et un peu de décor.
    const tall = v.camera.aspect < 1;
    const span = tall ? (tight ? (big ? 1.55 : a.extra ? 1.2 : 1.05) : (big ? 1.95 : a.extra ? 1.55 : 1.4)) : tight ? (big ? 0.9 : a.extra ? 0.9 : 0.72) : (big ? 1.4 : a.extra ? 1.2 : 1.02); // les logos sont plus larges que hauts : le cadre vertical doit les contenir
    // On filme du côté où il regarde : d'abord de trois quarts face, et seulement s'il n'y a aucune place, de plus loin sur le côté.
    const look3 = (near && !a.extra ? toB.clone().multiplyScalar(0.7).add(fwd.clone().normalize().multiplyScalar(0.3)) : fwd.clone()).normalize();
    const standing = !a.extra && near && !a.hero.seat && !a.spot; // debout, il s'ouvre vers la caméra : on peut le filmer de plus loin
    const good = a.extra ? [] : standing ? [0.1, -0.35] : [0.5, 0.15];
    const passes = [...good.map((n) => [n, true]), ...good.map((n) => [n, false]), [-2, true], [-2, false]]; // visage et image dégagée d'abord
    for (const [need, clean] of passes) for (const [fov, k] of tall ? [[42, 1], [54, 1], [66, 1], [54, 0.88], [66, 0.88], [74, 0.8]] : [[32, 1], [42, 1], [54, 1], [42, 0.85], [54, 0.85], [54, 0.72]]) { // la pièce est étroite : on ouvre l'objectif avant de se rapprocher
      const sp = span * k, dist = sp / (2 * Math.tan((fov * Math.PI) / 360)), mid = a.extra ? Math.max(H.y + 0.02, 0.3) : Math.max(top + sp * 0.13 - sp / 2, 0.3); // un petit logo au sol : la caméra reste à sa hauteur, au-dessus du plancher
      for (const ang of across ? [0.6, -0.6, 0.8, -0.8, 1, -1, 1.25, -1.25] : [0.3, -0.3, 0.55, -0.55, 0.85, -0.85, 1.15, -1.15]) {
        const c = H.clone().addScaledVector(to.clone().applyAxisAngle(up, ang), dist); c.y = mid + (big ? 0.05 : 0.03) - (lowShot ? sp * 0.2 : 0);
        const camDir = c.clone().sub(H).setY(0).normalize();
        if ((standing ? camDir.dot(toB) : camDir.dot(look3)) < need) continue;
        if (clean && !clearFrame(c, new THREE.Vector3(H.x, mid, H.z), fov)) continue;
        const side = new THREE.Vector3(c.z - H.z, 0, H.x - c.x).normalize().multiplyScalar(sp * (tall ? 0.26 : a.extra ? 0.24 : 0.36)); // les bords du cadre restent dégagés aussi
        const low = Math.max(0.2, mid - sp * 0.3), corner = (s) => H.clone().addScaledVector(side, s).setY(low); // et le bas de l'image, où un meuble passerait devant
        if (room2(c) && free(c, a) && clear(H, c) && seen(c, H) && seen(c, H.clone().setY(H.y - (big ? 0.3 : 0.14))) && seen(c, H.clone().add(side)) && seen(c, H.clone().sub(side)) && (!tall || (seen(c, corner(1)) && seen(c, corner(-1)))) && seen(c, H.clone().setY(H.y + (big ? 0.16 : 0.1))) && !others.some((x) => blocks(x, c, H) || ((a.id === 'nox' || a.extra) && x.id === 'tobi' && (blocks(x, c, H.clone().add(side)) || blocks(x, c, H.clone().sub(side)))))) { // Nox et les logos sont petits : le corps de Tobi ne doit pas manger le plan
          aim(c, new THREE.Vector3(H.x, mid, H.z), fov / lens());
          if (!chairTaken() && (!chairClear(c) || chairAhead(c, v.pos(a)))) room.chair.visible = false; // comme sur un tournage : on retire la chaise vide qui gênerait le plan
          if (!near) a.faceYaw = Math.atan2(c.x - v.pos(a).x, c.z - v.pos(a).z);
          if (standing) { const open = toB.clone().lerp(camDir, camDir.dot(toB) < 0.2 ? 0.85 : 0.6); a.faceYaw = Math.atan2(open.x, open.z); } // comme au théâtre : de trois quarts, jamais de profil
          a.cheat = standing ? 0.55 : !near ? 0 : a.id === 'tobi' ? 0.5 : 0.35; b.cheat = 0; // assis aussi, il ne plonge pas la tête vers Nox
          return;
        }
      }
    }
    if (a.extra && !front) { frame(a, tight, true); return; } // pas de place côté partenaire : on filme le logo de face
    // Dernier recours : celui qui parle doit être à l'image. On tourne autour de lui jusqu'à trouver une vue dégagée, avant tout plan large.
    for (const [fov, k, strict] of [[54, 1, true], [66, 1, true], [66, 0.85, true], [74, 0.8, true], [66, 1, false], [74, 0.8, false]]) {
      const sp = span * k, dist = sp / (2 * Math.tan((fov * Math.PI) / 360)), mid = Math.max(a.extra ? H.y + 0.02 : top + sp * 0.13 - sp / 2, 0.3);
      for (let i = 0; i < 16; i++) {
        const c = H.clone().addScaledVector(fwd.clone().normalize().applyAxisAngle(up, ((i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI) / 8), dist); c.y = mid + 0.03;
        const edge = new THREE.Vector3(c.z - H.z, 0, H.x - c.x).normalize().multiplyScalar(0.16);
        if (room2(c) && free(c, a) && clear(H, c) && seen(c, H) && seen(c, H.clone().add(edge)) && seen(c, H.clone().sub(edge)) && seen(c, H.clone().setY(H.y - 0.1)) && !(strict && others.some((x) => blocks(x, c, H)))) { aim(c, new THREE.Vector3(H.x, mid, H.z), fov / lens()); return; }
      }
    }
    cut('large');
  }
  const closeUp = (a) => frame(a, true);
  const talkShot = (a) => frame(a, false);
  function duo() { // les deux dans le cadre
    v.actors[0].look = v.actors[1]; v.actors[1].look = v.actors[0];
    const [p, q] = v.actors.map((x) => eyes(x)), m = p.clone().lerp(q, 0.5);
    const side = q.clone().sub(p).setY(0).normalize(), n = new THREE.Vector3(-side.z, 0, side.x);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(v.actors[0].hero.root.quaternion);
    for (const s of n.dot(fwd) > 0 ? [1, -1] : [-1, 1]) { // du côté où Tobi regarde
      const c = m.clone().addScaledVector(n, 2.3 * s); c.y = 1.15;
      if (room2(c) && seen(c, p) && seen(c, q)) { aim(c, new THREE.Vector3(m.x, 0.92, m.z), 38 / lens()); return; }
    }
    cut('large');
  }
  const ANCHORS = [[0.1, 1.75, 2.7], [0.6, 1.95, -1.7], [-0.35, 1.9, -1.7], [0.2, 1.8, 1.35], [-0.35, 1.8, 0.75]].map((p) => new THREE.Vector3(...p));
  function follow(a) {
    const H = eyes(a);
    const c = ANCHORS.filter((p) => clear(H, p)).sort((p, q) => Math.abs(p.distanceTo(H) - 2.2) - Math.abs(q.distanceTo(H) - 2.2))[0] || ANCHORS[0];
    aim(c, H.clone().add(new THREE.Vector3(0, -0.3, 0)), 50);
    track = a;
  }
  v.onFrame = (dt) => {
    ui.tick?.(dt);
    look.update(dt);
    if (cap) { // sous-titres : une ligne courte, le mot prononcé surligné
      const f = Math.min(0.999, (v.simTime - cap.t0) / cap.dur) * cap.chars;
      let i = 0, n = 0;
      while (i < cap.words.length - 1 && n + cap.words[i].length + 1 <= f) { n += cap.words[i].length + 1; i++; }
      const g = cap.groups.find((x) => i >= x[0] && i < x[1]);
      ui.caption({ words: cap.words.slice(g[0], g[1]), active: i - g[0], color: cap.color });
    }
    if (shot && running && !track) moveShot(dt);
    if (!track) return;
    const H = eyes(track).add(new THREE.Vector3(0, track.id === 'tobi' ? -0.3 : 0.05, 0));
    v.controls.target.lerp(H, 1 - Math.exp(-dt * 2.6)); v.controls.update();
    trackT += dt;
    if (trackT > 0.7) { trackT = 0; if (!clear(eyes(track), v.camera.position)) follow(track); } // obstacle : changement d'angle
  };

  function cut(name) {
    const p = PLANS[name] || PLANS.large;
    room.chair.visible = true;
    v.camera.fov = p[2] * lens(); v.camera.updateProjectionMatrix();
    v.controls.minDistance = 0.1;
    v.controls.target.set(...p[1]); v.camera.position.set(...p[0]);
    v.controls.update();
    if (name === 'dessus') shot = null; else shoot(v.camera.position, v.controls.target);
  }
  const place = (a, [x, z]) => a.hero.root.position.set(x, 0, z);
  async function reset() {
    for (const a of v.actors) {
      a.follow = null; a.goal = null; a.look = null; a.hero.motion.clearPose();
      if (a.id === 'nox' && a.carried) await putDown(v);
      await v.leave(a);
      if (a.hero.seat) await v.stand(a);
      v.stash(a); if (a.bag) { v.drop(a, a.bag); }
      a.hero.setExpression('neutre');
    }
    room.setShutter(false); room.lamp.intensity = 0; room.sillBag.visible = true; room.laptop.clear('notes.txt'); room.chair.visible = true;
    room.entryDoor.rotation.y = 0; room.fridgeDoor.rotation.y = 0;
    place(actor('tobi'), [0, 0.2]); place(actor('nox'), [0.3, 0.5]);
    actor('tobi').hero.root.visible = true; actor('nox').hero.root.visible = true;
    for (const a of v.actors) if (a.extra) { a.hero.root.visible = false; place(a, [0, 2.4]); }
    lastTalk = null;
  }
  // Horloge de l'histoire, affichée sur le second ordinateur. Règles complètes : CHARTE_SCRIPTS.md, « Heure et date ».
  // Sans indication, l'heure et la date sont stables pour un épisode et restent dans une plage neutre.
  // Dès que le script parle d'une heure ou d'un jour, il doit les imposer avec HEURE et DATE : tools/audit-temps.mjs le vérifie.
  const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const PLAGES = { soir: [20 * 60, 210], jour: [13 * 60, 300], matin: [7 * 60, 240], nuit: [2 * 60, 150] }; // début en minutes, durée
  const NOMBRES = { deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10 };
  const clockText = (t) => `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  let clockSeed = 1, clockMood = 'soir', clockFixed = false, jumps = 0, today = { wd: 0, day: 1, month: 10 };
  const clock = (mood = clockMood) => { const [start, span] = PLAGES[mood], r = (clockSeed * 2654435761 + jumps * 40503) >>> 0; return clockText(start + (r % span)); };
  const dateText = () => `${JOURS[today.wd]} ${today.day} ${MOIS[today.month]}`;
  function setClock(text) { // au début de chaque lecture
    clockSeed = [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    jumps = 0; clockMood = 'soir'; clockFixed = false;
    today = { wd: clockSeed % 7, day: 1 + (clockSeed % 27), month: 10 };
    room.lock.set({ time: clock(), day: '', date: dateText(), fixed: false });
  }
  function advanceDays(n) {
    today.wd = (today.wd + n) % 7; today.day += n;
    if (today.day > 28) { today.day -= 28; today.month = (today.month + 1) % 12; }
  }
  function daysIn(title) { // combien de jours passent, d'après le titre de l'écran
    const t = plain(title), m = /(\d+|\p{L}+) jours? plus tard/u.exec(t);
    if (m) return Number(m[1]) || NOMBRES[m[1]] || 1;
    if (/semaine (plus tard|suivante)/.test(t)) return 7;
    return /lendemain|suivante|vingt-quatre|24 h/.test(t) ? 1 : 0;
  }
  function timeJump(title, big) { // les pages s'envolent, et le second écran suit l'histoire
    sfx('whoosh');
    jumps += 1; advanceDays(daysIn(title));
    const t = plain(title), exact = /^(\d{1,2}) h (\d{2})$/.exec(big), same = /vingt-quatre|24 h/.test(t);
    const time = exact ? `${exact[1].padStart(2, '0')}:${exact[2]}` : same ? undefined : clock(/matin/.test(t) ? 'matin' : /\bnuit\b/.test(t) ? 'nuit' : /\bsoir\b/.test(t) ? 'soir' : clockMood);
    clockFixed = !!exact;
    room.lock.set({ ...(time ? { time } : {}), date: dateText(), fixed: clockFixed, ...(/^jour\s/i.test(big) ? { day: big } : {}) });
    return v.wait(2.3);
  }
  let hookText = '', speaking = null; // la réplique en cours : un regard en retard ne vise jamais la suivante
  async function run(c) {
    const a = c.who ? actor(c.who) : null;
    switch (c.verb) {
      case 'plan': {
        const k = plain(c.args[0] || 'large'); auto = k === 'auto'; track = null;
        look.hideInsert();
        if (k === 'duo') { auto = false; duo(); return undefined; }
        grosOf = null;
        showHidden(); // ceux qu'on avait retirés du plan précédent
        if (k === 'gros') { auto = false; grosOf = actor(plain(c.args[1] || 'tobi')); closeUp(grosOf); return undefined; }
        if (!auto) cut(k);
        if (k === 'pc' || k === 'ecran' || k === 'clavier') { // la caméra ne doit jamais se retrouver dans un personnage
          hiddenForShot = v.actors.filter((x) => x.hero.root.visible && v.pos(x).distanceTo(v.camera.position.clone().setY(v.pos(x).y)) < 0.5);
          for (const x of hiddenForShot) x.hero.root.visible = false;
        }
        return undefined;
      }
      case 'ambiance': { const k = plain(c.args[0] || 'jour'); look.setMood(k); clockMood = k === 'soir' ? 'soir' : 'jour'; if (!clockFixed) room.lock.set({ time: clock() }); return undefined; }
      case 'pc': room.laptop.show(c.text.split('|').map((x) => x.trim())); return undefined;
      case 'appelle': { // la main part d'abord, le téléphone arrive à la taille, puis monte à l'oreille
        a.look = null; a.hero.motion.clearPose(); v.attach(a, v.item('phone')); a.hero.motion.setHold(false);
        const it = a.held; if (it?.obj) { it.obj.position.set(...PHONE_EAR.pos); it.obj.rotation.set(...PHONE_EAR.rot); }
        a.hero.motion.togglePose('call'); return v.wait(0.6);
      }
      case 'raccroche': a.hero.motion.clearPose(); await v.wait(0.45); v.stash(a); return undefined;
      case 'message': { // il sort le téléphone, puis on lit la conversation à l'écran
        const [name = '', ...rows] = c.text.split('|').map((x) => x.trim());
        const lines = rows.filter(Boolean).map((x) => { // > message envoyé, [23:47] heure discrète si elle compte
          const m = /^(>?)\s*(?:\[(\d{1,2}[:h]\d{2})\])?\s*(.*)$/.exec(x);
          return { me: !!m[1], time: m[2] || '', text: m[3] };
        });
        sfx('bip');
        if (a?.id === 'tobi' && !a.hero.seat) { v.attach(a, v.item('phone')); a.hero.motion.setHold(false); a.hero.motion.clearPose(); a.hero.motion.togglePose(clipFor(a, 'mx_texto_debout')); closeUp(a); await v.wait(0.8); }
        look.chat(name, lines);
        await v.wait(Math.min(7, 1.8 + lines.length * 0.8 + lines.reduce((n, l) => n + l.text.length, 0) * 0.035));
        look.hideInsert();
        if (a?.held?.name === 'phone') { a.hero.motion.clearPose(); await v.wait(0.25); v.stash(a); }
        return undefined;
      }
      case 'compteur': hookText = ''; ui.counter(c.text); return undefined;
      case 'accroche': { // phrase forte des premières secondes : elle dit tout de suite ce qui est en jeu
        const t = c.text; hookText = t; ui.counter(t);
        v.wait(3).then(() => { if (hookText === t) { hookText = ''; ui.counter(''); } });
        return undefined;
      }
      case 'lumiere': look.setLight(plain(c.args[0] || 'normale')); return undefined;
      case 'insert': {
        const [title = '', big = '', small = ''] = c.text.split('|').map((x) => x.trim());
        const kind = look.insert(title, big, small);
        if (kind === 'temps') return timeJump(title, big);
        sfx(/[€$]/.test(big) ? 'ding' : 'pop');
        return v.wait(Math.min(3.4, 2.1 + (title.length + big.length + small.length) * 0.02)); // le temps de lire avant le plan suivant
      }
      case 'temps': { // saut dans le temps : TEMPS Trois jours plus tard | Jour 4 | Reste : 20 €
        const [title = '', big = '', small = ''] = c.text.split('|').map((x) => x.trim());
        look.insert(title, big, small, 'temps');
        return timeJump(title, big);
      }
      case 'heure': clockFixed = true; room.lock.set({ time: c.args[0] || '', fixed: true }); return undefined; // heure imposée par l'histoire : elle ne bouge plus
      case 'date': { // DATE Mardi, ou DATE Mardi 11 février
        const [wd, day, month] = c.text.split(/\s+/), w = JOURS.findIndex((x) => plain(x) === plain(wd || '')), m = MOIS.findIndex((x) => plain(x) === plain(month || ''));
        if (w < 0) throw new Error(`jour inconnu : ${wd}`);
        today.wd = w; if (Number(day)) today.day = Number(day); if (m >= 0) today.month = m;
        room.lock.set({ date: dateText() }); return undefined;
      }
      case 'bruit': sfx(plain(c.args[0] || 'pop')); return undefined;
      case 'attendre': return v.wait(parseFloat(c.args[0]) || 1);
      case 'fondu': {
        const k = plain(c.args[0] || '');
        if (k === 'direct') { ui.curtain(false, true); return undefined; }
        ui.curtain(k === 'noir'); return v.wait(0.8);
      }
      case 'titre': ui.card(c.text); await v.wait(2.2); ui.card(''); return undefined;
      case 'volet': return room.setShutter(plain(c.args[0] || '') === 'ouvert');
      case 'lampe': room.lamp.intensity = plain(c.args[0] || '') === 'allumee' ? 2.2 : 0; return undefined;
      case 'porte': return v.swing(room.entryDoor, plain(c.args[0] || '') === 'ouverte' ? -1.5 : 0, 0.8);
      case 'dit': {
        speaking = c; showHidden();
        const to = c.to && actor(c.to), b = to?.hero.root.visible ? to : partner(a), tone = TONS[c.tone], before = a.look;
        track = null;
        for (const x of v.actors) { // tout le monde regarde celui qui parle, mais pas au même instant : on réagit à la voix
          if (x === a || !x.hero.root.visible || x.carried || x.hero.seat === 'lie') continue;
          if (x === to || x.look === a) { x.look = a; continue; } // celui à qui l'on parle le regardait déjà
          const me = c; v.wait(0.35 + 0.1 * (x.id.length % 3)).then(() => { // la tête d'abord, le corps ensuite
            if (speaking !== me || !x.hero.root.visible) return;
            x.look = a; if (!x.goal && !x.hero.seat && !x.spot) v.wait(0.25).then(() => { if (speaking === me) v.face(x, a, true); });
          });
        }
        if (b.hero.root.visible && !a.carried && !b.carried && a.hero.seat !== 'lie' && b.hero.seat !== 'lie') { a.look = b; if (!a.goal && !a.hero.seat && !a.spot) v.face(a, b, true); }
        shotN++;
        const fort = !!a.hero.seat || c.text.split(/\s+/).length <= 4 || ['panique', 'surpris', 'colere', 'punchline', 'illumine'].includes(c.tone);
        lowShot = !fort && a.id === 'tobi' && shotN % 3 === 0;
        talkTo = b; if (grosOf === a) frame(a, fort); talkTo = null; lowShot = false; unblock(a); // gros plan pour les temps forts, plan moyen ou bas sinon
        if (a.hero.motion.pose === 'call') a.look = null; // au téléphone, il écoute la personne au bout du fil
        if (before !== a.look && a.look) await v.wait(0.26); // il se tourne vers l'autre, puis il parle
        if (tone) { a.hero.setExpression(tone.visage); if (tone.ecoute) b.hero.setExpression(tone.ecoute); }
        if (auto) {
          if (!a.carried && !b.carried && b.hero.root.visible && a.hero.seat !== 'lie' && b.hero.seat !== 'lie' && v.pos(a).distanceTo(v.pos(b)) > 0.4) { b.look = a; if (!a.hero.seat && !a.spot) v.face(a, b, true); if (!b.hero.seat && !b.spot) v.face(b, a, true); } else if (b.hero.root.visible && !a.hero.seat && !a.spot) v.face(a, b, true);
          talkTo = b; frame(a, !!a.hero.seat); talkTo = null; unblock(a);
        }
        a.hero.energy = ENERGIE[c.tone] || 1;
        const t0 = v.simTime, voice = voices[lineIdx++], dur = voice?.buffer.duration;
        const talkClip = clipFor(a, a.hero.seat ? 'mx_parle_assis' : 'mx_parle'); // gestuelle enregistrée, si elle est activée
        const geste = !a.hero.seat && tone?.geste && lineIdx % 3 === 0 ? VARIANTES[tone.geste]?.[lineIdx % VARIANTES[tone.geste].length] || tone.geste : null; // de temps en temps, un geste voulu
        const emotion = clipFor(a, EMOTIONS[c.tone]), assisOk = !a.hero.seat, talkPose = a.id === 'tobi' && !a.hero.motion.pose ? (emotion && assisOk && a.hero.motion.has(emotion) ? emotion : a.hero.motion.has(talkClip) ? talkClip : null) : null;
        if (talkPose) a.hero.motion.togglePose(talkPose);
        if (geste && !emotion && !a.hero.motion.pose) a.hero.play(GESTES[geste]); // le geste part avec la voix
        if (voice) {
          voice.env ||= envelope(voice.buffer);
          clips.push({ buffer: voice.buffer, start: t0 - playT0 });
          if (!offline) { audioCtx ||= new AudioContext(); const src = audioCtx.createBufferSource(); src.buffer = voice.buffer; src.connect(audioCtx.destination); src.start(); }
        }
        cap = { ...chunk(c.text), t0, dur: dur || c.text.length * 0.078 + 0.1, color: { nox: '#8feaff', claude: '#f2a585', codex: '#b9b0ff', gemini: '#8fbaff' }[a.id] || '#f2b92e' };
        const essai = !voice && !offline && ui.trial?.() ? voixEssai.dit(a.id, prononce(c.spoken || c.text)) : null;
        await v.say(a, c.text, dur, voice?.env);
        if (essai) await essai;
        if (talkPose && a.hero.motion.pose === talkPose) a.hero.motion.clearPose();
        cap = null; ui.caption(null); lastTalk = a;
        subtitles.push({ start: t0 - playT0, end: v.simTime - playT0, who: a.name, text: c.text });
        return undefined;
      }
      case 'tape': { // les lettres apparaissent à l'écran, au rythme des doigts
        for (const ch of c.text.replace(/\\n/g, '\n')) {
          if (stopped) break;
          a?.hero.tap?.(room.laptop.type(ch)); sfx('key');
          await v.wait(/[.,;:!?\n]/.test(ch) ? 0.1 : 0.03 + Math.random() * 0.035);
        }
        return undefined;
      }
      case 'ecran': room.laptop.clear(c.text === 'efface' ? '' : c.text || undefined); return undefined;
      case 'tableau': room.board.write(c.text.split('|').map((x) => x.trim())); return undefined;
      case 'mimique': return a.hero.setExpression(plain(c.args[0] || 'neutre'));
      case 'geste': {
        const k = plain(c.args[0] || ''), d = a.hero.play(GESTES[k] || k);
        return v.wait(d || 0.2);
      }
      case 'danse': a.baseLoco = 'dance'; a.hero.motion.setLocomotion('dance'); return v.wait(parseFloat(c.args[0]) || 3).then(() => { a.baseLoco = 'idle'; a.hero.motion.setLocomotion('idle'); });
      case 'apparait': { // déjà là, sans marcher
        const k = plain(c.args[0] || 'tapis'), up = PERCHOIRS[k];
        if (up) a.hero.root.position.set(...up); else place(a, LIEUX[k]);
        a.hero.root.visible = true; return undefined;
      }
      case 'entre': { // arrive par la porte
        const l = LIEUX[plain(c.args[0] || 'tapis')];
        place(a, LIEUX.couloir); a.hero.root.visible = true; a.look = null;
        for (const b of v.actors) if (b !== a && b.hero.root.visible) b.look = a;
        if (auto) follow(a);
        await v.walkTo(a, new THREE.Vector3(l[0], 0, l[1])); if (track === a) track = null;
        return undefined;
      }
      case 'marche': case 'court': {
        const l = LIEUX[plain(c.args[0] || '')];
        if (!l) throw new Error(`lieu inconnu : ${c.args[0]}`);
        await v.leave(a);
        a.look = null;
        for (const b of v.actors) if (b !== a && b.hero.root.visible) b.look = a; // les autres le suivent des yeux
        if (auto) follow(a);
        return v.walkTo(a, new THREE.Vector3(l[0], 0, l[1]), c.verb === 'court').then(() => { if (track === a) track = null; });
      }
      case 'regarde': {
        const b = actor(plain(c.args[0] || ''));
        a.look = b || null;
        if (b && !a.hero.seat && !a.spot) v.face(a, b, true);
        return v.wait(0.4);
      }
      case 'monte': if (auto) follow(actor('tobi')); await mount(v, plain(c.args[0] || 'bras')); track = null; return undefined;
      case 'descend': return putDown(v);
      case 'sortie': {
        const t = a;
        a.look = null;
        if (auto) follow(t);
        await v.leave(a); await v.walkTo(a, new THREE.Vector3(0.05, 0, 2.5));
        track = null; cut('sortie');
        a.faceYaw = 0; await v.wait(0.5);
        a.hero.motion.togglePose('handle'); await v.wait(0.7);
        track = null;
        v.swing(room.entryDoor, -1.5, 1.2);
        await v.glide(a, new THREE.Vector3(0.1, 0, 3.0), 0, 1.2);
        a.hero.motion.clearPose();
        await v.glide(a, new THREE.Vector3(0.05, 0, 3.6), 0, 1.0);
        return undefined;
      }
      case 'pivote': return v.turn(a, plain(c.args[0] || 'chambre') !== 'bureau');
      case 'travaille': a.look = null; if (auto) follow(a); await v.acts.desk(a); track = null; return undefined;
      case 'assis': a.look = null; if (auto) follow(a); await v.acts.edge(a); track = null; if (auto) talkShot(a); return undefined;
      case 'dort': return v.acts.sleep(a);
      case 'frigo': a.look = null; if (auto) { track = null; cut('frigo'); } return v.acts.fridge(a);
      case 'remet': a.look = null; if (auto) { track = null; cut('frigo'); } return v.acts.fridgeBack(a);
      case 'miroir': a.look = null; if (auto) { track = null; cut('miroir'); } return v.acts.mirror(a);
      case 'fenetre': return v.acts.window(a);
      case 'leve': a.look = null; a.hero.motion.clearPose(); await v.leave(a); if (auto) talkShot(a); return undefined; // recadre : debout, la tête sortirait du plan
      case 'prend': a.look = null; if (auto) follow(a); await v.take(a, OBJETS[plain(c.args[0] || '')]); track = null; return undefined;
      case 'pose': return v.drop(a);
      case 'utilise': v.useHeld(a); return v.wait(a.held?.def.use === 'drink' ? 3 : 0.3);
      case 'donne': return v.give(a, actor(plain(c.args[0] || '')));
      case 'suit': a.follow = actor(plain(c.args[0] || '')); return undefined;
      case 'seul': a.follow = null; a.goal = null; return undefined;
      case 'sort': a.hero.root.visible = false; return undefined;
      default: throw new Error(`instruction inconnue : ${c.raw}`);
    }
  }
  return {
    get running() { return running && !closing; },
    get busy() { return running; }, // vrai aussi pendant la remise en place de fin
    get overlay() { return ui.state2; },
    get done() { return lineIdx; },
    get ffing() { return ffing; },
    get voices() { return voices; },
    set voices(l) { voices = l; },
    subtitles, clips, sfx: sfxList,
    async play(text, opts = {}) {
      if (running) return;
      findBlockers();
      setClock(text);
      subtitles.length = 0; clips.length = 0; sfxList.length = 0; lineIdx = 0; offline = !!opts.silent; cap = null; ui.caption(null); ui.counter(''); v.quiet = true; look.hideInsert(true); look.setMood('soir');
      hiddenForShot = [];
      const list = parseStory(text);
      adresse(list);
      running = true; stopped = false; ui.state(true); v.locked = true;
      ui.curtain(true, true);
      await reset();
      playT0 = v.simTime;
      await v.wait(0.1);
      try {
        for (const c of list) {
          if (stopped) break;
          ui.line(`Ligne ${c.n} : ${c.raw}`);
          const t = c.direct ? fast(c) : run(c);
          if (c.free) { const q = Promise.resolve(t).finally(() => pending.delete(q)); pending.add(q); } else await t;
        }
        await Promise.allSettled([...pending]);
        if (!stopped && ui.subscribe?.()) { const m = ABONNE[Math.abs([...text].reduce((n, ch) => n * 31 + ch.charCodeAt(0) | 0, 7)) % ABONNE.length]; look.insert(...m, 'base'); sfx('pop'); await v.wait(4.5); look.hideInsert(); } // court, sans voix : aucun crédit
        ui.line(stopped ? 'Lecture arrêtée.' : 'Fin de l’histoire.');
      } catch (e) { ui.line(`Erreur : ${e.message}`); }
      closing = true; ui.curtain(true, true); ui.card('');
      await reset();
      ui.curtain(false, true);
      v.camera.fov = 26; v.camera.updateProjectionMatrix();
      v.actors.forEach((a) => { a.hero.root.visible = !a.extra; });
      v.locked = false; track = null; auto = false; v.quiet = false; look.hideInsert(true); look.setMood('soir'); ui.caption(null);
      v.actors.forEach((a) => { a.look = null; });
      v.setView('chambre', true);
      running = false; closing = false; ui.state(false);
    },
    stop() { stopped = true; voixEssai.stop(); },
  };
}

// Le téléphone posé contre l'oreille, dans la main droite.
const PHONE_EAR = { pos: [0.04, 0.07, 0.03], rot: [Math.PI / 2, Math.PI / 2, 0] };
const ENERGIE = { excite: 1.35, colere: 1.4, panique: 1.5, illumine: 1.3, fier: 1.1, triste: 0.55, gene: 0.75, calme: 0.8, sec: 0.6, constat: 0.65, chuchote: 0.5, resigne: 0.6 };

// Les gestes mx_ viennent de src/mocap-mixamo.json, qui reste sur le poste de l'auteur (voir docs/GUIDE_TECHNIQUE.md).
// Sans ce fichier, c'est le cas de la version publique, chaque geste retombe sur son équivalent d'origine.
const REPLI = { mx_panique: 'emo_panique', mx_surpris: 'emo_surpris', mx_colere: 'emo_colere', mx_question: 'emo_fier', mx_triste: 'emo_triste', mx_doute: 'emo_doute', mx_montre: 'emo_idee', mx_gene: 'emo_gene', mx_epaules: 'emo_justifie', mx_parle: 'talk_stand', mx_parle_assis: 'talk_sit', mx_texto_debout: 'phone' };
const clipFor = (a, name) => (!name || a.hero.motion.has(name) ? name : REPLI[name] || null);
const EMOTIONS = { panique: 'mx_panique', surpris: 'mx_surpris', colere: 'mx_colere', fier: 'mx_question', triste: 'mx_triste', curieux: 'mx_doute', illumine: 'mx_montre', gene: 'mx_gene', mauvaisefoi: 'mx_epaules', excite: 'mx_deux_mains', content: 'mx_rire', resigne: 'mx_decu' };

const ABONNE = [["Merci d'être resté jusqu'à la fin", 'Abonne-toi', 'pour ne plus manquer nos aventures']];

const QUALITE = { max: 1440, hd: 1080, fast: 720 };

export function mountStory(v, stories) {
  const el = (id) => document.getElementById(id);
  el('storyBox').hidden = false;
  let voices = null, pubs = null;
  const pick = el('storyPick'), panel = document.querySelector('.panel');
  // Navigation : quatre espaces toujours accessibles
  let here = 'lib', before = 'lib', listTop = 0;
  const go = (name) => {
    if (name !== 'ep') player.stop();
    if (name === 'pubs') pubs.render();
    if (here === 'lib') listTop = el('eps').scrollTop;
    if (name !== here) { before = here; here = name; }
    for (const id of ['lib', 'ep', 'write', 'settings', 'pubs']) el(id).hidden = id !== name;
    if (name === 'lib') { renderEps(); el('eps').scrollTop = listTop; }
    document.querySelectorAll('[data-back]').forEach((b) => { b.textContent = before === 'ep' ? '← Retour à l\'épisode' : '← Tous les épisodes'; });
    panel.dataset.tab = name === 'coulisses' ? 'jouer' : 'film';
    el('transport').hidden = name !== 'ep';
    el('nav').querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', b.dataset.go === (name === 'ep' ? 'lib' : name)));
    if (name !== 'ep' && name !== 'lib') refresh();
  };
  el('nav').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
  document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => go(before === 'ep' ? 'ep' : 'lib')));
  el('nav').hidden = false;
  panel.dataset.tab = 'film';
  el('nav').querySelector('button').setAttribute('aria-current', 'true');
  // Les réglages de la vidéo restent les mêmes d'une fois à l'autre
  const REGLAGES = 'tobinox.reglages', CHOIX = ['storyFormat', 'storyQuality', 'storyFps', 'storyCaps', 'storyMusic', 'storyTrial', 'storySub'];
  let reglages = {};
  try { reglages = JSON.parse(localStorage.getItem(REGLAGES) || '{}'); } catch { /* réglages illisibles */ }
  for (const id of CHOIX) {
    const x = el(id), box = x.type === 'checkbox';
    if (id in reglages) { if (box) x.checked = reglages[id]; else if ([...x.options].some((o) => o.value === reglages[id])) x.value = reglages[id]; }
    x.addEventListener('change', () => {
      reglages[id] = box ? x.checked : x.value;
      try { localStorage.setItem(REGLAGES, JSON.stringify(reglages)); } catch { /* navigation privée */ }
    });
  }
  // Listes courtes affichées en contrôle segmenté
  for (const id of ['storyFormat', 'storyFps', 'storyQuality']) {
    const sel = el(id), seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', sel.getAttribute('aria-label'));
    const paint = () => [...seg.children].forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === sel.value));
    for (const o of sel.options) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = o.text; b.dataset.v = o.value;
      b.addEventListener('click', () => { sel.value = o.value; sel.dispatchEvent(new Event('change')); paint(); });
      seg.append(b);
    }
    sel.hidden = true; sel.after(seg); paint();
  }
  for (const k of Object.keys(stories)) pick.add(new Option(k, k));
  el('storyText').value = stories[pick.value];
  // Parcours : choisir un épisode l'ouvre et le lance tout de suite. Tout est déjà réglé, il ne reste qu'à créer la vidéo.
  const refresh = () => {
    const c = parseStory(el('storyText').value).filter((x) => x.verb === 'dit');
    const secs = Math.round(c.reduce((n, x) => n + x.text.length * 0.078 + 0.35, 0));
    const voice = voices?.state() || 'none';
    const row = el('rowVoice');
    row.textContent = { ready: 'Prêtes', auto: 'Créées avec la vidéo', none: 'Clé à ajouter' }[voice];
    row.className = voice === 'ready' ? 'ok' : voice === 'none' ? 'todo' : '';
    el('rowVideo').textContent = `${short() ? 'Short' : 'YouTube'} · ${QUALITE[el('storyQuality').value]}p`;
    el('rowScript').textContent = `${c.length} répliques · environ ${secs} s`;
    el('epVoices').hidden = voice === 'ready';
    el('epStatus').textContent = `Voix : ${row.textContent.toLowerCase()} · ${el('rowVideo').textContent} · Réglages →`;
  };
  const halt = async () => { // arrête la lecture et remet tout en place sans attendre les animations
    if (!player.busy) return;
    player.stop();
    for (let i = 0; i < 6000 && player.busy; i++) { v.step(1 / 30, true); await tick(); }
  };
  const replay = async () => {
    await halt();
    player.play(el('storyText').value);
  };
  let opening = 0;
  const openEp = (k) => {
    pick.value = k; pick.dispatchEvent(new Event('change'));
    const m = /^(\d+)\.\s*(.*)$/.exec(k), text = stories[k];
    el('epNum').textContent = m ? `Épisode ${m[1]}` : k.startsWith('Mon script') ? 'Mon script' : 'Hors saison';
    el('epTitle').textContent = m ? m[2] : k.replace(/^Mon script : /, '');
    el('epPitch').textContent = (/^#\s*Pitch\s*:\s*(.*)$/mi.exec(text) || [])[1] || '';
    const list = episodeKeys(), at = list.indexOf(k);
    el('epPrev').disabled = at <= 0; el('epNext').disabled = at < 0 || at === list.length - 1;
    go('ep'); el('storyNow').textContent = ''; refresh();
    const me = ++opening;
    (voices?.warm() || Promise.resolve()).catch(() => {}).then(() => { if (me === opening) { refresh(); replay(); } });
  };
  pick.addEventListener('change', () => { el('storyText').value = stories[pick.value]; });
  const episodeKeys = () => Object.keys(stories);
  const step = (d) => { const list = episodeKeys(), k = list[list.indexOf(pick.value) + d]; if (k) openEp(k); };
  el('epBack').addEventListener('click', () => go('lib'));
  el('epPrev').addEventListener('click', () => step(-1));
  el('epNext').addEventListener('click', () => step(1));
  el('epPub').addEventListener('click', () => { go('pubs'); pubs.show(pick.value); });
  el('epStatus').addEventListener('click', () => go('settings'));
  el('storyText').addEventListener('input', refresh);
  ['storyFormat', 'storyQuality'].forEach((id) => el(id).addEventListener('change', refresh));
  const renderEps = () => el('eps').replaceChildren(...Object.keys(stories).map((k) => {
    const m = /^(\d+)\.\s*(.*)$/.exec(k), li = document.createElement('li'), b = document.createElement('button'), n = document.createElement('span');
    b.type = 'button'; n.textContent = m ? m[1].padStart(2, '0') : '—';
    b.append(n, m ? m[2] : k);
    if (pubs?.published(k)) { const tag = document.createElement('small'); tag.textContent = 'Publiée'; b.append(tag); }
    b.addEventListener('click', () => openEp(k));
    li.append(b);
    return li;
  }));
  // Les scripts écrits ici restent dans ce navigateur et rejoignent la liste
  const MINE = 'tobinox.scripts';
  const loadMine = () => { try { return JSON.parse(localStorage.getItem(MINE) || '{}'); } catch { return {}; } };
  Object.assign(stories, loadMine());
  for (const k of Object.keys(stories)) if (![...pick.options].some((o) => o.value === k)) pick.add(new Option(k, k));
  pubs = mountPublications({ el, stories, open: (k) => openEp(k), save, onChange: () => renderEps() });
  renderEps();
  mountWriter({ el, parseStory, goSettings: () => go('settings'), onTry: (title, pitch, text) => {
    const k = `Mon script : ${title}`, body = /^#\s*Pitch\s*:/mi.test(text) || !pitch ? text : `# Pitch : ${pitch}\n${text}`;
    stories[k] = body;
    try { localStorage.setItem(MINE, JSON.stringify({ ...loadMine(), [k]: body })); } catch { /* navigation privée */ }
    if (![...pick.options].some((o) => o.value === k)) pick.add(new Option(k, k));
    renderEps(); openEp(k);
  } });
  const short = () => el('storyFormat').value === 'short';
  const format = () => document.querySelector('.app').classList.toggle('portrait', short());
  el('storyFormat').addEventListener('change', format); format();
  const st = { alpha: 0, target: 0, card: '' };
  let exporting = false;
  const ui = {
    state2: st,
    curtain: (on, instant) => { st.target = on ? 1 : 0; if (instant) st.alpha = st.target; el('curtain').style.opacity = st.alpha; },
    caption: (c) => {
      st.caption = c;
      const box = el('cap');
      box.hidden = !c || !el('storyCaps').checked;
      if (box.hidden) return;
      box.style.setProperty('--w', c.color);
      box.replaceChildren(...c.words.flatMap((w, i) => { const n = document.createElement(i === c.active ? 'b' : 'span'); n.textContent = w; return [n, ' ']; }));
    },
    counter: (t) => { st.counter = t; el('counter').textContent = t; el('counter').hidden = !t; },
    card: (t) => { st.card = t; el('card').textContent = t; el('card').hidden = !t; },
    line: (t) => { const n = el('storyNow'); n.dataset.line = t; if (!/^(Ligne|Fin de|Lecture)/.test(t)) n.textContent = t; }, // pas de jargon à l'écran
    state: (on) => { el('storyPlay').disabled = on; el('storyStop').disabled = !on; el('storyExport').disabled = exporting; },
    tick: (dt) => { const d = st.target - st.alpha; if (d) { st.alpha += Math.sign(d) * Math.min(Math.abs(d), dt / 0.7); el('curtain').style.opacity = st.alpha; } },
  };
  ui.trial = () => el('storyTrial').checked;
  ui.subscribe = () => el('storySub').checked;
  const player = createPlayer(v, ui);
  el('storyPlay').addEventListener('click', replay);
  el('storyStop').addEventListener('click', () => player.stop());
  el('epVoices').addEventListener('click', async () => {
    if (!voices.ready()) { go('settings'); return; }
    if (!(await voices.allow(ui.line))) return;
    await halt();
    ui.line('Création des vraies voix…');
    await voices.generate();
    refresh();
    if (player.voices.length) { ui.line(''); replay(); } else ui.line(el('elNow').textContent);
  });
  // Gestes privés : le mot de passe ouvre le coffre une fois par appareil, puis tout se met à jour seul. Voir docs/GUIDE_TECHNIQUE.md.
  el('gestesForm').hidden = gestures.bundled || gestures.saved;
  el('gestesOff').hidden = gestures.bundled || !gestures.saved;
  el('gestesForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    ui.line('Ouverture des gestes…');
    try { await unlockGestures(el('gestesPass').value); location.reload(); } catch (err) { el('gestesPass').value = ''; ui.line(`Gestes non ouverts : ${err.message}`); }
  });
  el('gestesOff').addEventListener('click', () => { forgetGestures(); location.reload(); });
  if (!gestures.bundled) syncGestures().then((changed) => { if (changed) location.reload(); }).catch(() => {}); // hors ligne : on garde la copie de l'appareil
  let musicFile = null, warned = false;
  el('storyMusicFile').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    musicFile = f ? await new AudioContext().decodeAudioData(await f.arrayBuffer()) : null;
    ui.line(f ? `Musique importée : ${f.name}` : 'Musique générée par le Studio.');
  });
  const exportRun = async (draft) => { // brouillon : sous-titres et images, sans créer de voix ni dépenser de crédits
    try {
      if (!draft && !player.voices.length && !voices.ready() && !warned) { // une seule alerte, puis on laisse exporter sans voix
        warned = true;
        ui.line('Il manque ta clé ElevenLabs. Ajoute-la dans Réglages, ou clique encore pour créer une vidéo muette.');
        return;
      }
      if (!draft && !player.voices.length && voices.ready() && !(await voices.allow(ui.line))) return;
      await halt();
      if (!draft && !player.voices.length && voices.ready()) { ui.line('Création des voix…'); await voices.generate(); refresh(); }
      const fps = Number(el('storyFps').value);
      exporting = true; el('storyExport').disabled = true; el('storyDraft').disabled = true;
      const big = QUALITE[el('storyQuality').value], long = Math.round((big * 16) / 9 / 2) * 2;
      const size = short() ? { width: big, height: long } : { width: long, height: big };
      const lines = parseStory(el('storyText').value).filter((c) => c.verb === 'dit').length || 1;
      el('storyBar').hidden = false;
      const out = await exportVideo(v, player, el('storyText').value, { ...size, fps, captions: draft || el('storyCaps').checked, music: el('storyMusic').checked ? { file: musicFile } : null, onProgress: (s) => { ui.line(`Export en cours : ${s.toFixed(0)} s de vidéo`); el('storyBar').firstElementChild.style.width = `${Math.min(98, (player.done / lines) * 100)}%`; } });
      el('storyBar').hidden = true;
      const nom = nomFichier(pick.value, el('storyText').value) + (draft ? '-brouillon' : '');
      save(out.blob, `${nom}.mp4`); save(new Blob([out.srt], { type: 'text/plain' }), `${nom}.srt`);
      ui.line(`Ta vidéo est prête : ${out.seconds.toFixed(0)} s, dans tes téléchargements.`);
      v.lastExport = out; if (!draft) pubs.markVideo(pick.value);
    } catch (e) { el('storyBar').hidden = true; ui.line(`Export impossible : ${e.message}`); }
    exporting = false; el('storyExport').disabled = false; el('storyDraft').disabled = false;
  };
  el('storyExport').addEventListener('click', () => exportRun(false));
  el('storyDraft').addEventListener('click', () => exportRun(true));
  v.story = player;
  el('storyVoices').addEventListener('change', async (e) => {
    const files = [...e.target.files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const ctx = new AudioContext(), list = [];
    for (const f of files) list.push({ name: f.name, buffer: await ctx.decodeAudioData(await f.arrayBuffer()) });
    player.voices = list;
    const lines = parseStory(el('storyText').value).filter((c) => c.verb === 'dit').length;
    ui.line(`${list.length} voix importées pour ${lines} répliques.${list.length !== lines ? ' Attention : le nombre ne correspond pas.' : ''}`);
  });
  voices = mountVoices({ el, player, parseStory, onChange: refresh });
  refresh();
  v.exportVideo = (t, o) => exportVideo(v, player, t, o);
}
