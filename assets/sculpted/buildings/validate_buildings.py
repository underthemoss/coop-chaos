"""Actual indexed GLB resources and bounded body/cargo geometry checks."""
import hashlib
import json
import math
import struct
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path(__file__).resolve().parent
OUT = ROOT/'public/assets/environment/buildings'


def read_glb(path):
    raw = path.read_bytes()
    n = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20+n])
    binary = raw[28+n:]
    def values(index):
        a = doc['accessors'][index]
        v = doc['bufferViews'][a['bufferView']]
        arity = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        fmt = {5121: 'B', 5123: 'H', 5125: 'I', 5126: 'f'}[a['componentType']]
        size = struct.calcsize(fmt)*arity
        stride = v.get('byteStride', size)
        start = v.get('byteOffset', 0)+a.get('byteOffset', 0)
        return [struct.unpack_from('<'+fmt*arity, binary, start+j*stride) for j in range(a['count'])]
    return raw, doc, binary, values


def triangle_box(triangle, lo, hi):
    # SAT predicate also used by original project tree qualification, including
    # triangles crossing a box while every vertex lies outside.
    center = Vector(tuple((lo[i]+hi[i])*.5 for i in range(3)))
    half = Vector(tuple((hi[i]-lo[i])*.5 for i in range(3)))
    q = [v-center for v in triangle]
    for i in range(3):
        if min(v[i] for v in q) > half[i] or max(v[i] for v in q) < -half[i]:
            return False
    edges = [q[1]-q[0], q[2]-q[1], q[0]-q[2]]
    axes = [edges[0].cross(edges[1])]
    for e in edges:
        axes.extend([Vector((0, e.z, -e.y)), Vector((-e.z, 0, e.x)), Vector((e.y, -e.x, 0))])
    for a in axes:
        if a.length_squared < 1e-18:
            continue
        radius = sum(half[i]*abs(a[i]) for i in range(3))
        projection = [v.dot(a) for v in q]
        if min(projection) > radius+1e-8 or max(projection) < -radius-1e-8:
            return False
    return True


assert triangle_box([Vector((-3, 0, 0)), Vector((3, 0, 0)), Vector((0, 3, 0))], (-1, -1, -1), (1, 1, 1))
assert not triangle_box([Vector((3, 0, 0)), Vector((4, 0, 0)), Vector((3, 1, 0))], (-1, -1, -1), (1, 1, 1))


def inspect(path):
    raw, doc, binary, values = read_glb(path)
    triangles, points, groups = [], [], []
    normal_error, min_area, degenerate = 0, 1e9, 0
    for mesh in doc['meshes']:
        count = 0
        for p in mesh['primitives']:
            positions = [Vector(v) for v in values(p['attributes']['POSITION'])]
            points.extend(positions)
            assert all(math.isfinite(x) for v in positions for x in v)
            for n in values(p['attributes']['NORMAL']):
                normal_error = max(normal_error, abs(Vector(n).length-1))
            if 'TEXCOORD_0' in p['attributes']:
                assert all(math.isfinite(x) and abs(x) < 1000 for v in values(p['attributes']['TEXCOORD_0']) for x in v)
            ids = [v[0] for v in values(p['indices'])]
            assert len(ids) % 3 == 0 and max(ids) < len(positions)
            for j in range(0, len(ids), 3):
                tri = [positions[i] for i in ids[j:j+3]]
                area = (tri[1]-tri[0]).cross(tri[2]-tri[0]).length*.5
                min_area = min(min_area, area)
                if area < 1e-12:
                    degenerate += 1
                triangles.append((mesh['name'], tri))
                count += 1
        groups.append({'name': mesh['name'], 'triangles': count, 'primitives': len(mesh['primitives'])})
    images = []
    for image in doc.get('images', []):
        view = doc['bufferViews'][image['bufferView']]
        payload = binary[view.get('byteOffset', 0):view.get('byteOffset', 0)+view['byteLength']]
        images.append({'name': image.get('name'), 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()})
    return {'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw), 'triangles': len(triangles), 'groups': groups,
            'min': [min(p[i] for p in points) for i in range(3)], 'max': [max(p[i] for p in points) for i in range(3)],
            'maxNormalError': normal_error, 'minTriangleArea': min_area, 'degenerateTriangles': degenerate,
            'images': images, 'animations': len(doc.get('animations', []))}, triangles


def collisions(triangles, boxes):
    result = {}
    for name, (lo, hi) in boxes.items():
        hits = []
        for owner, tri in triangles:
            if any(max(p[i] for p in tri) < lo[i] or min(p[i] for p in tri) > hi[i] for i in range(3)):
                continue
            if triangle_box(tri, lo, hi):
                hits.append({'group': owner, 'point': list(sum(tri, Vector())/3)})
        result[name] = {'count': len(hits), 'samples': hits[:3]}
    return result


def main():
    report = {'revision': 'bound-reed-family-v1-candidate', 'assets': {}}
    geometry = {}
    for path in sorted(OUT.glob('*.glb')):
        info, tri = inspect(path)
        report['assets'][path.stem] = info
        geometry[path.stem] = tri
    anchors = json.loads((ROOT/'src/content/tree-habitats.json').read_text())['profiles']['canopy-proof']['anchors']
    boxes = {}
    for name in ['natural-perch-0', 'natural-perch-1', 'sheltered-perch-0', 'sheltered-perch-1', 'sheltered-perch-2', 'sheltered-perch-3']:
        x, y, z = anchors[name]
        boxes[name] = ([x-.20, y+.13, z-.50], [x+.20, y+.68, z+.26])
    # Existing project shaft reservation, including margin, retained verbatim.
    boxes['basket-sweep'] = ([-2.222, .025, -.923], [-1.078, 3.223, .022])
    route = [anchors[n] for n in ['home-entry', 'home-edge', 'ramp-middle', 'deck-entry']]
    for i, (a, b) in enumerate(zip(route, route[1:])):
        for j in range(11):
            p = Vector(a).lerp(Vector(b), j/10)
            # Both ascent and descent: whole rest-body/tail extents rotated
            # toward ±X. Feet/grasp surfaces are excluded below +.13m.
            boxes[f'route-{i}-{j}'] = ([p.x-.50, p.y+.13, p.z-.20], [p.x+.50, p.y+.68, p.z+.20])
            boxes[f'cargo-{i}-{j}'] = ([p.x-.60, p.y+.40, p.z-.09], [p.x+.60, p.y+.54, p.z+.09])
    report['newHomeBoundedClearances'] = collisions(geometry['boughhome'], boxes)
    report['compatibleDeckBoundedClearances'] = collisions(geometry['sleeping-deck-compatible'], boxes)
    report['limits'] = 'Conservative rest-body/tail/cargo boxes; actual mesh/pose runtime checks remain integration-owned. Functional floor/grasp contacts excluded below feet+.13m.'
    (SOURCE/'qualification-candidate.json').write_text(json.dumps(report, indent=2)+'\n')
    for name, info in report['assets'].items():
        print(name, info['triangles'], info['bytes'], 'degenerate', info['degenerateTriangles'], info['sha256'])
    for name in ['newHomeBoundedClearances', 'compatibleDeckBoundedClearances']:
        hits = {k: v for k, v in report[name].items() if v['count']}
        print(name, json.dumps(hits))


if __name__ == '__main__':
    main()
