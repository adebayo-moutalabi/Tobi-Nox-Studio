// Scènes à deux, écrites comme de petits scénarios.
// v : API du visualiseur (walkTo, face, take, give, say, wait…).
import * as THREE from 'three';

const cast = (v) => [v.actors.find((a) => a.id === 'tobi'), v.actors.find((a) => a.id === 'nox')];

async function reset(v) {
  const [t, n] = cast(v);
  if (n.carried) await putDown(v);
  n.follow = null;
  await Promise.all([v.leave(t), v.leave(n)]);
  t.hero.motion.clearPose(); n.hero.motion.clearPose();
  if (t.hero.seat) await v.stand(t);
  if (n.hero.seat) await v.stand(n);
  v.stash(t); v.stash(n); // mains libres pour la scène
}
async function meet(v, d = 0.6) { // Nox vient se placer devant Tobi
  const [t, n] = cast(v);
  await v.walkTo(n, v.pos(t).clone().add(new THREE.Vector3(v.pos(t).x > 0.1 ? -d : d, 0, 0.03))); // de profil pour la caméra
  v.face(t, n); v.face(n, t);
  v.setView('duo');
  await v.wait(0.7);
}
// Nox monte sur Tobi : dans les bras, sur l'épaule ou dans le sac
export async function mount(v, where) {
  const [t, n] = cast(v);
  if (n.carried) await putDown(v);
  if (where === 'sac') {
    if (!t.bag) await v.take(t, 'bag');
    await Promise.all([v.leave(t), v.leave(n)]);
    n.follow = null; t.hero.motion.clearPose(); n.hero.motion.clearPose();
    // Nox se place derrière Tobi, Tobi s'accroupit, Nox saute et se glisse dans le sac ouvert
    const yaw = t.hero.root.rotation.y, back = new THREE.Vector3(0, 0, -0.62).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(v.pos(t));
    await v.walkTo(n, back);
    n.faceYaw = yaw; await v.wait(0.6);
    const d = t.hero.play('kneel_down');
    await v.wait(d * 0.3);
    n.hero.play('jump');
    await v.wait(0.32);
    t.hero.root.updateMatrixWorld(true);
    const s = t.hero.sockets.bagTop, q = s.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0));
    await v.glide(n, q, yaw, 0.5, 0.22);
    n.carried = true; n.goal = null;
    s.add(n.hero.root);
    n.hero.root.position.set(0, 0.1, 0); n.hero.root.rotation.set(0, 0, 0); n.hero.root.scale.setScalar(0.45);
    n.hero.play('in_bag');
    v.sink(n.hero.root, 0, 0.45); // il s'enfonce doucement dans le sac
    await v.wait(d * 0.5);
    t.hero.setExpression('sourire'); n.hero.setExpression('amour');
    return;
  }
  await reset(v);
  await meet(v, 0.5);
  t.hero.play('low_reach'); n.hero.play('reach_up');
  await v.wait(1.1);
  n.carried = true; n.goal = null;
  if (where !== 'sac') n.hero.motion.sit('chair');
  const s = { bras: t.hero.sockets.carry, epaule: t.hero.sockets.shoulder }[where];
  s.add(n.hero.root);
  n.hero.root.position.set(0, where === 'bras' ? -0.06 : 0, where === 'bras' ? 0.02 : 0);
  n.hero.root.rotation.set(0, 0, 0);
  n.hero.root.scale.setScalar(0.45);
  if (where === 'bras') t.hero.motion.togglePose('carry');
  t.hero.setExpression('sourire'); n.hero.setExpression('amour');
}
export async function putDown(v) {
  const [t, n] = cast(v);
  if (!n.carried) return;
  const p = v.ahead(t, 0.45);
  t.hero.motion.clearPose();
  t.hero.play('low_reach');
  await v.wait(1.0);
  v.scene.attach(n.hero.root);
  n.hero.root.position.copy(p).setY(0);
  n.hero.root.rotation.set(0, t.hero.root.rotation.y + Math.PI, 0);
  n.hero.root.scale.setScalar(0.45);
  n.carried = false;
  if (n.hero.seat) n.hero.motion.stand(); else n.hero.play('idle');
  await v.wait(0.8);
}

export const SCENES = [
  { label: 'Se saluer', run: async (v) => {
    const [t, n] = cast(v);
    await reset(v); await meet(v, 0.75);
    t.hero.setExpression('sourire'); n.hero.setExpression('joie');
    t.hero.play('wave'); await v.wait(0.5); n.hero.play('wave');
    await v.say(n, 'Salut Tobi !');
    await v.say(t, 'Salut Nox !');
    n.hero.setExpression('sourire');
  } },
  { label: 'Tape m’en cinq', run: async (v) => {
    const [t, n] = cast(v);
    await reset(v); await meet(v, 0.5);
    t.hero.setExpression('sourire'); n.hero.setExpression('sourire');
    t.hero.play('low_reach'); await v.wait(0.35);
    n.hero.play('highfive'); await v.wait(0.75);
    n.hero.setExpression('joie'); t.hero.setExpression('joie');
    await v.wait(1.2);
    t.hero.play('thumb');
  } },
  { label: 'Donner la gourde', run: async (v) => {
    const [t, n] = cast(v);
    await reset(v);
    await meet(v, 0.5);
    v.attach(t, v.item('bottle'));
    await v.wait(0.5);
    await v.say(t, 'Tiens, bois un coup.');
    await v.give(t, n);
    await v.wait(1.2);
    n.hero.setExpression('joie');
    v.useHeld(n);
    await v.wait(3);
    n.hero.setExpression('amour');
    await v.say(n, 'Merci !');
  } },
  { label: 'Pause lecture', run: async (v) => {
    const [t, n] = cast(v);
    await reset(v);
    await meet(v, 0.62);
    v.attach(t, v.item('book'));
    await Promise.all([v.sit(t, 'chair'), v.sit(n, 'floor')]);
    t.hero.motion.togglePose('read');
    n.hero.setExpression('sourire');
    await v.wait(2.5);
    await v.say(t, 'Écoute ce passage.');
    n.hero.play('nod');
  } },
  { label: 'Porter Nox', run: async (v) => { const n = cast(v)[1]; if (n.carried) await putDown(v); else await mount(v, 'bras'); } },
  { label: "Nox sur l'épaule", run: async (v) => { const n = cast(v)[1]; if (n.carried) await putDown(v); else await mount(v, 'epaule'); } },
  { label: 'Nox dans le sac', run: async (v) => { const n = cast(v)[1]; if (n.carried) await putDown(v); else await mount(v, 'sac'); } },
  { label: 'Nox suit Tobi', run: async (v) => {
    const [t, n] = cast(v);
    if (n.follow) { n.follow = null; n.goal = null; await v.say(n, 'Je reste ici.'); return; }
    await reset(v);
    n.follow = t;
    await v.say(n, 'Je te suis !');
    await v.walkTo(t, new THREE.Vector3(0.2, 0, -1.3));
  } },
];
