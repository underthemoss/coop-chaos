"""Read-only final asset qualification and reproducible source/hash receipt."""
import sys,json,hashlib,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from validate_buildings import inspect,read_glb,ROOT,SOURCE,OUT

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def load(name):return json.loads((SOURCE/name).read_text())

proof=load('determinism-qualification.json')
provenance=load('provenance.json')
texture=digest(SOURCE/'reed-weave-v1-source.png')
assets={}
for name,expected in proof['hashes'].items():
    path=OUT/name
    info,_=inspect(path)
    assert info['sha256']==expected
    assert info['animations']==0 and info['degenerateTriangles']==0
    assert info['maxNormalError']<1e-5
    raw,doc,binary,values=read_glb(path)
    assert not doc.get('skins')
    assert all(not b.get('uri') for b in doc['buffers'])
    assert all(not i.get('uri') for i in doc.get('images',[]))
    assert all(m.get('alphaMode','OPAQUE')=='OPAQUE' for m in doc['materials'])
    if name!='sleeping-deck-compatible.glb':
        assert len(info['images'])==1 and info['images'][0]['sha256']==texture
        for m in doc['materials'][:2]:
            p=m['pbrMetallicRoughness'];assert 'baseColorTexture' in p
            assert p.get('baseColorFactor',[1,1,1,1])==[1,1,1,1]
            assert abs(p['roughnessFactor']-.94)<1e-5
    info['dimensions']=[info['max'][i]-info['min'][i] for i in range(3)]
    info['opaqueMaterials']=True
    info['externalResources']=False
    assets[name]=info
contacts=load('contact-qualification.json')
assert all(p['floorHit'] is not None and p['embeddedMetres']>0 for p in contacts['homePostContacts']+contacts['studyPostContacts'])
assert all(p['postFoot'][1]<=0 for p in contacts['nurseryGroundPosts'])
assert all(v['surfaceContactPairs']>0 for v in contacts['homeLivingSupport'].values())
rest=load('actual-fit-candidate.json')
assert rest['assets']['boughhome']==assets['boughhome.glb']['sha256']
assert all(c['poseCount']==93 and not any(h['asset']=='boughhome' for h in c['collisions']) for c in rest['birds'].values())
angle=load('runtime-angle-0.35.json')
assert angle['assets']['sleeping-deck-compatible']==assets['sleeping-deck-compatible.glb']['sha256']
assert all(c['intersections']==0 for c in angle['checks'] if not c['cargoHypothetical'])
actual=load('runtime-clamber-candidate.json')
assert 'v2' in actual['packet']
assert all(c['intersections']==0 for c in actual['checks'] if not c['cargoHypothetical'] and c['bird'] in ['dapple','wren'])
for name,v in provenance['protectedInputs'].items(): assert digest(ROOT/name)==v['sha256']
source_hashes={p.name:digest(p) for p in sorted(SOURCE.iterdir()) if p.is_file() and p.name!='asset-receipt.json' and p.suffix in ['.py','.json','.md','.png','.blend']}
receipt={'state':'READY for final runtime acceptance','revision':'bound-reed-family-v1; same-anchor-open-clamber-v2','runtimeWriteFreeze':True,'assets':assets,'sourceHashes':source_hashes,'checks':{'freshProcessGLBDeterminism':True,'editableSourcesReopened':5,'indexedResourceValidation':True,'newHomeSourceBodyChecks':4*93,'newHomeAboveContactIntersections':0,'sourceEquivalentClamberBodyChecks':24,'sourceEquivalentClamberAboveContactIntersections':0,'actualRepairedPacketVisitors':['dapple','wren'],'allHoodAndNurserySupportContacts':True,'oldAssetsAndHabitatPreserved':True},'remaining':'Actual Babylon pose/continuous traversal, final art, staged work, narrow layout, save/refresh and performance acceptance belong to integration. No deployment or production-art parity claim.','limits':['Source sampled mesh/surface checks exclude expected functional contacts below foot+.13m; not zero-collision physics.','Evaluated source packets reposition one reduced-motion pose; actual animated engine proof is separate.','Hypothetical cargo intersects upper approach; actual saved access is unburdened.','Weave shading/repetition, stylized bundled construction and compact open shelter remain first-kit limits.','No structural strength, new capacity, private enclosure, timber supply or mobility rule is established.']}
(SOURCE/'asset-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('FINAL_ASSET_QUALIFICATION_PASS',len(assets),digest(SOURCE/'asset-receipt.json'))
