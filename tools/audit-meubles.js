// Cherche les passages à travers les meubles, image par image, sur Tobi.
// Ouvrir studio.html, coller ce fichier dans la console, puis lancer : await auditMeubles(['44.', '45.'])
// Le résultat donne, par épisode : meuble, partie du corps, profondeur en cm, nombre d'images et ligne du script.
window.auditMeubles = async (names) => {
  const p = window.__perso, T = p.THREE, sel = document.getElementById('storyPick'), now = document.getElementById('storyNow');
  const channel = new MessageChannel(), queue = []; channel.port1.onmessage = () => queue.shift()?.();
  const tick = () => new Promise((r) => { queue.push(r); channel.port2.postMessage(0); });
  const step = async () => { p.step(1 / 15, true); await tick(); await tick(); };
  const BOXES = {
    lit: [-1.39, -0.51, 0, 0.52, -1.1, 0.95], plateau: [0.78, 1.4, 0.69, 0.745, -1.88, -0.12], casier: [0.8, 1.4, 0, 0.7, -0.5, -0.14],
    armoire: [0.78, 1.4, 0, 2.05, -0.12, 0.9], frigo: [0.85, 1.36, 0, 0.84, 0.96, 1.51], armoire_miroir: [-1.4, -0.79, 0, 2.2, -1.89, -1.13],
  };
  const PARTS = { hips: 0.12, chest: 0.12, head: 0.09, upleg_L: 0.07, upleg_R: 0.07, leg_L: 0.05, leg_R: 0.05, foot_L: 0.04, foot_R: 0.04, forearm_L: 0.04, forearm_R: 0.04, hand_L: 0.03, hand_R: 0.03 };
  const w = new T.Vector3(), c = new T.Vector3();
  const depth = ([x0, x1, y0, y1, z0, z1], q, r) => Math.min(q.x - x0, x1 - q.x, q.y - y0, y1 - q.y, q.z - z0, z1 - q.z) + r;
  const scan = (bad, line) => {
    const t = p.actors.find((x) => x.id === 'tobi');
    if (!t?.hero.root.visible) return;
    const hit = (k, d) => { if (d < 0.03) return; const e = (bad[k] ||= { cm: 0, images: 0, ligne: line }); e.images += 1; if (d * 100 > e.cm) { e.cm = Math.round(d * 100); e.ligne = line; } };
    p.room.chair.getWorldPosition(c);
    const assis = t.hero.seat && Math.hypot(t.hero.root.position.x - c.x, t.hero.root.position.z - c.z) < 0.45;
    for (const [n, r] of Object.entries(PARTS)) {
      const b = t.hero.bones[n]; if (!b) continue;
      b.getWorldPosition(w);
      for (const [z, box] of Object.entries(BOXES)) { const d = depth(box, w, r); if (d > 0) hit(`${z}:${n}`, d); }
      if (!assis && w.y < 0.9) { const d = 0.22 + r - Math.hypot(w.x - c.x, w.z - c.z); if (d > 0) hit(`chaise:${n}`, d); }
    }
  };
  const off = p.beginOffline(225, 400), report = {}; void off;
  for (const o of [...sel.options].filter((x) => !names || names.some((n) => x.textContent.startsWith(n)))) {
    sel.value = o.value; sel.dispatchEvent(new Event('change'));
    for (let g = 0; p.story.busy && g < 300; g++) await step();
    p.story.play(document.getElementById('storyText').value);
    for (let k = 0; k < 12; k++) await step();
    const bad = {};
    while (p.story.running) { await step(); scan(bad, (/Ligne (\d+)/.exec(now.dataset.line || '') || [])[1] || '?'); }
    if (Object.keys(bad).length) report[o.textContent] = bad;
  }
  return report;
};
