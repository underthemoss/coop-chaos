"""Read actual Lowfork GLB triangles; qualify clearances, topology and source.
Run in Blender 4.5 LTS, after the bounded author command.
"""
import bpy, json, struct, math, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[3]
PATH=ROOT/'public/assets/environment/lowfork.glb'
b=PATH.read_bytes();length=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+length]);offset=28+length

def values(i):
    a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];fmt={5126:'f',5125:'I',5123:'H'}[a['componentType']];size=struct.calcsize(fmt);stride=v.get('byteStride',n*size)
    return [struct.unpack_from('<'+fmt*n,b,offset+v.get('byteOffset',0)+a.get('byteOffset',0)+j*stride) for j in range(a['count'])]

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

# Qualification of the collision predicate itself: a large crossing triangle
# has no vertex inside the box, and the separated triangle misses on its plane.
unitlo=(-1,-1,-1);unithi=(1,1,1)
assert triangle_box([Vector((-3,0,0)),Vector((3,0,0)),Vector((0,3,0))],unitlo,unithi)
assert not triangle_box([Vector((-3,0,2)),Vector((3,0,2)),Vector((0,3,2))],unitlo,unithi)
assert not triangle_box([Vector((2,2,0)),Vector((3,2,0)),Vector((2,3,0))],unitlo,unithi)

