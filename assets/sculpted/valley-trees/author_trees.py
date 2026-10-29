"""Original isolated valley tree study; Blender 4.5 LTS. No legacy exports.
blender --background --python assets/sculpted/valley-trees/author_trees.py -- longbough
Opaque folded small leaves, fused continuously tapered limbs, no textures/props.
"""
import bpy,math,random,json,hashlib,sys,argparse
from pathlib import Path
from mathutils import Vector

SOURCE=Path(__file__).resolve().parent;ROOT=SOURCE.parents[2]
OUT=ROOT/'public/assets/environment/studies';REV='tree-study-v5'
def xyz(p):return Vector((p[0],-p[2],p[1]))
def game(p):return Vector((p.x,p.z,-p.y))
def rgb(h):
    vals=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    return Vector([v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in vals])
def mix(a,b,t):return rgb(a).lerp(rgb(b),max(0,min(1,t)))
def clear():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for group in (bpy.data.meshes,bpy.data.materials,bpy.data.curves,bpy.data.cameras,bpy.data.lights):
        for item in list(group):
            if item.users==0:group.remove(item)
def mat(name,rough=.9,twosided=False):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.use_backface_culling=not twosided
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=0;p.inputs['Specular IOR Level'].default_value=.23
    n=m.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Color';m.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color']);return m
def mesh(name,verts,faces):
    data=bpy.data.meshes.new(name);data.from_pydata([xyz(p) for p in verts],[],faces);data.update()
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);return ob
def select(obs):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in obs:ob.select_set(True)
    bpy.context.view_layer.objects.active=obs[0]
def sample(points,radii,spacing=.17):
    out=[];sizes=[]
    for k in range(len(points)-1):
        a,b,c,d=[Vector(points[min(max(j,0),len(points)-1)]) for j in (k-1,k,k+1,k+2)]
        steps=max(3,round((c-b).length/spacing))
        for j in range(steps):
            t=j/steps;out.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t));sizes.append(radii[k]*(1-t)+radii[k+1]*t)
    out.append(Vector(points[-1]));sizes.append(radii[-1]);return out,sizes
def tube(points,radii,name='branch',root=False):
    p,r=sample(points,radii);verts=[];faces=[];sides=14
    last=None
    for i,(q,rad) in enumerate(zip(p,r)):
        tangent=(p[min(i+1,len(p)-1)]-p[max(0,i-1)]).normalized()
        u=tangent.cross(Vector((0,1,0)) if abs(tangent.y)<.94 else Vector((1,0,0))).normalized()
        if last is not None and u.dot(last)<0:u=-u
        v=tangent.cross(u).normalized();last=u
        for j in range(sides):
            a=j*math.tau/sides;flute=1+.105*math.sin(a*3-i*.035)+.035*math.sin(a*7+i*.018)
            off=(u*math.cos(a)+v*math.sin(a))*rad*flute
            if root:off.y*=.38
            verts.append(q+off)
    for i in range(len(p)-1):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(reversed(range(sides))),tuple(range((len(p)-1)*sides,len(p)*sides))])
    return mesh(name,verts,faces)

