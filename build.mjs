// Assemble chaque visualiseur en une page autonome
import { build } from 'esbuild';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const NIGHT = (on) => `      <label><input type="checkbox" id="night"${on ? ' checked' : ''}> Fond bleu nuit</label>\n`;
const PAGES = [
  { entry: 'src/tobi-app.js', out: 'tobi.html', TITLE: 'Tobi', H1: 'Tobi',
    SUB: 'Le personnage principal, identique à chaque plan. Combine geste, objet et mimique.', SAY: 'Salut, moi c\'est Tobi !',
    OPTS: '      <label><input type="checkbox" id="glasses" checked> Lunettes</label>\n' + NIGHT(false) },
  { entry: 'src/nox-app.js', out: 'nox.html', TITLE: 'Nox', H1: 'Nox',
    SUB: 'La mascotte, 45 cm. Son écran affiche ses émotions : combine geste, objet et mimique.', SAY: 'Bonjour, je suis Nox !',
    OPTS: NIGHT(true) },
  { entry: 'src/studio-app.js', out: 'studio.html', TITLE: 'Studio Tobi et Nox', H1: 'Tobi <em>&amp;</em> Nox',
    SUB: 'Trois étapes pour sortir un Short.', SAY: 'On tourne ?',
    OPTS: '      <label><input type="checkbox" id="glasses" checked> Lunettes de Tobi</label>\n' + NIGHT(false) },
];
// Les animations Mixamo ne sont pas redistribuables : les pages suivies par Git sont compilées sans elles.
// Si src/mocap-mixamo.json existe sur ce poste, studio-mixamo.html est créée en plus. Elle n'est jamais envoyée sur GitHub.
const MIXAMO = 'src/mocap-mixamo.json';
const withoutMixamo = { name: 'sans-mixamo', setup(b) {
  b.onResolve({ filter: /mocap-mixamo\.json$/ }, (a) => ({ path: a.path, namespace: 'sans-mixamo' }));
  b.onLoad({ filter: /.*/, namespace: 'sans-mixamo' }, () => ({ contents: '{"clips":{}}', loader: 'json' }));
} };
if (existsSync(MIXAMO)) PAGES.push({ ...PAGES[2], out: 'studio-mixamo.html', mixamo: true });
const save = async (file, text) => { // Windows bloque parfois le fichier un court instant
  for (let i = 0; ; i++) {
    try { writeFileSync(file, text); return; } catch (e) { if (i === 4) throw e; await new Promise((r) => setTimeout(r, 400)); }
  }
};
const VERSION = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const template = readFileSync('src/page.html', 'utf8');
for (const p of PAGES) {
  const r = await build({ entryPoints: [p.entry], bundle: true, format: 'esm', write: false, minify: true, target: 'es2020', loader: { '.txt': 'text', '.md': 'text' }, plugins: p.mixamo ? [] : [withoutMixamo] });
  const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
  let page = template;
  page = page.replace('{{VERSION}}', VERSION); // permet de voir d'un coup d'œil si le site est à jour
  for (const k of ['TITLE', 'H1', 'SUB', 'SAY', 'OPTS']) page = page.replace(`{{${k}}}`, () => (k === 'SAY' ? p[k].replace(/"/g, '&quot;') : p[k]));
  page = page.replace('/*BUNDLE*/', () => js);
  await save(p.out, page);
  console.log(p.out, (page.length / 1024).toFixed(0) + ' Ko');
}
