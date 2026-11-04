// Un ton de réplique pilote tout ensemble : la voix, le visage, le geste et la réaction de l'autre.
// Dans le script : NOX dit (sec) C'est une boulangerie, Tobi.
export const TONS = {
  neutre: { voix: '', visage: 'neutre' },
  calme: { voix: 'calmly', visage: 'neutre' },
  curieux: { voix: 'curious', visage: 'doute', ecoute: 'neutre' },
  fier: { voix: 'proudly', visage: 'joie', geste: 'montrer', ecoute: 'doute' },
  content: { voix: 'happily', visage: 'sourire' },
  excite: { voix: 'excited', visage: 'joie', geste: 'montrer', ecoute: 'doute' },
  illumine: { voix: 'excited', visage: 'surprise', geste: 'reflechir', ecoute: 'doute' },
  ironique: { voix: 'sarcastically', visage: 'doute', ecoute: 'sourire' },
  sec: { voix: 'deadpan', visage: 'neutre', geste: 'non', ecoute: 'doute' },
  constat: { voix: 'deadpan', visage: 'doute', geste: 'oui', ecoute: 'peur' },
  punchline: { voix: 'mischievously', visage: 'sourire', ecoute: 'tristesse' },
  gene: { voix: 'embarrassed', visage: 'peur', geste: 'gratter', ecoute: 'doute' },
  mauvaisefoi: { voix: 'defensively', visage: 'sourire', geste: 'epaules', ecoute: 'doute' },
  resigne: { voix: 'sighs', visage: 'tristesse', geste: 'consterne', ecoute: 'surprise' },
  triste: { voix: 'sad', visage: 'tristesse' },
  colere: { voix: 'angry', visage: 'colere', ecoute: 'peur' },
  surpris: { voix: 'surprised', visage: 'surprise' },
  panique: { voix: 'panicking', visage: 'peur', ecoute: 'surprise' },
  chuchote: { voix: 'whispers', visage: 'doute' },
};

// Consigne envoyée à ElevenLabs. Un ton inconnu du tableau est transmis tel quel.
export const voiceTag = (tone) => (tone ? (TONS[tone] ? TONS[tone].voix : tone) : '');
