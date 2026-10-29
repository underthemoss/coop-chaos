"""Blender-authored appearance pass with byte-exact geometry preservation.

All POSITION/index/node bytes come from the historical playable-v1 baseline.
Only NORMAL, COLOR_0, bark UV scale and PBR settings change. The binary patch
avoids glTF roundtrip topology/coordinate churn; Blender imports the result and
saves fully editable sources with the same exported materials/custom normals.
"""
import hashlib
import json
import math
import struct
from pathlib import Path
import bpy
from mathutils import Vector

S = Path(__file__).resolve().parent
R = S.parents[2]
BASE = S / 'appearance-baseline-v1'
OUT = R / 'public/assets/environment/valley'
REV = 'longbough-clearing-appearance-v4-warm-foliage'
FORMATS = {5121: 'B', 5123: 'H', 5125: 'I', 5126: 'f'}
WIDTH = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
SPRAYS = [(-6.15,8.65,-.25,2.15,.60,1.60),(-5.5,9.15,1.45,1.72,.56,1.30),
          (-4.8,10.72,-2.10,2.08,.57,1.54),(-3.25,12.08,-1.05,2.05,.56,1.52),
          (-.8,12.65,.15,2.10,.55,1.50),(1.45,10.85,-3.40,2.13,.58,1.68),
          (-2.45,10.08,-3.80,2.03,.54,1.56),(4.55,11.35,-1.80,2.18,.58,1.67),
          (3.3,11.85,-2.75,1.85,.55,1.43),(5.75,10.25,-2.50,1.93,.54,1.45),
          (6.3,8.85,.35,1.88,.54,1.43),(5.3,9.62,1.60,1.88,.52,1.4)]


def clamp(x):
    return max(0, min(1, x))


def mix(a,b,t):
    return tuple(x*(1-t)+y*t for x,y in zip(a,b))


class Glb:
    def __init__(self,path):
        raw = path.read_bytes()
        n = struct.unpack_from('<I',raw,12)[0]
        self.g = json.loads(raw[20:20+n])
        self.b = bytearray(raw[28+n:])

    def values(self,index):
        a = self.g['accessors'][index]
        v = self.g['bufferViews'][a['bufferView']]
        fmt = '<'+FORMATS[a['componentType']]*WIDTH[a['type']]
        size = struct.calcsize(fmt)
        start = v.get('byteOffset',0)+a.get('byteOffset',0)
        data = [struct.unpack_from(fmt,self.b,start+i*v.get('byteStride',size)) for i in range(a['count'])]
        if a.get('normalized'):
            scale = {5121:255,5123:65535}[a['componentType']]
            data = [tuple(x/scale for x in row) for row in data]
        return data

    def attr(self,primitive,name,values,byte_color=False):
        while len(self.b)%4:self.b.append(0)
        start = len(self.b)
        width = len(values[0])
        if byte_color:
            self.b.extend(bytes(round(clamp(x)*255) for row in values for x in row))
        else:
            self.b.extend(b''.join(struct.pack('<'+'f'*width,*row) for row in values))
        view = len(self.g['bufferViews'])
        self.g['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(self.b)-start,'target':34962})
        index = len(self.g['accessors'])
        a = {'bufferView':view,'componentType':5121 if byte_color else 5126,
             'count':len(values),'type':'VEC'+str(width)}
        if byte_color:a['normalized']=True
        self.g['accessors'].append(a)
        primitive['attributes'][name] = index

    def save(self,path):
        # Drop superseded attributes; retain referenced payload bytes exactly.
        axs=sorted({a for m in self.g['meshes'] for p in m['primitives']
                    for a in [p['indices'],*p['attributes'].values()]})
        views=sorted({self.g['accessors'][i]['bufferView'] for i in axs}
                     |{i['bufferView'] for i in self.g.get('images',[])})
        packed=bytearray()
        new_views=[]
        for index in views:
            v=dict(self.g['bufferViews'][index])
            while len(packed)%4:packed.append(0)
            old=v.get('byteOffset',0)
            v['byteOffset']=len(packed)
            packed.extend(self.b[old:old+v['byteLength']])
            new_views.append(v)
        self.g['accessors']=[dict(self.g['accessors'][i],bufferView=views.index(self.g['accessors'][i]['bufferView'])) for i in axs]
        for image in self.g.get('images',[]):image['bufferView']=views.index(image['bufferView'])
        for m in self.g['meshes']:
            for p in m['primitives']:
                p['indices']=axs.index(p['indices'])
                p['attributes']={key:axs.index(value) for key,value in p['attributes'].items()}
        self.g['bufferViews']=new_views
        self.b=packed
        used=sorted({key for m in self.g['materials'] for key in m.get('extensions',{})})
        if used:self.g['extensionsUsed']=used
        while len(self.b)%4:self.b.append(0)
        self.g['buffers'][0]['byteLength'] = len(self.b)
        self.g['asset']['generator'] = 'Coop Chaos Blender appearance-v2; exact baseline geometry'
        js = json.dumps(self.g,separators=(',',':')).encode()
        js += b' '*((-len(js))%4)
        out = struct.pack('<III',0x46546c67,2,28+len(js)+len(self.b))
        out += struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(self.b),0x004e4942)+self.b
        path.write_bytes(out)


