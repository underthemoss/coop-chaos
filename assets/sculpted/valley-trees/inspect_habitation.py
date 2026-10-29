"""Editable source floor/fixture/headroom checks, not gameplay/safety validation."""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
S=Path(__file__).resolve().parent;P=json.loads((S/'habitation-presentation.json').read_text());bpy.ops.wm.open_mainfile(filepath=str(S/'longbough-habitation-study.blend'))
def xyz(p):return Vector((p[0],-p[2],p[1]))
trees={ob.name:BVHTree.FromObject(ob,bpy.context.evaluated_depsgraph_get()) for ob in bpy.data.objects if ob.type=='MESH'}
fixtures=[]
for fixture in P['birdFixtures']:
 x,y,z=fixture['position'];floor=trees[fixture['floorTag']];hit,_,_,_=floor.ray_cast(xyz((x,y+.12,z)),xyz((0,-1,0)),.3);assert hit is not None and abs(hit.z-y)<.004,(fixture['id'],'floor',hit)
 height=1.35 if fixture['cargo'] else .90;collisions=[];clearance=[]
 for i in range(-2,3):
  for j in range(-2,3):
   xx=x+i*.12;zz=z+j*.12
   for name,tree in trees.items():
    if name==fixture['floorTag']:continue
    hit,_,_,d=tree.ray_cast(xyz((xx,y+.035,zz)),xyz((0,1,0)),height-.035)
    if hit is not None:collisions.append({'group':name,'hitY':hit.z,'x':xx,'z':zz})
 fixtures.append({'id':fixture['id'],'position':fixture['position'],'floor_verified':True,'sampled_headroom_m':height,'obstruction_samples':collisions})
# Roof interior dimensions are bounded art geometry, never housing capacity.
interior=[]
for i in range(6):
 for j in range(6):
  x=-2.25+i*.5;z=.90+j*.48;y=5.72;hits=[]
  for name in ('living-wood','study-structure-woven-hood-basket'):
   hit,_,_,d=trees[name].ray_cast(xyz((x,y+.035,z)),xyz((0,1,0)),2.2)
   if hit is not None:hits.append((hit.z-y,name))
  if hits:interior.append({'x':x,'z':z,'clearance_m':min(h[0] for h in hits),'group':min(hits)[1]})
# Actual wood cross-section at low working trunk, distinct from root envelope.
ob=bpy.data.objects['living-wood'];section=[]
for poly in ob.data.polygons:
 ids=list(poly.vertices)
 for a,b in zip(ids,ids[1:]+ids[:1]):
  aa=ob.data.vertices[a].co;bb=ob.data.vertices[b].co
  if (aa.z-1.3)*(bb.z-1.3)<0:
   t=(1.3-aa.z)/(bb.z-aa.z);p=aa.lerp(bb,t);section.append((p.x,-p.y))
report={'revision':P['revision'],'fixture_checks':fixtures,'shelter_clear_region_m':{'width':2.5,'depth':2.4,'sample_count':36,'minimum_sampled_clearance_m':min(r['clearance_m'] for r in interior)},'shelter_samples':interior,'wood_section_y_1_3m':{'x':[min(p[0] for p in section),max(p[0] for p in section)],'z':[min(p[1] for p in section),max(p[1] for p in section)]},'limits':'Static source ray samples only. No gameplay mobility, circulation, population or real structural safety claim.'}
(S/'habitation-source-inspection.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
