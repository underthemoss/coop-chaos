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
HABITATS=json.loads((ROOT/'src/content/tree-habitats.json').read_text())
HABITAT=HABITATS['profiles']['canopy-proof']
ANCHORS=HABITAT['anchors']

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

def lowfork_growth():
    """Lowfork v3: unequal living boughs, rear roosts and an open hauling cleft.

    All paths are original authored tree-local metre coordinates. The low saddle
    carries existing woven floors; it never substitutes a new gameplay platform.
    """
    perch0=ANCHORS['natural-perch-0'];perch1=ANCHORS['natural-perch-1']
    return [
      # Spiralling trunk: depth changes carry the twist, rather than bark stripes.
      ([(0,-.14,.38),(-.08,.55,.48),(-.35,1.35,.74),(-.52,2.22,.86),(-.20,3.26,.95),(.18,4.15,1.12),(-.22,5.10,1.40),(.06,6.05,1.35),(.78,6.75,1.18)],[1.02,.84,.70,.62,.53,.42,.29,.18,.045]),
      # Long low left arm stays behind the entire cargo stroke.
      ([(-.35,1.42,.79),(-1.35,1.94,1.12),(-2.35,2.10,1.17),(-3.43,2.61,1.13),(-4.21,3.39,.87),(-4.62,4.35,.68)],[.61,.54,.44,.34,.22,.055]),
      # Rising right saddle lies below the old home and new sleeping floor.
      ([(-.40,1.30,.48),(.18,1.43,.25),(.80,1.78,.04),(1.43,2.18,-.13),(2.23,2.39,-.22),(3.03,2.93,.15),(3.66,3.83,.70),(3.70,4.77,1.03)],[.63,.52,.43,.38,.31,.24,.15,.045]),
      # A broad short saddle under the original home, outside the hoist corridor.
      ([(-.47,1.33,.46),(-.68,1.65,.08),(-.79,1.87,-.32)],[.43,.31,.19]),
      # Natural resting places are parts of continuing living branches, not pegs.
      ([(-.53,2.50,.77),(perch0[0],perch0[1]-.21,perch0[2]),(-1.63,3.33,.98),(-2.43,3.99,1.48),(-3.04,4.83,1.78)],[.33,.18,.15,.10,.025]),
      ([(.01,3.11,1.02),(perch1[0],perch1[1]-.21,perch1[2]),(1.68,3.64,1.10),(2.56,4.32,1.63),(3.17,5.08,1.88)],[.33,.18,.15,.095,.025]),
      # Secondary limbs complete the crown's structure and its open branch rooms.
      ([(-3.38,2.60,1.14),(-4.35,3.30,1.80),(-5.12,4.05,1.94)],[.24,.14,.025]),
      ([(-4.18,3.35,.87),(-4.63,4.09,-.04),(-4.30,4.99,-.37)],[.20,.12,.025]),
      ([(-4.57,4.23,.70),(-4.12,4.88,1.19),(-3.41,5.26,1.21)],[.13,.08,.025]),
      ([(-2.43,3.99,1.48),(-2.23,4.96,1.95),(-1.46,5.60,2.10)],[.15,.09,.025]),
      ([(-.18,4.94,1.37),(-1.24,5.35,1.67),(-2.11,6.06,1.71)],[.28,.17,.035]),
      ([(-1.20,5.35,1.67),(-1.84,5.67,.70),(-2.34,6.07,.18)],[.13,.085,.025]),
      ([(.06,6.05,1.35),(-.48,6.63,.62),(-1.15,6.97,.20)],[.18,.10,.025]),
      ([(.30,6.29,1.27),(1.27,6.47,1.86),(2.10,6.73,1.82)],[.15,.095,.025]),
      ([(.15,4.16,1.13),(1.21,4.80,1.62),(1.76,5.76,2.00),(1.52,6.45,2.12)],[.31,.23,.14,.025]),
      ([(3.65,3.81,.70),(4.12,4.48,.05),(3.74,5.27,-.20)],[.16,.10,.025]),
      ([(3.69,4.64,1.00),(4.19,5.15,1.47),(3.72,5.60,1.85)],[.12,.075,.025]),
      ([(2.56,4.32,1.63),(2.38,5.13,2.07),(2.64,5.75,2.13)],[.10,.07,.022]),
    ]

