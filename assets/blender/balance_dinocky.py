"""Balanced plush proportions, applied once after chunky_dinocky.py."""
import bpy,math
from mathutils import Vector
body=bpy.data.objects['Dinocky_Body']
def balanced(p,legs=False):
    x,y,z=p
    t=max(0,min(1,(z-.22)/1.82));w=math.sin(math.pi*t)**2
    x*=(1+.25*w)/(1+.43*w)
    y=.025+(y-.025)*(1+(.51 if y<.025 else .20)*w)/(1+(.86 if y<.025 else .28)*w)
    # Fill the hollow at the rear neck, blending into crown and shoulders.
    neck=math.exp(-((z-1.94)/.34)**2)
    y+=.20*neck*max(0,min(1,y/.34))
    if legs:
        foot=max(0,1-z/.72)**2
        # Broaden the stance slightly and give each foot a clearer forward toe.
        side=math.tanh(x/.15)
        x+=.065*side*foot
        if y<.24:y-=.065*foot
    return Vector((x,y,z))
if not body.get('balanced_revision'):
    for name in ['Dinocky_Body','Dinocky_Belly']:
        o=bpy.data.objects[name];inv=o.matrix_world.inverted()
        for v in o.data.vertices:v.co=inv@balanced(o.matrix_world@v.co,name=='Dinocky_Body')
        o.data.update()
    for o in bpy.data.collections['DINOCKY | Export'].objects:
        if o.name.startswith(('Dinocky_Arm_','Dinocky_Spike_')):o.location=balanced(o.location)
    # Relax the abrupt haunch-to-leg transition without softening the face.
    vg=body.vertex_groups.new(name='Leg transition polish')
    for v in body.data.vertices:
        p=body.matrix_world@v.co
        weight=math.exp(-((p.z-.60)/.30)**2)*max(0,min(1,(.65-p.y)/.25))
        if weight>.01:vg.add([v.index],weight,'REPLACE')
    bpy.context.view_layer.objects.active=body
    smooth=body.modifiers.new('Round thigh transition','SMOOTH');smooth.factor=.65;smooth.iterations=7;smooth.vertex_group=vg.name
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    body['balanced_revision']=1
    print('Rear neck filled, belly reduced, thighs softened and feet defined.')
else:print('Balanced proportions already applied.')
