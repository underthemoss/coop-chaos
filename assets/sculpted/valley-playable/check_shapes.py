"""Qualify exported crown edits and bank assets; preserve habitat/color truth."""
import sys,json,hashlib,math
from pathlib import Path
S=Path(__file__).resolve().parent;R=S.parents[2]
sys.path.insert(0,str(S));sys.path.insert(0,str(R/'assets/sculpted/buildings'))
from author_appearance import Glb
from validate_buildings import inspect
from author_crown_shape import REV
OUT=R/'public/assets/environment/valley';BASE=S/'shape-baseline-v4'
report={'revision':REV,'state':'PASS','assets':{},'profileSha256':hashlib.sha256((R/'src/content/valley-habitat.json').read_bytes()).hexdigest()}
oldreceipt=json.loads((BASE/'asset-receipt.json').read_text())
assert report['profileSha256']==oldreceipt['profile']['sha256']
grove=json.loads((S/'grove-assets.json').read_text());grove['revision']=REV
for name in ['longbough-living','valley-grove-oak','valley-grove-spread','valley-grove-shrub']:
    before,after=Glb(BASE/(name+'.glb')),Glb(OUT/(name+'.glb'))
    for field in ['nodes','scenes','materials','images','textures','samplers']:
        assert before.g.get(field)==after.g.get(field),(name,field)
    changed=0
    for node in before.g['nodes']:
        if 'mesh' not in node:continue
        for old,new in zip(before.g['meshes'][node['mesh']]['primitives'],after.g['meshes'][node['mesh']]['primitives']):
            assert before.values(old['indices'])==after.values(new['indices'])
            for field,index in old['attributes'].items():
                a,b=before.values(index),after.values(new['attributes'][field])
                if 'crown-foliage' in node['name'] and field in ['POSITION','NORMAL']:
                    changed+=sum(a!=b for a,b in zip(a,b))
                else:assert a==b,(name,node['name'],field)
    assert changed>0
    for old,new in zip(before.g.get('images',[]),after.g.get('images',[])):
        a=before.g['bufferViews'][old['bufferView']];b=after.g['bufferViews'][new['bufferView']]
        assert before.b[a.get('byteOffset',0):a.get('byteOffset',0)+a['byteLength']]==after.b[b.get('byteOffset',0):b.get('byteOffset',0)+b['byteLength']]
    info,_=inspect(OUT/(name+'.glb'))
    assert info['degenerateTriangles']==0 and info['maxNormalError']<.0002
    info['exact']=['Every COLOR_0 value: accepted v4 hero palette and scenic palette','Living wood: every attribute and triangle','Crown topology/UVs','Nodes/hierarchy/materials/original image bytes']
    info['changed']='Crown POSITION/NORMAL only; bounds reflect actual geometry'
    report['assets'][name]=info
    if name.startswith('valley-grove-'):
        target=grove['assets'][name.split('-')[-1]]
        for field in ['sha256','bytes','triangles','min','max']:target[field]=info[field]
        target['revision']=REV
kit=OUT/'longbough-woven-kit.glb'
assert kit.read_bytes()==(BASE/kit.name).read_bytes()
report['kitSha256']=hashlib.sha256(kit.read_bytes()).hexdigest()
report['checks']=['Exact palette/wood/kit/profile/semantic contract','Finite geometry and UVs','Unit exported normals','Zero degenerate triangles','No new crown triangles or vertices']
(S/'crown-shape-checks.json').write_text(json.dumps(report,indent=2)+'\n')
# Existing receipt consumer uses this qualification key; current scope is clear.
(S/'appearance-geometry.json').write_text(json.dumps(report,indent=2)+'\n')
(S/'grove-assets.json').write_text(json.dumps(grove,indent=2)+'\n')
bank={'revision':'valley-bank-family-v1','state':'PASS','assets':{}}
bankmeta=json.loads((S/'bank-assets.json').read_text())
for name,meta in bankmeta['assets'].items():
    path=R/'public'/meta['assetUrl'].lstrip('/');info,_=inspect(path);glb=Glb(path)
    assert info['degenerateTriangles']==0 and info['maxNormalError']<.0002
    assert sum(g['primitives'] for g in info['groups'])==2
    assert all(m.get('alphaMode','OPAQUE')=='OPAQUE' and m['pbrMetallicRoughness']['metallicFactor']==0 for m in glb.g['materials'])
    assert all('uri'not in b for b in glb.g['buffers'])
    assert not any(glb.g.get(k) for k in ['animations','skins','images','cameras'])
    for mesh in glb.g['meshes']:
        for p in mesh['primitives']:
            assert all(math.isfinite(v) and 0<=v<=1 for row in glb.values(p['attributes']['COLOR_0']) for v in row)
    for field in ['min','max']:
        assert all(abs(a-b)<.000001 for a,b in zip(info[field],meta[field]))
    bank['assets'][name]=info
bank['checks']=['Actual bounds match metre contract','Two opaque rough PBR primitives','Finite colors/UV/geometry and unit normals','No degenerates or external resources']
(S/'bank-checks.json').write_text(json.dumps(bank,indent=2)+'\n')
print('SHAPE_AND_BANK_CHECKS_PASS',report['kitSha256'],{k:(v['triangles'],v['bytes']) for k,v in bank['assets'].items()},flush=True)
