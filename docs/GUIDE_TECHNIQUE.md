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

## Animations Mixamo

Les gestes les plus humains de Tobi viennent de Mixamo. La FAQ d'Adobe autorise leur usage dans un projet, mais interdit de distribuer les fichiers d'animation bruts. Le dépôt étant public, ces données restent sur le poste de l'auteur.

| Élément | Sur GitHub ? |
|---|---|
| `src/mocap-mixamo.json` | Non |
| `studio-mixamo.html` | Non |
| `studio.html`, `tobi.html`, `nox.html` | Oui, sans données Mixamo |
| `tools/mixamo/` | Oui : scripts seulement |
| Copie dans le navigateur de l'auteur | Non : elle n'existe que chez lui |

`node build.mjs` crée toujours les pages publiques. Si `src/mocap-mixamo.json` existe, il crée aussi `studio-mixamo.html`. Sans ce fichier, `clipFor` utilise les gestes d'origine.

**Pour travailler en local :** lancer `node tools/serveur-local.mjs`, puis ouvrir http://localhost:4173. Cette adresse ouvre `studio-mixamo.html` s'il existe, et lit toujours la dernière compilation.

**Pour avoir les mêmes gestes sur le site :**

1. Ouvrir le Studio en ligne, puis les réglages de la vidéo.
2. Cliquer sur **Importer mes gestes** et choisir `mocap-mixamo.json`.
3. La page se recharge avec les gestes.

Le fichier reste dans le stockage de ce navigateur, sous la clé `tobi-gestes` (`src/mocap.js`). Il n'est envoyé nulle part. Les autres visiteurs gardent les gestes d'origine. **Retirer mes gestes** efface cette copie. Il faut refaire l'import sur un autre navigateur ou un autre ordinateur.

**Pour recréer les données :**

1. Télécharger les FBX sur Mixamo, sans peau.
2. Définir `MIXAMO_SRC` avec leur dossier.
3. Lancer `blender -b -P tools/mixamo/convert.py`.
4. Depuis la racine du projet, lancer `python tools/mixamo/make.py`.

`NAMES`, dans `tools/mixamo/make.py`, fait le lien entre chaque fichier et son nom `mx_`.

## Pièges connus

- **Texte de script :** les fichiers de `shorts/` sont inclus à la compilation. Après une modification, relancer `node build.mjs`.
- **Cache du site :** GitHub Pages garde les pages environ 10 minutes. Faire Ctrl+F5.
- **Lecture en cours :** `story.play` est ignoré tant qu'une lecture tourne.
- **Effets du soir :** l'occlusion et le halo ne s'activent qu'à l'export. Vérifier la lumière sur une image exportée.
- **Chaise cachée :** `audit-cadrage.js` peut annoncer « caché » à tort quand la chaise est retirée du plan. Regarder l'image.
