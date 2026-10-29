"""Source support contacts, actual basket/cargo sweep and sole margins."""
import hashlib
import json
import math
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from validate_fit import ROOT,SOURCE,C,A,geometry,bvh

living,lh = geometry(ROOT/'public/assets/environment/valley/longbough-living.glb')
kit,kh = geometry(ROOT/'public/assets/environment/valley/longbough-woven-kit.glb')
wood = bvh([t for t in living if t[0]=='living-wood'])
report = {'revision':C['revision'],'profileSha256':hashlib.sha256((ROOT/'src/content/valley-habitat.json').read_bytes()).hexdigest(),'livingSha256':lh,'kitSha256':kh,
          'supportConnections':{}, 'basket':{}, 'limits':'Source geometry contacts and whole rigid cargo/basket swept21positions. Static contact/clearance only, no structural strength, bird capacity or collision simulation claim.'}
for name,pairs in C['authoring']['supportConnections'].items():
    checks=[]
    for start,end in pairs:
        p=Vector(start)
        nearest,normal,_,distance=wood.find_nearest(p)
        signed = (p-nearest).dot(normal)
        checks.append({'woodContact':start,'supportedEnd':end,'nearestWoodDistance':distance,
                       'signedOutwardDistance':signed,'embeddedOrTouching':signed<=.015})
    report['supportConnections'][name]=checks

basket = [t for t in kit if t[0]=='basket-weave']
static = living+[t for t in kit if t[0] not in ('basket-weave','lift-rope-fiber')]
surface=bvh(static)
bundle,_=geometry(ROOT/'public/assets/environment/reed-bundle.glb')
socket=Vector(A['cargo-socket'])
base=Vector(A['basket-ground'])
yaw=C['profile']['hauling'].get('cargoYawRadians',math.pi/2)
co,si=math.cos(yaw),math.sin(yaw)
cargo=[]
for name,tri in bundle:
    converted=[]
    for q in tri:
        q=q*C['presentation']['reedBundleScale']
        converted.append(Vector((q.x*co+q.z*si,q.y,-q.x*si+q.z*co))+socket+base)
    cargo.append(('actual-reed-cargo',converted))
sweeps=[]
for i in range(21):
    y=C['profile']['hauling']['travelY']*i/20
    move=Vector((0,y,0))
    moving=[(name,[v+move for v in tri]) for name,tri in basket+cargo]
    pairs=surface.overlap(bvh(moving))
    groups={}
    for a,b in pairs:
        key=static[a][0]+' / '+moving[b][0]
        groups[key]=groups.get(key,0)+1
    sweeps.append({'progress':i/20,'surfacePairs':len(pairs),'groups':groups})
payload_contacts=bvh(basket).overlap(bvh(cargo))
report['basket']={'payloadVsBasketPairs':len(payload_contacts),'payloadGapAboveFloor':min(p.y-base.y for _,tri in cargo for p in tri)-.08,'samples':sweeps,'landingFloorTopY':A['basket-landing'][1]+.08,
                  'homeFloorTopY':A['home-entry'][1],'socketYawRadians':yaw,
                  'actualBundleHalfScale':C['presentation']['reedBundleScale'],
                  'groundBasketRootY':A['basket-ground'][1],
                  'ropeLengthGround':A['lift-rope'][1]-A['basket-ground'][1]-C['profile']['hauling']['bridleAboveBasket'],
                  'ropeLengthLanding':A['lift-rope'][1]-A['basket-landing'][1]-C['profile']['hauling']['bridleAboveBasket']}
(SOURCE/'source-support.json').write_text(json.dumps(report,indent=2)+'\n')
print('SUPPORTS', {k:[round(x['signedOutwardDistance'],4) for x in v] for k,v in report['supportConnections'].items()},flush=True)
print('BASKET', [(x['progress'],x['groups']) for x in sweeps if x['surfacePairs']],flush=True)

assert all(p['embeddedOrTouching'] for checks in report['supportConnections'].values() for p in checks), 'floating support contact'
assert not any(p['surfacePairs'] for p in sweeps), 'basket/cargo obstruction'

assert not payload_contacts, "payload intersects basket geometry"
