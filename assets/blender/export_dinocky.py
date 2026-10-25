"""Finalize and export after build_dinocky.py and refine_dinocky.py."""
import bpy,bmesh,math,os,json
from mathutils import Vector,kdtree
ROOT=r'C:\Users\achil\OneDrive\Desktop\Dinocky'
source=bpy.context.scene
col=bpy.data.collections['DINOCKY | Export']
for o in col.objects:
    if o.name.startswith('Dinocky_Tooth_'):
        for p in list(o.data.splines[0].bezier_points)[:2]:
            p.handle_left_type='VECTOR';p.handle_right_type='VECTOR'
        x=o.location.x
        if not o.get('face_fit_revision'):
            o.location.y=-.815+.16*(abs(x)/.59)**2
            o.location.z=2.047+.050*(abs(x)/.59)**2
    if o.type=='MESH':
        bm=bmesh.new();bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(o.data);bm.free()

game=bpy.data.scenes.new('Dinocky • Game mesh')
game.world=source.world
dg=bpy.context.evaluated_depsgraph_get()
copies=[]
for o in col.objects:
    if o.type not in {'MESH','CURVE'}:continue
    me=bpy.data.meshes.new_from_object(o.evaluated_get(dg),depsgraph=dg)
    ob=bpy.data.objects.new(o.name+'_Game',me);game.collection.objects.link(ob)
    ob.matrix_world=o.matrix_world.copy();copies.append(ob)
bpy.context.window.scene=game
# Combine repeated decorations, keeping the animated facial and limb parts distinct.
for prefix in ['Dinocky_Spike_','Dinocky_Tooth_','Dinocky_Cheek_']:
    group=[o for o in list(game.objects) if o.name.startswith(prefix)]
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join()
    group[0].name=prefix.rstrip('_')+'s_Game'

for o in list(game.objects):
    if o.type!='MESH':continue
    bpy.context.view_layer.objects.active=o
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True)
    # Bake transforms before symmetry-preserving simplification.
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    dec=o.modifiers.new('Web game simplification','DECIMATE');dec.ratio=.52
    dec.use_symmetry=True;dec.symmetry_axis='X'
    bpy.ops.object.modifier_apply(modifier=dec.name)
    # Exact mirrored topology for features crossing the centre plane.
    if not any(s in o.name for s in ['Arm_','Eye_']):
        bm=bmesh.new();bm.from_mesh(o.data)
        for v in bm.verts:
            if abs(v.co.x)<.0001:v.co.x=0
        bmesh.ops.symmetrize(bm,input=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.0001,direction='-X')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    for p in o.data.polygons:p.use_smooth=True
# Reflect paired parts directly; collapse decisions cannot introduce asymmetry.
for part in ['Arm','Eye']:
    left=bpy.data.objects['Dinocky_'+part+'_L_Game'];right=bpy.data.objects['Dinocky_'+part+'_R_Game']
    right.data=left.data.copy()
    for v in right.data.vertices:v.co.x=-v.co.x
    bm=bmesh.new();bm.from_mesh(right.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(right.data);bm.free()

root=bpy.data.objects.new('Dinocky_Game',None);game.collection.objects.link(root)
vertices=[];tri=0;meshes=0
for o in list(game.objects):
    if o.type!='MESH':continue
    if any(s in o.name for s in ['Arm_','Eye_','Jaw']):
        center=sum((Vector(c) for c in o.bound_box),Vector())/8
        for v in o.data.vertices:v.co-=center
        o.location=center
    o.parent=root;meshes+=1;o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
    bpy.context.view_layer.update()
    vertices.extend([o.matrix_world@v.co for v in o.data.vertices])
kd=kdtree.KDTree(len(vertices))
for i,v in enumerate(vertices):kd.insert(v,i)
kd.balance();err=max(kd.find(Vector((-v.x,v.y,v.z)))[2] for v in vertices)
assert err<.00001,err
root['front']='+Z after glTF export; Blender -Y'
root['cosmetics']='Change Dinocky_Skin material base color; cream and golden details stay fixed.'
bpy.ops.object.select_all(action='SELECT')
path=os.path.join(ROOT,'public','models','dinocky-plush.glb')
bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_apply=True,export_extras=True)
stats={'triangles':tri,'vertices':len(vertices),'meshes':meshes,'symmetry_error':err,'glb_bytes':os.path.getsize(path),'rigged':False,'front':'glTF +Z','up':'glTF +Y'}
with open(os.path.join(ROOT,'assets','blender','model-report.json'),'w') as f:json.dump(stats,f,indent=2)
bpy.context.window.scene=source
source.render.filepath=os.path.join(ROOT,'assets','blender','dinocky-preview.png')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets','blender','dinocky-plush.blend'))
print(json.dumps(stats))
