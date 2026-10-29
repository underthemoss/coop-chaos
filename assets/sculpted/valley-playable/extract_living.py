"""Lossless GLB subset: accepted v8 living sculpt, original accessor bytes.

No vertex, normal, UV, color, index, texture or material values are rewritten.
The separate compact file drops the static timber/props and unused resources.
"""
import copy
import hashlib
import json
import math
import struct
import sys
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
sys.path.insert(0, str(ROOT/'assets/sculpted/valley-trees'))
from validate import decode, bounds

ORIGINAL = ROOT/'public/assets/environment/studies/longbough-refinement-study.glb'
OUTPUT = ROOT/'public/assets/environment/valley/longbough-living.glb'


def extract():
    g, access, raw = decode(ORIGINAL)
    length = struct.unpack_from('<I', raw, 12)[0]
    binary = raw[28+length:]
    nodes = [n for n in g['nodes'] if n['name'] in ('living-wood', 'crown-foliage')]
    meshes = [copy.deepcopy(g['meshes'][n['mesh']]) for n in nodes]
    materials = sorted({p['material'] for m in meshes for p in m['primitives']})
    mats = [copy.deepcopy(g['materials'][i]) for i in materials]
    textures = sorted({m['pbrMetallicRoughness']['baseColorTexture']['index']
                       for m in mats if 'baseColorTexture' in m['pbrMetallicRoughness']})
    tex = [copy.deepcopy(g['textures'][i]) for i in textures]
    images = sorted({t['source'] for t in tex})
    ims = [copy.deepcopy(g['images'][i]) for i in images]
    samplers = sorted({t['sampler'] for t in tex if 'sampler' in t})
    axs = sorted({a for m in meshes for p in m['primitives'] for a in
                  list(p['attributes'].values())+[p['indices']]})
    accessors = [copy.deepcopy(g['accessors'][i]) for i in axs]
    views = sorted({a['bufferView'] for a in accessors}|{i['bufferView'] for i in ims})
    buf, new_views = bytearray(), []
    for i in views:
        v = copy.deepcopy(g['bufferViews'][i])
        while len(buf) % 4:
            buf.append(0)
        start = v.get('byteOffset', 0)
        v['byteOffset'] = len(buf)
        buf.extend(binary[start:start+v['byteLength']])
        new_views.append(v)
    for a in accessors:
        a['bufferView'] = views.index(a['bufferView'])
    for image in ims:
        image['bufferView'] = views.index(image['bufferView'])
    for t in tex:
        t['source'] = images.index(t['source'])
        if 'sampler' in t:
            t['sampler'] = samplers.index(t['sampler'])
    for m in mats:
        p = m['pbrMetallicRoughness']
        if 'baseColorTexture' in p:
            p['baseColorTexture']['index'] = textures.index(p['baseColorTexture']['index'])
    for m in meshes:
        for p in m['primitives']:
            p['material'] = materials.index(p['material'])
            p['indices'] = axs.index(p['indices'])
            p['attributes'] = {k: axs.index(v) for k, v in p['attributes'].items()}
    result = {'asset': {'version': '2.0', 'generator': 'Coop Chaos lossless v8 living subset'},
              'scene': 0, 'scenes': [{'nodes': [0]}],
              'nodes': [{'name': 'asset', 'children': [1, 2]}]+[
                  dict(copy.deepcopy(n), mesh=i) for i, n in enumerate(nodes)],
              'meshes': meshes, 'materials': mats, 'textures': tex, 'images': ims,
              'samplers': [g['samplers'][i] for i in samplers],
              'accessors': accessors, 'bufferViews': new_views,
              'buffers': [{'byteLength': len(buf)}]}
    js = json.dumps(result, separators=(',', ':')).encode()
    js += b' '*((-len(js)) % 4)
    buf += b'\0'*((-len(buf)) % 4)
    out = struct.pack('<III', 0x46546c67, 2, 28+len(js)+len(buf))
    out += struct.pack('<II', len(js), 0x4e4f534a)+js
    out += struct.pack('<II', len(buf), 0x004e4942)+buf
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(out)
    original_attrs = {}
    for n in nodes:
        p = g['meshes'][n['mesh']]['primitives'][0]
        original_attrs[n['name']] = {
            k: hashlib.sha256(repr(access(a)).encode()).hexdigest()
            for k, a in dict(p['attributes'], indices=p['indices']).items()}
    ng, na, _ = decode(OUTPUT)
    for n in ng['nodes']:
        if 'mesh' in n:
            p = ng['meshes'][n['mesh']]['primitives'][0]
            for k, a in dict(p['attributes'], indices=p['indices']).items():
                assert hashlib.sha256(repr(na(a)).encode()).hexdigest() == original_attrs[n['name']][k]
    receipt = {'revision': 'v8-lossless-living-subset-v1',
               'source': str(ORIGINAL.relative_to(ROOT)), 'sourceSha256': hashlib.sha256(raw).hexdigest(),
               'output': str(OUTPUT.relative_to(ROOT)), 'sha256': hashlib.sha256(out).hexdigest(),
               'bytes': len(out), 'exactDecodedAccessorEquality': original_attrs,
               'scope': 'No geometry/material/sculpt changes; removed every static structure and root-dressing prop.'}
    (SOURCE/'living-extraction.json').write_text(json.dumps(receipt, indent=2)+'\n')
    return g, access, raw


