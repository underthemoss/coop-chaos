"""Coop Chaos original decorative clearing kit, revision dressing-v2.
Standalone Blender 4.5 recipe. Does not import or regenerate existing assets.
blender --background --python assets/sculpted/author_dressing.py -- --no-render
Default also renders the immutable studio proof; --only ID regenerates one asset.
Game coordinates X right, Y up, Z forward; glTF export is +Y up.
"""
import bpy, math, random, json, hashlib, argparse, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sculpted/dressing'
OUT=ROOT/'public/assets/environment'
REV='dressing-v2'

def xyz(v): return Vector((v[0],-v[2],v[1]))
def rgb(h):
    a=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    return Vector([c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in a])
def color(a): return (*a,1)
def lerp(a,b,t):return rgb(a).lerp(rgb(b),max(0,min(1,t)))
def material(name,rough=.91):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.use_backface_culling=False
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=rough
    p.inputs['Specular IOR Level'].default_value=.25
    n=m.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Color'
    m.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color'])
    return m

def clear():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for group in (bpy.data.meshes,bpy.data.materials,bpy.data.curves,bpy.data.cameras,bpy.data.lights):
        for item in list(group):
            if item.users==0:group.remove(item)

def empty(name):
    ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob);return ob

class Batch:
    def __init__(self): self.v=[];self.f=[];self.c=[];self.n=[]
    def face(self,indices,c,n=None):self.f.append(tuple(indices));self.c.append(color(c));self.n.append(n)
    def tube(self,points,radii,base='#82704c',tip='#a08d62',sides=8,birch=False):
        start=len(self.v)
        for i,p in enumerate(points):
            p=Vector(p);t=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
            a=t.cross(Vector((0,1,0)) if abs(t.y)<.95 else Vector((1,0,0))).normalized();b=t.cross(a)
            for j in range(sides):
                angle=j/sides*math.tau
                self.v.append(p+(a*math.cos(angle)+b*math.sin(angle))*radii[i]*(1+.045*math.sin(j*3+i*.7)))
        for i in range(len(points)-1):
            for j in range(sides):
                a=start+i*sides+j;b=start+i*sides+(j+1)%sides
                # Circumferential value changes follow broad bark planes, not a sun.
                c=lerp(base,tip,.25+.4*i/(len(points)-1)+.08*math.sin(j*2+i*.7))
                self.face((a,b,b+sides,a+sides),c)
        self.face(tuple(start+j for j in reversed(range(sides))),rgb(base))
        self.face(tuple(start+(len(points)-1)*sides+j for j in range(sides)),rgb(tip))
        if birch:
            # Flush irregular lenticel patches sampled on the actual curved stem.
            rand=random.Random(877+round(points[-1][1]*100))
            for k in range(17):
                h=rand.uniform(.08,.91)*(len(points)-1);i=min(len(points)-2,int(h));f=h-i
                p=Vector(points[i]).lerp(Vector(points[i+1]),f);r=radii[i]*(1-f)+radii[i+1]*f
                t=(Vector(points[i+1])-Vector(points[i])).normalized();u=t.cross(Vector((0,0,1))).normalized();v=t.cross(u)
                ang=rand.uniform(0,math.tau);width=rand.uniform(.2,.65);height=rand.uniform(.023,.07)
                s=len(self.v)
                for dh,da in [(-height,-width),(-height*.6,width),(height*.7,width*.8),(height,-width*.65)]:
                    self.v.append(p+t*dh+(u*math.cos(ang+da)+v*math.sin(ang+da))*(r*1.055+.002))
                self.face((s,s+1,s+2,s+3),lerp('#594d40','#81705c',rand.uniform(0,.5)))
    def leaf(self,p,u,v,normal,length,width,c,kind='round'):
        # Convex, folded leaf plates in varied 3D orientations, never billboards.
        outlines={'round':[(0,-1),(-.65,-.65),(-.9,-.1),(-.72,.55),(0,1),(.72,.55),(.9,-.1),(.65,-.65)],
                  'birch':[(0,-1),(-.65,-.5),(-.82,.15),(-.43,.65),(0,1),(.43,.65),(.82,.15),(.65,-.5)],
                  'willow':[(0,-1),(-.58,-.7),(-.7,-.1),(-.42,.55),(0,1),(.42,.55),(.7,-.1),(.58,-.7)]}
        s=len(self.v);self.v.append(p+normal*length*.12)
        for x,y in outlines[kind]:self.v.append(p+u*x*width+v*y*length-normal*length*(.05+.09*y*y))
        for j in range(8):self.face((s,s+1+(j+1)%8,s+1+j),c,normal)
    def blade(self,base,tip,width,bend,green='#586e35',gold='#a4aa46'):
        base=Vector(base);tip=Vector(tip);delta=tip-base;side=Vector((delta.z,0,-delta.x))
        if side.length<.01:side=Vector((1,0,0))
        side.normalize();s=len(self.v)
        for j in range(5):
            t=j/4;p=base.lerp(tip,t)+Vector(bend)*math.sin(math.pi*t*.78)
            w=width*math.sin(math.pi*(.12+.88*t))**.65 if j<4 else .003
            self.v.extend([p-side*w,p+Vector((0,width*.24,0)),p+side*w])
        for j in range(4):
            for k in range(2):
                a=s+j*3+k;self.face((a,a+3,a+4,a+1),lerp(green,gold,.18+j*.17))
    def object(self,name,root,mat,blend_normals=False):
        data=bpy.data.meshes.new(name);data.from_pydata([xyz(p) for p in self.v],[],self.f);data.update()
        invalid=data.validate(verbose=False)
        if invalid:raise RuntimeError(name+' required geometry repair')
        ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.parent=root;data.materials.append(mat)
        attr=data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
        normals=[]
        for poly,c,n in zip(data.polygons,self.c,self.n):
            for loop in poly.loop_indices:attr.data[loop].color=c
            if blend_normals and n is not None:
                # Outward lobe normals preserve volumetric lighting; retain the
                # folded geometric facet to avoid smooth balloon shading.
                q=Vector(tuple(round(x*3)/3 for x in n));q.normalize()
                shade=(n*.5+q*.5).normalized();value=(xyz(shade)*.74+poly.normal*.26).normalized()
                poly.use_smooth=True;normals.extend([tuple(value)]*len(poly.loop_indices))
            else:normals.extend([tuple(poly.normal)]*len(poly.loop_indices))
        if blend_normals:data.normals_split_custom_set(normals)
        return ob

