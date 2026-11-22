# Guide technique du Studio

Ce guide explique comment modifier le Studio sans le casser. Il s'adresse à une personne ou à une IA qui découvre le code.

`REPRISE.md` donne la vue d'ensemble. `CHARTE_SCRIPTS.md` donne les règles d'écriture. Ce fichier donne les recettes de code.

## Comment un épisode devient une vidéo

1. Un script texte est écrit dans `shorts/`.
2. `src/studio-app.js` le rend disponible dans le Studio.
3. `parseStory` (`src/story.js`) transforme chaque ligne en commande.
4. `run` (`src/story.js`) exécute chaque commande : déplacer, cadrer, parler, afficher.
5. `src/exporter.js` capture les images et le son, puis crée le MP4.

## Où changer quoi

| Je veux changer | Fichier | Point d'entrée |
|---|---|---|
| Une commande de script | `src/story.js` | `run`, un `case` par commande |
| Le cadrage automatique | `src/story.js` | `frame` |
| L'heure et la date | `src/story.js` | `setClock`, `timeJump` |
| Les gestes et émotions | `src/story.js` | `EMOTIONS`, `REPLI`, `clipFor` |
| L'écran du PC | `src/desk-screen.js` | `drawBoard`, `drawApp`, `drawTool` |
| L'écran du second PC | `src/desk-screen.js` | `createLockScreen` |
| Les écrans plein cadre | `src/look.js` | `drawCard` |
| La lumière | `src/look.js` | `setMood` |
| Les actions sur les meubles | `src/room-actions.js` | `desk`, `bedEdge`, `sleep` |
| La marche | `src/viewer.js` | `walkTo`, `aroundChair` |
| Le regard | `src/viewer.js` | bloc `most`, `a.cheat` |
| La chambre | `src/room.js` | `buildStatic`, `buildDeskItems` |

## Recettes

### Ajouter une commande de script

1. Ajouter un `case` en minuscules dans `run` (`src/story.js`). Le premier mot de la ligne devient `c.verb`.
2. Lire le texte avec `c.text`, ou les mots avec `c.args`.
3. Renvoyer une promesse si le script doit attendre.
4. Documenter la commande dans `CHARTE_SCRIPTS.md`.

### Ajouter une application sur le PC

1. Ajouter sa couleur dans `APPS` (`src/desk-screen.js`).
2. Ajouter sa mise en page dans `drawTool`.
3. Ajouter un autre nom possible dans `ALIAS`, si besoin.
4. L'utiliser dans un script : `PC Nom : titre | ligne 1 | ligne 2`.
5. L'ajouter à la liste de `CHARTE_SCRIPTS.md`.

Les applications sont des imitations, sans logo.

### Régler le cadrage

`frame` essaie des positions de caméra, puis garde la première qui respecte toutes ces conditions :

- le visage est du bon côté ;
- rien ne cache le personnage ;
- la caméra reste dans la pièce et hors des personnages.

Trois réglages comptent :

- **`a.cheat` :** à quel point le regard s'ouvre vers la caméra. Il vaut 0,55 debout, 0,5 pour Tobi assis et 0 sinon.
- **`need` :** l'angle minimal entre la caméra et le visage.
- **`chairAhead` :** retire la chaise vide si elle passe devant le plan.

Après un changement, relancer `tools/audit-cadrage.js` et regarder de vraies images. L'audit ne juge pas la beauté d'un plan.

## Contrôles à lancer

| Contrôle | Commande | Ce qu'il vérifie |
|---|---|---|
| Heure et date | `node tools/audit-temps.mjs` | Les contradictions entre le script et l'écran |
| Cadrage | Coller `tools/audit-cadrage.js` dans la console, puis `await auditCadrage()` | Le personnage qui parle est visible |
| Meubles | Coller `tools/audit-meubles.js` dans la console, puis `await auditMeubles()` | Rien n'entre dans un meuble |

Dans la console, garder l'onglet au premier plan. Ne pas lancer deux contrôles en même temps : ils pilotent la même lecture.

