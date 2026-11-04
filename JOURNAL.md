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

## À faire

1. Faire valider l'identité du Studio (bloc `CHARTE GRAPHIQUE`).
2. Préciser l'expérience voulue dans le Studio (l'auteur reviendra dessus).
3. Améliorer le modèle de Tobi : visage, tissu du sweat, peau.
4. Améliorer les éléments de la chambre : ordinateurs, placards qui s'ouvrent, textures.
5. Ajouter d'autres lieux (voir `REPRISE.md`).
6. Modéliser les Aînés et écrire l'épisode 10.
7. Remonter l'épisode 7 au format actuel.
8. Tester avec les vraies voix ElevenLabs.
9. **Faire du projet un framework réutilisable :** à la fin, documenter comment quelqu'un d'autre crée sa propre série (personnages, lieux, charte, histoires) sur cette base.
