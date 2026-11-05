# Charte d'écriture des scripts Tobi et Nox

Cette charte suffit pour écrire un épisode, seul, à plusieurs ou avec n'importe quelle IA. Elle complète `BIBLE.md`.

## L'épisode en une phrase

Tobi se raconte une grande vision, Nox le ramène à la réalité, et Tobi trouve une façon encore plus absurde de continuer.

## Les personnages à l'écrit

**Tobi** parle vite, avec enthousiasme et mauvaise foi. Il croit sincèrement à ce qu'il dit. Il n'est jamais bête, il rebondit toujours.

**Nox** parle peu, calmement, avec un humour sec. Il pique sans humilier et reste du côté de Tobi. Ses répliques font rarement plus de six mots.

**Les Aînés** sont les logos de Claude Code, Codex et Gemini, animés comme des personnages. Ils viennent juger Tobi ou se contredire.

- **Claude Code** demande la permission pour tout : « Puis-je ouvrir le fichier ? »
- **Codex** agit avant la fin de la phrase : « C'est fait. » Il va toujours trop loin.
- **Gemini** a déjà tout lu et propose tous les formats : « J'ai aussi fait un podcast. »

Dans un script, ils sont déjà là : `DIRECT CLAUDE apparait bureau`, puis `CLAUDE dit (calme) ...`.

- **Places au sol :** `gauche`, `milieu`, `droite`.
- **Places en hauteur :** `bureau`, `chaise`, `lit`, `rebord` (la fenêtre, plutôt le soir : le jour, le contre-jour les efface). À préférer souvent au sol.
- **Un seul sur le bureau :** si un Aîné est sur le bureau, Nox va sur le lit (`assis`), sinon ils se gênent à l'image.
- **Combien par épisode :** un ou deux le plus souvent. Les trois ensemble restent un événement.

## Les phrases de la série

Ce sont les rendez-vous du public. Elles peuvent revenir souvent : **il faut surtout qu'elles tombent juste.**

| Qui | Phrase | Quand |
|---|---|---|
| Tobi | **« Nox. Aie la vision. »** | Il est coincé et relance quand même |
| Nox | **« J'appelle ta mère. »** | Chute, quand Tobi dépense, ne mange plus ou se met en danger |
| Nox | **« Tobi. Non. »** | Il coupe l'idée avant la fin |
| Tobi | **« C'est un investissement. »** | Il justifie une dépense |
| Nox ou Tobi | **« Au placard. »** | Une idée vient de mourir |

Règles : une phrase ne vient que si l'histoire y mène, et jamais deux fois la même chute à la suite. Le plaisir vient de les attendre, et parfois de les détourner : Tobi peut dire « J'appelle ma mère » avant Nox. La liste des épisodes est dans `SUIVI_GAGS.md`.

## La structure, en 40 à 60 secondes

Avec les vraies voix, le rythme est d'environ 3 mots par seconde : compter **140 à 170 mots de dialogue** et une trentaine de répliques. La durée affichée sans voix dans le Studio est trop longue d'environ un tiers : seule la vidéo avec les voix fait foi.

1. **Accroche, 0 à 3 s.** Une phrase qui donne envie de rester, sans introduction.
2. **La question simple de Nox.**
3. **La surenchère.** Tobi justifie, et chaque réponse aggrave la situation.
4. **Le chiffre.** Un écran plein cadre révèle la réalité.
5. **La punchline de Nox.**
6. **Le rebond.** Tobi a une nouvelle idée pire que la première.
7. **La chute.** Une dernière réplique courte, souvent de Nox.

## Pour que le dialogue coule

1. **Chaque réplique répond à la précédente.** Si on peut en retirer une sans rien perdre, on la retire.
2. **Reprendre un mot de l'autre.** « Trois clusters. » répond à « Sur trois clusters. » Le dialogue s'enchaîne tout seul.
3. **« Oui, mais » plutôt que « non ».** Tobi ne recule jamais, il accepte et il aggrave.
4. **Une seule logique absurde par épisode, poussée jusqu'au bout.**
5. **Lire à voix haute.** Si une phrase ne se dit pas d'un souffle, la couper.
6. **Parler comme un étudiant,** pas comme un texte écrit.

## La densité de gags

- Un rire toutes les 8 à 10 secondes, soit au moins **quatre punchlines** par épisode.
- Répliques de 1 à 8 mots le plus souvent.
- La plus forte punchline arrive dans le dernier quart.
- Le mot qui fait rire arrive en dernier dans la phrase.

## Les titres

Le titre vend la situation, à la première personne si possible, en moins de 45 caractères. Un chiffre ou un paradoxe aide : « Trois heures pour un point-virgule ». Jamais de numéro d'épisode.

## Ce qui fait une bonne idée

- **Une situation que tout le monde connaît :** argent, bourse, notes, livraison, jeux vidéo, famille.
- **Un chiffre concret dans l'idée :** 340 € de pâtes, un 4 sur 20, 400 diapos.
- **Un plan qui se retourne contre Tobi :** la dernière info change le sens de tout ce qu'on a vu.
- **Trois paliers :** chaque étape aggrave la précédente, la troisième est la plus folle.
- **Une vraie fin :** une révélation, un rappel d'un autre épisode ou un moment sincère. Pas seulement une réplique sèche.

## Écrire pour la voix

