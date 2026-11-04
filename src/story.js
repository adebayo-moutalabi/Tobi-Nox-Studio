// Lecteur de scénario : lit histoire.txt ligne par ligne et le joue dans la chambre.
// Une ligne = une instruction. Terminer par « & » pour lancer la suivante sans attendre.
import * as THREE from 'three';
import { mount, putDown } from './scenes.js';
import { exportVideo, save, tick } from './exporter.js';
import { mountVoices } from './voices.js';
import { TONS } from './tones.js';
import { envelope } from './talk.js';
import { createLook } from './look.js';
import { playSfx } from './sound.js';

const GESTES = {
  saluer: 'wave', oui: 'nod', non: 'no', epaules: 'shrug', reflechir: 'think', montrer: 'point', applaudir: 'clap', pouce: 'thumb',
  viens: 'come', stop: 'stop', gratter: 'scratch', consterne: 'facepalm', regarder: 'look', etirer: 'stretch', saluerbas: 'bow', sauter: 'jump', victoire: 'cheer',
};
const OBJETS = { papier: 'paper', livre: 'book', gourde: 'bottle', tasse: 'mug', telephone: 'phone', sac: 'bag' };
const LIEUX = {
  centre: [0.1, 0.2], tapis: [0.1, -0.3], fenetre: [0, -1.6], lit: [0.12, 0.35], bureau: [0.6, -0.8], armoire: [0.6, 0.4],
  frigo: [0.5, 1.24], miroir: [-0.42, -1.5], couloir: [0, 1.9], porte: [0, 2.72],
};
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
  ecran: [[0.8, 1.02, -0.66], [1.1, 0.92, -1.05], 44],
  tableau: [[0.34, 1.32, -1.06], [0.42, 1.08, -1.84], 38],
};
const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Découpe une réplique en lignes courtes, sans jamais dépasser le cadre.
function chunk(text) {
  const words = text.split(/\s+/), groups = [];
  let start = 0, size = 0;
  words.forEach((w, i) => {
    if (i > start && (size + w.length > 24 || /[.?!…]$/.test(words[i - 1]))) { groups.push([start, i]); start = i; size = 0; }
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
    const who = /^(TOBI|NOX)$/.test(first) ? first.toLowerCase() : null;
    const verb = plain(who ? rest.shift() || '' : first);
    let text = rest.join(' '), tone = null;
    const t = verb === 'dit' && text.match(/^\(([^)]+)\)\s*(.*)$/);
    if (t) { tone = plain(t[1]).replace(/[\s-]/g, ''); text = t[2]; }
    out.push({ n: i + 1, who, verb, args: rest, text, tone, free, direct, raw: line });
  });
  return out;
}

