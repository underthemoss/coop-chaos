"""Bounded Lowfork source inspection; camera orientation follows the fixed runtime.
This Cycles render is source-art evidence, not Babylon/browser acceptance.
"""
import bpy, math, sys, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
tree=next((n for n in args if n in ['lowfork','splitcrown','reedside']),'lowfork')
occupied='occupied' in args; close='close' in args; final='final' in args
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for name in ([tree,'woven-home','sleeping-deck','hauling-basket'] if occupied else [tree]):
    with bpy.data.libraries.load(str(ROOT/f'assets/sculpted/environment/{name}.blend'),link=False) as (source,target):target.objects=source.objects
    for ob in target.objects:
        if ob:bpy.context.collection.objects.link(ob)
    for ob in target.objects:
        if ob and ob.parent is None: ob.scale.x=-1 # RH source render matches runtime's LH screen convention
if occupied:
    anchors=json.loads((ROOT/'src/content/tree-habitats.json').read_text())['profiles']['canopy-proof']['anchors']
    for slot,identity in zip(['natural-perch-0','natural-perch-1','sheltered-perch-0','sheltered-perch-1','sheltered-perch-2','sheltered-perch-3'],['fern','rook','dapple','wren','fern','dapple']):
        with bpy.data.libraries.load(str(ROOT/f'assets/sculpted/chickens/{identity}.blend'),link=False) as (source,target):
            target.objects=[name for name in source.objects if not name.startswith('STUDIO')]
        place=bpy.data.objects.new('PROOF occupant '+slot,None);bpy.context.collection.objects.link(place)
        x,y,z=anchors[slot];place.location=(-x,-z,y);place.scale=(-.365,.365,.365)
        # Front-facing occupancy is a geometry readability study, not saved play.
        place.rotation_euler.z=math.pi
        for ob in target.objects:
            if ob:
                bpy.context.collection.objects.link(ob)
                if ob.animation_data:
                    ob.animation_data.action=None
                    for track in ob.animation_data.nla_tracks:track.mute=True
                if ob.parent is None:ob.parent=place
bpy.context.scene.frame_set(0)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=6 if final else 4;scene.cycles.use_denoising=final;scene.cycles.max_bounces=4;scene.cycles.diffuse_bounces=2
scene.render.threads_mode='FIXED';scene.render.threads=2
scene.render.resolution_x=1200 if final else 900;scene.render.resolution_y=950 if final else 720;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('PROOF sky');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.60,.67,.65,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
scene.view_settings.view_transform='AgX'
bpy.ops.mesh.primitive_plane_add(size=100,location=(0,0,0));stage=bpy.context.object;stage.name='PROOF ground'
m=bpy.data.materials.new('PROOF muted earth');m.diffuse_color=(.24,.22,.15,1);stage.data.materials.append(m)
# One broad evening key and diffuse world; do not bake this lighting into assets.
d=bpy.data.lights.new('PROOF key','AREA');d.energy=1900;d.shape='DISK';d.size=7
ob=bpy.data.objects.new('PROOF key',d);scene.collection.objects.link(ob);ob.location=(8,10,14);ob.rotation_euler=(Vector((0,0,3))-ob.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('PROOF fixed orientation');cam=bpy.data.objects.new('PROOF fixed orientation',d);scene.collection.objects.link(cam)
alpha=-math.pi/2.6;beta=math.pi/3.2
center=Vector((-.25,-1.2,5.0)) if not close else Vector((.0,.15,2.18))
cam.location=center+Vector((-math.cos(alpha)*math.sin(beta),-math.sin(alpha)*math.sin(beta),math.cos(beta)))*24
cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=18.8 if not close else 7.5;scene.camera=cam
out=ROOT/'output/playwright/tree-metre-v2';out.mkdir(parents=True,exist_ok=True)
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(out/f'{tree}-{"occupied" if occupied else "bare"}{"-close" if close else "-whole"}-{"final" if final else "quick"}.png')
bpy.ops.render.render(write_still=True)