La voix lit ce qui est écrit, et se trompe sur les sigles et certains mots. Les corrections générales sont dans `src/prononciation.js`. Pour un cas isolé, écrire `[mot affiché|mot prononcé]` dans la réplique : le sous-titre garde le premier, la voix dit le second.

Éviter les mots qui sonnent mal à l'oral, comme « annales ». Après une correction, utiliser « Refaire » sur la réplique : seule celle-ci est regénérée.

## Les recettes de punchline

- **Le chiffre qui tue :** « Par seconde ? » « Au total. »
- **La traduction sèche :** « C'est de la visibilité. » « Tu as douze visiteurs. »
- **La logique retournée :** « Donc je paie pour avoir faim. »
- **Le rebond absurde :** « Et si je facturais en baguettes ? »
- **Le rappel :** une phrase du début revient à la fin avec un autre sens.

## Rester sur la vie étudiante

Tobi est un étudiant en galère, en licence 3, en chambre CROUS. Les sommes restent à sa mesure : il compte en dizaines d'euros, pas en milliers. Chaque histoire part d'un souci réel : partiels, rendu, stage, APL, bourse, fin de mois, projet de groupe, resto U. La tech et les projets viennent par-dessus.

## Démarrer vite et varier

Les personnages sont déjà en place quand l'épisode commence, et la discussion démarre sur la première image. Une entrée par la porte coûte plusieurs secondes : la réserver aux rares épisodes où elle sert le gag, environ un sur cinq.

D'un épisode à l'autre, changer le lieu de départ, l'heure, le personnage qui ouvre et la chute.

## La mise en mouvement

Un épisode ne reste pas assis du début à la fin. Prévoir au moins un déplacement ou une action : se lever, aller au frigo, au miroir, à la fenêtre, s'asseoir sur le lit, taper au clavier. L'action doit servir le gag.

## Le moment de la journée

Chaque script choisit son ambiance dès la première ligne : `AMBIANCE jour` ou `AMBIANCE soir`. Elle doit servir l'histoire : un réveil se passe le jour, une nuit blanche le soir. Il est possible d'en changer en cours d'épisode.

## Le format du fichier

Une ligne = une instruction. Les lignes qui commencent par `#` sont des notes.

```text
# TITRE DE L'ÉPISODE
# Pitch : L'histoire en une phrase, affichée dans le Studio.
AMBIANCE soir
DIRECT TOBI travaille
DIRECT NOX travaille
DIRECT TOBI pivote
DIRECT NOX pivote
TABLEAU Ligne 1 | Ligne 2 | Ligne 3
FONDU direct

PLAN auto
TOBI dit (fier) Le site de la boulangerie est en ligne !
NOX dit (curieux) Sur quoi ?
INSERT Facture cloud | 847 € | Ce mois-ci
NOX dit (sec) Ouvre la facture.
PLAN gros NOX
NOX dit (resigne) J'appelle ta mère.
```

**Tons :** neutre, calme, curieux, fier, content, excite, illumine, ironique, sec, constat, punchline, gene, mauvaisefoi, resigne, triste, colere, surpris, panique, chuchote.

**Plans :** `PLAN auto`, `PLAN gros TOBI`, `PLAN gros NOX`, `PLAN clavier`, `PLAN lit`, `PLAN large`. Changer de plan à presque chaque réplique.

**Actions :** `marche <lieu>`, `court <lieu>`, `assis` (sur le lit), `leve`, `dort`, `travaille`, `pivote`, `pivote bureau`, `frigo`, `miroir`, `fenetre`, `tape <texte>`, `geste <nom>`, `mimique <nom>`.

**Lieux :** centre, tapis, fenetre, lit, bureau, armoire, frigo, miroir, couloir, porte.

**Pour commencer sans temps mort :** mettre `DIRECT` devant les placements du début.

## Les interdits

- Citer une vraie marque, chaîne ou personne en dehors de ce qui est prévu dans la bible. Les Aînés sont une parodie : rester sur des gags de caractère, sans affirmer de faits sur les vrais produits ou les entreprises.
- Humilier Tobi ou faire de lui un idiot.
- Expliquer une blague.
- Reprendre un gag ou un sujet d'une autre chaîne.
- Répliques de plus de 12 mots.

## Vérifier un script

- [ ] L'accroche fonctionne sans contexte.
- [ ] Chaque réplique répond à la précédente.
- [ ] Au moins quatre punchlines.
- [ ] Les phrases cultes tombent juste : l'histoire y mène.
- [ ] Celui qui parle est tourné vers la pièce : `pivote` au bureau, frigo refermé, jamais de dos pendant une réplique.
- [ ] Au moins un mouvement ou une action.
- [ ] Un ton sur chaque réplique.
- [ ] Personnages déjà en place, dialogue dès la première image.
- [ ] Personne l'un dans l'autre, assis sur un meuble ou à côté d'un personnage debout : vérifier chaque place à l'image.
- [ ] Durée vérifiée avec les vraies voix, entre 40 et 60 s.
- [ ] `tools/audit-cadrage.js` ne signale rien : celui qui parle est toujours à l'image.

## Consigne à donner à une autre IA

> Tu écris un épisode de la mini-sitcom Tobi et Nox. Respecte strictement la charte ci-jointe, personnages, phrases de la série, structure, densité de gags et format de fichier. Sujet : [sujet]. Lieu et actions : [lieu]. Rends uniquement le fichier de script, puis la liste de vérification remplie.