Pour vérifier des scripts : `node tools/controle-episodes.mjs 101 140` contrôle les tons, les plans avant chaque personnage, la durée estimée (moins d'une minute), l'accroche et les mots interdits (« mémoire », « Puis-je »).

## Lieux, regard et jeux (13 novembre 2026)

- **Lieux :** `src/lieux.js` construit la laverie, le kebab et la BU. Chaque lieu réutilise les murs de la chambre et pose ses meubles là où étaient le bureau, l'armoire, la kitchenette et le lit. Les meubles de la chambre deviennent invisibles mais restent des obstacles pour la caméra : c'est pour cela que les nouveaux meubles occupent les mêmes volumes. Pour ajouter un lieu : écrire une fonction comme `kebab(g)`, l'ajouter à `BUILD` et `TINT`.
- **Regard :** dans `applyLook()` de `src/viewer.js`, la direction du regard est lissée (`a.aim`), le personnage cligne quand il change de cible, et `listen()` fait hocher et pencher la tête de celui qui écoute.
- **Jeux :** `src/jeux.html` (gabarit et style) et `src/jeux-app.js` (les trois jeux). `node build.mjs` produit `jeux.html`. Un jeu est un objet `{ id, nom, ico, pitch, start(), stop() }` ajouté à la liste `JEUX` ; le score, le record et le lien de défi sont communs.
- **Revenir en arrière :** l'étiquette Git `version-2026-11-13` marque la version d'avant. `versions/studio-2026-11-13.html` en garde une copie consultable sur le site.

## Animations Mixamo

Les gestes les plus humains de Tobi viennent de Mixamo. La FAQ d'Adobe autorise leur usage dans un projet, mais interdit de distribuer les fichiers d'animation bruts. Le dépôt étant public, ces données n'y sont jamais en clair.

| Élément | Sur GitHub ? |
|---|---|
| `src/mocap-mixamo.json` | Non, jamais en clair |
| `studio-mixamo.html` | Non |
| `studio.html`, `tobi.html`, `nox.html` | Oui, sans données Mixamo |
| `tools/mixamo/` | Oui : scripts seulement |
| `gestes.chiffre` | Oui : chiffré, illisible sans le mot de passe |

`node build.mjs` crée toujours les pages publiques. Si `src/mocap-mixamo.json` existe, il crée aussi `studio-mixamo.html`. Sans ce fichier, `clipFor` utilise les gestes d'origine.

**Pour travailler en local :** lancer `node tools/serveur-local.mjs`, puis ouvrir http://localhost:4173. Cette adresse ouvre `studio-mixamo.html` s'il existe, et lit toujours la dernière compilation.

**Pour avoir les gestes sur tous ses appareils :** le site publie `gestes.chiffre`, une copie chiffrée en AES-256-GCM. Sans le mot de passe, ce fichier est illisible.

1. Ouvrir le Studio en ligne, puis la partie **Vidéo**.
2. Entrer le mot de passe et cliquer sur **Déverrouiller mes gestes**. C'est à faire une seule fois par navigateur.
3. Ensuite, le Studio vérifie le coffre à chaque ouverture et prend seul la nouvelle version.

Le mot de passe n'est ni enregistré ni envoyé. La clé qui en découle reste dans le navigateur déverrouillé (`src/gestes-prives.js`). **Retirer mes gestes de cet appareil** efface cette clé et la copie.

**Pour mettre à jour les gestes :**

1. Recréer `src/mocap-mixamo.json`.
2. Lancer `node tools/chiffrer-gestes.mjs` avec le même mot de passe.
3. Compiler, puis envoyer `gestes.chiffre` sur GitHub. Les appareils se mettent à jour seuls.

**Mot de passe oublié :** supprimer `gestes.chiffre`, relancer le script avec un nouveau mot de passe, puis déverrouiller chaque appareil. Il faut pour cela le fichier `src/mocap-mixamo.json`.

**Pour recréer les données :**

1. Télécharger les FBX sur Mixamo, sans peau.
2. Définir `MIXAMO_SRC` avec leur dossier.
3. Lancer `blender -b -P tools/mixamo/convert.py`.
4. Depuis la racine du projet, lancer `python tools/mixamo/make.py`.

`NAMES`, dans `tools/mixamo/make.py`, fait le lien entre chaque fichier et son nom `mx_`.

## Mouvement des écrans

Les cartes (`INSERT`, `TEMPS`, messages) sont animées dans `src/look.js`. L'entrée dure `ENTER` (0,3 s), avec une courbe qui ralentit en arrivant et un léger rebond. La sortie dure `LEAVE` (0,16 s) et accélère en partant. Les éléments d'une carte arrivent avec un décalage de `STEP` (0,08 s). Le décalage total reste sous une demi-seconde. `look.hideInsert(true)` coupe net : on l'utilise au début et à la fin d'une lecture. Aucun mouvement n'est linéaire.

## Caméra, marche et vie des personnages (audit du 22 novembre 2026)

- **Meubles devant l'objectif :** `clearProps` (src/story.js) ne cache plus le meuble : il passe à 12 % d'opacité en 0,15 s (`fadeProp`, `fadeStep`), puis revient. Les matériaux sont clonés le temps du fondu et rendus ensuite. Un meuble estompé a `userData.faded` : l'audit de cadrage l'ignore. Les grands panneaux (plus de 2,2 m, comme « bois ») et les murs restent exclus.
- **Effets :** `EFFET punch_in | shake | whip_cut` et l'inclinaison de `PLAN contre` vivent dans l'objet `fx` de `moveShot`. L'inclinaison est appliquée par `v.afterCamera`, appelé par le viewer après `controls.update()` : sinon elle serait effacée à chaque image.
- **Plans types :** `overShoulder(a)` cherche une place derrière l'épaule de celui qui écoute, à 0,7 à 1,2 m, en vérifiant que personne ne cache celui qui parle (`blocks`).
- **Regard caméra :** `REGARD camera` pose `a.lens` pour une réplique ; `applyLook` (src/viewer.js) vise alors la caméra.
- **Marche :** `navPath` (src/viewer.js) n'intervient que si la ligne droite traverse un meuble. Grille de 10 cm, meubles de la chambre en rectangles (`NAV`) avec une marge de 24 cm pour Tobi et 17 cm pour Nox, A* sans couper les coins, puis on ne garde que les virages. Les points intermédiaires sont dans `a.pathRest` : pas de freinage avant le dernier. Hors de la chambre (`DECOR`), `v.navOn` est faux et la marche reste en ligne droite. Si un meuble bouge dans `src/room.js`, mettre `NAV` à jour.
- **Glissade :** la foulée suit déjà la vitesse réelle (`NATURAL.stride`, `setStride`) et les animations se fondent entre elles (`crossFadeTo` dans src/motion.js).
- **Vie permanente :** Tobi respire (`breathe`, torse et cou, plus ample après une course) et cligne déjà des yeux toutes les 2 à 5 s. L'antenne de Nox suit son humeur : lente au calme, penchée quand il doute, tremblante quand il a peur, boule rouge et cyan en colère.
- **Zone sûre 9:16 :** case « Zone sûre 9:16 » dans Vidéo. Repère affiché dans le Studio seulement (`#safe`), jamais exporté : 15 % en haut, 22 % en bas, 15 % à droite. L'audit de cadrage signale « zone cachée des Shorts » quand les yeux de celui qui parle y tombent.
- **Tester sans attendre :** la voix d'essai du navigateur parle en temps réel. Pour faire avancer un épisode image par image (`__perso.step`), décocher « voix d'essai » d'abord.

## Écrans, animations et décors du sprint 3 (22 novembre 2026)

- **Meubles découpés :** `src/room.js` range chaque meuble dans sa zone (`ZONE = 'lit'`, `'bureau'`…) : la chambre a des maillages `mobilier_<zone>` et `bois_<zone>` au lieu de deux grands blocs. Un meuble devant la caméra s'estompe donc seul. Pour un nouveau meuble, poser `ZONE = 'nom';` avant de le construire.
- **Écrans d'applications :** `look.screen(type, titre, lignes)` dans `src/look.js`, dessinés par `drawScreen` sur la même carte que les INSERT, donc présents dans l'export. L'écran est redessiné à chaque image tant qu'il est affiché (minuteur, onde, compteur de vues). `scan` n'a pas de fond : il se pose sur la scène.
- **Animations au sol :** `prone()` dans `src/clips.js` incline les hanches et garde les pieds au sol. Clips `pushups` et `collapse` (une fois), `prone_flat` et `pushups_fast` (en boucle). Au sol, `story.js` coupe la gestuelle de parole (`ground`), sinon les bras quittaient le sol.
- **Panne des IA :** `a.glitch` (src/viewer.js, `glitch()`) remplace le demi-tour des logos vers la caméra. Pour Nox, `hero.grey` grise l'antenne et le voyant (src/nox.js).
- **Décors :** `CHAMBRE vide` cache `mobilier_objets`, la chaise (`room.chairGone`) et le sac ; `LUMIERE alarme` et `froide` sont deux lumières de `story.js`, éteintes à chaque `reset()`.
- **Obstacles de caméra :** `findBlockers()` se relance après chaque changement de décor et au début de chaque lecture, après le retour à la chambre. Avant, un épisode joué juste après un épisode à l'amphi calculait sa caméra avec les meubles de l'amphi.

## Pièges connus

- **Places de `apparait` :** les perchoirs (en hauteur) sont `bureau`, `chaise`, `lit` et `rebord`. Les autres noms (`frigo`, `fenetre`, `porte`…) posent le personnage **au sol**. Une place inconnue arrête l'épisode avec une erreur.
- **`NOX suit tobi`** dure jusqu'à `NOX seul`, un `apparait` ou un `DECOR`. Sans arrêt, Nox court après Tobi pendant tout l'épisode.
- Un personnage perché qui doit `marche`, `court` ou `suit` saute d'abord au sol (`toGround` dans `src/story.js`).

- **Texte de script :** les fichiers de `shorts/` sont inclus à la compilation. Après une modification, relancer `node build.mjs`.
- **Cache du site :** GitHub Pages garde les pages environ 10 minutes. Faire Ctrl+F5.
- **Lecture en cours :** `story.play` est ignoré tant qu'une lecture tourne.
- **Effets du soir :** l'occlusion et le halo ne s'activent qu'à l'export. Vérifier la lumière sur une image exportée.
- **Chaise cachée :** `audit-cadrage.js` peut annoncer « caché » à tort quand la chaise est retirée du plan. Regarder l'image.
