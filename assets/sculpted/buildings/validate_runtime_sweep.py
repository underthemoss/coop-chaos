"""Indexed intersection proof from integration-owned evaluated body packet.

Cargo is tested as a hypothetical envelope only: saved access disallows cargo.
Selection rings and disabled food presentation are deliberately excluded.
"""
import json
import math
import sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_buildings import inspect, ROOT, SOURCE
from validate_actual_fit import triangle_bvh

packet_path = sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'output/building-implementation-v1/runtime-access-sweep-v2.json'
packet = json.loads((ROOT/packet_path).read_text())
if 'birds' in packet:
    baseline=json.loads((ROOT/'output/building-implementation-v1/runtime-access-sweep-v2.json').read_text())
    samples={c['id']:c['samples'] for c in baseline['characters']}
    for c in packet['birds']:
        c['samples']=samples[c['id']]
        c['clamber']=.35 if c['flight']['slot']>=2 else 0
    packet['characters']=packet.pop('birds')
angle = float(sys.argv[sys.argv.index('--')+2]) if '--' in sys.argv and len(sys.argv)>sys.argv.index('--')+2 else None
if angle is not None:
    original_packet=json.loads((ROOT/'output/building-implementation-v1/runtime-access-sweep-v2.json').read_text())
    for c,old in zip(original_packet['characters'],packet['characters']):
        flags={m['name']:m.get('clamber',False) for m in old['meshes']}
        for m in c['meshes']: m['clamber']=flags.get(m['name'],False)
        c['clamber']=0
    packet=original_packet
report = {'packet': packet_path, 'assets': {}, 'checks': [], 'upperBodyAngle':angle}
static = {}
for asset in ['boughhome', 'sleeping-deck-compatible']:
    info, tris = inspect(ROOT/f'public/assets/environment/buildings/{asset}.glb')
    report['assets'][asset] = info['sha256']
    static[asset] = (tris, *triangle_bvh(tris))
for c in packet['characters']:
    for sample in c['samples']:
        yaw = sample['yaw']; co, si = math.cos(yaw), math.sin(yaw)
        foot = sample['treeLocalFoot']
        for cargo in [False, True]:
            points, faces, names = [], [], []
            for mesh in c['meshes']:
                if mesh['cargo'] != cargo or (not cargo and ('sculpted mesh' not in mesh['name'])):
                    continue
                first = len(points)
                p = mesh['positions']; scale = c['rootScale']
                for i in range(0,len(p),3):
                    x,y,z = p[i:i+3]
                    if angle is not None and mesh.get('clamber') and sample['direction']=='down':
                        delta=angle-c.get('clamber',0);cy,sy=math.cos(delta),math.sin(delta)
                        y,z=(y-.75)*cy-z*sy+.75,(y-.75)*sy+z*cy
                    x,y,z=x*scale[0],y*scale[1],z*scale[2]
                    points.append(Vector((x*co+z*si+foot[0],y+foot[1],-x*si+z*co+foot[2])))
                ids=mesh['indices']
                for i in range(0,len(ids),3):
                    tri=tuple(first+v for v in ids[i:i+3])
                    if max(points[v].y for v in tri) > foot[1]+.13:
                        faces.append(tri);names.append(mesh['name'])
            bvh = BVHTree.FromPolygons(points, faces, all_triangles=True)
            for asset,(tris,tree,owners) in static.items():
                pairs=tree.overlap(bvh)
                pairs=[(a,b) for a,b in pairs if max(v.y for v in tris[a][1])>foot[1]+.13]
                groups={}; moving_groups={}
                for a,b in pairs:
                    groups[owners[a]]=groups.get(owners[a],0)+1
                    moving_groups[names[b]]=moving_groups.get(names[b],0)+1
                report['checks'].append({'bird':c['id'],'direction':sample['direction'],'progress':sample['progress'],'cargoHypothetical':cargo,'asset':asset,'intersections':len(pairs),'groups':groups,'movingGroups':moving_groups,'firstTriangle': [list(v) for v in tris[pairs[0][0]][1]] if pairs else None})
report['limits']='Surface intersections from supplied evaluated reduced-motion pose repositioned at 3 saved positions both headings per bird. Below foot+.13 contacts excluded. Does not establish continuous animation, navigation, or cargo permission.'
(SOURCE/(f'runtime-angle-{angle:.2f}.json' if angle is not None else 'runtime-clamber-candidate.json' if 'clamber' in packet_path else 'runtime-sweep-candidate.json')).write_text(json.dumps(report,indent=2)+'\n')
for asset in static:
    checks=[c for c in report['checks'] if c['asset']==asset]
    print(asset,len(checks),'checks',sum(c['intersections']>0 for c in checks),'intersecting')
    for c in checks:
        if c['intersections']: print(c['bird'],c['direction'],c['progress'],c['cargoHypothetical'],c['groups'])
