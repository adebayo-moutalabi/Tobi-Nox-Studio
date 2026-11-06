// Ce que la voix doit dire quand l'écrit la trompe. Le sous-titre garde toujours le vrai mot.
// Pour un cas isolé, écrire dans le script : [mot affiché|mot prononcé].
const AIE = 'tobinox.prononciation.aie';
// « Est » se lit « è » : la voix ne voit plus les lettres A et I. « Ait » et « Haie » ont échoué à l'écoute.
const DEFAUT = 'Est';
let aie = DEFAUT;
try { const x = localStorage.getItem(AIE); if (x && !/^(ait|haie)$/i.test(x)) aie = x; } catch { /* navigation privée */ }
export const sonAie = () => aie;
export const changeAie = (son) => {
  aie = son.trim() || DEFAUT;
  try { localStorage.setItem(AIE, aie); } catch { /* navigation privée */ }
};

const SONS = [
  [/\bAie la vision\b/g, () => `${aie} la vision`],
  [/\bCEO\b/g, 'si-i-o'], [/\bIA\b/g, 'i-a'], [/\bAPL\b/g, 'a-pé-elle'], [/\bCROUS\b/g, 'crousse'],
  [/\bJT\b/g, 'ji-té'], [/\bTD\b/g, 'té-dé'], [/\bL2\b/g, 'elle deux'], [/\bL3\b/g, 'elle trois'], [/\bPC\b/g, 'pé-cé'],
  [/\bBaguetteGPT\b/g, 'Baguette ji-pi-ti'], [/\bHead of Growth\b/g, 'Hèd ove Grôsse'],
];
export const prononce = (text) => SONS.reduce((t, [mot, son]) => t.replace(mot, son), text);
