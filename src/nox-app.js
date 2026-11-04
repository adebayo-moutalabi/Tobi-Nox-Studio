import { nox } from './cast.js';
import { startViewer } from './viewer.js';

startViewer({ cast: [nox()], backdrop: 'nuit', startView: 'face' });
