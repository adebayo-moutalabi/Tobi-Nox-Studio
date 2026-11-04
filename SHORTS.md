# Fabriquer un Short Tobi et Nox

## Le format
- **Durée :** cible 45 à 75 s, limite 40 s à 1 min 30. Pour démarrer, viser 40 à 50 s. Un test peut durer 30 à 40 s.
- **Image :** vertical 9:16, 1080 × 1920, export depuis le Studio.
- **Série :** épisodes numérotés et réguliers, même décor, même générique de titre.
- **Rythme :** jamais lent. Nouveau plan, zoom, geste ou réaction toutes les 2 à 3 secondes, aucune marche ni attente inutile.

## Les références
La liste est privée : elle est dans le document « Références (privé) » du Drive. Ne jamais citer ces chaînes dans ce dépôt, sur le site ou dans une vidéo.

## Les règles d'écriture
La série, les personnages et la structure en 6 temps sont dans `BIBLE.md`.

1. **Une seule idée** par sketch, une situation d'étudiant que tout le monde reconnaît.
2. **Accroche dès la première phrase**, sans introduction. On écrit l'accroche et la chute en premier.
3. **La chute arrive tard**, suivie d'une petite ouverture vers l'épisode suivant, ou d'une boucle vers le début.
4. **Répliques courtes :** 10 mots maximum, un seul gag par réplique.
5. **Tobi s'emballe, Nox casse l'illusion.** Nox est sec mais loyal, Tobi est de mauvaise foi mais attachant.
6. **Un gag visuel** par sketch, lisible sans le son. Les sous-titres sont incrustés.

## De A à Z : sortir un Short
Sur ordinateur, avec Chrome ou Edge. Exemple avec le pilote, qui est déjà scripté : commence à l'étape 4.

1. **Écrire** le sketch en langage normal : accroche, 6 temps de la bible, chute.
2. **Scripter** dans le Studio : choisir un script, ouvrir « Modifier le script », écrire. Mettre `DIRECT` devant toute action qui ralentit.
   Copier ensuite le texte dans `shorts/NN_titre.txt`, car le Studio ne l'enregistre pas.
3. **Répéter :** format « Short 9:16 », puis « Lire l'histoire ». Couper tout ce qui traîne.
4. **Voix sur ElevenLabs**, dans Text to Speech :
   - Choisir ta voix clonée pour Tobi, une autre voix pour Nox. Noter les réglages et ne plus les changer.
   - Coller une seule réplique, générer, écouter, recommencer si le ton est faux.
   - Télécharger en MP3 et renommer dans l'ordre du script : `01_tobi.mp3`, `02_nox.mp3`, `03_tobi.mp3`...
   - Ranger les fichiers dans un dossier par épisode.
5. **Importer dans le Studio :** ouvrir le Studio sur le site, choisir le script, format « Short 9:16 ».
   Dans « Voix ElevenLabs, dans l'ordre », sélectionner tous les fichiers d'un coup.
   Le Studio doit afficher « 15 voix importées pour 15 répliques » (le nombre dépend de l'épisode). S'il affiche « Attention », il manque un fichier.
6. **Exporter :** laisser « Sous-titres dans la vidéo » coché, choisir 30 i/s, cliquer « Exporter en MP4 ».
   Laisser l'onglet ouvert au premier plan pendant le calcul. Le Studio télécharge `histoire.mp4` et `histoire.srt`.
7. **Regarder la vidéo en entier** sur ton téléphone, avec et sans le son. Si une réplique tombe mal, corriger le script ou la voix et réexporter.
8. **Finir au montage** (CapCut ou DaVinci Resolve), projet vertical 1080 × 1920 : importer `histoire.mp4`, ajouter les bruitages et une musique très basse, zoomer sur les gags.
   Les sous-titres sont déjà dans l'image : ne pas en rajouter. Exporter en 1080 × 1920, 30 i/s.
9. **Publier sur YouTube**, sur ordinateur ou depuis l'application :
   - Titre : `Tobi fait X (emoji) | Tobi & Nox #1`, avec un numéro d'épisode.
   - Description : 3 lignes qui teasent la situation sans donner la chute, puis 3 à 5 hashtags.
   - Vérifier l'option « contenu modifié ou synthétique » selon la règle YouTube du moment.
10. **Analyser à 48 h :** noter vues et rétention dans le tableau ci-dessous, et l'endroit où les gens partent. Le sujet suivant part de ce qui a marché.

## Avant de publier
- La première seconde donne-t-elle envie de rester ?
- La vidéo se comprend-elle sans le son ?
- La fin relance-t-elle le début ?
- Musique et bruitages ont-ils une licence valable pour YouTube ?
- Faut-il cocher « contenu modifié ou synthétique » pour la voix clonée ? Vérifier la règle YouTube à jour.

## Suivi des Shorts
| N° | Titre | Durée | Date | Vues à 48 h | Rétention | Note |
|---|---|---|---|---|---|---|
| Pilote | Mon serveur coûte plus cher que mon loyer | | | | | |
| 7 | Je révise juste 5 minutes | | | | | |
