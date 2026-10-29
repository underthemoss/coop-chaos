"""Search existing living surface for supported actual-body-clear roosts."""
import json
import math
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from validate_fit import SOURCE, ROOT, geometry, bvh, adult

living, _ = geometry(ROOT/'public/assets/environment/valley/longbough-living.glb')
wood = bvh([t for t in living if t[0] == 'living-wood'])
tree = bvh(living)
points, faces, owners = adult('rook')
results = []
for side in [-1,1]:
    candidates = []
    for ix in range(10):
        x = side*(2.2+ix*.22)
        for iz in range(13):
            z = -.8+iz*.16
            hit, normal, _, _ = wood.ray_cast(Vector((x,10,z)), Vector((0,-1,0)), 6)
            if hit is None or normal.y < .6:
                continue
            foot = Vector((x,hit.y+.015,z))
            support = []
            for dx,dz in [(-.07,-.05),(-.07,.05),(.07,-.05),(.07,.05)]:
                probe = wood.ray_cast(foot+Vector((dx,.3,dz)),Vector((0,-1,0)),.65)[0]
                if probe is not None:
                    support.append(probe.y)
            if len(support) != 4 or max(support)-min(support) > .09:
                continue
            for yaw in [0,math.pi/2,-math.pi/2,math.pi]:
                c,s=math.cos(yaw),math.sin(yaw)
                verts = [Vector((p.x*c+p.z*s+foot.x,p.y+foot.y,-p.x*s+p.z*c+foot.z)) for p in points]
                body = BVHTree.FromPolygons(verts,faces,all_triangles=True)
                pairs = tree.overlap(body)
                bad = [a for a,b in pairs if max(p.y for p in living[a][1]) > foot.y+.12]
                if not bad:
                    candidates.append({'foot': list(foot),'yaw':yaw,'normalY':normal.y,
                                       'footSupportRange':max(support)-min(support)})
    results.append({'side':side,'candidates':candidates})
    print('CANDIDATES',side,len(candidates),flush=True)
(SOURCE/'perch-candidates.json').write_text(json.dumps(results,indent=2)+'\n')
