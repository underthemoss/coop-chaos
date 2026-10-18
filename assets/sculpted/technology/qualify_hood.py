"""Read-only GLB inspection and bounded sleeping hood preservation evidence."""
from pathlib import Path
import json,struct,hashlib,math
ROOT=Path(__file__).resolve().parents[3]
RECORD=Path(__file__).resolve().parent
PROOF=ROOT/'output/playwright/technology-art/sleeping-hood-v2'
def read(path):
    data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length]);binary=data[28+length:]
    def values(i):
        a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];fmt={5126:'f',5125:'I',5123:'H'}[a['componentType']];size=struct.calcsize(fmt)*n;at=v.get('byteOffset',0)+a.get('byteOffset',0)
        return [struct.unpack_from('<'+fmt*n,binary,at+j*v.get('byteStride',size)) for j in range(a['count'])]
    return doc,values

def mesh_digest(doc,values,name):
    node=next(n for n in doc['nodes'] if n.get('name')==name);mesh=doc['meshes'][node['mesh']]
    content=[{key:[list(row) for row in values(index)] for key,index in sorted(p['attributes'].items())}|{'indices':values(p['indices'])} for p in mesh['primitives']]
    return hashlib.sha256(json.dumps(content,separators=(',',':')).encode()).hexdigest()

def inspect(name):
    path=ROOT/f'public/assets/environment/{name}.glb';doc,values=read(path);meshes={};verts=0;tris=0
    for node in doc['nodes']:
        if 'mesh' not in node:continue
        positions=[];t=0
        for p in doc['meshes'][node['mesh']]['primitives']:
            pos=values(p['attributes']['POSITION']);normal=values(p['attributes']['NORMAL']);idx=[x[0] for x in values(p['indices'])]
            assert all(math.isfinite(v) for row in pos+normal for v in row)
            assert all(abs(sum(v*v for v in n)-1)<.001 for n in normal)
            positions+=pos;t+=len(idx)//3
        meshes[node['name']]={'vertices':len(positions),'triangles':t,'localBounds':[[min(p[i] for p in positions) for i in range(3)],[max(p[i] for p in positions) for i in range(3)]]};verts+=len(positions);tris+=t
    nodes=[{'name':n.get('name'),'translation':n.get('translation',[0,0,0]),**({'mesh':n['mesh']} if 'mesh'in n else {}),'children':[doc['nodes'][i].get('name') for i in n.get('children',[])]} for n in doc['nodes']]
    return {'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'nodes':nodes,'vertices':verts,'triangles':tris,'meshes':meshes}
if __name__=='__main__':
    before=json.loads((PROOF/'preserved-before.json').read_text());unchanged={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in before.items()};assert all(unchanged.values())
    old,ov=read(PROOF/'baseline-sleeping-deck.glb');new,nv=read(ROOT/'public/assets/environment/sleeping-deck.glb')
    old_hash=mesh_digest(old,ov,'sleeping-deck-weave');new_hash=mesh_digest(new,nv,'sleeping-deck-weave');assert old_hash==new_hash,(old_hash,new_hash)
    record={'revision':'sleeping-hood-v2; hauling-v1','tools':'Blender4.5.3 LTS; glTF2.0 embedded PBR export','assets':{name:inspect(name) for name in ['sleeping-deck','hauling-basket']}}
    (RECORD/'qualification.json').write_text(json.dumps(record,indent=2)+'\n')
    receipt={'revision':'sleeping-hood-v2','unchanged_files':unchanged,'preserved_floor_ramp_brace_mesh_digest':new_hash,'preserved_geometry_arrays':'All original deck primitive attribute arrays and indices, across all original materials; exact array equality','canonical_habitat_revision':json.loads((ROOT/'src/content/tree-habitats.json').read_text())['revision'],'source_proof':'output/playwright/technology-art/sleeping-hood-v2/sleeping-hood-v2-fixed-angle-clean.png','deck':record['assets']['sleeping-deck']}
    (RECORD/'hood-v2-qualification.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps({'unchanged':unchanged,'preserved_mesh_digest':new_hash,'deck_triangles':receipt['deck']['triangles'],'deck_sha256':receipt['deck']['sha256']}))
