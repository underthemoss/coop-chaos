"""Read-only GLB source measurements for deterministic map masks; no DCC dependency."""
import hashlib
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'assets/sculpted/valley-trees'))
from validate import decode, bounds
out = {'revision': 'inhabited-map-prop-bounds-v1', 'coordinates': 'Identity source glTF metres, +Y up. Low wood AABB samples include source Y<=1.5m, conservatively over adult body at selected .65/.7 scales. Rock AABB exactly matches renderer half extents.'}
for name in ['dressing-birch', 'dressing-willow', 'valley-boulder', 'valley-cliff-ledge']:
    relative = f'public/assets/environment/{name}.glb'
    gltf, access, raw = decode(ROOT / relative)
    all_points, wood, triangles = [], [], 0
    for node in gltf['nodes']:
        if 'mesh' not in node:
            continue
        assert not any(k in node for k in ['translation', 'rotation', 'scale', 'matrix'])
        primitives = gltf['meshes'][node['mesh']]['primitives']
        points = [q for p in primitives for q in access(p['attributes']['POSITION'])]
        all_points.extend(points)
        if 'stem' in node.get('name', '') or 'bough' in node.get('name', ''):
            wood.extend(points)
        triangles += sum(len(access(p['indices'])) // 3 for p in primitives)
    out[name] = {'path': relative, 'sha256': hashlib.sha256(raw).hexdigest(), 'bounds': bounds(all_points), 'lowWoodBounds': bounds([p for p in wood if p[1] <= 1.5]) if wood else None, 'triangles': triangles}
(ROOT / 'assets/maps/inhabited-map-prop-bounds-v1.json').write_text(json.dumps(out, indent=2) + '\n')
print('Measured two smaller tree forms and both canonical rock forms.')
