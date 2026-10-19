"""Actual exported triangles, support and clearance; Blender 4.5 qualification."""
import bpy,json,struct,math,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[3]
def triangle_box(triangle,lo,hi):
    # Separating-axis triangle/AABB test, including triangles whose vertices all
    # lie outside. This is deliberately stronger than vertex-only clearance.
    center=Vector(tuple((lo[i]+hi[i])*.5 for i in range(3)));half=Vector(tuple((hi[i]-lo[i])*.5 for i in range(3)))
    q=[v-center for v in triangle]
    for i in range(3):
        if min(v[i] for v in q)>half[i] or max(v[i] for v in q)<-half[i]:return False
    edges=[q[1]-q[0],q[2]-q[1],q[0]-q[2]];axes=[edges[0].cross(edges[1])]
    for edge in edges:
        axes.extend([Vector((0,edge.z,-edge.y)),Vector((-edge.z,0,edge.x)),Vector((edge.y,-edge.x,0))])
    for axis in axes:
        if axis.length_squared<1e-18:continue
        radius=sum(half[i]*abs(axis[i]) for i in range(3));projection=[v.dot(axis) for v in q]
        if min(projection)>radius+1e-8 or max(projection)<-radius-1e-8:return False
    return True


# Exercise the separating-axis predicate against containment, separation and a
# crossing triangle with all three vertices outside the box.
assert triangle_box([Vector((0,0,0)),Vector((.5,0,0)),Vector((0,.5,0))],(-1,-1,-1),(1,1,1))
assert not triangle_box([Vector((3,0,0)),Vector((4,0,0)),Vector((3,1,0))],(-1,-1,-1),(1,1,1))
assert triangle_box([Vector((-3,0,0)),Vector((3,0,0)),Vector((0,3,0))],(-1,-1,-1),(1,1,1))

def glb(path):
    data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+n]);offset=28+n
    def values(i):
        a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];k={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];fmt={5126:'f',5125:'I',5123:'H'}[a['componentType']];size=struct.calcsize(fmt);stride=v.get('byteStride',k*size)
        return [struct.unpack_from('<'+fmt*k,data,offset+v.get('byteOffset',0)+a.get('byteOffset',0)+j*stride) for j in range(a['count'])]
    return data,g,values

habitats=json.loads((ROOT/'src/content/tree-habitats.json').read_text());profile=habitats['profiles']['canopy-proof'];anchors=profile['anchors'];presentation=habitats['presentation']
volumes={
 'basket-sweep-with-10cm-margin':([-2.222,.025,-.923],[-1.078,3.223,.022]),
 'cargo-sweep-conservative-previous-large-bundle':([-1.90,.245,-1.019],[-1.40,2.756,.228]),
 'operator-body':([-1.34,.10,-1.04],[-.76,.80,-.46]),
 'loading-approach':([-2.16,.12,-1.40],[-.76,.80,-1.06]),
 'adjacent-ground-arrival':([-.32,.10,-2.32],[.32,.80,-1.68]),
 'ladder-approach':([-.32,.10,-1.43],[.32,.80,-.83]),
 'landing-standing-space':([-1.08,2.32,-.84],[-.73,2.95,-.30]),
 'ground-route-from-left':([-2.20,.10,-2.20],[.20,.80,-1.80]),
 'ground-route-from-right':([-.20,.10,-2.20],[2.20,.80,-1.80]),
 'ground-route-from-front':([-.20,.10,-4.20],[.20,.80,-1.80]),
}
for name in profile['naturalPerches']+profile['shelteredPerches']:
    x,y,z=anchors[name];volumes[name+'-body']=([x-.20,y+.18,z-.52],[x+.20,y+.67,z+.27])
