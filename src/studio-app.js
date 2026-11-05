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
import E21 from '../shorts/21_trois_heures_de_bug.txt';
import E22 from '../shorts/22_mot_de_passe.txt';
import E23 from '../shorts/23_entretien_en_visio.txt';
import E24 from '../shorts/24_frigo_intelligent.txt';
import E25 from '../shorts/25_routine_de_millionnaire.txt';
import E26 from '../shorts/26_le_loyer.txt';
import E27 from '../shorts/27_grand_menage.txt';
import E28 from '../shorts/28_mail_a_maman.txt';
import E29 from '../shorts/29_la_demo.txt';
import E30 from '../shorts/30_claude_refuse_mon_devoir.txt';
import E31 from '../shorts/31_codex_a_repondu_au_prof.txt';
import E32 from '../shorts/32_gemini_prepare_mon_rencard.txt';
import E33 from '../shorts/33_quarante_abonnements_ia.txt';
import E34 from '../shorts/34_ma_mere_a_vu_mon_linkedin.txt';
import E35 from '../shorts/35_reunion_sans_moi.txt';
import E36 from '../shorts/36_je_deviens_influenceur.txt';
import E37 from '../shorts/37_le_wifi_a_coupe.txt';
import E38 from '../shorts/38_mes_apl_ont_finance_ma_startup.txt';
import E39 from '../shorts/39_j_ai_revise_le_mauvais_partiel.txt';
import E40 from '../shorts/40_chef_de_projet_de_groupe.txt';
import E41 from '../shorts/41_neuf_jours_de_pates.txt';
import E42 from '../shorts/42_mon_prof_a_detecte_l_ia.txt';
import E43 from '../shorts/43_stage_a_zero_euro.txt';
import E44 from '../shorts/44_le_serveur_sous_le_lit.txt';
import E45 from '../shorts/45_expose_de_demain.txt';
import E46 from '../shorts/46_340_euros_de_pates_livrees.txt';
import E47 from '../shorts/47_j_ai_conteste_mon_4_sur_20.txt';
import E48 from '../shorts/48_j_ai_vendu_mon_sweat_en_ligne.txt';
import E49 from '../shorts/49_j_ai_loue_mon_compte_de_films.txt';
import E50 from '../shorts/50_claude_devait_me_reveiller.txt';
import E51 from '../shorts/51_codex_a_eu_mon_stage.txt';

startViewer({
  cast: [tobi(), nox(), aine('claude'), aine('codex'), aine('gemini')], backdrop: 'studio', startView: 'chambre', scenes: SCENES, duo: true,
  room: () => createRoom({ Reflector }), roomActions, onReady: (v) => mountStory(v, {
    '1. Mon serveur coûte plus cher que mon loyer': PILOTE,
    "2. Un site à 150 € m'a coûté 94 heures": E02,
    "3. J'ai eu 17 idées avant mardi": E03,
    "4. J'ai fait le logo avant d'avoir une idée": E04,
    '5. 42 vidéos sur la discipline, zéro action': E05,
    '6. Rendu demain, 3 pages sur 60': E06,
    "7. « Juste 5 minutes », le mensonge de l'étudiant": SHORT01,
    "8. J'ai automatisé ma mère": E08,
    "9. Mon IA croit en moi, chiffres à l'appui": E09,
    '11. Je commence demain, promis': E11,
    "12. L'appli qui te dit quand manger": E12,
    "13. J'ai dépensé l'argent de mon premier client": E13,
    '14. Une petite mise à jour a tout cassé': E14,
    "15. Mon investisseur, c'était le boulanger": E15,
    '16. Une IA a audité mon IA : 412 pages': E16,
    '17. Codex a supprimé tous mes clients': E17,
    '18. Gemini a lu tous mes mails': E18,
    '19. Trois IA ont jugé ma vie': E19,
    '20. Je suis CEO de mon miroir': E20,
    '21. Trois heures pour un point-virgule': E21,
    '22. Mon IA a trouvé mon mot de passe en 0,4 s': E22,
    '23. Entretien de stage en caleçon': E23,
    '24. Mon frigo intelligent contient un yaourt': E24,
    "25. Routine de millionnaire : j'ai tenu 11 minutes": E25,
    "26. Il me manque 180 € pour le loyer": E26,
    "27. J'ai demandé à Codex de ranger mon PC": E27,
    '28. Une IA a écrit à ma mère': E28,
    "29. J'ai présenté BaguetteGPT à des IA": E29,
    "30. Claude Code veut la permission de m'aider": E30,
    '31. Codex a répondu à mon prof': E31,
    '32. Gemini a préparé mon rencard': E32,
    "33. J'ai 12 abonnements d'IA et zéro euro": E33,
    '34. Ma mère a vu mon LinkedIn': E34,
    '35. Mes IA ont fait une réunion sans moi': E35,
    '36. Je suis influenceur avec 12 abonnés': E36,
    '37. Le wifi a coupé, les IA paniquent': E37,
    "38. Mes APL ont financé ma start-up": E38,
    "39. J'ai révisé le mauvais partiel": E39,
    "40. Je suis le chef d'un groupe de fantômes": E40,
    "41. Je mange des pâtes depuis 9 jours": E41,
    "42. Mon prof a détecté l'IA dans mon devoir": E42,
    "43. Mon stage à 0 € m'a fait Head of Growth": E43,
    "44. J'ai caché un serveur sous mon lit": E44,
    "45. Gemini a fait mon exposé en 400 diapos": E45,
    "46. J'ai dépensé 340 € en pâtes livrées": E46,
    "47. J'ai contesté mon 4 sur 20": E47,
    "48. J'ai vendu mon sweat en ligne": E48,
    "49. J'ai loué mon compte de films à 400 personnes": E49,
    "50. Claude Code devait me réveiller": E50,
    "51. Codex a eu mon stage": E51,
    "Le matin de l'examen": HISTOIRE,
  }),
});
