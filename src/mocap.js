// Mouvements enregistrés sur de vraies personnes (Quaternius, CC0), déjà transposés sur Tobi par tools/mocap.mjs.
import * as THREE from 'three';
import BASE from './mocap.json';
import MIXAMO from './mocap-mixamo.json';

// Les gestes Mixamo ne sont pas publiés. Sur le site, l'auteur les importe une fois : ils restent dans son navigateur.
const KEY = 'tobi-gestes';
const bundled = Object.keys(MIXAMO.clips).length > 0;
function savedGestures() {
  try { const t = localStorage.getItem(KEY); return t ? JSON.parse(t) : null; } catch { return null; }
}
export const gestures = {
  bundled,
  get saved() { try { return !!localStorage.getItem(KEY); } catch { return false; } },
  save(text) { // refuse tout fichier qui n'est pas le bon
    const data = JSON.parse(text);
    if (!data.clips?.mx_parle || !data.bones) throw new Error('Ce fichier ne contient pas les gestes de Tobi.');
    localStorage.setItem(KEY, text);
  },
  remove() { localStorage.removeItem(KEY); },
};

export const mocapClips = () => {
  const extra = bundled ? MIXAMO : savedGestures();
  return [...clipsFrom(BASE), ...(extra ? clipsFrom(extra) : [])];
};

function clipsFrom(DATA) {
  return Object.entries(DATA.clips).map(([name, c]) => {
    const raw = atob(c.q), bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const i16 = new Int16Array(bytes.buffer), B = DATA.bones.length, frames = i16.length / (B * 4);
    const times = Float32Array.from({ length: frames }, (_, f) => (f / (frames - 1)) * c.d);
    const tracks = DATA.bones.map((b, i) => {
      const q = new Float32Array(frames * 4), v = new THREE.Quaternion();
      for (let f = 0; f < frames; f++) {
        const o = (f * B + i) * 4;
        v.set(i16[o] / 32767, i16[o + 1] / 32767, i16[o + 2] / 32767, i16[o + 3] / 32767).normalize().toArray(q, f * 4);
      }
      return new THREE.QuaternionKeyframeTrack(`${b}.quaternion`, times, q);
    });
    tracks.push(new THREE.VectorKeyframeTrack('hips.position', times, Float32Array.from(c.p)));
    const clip = new THREE.AnimationClip(name, c.d, tracks);
    clip.userData = { loop: true };
    return clip;
  });
}
