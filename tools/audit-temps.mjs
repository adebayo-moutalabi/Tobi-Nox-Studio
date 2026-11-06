// Cherche les contradictions entre un script et l'heure ou la date affichées sur le second ordinateur.
// Usage : node tools/audit-temps.mjs
// Le script sort en erreur si un épisode parle d'une heure ou d'un jour sans l'imposer avec HEURE ou DATE.
// Les règles sont dans CHARTE_SCRIPTS.md, partie « Heure et date ».
import { readdirSync, readFileSync } from 'node:fs';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const minutes = (h, m = 0) => Number(h) * 60 + Number(m);
const problems = [];

for (const file of readdirSync('shorts').filter((f) => f.endsWith('.txt'))) {
  const lines = readFileSync(`shorts/${file}`, 'utf8').split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  const text = lines.join('\n'), low = text.toLowerCase();
  const flag = (why) => problems.push(`${file} : ${why}`);
  const hours = lines.filter((l) => l.startsWith('HEURE ')).map((l) => l.split(/\s+/)[1]);
  const date = lines.find((l) => l.startsWith('DATE '))?.split(/\s+/)[1]?.toLowerCase();

  // « Il est 23 h 59 », « il est midi », « il est cinq heures »
  const said = /il est (\d{1,2}) h (\d{2})|il est (midi|minuit|[\w-]+ heures)/i.exec(text);
  if (said && !hours.length && !/^INSERT Il est/m.test(text)) flag(`une heure est dite (« ${said[0]} ») sans HEURE`);
  if (said?.[1] && hours.length && !hours.some((h) => Math.abs(minutes(...h.split(':')) - minutes(said[1], said[2])) <= 2)) flag(`« ${said[0]} » ne correspond à aucune HEURE (${hours.join(', ')})`);

  // Un jour nommé demande un DATE. « Nous sommes mardi » doit être ce jour-là.
  const named = JOURS.filter((j) => new RegExp(`\\b${j}\\b`).test(low.replace(/^(DATE|HEURE) .*$/gim, '')));
  if (named.length && !date) flag(`un jour est nommé (${named.join(', ')}) sans DATE`);
  const now = /(?:on est|nous sommes) (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/.exec(low);
  if (now && date && now[1] !== date) flag(`le script dit ${now[1]}, mais DATE dit ${date}`);

  // « On est en juin » doit se retrouver dans DATE.
  const month = /(?:on est en|on est quand \?\n(?:.*\n)*?.*dit \(\w+\) en) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|décembre)/.exec(low);
  if (month && !new RegExp(`^DATE .*${month[1]}`, 'im').test(text)) flag(`le script dit « ${month[0]} », sans ce mois dans DATE`);

  // Chaque heure imposée doit coller à l'ambiance du moment.
  let now2 = 'soir';
  for (const l of lines) {
    if (l.startsWith('AMBIANCE ')) now2 = l.split(/\s+/)[1];
    if (!l.startsWith('HEURE ')) continue;
    const h = l.split(/\s+/)[1], t = minutes(...h.split(':')), day = t >= 6 * 60 && t < 19 * 60;
    if (day && now2 === 'soir') flag(`HEURE ${h} avec AMBIANCE soir`);
    if (!day && now2 === 'jour') flag(`HEURE ${h} avec AMBIANCE jour`);
  }

  // Une heure de message doit rester proche de l'heure de l'épisode.
  const stamp = /\[(\d{1,2})[:h](\d{2})\]/.exec(text);
  if (stamp && !hours.length) flag(`message daté ${stamp[0]} sans HEURE`);
}

if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('Heure et date : aucune contradiction trouvée.');
