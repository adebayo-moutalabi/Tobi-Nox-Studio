# Les voix de la série

Ce fichier garde la trace des voix utilisées. Les voix viennent du compte ElevenLabs de l'auteur et le choix reste enregistré dans son navigateur : il n'est pas dans le dépôt.

**Pour mettre ce tableau à jour :** dans le Studio, ouvrir Réglages, cliquer sur « Copier la liste de mes voix », puis coller le résultat ici.

| Personnage | Voix choisie | Ce qu'on cherche | État |
|---|---|---|---|
| Tobi | À renseigner | Jeune, vive, naturelle. Voix clonée de l'auteur prévue, ce qui permet de le reconnaître | À confirmer |
| Nox | À renseigner | Posée, légèrement mécanique, humour très sec, jamais froide | À renseigner |
| Claude Code | À renseigner | Calme, polie, prudente | À renseigner |
| Codex | À renseigner | Rapide, sûre d'elle, un peu trop efficace | À renseigner |
| Gemini | À renseigner | Enthousiaste, rapide, encyclopédique | À renseigner |

## Trouver une voix française

Dans le Studio, ouvrir Réglages, puis Voix, puis « Trouver des voix françaises ». Choisir le personnage et, si besoin, voix masculines ou féminines, puis cliquer sur « Chercher ».

- **Écouter :** joue l'extrait public de la voix, sans crédit.
- **Choisir :** ajoute la voix au compte ElevenLabs et la donne au personnage. Cette étape ne consomme pas de crédit, mais certaines offres limitent le nombre de voix.
- Dans les listes, les voix françaises du compte passent en premier et portent la mention « FR ».

Pistes : Codex, une voix d'homme jeune, rapide et énergique. Gemini, une voix vive et enthousiaste, plutôt de femme pour bien la distinguer.

## Les règles

- Prendre des voix françaises natives et professionnelles, sans accent anglais : l'accent de la voix d'origine reste.
- Une voix par personnage, gardée pour toute la série.
- Noter ici tout changement de voix, avec sa date et sa raison.

## Le réglage

- **Modèle :** `Expressif (v4)` par défaut dans le Studio. Il comprend les tons entre parenthèses des scripts. `Stable, sans ton` ignore ces tons.
- **Tons :** ils sont définis dans `src/tones.js`. ElevenLabs les suit sans garantie, il faut écouter le résultat.
- **Coût :** les répliques déjà générées restent dans le navigateur et ne sont pas refacturées.

## La prononciation

La voix se trompait sur certains mots : « Aie la vision » devenait « A. I. la vision ». `src/prononciation.js` envoie à la voix une écriture phonétique, sans toucher au sous-titre. « Aie » est envoyé sous la forme « Est », qui se dit « è ». « Ait » et « Haie » ont échoué à l'écoute. L'écriture se change et s'écoute dans Réglages, Voix. Cas isolé : `[affiché|prononcé]` dans le script. Ces réglages restent à confirmer à l'écoute.

## Historique

| Date | Changement |
|---|---|
| 5 novembre 2026 | Prononciation corrigée pour « Aie la vision » et les sigles, « annales » retiré du script. |
| 5 novembre 2026 | Chat est remplacé par Codex : sa voix est à choisir de nouveau. |
| Novembre 2026 | Demande de l'auteur : des voix françaises pro, adaptées à la personnalité de chacun. |
| 7 novembre 2026 | Les voix de Codex et Gemini sonnent anglaises : recherche de voix françaises ajoutée au Studio. |

## Économiser les crédits

Écouter dans le Studio avec les voix d'essai ne coûte rien. Les crédits ne partent qu'après confirmation, pour la vidéo finale ou les vraies voix. Les répliques déjà créées sont réutilisées. Changer une réplique, une voix ou le modèle recrée seulement ce qui a changé.

## Ne plus dépendre d'ElevenLabs

1. **Garder les fichiers :** les vidéos publiées et les répliques déjà créées restent utilisables, sous réserve des conditions du compte. Les répliques ne vivent que dans le navigateur : il faut les sauvegarder à part.
2. **Posséder la source :** pour garder une voix sans le service, il faut une voix dont on a les droits, comme des enregistrements de l'auteur ou d'un comédien sous contrat.
3. **Passer à un modèle local :** tester un modèle ouvert au clonage, comme Chatterbox, avec ces enregistrements. Vérifier sa licence et sa qualité en français avant de changer.
4. **Vérifier les conditions :** ne pas entraîner un modèle sur des sorties ElevenLabs sans avoir relu leurs conditions à jour.
5. **Brancher le Studio :** « Importer mes propres voix » accepte déjà des fichiers audio, réplique par réplique.
