"""Read actual exported glTF bytes; no Blender or third-party dependencies."""
import hashlib,json,math,struct
from pathlib import Path

SOURCE=Path(__file__).resolve().parent
ROOT=SOURCE.parents[2]
EXPECTED={'cliff-ledge':(3,2,1.2),'boulder':(1.2,.9,1),'scree':(1.8,.3,1)}
SIZES={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
FORMATS={5120:'b',5121:'B',5122:'h',5123:'H',5125:'I',5126:'f'}

def decode(file):
    raw=file.read_bytes();magic,version,length=struct.unpack_from('<III',raw)
    assert magic==0x46546c67 and version==2 and length==len(raw)
    n,kind=struct.unpack_from('<II',raw,12);assert kind==0x4e4f534a
    gltf=json.loads(raw[20:20+n]);offset=20+n
    nb,kind=struct.unpack_from('<II',raw,offset);assert kind==0x004e4942
    blob=raw[offset+8:offset+8+nb]
    def accessor(index):
        a=gltf['accessors'][index];b=gltf['bufferViews'][a['bufferView']]
        count=SIZES[a['type']];fmt='<'+FORMATS[a['componentType']]*count
        stride=b.get('byteStride',struct.calcsize(fmt));start=b.get('byteOffset',0)+a.get('byteOffset',0)
        return [struct.unpack_from(fmt,blob,start+i*stride) for i in range(a['count'])]
    return gltf,accessor,raw

def check(name,dim):
    file=ROOT/'public/assets/environment'/('valley-'+name+'.glb')
    gltf,access,raw=decode(file)
    assert gltf['asset']['version']=='2.0'
    assert not any(gltf.get(k) for k in ('cameras','animations','images','textures','skins'))
    assert all('uri' not in b for b in gltf.get('buffers',[]))
    nodes=gltf['nodes'];assert [n['name'] for n in nodes]==['weathered-stone-and-moss','asset']
    root=next(n for n in nodes if n['name']=='asset');assert root.get('translation',[0,0,0])==[0,0,0]
    assert root.get('rotation',[0,0,0,1])==[0,0,0,1] and root.get('scale',[1,1,1])==[1,1,1]
    assert len(gltf['materials'])==2
    for m in gltf['materials']:
        assert m.get('alphaMode','OPAQUE')=='OPAQUE' and not m.get('doubleSided',False)
        p=m['pbrMetallicRoughness'];assert p['roughnessFactor']>=.9 and p.get('metallicFactor',1)==0
    tris=0;vertices=0;volume=0;positions=[];colors=set();minimum_area=1
    for mesh in gltf['meshes']:
        for p in mesh['primitives']:
            assert p.get('mode',4)==4
            attrs=p['attributes'];assert all(k in attrs for k in ('POSITION','NORMAL','COLOR_0'))
            pos=access(attrs['POSITION']);norm=access(attrs['NORMAL']);col=access(attrs['COLOR_0']);indices=[i[0] for i in access(p['indices'])]
            assert len(indices)%3==0 and all(0<=i<len(pos) for i in indices)
            assert all(math.isfinite(v) for arr in (pos,norm,col) for point in arr for v in point)
            assert all(abs(sum(v*v for v in n)-1)<.0001 for n in norm)
            positions.extend(pos);vertices+=len(pos);tris+=len(indices)//3
            colors.update(tuple(round(v,3) for v in c) for c in col)
            for i in range(0,len(indices),3):
                a,b,c=[pos[j] for j in indices[i:i+3]]
                u=[b[j]-a[j] for j in range(3)];v=[c[j]-a[j] for j in range(3)]
                cross=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
                area=math.sqrt(sum(x*x for x in cross))*.5;assert area>1e-10
                minimum_area=min(minimum_area,area)
                volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6
    low=[min(p[j] for p in positions) for j in range(3)];high=[max(p[j] for p in positions) for j in range(3)]
    targetlow=(-dim[0]/2,0,-dim[2]/2);targethigh=(dim[0]/2,dim[1],dim[2]/2)
    assert all(abs(low[j]-targetlow[j])<1e-5 and abs(high[j]-targethigh[j])<1e-5 for j in range(3))
    assert 300<=tris<=2000 and volume>0 and len(colors)>25
    return {'file':str(file.relative_to(ROOT)),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'bounds_min':low,'bounds_max':high,'triangles':tris,'exported_vertices':vertices,'draw_primitives':2,'distinct_corner_colors':len(colors),'signed_volume':volume,'smallest_triangle_area':minimum_area,'checks':'PASS: valid embedded GLB2, finite indexed triangles, unit normals, no degenerate triangles, positive winding volume, exact grounded bounds, opaque rough PBR, COLOR_0, no animations/cameras/skins/textures/external resources'}

if __name__=='__main__':
    result={name:check(name,dim) for name,dim in EXPECTED.items()}
    (SOURCE/'gltf-checks.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
