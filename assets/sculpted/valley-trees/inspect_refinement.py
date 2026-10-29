"""Source art floor/support checks; never structural or navigation simulation."""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
S=Path(__file__).resolve().parent;P=json.loads((S/'refinement-presentation.json').read_text());bpy.ops.wm.open_mainfile(filepath=str(S/'longbough-refinement-study.blend'))
sys.path.insert(0,str(S));from author_refinement import wood_data_check
wood=bpy.data.objects['living-wood'];boundaries=[json.loads(wood['wood_data_after_assignment']),json.loads(wood['wood_data_after_assembly']),wood_data_check(wood,'saved-source-reopened')]
assert len({b['color_uv_fingerprint'] for b in boundaries})==1,'Wood custom data changed between source boundaries'
(S/'refinement-customdata-boundaries.json').write_text(json.dumps({'state':'PASS','revision':P['revision'],'boundaries':boundaries},indent=2)+'\n')
xyz=lambda p:Vector((p[0],-p[2],p[1]));trees={ob.name:BVHTree.FromObject(ob,bpy.context.evaluated_depsgraph_get()) for ob in bpy.data.objects if ob.type=='MESH'}
fixtures=[]
for fixture in P['birdFixtures']:
 x,y,z=fixture['position'];floor=trees[fixture['floorTag']];hit,_,_,_=floor.ray_cast(xyz((x,y+.12,z)),xyz((0,-1,0)),.3);assert hit is not None and abs(hit.z-y)<.004,(fixture['id'],'floor',hit)
 height=1.35 if fixture['cargo'] else .90;collisions=[]
 for i in range(-2,3):
  for j in range(-2,3):
   xx=x+i*.12;zz=z+j*.12
   for name,tree in trees.items():
    if name==fixture['floorTag']:continue
    hit,_,_,d=tree.ray_cast(xyz((xx,y+.035,zz)),xyz((0,1,0)),height-.035)
    if hit is not None:collisions.append({'group':name,'hitY':hit.z,'x':xx,'z':zz})
 fixtures.append({'id':fixture['id'],'position':fixture['position'],'floor_verified':True,'sampled_headroom_m':height,'obstruction_samples':collisions})
ob=bpy.data.objects['living-wood'];section=[]
for poly in ob.data.polygons:
 ids=list(poly.vertices)
 for a,b in zip(ids,ids[1:]+ids[:1]):
  aa=ob.data.vertices[a].co;bb=ob.data.vertices[b].co
  if (aa.z-1.3)*(bb.z-1.3)<0:
   t=(1.3-aa.z)/(bb.z-aa.z);p=aa.lerp(bb,t);section.append((p.x,-p.y))
anchors=[('lower',[-.15,2.1,-.2]),('lower',[1.15,2.25,-.1]),('middle',[-.15,4.62,-.2]),('middle',[-1.0,4.77,-.1]),('upper',[-1.60,7.05,-.6]),('upper',[2.8,7.20,-.85])]
support=[]
for name,p in anchors:
 pos=xyz(p);close,normal,index,d=trees['living-wood'].find_nearest(pos);support.append({'deck':name,'anchor':p,'distance_to_wood_surface_m':d,'inside_wood':(pos-close).dot(normal)<0})
report={'revision':P['revision'],'fixture_checks':fixtures,'support_anchor_checks':support,'wood_section_y_1_3m':{'x':[min(p[0] for p in section),max(p[0] for p in section)],'z':[min(p[1] for p in section),max(p[1] for p in section)]},'shelter':'No overhead roof; open terraces replace the former rainhood.','limits':'Static source ray/nearest surface samples only. No gameplay mobility, full circulation, population or real structural safety proof.'}
(S/'refinement-source-inspection.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));assert all(not f['obstruction_samples'] for f in fixtures);assert all(a['inside_wood'] or a['distance_to_wood_surface_m']<.13 for a in support)