def lowfork_roots():
    # Unequal low root flares frame the front court; no root crosses the operator
    # or ladder approach. Their broad elliptical sections merge into the soil.
    return [
      ([(0,.63,.19),(.65,.32,.52),(1.66,.11,.84),(2.42,-.18,.86)],[.68,.52,.30,.12]),
      ([(-.17,.65,.30),(-.95,.31,.81),(-1.89,.09,1.55),(-2.46,-.18,1.79)],[.72,.54,.30,.12]),
      ([(.09,.44,.35),(.38,.23,1.31),(.49,.06,2.31),(.96,-.18,2.72)],[.62,.47,.27,.11]),
      ([(-.12,.38,.30),(-.48,.10,-.05),(-.56,-.12,-.58)],[.47,.34,.16]),
      ([(.20,.52,.08),(.91,.23,-.38),(1.63,-.02,-.98),(1.93,-.21,-1.33)],[.57,.43,.27,.11]),
    ]

def lowfork_living_tube(name,points,radii,material,root=False):
    # Catmull-Rom centerlines and slowly turning, fluted sections retain the
    # author's editable growth skeleton in this recipe and a fused editable mesh.
    stations=[];sizes=[]
    for k in range(len(points)-1):
        a,b,c,d=[Vector(points[min(max(j,0),len(points)-1)]) for j in [k-1,k,k+1,k+2]]
        steps=max(3,round((c-b).length/.15))
        for j in range(steps):
            t=j/steps
            stations.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
            sizes.append(radii[k]*(1-t)+radii[k+1]*t)
    stations.append(Vector(points[-1]));sizes.append(radii[-1]);verts=[];faces=[];sides=16
    for i,(point,radius) in enumerate(zip(stations,sizes)):
        tangent=(stations[min(i+1,len(stations)-1)]-stations[max(0,i-1)]).normalized()
        u=tangent.cross(Vector((0,1,0)) if abs(tangent.y)<.94 else Vector((1,0,0))).normalized();v=tangent.cross(u)
        for j in range(sides):
            a=j/sides*math.tau;flute=1+.20*math.sin(a*3-i*.065)+.07*math.cos(a*5+i*.035)
            offset=(u*math.cos(a)+v*math.sin(a))*radius*flute
            if root: offset.y*=.32
            verts.append(tuple(point+offset))
    for i in range(len(stations)-1):
        for j in range(sides):
            n=i*sides+j;m=i*sides+(j+1)%sides;faces.append((n,m,m+sides,n+sides))
    faces.extend([tuple(reversed(range(sides))),tuple(range((len(stations)-1)*sides,len(stations)*sides))])
    return mesh(name,verts,faces,material)

