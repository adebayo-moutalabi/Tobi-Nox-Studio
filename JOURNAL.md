# Journal du projet

Une entrée par modification, la plus récente en bas. Le code entre crochets est le commit : `git show <code>` montre ce qui a changé, `git revert <code>` l'annule.

Avant le 4 novembre 2026 soir, plusieurs sujets ont pu être groupés dans un même commit. Depuis, chaque modification a le sien.

## Fondations

- **[11b3e1e] Studio de base.** Tobi et Nox modélisés en code, chambre fidèle aux photos, langage de script, export vidéo. Décisions : style low-poly généré par code pour rester identique d'un plan à l'autre ; Nox mesure 45 cm ; Tobi sans barbe.
- **[e05b66b] Format Short.** Vertical, import des voix ElevenLabs, sous-titres, premier sketch.
- **[e2b8663] Bible.** Plan de série retravaillé, pilote « Mon serveur ». Nox sec mais loyal, Aînés en personnages originaux.
- **[676b3b2] Guide d'un Short.** Noms des Aînés (Chat et Claude pour l'instant), coiffure : tresses plaquées du modèle. Les références restent privées, hors du dépôt.
- **[b5bbfe8] Voix automatiques.** Le Studio génère les voix avec la clé de l'auteur.
- **[0f1a199] Synchro.** Bouche calée sur le volume réel de la voix ; un mot de ton règle voix, visage, geste et réaction.

## Rendu et rythme

- **[8d66339] Rendu proche des références.** Ambiance du soir, cadrage avec de l'air au-dessus de la tête, sous-titres plus petits avec mot surligné, écrans plein cadre, gestes plus vifs, frappe clavier réaliste, bruitages et musique. Correction d'un flou à l'export si la fenêtre changeait de taille.
- **[1d04b67] Six épisodes et rendu adouci.** Épisodes 2 à 6 et 8, volumes arrondis, ombres de contact, halo, respiration et transferts de poids.
- **[ede4a2c] Mouvements enregistrés.** Tobi utilise des animations CC0 pour le repos, la marche et la parole. Regards croisés (Nox déplacé au coin du bureau), caméra vivante, visage de Nox stabilisé, chocolat retiré, export plus rapide, réglage 720p.

## Indépendance, nouveaux épisodes, documentation

