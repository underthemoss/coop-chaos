"""Source-export animation poses against actual imported infrastructure."""
import hashlib
import json
import math
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from validate_fit import ROOT,SOURCE,C,A,geometry,bvh,adult

living,lh = geometry(ROOT/'public/assets/environment/valley/longbough-living.glb')
kit,kh = geometry(ROOT/'public/assets/environment/valley/longbough-woven-kit.glb')
static = living+kit
tree = bvh(static)
report = {'revision':C['revision'],'profileSha256':hashlib.sha256((ROOT/'src/content/valley-habitat.json').read_bytes()).hexdigest(),'livingSha256':lh,'kitSha256':kh,
          'limits':'Source Blender glTF NLA flight5frames for authored progress<=.70 and folded roost3frames for authored>=2/3 (saved>=.70), plus all settled roosts. Perch yaw blend follows saved .66→.73, with source path occupying saved .10→1.00. Both travel headings sampled before final segment; runtime animation blending and transformed journeys remain independently qualified. Sole/grip region belowfoot+.12 excluded.', 'birds':{}}
for name in ['fern','rook','dapple','wren']:
    hits=[];count=0
    for clip,frames in [('flight',[1,6,11,16,20]),('roost',[1,12,25])]:
        for frame in frames:
            points,faces,owners=adult(name,clip,frame)
            poses=[]
            if clip=='roost':
                poses=[(n,A[n],C['profile'].get('perchYawRadians',{}).get(n,0)) for n in C['profile']['naturalPerches']+C['profile']['shelteredPerches']]
            for final in C['profile']['naturalPerches']:
                route=C['profile']['placeAccess'][final]
                seq=[A[p['anchor']] for p in route]
                for segment,(a,b) in enumerate(zip(seq,seq[1:])):
                    yaw=math.atan2(b[0]-a[0],b[2]-a[2])
                    for j in range(9):
                        progress=route[segment]['progress']+(route[segment+1]['progress']-route[segment]['progress'])*j/8
                        if (clip=='flight' and progress>.70) or (clip=='roost' and progress<(2/3)):continue
                        perch_yaw=C['profile']['perchYawRadians'][final]
                        for direction in [0,math.pi]:
                            heading=yaw+direction
                            weight=max(0,min(1,(.1+.9*progress-.66)/.07))
                            heading+=math.atan2(math.sin(perch_yaw-heading),math.cos(perch_yaw-heading))*weight
                            poses.append((f'{final}-segment{segment}-{j}',list(Vector(a).lerp(Vector(b),j/8)),heading))
            for label,foot,yaw in poses:
                c,s=math.cos(yaw),math.sin(yaw)
                vertices=[Vector((p.x*c+p.z*s+foot[0],p.y+foot[1],-p.x*s+p.z*c+foot[2])) for p in points]
                body=BVHTree.FromPolygons(vertices,faces,all_triangles=True)
                groups={}
                for a,b in tree.overlap(body):
                    if max(p.y for p in static[a][1])<=foot[1]+.12:continue
                    key=static[a][0]+' / '+owners[b]
                    groups[key]=groups.get(key,0)+1
                if groups:hits.append({'clip':clip,'frame':frame,'pose':label,'foot':foot,'yaw':yaw,'groups':groups})
                count+=1
    assert not hits, (name, hits)
    report['birds'][name]={'poseCount':count,'intersectingPoses':len(hits),'hits':hits}
    print('ANIMATION_FIT',name,count,len(hits),flush=True)
(SOURCE/'source-animation-fit.json').write_text(json.dumps(report,indent=2)+'\n')