def lowfork_canopy(root):
    """Branch-supported irregular spreading crown v3, not spherical leaf clouds.

    Each hand-drawn plan is a spreading branch fan. Unequal shoulders, ridges,
    broken edges and deep lower skirts form a leafy outer crown around open rooms.
    Only folded leaves ship; there are no opaque solid foliage blobs or textures.
    """
    rand=random.Random(314159)
    # center, uneven radial outline in X/Z, upper ridge Y, depth, leaf count.
    fans=[
      ((-4.03,.72),[(-1.77,-.68),(-.99,-1.64),(.12,-1.61),(1.35,-.83),(1.28,.35),(.49,1.52),(-.93,1.54),(-1.72,.64)],4.92,1.00,330),
      ((-1.66,1.24),[(-1.27,-.38),(-.82,-1.15),(.40,-1.08),(1.10,-.31),(.91,.97),(-.10,1.24),(-1.32,.76)],5.91,1.03,220),
      ((.00,.85),[(-1.95,-.88),(-.96,-1.77),(.59,-1.80),(1.93,-1.09),(2.37,.03),(1.66,1.62),(.04,1.66),(-1.74,1.16)],7.12,1.27,410),
      ((2.11,1.44),[(-1.13,-.78),(-.36,-1.12),(.66,-.73),(1.05,.28),(.32,1.06),(-.78,.91)],6.15,.92,190),
      ((3.57,.79),[(-1.16,-.46),(-.70,-1.48),(.47,-1.42),(1.16,-.60),(.87,.76),(.05,1.64),(-1.10,1.11)],5.24,1.04,285),
    ]
    verts=[];faces=[];colors=[];shades=[]
    outline=[(0,-1),(-.40,-.66),(-.36,-.29),(-.69,.05),(-.41,.40),(-.30,.71),(0,1),(.32,.72),(.43,.40),(.68,.05),(.37,-.29),(.40,-.66)]
    low=Vector(rgb('#47592c')[:3]);high=Vector(rgb('#939b43')[:3])
    for fi,(center,edge,top,depth,count) in enumerate(fans):
        for j in range(count):
            # Stratified positions triangulate the authored irregular footprint;
            # a broad ridge and drooping skirt give thickness instead of flat discs.
            sector=j%len(edge);a=Vector(edge[sector]);b=Vector(edge[(sector+1)%len(edge)])
            mix=rand.random();r=math.sqrt((j*.61803398875)%1)
            offset=(a*(1-mix)+b*mix)*r
            x=center[0]+offset.x;z=center[1]+offset.y
            ridge=.19*math.sin(x*1.18+fi)+.13*math.cos(z*1.61-fi*.6)
            upper=(j%7)<5
            y=top+ridge+depth*(.38-.69*r*r) if upper else top+ridge-depth*(.54+.17*r)
            # Keep work and natural perches framed by air, including bird headroom.
            if -.2<x<3.3 and -1.5<z<.35 and y<4.29: continue
            if -1.4<x<1.4 and -.1<z<1.0 and y<4.25: continue
            outward=Vector((offset.x*.23,1 if upper else -.44,offset.y*.28)).normalized()
            normal=(outward*.78+Vector((0,.30,0))).normalized()
            u=normal.cross(Vector((0,0,1))).normalized();v=normal.cross(u).normalized()
            spin=rand.uniform(-math.pi,math.pi);u,v=u*math.cos(spin)+v*math.sin(spin),-u*math.sin(spin)+v*math.cos(spin)
            length=rand.uniform(.29,.43);width=length*rand.uniform(.66,.84);point=Vector((x,y,z));start=len(verts)
            verts.append(point+normal*.045)
            for px,pz in outline: verts.append(point+u*(px*width)+v*(pz*length)-normal*(.055*pz*pz))
            value=max(0,min(1,.36+.26*(y-4)/3.5+.045*math.sin(x*.8+z*.7)+rand.uniform(-.014,.014)))
            color=low.lerp(high,value)*(.92 if not upper else 1)
            for k in range(len(outline)):
                faces.append((start,start+1+(k+1)%len(outline),start+1+k));colors.append(tuple(color)+(1,));shades.append(outward)
    material=vertex_mat('Lowfork broad branch-fan leaf color v3');material.use_backface_culling=False
    foliage=mesh('Lowfork spreading living crown v3',verts,faces,material,root,colors)
    normals=[]
    for poly,shade in zip(foliage.data.polygons,shades):
        n=(xyz(shade)*.82+poly.normal*.18).normalized();poly.use_smooth=True;normals.extend([tuple(n)]*len(poly.loop_indices))
    foliage.data.normals_split_custom_set(normals)
    foliage['canopy_revision']='lowfork-anatomy-v3';foliage['branch_fans']=len(fans);foliage['leaf_count']=len(verts)//13
    return foliage