def longbough():
    paths=[
      ([(0,-.22,.10),(-.20,.6,.18),(-.40,1.55,.30),(-.05,2.75,.48),(-.37,3.80,.70),(-.20,4.9,.83),(.20,5.9,.62),(.65,6.8,.35),(.38,7.3,.08)],[.86,.74,.62,.55,.45,.35,.26,.15,.025]),
      ([(-.36,1.6,.29),(-1.3,2.0,.40),(-2.45,2.35,.22),(-3.55,2.95,.25),(-4.25,3.95,.15),(-4.45,4.85,.08)],[.61,.52,.41,.31,.20,.025]),
      ([(-.17,2.24,.36),(.85,2.75,.34),(2.02,2.92,.50),(3.3,3.38,.47),(4.15,4.1,.35),(4.55,4.9,.03)],[.56,.49,.37,.27,.15,.025]),
      ([(-.28,3.75,.68),(-1.22,4.45,.10),(-2.45,4.86,-.15),(-3.3,5.65,-.33),(-3.30,6.35,-.4)],[.41,.31,.23,.14,.025]),
      ([(-.19,4.76,.83),(.83,5.2,-.08),(1.95,5.65,-.64),(2.6,6.4,-.95),(2.55,6.9,-.8)],[.33,.27,.19,.11,.025]),
      ([(.19,5.85,.64),(-.84,6.1,.8),(-1.65,6.72,.84),(-1.85,7.3,.75)],[.24,.19,.10,.025]),
      ([(-2.38,2.3,.25),(-2.75,3.13,1.10),(-2.60,3.9,1.85),(-2.1,4.45,2.15)],[.29,.23,.13,.025]),
      ([(2.01,2.91,.50),(2.78,3.60,1.3),(3.05,4.48,1.8),(2.65,4.9,1.9)],[.27,.21,.12,.025]),
      ([(-.11,2.7,.49),(.20,3.5,-.65),(.75,4.25,-1.47),(1.4,4.9,-1.80),(1.72,5.5,-2.05)],[.37,.28,.20,.12,.025]),
      ([(-1.23,4.45,.1),(-1.2,5.15,-1.1),(-1.54,5.75,-1.9),(-2.0,6.1,-2.2)],[.23,.17,.10,.025]),
      ([(-3.53,2.96,.25),(-4.0,3.5,-.7),(-4.0,4.34,-1.32),(-3.75,4.8,-1.45)],[.22,.16,.095,.025]),
      ([(3.29,3.37,.47),(3.55,4.10,-.7),(3.3,4.9,-1.25),(3.15,5.4,-1.38)],[.20,.15,.08,.025]),
    ]
    roots=[
      ([(0,.7,.1),(-.7,.35,.45),(-1.45,.05,.90),(-1.98,-.18,1.0)],[.58,.44,.23,.045]),
      ([(-.1,.7,.1),(.7,.30,.4),(1.55,.0,.55),(2.12,-.16,.65)],[.57,.42,.22,.04]),
      ([(0,.55,.1),(.25,.22,-.95),(.6,-.05,-1.75),(1.0,-.15,-2.1)],[.53,.39,.20,.04]),
      ([(-.12,.56,.15),(-.8,.2,-.4),(-1.5,-.03,-.85),(-1.85,-.15,-1.2)],[.51,.36,.18,.035]),
      ([(.10,.43,.14),(.12,.10,.85),(.25,-.13,1.35)],[.40,.27,.04])]
    # Unequal, scalloped and layered fans; intentional upper windows between them.
    fans=[
      ((-4.04,4.95,.10),(1.27,.58,1.27),560),
      ((-2.55,4.65,1.98),(1.25,.48,.92),420),
      ((-3.25,6.30,-.38),(1.38,.63,1.18),590),
      ((-1.82,6.97,.87),(1.16,.53,1.05),450),
      ((.37,7.18,.10),(1.34,.63,1.20),650),
      ((2.58,6.77,-.78),(1.37,.52,1.27),580),
      ((4.03,5.02,.0),(1.35,.62,1.16),590),
      ((2.83,4.94,1.84),(1.08,.48,.95),400),
      ((1.64,5.40,-2.02),(1.10,.52,1.04),420),
      ((-1.84,5.98,-2.1),(1.04,.53,.97),360),
    ]
    # Unequal continuations: a descending long left arm opposes a shorter,
    # ascending right side; the central growth line leans through its old fork.
    def gesture(p):
        x,y,z=p
        if x>1.8:y+=(x-1.8)*.28;x=1.8+(x-1.8)*.73
        elif x<-1.6:y-=(-1.6-x)*.10;x=-1.6+(x+1.6)*1.10
        return (x+.12*max(0,y-.8),y,z)
    paths=[([gesture(p) for p in points],radii) for points,radii in paths]
    fans=[(gesture(c),size,n) for c,size,n in fans]
    for i,(c,size,n) in enumerate(fans):
        c=Vector(c);base=c+Vector((0,-.50,0))
        for j,off in enumerate(((-.67,.13,-.18),(.61,.28,.13),(.04,-.01,.66))):
            tip=c+Vector(off);mid=base.lerp(tip,.53)+Vector((0,.16,0))
            paths.append(([tuple(base),tuple(mid),tuple(tip)],[.10,.057,.012]))
    return paths,roots,fans