def crown(batch,lobes,rand,kind='round',palette=('#425b31','#9ca44a'),leafsize=(.16,.25),width=.75):
    """Full irregular lobe envelopes; broad height tint and darker lower leaves."""
    low=min(c[1]-r[1] for c,r,n in lobes);high=max(c[1]+r[1] for c,r,n in lobes)
    for li,(center,radii,count) in enumerate(lobes):
        center=Vector(center);radii=Vector(radii)
        for j in range(count):
            y=1-2*(j+.5)/count;a=j*2.39996323+rand.uniform(-.17,.17)+li*.48
            d=Vector((math.sqrt(1-y*y)*math.cos(a),y,math.sqrt(1-y*y)*math.sin(a)))
            ripple=1+.11*math.sin(a*3+y*4+li)+.045*math.cos(a*5-y*3)
            p=center+Vector((d.x*radii.x,d.y*radii.y,d.z*radii.z))*ripple
            outward=Vector((d.x/radii.x,d.y/radii.y,d.z/radii.z)).normalized()
            normal=(outward*.75+Vector((0,.30,0))).normalized()
            u=normal.cross(Vector((0,0,1)) if abs(normal.z)<.9 else Vector((1,0,0))).normalized();v=normal.cross(u)
            spin=rand.uniform(-math.pi,math.pi);uu=u*math.cos(spin)+v*math.sin(spin);vv=-u*math.sin(spin)+v*math.cos(spin)
            c=lerp(*palette,.16+.62*(p.y-low)/(high-low)+.025*math.sin(li*2))*(.87+.13*max(0,outward.y))
            length=rand.uniform(*leafsize);batch.leaf(p,uu,vv,outward,length,length*width,c,kind)