def lowfork_bark(trunk,branch_paths,root_paths,relief=True):
    """Broad angular growth planes over Lowfork's retained living anatomy.

    Grain follows the load-bearing limbs into the buttress roots. Geometry and
    color share the same growth field; no photographed texture, hard sun or
    world-facing highlight is baked. Anchored access surfaces are protected.
    """
    def closest(p,paths):
        best=None
        for points,radii in paths:
            distance_along=0
            for i in range(len(points)-1):
                a=Vector(points[i]);b=Vector(points[i+1]);delta=b-a;length=delta.length
                t=max(0,min(1,(p-a).dot(delta)/(length*length)))
                center=a+delta*t;radius=radii[i]*(1-t)+radii[i+1]*t
                distance=(p-center).length
                # The closest medial branch owns its growth flow. Suppress tiny
                # twigs stealing broad fork surfaces by using normalized distance.
                score=distance/max(radius,.055)
                if best is None or score<best[0]:best=(score,center,delta.normalized(),radius,distance_along+t*length)
                distance_along+=length
        return best
    def smooth(a,b,x):
        t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
    anchors=[Vector(ANCHORS[n]) for n in ['natural-perch-0','natural-perch-1','sheltered-deck','ladder-base']]
    paths=branch_paths+root_paths
    dark=Vector(rgb('#5a5145')[:3]);warm=Vector(rgb('#b38a59')[:3]);ochre=Vector(rgb('#c19c6c')[:3]);moss=Vector(rgb('#697049')[:3])
    for vert in trunk.data.vertices:
        p=Vector((vert.co.x,vert.co.z,-vert.co.y))
        score,center,tangent,radius,arc=closest(p,paths)
        radial=p-center
        across=tangent.cross(Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((1,0,0))).normalized()
        along=tangent.cross(across).normalized()
        theta=math.atan2(radial.dot(along),radial.dot(across))
        phase=4*theta-.37*arc+.35*math.sin(2*theta+.5*arc)
        wave=math.sin(phase)
        broad=math.sin(3*theta+.7*arc)
        grain=.68*wave+.32*broad
        protect=min(smooth(.32,.64,(p-a).length) for a in anchors)
        amplitude=.065*min(1.18,radius/.6)*smooth(.06,.25,radius)*protect
        offset=amplitude*grain
        normal=radial.normalized() if radial.length>.0001 else Vector((1,0,0))
        if relief:vert.co+=xyz(normal*offset)
    trunk.data.update()
    for old in list(trunk.data.color_attributes):trunk.data.color_attributes.remove(old)
    attr=trunk.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    # Forty-two broad orientation planes quantize the real fused surface. This
    # follows the bent anatomy through forks without introducing axis-owner
    # seams or promoting every decimation triangle to an unrelated bark facet.
    golden=(1+math.sqrt(5))/2
    directions=[Vector(p).normalized() for a in [-1,1] for b in [-golden,golden] for p in [(0,a,b),(a,b,0),(b,0,a)]]
    edge_length=min((a-b).length for i,a in enumerate(directions) for b in directions[i+1:])
    directions+= [(a+b).normalized() for i,a in enumerate(directions[:]) for b in directions[i+1:] if abs((a-b).length-edge_length)<1e-5]
    normals=[None]*len(trunk.data.loops)
    for poly in trunk.data.polygons:
        p=Vector((poly.center.x,poly.center.z,-poly.center.y))
        score,center,tangent,radius,arc=closest(p,paths);radial=p-center
        across=tangent.cross(Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((1,0,0))).normalized();along=tangent.cross(across).normalized()
        theta=math.atan2(radial.dot(along),radial.dot(across));turn=arc*.19;sector=math.tau/6
        band=round((theta-turn)/sector);angle=band*sector+turn
        plane=xyz(across*math.cos(angle)+along*math.sin(angle));axis=xyz(tangent)
        actual=sum((trunk.data.vertices[i].normal for i in poly.vertices),Vector()).normalized()
        plane=max(directions,key=lambda direction:direction.dot(actual))
        # Split at angular growth-plane boundaries instead of interpolating
        # across them. This is a broad polygonal bark field, not flat shading
        # the arbitrary decimation triangles or adding surface geometry.
        wave=math.sin(4*theta-.37*arc+.35*math.sin(2*theta+.5*arc))
        broad=math.sin(3*theta+.7*arc);grain=.68*wave+.32*broad
        patch=math.sin(p.y*1.3+p.x*.53+p.z*.8)
        tone=max(0,min(1,.53+.10*patch+.24*plane.z+.06*broad))
        color=dark.lerp(warm,tone).lerp(ochre,.28*smooth(.12,.84,grain))
        color=color.lerp(dark,.45*(1-smooth(-.9,-.45,grain)))
        low=1-smooth(.14,1.05,p.y);mossmask=smooth(.20,.78,math.sin(theta*2.1+arc*1.4)+.25*math.sin(p.x*2.6+p.z*2))
        color=color.lerp(moss,low*mossmask*(.25+.48*smooth(-.25,.8,-grain)))
        poly.use_smooth=True
        for loop in poly.loop_indices:
            attr.data[loop].color=tuple(color)+(1,);normals[loop]=tuple(plane)
    for edge in trunk.data.edges:edge.use_edge_sharp=True
    trunk.data.normals_split_custom_set(normals)
    trunk['bark_revision']='lowfork-split-growth-planes-v4'


