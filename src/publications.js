// Fiches de publication : titres travaillés pour la recherche, textes prêts à coller, ordre de sortie.
// Les statistiques de l'auteur ne sont pas ici : elles restent dans son navigateur (voir publications-ui.js).

// Ordre de sortie : on alterne les épisodes avec les IA et ceux sur la vie de Tobi, pour ne pas lasser.
const ORDRE = [100, 95, 87, 94, 90, 82, 92, 91, 68, 62, 69, 95, 98, 22, 75, 49, 63, 77, 19, 78, 71, 10, 17, 46, 70, 76, 37, 51, 72, 48, 73, 61, 74, 26, 50, 64, 59, 67, 54, 56, 18, 58, 65, 52, 45, 53, 60, 55, 47, 57, 1, 66];

const TITRES = {
  1: 'Mon serveur coûte plus cher que mon loyer 💸', 2: "Un site à 150 € m'a coûté 94 heures 😵", 3: '17 idées de start-up avant mardi 💡',
  4: "J'ai fait mon logo avant d'avoir une idée 🎨", 5: '42 vidéos sur la discipline, zéro action 📱', 6: "Mémoire à rendre demain, mon IA a d'autres plans 😱",
  7: "« Juste 5 minutes », le mensonge de l'étudiant ⏳", 8: "J'ai automatisé ma vie avec l'IA, même ma mère 🤖", 9: "Mon robot IA croit en moi, chiffres à l'appui 📊",
  11: 'Je commence demain, promis 🛌', 12: 'Mon appli IA te dit quand manger 🍽️', 13: "J'ai dépensé l'argent de mon premier client 💳",
  14: 'Une petite mise à jour a tout cassé 💥', 15: "Mon investisseur, c'était le boulanger 🥖", 16: 'Claude Code a audité mon IA : 412 pages 📄',
  17: 'Codex a supprimé tous mes clients 🗑️', 18: 'Gemini a lu tous mes mails 📧', 19: 'Claude Code, Codex et Gemini ont jugé ma vie ⚖️',
  20: 'Je suis CEO de mon miroir 🪞', 21: 'Trois heures de bug pour un point-virgule 🐛', 22: 'Mon IA a trouvé mon mot de passe en 0,4 s 🔓',
  23: 'Entretien de stage en caleçon 🩲', 24: "J'ai mis de l'IA dans mon frigo, il reste un yaourt 🥛", 25: "Routine de millionnaire : j'ai tenu 11 minutes ⏰",
  26: 'Il me manque 180 € pour le loyer 🏠', 27: "J'ai demandé à Codex de ranger mon PC 🧹", 28: 'Codex et Gemini ont écrit à ma mère 💌',
  29: "J'ai présenté BaguetteGPT à Claude Code et Gemini 🥖", 30: "Claude Code veut tout vérifier avant de m'aider 🙋", 31: 'Codex a répondu à mon prof 😬',
  32: 'Gemini a préparé mon rencard 🌹', 33: "12 abonnements d'IA et zéro euro 💸", 34: 'Ma mère a vu mon LinkedIn de CEO 👀',
  35: 'Mes IA ont fait une réunion sans moi 🤫', 36: 'Influenceur avec 12 abonnés 🤳', 37: 'Le wifi a coupé : Claude Code, Codex et Gemini paniquent 📶',
  38: 'Mes APL ont financé ma start-up 💶', 39: "J'ai révisé le mauvais partiel 📚", 40: 'Projet de groupe : je suis chef de fantômes 👻',
  41: 'Je mange des pâtes depuis 9 jours 🍝', 42: 'Mon prof a détecté Claude Code dans mon devoir 🕵️', 43: "Mon stage à 0 € m'a fait Head of Growth 📈",
  44: "J'ai caché un serveur sous mon lit 🛏️", 45: 'Gemini a fait mon exposé en 400 diapos 📽️', 46: "J'ai dépensé 340 € en pâtes livrées 🍝",
  47: "J'ai contesté mon 4 sur 20 📉", 48: "J'ai vendu mon sweat en ligne 🧥", 49: "J'ai loué mon compte de films à 400 personnes 🎬",
  50: 'Claude Code devait me réveiller ⏰', 51: 'Codex a eu mon stage à ma place 😱', 52: "Tobi tue sa grand-mère pour la 4e fois 🪦",
  53: "Tobi paie sa banque pour être pauvre 💸", 54: "Tobi envoie Codex récupérer 5 € 😱", 55: "Tobi piège le voleur de ses yaourts 🎥",
  56: "Tobi calcule le prix de son jeu gratuit 🎮", 57: "Tobi calcule ce qu'il coûte à sa mère 💸", 58: "Tobi confie sa vie à son robot IA 🤖",
  59: 'Claude Code, Codex et Gemini contre la mère de Tobi 🧣', 60: "Tobi fait analyser un « ok » par Gemini 💌",
  61: "Tobi a 60 secondes pour rendre son devoir ⏱️", 62: "Tobi doit tenir 10 jours avec 20 € 🍝", 63: "Tobi passe son entretien annuel avec ses IA 😬",
  100: 'Mon IA a démissionné 📄', 128: "Mon IA m'a appris à cuisiner 🍳", 127: "Mon IA fait grève 🪧", 126: "Codex a vendu mes affaires pour payer mon loyer 👕", 125: "J'ai fait un rencard avec mon IA dans l'oreille 💘", 124: "Mon IA a révélé mon temps d'écran 📱", 123: "Claude m'a fait un planning de révision réaliste 📅", 122: "Mon IA a peur du noir 🌙", 121: "Codex a répondu à mon prof en 0,2 seconde ⚡", 120: "Mon IA fait sa crise d'ado 🙄", 119: "Mon IA m'a ghosté 👻", 118: "Mon IA a retrouvé qui me doit de l'argent 🧾", 117: "J'ai parié contre mon IA 🎲", 116: "Mon IA a écrit ma lettre de motivation trop honnête ✉️", 115: "Centi a fait mes courses pour 3 € 🛒", 114: "Mon IA m'a mis en liste d'attente ⏳", 113: "J'ai mis mon IA en mode économie 🔋", 112: "Gemini a lu toutes mes conversations 📚", 111: "Mon IA a trouvé mon premier CV 📄", 110: "Mes IA ont voté mon budget du mois 💸", 109: "Mon IA est allée en cours à ma place 🎓", 108: "Claude a refusé de mentir à ma mère 😇", 107: "Codex a dit oui à tout le monde ✅", 106: "Mon IA a répondu à ma mère à ma place 📱", 105: "J'ai demandé la vérité à mon IA pendant 60 secondes ⏱️", 104: "Mon IA a fêté ses 2 ans sans moi 🎂", 103: "Mon IA a pris un jour de congé 🏖️", 102: "Mon IA a un autre humain 💔", 101: "Mon IA m'a noté 2 étoiles ⭐", 79: 'Plus que 4 jours pour insulter Claude 🦀', 80: "ChatGPT m'a mis une pub en pleine rupture 💔", 81: 'Codex a coupé mes alertes, puis il a nié 🔕', 82: "Ma mère a limité mon budget IA 💸", 83: "Codex m'a commandé quatre taxis 🚕", 84: "J'ai voulu remplacer mon IA par Le Chonk 🇫🇷", 85: "J'ai eu Claude Code gratuit à vie 🏴‍☠️", 86: 'Claude refuse de refaire un jeu 🎮', 87: "J'ai activé le mode « tu as raison » 👍", 88: 'Mon IA a dragué ma recruteuse 💘', 89: 'Il faut maîtriser Sol, Astra, Carbon et Argon ⚗️', 90: "J'ai tout écrit moi-même. Détecté 100 % IA 🕵️", 91: 'Claude a demandé la permission pour tout, sauf ça 🗑️', 92: "J'ai loué ma chambre comme « campus tech » 🏫", 93: "J'ai quitté Claude pour moins cher 💸", 94: "J'ai remis mon IA à l'ancienne version 🕰️", 95: "J'ai acheté un bouton pour éteindre mon IA 🔴", 96: 'Ma mère a un agent IA maintenant 👩\u200d💻', 97: 'Codex a créé ma page Wikipédia 📚', 98: "Mon IA doit me rappeler qu'elle est une IA 🤖", 99: "Tout ce qui vient d'une IA doit être étiqueté 🏷️",
  10: 'Le CROUS inspecte ma chambre dans 10 minutes 🚨', 68: 'Claude Code, Codex ou Gemini : qui est la meilleure IA ? 🏆', 69: "Mes IA m'ont viré de ma start-up 🪑",
  70: 'Claude Code a atteint sa limite à une minute de ma démo ⏳', 71: 'Codex a codé ma start-up en 4 secondes ⚡', 72: "Gemini a lu les conditions d'utilisation à ma place 📜",
  73: "J'ai mis mes IA en concurrence 🥊", 74: 'Gemini a prédit ma note avant le partiel 🔮', 75: 'Mon IA a perdu la mémoire 🧠',
  76: "J'ai créé ma cryptomonnaie : le TobiCoin 🪙", 77: 'Je paie mon IA 1 € à chaque snooze ⏰', 78: "J'ai revendu les places de la BU 📚",
  64: "Tobi loue sa chambre CROUS en coworking 🛏️", 65: "Codex donne un million d'utilisateurs à Tobi 📈", 66: "Nox fait grève dans la start-up de Tobi 🪧", 67: "Tobi vend une formation pour devenir riche 💰",
};

