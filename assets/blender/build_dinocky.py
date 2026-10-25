"""Dinocky plush reference sculpt. Run inside Blender; preserves existing scenes."""
import bpy, math, os
from mathutils import Vector
from math import sin, cos, pi, sqrt

ROOT = r'C:\Users\achil\OneDrive\Desktop\Dinocky'
scene = bpy.data.scenes.new('Dinocky • Plush character')
bpy.context.window.scene = scene
character = bpy.data.collections.new('DINOCKY | Export')
scene.collection.children.link(character)
studio = bpy.data.collections.new('STUDIO | Not exported')
scene.collection.children.link(studio)

def material(name, color, roughness=0.85):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=roughness
    return m

pink=material('Dinocky_Skin • Strawberry plush',(.68,.255,.29))
cream=material('Dinocky_Belly • Warm vanilla',(.84,.79,.60))
ivory=material('Dinocky_Teeth • Soft ivory',(.94,.91,.77))
gold=material('Dinocky_Spikes • Butter yellow',(.91,.64,.16))
rose=material('Dinocky_Embroidery • Rose',(.46,.105,.15))
mouth=material('Dinocky_Mouth • Muted rose',(.30,.085,.105))
black=material('Dinocky_Eyes • Embroidered charcoal',(.012,.008,.01),.6)

def move(o,col=character):
    for c in list(o.users_collection): c.objects.unlink(o)
    col.objects.link(o)
    return o