def lowfork_healed_knot(trunk,root):
    """An old torn branch wound, grown into the surface's twisting planes."""
    from mathutils.bvhtree import BVHTree
    bvh=BVHTree.FromObject(trunk,bpy.context.evaluated_depsgraph_get())
    verts=[];faces=[];colors=[]
    for j in range(15):
        t=j/14;y=1.20+t*.79;x=-.44+.13*t+.027*math.sin(t*7)
        width=.105*math.sin(t*math.pi)**.65
        for k in range(5):
            u=(k-2)/2;xx=x+u*width
            hit,norm,index,distance=bvh.ray_cast(xyz((xx,y,-3)),xyz((0,0,1)))
            point=hit+norm*(.006+.016*(abs(u)**2)*math.sin(t*math.pi))
            verts.append((point.x,point.z,-point.y))
        if j:
            for k in range(4):
                a=(j-1)*5+k;faces.append((a,a+1,a+6,a+5))
                colors.append(rgb(['#996e45','#70543c','#7e5b3a','#ae8050'][k]))
    # Tapered ends share positions; remove their collapsed quads rather than
    # retaining degenerate export triangles.
    faces=faces[4:-4];colors=colors[4:-4]
    scar=mesh('Lowfork grown old scar',verts,faces,vertex_mat('Lowfork old heartwood'),root,colors)
    scar['provenance']='Original torn branch scar projected into current bark surface'


def oak(name="lowfork"):
    return spatial_tree(name)

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
    woven_home()