- **[ce21d44] Mouvements optionnels.** `RECORDED_MOTION` dans `src/config.js` : l'auteur ne veut pas dépendre d'animations téléchargées.
- **Blocages de caméra supprimés.** Les visées de caméra testaient toute la chambre, ce qui figeait l'image à chaque plan. Index `three-mesh-bvh`, reflet réel du miroir limité à 80 cm.
- **Trois épisodes en mouvement.** 9 (sur le lit), 11 (réveil, miroir, bureau), 12 (pitch debout). Nox se pose à côté de Tobi sur le lit.
- **Interface simplifiée.** Liste d'épisodes, deux actions (Regarder, Créer la vidéo), réglages dans un panneau latéral, atelier dans ce panneau. Identité isolée dans le bloc `CHARTE GRAPHIQUE`, avec des couleurs provisoires.
- **Documentation.** `REPRISE.md` et ce journal.
- **Lecture fluide.** Effets lourds réservés à l'export, recadrage quand un personnage se lève, lampe de chevet, plans côte à côte sur le lit.
- **Charte d'écriture.** `CHARTE_SCRIPTS.md`, utilisable par n'importe qui. Premières phrases cultes dans les épisodes 1 et 3.
- **Identité et parcours.** Base du site de l'auteur (Fraunces, Inter, fond sombre, filets), jaune de Nox comme couleur d'action. Choisir un épisode l'ouvre et le lance ; les réglages sont repliés dans la fiche ; un seul bouton crée la vidéo. Chaque script porte un `# Pitch :`.
- **Préparation des effets.** Les variantes d'export des matériaux sont compilées à l'ouverture, en parallèle (`look.warm()`).
- **Export fiabilisé.** Encodage logiciel (433 ms contre 15 ms par image au test), arrêt immédiat de la lecture avant un export ou un nouveau lancement.
- **Navigation et écriture.** Quatre espaces (Épisodes, Écrire, Coulisses, Réglages), barres de défilement masquées. Espace Écrire : brouillon écrit ou dicté, analyse et scénarios par Claude (`src/writer.js`), script à valider, puis animation. Sans clé Claude, la consigne se copie vers une autre IA.
- **Néon retiré.** La bande lumineuse du bureau semblait traverser Tobi quand il s'assoit.
- **Mains séparées.** `keepHandsApart()` dans `src/talk.js` empêche les mains de se traverser ou d'entrer dans le buste, hors gestes voulus (applaudir, clavier, objets).
- **Choix de l'IA.** L'espace Écrire accepte une clé Claude, OpenAI ou Gemini. Modèles dans le haut de `src/writer.js`.
- **Nouveaux épisodes.** 13, 14 et 15 : Tobi entre par la porte. L'ambiance se choisit par script ; les épisodes 11, 12 et 15 passent de jour.
- **Réglages et navigation.** Plus de débordement horizontal, navigation réduite à quatre icônes discrètes.
- **Caméra.** Tous les objets de la chambre comptent comme obstacles (tableau, portes, chaise, frigo). Les personnages suivent du regard celui qui marche.
- **Assise.** Tobi s'arrête devant le lit et s'assoit dessus (`setLift`), arrive face à la chaise tournée vers lui, puis pivote vers le bureau.
- **Les Aînés.** Claude, Chat et Gemini : même corps que Nox, couleur et taille propres (`aine()` dans `src/cast.js`), commandes `entre` et `apparait`, une voix réglable chacun. Épisodes 16 à 20.
- **Aînés en logos.** Claude Code (crabe en pixels), Codex (nuage `>_`) et Gemini (étoile en lévitation) remplacent les Nox recolorés. Les tracés viennent des logos, le squelette et les gestes de ceux de Nox (`src/logos.js`). À l'arrêt, un logo reste tourné vers la caméra pour rester reconnaissable. Codex remplace Chat.
- **Départ immédiat et épisodes plus longs.** Les Aînés sont en place dès la première image, les épisodes 16 à 19 sont réécrits, les épisodes 21 à 29 ajoutés. Durées mesurées sans voix : 46 à 60 s.
- **Aînés plus petits et mieux placés.** Environ un quart plus petits. Ils regardent celui qui parle, en gardant leur logo lisible, et se posent sur le bureau, le lit ou le rebord (`PERCHOIRS` dans `src/story.js`).
- **Épisodes 30 à 37 et nouveaux titres.** Un, deux ou trois Aînés selon l'épisode. Tous les titres sont réécrits pour accrocher.
- **Bureau corrigé.** Le bandeau rouge scintillait parce que la tablette avait une face confondue avec lui. Nox s'assoit désormais vraiment sur le plateau, loin du bord.
- **Anciens épisodes réécrits et épisodes 38 à 45.** Les épisodes 2 à 6, 8, 9, 11 à 15 et 20 sont allongés et replacés dans la vie étudiante, avec moins d'entrées par la porte. Huit histoires étudiantes s'ajoutent.
- **Cadrage vertical.** Le cadre d'un Short est étroit : les plans reculent pour garder le corps, les gestes et un peu de décor, sans changer la version horizontale. Celui qui parle s'adresse à son interlocuteur dans tous les épisodes.
- **Logique et répétitions.** Le compteur de projets ne reste que dans l'épisode 3, les chutes répétées sont remplacées, Tobi est partout en licence 3, Léa est définie dans la Bible.
- **Phrases cultes rétablies.** Les réductions de la version précédente sont annulées : les phrases reviennent là où elles tombent juste. Le placard à projets remplace le compteur.
- **Suivi.** `SUIVI_GAGS.md`, `VOIX.md`, bouton « Copier la liste de mes voix » et section des demandes de l'auteur.
- **Prononciation.** `src/prononciation.js` corrige ce que la voix dit sans changer les sous-titres.
- **Sketchs plus riches.** Avec les vraies voix, l'épisode 45 durait 33 s au lieu de 51 s estimées. Nouvelle cible : 140 à 170 mots. L'épisode 45 est réécrit, les épisodes 46 à 51 écrits à ce format.
- **Celui qui parle est toujours à l'image.** Quand aucun plan normal n'était possible, la caméra repartait sur le plan large, où l'armoire cache le bureau. Elle tourne désormais autour du personnage. Vérifié réplique par réplique sur tous les épisodes avec `tools/audit-cadrage.js`.