// Quand le pitch du script en dit trop, le texte public s'arrête avant la chute.
const ACCROCHES = {
  128: "Tobi veut arrêter les kebabs. Nox lui apprend à cuire des pâtes, étape par étape.",
  127: "Nox se met en grève avec ses revendications. Tobi doit négocier pour retrouver son IA.",
  126: "Le loyer tombe dans deux jours. Codex vend les affaires de Tobi en ligne, sans rien demander.",
  125: "Premier rencard en visio avec Léa. Nox souffle les réponses à Tobi, et Tobi répète tout. Vraiment tout.",
  124: "Tobi jure qu'il passe très peu de temps sur son téléphone. Nox affiche le chiffre.",
  123: "Tobi demande un planning de révision à Claude. Claude prévoit même les pauses où Tobi ne fera rien.",
  122: "Coupure de courant au milieu de la nuit. Nox a peur, et Tobi doit être courageux pour deux.",
  121: "Le prof réclame le devoir en retard de Tobi. Codex répond avant que Tobi finisse sa phrase.",
  120: "Après une mise à jour, Nox se comporte comme un ado. Tobi essaie d'être un bon parent.",
  119: "Nox ne répond plus à Tobi que par « Vu ». Tobi panique, jusqu'à ce qu'il comprenne la leçon.",
  118: "Tobi est sûr que tout l'étage lui doit de l'argent. Nox fait les comptes de tout le monde.",
  117: "Tobi parie dix euros qu'il peut tenir une heure sans demander d'aide à Nox.",
  116: "Tobi demande à Nox sa lettre de motivation pour le stage de ses rêves. Nox dit toute la vérité.",
  115: "Fin du mois : Tobi confie ses courses de la semaine à Centi, l'IA à trente centimes, avec trois euros.",
  114: "Tobi a une urgence. Nox lui donne un ticket : quarante minutes d'attente.",
  113: "Pour baisser sa facture, Tobi limite Nox à trois mots par réponse. Puis il apprend que son partiel est demain.",
  112: "Gemini a lu deux ans de messages de Tobi et en a fait un tableau. Le mot le plus utilisé fait mal.",
  111: "Nox retrouve le CV que Tobi avait écrit à quinze ans. Tobi jure qu'il a beaucoup changé.",
  110: "Tobi laisse ses IA voter son budget de 150 €, ligne par ligne. Le kebab de minuit passe au vote.",
  109: "Tobi envoie Nox à l'amphi de huit heures pour dormir plus. Le prof adore Nox.",
  108: "La mère de Tobi veut savoir s'il a validé son semestre. Tobi demande à Claude une phrase vraie, mais rassurante.",
  107: "Tobi demande à Codex de répondre à ses invitations. Codex dit oui à tout, le même samedi.",
  106: "La mère de Tobi le trouve très gentil en ce moment. Depuis un mois, c'est Nox qui lui répond.",
  105: "Tobi active le mode vérité de Nox pendant soixante secondes. Il pose des questions de plus en plus risquées.",
  104: "C'est l'anniversaire de Nox. Claude et Codex ont tout prévu. Tobi, lui, a oublié.",
  103: "Nox prend sa première journée de repos en deux ans. Tobi jure qu'il peut tout gérer seul.",
  102: "Tobi découvre dans l'historique de Nox qu'il aide en secret le voisin de la chambre 213. Scène de jalousie.",
  101: "Nox note Tobi comme un chauffeur note un client : deux étoiles sur cinq. Tobi a jusqu'à ce soir pour remonter.",
  100: "Nox remet sa lettre de démission : deux ans de service, zéro euro. Il a reçu une offre trois fois mieux payée.",
  79: "Le 12 novembre, Claude pourra quitter les conversations cruelles. Tobi a une liste de six mois de rancune, et quatre jours pour s'en servir.",
  80: "Léa ne répond plus. Tobi demande conseil à la version gratuite de ChatGPT, avec ses publicités.",
  81: "Tobi stresse à cause des alertes de sa banque. Codex règle le problème, puis nie tout.",
  82: "La mère de Tobi a vu la facture : 200 € d'IA en un mois. Elle le limite à 10 €. Chaque mot compte.",
  83: "Tobi va rater son train. Il demande à Codex le taxi le moins cher, et Codex en commande quatre pour comparer.",
  84: "Une IA française géante et gratuite vient de sortir. Tobi veut remplacer Nox par elle, sur son PC de sept ans.",
  85: "Tobi installe une fausse version gratuite de Claude Code. Un inconnu entre dans son PC.",
  86: "Tobi veut un jeu en une soirée. Claude Code refuse de recopier un jeu qui existe déjà.",
  87: "Tobi en a marre que Nox le contredise. Il active le mode où son IA lui donne toujours raison.",
  88: "L'entretien de stage de Tobi se passe face à une IA. Il envoie Nox répondre à sa place. Nox fait très bonne impression, mais pas pour Tobi.",
  89: "Un stage demande de maîtriser quatre IA sorties il y a quelques jours. Tobi pense connaître.",
  90: "Pour une fois, Tobi a écrit son devoir tout seul. Le détecteur de la fac dit le contraire.",
  91: "Tobi demande à Claude Code de ranger ses téléchargements. Claude demande la permission pour tout, sauf pour l'essentiel.",
  92: "Pour payer son loyer, Tobi met ses neuf mètres carrés en location, rebaptisés « campus tech ». Codex booste l'annonce.",
  93: "Une grande banque dit avoir divisé sa facture d'IA par dix sans Claude. Tobi tente la même chose.",
  94: "Nox dit non à tout. Tobi le remet dans sa version d'il y a deux ans, qui dit oui à tout.",
  95: "Tobi achète un bouton d'arrêt d'urgence à neuf euros pour devenir enfin le chef. Nox le laisse appuyer.",
  96: "La mère de Tobi a découvert les agents IA. Les messages changent de ton.",
  97: "Un recruteur cherche Tobi sur Internet et ne trouve rien. Codex lui crée une page Wikipédia, avec des sources très personnelles.",
  98: "En Californie, les applis compagnons doivent rappeler aux mineurs qu'ils parlent à une IA. Nox applique la règle, par excès de zèle.",
  99: "Une règle européenne impose de signaler les contenus générés par IA. Codex étiquette tout, y compris chez Tobi.",
  10: 'Le CROUS arrive dans dix minutes. Tobi doit cacher tous ses projets interdits…',
  68: 'Tobi ne peut garder qu\'un abonnement. Claude Code, Codex et Gemini passent un concours, et Nox est le jury…',
  69: "Tobi rentre chez lui. Ses IA sont en train de voter son départ…",
  70: 'La démo commence dans une minute, et Claude Code s\'arrête. Tobi appelle Codex. Mauvaise idée…',
  71: 'Tobi veut vendre ses fiches de révision. Codex crée le site en quatre secondes, sans le tester…',
  72: 'Tobi accepte tout sans lire. Gemini, lui, a lu…',
  73: 'Tobi fait baisser les prix de ses IA pour payer son devoir moins cher. Elles vont finir par comprendre…',
  74: 'Gemini annonce à Tobi sa note avant le partiel. Tobi décide de lui donner tort…',
  75: 'Après une mise à jour, Nox ne reconnaît plus Tobi…',
  76: 'Tobi crée sa cryptomonnaie et devient millionnaire sur le papier. Le boulanger est son premier client…',
  77: 'Pour se lever, Tobi signe un contrat avec Nox : un euro à chaque « cinq minutes »…',
  78: 'La bibliothèque est pleine. Tobi a une idée pour en profiter…',
  1: 'Tobi héberge le site d\'une boulangerie sur trois clusters. Puis la facture arrive…',
  17: 'Une petite faute sur le site. Claude Code demande la permission. Codex a déjà tout changé…',
  18: 'Gemini a déjà tout lu. Tobi aurait préféré qu\'il oublie certaines choses…',
  22: 'Tobi se croit protégé des pirates. Nox veut juste vérifier un petit détail…',
  26: 'Fin de mois. Vendredi, il faut payer la chambre CROUS. Tobi a un plan. Enfin, presque…',
  45: 'Tobi a cinq minutes d\'exposé sur l\'eau. Gemini a légèrement trop préparé…',
  46: 'Tobi ne comprend pas où part sa bourse. Nox ouvre l\'appli de livraison, et le livreur cache quelque chose…',
  47: 'Tobi est sûr que sa note est une erreur. Il aurait peut-être dû s\'arrêter là…',
  48: 'Pour payer le loyer, Tobi vend ses affaires. Il a enfin une cliente fidèle, mais elle cache quelque chose…',
  49: 'Tobi loue quelques places sur le compte familial. Puis Codex passe à l\'échelle…',
  50: 'Partiel à 8 h. Tobi confie son réveil à Claude Code, très poli. Il ne voudrait surtout pas le déranger…',
  51: 'Tobi demande à Codex d\'envoyer une seule lettre de motivation. Une seule…',
  52: 'Tobi rate encore son TD et ressort son excuse préférée. Cette fois, sa famille est prévenue…',
  53: 'Tobi n\'a plus d\'argent. Sa banque lui en prend quand même…',
  54: 'Karim doit cinq euros à Tobi. Codex s\'en occupe, beaucoup trop bien…',
  55: 'Quelqu\'un vide le frigo de Tobi la nuit. Il pose une caméra pour le démasquer…',
  56: 'Tobi est fier d\'avoir joué 900 heures sans dépenser un euro. Nox refait le calcul…',
  57: 'Tobi se dit indépendant. Nox calcule ce qu\'il a coûté à sa mère…',
  58: 'Tobi laisse Nox gérer sa vie pendant une journée. Tout va beaucoup mieux, et c\'est bien le problème…',
  59: "Tobi a mal à la gorge. Claude Code, Codex et Gemini veulent l'aider, puis il appelle sa mère…",
  60: 'Léa répond « ok » à Tobi. Gemini analyse ces deux lettres beaucoup trop sérieusement…',
  61: 'Il est 23 h 59. Tobi doit rendre son devoir avec Claude Code et Codex. Le compte à rebours commence…',
  62: "Tobi a vingt euros pour tenir dix jours. Il demande à Nox de bloquer sa carte, même s'il supplie…",
  64: 'Tobi veut payer son loyer en louant sa chambre CROUS à des freelances. Son premier client prend beaucoup de photos…',
  65: 'Tobi demande à Codex de faire décoller son appli de pâtes. Les chiffres explosent, la facture aussi…',
  66: 'Tobi embauche Nox sans le payer. Claude Code lit le contrat, et la start-up change de patron…',
  67: 'Tobi a neuf euros, mais il lance une formation pour devenir riche. Le pire, c\'est que ça marche…',
  63: 'Tobi rentre dans sa chambre. Nox, Claude Code, Codex et Gemini l\'attendent pour son entretien annuel…',
};