def closest(point,segments):
    best=None
    for a,b,ra,rb,arc in segments:
        line=b-a;t=max(0,min(1,(point-a).dot(line)/line.length_squared));q=a+line*t
        value=(point-q).length/(ra*(1-t)+rb*t)
        if best is None or value<best[0]:best=(value,q,line.normalized(),arc+t*line.length)
    return best
def wood(paths,roots):
    obs=[tube(p,r) for p,r in paths]+[tube(p,r,'root',True) for p,r in roots]
    select(obs);bpy.ops.object.join();ob=bpy.context.object;ob.name='living-wood'
    mod=ob.modifiers.new('Continuous grown junctions','REMESH');mod.mode='VOXEL';mod.voxel_size=.067;mod.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=ob.modifiers.new('Sculpted continuous taper','SMOOTH');mod.factor=.58;mod.iterations=5;bpy.ops.object.modifier_apply(modifier=mod.name)
    ob.data.calc_loop_triangles();tri=len(ob.data.loop_triangles)
    mod=ob.modifiers.new('Controlled surface budget','DECIMATE');mod.ratio=min(1,6500/max(1,tri));bpy.ops.object.modifier_apply(modifier=mod.name)
    ob.data.validate(verbose=False,clean_customdata=True);ob.data.update();ob.data.name='living-wood'
    ob.data.materials.append(mat('study-warm-growth-bark',.91))
    segments=[]
    for p,r in paths+roots:
        points,radii=sample(p,r,.2);arc=0
        for i in range(len(points)-1):
            segments.append((points[i],points[i+1],radii[i],radii[i+1],arc));arc+=(points[i+1]-points[i]).length
    attr=ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER');values=[]
    for v in ob.data.vertices:
        p=game(v.co);dist,q,tangent,arc=closest(p,segments);rad=p-q
        u=tangent.cross(Vector((0,1,0)) if abs(tangent.y)<.95 else Vector((1,0,0))).normalized();w=tangent.cross(u)
        theta=math.atan2(rad.dot(w),rad.dot(u));grain=math.sin(theta*9-arc*.43+.17*math.sin(arc*.8))
        crease=max(0,(-grain-.30)/.70)**1.7;ridge=max(0,(grain-.1)/.9)
        # Real restrained growth-aligned relief, with crevice pigment following
        # the same sculpt field rather than random decimation triangles.
        relief=(ridge*.012-crease*.014)*min(1,rad.length/.28)
        v.co+=xyz(rad.normalized())*relief
        color=mix('#675644','#b49a70',.35+.16*math.sin(arc*.7)+ridge*.32)
        color=color.lerp(rgb('#302e27'),min(.88,crease*.94))
        # Wider long grain bands give visible albedo even when the relief is small.
        longgrain=(.5+.5*math.sin(theta*4.0-arc*.18))**4
        color=color.lerp(rgb('#514435'),longgrain*.47)
        color=color.lerp(rgb('#506044'),max(0,1-p.y/1.7)*max(0,.30+.18*math.sin(theta*3+arc)))
        values.append((*color,1))
    for poly in ob.data.polygons:
        poly.use_smooth=True
        for loop in poly.loop_indices:attr.data[loop].color=values[ob.data.loops[loop].vertex_index]
    ob.data.update();return ob

