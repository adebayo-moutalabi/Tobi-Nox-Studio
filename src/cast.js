// Fiches des personnages pour le visualiseur
import { createCharacter } from './character.js';
import { createNox, NOX_HEIGHT } from './nox.js';
import { CLAUDE_CODE, CODEX, GEMINI, CENTI } from './logos.js';

const GESTURES = [
  ['wave', 'Saluer'], ['nod', 'Oui'], ['no', 'Non'], ['shrug', 'Hausser les épaules'], ['think', 'Réfléchir'], ['point', 'Montrer'],
  ['clap', 'Applaudir'], ['thumb', 'Pouce levé'], ['come', 'Viens'], ['stop', 'Stop'], ['scratch', 'Se gratter la tête'], ['facepalm', 'Consterné'],
  ['look', 'Regarder autour'], ['stretch', "S'étirer"], ['bow', 'Saluer bas'], ['jump', 'Sauter'], ['cheer', 'Victoire'], ['dance', 'Danser'], ['sad', 'Abattu'],
];
const POSTURES = [['chair', "S'asseoir"], ['floor', 'Par terre'], ['crossed', 'Bras croisés'], ['hips', 'Mains sur les hanches']];

export function tobi() {
  const hero = createCharacter();
  hero.morphCount = hero.meshes.head.morphTargetInfluences.length;
  return {
    id: 'tobi', name: 'Tobi', hero, eyeUp: 0.17, height: '1,80 m', speed: [1.12, 3.05], reach: 0.42, bubbleY: 0.5, markerScale: 1, minDistance: 0.9,
    views: {
      face: { az: 0, el: 0.05, dist: 5.2, y: 0.94 }, trois: { az: 0.62, el: 0.09, dist: 5.2, y: 0.94 },
      profil: { az: Math.PI / 2, el: 0.05, dist: 5.2, y: 0.94 }, dos: { az: Math.PI, el: 0.05, dist: 5.2, y: 0.94 },
      visage: { az: 0.3, el: 0.03, dist: 1.75, y: 1.57 },
    },
    gestures: GESTURES, postures: POSTURES,
    faces: [
      ['neutre', 'Neutre'], ['sourire', 'Sourire'], ['joie', 'Joie'], ['surprise', 'Surprise'], ['colere', 'Colère'],
      ['tristesse', 'Tristesse'], ['doute', 'Doute'], ['clin', "Clin d'œil"], ['degout', 'Dégoût'], ['peur', 'Peur'],
    ],
  };
}
export function nox() {
  const hero = createNox(), k = NOX_HEIGHT;
  const view = (az, el, dist, y) => ({ az, el, dist: dist * k, y: y * k });
  return {
    id: 'nox', name: 'Nox', hero, eyeUp: 0.09, propScale: 0.62, height: '45 cm', speed: [0.3, 0.78], reach: 0.2, bubbleY: 0.68 * k, markerScale: k, minDistance: 0.3,
    views: {
      face: view(0, 0.04, 3.1, 0.5), trois: view(0.6, 0.08, 3.1, 0.5), profil: view(Math.PI / 2, 0.04, 3.1, 0.5),
      dos: view(Math.PI, 0.04, 3.1, 0.5), visage: view(0.18, 0.03, 1.75, 0.6),
    },
    gestures: GESTURES, postures: POSTURES,
    faces: [
      ['neutre', 'Neutre'], ['sourire', 'Sourire'], ['joie', 'Joie'], ['surprise', 'Surprise'], ['colere', 'Colère'],
      ['tristesse', 'Tristesse'], ['doute', 'Doute'], ['clin', "Clin d'œil"], ['amour', 'Amour'], ['sommeil', 'Sommeil'],
    ],
  };
}

// Les Aînés : chaque logo est un personnage (logos.js). Ils n'apparaissent que si un script les place dans la scène.
const AINES = {
  claude: { name: 'Claude Code', scale: 0.74, form: CLAUDE_CODE },
  codex: { name: 'Codex', scale: 0.76, form: CODEX },
  gemini: { name: 'Gemini', scale: 0.74, form: GEMINI },
  centi: { name: 'Centi', scale: 0.8, form: CENTI }, // l'IA à trente centimes : un petit mochi gourmand
};
export function aine(id) {
  const base = nox(), a = AINES[id], hero = createNox({ scale: a.scale, form: a.form });
  return { ...base, id, name: a.name, hero, extra: true, eyeUp: (a.form.eyeY - a.form.pivot) * NOX_HEIGHT * a.scale, reach: base.reach * a.scale };
}