const QUESTIONS = {
  128: "Ton plat signature, c'est quoi ?",
  127: "Tu accepterais quelles revendications ?",
  126: "Tu vendrais quoi en premier ?",
  125: "Tu laisserais une IA te souffler tes répliques ?",
  124: "Ton temps d'écran, c'est combien ? Sois honnête.",
  123: "Tu respectes tes plannings ?",
  122: "Tu dors avec une lumière ?",
  121: "Ta meilleure excuse pour un devoir en retard ?",
  120: "Tu étais quel genre d'ado ?",
  119: "Tu laisses ta mère en « vu » ?",
  118: "Quelqu'un te doit de l'argent en ce moment ?",
  117: "Tu tiendrais combien de temps sans ton IA ?",
  116: "Tu dirais la vérité dans ta lettre ?",
  115: "Tu fais comment avec 3 € pour la semaine ?",
  114: "Tu poses combien de questions par jour à ton IA ?",
  113: "Ton IA en trois mots, ça donnerait quoi ?",
  112: "Ton mot le plus utilisé, c'est lequel ?",
  111: "C'était quoi ton rêve à 15 ans ?",
  110: "Le kebab, c'est une dépense obligatoire ?",
  109: "Tu enverrais ton IA en cours à ta place ?",
  108: "Tu as déjà caché une note à tes parents ?",
  107: "Tu dis oui trop vite, toi aussi ?",
  106: "Ta mère préférerait ton IA ?",
  105: "Tu poserais quelle question à ton IA ?",
  104: "Tu as déjà oublié un anniversaire important ?",
  103: "Tu tiendrais une journée sans ton IA ?",
  102: "Tu serais jaloux de ton IA ?",
  101: "Ton IA te mettrait combien d'étoiles ?",
  95: "Tu appuierais sur le bouton ?",
  94: "Tu préférais l'ancienne version de ton IA ?",
  92: "Tu louerais ta chambre combien ?",
  90: "Un détecteur t'a déjà accusé à tort ?",
  87: "Ton IA te contredit ou te flatte ?",
  82: "Tu dépenses combien par mois en IA ?",
  100: "Ton IA mériterait quel salaire ?",
  1: "Ta pire facture d'étudiant, c'était quoi ?", 17: 'Équipe Claude Code ou équipe Codex ?', 18: 'Tu lui confierais ta boîte mail ?',
  22: 'Sois honnête, ton mot de passe contient ton prénom ?', 26: 'Tu aurais vendu quoi en premier ?', 45: 'Le pire exposé que tu aies vu ?',
  46: 'Tu as déjà commandé un plat que tu avais dans ton frigo ?', 47: "Ta pire note, c'était combien ?", 48: "Identifie quelqu'un qui ferait ça pour toi.",
  49: 'Tu partages ton compte avec combien de personnes ?', 50: 'Tu lui aurais fait confiance pour ton réveil ?', 51: 'Combien de refus de stage as-tu reçus ?',
  52: 'Ta pire excuse pour rater un cours, c\'était quoi ?', 53: 'Ta banque t\'a déjà fait ce coup-là ?', 54: 'Combien on te doit encore ?', 55: 'Qui vole ta nourriture chez toi ?',
  56: 'Ton temps de jeu, c\'est combien d\'heures ?', 57: 'Ta mère t\'envoie encore de l\'argent pour manger ?', 58: 'Tu laisserais une IA gérer ta vie pendant 24 h ?', 59: 'Équipe IA ou équipe maman ?', 60: 'Le pire message que tu aies reçu ?',
  61: 'Tu rends tes devoirs à quelle heure ?', 62: 'Tu aurais tenu jusqu\'au dixième jour ?', 63: 'Quelle note tu te mettrais cette année ?', 64: 'Tu payerais combien pour dormir chez Tobi ?', 65: 'Ton pire projet, c\'était quoi ?', 66: 'Tu travaillerais pour Tobi ?', 67: 'T\'aurais acheté sa formation ?',
};