class Leaves:
    def __init__(self,seed):self.rand=random.Random(seed);self.v=[];self.f=[];self.colors=[];self.normals=[];self.spans=[]
    def leaf(self,p,normal,outward,length,width,color,hang=False):
        r=self.rand;normal=normal.normalized()
        u=normal.cross(Vector((0,0,1)) if abs(normal.z)<.9 else Vector((1,0,0))).normalized();v=normal.cross(u)
        if hang:
            v=Vector((r.uniform(-.2,.2),-1,r.uniform(-.15,.15))).normalized();u=v.cross(normal).normalized();normal=u.cross(v).normalized()
        else:
            a=r.uniform(0,math.tau);u,v=u*math.cos(a)+v*math.sin(a),-u*math.sin(a)+v*math.cos(a)
        s=len(self.v);self.v.append(p+normal*width*.10)
        outline=[(0,-.5),(-.43,-.23),(-.46,.18),(0,.5),(.46,.18),(.43,-.23)]
        for x,y in outline:self.v.append(p+u*x*width+v*y*length-normal*(abs(x)*width*.14+y*y*width*.13))
        for j in range(6):self.f.append((s,s+1+(j+1)%6,s+1+j));self.colors.append((*color,1));self.normals.append(outward)
        self.spans.append(length)
    def core(self,c,radii,index):
        # Recessed leaf-colored support mass. Irregular low-poly shoulders remain
        # beneath the separately authored leaves, never filling bough windows.
        rings=6;sides=11;start=len(self.v);points=[]
        for row in range(rings+1):
            phi=math.pi*(row+.08)/(rings+.16)
            for j in range(sides):
                a=j*math.tau/sides
                ripple=1+.16*math.sin(a*3+row*.7+index)+.08*math.cos(a*5-row*.3)
                direction=Vector((math.sin(phi)*math.cos(a),math.cos(phi),math.sin(phi)*math.sin(a)))
                p=c+Vector((direction.x*radii.x*.55,direction.y*radii.y*.60,direction.z*radii.z*.55))*ripple
                points.append(p);self.v.append(p)
        for row in range(rings):
            for j in range(sides):
                a=start+row*sides+j;b=start+row*sides+(j+1)%sides;d=a+sides;e=b+sides
                for f in ((a,b,e),(a,e,d)):
                    self.f.append(f);middle=sum((self.v[k] for k in f),Vector())/3
                    n=Vector(((middle.x-c.x)/radii.x**2,(middle.y-c.y)/radii.y**2,(middle.z-c.z)/radii.z**2)).normalized()
                    color=mix('#263c28','#54663a',.28+.18*max(0,n.y)+.05*math.sin(index))
                    self.colors.append((*color,1));self.normals.append(n)
        # Closed poles are deeply recessed beneath leaf shoulders.
        for row,reverse in ((0,True),(rings,False)):
            ids=[start+row*sides+j for j in range(sides)]
            for j in range(1,sides-1):
                f=(ids[0],ids[j+1],ids[j]) if reverse else (ids[0],ids[j],ids[j+1])
                self.f.append(f);self.colors.append((*rgb('#32462c'),1));self.normals.append(Vector((0,1 if row==0 else -1,0)))
    def fan(self,index,center,size,count):
        r=self.rand;c=Vector(center);sx,sy,sz=size
        lobes=[(Vector((-.23*sx,.18*sy,-.16*sz)),Vector((.76*sx,1.14*sy,.73*sz)),.45),
               (Vector((-.53*sx,-.36*sy,.31*sz)),Vector((.62*sx,1.12*sy,.70*sz)),.30),
               (Vector((.48*sx,-.06*sy,.18*sz)),Vector((.65*sx,1.27*sy,.62*sz)),.25)]
        for li,(offset,radii,weight) in enumerate(lobes):
            amount=round(count*.69*weight)
            self.core(c+offset,radii,index*3+li)
            for j in range(amount):
                y=1-2*(j+.5)/amount;a=j*2.39996323+index*.73+li
                direction=Vector((math.sqrt(1-y*y)*math.cos(a),y,math.sqrt(1-y*y)*math.sin(a)))
                ripple=1+.11*math.sin(a*3+y*4+index)+.065*math.cos(a*5-y*2+li)
                p=c+offset+Vector((direction.x*radii.x,direction.y*radii.y,direction.z*radii.z))*ripple*(r.uniform(.95,1.03) if j%7==0 else r.uniform(.67,.86))
                out=Vector((direction.x/radii.x,direction.y/radii.y,direction.z/radii.z)).normalized()
                normal=(out*.83+Vector((0,.30,0))).normalized()
                tone=.32+.14*(c.y-4.5)/3+.08*math.sin(index*1.4)+.05*math.sin(a*2)
                col=mix('#344b30','#8b9652',tone)*(1 if direction.y>-.2 else .71)
                length=r.uniform(.16,.245);self.leaf(p,normal,out,length,length*r.uniform(.39,.55),col)
        # Unequal side sprays: varied attachment angles, lengths and leaf density.
        for k in range(r.randint(3,5)):
            a=r.uniform(0,math.tau);rad=r.uniform(.71,.97)
            base=c+Vector((math.cos(a)*sx*rad,-sy*r.uniform(.10,.6),math.sin(a)*sz*rad))
            drop=r.uniform(.25,.82);amount=r.randint(7,14);lean=r.uniform(.13,.36)
            for j in range(amount):
                t=(j+r.uniform(.0,.35))/amount;p=base+Vector((math.sin(t*1.8)*math.cos(a)*lean,-drop*t,math.sin(t*1.8)*math.sin(a)*lean))
                p+=Vector((math.cos(j*2.4)*.08,0,math.sin(j*2.4)*.08))
                n=Vector((math.cos(a),.12,math.sin(a)));col=mix('#3c5133','#828e49',.24+.14*(1-t)+.05*math.sin(index))
                self.leaf(p,n,n,r.uniform(.16,.23),r.uniform(.07,.10),col,True)
    def object(self):
        ob=mesh('crown-foliage',self.v,self.f);ob.data.materials.append(mat('study-olive-small-leaves',.93,True))
        attr=ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER');norm=[]
        for p,c,n in zip(ob.data.polygons,self.colors,self.normals):
            p.use_smooth=True;value=(xyz(n)*.68+p.normal*.32).normalized()
            for loop in p.loop_indices:attr.data[loop].color=c;norm.append(tuple(value))
        ob.data.normals_split_custom_set(norm);return ob

