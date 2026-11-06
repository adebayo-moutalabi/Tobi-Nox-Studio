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
| 5 nov. 2026 | Mascotte Tobi & Nox, mignonne et souriante | Version 2 retenue : Tobi lève les bras, Nox a les yeux rieurs. Avatar, emblème et filigrane conservés hors du dépôt |
| 5 nov. 2026 | Logo personnel final | Direction Orbite choisie par l'auteur, fournie dans son archive Logo-Adebayo-Moutalabi, conservée hors du dépôt |
| 5 nov. 2026 | Publier les meilleures vidéos dès le matin, avec fiches par plateforme | Ordre retenu : épisodes 46, 50, 51, puis 47 en réserve. Fiches dans une page privée, hors du dépôt |
| 5 nov. 2026 | Vidéos floues sur YouTube et fichiers nommés « histoire » | Export 1440p par défaut, débit relevé, fichier au nom de l'épisode |
| 5 nov. 2026 | « Aie » doit se dire « è » | Écriture « Haie » envoyée à la voix, réglable et testable dans Réglages. À confirmer à l'écoute |
| 5 nov. 2026 | Écouter l'histoire avant de télécharger | Voix d'essai gratuites du navigateur, vraies voix rejouées sans crédit si elles existent |
| 5 nov. 2026 | Navigation fluide et flèches cachées dans les réglages | Retour à l'épisode, épisode précédent et suivant, liste qui garde sa position, débordement corrigé |
| 5 nov. 2026 | Voir ce qui est publié et étudier les résultats | Espace Publications du Studio, avec titres, textes, statut par plateforme, chiffres et sauvegarde |
| 5 nov. 2026 | Meilleurs titres et hashtags | Titres retravaillés pour la recherche, hashtags IA, robot, Claude ou entrepreneuriat quand ils sont justes |
| 5 nov. 2026 | Ne plus dépendre d'ElevenLabs plus tard | Marche à suivre dans `VOIX.md` |
| 5 nov. 2026 | Protéger les crédits ElevenLabs | Voix d'essai pour écouter, solde affiché, coût annoncé et confirmé avant la vidéo finale |
| 5 nov. 2026 | Épisodes plus drôles, logiques et indépendants | Nouvelle formule dans `CHARTE_SCRIPTS.md`, épisodes 52 à 55, idées dans `IDEES_EPISODES.md`, placard abandonné |
| 5 nov. 2026 | La clé ElevenLabs disparaît au redémarrage | Clé gardée par défaut dès qu'elle est collée, sauf si l'auteur décoche l'option, et message clair si elle manque |
| 6 nov. 2026 | Garder les mêmes voix et réglages | Voix, modèle, format, qualité et options gardés. Une voix manquante n'est plus remplacée au hasard |
| 6 nov. 2026 | Guide YouTube et stratégie des nouveaux comptes | `PUBLICATION.md`, avec les tags YouTube ajoutés aux fiches |
| 6 nov. 2026 | Plus de lumière dans le Studio | Soir plus lumineux et commande `LUMIERE vive` ou `douce` par épisode |
| 6 nov. 2026 | Scripts plus drôles, inspirés de ce qui marche ailleurs | Épisodes 56 à 60, ressorts adaptés à Tobi et Nox sans reprendre de gag |
| 6 nov. 2026 | Commentaire épinglé jugé inutile | Retiré des étapes obligatoires |
| 6 nov. 2026 | Rythme compatible avec les crédits ElevenLabs | Trois vidéos par semaine et budget dans `PUBLICATION.md` |
| 6 nov. 2026 | Coût pour publier plus souvent | Besoins en crédits et offres conseillées dans `PUBLICATION.md` |
| 6 nov. 2026 | Épisodes d'une minute et plus qui retiennent jusqu'au bout | Compteur à l'image, format TikTok dans la charte, épisodes 61 à 63 |
| 6 nov. 2026 | Durée libre de 50 à 115 secondes, avec crédits maîtrisés | Format normal de 50 à 60 s, grands formats réservés aux meilleures idées |
| 6 nov. 2026 | « Aie » toujours mal prononcé | Écriture « Est » envoyée à la voix. À confirmer à l'écoute |
| 6 nov. 2026 | Plus d'effets à l'image | Commandes `PC`, `appelle` et `raccroche` |
| 6 nov. 2026 | Histoires trop rapides et difficiles à suivre | Épisode 58 réécrit avec contexte, charte corrigée pour des répliques plus claires |
| 6 nov. 2026 | Dialogues plus humains et moins de blancs | Silences des voix coupés, réponses enchaînées et consignes d'émotion renforcées |
| 6 nov. 2026 | Titres et descriptions plus reconnaissables | Titres de série numérotés, descriptions courtes et appel à s'abonner |
| 6 nov. 2026 | Gestes et téléphone plus humains | Téléphone visible à l'oreille, gestes calés sur les mots appuyés et énergie selon le ton |
| 6 nov. 2026 | Appliquer l'épisode 58 aux autres | Épisodes 52 à 63 réécrits avec contexte, durée visée de 40 à 90 secondes |
| 6 nov. 2026 | Personnages IA plus vivants | Claude grand frère honnête, Codex stagiaire surexcité, Gemini premier de la classe |
| 6 nov. 2026 | Regarder la bonne personne avant de parler | Le Studio repère le prénom appelé ou la personne qui répond, puis tourne le personnage avant la réplique |
| 6 nov. 2026 | Épisode du procès pas assez drôle | Remplacé par un entretien annuel de Tobi avec ses IA |
| 6 nov. 2026 | Audit complet | Bug de plan de dos corrigé, contrôle ajouté à `tools/audit-cadrage.js` et priorités relevées dans un audit privé |
| 6 nov. 2026 | Appliquer l'audit à tout le Studio | Dialogues plus oraux, plans variés, écrans animés, sous-titres plus grands, gestes alternés et actions dans les épisodes récents |
| 6 nov. 2026 | Plans dans les vêtements et bras trop répétitifs | Caméra interdite dans les personnages, gestes plus rares et mouvements de bras réduits |
| 6 nov. 2026 | Téléphone, main sur la tête et bras assis | Tête gardée près du téléphone, gestes à la tête retirés, bras calmes en position assise |
| 6 nov. 2026 | Visages trop peu visibles | Regard vers le bas limité et contrôle ajouté à `tools/audit-cadrage.js` |
| 6 nov. 2026 | Plus de projets fous et de revers | Épisodes 64 à 67 sur l'entrepreneuriat |
| 6 nov. 2026 | Épisodes 59 et 62 pas assez réussis | Histoires réécrites : appel à la mère et carte bloquée par Nox |
| 6 nov. 2026 | Mains, téléphone et objets traversés | Caméra plus précise de près, mains gardées au-dessus du bureau, téléphone tenu dans la paume |
| 6 nov. 2026 | Bras ni figés ni répétitifs | Poses de mains tenues puis changées pendant la phrase, Nox anime aussi ses bras |
| 6 nov. 2026 | Moins de positions identiques | Départs et actions choisis selon chaque histoire dans les épisodes récents |
| 6 nov. 2026 | Garder les retours de l'auteur | Fichier `PREFERENCES_AUTEUR.md` |
| 6 nov. 2026 | Émotions visibles dans le corps | Poses de panique, doute, colère, fierté, tristesse, idée, gêne et justification pour Tobi |

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
