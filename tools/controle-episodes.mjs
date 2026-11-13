// Contrôle des épisodes : tons connus, personnages, durée estimée, mots interdits, PLAN avant chaque nouveau personnage.
import { TONS } from '../src/tones.js';
import { readFileSync, readdirSync } from 'fs';
const plain = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const from = Number(process.argv[2] || 101), to = Number(process.argv[3] || 140);
let bad = 0;
for (const f of readdirSync('shorts').filter((f) => { const n = parseInt(f); return n >= from && n <= to; }).sort((a, b) => parseInt(a) - parseInt(b))) {
  const lines = readFileSync('shorts/' + f, 'utf8').split(/\r?\n/), pb = [];
  let words = 0, pcs = 0, last = null, prev = '';
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
  if (s > 60) pb.push('trop long');
  if (pb.length) bad++;
  console.log(`${f.padEnd(50)} ${String(words).padStart(3)} mots ~${s} s ${pb.length ? '⚠ ' + [...new Set(pb)].join(', ') : 'ok'}`);
}
console.log(bad ? `${bad} fichier(s) à revoir` : 'Tout est bon.');