def living(glb):
    for node in glb.g['nodes']:
        if 'mesh' not in node:continue
        p = glb.g['meshes'][node['mesh']]['primitives'][0]
        positions = glb.values(p['attributes']['POSITION'])
        normals = [Vector(v) for v in glb.values(p['attributes']['NORMAL'])]
        colors = []
        if node['name']=='living-wood':
            adjacency = [set() for _ in positions]
            ids = [x[0] for x in glb.values(p['indices'])]
            for i in range(0,len(ids),3):
                tri=ids[i:i+3]
                for j in tri:adjacency[j].update(set(tri)-{j})
            soft = list(normals)
            for _ in range(5):
                soft = [(n*.35+sum((soft[j] for j in adjacency[i]),Vector())*(.65/max(1,len(adjacency[i])))).normalized() for i,n in enumerate(soft)]
            normals = [(a*.18+b*.82).normalized() for a,b in zip(normals,soft)]
            for (x,y,z),n in zip(positions,normals):
                broad = .5+.22*math.sin(x*.65+y*.19)+.12*math.sin(z*.7-y*.11)
                ridge = clamp(.55+.35*n.x+.15*n.z)
                col = mix((.49,.51,.47),(.91,.77,.56),clamp(.38+.35*broad+.20*ridge))
                if y<1.3:
                    moss=clamp((1.3-y)/1.5)*clamp(.32-.35*n.z)
                    col=mix(col,(.42,.47,.30),moss*.4)
                colors.append((*col,1))
            glb.attr(p,'TEXCOORD_0',[(u*.62,v*.62) for u,v in glb.values(p['attributes']['TEXCOORD_0'])])
        else:
            volumes = [(Vector((x,y-max(0,y-10.7)*.19,z)),Vector((sx*1.04,sy*2.35,sz*1.08))) for x,y,z,sx,sy,sz in SPRAYS]
            for point,n in zip(positions,normals):
                q=Vector(point)
                index,(c,size)=min(enumerate(volumes),key=lambda item:sum(((q[k]-item[1][0][k])/item[1][1][k])**2 for k in range(3)))
                delta=q-c
                shell=Vector((delta.x/size.x,.85+delta.y/size.y,delta.z/size.z)).normalized()
                # Shared crown-volume response replaces independent sharp chip planes.
                nn=(shell*.78+n*.22).normalized()
                normals[len(colors)]=nn
                # Author broad leaf-value groups, independent of runtime key
                # intensity. Previous tip threshold left nearly every shoulder
                # within one olive range at the actual strategy camera.
                upper=clamp((delta.y/size.y+.34)*1.15)
                outward=clamp(math.sqrt((delta.x/size.x)**2+(delta.z/size.z)**2)*.85)
                sun=clamp(.48-.42*delta.x/size.x+.36*delta.y/size.y+.16*delta.z/size.z)
                patch=clamp(.53+.22*math.sin(q.x*.72+q.z*.49)+.15*math.cos(q.y*.81-index*.7))
                body=clamp(.20+.55*upper+.24*outward)
                col=mix((.033,.078,.035),(.195,.265,.080),body)
                shoulder=clamp((upper-.28)*1.65)*clamp(.36+.64*sun)
                col=mix(col,(.44,.42,.160),shoulder*(.72+.28*patch))
                # Actual daylight v3 read mint/teal: warmer ~17% dimmer
                # shoulder targets retain selective value grouping.
                # Unequal golden shoulders alternate with sage; interiors stay
                # cool green rather than receiving a global yellow multiplier.
                gold=clamp((sun-.55)*2.0)*clamp((upper-.42)*2.1)*clamp(.36+.64*math.sin(index*1.7+.8)**2)
                col=mix(col,(.57,.41,.115),gold*.76)
                colors.append((*col,1))
        glb.attr(p,'NORMAL',[tuple(n) for n in normals])
        glb.attr(p,'COLOR_0',colors,True)
        mat=glb.g['materials'][p['material']]
        mat['pbrMetallicRoughness']['roughnessFactor']=.98
        mat.setdefault('extensions',{}).setdefault('KHR_materials_specular',{})['specularFactor']=.18


