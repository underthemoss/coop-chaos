"""Original chicken-built canopy additions. Blender 4.5 LTS; deterministic.
Run: BLENDER --background --python assets/sculpted/technology/author_technology.py
No existing sources are regenerated. Helpers use X right / Y up / Z forward.
"""
import bpy, math, json, hashlib, sys, argparse
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'public/assets/environment'
SOURCE=ROOT/'assets/sculpted/environment'
RECORD=Path(__file__).resolve().parent

def xyz(p):return Vector((p[0],-p[2],p[1]))
def rgba(h):
    c=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c)+(1,)
def material(name,h):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=rgba(h)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=rgba(h);p.inputs['Roughness'].default_value=.87
    return m
def empty(name,at=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=xyz(at);o.parent=parent;return o
def tube(name,points,radii,mat,parent,sides=7):
    if isinstance(radii,(float,int)):radii=[radii]*len(points)
    verts=[];faces=[]
    for i,p in enumerate(points):
        t=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
        a=t.cross(Vector((0,1,0)) if abs(t.y)<.95 else Vector((1,0,0))).normalized();b=t.cross(a).normalized()
        for j in range(sides):
            angle=j/sides*math.tau
            verts.append(xyz(Vector(p)+(a*math.cos(angle)+b*math.sin(angle))*radii[i]*(1+.035*math.sin(j*5+i*.4))))
    for i in range(len(points)-1):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(reversed(range(sides))),tuple(range((len(points)-1)*sides,len(points)*sides))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob);ob.parent=parent;mesh.materials.append(mat);return ob

def join_under(root,name):
    objects=[o for o in list(bpy.context.scene.objects) if o.type=='MESH' and o.parent==root]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=name

def hoop(name,center,rx,rz,rad,mat,parent,segments=40):
    return tube(name,[(center[0]+rx*math.cos(j/segments*math.tau),center[1],center[2]+rz*math.sin(j/segments*math.tau)) for j in range(segments+1)],rad,mat,parent)
def lash(at,parent,radius=.075):
    x,y,z=at
    for j in range(3):
        pts=[(x+radius*math.cos(a),y+(j-1)*.035+radius*.38*math.sin(a),z+radius*.65*math.sin(a)) for a in [k/12*math.tau for k in range(13)]]
        tube('oversized fiber lashing',pts,.015,binding,parent,6)
    tube('knot tails',[(x+radius,y-.03,z),(x+radius+.04,y-.17,z+.04),(x+radius-.01,y-.24,z+.06)],[.025,.02,.01],binding,parent,7)

def setup():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    global wood,reed,binding,pale
    wood=material('weathered woven wood','#a67c46');reed=material('golden weave','#c09a54');binding=material('deep fiber','#795d38');pale=material('fresh split reed','#cfb379')
    return empty('asset')

def export(name):
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.scene['author']='Original Coop Chaos project-authored geometry'
    bpy.context.scene['revision']='sleeping-hood-v2' if name=='sleeping-deck' else 'canopy-technology-v1'
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/f'{name}.blend'))
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{name}.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True)

# Attachment contract is kept in tree-local exported units, not map-cell units.
HABITATS=json.loads((ROOT/'src/content/tree-habitats.json').read_text())
PROFILE=HABITATS['profiles']['canopy-proof']
ANCHORS=PROFILE['anchors']
HAULING=PROFILE['hauling']
BERTHS=[tuple(ANCHORS[f'sheltered-perch-{i}']) for i in (2,3)]
DECK_CENTER=tuple(sum(p[i] for p in BERTHS)/2 for i in range(3))
BASKET_BASE=tuple(ANCHORS['basket-ground'])
BASKET_TRAVEL=HAULING['travelY']
PULLEY=(BASKET_BASE[0],ANCHORS['lift-rope'][1],BASKET_BASE[2])
BASKET_ATTACH=HAULING['bridleAboveBasket']

