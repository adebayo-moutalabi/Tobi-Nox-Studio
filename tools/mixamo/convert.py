# Convertit les FBX Mixamo en GLB. À lancer avec Blender : blender -b -P tools/mixamo/convert.py
import bpy, glob, os, json
SRC = os.environ.get("MIXAMO_SRC", "mixamo-fbx")  # dossier des FBX téléchargés
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "glb")
os.makedirs(OUT, exist_ok=True)
info = {}
for f in sorted(glob.glob(os.path.join(SRC, "*.fbx"))):
    b = os.path.basename(f)
    if not (b[:2].isdigit() or b.startswith(("Talking", "Texting", "Sitting Talking"))):
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=f, automatic_bone_orientation=False)
    arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
    if not arm or not arm.animation_data or not arm.animation_data.action:
        info[b] = "aucune animation"
        continue
    a = arm.animation_data.action
    s, e = a.frame_range
    bpy.context.scene.frame_start, bpy.context.scene.frame_end = int(s), int(e)
    name = os.path.splitext(b)[0].replace(" ", "_").replace("(", "").replace(")", "")
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + ".glb"), export_format="GLB", export_animations=True, export_force_sampling=True, export_frame_range=True, export_skins=True, export_yup=True)
    info[b] = {"os": len(arm.data.bones), "images": int(e - s), "exemple": arm.data.bones[0].name}
json.dump(info, open(os.path.join(OUT, "rapport.json"), "w"), ensure_ascii=False, indent=1)
