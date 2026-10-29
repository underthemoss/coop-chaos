"""Prove the v4 reopen changes only hero crown COLOR_0, with measured values."""
import sys
import hashlib
import json
from pathlib import Path
S=Path(__file__).resolve().parent;R=S.parents[2]
sys.path.insert(0,str(S))
from author_appearance import Glb,REV
before=Glb(S/'palette-baseline-v3/longbough-living.glb')
path=R/'public/assets/environment/valley/longbough-living.glb';after=Glb(path)
assert before.g==after.g, 'Palette-only binary values: complete glTF JSON must remain identical'
rows=[]
color_span=None
for node in before.g['nodes']:
    if 'mesh'not in node:continue
    for old,new in zip(before.g['meshes'][node['mesh']]['primitives'],after.g['meshes'][node['mesh']]['primitives']):
        assert before.values(old['indices'])==after.values(new['indices'])
        for name,index in old['attributes'].items():
            a,b=before.values(index),after.values(new['attributes'][name])
            if node['name']=='crown-foliage' and name=='COLOR_0':
                rows=list(zip(a,b))
                accessor=before.g['accessors'][index]
                view=before.g['bufferViews'][accessor['bufferView']]
                assert accessor['componentType']==5121 and accessor['type']=='VEC4'
                assert view.get('byteStride',4)==4
                start=view.get('byteOffset',0)+accessor.get('byteOffset',0)
                color_span=(start,start+accessor['count']*4)
            else:assert a==b,(node['name'],name)
assert rows and any(a!=b for a,b in rows)
start,end=color_span
assert before.b[:start]==after.b[:start] and before.b[end:]==after.b[end:]
def luma(c):return c[0]*.2126+c[1]*.7152+c[2]*.0722
def stats(colors):
    colors=list(colors);values=sorted(luma(c) for c in colors)
    return {'meanLinearRgb':[sum(c[i] for c in colors)/len(colors) for i in range(3)],
            'linearLuminancePercentiles10_50_90':[values[int((len(values)-1)*f)] for f in [.1,.5,.9]]}
oldreceipt=json.loads((S/'palette-baseline-v3/asset-receipt.json').read_text())
preserved={}
for filename,sha in [('longbough-woven-kit.glb',oldreceipt['assets']['kit']['sha256'])]+[(f'valley-grove-{name}.glb',a['sha256']) for name,a in oldreceipt['scenicGrove']['assets'].items()]:
    actual=hashlib.sha256((R/'public/assets/environment/valley'/filename).read_bytes()).hexdigest()
    assert actual==sha,filename
    preserved[filename]=sha
report={'state':'PASS','revision':REV,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
        'baselineSha256':hashlib.sha256((S/'palette-baseline-v3/longbough-living.glb').read_bytes()).hexdigest(),
        'exact':['Complete glTF JSON: nodes, transforms, hierarchy, materials, images, accessors and resource layout',
                 'All POSITION, NORMAL, UV and triangle indices','All living wood attributes',
                 'All binary bytes outside the contiguous crown COLOR_0 range, including embedded images',
                 'Kit and all three scenic GLB bytes'],
        'changed':'Hero crown COLOR_0 binary values only',
        'previous':stats(a for a,b in rows),'current':stats(b for a,b in rows),
        'verticesOver1_5TimesPriorLuminance':sum(luma(b)>luma(a)*1.5 for a,b in rows),
        'verticesBelowPriorLuminance':sum(luma(b)<luma(a) for a,b in rows),'vertexCount':len(rows),
        'preservedAssets':preserved,
        'fitEvidenceReuse':'Previous v2 actual-body/access/sole/basket pose checks remain applicable through exact positions/indices/nodes identity; this palette pass does not rerun or claim new runtime collision physics.'}
(S/'palette-qualification.json').write_text(json.dumps(report,indent=2)+'\n')
print('PALETTE_ONLY_PASS',report)