def sleeping_deck():
    root=setup();deck=empty('sleeping-deck',parent=root);roof=empty('sleeping-rainhood',parent=root)
    cx,y,cz=DECK_CENTER
    # A broad nest-shaped terrace rather than a human rectangular floor.
    for i in range(23):
        x=(i-11)*.098;span=math.sqrt(max(0,1-(x/1.23)**2))*.70
        tube('splayed floor reed',[(cx+x,y-.09,cz-span),(cx+x+.018,y-.065,cz),(cx+x,y-.09,cz+span)],[.044,.042,.035],wood if i%4==0 else reed,deck)
    for dx in [-.62,.62]:tube('load-bearing twig runner',[(cx+dx-.1,y-.18,cz-.66),(cx+dx,y-.17,cz),(cx+dx+.1,y-.18,cz+.66)],.075,wood,deck,9)
    for height in [y-.06,y+.14,y+.31]:
        # Open front for entering birds; woven rear crescent cradles the berths.
        pts=[(cx+1.2*math.cos(a),height,cz+.69*math.sin(a)) for a in [j/36*math.pi for j in range(37)]]
        tube('crescent woven side',pts,.027 if height!=y+.31 else .053,wood if height==y+.31 else reed,deck)
    for i in range(27):
        a=i/26*math.pi;px=cx+1.18*math.cos(a);pz=cz+.69*math.sin(a)
        tube('woven edge stake',[(px,y-.10,pz),(px+.012,y+.10,pz+.016),(px,y+.32,pz)],.021,binding if i%5==0 else reed,deck,6)
    for bx,by,bz in BERTHS:
        # Two shallow interwoven nest cups visibly mark separate useful places.
        for r in range(4):hoop('individual shallow nesting cup',(bx,by+.008+r*.018,bz),.34+r*.028,.29+r*.021,.023,reed if r%2 else pale,deck,28)
        tube('sleeping grasp perch',[(bx-.34,by+.035,bz-.08),(bx,by+.05,bz-.11),(bx+.34,by+.035,bz-.08)],.045,wood,deck)
    # Lateral bridge joins the original home edge, with emphatic tied supports.
    edge,middle,entry=(ANCHORS[n] for n in ('home-edge','ramp-middle','deck-entry'))
    for j in range(5):tube('home connecting weave',[(edge[0],edge[1]-.07,edge[2]-.26+j*.13),(middle[0],middle[1],middle[2]-.26+j*.13),(entry[0],entry[1]-.09,entry[2]-.26+j*.13)],.045,wood,deck)
    for j in range(6):
        t=j/5;tube('connecting ramp grasp rung',[(.80+t*.48,2.20+t*.57,-.81),(.80+t*.48,2.20+t*.57,-.19)],.031,binding,deck)
    for pts in [[(.05,1.50,.07),(.75,1.90,-.18),(2.25,y-.16,-.51)],[(.15,2.10,.30),(1.24,2.30,.23),(2.84,y-.18,-.06)]]:
        tube('crooked cradling brace',pts,[.11,.09,.055],wood,deck,10)
        lash(pts[1],deck,.12);lash(pts[-1],deck,.1)
    # Leaflike hood: a deep rear cradle rises to a high, scalloped open mouth.
    # Its front lip sits above and behind the fixed-camera head sightlines;
    # weather cover remains opaque, supported by two curved side ribs.
    def hood(u,t):
        # Transverse width swells through the middle and tapers at both ends.
        width=1.17*math.sin(math.pi*(.17+.67*t))**.38
        x=cx+u*width
        z=cz+.71-1.19*t+.34*abs(u)**1.7*t
        arch=math.sin(math.pi*.65*t)
        h=.35+1.22*arch-.60*abs(u)**1.8*arch
        # A small off-centre crown and unequal lip give a handwoven silhouette.
        h+=.065*math.sin(u*2.6+.35)*arch
        return (x,y+h,z)
    # Side ribs follow the curving shelter into the original rear deck rim.
    for u in [-1,1]:
        pts=[hood(u,t) for t in [0,.18,.38,.60,.80,1]]
        tube('swept hood side rib',[(pts[0][0],y-.04,pts[0][2])]+pts,[.058,.055,.052,.048,.044,.038,.028],wood,roof,8)
        lash((pts[0][0],y+.18,pts[0][2]),roof,.085)
    for i in range(49):
        u=(i-24)/24
        pts=[hood(u,j/8) for j in range(9)]
        # Narrow split reeds taper toward the curled front edge; no solid panel.
        tube('swept leafhood split reed',pts,[.025,.025,.024,.024,.023,.022,.021,.020,.015],wood if i%9==0 else reed,roof,6)
    for k,t in enumerate([.05,.19,.34,.49,.64,.79,.93]):
        pts=[]
        for j in range(25):
            u=(j-12)/12;p=Vector(hood(u,t));p.y+=.018*math.sin(j*math.pi+k)
            pts.append(p)
        tube('curved hood cross weave',pts,.019,binding if k in [0,3,6] else pale,roof,6)
    lip=[hood((j-16)/16,1) for j in range(33)]
    tube('scalloped open shelter mouth',lip,[.038-.013*abs((j-16)/16) for j in range(33)],wood,roof,8)
    # Open lower sides admit birds and expose the cups. Short curved return
    # stakes tie hood to the rear crescent rather than raising a front wall.
    for u in [-.84,.84]:
        p=hood(u,.16);tube('rear cradle hood support',[(p[0],y+.15,cz+.62),(p[0]+u*.04,y+.55,cz+.64),p],[.034,.029,.024],binding,roof,7)
        lash((p[0],y+.34,cz+.62),roof,.065)
    join_under(deck,'sleeping-deck-weave');join_under(roof,'sleeping-rainhood-weave')
    for i,p in enumerate(BERTHS):empty(f'sheltered-perch-{i+2}',p,root)
    for name in ('home-edge','ramp-middle','deck-entry'):empty(name,ANCHORS[name],root)
    export('sleeping-deck')

