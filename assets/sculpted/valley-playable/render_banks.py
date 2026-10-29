"""Actual exported bank assets, fixed evidence studio, no terrain proxy."""
import bpy,sys
from pathlib import Path
S=Path(__file__).resolve().parent;R=S.parents[2]
sys.path.insert(0,str(R/'assets/sculpted/buildings'))
from render_buildings import xyz,load
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for name,at in [('bank-shoulder',(-3.8,0,0)),('bank-shelf',(0,0,.25)),('shore-outcrop',(3.5,0,0))]:
    obs=load(R/f'public/assets/environment/valley/valley-{name}.glb')
    root=bpy.data.objects.new('proof-'+name,None);bpy.context.collection.objects.link(root);root.location=xyz(at)
    for ob in obs:
        if ob.parent not in obs:ob.parent=root
bpy.ops.mesh.primitive_plane_add(size=100)
mat=bpy.data.materials.new('proof-ground');mat.diffuse_color=(.09,.115,.075,1);bpy.context.object.data.materials.append(mat)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1500;scene.render.resolution_y=700
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.3,.36,.45,1)
for at,energy,size in [((-4,9,7),1500,7),((6,6,-4),650,6)]:
    data=bpy.data.lights.new('proof-light','AREA');data.energy=energy;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new('proof-light',data);scene.collection.objects.link(ob);ob.location=xyz(at);ob.rotation_euler=(xyz((0,.5,0))-ob.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('proof-camera');cam=bpy.data.objects.new('proof-camera',data);scene.collection.objects.link(cam)
cam.location=xyz((8,7,18));cam.rotation_euler=(xyz((0,.6,0))-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=12
scene.camera=cam;scene.view_settings.view_transform='AgX';scene.render.filepath=str(S/'candidate-banks.png');bpy.ops.render.render(write_still=True)
