import { Reflector } from 'three/addons/objects/Reflector.js';
import { tobi, nox } from './cast.js';
import { startViewer } from './viewer.js';
import { SCENES } from './scenes.js';
import { createRoom } from './room.js';
import { roomActions } from './room-actions.js';
import { mountStory } from './story.js';
import HISTOIRE from '../histoire.txt';

startViewer({
  cast: [tobi(), nox()], backdrop: 'studio', startView: 'chambre', scenes: SCENES, duo: true,
  room: () => createRoom({ Reflector }), roomActions, onReady: (v) => mountStory(v, HISTOIRE),
});
