"""Bounded actual animated-body natural perch search; no sculpt changes."""
import sys,json,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from validate_fit import *
living,_=geometry(ROOT/'public/assets/environment/valley/longbough-living.glb')
static=bvh(living);wood=bvh([t for t in living if t[0]=='living-wood'])
poses=[]
for bird in ['fern','rook','dapple','wren']:
 for clip,frame in [('idle',1),('roost',1),('roost',12),('roost',25)]:
  pts,faces,owners=adult(bird,clip,frame)
  poses.append((bird,clip,frame,pts,faces,owners))
found=[]
for ix in range(37):
 x=2.60+ix*.08
 for iz in range(33):
  z=-2.0+iz*.08
  hit=wood.ray_cast(Vector((x,9.0,z)),Vector((0,-1,0)),3.0)
  if hit[0] is None or hit[1].y<.85:continue
  y=hit[0].y
  soles=[]
  for dx,dz in [(-.07,-.05),(.07,-.05),(-.07,.05),(.07,.05)]:
   h=wood.ray_cast(Vector((x+dx,y+.25,z+dz)),Vector((0,-1,0)),.6)
   soles.append(h[0].y-y if h[0] else None)
  if None in soles or max(soles)-min(soles)>.15:continue
  for yaw in [0,math.pi/2,-math.pi/2,math.pi]:
   c,s=math.cos(yaw),math.sin(yaw)
   feet=[]
   for side in [-.1,.1]:
    q=wood.ray_cast(Vector((x+side*c,y+.3,z-side*s)),Vector((0,-1,0)),.65)
    feet.append(q[0].y-y if q[0] else None)
   if None in feet or max(feet)-min(feet)>.045:continue
   c,s=math.cos(yaw),math.sin(yaw);bad=[]
   for bird,clip,frame,pts,faces,owners in poses:
    vs=[Vector((p.x*c+p.z*s+x,p.y+y,-p.x*s+p.z*c+z)) for p in pts]
    pairs=static.overlap(BVHTree.FromPolygons(vs,faces,all_triangles=True))
    groups={}
    for a,b in pairs:
     if max(p.y for p in living[a][1])<=y+.12:continue
     key=living[a][0]+' / '+owners[b]
     groups[key]=groups.get(key,0)+1
    if groups:bad.append((bird,clip,frame,groups))
   if not bad:found.append({'position':[x,y,z],'yaw':yaw,'normal':list(hit[1]),'soleRange':soles,'distance':math.hypot(x-3.96,z+.64),'footCenters':feet})
found.sort(key=lambda r:r['distance'])
(SOURCE/'roost-candidates.json').write_text(json.dumps(found,indent=2)+'\n')
print('FOUND',len(found),found[:5],flush=True)
# actual guide tie surface diagnostic
for p in [(1.8,4.65,.45),(1.7,4.65,.45),(1.9,4.65,.45)]:
 n,norm,_,dist=wood.find_nearest(Vector(p));print('GUIDE',p,dist,(Vector(p)-n).dot(norm),list(n),flush=True)
