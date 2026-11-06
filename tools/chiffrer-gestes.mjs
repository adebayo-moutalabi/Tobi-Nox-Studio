// Chiffre src/mocap-mixamo.json dans gestes.chiffre, le seul fichier de gestes publié.
// Usage : node tools/chiffrer-gestes.mjs
// Le mot de passe est demandé sans s'afficher. Il n'est écrit nulle part.
// Si gestes.chiffre existe, son sel est gardé : le même mot de passe garde les appareils déjà déverrouillés.
// Pour changer de mot de passe : supprimer gestes.chiffre, relancer, puis déverrouiller chaque appareil.
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const SOURCE = 'src/mocap-mixamo.json', OUT = process.env.GESTES_SORTIE || 'gestes.chiffre', TURNS = 600000, MIN = 12;

function ask(label) { // saisie masquée
  return new Promise((done) => {
    process.stdout.write(label);
    let text = '';
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
    const read = (chunk) => {
      for (const c of chunk) {
        if (c === '\u0003') process.exit(1);
        if (c === '\r' || c === '\n') { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', read); process.stdout.write('\n'); done(text); return; }
        if (c === '\u007f' || c === '\b') text = text.slice(0, -1); else text += c;
      }
    };
    process.stdin.on('data', read);
  });
}

if (!existsSync(SOURCE)) { console.log(`Fichier introuvable : ${SOURCE}`); process.exit(1); }
let password = process.env.GESTES_MDP; // réservé aux tests automatiques
if (!password) {
  password = await ask('Choisis le mot de passe des gestes : ');
  if (password !== await ask('Répète-le : ')) { console.log('Les deux mots de passe sont différents.'); process.exit(1); }
}
if (password.length < MIN) { console.log(`Il faut au moins ${MIN} caractères.`); process.exit(1); }

const salt = existsSync(OUT) ? readFileSync(OUT).subarray(0, 16) : randomBytes(16), iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, TURNS, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const data = Buffer.concat([cipher.update(readFileSync(SOURCE)), cipher.final(), cipher.getAuthTag()]);
writeFileSync(OUT, Buffer.concat([salt, iv, data]));
console.log(`Coffre créé : ${OUT}. Tu peux dire à Claude que c'est fait.`);