def woven_home():
    clear();root=empty('asset');wood=mat('weathered woven wood','#a67c46');reed=mat('golden weave','#c09a54');shadow=mat('deep fiber','#795d38')
    for i in range(13):
        x=(i-6)*.15
        tube('branch deck reed',[(x,2.14,-1.22),(x+.025,2.17,-.45),(x,2.13,.35)],[.055,.055,.045],wood,root,7)
    # A low beak-woven guard exposes the .365-scale residents. Its open front
    # doorway meets the actual ladder/home-entry route; there is no wall to cross.
    def open_arc(name, points, radius, material, sides):
        runs=[];run=[]
        for point in points:
            if abs(point[0]) < .36 and point[2] < -.85:
                if len(run)>1:runs.append(run)
                run=[]
            else:run.append(point)
        if len(run)>1:runs.append(run)
        for segment in runs:tube(name,segment,[radius]*len(segment),material,root,sides)
    for i in range(11):
        y=2.18+i*.028;points=[]
        for j in range(57):
            a=-math.pi*.05+j/56*math.pi*1.1
            points.append((math.cos(a)*(1.01+.018*math.sin(j*math.pi+i*math.pi)),y+.015*math.sin(j*.7+i),-.42-math.sin(a)*.85))
        open_arc('fine horizontal basket weave',points,.019,reed if i%3 else wood,5)
    for i in range(49):
        a=-math.pi*.05+i/48*math.pi*1.1
        points=[(math.cos(a)*(1.02+.02*math.sin(j*math.pi+i*math.pi)),2.16+j*.0355,-.42-math.sin(a)*.86) for j in range(10)]
        open_arc('interlaced upright fiber',points,.016,shadow if i%4==0 else reed,5)
    for y in [2.16,2.48]:
        points=[(math.cos(a)*1.04,y,-.42-math.sin(a)*.88) for a in [-.15+i/64*math.pi*1.14 for i in range(65)]]
        open_arc('rounded basket rim',points,.043,wood,7)
    # A broad leaf-like rear canopy with a scalloped open front. The roof still
    # covers the rear nesting space, while its high cut edge exposes occupants.
    # Nothing projects into the natural roosts behind the home at Z=.46.
    for x in [-.94,.94]:
        tube('curved hood support',[(x,2.15,.15),(x*1.02,2.91,.15),(x*.92,3.47,-.05)],[.05,.045,.035],wood,root,7)
    for i in range(47):
        x=(i-23)*.044;edge=abs(x)/1.04
        front=-.34+.17*math.cos(x*3.0)
        points=[(x,3.02-edge*.05,.18),(x*1.01,3.33-edge*.07,.12),(x,3.52-edge*.10,-.06),(x,3.47-edge*.12,(front-.06)*.60),(x*.98,3.36-edge*.10,front)]
        tube('curved bundled reed rainhood',points,[.027]*len(points),reed if i%5 else wood,root,6)
    for z,y in [(.12,3.33),(-.06,3.52)]:
        tube('rainhood curved cross binding',[(-1.03,y-.1,z),(0,y,z),(1.03,y-.1,z)],[.024]*3,shadow,root,7)
        for i in range(5):
            x=(i-2)*.42
            pts=[(x+.065*math.cos(a),y+.024*math.sin(a),z+.03*math.sin(a)) for a in [j/12*math.tau for j in range(13)]]
            tube('rainhood fiber lashing',pts,[.012]*len(pts),shadow,root,5)
    for y in [2.35,2.62,2.9]:tube('rear rain weave',[(-.9,y,.20),(0,y,.22),(.9,y,.20)],[.025]*3,shadow,root,5)
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
import sys
exec(compile((SOURCE/'trees.py').read_text(),str(SOURCE/'trees.py'),'exec'))
if '--' in sys.argv and sys.argv[sys.argv.index('--')+1:]==['trees']:
    for tree_name in ['lowfork','splitcrown','reedside']: oak(tree_name)
elif '--' in sys.argv and sys.argv[sys.argv.index('--')+1:]==['lowfork']:
    oak()
elif '--' in sys.argv and sys.argv[sys.argv.index('--')+1:]==['lowfork-bark']:
    # Runtime-derived normal/material correction: preserve every existing vertex,
    # triangle, socket and scar while changing only wood corner normals/colors.
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE/'environment/lowfork.blend'))
    trunk=bpy.data.objects['lowfork continuous living boughs metre-v2']
    lowfork_bark(trunk,json.loads(trunk['growth_paths']),json.loads(trunk['root_paths']),relief=False)
    lowfork_growth_bark(trunk,json.loads(trunk['growth_paths'])+json.loads(trunk['root_paths']))
    export('environment/lowfork',list(bpy.context.scene.objects))
elif '--' in sys.argv and sys.argv[sys.argv.index('--')+1:]==['woven-home']:
    woven_home()
else:
    oak();oak('splitcrown');oak('reedside');samples();understory()
print('COOP_AUTHORED_PROOF_COMPLETE')
