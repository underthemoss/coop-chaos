"""Actual walk/carry poses along earned access and grounded approach."""
import hashlib
import sys,json,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from validate_fit import *
living,lh=geometry(ROOT/'public/assets/environment/valley/longbough-living.glb');kit,kh=geometry(ROOT/'public/assets/environment/valley/longbough-woven-kit.glb');static=living+kit;surface=bvh(static)
report={'revision':C['revision'],'profileSha256':hashlib.sha256((ROOT/'src/content/valley-habitat.json').read_bytes()).hexdigest(),'livingSha256':lh,'kitSha256':kh,'limits':'Actual evaluated walk4frames, abovefoot+.12 excludes expected foot/grip contacts. Sheltered access is an open climb, not continuously grounded interpolation. Cargo is not claimed on ladders; lift payload is separately qualified.','birds':{}}
segments=[]
for final in C['profile']['shelteredPerches']:
 seq=[A[p['anchor']] for p in C['profile']['placeAccess'][final]]
 segments.extend(zip(seq,seq[1:]))
placement_path=ROOT/'src/content/generated/inhabited-valley-placements-v1.json'
map_path=ROOT/'src/content/generated/inhabited-valley-v1.json'
placement=json.loads(placement_path.read_text());world=json.loads(map_path.read_text())
def cell_position(p):
 tile=world['tiles'][p['z']*world['width']+p['x']]
 return Vector(((p['x']+.5-world['width']/2)*world['cellSize'],(tile['corners'][0]+tile['corners'][2])*.5,(p['z']+.5-world['depth']/2)*world['cellSize']))
origin=cell_position(placement['tree']['at']);work=cell_position(placement['tree']['work'])-origin
report['groundFirstLeg']={'mapSha256':hashlib.sha256(map_path.read_bytes()).hexdigest(),'placementSha256':hashlib.sha256(placement_path.read_bytes()).hexdigest(),'treeWorldOrigin':list(origin),'actualMapWorkLocal':list(work),'courtCenter':C['profile']['groundWorkPoint']}
for source in [list(work),C['profile']['groundWorkPoint']]:
 for field in ['groundApproach','naturalGroundApproach']:
  ground=[source]+[A[n] for n in C['profile'][field]]
  segments.extend(zip(ground,ground[1:]))
 segments.append((source,A['operator-ground']))
for bird in ['fern','rook','dapple','wren']:
 hits=[];count=0
 for frame in [1,8,15,22]:
  ps,fs,owners=adult(bird,'walk',frame)
  for k,(a,b) in enumerate(segments):
   yaw=math.atan2(b[0]-a[0],b[2]-a[2])
   for j in range(9):
    foot=Vector(a).lerp(Vector(b),j/8)
    for direction in [0,math.pi]:
     co,si=math.cos(yaw+direction),math.sin(yaw+direction);vs=[Vector((p.x*co+p.z*si,p.y,-p.x*si+p.z*co))+foot for p in ps];groups={}
     for i,t in surface.overlap(BVHTree.FromPolygons(vs,fs,all_triangles=True)):
      if max(p.y for p in static[i][1])<=foot.y+.12:continue
      key=static[i][0]+'/'+owners[t];groups[key]=groups.get(key,0)+1
     if groups:hits.append({'frame':frame,'segment':k,'sample':j,'foot':list(foot),'yaw':yaw+direction,'groups':groups})
     count+=1
 report['birds'][bird]={'poseCount':count,'hits':hits};print('ACCESS_ANIMATION',bird,count,len(hits),flush=True)
(SOURCE/'source-access-animation.json').write_text(json.dumps(report,indent=2)+'\n')
assert not any(v['hits'] for v in report['birds'].values()), 'actual access animation surface intersections'
