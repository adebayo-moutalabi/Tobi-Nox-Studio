// Moteur d'animation commun à Tobi et Nox.
// Corps entier : AnimationMixer (locomotion, assis, sauts…).
// Haut du corps : trois couches appliquées par-dessus (objet tenu, posture, geste),
// ce qui permet de boire en marchant ou de lire assis.
import * as THREE from 'three';

const LOWER = /^(hips|upleg|leg|foot|toe)/;
const SEATS = {
  chair: ['sit_down', 'sitting', 'stand_up'],
  floor: ['floor_down', 'floor_sit', 'floor_up'],
  lie: ['lie_down', 'lying', 'get_up'],
};

const PACE = 1.45;

class Layer {
  constructor(bones) { this.bones = bones; this.clip = null; this.w = 0; this.target = 0; this.t = 0; this.q = new THREE.Quaternion(); }
  play(clip) {
    this.clip = clip; this.t = 0; this.target = clip.userData.weight ?? 1; this.top = this.target;
    this.w = this.w > 0.5 ? 0.5 : this.w;
    this.loop = !!clip.userData.loop;
    this.tracks = clip.userData.moved;
  }
  stop() { this.target = 0; }
  update(dt) {
    if (!this.clip) return;
    this.t += dt;
    const d = this.clip.duration;
    if (this.loop) this.t %= d;
    else if (this.t >= d - 0.2) this.target = 0;
    this.w += (this.target - this.w) * (1 - Math.exp(-dt * 6.5));
    if (this.target === 0 && this.w < 0.004) { this.clip = null; this.w = 0; return; }
    const t = Math.min(this.t, d);
    for (const { bone, it } of this.tracks) {
      this.q.fromArray(it.evaluate(t));
      bone.quaternion.slerp(this.q, this.w);
    }
  }
}

export function createMotion(root, bones, clips) {
  // Rythme de la série : les gestes et transitions sont joués plus vite que leur tracé d'origine.
  for (const c of clips) {
    if (c.userData.loop || c.userData.fast) continue;
    c.userData.fast = true;
    for (const tr of c.tracks) tr.times = tr.times.map((t) => t / PACE);
    c.duration /= PACE;
  }
  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  const byName = Object.fromEntries(clips.map((c) => [c.name, c]));

  // Os réellement utilisés par chaque clip du haut du corps
  const idle = byName.idle;
  const rest = {};
  for (const tr of idle.tracks) if (tr.name.endsWith('.quaternion')) rest[tr.name] = new THREE.Quaternion().fromArray(tr.values, 0);
  const a = new THREE.Quaternion();
  for (const c of clips) {
    if (c.userData.layer === 'upper') {
      c.userData.moved = [];
      for (const tr of c.tracks) {
        const name = tr.name.split('.')[0];
        if (!tr.name.endsWith('.quaternion') || LOWER.test(name) || !rest[tr.name]) continue;
        let max = 0;
        for (let i = 0; i < tr.values.length; i += 4) max = Math.max(max, a.fromArray(tr.values, i).angleTo(rest[tr.name]));
        if (max > 0.05) c.userData.moved.push({ bone: bones[name], it: tr.createInterpolant() });
      }
    } else actions[c.name] = mixer.clipAction(c);
  }

  const layers = { hold: new Layer(), pose: new Layer(), gesture: new Layer() };
  const s = { loco: 'idle', full: null, done: null, current: null, seat: null, moving: false, poseName: null };

  function fadeTo(name, t = 0.25, once = false) {
    const act = actions[name];
    const prev = s.current && actions[s.current];
    if (prev === act && !once) return;
    act.reset();
    act.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    act.clampWhenFinished = once; act.enabled = true; act.setEffectiveWeight(1); act.play();
    if (prev && prev !== act) prev.crossFadeTo(act, t, false);
    s.current = name;
  }
  mixer.addEventListener('finished', (e) => {
    if (!s.full || e.action !== actions[s.full]) return;
    const cb = s.done;
    s.full = null; s.done = null;
    if (cb) cb(); else fadeTo(s.loco, 0.32);
    m.onGestureEnd?.();
  });
  const runFull = (name, done, fade = 0.22) => { s.full = name; s.done = done; fadeTo(name, fade, true); };

  const m = {
    mixer, onGestureEnd: null,
    get seat() { return s.seat; },
    get sitting() { return !!s.seat && !s.full; },
    get gesture() { return s.full; },
    get pose() { return s.poseName; },
    get handsFree() { return !s.full && !layers.gesture.clip && !layers.hold.clip && (!s.poseName || s.poseName.startsWith('talk')); }, // aucun geste voulu où les mains se touchent
    has: (name) => !!byName[name],
    setLocomotion(name) {
      if (s.seat || s.loco === name) return;
      s.loco = name;
      if (name === 'walk' || name === 'run') { s.full = null; s.done = null; }
      if (!s.full) fadeTo(name, name === 'idle' ? 0.3 : 0.18);
    },
    play(name, done) {
      const c = byName[name];
      if (!c) { done?.(); return 0; }
      if (c.userData.layer === 'upper') {
        if (c.userData.loop) { m.togglePose(name); done?.(); return 0; }
        layers.gesture.play(c);
        if (done) setTimeout(done, c.duration * 1000);
        return c.duration;
      }
      if (c.userData.loop) { s.full = null; s.loco = name; fadeTo(name, 0.3); done?.(); return 0; }
      if (s.seat) { done?.(); return 0; }
      runFull(name, done);
      return c.duration;
    },
    togglePose(name) {
      if (!byName[name]) return false;
      if (s.poseName === name) { s.poseName = null; layers.pose.stop(); return false; }
      s.poseName = name; layers.pose.play(byName[name]); return true;
    },
    clearPose() { s.poseName = null; layers.pose.stop(); },
    setHold(on) { if (on) layers.hold.play(byName.hold_R); else layers.hold.stop(); },
    sit(kind, done) {
      if (s.seat) { done?.(); return; }
      const [down, loop] = SEATS[kind];
      s.seat = kind;
      runFull(down, () => { s.loco = loop; fadeTo(loop, 0.2); done?.(); }, 0.25);
    },
    transition(clip, loop, seat) { // passage d'une position assise/couchée à une autre
      return new Promise((res) => {
        s.seat = seat;
        runFull(clip, () => { s.loco = loop; fadeTo(loop, 0.15); res(); }, 0.15);
      });
    },
    stand(done) {
      if (!s.seat) { done?.(); return; }
      const up = SEATS[s.seat][2];
      runFull(up, () => { s.seat = null; s.loco = 'idle'; fadeTo('idle', 0.3); done?.(); });
    },
    update(dt) {
      mixer.update(dt);
      layers.hold.update(dt); layers.pose.update(dt); layers.gesture.update(dt);
    },
  };
  fadeTo('idle', 0);
  return m;
}