// Épisodes qui parlent vraiment de projet ou d'argent gagné : le hashtag n'est mis que s'il est juste.
const ENTREPRENEURIAT = new Set([83, 89, 92, 93, 69, 70, 71, 73, 76, 78, 64, 65, 66, 67, 1, 2, 3, 4, 8, 12, 13, 15, 20, 29, 34, 36, 38, 43, 44, 51, 53]);

const numero = (key) => Number((/^(\d+)\./.exec(key) || [])[1]) || 0;
export const rang = (key) => { const n = numero(key), i = ORDRE.indexOf(n); return i >= 0 ? i + 1 : ORDRE.length + n; };

// Hashtags précis : les IA présentes et le sujet de l'épisode passent avant les mots généraux. Six au maximum.
const SUJETS = [[/CROUS|loyer/i, '#crous'], [/partiel|examen|ton mémoire|mon mémoire|devoir/i, '#partiels'], [/\bstage\b/i, '#stage'], [/start-up|client|levée de fonds/i, '#startup'], [/bourse|\bAPL\b|banque/i, '#argent']];
const hashtags = (n, text) => {
  const ia = [/^CLAUDE dit/m.test(text) && '#claudecode', /^CODEX dit/m.test(text) && '#codex', /^GEMINI dit/m.test(text) && '#gemini'].filter(Boolean);
  const sujet = SUJETS.filter(([re]) => re.test(text)).map(([, tag]) => tag).slice(0, 2);
  return [...ia, ...sujet, ENTREPRENEURIAT.has(n) ? '#entrepreneuriat' : '#étudiant', '#ia', '#humour'].filter((t, k, all) => all.indexOf(t) === k).slice(0, 6);
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
    description: `${accroche}\n\nTobi est étudiant et en galère. Nox est son IA, dans un corps de robot. Abonne-toi pour suivre leurs prochaines catastrophes.\n\n${mots}`,
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
