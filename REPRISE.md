# Reprendre le projet Tobi et Nox

Ce document s'adresse à toute personne ou IA qui reprend le projet. Il dit ce qui existe, où c'est, et comment le changer.

- `BIBLE.md` : la série, ses personnages et sa saison.
- `SHORTS.md` : comment fabriquer un épisode.
- `CHARTE_SCRIPTS.md` : comment écrire un script, pour une personne ou une IA.
- `JOURNAL.md` : ce qui a été fait, dans l'ordre, et pourquoi.
- Ce fichier : le fonctionnement technique.

Site : https://adebayo-moutalabi.github.io/Tobi-Nox-Studio/
Dépôt : https://github.com/adebayo-moutalabi/Tobi-Nox-Studio (public)

## Règles de travail

1. **Un commit par modification précise**, et une ligne dans `JOURNAL.md`. Revenir en arrière doit rester simple.
2. **Rien de privé dans le dépôt :** il est public. Les chaînes de référence restent dans le document Drive « Références (privé) ». Aucune clé API.
3. **Aucune dépendance subie :** tout élément téléchargé reste optionnel et se retire sans casser le projet (voir plus bas).
4. Répondre à l'auteur en français simple.

## Démarrer

```bash
npm install
```

```bash
node build.mjs
```

`build.mjs` assemble `studio.html`, `tobi.html` et `nox.html`, chacun autonome. GitHub Pages sert ces fichiers tels quels : il faut donc committer les `.html` reconstruits.

Pour tester, ouvrir `studio.html` en local ou via un petit serveur. L'export vidéo demande Chrome ou Edge.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| `src/page.html` | Toute l'interface et son CSS. La charte graphique est le bloc `CHARTE GRAPHIQUE`. |
| `src/studio-app.js` | Point d'entrée du Studio et liste des épisodes. |
| `src/story.js` | Lecteur de script, réalisation (cadrage, caméra), sous-titres, boutons du Studio. |
| `src/viewer.js` | Moteur 3D : rendu, déplacements, sièges, regard. |
| `src/logos.js` | Les Aînés : tracés des logos, volumes, visages et façon de vivre de chacun. |
| `src/look.js` | Ambiance du soir, passes d'image, vignettage, écrans plein cadre (`INSERT`). |
| `src/exporter.js` | Export MP4 image par image, mixage, dessin des sous-titres. |
| `src/sound.js` | Bruitages synthétisés et musique générée. |
| `src/voices.js` | Génération des voix ElevenLabs. |
| `src/writer.js` | Espace Écrire : dictée, analyse par Claude, script à valider. Reçoit `BIBLE.md` et `CHARTE_SCRIPTS.md` comme consigne. |
| `src/tones.js` | Les tons : voix, visage, geste et réaction d'un seul mot. |
| `src/talk.js` | Bouche calée sur le son, mouvements du corps qui parle et qui respire. |
| `src/character.js`, `src/clips.js` | Tobi : modèle et animations écrites en code. |
| `src/nox.js`, `src/nox-clips.js` | Nox : modèle, visage écran, animations. |
| `src/motion.js` | Mélange des animations (corps entier, couches du haut du corps). `PACE` règle la vitesse des gestes. |
| `src/room.js`, `src/room-actions.js` | La chambre, et ce qu'on y fait (bureau, lit, frigo, miroir). |
| `src/desk-screen.js` | Ordinateur, clavier, tableau. |
| `src/props.js`, `src/lowpoly.js` | Objets et outils de modélisation. |
| `src/config.js` | Interrupteurs du projet. |
| `shorts/` | Un fichier par épisode. |
| `tools/mocap.mjs` | Transpose des animations externes sur Tobi. |

## Ce qui vient de l'extérieur