report={'revision':'spatial-metre-v2','habitatRevision':habitats['revision'],'adultScale':presentation['adultScale'],'clearanceVolumes':volumes,'trees':{}}
for name in ['lowfork','splitcrown','reedside']:
    path=ROOT/f'public/assets/environment/{name}.glb';data,g,values=glb(path)
    info={'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'sourceSha256':hashlib.sha256((ROOT/f'assets/sculpted/environment/{name}.blend').read_bytes()).hexdigest(),'meshes':[],'collisions':{k:0 for k in volumes},'naturalSupport':{}}
    allpos=[];woodpos=[];woodfaces=[];alltri=[]
    for m in g['meshes']:
        part={'name':m['name'],'triangles':0,'vertices':0,'minTriangleArea':math.inf,'maxNormalError':0,'collisions':{k:0 for k in volumes},'collisionSamples':{k:[] for k in volumes}}
        for p in m['primitives']:
            pos=[Vector(x) for x in values(p['attributes']['POSITION'])];norm=values(p['attributes']['NORMAL']);idx=[x[0] for x in values(p['indices'])];faces=[idx[i:i+3] for i in range(0,len(idx),3)]
            assert all(math.isfinite(v) for x in pos for v in x);assert all(math.isfinite(v) for x in norm for v in x)
            part['maxNormalError']=max(part['maxNormalError'],max(abs(Vector(n).length-1) for n in norm));part['triangles']+=len(faces);part['vertices']+=len(pos);allpos.extend(pos)
            if 'boughs' in m['name'] or 'continuous branch' in m['name']:
                start=len(woodpos);woodpos.extend(pos);woodfaces.extend([[i+start for i in f] for f in faces])
            for f in faces:
                assert max(f)<len(pos);t=[pos[i] for i in f];alltri.append((m['name'],t));area=(t[1]-t[0]).cross(t[2]-t[0]).length*.5;part['minTriangleArea']=min(part['minTriangleArea'],area)
                # Reject by triangle bounds before the exact separating-axis test.
                tlo=[min(v[i] for v in t) for i in range(3)];thi=[max(v[i] for v in t) for i in range(3)]
                for k,(lo,hi) in volumes.items():
                    if any(tlo[i]>hi[i] or thi[i]<lo[i] for i in range(3)):continue
                    if triangle_box(t,lo,hi):
                        part['collisions'][k]+=1
                        if len(part['collisionSamples'][k])<3:part['collisionSamples'][k].append(list(sum(t,Vector())/3))
        info['meshes'].append(part)
    bvh=BVHTree.FromPolygons(woodpos,woodfaces,all_triangles=True)
    if name=='lowfork':
        import ast
        module=ast.parse((ROOT/'assets/sculpted/trees.py').read_text())
        houses=ast.literal_eval(next(n.value for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='FUTURE_HOUSEHOLDS' for t in n.targets)))
        info['futureRoomClearances']={};info['futureFloorSupport']={};info['futureTurningClearances']={}
        for h in houses:
            c=math.cos(h['yaw']);s=math.sin(h['yaw']);center=Vector(h['at']);hits=[]
            for owner,triangle in alltri:
                if any(max(p[i] for p in triangle)<center[i]-bound or min(p[i] for p in triangle)>center[i]+bound for i,bound in [(0,1.8),(2,1.8)]):continue
                if max(p.y for p in triangle)<center.y+.06 or min(p.y for p in triangle)>center.y+.90:continue
                local=[]
                for p in triangle:
                    q=p-center;local.append(Vector((q.x*c-q.z*s,q.y,q.x*s+q.z*c)))
                if triangle_box(local,(-1.20,.06,-1.10),(1.20,.90,1.10)):
                    if len(hits)<5:hits.append({'mesh':owner,'point':list(sum(local,Vector())/3)})
            info['futureRoomClearances'][h['id']]={'collisionSamples':hits,'clear':not hits}
            landing_hits=[]
            for owner,triangle in alltri:
                if max(p.y for p in triangle)<center.y+.10 or min(p.y for p in triangle)>center.y+1.0:continue
                local=[]
                for p in triangle:
                    q=p-center;local.append(Vector((q.x*c-q.z*s,q.y,q.x*s+q.z*c)))
                if triangle_box(local,(-.75,.10,1.15),(.75,1.0,2.05)) and len(landing_hits)<3:landing_hits.append({'mesh':owner,'point':list(sum(local,Vector())/3)})
            info['futureTurningClearances'][h['id']]={'clear':not landing_hits,'size':[1.5,.9],'collisionSamples':landing_hits}
            support=[]
            for x in [-1,-.5,0,.5,1]:
                for z in [-.85,0,.85]:
                    # Inverse of the room-local rotation above; short bindings
                    # may bridge to the fork, never through the clear interior.
                    at=center+Vector((x*c+z*s,.04,-x*s+z*c))
                    hit,normal,index,dist=bvh.ray_cast(at,Vector((0,-1,0)),.90)
                    if hit is not None and hit.y<center.y-.10:
                        support.append({'floorPoint':[at.x,center.y-.10,at.z],'branchPoint':list(hit),'bindingLength':center.y-.10-hit.y})
            spread=max(((Vector(a['branchPoint'])-Vector(b['branchPoint'])).length for a in support for b in support),default=0)
            info['futureFloorSupport'][h['id']]={'points':support,'spread':spread,'supported':len(support)>=2 and spread>=.8}
        routes=ast.literal_eval(next(n.value for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='FUTURE_SERVICE_ROUTE' for t in n.targets)))
        spurs=ast.literal_eval(next(n.value for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='FUTURE_ACCESS_SPURS' for t in n.targets)))
        info['futureServiceClearances']=[]
        for route in [routes]+spurs:
            for a,b in zip(route,route[1:]):
                a=Vector(a);d=Vector(b)-a;length=math.hypot(d.x,d.z);along=Vector((d.x/length,0,d.z/length));across=Vector((-along.z,0,along.x));hits=[]
                for owner,triangle in alltri:
                    if any(max(p[i] for p in triangle)<min(a[i],a[i]+d[i])-.5 or min(p[i] for p in triangle)>max(a[i],a[i]+d[i])+.5 for i in [0,2]):continue
                    if max(p.y for p in triangle)<min(a.y,a.y+d.y)+.1 or min(p.y for p in triangle)>max(a.y,a.y+d.y)+.9:continue
                    local=[]
                    for p in triangle:
                        q=p-a;z=q.dot(along);local.append(Vector((q.dot(across),q.y-d.y*z/length,z)))
                    if triangle_box(local,(-.325,.10,0),(.325,.90,length)) and len(hits)<3:hits.append({'mesh':owner,'point':list(sum(triangle,Vector())/3)})
                info['futureServiceClearances'].append({'from':list(a),'to':list(a+d),'clear':not hits,'collisionSamples':hits})
        info['futureHoistClearance']={'min':[-5.15,.10,-1.05],'max':[-4.25,4.10,-.15]}
        lo=info['futureHoistClearance']['min'];hi=info['futureHoistClearance']['max'];hits=[]
        for owner,t in alltri:
            if any(max(p[i] for p in t)<lo[i] or min(p[i] for p in t)>hi[i] for i in range(3)):continue
            if triangle_box(t,lo,hi) and len(hits)<3:hits.append({'mesh':owner,'point':list(sum(t,Vector())/3)})
        info['futureHoistClearance']['clear']=not hits;info['futureHoistClearance']['collisionSamples']=hits
    bvh=BVHTree.FromPolygons(woodpos,woodfaces,all_triangles=True)
    for k in profile['naturalPerches']:
        x,y,z=anchors[k];hit,normal,index,dist=bvh.ray_cast(Vector((x,y+.10,z)),Vector((0,-1,0)),1)
        info['naturalSupport'][k]={'topY':hit.y if hit else None,'footGap':y-hit.y if hit else None}
    position_bytes=b''.join(struct.pack('<fff',*p) for p in sorted(set(tuple(p) for p in woodpos)))
    info['uniqueWoodPositionSha256']=hashlib.sha256(position_bytes).hexdigest()
    wood_triangles=sorted(tuple(sorted(tuple(woodpos[i]) for i in face)) for face in woodfaces)
    info['woodTrianglePositionSha256']=hashlib.sha256(b''.join(struct.pack('<fff',*p) for triangle in wood_triangles for p in triangle)).hexdigest()
    info['triangles']=sum(m['triangles'] for m in info['meshes']);info['primitives']=sum(len(m['primitives']) for m in g['meshes'])
    info['bounds']={'min':[min(v[i] for v in allpos) for i in range(3)],'max':[max(v[i] for v in allpos) for i in range(3)]};info['dimensions']=[info['bounds']['max'][i]-info['bounds']['min'][i] for i in range(3)]
    info['collisions']={k:sum(m['collisions'][k] for m in info['meshes']) for k in volumes}
    nodes={n['name']:n.get('translation',[0,0,0]) for n in g['nodes']}
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/f'assets/sculpted/environment/{name}.blend'))
    info['sourceMeshCount']=len([o for o in bpy.context.scene.objects if o.type=='MESH'])
    info['checks']={
      'boundedTriangleBudget':info['triangles']<=45000,
      'twoToThreePrimitives':2<=info['primitives']<=3,
      'allEightCanonicalSockets':all(k in nodes and max(abs(nodes[k][i]-anchors[k][i]) for i in range(3))<1e-5 for k in profile['naturalPerches']+profile['shelteredPerches']+['sheltered-deck','ladder-base']),
      'finiteUnitNormals':all(m['maxNormalError']<.0005 for m in info['meshes']),
      'nondegenerateTriangles':all(m['minTriangleArea']>1e-9 for m in info['meshes']),
      'noAuthoredAnimation':not g.get('animations'),
      'allClearanceVolumesEmpty':all(v==0 for v in info['collisions'].values()),
      'naturalFeetOnLivingWood':all(v['footGap'] is not None and -.025<=v['footGap']<=.08 for v in info['naturalSupport'].values()),
    }
    if name=='lowfork':
        foliage=bpy.data.objects['lowfork broad layered branch fans'];wood=bpy.data.objects['lowfork continuous living boughs metre-v2']
        info['refinement']={'revision':foliage.get('crown_revision'),'barkRevision':wood.get('bark_revision'),'leafCount':foliage.get('leaf_count'),'lobeCount':foliage.get('lobe_count'),'leafFullTipSpanRange':json.loads(foliage.get('leaf_full_tip_span_range','[0,0]')),'baselineRevision':'2aeca35','baselineGlbSha256':'fed2bfebea3f14e677211aaa0da1366d19809f6207cb186e7848d94ff49ef0e1','baselineUniqueWoodPositionSha256':'bc38aad1d3528c9c5c847cffc9545600189428f85288abd4fb159928d0d66c1c','baselineWoodTrianglePositionSha256':'8a2fc4a0a3d83307ee32a3450caa9fd6ef651f96d376e29eeab5b1092ca491ab','positionPolicy':'Support wood positions unchanged; foliage replaced, wood corner normals and color refined'}
        info['checks']['unchangedAcceptedWoodPositions']=info['uniqueWoodPositionSha256']==info['refinement']['baselineUniqueWoodPositionSha256']
        info['checks']['unchangedAcceptedWoodTriangles']=info['woodTrianglePositionSha256']==info['refinement']['baselineWoodTrianglePositionSha256']
        info['checks']['smallEdgeLeaves']=.15<=info['refinement']['leafFullTipSpanRange'][0]<=info['refinement']['leafFullTipSpanRange'][1]<=.301
        info['checks']['futureRoomHeadroom']=all(v['clear'] for v in info['futureRoomClearances'].values())
        info['checks']['futureServiceHeadroom']=all(v['clear'] for v in info['futureServiceClearances'])
        info['checks']['futureHoistClear']=info['futureHoistClearance']['clear']
        info['checks']['futureTurningLandingsClear']=all(v['clear'] for v in info['futureTurningClearances'].values())
        info['checks']['futureFloorsBindToForks']=all(v['supported'] for v in info['futureFloorSupport'].values())
    info['ready']=all(info['checks'].values());report['trees'][name]=info
report['ready']=all(t['ready'] for t in report['trees'].values())
report['sourceRecipeHashes']={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ['assets/sculpted/author.py','assets/sculpted/trees.py']}
(ROOT/'assets/sculpted/trees/qualification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:{'ready':v['ready'],'dimensions':v['dimensions'],'triangles':v['triangles'],'collisions':{n:c for n,c in v['collisions'].items() if c},'support':v['naturalSupport'],'checks':v['checks']} for k,v in report['trees'].items()},indent=2))
assert report['ready'], 'Owned tree qualification failed; inspect qualification.json'
