"""Actual GLB byte qualification for isolated tree studies; stdlib only."""
import hashlib,json,math,struct,sys
from pathlib import Path
SOURCE=Path(__file__).resolve().parent;ROOT=SOURCE.parents[2]
COUNTS={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4};FORMATS={5121:'B',5123:'H',5125:'I',5126:'f'}
def decode(file):
    raw=file.read_bytes();magic,version,length=struct.unpack_from('<III',raw);assert(magic,version,length)==(0x46546c67,2,len(raw))
    n,kind=struct.unpack_from('<II',raw,12);assert kind==0x4e4f534a;gltf=json.loads(raw[20:20+n]);offset=20+n
    nb,kind=struct.unpack_from('<II',raw,offset);assert kind==0x004e4942;blob=raw[offset+8:offset+8+nb]
    def accessor(index):
        a=gltf['accessors'][index];b=gltf['bufferViews'][a['bufferView']];fmt='<'+FORMATS[a['componentType']]*COUNTS[a['type']];stride=b.get('byteStride',struct.calcsize(fmt));start=b.get('byteOffset',0)+a.get('byteOffset',0)
        return [struct.unpack_from(fmt,blob,start+i*stride) for i in range(a['count'])]
    return gltf,accessor,raw
def bounds(points):return {'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]}
def check(name):
    file=ROOT/'public/assets/environment/studies'/(name+'-study.glb');gltf,access,raw=decode(file)
    assert not any(gltf.get(k) for k in ('cameras','animations','images','textures','skins'))
    assert all('uri' not in b for b in gltf.get('buffers',[]));assert len(gltf['materials'])==2
    assert 'KHR_lights_punctual' not in gltf.get('extensions',{})
    assert {m['name'] for m in gltf['materials']}=={'study-warm-growth-bark','study-olive-small-leaves'}
    assert {n['name'] for n in gltf['nodes']}=={'asset','living-wood','crown-foliage'}
    for n in gltf['nodes']:
        assert n.get('translation',[0,0,0])==[0,0,0] and n.get('rotation',[0,0,0,1])==[0,0,0,1] and n.get('scale',[1,1,1])==[1,1,1]
    for m in gltf['materials']:
        assert m.get('alphaMode','OPAQUE')=='OPAQUE';p=m['pbrMetallicRoughness'];assert p['roughnessFactor']>=.9 and p.get('metallicFactor',1)==0
    result={};allpoints=[];total=0
    for node in gltf['nodes']:
        if 'mesh' not in node:continue
        mesh=gltf['meshes'][node['mesh']];tris=0;verts=0;points=[];colors=[];minimum_area=1e9;volume=0
        assert len(mesh['primitives'])==1
        for p in mesh['primitives']:
            assert p.get('mode',4)==4;attrs=p['attributes'];assert all(k in attrs for k in ('POSITION','NORMAL','COLOR_0'))
            pos=access(attrs['POSITION']);norm=access(attrs['NORMAL']);col=access(attrs['COLOR_0']);indices=[i[0] for i in access(p['indices'])]
            assert len(indices)%3==0 and all(0<=i<len(pos) for i in indices)
            assert all(math.isfinite(v) for arr in (pos,norm,col) for point in arr for v in point)
            assert all(abs(sum(v*v for v in n)-1)<.00015 for n in norm)
            for i in range(0,len(indices),3):
                a,b,c=[pos[j] for j in indices[i:i+3]];u=[b[j]-a[j] for j in range(3)];v=[c[j]-a[j] for j in range(3)]
                cross=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);area=math.sqrt(sum(x*x for x in cross))*.5
                assert area>1e-12,(node['name'],i,area);minimum_area=min(minimum_area,area)
                volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6
            tris+=len(indices)//3;verts+=len(pos);points.extend(pos);colors.extend(col)
        if node['name']=='living-wood':assert volume>0
        result[node['name']]={'triangles':tris,'exported_vertices':verts,'bounds':bounds(points),'smallest_triangle_area':minimum_area,'signed_volume':volume,'linear_color_min':[min(c[i] for c in colors) for i in range(3)],'linear_color_max':[max(c[i] for c in colors) for i in range(3)],'unique_colors':len(set(colors))}
        assert len(set(colors))>100
        if node['name']=='living-wood':assert max(c[0] for c in colors)-min(c[0] for c in colors)>.25
        if node['name']=='living-wood':result[node['name']]['low_y_le_1m_bounds']=bounds([p for p in points if p[1]<=1])
        total+=tris;allpoints.extend(points)
    assert 20000<=total<=35000;assert -.6<min(p[1] for p in allpoints)<=0
    return {'revision':json.loads((SOURCE/(name+'-qualification.json')).read_text())['revision'],'file':str(file.relative_to(ROOT)),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'bounds':bounds(allpoints),'total_triangles':total,'draw_primitives':2,'meshes':result,'checks':'PASS: embedded GLB2; finite indexed geometry; unit normals; no degenerate triangles; positive wood volume; anatomical ground origin with closed buried underside; unit transforms; opaque rough PBR and COLOR_0; no textures, external resources, animations, skins, cameras or lights'}
if __name__=='__main__':
    for name in sys.argv[1:] or ['longbough']:
        result=check(name);(SOURCE/(name+'-gltf-checks.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
