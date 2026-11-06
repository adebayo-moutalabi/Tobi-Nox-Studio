// Serveur local du Studio : http://localhost:4173 ouvre toujours la dernière version compilée.
// Usage : node tools/serveur-local.mjs
// Si studio-mixamo.html existe, il devient la page d'accueil. Sinon, c'est studio.html.
import http from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT) || 4173;
const ROOT = process.cwd();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.glb': 'model/gltf-binary' };
const home = () => (existsSync(join(ROOT, 'studio-mixamo.html')) ? 'studio-mixamo.html' : 'studio.html');

http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(req.url.split('?')[0]);
    const file = path === '/' ? home() : normalize(path).replace(/^[/\\]+/, '');
    if (file.startsWith('..')) throw new Error('hors du projet');
    const body = await readFile(join(ROOT, file));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); // jamais d'ancienne version
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Introuvable');
  }
}).listen(PORT, () => console.log(`Studio : http://localhost:${PORT}  (${home()})`));
