# Journal des changements, session Fable v2

Branche `fable-v2`, fusionnée dans `main` le 16 novembre 2026 : ces changements sont sur le site.

## 14 novembre 2026 : mouvements naturels (T1, en partie)

| Nouveauté | Interrupteur dans `src/config.js` | Comment le voir |
|---|---|---|
| La foulée suit la vitesse : les pieds ne glissent plus | `NATURAL.stride` | Démo : l'entrée de Tobi |
| Arrêt progressif en arrivant | `NATURAL.softStop` | Démo : Tobi s'arrête sur le tapis |
| Transfert de poids au repos | `NATURAL.weight` | Démo : les 6 secondes de pause |
| Petits gestes de repos | `NATURAL.idleVariants` | Laisser Tobi debout 7 à 15 secondes sans réplique |
| Nox penche en marchant | `NATURAL.noxLean` | Démo : « NOX marche droite » |
| Regard progressif, clignement, écoute | `NATURAL.gaze` | N'importe quel dialogue |

**Tester :** `node build.mjs`, ouvrir `studio.html`, choisir « Démo · Mouvements naturels », Lire.

**Désactiver :** passer la ligne à `false` dans `src/config.js`, puis `node build.mjs`.

**Revenir à la version stable :**

```bash
git checkout studio-stable-avant-fable
```

## 14 novembre 2026 : pose de repos debout, guirlande retirée

| Changement | Interrupteur dans `src/config.js` | Comment le voir |
|---|---|---|
| Tobi se tient droit au repos, au lieu de la garde jambes écartées | `NATURAL.uprightIdle` | N'importe quel plan où il est debout |
| Guirlande et affiches retirées de la chambre | aucun : supprimées | Plan du lit |

## Pour une deuxième session

- Finir T1 : vêtements, visèmes, mesure du glissement et des images par seconde.
- T2 à T5 en entier.
- Autres personnages, mode jeu à la troisième personne dans le Studio, missions. Les mini-jeux existent déjà dans `jeux.html`, sur `main`.
