# Consignes pour une IA qui travaille sur ce projet

Tobi et Nox est une mini-sitcom 3D pour YouTube Shorts, fabriquée dans un Studio web.

## À lire avant de modifier

| Si tu travailles sur | Lis d'abord |
|---|---|
| Un épisode | `PREFERENCES_AUTEUR.md`, puis `CHARTE_SCRIPTS.md` |
| Le code | `docs/GUIDE_TECHNIQUE.md`, puis `REPRISE.md` |
| Ce qu'il reste à faire | `TACHES.md` |
| L'historique | `JOURNAL.md` |

## Règles à ne pas casser

1. Rien de privé dans le dépôt : ni clé API, ni référence privée.
2. `src/mocap-mixamo.json` et `studio-mixamo.html` ne vont jamais sur GitHub. Seul `gestes.chiffre` est publié. Ne jamais écrire son mot de passe.
3. Écrire chaque retour de l'auteur dans `PREFERENCES_AUTEUR.md`. S'il contredit une ancienne décision, le lui dire.
4. Faire un commit par modification précise et ajouter une ligne à `JOURNAL.md`.
5. Répondre à l'auteur en français simple.

## Après une modification

```bash
node build.mjs
node tools/audit-temps.mjs
```

Pour un changement de caméra ou de geste, lancer aussi les audits de cadrage et de meubles, puis regarder de vraies images.
