"""Read exported GLBs for source art proofs; no runtime/game state claims."""
import bpy
import json
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path(__file__).resolve().parent


def xyz(p):
    return Vector((p[0], -p[2], p[1]))


def load(path, scale=1, at=(0, 0, 0)):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    obs = set(bpy.data.objects)-before
    for ob in obs:
        if ob.parent not in obs:
            ob.scale *= scale
            ob.location += xyz(at)
    return obs


def render(name):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    if name == 'longbough':
        load(ROOT/'public/assets/environment/studies/longbough-refinement-study.glb')
        load(ROOT/'public/assets/environment/buildings/boughhome-longbough-modules.glb')
        data = json.loads((ROOT/'assets/sculpted/valley-trees/refinement-presentation.json').read_text())
        for fixture in data['birdFixtures']:
            load(ROOT/f"public/assets/characters/{fixture['character']}.glb", .45625, fixture['position'])
        target, camera, span = (.75, 4.6, 1.3), (13, 10, 25), 11.0
    elif name in ['home', 'home-isolated']:
        load(ROOT/'public/assets/environment/buildings/boughhome.glb')
        if name == 'home':
            load(ROOT/'public/assets/environment/lowfork.glb')
            load(ROOT/'public/assets/environment/buildings/sleeping-deck-compatible.glb')
        for bird, at in [('fern', [-.86, 2.25, -.5]), ('rook', [.86, 2.25, -.5])]:
            load(ROOT/f'public/assets/characters/{bird}.glb', .365, at)
        target, camera, span = (.10, 2.5, -.42), (7, 7, -13), 4.4
    elif name == 'store':
        load(ROOT/'public/assets/environment/buildings/reed-store.glb')
        target, camera, span = (0, .3, 0), (3, 3, -5), 2.3
    else:
        load(ROOT/'public/assets/environment/buildings/root-nursery.glb')
        load(ROOT/'public/assets/characters/fern.glb', .365, (.95, 0, -.75))
        target, camera, span = (.1, .45, 0), (3, 3, -5), 2.7
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1200, 1000
    scene.render.resolution_percentage = 100
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value = (.18, .22, .26, 1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value = .6
    for i, (at, energy, size) in enumerate([((-6, 15, 7), 2100, 9), ((7, 8, -5), 1500, 8)]):
        data = bpy.data.lights.new(f'proof-area-{i}', 'AREA')
        data.energy, data.shape, data.size = energy, 'DISK', size
        ob = bpy.data.objects.new(f'proof-area-{i}', data)
        scene.collection.objects.link(ob)
        ob.location = xyz(at)
        ob.rotation_euler = (xyz(target)-ob.location).to_track_quat('-Z', 'Y').to_euler()
    data = bpy.data.cameras.new('proof-camera')
    cam = bpy.data.objects.new('proof-camera', data)
    scene.collection.objects.link(cam)
    cam.location = xyz(camera)
    cam.rotation_euler = (xyz(target)-cam.location).to_track_quat('-Z', 'Y').to_euler()
    data.type, data.ortho_scale = 'ORTHO', span
    scene.camera = cam
    scene.view_settings.view_transform = 'AgX'
    scene.render.filepath = str(SOURCE/f'candidate-{name}.png')
    bpy.ops.render.render(write_still=True)
    print('SOURCE_PROOF', scene.render.filepath)


if __name__ == '__main__':
    for name in sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['longbough', 'home', 'home-isolated', 'store', 'nursery']:
        render(name)
