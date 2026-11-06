# Adapte les animations Mixamo au squelette de Tobi et crée src/mocap-mixamo.json.
# À lancer depuis la racine du projet, après convert.py. Voir docs/GUIDE_TECHNIQUE.md.
import re,subprocess,json,os,sys
root=os.getcwd(); here=os.path.dirname(os.path.abspath(__file__))
s=open('tools/mocap.mjs',encoding='utf8').read().replace('\r\n','\n')
s=re.sub(r"const CLIPS = .*\n","",s,1)
s=s.replace("const SEATED = new Set(['sitting', 'talk_sit']);","const SEATED = new Set(['mx_assis', 'mx_parle_assis']);").replace("const FPS = 20;","const FPS = 20, MAX = 12;")
i=s.index("const MAP = {"); j=s.index("// Chaque os vise son enfant")
s=s[:i]+"""const M = (x) => `mixamorig:${x}`;
const MAP = { hips: M('Hips'), spine: M('Spine'), chest: M('Spine2'), neck: M('Neck'), head: M('Head') };
for (const [n, S] of [['L', 'Left'], ['R', 'Right']]) {
  Object.assign(MAP, { [`shoulder_${n}`]: M(`${S}Shoulder`), [`arm_${n}`]: M(`${S}Arm`), [`forearm_${n}`]: M(`${S}ForeArm`), [`hand_${n}`]: M(`${S}Hand`), [`upleg_${n}`]: M(`${S}UpLeg`), [`leg_${n}`]: M(`${S}Leg`), [`foot_${n}`]: M(`${S}Foot`), [`toe_${n}`]: M(`${S}ToeBase`) });
  ['Index', 'Middle', 'Ring', 'Pinky'].forEach((f, i) => { MAP[`f${i}a_${n}`] = M(`${S}Hand${f}1`); MAP[`f${i}b_${n}`] = M(`${S}Hand${f}2`); MAP[`f${i}c_${n}`] = M(`${S}Hand${f}3`); });
  MAP[`th_a_${n}`] = M(`${S}HandThumb1`); MAP[`th_b_${n}`] = M(`${S}HandThumb2`);
}
"""+s[j:]
s=s.replace("for (let i = 0; i < 4; i++) AIM[`f${i}a_${n}`] = `f${i}b_${n}`;","for (let i = 0; i < 4; i++) { AIM[`f${i}a_${n}`] = `f${i}b_${n}`; AIM[`f${i}b_${n}`] = `f${i}c_${n}`; }")
s=s.replace("const side = rest.upperarm_l.p.x;","const side = rest[MAP.arm_L].p.x;").replace("rest.pelvis.p","rest[MAP.hips].p").replace("P.pelvis.p","P[MAP.hips].p")
i=s.index("// Le tronc source penche"); j=s.index("const res = {")
s=s[:i]+"const LEVEL = {};\n\n"+s[j:]
s=s.replace("const out = CLIPS[anim.name];\n  if (!out) continue;","const out = process.env.CLIP;")
s=s.replace("const dur = Math.max(...ch.map((c) => c.times[c.times.length - 1]));","const dur = Math.min(MAX, Math.max(...ch.map((c) => c.times[c.times.length - 1])));")
s=s.replace("writeFileSync('src/mocap.json', JSON.stringify(res));","writeFileSync(process.env.OUT, JSON.stringify(res));")
open('tools/.mixamo.mjs','w',encoding='utf8').write(s)
run=open('tools/run-mocap.mjs',encoding='utf8').read().replace('tools/mocap.mjs','tools/.mixamo.mjs').replace('tools/.mocap.bundle.mjs','tools/.mixamo.bundle.mjs')
open('tools/.run-mixamo.mjs','w',encoding='utf8').write(run)
print(subprocess.run(['node','tools/.run-mixamo.mjs'],capture_output=True,text=True,encoding='utf8').stderr[-300:])
NAMES={'Talking':'mx_parle','Talking_1':'mx_question','Talking_2':'mx_deux_mains','Talking_3':'mx_rire','Sitting_Talking':'mx_parle_assis','Talking_On_A_Cell_Phone':'mx_appel','Texting':'mx_texto','Texting_While_Standing':'mx_texto_debout',
 '11_Thinking':'mx_doute','12_Surprised':'mx_surpris','13_Scared':'mx_panique','14_Angry':'mx_colere','15_Sad':'mx_triste','16_Happy':'mx_content','17_Disappointed':'mx_decu','18_Nervous':'mx_gene','19_Shrugging':'mx_epaules','20_Pointing':'mx_montre','21_Sitting_Idle':'mx_assis','24_Typing':'mx_clavier','25_Waving':'mx_salut','26_Clapping':'mx_bravo'}
res=None
for f,c in NAMES.items():
    out=os.path.join(here,'o.json'); env=dict(os.environ,CLIP=c,OUT=out)
    r=subprocess.run(['node','tools/.mixamo.bundle.mjs',os.path.join(here,'glb',f+'.glb')],capture_output=True,text=True,encoding='utf8',env=env)
    if r.returncode: print('ECHEC',f,r.stderr[-300:]); continue
    d=json.load(open(out)); res=res or {'fps':d['fps'],'bones':d['bones'],'clips':{}}; res['clips'].update(d['clips']); print(c, round(d['clips'][c]['d'],1))
json.dump(res,open('src/mocap-mixamo.json','w'),separators=(',',':'))
print(os.path.getsize('src/mocap-mixamo.json'))
