// Détails de la chambre : ce qui la rend habitée sans gêner personne.
// Tout est accroché côté lit, sur le panneau en bois et au-dessus du placard : rien au sol, rien sur le bureau, donc aucun risque pour les déplacements et la caméra.
// Interrupteur : ROOM_DETAILS dans src/config.js.
import * as THREE from 'three';

function poster(lines, { bg, colors, sizes, w = 384, h = 512 }) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((t, i) => { g.fillStyle = colors[i % colors.length]; g.font = `900 ${sizes[i % sizes.length]}px "Inter", "Segoe UI", sans-serif`; g.fillText(t, w / 2, (h * (i + 1)) / (lines.length + 1), w - 40); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function noxPoster() { // le visage de Nox en gros pixels, comme une affiche de jeu rétro
  const c = document.createElement('canvas'); c.width = 384; c.height = 512; const g = c.getContext('2d'), P = 32;
  g.fillStyle = '#15132b'; g.fillRect(0, 0, 384, 512); g.fillStyle = '#f2b92e'; g.fillRect(2 * P, 3 * P, 8 * P, 8 * P); g.fillStyle = '#0b0a18'; g.fillRect(3 * P, 4 * P, 6 * P, 5 * P);
  g.fillStyle = '#8feaff'; g.fillRect(4 * P, 5 * P, P, 2 * P); g.fillRect(7 * P, 5 * P, P, 2 * P); g.fillRect(5 * P, 8 * P, 2 * P, P / 2);
  g.fillStyle = '#8feaff'; g.fillRect(5.5 * P, 1.2 * P, P, P); g.fillStyle = '#f4f1ec'; g.font = '900 44px "Inter", sans-serif'; g.textAlign = 'center'; g.fillText('NOX 1.0', 192, 14.2 * P);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function addRoomDetails(room) {
  const g = new THREE.Group(); g.name = 'details-chambre'; room.group.add(g);
  const X = -1.392; // juste devant le mur de gauche
  // Deux affiches, un peu de travers : personne ne les a posées au niveau
  const put = (tex, y, z, w, h, tilt) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); m.position.set(X + 0.022, y, z); m.rotation.set(0, Math.PI / 2, tilt); g.add(m); }; // posées sur le panneau en bois qui habille le mur derrière le lit
  put(poster(['AIE', 'LA', 'VISION.'], { bg: '#f2b92e', colors: ['#15132b'], sizes: [120, 120, 76] }), 1.52, -0.55, 0.36, 0.48, 0.03);
  put(noxPoster(), 1.5, 0.05, 0.36, 0.48, -0.025);
  // Guirlande lumineuse : un fil qui pend entre des punaises, et des ampoules chaudes qui ressortent le soir
  const wire = new THREE.MeshStandardMaterial({ color: '#2b2a33', roughness: 0.8 }), bulbs = [];
  const z0 = -1.0, z1 = 0.85, n = 13, yAt = (u) => 2.4 - 0.07 * Math.sin(u * Math.PI * 3) ** 2; // au-dessus du placard, sous le plafond
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), z = z0 + (z1 - z0) * u, y = yAt(u);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffe2a8', emissive: '#ffb347', emissiveIntensity: 2.4, roughness: 0.4 })); b.position.set(X + 0.012, y - 0.02, z); g.add(b); bulbs.push(b);
    if (i < n - 1) { const zn = z0 + (z1 - z0) * ((i + 1) / (n - 1)), yn = yAt((i + 1) / (n - 1)), len = Math.hypot(zn - z, yn - y); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, len, 5), wire); s.position.set(X + 0.008, (y + yn) / 2, (z + zn) / 2); s.rotation.x = Math.atan2(zn - z, yn - y); g.add(s); }
  }
  const glow = new THREE.PointLight('#ffb866', 0.5, 2.2, 1.6); glow.position.set(-1.15, 2.3, -0.1); g.add(glow);
  let t = 0;
  return { group: g, update(dt) { t += dt; bulbs.forEach((b, i) => { b.material.emissiveIntensity = 2.2 + 0.5 * Math.sin(t * 1.3 + i * 0.9); }); } }; // elles scintillent très doucement
}
