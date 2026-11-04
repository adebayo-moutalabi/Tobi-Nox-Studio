// Ce que Tobi et Nox peuvent faire avec les meubles de la chambre.
import * as THREE from 'three';

const P = (x, z) => new THREE.Vector3(x, 0, z);
const EAST = Math.PI / 2, WEST = -Math.PI / 2, NORTH = Math.PI;

export function roomActions(v, room) {
  const big = (a) => a.id === 'tobi';
  const arrive = async (a, p, yaw) => { await v.leave(a); await v.walkTo(a, p); a.faceYaw = yaw; await v.wait(0.45); };

  const other = (a) => v.actors.find((b) => b !== a);
  async function desk(a) {
    if (big(a)) {
      await arrive(a, P(0.72, -1.05), EAST);
      a.spot = { exit: async () => { a.hero.motion.clearPose(); await v.stand(a); } };
      await v.sit(a, 'chair', true);
      a.hero.motion.togglePose('type');
    } else {
      await arrive(a, P(0.7, -0.68), EAST);
      const spot = new THREE.Vector3(0.98, 0.745, -0.68), o = v.pos(other(a));
      await v.hop(a, spot, Math.atan2(o.x - spot.x, o.z - spot.z));
      a.spot = { exit: async () => { await v.stand(a); await v.hop(a, P(0.7, -0.68), WEST); } };
      await v.sit(a, 'floor');
    }
  }
  async function bedEdge(a) {
    if (big(a)) {
      await arrive(a, P(-0.42, -0.2), EAST);
      a.spot = { exit: () => v.stand(a) };
      await v.sit(a, 'chair', true);
    } else {
      await arrive(a, P(-0.42, -0.2), WEST);
      await v.hop(a, new THREE.Vector3(-0.72, 0.55, -0.2), EAST);
      a.spot = { exit: async () => { await v.stand(a); await v.hop(a, P(-0.42, -0.2), EAST); } };
      await v.sit(a, 'floor');
    }
  }
  async function sleep(a) {
    const out = P(-0.42, -0.05);
    await arrive(a, out, EAST);
    const expr = a.hero.expression;
    if (big(a)) { // s'assoit au bord, puis s'allonge ; au réveil, le chemin inverse
      await v.sit(a, 'chair', true);
      v.glide(a, new THREE.Vector3(-0.95, 0, -0.05), NORTH, 1.5);
      await a.hero.motion.transition('seat_to_lie', 'lying', 'lie');
      a.spot = { exit: async () => {
        a.hero.setExpression(expr);
        v.glide(a, out, EAST, 1.7);
        await a.hero.motion.transition('lie_to_seat', 'sitting', 'chair');
        await v.stand(a);
      } };
    } else {
      await v.hop(a, new THREE.Vector3(-0.95, 0.53, 0.25), NORTH);
      a.spot = { exit: async () => { a.hero.setExpression(expr); await v.stand(a); await v.hop(a, out, EAST); } };
      await v.sit(a, 'lie');
    }
    a.hero.setExpression('dort');
  }
  async function openFridge(a) {
    if (big(a)) {
      await arrive(a, P(0.42, 1.42), EAST);
      const d = a.hero.play('fridge_open');
      await v.wait(d * 0.34);
      await v.swing(room.fridgeDoor, -1.75, d * 0.34);
      await v.wait(d * 0.34);
      await v.glide(a, new THREE.Vector3(0.5, 0, 1.3), EAST, 0.6);
    } else {
      await arrive(a, P(0.5, 1.42), EAST);
      a.hero.play('reach_up'); await v.wait(0.6);
      await v.swing(room.fridgeDoor, -1.75, 0.6);
      await v.glide(a, new THREE.Vector3(0.62, 0, 1.24), EAST, 0.6);
    }
  }
  async function closeFridge(a) {
    await v.glide(a, new THREE.Vector3(big(a) ? 0.42 : 0.5, 0, 1.42), EAST, 0.6);
    if (big(a)) { a.hero.play('stop'); await v.wait(0.45); }
    await v.swing(room.fridgeDoor, 0, 0.6);
  }
  const SHELF = new THREE.Vector3(1.02, 0.52, 1.28);
  async function fridge(a) {
    const it = v.item('bottle');
    v.stash(a); v.putAt(it, SHELF, a);
    await openFridge(a);
    const e = a.hero.play(big(a) ? 'fridge_take' : 'pickup');
    await v.wait(e * 0.47); v.attach(a, it); await v.wait(e * 0.55);
    await closeFridge(a);
  }
  async function fridgeBack(a) { // remet la gourde au frais, sans rien laisser traîner
    const it = a.held;
    await openFridge(a);
    const e = a.hero.play(big(a) ? 'fridge_take' : 'pickup');
    await v.wait(e * 0.47);
    if (it) v.stash(a);
    await v.wait(e * 0.55);
    await closeFridge(a);
  }
  async function mirror(a) {
    await arrive(a, P(-0.42, -1.5), WEST);
    a.hero.setExpression('sourire');
    a.hero.play('wave');
  }
  async function windowView(a) {
    await arrive(a, P(0, -1.6), NORTH);
    a.hero.play('stretch');
  }
  return [
    ['desk', 'Travailler au bureau', desk],
    ['edge', "S'asseoir sur le lit", bedEdge],
    ['sleep', 'Dormir', sleep],
    ['fridge', 'Prendre au frigo', fridge],
    ['fridgeBack', 'Remettre au frigo', fridgeBack],
    ['mirror', 'Miroir', mirror],
    ['window', 'À la fenêtre', windowView],
  ];
}
