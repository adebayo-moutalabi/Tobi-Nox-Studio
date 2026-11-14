// Interrupteurs du projet. Une seule ligne à changer, puis `node build.mjs`.

// true : Tobi utilise les mouvements enregistrés (src/mocap.json, Quaternius, CC0).
// false : il revient à 100 % aux animations écrites dans src/clips.js. Rien d'autre à modifier.
export const RECORDED_MOTION = true;

// Mouvements naturels (session Fable v2). Mettre une ligne à false rend l'ancien comportement, puis `node build.mjs`.
export const NATURAL = {
  gaze: true,         // regard progressif, clignement au changement de cible, celui qui écoute hoche la tête
  stride: true,       // la foulée suit la vitesse réelle : les pieds ne glissent plus au démarrage ni à l'arrêt
  softStop: true,     // ralentit sur les 40 derniers centimètres au lieu de s'arrêter net
  weight: true,       // debout au repos, Tobi passe son poids d'une jambe sur l'autre
  idleVariants: true, // de temps en temps, un petit geste de repos (regarder ailleurs, se gratter, réfléchir)
  noxLean: true,      // Nox penche dans le sens de la marche, avec de l'inertie à l'arrêt
};
