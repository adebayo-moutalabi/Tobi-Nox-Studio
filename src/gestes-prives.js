// Coffre des gestes privés. Le fichier gestes.chiffre est public, mais illisible sans le mot de passe de l'auteur.
// Format, identique à tools/chiffrer-gestes.mjs : sel (16 octets), iv (12 octets), puis données AES-256-GCM.
// Le mot de passe n'est jamais gardé ni envoyé. Seule la clé qui en découle reste dans le navigateur déverrouillé.
import { gestures } from './mocap.js';

const FILE = 'gestes.chiffre', TURNS = 600000;
const KEY = 'tobi-gestes-cle', VERSION = 'tobi-gestes-version';
const toText = (bytes) => btoa(String.fromCharCode(...bytes));
const toBytes = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function readFile() {
  const res = await fetch(`${FILE}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("le coffre des gestes n'est pas encore en ligne.");
  const all = new Uint8Array(await res.arrayBuffer());
  return { salt: all.slice(0, 16), iv: all.slice(16, 28), data: all.slice(28) };
}

async function keyFrom(password, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: TURNS }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
}

async function open(key, file) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: file.iv }, key, file.data);
  gestures.save(new TextDecoder().decode(plain));
  localStorage.setItem(VERSION, toText(file.iv));
}

// Première fois sur un appareil : le mot de passe ouvre le coffre.
export async function unlockGestures(password) {
  const file = await readFile(), key = await keyFrom(password, file.salt);
  try { await open(key, file); } catch { throw new Error('mot de passe incorrect.'); }
  localStorage.setItem(KEY, toText(new Uint8Array(await crypto.subtle.exportKey('raw', key))));
}

// À chaque ouverture : si le coffre a changé, l'appareil prend la nouvelle version. Renvoie true s'il faut recharger.
export async function syncGestures() {
  const saved = localStorage.getItem(KEY);
  if (!saved) return false;
  const file = await readFile();
  if (toText(file.iv) === localStorage.getItem(VERSION)) return false;
  const key = await crypto.subtle.importKey('raw', toBytes(saved), 'AES-GCM', true, ['decrypt']);
  await open(key, file);
  return true;
}

export function forgetGestures() {
  gestures.remove();
  localStorage.removeItem(KEY); localStorage.removeItem(VERSION);
}
