"""Export shop accessories and the hat-ready character after export_dinocky.py.

Each accessory collection becomes public/models/accessories/<id>.glb in the same
frame as dinocky-plush.glb (glTF Y up, front +Z, Blender world transforms baked),
so the loader can parent it straight under the character scene.
Procedural crochet/knit shading is replaced by plain Principled materials.
"""
import bpy,bmesh,math,os,json
from mathutils import Vector
ROOT=r'C:\Users\achil\OneDrive\Desktop\Dinocky'
OUT=os.path.join(ROOT,'public','models','accessories')
MAX_BYTES=150*1024
ACCESSORIES={
    'cap':'HAT | Straw cap',
    'scarf':'SCARF | Red knit',
    'bee_hat':'HAT | Bee bucket (crochet)',
    'frog_hat':'HAT | Frog bucket (crochet)',
    'glasses':'GLASSES | Round rose-gold',
    'suit':'SUIT | Navy tuxedo',
    'explorer':'EXPLORER | Safari vest',
    'hoodie':'HOODIE | Mint dino',
}
# Outfits cover the whole body, so they get a larger size and triangle allowance.
OUTFITS={'suit','explorer','hoodie'}
OUTFIT_MAX_BYTES=260*1024
# Parts exported as their own node so the game can hide them (the hood goes under hats).
SEPARATE={'hoodie':{'hood':{'Hoodie_Hood','Hoodie_HoodRim'}}}
# Triangle budget per accessory before the size check tightens it.
BUDGET={'cap':6000,'scarf':6000,'bee_hat':6000,'frog_hat':7000,'glasses':5000,'suit':11000,'explorer':10000,'hoodie':11000}
BLENDED={'Glasses_Lens','Glasses_NosePad'}
STRIPES=38.0  # Crochet_BeeStripes: black where sin(38 * local z) >= 0

def plain(source,name=None,color=None):
    name=name or 'Acc • '+source.name
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes=True;nt=m.node_tree
    for n in list(nt.nodes):nt.nodes.remove(n)
    out=nt.nodes.new('ShaderNodeOutputMaterial');p=nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(p.outputs[0],out.inputs['Surface'])
    sp=next(n for n in source.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    base=color or (sp.inputs['Base Color'].default_value[:] if not sp.inputs['Base Color'].is_linked else (1,1,1,1))
    p.inputs['Base Color'].default_value=base
    for k in ['Roughness','Metallic','Alpha']:p.inputs[k].default_value=sp.inputs[k].default_value
    if source.name in BLENDED:
        try:m.surface_render_method='BLENDED'
        except (AttributeError,TypeError):m.blend_method='BLEND'
        m.use_backface_culling=False
    m['accessory_export']=True
    return m

def bee_stripes(me,yellow,black):
    """Cut the crown along stripe boundaries, then assign faces by local height."""
    bm=bmesh.new();bm.from_mesh(me)
    zs=[v.co.z for v in bm.verts]
    for k in range(math.floor(min(zs)*STRIPES/math.pi),math.ceil(max(zs)*STRIPES/math.pi)+1):
        geom=list(bm.verts)+list(bm.edges)+list(bm.faces)
        bmesh.ops.bisect_plane(bm,geom=geom,plane_co=(0,0,k*math.pi/STRIPES),plane_no=(0,0,1))
    me.materials.clear();me.materials.append(yellow);me.materials.append(black)
    for f in bm.faces:f.material_index=1 if math.sin(STRIPES*f.calc_center_median().z)>=0 else 0
    bm.to_mesh(me);bm.free()

def bake(o,dg,ratio,mats):
    """Evaluated (modifiers, curve bevels) copy in world space with plain materials."""
    me=bpy.data.meshes.new_from_object(o.evaluated_get(dg),depsgraph=dg)
    tmp=bpy.data.objects.new(o.name+'_Acc',me);bpy.context.scene.collection.objects.link(tmp)
    if ratio<1:
        bpy.ops.object.select_all(action='DESELECT');tmp.select_set(True);bpy.context.view_layer.objects.active=tmp
        dec=tmp.modifiers.new('Accessory simplification','DECIMATE');dec.ratio=ratio
        bpy.ops.object.modifier_apply(modifier=dec.name)
    me.validate()
    src=[s.material for s in o.material_slots]
    if src and src[0].name=='Crochet_BeeStripes':
        bee_stripes(me,mats['yellow'],mats['black'])
    else:
        for i,m in enumerate(src):me.materials[i]=plain(m)
    me.transform(o.matrix_world);tmp.matrix_world.identity()
    return tmp

def triangles(objs):
    total=0
    for o in objs:o.data.calc_loop_triangles();total+=len(o.data.loop_triangles)
    return total

def export_accessory(aid,cname,ratio_scale=1.0):
    source=bpy.context.window.scene
    scene=bpy.data.scenes.new('Dinocky • Accessory export');bpy.context.window.scene=scene
    col=bpy.data.collections[cname]
    # Hidden collections are not evaluated; show them for the bake only.
    hidden=(col.hide_viewport,col.hide_render);col.hide_viewport=False;col.hide_render=False
    scene.collection.children.link(col);dg=bpy.context.evaluated_depsgraph_get();dg.update()
    raw=0
    for o in col.objects:
        if o.type in {'MESH','CURVE'}:
            me=bpy.data.meshes.new_from_object(o.evaluated_get(dg),depsgraph=dg);me.calc_loop_triangles()
            raw+=len(me.loop_triangles);bpy.data.meshes.remove(me)
    ratio=min(1.0,BUDGET[aid]/raw)*ratio_scale
    mats={'yellow':plain(bpy.data.materials['Crochet_Yellow']),
          'black':plain(bpy.data.materials['Crochet_BeeStripes'],'Acc • BeeStripes_Black',bpy.data.materials['Crochet_BeeStripes'].node_tree.nodes['Color Ramp'].color_ramp.elements[1].color[:])}
    groups={}
    for o in col.objects:
        if o.type not in {'MESH','CURVE'}:continue
        key=next((k for k,names in SEPARATE.get(aid,{}).items() if o.name in names),None)
        groups.setdefault(key,[]).append(bake(o,dg,ratio,mats))
    scene.collection.children.unlink(col);col.hide_viewport,col.hide_render=hidden
    nodes=[]
    for key,parts in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts:o.select_set(True)
        bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
        name='Accessory_'+aid+('_'+key if key else '')
        acc=parts[0];acc.name=name;acc.data.name=name
        acc['accessory']=aid;acc['front']='+Z after glTF export; Blender -Y'
        nodes.append(acc)
    bpy.ops.object.select_all(action='DESELECT')
    for o in nodes:o.select_set(True)
    tri=triangles(nodes);path=os.path.join(OUT,aid+'.glb')
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,use_active_scene=True,
        export_yup=True,export_apply=True,export_extras=True,export_texcoords=False,export_animations=False)
    stats={'triangles':tri,'source_triangles':raw,'decimate_ratio':round(ratio,3),'glb_bytes':os.path.getsize(path),
           'nodes':[o.name for o in nodes],'materials':sorted({m.name for o in nodes for m in o.data.materials})}
    for acc in nodes:me=acc.data;bpy.data.objects.remove(acc);bpy.data.meshes.remove(me)
    bpy.context.window.scene=source;bpy.data.scenes.remove(scene)
    return stats

