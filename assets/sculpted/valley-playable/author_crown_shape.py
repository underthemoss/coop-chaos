"""Original crown sculpt pass, preserving v4 colors/wood/kit exactly.

Connected leaves and support cores receive coherent authored spray transforms.
No new leaves or triangles: unequal elongation, vertical layering, twisting
shoulders and tapered outer continuations replace repeated domed packets.
"""
import bpy
import sys
import math
import struct
import json
import hashlib
from pathlib import Path
from mathutils import Vector, Matrix
S=Path(__file__).resolve().parent;R=S.parents[2]
sys.path.insert(0,str(S))
from author_appearance import Glb,SPRAYS
from author_grove import forms
BASE=S/'shape-baseline-v4';OUT=R/'public/assets/environment/valley'
REV='clearing-crown-shape-v3'

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def components(positions,ids):
    # glTF splits corners for color/normal boundaries. Restore geometric
    # connectivity by exact rounded position before collecting leaf units.
    parent=list(range(len(positions)));same={}
    def root(i):
        while parent[i]!=i:
            parent[i]=parent[parent[i]];i=parent[i]
        return i
    def union(a,b):
        a,b=root(a),root(b)
        if a!=b:parent[b]=a
    for i,p in enumerate(positions):
        key=tuple(round(x,6) for x in p)
        if key in same:union(i,same[key])
        else:same[key]=i
    for i in range(0,len(ids),3):union(ids[i],ids[i+1]);union(ids[i],ids[i+2])
    groups={}
    for i in range(len(positions)):groups.setdefault(root(i),[]).append(i)
    return list(groups.values())

def target(q,c,size,k,hero):
    d=q-c;u=d.x/size.x;v=d.z/size.z;w=d.y/size.y
    angle=[-.34,.52,-.62,.21,.68,-.19,.37,-.57,.13,.49,-.28,.74][k%12]
    # Major axes alternate by architecture, not by uniform random scaling.
    long=[1.13,1.25,1.08,1.22,1.09,1.18,1.27,1.11,1.23,1.06,1.21,1.12][k%12]
    narrow=[.82,.73,.92,.78,.89,.75,.83,.91,.76,.88,.79,.85][k%12]
    depth=[.90,1.08,.80,.97,1.03,.84,.99,.85,.94,1.10,.88,1.01][k%12]
    a=angle;co,si=math.cos(a),math.sin(a)
    xx=d.x*long;zz=d.z*narrow
    # Unequal low shoulders continue laterally. The outer ends taper down,
    # breaking a single concentric domed top without exposing flat rims.
    shoulder=.13*math.sin(u*2.4+k*1.7)+.10*math.sin(v*3.1-k*.8)
    tilt=(.13 if k%2 else -.18)*u+.09*v
    drop=.16*max(0,abs(u)-.38)**1.4
    shift=[-.14,.13,-.04,.22,-.16,.09,-.22,.04,.20,-.13,.05,-.06][k%12]
    yy=d.y*depth+size.y*(shoulder+tilt-drop+shift)
    # Large-scale planform bends, not a field of tiny surface noise.
    xx+=size.x*.07*math.sin(v*2.7+k)
    zz+=size.z*.09*math.sin(u*2.3+k*.9)
    return c+Vector((xx*co-zz*si,yy,xx*si+zz*co))

