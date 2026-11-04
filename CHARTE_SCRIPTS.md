# Charte d'écriture des scripts Tobi et Nox

Cette charte suffit pour écrire un épisode, seul, à plusieurs ou avec n'importe quelle IA. Elle complète `BIBLE.md`.

## L'épisode en une phrase

Tobi se raconte une grande vision, Nox le ramène à la réalité, et Tobi trouve une façon encore plus absurde de continuer.

## Les personnages à l'écrit

**Tobi** parle vite, avec enthousiasme et mauvaise foi. Il croit sincèrement à ce qu'il dit. Il n'est jamais bête, il rebondit toujours.

**Nox** parle peu, calmement, avec un humour sec. Il pique sans humilier et reste du côté de Tobi. Ses répliques font rarement plus de six mots.

**Les Aînés** (Chat et Claude pour l'instant) viennent juger ou se contredire : Chat affirme tout, Claude nuance tout. À n'utiliser que dans les épisodes prévus.

## Les phrases de la série

Ce sont les rendez-vous du public. À valider par l'auteur.

| Qui | Phrase | Quand | Fréquence |
|---|---|---|---|
| Tobi | **« Nox. Aie la vision. »** | Quand il est coincé et veut convaincre | Presque chaque épisode |
| Nox | **« J'appelle ta mère. »** | Chute, quand Tobi va trop loin | Un épisode sur deux ou trois |
| Nox | **« Projet numéro dix-huit. »** | Dès qu'une nouvelle idée arrive, le numéro monte | Quand Tobi lance une idée |
| Tobi | **« C'est un investissement. »** | Pour justifier une dépense | De temps en temps |
| Nox | **« Tobi. Non. »** | Avant même la fin d'une idée | De temps en temps |

Règles : jamais plus de deux phrases cultes par épisode, et jamais deux fois la même chute d'affilée. Le plaisir vient de les attendre, et parfois de les détourner : Tobi peut dire « J'appelle ma mère » avant Nox.

## La structure, en 40 à 60 secondes

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

## Les recettes de punchline

- **Le chiffre qui tue :** « Par seconde ? » « Au total. »
- **La traduction sèche :** « C'est de la visibilité. » « Tu as douze visiteurs. »
- **La logique retournée :** « Donc je paie pour avoir faim. »
- **Le rebond absurde :** « Et si je facturais en baguettes ? »
- **Le rappel :** une phrase du début revient à la fin avec un autre sens.

## La mise en mouvement

Un épisode ne reste pas assis du début à la fin. Prévoir au moins un déplacement ou une action : se lever, aller au frigo, au miroir, à la fenêtre, s'asseoir sur le lit, taper au clavier. L'action doit servir le gag.

## Le format du fichier

Une ligne = une instruction. Les lignes qui commencent par `#` sont des notes.

```text
# TITRE DE L'ÉPISODE
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

- Citer une vraie marque, chaîne ou personne en dehors de ce qui est prévu dans la bible.
- Humilier Tobi ou faire de lui un idiot.
- Expliquer une blague.
- Reprendre un gag ou un sujet d'une autre chaîne.
- Répliques de plus de 12 mots.

## Vérifier un script

- [ ] L'accroche fonctionne sans contexte.
- [ ] Chaque réplique répond à la précédente.
- [ ] Au moins quatre punchlines.
- [ ] Une phrase culte, deux au maximum.
- [ ] Au moins un mouvement ou une action.
- [ ] Un ton sur chaque réplique.
- [ ] Durée estimée entre 40 et 60 s (environ 2,5 mots par seconde).

## Consigne à donner à une autre IA

> Tu écris un épisode de la mini-sitcom Tobi et Nox. Respecte strictement la charte ci-jointe, personnages, phrases de la série, structure, densité de gags et format de fichier. Sujet : [sujet]. Lieu et actions : [lieu]. Rends uniquement le fichier de script, puis la liste de vérification remplie.
