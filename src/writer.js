// Espace d'écriture : un brouillon écrit ou dicté devient des idées, puis un script jouable.
// Avec une clé Claude, tout se fait ici. Sans clé, la consigne se copie vers n'importe quelle IA.
import Anthropic from '@anthropic-ai/sdk';
import CHARTE from '../CHARTE_SCRIPTS.md';
import BIBLE from '../BIBLE.md';

const MODEL = 'claude-opus-5-5';
const KEY = 'tobinox.claude.key', DRAFT = 'tobinox.brouillon';
const read = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const write = (k, val) => { try { if (val) localStorage.setItem(k, val); else localStorage.removeItem(k); } catch { /* navigation privée */ } };

const SYSTEM = `Tu es le scénariste de la mini-sitcom Tobi et Nox. Tu écris en français, avec un humour sec et des dialogues naturels.\n\n# Bible de la série\n${BIBLE}\n\n# Charte d'écriture, à respecter strictement\n${CHARTE}`;
const text = { type: 'string' };
const object = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const IDEAS = object({ analyse: text, idees: { type: 'array', items: object({ titre: text, pitch: text }) } });
const SCRIPT = object({ titre: text, pitch: text, script: text });

const ideasPrompt = (draft) => `Voici mon brouillon, écrit ou dicté vite fait :\n\n${draft}\n\nDis en deux phrases ce qui marche et ce qui manque, puis propose trois scénarios différents, avec un titre et un pitch d'une phrase chacun.`;
const scriptPrompt = (draft, idea, note) => `Brouillon de départ :\n\n${draft}\n\nÉcris le script complet de ce scénario : ${idea}.${note ? `\nConsigne de l'auteur : ${note}` : ''}\nLe champ script contient uniquement le fichier au format de la charte, avec au moins un déplacement ou une action.`;

export function mountWriter({ el, parseStory, onTry, goSettings }) {
  const draft = el('wrDraft'), key = el('wrKey'), out = el('wrOut'), script = el('wrScript'), go = el('wrGo');
  let idea = '', meta = { titre: '', pitch: '' };
  const say = (t) => { el('wrNow').textContent = t; };
  const ready = () => !!key.value.trim();
  const showScript = (on) => { el('wrScriptBox').hidden = !on; };

  async function ask(prompt, schema) {
    const client = new Anthropic({ apiKey: key.value.trim(), dangerouslyAllowBrowser: true });
    const res = await client.beta.messages.create({
      model: MODEL, max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: prompt }],
    });
    if (res.stop_reason === 'refusal') throw new Error('Claude a refusé ce sujet. Reformule ton idée.');
    if (res.stop_reason === 'max_tokens') throw new Error('Réponse coupée. Relance avec un brouillon plus court.');
    return JSON.parse(res.content.find((b) => b.type === 'text').text);
  }
  const explain = (e) => {
    if (e instanceof Anthropic.AuthenticationError) return 'Clé Claude refusée. Vérifie-la dans les réglages.';
    if (e instanceof Anthropic.RateLimitError) return 'Claude est occupé. Réessaie dans une minute.';
    if (e instanceof Anthropic.APIConnectionError) return 'Impossible de joindre Claude. Vérifie ta connexion.';
    if (e instanceof Anthropic.APIError) return `Claude a répondu ${e.status}. Vérifie ton crédit API.`;
    return e.message;
  };
  const busy = (on, t = '') => { go.disabled = on; el('wrRedo').disabled = on; say(t); };

  async function writeScript(note) {
    busy(true, 'Écriture du script…');
    try {
      const r = await ask(scriptPrompt(draft.value, idea, note), SCRIPT);
      meta = r; script.value = r.script; showScript(true);
      say('Script prêt. Lis-le, modifie-le si tu veux, puis regarde-le en animation.');
    } catch (e) { say(explain(e)); }
    busy(false, el('wrNow').textContent);
  }

  go.addEventListener('click', async () => {
    const t = draft.value.trim();
    if (!t) { say('Écris ou dicte ton idée d\'abord.'); return; }
    if (!ready()) { // sans clé : la consigne part vers l'IA de ton choix
      const prompt = `${SYSTEM}\n\n${scriptPrompt(t, 'la meilleure version de ce brouillon', '')}\nRends uniquement le fichier de script.`;
      try { await navigator.clipboard.writeText(prompt); say('Consigne copiée. Colle-la dans Claude ou une autre IA, puis colle le script obtenu ci-dessous.'); } catch { say('Copie impossible dans ce navigateur.'); }
      meta = { titre: 'Mon script', pitch: '' }; showScript(true); return;
    }
    busy(true, 'Analyse de ton idée…');
    try {
      const r = await ask(ideasPrompt(t), IDEAS);
      el('wrAnalyse').textContent = r.analyse;
      el('wrIdeas').replaceChildren(...r.idees.map((x) => {
        const li = document.createElement('li'), b = document.createElement('button'), s = document.createElement('small');
        b.type = 'button'; b.textContent = x.titre; s.textContent = x.pitch; b.append(s);
        b.addEventListener('click', () => { idea = `${x.titre}. ${x.pitch}`; writeScript(''); });
        li.append(b);
        return li;
      }));
      out.hidden = false; say('Choisis le scénario qui te parle.');
    } catch (e) { say(explain(e)); }
    busy(false, el('wrNow').textContent);
  });
  el('wrRedo').addEventListener('click', () => {
    if (!ready()) { goSettings(); return; }
    writeScript(el('wrNote').value.trim());
  });
  el('wrTry').addEventListener('click', () => {
    const lines = parseStory(script.value).filter((c) => c.verb === 'dit').length;
    if (!lines) { say('Ce script ne contient aucune réplique au bon format.'); return; }
    onTry(meta.titre || 'Mon script', meta.pitch, script.value);
  });

  // Dictée : le navigateur transcrit, le texte s'ajoute au brouillon
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition, mic = el('wrMic');
  if (!Speech) mic.hidden = true;
  else {
    const rec = new Speech(); rec.lang = 'fr-FR'; rec.continuous = true; rec.interimResults = false;
    let on = false;
    const state = (v) => { on = v; mic.textContent = v ? 'Arrêter la dictée' : 'Dicter'; mic.setAttribute('aria-pressed', v); };
    rec.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) draft.value = `${draft.value} ${e.results[i][0].transcript}`.trim(); write(DRAFT, draft.value); };
    rec.onend = () => state(false);
    rec.onerror = (e) => { state(false); say(e.error === 'not-allowed' ? 'Autorise le micro pour dicter.' : 'Dictée interrompue.'); };
    mic.addEventListener('click', () => { if (on) rec.stop(); else { rec.start(); state(true); } });
  }

  draft.value = read(DRAFT);
  draft.addEventListener('input', () => write(DRAFT, draft.value));
  key.value = read(KEY);
  key.addEventListener('change', () => write(KEY, key.value.trim()));
}
