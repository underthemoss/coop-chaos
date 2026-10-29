"""Source evaluated sole ray support on retained upper berth floor."""
import sys,json
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from validate_buildings import inspect,ROOT,SOURCE
from validate_actual_fit import triangle_bvh
packet=json.loads((ROOT/'output/building-implementation-v1/runtime-access-sweep-v2.json').read_text())
_,tris=inspect(ROOT/'public/assets/environment/buildings/sleeping-deck-compatible.glb')
tris=[t for t in tris if t[0]=='sleeping-deck-weave']
tree,_=triangle_bvh(tris)
report={'asset':'sleeping-deck-compatible.glb','birds':{},'limits':'Source evaluated sole vertices at two unchanged standing berths; rays measure supporting geometry below actual low feet, not strength or dynamic contact certification.'}
for c in packet['characters']:
    results=[]
    for bx in [1.48,2.52]:
        for side in ['left','right']:
            points=[]
            for m in c['meshes']:
                if not m['name'].startswith('leg-'+side):continue
                p=m['positions']
                for i in range(0,len(p),3):
                    x,y,z=[p[i+j]*.365 for j in range(3)]
                    if y<=.025:points.append((x+bx,y+2.85,z-.5))
            contacts=[]
            for p in points:
                loc,n,index,d=tree.ray_cast(Vector((p[0],2.96,p[2])),Vector((0,-1,0)),.30)
                if loc is not None and loc.y<=p[1]+.035:
                    contacts.append({'gap':p[1]-loc.y,'xz':[p[0],p[2]]})
            results.append({'berthX':bx,'foot':side,'soleSamples':len(points),'supportedSamples':len(contacts),'fraction':len(contacts)/len(points),'gapRange':[min(p['gap'] for p in contacts),max(p['gap'] for p in contacts)] if contacts else None})
    report['birds'][c['id']]=results
(SOURCE/'berth-support-qualification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