def birch(root):
    wood=Batch();leaves=Batch();rand=random.Random(101)
    trunk=[(0,0,0),(-.10,.8,.02),(-.12,1.7,.02),(.02,2.8,0),(.18,3.9,-.09),(.24,5,-.12),(.35,6.3,-.06)]
    wood.tube(trunk,[.17,.13,.11,.095,.074,.05,.012],'#c4b89a','#e3dcc2',10,True)
    branches=[([(0,2.5,0),(-.48,3.25,.12),(-.95,4.05,.30),(-1.1,4.7,.35)],[.07,.05,.027,.005]),
              ([(.1,3.2,-.03),(.6,3.8,.08),(.92,4.65,.2)],[.065,.035,.006]),
              ([(.18,4,-.1),(-.32,4.6,-.45),(-.6,5.35,-.65)],[.053,.03,.005]),
              ([(.2,4.65,-.1),(.75,5.15,-.2),(.97,5.85,-.32)],[.043,.025,.005]),
              ([(.26,5.2,-.1),(-.12,5.7,.2),(-.35,6.22,.30)],[.031,.018,.004])]
    for p,r in branches:wood.tube(p,r,'#a69978','#d2c5a3',7)
    for a in range(5):
        t=a*math.tau/5;wood.tube([(math.cos(t)*.32,0,math.sin(t)*.26),(0,.15,0)],[.015,.12],'#a39371','#c4b89a',6)
    lobes=[((-1.02,4.57,.32),(.70,.63,.58),90),((.91,4.65,.2),(.66,.65,.61),84),
           ((-.64,5.35,-.65),(.62,.68,.61),83),((1.0,5.87,-.3),(.58,.60,.55),79),
           ((-.38,6.19,.30),(.62,.66,.59),87),((.37,6.65,-.09),(.60,.63,.57),88),
           ((.18,5.63,-.05),(.49,.49,.53),68)]
    crown(leaves,lobes,rand,'birch',('#536b32','#b0b44c'),(.125,.18),.78)
    return [wood.object('birch-pale-stems',root,material('birch-bark')),leaves.object('birch-airy-folded-crown',root,material('birch-leaves'),True)]

def willow(root):
    wood=Batch();leaves=Batch();rand=random.Random(202)
    wood.tube([(0,0,0),(-.18,.7,0),(-.28,1.5,.08),(-.2,2.3,.08),(.08,3.12,0),(.24,3.75,-.10)],[.32,.26,.22,.18,.13,.025],'#66583c','#9d8a53',10)
    tips=[(-1.65,3.75,.1),(1.5,3.9,.15),(-.9,4.45,-.9),(.8,4.35,-.9),(.25,4.7,.55)]
    for i,p in enumerate(tips):
        wood.tube([(-.24,2.1,.08),(p[0]*.45,3.25,p[2]*.45),p],[.14,.09,.012],'#72623e','#9d8b4d',8)
        # Curved twig lines are partly visible beneath hanging leaf envelopes.
        for k in range(3):
            angle=k*math.tau/3+i*.8;dx=math.cos(angle)*.40;dz=math.sin(angle)*.35
            wood.tube([p,(p[0]+dx,p[1]-.35,p[2]+dz),(p[0]+dx*1.25,p[1]-1.5,p[2]+dz*1.25)],[.022,.014,.003],'#8b7c46','#a89b54',5)
    lobes=[]
    for i,p in enumerate(tips):
        lobes.append(((p[0],p[1]-.20,p[2]),(.79,.57,.71),110))
        for k in range(3):
            a=k*math.tau/3+i*.8
            lobes.append(((p[0]+math.cos(a)*.45,p[1]-1.02,p[2]+math.sin(a)*.39),(.38,.88,.34),78))
    # Leaves lie vertically down the drooping envelope, rather than radial spikes.
    for li,(p,r,count) in enumerate(lobes):
        c=Vector(p);r=Vector(r)
        for j in range(count):
            y=1-2*(j+.5)/count;a=j*2.39996323+li*.53+rand.uniform(-.12,.12)
            d=Vector((math.sqrt(1-y*y)*math.cos(a),y,math.sqrt(1-y*y)*math.sin(a)))
            q=c+Vector((d.x*r.x,d.y*r.y,d.z*r.z))*(1+.08*math.sin(a*3+y*4))
            n=Vector((d.x/r.x,d.y/r.y,d.z/r.z)).normalized()
            # Face normal leans outward, long axis falls along the hanging spray.
            u=Vector((math.cos(a+math.pi/2),0,math.sin(a+math.pi/2)))
            v=Vector((d.x*.18,-1,d.z*.18)).normalized()
            col=lerp('#4c6533','#afb64c',.12+.75*(q.y-1.7)/3.6)*(.88+.12*max(0,n.y))
            length=rand.uniform(.24,.36);leaves.leaf(q,u,v,n,length,length*.21,col,'willow')
    return [wood.object('willow-curving-boughs',root,material('willow-bark')),leaves.object('willow-hanging-folded-leaves',root,material('willow-leaves'),True)]

