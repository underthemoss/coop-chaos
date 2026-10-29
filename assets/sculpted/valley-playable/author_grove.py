"""Original economical background broadleaf kit; Blender4.5, metres/Y-up GLB.

Two individually authored growth forms, never copies of the living hero.
Opaque recessed crown surfaces plus folded small leaves and original bark paint.
"""
import bpy
import math
import random
import sys
import json
import hashlib
from pathlib import Path
from mathutils import Vector

S = Path(__file__).resolve().parent
R = S.parents[2]
OUT = R/'public/assets/environment/valley'
sys.path.insert(0,str(R/'assets/sculpted/valley-trees'))
import author_trees as h
REV = 'valley-grove-v2'


def forms(name):
    if name == 'oak':
        paths = [
            ([(0,-.2,0),(.12,1.15,.08),(-.16,2.4,.1),(-.65,3.5,.04),(-1.0,4.6,-.1),(-1.5,5.7,-.1)], [.51,.4,.33,.27,.17,.015]),
            ([(-.15,2.25,.1),(.65,3.1,-.25),(1.1,4.25,-.4),(1.0,5.6,-.8),(1.4,6.4,-.7)], [.32,.26,.2,.11,.01]),
            ([(-.55,3.25,.05),(-1.65,3.7,.35),(-2.35,4.7,.55),(-2.7,5.35,.5)], [.23,.18,.1,.01]),
            ([(-.85,4.3,-.1),(-.7,5.2,1),(-.95,5.9,1.45)], [.15,.09,.01]),
            ([(.8,3.7,-.35),(1.9,4.4,.5),(2.45,5.25,.8)], [.18,.11,.01]),
            ([(.65,3.1,-.25),(.85,3.8,-1.2),(1.6,4.8,-1.6)], [.2,.12,.01]),
        ]
        crowns = [(-2.0,5.35,.4,2.05,1.13,1.65),(-1.1,6.12,-.3,1.90,1.16,1.75),
                  (.6,6.30,-.65,1.97,1.08,1.78),(2.05,5.5,.35,1.87,1.10,1.92),
                  (-.4,5.2,1.3,2.05,1.04,1.40)]
        return paths,crowns,7121
    if name == 'spread':
        paths = [
            ([(0,-.2,0),(-.2,1.15,-.1),(-.1,2.2,.1),(.6,3.2,.14),(1.55,4.1,.25),(2.2,5.2,.2)], [.54,.43,.35,.26,.16,.01]),
            ([(-.15,1.7,.05),(-.95,2.7,-.1),(-1.1,3.8,-.3),(-.75,5.0,-.55),(-1.2,5.75,-.4)], [.34,.27,.2,.12,.01]),
            ([(-1,3.3,-.2),(-2.0,3.65,.2),(-2.65,4.6,.45)], [.21,.14,.01]),
            ([(.6,3.2,.14),(1.0,3.9,-1.0),(1.8,4.8,-1.4)], [.19,.12,.01]),
            ([(1.35,3.95,.2),(1.7,4.6,1.2),(2.6,5.15,1.45)], [.17,.09,.01]),
            ([(-1,3.7,-.3),(-1.25,4.4,1),(-.9,5.0,1.6)], [.16,.09,.01]),
        ]
        crowns = [(-2.2,4.65,.25,1.93,1.05,1.62),(-.9,5.55,-.45,2.0,1.13,1.82),
                  (1.1,5.35,-.85,2.12,1.15,1.85),(2.45,5.15,.85,1.75,1.07,1.67),
                  (-.45,4.7,1.25,1.9,1.0,1.4)]
        return paths,crowns,8193
    return [([(0,-.1,0),(.1,.55,0),(-.25,1.0,.05)],[.12,.09,.01]),
            ([(0,.15,0),(.7,.6,.12),(1.05,.9,.2)],[.09,.06,.01]),
            ([(0,.25,0),(-.7,.5,-.25),(-1.0,.7,-.3)],[.09,.05,.01])], [
                (-.8,.85,-.3,.9,.57,.75),(.02,1.15,.12,.95,.63,.84),(1,.95,.25,.8,.56,.72)],9155


