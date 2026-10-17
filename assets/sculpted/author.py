"""Original Coop Chaos Blender authoring proof, Blender 4.5 LTS.
Run: blender --background --python assets/sculpted/author.py
Coordinates in helpers: X right, Y up, Z forward; exporter converts Blender Z-up.
Editable .blend sources retain separate sculpt, leaf, feather and motion objects.
No third-party meshes. Concept images are references, never runtime backgrounds.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'public/assets'
SOURCE = ROOT/'assets/sculpted'
EVIDENCE = ROOT/'output/playwright/sculpt-proof'
rng = random.Random(90210)

def xyz(p): return Vector((p[0],-p[2],p[1]))
def rgb(hex):
    channels=[int(hex[i:i+2],16)/255 for i in (1,3,5)]
    return tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in channels)+(1,)
def mat(name,color,rough=.87):
    m=bpy.data.materials.new(name); m.diffuse_color=rgb(color);m.use_nodes=True
    node=m.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=rgb(color);node.inputs['Roughness'].default_value=rough
    return m

def vertex_mat(name):
    m=mat(name,'#ffffff');n=m.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Color'
    m.node_tree.links.new(n.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);return m

def mesh(name,verts,faces,material,parent=None,colors=None):
    data=bpy.data.meshes.new(name);data.from_pydata([xyz(p) for p in verts],[],faces);data.update()
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.data.materials.append(material)
    if parent: ob.parent=parent
    if colors:
        attr=data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
        for poly in data.polygons:
            for loop in poly.loop_indices: attr.data[loop].color=colors[poly.index] if len(colors)==len(faces) else colors[0]
    return ob

def empty(name,parent=None,at=(0,0,0)):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=xyz(at);o.parent=parent;return o

def select(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]

def join(objects,name):
    select(objects);bpy.ops.object.join();o=bpy.context.object;o.name=name;return o

def tube(name,points,radii,material,parent=None,sides=12):
    verts=[];faces=[]
    for i,p in enumerate(points):
        t=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        t.normalize();a=t.cross(Vector((0,1,0)) if abs(t.y)<.95 else Vector((1,0,0))).normalized();b=t.cross(a).normalized()
        for j in range(sides):
            angle=j/sides*math.tau
            v=Vector(p)+(a*math.cos(angle)+b*math.sin(angle))*radii[i]*(1+.055*math.sin(j*5+i*.4))
            verts.append(v)
    for i in range(len(points)-1):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides;c=a+sides;d=b+sides
            faces.append((a,b,d,c))
    faces.extend([tuple(reversed(range(sides))),tuple(range((len(points)-1)*sides,len(points)*sides))])
    return mesh(name,verts,faces,material,parent)

def ellipsoid(name,at,size,material,parent=None,segments=20,rings=12,tilt=0):
    verts=[];faces=[]
    for i in range(rings+1):
        phi=math.pi*i/rings
        for j in range(segments):
            a=math.tau*j/segments
            x=math.sin(phi)*math.cos(a)*size[0];y=math.cos(phi)*size[1];z=math.sin(phi)*math.sin(a)*size[2]
            verts.append((at[0]+x,at[1]+y,at[2]+z+tilt*y))
    for i in range(rings):
        for j in range(segments):
            a=i*segments+j;b=i*segments+(j+1)%segments
            faces.append((a,b,b+segments,a+segments))
    return mesh(name,verts,faces,material,parent)

def sculpt(objects,name,voxel=.055,ratio=.2):
    ob=join(objects,name);select([ob])
    r=ob.modifiers.new('Fused flowing anatomy','REMESH');r.mode='VOXEL';r.voxel_size=voxel;r.use_smooth_shade=False;bpy.ops.object.modifier_apply(modifier=r.name)
    sm=ob.modifiers.new('Hand softened transitions','SMOOTH');sm.factor=.7;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
    dec=ob.modifiers.new('Broad sculpt planes','DECIMATE');dec.ratio=ratio;bpy.ops.object.modifier_apply(modifier=dec.name)
    ob.data.validate(verbose=False);ob.data.update()
    return ob

def clear():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def color_faces(ob,palette,seed=1):
    r=random.Random(seed);ob.data.materials.clear();ob.data.materials.append(vertex_mat(ob.name+'-paint'))
    attr=ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for poly in ob.data.polygons:
        # Restrained per-facet material variation, with warm upward planes.
        color=rgb(palette[r.randrange(len(palette))])
        for i in poly.loop_indices:attr.data[i].color=color

def export(name,objects):
    select(objects)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=True,export_yup=True)

bark=None

def oak(name="lowfork"):
    clear();root=empty('asset');global bark;bark=mat('old oak warm bark','#90613e')
    pieces=[]
    branches=[
      ([(0,.1,0),(-.4,.8,-.08),(-.75,1.7,0),(-.75,2.7,.1),(-.35,3.7,.25),(.25,4.8,.55),(.45,5.8,.65),(.6,6.25,.7)],[.86,.77,.66,.58,.49,.34,.17,.045]),
      ([(-.65,1.55,0),(-1.5,2.05,.2),(-2.7,2.15,.35),(-3.7,2.65,.45),(-4.25,3.35,.6),(-4.45,3.8,.65)],[.59,.49,.39,.28,.16,.04]),
      ([(-.65,2.55,.1),(.5,2.95,.3),(1.55,3.3,.4),(2.6,3.8,.55),(3.05,4.55,.7)],[.51,.43,.32,.23,.06]),
      ([(-.75,2.7,.1),(-1.25,3.03,.35),(-.86,3.15,.46)],[.31,.23,.17]),
      ([(.5,2.95,.3),(.95,3.17,.43),(.86,3.33,.46)],[.31,.22,.16]),
      ([(-.35,3.7,.25),(-1.2,4.4,1.1),(-1.6,5.25,1.4)],[.3,.23,.055]),
    ]
    if name=='splitcrown':
        branches[:3]=[
          ([(0,.1,0),(.15,1.2,0),(.05,2.5,.1),(-.7,3.6,.2),(-1.15,4.7,.4),(-1.7,5.5,.5)],[.72,.63,.51,.39,.23,.045]),
          ([(.05,2,.1),(.8,2.9,.05),(1.6,3.8,.1),(1.85,5,.2),(2.3,5.8,.3)],[.5,.43,.34,.2,.04]),
          ([(.1,2.5,.1),(-1.1,2.8,.1),(-2.3,3.3,.3),(-2.8,4,.4)],[.42,.3,.19,.04])]
    elif name=='reedside':
        branches[:3]=[
          ([(0,.1,0),(.2,1,.05),(.65,2.1,.1),(1.05,3,.1),(1.35,4,.3),(1.25,5.1,.4),(1.7,5.8,.6)],[.65,.57,.47,.37,.29,.19,.04]),
          ([(.5,1.8,0),(-.4,2.5,.15),(-1.6,2.8,.3),(-2.2,3.5,.5)],[.42,.33,.23,.045]),
          ([(1.05,3,.1),(2.2,3.2,.3),(3,3.9,.5),(3.15,4.6,.6)],[.36,.27,.17,.04])]
    for i,(points,radii) in enumerate(branches):pieces.append(tube('swept bough '+str(i),points,radii,bark,sides=16))
    root_paths=[
      ([(0,.6,0),(-.7,.3,-.2),(-1.7,.12,-.5),(-2.6,.03,-.3)],[.5,.37,.16,.018]),
      ([(.1,.65,0),(.8,.3,-.6),(1.6,.08,-1.1),(2.1,.015,-1.6)],[.46,.28,.11,.015]),
      ([(-.1,.5,.1),(-.5,.2,1),(-1.5,.08,1.65),(-2.6,.02,1.7)],[.48,.32,.12,.015]),
      ([(.1,.4,.1),(.65,.17,1.25),(.6,.06,2.35),(.95,.01,3.1)],[.44,.24,.09,.01]),
      ([(-.2,.4,-.1),(-.65,.16,-1.1),(-.6,.05,-2.1),(-1.2,.01,-2.55)],[.4,.23,.085,.012]),
      ([(.15,.4,.05),(1.1,.19,.3),(2.05,.06,.75),(2.65,.01,.65)],[.4,.25,.09,.012]),
      ([(-1.6,.12,-.5),(-1.9,.06,-1.1),(-2.4,.015,-1.35)],[.13,.07,.01]),
      ([(-1.5,.08,1.65),(-1.7,.04,2.15),(-2.1,.01,2.55)],[.12,.07,.01]),
    ]
    for i,(points,radii) in enumerate(root_paths):pieces.append(tube('curved buttress '+str(i),points,radii,bark,sides=12))
    trunk=sculpt(pieces,'muscular fused oak',.058,.18);trunk.parent=root;color_faces(trunk,['#906341','#926542','#8f6240','#946644'],3)
    # Raised flowing bark seams and a healed scar add history without a literal face.
    scar=mat('healed amber heartwood','#be8b54')
    tube('healed scar rim',[(-.27,1.25,-.56),(-.48,1.65,-.5),(-.12,2,-.39),(.1,1.6,-.49),(-.27,1.25,-.56)],[.045]*5,scar,root,7)
    leaves=[];colors=[];verts=[];faces=[]
    leafmat=vertex_mat('oak living leaf color')
    crowns=[((.5,6.25,.7),(2.2,1.1,1.7),600),((-4,3.9,.6),(2.05,.88,1.35),450),((2.75,4.85,.7),(1.8,.9,1.4),400),((-1.6,5.5,1.4),(1.35,.75,1.1),220)]
    if name=='splitcrown':crowns=[((-1.7,5.65,.5),(1.8,1,1.5),450),((2.25,5.9,.3),(1.7,1.1,1.4),450),((-2.75,4.15,.4),(1.7,.85,1.2),350)]
    elif name=='reedside':crowns=[((1.6,5.9,.6),(1.8,1,1.4),450),((-2,3.6,.5),(1.7,.85,1.2),350),((3.1,4.7,.6),(1.4,.85,1.2),300)]
    # Individual concave-lobed leaves make the scalloped crown silhouette and open underside.
    outline=[(0,-1),(-.3,-.7),(-.55,-.72),(-.48,-.3),(-.8,-.2),(-.56,.1),(-.78,.38),(-.37,.45),(-.42,.73),(0,1),(.42,.73),(.37,.45),(.78,.38),(.56,.1),(.8,-.2),(.48,-.3),(.55,-.72),(.3,-.7)]
    palette=['#718636','#819342','#667b30','#8d9945','#586f2b','#9ba14b','#657832']
    for center,size,count in crowns:
        for j in range(count):
            a=rng.random()*math.tau;r=math.sqrt(rng.random());y=(1-r*r)*.55+rng.uniform(-.35,.35)
            # Several shoulders inside each broad shelf, never regular discs.
            x=center[0]+math.cos(a)*r*size[0];z=center[2]+math.sin(a)*r*size[2]
            yy=center[1]+y*size[1]+.15*math.sin(a*3+r*4)
            length=rng.uniform(.28,.49);width=length*rng.uniform(.62,.88);angle=rng.random()*math.tau;pitch=rng.uniform(-.5,.7)
            start=len(verts);verts.append((x,yy+.045,z))
            for u,v in outline:
                xx=u*width;zz=v*length
                verts.append((x+xx*math.cos(angle)-zz*math.sin(angle),yy+pitch*zz-.025*(u*u+v*v),z+xx*math.sin(angle)+zz*math.cos(angle)))
            c=rgb(palette[rng.randrange(len(palette))])
            for k in range(len(outline)):
                faces.append((start,start+1+k,start+1+(k+1)%len(outline)));colors.append(c)
    foliage=mesh('scalloped oak leaves',verts,faces,leafmat,root,colors);leafmat.use_backface_culling=False
    # Attachment references are explicit, matching current simulation/renderer units.
    empty('natural-perch-0',root,(-.86,3.15,.46));empty('natural-perch-1',root,(.86,3.33,.46));empty('sheltered-deck',root,(0,2.25,-.5));empty('ladder-base',root,(0,0,-1.08))
    export('environment/'+name,list(bpy.context.scene.objects))
    return root

def samples():
    clear();root=empty('asset');reed=mat('sun dried reed','#bd964d');dark=mat('woven binding','#896437')
    for i in range(11):
        x=(i%4-.5)*.055;y=(i//4)*.048+.1
        tube('cut reed',[(x,y,-.55),(x+.012,y+.015,0),(x-.01,y,.62+rng.uniform(-.07,.07))],[.023,.025,.016],reed,root,7)
    for z in [-.31,.3]:
        pts=[(.11*math.cos(a),.13+.11*math.sin(a),z) for a in [i*math.tau/12 for i in range(13)]]
        tube('fiber binding',pts,[.014]*13,dark,root,5)
    bundle=join([o for o in bpy.context.scene.objects if o.type=='MESH'],'reed bundle');bundle.parent=root
    export('environment/reed-bundle',list(bpy.context.scene.objects))
    clear();root=empty('asset');wood=mat('weathered woven wood','#a67c46');reed=mat('golden weave','#c09a54');shadow=mat('deep fiber','#795d38')
    for i in range(13):
        x=(i-6)*.15
        tube('branch deck reed',[(x,2.14,-1.22),(x+.025,2.17,-.45),(x,2.13,.35)],[.055,.055,.045],wood,root,7)
    # Oval basket side: thin reeds alternate in and out around upright stakes.
    for i in range(11):
        y=2.18+i*.054;points=[]
        for j in range(29):
            a=-math.pi*.05+j/28*math.pi*1.1
            points.append((math.cos(a)*(1.01+.018*math.sin(j*math.pi+i*math.pi)),y+.015*math.sin(j*.7+i),-.42-math.sin(a)*.85))
        tube('fine horizontal basket weave',points,[.019]*len(points),reed if i%3 else wood,root,5)
    for i in range(25):
        a=-math.pi*.05+i/24*math.pi*1.1
        points=[(math.cos(a)*(1.02+.02*math.sin(j*math.pi+i*math.pi)),2.16+j*.068,-.42-math.sin(a)*.86) for j in range(10)]
        tube('interlaced upright fiber',points,[.016]*len(points),shadow if i%4==0 else reed,root,5)
    for y in [2.16,2.79]:
        points=[(math.cos(a)*1.04,y,-.42-math.sin(a)*.88) for a in [-.15+i/28*math.pi*1.14 for i in range(29)]]
        tube('rounded basket rim',points,[.043]*len(points),wood,root,7)
    for x in [-.89,.89]:tube('curved hood support',[(x,2.15,.15),(x*.99,2.8,.15),(x*.8,3.15,0)],[.05,.045,.035],wood,root,7)
    for i in range(47):
        x=(i-23)*.044;end=rng.uniform(-.10,.13)
        points=[(x,2.97,.4),(x,3.19,.18),(x,3.35,-.16),(x,3.39,-.53),(x,3.28,-.91),(x,3.06,-1.25),(x,2.96+end,-1.36-end)]
        tube('curved bundled reed rainhood',points,[.025+rng.random()*.004]*len(points),reed if i%5 else wood,root,5)
    for z,y in [(.18,3.2),(-.53,3.43),(-1.21,3.12)]:
        for i in range(5):
            x=(i-2)*.42
            pts=[(x+.07*math.cos(a),y+.026*math.sin(a),z+.032*math.sin(a)) for a in [j/12*math.tau for j in range(13)]]
            tube('rainhood fiber lashing',pts,[.012]*len(pts),shadow,root,5)
    for y in [2.35,2.62,2.9]:tube('rear rain weave',[(-.9,y,.25),(0,y,.3),(.9,y,.25)],[.025]*3,shadow,root,5)
    for x in [-.23,.23]:tube('ladder rail',[(x,.08,-1.08),(x+.02,1.2,-1.08),(x,2.24,-1.08)],[.042]*3,wood,root,7)
    for i in range(9):
        y=.16+i*.24
        tube('ladder grasp rung',[(-.27,y,-1.1),(.27,y+.016,-1.1)],[.037,.037],reed,root,7)
        for x in [-.23,.23]:
            pts=[(x+.055*math.cos(a),y+.055*math.sin(a),-1.1) for a in [j/10*math.tau for j in range(11)]]
            tube('rung binding',pts,[.012]*len(pts),shadow,root,5)
    groups={'deck':[],'rainhood':[],'ladder':[]}
    for ob in list(bpy.context.scene.objects):
        if ob.type!='MESH':continue
        group='ladder' if 'ladder' in ob.name or 'rung' in ob.name else 'rainhood' if 'hood' in ob.name or 'rain' in ob.name else 'deck'
        groups[group].append(ob)
    for name,objects in groups.items():
        ob=join(objects,name);ob.parent=root
    export('environment/woven-home',list(bpy.context.scene.objects));return root

def understory():
    clear();root=empty('asset');stem=mat('fern warm stems','#78804a');leafmat=vertex_mat('understory olive leaves')
    verts=[];faces=[];colors=[];palette=['#6c7d40','#829150','#526d3b','#9b9d59']
    for frond in range(13):
        a=frond*2.39996;length=.7+(frond%4)*.18;points=[]
        for j in range(8):
            t=j/7;r=t*length;y=math.sin(t*math.pi*.8)*(.3+(frond%3)*.13)
            points.append((math.cos(a)*r,y,math.sin(a)*r))
        tube('curved frond spine',points,[.012*(1-j/9) for j in range(8)],stem,root,5)
        for j in range(1,8):
            x,y,z=points[j];span=(.24*(1-j/9))
            for side in [-1,1]:
                n=len(verts);dx=math.cos(a+side*.9)*span;dz=math.sin(a+side*.9)*span
                verts.extend([(x,y,z),(x+dx*.45-dz*.28,y+.065,z+dz*.45+dx*.28),(x+dx,y+.05,z+dz),(x+dx*.45+dz*.28,y+.005,z+dz*.45-dx*.28),(x+dx*.44,y+.085,z+dz*.44)])
                faces.extend([(n,n+1,n+4),(n+1,n+2,n+4),(n+2,n+3,n+4),(n+3,n,n+4)]);colors.extend([rgb(palette[(frond+j)%4])]*4)
    m=mesh('curved layered fern leaves',verts,faces,leafmat,root,colors);leafmat.use_backface_culling=False
    join([o for o in bpy.context.scene.objects if o.type=='MESH'],'forest fern cluster').parent=root
    export('environment/understory',list(bpy.context.scene.objects))
    clear();root=empty('asset');reed=mat('storage woven reeds','#b69660');dark=mat('storage binding','#82663e')
    for k in range(12):
        y=.06+k*.042
        points=[(math.cos(a)*(.78+.02*math.sin(j*math.pi+k)),y,math.sin(a)*.65) for j,a in enumerate([i/40*math.tau for i in range(41)])]
        tube('oval storage weave',points,[.019]*len(points),reed,root,5)
    for k in range(27):
        a=k/27*math.tau;points=[(math.cos(a)*(.78+.025*math.sin(j*math.pi+k)),.04+j*.055,math.sin(a)*.65) for j in range(10)]
        tube('basket uprights',points,[.014]*len(points),dark if k%4==0 else reed,root,5)
    for y in [.04,.57]:
        points=[(math.cos(a)*.8,y,math.sin(a)*.67) for a in [i/40*math.tau for i in range(41)]]
        tube('bound storage rim',points,[.04]*len(points),dark,root,7)
    for j in range(11):
        x=(j-5)*.13;length=math.sqrt(max(0,1-x*x/.64))*.63
        tube('basket bottom reeds',[(x,.045,-length),(x,.055,length)],[.024,.024],reed,root,5)
    join([o for o in bpy.context.scene.objects if o.type=='MESH'],'woven store nest').parent=root
    export('environment/woven-store',list(bpy.context.scene.objects))
    clear();root=empty('asset');stem=mat('living reed stem','#8b9554');leaf=mat('living reed leaf','#768547');seed=mat('reed seed head','#a48a56')
    for i in range(5):
        a=i*2.39996;x=math.cos(a)*.17;z=math.sin(a)*.17;h=.95+(i%3)*.17
        tube('growing curved reed',[(x,0,z),(x+.04,h*.5,z+.03),(x+.11,h,z+.06)],[.018,.015,.009],stem,root,6)
        tube('reed seed head',[(x+.105,h*.91,z+.055),(x+.12,h+.13,z+.07)],[.035,.02],seed,root,7)
        for j in range(2):
            y=h*(.3+j*.2);d=1 if (j+i)%2 else -1
            verts=[(x,y,z),(x+d*.2,y+.16,z-.02),(x+d*.42,y+.14,z+.02),(x+d*.19,y+.11,z+.05)]
            ob=mesh('curved reed blade',verts,[(0,1,3),(1,2,3)],leaf,root);leaf.use_backface_culling=False
    join([o for o in bpy.context.scene.objects if o.type=='MESH'],'gatherable reed clump').parent=root
    export('environment/reed-clump',list(bpy.context.scene.objects))

for sub in ['environment','characters']:
    (SOURCE/sub).mkdir(parents=True,exist_ok=True);(OUT/sub).mkdir(parents=True,exist_ok=True)
oak();oak('splitcrown');oak('reedside');samples();understory()
print('COOP_AUTHORED_PROOF_COMPLETE')
