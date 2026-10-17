"""Render exported editable source at close inspection scale. No runtime scenery substitute."""
import bpy, math, sys
from mathutils import Vector
from pathlib import Path
root=Path(__file__).resolve().parents[2]
kind=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'lowfork'
bpy.ops.wm.open_mainfile(filepath=str(root/'assets/sculpted/environment'/f'{kind}.blend'))
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=40
scene.render.resolution_x=1400;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.world.color=(.22,.25,.2)
world=scene.world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.6,.65,.59,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.65
scene.view_settings.view_transform='AgX'
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.025))
plane=bpy.context.object;plane.name='proof stage only'
m=bpy.data.materials.new('warm neutral proof stage');m.diffuse_color=(.38,.32,.22,1);plane.data.materials.append(m)
for name,loc,energy,size in [('warm key',(-6,-8,12),1800,8),('soft fill',(7,-1,8),1000,7),('canopy rim',(-1,7,11),1700,6)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=loc
    ob.rotation_euler=(Vector((0,0,2.5))-ob.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('artifact close view');cam=bpy.data.objects.new('artifact close view',data);scene.collection.objects.link(cam)
if kind=='lowfork':cam.location=(9,-13,9);target=Vector((0,0,2.7));data.ortho_scale=12
elif kind=='woven-home':cam.location=(5,-7,5);target=Vector((0,.4,1.8));data.ortho_scale=4.6
else:cam.location=(2,-3,2.4);target=Vector((0,0,.15));data.ortho_scale=2
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';scene.camera=cam
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(root/'output/playwright/sculpt-proof'/f'{kind}-close.png')
bpy.ops.render.render(write_still=True)
