// Exporte un personnage riggé et animé en GLB (Blender, Unity, Unreal, Godot, three.js…)
// Usage : node export-glb.mjs [tobi|nox|objets|chambre]
import { writeFileSync, readFileSync } from 'node:fs';

class FR {
  readAsArrayBuffer(b) { b.arrayBuffer().then((a) => { this.result = a; this.onloadend?.(); this.onload?.(); }); }
  readAsDataURL(b) { b.arrayBuffer().then((a) => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(a).toString('base64'); this.onloadend?.(); this.onload?.(); }); }
}
globalThis.FileReader = FR;
const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');

const which = process.argv[2] || 'tobi';
let hero;
if (which === 'chambre') {
  const { createRoom } = await import('./src/room.js');
  const room = createRoom();
  room.lamp.removeFromParent();
  const b = await new GLTFExporter().parseAsync(room.group, { binary: true });
  writeFileSync('chambre.glb', Buffer.from(b));
  console.log('chambre.glb', (b.byteLength / 1024).toFixed(0) + ' Ko');
  process.exit(0);
}
if (which === 'objets') {
  const THREE = await import('three');
  const { createProp } = await import('./src/props.js');
  const root = new THREE.Group(); root.name = 'objets';
  ['paper', 'book', 'bottle', 'mug', 'phone', 'bag', 'chair', 'stool'].forEach((n, i) => { const o = createProp(n, { straps: false }); o.position.x = i * 0.5; root.add(o); });
  const b = await new GLTFExporter().parseAsync(root, { binary: true });
  writeFileSync('objets.glb', Buffer.from(b));
  console.log('objets.glb', (b.byteLength / 1024).toFixed(0) + ' Ko');
  process.exit(0);
}
if (which === 'nox') {
  const { createNox } = await import('./src/nox.js');
  hero = createNox();
  hero.hideForExport(); // les halos additifs n'existent pas en glTF
} else {
  const { createCharacter } = await import('./src/character.js');
  hero = createCharacter();
}
hero.root.updateMatrixWorld(true);
hero.mixer.stopAllAction();
hero.skeleton.pose();
const buf = await new GLTFExporter().parseAsync(hero.root, { binary: true, animations: hero.clips, onlyVisible: true });
const file = `${which}.glb`;
writeFileSync(file, Buffer.from(buf));
const b = readFileSync(file);
const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
console.log({ file, Mo: (b.length / 1048576).toFixed(2), joints: j.skins?.[0]?.joints.length, animations: j.animations?.length, morphs: Math.max(...j.meshes.map((m) => m.primitives[0].targets?.length || 0)) });