## Demandes de l'auteur

À compléter à chaque échange : ce qui a été demandé, et où cela se trouve.

| Date | Demande | Résultat |
|---|---|---|
| 5 nov. 2026 | Aînés en vrais logos animés, pas des Nox recolorés | `src/logos.js` |
| 5 nov. 2026 | Scripts de 40 à 60 s, personnages déjà en place | Charte et épisodes |
| 5 nov. 2026 | Logos plus petits, qui regardent celui qui parle, pas toujours au sol | `PERCHOIRS`, `showLogo()` |
| 5 nov. 2026 | Un, deux ou trois Aînés selon l'épisode | Charte |
| 5 nov. 2026 | Titres plus accrocheurs | Tous les épisodes |
| 5 nov. 2026 | Corriger la ligne rouge et les places au bureau | `src/room.js`, `src/room-actions.js` |
| 5 nov. 2026 | Réécrire les anciens scripts, rester sur la vie étudiante | Épisodes 2 à 20 et 38 à 45 |
| 5 nov. 2026 | Ne plus couper les personnages en Short, garder du décor | `frame()` dans `src/story.js` |
| 5 nov. 2026 | Pas d'Aînés sur la kitchenette | `PERCHOIRS` |
| 5 nov. 2026 | Tobi est un étudiant en galère, revoir le loyer | Bible et épisode 26 |
| 5 nov. 2026 | Léa : bosseuse, inspirante, son crush | Bible et épisode 32 |
| 5 nov. 2026 | Garder les phrases cultes, qu'elles tombent juste | Charte et `SUIVI_GAGS.md` |
| 5 nov. 2026 | Placard à projets plutôt que cimetière | Épisodes 3, 9, 19 et 24 |
| 5 nov. 2026 | Documenter les voix et chaque demande | `VOIX.md` et cette section |
| 5 nov. 2026 | Corriger « Aie la vision » et « annales » à l'oral | `src/prononciation.js`, épisode 39 |
| 5 nov. 2026 | Sketchs plus drôles et plus longs, épisode 45 trop court | Charte, épisodes 45 à 51 |
| 5 nov. 2026 | Voir le personnage qui parle dans tous les épisodes | `frame()`, `tools/audit-cadrage.js` |
| 5 nov. 2026 | Skills pour les vidéos | Hyperframes, Claude Animation Base et Lemo-Opuscar, installés hors du dépôt |
| 5 nov. 2026 | Skill de logo sûr pour le filigrane et les deux chaînes | `logo-design` version 1.4.5, vérifié puis installé hors du dépôt |

**Idées gardées pour plus tard :** petit frère, grande sœur, partenaires de travail, Léa à l'écran.

## À faire

1. Faire valider l'identité du Studio (bloc `CHARTE GRAPHIQUE`).
2. Préciser l'expérience voulue dans le Studio (l'auteur reviendra dessus).
3. Améliorer le modèle de Tobi : visage, tissu du sweat, peau.
4. Améliorer les éléments de la chambre : ordinateurs, placards qui s'ouvrent, textures.
5. Ajouter d'autres lieux (voir `REPRISE.md`).
6. Écrire l'épisode 10.
7. Remonter l'épisode 7 au format actuel.
8. Tester avec les vraies voix ElevenLabs.
9. **Faire du projet un framework réutilisable :** à la fin, documenter comment quelqu'un d'autre crée sa propre série (personnages, lieux, charte, histoires) sur cette base.
