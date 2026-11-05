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
    if (Math.abs(n.x) > 0.86 || n.y > 0.92 || n.y < -0.9 || n.z > 1) return 'hors du cadre';
    const c = p.camera.position.clone(), d = h.clone().sub(c), L = d.length();
    ray.set(c, d.normalize()); ray.far = L - 0.15;
    return ray.intersectObject(p.room.group, true).some((i) => i.object.visible && i.object.name !== 'miroir') ? 'caché' : null;
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
      const l = now.dataset.line || '';
      if (l !== last) { last = l; wait = 6; }
      if (wait > 0 && --wait === 0) { const m = /Ligne (\d+) : (TOBI|NOX|CLAUDE|CODEX|GEMINI) dit/.exec(l); const r = m && check(m[2]); if (r) bad.push(`ligne ${m[1]}, ${m[2]} : ${r}`); }
    }
    if (bad.length) report[o.textContent] = bad;
  }
  return report;
};
