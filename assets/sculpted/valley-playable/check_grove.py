"""Qualify actual scenic GLB payloads; these are not habitat/collision assets."""
import hashlib
import json
import math
import sys
from pathlib import Path
S=Path(__file__).resolve().parent;R=S.parents[2]
sys.path.insert(0,str(R/'assets/sculpted/buildings'))
from validate_buildings import inspect,read_glb
report={'revision':json.loads((S/'crown-shape.json').read_text())['revision'],'state':'PASS','assets':{}}
for name in ['oak','spread','shrub']:
    path=R/f'public/assets/environment/valley/valley-grove-{name}.glb'
    info,_=inspect(path);_,g,_,values=read_glb(path)
    assert info['degenerateTriangles']==0,(name,info['degenerateTriangles'])
    assert info['maxNormalError']<.0002
    assert len(g['meshes'])==len(g['materials'])==2
    assert sum(len(m['primitives']) for m in g['meshes'])==2
    assert not any(g.get(n) for n in ['animations','skins','cameras'])
    assert len(g['images'])==1 and all('uri' not in i for i in g['images'])
    assert all('uri' not in b for b in g['buffers'])
    for m in g['materials']:
        assert m.get('alphaMode','OPAQUE')=='OPAQUE'
        assert m['pbrMetallicRoughness']['metallicFactor']==0
        assert m['pbrMetallicRoughness']['roughnessFactor']>=.9
    for m in g['meshes']:
        for p in m['primitives']:
            a=g['accessors'][p['attributes']['COLOR_0']]
            scale=255 if a.get('normalized') and a['componentType']==5121 else 65535 if a.get('normalized') else 1
            assert all(math.isfinite(x) and 0<=x/scale<=1 for c in values(p['attributes']['COLOR_0']) for x in c)
    info['nodeNames']=[n['name'] for n in g['nodes']]
    info['materials']=[m['name'] for m in g['materials']]
    report['assets'][name]=info
report['checks']=['Finite indexed geometry and vertex colors','Unit exported normals','No zero-area triangles','Two opaque rough PBR primitives per asset','Original bark diffuse embedded; no external resources, rigs or animations']
report['limits']='Background visual assets only; no gameplay obstruction, perches, stages, structural strength or navigation contract. AnatomicalY0; small negative-Y root tips are buried.'
(S/'grove-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print('GROVE_CHECKS_PASS',{k:(v['triangles'],v['bytes']) for k,v in report['assets'].items()})