def bush(root,index):
    leaves=Batch();wood=Batch();rand=random.Random(300+index)
    configs=[ [((-.36,.53,.05),(.58,.48,.56),112),((.31,.65,0),(.64,.57,.60),126),((.02,.8,-.26),(.48,.49,.45),93)],
              [((-.48,.42,-.04),(.55,.40,.57),98),((.11,.6,.12),(.65,.55,.65),126),((.54,.44,-.18),(.54,.42,.50),98)],
              [((-.29,.52,-.2),(.56,.48,.58),110),((.25,.79,.12),(.58,.70,.56),136),((.46,.43,-.3),(.46,.38,.47),87)] ]
    for i,(p,r,n) in enumerate(configs[index]):wood.tube([(p[0]*.2,0,p[2]*.2),(p[0]*.65,.3,p[2]),p],[.035,.022,.006],'#665337','#827048',5)
    palettes=[('#3e5839','#8a9951'),('#405733','#9ea24f'),('#3f5d43','#899b57')]
    crown(leaves,configs[index],rand,'round',palettes[index],(.125,.18),.88)
    return [wood.object('bush-twigs',root,material('bush-wood')),leaves.object('bush-broad-folded-leaves',root,material('bush-leaves'),True)]

def grass(root):
    b=Batch();rand=random.Random(400)
    for i in range(19):
        a=i*2.399963;rad=rand.uniform(.015,.14);length=rand.uniform(.19,.40)
        base=(math.cos(a)*rad,0,math.sin(a)*rad);tip=(base[0]+math.cos(a)*length*.58,length,base[2]+math.sin(a)*length*.58)
        b.blade(base,tip,rand.uniform(.025,.047),(math.cos(a)*.06,0,math.sin(a)*.06))
    return [b.object('grass-curving-folded-blades',root,material('grass-leaves'))]

def cattails(root):
    b=Batch();heads=Batch();rand=random.Random(500)
    for i in range(9):
        a=i*2.399963;rad=rand.uniform(.04,.42);x=math.cos(a)*rad;z=math.sin(a)*rad;h=rand.uniform(1.1,1.65)
        lean=(rand.uniform(-.12,.12),0,rand.uniform(-.12,.12));tx=x+lean[0];tz=z+lean[2]
        b.tube([(x,0,z),(x+lean[0]*.4,h*.6,z+lean[2]*.4),(tx,h,tz)],[.019,.015,.010],'#596b36','#a0a456',6)
        heads.tube([(tx,h-.18,tz),(tx,h+.01,tz),(tx,h+.07,tz)],[.051,.047,.013],'#604332','#856143',8)
        b.tube([(tx,h+.07,tz),(tx,h+.19,tz)],[.006,.002],'#b2a46a','#c2b47a',4)
        for k in range(3):
            angle=a+k*2.1;length=rand.uniform(.65,1.18)
            b.blade((x,0,z),(x+math.cos(angle)*.36,length,z+math.sin(angle)*.36),rand.uniform(.034,.054),(math.cos(angle)*.16,0,math.sin(angle)*.16),'#4e6736','#a7aa4b')
    return [b.object('cattail-stems-and-curved-reeds',root,material('cattail-green')),heads.object('cattail-brown-seedheads',root,material('cattail-heads'))]

def rock(root,index):
    b=Batch();rand=random.Random(600+index);count=7
    # Three uneven contour rings create substantial flat-footed, cut rock forms.
    dims=[(.78,.85,.60),(.88,.57,.70)][index];rx,h,rz=dims
    for ring in range(3):
        scale=[.87,1,.56][ring];height=[0,h*.43,h*.91][ring]
        for j in range(count):
            a=j*math.tau/count+ring*.13;r=1+rand.uniform(-.16,.12)
            b.v.append(Vector((math.cos(a)*rx*scale*r+ring*.035,height+rand.uniform(-.07,.07)*h if ring else 0,math.sin(a)*rz*scale*r)))
    b.v.append(Vector((.03,h,-.08)))
    for ring in range(2):
        for j in range(count):
            a=ring*count+j;c=ring*count+(j+1)%count;d=c+count;e=a+count
            for f in ((a,c,e),(c,d,e)):
                p=sum((b.v[k] for k in f),Vector())/3
                # Color groups follow large mineral faces; restrained warm seam.
                col=lerp('#686477','#b1acb1',.24+.63*p.y/h)
                if j in ([1,2] if index==0 else [4]):col=col.lerp(rgb('#ad9271'),.37)
                b.face(f,col)
    for j in range(count):b.face((14+j,14+(j+1)%count,21),lerp('#92909e','#c4bcb0',.40+.10*math.sin(j*1.2)))
    b.face(tuple(reversed(range(count))),rgb('#686477'))
    b.f=[tuple(reversed(face)) for face in b.f]  # outward mineral planes
    return [b.object('rock-broad-cut-planes',root,material('rock-mineral',.94))]

