import { Reflector } from 'three/addons/objects/Reflector.js';
import { tobi, nox, aine } from './cast.js';
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
import E09 from '../shorts/09_capable_de_tout.txt';
import E11 from '../shorts/11_je_commence_demain.txt';
import E12 from '../shorts/12_le_pitch.txt';
import E13 from '../shorts/13_premier_client.txt';
import E14 from '../shorts/14_petite_mise_a_jour.txt';
import E15 from '../shorts/15_levee_de_fonds.txt';
import E16 from '../shorts/16_audit_de_nox.txt';
import E17 from '../shorts/17_codex_contre_claude.txt';
import E18 from '../shorts/18_gemini_sait_tout.txt';
import E19 from '../shorts/19_conseil_des_aines.txt';
import E20 from '../shorts/20_miroir.txt';

startViewer({
  cast: [tobi(), nox(), aine('claude'), aine('codex'), aine('gemini')], backdrop: 'studio', startView: 'chambre', scenes: SCENES, duo: true,
  room: () => createRoom({ Reflector }), roomActions, onReady: (v) => mountStory(v, {
    '1. Mon serveur coûte plus cher que mon loyer': PILOTE,
    '2. Juste un site vitrine': E02,
    '3. Ma 17e idée de la semaine': E03,
    "4. Le logo avant l'idée": E04,
    '5. 42 vidéos business': E05,
    '6. Mon rendu est demain': E06,
    '7. Je révise juste 5 minutes': SHORT01,
    '8. Ma vie automatisée': E08,
    '9. Capable de tout': E09,
    '11. Je commence demain': E11,
    '12. Le pitch': E12,
    '13. Mon premier gros client': E13,
    '14. Une petite mise à jour': E14,
    '15. Ma levée de fonds': E15,
    '16. Claude Code audite Nox': E16,
    '17. Codex contre Claude Code': E17,
    '18. Gemini sait tout': E18,
    '19. Le conseil des Aînés': E19,
    '20. CEO dans le miroir': E20,
    "Le matin de l'examen": HISTOIRE,
  }),
});
