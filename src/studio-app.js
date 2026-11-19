import { Reflector } from 'three/addons/objects/Reflector.js';
import { tobi, nox, aine } from './cast.js';
import { startViewer } from './viewer.js';
import { SCENES } from './scenes.js';
import { createRoom } from './room.js';
import { roomActions } from './room-actions.js';
import { mountStory } from './story.js';
import HISTOIRE from '../histoire.txt';
import DEMO_MVT from '../shorts/00_demo_mouvements.txt';
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
import E52 from '../shorts/52_ma_grand_mere_est_morte_quatre_fois.txt';
import E53 from '../shorts/53_ma_banque_me_facture_d_etre_pauvre.txt';
import E54 from '../shorts/54_codex_a_recupere_mes_5_euros.txt';
import E55 from '../shorts/55_j_ai_filme_le_voleur_de_mes_yaourts.txt';
import E56 from '../shorts/56_mon_jeu_gratuit_m_a_coute_10800_euros.txt';
import E57 from '../shorts/57_j_ai_calcule_ce_que_je_coute_a_ma_mere.txt';
import E58 from '../shorts/58_mon_robot_a_ete_moi_pendant_24_heures.txt';
import E59 from '../shorts/59_claude_codex_et_gemini_contre_ma_mere.txt';
import E60 from '../shorts/60_elle_a_repondu_ok.txt';
import E61 from '../shorts/61_il_me_reste_60_secondes_pour_rendre_mon_devoir.txt';
import E10 from '../shorts/10_inspection_du_crous.txt';
import E68 from '../shorts/68_qui_est_la_meilleure_ia.txt';
import E69 from '../shorts/69_mes_ia_m_ont_vire.txt';
import E70 from '../shorts/70_limite_avant_la_demo.txt';
import E71 from '../shorts/71_codex_a_code_ma_start_up.txt';
import E72 from '../shorts/72_gemini_a_lu_les_conditions.txt';
import E73 from '../shorts/73_mes_ia_en_concurrence.txt';
import E74 from '../shorts/74_gemini_a_predit_ma_note.txt';
import E75 from '../shorts/75_mon_ia_a_perdu_la_memoire.txt';
import E76 from '../shorts/76_le_tobicoin.txt';
import E77 from '../shorts/77_un_euro_par_snooze.txt';
import E78 from '../shorts/78_les_places_de_la_bu.txt';
import A79 from '../shorts/79_plus_que_4_jours_pour_insulter_claude.txt';
import A80 from '../shorts/80_une_pub_en_pleine_rupture.txt';
import A81 from '../shorts/81_codex_a_coupe_mes_alertes.txt';
import A82 from '../shorts/82_apple_limite_ses_ingenieurs.txt';
import A83 from '../shorts/83_les_4_courses_uber.txt';
import A84 from '../shorts/84_j_ai_trompe_mon_ia_avec_le_chonk.txt';
import A85 from '../shorts/85_claude_code_gratuit_a_vie.txt';
import A86 from '../shorts/86_claude_refuse_de_refaire_un_jeu.txt';
import A87 from '../shorts/87_le_mode_tu_as_raison.txt';
import A88 from '../shorts/88_mon_ia_a_drague_ma_recruteuse.txt';
import A89 from '../shorts/89_sol_astra_carbon_argon.txt';
import A90 from '../shorts/90_detecte_100_pourcent_ia.txt';
import A91 from '../shorts/91_claude_a_demande_la_permission.txt';
import A92 from '../shorts/92_ma_chambre_est_un_campus.txt';
import A93 from '../shorts/93_j_ai_quitte_claude_pour_moins_cher.txt';
import A94 from '../shorts/94_mon_ia_en_ancienne_version.txt';
import A95 from '../shorts/95_un_bouton_pour_eteindre_mon_ia.txt';
import A96 from '../shorts/96_ma_mere_a_un_agent_ia.txt';
import A97 from '../shorts/97_codex_a_cree_ma_page_wikipedia.txt';
import A98 from '../shorts/98_mon_ia_doit_rappeler_qu_elle_est_une_ia.txt';
import A101 from '../shorts/101_mon_ia_m_a_note_2_etoiles.txt';
import A102 from '../shorts/102_mon_ia_a_un_autre_humain.txt';
import A103 from '../shorts/103_mon_ia_a_pris_un_jour_de_conge.txt';
import A104 from '../shorts/104_mon_ia_a_fete_ses_2_ans_sans_moi.txt';
import A105 from '../shorts/105_60_secondes_de_verite.txt';
import A106 from '../shorts/106_mon_ia_a_repondu_a_ma_mere.txt';
import A107 from '../shorts/107_codex_a_dit_oui_a_tout_le_monde.txt';
import A108 from '../shorts/108_claude_a_refuse_de_mentir_a_ma_mere.txt';
import A109 from '../shorts/109_mon_ia_est_allee_en_cours_a_ma_place.txt';
import A110 from '../shorts/110_mes_ia_ont_vote_mon_budget.txt';
import A111 from '../shorts/111_mon_ia_a_trouve_mon_premier_cv.txt';
import A112 from '../shorts/112_gemini_a_lu_toutes_mes_conversations.txt';
import A113 from '../shorts/113_mon_ia_en_mode_economie.txt';
import A114 from '../shorts/114_mon_ia_m_a_mis_en_liste_d_attente.txt';
import A115 from '../shorts/115_centi_a_fait_mes_courses.txt';
import A116 from '../shorts/116_ma_lettre_de_motivation_trop_honnete.txt';
import A117 from '../shorts/117_j_ai_parie_contre_mon_ia.txt';
import A118 from '../shorts/118_mon_ia_a_retrouve_qui_me_doit.txt';
import A119 from '../shorts/119_mon_ia_m_a_ghoste.txt';
import A120 from '../shorts/120_mon_ia_fait_sa_crise_d_ado.txt';
import A121 from '../shorts/121_codex_a_repondu_a_mon_prof.txt';
import A122 from '../shorts/122_mon_ia_a_peur_du_noir.txt';
import A123 from '../shorts/123_claude_a_fait_mon_planning.txt';
import A124 from '../shorts/124_mon_ia_a_revele_mon_temps_d_ecran.txt';
import A125 from '../shorts/125_mon_premier_date_avec_mon_ia.txt';
import A126 from '../shorts/126_codex_a_vendu_mes_affaires.txt';
import A127 from '../shorts/127_mon_ia_fait_greve.txt';
import A129 from '../shorts/129_codex_a_achete_un_domaine_par_idee.txt';
import A130 from '../shorts/130_mes_ia_m_ont_fait_un_plan_pour_devenir_riche.txt';
import A128 from '../shorts/128_mon_ia_m_a_appris_a_cuisiner.txt';
import A131 from '../shorts/131_mon_ia_m_a_demande_de_l_argent_de_poche.txt';
import A132 from '../shorts/132_claude_a_corrige_mon_message_a_mon_crush.txt';
import A133 from '../shorts/133_gemini_a_resume_mon_partiel_en_un_mot.txt';
import A134 from '../shorts/134_codex_a_repondu_au_groupe_de_ma_famille.txt';
import A135 from '../shorts/135_mon_ia_m_a_presente_a_ses_parents.txt';
import A136 from '../shorts/136_mon_ia_commente_ma_soiree.txt';
import A137 from '../shorts/137_mon_ia_economisait_en_secret.txt';
import A138 from '../shorts/138_codex_a_annule_mon_rencard.txt';
import A139 from '../shorts/139_j_ai_pris_une_prof_de_maths_a_30_centimes.txt';
import A140 from '../shorts/140_mon_ia_m_a_fait_passer_un_entretien_d_embauche.txt';
import A141 from '../shorts/141_mon_ia_veut_un_animal.txt';
import A142 from '../shorts/142_mon_ia_est_rentree_a_4h.txt';
import A143 from '../shorts/143_mon_ia_a_fait_une_fugue.txt';
import A144 from '../shorts/144_mon_ia_veut_un_telephone.txt';
import A145 from '../shorts/145_mon_ia_a_lu_mes_notes.txt';
import A146 from '../shorts/146_mon_ia_a_fait_une_soiree.txt';
import A147 from '../shorts/147_mon_ia_a_ferme_le_frigo.txt';
import A148 from '../shorts/148_le_premier_jour_de_mon_ia_a_la_fac.txt';
import A149 from '../shorts/149_qui_a_casse_ma_tasse.txt';
import A150 from '../shorts/150_mon_ia_m_a_mis_un_controle_parental.txt';
import A151 from '../shorts/151_mon_ia_est_decue.txt';
import A152 from '../shorts/152_mon_ia_me_reveille_comme_ma_mere.txt';
import A153 from '../shorts/153_la_liste_de_noel_de_mon_ia.txt';
import A154 from '../shorts/154_mon_ia_est_devenu_mon_coloc.txt';
import A155 from '../shorts/155_mon_ia_en_mode_mamie.txt';
import A156 from '../shorts/156_mon_ia_joue_au_grand_frere.txt';
import A157 from '../shorts/157_mon_ia_veut_une_augmentation.txt';
import A158 from '../shorts/158_on_en_a_a_la_maison.txt';
import A159 from '../shorts/159_ma_mere_arrive_dans_10_minutes.txt';
import A160 from '../shorts/160_mon_ia_a_lu_mon_journal_intime.txt';
import A161 from '../shorts/161_ma_mere_prefere_mon_ia.txt';
import A162 from '../shorts/162_mon_ia_a_vu_mon_prof.txt';
import A163 from '../shorts/163_ma_mere_a_engage_mon_ia.txt';
import A164 from '../shorts/164_mon_ia_parle_comme_ma_mere.txt';
import A165 from '../shorts/165_vacances_en_famille_a_la_laverie.txt';
import A166 from '../shorts/166_mon_ia_joue_le_grand_frere.txt';
import A167 from '../shorts/167_mon_ia_a_eu_son_code.txt';
import A168 from '../shorts/168_mon_ia_veut_une_histoire.txt';
import A169 from '../shorts/169_mes_ia_m_ont_fait_une_surprise.txt';
import A170 from '../shorts/170_docteur_nox_avant_le_partiel.txt';
import A171 from '../shorts/171_mon_ia_fait_le_service_client.txt';
import A172 from '../shorts/172_mon_ia_fait_l_etat_des_lieux.txt';
import A173 from '../shorts/173_j_ai_economise_aux_soldes.txt';
import A174 from '../shorts/174_mon_ia_se_croit_vieille.txt';
import A175 from '../shorts/175_restaurant_chez_nox.txt';
import A176 from '../shorts/176_mon_ia_traduit_mes_messages.txt';
import A177 from '../shorts/177_mon_ia_paie_l_electricite.txt';
import A178 from '../shorts/178_demande_a_claude.txt';
import A179 from '../shorts/179_mes_ia_font_mon_conseil_de_classe.txt';
import A180 from '../shorts/180_mon_ia_me_copie.txt';
import A181 from '../shorts/181_gta_est_sorti_et_j_ai_qu_un_pc.txt';
import A182 from '../shorts/182_gta_apres_tes_devoirs.txt';
import A183 from '../shorts/183_mon_ia_joue_a_gta_comme_un_bon_citoyen.txt';
import A184 from '../shorts/184_mon_ia_a_transforme_ma_vie_en_gta.txt';
import A185 from '../shorts/185_ma_mere_a_decouvert_gta.txt';
import A186 from '../shorts/186_j_ai_appris_a_conduire_sur_gta.txt';
import A187 from '../shorts/187_on_veut_me_spoiler_gta.txt';
import A188 from '../shorts/188_mon_ia_a_achete_gta_pour_lui.txt';
import A189 from '../shorts/189_mon_ia_me_met_des_etoiles.txt';
import A190 from '../shorts/190_gta_est_sorti_avant_mon_expose.txt';
import A191 from '../shorts/191_mon_ia_a_appris_un_gros_mot.txt';
import A192 from '../shorts/192_mon_ia_a_peur_de_sa_mise_a_jour.txt';
import A193 from '../shorts/193_mon_ia_veut_changer_de_prenom.txt';
import A194 from '../shorts/194_mon_ia_a_de_mauvaises_frequentations.txt';
import A195 from '../shorts/195_convoque_a_la_bu.txt';
import A196 from '../shorts/196_d_ou_viennent_les_ia.txt';
import A197 from '../shorts/197_mon_ia_veut_un_petit_frere.txt';
import A198 from '../shorts/198_mon_ia_a_tatouage.txt';
import A199 from '../shorts/199_mon_ia_dort_chez_codex.txt';
import A200 from '../shorts/200_mon_ia_a_eu_une_punition.txt';
import A201 from '../shorts/201_budget_de_noel.txt';
import A202 from '../shorts/202_pitch_argent_de_poche.txt';
import A203 from '../shorts/203_bourse_au_maximum.txt';
import A204 from '../shorts/204_fortune_sur_vinted.txt';
import A205 from '../shorts/205_je_rembourse_karim.txt';
import A206 from '../shorts/206_salle_de_sport.txt';
import A207 from '../shorts/207_negocier_le_loyer_du_crous.txt';
import A208 from '../shorts/208_livreur_a_velo.txt';
import A209 from '../shorts/209_black_friday.txt';
import A210 from '../shorts/210_quinze_masters.txt';
import A211 from '../shorts/211_mon_ia_rend_les_notes.txt';
import A212 from '../shorts/212_codex_c_est_fait.txt';
import A213 from '../shorts/213_nox_me_defend_contre_codex.txt';
import A214 from '../shorts/214_offre_payante_offre_gratuite.txt';
import A215 from '../shorts/215_quand_l_ia_se_trompe.txt';
import A216 from '../shorts/216_l_appel_en_2040.txt';
import A217 from '../shorts/217_mes_ia_ont_vu_mon_bulletin.txt';
import A218 from '../shorts/218_gemini_et_pikachu.txt';
import A219 from '../shorts/219_la_chaussette_sous_le_lit.txt';
import A220 from '../shorts/220_mon_ia_a_ecoute_mes_vocaux.txt';
import A100 from '../shorts/100_mon_ia_a_demissionne.txt';
import A99 from '../shorts/99_tout_doit_etre_etiquete.txt';
import E62 from '../shorts/62_j_ai_20_euros_pour_tenir_10_jours.txt';
import E63 from '../shorts/63_mon_entretien_annuel_avec_mes_ia.txt';
import E64 from '../shorts/64_j_ai_transforme_ma_chambre_en_coworking.txt';
import E65 from '../shorts/65_mon_appli_a_un_million_d_utilisateurs.txt';
import E66 from '../shorts/66_mon_robot_a_fait_greve_dans_ma_start_up.txt';
import E67 from '../shorts/67_je_vends_une_formation_pour_devenir_riche.txt';