BUILDERS={'birch':birch,'willow':willow,'bush-a':lambda r:bush(r,0),'bush-b':lambda r:bush(r,1),'bush-c':lambda r:bush(r,2),'grass':grass,'cattails':cattails,'rock-a':lambda r:rock(r,0),'rock-b':lambda r:rock(r,1)}

def save_asset(name):
    clear();root=empty('asset');root['revision']=REV;root['decorative_only']=True;objects=BUILDERS[name](root)
    # Seat every mesh at the same exact ground plane, including curved stem feet.
    ground=min(v.co.z for ob in objects for v in ob.data.vertices)
    for ob in objects:
        for vertex in ob.data.vertices:vertex.co.z-=ground
    bpy.context.view_layer.update();SOURCE.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
    path=SOURCE/('dressing-'+name+'.blend')
    bpy.ops.wm.save_as_mainfile(filepath=str(path),check_existing=False)
    bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
    for ob in objects:ob.select_set(True)
    glb=OUT/('dressing-'+name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
    points=[ob.matrix_world@v.co for ob in objects for v in ob.data.vertices]
    game=[Vector((p.x,p.z,-p.y)) for p in points]
    minimum=[min(p[i] for p in game) for i in range(3)];maximum=[max(p[i] for p in game) for i in range(3)]
    return {'revision':REV,'file':str(glb.relative_to(ROOT)),'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'bytes':glb.stat().st_size,'bounds_min':minimum,'bounds_max':maximum,'dimensions':[maximum[i]-minimum[i] for i in range(3)],'vertices':sum(len(o.data.vertices) for o in objects),'triangles':sum(len(p.vertices)-2 for o in objects for p in o.data.polygons),'meshes':len(objects),'materials':len(set(m.name for o in objects for m in o.data.materials))}

def proof():
    clear();placements={'birch':(-3.25,0,-.85),'willow':(2.6,0,-.85),'bush-a':(-3.8,0,1.7),'bush-b':(-1.7,0,1.65),'bush-c':(.35,0,1.7),'grass':(-2.2,0,3.0),'cattails':(3.5,0,2.1),'rock-a':(.25,0,3.3),'rock-b':(1.95,0,3.15)}
    for name,at in placements.items():
        root=empty('proof-'+name);objects=BUILDERS[name](root)
        ground=min(v.co.z for ob in objects for v in ob.data.vertices)
        for ob in objects:
            for vertex in ob.data.vertices:vertex.co.z-=ground
        root.location=xyz(at)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));floor=bpy.context.object;floor.name='STUDIO floor'
    m=bpy.data.materials.new('STUDIO warm neutral');m.diffuse_color=(.32,.30,.25,1);m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.32,.30,.25,1);m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=1;floor.data.materials.append(m)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.world.color=(.35,.35,.35)
    for name,at,power,size in [('STUDIO key',(-5,-6,11),1600,7),('STUDIO fill',(5,-1,7),650,6),('STUDIO back',(1,6,9),1100,5)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=at;ob.rotation_euler=(Vector((0,0,2.3))-ob.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('STUDIO camera');cam=bpy.data.objects.new('STUDIO camera',data);scene.collection.objects.link(cam);cam.location=(11,-19,12);cam.rotation_euler=(Vector((0,-.4,3.35))-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=13.0;scene.camera=cam
    scene.view_settings.view_transform='AgX';scene.render.resolution_x=1500;scene.render.resolution_y=1250;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(SOURCE/(REV+'-group-proof.png'))
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(REV+'-group-studio.blend')),check_existing=False);bpy.ops.render.render(write_still=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--no-render',action='store_true');parser.add_argument('--proof-only',action='store_true');parser.add_argument('--only',choices=list(BUILDERS));args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if not args.proof_only:
        result={name:save_asset(name) for name in ([args.only] if args.only else BUILDERS)}
        filename='qualification-'+args.only+'.json' if args.only else 'qualification.json';(SOURCE/filename).write_text(json.dumps(result,indent=2)+'\n')
        print('DRESSING_READY '+json.dumps(result))
    if not args.no_render:proof()
