// Voix d'essai : la synthèse vocale du navigateur, gratuite, pour écouter une histoire sans clé ni crédit.
// Elle sert seulement à la lecture : la vidéo finale n'utilise jamais ces voix.
const TIMBRES = {
  tobi: { pitch: 1.15, rate: 1.15 }, nox: { pitch: 0.6, rate: 1.1 }, claude: { pitch: 1, rate: 1 },
  codex: { pitch: 0.8, rate: 1.25 }, gemini: { pitch: 1.4, rate: 1.15 }, centi: { pitch: 1.7, rate: 1.4 },
};
const synth = typeof speechSynthesis === 'undefined' ? null : speechSynthesis;
const homme = (x) => /Paul|Thomas|Henri|Claude|Remy|Rémy|Nicolas/i.test(x.name);
const francaises = () => (synth?.getVoices().filter((x) => x.lang.toLowerCase().startsWith('fr')) || []).sort((a, b) => homme(b) - homme(a));

export const voixEssai = {
  dit(who, text) {
    if (!synth) return null;
    return new Promise((done) => {
      const u = new SpeechSynthesisUtterance(text), liste = francaises(), rangVoix = Object.keys(TIMBRES).indexOf(who);
      u.lang = 'fr-FR'; Object.assign(u, TIMBRES[who] || {});
      if (liste.length) u.voice = liste[Math.max(rangVoix, 0) % liste.length];
      u.onend = done; u.onerror = done;
      setTimeout(done, text.length * 150 + 2000); // certains navigateurs n'annoncent jamais la fin
      synth.speak(u);
    });
  },
  stop() { synth?.cancel(); },
};
