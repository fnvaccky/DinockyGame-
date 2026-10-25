"""Seat eyes and teeth against the plush surfaces; remove the red mouth strip."""
import bpy,math
from mathutils import Vector
body=bpy.data.objects['Dinocky_Body']
for side in ['L','R']:
    eye=bpy.data.objects['Dinocky_Eye_'+side]
    start=Vector((eye.location.x,-2,eye.location.z))
    hit,point,normal,index=body.ray_cast(body.matrix_world.inverted()@start,Vector((0,1,0)))
    if not hit:raise RuntimeError('Eye surface lookup failed')
    eye.location.y=(body.matrix_world@point).y-.005
strip=bpy.data.objects.get('Dinocky_Smile')
if strip:bpy.data.objects.remove(strip,do_unlink=True)
jaw=bpy.data.objects['Dinocky_Jaw'];jaw.location.y=-.365
for o in bpy.data.collections['DINOCKY | Export'].objects:
    if o.name.startswith('Dinocky_Tooth_'):
        x=o.location.x
        o.location.y=-.789+.16*(abs(x)/.59)**2
        o.location.z=2.047+.050*(abs(x)/.59)**2
        o.rotation_euler.x=math.pi/2+.18
        o.scale=(.96,.96,1)
        o['face_fit_revision']=1
print('Eyes seated on head; red strip removed; teeth recessed and angled inward.')