def root_sections(g, access, raw):
    wood = next(n for n in g['nodes'] if n['name'] == 'living-wood')
    p = g['meshes'][wood['mesh']]['primitives'][0]
    points = access(p['attributes']['POSITION'])
    ids = [i[0] for i in access(p['indices'])]
    triangles = [[points[j] for j in ids[i:i+3]] for i in range(0, len(ids), 3)]
    sections = []
    for y in [-.25, 0, .25, .5, .75, 1]:
        segments = []
        for tri in triangles:
            cut = []
            for a, b in zip(tri, tri[1:]+tri[:1]):
                if (a[1] <= y < b[1]) or (b[1] <= y < a[1]):
                    t = (y-a[1])/(b[1]-a[1])
                    cut.append((a[0]+t*(b[0]-a[0]), a[2]+t*(b[2]-a[2])))
            if len(cut) == 2:
                segments.append(cut)
        # Farthest exact segment intersection on 72 radial spokes. This is a
        # useful outer reservation polygon; cavities are intentionally covered.
        polygon = []
        for i in range(72):
            dx, dz = math.cos(i/72*math.tau), math.sin(i/72*math.tau)
            radii = []
            for (ax, az), (bx, bz) in segments:
                sx, sz = bx-ax, bz-az
                det = dx*sz-dz*sx
                if abs(det) < 1e-12:
                    continue
                t = (ax*sz-az*sx)/det
                u = (ax*dz-az*dx)/det
                if t >= 0 and 0 <= u <= 1:
                    radii.append(t)
            r = max(radii, default=0)
            polygon.append([round(r*dx, 5), round(r*dz, 5)])
        sections.append({'y': y, 'outerPolygonXZ': polygon,
                         'exactSurfaceSegmentsXZ': [[[round(x, 5), round(z, 5)] for x, z in s] for s in segments]})
    report = {'revision': 'v8-root-surfaces-v1', 'sourceSha256': hashlib.sha256(raw).hexdigest(),
              'coordinateSpace': 'Hero-local metres; Y0 anatomical ground. No placement or cell scale.',
              'allWoodYLe1IncludingBuried': bounds([v for v in points if v[1] <= 1]),
              'visibleWood0To1': bounds([v for v in points if 0 <= v[1] <= 1]),
              'nearGroundAbsYLe005': bounds([v for v in points if abs(v[1]) <= .05]),
              'sections': sections,
              'guidance': 'Intersect actual terrain height with sections; pad by actual body radius for travel. Outer radial polygons conservatively cover cavities between buttresses. Do not obstruct canopy footprint or normalize negative underside to terrain.'}
    (SOURCE/'root-sections.json').write_text(json.dumps(report, indent=2)+'\n')


if __name__ == '__main__':
    root_sections(*extract())