def crowncourt():
    _,roots,_=longbough()
    paths=[
      ([(0,-.22,0),(.12,1,.12),(-.14,2.1,.15),(-.85,3.3,.12),(-1.25,4.6,.20),(-1.15,5.9,.1),(-1.65,7.35,.0)],[.88,.75,.63,.49,.36,.23,.018]),
      ([(-.12,1.8,.1),(.78,2.8,-.15),(1.35,4.1,-.35),(1.13,5.6,-.32),(1.55,6.8,-.4),(2.1,7.35,-.5)],[.63,.54,.41,.29,.16,.015]),
      ([(-.72,3.2,.1),(-1.95,3.9,.1),(-2.9,5.1,.25),(-3.18,6.4,.2)],[.40,.31,.19,.015]),
      ([(-1.26,4.5,.2),(-2.0,5.2,1.05),(-2.3,6.15,1.72),(-2.1,6.8,1.9)],[.31,.23,.13,.015]),
      ([(-1.15,5.7,.1),(-.55,6.45,-.8),(-.6,7.55,-1.3)],[.22,.14,.015]),
      ([(1.28,4.0,-.3),(2.35,4.6,.1),(3.06,5.6,.3),(3.12,6.5,.4)],[.33,.25,.14,.015]),
      ([(1.20,5.45,-.32),(2.0,6.0,-1.25),(2.5,6.9,-1.7)],[.25,.16,.015]),
      ([(.76,2.8,-.15),(.75,3.8,-1.25),(.35,4.9,-2.1),(.65,5.8,-2.35)],[.39,.29,.17,.015]),
      ([(-1.95,3.9,.1),(-2.5,4.6,-1.0),(-2.65,5.5,-1.75)],[.26,.18,.015]),
      ([(2.30,4.6,.1),(2.8,5.1,1.25),(2.4,5.9,1.9)],[.23,.14,.015])]
    fans=[((-1.7,7.45,.0),(1.3,.65,1.16),560),((-.6,7.58,-1.3),(1.15,.61,1.04),450),((2.05,7.35,-.5),(1.24,.66,1.1),550),((-3.1,6.4,.2),(1.13,.67,1.0),480),((-2.1,6.8,1.9),(1.05,.57,.94),430),((3.08,6.5,.4),(1.14,.63,1.03),510),((2.5,6.9,-1.7),(1.09,.59,.98),450),((.65,5.8,-2.35),(1.13,.63,.98),440),((-2.65,5.5,-1.75),(1.04,.60,.99),420),((2.4,5.9,1.9),(1.06,.54,.97),420)]
    return twigged(paths,roots,fans)
