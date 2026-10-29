"""Actual evaluated lower-foot source vertices over authored sole support."""
import hashlib
import json,math,sys,bpy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from validate_fit import *
living,lh=geometry(ROOT/'public/assets/environment/valley/longbough-living.glb');kit,kh=geometry(ROOT/'public/assets/environment/valley/longbough-woven-kit.glb')
wood=bvh([t for t in living if t[0]=='living-wood']);floor=bvh([t for t in kit if t[0] in ('home-deck','middle-deck')])
report={'revision':C['revision'],'profileSha256':hashlib.sha256((ROOT/'src/content/valley-habitat.json').read_bytes()).hexdigest(),'livingSha256':lh,'kitSha256':kh,'limits':'Actual roost frame12 toe geometry evaluated at .45625. Vertical samples measure sole projection, not IK/grasp/weight or structural strength. Natural living bark is curved; incidental toe penetration/gaps recorded, not hidden.','birds':{}}
for bird in ['fern','rook','dapple','wren']:
 adult(bird,'roost',12);feet={}
 for ob in bpy.context.scene.objects:
  if ob.type!='MESH' or not ob.name.startswith(('leg-left','leg-right')):continue
  e=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());m=e.to_mesh();points=[]
  for v in m.vertices:
   p=ob.matrix_world@v.co;p=Vector((p.x,p.z,-p.y))*C['presentation']['adultScale']
   if p.y<=.015:points.append(p.copy())
  feet[ob.name]=points;e.to_mesh_clear()
 checks={}
 for final in C['profile']['naturalPerches']+C['profile']['shelteredPerches']:
  origin=Vector(A[final]);yaw=C['profile']['perchYawRadians'].get(final,0);co,si=math.cos(yaw),math.sin(yaw);surface=wood if final.startswith('natural') else floor;rows={}
  for name,points in feet.items():
   ps=[Vector((p.x*co+p.z*si,p.y,-p.x*si+p.z*co))+origin for p in points]
   center=sum(ps,Vector())/len(ps);h=surface.ray_cast(center+Vector((0,.3,0)),Vector((0,-1,0)),.8);gaps=[]
   for p in ps:
    q=surface.ray_cast(p+Vector((0,.3,0)),Vector((0,-1,0)),.8)
    if q[0]:gaps.append(p.y-q[0].y)
   rows[name]={'lowVertexSamples':len(ps),'supportedRaySamples':len(gaps),'soleCentroid':list(center),'centroidGap':None if h[0] is None else center.y-h[0].y,'gapMin':min(gaps) if gaps else None,'gapMax':max(gaps) if gaps else None}
  checks[final]=rows
 report['birds'][bird]=checks
(SOURCE/'source-soles.json').write_text(json.dumps(report,indent=2)+'\n')
for n,rows in report['birds']['fern'].items():print('SOLE',n,[(k,round(v['centroidGap'],4) if v['centroidGap'] is not None else None,v['supportedRaySamples'],v['lowVertexSamples']) for k,v in rows.items()],flush=True)

assert all(v["supportedRaySamples"] == v["lowVertexSamples"] and abs(v["centroidGap"]) < .03 for checks in report["birds"].values() for rows in checks.values() for v in rows.values()), "unsupported actual sole projection"
