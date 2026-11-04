# Fabriquer un Short Tobi et Nox

## Le format
- **Durée :** cible 45 à 75 s, limite 40 s à 1 min 30. Pour démarrer, viser 40 à 50 s. Un test peut durer 30 à 40 s.
- **Image :** vertical 9:16, 1080 × 1920, export depuis le Studio.
- **Série :** épisodes numérotés et réguliers, même décor, même générique de titre.
- **Rythme :** jamais lent. Nouveau plan, écran ou réaction toutes les 1 à 3 secondes, répliques très courtes, aucune marche ni attente inutile.

## Les références
La liste est privée : elle est dans le document « Références (privé) » du Drive. Ne jamais citer ces chaînes dans ce dépôt, sur le site ou dans une vidéo.

## Les règles d'écriture
La série, les personnages et la structure en 6 temps sont dans `BIBLE.md`.

1. **Une seule idée** par sketch, une situation d'étudiant que tout le monde reconnaît.
2. **Accroche dès la première phrase**, sans introduction. On écrit l'accroche et la chute en premier.
3. **La chute arrive tard**, suivie d'une petite ouverture vers l'épisode suivant, ou d'une boucle vers le début.
4. **Répliques courtes :** 1 à 8 mots le plus souvent, un seul gag par réplique.
5. **Tobi s'emballe, Nox casse l'illusion.** Nox est sec mais loyal, Tobi est de mauvaise foi mais attachant.
6. **Un gag visuel** par sketch, lisible sans le son. Les sous-titres sont incrustés.

## Le ton de chaque réplique
Le ton s'écrit entre parenthèses, juste après `dit`. Il règle ensemble la voix, le visage, le geste et la réaction de l'autre :

`NOX dit (sec) C'est une boulangerie, Tobi.`

Tons disponibles : `neutre`, `calme`, `curieux`, `fier`, `content`, `excite`, `illumine`, `ironique`, `sec`, `constat`, `punchline`, `gene`, `mauvaisefoi`, `resigne`, `triste`, `colere`, `surpris`, `panique`, `chuchote`.
Un autre mot en anglais, comme `(laughs)`, est transmis tel quel à ElevenLabs. `mimique` reste utile pour une réaction sans parole.

## La mise en scène
- `AMBIANCE soir` : chambre sombre, lumières chaudes et violettes. À mettre en tête de script.
- `TOBI pivote` : il se tourne vers la pièce pour parler. `TOBI pivote bureau` : il revient au clavier.
- `PLAN auto`, `PLAN gros NOX`, `PLAN duo`, `PLAN clavier` : changer de plan à chaque réplique ou presque.
- `INSERT Titre | Gros chiffre | Petit texte` : écran plein cadre pour un chiffre clé, comme `INSERT Facture cloud | 847 € | Ce mois-ci`. Il reste jusqu'au `PLAN` suivant.
- `BRUIT ding`, `BRUIT pop`, `BRUIT whoosh` : un bruitage précis.

## De A à Z : sortir un Short
Sur ordinateur, avec Chrome ou Edge.

1. **Une fois :** créer une clé ElevenLabs (Developers, API Keys, droits Text to Speech et Voices) et la coller dans la ligne « Voix » d'un épisode, puis choisir les voix de Tobi et Nox.
2. **Choisir un épisode :** il s'ouvre et se joue tout de suite. « Revoir » le relance.
3. **Cliquer sur « Créer la vidéo » :** les voix sont créées si besoin, puis le MP4 arrive dans les téléchargements. Rien d'autre à régler.
4. **Regarder la vidéo** sur téléphone, avec et sans le son.
5. **Publier :** titre « Tobi fait X (emoji) | Tobi & Nox #1 », 3 lignes qui teasent sans donner la chute, 3 à 5 hashtags. Vérifier l'option « contenu modifié ou synthétique ».
6. **Analyser à 48 h** et noter le résultat ci-dessous.

Pour un nouvel épisode : écrire le script selon `CHARTE_SCRIPTS.md`, puis l'ajouter dans `src/studio-app.js`, ou le coller dans la ligne « Script » d'un épisode existant.

## Avant de publier
- La première seconde donne-t-elle envie de rester ?
- La vidéo se comprend-elle sans le son ?
- La fin relance-t-elle le début ?
- Musique et bruitages ont-ils une licence valable pour YouTube ?
- Faut-il cocher « contenu modifié ou synthétique » pour la voix clonée ? Vérifier la règle YouTube à jour.

## Suivi des Shorts
| N° | Titre | Durée | Date | Vues à 48 h | Rétention | Note |
|---|---|---|---|---|---|---|
| 1 | Mon serveur coûte plus cher que mon loyer | | | | | |
| 2 | Juste un site vitrine | | | | | |
| 3 | Ma 17e idée de la semaine | | | | | |
| 4 | Le logo avant l'idée | | | | | |
| 5 | 42 vidéos business | | | | | |
| 6 | Mon rendu est demain | | | | | |
| 7 | Je révise juste 5 minutes | | | | | |
| 8 | Ma vie automatisée | | | | | |
