"""Apply once after refinement, before export: round belly and wide haunches."""
import bpy, math
from mathutils import Vector
body=bpy.data.objects['Dinocky_Body']
def fuller(p):
    x,y,z=p
    t=max(0,min(1,(z-.22)/1.82))
    w=math.sin(math.pi*t)**2
    # The forward belly grows most; the back grows less to preserve the tail.
    x*=1+.43*w
    y=.025+(y-.025)*(1+(.86 if y<.025 else .28)*w)
    return Vector((x,y,z))
if not body.get('chunky_revision'):
    for name in ['Dinocky_Body','Dinocky_Belly']:
        o=bpy.data.objects[name];inv=o.matrix_world.inverted()
        for v in o.data.vertices:v.co=inv@fuller(o.matrix_world@v.co)
        o.data.update()
    for side in ['L','R']:
        arm=bpy.data.objects['Dinocky_Arm_'+side]
        arm.location=fuller(arm.location)
    for o in bpy.data.collections['DINOCKY | Export'].objects:
        if o.name.startswith('Dinocky_Spike_'):o.location=fuller(o.location)
    body['chunky_revision']=1
    print('Chunky belly, hips, matching cream patch and attached arms/spikes updated.')
else:print('Chunky revision already applied.')

def fuller_head(p):
    x,y,z=p
    t=max(0,min(1,(z-1.72)/1.38))
    w=math.sin(math.pi*t)**2
    back=max(0,min(1,y/.35))
    return Vector((x*(1+.10*w*back),y+.23*w*back,z))
if not body.get('chunky_head_revision'):
    inv=body.matrix_world.inverted()
    for v in body.data.vertices:v.co=inv@fuller_head(body.matrix_world@v.co)
    body.data.update()
    for o in bpy.data.collections['DINOCKY | Export'].objects:
        if o.name.startswith('Dinocky_Spike_'):o.location=fuller_head(o.location)
    body['chunky_head_revision']=1
    print('Back of head rounded out, with dorsal plates following the contour.')
