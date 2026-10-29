"""Source rest-body mesh intersections at saved positions/headings.

Whole rest bodies (feathers/head/tail included), not proxy upright cylinders.
The runtime executor independently checks evaluated animated Babylon geometry.
"""
import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path(__file__).resolve().parent
sys.path.insert(0, str(SOURCE))
from validate_buildings import inspect


def xyz(p):
    return Vector((p[0], -p[2], p[1]))


def to_game(p):
    return Vector((p.x, p.z, -p.y))


def load_character(name):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/assets/characters/{name}.glb'))
    bpy.context.view_layer.update()
    points, faces = [], []
    for ob in bpy.context.scene.objects:
        if ob.type != 'MESH':
            continue
        evaluated = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        first = len(points)
        points.extend([to_game(ob.matrix_world@v.co)*.365 for v in mesh.vertices])
        for tri in mesh.loop_triangles:
            ids = [first+i for i in tri.vertices]
            if max(points[i].y for i in ids) > .13:
                faces.append(ids)
        evaluated.to_mesh_clear()
    return points, faces


def triangle_bvh(triangles):
    points, faces, owners = [], [], []
    for owner, tri in triangles:
        first = len(points)
        points.extend(tri)
        faces.append((first, first+1, first+2))
        owners.append(owner)
    return BVHTree.FromPolygons(points, faces, all_triangles=True), owners


def transformed(points, faces, foot, heading):
    c, s = math.cos(heading), math.sin(heading)
    vertices = [Vector((p.x*c+p.z*s+foot[0], p.y+foot[1], -p.x*s+p.z*c+foot[2])) for p in points]
    return BVHTree.FromPolygons(vertices, faces, all_triangles=True)


def main():
    static = {}
    asset_hashes = {}
    for name in ['boughhome', 'sleeping-deck-compatible']:
        info, triangles = inspect(ROOT/f'public/assets/environment/buildings/{name}.glb')
        asset_hashes[name] = info['sha256']
        static[name] = (triangles, *triangle_bvh(triangles))
    anchors = json.loads((ROOT/'src/content/tree-habitats.json').read_text())['profiles']['canopy-proof']['anchors']
    route = [anchors[n] for n in ['home-entry', 'home-edge', 'ramp-middle', 'deck-entry']]
    poses = []
    for i, (a, b) in enumerate(zip(route, route[1:])):
        for j in range(11):
            foot = list(Vector(a).lerp(Vector(b), j/10))
            for sign in [-1, 1]:
                poses.append((f'ramp-{i}-{j}-{sign}', foot, sign*math.pi/2))
    for j in range(12):
        poses.append((f'ladder-{j}', [0, j/11*2.25, -1.08], 0))
    for j in range(9):
        poses.append((f'landing-{j}', [0, 2.25, -1.08+j/8*.58], 0))
    for name in ['sheltered-perch-0', 'sheltered-perch-1', 'sheltered-perch-2', 'sheltered-perch-3', 'natural-perch-0', 'natural-perch-1']:
        poses.append((name, anchors[name], 0))
    report = {'revision': 'bound-reed-family-v1-actual-rest-mesh', 'birds': {}, 'assets': asset_hashes, 'limits': 'Rest-pose source export meshes, 93 saved-route/standing samples per bird. Expected contacts below feet+.13m excluded. Runtime evaluated animation and refreshed scene remain integration-owned.'}
    for character in ['fern', 'rook', 'dapple', 'wren']:
        points, faces = load_character(character)
        hits = []
        for label, foot, heading in poses:
            body = transformed(points, faces, foot, heading)
            for asset, (triangles, bvh, owners) in static.items():
                overlap = bvh.overlap(body)
                bad = [(a, b) for a, b in overlap if max(p.y for p in triangles[a][1]) > foot[1]+.13]
                if bad:
                    groups = {}
                    for a, b in bad:
                        groups[owners[a]] = groups.get(owners[a], 0)+1
                    hits.append({'pose': label, 'foot': foot, 'heading': heading, 'asset': asset, 'surfacePairs': len(bad), 'groups': groups,
                                 'firstTriangle': [list(p) for p in triangles[bad[0][0]][1]]})
        report['birds'][character] = {'poseCount': len(poses), 'collisions': hits}
        print(character, 'poses', len(poses), 'intersecting', len(hits))
    (SOURCE/'actual-fit-candidate.json').write_text(json.dumps(report, indent=2)+'\n')


if __name__ == '__main__':
    main()
