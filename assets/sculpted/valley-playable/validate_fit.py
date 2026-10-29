"""Actual exported static surfaces versus evaluated source adult meshes.

This is source qualification. Runtime animation, handedness and saved journeys
remain independently qualified by the runtime owner.
"""
import bpy
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
sys.path.insert(0, str(ROOT/'assets/sculpted/buildings'))
from validate_buildings import read_glb

C = json.loads((ROOT/'src/content/valley-habitat.json').read_text())
A = C['profile']['anchors']


def geometry(path):
    raw, g, _, values = read_glb(path)
    parents = {ch: i for i, n in enumerate(g['nodes']) for ch in n.get('children', [])}
    def transform(i):
        n = g['nodes'][i]
        if 'matrix' in n:
            m = Matrix([n['matrix'][j:j+4] for j in range(0, 16, 4)]).transposed()
        else:
            q = n.get('rotation', [0,0,0,1])
            m = Matrix.LocRotScale(Vector(n.get('translation', [0,0,0])), Quaternion((q[3],q[0],q[1],q[2])), Vector(n.get('scale', [1,1,1])))
        return transform(parents[i])@m if i in parents else m
    triangles = []
    for i, n in enumerate(g['nodes']):
        if 'mesh' not in n:
            continue
        m = transform(i)
        for p in g['meshes'][n['mesh']]['primitives']:
            pts = [m@Vector(v) for v in values(p['attributes']['POSITION'])]
            ids = [x[0] for x in values(p['indices'])]
            for j in range(0, len(ids), 3):
                triangles.append((n['name'], [pts[k] for k in ids[j:j+3]]))
    return triangles, hashlib.sha256(raw).hexdigest()


def bvh(triangles):
    points = [p for _, tri in triangles for p in tri]
    return BVHTree.FromPolygons(points, [(i,i+1,i+2) for i in range(0,len(points),3)], all_triangles=True)


def adult(name, clip='idle', frame=1):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/assets/characters/{name}.glb'))
    if clip != 'idle':
        for ob in bpy.context.scene.objects:
            ad = ob.animation_data
            if ad:
                ad.action = None
                for track in ad.nla_tracks:
                    track.mute = track.name != clip
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    points, faces, owners = [], [], []
    for ob in bpy.context.scene.objects:
        if ob.type != 'MESH':
            continue
        evaluated = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        offset = len(points)
        for v in mesh.vertices:
            p = ob.matrix_world@v.co
            points.append(Vector((p.x,p.z,-p.y))*C['presentation']['adultScale'])
        for t in mesh.loop_triangles:
            ids = [offset+i for i in t.vertices]
            if max(points[i].y for i in ids) > .12:
                faces.append(ids)
                owners.append(ob.name)
        evaluated.to_mesh_clear()
    return points, faces, owners


def main():
    living, living_hash = geometry(ROOT/'public/assets/environment/valley/longbough-living.glb')
    kit, kit_hash = geometry(ROOT/'public/assets/environment/valley/longbough-woven-kit.glb')
    # Basket is at ground, rope is canonical1m before renderer scales it.
    static = living+kit
    tree = bvh(static)
    all_faces = [tri for _, tri in static]
    poses = []
    for name in C['profile']['naturalPerches']+C['profile']['shelteredPerches']:
        for yaw in [0, math.pi]:
            poses.append((name, A[name], yaw))
    for final, route in C['profile']['placeAccess'].items():
        seq = [A['natural-launch-base' if final.startswith('natural') else 'ladder-base']]+[A[p['anchor']] for p in route]
        for i, (a,b) in enumerate(zip(seq, seq[1:])):
            if Vector(a) == Vector(b):
                continue
            yaw = math.atan2(b[0]-a[0], b[2]-a[2])
            for j in range(9):
                for sign in [0, math.pi]:
                    poses.append((f'{final}-segment{i}-{j}', list(Vector(a).lerp(Vector(b),j/8)), yaw+sign))
    report = {'revision': C['revision'], 'profileSha256': hashlib.sha256((ROOT/'src/content/valley-habitat.json').read_bytes()).hexdigest(), 'livingSha256': living_hash, 'kitSha256': kit_hash,
              'limits': 'Evaluated rest meshes, all four actual adults at .45625. Source routes sampled9points/segment both headings; source animation/climb/flight and actual runtime remain separate. Expected sole/grip contacts below foot+.12m excluded. Overlap reports are diagnostic, not a zero-collision physics claim.', 'birds': {}}
    for name in ['fern','rook','dapple','wren']:
        points, faces, body_owners = adult(name)
        hits = []
        for label, foot, yaw in poses:
            c,s = math.cos(yaw),math.sin(yaw)
            transformed = [Vector((p.x*c+p.z*s+foot[0],p.y+foot[1],-p.x*s+p.z*c+foot[2])) for p in points]
            body = BVHTree.FromPolygons(transformed, faces, all_triangles=True)
            pairs = tree.overlap(body)
            groups = {}
            for a,b in pairs:
                if max(p.y for p in all_faces[a]) <= foot[1]+.12:
                    continue
                key = static[a][0]+' / '+body_owners[b]
                groups[key] = groups.get(key,0)+1
            if groups:
                hits.append({'pose': label, 'foot': foot, 'yaw': yaw, 'groups': groups})
        sheltered_hits = [h for h in hits if not h['pose'].startswith('natural')]
        assert not sheltered_hits, (name, sheltered_hits)
        report['birds'][name] = {'poses': len(poses), 'intersectingPoses': len(hits), 'hits': hits, 'acceptedShelteredPass': True, 'naturalDiagnosticNote': 'Arbitrary reverse-yaw/rest natural poses are diagnostics, not accepted runtime postures. Accepted natural flight/folded-roost path is qualified in source-animation-fit.json.'}
        print('BODY_FIT', name, len(poses), len(hits), flush=True)
    wood = bvh(living)
    floors = bvh([t for t in kit if t[0] in ('home-deck','middle-deck')])
    report['supportProbes'] = {}
    for name in C['profile']['naturalPerches']+C['profile']['shelteredPerches']+['home-entry','deck-entry']:
        x,y,z = A[name]
        surface = wood if name.startswith('natural') else floors
        samples = []
        for dx in [-.12,0,.12]:
            for dz in [-.12,0,.12]:
                hit = surface.ray_cast(Vector((x+dx,y+.3,z+dz)),Vector((0,-1,0)),.7)
                samples.append(None if hit[0] is None else round(hit[0].y-y,5))
        report['supportProbes'][name] = samples
    (SOURCE/'source-fit.json').write_text(json.dumps(report,indent=2)+'\n')


if __name__ == '__main__':
    main()
