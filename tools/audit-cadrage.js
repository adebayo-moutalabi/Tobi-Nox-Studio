// Vérifie qu'à chaque réplique, celui qui parle est à l'image et qu'aucun meuble ne le cache.
// Ouvrir studio.html, coller ce fichier dans la console du navigateur, puis lancer : await auditCadrage(['44.', '45.'])
// Sans liste, tous les épisodes sont vérifiés. Le résultat donne, par épisode, la ligne, le personnage et le problème.
window.auditCadrage = async (names) => {
  const p = window.__perso, T = p.THREE, ray = new T.Raycaster(), sel = document.getElementById('storyPick'), now = document.getElementById('storyNow');
  const channel = new MessageChannel(), queue = []; channel.port1.onmessage = () => queue.shift()?.();
  const tick = () => new Promise((r) => { queue.push(r); channel.port2.postMessage(0); });
  const step = async () => { p.step(1 / 15, true); await tick(); await tick(); };
  const check = (who) => {
    const a = p.actors.find((x) => x.id === who.toLowerCase()), h = a.hero.bones.head.getWorldPosition(new T.Vector3()); h.y += a.eyeUp;
    const n = h.clone().project(p.camera);
    for (const x of p.actors) {
      if (!x.hero.root.visible) continue;
      const at = x.hero.bones.head.getWorldPosition(new T.Vector3()); if (x.id === 'tobi') at.y = p.camera.position.y;
      if (at.distanceTo(p.camera.position) < 0.3) return `caméra dans ${x.id}`;
    }
    if (Math.abs(n.x) > 0.86 || n.y > 0.92 || n.y < -0.9 || n.z > 1) return 'hors du cadre';
        if (who !== 'CLAUDE' && who !== 'CODEX' && who !== 'GEMINI' && who !== 'CENTI') {
      const q = a.hero.bones.head.getWorldQuaternion(new T.Quaternion()), face = new T.Vector3(0, 0, 1).applyQuaternion(q), eye = p.camera.position.clone().sub(h).normalize();
      if (face.dot(eye) < -0.1) return 'de dos';
      if (face.dot(eye) < 0.2) return 'visage peu visible';
    }
    const c = p.camera.position.clone(), d = h.clone().sub(c), L = d.length();
    const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; }; // la chaise retirée du plan ne cache rien
    // Un meuble devant la caméra : on sonde le centre de l'image.
    const f = p.camera.getWorldDirection(new T.Vector3()), right = new T.Vector3().crossVectors(f, new T.Vector3(0, 1, 0)).normalize(), upv = new T.Vector3().crossVectors(right, f);
    const th = Math.tan((p.camera.fov * Math.PI) / 360), tw = th * p.camera.aspect;
    let front2 = 0;
    for (let i = -1; i <= 3; i++) for (let j = -2; j <= 2; j++) {
      ray.set(c, f.clone().addScaledVector(right, (j / 2.6) * tw).addScaledVector(upv, (i / 3.6) * th).normalize()); ray.far = L * 0.55;
      if (ray.intersectObject(p.room.group, true).some((x) => x.point.y > 0.06 && shown(x.object) && x.object.name !== 'miroir')) front2 += 1;
    }
    if (front2 > 2) return `meuble devant (${Math.round((front2 / 25) * 100)} %)`;
    ray.set(c, d.normalize()); ray.far = L - 0.15;
    return ray.intersectObject(p.room.group, true).some((i) => shown(i.object) && i.object.name !== 'miroir') ? 'caché' : null;
  };
  // À chaque image : un personnage dans un autre, ou Tobi dans un meuble.
  const body = () => {
    const out = [], seen = p.actors.filter((x) => x.hero.root.visible), at = (x) => x.hero.bones.chest?.getWorldPosition(new T.Vector3()) || x.hero.root.getWorldPosition(new T.Vector3());
    for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
      const A = at(seen[i]), B = at(seen[j]);
      if (Math.hypot(A.x - B.x, A.z - B.z) < 0.22 && Math.abs(A.y - B.y) < 0.45) out.push(`${seen[i].id} dans ${seen[j].id}`);
    }
    const t = p.actors.find((x) => x.id === 'tobi');
    if (t?.hero.root.visible) {
      const h = t.hero.bones.hips.getWorldPosition(new T.Vector3());
      if (h.x > 0.76 && h.y < 0.9) out.push('tobi dans le bureau');
      if (h.x < -0.5 && h.y < 0.72 && !t.hero.seat) out.push('tobi dans le lit');
    }
    return out;
  };
  const off = p.beginOffline(225, 400), report = {}; void off;
  for (const o of [...sel.options].filter((x) => !names || names.some((n) => x.textContent.startsWith(n)))) {
    sel.value = o.value; sel.dispatchEvent(new Event('change'));
    for (let g = 0; p.story.busy && g < 300; g++) await step();
    p.story.play(document.getElementById('storyText').value);
    for (let k = 0; k < 12; k++) await step();
    let last = '', wait = 0; const bad = [];
    while (p.story.running) {
      await step();
      for (const m of body()) if (!bad.includes(m)) bad.push(m);
      const l = now.dataset.line || '';
      if (l !== last) { last = l; wait = 14; }
      if (wait > 0 && --wait === 0) { const m = /Ligne (\d+) : (TOBI|NOX|CLAUDE|CODEX|GEMINI|CENTI) dit/.exec(l); const r = m && check(m[2]); if (r) bad.push(`ligne ${m[1]}, ${m[2]} : ${r}`); }
    }
    if (bad.length) report[o.textContent] = bad;
  }
  return report;
};