def ellipsoid(name, loc, scale, mat, segments=40, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    move(o); o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o

def mesh(name,verts,faces,mat):
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update()
    o=bpy.data.objects.new(name,me); character.objects.link(o); me.materials.append(mat)
    for p in me.polygons:p.use_smooth=True
    return o

def tube(name,points,radius,mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=2
    c.bevel_depth=radius;c.bevel_resolution=2
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,v in zip(s.points,points):p.co=(*v,1)
    o=bpy.data.objects.new(name,c);character.objects.link(o);c.materials.append(mat)
    return o

# Smooth connected torso, crown, haunches, feet and tapered tail.
parts=[ellipsoid('Torso', (0,.025,1.21),(.60,.43,.94),pink),
       ellipsoid('Head', (0,0,2.34),(.63,.47,.71),pink)]
for side in [-1,1]:
    parts.append(ellipsoid('Haunch', (side*.38,.03,.62),(.30,.36,.46),pink))
    foot=ellipsoid('Foot', (side*.39,-.10,.25),(.235,.35,.255),pink)
    parts.append(foot)
for i in range(19):
    t=i/18
    parts.append(ellipsoid('Tail union', (0,.30+1.12*t,.52-.22*t+.10*t*t),
                           (.285*(1-t)+.035,.31*(1-t)+.042,.25*(1-t)+.035),pink,24,16))
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
body=bpy.context.object;body.name='Dinocky_Body'
rem=body.modifiers.new('Organic plush union','REMESH');rem.mode='VOXEL';rem.voxel_size=.027;rem.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=rem.name)
smooth=body.modifiers.new('Soft plush silhouette','SMOOTH');smooth.factor=1.1;smooth.iterations=7
bpy.ops.object.modifier_apply(modifier=smooth.name)
dec=body.modifiers.new('Game surface budget','DECIMATE');dec.ratio=.33;dec.use_symmetry=True;dec.symmetry_axis='X'
bpy.ops.object.modifier_apply(modifier=dec.name)
for p in body.data.polygons:p.use_smooth=True

# Squared-off, rounded cushion muzzle using a superellipsoid.
def spow(a,e):return math.copysign(abs(a)**e,a)
verts=[];faces=[];N=64;M=32
for j in range(M+1):
    v=-pi/2+pi*j/M
    for i in range(N):
        u=2*pi*i/N
        verts.append((.665*spow(cos(v),.82)*spow(cos(u),.85),
                      -.43+.39*spow(cos(v),.82)*spow(sin(u),.85),
                      2.285+.305*spow(sin(v),.82)))
for j in range(M):
    for i in range(N):
        a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
snout=mesh('Dinocky_Muzzle',verts,faces,pink)
jaw=ellipsoid('Dinocky_Jaw',(0,-.425,1.965),(.57,.335,.225),pink)
lip=ellipsoid('Dinocky_Smile',(0,-.60,2.035),(.565,.185,.075),mouth)

# Eight matching, soft rounded scallops. No sharp teeth or black underside.
for side in [-1,1]:
    for i in range(4):
        x=side*(.074+.147*i)
        y=-.819+.16*(abs(x)/.59)**2
        z=2.025+.050*(abs(x)/.59)**2
        tooth=ellipsoid('Tooth_'+('L' if side<0 else 'R')+str(i+1),(x,y,z),(.084,.045,.103),ivory,24,16)

# Belly patch follows the torso surface rather than floating over it.
vs=[(0,-.425,1.12)];fs=[];nr=12;ns=64
for j in range(1,nr+1):
    r=j/nr
    for i in range(ns):
        a=2*pi*i/ns;z=1.10+.635*r*sin(a)
        x=.435*r*cos(a)*(1+.17*sin(a))
        q=max(.02,1-(x/.60)**2-((z-1.21)/.94)**2)
        y=.025-.43*sqrt(q)-.014
        vs.append((x,y,z))
for i in range(ns):fs.append((0,1+i,1+(i+1)%ns))
for j in range(nr-1):
    for i in range(ns):
        a=1+j*ns+i;b=1+j*ns+(i+1)%ns;fs.append((a,a+ns,b+ns,b))
belly=mesh('Dinocky_Belly',vs,fs,cream)
sol=belly.modifiers.new('Fabric patch thickness','SOLIDIFY');sol.thickness=.008

for side in [-1,1]:
    suffix='L' if side<0 else 'R'
    arm=ellipsoid('Dinocky_Arm_'+suffix,(side*.67,-.015,1.62),(.29,.245,.225),pink)
    arm.rotation_euler.y=side*.25
    eye=ellipsoid('Dinocky_Eye_'+suffix,(side*.235,-.432,2.665),(.069,.042,.078),black,32,20)
    # Subtle inset stitching on the lateral upper muzzle, mirrored exactly.
    pts=[]
    for i in range(100):
        t=i/99*3.7*pi;r=.004+.0049*t
        x=side*(.535+r*cos(t));z=2.405+r*sin(t)
        # Follow the superellipse's front surface.
        zz=abs((z-2.285)/.305)**(2/.82)
        xx=abs(x/.665)**(2/.85)
        yy=max(.01,(max(.01,1-zz)**(.82/.85)-xx))**(.85/2)
        pts.append((x,-.43-.39*yy-.007,z))
    tube('Dinocky_Cheek_'+suffix,pts,.009,rose)

# Rounded dorsal plates stay precisely on the centre line.
for i,(y,z,sy,sz,angle) in enumerate([
    (.06,3.04,.15,.22,-.25),(.36,2.88,.20,.22,-.55),
    (.48,2.55,.19,.23,-.20),(.49,2.18,.18,.22,0),
    (.455,1.80,.17,.21,0),(.46,1.43,.16,.20,.1),
    (.57,1.06,.17,.19,.25),(.78,.76,.17,.17,.40),
    (1.08,.58,.14,.13,.4), (1.32,.46,.095,.09,.4)]):
    p=ellipsoid('Dinocky_Spike_%02d'%i,(0,y,z),(.075,sy,sz),gold,28,20)
    p.rotation_euler.x=angle

root=bpy.data.objects.new('Dinocky',None);character.objects.link(root)
for o in list(character.objects):
    if o!=root:o.parent=root
root['description']='Symmetrical plush Dinocky. Front -Y; feet at Z=0; glTF exports Y-up.'
root['cosmetic_material']='Dinocky_Skin • Strawberry plush'
root['usage']='Lobby model; named eyes, jaw and arms are separately animatable.'

# Presentation studio is separate from the exported asset.
floor=material('Studio • Sage',(.19,.245,.225))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.018));o=bpy.context.object;o.name='Studio ground';move(o,studio);o.data.materials.append(floor)
world=bpy.data.worlds.new('Dinocky studio world');scene.world=world;world.use_nodes=True
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.30,.35,.33,1);bg.inputs[1].default_value=.5
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,energy,size in [('Key',(-3,-4,6),550,4),('Fill',(4,-2,3.8),350,3),('Rim',(1,3,5),650,3)]:
    d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=loc;aim(o,(0,0,1.5))
camdata=bpy.data.cameras.new('Portrait camera');cam=bpy.data.objects.new('Portrait camera',camdata);studio.objects.link(cam)
cam.location=(4,-7,3.4);aim(cam,(0,.18,1.6));camdata.type='ORTHO';camdata.ortho_scale=4.25;scene.camera=cam
scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.shading.type='MATERIAL'
            area.spaces.active.region_3d.view_distance=5.8
            area.spaces.active.region_3d.view_location=(0,0,1.6)
print('Created Dinocky:',len(character.objects),'objects')