def split_head_spikes():
    """Hats hide the top three head spikes, so they get their own game mesh."""
    game=bpy.data.scenes['Dinocky • Game mesh']
    if 'Dinocky_HeadSpikes_Game' in game.objects:return False
    spikes=game.objects['Dinocky_Spikes_Game']
    centers=[sum((bpy.data.objects['Dinocky_Spike_%02d'%i].matrix_world@Vector(c) for c in bpy.data.objects['Dinocky_Spike_%02d'%i].bound_box),Vector())/8 for i in range(10)]
    bm=bmesh.new();bm.from_mesh(spikes.data);bm.faces.ensure_lookup_table()
    seen=set();head=set();parts=0
    for f in bm.faces:
        if f.index in seen:continue
        stack=[f];comp=[];seen.add(f.index)
        while stack:
            g=stack.pop();comp.append(g)
            for v in g.verts:
                for h in v.link_faces:
                    if h.index not in seen:seen.add(h.index);stack.append(h)
        parts+=1
        c=sum((g.calc_center_median() for g in comp),Vector())/len(comp)
        if min(range(10),key=lambda i:(centers[i]-c).length)<3:head.update(g.index for g in comp)
    assert parts==10,parts
    rest=bm.copy();rest.faces.ensure_lookup_table()
    bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in head],context='FACES')
    bmesh.ops.delete(rest,geom=[f for f in rest.faces if f.index in head],context='FACES')
    me=bpy.data.meshes.new('Dinocky_HeadSpikes_Game');bm.to_mesh(me);bm.free()
    for m in spikes.data.materials:me.materials.append(m)
    rest.to_mesh(spikes.data);rest.free()
    ob=bpy.data.objects.new('Dinocky_HeadSpikes_Game',me);game.collection.objects.link(ob)
    ob.parent=spikes.parent;ob.matrix_world=spikes.matrix_world.copy()
    ob['hidden_by']='Any hat accessory (cap, bee_hat, frog_hat).'
    return True

def export_character():
    source=bpy.context.window.scene;game=bpy.data.scenes['Dinocky • Game mesh']
    bpy.context.window.scene=game
    bpy.ops.object.select_all(action='SELECT')
    path=os.path.join(ROOT,'public','models','dinocky-plush.glb')
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_apply=True,export_extras=True)
    meshes=[o for o in game.objects if o.type=='MESH']
    bpy.context.window.scene=source
    return {'triangles':triangles(meshes),'meshes':len(meshes),'glb_bytes':os.path.getsize(path)}

os.makedirs(OUT,exist_ok=True)
split=split_head_spikes()
character=export_character()
accessories={}
# Set ONLY={'suit',...} before running to re-export just those accessories.
for aid,cname in ACCESSORIES.items():
    if globals().get('ONLY') and aid not in ONLY:continue
    scale=1.0
    while True:
        accessories[aid]=export_accessory(aid,cname,scale)
        if accessories[aid]['glb_bytes']<=(OUTFIT_MAX_BYTES if aid in OUTFITS else MAX_BYTES):break
        scale*=.8
for m in list(bpy.data.materials):
    if m.get('accessory_export') and not m.users:bpy.data.materials.remove(m)
report_path=os.path.join(ROOT,'assets','blender','model-report.json')
with open(report_path) as f:report=json.load(f)
report.update(character);report['hat_hidden_mesh']='Dinocky_HeadSpikes_Game';report['accessories']={**report.get('accessories',{}),**accessories}
with open(report_path,'w') as f:json.dump(report,f,indent=2)
print(json.dumps({'split':split,'character':character,'accessories':accessories},indent=1))
