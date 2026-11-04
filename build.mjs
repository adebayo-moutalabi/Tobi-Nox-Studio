// Assemble chaque visualiseur en une page autonome
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const NIGHT = (on) => `      <label><input type="checkbox" id="night"${on ? ' checked' : ''}> Fond bleu nuit</label>\n`;
const PAGES = [
  { entry: 'src/tobi-app.js', out: 'tobi.html', TITLE: 'Tobi', H1: 'Tobi',
    SUB: 'Le personnage principal, identique à chaque plan. Combine geste, objet et mimique.', SAY: 'Salut, moi c\'est Tobi !',
    OPTS: '      <label><input type="checkbox" id="glasses" checked> Lunettes</label>\n' + NIGHT(false) },
  { entry: 'src/nox-app.js', out: 'nox.html', TITLE: 'Nox', H1: 'Nox',
    SUB: 'La mascotte, 45 cm. Son écran affiche ses émotions : combine geste, objet et mimique.', SAY: 'Bonjour, je suis Nox !',
    OPTS: NIGHT(true) },
  { entry: 'src/studio-app.js', out: 'studio.html', TITLE: 'Studio Tobi et Nox', H1: 'Studio Tobi et Nox',
    SUB: 'Trois étapes pour sortir un Short.', SAY: 'On tourne ?',
    OPTS: '      <label><input type="checkbox" id="glasses" checked> Lunettes de Tobi</label>\n' + NIGHT(false) },
];
const template = readFileSync('src/page.html', 'utf8');
for (const p of PAGES) {
  const r = await build({ entryPoints: [p.entry], bundle: true, format: 'esm', write: false, minify: true, target: 'es2020', loader: { '.txt': 'text' } });
  const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
  let page = template;
  for (const k of ['TITLE', 'H1', 'SUB', 'SAY', 'OPTS']) page = page.replace(`{{${k}}}`, () => (k === 'SAY' ? p[k].replace(/"/g, '&quot;') : p[k]));
  page = page.replace('/*BUNDLE*/', () => js);
  writeFileSync(p.out, page);
  console.log(p.out, (page.length / 1024).toFixed(0) + ' Ko');
}
