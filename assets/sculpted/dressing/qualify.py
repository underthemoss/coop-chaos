"""Read-only structural qualification for the nine dressing GLBs; Python stdlib."""
from pathlib import Path
import struct,json,math,hashlib
ROOT=Path(__file__).resolve().parents[3]
FILES=sorted((ROOT/'public/assets/environment').glob('dressing-*.glb'))

def read(path):
    data=path.read_bytes();magic,version,size=struct.unpack_from('<4sII',data)
    assert magic==b'glTF' and version==2 and size==len(data)
    length,kind=struct.unpack_from('<II',data,12);assert kind==0x4e4f534a
    doc=json.loads(data[20:20+length]);offset=20+length
    length,kind=struct.unpack_from('<II',data,offset);assert kind==0x004e4942
    binary=data[offset+8:offset+8+length]
    def accessor(index):
        a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];width=struct.calcsize(fmt)*n;stride=v.get('byteStride',width);at=v.get('byteOffset',0)+a.get('byteOffset',0)
        return [struct.unpack_from('<'+fmt*n,binary,at+j*stride) for j in range(a['count'])]
    primitives=[p for m in doc['meshes'] for p in m['primitives']]
    positions=[];normals=[];triangles=0;degenerate=0;inward_rock=0
    for p in primitives:
        assert p.get('mode',4)==4
        assert {'POSITION','NORMAL','COLOR_0'}<=set(p['attributes'])
        pos=accessor(p['attributes']['POSITION']);n=accessor(p['attributes']['NORMAL']);col=accessor(p['attributes']['COLOR_0']);indices=[x[0] for x in accessor(p['indices'])]
        assert len(indices)%3==0 and all(0<=x<len(pos) for x in indices)
        assert all(math.isfinite(x) for row in pos+n+col for x in row)
        assert all(abs(sum(x*x for x in row)-1)<.002 for row in n)
        for i in range(0,len(indices),3):
            a,b,c=(pos[x] for x in indices[i:i+3]);u=[b[j]-a[j] for j in range(3)];v=[c[j]-a[j] for j in range(3)];cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
            if sum(x*x for x in cross)<1e-16:degenerate+=1
            if 'rock-' in path.name:
                middle=[(a[j]+b[j]+c[j])/3 for j in range(3)];height=max(q[1] for q in pos);radial=[middle[0],middle[1]-height*.4,middle[2]]
                if sum(cross[j]*radial[j] for j in range(3))<0:inward_rock+=1
        positions+=pos;normals+=n;triangles+=len(indices)//3
    assert not degenerate,(path,degenerate)
    assert not inward_rock,(path,inward_rock)
    assert 'animations' not in doc and 'textures' not in doc and 'images' not in doc
    assert any(n.get('name')=='asset' for n in doc['nodes'])
    minimum=[min(p[i] for p in positions) for i in range(3)];maximum=[max(p[i] for p in positions) for i in range(3)]
    # Exporter bakes Blender's +Z-up into glTF +Y-up primitive coordinates.
    assert abs(minimum[1])<1e-6,(path,minimum)
    assert all(m.get('alphaMode','OPAQUE')=='OPAQUE' and m['pbrMetallicRoughness']['roughnessFactor']>=.85 for m in doc['materials'])
    return {'file':path.name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'triangles':triangles,'primitives':len(primitives),'materials':len(doc['materials']),'degenerate_triangles':degenerate,'normal_length_check':'pass','attributes':sorted(set(k for p in primitives for k in p['attributes'])),'opaque':True,'textures':0}

if __name__=='__main__':
    assert len(FILES)==9,len(FILES)
    result={p.stem:read(p) for p in FILES};(Path(__file__).parent/'gltf-checks.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
