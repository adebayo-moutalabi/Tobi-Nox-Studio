# Les voix de la série

Ce fichier garde la trace des voix utilisées. Les voix viennent du compte ElevenLabs de l'auteur et le choix reste enregistré dans son navigateur : il n'est pas dans le dépôt.

**Pour mettre ce tableau à jour :** dans le Studio, ouvrir Réglages, cliquer sur « Copier la liste de mes voix », puis coller le résultat ici.

| Personnage | Voix choisie | Ce qu'on cherche | État |
|---|---|---|---|
| Tobi | À renseigner | Jeune, vive, naturelle. Voix clonée de l'auteur prévue, ce qui permet de le reconnaître | À confirmer |
| Nox | À renseigner | Posée, légèrement mécanique, humour très sec, jamais froide | À renseigner |
| Claude Code | À renseigner | Calme, polie, prudente | À renseigner |
| Codex | Julien - Professional & Energetic, proposée | Rapide, sûre d'elle, un peu trop efficace | À choisir dans le Studio |
| Gemini | Manon, Claire ou Elia, proposées | Enthousiaste, rapide, encyclopédique | À choisir dans le Studio |

## Trouver une voix française

Dans le Studio, ouvrir Réglages, puis Voix, puis « Trouver des voix françaises ». Choisir le personnage et, si besoin, voix masculines ou féminines, puis cliquer sur « Chercher ».

- **Écouter :** joue l'extrait public de la voix, sans crédit.
- **Choisir :** ajoute la voix au compte ElevenLabs et la donne au personnage. Cette étape ne consomme pas de crédit, mais certaines offres limitent le nombre de voix.
- Dans les listes, les voix françaises du compte passent en premier et portent la mention « FR ».
- **Filtres :** voix masculines ou féminines, jeunes ou adultes, et un mot-clé comme « énergique » ou « calme ».
- **Changer de voix :** dès qu'une voix change, les anciennes répliques sont oubliées. « Tout recréer avec les voix choisies » refait tout l'épisode, même les répliques déjà créées. Le Studio annonce le coût et demande un second clic.

Pistes : Codex, une voix d'homme jeune, rapide et énergique. Gemini, une voix vive et enthousiaste, plutôt de femme pour bien la distinguer.

## Garder les voix sur la durée

- **Les fichiers audio créés sont à l'auteur.** « Télécharger les voix de cet épisode » range toutes les répliques dans un fichier ZIP. Pour les réutiliser sans ElevenLabs : Vidéo, puis « Importer mes propres voix ».
- **Une voix de la bibliothèque peut être retirée par son auteur.** Garder le ZIP de chaque épisode publié protège les vidéos déjà faites.
- **Pour les futurs épisodes,** une voix retirée devra être remplacée. Vérifier les conditions d'ElevenLabs pour les voix de la bibliothèque.
- **Pour ne plus dépendre d'ElevenLabs,** il faudra une autre solution de voix, à étudier plus tard.

## Créer les voix avec Voice Design

Dans ElevenLabs, ouvrir Voice Design, coller la description en anglais, puis écouter les essais avec la phrase de test. Garder la meilleure, puis la choisir dans le Studio.

| Personnage | Description à coller | Phrase de test |
|---|---|---|
| Tobi | Young French man, 21, broke university student with huge ambitions. Fast, lively and expressive voice, a bit cocky, quick to switch from pride to panic. Natural spoken French with a casual Paris accent, warm and funny, never theatrical. | Nox, aie la vision ! Cette fois, c'est la bonne idée, je te le jure ! |
| Nox | Small friendly robot assistant with a calm, soft and slightly synthetic voice. Speaks native French in short, precise sentences with deadpan dry humor. Never cold: caring underneath, like a patient best friend who has seen everything. | Tobi. Non. J'appelle ta mère. |
| Claude Code | French man in his early 30s with a calm, warm and reassuring voice. Speaks native French slowly and clearly, like a kind and honest older brother. Thoughtful, polite but natural, with gentle pauses before telling the truth. | Tobi, assieds-toi. On a regardé ton année. |
| Codex | Young French man, 22, overexcited startup intern. Fast, energetic and very confident voice, always slightly too pleased with himself. Native French, crisp and punchy, speaks like he already finished the job before you asked. | C'est fait. J'ai aussi refait tout le site. |
| Gemini | Young French woman, 25, brilliant top-of-the-class student who has read everything. Bright, enthusiastic and fast voice, very articulate, a little know-it-all but cheerful. Native French, clear and expressive. | J'ai lu tous tes mails. Et j'ai fait un résumé en podcast ! |

Conseils :

- Garder la même voix pour toute la série, puis la noter dans le tableau du haut.
- Si l'accent sonne anglais, ajouter « native French speaker, no English accent » à la description.
- Les essais peuvent consommer des crédits selon l'offre ElevenLabs.

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
