// Contrôle des épisodes : tons connus, personnages, durée estimée, mots interdits, PLAN avant chaque nouveau personnage.
import { TONS } from '../src/tones.js';
import { readFileSync, readdirSync } from 'fs';
const plain = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const from = Number(process.argv[2] || 101), to = Number(process.argv[3] || 140);
let bad = 0;
for (const f of readdirSync('shorts').filter((f) => { const n = parseInt(f); return n >= from && n <= to; }).sort((a, b) => parseInt(a) - parseInt(b))) {
  const lines = readFileSync('shorts/' + f, 'utf8').split(/\r?\n/), pb = [];
  let words = 0, pcs = 0, last = null, prev = '';
  // Places connues du Studio (LIEUX et PERCHOIRS de src/story.js) : une faute ne passe plus en silence.
  const LIEUX = ['gauche', 'milieu', 'droite', 'centre', 'tapis', 'fenetre', 'lit', 'bureau', 'armoire', 'frigo', 'miroir', 'couloir', 'porte'];
  const PERCH = ['bureau', 'chaise', 'lit', 'rebord'];
  let suit = false;
  for (const l of lines) {
    const p = /^(?:DIRECT )?(\w+) (apparait|marche|court|entre) (\S+)/.exec(l);
    if (p && !LIEUX.includes(plain(p[3])) && !(p[2] === 'apparait' && PERCH.includes(plain(p[3])))) pb.push(`place inconnue : ${p[2]} ${p[3]}`);
    if (/^NOX suit /.test(l)) suit = true;
    if (/^NOX seul/.test(l) || /^DECOR /.test(l)) suit = false;
  }
  if (suit) pb.push("NOX suit Tobi jusqu'à la fin (ajouter NOX seul)");
  for (const l of lines) {
    const m = /^(\w+) dit \(([^)]+)\) (.*)$/.exec(l);
    if (m) {
      if (!['TOBI', 'NOX', 'CLAUDE', 'CODEX', 'GEMINI', 'CENTI'].includes(m[1])) pb.push('personnage ' + m[1]);
      if (!TONS[plain(m[2])]) pb.push('ton ' + m[2]);
      if (m[1] !== last && !prev.startsWith('PLAN')) pb.push('PLAN manquant avant ' + m[3].slice(0, 30));
      last = m[1]; words += m[3].split(/\s+/).length;
      if (/m[ée]moire\b/i.test(m[3]) && !/ma m[ée]moire/i.test(m[3])) pb.push('mémoire');
      if (/Puis-je|je vais être honnête/i.test(m[3])) pb.push('formule interdite');
    } else if (/^(PC |TEMPS|TOBI message|PLAN pc)/.test(l)) last = null;
    if (/^PLAN pc/.test(l)) pcs++;
    if (l.trim()) prev = l;
  }
  const s = Math.round(words / 3 + pcs * 1.8);
  if (!lines.some((l) => l.startsWith('ACCROCHE'))) pb.push('pas d\'ACCROCHE');
  // Règles de l'audit du 22 novembre 2026 : 26 à 38 s, 50 au plus, 12 à 16 répliques, un seul saut dans le temps.
  const repliques = lines.filter((l) => / dit \(/.test(l)).length, temps = lines.filter((l) => /^TEMPS /.test(l)).length;
  if (s > 50) pb.push(`trop long (${s} s, viser 26 à 38, 50 au plus)`);
  if (repliques > 16) pb.push(`${repliques} répliques (16 au plus)`);
  if (temps > 1) pb.push(`${temps} sauts dans le temps (1 au plus)`);
  if (pb.length) bad++;
  console.log(`${f.padEnd(50)} ${String(words).padStart(3)} mots ~${s} s ${pb.length ? '⚠ ' + [...new Set(pb)].join(', ') : 'ok'}`);
}
console.log(bad ? `${bad} fichier(s) à revoir` : 'Tout est bon.');