def hauling_basket():
    root=setup();frame=empty('hauling-frame',parent=root);landing=empty('hauling-landing',parent=root)
    x,y,z=BASKET_BASE;px,py,pz=PULLEY
    # Two uneven poles and diagonal ties make the lift visibly invented at bird scale.
    for pts in [[(-1.17,.06,.15),(-1.40,1.25,.08),(-1.33,2.5,.06),(-1.28,3.45,.0)], [(-2.10,.05,.11),(-2.22,1.45,.02),(-2.12,2.65,-.06),(-2.02,3.49,-.06)]]:
        tube('crooked lifting mast',pts,[.10,.095,.075,.045],wood,frame,10)
    tube('swept overhead yoke',[(-2.2,3.40,-.05),(-1.7,3.54,-.32),(-1.28,3.44,.03)],[.09,.085,.07],wood,frame,10)
    tube('pulley fork',[(-1.72,3.50,-.30),(-1.75,3.36,-.45),(-1.58,3.36,-.45),(-1.57,3.48,-.28)],.036,wood,frame)
    for pts in [[(-2.12,.30,.06),(-1.25,2.21,.07)],[(-1.18,.45,.13),(-2.1,1.7,.07)],[(-.62,1.64,.10),(-1.27,2.27,-.32)]]:
        tube('triangular twig brace',pts,.062,wood,frame,9);lash(pts[-1],frame,.11)
    for p in [(-1.28,3.43,.0),(-2.04,3.42,-.06),(-1.4,1.2,.08),(-2.2,1.45,.02)]:lash(p,frame,.12)
    # Grooved wooden wheel faces the clearing. Three rings make a rope channel.
    for offset,radius in [(-.04,.20),(0,.163),(.04,.20)]:
        pts=[(px+radius*math.cos(a),py+radius*math.sin(a),pz+offset) for a in [j/36*math.tau for j in range(37)]]
        tube('carved pulley wheel',pts,.032,wood if offset else binding,frame,8)
    for a in [j/6*math.tau for j in range(6)]:tube('pulley spoke',[(px,py,pz),(px+.17*math.cos(a),py+.17*math.sin(a),pz)],.02,pale,frame)
    tube('pulley axle',[(px,py,pz-.12),(px,py,pz+.12)],.05,wood,frame,9)
    # A separate landing connects to the first woven home's left rim.
    for i in range(9):
        xx=-1.25+i*.065;tube('landing woven floor',[(xx,2.20,-.91),(xx+.015,2.22,-.46),(xx,2.20,-.12)],.036,reed if i%3 else wood,landing)
    for zz in [-.86,-.18]:tube('landing supporting twig',[(-1.4,2.14,zz),(-.64,2.14,zz)],.065,wood,landing)
    for xx in [-1.28,-.72]:
        tube('landing passing grip',[(xx,2.17,-.15),(xx,2.55,-.15)],.035,wood,landing);lash((xx,2.25,-.15),landing)
    tube('landing rail',[(-1.31,2.54,-.15),(-.69,2.54,-.15)],.035,wood,landing)
    # The operator pulls this return rope at ground level. The main segment is
    # separate and vertically scalable: no animation clip claims a delivery.
    tube('pulley return rope',[(-1.48,3.38,-.45),(-1.37,3.20,-.45),(-1.37,.64,-.45),(-1.07,.41,-.65)],.019,binding,frame,7)
    tube('beak pull grip',[(-1.22,.42,-.65),(-.95,.42,-.65)],.045,wood,frame)
    for j in range(8):
        xx=-1.34+j*.08;tube('operator woven foothold',[(xx,.045,-1.03),(xx+.015,.055,-.77),(xx,.045,-.51)],.028,reed,frame)
    for zz in [-1.0,-.53]:tube('operator grasping foot perch',[(-1.4,.08,zz),(-.75,.08,zz)],.043,wood,frame)
    lash((-1.14,.42,-.65),frame,.055)
    rope=empty(HAULING['ropeNode'],ANCHORS['lift-rope'],root)
    tube('lift-rope-fiber',[(0,0,0),(0,-HAULING['ropeRestLength'],0)],.021,binding,rope,8)
    basket=empty(HAULING['basketNode'],BASKET_BASE,root)
    # Basket geometry is local to this moving root; cargo remains its child.
    for i in range(13):
        h=.06+i*.032;rx=.37+.06*(h/.45)
        pts=[(rx*math.cos(a)*(1+.015*math.sin(j*math.pi+i)),h,.32*math.sin(a)) for j,a in enumerate([k/36*math.tau for k in range(37)])]
        tube('interlaced hauling basket',pts,.018,reed if i%4 else wood,basket,6)
    for i in range(23):
        a=i/23*math.tau
        tube('basket upright',[(.36*math.cos(a),.04,.29*math.sin(a)),(.43*math.cos(a),.44,.33*math.sin(a))],.018,binding if i%5==0 else pale,basket,6)
    for yy,rx,rz in [(.04,.37,.30),(.46,.44,.34)]:hoop('basket bound rim',(0,yy,0),rx,rz,.035,wood,basket)
    for i in range(9):
        xx=(i-4)*.08;span=.29*math.sqrt(max(0,1-(xx/.37)**2));tube('basket base weave',[(xx,.045,-span),(xx,.045,span)],.028,reed,basket,6)
    for zz in [-.24,.24]:
        tube('basket suspension bridle',[(-.36,.42,zz),(-.17,.74,zz*.32),(-.17,.87,0),(.12,.70,zz*.32),(.36,.42,zz)],[.023,.021,.028,.021,.023],binding,basket)
    lash((-.17,.83,0),basket,.065)
    empty('cargo-socket',ANCHORS['cargo-socket'],basket)
    empty('basket-ground',BASKET_BASE,root);empty('basket-landing',ANCHORS['basket-landing'],root)
    empty('operator-ground',ANCHORS['operator-ground'],root)
    join_under(frame,'hauling-frame-weave');join_under(landing,'hauling-landing-weave');join_under(basket,'hauling-basket-weave')
    export('hauling-basket')

parser=argparse.ArgumentParser()
parser.add_argument('--only',choices=['sleeping-deck','hauling-basket'])
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
if args.only in (None,'sleeping-deck'):sleeping_deck()
if args.only in (None,'hauling-basket'):hauling_basket()
contract={'revision':'sleeping-hood-v2; hauling-v1','habitatRevision':HABITATS['revision'],'coordinates':'X right, Y up, Z forward; tree-local origin; scale with existing home','deck':{'berths':BERTHS},'hauling':{'basketRoot':HAULING['basketNode'],'basketBase':BASKET_BASE,'travelY':BASKET_TRAVEL,'cargoSocket':ANCHORS['cargo-socket'],'ropeRoot':HAULING['ropeNode'],'ropeTop':ANCHORS['lift-rope'],'ropeRestLength':HAULING['ropeRestLength']},'exports':{}}
for name in ['sleeping-deck','hauling-basket']:
    path=OUT/f'{name}.glb';contract['exports'][name]={'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(RECORD/'contract.json').write_text(json.dumps(contract,indent=2)+'\n')
print('CANOPY_TECHNOLOGY_EXPORTED')
