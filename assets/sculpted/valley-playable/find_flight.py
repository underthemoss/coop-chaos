"""Diagnostic lattice path through actual source surfaces, no game rules."""
import sys
import heapq
import json
import math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from validate_fit import ROOT,SOURCE,geometry,bvh,adult,A

living,_ = geometry(ROOT/'public/assets/environment/valley/longbough-living.glb')
tree = bvh(living)
points,faces,_ = adult('rook')
goal = Vector(A['natural-perch-1'])
step = .28
start = (4,1,14)
cache = {}
def position(cell):
    return goal+Vector((cell[0]*step,cell[1]*step,cell[2]*step))
def clear(cell):
    if cell not in cache:
        foot=position(cell)
        body=BVHTree.FromPolygons([p+foot for p in points],faces,all_triangles=True)
        bad=[a for a,b in tree.overlap(body) if max(p.y for p in living[a][1])>foot.y+.12]
        cache[cell]=not bad
    return cache[cell]
assert clear((0,0,0))
queue=[(0,0,start)];prior={};cost={start:0};found=None
while queue:
    _,c,at=heapq.heappop(queue)
    if at==(0,0,0):found=at;break
    for axis in range(3):
        for sign in [-1,1]:
            nxt=list(at);nxt[axis]+=sign;nxt=tuple(nxt)
            if not (-6<=nxt[0]<=8 and -3<=nxt[1]<=6 and -8<=nxt[2]<=15):continue
            if not clear(nxt):continue
            nc=c+1
            if nc<cost.get(nxt,1e9):
                cost[nxt]=nc;prior[nxt]=at
                heapq.heappush(queue,(nc+sum(abs(v) for v in nxt),nc,nxt))
if found is None:
    print('NO_PATH',len(cache))
else:
    path=[found]
    while path[-1]!=start:path.append(prior[path[-1]])
    path=list(reversed(path))
    # Drop only exactly collinear consecutive lattice points.
    simple=[path[0]]
    for i in range(1,len(path)-1):
        a,b,c=map(Vector,path[i-1:i+2])
        if (b-a).cross(c-b).length>0:simple.append(path[i])
    simple.append(path[-1])
    report={'sourceFrame':'local physical metres','orientationRadians':0,
            'rookRestSourcePath':[list(position(p)) for p in simple],
            'latticeStep':step,'testedCells':len(cache),'limits':'Diagnostic rest-body path; all4 and movement headings/flight animation must be tested.'}
    (SOURCE/'flight-candidate.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report))
