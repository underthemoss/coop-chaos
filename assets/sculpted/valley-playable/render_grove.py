"""Contact sheet of the actual three exported scenic models, no proxy trees."""
import bpy
import sys
from pathlib import Path
S=Path(__file__).resolve().parent
R=S.parents[2]
sys.path.insert(0,str(R/'assets/sculpted/buildings'))
from render_buildings import xyz,load
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for name,at in [('oak',(-8,0,0)),('spread',(1,0,0)),('shrub',(8,0,1))]:
    obs=load(R/f'public/assets/environment/valley/valley-grove-{name}.glb')
    parent=bpy.data.objects.new('proof-'+name,None);bpy.context.collection.objects.link(parent);parent.location=xyz(at)
    for ob in obs:
        if ob.parent not in obs:ob.parent=parent
bpy.ops.mesh.primitive_plane_add(size=200)
mat=bpy.data.materials.new('proof-ground');mat.diffuse_color=(.12,.15,.11,1);bpy.context.object.data.materials.append(mat)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=850
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.3,.36,.45,1)
for at,energy,size in [((-5,14,8),3000,10),((9,10,-5),1200,9)]:
    data=bpy.data.lights.new('proof-light','AREA');data.energy=energy;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new('proof-light',data);scene.collection.objects.link(ob);ob.location=xyz(at);ob.rotation_euler=(xyz((0,3,0))-ob.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('proof-camera');cam=bpy.data.objects.new('proof-camera',data);scene.collection.objects.link(cam)
cam.location=xyz((12,10,29));cam.rotation_euler=(xyz((0,3,0))-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=25
scene.camera=cam;scene.view_settings.view_transform='AgX';scene.render.filepath=str(S/'candidate-grove.png');bpy.ops.render.render(write_still=True)
