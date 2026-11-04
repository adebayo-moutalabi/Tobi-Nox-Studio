import { Reflector } from 'three/addons/objects/Reflector.js';
import { tobi, nox } from './cast.js';
import { startViewer } from './viewer.js';
import { SCENES } from './scenes.js';
import { createRoom } from './room.js';
import { roomActions } from './room-actions.js';
import { mountStory } from './story.js';
import HISTOIRE from '../histoire.txt';
import PILOTE from '../shorts/00_pilote_serveur.txt';
import SHORT01 from '../shorts/01_cinq_minutes.txt';
import E02 from '../shorts/02_site_vitrine.txt';
import E03 from '../shorts/03_dix_septieme_idee.txt';
import E04 from '../shorts/04_logo_avant_idee.txt';
import E05 from '../shorts/05_quarante_deux_videos.txt';
import E06 from '../shorts/06_rendu_demain.txt';
import E08 from '../shorts/08_vie_automatisee.txt';

startViewer({
  cast: [tobi(), nox()], backdrop: 'studio', startView: 'chambre', scenes: SCENES, duo: true,
  room: () => createRoom({ Reflector }), roomActions, onReady: (v) => mountStory(v, {
    '1. Mon serveur coûte plus cher que mon loyer': PILOTE,
    '2. Juste un site vitrine': E02,
    '3. Ma 17e idée de la semaine': E03,
    "4. Le logo avant l'idée": E04,
    '5. 42 vidéos business': E05,
    '6. Mon rendu est demain': E06,
    '7. Je révise juste 5 minutes': SHORT01,
    '8. Ma vie automatisée': E08,
    "Le matin de l'examen": HISTOIRE,
  }),
});