export function createPlayer(v, ui) {
  const actor = (id) => v.actors.find((a) => a.id === id);
  const room = v.room;
  let running = false, stopped = false, auto = false, track = null, trackT = 0, drift = 0, closing = false, playT0 = 0;
  const subtitles = [], clips = [], sfxList = [];
  const look = createLook(v);
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
  const eyes = (a) => { const h = a.hero.bones.head.getWorldPosition(new THREE.Vector3()); h.y += a.eyeUp; return h; };
  const clear = (from, to) => {
    const d = to.clone().sub(from), L = d.length();
    ray.set(from, d.normalize()); ray.far = L;
    return ray.intersectObjects(room.solid, false).length === 0;
  };
  const inside = (c) => c.x > -1.34 && c.x < 1.34 && c.z > -1.84 && c.z < 2.9 && c.y > 0.25 && c.y < 2.42;
  function aim(pos, target, fov) {
    v.camera.fov = fov * lens(); v.camera.updateProjectionMatrix();
    v.controls.minDistance = 0.1; v.controls.target.copy(target); v.camera.position.copy(pos); v.controls.update();
    drift = 0.07;
  }
  // Cadrage : la tête garde toujours de l'air au-dessus d'elle. Les murs sont traversables pour reculer.
  const room2 = (c) => c.x > -3.4 && c.x < 3.4 && c.z > -3.6 && c.z < 4.4 && c.y > 0.3 && c.y < 2.4;
  const seen = (c, p) => { const d = p.clone().sub(c), L = d.length(); ray.set(c, d.normalize()); ray.far = L - 0.12; return ray.intersectObjects(room.solid, false).length === 0; };
  const blocks = (b, c, p) => { // l'autre personnage ne doit pas passer devant l'objectif
    if (!b.hero.root.visible) return false;
    const line = new THREE.Line3(c, p), o = new THREE.Vector3();
    return [eyes(b), eyes(b).setY(eyes(b).y - 0.35), eyes(b).setY(eyes(b).y - 0.7)].some((x) => { line.closestPointToPoint(x, true, o); return o.distanceTo(x) < 0.3; });
  };
  function frame(a, tight) {
    const b = v.actors.find((x) => x !== a), H = eyes(a), big = a.id === 'tobi', up = new THREE.Vector3(0, 1, 0);
    const near = !a.carried && !b.carried && b.hero.root.visible && eyes(b).sub(H).setY(0).length() > 0.3;
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(a.hero.root.quaternion).setY(0);
    const to = (near && !a.hero.seat ? eyes(b).sub(H).setY(0) : fwd).normalize();
    a.look = null; // seul dans le cadre, il parle vers la caméra, comme au théâtre
    const top = H.y + (big ? 0.24 : 0.2), fov = 32;
    const span = tight ? (big ? 0.9 : 0.72) : (big ? 1.4 : 1.02);
    for (const k of [1, 0.85, 0.72]) {
      const sp = span * k, dist = sp / (2 * Math.tan((fov * Math.PI) / 360)), mid = top + sp * 0.13 - sp / 2;
      for (const ang of [0.3, -0.3, 0.55, -0.55, 0.85, -0.85, 1.15, -1.15]) {
        const c = H.clone().addScaledVector(to.clone().applyAxisAngle(up, ang), dist); c.y = mid + (big ? 0.05 : 0.03);
        const side = new THREE.Vector3(c.z - H.z, 0, H.x - c.x).normalize().multiplyScalar(sp * 0.27); // les bords du cadre restent dégagés aussi
        if (room2(c) && seen(c, H) && seen(c, H.clone().setY(H.y - (big ? 0.3 : 0.14))) && seen(c, H.clone().add(side)) && seen(c, H.clone().sub(side)) && !blocks(b, c, H)) {
          aim(c, new THREE.Vector3(H.x, mid, H.z), fov / lens());
          if (!near) a.faceYaw = Math.atan2(c.x - v.pos(a).x, c.z - v.pos(a).z);
          return;
        }
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
    if (drift && running && !track) { // lent travelling avant : l'image n'est jamais figée
      const d = v.controls.target.clone().sub(v.camera.position).normalize();
      v.camera.position.addScaledVector(d, drift * dt);
    }
    if (!track) return;
    const H = eyes(track).add(new THREE.Vector3(0, track.id === 'tobi' ? -0.3 : 0.05, 0));
    v.controls.target.lerp(H, 1 - Math.exp(-dt * 2.6)); v.controls.update();
    trackT += dt;
    if (trackT > 0.7) { trackT = 0; if (!clear(eyes(track), v.camera.position)) follow(track); } // obstacle : changement d'angle
  };

  function cut(name) {
    const p = PLANS[name] || PLANS.large;
    v.camera.fov = p[2] * lens(); v.camera.updateProjectionMatrix();
    v.controls.minDistance = 0.1;
    v.controls.target.set(...p[1]); v.camera.position.set(...p[0]);
    v.controls.update();
    drift = name === 'dessus' ? 0 : 0.03;
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
    room.setShutter(false); room.lamp.intensity = 0; room.sillBag.visible = true; room.laptop.clear('notes.txt');
    room.entryDoor.rotation.y = 0; room.fridgeDoor.rotation.y = 0;
    place(actor('tobi'), [0, 0.2]); place(actor('nox'), [0.3, 0.5]);
    actor('tobi').hero.root.visible = true; actor('nox').hero.root.visible = true;
  }
  async function run(c) {
    const a = c.who ? actor(c.who) : null;
    switch (c.verb) {
      case 'plan': {
        const k = plain(c.args[0] || 'large'); auto = k === 'auto'; track = null;
        look.hideInsert();
        if (k === 'duo') { auto = false; duo(); return undefined; }
        if (k === 'gros') { auto = false; closeUp(actor(plain(c.args[1] || 'tobi'))); return undefined; }
        if (!auto) cut(k);
        return undefined;
      }
      case 'ambiance': look.setMood(plain(c.args[0] || 'jour')); return undefined;
      case 'insert': {
        const [title = '', big = '', small = ''] = c.text.split('|').map((x) => x.trim());
        look.insert(title, big, small); sfx(/[€$]/.test(big) ? 'ding' : 'pop');
        return undefined;
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
        const b = v.actors.find((x) => x !== a), tone = TONS[c.tone];
        track = null;
        if (tone) { a.hero.setExpression(tone.visage); if (tone.ecoute) b.hero.setExpression(tone.ecoute); }
        if (auto) {
          if (!a.carried && !b.carried && b.hero.root.visible && a.hero.seat !== 'lie' && b.hero.seat !== 'lie' && v.pos(a).distanceTo(v.pos(b)) > 0.4) { b.look = a; if (!a.hero.seat && !a.spot) v.face(a, b, true); if (!b.hero.seat && !b.spot) v.face(b, a, true); await v.wait(0.08); } else if (b.hero.root.visible && !a.hero.seat && !a.spot) { v.face(a, b, true); await v.wait(0.08); }
          talkShot(a);
        }
        const t0 = v.simTime, voice = voices[lineIdx++], dur = voice?.buffer.duration;
        if (tone?.geste) a.hero.play(GESTES[tone.geste]); // le geste part avec la voix
        if (voice) {
          voice.env ||= envelope(voice.buffer);
          clips.push({ buffer: voice.buffer, start: t0 - playT0 });
          if (!offline) { audioCtx ||= new AudioContext(); const src = audioCtx.createBufferSource(); src.buffer = voice.buffer; src.connect(audioCtx.destination); src.start(); }
        }
        cap = { ...chunk(c.text), t0, dur: dur || c.text.length * 0.078 + 0.1, color: a.id === 'nox' ? '#8feaff' : '#ffb26b' };
        await v.say(a, c.text, dur, voice?.env);
        cap = null; ui.caption(null);
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
      case 'marche': case 'court': {
        const l = LIEUX[plain(c.args[0] || '')];
        if (!l) throw new Error(`lieu inconnu : ${c.args[0]}`);
        await v.leave(a);
        a.look = null;
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
      case 'assis': return v.acts.edge(a);
      case 'dort': return v.acts.sleep(a);
      case 'frigo': a.look = null; if (auto) { track = null; cut('frigo'); } return v.acts.fridge(a);
      case 'remet': a.look = null; if (auto) { track = null; cut('frigo'); } return v.acts.fridgeBack(a);
      case 'miroir': a.look = null; if (auto) { track = null; cut('miroir'); } return v.acts.mirror(a);
      case 'fenetre': return v.acts.window(a);
      case 'leve': a.look = null; a.hero.motion.clearPose(); return v.leave(a);
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
    get overlay() { return ui.state2; },
    get ffing() { return ffing; },
    get voices() { return voices; },
    set voices(l) { voices = l; },
    subtitles, clips, sfx: sfxList,
    async play(text, opts = {}) {
      if (running) return;
      subtitles.length = 0; clips.length = 0; sfxList.length = 0; lineIdx = 0; offline = !!opts.silent; cap = null; ui.caption(null); v.quiet = true; look.hideInsert(); look.setMood('jour');
      const list = parseStory(text);
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
        ui.line(stopped ? 'Lecture arrêtée.' : 'Fin de l’histoire.');
      } catch (e) { ui.line(`Erreur : ${e.message}`); }
      closing = true; ui.curtain(true, true); ui.card('');
      await reset();
      ui.curtain(false, true);
      v.camera.fov = 26; v.camera.updateProjectionMatrix();
      v.actors.forEach((a) => { a.hero.root.visible = true; });
      v.locked = false; track = null; auto = false; v.quiet = false; look.hideInsert(); look.setMood('jour'); ui.caption(null);
      v.actors.forEach((a) => { a.look = null; });
      v.setView('chambre', true);
      running = false; closing = false; ui.state(false);
    },
    stop() { stopped = true; },
  };
}

export function mountStory(v, stories) {
  const el = (id) => document.getElementById(id);
  el('storyBox').hidden = false;
  const pick = el('storyPick'), panel = document.querySelector('.panel');
  const tabs = [...el('tabs').querySelectorAll('button')];
  const showTab = (name) => { panel.dataset.tab = name; tabs.forEach((b) => b.setAttribute('aria-pressed', b.dataset.tab === name)); };
  tabs.forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  el('tabs').hidden = false; showTab('film');
  for (const k of Object.keys(stories)) pick.add(new Option(k, k));
  el('storyText').value = stories[pick.value];
  pick.addEventListener('change', () => { el('storyText').value = stories[pick.value]; });
  const short = () => el('storyFormat').value === 'short';
  const format = () => document.querySelector('.app').classList.toggle('portrait', short());
  el('storyFormat').addEventListener('change', format); format();
  const st = { alpha: 0, target: 0, card: '' };
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
    card: (t) => { st.card = t; el('card').textContent = t; el('card').hidden = !t; },
    line: (t) => { el('storyNow').textContent = t; },
    state: (on) => { el('storyPlay').disabled = on; el('storyStop').disabled = !on; el('storyExport').disabled = on; },
    tick: (dt) => { const d = st.target - st.alpha; if (d) { st.alpha += Math.sign(d) * Math.min(Math.abs(d), dt / 0.7); el('curtain').style.opacity = st.alpha; } },
  };
  const player = createPlayer(v, ui);
  el('storyPlay').addEventListener('click', () => player.play(el('storyText').value));
  el('storyStop').addEventListener('click', () => player.stop());
  let musicFile = null;
  el('storyMusicFile').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    musicFile = f ? await new AudioContext().decodeAudioData(await f.arrayBuffer()) : null;
    ui.line(f ? `Musique importée : ${f.name}` : 'Musique générée par le Studio.');
  });
  el('storyExport').addEventListener('click', async () => {
    try {
      const fps = Number(el('storyFps').value);
      const size = short() ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
      const out = await exportVideo(v, player, el('storyText').value, { ...size, fps, captions: el('storyCaps').checked, music: el('storyMusic').checked ? { file: musicFile } : null, onProgress: (s) => ui.line(`Export : ${s.toFixed(1)} s de vidéo rendues…`) });
      save(out.blob, 'histoire.mp4'); save(new Blob([out.srt], { type: 'text/plain' }), 'histoire.srt');
      ui.line(`Vidéo prête : ${out.seconds.toFixed(1)} s, ${(out.blob.size / 1048576).toFixed(1)} Mo. Si rien ne se télécharge, ouvre studio.html sur ton ordinateur.`);
      v.lastExport = out;
    } catch (e) { ui.line(`Export impossible : ${e.message}`); }
  });
  v.story = player;
  el('storyVoices').addEventListener('change', async (e) => {
    const files = [...e.target.files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const ctx = new AudioContext(), list = [];
    for (const f of files) list.push({ name: f.name, buffer: await ctx.decodeAudioData(await f.arrayBuffer()) });
    player.voices = list;
    const lines = parseStory(el('storyText').value).filter((c) => c.verb === 'dit').length;
    ui.line(`${list.length} voix importées pour ${lines} répliques.${list.length !== lines ? ' Attention : le nombre ne correspond pas.' : ''}`);
  });
  mountVoices({ el, player, parseStory });
  v.exportVideo = (t, o) => exportVideo(v, player, t, o);
}