def riverside():
    _,roots,_=longbough()
    paths=[
      ([(0,-.22,.05),(-.25,.8,.10),(-.15,1.9,.2),(.5,3.0,.4),(1.15,4.1,.45),(2.3,4.85,.20),(3.35,5.48,.0)],[.82,.71,.60,.49,.35,.20,.015]),
      ([(-.12,1.8,.2),(-1.1,2.55,.10),(-1.65,3.5,-.1),(-1.4,4.25,-.35),(-.6,4.95,-.6)],[.52,.42,.31,.18,.015]),
      ([(.45,2.95,.4),(1.2,3.4,1.4),(2.2,3.95,1.8),(3.4,4.65,1.5)],[.41,.32,.19,.015]),
      ([(1.1,4.0,.45),(1.6,4.6,-.7),(2.35,5.5,-1.25)],[.28,.20,.015]),
      ([(2.2,4.8,.2),(2.5,5.45,.55),(3.0,5.85,.7)],[.20,.13,.015]),
      ([(-1.1,2.55,.1),(-2.1,3.1,.75),(-2.55,3.95,.9),(-2.1,4.65,.8)],[.31,.24,.14,.015]),
      ([(-1.6,3.4,-.1),(-2.15,4.0,-1.15),(-1.6,4.8,-1.65)],[.26,.17,.015]),
      ([(.45,2.9,.4),(.1,3.5,-1.1),(.35,4.3,-2.15),(1.15,4.95,-2.4)],[.34,.26,.15,.015]),
      ([(2.15,3.95,1.8),(2.2,4.8,2.0),(2.65,5.25,2.1)],[.18,.11,.015])]
    fans=[((3.35,5.5,.0),(1.38,.59,1.05),610),((3.0,5.85,.7),(1.18,.53,.97),500),((2.35,5.5,-1.25),(1.32,.58,1.02),530),((3.4,4.65,1.5),(1.3,.56,1.0),500),((-.6,4.95,-.6),(1.24,.60,1.02),520),((-2.1,4.65,.8),(1.14,.61,1.1),500),((-1.6,4.8,-1.65),(1.15,.59,1.06),470),((1.15,4.95,-2.4),(1.28,.55,1.01),490),((2.65,5.25,2.1),(1.12,.52,.92),460)]
    return twigged(paths,roots,fans)
def twigged(paths,roots,fans):
    for c,size,n in fans:
        c=Vector(c);base=c+Vector((-.22,-.48,0))
        for off in ((-.55,.13,-.2),(.65,.26,.1),(.1,.01,.6)):
            tip=c+Vector(off);mid=base.lerp(tip,.53)+Vector((0,.13,0));paths.append(([tuple(base),tuple(mid),tuple(tip)],[.095,.051,.012]))
    return paths,roots,fans