def kit(glb):
    contract=json.loads((R/'src/content/valley-habitat.json').read_text())
    for node in glb.g['nodes']:
        if 'mesh'not in node:continue
        name=node['name']
        for p in glb.g['meshes'][node['mesh']]['primitives']:
            positions=glb.values(p['attributes']['POSITION'])
            normals=glb.values(p['attributes']['NORMAL'])
            colors=[]
            for (x,y,z),n in zip(positions,normals):
                variation=.94+.055*math.sin(x*3.2+z*2.6+y*.7)
                col=(.91,.73,.45)
                if 'hood' in name:
                    foot=contract['profile']['anchors']['sheltered-perch-'+('0' if 'left'in name else '1')]
                    rear=clamp((foot[2]+.22-z)/.6)
                    inward=clamp(-n[1]*1.5+max(0,n[2])*.65)
                    col=mix((.94,.75,.43),(.30,.25,.15),rear*inward*.90)
                    if y<foot[1]+.12 and z<foot[2]-.25:col=(.34,.26,.14)
                elif 'deck' in name or 'landing-weave'in name:
                    col=(.88,.73,.47) if n[1]>.5 else (.43,.32,.17)
                    # Existing woven heel/bedding zone, no decorative inventory.
                    if name=='home-deck' and z<2.0 and n[1]>.5:col=(.60,.48,.27)
                elif 'support'in name:col=(.68,.49,.26)
                elif 'ladder'in name or 'guide'in name:col=(.88,.65,.33)
                colors.append((*[clamp(v*variation) for v in col],1))
            glb.attr(p,'COLOR_0',colors,True)
    for mat in glb.g['materials']:
        mat['pbrMetallicRoughness']['roughnessFactor']=.98


def main():
    bpy.context.preferences.filepaths.save_version=0
    results={}
    for filename,apply in [('longbough-living.glb',living),('longbough-woven-kit.glb',kit)]:
        glb=Glb(BASE/filename)
        apply(glb)
        path=OUT/filename
        glb.save(path)
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(path))
        bpy.context.scene['appearance_revision']=REV
        bpy.ops.wm.save_as_mainfile(filepath=str(S/(path.stem+'.blend')))
        results[filename]={'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size}
    (S/'appearance-qualification.json').write_text(json.dumps({'revision':REV,'assets':results,'scope':'Appearance only: exact POSITION/index/node geometry, unchanged profile; new normals/colors/bark UV scale/PBR.'},indent=2)+'\n')
    print('APPEARANCE_CANDIDATE',results,flush=True)


if __name__=='__main__':main()
