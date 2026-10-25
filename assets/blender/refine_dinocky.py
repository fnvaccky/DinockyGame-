import bpy, bmesh, math
col=bpy.data.collections['DINOCKY | Export'];root=bpy.data.objects['Dinocky']
body=bpy.data.objects['Dinocky_Body']
bm=bmesh.new();bm.from_mesh(body.data)
bmesh.ops.symmetrize(bm,input=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.0001,direction='-X')
bm.to_mesh(body.data);bm.free()
for o in list(col.objects):
    if o.name.startswith('Tooth_'):bpy.data.objects.remove(o,do_unlink=True)
mat=bpy.data.materials['Dinocky_Teeth • Soft ivory']
for side in [-1,1]:
    for i in range(4):
        x=side*(.074+.147*i);y=-.802+.16*(abs(x)/.59)**2;z=2.047+.050*(abs(x)/.59)**2
        c=bpy.data.curves.new('Rounded scallop','CURVE');c.dimensions='2D';c.resolution_u=8;c.fill_mode='BOTH';c.extrude=.012;c.bevel_depth=.009;c.bevel_resolution=3
        s=c.splines.new('BEZIER');pts=[(-.085,.065),(.085,.065),(.08,-.018),(.040,-.070),(0,-.090),(-.040,-.070),(-.08,-.018)]
        s.bezier_points.add(len(pts)-1)
        for p,(a,b) in zip(s.bezier_points,pts):
            p.co=(a,b,0);p.handle_left_type='AUTO';p.handle_right_type='AUTO'
        s.use_cyclic_u=True
        o=bpy.data.objects.new('Dinocky_Tooth_'+('L' if side<0 else 'R')+str(i+1),c);col.objects.link(o)
        o.location=(x,y,z);o.rotation_euler.x=math.pi/2;o.parent=root;c.materials.append(mat)
for i,y,z in [(6,.44,1.06),(7,.67,.71),(8,.99,.53),(9,1.27,.42)]:
    o=bpy.data.objects['Dinocky_Spike_%02d'%i];o.location.y=y;o.location.z=z
print('Symmetry enforced; scalloped teeth refined; dorsal plates seated.')
