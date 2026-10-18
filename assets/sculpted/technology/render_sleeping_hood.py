"""Sleeping hood v2 fixed-angle source proof; not browser acceptance."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
def xyz(p):return Vector((p[0],-p[2],p[1]))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def append(path):
    with bpy.data.libraries.load(str(path),link=False) as (src,dst):dst.objects=src.objects
    roots=[o for o in dst.objects if o and o.parent is None and o.name.split('.')[0]=='asset']
    keep=set()
    def walk(ob):
        keep.add(ob)
        for child in ob.children:walk(child)
    for ob in roots:walk(ob)
    for ob in keep:bpy.context.collection.objects.link(ob)
    return list(keep)
append(ROOT/'assets/sculpted/environment/sleeping-deck.blend')
anchors=json.loads((ROOT/'src/content/tree-habitats.json').read_text())['profiles']['canopy-proof']['anchors']
for bird,at in [('fern',anchors['sheltered-perch-2']),('wren',anchors['sheltered-perch-3'])]:
    objects=append(ROOT/f'assets/sculpted/chickens/{bird}.blend')
    roots=[o for o in objects if o and o.parent is None and o.type=='EMPTY']
    for ob in roots:ob.location=xyz(at);ob.scale=(.73,.73,.73);ob.rotation_euler.z=math.pi
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=3
scene.world=bpy.data.worlds.new('STUDIO neutral world');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.65,.65,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
scene.view_settings.view_transform='AgX';scene.render.film_transparent=False
for name,loc,power,size in [('STUDIO key',(-3,7,9),1100,6),('STUDIO fill',(7,2,7),600,5),('STUDIO rear',(1,-6,8),900,5)]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(xyz((2,3.2,-.5))-o.location).to_track_quat('-Z','Y').to_euler()
target=Vector((1.7,3.15,-.45));alpha=-math.pi/2.6;beta=math.pi/3.2
campos=target+Vector((math.cos(alpha)*math.sin(beta),math.cos(beta),math.sin(alpha)*math.sin(beta)))*10
cd=bpy.data.cameras.new('STUDIO fixed-angle camera');camera=bpy.data.objects.new(cd.name,cd);scene.collection.objects.link(camera);camera.location=xyz(campos);camera.rotation_euler=(xyz(target)-camera.location).to_track_quat('-Z','Y').to_euler();cd.type='ORTHO';cd.ortho_scale=4.15;scene.camera=camera
scene.render.resolution_x=1000;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
out=ROOT/'output/playwright/technology-art/sleeping-hood-v2';out.mkdir(parents=True,exist_ok=True);scene.render.filepath=str(out/'sleeping-hood-v2-fixed-angle-clean.png');bpy.ops.wm.save_as_mainfile(filepath=str(out/'sleeping-hood-v2-clean-studio.blend'));bpy.ops.render.render(write_still=True)
