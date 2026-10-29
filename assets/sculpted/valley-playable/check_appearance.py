"""Prove that the appearance pass preserves all authored functional geometry."""
import sys
import hashlib
import json
from pathlib import Path
S=Path(__file__).resolve().parent
R=S.parents[2]
sys.path.insert(0,str(S))
from author_appearance import Glb,REV
report={'revision':REV,'state':'PASS','assets':{},'profileSha256':hashlib.sha256((R/'src/content/valley-habitat.json').read_bytes()).hexdigest()}
for name in ['longbough-living.glb','longbough-woven-kit.glb']:
    baseline=Glb(S/'appearance-baseline-v1'/name)
    path=R/'public/assets/environment/valley'/name
    final=Glb(path)
    assert baseline.g['nodes']==final.g['nodes'],name
    assert baseline.g['scenes']==final.g['scenes'],name
    attributes=[]
    for oldmesh,newmesh in zip(baseline.g['meshes'],final.g['meshes']):
        assert len(oldmesh['primitives'])==len(newmesh['primitives'])
        for old,new in zip(oldmesh['primitives'],newmesh['primitives']):
            assert all(0<=v<=1 for row in final.values(new['attributes']['COLOR_0']) for v in row)
            for attr in ['POSITION','JOINTS_0','WEIGHTS_0']:
                if attr in old['attributes']:
                    assert baseline.values(old['attributes'][attr])==final.values(new['attributes'][attr]),(name,attr)
            assert baseline.values(old['indices'])==final.values(new['indices']),name
            assert old['material']==new['material'],name
            attributes.append({'vertices':len(final.values(new['attributes']['POSITION'])),'indices':len(final.values(new['indices']))})
    assert len(baseline.g['meshes'])==len(final.g['meshes'])
    for old,new in zip(baseline.g.get('images',[]),final.g.get('images',[])):
        a=baseline.g['bufferViews'][old['bufferView']];b=final.g['bufferViews'][new['bufferView']]
        assert baseline.b[a.get('byteOffset',0):a.get('byteOffset',0)+a['byteLength']]==final.b[b.get('byteOffset',0):b.get('byteOffset',0)+b['byteLength']]
    report['assets'][name]={'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,
        'baselineSha256':hashlib.sha256((S/'appearance-baseline-v1'/name).read_bytes()).hexdigest(),
        'exact':['Decoded positions','Decoded triangle indices','Every node, transform, parent and anchor','Scenes','Material assignments','Original embedded image bytes'],
        'changed':['Custom shading normals','COLOR_0','Bark UV sampling scale','PBR roughness/specular settings','Unreferenced binary payload removed'],
        'primitives':attributes}
(S/'appearance-geometry.json').write_text(json.dumps(report,indent=2)+'\n')
print('APPEARANCE_GEOMETRY_PASS',report['assets'].keys())
