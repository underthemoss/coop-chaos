"""Close and assembled source-art inspection; studio lighting, not runtime acceptance."""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
kind=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'assembly'
path=ROOT/'assets/sculpted/environment'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for name in (['lowfork','woven-home','sleeping-deck','hauling-basket'] if kind=='assembly' else [kind]):
    with bpy.data.libraries.load(str(path/f'{name}.blend'),link=False) as (source,target):target.objects=source.objects
    for ob in target.objects:
        if ob: bpy.context.collection.objects.link(ob)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=2
scene.render.resolution_x=800;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('proof-world');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.64,.68,.61,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
scene.view_settings.view_transform='AgX'
bpy.ops.mesh.primitive_plane_add(size=100, location=(0,0,-.025));plane=bpy.context.object;plane.name='STUDIO proof ground'
m=bpy.data.materials.new('STUDIO warm neutral ground');m.diffuse_color=(.32,.28,.20,1);plane.data.materials.append(m)
for name,loc,power,size in [('key',(-5,7,11),1800,7),('fill',(8,1,8),1200,7),('rim',(1,-6,9),1500,5)]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,2))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('STUDIO inspection');cam=bpy.data.objects.new('STUDIO inspection',d);scene.collection.objects.link(cam)
if kind=='assembly':cam.location=(8,13,10);target=Vector((-.1,0,2.35));d.ortho_scale=8.8
elif kind=='sleeping-deck':cam.location=(7,9,7);target=Vector((1.7,.45,2.9));d.ortho_scale=4.8
else:cam.location=(3,9,6);target=Vector((-1.6,.45,1.75));d.ortho_scale=5.4
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';scene.camera=cam
out=ROOT/'output/playwright/technology-art';out.mkdir(parents=True,exist_ok=True)
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(out/f'{kind}-v1.png');bpy.ops.render.render(write_still=True)
