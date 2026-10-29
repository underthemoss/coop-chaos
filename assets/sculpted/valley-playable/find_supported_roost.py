"""Search actual toe-supported natural branches with evaluated adult roosts."""
import sys,json,math,bpy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from validate_fit import *
living,_=geometry(ROOT/'public/assets/environment/valley/longbough-living.glb');surface=bvh(living);wood=bvh([t for t in living if t[0]=='living-wood'])
poses=[];sole_clouds=[]
for bird in ['fern','rook','dapple','wren']:
 for frame in [1,12,25]:
  p,f,n=adult(bird,'roost',frame);poses.append((bird,frame,p,f,n))
 if bird=='fern':
  for ob in bpy.context.scene.objects:
   if ob.type!='MESH' or not ob.name.startswith(('leg-left','leg-right')):continue
   e=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());m=e.to_mesh();ps=[]
   for v in m.vertices:
    q=ob.matrix_world@v.co;q=Vector((q.x,q.z,-q.y))*.45625
    if q.y<=.015:ps.append(q.copy())
   sole_clouds.append(ps);e.to_mesh_clear()
centers=[sum(ps,Vector())/len(ps) for ps in sole_clouds]
found={}
for side, xr, zr, old in [('left',[-4.2,-2.6],[-1.1,.1],A['natural-perch-0']),('right',[3.2,4.8],[-1.5,.3],A['natural-perch-1'])]:
 rows=[]
 for ix in range(round((xr[1]-xr[0])/.08)+1):
  x=xr[0]+ix*.08
  for iz in range(round((zr[1]-zr[0])/.08)+1):
   z=zr[0]+iz*.08
   for yaw in [0,math.pi/2,-math.pi/2,math.pi]:
    co,si=math.cos(yaw),math.sin(yaw)
    def turn(p):return Vector((p.x*co+p.z*si,p.y,-p.x*si+p.z*co))
    heights=[]
    for center in centers:
     p=turn(center);h=wood.ray_cast(Vector((x+p.x,10,z+p.z)),Vector((0,-1,0)),4.4)
     if h[0] is None:break
     heights.append(h[0].y-p.y)
    if len(heights)!=2 or abs(heights[0]-heights[1])>.05:continue
    y=sum(heights)/2
    if not 6.2<y<9.2:continue
    ranges=[];valid=True
    for cloud in sole_clouds:
     gaps=[]
     for p in cloud[::4]:
      q=turn(p)+Vector((x,y,z));h=wood.ray_cast(q+Vector((0,.3,0)),Vector((0,-1,0)),.7)
      if h[0] is None:valid=False;break
      gaps.append(q.y-h[0].y)
     if not valid:break
     if min(gaps)<-.09 or max(gaps)>.09:valid=False;break
     ranges.append([min(gaps),max(gaps)])
    if not valid:continue
    bad=False
    for bird,frame,ps,fs,owners in poses:
     points=[turn(p)+Vector((x,y,z)) for p in ps]
     for a,b in surface.overlap(BVHTree.FromPolygons(points,fs,all_triangles=True)):
      if max(p.y for p in living[a][1])>y+.12:bad=True;break
     if bad:break
    if not bad:rows.append({'position':[x,y,z],'yaw':yaw,'centroidGaps':[y-h for h in heights],'soleSampleRange':ranges,'distance':math.hypot(x-old[0],z-old[2])+abs(y-old[1])*.2})
 rows.sort(key=lambda r:r['distance']);found[side]=rows
 print('SUPPORTED',side,len(rows),rows[:3],flush=True)
(SOURCE/'supported-roost-candidates.json').write_text(json.dumps(found,indent=2)+'\n')
