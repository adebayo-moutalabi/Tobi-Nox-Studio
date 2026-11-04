# Tobi et Nox : comment on fabrique une vidéo

Document de travail, à compléter avec la fiche de projet. Pour les Shorts, suivre `SHORTS.md`.

## Ce qui existe
- **Personnages** : Tobi (1,80 m), Nox (45 cm), identiques à chaque plan.
- **Décor** : la chambre (lit, bureau, frigo, miroir, fenêtre, porte).
- **Objets** : papier, livre, gourde, tasse, téléphone, sac à dos noir, chaise, pouf.
- **Studio** (`studio.html`) : on pilote, on joue le script, on exporte.

## Le chemin d'une vidéo
1. **Écrire** le sketch (dialogue et action) en langage normal.
2. **Scripter** : le transformer en `histoire.txt`, une instruction par ligne.
3. **Répéter** dans le Studio avec « Lire l'histoire », corriger les plans et le rythme.
4. **Enregistrer la voix** : une prise par réplique, fichiers nommés `01_tobi.wav`, `02_nox.wav`...
5. **Exporter** : ouvrir `studio.html` sur l'ordinateur, « Exporter en MP4 ». On obtient `histoire.mp4`
   (image parfaitement fluide) et `histoire.srt` (les répliques avec leur minutage).
6. **Monter** (CapCut, DaVinci Resolve ou Premiere) : caler les voix sur le `.srt`, ajouter
   bruitages, musique, textes et motion design.
7. **Publier** sur YouTube.

## Écrire un script
La liste complète des instructions est en tête de `histoire.txt`. L'essentiel :

```
PLAN auto                     # la caméra suit qui parle et qui marche
TOBI dit Bonjour !            # réplique
TOBI mimique joie             # émotion
TOBI travaille                # s'assoit au bureau et tape
TOBI tape Chapitre 4          # le texte s'écrit à l'écran
PLAN clavier                  # plans fixes : clavier, ecran, tableau, lit...
TABLEAU Titre | ligne 1 | ligne 2
NOX monte sac                 # aussi : bras, epaule
TOBI sortie                   # va à la porte, tient la poignée, sort
```

## Besoins
- Chrome ou Edge pour l'export MP4.
- Un micro pour les voix, un logiciel de montage.
- Une banque de sons libres de droits, en vérifiant chaque licence pour YouTube.

## Limites actuelles
- La bouche suit le texte et la durée de la voix, pas chaque syllabe.
- Les fichiers `.glb` contiennent les modèles, pas la mise en scène du Studio.