BUILDERS={'longbough':longbough,'crowncourt':crowncourt,'riverside':riverside}
def build(name):
    paths,roots,fans=BUILDERS[name]();bark=wood(paths,roots);leaves=Leaves(26721)
    for i,(c,s,n) in enumerate(fans):leaves.fan(i,c,s,n)
    foliage=leaves.object();root=bpy.data.objects.new('asset',None);bpy.context.collection.objects.link(root)
    # Y=0 is anatomical ground; a small closed underside stays below soil.
    # Integration seats this origin directly, rather than lifting the root bulb.
    lowest=0
    for ob in (bark,foliage):
        for v in ob.data.vertices:v.co.z-=lowest
        ob.parent=root
    root['revision']=REV;root['units']='meters';root['scope']='isolated natural growth-form visual study; no habitation or gameplay contract'
    return root,[bark,foliage],{'leaf_count':len(leaves.spans),'leaf_fullspan_min':min(leaves.spans),'leaf_fullspan_max':max(leaves.spans)}
def bounds(points):
    return {'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]}
def save(name):
    clear();root,objects,extra=build(name);OUT.mkdir(parents=True,exist_ok=True)
    bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'-study.blend')),check_existing=False);select([root]+objects)
    f=OUT/(name+'-study.glb');bpy.ops.export_scene.gltf(filepath=str(f),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
    points=[game(v.co) for ob in objects for v in ob.data.vertices];low=[game(v.co) for v in objects[0].data.vertices if v.co.z<=1]
    result={'revision':REV,'file':str(f.relative_to(ROOT)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size,'bounds':bounds(points),'low_wood_y_le_1m_bounds':bounds(low),'triangles':{},**extra}
    for ob in objects:ob.data.calc_loop_triangles();result['triangles'][ob.name]=len(ob.data.loop_triangles)
    (SOURCE/(name+'-qualification.json')).write_text(json.dumps(result,indent=2)+'\n');print('TREE_READY '+json.dumps(result));return result
def proof(name):
    clear();root,objects,_=build(name)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));floor=bpy.context.object;m=bpy.data.materials.new('STUDIO ground');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.31,.32,.275,1);p.inputs['Roughness'].default_value=1;floor.data.materials.append(m)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.world.color=(.36,.4,.45)
    for name2,at,power,size in [('key',(-7,-9,14),2100,8),('fill',(8,-2,10),1000,7),('rim',(0,9,12),1800,7)]:
        data=bpy.data.lights.new('STUDIO '+name2,'AREA');data.energy=power;data.shape='DISK';data.size=size;ob=bpy.data.objects.new('STUDIO '+name2,data);scene.collection.objects.link(ob);ob.location=at;ob.rotation_euler=(Vector((0,0,3.5))-ob.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('STUDIO camera');cam=bpy.data.objects.new('STUDIO camera',data);scene.collection.objects.link(cam);data.type='ORTHO';data.ortho_scale=13.2;scene.camera=cam
    scene.view_settings.view_transform='AgX';scene.render.resolution_x=1400;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
    views=[('front',(10,-19,12),(0,0,3.8)),('strategy',(10,-18,20),(0,0,3.3)),('branches',(10,-19,12),(0,0,3.8))]
    for label,at,target in views:
        objects[1].hide_render=label=='branches';cam.location=at;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(SOURCE/(name+'-'+REV+'-'+label+'.png'));bpy.ops.render.render(write_still=True)
    objects[1].hide_render=False;bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'-'+REV+'-studio.blend')),check_existing=False)
if __name__=='__main__':
    bpy.context.preferences.filepaths.save_version=0
    parser=argparse.ArgumentParser();parser.add_argument('name',choices=BUILDERS);parser.add_argument('--no-render',action='store_true');parser.add_argument('--proof-only',action='store_true');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if not args.proof_only:save(args.name)
    if not args.no_render:proof(args.name)