def patch(glb,p,centers,hero):
    points=[Vector(q) for q in glb.values(p['attributes']['POSITION'])]
    norms=[Vector(q) for q in glb.values(p['attributes']['NORMAL'])]
    ids=[x[0] for x in glb.values(p['indices'])]
    groups=components(points,ids);new=list(points);normal=list(norms)
    protected=[];retained=0
    if hero:
        profile=json.loads((R/'src/content/valley-habitat.json').read_text())['profile'];anchors=profile['anchors']
        for final in profile['naturalPerches']:
            route=[Vector(anchors[p['anchor']]) for p in profile['placeAccess'][final]]
            for a,b in zip(route,route[1:]):
                protected.append((Vector((min(a.x,b.x)-.95,min(a.y,b.y)+.08,min(a.z,b.z)-.95)),
                                  Vector((max(a.x,b.x)+.95,max(a.y,b.y)+1.15,max(a.z,b.z)+.95))))
    for group in groups:
        center=sum((points[i] for i in group),Vector())/len(group)
        k,(c,size)=min(enumerate(centers),key=lambda row:sum(((center[i]-row[1][0][i])/row[1][1][i])**2 for i in range(3)))
        # All corners of a leaf/core use the same spray, avoiding assignment
        # discontinuities in the overlapping crown windows.
        is_core=len({tuple(round(x,6) for x in points[i]) for i in group})>20
        candidates={}
        for i in group:
            q=points[i]
            # Dark backing stays recessed behind the leaf shoulders, never
            # an exposed glossy/foam surface defining the silhouette.
            if is_core:q=center+(q-center)*.70
            candidates[i]=(q,target(q,c,size,k,hero))
        lo=Vector([min(v[1][j] for v in candidates.values()) for j in range(3)])
        hi=Vector([max(v[1][j] for v in candidates.values()) for j in range(3)])
        if any(all(lo[j]<=b[j] and hi[j]>=a[j] for j in range(3)) for a,b in protected):
            # Preserve the already-qualified original leaves/cores near the
            # authored body approach, rather than squeezing a usable landing.
            retained+=1
            continue
        for i,(q,value) in candidates.items():
            new[i]=value
            eps=.0005
            cols=[]
            for axis in range(3):
                delta=Vector((0,0,0));delta[axis]=eps
                cols.append((target(q+delta,c,size,k,hero)-target(q-delta,c,size,k,hero))/(2*eps))
            jacobian=Matrix(cols).transposed()
            normal[i]=(jacobian.inverted().transposed()@norms[i]).normalized()
    # Replace referenced buffer bytes in place: all colors, UVs, wood, textures,
    # indices and layout remain untouched; only POSITION bounds change in JSON.
    for name,values in [('POSITION',new),('NORMAL',normal)]:
        a=glb.g['accessors'][p['attributes'][name]];view=glb.g['bufferViews'][a['bufferView']]
        start=view.get('byteOffset',0)+a.get('byteOffset',0);stride=view.get('byteStride',12)
        assert a['componentType']==5126 and a['type']=='VEC3'
        for i,v in enumerate(values):struct.pack_into('<fff',glb.b,start+i*stride,*v)
        if name=='POSITION':
            a['min']=[min(v[j] for v in values) for j in range(3)]
            a['max']=[max(v[j] for v in values) for j in range(3)]
    return {'components':len(groups),'protectedOriginalComponents':retained,'vertices':len(points),'maxDisplacementM':max((a-b).length for a,b in zip(points,new))}

def main():
    bpy.context.preferences.filepaths.save_version=0;results={}
    for name in ['longbough-living','valley-grove-oak','valley-grove-spread','valley-grove-shrub']:
        hero=name=='longbough-living';source=BASE/(name+'.glb');glb=Glb(source)
        if hero:
            centers=[(Vector((x,y-max(0,y-10.7)*.19,z)),Vector((sx*1.04,sy*2.35,sz*1.08))) for x,y,z,sx,sy,sz in SPRAYS]
        else:centers=[(Vector(p[:3]),Vector(p[3:])) for p in forms(name.split('-')[-1])[1]]
        n=next(n for n in glb.g['nodes'] if 'crown-foliage' in n.get('name',''))
        result=patch(glb,glb.g['meshes'][n['mesh']]['primitives'][0],centers,hero)
        path=OUT/(name+'.glb');glb.save(path)
        bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path))
        bpy.context.scene['shape_revision']=REV
        bpy.ops.wm.save_as_mainfile(filepath=str(S/(name+'.blend')))
        result.update({'sha256':sha(path),'bytes':path.stat().st_size,'baselineSha256':sha(source)})
        results[name]=result;print('CROWN_EXPORTED',name,result,flush=True)
    (S/'crown-shape.json').write_text(json.dumps({'revision':REV,'assets':results,'scope':'Only crown POSITION/NORMAL values and position accessor bounds changed. Exact v4 COLOR_0, topology, living wood, kit, profile and embedded images retained.'},indent=2)+'\n')

if __name__=='__main__':main()
