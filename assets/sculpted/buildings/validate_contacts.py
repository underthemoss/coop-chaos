"""Measured support/floor contacts in actual indexed export coordinates."""
import sys
import json
import math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).resolve().parent))
from validate_buildings import inspect, ROOT, SOURCE
from validate_actual_fit import triangle_bvh


def plane_hit(tris, x, z, above):
    tree,_=triangle_bvh(tris)
    loc,norm,index,distance=tree.ray_cast(Vector((x,above,z)),Vector((0,-1,0)),20)
    return list(loc) if loc is not None else None


def feet(center,width,depth,facing):
    result=[]
    for u in [-.85,.85]:
        w=width*.5*(.76+.24*math.sin(math.pi*(.10+.78*.05)))
        x=center[0]+u*w+.035*math.sin(math.pi*.05)*(1-u*u)
        z=center[2]+facing*(.05-.5)*depth-facing*.025
        result.append([x,z])
    return result

_,home=inspect(ROOT/'public/assets/environment/buildings/boughhome.glb')
deck=[t for t in home if t[0]=='deck']
report={'homePostContacts':[],'studyPostContacts':[],'nurseryGroundPosts':[],'homeLivingSupport':{}}
for side,c,w,d in [('left',[-.70,2.25,-.54],.84,1.1),('right',[.73,2.85,-.52],.79,1.02)]:
    for x,z in feet(c,w,d,-1):
        x=max(-.94,min(.94,x));z-=.10
        hit=plane_hit(deck,x,z,2.28)
        report['homePostContacts'].append({'side':side,'postFoot':[x,2.23,z],'floorHit':hit,'embeddedMetres':hit[1]-2.23 if hit else None})
_,host=inspect(ROOT/'public/assets/environment/studies/longbough-refinement-study.glb')
hostfloor=[t for t in host if t[0].startswith('study-structure-deck')]
print('host floor tags',set(t[0] for t in hostfloor))
for side,c,w,d in [('left',[-.26,3.2,2.44],1.65,1.45),('right',[2.24,3.2,1.90],1.58,1.45)]:
    for x,z in feet(c,w,d,1):
        hit=plane_hit(hostfloor,x,z,3.26)
        report['studyPostContacts'].append({'side':side,'postFoot':[x,3.18,z],'floorHit':hit,'embeddedMetres':hit[1]-3.18 if hit else None})
for side,c,w,d in [('left',[-.25,.20,.10],.95,.92),('right',[.34,.18,.20],.77,.79)]:
    for x,z in feet(c,w,d,-1):
        report['nurseryGroundPosts'].append({'side':side,'postFoot':[x,-.01,z],'groundY':0,'buriedMetres':.01})
for x in [-.63,.63]: report['nurseryGroundPosts'].append({'side':'frame','postFoot':[x,-.01,.32],'groundY':0,'buriedMetres':.01})
# A floor resting across actual living wood must intersect the tree, rather
# than float independently. This is contact evidence, not strength analysis.
for tree in ['lowfork','splitcrown','reedside']:
    _,wood=inspect(ROOT/f'public/assets/environment/{tree}.glb')
    # Imported tree material mesh name identifies original continuous wood.
    wood=[t for t in wood if 'leaf' not in t[0].lower() and 'foliage' not in t[0].lower()]
    a,_=triangle_bvh(deck);b,_=triangle_bvh(wood)
    report['homeLivingSupport'][tree]={'surfaceContactPairs':len(a.overlap(b))}
report['limits']='Source indexed mesh contact and authored flat ground Y0; terrain placement, structural strength, body pose and dynamic traversal remain separate qualification.'
(SOURCE/'contact-qualification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
