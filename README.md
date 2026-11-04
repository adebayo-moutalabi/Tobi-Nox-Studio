# Tobi et Nox

Mini-sitcom 3D verticale pour YouTube Shorts (45 à 75 s). Tobi, étudiant qui cherche sa voie, et Nox, son IA sarcastique. Voir `BIBLE.md`.
Tout tourne dans le navigateur, sans logiciel 3D à installer.

## Où en est le projet

| Élément | État |
|---|---|
| Tobi (1,80 m) | Modèle, squelette, visage mignon, mimiques, gestes |
| Nox (45 cm) | Modèle, visage écran, mimiques, gestes |
| Chambre | Lit, bureau, frigo, armoires, miroir, fenêtre, porte, ordinateur et tableau vivants |
| Objets | Papier, livre, gourde, tasse, téléphone, sac à dos noir, chaise, pouf |
| Script | `histoire.txt`, joué par le Studio avec caméra automatique |
| Vidéo | Export MP4 vertical ou 16:9, image par image, sous-titres incrustés et `.srt` |
| Voix | Import ElevenLabs, durée et bouche calées sur chaque réplique, son inclus dans le MP4 |
| Autres décors et personnages | À faire, selon la fiche de projet |

## Liens

- [Site en ligne](https://adebayo-moutalabi.github.io/Tobi-Nox-Studio/)
- [Studio Tobi et Nox](https://claude.ai/artifact/WB6QCfdr9uCKsdYfQWed7H)
- [Tobi](https://claude.ai/artifact/5fBGkWjNsAoRb4TjwwJ2Pn)
- [Nox](https://claude.ai/artifact/6Lom1BEVp33jAkhMzMRTeg)

## Les fichiers

| Fichier | Rôle |
|---|---|
| `studio.html` | Le Studio complet. À ouvrir dans Chrome ou Edge pour exporter en MP4 |
| `tobi.html`, `nox.html` | Chaque personnage seul |
| `histoire.txt` | Le script en cours, avec la liste des instructions en tête |
| `BIBLE.md` | L'univers, les personnages, la structure et la saison 1 |
| `SHORTS.md` | Le format, les règles d'écriture, le workflow et le suivi des Shorts |
| `shorts/` | Les scripts et les répliques de chaque Short |
| `WORKFLOW.md` | Le déroulé à suivre pour chaque vidéo |
| `tobi.glb`, `nox.glb`, `chambre.glb`, `objets.glb` | Modèles pour Blender, Unity, Unreal, Godot |
| `references/` | Les images de référence |
| `src/` | Le code source |

## Reconstruire

```bash
npm install
node build.mjs
node export-glb.mjs tobi
node export-glb.mjs nox
node export-glb.mjs chambre
node export-glb.mjs objets
```

## Décisions prises

- Style low-poly à facettes, personnages et décor générés par code : ils restent identiques d'un plan à l'autre.
- Version « complète » de la chambre, mur rouge vif côté lit.
- Imprimante sans marque.
- Tobi : sans barbe, yeux en pavés noirs avec reflet, lunettes rondes en option.
- Nox mesure 45 cm : il tient sur la table, l'épaule ou dans le sac.
- La vidéo est calculée image par image pour rester fluide sur tout ordinateur.

## À venir

1. Publier le pilote, puis lire sa courbe de rétention.
2. Fiche de projet, nouveaux décors, nouveaux personnages.
3. Les Aînés, Chat et Claude pour l'instant : personnages originaux, sans logos (marques déposées).
4. Test d'un export complet en 1080p.