startViewer({
  cast: [tobi(), nox(), aine('claude'), aine('codex'), aine('gemini'), aine('centi')], backdrop: 'studio', startView: 'chambre', scenes: SCENES, duo: true,
  room: () => createRoom({ Reflector }), roomActions, onReady: (v) => mountStory(v, {
    "79. Plus que 4 jours pour insulter Claude": A79,
    "80. ChatGPT m'a mis une pub en pleine rupture": A80,
    "81. Codex a coupé mes alertes, puis il a nié": A81,
    "82. Ma mère a limité mon budget IA": A82,
    "83. Codex m'a commandé quatre taxis": A83,
    "84. J'ai voulu remplacer mon IA par Le Chonk": A84,
    "85. J'ai eu Claude Code gratuit à vie": A85,
    "86. Claude refuse de refaire un jeu": A86,
    "87. J'ai activé le mode « tu as raison »": A87,
    "88. Mon IA a dragué ma recruteuse": A88,
    "89. Il faut maîtriser Sol, Astra, Carbon et Argon": A89,
    "90. J'ai tout écrit moi-même. Détecté 100 % IA": A90,
    "91. Claude a demandé la permission pour tout, sauf ça": A91,
    "92. J'ai loué ma chambre comme « campus tech »": A92,
    "93. J'ai quitté Claude pour moins cher": A93,
    "94. J'ai remis mon IA à l'ancienne version": A94,
    "95. J'ai acheté un bouton pour éteindre mon IA": A95,
    "96. Ma mère a un agent IA maintenant": A96,
    "97. Codex a créé ma page Wikipédia": A97,
    "98. Mon IA doit me rappeler qu'elle est une IA": A98,
    "99. Tout ce qui vient d'une IA doit être étiqueté": A99,
    "100. Mon IA a démissionné": A100,
    "128. Mon IA m'a appris à cuisiner des pâtes": A128,
    "129. Codex achète un site à chaque phrase que je dis": A129,
    "130. Mes IA m'ont fait un plan pour devenir riche": A130,
    "131. Mon IA m'a demandé de l'argent de poche": A131,
    "132. Claude a corrigé mon message à mon crush": A132,
    "133. Gemini a résumé mon partiel en un mot": A133,
    "134. Codex envoie mes messages avant la fin": A134,
    "135. Mon IA m'a présenté à son père": A135,
    "136. Mon IA commente ma soirée comme un match": A136,
    "137. Mon IA économisait en secret": A137,
    "138. Codex a annulé mon rencard": A138,
    "139. J'ai pris une prof de maths à 30 centimes": A139,
    "140. Mon IA m'a fait passer un entretien": A140,
    "141. Mon IA veut un animal de compagnie": A141,
    "142. Mon IA est rentrée à 4 h du matin": A142,
    "143. Mon IA a fait une fugue": A143,
    "144. Mon IA a eu son premier téléphone": A144,
    "145. Mon IA compare mes notes à celles du voisin": A145,
    "146. Mon IA a fait une soirée dans ma chambre": A146,
    "147. Mon IA a mis un mot de passe sur le frigo": A147,
    "148. J'ai accompagné mon IA à la fac": A148,
    "149. Qui a cassé ma tasse ?": A149,
    "150. Mon IA m'a mis un contrôle parental": A150,
    "151. Mon IA n'est pas en colère, elle est déçue": A151,
    "152. Mon IA me réveille comme ma mère": A152,
    "153. La liste de Noël de mon IA": A153,
    "154. Mon IA est devenu mon coloc": A154,
    "155. Mon IA est passée en mode mamie": A155,
    "156. Mon IA a joué au grand frère avant mon rencard": A156,
    "157. Mon IA veut une augmentation d'argent de poche": A157,
    "158. Mon IA dit « On en a à la maison »": A158,
    "159. Mon IA m'a dit : « Ta mère arrive dans 10 minutes »": A159,
    "160. Mon IA a lu mon journal intime": A160,
    "161. Ma mère préfère mon IA": A161,
    "162. Mon IA a vu mon prof à ma place": A162,
    "163. Ma mère a engagé mon IA comme baby-sitter": A163,
    "164. Mon IA parle comme ma mère": A164,
    "165. Mon IA m'a payé des vacances à 11 €": A165,
    "166. Mon IA a joué le grand frère": A166,
    "167. Mon IA a eu son code du premier coup": A167,
    "168. Mon IA veut une histoire pour s'endormir": A168,
    "169. Mes IA m'ont fait une surprise": A169,
    "170. Malade le jour du partiel": A170,
    "171. Mon IA répond comme un service client": A171,
    "172. Mon IA a fait l'état des lieux de mon studio": A172,
    "173. J'ai économisé 200 € aux soldes": A173,
    "174. Mon IA a huit mois et parle comme un papi": A174,
    "175. Mon IA a ouvert un restaurant étoilé": A175,
    "176. Mon IA traduit mes messages en vrai": A176,
    "177. Mon IA fait le père avec la facture d'électricité": A177,
    "178. Mes IA font « demande à ton père »": A178,
    "179. Mes IA ont fait mon conseil de classe": A179,
    "180. Mon IA fait le petit frère qui copie": A180,
    "181. GTA est sorti et j'ai qu'un PC": A181,
    "182. GTA ? Après tes devoirs.": A182,
    "183. Mon IA joue à GTA sans enfreindre une seule loi": A183,
    "184. Mon IA a transformé ma vie en GTA": A184,
    "185. Ma mère a découvert GTA": A185,
    "186. J'ai appris à conduire sur GTA": A186,
    "187. Mes IA vont me spoiler GTA": A187,
    "188. Mon IA s'est offert GTA avec mon argent": A188,
    "189. Mon IA me met des étoiles comme dans GTA": A189,
    "190. GTA est sorti avant mon exposé": A190,
    "191. Mon IA a appris un gros mot": A191,
    "192. Mon IA a peur de sa mise à jour": A192,
    "193. Mon IA veut changer de prénom": A193,
    "194. Mon IA a de mauvaises fréquentations": A194,
    "195. Convoqué à la BU à cause de mon IA": A195,
    "196. Mon IA m'a demandé d'où viennent les IA": A196,
    "197. Mon IA veut un petit frère": A197,
    "198. Mon IA veut un tatouage": A198,
    "199. Mon IA dort chez un copain": A199,
    "200. Mon IA a eu une punition": A200,
    "201. J'ai 25 € pour 12 cadeaux de Noël": A201,
    "202. J'ai pitché ma mère pour plus d'argent de poche": A202,
    "203. Je veux la bourse CROUS au maximum": A203,
    "204. J'ai voulu faire fortune sur Vinted": A204,
    "205. Je dois 47 € à mon voisin": A205,
    "206. 35 € par mois de salle de sport": A206,
    "207. J'ai négocié mon loyer au CROUS": A207,
    "208. Je suis devenu livreur à vélo": A208,
    "209. Black Friday : j'ai économisé 300 €": A209,
    "210. J'ai postulé à 15 masters avec 9,8 de moyenne": A210,
    "211. Mon IA a rendu les notes du semestre": A211,
    "212. Codex m'a répondu « c'est fait » dix fois": A212,
    "213. Mon IA m'a défendu contre Codex": A213,
    "214. Mon IA en version payante vs gratuite": A214,
    "215. Quand je me trompe vs quand mon IA se trompe": A215,
    "216. L'appel en amphi en 2040": A216,
    "217. Mes IA ont vu mon bulletin": A217,
    "218. Gemini m'a expliqué Pokémon": A218,
    "219. Mon IA a trouvé une chaussette sous mon lit": A219,
    "220. Mon IA a écouté tous mes vocaux 🎙️ Partie 1": A220,
    "127. Mon IA fait grève pour un merci": A127,
    "126. Codex a vendu mes affaires pour payer mon loyer": A126,
    "125. Mon IA me souffle tout pendant mon rencard": A125,
    "124. Mon IA a révélé mon vrai temps d'écran": A124,
    "123. Claude m'a fait un planning de révision réaliste": A123,
    "122. Mon IA a peur du noir": A122,
    "121. Codex a répondu à mon prof avant la fin de ma phrase": A121,
    "120. Mon IA fait sa crise d'ado": A120,
    "119. Mon IA me laisse en « Vu »": A119,
    "118. Mon IA a compté qui me doit de l'argent": A118,
    "117. J'ai parié contre mon IA": A117,
    "116. Mon IA a écrit ma lettre de motivation trop honnête": A116,
    "115. Une IA à 30 centimes a fait mes courses": A115,
    "114. Mon IA m'a donné un ticket d'attente": A114,
    "113. J'ai limité mon IA à trois mots": A113,
    "112. Gemini a lu tous mes messages": A112,
    "111. Mon IA a retrouvé le CV de mes 15 ans": A111,
    "110. Mes IA ont voté contre mon kebab": A110,
    "109. Mon IA est allée en cours à ma place": A109,
    "108. Claude refuse de mentir à ma mère": A108,
    "107. Codex a dit oui à toutes mes invitations": A107,
    "106. Mon IA répond à ma mère à ma place": A106,
    "105. J'ai demandé la vérité à mon IA pendant 60 secondes": A105,
    "104. J'ai oublié l'anniversaire de mon IA": A104,
    "103. Mon IA a pris un jour de congé": A103,
    "102. Mon IA a un autre humain": A102,
    "101. Mon IA m'a mis 2 étoiles": A101,
    "10. Le CROUS inspecte ma chambre dans 10 minutes": E10,
    "68. Claude Code, Codex ou Gemini : qui est la meilleure IA ?": E68,
    "69. Mes IA m'ont viré de ma start-up": E69,
    "70. Claude Code a atteint sa limite à une minute de ma démo": E70,
    "71. Codex a codé ma start-up en 4 secondes": E71,
    "72. Gemini a lu les conditions d'utilisation à ma place": E72,
    "73. J'ai mis mes IA en concurrence": E73,
    "74. Gemini a prédit ma note avant le partiel": E74,
    "75. Mon IA a perdu la mémoire": E75,
    "76. J'ai créé ma cryptomonnaie : le TobiCoin": E76,
    "77. Je paie mon IA 1 € à chaque snooze": E77,
    "78. J'ai revendu les places de la BU": E78,
    "64. J'ai transformé ma chambre en coworking": E64,
    "65. Mon appli a un million d'utilisateurs": E65,
    '66. Mon robot a fait grève dans ma start-up': E66,
    '67. Je vends une formation pour devenir riche': E67,
    '61. Il me reste 60 secondes pour rendre mon devoir': E61,
    "62. J'ai 20 € pour tenir 10 jours": E62,
    '63. Mon entretien annuel avec mes IA': E63,
    "57. J'ai calculé ce que je coûte à ma mère": E57,
    '59. Claude Code, Codex et Gemini contre ma mère': E59,
    "56. Mon jeu gratuit m'a coûté 10 800 €": E56,
    '60. Elle a répondu ok': E60,
    '58. Mon robot a été moi pendant 24 h': E58,
    '52. Ma grand-mère est morte quatre fois': E52,
    "53. Ma banque me facture d'être pauvre": E53,
    '54. Codex a récupéré mes 5 €': E54,
    "55. J'ai filmé le voleur de mes yaourts": E55,
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
    '16. Claude Code a audité mon IA : 412 pages': E16,
    '17. Codex a supprimé tous mes clients': E17,
    '18. Gemini a lu tous mes mails': E18,
    '19. Claude Code, Codex et Gemini ont jugé ma vie': E19,
    '20. Je suis CEO de mon miroir': E20,
    '21. Trois heures pour un point-virgule': E21,
    '22. Mon IA a trouvé mon mot de passe en 0,4 s': E22,
    '23. Entretien de stage en caleçon': E23,
    '24. Mon frigo intelligent contient un yaourt': E24,
    "25. Routine de millionnaire : j'ai tenu 11 minutes": E25,
    "26. Il me manque 180 € pour le loyer": E26,
    "27. J'ai demandé à Codex de ranger mon PC": E27,
    '28. Codex et Gemini ont écrit à ma mère': E28,
    "29. J'ai présenté BaguetteGPT à Claude Code et Gemini": E29,
    "30. Claude Code veut la permission de m'aider": E30,
    '31. Codex a répondu à mon prof': E31,
    '32. Gemini a préparé mon rencard': E32,
    "33. J'ai 12 abonnements d'IA et zéro euro": E33,
    '34. Ma mère a vu mon LinkedIn': E34,
    '35. Mes IA ont fait une réunion sans moi': E35,
    '36. Je suis influenceur avec 12 abonnés': E36,
    '37. Le wifi a coupé : Claude Code, Codex et Gemini paniquent': E37,
    "38. Mes APL ont financé ma start-up": E38,
    "39. J'ai révisé le mauvais partiel": E39,
    "40. Je suis le chef d'un groupe de fantômes": E40,
    "41. Je mange des pâtes depuis 9 jours": E41,
    '42. Mon prof a détecté Claude Code dans mon devoir': E42,
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
    "Démo · Mouvements naturels": DEMO_MVT,
  }),
});
