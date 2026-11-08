import bpy
from pathlib import Path
base=Path('/Users/peterchen/Henu game ')
bpy.ops.wm.open_mainfile(filepath=str(base/'blender-south-gate/河南大学南大门-参考图重建.blend'))
bpy.ops.object.select_all(action='DESELECT')
groups=[]
for i,name in enumerate(['01-基座与庭院','02-门柱与墙体','03-木门与匾额','04-飞檐与屋瓦']):
 o=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(o);o['assemblyStage']=i;groups.append(o)
for o in list(bpy.context.scene.objects):
 if o.type not in ['MESH','CURVE','FONT'] or o.name=='摄影棚地面':continue
 if any(c.name.startswith(('04 ·','05 ·')) for c in o.users_collection):continue
 name=o.name
 stage=0 if any(c.name.startswith(('02 ·','03 ·')) for c in o.users_collection) or name.startswith(('Stone miniature','纪念','HENU','红心','校徽','年份','I 字')) else 1
 if any(w in name for w in ['roof','飞檐','屋脊','脊兽','瓦','檐','小兽']):stage=3
 elif any(w in name for w in ['plaque','校名','匾','彩绘','祥云','金线','木门','门环','Gate columns and three portals.005','Gate columns and three portals.006']):stage=2
 matrix=o.matrix_world.copy();o.parent=groups[stage];o.matrix_world=matrix;o.select_set(True)
for o in groups:o.select_set(True)
out=base/'henu-merged-v0.8.2/public/assets/models/henu-south-gate-assembly.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_lights=False,export_cameras=False)
print('ASSEMBLY_EXPORTED',out,out.stat().st_size)
