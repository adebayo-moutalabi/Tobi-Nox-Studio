// Voix automatiques : le Studio demande chaque réplique à ElevenLabs avec la clé de l'utilisateur.
// La clé ne quitte ce navigateur que vers api.elevenlabs.io. Elle n'est jamais dans le code.
import { voiceTag } from './tones.js';
import { trimSilence } from './talk.js';
import { prononce, sonAie, changeAie } from './prononciation.js';

const API = 'https://api.elevenlabs.io/v1';
const STABLE = 'eleven_multilingual_v2'; // ce modèle lirait les consignes de ton à voix haute
const KEY = 'tobinox.elevenlabs.key', PICK = 'tobinox.elevenlabs.voices', KEEP = 'tobinox.elevenlabs.keep', NAMES = 'tobinox.elevenlabs.names', MODEL = 'tobinox.elevenlabs.model';

const BACKUP = 'cle-elevenlabs';

const read = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const write = (k, val) => { try { if (val) localStorage.setItem(k, val); else localStorage.removeItem(k); } catch { /* navigation privée */ } };

// Les répliques déjà générées restent dans ce navigateur : les rejouer ne coûte aucun crédit.
function audioCache() {
  const memory = new Map();
  const db = new Promise((done) => {
    try {
      const r = indexedDB.open('tobi-nox-voix', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('audio');
      r.onsuccess = () => done(r.result);
      r.onerror = () => done(null);
    } catch { done(null); }
  });
  const ask = async (mode, run) => {
    const d = await db;
    if (!d) return undefined;
    return new Promise((done) => {
      try { const q = run(d.transaction('audio', mode).objectStore('audio')); q.onsuccess = () => done(q.result); q.onerror = () => done(undefined); } catch { done(undefined); }
    });
  };
  return {
    get: async (k) => memory.get(k) || ask('readonly', (s) => s.get(k)),
    put: async (k, buf) => { memory.set(k, buf); await ask('readwrite', (s) => s.put(buf, k)); },
    remove: async (k) => { memory.delete(k); await ask('readwrite', (s) => s.delete(k)); },
  };
}

async function explain(res) {
  let d = {};
  try { d = (await res.json()).detail || {}; } catch { /* réponse sans détail */ }
  const code = `${d.status || d.code || ''}`, msg = typeof d === 'string' ? d : d.message || '';
  if (code.includes('quota')) return 'Crédits ElevenLabs insuffisants.';
  if (code.includes('permission')) return 'Cette clé n\'a pas les droits nécessaires : autorise Text to Speech et Voices sur ElevenLabs.';
  if (res.status === 401) return 'Clé ElevenLabs refusée. Vérifie-la, ainsi que ses droits Text to Speech et Voices.';
  if (res.status === 429) return 'ElevenLabs est occupé. Attends une minute.';
  return `ElevenLabs a répondu ${res.status}${msg ? ` : ${msg}` : ''}.`;
}

export function mountVoices({ el, player, parseStory, onChange }) {
  const cache = audioCache();
  const key = el('elKey'), pick = { tobi: el('elTobi'), nox: el('elNox'), claude: el('elClaude'), codex: el('elCodex'), gemini: el('elGemini') }, go = el('elGo'), load = el('elLoad'), list = el('elLines'), keep = el('elKeep'), model = el('elModel');
  let rows = [], ctx = null, busy = false;
  const say = (t) => { el('elNow').textContent = t; };
  const call = async (path, init = {}) => {
    let res;
    try {
      res = await fetch(`${API}${path}`, { ...init, headers: { 'xi-api-key': key.value.trim(), ...init.headers } });
    } catch { throw new Error('Impossible de joindre ElevenLabs. Vérifie ta connexion et ouvre le Studio sur le site.'); }
    if (!res.ok) throw new Error(await explain(res));
    return res;
  };
  const lock = (on) => { busy = on; go.disabled = on || !pick.tobi.value; load.disabled = on; list.querySelectorAll('button[data-redo]').forEach((b) => { b.disabled = on; }); };
  const remember = () => {
    write(KEEP, keep.checked ? '' : 'non');
    // La clé est gardée à deux endroits : certains nettoyages du navigateur n'en effacent qu'un seul.
    if (!keep.checked) { write(KEY, ''); cache.remove(BACKUP); } else if (key.value.trim()) { write(KEY, key.value.trim()); cache.put(BACKUP, key.value.trim()); }
    // Un choix vide n'efface jamais un choix déjà enregistré. Le nom sert de secours si l'identifiant change.
    const json = (k) => { try { return JSON.parse(read(k) || '{}'); } catch { return {}; } };
    const ids = json(PICK), names = json(NAMES);
    for (const [who, x] of Object.entries(pick)) if (x.value) { ids[who] = x.value; names[who] = x.selectedOptions[0]?.dataset.name || names[who]; }
    write(PICK, JSON.stringify(ids)); write(NAMES, JSON.stringify(names)); write(MODEL, model.value);
  };

  // Solde du compte. La clé doit avoir le droit de lecture « User » : sinon le Studio continue sans afficher le solde.
  const credits = async () => {
    const box = el('elCredits');
    try {
      const s = await (await call('/user/subscription')).json(), left = s.character_limit - s.character_count;
      box.textContent = `Crédits restants : ${left.toLocaleString('fr-FR')} sur ${s.character_limit.toLocaleString('fr-FR')}`;
      return left;
    } catch { box.textContent = 'Solde non lisible : autorise la lecture « User » sur ta clé ElevenLabs.'; return null; }
  };

  // Langue d'une voix de la liste : les voix françaises passent en premier et sont marquées « FR ».
  const isFr = (x) => [x.labels?.language, x.labels?.accent, ...(x.verified_languages || []).map((l) => l.language)].some((l) => /^fr|french|français/i.test(l || ''));

  const loadVoices = async () => {
    if (!key.value.trim()) { say('Colle d\'abord ta clé ElevenLabs.'); return; }
    lock(true); say('Chargement de tes voix…');
    try {
      const { voices } = await (await call('/voices')).json();
      const mine = [...voices].sort((a, b) => (b.category === 'cloned') - (a.category === 'cloned') || isFr(b) - isFr(a) || a.name.localeCompare(b.name));
      let saved = {}, names = {};
      try { saved = JSON.parse(read(PICK) || '{}'); names = JSON.parse(read(NAMES) || '{}'); } catch { /* choix illisible */ }
      const missing = [];
      for (const [who, s] of Object.entries(pick)) {
        s.replaceChildren(...mine.map((x) => { const o = new Option(`${x.name}${x.category === 'cloned' ? ' (clonée)' : ''}${isFr(x) ? ' · FR' : ''}`, x.voice_id); o.dataset.name = x.name; return o; }));
        const found = mine.find((x) => x.voice_id === saved[who]) || mine.find((x) => x.name === names[who]);
        if (found) s.value = found.voice_id; else { s.selectedIndex = -1; missing.push(s.closest('label').firstChild.textContent.trim()); } // jamais de voix choisie au hasard
      }
      remember();
      el('elTobi').closest('.pair').hidden = false;
      say(missing.length ? `${mine.length} voix trouvées. Choisis la voix de : ${missing.join(', ')}.` : `${mine.length} voix trouvées. Tes voix sont gardées.`);
      credits();
      onChange?.();
    } catch (e) { say(e.message); }
    lock(false);
  };

  const lineId = (r) => {
    const tag = voiceTag(r.tone), plain = model.value === STABLE, said = prononce(r.spoken), text = tag && !plain ? `[${tag}] ${said}` : said;
    return { voice: pick[r.who].value, plain, text, id: [pick[r.who].value, model.value, text].join('|') };
  };

  const makeLine = async (i, force) => {
    const r = rows[i], { voice, plain, text, id } = lineId(r);
    let buf = force ? null : await cache.get(id);
    const fresh = !buf;
    if (fresh) {
      const body = { text, model_id: model.value, ...(plain ? { previous_text: rows[i - 1]?.text, next_text: rows[i + 1]?.text } : {}) };
      buf = await (await call(`/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).arrayBuffer();
      await cache.put(id, buf);
    }
    ctx ||= new AudioContext();
    r.buffer = trimSilence(await ctx.decodeAudioData(buf.slice(0)), ctx);
    if (r.url) URL.revokeObjectURL(r.url);
    r.url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
    return fresh;
  };

  const publish = () => {
    if (rows.length && rows.every((r) => r.buffer)) player.voices = rows.map((r, i) => ({ name: `${i + 1}_${r.who}`, buffer: r.buffer }));
  };

  const show = () => {
    list.replaceChildren(...rows.map((r, i) => {
      const li = document.createElement('li'), text = document.createElement('span'), hear = document.createElement('button'), redo = document.createElement('button');
      text.textContent = `${r.who[0].toUpperCase()}${r.who.slice(1)}${r.tone ? ` (${r.tone})` : ''} : ${r.text}`;
      hear.type = 'button'; hear.textContent = 'Écouter'; hear.disabled = !r.url;
      hear.addEventListener('click', () => new Audio(r.url).play());
      redo.type = 'button'; redo.textContent = 'Refaire'; redo.title = 'Consomme des crédits'; redo.dataset.redo = '1'; redo.disabled = busy || !pick.tobi.value;
      redo.addEventListener('click', async () => {
        lock(true); say(`Nouvelle prise de la réplique ${i + 1}…`);
        try { await makeLine(i, true); publish(); say(`Réplique ${i + 1} refaite.`); } catch (e) { say(e.message); }
        lock(false); show();
      });
      li.append(text, hear, redo);
      return li;
    }));
  };

  const readLines = () => parseStory(el('storyText').value).filter((c) => c.verb === 'dit' && c.who).map((c) => ({ who: c.who, text: c.text, spoken: c.spoken, tone: c.tone }));

  // Si tout l'épisode a déjà été créé, on le rejoue avec les vraies voix, sans dépenser de crédit.
  const warm = async () => {
    if (!pick.tobi.value) return false;
    const next = readLines();
    if (!next.length) return false;
    for (const r of next) if (!(await cache.get(lineId(r).id))) return false;
    rows = next;
    for (let i = 0; i < rows.length; i++) await makeLine(i, false);
    publish(); show(); onChange?.();
    return true;
  };

  // Rien n'est dépensé sans accord : le premier clic annonce le coût, le second confirme.
  let accord = '';
  const allow = async (tell) => {
    const empty = readLines().find((r) => !pick[r.who].value);
    if (empty) { tell(`Choisis d'abord la voix de ${empty.who} dans Réglages.`); return false; }
    let chars = 0, lines = 0;
    for (const r of readLines()) { const { id, text } = lineId(r); if (!(await cache.get(id))) { chars += text.length; lines++; } }
    if (!chars) return true;
    const left = await credits(), n = chars.toLocaleString('fr-FR');
    if (left != null && chars > left) { tell(`Il faut environ ${n} crédits, et il t'en reste ${left.toLocaleString('fr-FR')}.`); return false; }
    const sign = [el('storyText').value, model.value, ...Object.values(pick).map((x) => x.value)].join('|');
    if (accord === sign) { accord = ''; return true; }
    accord = sign;
    tell(`${lines} répliques à créer : environ ${n} crédits${left != null ? ` sur ${left.toLocaleString('fr-FR')}` : ''}. Clique encore pour confirmer.`);
    return false;
  };

  const generate = async (force = false) => {
    rows = readLines();
    if (!rows.length) { say('Ce script ne contient aucune réplique.'); return; }
    remember(); player.voices = []; lock(true);
    let paid = 0;
    try {
      for (let i = 0; i < rows.length; i++) {
        say(`Voix ${i + 1} sur ${rows.length}…`);
        if (await makeLine(i, force)) paid++;
      }
      publish();
      say(`${rows.length} voix prêtes pour ${rows.length} répliques, dont ${paid} nouvelles. Tu peux lire ou exporter.`);
    } catch (e) { say(`${e.message} Relance ensuite : les voix déjà faites ne seront pas refacturées.`); }
    lock(false); show(); onChange?.(); credits();
  };

  const forget = () => { // une voix ou un script change : les anciennes répliques ne servent plus, même importées
    if (!rows.length && !player.voices.length) return;
    rows = []; player.voices = []; list.replaceChildren();
    say('');
    onChange?.();
  };

  key.value = read(KEY);
  say(key.value ? '' : read(PICK) ? 'Ta clé n\'est plus dans ce navigateur. Colle-la puis clique sur Valider.' : 'Colle ta clé ElevenLabs pour créer les voix.');
  keep.checked = read(KEEP) !== 'non'; // la clé reste gardée, sauf si l'auteur a décoché lui-même
  navigator.storage?.persist?.().catch(() => {}); // demande au navigateur de ne pas effacer la clé ni les voix
  load.addEventListener('click', () => { remember(); loadVoices(); });
  el('elForm').addEventListener('submit', (e) => e.preventDefault());
  // La liste à coller dans VOIX.md : on garde ainsi la trace des voix réellement utilisées.
  // Bibliothèque ElevenLabs : écouter un extrait est gratuit. Ajouter une voix au compte ne consomme pas de crédit,
  // mais certaines offres limitent le nombre de voix. Seule la création des répliques consomme des crédits.
  const frList = el('elFrList');
  el('elFrSearch').addEventListener('click', async () => {
    if (!key.value.trim()) { say('Colle d\'abord ta clé ElevenLabs.'); return; }
    frList.replaceChildren(); say('Recherche de voix françaises…');
    try {
      const g = el('elFrGender').value, a = el('elFrAge').value, t = el('elFrQuery').value.trim();
      const q = new URLSearchParams({ language: 'fr', page_size: '30', sort: 'trending', ...(g ? { gender: g } : {}), ...(a ? { age: a } : {}), ...(t ? { search: t } : {}) });
      const { voices = [] } = await (await call(`/shared-voices?${q}`)).json();
      if (!voices.length) { say('Aucune voix française trouvée avec ce filtre.'); return; }
      frList.replaceChildren(...voices.map((x) => {
        const li = document.createElement('li'), text = document.createElement('span'), hear = document.createElement('button'), add = document.createElement('button');
        text.textContent = [x.name, x.gender === 'male' ? 'homme' : x.gender === 'female' ? 'femme' : '', x.age, x.descriptive, x.use_case].filter(Boolean).join(' · ');
        hear.type = 'button'; hear.textContent = 'Écouter'; hear.disabled = !x.preview_url;
        hear.addEventListener('click', () => new Audio(x.preview_url).play());
        add.type = 'button'; add.textContent = 'Choisir';
        add.addEventListener('click', async () => {
          const who = el('elFrFor').value;
          add.disabled = true; say(`Ajout de ${x.name} à tes voix…`);
          try {
            const { voice_id: id } = await (await call(`/voices/add/${encodeURIComponent(x.public_owner_id)}/${encodeURIComponent(x.voice_id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_name: x.name }) })).json();
            await loadVoices();
            pick[who].value = id || x.voice_id; remember(); forget(); lock(false);
            say(`${x.name} est maintenant la voix de ${el('elFrFor').selectedOptions[0].textContent.replace('Pour ', '')}.`);
          } catch (e) { say(e.message); add.disabled = false; }
        });
        li.append(text, hear, add); return li;
      }));
      say(`${voices.length} voix françaises. Écoute-les, puis choisis.`);
    } catch (e) { say(e.message); }
  });
  el('elCopy').addEventListener('click', async () => {
    const line = (who, s) => `${who} : ${s.selectedOptions[0]?.textContent || 'non choisie'}`;
    const text = [...Object.entries({ Tobi: pick.tobi, Nox: pick.nox, 'Claude Code': pick.claude, Codex: pick.codex, Gemini: pick.gemini }).map(([w, s]) => line(w, s)), `Modèle : ${model.selectedOptions[0]?.textContent}`].join('\n');
    try { await navigator.clipboard.writeText(text); say('Liste copiée.'); } catch { say(text); }
  });
  go.addEventListener('click', async () => { if (await allow(say)) generate(); });
  // Refaire tout l'épisode, même les répliques déjà créées : utile après un réglage de voix sur ElevenLabs.
  let redoSign = '';
  el('elRedoAll').addEventListener('click', async () => {
    const lines = readLines();
    if (!lines.length) { say('Ce script ne contient aucune réplique.'); return; }
    const empty = lines.find((r) => !pick[r.who].value);
    if (empty) { say(`Choisis d'abord la voix de ${empty.who}.`); return; }
    const chars = lines.reduce((n, r) => n + lineId(r).text.length, 0), sign = [el('storyText').value, model.value, ...Object.values(pick).map((x) => x.value)].join('|');
    if (redoSign !== sign) { redoSign = sign; say(`Tout recréer : ${lines.length} répliques, environ ${chars.toLocaleString('fr-FR')} crédits. Clique encore pour confirmer.`); return; }
    redoSign = ''; await generate(true);
  });
  const aie = el('elAie');
  aie.value = sonAie();
  aie.addEventListener('change', () => { changeAie(aie.value); aie.value = sonAie(); forget(); });
  el('elAieTest').addEventListener('click', async () => {
    if (!pick.tobi.value) { say('Valide d\'abord ta clé pour écouter la voix de Tobi.'); return; }
    changeAie(aie.value); forget(); say('Essai de la prononciation…');
    try {
      const buf = await (await call(`/text-to-speech/${encodeURIComponent(pick.tobi.value)}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: prononce('Nox. Aie la vision.'), model_id: model.value }) })).arrayBuffer();
      new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }))).play();
      say('');
    } catch (e) { say(e.message); }
  });
  keep.addEventListener('change', remember);
  key.addEventListener('change', remember);
  if ([...model.options].some((o) => o.value === read(MODEL))) model.value = read(MODEL);
  for (const x of [...Object.values(pick), model]) x.addEventListener('change', () => { remember(); forget(); lock(false); });
  el('storyText').addEventListener('input', forget);
  el('storyPick').addEventListener('change', forget);
  if (key.value) { remember(); loadVoices(); }
  else if (keep.checked) cache.get(BACKUP).then((saved) => { // le navigateur a perdu la première copie : on reprend la seconde
    if (typeof saved !== 'string' || key.value) return;
    key.value = saved; remember(); loadVoices();
  });
  return { generate, warm, allow, ready: () => !!key.value.trim() && !!pick.tobi.value, state: () => (player.voices.length ? 'ready' : key.value.trim() && pick.tobi.value ? 'auto' : 'none') };
}
