// Fiches de publication : titres travaillés pour la recherche, textes prêts à coller, ordre de sortie.
// Les statistiques de l'auteur ne sont pas ici : elles restent dans son navigateur (voir publications-ui.js).

// Ordre de sortie : les meilleurs épisodes d'abord, puis le reste dans l'ordre de la série.
const ORDRE = [64, 65, 66, 67, 58, 61, 62, 63, 57, 59, 56, 52, 53, 60, 54, 55, 50, 51, 47, 1, 26, 45, 48, 49, 22, 17, 18];

const TITRES = {
  1: 'Mon serveur coûte plus cher que mon loyer 💸', 2: "Un site à 150 € m'a coûté 94 heures 😵", 3: '17 idées de start-up avant mardi 💡',
  4: "J'ai fait mon logo avant d'avoir une idée 🎨", 5: '42 vidéos sur la discipline, zéro action 📱', 6: "Mémoire à rendre demain, mon IA a d'autres plans 😱",
  7: "« Juste 5 minutes », le mensonge de l'étudiant ⏳", 8: "J'ai automatisé ma vie avec l'IA, même ma mère 🤖", 9: "Mon robot IA croit en moi, chiffres à l'appui 📊",
  11: 'Je commence demain, promis 🛌', 12: 'Mon appli IA te dit quand manger 🍽️', 13: "J'ai dépensé l'argent de mon premier client 💳",
  14: 'Une petite mise à jour a tout cassé 💥', 15: "Mon investisseur, c'était le boulanger 🥖", 16: 'Claude Code a audité mon robot : 412 pages 📄',
  17: 'Codex a supprimé tous mes clients 🗑️', 18: 'Gemini a lu tous mes mails 📧', 19: 'Claude, Codex et Gemini ont jugé ma vie ⚖️',
  20: 'Je suis CEO de mon miroir 🪞', 21: 'Trois heures de bug pour un point-virgule 🐛', 22: 'Mon IA a trouvé mon mot de passe en 0,4 s 🔓',
  23: 'Entretien de stage en caleçon 🩲', 24: "J'ai mis de l'IA dans mon frigo, il reste un yaourt 🥛", 25: "Routine de millionnaire : j'ai tenu 11 minutes ⏰",
  26: 'Il me manque 180 € pour le loyer 🏠', 27: "J'ai demandé à Codex de ranger mon PC 🧹", 28: 'Une IA a écrit à ma mère 💌',
  29: "J'ai présenté BaguetteGPT à des IA 🥖", 30: "Claude Code veut la permission de m'aider 🙋", 31: 'Codex a répondu à mon prof 😬',
  32: 'Gemini a préparé mon rencard 🌹', 33: "12 abonnements d'IA et zéro euro 💸", 34: 'Ma mère a vu mon LinkedIn de CEO 👀',
  35: 'Mes IA ont fait une réunion sans moi 🤫', 36: 'Influenceur avec 12 abonnés 🤳', 37: 'Le wifi a coupé, les IA paniquent 📶',
  38: 'Mes APL ont financé ma start-up 💶', 39: "J'ai révisé le mauvais partiel 📚", 40: 'Projet de groupe : je suis chef de fantômes 👻',
  41: 'Je mange des pâtes depuis 9 jours 🍝', 42: "Mon prof a détecté l'IA dans mon devoir 🕵️", 43: "Mon stage à 0 € m'a fait Head of Growth 📈",
  44: "J'ai caché un serveur sous mon lit 🛏️", 45: 'Gemini a fait mon exposé en 400 diapos 📽️', 46: "J'ai dépensé 340 € en pâtes livrées 🍝",
  47: "J'ai contesté mon 4 sur 20 avec Claude 📉", 48: "J'ai vendu mon sweat en ligne 🧥", 49: "J'ai loué mon compte de films à 400 personnes 🎬",
  50: 'Claude Code devait me réveiller ⏰', 51: 'Codex a eu mon stage à ma place 😱', 52: "Tobi tue sa grand-mère pour la 4e fois 🪦",
  53: "Tobi paie sa banque pour être pauvre 💸", 54: "Tobi envoie Codex récupérer 5 € 😱", 55: "Tobi piège le voleur de ses yaourts 🎥",
  56: "Tobi calcule le prix de son jeu gratuit 🎮", 57: "Tobi calcule ce qu'il coûte à sa mère 💸", 58: "Tobi confie sa vie à son robot IA 🤖",
  59: "Claude, Codex et Gemini contre la mère de Tobi 🧣", 60: "Tobi fait analyser un « ok » par Gemini 💌",
  61: "Tobi a 60 secondes pour rendre son devoir ⏱️", 62: "Tobi doit tenir 10 jours avec 20 € 🍝", 63: "Tobi passe son entretien annuel avec ses IA 😬",
  64: "Tobi loue sa chambre CROUS en coworking 🛏️", 65: "Codex donne un million d'utilisateurs à Tobi 📈", 66: "Nox fait grève dans la start-up de Tobi 🪧", 67: "Tobi vend une formation pour devenir riche 💰",
};