| Élément | Où | Licence | Comment s'en passer |
|---|---|---|---|
| Mouvements enregistrés de Tobi (repos, marche, assis, parole) | `src/mocap.json`, `src/mocap.js` | CC0, Quaternius | Mettre `RECORDED_MOTION = false` dans `src/config.js`, puis reconstruire. Tobi revient à ses animations écrites en code, qui n'ont pas été supprimées. |
| `three` | npm | MIT | Base du projet, non remplaçable simplement. |
| `three-mesh-bvh` | npm | MIT | Accélère les tests de visée de la caméra. Sans lui, retirer deux lignes dans `src/story.js` : les plans se figent quelques secondes. |
| `mp4-muxer` | npm | MIT | Écriture du fichier MP4. |
| `@anthropic-ai/sdk` | npm | MIT | Espace Écrire seulement. Sans lui, retirer `src/writer.js` et garder la copie de consigne. |
| Polices | Google Fonts | Libres | Changer le bloc `CHARTE GRAPHIQUE`. |
| Voix | ElevenLabs, avec la clé de l'auteur | Compte de l'auteur | Importer ses propres fichiers audio dans « Réglages ». |

Tout le reste (personnages, chambre, objets, visages, musique, bruitages) est écrit en code dans ce dépôt.

**Remplacer les mouvements :** `tools/mocap.mjs` lit un fichier GLB. Changer `CLIPS` et `MAP` pour une autre source, puis lancer `node tools/run-mocap.mjs` et `node tools/.mocap.bundle.mjs chemin/fichier.glb`.

## Changer quelque chose

| Je veux changer | Où |
|---|---|
| Couleurs et polices de l'interface | Bloc `CHARTE GRAPHIQUE` de `src/page.html` |
| Un épisode | `shorts/NN_titre.txt` |
| Ajouter un épisode | Créer le fichier, l'importer et l'ajouter dans `src/studio-app.js` |
| Un ton | `src/tones.js` |
| Le visage de Nox | `EXPRESSIONS` et `TILT` dans `src/nox.js` |
| Le visage de Tobi | `EXPRESSIONS` dans `src/character.js` |
| Un Aîné (forme, visage, animation) | Sa forme dans `src/logos.js`, sa taille dans `AINES` de `src/cast.js` |
| Vitesse des gestes | `PACE` dans `src/motion.js` |
| Cadrage | `frame()` dans `src/story.js` |
| Mouvement de caméra pendant un plan | `moveShot()` dans `src/story.js` |
| Lumières du soir | Début de `createLook()` dans `src/look.js` |
| Taille des sous-titres | `drawCaption()` dans `src/exporter.js` et `.cap` dans `src/page.html` |
| Placement à la table | `desk()` et `swivel()` dans `src/room-actions.js` |

## Ajouter un lieu plus tard

Aujourd'hui, le Studio ne connaît qu'un décor. Ce qui lui est lié :

- `src/room.js` : le modèle, avec `room.solid` (obstacles de caméra) et `room.clamp()` (zone de marche).
- `LIEUX` et `PLANS` dans `src/story.js` : points et plans fixes.
- `src/room-actions.js` : ce qu'on y fait.
- Les lumières du soir dans `src/look.js`.

Pour un deuxième lieu : créer `src/lieux/<nom>.js` qui renvoie ces mêmes éléments, puis ajouter une commande `DECOR <nom>` qui remplace `v.room`, `LIEUX` et `PLANS`. Ce travail n'est pas commencé.

## Points de vigilance

- **Tester sans voix réelles :** le test d'export utilise de fausses voix ; la durée finale dépend des voix.
- **Fenêtre masquée :** dans un onglet caché, les animations du navigateur s'arrêtent. L'export doit rester au premier plan.
- **Miroir :** son reflet réel coûte cher. Il ne s'active que tout près du miroir.
- **Premier plan du soir :** la compilation des effets fige l'image quelques secondes une seule fois.
- **Mesurer la vitesse d'export :** le navigateur de test intégré peut donner des chiffres très variables. Même une ancienne version y est tombée à moins d'une image par seconde. Mesurer dans Chrome ou Edge, onglet au premier plan.
- **Encodeur :** rester en `prefer-software` ; l'encodeur matériel s'est montré 30 fois plus lent au test.
- **Envoi sur GitHub :** il peut demander une connexion Windows à l'auteur.

## À faire

Voir la fin de `JOURNAL.md`.
