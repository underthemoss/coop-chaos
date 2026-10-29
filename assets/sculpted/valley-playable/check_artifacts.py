"""Indexed geometry/resource/node contract checks on real GLB bytes."""
import bpy
import hashlib
import json
import sys
from pathlib import Path

S = Path(__file__).resolve().parent
R = S.parents[2]
sys.path.insert(0, str(R/'assets/sculpted/buildings'))
from validate_buildings import inspect, read_glb
sys.path.insert(0, str(S))
from validate_fit import geometry

C = json.loads((R/'src/content/valley-habitat.json').read_text())
report = {'revision': C['revision'], 'profileSha256': hashlib.sha256((R/'src/content/valley-habitat.json').read_bytes()).hexdigest(), 'state': 'PASS', 'assets': {}, 'preserved': {}}
for key,url in C['assetUrls'].items():
    path = R/'public'/url.lstrip('/')
    info,_ = inspect(path)
    raw,g,b,values = read_glb(path)
    transformed,_ = geometry(path)
    points = [p for _,tri in transformed for p in tri]
    info['min'] = [min(p[i] for p in points) for i in range(3)]
    info['max'] = [max(p[i] for p in points) for i in range(3)]
    assert info['degenerateTriangles'] == 0
    assert info['maxNormalError'] < .0002
    assert not any(g.get(n) for n in ['animations','skins','cameras'])
    assert all('uri' not in x for x in g.get('images',[])+g['buffers'])
    assert all(m.get('alphaMode','OPAQUE') == 'OPAQUE' for m in g['materials'])
    assert all(m['pbrMetallicRoughness'].get('metallicFactor',1) == 0 for m in g['materials'])
    assert all(m['pbrMetallicRoughness']['roughnessFactor'] >= .9 for m in g['materials'])
    info['materials'] = [m['name'] for m in g['materials']]
    info['nodeNames'] = [n['name'] for n in g['nodes']]
    info['checks'] = ['GLB2 embedded resources','Finite indexed geometry and UVs','Unit normals','No zero-area triangles','Opaque rough nonmetal PBR','No animation/skin/camera/external resources']
    if key == 'kit':
        nodes = {n['name']: n for n in g['nodes']}
        assert set(C['profile']['anchors']) <= set(nodes)|{'cargo-socket'}
        assert C['profile']['hauling']['basketNode'] in nodes
        assert C['profile']['hauling']['ropeNode'] in nodes
        stage_names = {name for stages in C['profile']['stages'].values() for names in stages.values() for name in names}
        mesh_names = {n['name'] for n in g['nodes'] if 'mesh' in n}
        assert stage_names == mesh_names, ('Every rendered part must have exactly one semantic stage owner', stage_names ^ mesh_names)
        for name,p in C['profile']['anchors'].items():
            # cargo-socket alone is basket-local; all other named anchors use
            # physical source metre coordinates directly below the asset root.
            assert all(abs(a-b) < .00001 for a,b in zip(nodes[name].get('translation',[0,0,0]),p)), name
        info['checks'].append('All shared anchors and functional basket hierarchy present; stage names cover actual meshes, never control empties')
    report['assets'][key] = info
for path,sha in {
    'public/assets/environment/studies/longbough-refinement-study.glb': '2db7f4bfbd8f8c024508f1ec5af1bc942cb140938659f2a4af7346a5be24f5b7',
    'assets/sculpted/valley-trees/longbough-refinement-study.blend': 'fe68e7e4ea808e18b7ebdb31254587a46fbdbb881d4aa244cf4e2d96db8b037c',
}.items():
    actual = hashlib.sha256((R/path).read_bytes()).hexdigest()
    assert actual == sha, path
    report['preserved'][path] = actual
old = json.loads((R/'assets/sculpted/buildings/asset-receipt.json').read_text())
for name,expected in old['assets'].items():
    path = R/'public/assets/environment/buildings'/name
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    assert sha == expected['sha256'], name
    report['preserved'][str(path.relative_to(R))] = sha
(S/'asset-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print('ASSET_CHECKS_PASS', {k:(v['triangles'],v['bytes']) for k,v in report['assets'].items()})
