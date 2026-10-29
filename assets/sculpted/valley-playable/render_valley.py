"""Source proof from the actual exported GLBs, with actual adult meshes."""
import bpy
import json
import sys
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
sys.path.insert(0, str(ROOT/'assets/sculpted/buildings'))
from render_buildings import xyz, load


def render(view):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    load(ROOT/'public/assets/environment/valley/longbough-living.glb')
    load(ROOT/'public/assets/environment/valley/longbough-woven-kit.glb')
    c = json.loads((ROOT/'src/content/valley-habitat.json').read_text())
    a = c['profile']['anchors']
    bpy.data.objects['lift-rope'].scale.z = c['profile']['hauling']['ropeRestLength']
    payload = load(ROOT/'public/assets/environment/reed-bundle.glb', c['presentation']['reedBundleScale'])
    cargo = bpy.data.objects.new('proof-payload-only',None)
    bpy.context.collection.objects.link(cargo)
    cargo.location = xyz([x+y for x,y in zip(a['basket-ground'],a['cargo-socket'])])
    cargo.rotation_euler.z = c['profile']['hauling']['cargoYawRadians']
    for ob in payload:
        if ob.parent not in payload:ob.parent=cargo
    perches = c['profile']['shelteredPerches']+c['profile']['naturalPerches']
    for i, name in enumerate(perches):
        obs = load(ROOT/f"public/assets/characters/{['fern','rook','dapple','wren'][i%4]}.glb",
                   c['presentation']['adultScale'])
        wrapper = bpy.data.objects.new('proof-fixture-'+name, None)
        bpy.context.collection.objects.link(wrapper)
        wrapper.location = xyz(a[name])
        wrapper.rotation_euler.z = c['profile']['perchYawRadians'].get(name,0)
        for ob in obs:
            if ob.parent not in obs:
                ob.parent = wrapper
            ad = ob.animation_data
            if ad:
                ad.action = None
                for track in ad.nla_tracks:
                    track.mute = not track.name.startswith('roost')
    bpy.context.scene.frame_set(12)
    # Ground is evidence framing only; anatomical0 remains exact and the
    # unchanged negative-Y root allowance is buried instead of normalized.
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0,0,0))
    ground = bpy.context.object
    ground.name = 'proof-ground-only'
    mat = bpy.data.materials.new('proof matte ground')
    mat.diffuse_color = (.12,.15,.09,1)
    ground.data.materials.append(mat)
    target, camera, span = ((.65, 4.7, 1.8), (12, 10, 25), 10.5)
    if view == 'whole':
        target, camera, span = ((0, 6.4, 0), (14, 13, 29), 19)
    if view == 'strategy':
        target, camera, span = ((0, 4, 0), (16, 22, 24), 18)
    if view == 'floors':
        for ob in bpy.data.objects:
            if ob.type == 'MESH' and (ob.name.startswith('home-hood') or ob.name in ('crown-foliage','living-wood')):
                ob.hide_render = True
        target, camera, span = ((.4, 4, 2.5), (8, 18, 16), 7.2)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 20
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1200, 1000
    scene.render.resolution_percentage = 100
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value = (.18,.22,.26,1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value = .6
    for i, (at, energy, size) in enumerate([((-6,15,7),2100,9),((7,8,-5),1500,8)]):
        data = bpy.data.lights.new(f'proof-area-{i}', 'AREA')
        data.energy, data.shape, data.size = energy, 'DISK', size
        ob = bpy.data.objects.new(f'proof-area-{i}', data)
        scene.collection.objects.link(ob)
        ob.location = xyz(at)
        ob.rotation_euler = (xyz(target)-ob.location).to_track_quat('-Z','Y').to_euler()
    data = bpy.data.cameras.new('proof-camera')
    cam = bpy.data.objects.new('proof-camera', data)
    scene.collection.objects.link(cam)
    cam.location = xyz(camera)
    cam.rotation_euler = (xyz(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    data.type, data.ortho_scale = 'ORTHO', span
    scene.camera = cam
    scene.view_settings.view_transform = 'AgX'
    scene.render.filepath = str(SOURCE/f'candidate-{view}.png')
    bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['detail','whole','strategy','floors']:
        render(name)