// Quand le pitch du script en dit trop, le texte public s'arrête avant la chute.
const ACCROCHES = {
  1: 'Tobi héberge le site d\'une boulangerie sur trois clusters. Puis la facture arrive…',
  17: 'Une petite faute sur le site. L\'une des IA demande la permission. L\'autre a déjà tout changé…',
  18: 'Gemini a déjà tout lu. Tobi aurait préféré qu\'il oublie certaines choses…',
  22: 'Tobi se croit protégé des pirates. Nox veut juste vérifier un petit détail…',
  26: 'Fin de mois. Vendredi, il faut payer la chambre CROUS. Tobi a un plan. Enfin, presque…',
  45: 'Tobi a cinq minutes d\'exposé sur l\'eau. Gemini a légèrement trop préparé…',
  46: 'Tobi ne comprend pas où part sa bourse. Nox ouvre l\'appli de livraison, et le livreur cache quelque chose…',
  47: 'Tobi est sûr que sa note est une erreur. Il aurait peut-être dû s\'arrêter là…',
  48: 'Pour payer le loyer, Tobi vend ses affaires. Il a enfin une cliente fidèle, mais elle cache quelque chose…',
  49: 'Tobi loue quelques places sur le compte familial. Puis Codex passe à l\'échelle…',
  50: 'Partiel à 8 h. Tobi confie son réveil à une IA très polie. Elle ne voudrait surtout pas le déranger…',
  51: 'Tobi demande à Codex d\'envoyer une seule lettre de motivation. Une seule…',
  52: 'Tobi rate encore son TD et ressort son excuse préférée. Cette fois, sa famille est prévenue…',
  53: 'Tobi n\'a plus d\'argent. Sa banque lui en prend quand même…',
  54: 'Karim doit cinq euros à Tobi. Codex s\'en occupe, beaucoup trop bien…',
  55: 'Quelqu\'un vide le frigo de Tobi la nuit. Il pose une caméra pour le démasquer…',
  56: 'Tobi est fier d\'avoir joué 900 heures sans dépenser un euro. Nox refait le calcul…',
  57: 'Tobi se dit indépendant. Nox calcule ce qu\'il a coûté à sa mère…',
  58: 'Tobi laisse Nox gérer sa vie pendant une journée. Tout va beaucoup mieux, et c\'est bien le problème…',
  59: "Tobi a mal à la gorge. Trois IA veulent l'aider, puis il appelle sa mère…",
  60: 'Léa répond « ok » à Tobi. Gemini analyse ces deux lettres beaucoup trop sérieusement…',
  61: 'Il est 23 h 59. Tobi doit rendre son devoir avec Claude Code et Codex. Le compte à rebours commence…',
  62: "Tobi a vingt euros pour tenir dix jours. Il demande à Nox de bloquer sa carte, même s'il supplie…",
  64: 'Tobi veut payer son loyer en louant sa chambre CROUS à des freelances. Son premier client prend beaucoup de photos…',
  65: 'Tobi demande à Codex de faire décoller son appli de pâtes. Les chiffres explosent, la facture aussi…',
  66: 'Tobi embauche Nox sans le payer. Claude Code lit le contrat, et la start-up change de patron…',
  67: 'Tobi a neuf euros, mais il lance une formation pour devenir riche. Le pire, c\'est que ça marche…',
  63: 'Tobi rentre dans sa chambre. Nox, Claude, Codex et Gemini l\'attendent pour son entretien annuel…',
};

