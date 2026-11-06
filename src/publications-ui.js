// Espace Publications : ce qui est sorti, ce qui reste, et les chiffres pour comprendre ce qui marche.
// Le suivi reste dans ce navigateur. « Sauvegarder » en fait un fichier, à garder et à restaurer ailleurs.
import { fiche, rang } from './publications.js';

const STORE = 'tobinox.publications';
const PLATEFORMES = [['yt', 'YouTube', 'YT'], ['tt', 'TikTok', 'TT'], ['ig', 'Instagram', 'IG']];
const NOMBRES = [['vues', 'Vues'], ['retention', 'Rétention %'], ['abonnes', 'Abonnés gagnés']];

const read = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } };
const today = () => new Date().toLocaleDateString('fr-FR');
const node = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };

export function mountPublications({ el, stories, open, save, onChange }) {
  let data = read(), filtre = 'todo';
  const keep = () => { try { localStorage.setItem(STORE, JSON.stringify(data)); } catch { /* navigation privée */ } onChange?.(); };
  const of = (k) => (data[k] ||= {});
  const sortie = (k) => PLATEFORMES.some(([p]) => data[k]?.[p]);
  const episodes = () => Object.keys(stories).filter((k) => fiche(k, stories[k]));

  // La série est numérotée dans l'ordre réel de sortie.
  const numero = () => Math.max(0, episodes().filter(sortie).length, ...Object.values(data).map((x) => x.num || 0)) + 1;

  const champ = (label, text) => {
    const pre = node('pre', { textContent: text }), b = node('button', { type: 'button', textContent: 'Copier' });
    b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text); b.textContent = 'Copié'; setTimeout(() => { b.textContent = 'Copier'; }, 1200); } catch { getSelection().selectAllChildren(pre); }
    });
    return node('div', { className: 'pubField' }, node('div', {}, node('span', { textContent: label }), b), pre);
  };

  const detail = (k, puces) => {
    const d = of(k), num = d.num || numero(), f = fiche(k, stories[k], num), box = node('div', { className: 'pubBody' });
    const cases = node('div', { className: 'pubCases' }, ...PLATEFORMES.map(([p, nom]) => {
      const c = node('input', { type: 'checkbox', checked: !!d[p] });
      c.addEventListener('change', () => { if (c.checked) { of(k)[p] = today(); of(k).num ||= num; } else delete of(k)[p]; keep(); puces(); resume(); });
      return node('label', { className: 'sw' }, `Publiée sur ${nom}`, c);
    }));
    const chiffres = node('div', { className: 'pubNums' }, ...NOMBRES.map(([id, nom]) => {
      const i = node('input', { type: 'number', min: 0, value: d[id] ?? '', ariaLabel: nom });
      i.addEventListener('change', () => { if (i.value === '') delete of(k)[id]; else of(k)[id] = Number(i.value); keep(); resume(); });
      return node('label', {}, nom, i);
    }));
    const lien = node('input', { type: 'url', placeholder: 'Lien de la vidéo', value: d.lien || '', ariaLabel: 'Lien de la vidéo' });
    lien.addEventListener('change', () => { of(k).lien = lien.value.trim(); keep(); });
    const note = node('textarea', { rows: 2, placeholder: 'Ce que tu retiens de cette vidéo', value: d.note || '', ariaLabel: 'Note' });
    note.addEventListener('change', () => { of(k).note = note.value; keep(); });
    const voir = node('button', { type: 'button', textContent: 'Ouvrir l\'épisode' });
    voir.addEventListener('click', () => open(k));
    box.append(champ('Titre', f.titre), champ('Description YouTube', f.description), champ('Tags YouTube', f.motsCles), champ('Légende TikTok', f.tiktok), champ('Légende Instagram', f.instagram), champ('Commentaire à épingler', f.commentaire), cases, chiffres, lien, note, voir);
    return box;
  };

  const ligne = (k) => {
    const f = fiche(k, stories[k]), puce = node('span', { className: 'pubDots' });
    const puces = () => {
      const d = data[k] || {};
      puce.replaceChildren(...PLATEFORMES.filter(([p]) => d[p]).map(([, , court]) => node('i', { textContent: court })));
      if (d.video && !puce.childElementCount) puce.append(node('i', { className: 'made', textContent: 'Vidéo prête' }));
    };
    puces();
    const item = node('details', { name: 'pub' }, node('summary', {}, node('small', { textContent: String(f.rang).padStart(2, '0') }), node('span', { textContent: f.titre.replace(' · Tobi & Nox', '') }), puce));
    item.dataset.key = k;
    item.addEventListener('toggle', () => { if (item.open && !item.querySelector('.pubBody')) item.append(detail(k, puces)); }, { once: false });
    return item;
  };

  const resume = () => {
    const all = episodes(), faites = all.filter(sortie), vues = faites.reduce((n, k) => n + (data[k].vues || 0), 0);
    const notes = faites.filter((k) => data[k].retention != null), top = [...faites].sort((a, b) => (data[b].retention ?? -1) - (data[a].retention ?? -1))[0];
    const moyenne = notes.length ? Math.round(notes.reduce((n, k) => n + data[k].retention, 0) / notes.length) : null;
    el('pubSum').textContent = `${faites.length} publiée${faites.length > 1 ? 's' : ''} · ${all.length - faites.length} à publier · ${vues.toLocaleString('fr-FR')} vues${moyenne != null ? ` · rétention moyenne ${moyenne} %` : ''}`;
    el('pubBest').textContent = notes.length ? `Celle qui retient le mieux : ${fiche(top, stories[top]).titre.replace(' · Tobi & Nox', '')}` : '';
  };

  const render = () => {
    const all = episodes(), vu = (k) => data[k]?.vues ?? -1;
    const liste = filtre === 'done' ? all.filter(sortie).sort((a, b) => vu(b) - vu(a)) : (filtre === 'todo' ? all.filter((k) => !sortie(k)) : all).sort((a, b) => rang(a) - rang(b));
    el('pubList').replaceChildren(...liste.map(ligne));
    el('pubEmpty').hidden = !!liste.length;
    el('pubFilter').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.f === filtre));
    resume();
  };

  el('pubFilter').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { filtre = b.dataset.f; render(); }));
  el('pubExport').addEventListener('click', () => save(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `suivi-publications-${new Date().toISOString().slice(0, 10)}.json`));
  el('pubImport').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { data = { ...data, ...JSON.parse(await f.text()) }; keep(); render(); el('pubBest').textContent = 'Suivi restauré.'; } catch { el('pubBest').textContent = 'Ce fichier ne peut pas être lu.'; }
    e.target.value = '';
  });
  render();
  return {
    render,
    published: sortie,
    markVideo: (k) => { if (fiche(k, stories[k])) { of(k).video = today(); keep(); } },
    show: (k) => {
      filtre = sortie(k) ? 'done' : 'todo'; render();
      const item = el('pubList').querySelector(`[data-key="${CSS.escape(k)}"]`);
      if (item) { item.open = true; item.scrollIntoView({ block: 'start' }); }
    },
  };
}