def wood(paths,seed):
    roots = []
    r = random.Random(seed)
    radius = .13 if len(paths)==3 else .45
    for i in range(4):
        a = i*math.tau/4+.2+r.uniform(-.25,.25)
        roots.append(([(0,.35,0),(math.cos(a)*radius,.08,math.sin(a)*radius),
                       (math.cos(a)*radius*1.7,-.045,math.sin(a)*radius*1.7)],
                      [radius*.62,radius*.30,.015]))
    obs = [h.tube(p,rad) for p,rad in paths]+[h.tube(p,rad,root=True) for p,rad in roots]
    h.select(obs);bpy.ops.object.join();ob=bpy.context.object;ob.name='grove-living-wood'
    m=ob.modifiers.new('Continuous grown junctions','REMESH');m.mode='VOXEL';m.voxel_size=.095 if len(paths)>3 else .045;m.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=m.name)
    m=ob.modifiers.new('Soft grown planes','SMOOTH');m.factor=.6;m.iterations=4;bpy.ops.object.modifier_apply(modifier=m.name)
    tri=sum(len(p.vertices)-2 for p in ob.data.polygons)
    m=ob.modifiers.new('Scenic silhouette budget','DECIMATE');m.ratio=min(1,(1900 if len(paths)>3 else 450)/tri);bpy.ops.object.modifier_apply(modifier=m.name)
    ob.data.validate(clean_customdata=True);ob.data.update()
    material=h.mat('grove-warm-cool-bark',.98)
    tex=material.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image=bpy.data.images.load(str(R/'assets/sculpted/valley-trees/bark-painted-v1-source.png'),check_existing=True)
    tex.image.pack()
    multiply=material.node_tree.nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
    material.node_tree.links.new(tex.outputs['Color'],multiply.inputs[1])
    vertex=next(n for n in material.node_tree.nodes if n.bl_idname=='ShaderNodeVertexColor')
    material.node_tree.links.new(vertex.outputs['Color'],multiply.inputs[2])
    material.node_tree.links.new(multiply.outputs[0],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    ob.data.materials.append(material)
    ob.data.uv_layers.new(name='GrowthUV')
    ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    attr=ob.data.color_attributes['Color'];uv=ob.data.uv_layers['GrowthUV']
    segments=[]
    for points,radii in paths:
        arc=0
        for pa,pb in zip(points,points[1:]):
            a,b=Vector(pa),Vector(pb);tangent=(b-a).normalized()
            segments.append((a,b,tangent,arc));arc+=(b-a).length
    for p in ob.data.polygons:
        p.use_smooth=True
        for li in p.loop_indices:
            v=ob.data.vertices[ob.data.loops[li].vertex_index];q=h.game(v.co);n=h.game(v.normal)
            t=max(0,min(1,.46+.22*n.x+.13*n.y+.10*math.sin(q.y*.8+q.x*1.2)))
            col=Vector((.74+.19*t,.78+.18*t,.73+.17*t))
            col=col.lerp(h.rgb('#66714a'),max(0,1-q.y/.8)*.2)
            attr.data[li].color=(*col,1)
            choices=[]
            for a,b,tangent,arc in segments:
                along=max(0,min((b-a).length,(q-a).dot(tangent)));base=a+tangent*along
                choices.append(((q-base).length_squared,base,tangent,arc+along))
            _,base,tangent,arc=min(choices,key=lambda x:x[0])
            side=tangent.cross(Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((1,0,0))).normalized()
            front=tangent.cross(side);radial=q-base
            theta=math.atan2(radial.dot(front),radial.dot(side))
            uv.data[li].uv=(theta/math.tau+.5,arc/3.8)
    return ob


def foliage(crowns,seed,shrub):
    r=random.Random(seed);leaves=h.Leaves(seed);core_faces={}
    # Seven overlapping elongated shoulders, with unequal depth and off-axis
    # continuation. The dark irregular interior is deeply recessed.
    for k,params in enumerate(crowns):
        c=Vector(params[:3]);axes=Vector(params[3:]);count=105 if shrub else 220
        sides,rows=17,8;start=len(leaves.v)
        for row in range(rows+1):
            phi=.025+(math.pi-.05)*row/rows
            for j in range(sides):
                a=math.tau*j/sides
                direction=Vector((math.sin(phi)*math.cos(a),math.cos(phi),math.sin(phi)*math.sin(a)))
                wave=1+.075*math.sin(a*3+k+phi*1.7)+.04*math.sin(a*7-phi*3)
                q=c+Vector((direction.x*axes.x,direction.y*axes.y,direction.z*axes.z))*wave*.54
                leaves.v.append(q)
        for row in range(rows):
            for j in range(sides):
                a=start+row*sides+j;b=start+row*sides+(j+1)%sides
                for face in [(a,b,b+sides),(a,b+sides,a+sides)]:
                    center=sum((leaves.v[i] for i in face),Vector())/3
                    n=Vector(((center.x-c.x)/axes.x**2,(center.y-c.y)/axes.y**2,(center.z-c.z)/axes.z**2)).normalized()
                    value=max(0,min(1,.25+.32*n.y+.12*n.x+.05*math.sin(k*1.8)))
                    col=h.mix('#233b31','#6f7b45',value)
                    core_faces[len(leaves.f)]=(c,axes,k)
                    leaves.f.append(face);leaves.colors.append((*col,1));leaves.normals.append(n)
        # Patchy overlapping small leaf sprays obscure shoulders and break their
        # silhouette. Whole-crown normals avoid isolated flashing leaf chips.
        accepted=0
        for j in range(count*8):
            y=r.uniform(-1,1);a=j*2.39996323+k*.81+r.uniform(-.22,.22)
            direction=Vector((math.sqrt(1-y*y)*math.cos(a),y,math.sqrt(1-y*y)*math.sin(a)))
            scale=.77+r.uniform(-.04,.12)
            wave=1+.08*math.sin(a*3+y*4+k)
            q=c+Vector((direction.x*axes.x,direction.y*axes.y,direction.z*axes.z))*wave*scale
            if any(sum(((q[i]-other[i])/other[i+3])**2 for i in range(3))<.70**2 for other in crowns if other is not params):
                continue
            accepted+=1
            out=Vector((direction.x/axes.x,direction.y/axes.y,direction.z/axes.z)).normalized()
            # Alternating a few warm outward shoulders, broad cool dark interiors.
            value=max(0,min(1,.24+.43*max(0,out.y)+.12*out.x+.10*math.sin(k*1.9)))
            col=h.mix('#334d36','#929653',value*.82)
            n=(out*.8+Vector((0,.22,0))).normalized()
            length=r.uniform(.25,.32)
            for offset in [Vector((0,0,0)),Vector((r.uniform(-.13,.13),r.uniform(-.09,.09),r.uniform(-.13,.13))),Vector((r.uniform(-.12,.12),r.uniform(-.09,.09),r.uniform(-.12,.12)))]:
                leaves.leaf(q+offset,n,out,length,length*r.uniform(.46,.62),col)
            if accepted>=count:break
    ob=leaves.object();ob.name='grove-crown-foliage'
    attr=ob.data.color_attributes['Color'];smooth=[]
    for p in ob.data.polygons:
        for li in p.loop_indices:
            if p.index in core_faces:
                c,axes,k=core_faces[p.index];q=leaves.v[ob.data.loops[li].vertex_index]
                n=Vector(((q.x-c.x)/axes.x**2,(q.y-c.y)/axes.y**2,(q.z-c.z)/axes.z**2)).normalized()
                value=max(0,min(1,.28+.35*n.y+.1*n.x+.045*math.sin(k*1.8)))
                attr.data[li].color=(*h.mix('#2c4433','#7f8949',value),1)
            else:n=leaves.normals[p.index]
            smooth.append(tuple(h.xyz(n.normalized())))
    ob.data.normals_split_custom_set(smooth)
    ob.data.materials.clear();ob.data.materials.append(h.mat('grove-grouped-broadleaf',.98,True))
    return ob


def build(name):
    h.clear();paths,crowns,seed=forms(name)
    obs=[wood(paths,seed),foliage(crowns,seed,name=='shrub')]
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(S/f'valley-grove-{name}.blend'))
    h.select(obs)
    path=OUT/f'valley-grove-{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
                              export_yup=True,export_materials='EXPORT',
                              export_vertex_color='NAME',export_vertex_color_name='Color',export_all_vertex_colors=False,
                              export_image_format='JPEG',export_image_quality=85,
                              export_normals=True,export_animations=False,export_cameras=False,export_lights=False)
    points=[h.game(ob.matrix_world@v.co) for ob in obs for v in ob.data.vertices]
    low=[h.game(obs[0].matrix_world@v.co) for v in obs[0].data.vertices if h.game(v.co).y<=1]
    return {'revision':REV,'assetUrl':f'/assets/environment/valley/{path.name}',
            'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,
            'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in obs),
            'min':[min(v[i] for v in points) for i in range(3)],'max':[max(v[i] for v in points) for i in range(3)],
            'lowWoodMin':[min(v[i] for v in low) for i in range(3)],'lowWoodMax':[max(v[i] for v in low) for i in range(3)],
            'meshGroups':[ob.name for ob in obs],'materials':[m.name for ob in obs for m in ob.data.materials]}


if __name__=='__main__':
    result={name:build(name) for name in ['oak','spread','shrub']}
    (S/'grove-assets.json').write_text(json.dumps({'revision':REV,'sourceFrame':{'anatomicalGroundY':0,'front':'+Z','metersPerUnit':1},
        'placement':'Scenic only; runtime owner outside terrain/reserved blocked space; no gameplay collision or capacity claim.',
        'provenance':'Original authored paths, continuous voxel-fused wood and opaque folded leaves; shared original author_trees geometric helpers. Original generated bark diffuse from valley-trees/bark-painted-v1-source.png, embedded as JPEG85 by Blender; original PNG remains unchanged. No external asset downloads or full hero copies.',
        'assets':result},indent=2)+'\n')
    print('GROVE_EXPORTED',result,flush=True)