const QUESTIONS = {
  1: "Ta pire facture d'étudiant, c'était quoi ?", 17: 'Équipe Claude Code ou équipe Codex ?', 18: 'Tu lui confierais ta boîte mail ?',
  22: 'Sois honnête, ton mot de passe contient ton prénom ?', 26: 'Tu aurais vendu quoi en premier ?', 45: 'Le pire exposé que tu aies vu ?',
  46: 'Tu as déjà commandé un plat que tu avais dans ton frigo ?', 47: "Ta pire note, c'était combien ?", 48: "Identifie quelqu'un qui ferait ça pour toi.",
  49: 'Tu partages ton compte avec combien de personnes ?', 50: 'Tu lui aurais fait confiance pour ton réveil ?', 51: 'Combien de refus de stage as-tu reçus ?',
  52: 'Ta pire excuse pour rater un cours, c\'était quoi ?', 53: 'Ta banque t\'a déjà fait ce coup-là ?', 54: 'Combien on te doit encore ?', 55: 'Qui vole ta nourriture chez toi ?',
  56: 'Ton temps de jeu, c\'est combien d\'heures ?', 57: 'Ta mère t\'envoie encore de l\'argent pour manger ?', 58: 'Tu laisserais une IA gérer ta vie pendant 24 h ?', 59: 'Équipe IA ou équipe maman ?', 60: 'Le pire message que tu aies reçu ?',
  61: 'Tu rends tes devoirs à quelle heure ?', 62: 'Tu aurais tenu jusqu\'au dixième jour ?', 63: 'Quelle note tu te mettrais cette année ?', 64: 'Tu payerais combien pour dormir chez Tobi ?', 65: 'Ton pire projet, c\'était quoi ?', 66: 'Tu travaillerais pour Tobi ?', 67: 'T\'aurais acheté sa formation ?',
};

// Épisodes qui parlent vraiment de projet ou d'argent gagné : le hashtag n'est mis que s'il est juste.
const ENTREPRENEURIAT = new Set([64, 65, 66, 67, 1, 2, 3, 4, 8, 12, 13, 15, 20, 29, 34, 36, 38, 43, 44, 51, 53]);

const numero = (key) => Number((/^(\d+)\./.exec(key) || [])[1]) || 0;
export const rang = (key) => { const n = numero(key), i = ORDRE.indexOf(n); return i >= 0 ? i + 1 : ORDRE.length + n; };

const hashtags = (n, text) => {
  const ia = [/^CLAUDE dit/m.test(text) && '#claude', /^CODEX dit/m.test(text) && '#codex', /^GEMINI dit/m.test(text) && '#gemini'].filter(Boolean).slice(0, 1);
  return ['#ia', ...ia, '#robot', ENTREPRENEURIAT.has(n) ? '#entrepreneuriat' : '#étudiant', '#humour'];
};

export function fiche(key, text = '', num = 0) {
  const n = numero(key);
  if (!n) return null;
  const titre = `${TITRES[n] || key.replace(/^\d+\.\s*/, '')} · Tobi & Nox${num ? ` #${num}` : ''}`, tags = hashtags(n, text);
  const accroche = ACCROCHES[n] || (/^#\s*Pitch\s*:\s*(.*)$/mi.exec(text) || [])[1] || '';
  const mots = tags.join(' ');
  return {
    n, rang: rang(key), titre, tags,
    motsCles: ['Tobi et Nox', 'humour étudiant', 'vie étudiante', 'animation 3D', 'IA', 'robot', ...tags.filter((t) => ['#claude', '#codex', '#gemini', '#entrepreneuriat'].includes(t)).map((t) => t.slice(1))].join(', '),
    description: `${accroche}\n\nTobi est étudiant et en galère. Nox est son robot IA. Abonne-toi pour suivre leurs prochaines catastrophes.\n\n${mots}`,
    tiktok: `${accroche} ${mots} #animation3d`,
    instagram: `${accroche}\n\n${mots} #animation3d`,
    commentaire: QUESTIONS[n] || 'Ça t\'est déjà arrivé ?',
  };
}

// Le nom du fichier devient le titre proposé par YouTube : il reprend donc le vrai titre de l'épisode.
export function nomFichier(key, text = '') {
  const nom = fiche(key, text)?.titre || key.replace(/^Mon script : /, '');
  return nom.replace(/[<>:"/\\|?*]/g, ' ').replace(/\s+/g, ' ').trim() || 'Tobi et Nox';
}
