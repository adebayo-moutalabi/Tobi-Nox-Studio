# Avancement de la session Fable v2

Branche de travail : `fable-v2`. La branche `main` n'est pas touchée. Point de retour : étiquette `studio-stable-avant-fable`.

## État des lieux (audit)

- Studio web en Three.js 0.170, assemblé par `node build.mjs` en pages autonomes (`studio.html`, `tobi.html`, `nox.html`, `jeux.html`).
- Tobi et Nox sont modélisés en code (`src/character.js`, `src/nox.js`), pas importés : aucun modèle externe.
- Animations : écrites en code (`src/clips.js`, `src/nox-clips.js`), plus des mouvements CC0 Quaternius pour Tobi (`src/mocap.json`). Les gestes Mixamo restent privés, sur le poste de l'auteur.
- Le moteur d'animation (`src/motion.js`) fait déjà des fondus enchaînés de 0,18 à 0,32 s entre repos, marche, assis et gestes.
- Voix : ElevenLabs, créées dans le navigateur. La bouche suit déjà le volume du son (`src/talk.js`).
- Export : image par image en MP4 avec fichier `.srt` (`src/exporter.js`). Il existe déjà.
- Scripts : fichiers texte, une instruction par ligne (`shorts/*.txt`), pas du JSON.
- Lieux : la chambre, plus six décors ajoutés le 13 novembre (laverie, kebab, BU, amphi, couloir, extérieur) qui réutilisent les murs de la chambre.
- Contrôles : `tools/audit-temps.mjs` (heure et date) et `tools/controle-episodes.mjs` (durée, tons, plans).

## Fait

### T1 : mouvements naturels (fait en partie)

- Foulée calée sur la vitesse réelle : les pieds ne patinent plus au démarrage ni à l'arrêt.
- Arrêt progressif sur les 40 derniers centimètres.
- Transfert de poids de Tobi au repos : le bassin bascule, le buste compense.
- Petits gestes de repos aléatoires (regarder ailleurs, se gratter, réfléchir), jamais pendant une réplique.
- Nox penche vers l'avant en marchant et se redresse avec un léger balancement.
- Regard progressif, clignement au changement de cible, hochements de celui qui écoute (fait le 13 novembre, maintenant débrayable).
- Scène de démonstration : « Démo · Mouvements naturels » dans la liste du Studio.
- Chaque point a son interrupteur dans `src/config.js` (objet `NATURAL`).

Vérifié : la démo et le Studio démarrent sans erreur ; la vitesse de Tobi monte progressivement (0,62 puis 1,12 m/s) ; Nox penche jusqu'à 0,125 radian ; le transfert de poids et un geste de repos se voient sur les captures.

Ce qui manque pour dire T1 terminé :
- Je n'ai pas mesuré le glissement des pieds au millimètre, ni regardé une vidéo exportée.
- Pas de mouvement secondaire des vêtements.
- La bouche suit le volume du son, pas de vrais visèmes tirés de l'audio.
- Nox marche avec ses jambes : il ne « flotte » pas, pour respecter son modèle actuel.
- Je n'ai pas mesuré les images par seconde sur un portable moyen.

## Reste à faire

- T2 : rendu (HDRI, SSAO, profondeur de champ en tournage) et chambre plus vivante.
- T3 : campus (salle de TP, hall) et résidence (cuisine commune, couloir jour et soir), avec passants.
- T4 : format de script JSON. L'export image par image et le `.srt` existent déjà.
- T5 : métro, voisin, resto U.

## Prochaine action exacte

1. Ouvrir `studio.html`, choisir « Démo · Mouvements naturels », cliquer sur Lire, et valider les points de la section « Quoi observer ».
2. Si c'est bon : commencer T2 par les objets de la chambre dans un nouveau fichier `src/chambre-details.js`, avec un interrupteur `ROOM_DETAILS` dans `src/config.js`.

## Quoi observer dans la démo

1. Quand Tobi entre, ses pas accélèrent avec lui : le pied posé ne glisse pas sur le sol.
2. Il ralentit avant de s'arrêter, sans arrêt net.
3. Debout sans parler, il passe son poids d'une jambe sur l'autre, et fait parfois un petit geste.
4. Quand Nox parle, Tobi tourne la tête progressivement, cligne, puis hoche la tête de temps en temps.
5. Nox penche vers l'avant quand il marche, puis se redresse en se balançant un peu.

## Revenir en arrière

Revenir à la version stable :

```bash
git checkout studio-stable-avant-fable
```

Revenir sur le travail en cours :

```bash
git checkout fable-v2
```

Désactiver une seule nouveauté : mettre sa ligne à `false` dans `src/config.js`, puis :

```bash
node build.mjs
```
