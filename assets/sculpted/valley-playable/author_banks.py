"""Original fractured bank/shore masses; no imported meshes or imagery.

Reuses our original landscape ring-course sculpture tools with new interlocking
composition, warm mineral planes, wet lower faces and protected moss ledges.
Root at center-bottom, metres, +Z exposed bank face, +X tangent, Y up.
"""
import bpy
import sys
import math
import json
import hashlib
from pathlib import Path
from mathutils import Vector
S=Path(__file__).resolve().parent;R=S.parents[2]
sys.path.insert(0,str(R/'assets/sculpted/landscape'))
from author_landscape import Sculpture,clear,xyz,linear
OUT=R/'public/assets/environment/valley';REV='valley-bank-family-v1'
DIMS={'bank-shoulder':(3.6,1.5,1.4),'bank-shelf':(3.2,.4,1.4),'shore-outcrop':(2.2,.9,1.5)}

def build(name):
    clear();s=Sculpture({'bank-shoulder':81201,'bank-shelf':81202,'shore-outcrop':81203}[name])
    if name=='bank-shoulder':
        # Unequal broad fracture blocks overlap beneath a broken soil shoulder.
        for c,size,phase in [((-.96,0,-.19),(1.48,1.15,1.08),.2),((.12,.04,-.25),(1.95,1.52,.94),.7),
                             ((1.22,0,-.08),(.98,.92,1.05),1.4),((-.66,.11,.31),(1.92,.47,.76),.6),
                             ((.67,.39,.26),(1.47,.40,.82),1.1),((-.08,1.04,-.12),(1.74,.32,.85),.9),
                             ((-1.48,0,.36),(.55,.29,.57),1.7)]:s.stone(c,size,13,7,.68,phase)
    elif name=='bank-shelf':
        for c,size,phase in [((-.88,0,-.08),(1.38,.29,1.11),.1),((.37,0,-.15),(1.8,.40,1.18),.8),
                             ((1.25,.02,.19),(.77,.24,.81),1.7),((-.28,0,.41),(.87,.18,.59),2.4)]:s.stone(c,size,12,5,.82,phase)
        for j in range(9):
            a=j*2.39996323;s.stone((math.cos(a)*1.4,0,math.sin(a)*.48),(.18+j%3*.07,.08+j%2*.035,.16+j%3*.06),7,5,0,a)
    else:
        for c,size,phase in [((-.44,0,-.10),(1.40,.91,1.12),.3),((.54,0,.13),(1.17,.59,1.34),1.8),
                             ((-.82,0,.42),(.55,.25,.61),2.1),((.07,.02,.60),(.75,.24,.54),.7)]:s.stone(c,size,15,7,.62,phase)
    s.normalize(DIMS[name])
    # Coherent mineral/wet strata use physical height and broad fracture faces.
    # No equal-sized pebbles or tiny noise pasted across a panel.
    for i,(face,mi) in enumerate(zip(s.f,s.mats)):
        p=sum((s.v[j] for j in face),Vector())/len(face)
        if mi==0:
            old=Vector(s.colors[i][:3]);old=old.lerp(linear('#adb0a2'),.34)
            mineral=.10*(.5+.5*math.sin(p.x*3.1+p.y*5.2+p.z*1.7))
            old=old.lerp(linear('#b4a88d'),mineral)
            wet=max(0,1-p.y/(DIMS[name][1]*.32))*max(0,min(1,.55+p.z/DIMS[name][2]))
            old=old.lerp(linear('#59645f'),wet*.42)
            s.colors[i]=(*old,1)
    ob=s.object();ob.name='bank-mineral-and-protected-moss'
    root=bpy.data.objects.new('asset',None);bpy.context.collection.objects.link(root);ob.parent=root
    root['asset_revision']=REV;root['exposed_outward_axis']='+Z';root['ground_origin']='center-bottom'
    scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(S/f'valley-{name}.blend'))
    bpy.ops.object.select_all(action='DESELECT');root.select_set(True);ob.select_set(True);bpy.context.view_layer.objects.active=ob
    path=OUT/f'valley-{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,
        export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',
        export_all_vertex_colors=False,export_normals=True,export_animations=False,export_cameras=False,export_lights=False)
    return {'assetUrl':f'/assets/environment/valley/{path.name}','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'bytes':path.stat().st_size,'triangles':sum(len(p.vertices)-2 for p in ob.data.polygons),
            'min':[-DIMS[name][0]/2,0,-DIMS[name][2]/2],'max':[DIMS[name][0]/2,DIMS[name][1],DIMS[name][2]/2],
            'meshGroups':[ob.name],'materials':[m.name for m in ob.data.materials],
            'placement':'Partly bury into blocked bank; +Z outward, +X tangent. Rotate/scale to actual slope, no terrain/walking support claim.'}

if __name__=='__main__':
    result={name:build(name) for name in DIMS}
    (S/'bank-assets.json').write_text(json.dumps({'revision':REV,'sourceFrame':{'metersPerUnit':1,'up':'+Y','outward':'+Z','tangent':'+X','origin':'center-bottom'},
        'provenance':'Original authored fracture courses and composition; original landscape Sculpture helper reused, no external meshes/images.',
        'assets':result},indent=2)+'\n');print('BANK_EXPORTED',result,flush=True)