# Full basket travel + .10m clearance; actual cargo bundle dimensions at runtime
# .85 scale + .10m clearance. The second box includes cargo beyond basket depth.
volumes={
 'basket-sweep-with-10cm-margin':([-2.222,.025,-.923],[-1.078,3.223,.022]),
 'cargo-sweep-with-10cm-margin':([-1.90,.245,-1.019],[-1.40,2.756,.228]),
 'operator-body':([-1.34,.10,-1.04],[-.76,.94,-.46]),
 'loading-approach':([-2.16,.12,-1.40],[-.76,.84,-1.06]),
 'adjacent-ground-arrival':([-.32,.10,-2.32],[.32,.85,-1.68]),
 'ladder-approach':([-.32,.10,-1.43],[.32,.80,-.83]),
 'landing-standing-space':([-1.08,2.32,-.84],[-.73,2.95,-.30]),
}
habitats=json.loads((ROOT/'src/content/tree-habitats.json').read_text());profile=habitats['profiles']['canopy-proof'];anchors=profile['anchors']
perches={name:anchors[name] for name in profile['naturalPerches']+profile['shelteredPerches']}
for name,(x,y,z) in perches.items():volumes[name+'-body']=([x-.27,y+.28,z-.25],[x+.27,y+1.33,z+.25])
report={'revision':'lowfork-anatomy-v3-bark-v4','sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'meshes':[],'clearanceVolumes':volumes,'collisions':{},'perches':perches,'source':{},'sourceHashes':{name:hashlib.sha256((ROOT/f'assets/sculpted/environment/{name}.blend').read_bytes()).hexdigest() for name in ['lowfork','woven-home']}}
geometry={};wood_flat=0;wood_triangles=0;wood_corner_deviation=0
allpos=[];wood_bvh=None
for mesh in g['meshes']:
    counts={'name':mesh['name'],'triangles':0,'vertices':0,'minTriangleArea':math.inf,'maxNormalError':0,'collisions':{k:0 for k in volumes},'collisionSamples':{k:[] for k in volumes}}
    geometry_triangles=[]
    for p in mesh['primitives']:
        pos=[Vector(x) for x in values(p['attributes']['POSITION'])];norm=values(p['attributes']['NORMAL']);idx=[x[0] for x in values(p['indices'])];faces=[idx[i:i+3] for i in range(0,len(idx),3)]
        assert all(math.isfinite(v) for x in pos for v in x);assert all(math.isfinite(v) for x in norm for v in x)
        counts['maxNormalError']=max(counts['maxNormalError'],max(abs(Vector(n).length-1) for n in norm))
        counts['triangles']+=len(faces);counts['vertices']+=len(pos);allpos.extend(pos)
        for face in faces:
            assert max(face)<len(pos);t=[pos[i] for i in face];area=(t[1]-t[0]).cross(t[2]-t[0]).length*.5;counts['minTriangleArea']=min(counts['minTriangleArea'],area)
            geometry_triangles.append(tuple(sorted(tuple(v) for v in t)))
            if 'bough' in mesh['name']:
                wood_triangles+=1
                # Blender's custom-normal local encoding loses precision near
                # its polar singularity. Less than .01 radian (.58 degree)
                # keeps those errors far below the ~30 degree plane changes.
                deviation=max((Vector(norm[face[i]])-Vector(norm[face[0]])).length for i in [1,2])
                wood_corner_deviation=max(wood_corner_deviation,deviation)
                if deviation<.01:wood_flat+=1
            for name,(lo,hi) in volumes.items():
                if triangle_box(t,lo,hi):
                    counts['collisions'][name]+=1
                    if len(counts['collisionSamples'][name])<4: counts['collisionSamples'][name].append(list(sum(t,Vector())/3))
        if 'bough' in mesh['name']:wood_bvh=BVHTree.FromPolygons(pos,faces,all_triangles=True)
    report['meshes'].append(counts)
    geometry[mesh['name']]={'triangles':len(geometry_triangles),'positionsSha256':hashlib.sha256(b''.join(struct.pack('<9f',*(x for point in triangle for x in point)) for triangle in sorted(geometry_triangles))).hexdigest()}
baseline_geometry=json.loads((ROOT/'assets/sculpted/lowfork/geometry-v3-baseline.json').read_text())
report['geometryPreservation']={'baselineGlbSha256':baseline_geometry['glbSha256'],'baseline':baseline_geometry['meshes'],'current':geometry}
report['woodNormalPlanes']={'triangles':wood_triangles,'equivalentCornerNormalTriangles':wood_flat,'maxCornerNormalDeviation':wood_corner_deviation}
report['triangles']=sum(m['triangles'] for m in report['meshes']);report['primitives']=sum(len(m['primitives']) for m in g['meshes'])
report['bounds']={'min':[min(v[i] for v in allpos) for i in range(3)],'max':[max(v[i] for v in allpos) for i in range(3)]}
report['collisions']={name:sum(m['collisions'][name] for m in report['meshes']) for name in volumes}
report['naturalSupport']={}
for name in ['natural-perch-0','natural-perch-1']:
    x,y,z=perches[name];hit,normal,index,dist=wood_bvh.ray_cast(Vector((x,y+.08,z)),Vector((0,-1,0)),1)
    report['naturalSupport'][name]={'topY':hit.y if hit else None,'footGap':y-hit.y if hit else None}
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/sculpted/environment/lowfork.blend'))
for ob in bpy.context.scene.objects:
    if ob.type=='MESH':report['source'][ob.name]={'vertices':len(ob.data.vertices),'triangles':sum(len(p.vertices)-2 for p in ob.data.polygons)}
report['anchors']={ob.name:[ob.location.x,ob.location.z,-ob.location.y] for ob in bpy.context.scene.objects if ob.type=='EMPTY'}
report['checks']={
 'boundedTriangleBudget':report['triangles']<=35000,
 'threeToFivePrimitives':3<=report['primitives']<=5,
 'finiteUnitNormals':all(m['maxNormalError']<.0005 for m in report['meshes']),
 'nondegenerateTriangles':all(m['minTriangleArea']>1e-9 for m in report['meshes']),
 'physicalClearances':not any(report['collisions'].values()),
 'naturalPerchesSupported':all(v['footGap'] is not None and -.025<=v['footGap']<=.08 for v in report['naturalSupport'].values()),
 'perchAnchorsPreserved':all(name in report['anchors'] and max(abs(a-b) for a,b in zip(report['anchors'][name],point))<1e-5 for name,point in perches.items()),
 'embeddedPBR':all('pbrMetallicRoughness' in m for m in g['materials']) and all('uri' not in b for b in g['buffers']),
 'positionsAndTrianglesUnchangedByBarkCorrection':geometry==baseline_geometry['meshes'],
 'splitBarkPlaneNormals':wood_flat==wood_triangles and wood_triangles>0,
}
# Compare the actual prior committed home geometry with this export, rather
# than relying on unchanged recipe text. Only the rainhood may change.
import subprocess
def geometry_signatures(data):
    size=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+size]);binary=data[28+size:]
    def raw(i):
        a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']]
        n={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];width={5126:4,5125:4,5123:2}[a['componentType']]*n
        return b''.join(binary[v.get('byteOffset',0)+a.get('byteOffset',0)+j*v.get('byteStride',width):v.get('byteOffset',0)+a.get('byteOffset',0)+j*v.get('byteStride',width)+width] for j in range(a['count']))
    return {node['name']:hashlib.sha256(b''.join(raw(p['attributes'][a]) for p in doc['meshes'][node['mesh']]['primitives'] for a in ['POSITION','NORMAL'])+b''.join(raw(p['indices']) for p in doc['meshes'][node['mesh']]['primitives'])).hexdigest() for node in doc['nodes'] if 'mesh' in node}
home=ROOT/'public/assets/environment/woven-home.glb';homebytes=home.read_bytes()
baseline='375589beb5647f33e35af568a5ea0e101c5ac8ab'
old=subprocess.check_output(['git','show',baseline+':public/assets/environment/woven-home.glb'],cwd=ROOT)
before=geometry_signatures(old);after=geometry_signatures(homebytes)
report['home']={'baselineRevision':baseline,'sha256':hashlib.sha256(homebytes).hexdigest(),'bytes':len(homebytes),'geometryBefore':before,'geometryAfter':after}
report['checks']['homeFloorAndLadderPreserved']=all(before[k]==after[k] for k in ['deck','ladder'])
report['checks']['homeSourceGroupsPreserved']=set(after)=={'deck','ladder','rainhood'}
report['ready']=all(report['checks'].values())
p=ROOT/'assets/sculpted/lowfork/qualification.json';p.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if not report['ready']:raise RuntimeError('Lowfork qualification failed: '+str(report['checks']))
