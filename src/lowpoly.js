// Outils communs de modélisation low-poly (déterministes)
import * as THREE from 'three';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const hash = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};


// ---- Accumulateur de triangles --------------------------------------------
export class Part {
  constructor(pal = {}) { this.pal = pal; this.p = []; this.c = []; this.si = []; this.sw = []; this.tag = []; }
  tri(a, b, c, o, ref) {
    if (ref) {
      const n = b.clone().sub(a).cross(c.clone().sub(a));
      const m = a.clone().add(b).add(c).multiplyScalar(1 / 3);
      if (n.dot(m.sub(ref)) < 0) { const t = b; b = c; c = t; }
    }
    const m = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const base = o.color.isColor ? o.color : new THREE.Color(this.pal[o.color] ?? o.color);
    const sk = o.shadeAt || m;
    const shade = 1 + (hash(Math.abs(sk.x) * 9, sk.y * 9, sk.z * 9) - 0.5) * (o.vary ?? 0.07);
    const cc = base.clone().multiplyScalar(shade);
    if (o.tint) o.tint(cc, m);
    for (const v of [a, b, c]) {
      this.p.push(v.x, v.y, v.z);
      this.c.push(cc.r, cc.g, cc.b);
      const w = typeof o.skin === 'function' ? o.skin(v) : [[o.skin, 1]];
      this.si.push(w); this.tag.push(o.tag || '');
    }
  }
  quad(a, b, c, d, o, ref) {
    const m = a.clone().add(c);
    if (o.perQuad) o = { ...o, shadeAt: m.clone().add(b).add(d).multiplyScalar(0.25) };
    if (hash(m.x * 13, m.y * 13, m.z * 13) > 0.5) { this.tri(a, b, c, o, ref); this.tri(a, c, d, o, ref); }
    else { this.tri(a, b, d, o, ref); this.tri(b, c, d, o, ref); }
  }
  loft(rings, o) {
    const cen = (r) => r.reduce((s, v) => s.add(v), V(0, 0, 0)).multiplyScalar(1 / r.length);
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i], B = rings[i + 1], n = A.length;
      const ref = (o.ref && o.ref(i)) || cen(A).add(cen(B)).multiplyScalar(0.5);
      const oo = o.colorAt ? { ...o, color: o.colorAt(i) } : o;
      for (let j = 0; j < n; j++) {
        const k = (j + 1) % n;
        if (o.open && j === n - 1) continue;
        this.quad(A[j], A[k], B[k], B[j], oo, ref);
      }
    }
    const cap = (r, out, oc) => {
      const c = cen(r), ref = c.clone().sub(out);
      for (let j = 0; j < r.length; j++) this.tri(c, r[j], r[(j + 1) % r.length], oc, ref);
    };
    const dir = cen(rings[rings.length - 1]).sub(cen(rings[0])).normalize();
    const oc = o.color ? o : { ...o, color: o.colorAt(0) };
    if (o.capStart) cap(rings[0], dir.clone().negate(), o.capStart === true ? oc : { ...o, color: o.capStart });
    if (o.capEnd) cap(rings[rings.length - 1], dir, o.capEnd === true ? oc : { ...o, color: o.capEnd });
  }
  geo(geometry, o) { // ajoute une BufferGeometry (triangles)
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    const a = g.attributes.position;
    for (let i = 0; i < a.count; i += 3) {
      this.tri(V(a.getX(i), a.getY(i), a.getZ(i)), V(a.getX(i + 1), a.getY(i + 1), a.getZ(i + 1)), V(a.getX(i + 2), a.getY(i + 2), a.getZ(i + 2)), o);
    }
  }
}

export const jit = (p, a) => {
  const h = (k) => hash(Math.round(p.x * 500) + k, Math.round(p.y * 500), Math.round(p.z * 500)) - 0.5;
  return p.clone().add(V(h(1) * a, h(2) * a, h(3) * a));
};
export function ring(c, rx, rz, n, pow = 1, rot = 0, amt = 0) { // anneau horizontal
  const out = [];
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2 + rot;
    const cx = Math.cos(a), sz = Math.sin(a);
    const p = V(c.x + rx * Math.sign(cx) * Math.abs(cx) ** pow, c.y, c.z + rz * Math.sign(sz) * Math.abs(sz) ** pow);
    out.push(amt ? jit(p, amt) : p);
  }
  return out;
}
export function ringOn(c, dir, r1, r2, n, amt = 0, rot = 0) { // anneau perpendiculaire à dir, r2 selon z
  const u = V(0, 0, 1).cross(dir).normalize(), v = V(0, 0, 1);
  const out = [];
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2 + rot;
    const p = c.clone().addScaledVector(u, Math.cos(a) * r1).addScaledVector(v, Math.sin(a) * r2);
    out.push(amt ? jit(p, amt) : p);
  }
  return out;
}
export function blendSkin(bones, joints, v, blend) {
  let i = 0;
  while (i < joints.length && v > joints[i] + blend) i++;
  if (i < joints.length && v > joints[i] - blend) {
    const w = smooth(joints[i] - blend, joints[i] + blend, v);
    return [[bones[i], 1 - w], [bones[i + 1], w]];
  }
  return [[bones[i], 1]];
}

