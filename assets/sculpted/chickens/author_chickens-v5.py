"""Original Coop Chaos chicken sculpture v5. Blender 4.5; no third-party assets.
Coordinates passed to helpers are gameplay X/right, Y/up, Z/forward.
"""
import bpy, math, random, os, json, sys, struct
from mathutils import Vector
from math import sin,cos,pi
BASE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(BASE,'../../..'))
random.seed(81)
def v(p):return Vector((p[0],-p[2],p[1]))
def mat(name,color,rough=.77,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 return m

def empty(name,pos=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=v(pos);o.parent=parent;return o

def mesh(name,verts,faces,mats,parent=None,loc=(0,0,0),variation=False,smooth=False):
 me=bpy.data.meshes.new(name);me.from_pydata([v(p) for p in verts],[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.parent=parent;o.location=v(loc)
 for m in mats:me.materials.append(m)
 for p in me.polygons:p.material_index=random.randrange(len(mats)) if variation else 0;p.use_smooth=smooth
 return o

def uv(name,center,scale,ma,parent=None,seg=16,rings=10,smooth=True):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=(0,0,0));o=bpy.context.object;o.name=name;o.parent=parent;o.location=v(center);o.scale=(scale[0],scale[2],scale[1]);o.data.materials.append(ma)
 for p in o.data.polygons:p.use_smooth=smooth
 return o

def loft(name,rings,mats,parent,steps=24,noise=.004):
 verts=[]
 for j,(h,c,w,d) in enumerate(rings):
  for i in range(steps):
   a=2*pi*(i+(.30 if j%2 else 0))/steps;n=1+random.uniform(-noise,noise)
   jitter=.004 if 'head' in name else .012
   hh=h+random.uniform(-jitter,jitter) if 0<j<len(rings)-1 else h
   verts.append((cos(a)*w*n,hh,c+sin(a)*d*n))
 faces=[]
 for j in range(len(rings)-1):
  for i in range(steps):
   a=j*steps+i;b=j*steps+(i+1)%steps;c=(j+1)*steps+(i+1)%steps;d=(j+1)*steps+i
   if (i+j)%2:faces.extend([(a,b,d),(b,c,d)])
   else:faces.extend([(a,b,c),(a,c,d)])
 faces.append(tuple(reversed(range(steps))));faces.append(tuple((len(rings)-1)*steps+i for i in range(steps)))
 return mesh(name,verts,faces,mats,parent,variation=True)

def tube(name,points,radii,ma,parent,steps=8):
 verts=[]
 for j,p in enumerate(points):
  tangent=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)])
  tangent.normalize();side=tangent.cross(Vector((0,1,0)))
  if side.length<.01:side=tangent.cross(Vector((1,0,0)))
  side.normalize();up=tangent.cross(side).normalized()
  for k in range(steps):verts.append(Vector(p)+radii[j]*(cos(2*pi*k/steps)*side+sin(2*pi*k/steps)*up))
 faces=[]
 for j in range(len(points)-1):
  for k in range(steps):faces.append((j*steps+k,j*steps+(k+1)%steps,(j+1)*steps+(k+1)%steps,(j+1)*steps+k))
 faces.extend([tuple(reversed(range(steps))),tuple((len(points)-1)*steps+k for k in range(steps))])
 return mesh(name,verts,faces,[ma],parent,smooth=True)

def feather(name,start,end,width,ma,parent,bend=0,side=0):
 """Solid curved quill-shaped feather with domed center and rounded paddle tip."""
 st=Vector(start);en=Vector(end);axis=(en-st).normalized();across=Vector((0,-axis.z,axis.y)) if side else (Vector((1,0,0)) if abs(axis.x)<.65 else Vector((0,1,0)));across=(across-axis*axis.dot(across)).normalized();normal=axis.cross(across).normalized()
 if side and normal.x*side<0:normal=-normal
 rounded='tail fan' in name
 n=24 if rounded else 8;verts=[]
 for j in range(n+1):
  t=j/n;center=st.lerp(en,t)+normal*(bend*sin(pi*t))
  if rounded:
   profile=(.15+.85*sin(pi*t/.8)) if t<.4 else (1.0 if t<.78 else math.sqrt(max(.0001,1-((t-.78)/.22)**2)))
   w=width*profile+.002
  else:w=width*(sin(pi*t*.97)**.65)*(.92+.08*cos(pi*t))+.004
  for a in range(8):
   angle=2*pi*a/8;verts.append(center+across*(cos(angle)*w)+normal*(sin(angle)*(.018+.038*sin(pi*t))))
 faces=[]
 for j in range(n):
  for a in range(8):faces.append((j*8+a,j*8+(a+1)%8,(j+1)*8+(a+1)%8,(j+1)*8+a))
 faces.extend([tuple(reversed(range(8))),tuple(n*8+a for a in range(8))]);return mesh(name,verts,faces,ma,parent,variation=True)

def comb(parent,ma,tall=False):
 # rounded extruded single comb crest, shaped by rising points
 outline=[(-.17,1.57),(-.20,1.69),(-.16,1.77),(-.10,1.70),(-.065,1.84),(-.02,1.86),(.035,1.74),(.08,1.86),(.13,1.84),(.17,1.70),(.23,1.75),(.27,1.70),(.25,1.60)]
 if not tall:outline=[(z,1.58+(h-1.58)*.65) for z,h in outline]
 verts=[(x,h,z+.34) for x in [-.035,.035] for z,h in outline];n=len(outline)
 faces=[tuple(reversed(range(n))),tuple(n+i for i in range(n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 o=mesh('carved coral comb',verts,faces,[ma],parent)
 mod=o.modifiers.new('soft crest edges','BEVEL');mod.width=.027;mod.segments=3
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
 # convert from global-designed into head local
 for vv in o.data.vertices:vv.co-=v((0,1.24,.31))
 return o

def make_bird(identity):
 random.seed(81+sum(ord(c) for c in identity))
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 presets={
 'fern':dict(body=(.83,.67,.40),wing=(.30,.12,.025),tail=(.26,.09,.018),neck=(.92,.77,.50),small=1,rooster=False),
 'rook':dict(body=(.085,.115,.103),wing=(.13,.17,.14),tail=(.055,.095,.09),neck=(.59,.18,.045),small=.98,rooster=True),
 'dapple':dict(body=(.57,.49,.34),wing=(.18,.22,.20),tail=(.13,.17,.15),neck=(.25,.28,.23),small=.97,rooster=False),
 'wren':dict(body=(.56,.22,.075),wing=(.42,.13,.038),tail=(.30,.095,.032),neck=(.72,.32,.09),small=.86,rooster=False)}
 p=presets[identity]
 def palette(name,c):return [mat(name+' '+str(i),tuple(min(1,x*(.94+.035*i)) for x in c)) for i in range(5)]
 cream=palette('warm modeled plumage',p['body']);neck=palette('hackle',p['neck']);wingm=palette('wing warm layered quills',p['wing']);tailm=palette('tail',p['tail'])
 coral=mat('coral living comb',(.35,.009,.003),.63);coralLight=mat('warm cheek',(.46,.025,.006),.72);feet=mat('ochre scales',(.66,.37,.08));beak=mat('gold upper beak',(.9,.56,.095),.62);lower=mat('beak lower shadow',(.62,.31,.035));claw=mat('horn toe tips',(.31,.20,.10));ivory=mat('eye feather rim',(.55,.30,.10));iris=mat('burnished amber iris',(.37,.16,.026),.35);black=mat('glossy black pupils',(.009,.008,.005),.17);white=mat('eye catchlight',(1,.96,.80),.15)
 root=empty('asset');body=empty('body',parent=root);head=empty('head',(0,1.24,.31),body)
 bodyrings=[(.28,-.08,.08,.13),(.36,-.08,.31,.34),(.49,-.08,.39,.44),(.68,-.08,.47,.52),(.88,-.08,.465,.53),(1.05,-.055,.39,.48),(1.18,.035,.29,.37),(1.30,.21,.18,.24),(1.40,.29,.135,.18),(1.49,.30,.095,.13)]
 if p['rooster']:bodyrings=[(h,c,w*.87,d*.91) for h,c,w,d in bodyrings]
 torso=loft('continuous belly breast and curved neck',bodyrings,cream+neck if p['rooster'] else cream,body,28,.013)
 if p['rooster']:
  for poly in torso.data.polygons:
   height=sum(torso.data.vertices[i].co.z for i in poly.vertices)/len(poly.vertices)
   poly.material_index=(5+random.randrange(5)) if height>1.16 else random.randrange(5)
 # elongated sculpted head, parent-local dimensions
 loft('soft angular hen head',[(.025,.055,.12,.13),(.065,.05,.18,.18),(.13,.045,.205,.19),(.20,.025,.20,.20),(.265,.005,.18,.18),(.315,-.01,.14,.14),(.35,-.015,.08,.08),(.365,0,.015,.02)],neck,head,24,.006)
 # Thin convex feather plates conform to the actual torso cross-section.
 def body_x(h,z):
  if h<=bodyrings[0][0]:r=bodyrings[0]
  elif h>=bodyrings[-1][0]:r=bodyrings[-1]
  else:
   for low,high in zip(bodyrings,bodyrings[1:]):
    if low[0]<=h<=high[0]:
     t=(h-low[0])/(high[0]-low[0]);r=tuple(a+(b-a)*t for a,b in zip(low,high));break
  _,c,width,depth=r
  return width*math.sqrt(max(.015,1-((z-c)/depth)**2))
 def plate(name,start,end,width,mats,parent,side,pivot=(0,0,0),offset=.018,pointed=False):
  # The entire thin shell follows the belly; no sphere coverts or backing slab.
  st=Vector((0,start[0],start[1]));en=Vector((0,end[0],end[1]));center=(st+en)/2
  axis=(en-st).normalized();across=Vector((0,-axis.z,axis.y));half=(en-st).length/2
  n=20;verts=[]
  def add(pt,lift):
   pos=Vector((side*(body_x(pt.y,pt.z)+offset+lift),pt.y,pt.z))-Vector(pivot);verts.append(pos)
  add(center,.012)
  for radius,lift in [(.65,.009),(1,0)]:
   for k in range(n):
    a=2*pi*k/n;t=cos(a);taper=(.65-.35*t) if pointed else 1
    pt=center+axis*(t*half*radius)+across*(sin(a)*width*radius*taper)
    add(pt,lift)
  add(center,-.006);faces=[]
  for k in range(n):
   nk=(k+1)%n
   faces.extend([(0,1+k,1+nk),(1+k,1+n+k,1+n+nk),(1+k,1+n+nk,1+nk),(len(verts)-1,1+n+nk,1+n+k)])
  return mesh(name,verts,faces,mats,parent,variation=True)
 # Copper hackles lie flat in pointed scales over the neck surface.
 if p['rooster']:
  for side in [-1,1]:
   for row in range(2):
    for i in range(4):
     z=.31-i*.087
     plate('flat copper hackle scale', (1.40-row*.105,z),(1.19-row*.105,z-.025),.047,neck,body,side,offset=.008+row*.004,pointed=True)
 # beak upper/lower shaped solids, with crisp seam
 mesh('upper beak', [(-.10,.15,.16),(.10,.15,.16),(-.07,.20,.21),(.07,.20,.21),(0,.155,.375),(-.085,.125,.24),(.085,.125,.24)],[(0,2,3,1),(2,4,3),(0,5,4,2),(1,3,4,6),(5,6,4),(0,1,6,5)],[beak],head)
 mesh('lower beak', [(-.077,.116,.19),(.077,.116,.19),(-.066,.09,.23),(.066,.09,.23),(0,.117,.35)],[(0,1,4),(0,4,2),(1,3,4),(2,4,3),(0,2,3,1)],[lower],head)
 for side in [-1,1]:
  uv('beak nostril', (side*.065,.165,.25),(.012,.008,.02),lower,head,12,6)
  # Face: lateral sockets angle toward forward, glints kept tiny
  uv('coral cheek', (side*.183,.105,.12),(.017,.055,.052),coralLight,head)
  uv('ear feather', (side*.187,.12,.035),(.018,.045,.032),ivory,head)
  uv('eye slim warm socket', (side*.192,.228,.045),(.008,.030,.028),iris,head)
  uv('eye glossy bead', (side*.199,.230,.048),(.008,.025,.024),black,head)
  uv('eye tiny catchlight', (side*.206,.240,.057),(.002,.004,.004),white,head,10,6)
  # Rounded wattles below chin, local attached rather than a suspended ball
  uv('wattle', (side*.047,.018,.179),(.038,.066,.038),coral,head,14,10)
 comb(head,coral,p['rooster'])
 # Rounded secondary fan; the rooster's shorter fan leaves gaps below sickles.
 for i in range(5 if p['rooster'] else 7):
  q=(i-2)/2 if p['rooster'] else (i-3)/3
  st=(q*.06,.78,-.45)
  en=(q*.29,1.13-.14*abs(q),-.80+.10*abs(q)) if p['rooster'] else (q*.34,1.36-.22*abs(q),-.91+.14*abs(q))
  feather('tail fan quill %02d'%i,st,en,.10 if p['rooster'] else .145,tailm,body,.055)
 if p['rooster']:
  for side in [-1,1]:
   for i in range(3):
    plate('flat copper saddle scale',(1.12,-.20-i*.11),(.96,-.33-i*.11),.065,neck,body,side,offset=.012,pointed=True)
  # Three slender, independently curved sickles. Distinct profiles leave air gaps.
  for i,(base,drift,length,height,droop,width) in enumerate([(-.19,-.13,.87,.69,.20,.044),(.015,.03,1.00,.89,.26,.047),(.19,.18,.71,.56,.22,.039)]):
   pts=[];widths=[];count=26
   for j in range(count):
    t=j/(count-1);pts.append((base+drift*t,1.03+height*sin(t*pi*.87)-droop*t,-.45-length*t));widths.append(width*(sin(pi*t)**.6)+.002)
   ribbon=[]
   for j,pt in enumerate(pts):
    # Smoothly curved blade with a restrained ridge, not a thick bent slab.
    for across,lift in [(-1,0),(0,.009),(1,0)]:ribbon.append((pt[0]+across*widths[j],pt[1]+lift,pt[2]))
   faces=[]
   for j in range(count-1):
    for k in range(2):faces.append((j*3+k,j*3+k+1,(j+1)*3+k+1,(j+1)*3+k))
   o=mesh('distinct swept sickle %d'%i,ribbon,faces,tailm,body,variation=True)
   sol=o.modifiers.new('thin feather substance','SOLIDIFY');sol.thickness=.010
   bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sol.name)
 # Folded wings: overlapping thin body-conforming quills and broad oval scales.
 wings=[]
 for side,name in [(1,'wing'),(-1,'far-wing')]:
  pivot=(side*.39,1.02,.03);w=empty(name,pivot,body);wings.append(w)
  # Quills sweep diagonally back and down; each lies within 4cm of the body.
  for i in range(5):
   plate('folded overlapping flight feather %d'%i,(1.04-i*.012,.22-i*.135),(.72+i*.025,-.05-i*.135),.105,wingm,w,side,pivot,.014+i*.001)
  # Two staggered rows of broad flattened coverts conceal the quill roots.
  for row in range(2):
   for i in range(3):
    z=.17-i*.16-row*.045;y=1.105-row*.105
    plate('broad oval covert %d %d'%(row,i),(y,z),(y-.18,z-.065),.092,wingm,w,side,pivot,.020+row*.004)
  if identity=='dapple':
   for i in range(6):
    z=.16-i*.072
    plate('cream laced wing marking',(.99,z),(.86,z-.06),.030,cream,w,side,pivot,.039)
 # bare articulated legs, lifted heel, three distinct forward toes plus rear toe
 legs=[]
 for side,name in [(-1,'leg-left'),(1,'leg-right')]:
  x=side*.21;leg=empty(name,(x,.37,.035),body);legs.append(leg)
  uv('feathered thigh', (0,.025,-.015),(.11,.12,.13),cream[2],leg,16,10,False)
  tube('shank',[(0,.02,.025),(0,-.15,.045),(0,-.29,.12)],[.055,.033,.038],feet,leg)
  for t in [-1,0,1]:
   end=(t*.095,-.342,.33-(.035 if t else 0));points=[(0,-.29,.12),(t*.055,-.327,.235),end]
   tube('spread articulate toe',points,[.034,.025,.014],feet,leg,7)
   tube('short horn claw',[end,(end[0]*1.07,-.345,end[2]+.035)],[.015,.001],claw,leg,6)
  tube('rear balancing toe',[(0,-.28,.095),(side*.04,-.33,-.09),(side*.055,-.343,-.12)],[.026,.02,.005],feet,leg,7)
  for i in range(4):
   tube('subtle shank scale', [(-.024,-.13-i*.032,.075+i*.012),(.024,-.13-i*.032,.075+i*.012)],[.005,.005],beak,leg,5)
 # Put the lowest sole at game Y=0 while retaining the body bob origin.
 bpy.context.view_layer.update()
 ground_delta=min((o.matrix_world@vert.co).z for o in bpy.context.scene.objects if o.type=='MESH' for vert in o.data.vertices)
 for child in body.children:child.location.z-=ground_delta
 # Shared transform animation. Integration may drive these nodes itself; no duplicate autoplay.
 animated=[body,head,*wings,*legs]
 def reset():
  for o in animated:o.rotation_euler=(0,0,0)
  body.location=v((0,0,0));head.location=v((0,1.24-ground_delta,.31))
 def key(frame):
  for o in animated:
   o.keyframe_insert(data_path='location',frame=frame,group=o.name);o.keyframe_insert(data_path='rotation_euler',frame=frame,group=o.name)
 def clip(name,frames,pose):
  reset()
  for o in animated:o.animation_data_clear()
  for f,t in frames:reset();pose(t);key(f)
  for o in animated:
   if o.animation_data and o.animation_data.action:
    act=o.animation_data.action;act.name=name+' '+o.name;track=o.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,act);o.animation_data.action=None
 # Only one clip action at time using manually stashed NLA per node. Reset each action without deleting NLA.
 # Build animations explicitly to retain all clips.
 for o in animated:o.animation_data_create()
 def make_clip(name,pose,length=24):
  for o in animated:o.animation_data.action=None
  for f in [1,7,13,19,25]:
   reset();pose((f-1)/24)
   for o in animated:
    o.keyframe_insert(data_path='location',frame=f,group=o.name);o.keyframe_insert(data_path='rotation_euler',frame=f,group=o.name)
  for o in animated:
   act=o.animation_data.action;act.name=name+' '+o.name;tr=o.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,1,act);tr.mute=True;o.animation_data.action=None
 def walk(t):
  phase=2*pi*t;body.location.z=.014*(1-cos(phase*2));legs[0].rotation_euler.x=.43*sin(phase);legs[1].rotation_euler.x=-.43*sin(phase);head.rotation_euler.x=.06*sin(phase*2)
 def idle(t):body.location.z=.008*sin(2*pi*t);head.rotation_euler.z=.07*sin(2*pi*t)
 def gather(t):head.rotation_euler.x=.65*(sin(pi*t)**2);body.rotation_euler.x=.14*(sin(pi*t)**2)
 def weave(t):head.rotation_euler.x=.24+.17*sin(2*pi*t);head.rotation_euler.z=.15*sin(2*pi*t)
 def carry(t):walk(t);head.rotation_euler.x=-.06
 def flight(t):
  wings[0].rotation_euler.y=-(.65+.60*sin(2*pi*t));wings[1].rotation_euler.y=.65+.60*sin(2*pi*t);legs[0].rotation_euler.x=-.5;legs[1].rotation_euler.x=-.5;head.rotation_euler.x=-.12
 for name,pose in [('idle',idle),('walk',walk),('gather',gather),('carry',carry),('weave',weave),('flight',flight)]:make_clip(name,pose)
 reset();bpy.context.scene.frame_set(1)
 # Exports must preserve physical dimensions (small Wren remains an adult).
 for ob in list(bpy.context.scene.objects):
  if ob.type=='MESH':
   bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.select_set(False)
 if p['small']!=1:
  # root scaling deliberate and applied to hierarchy with exported bounds reported
  root.scale=(p['small'],)*3
 # Batch meshes by articulation for browser draw-call discipline. Geometry remains editable
 # (disconnected feather islands retain their actual modeled thickness and material indices).
 for pivot in [body,head,*wings,*legs]:
  children=[o for o in list(bpy.context.scene.objects) if o.type=='MESH' and o.parent==pivot]
  if len(children)>1:
   bpy.ops.object.select_all(action='DESELECT')
   for ob in children:ob.select_set(True)
   bpy.context.view_layer.objects.active=children[0];bpy.ops.object.join();bpy.context.object.name=pivot.name+' sculpted mesh'
 validation=[]
 for ob in bpy.context.scene.objects:
  if ob.type=='MESH' and ob.data.validate(verbose=True):validation.append(ob.name)
 print('MESH_VALIDATION_REPAIRS '+json.dumps(validation))
 # Save export before adding studio-only environment.
 bpy.ops.object.select_all(action='SELECT')
 target=os.path.join(ROOT,'public/assets/characters',identity+'.glb');os.makedirs(os.path.dirname(target),exist_ok=True)
 bpy.ops.export_scene.gltf(filepath=target,export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_optimize_animation_keep_anim_object=True)
 bpy.context.view_layer.update()
 points=[ob.matrix_world@vert.co for ob in bpy.context.scene.objects if ob.type=='MESH' for vert in ob.data.vertices]
 low=[min(p[i] for p in points) for i in range(3)];high=[max(p[i] for p in points) for i in range(3)]
 raw=open(target,'rb').read();jsonlen=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jsonlen])
 report={'id':identity,'version':'sculpted-v5','bytes':len(raw),'meshCount':len(doc.get('meshes',[])),'materialCount':len(doc.get('materials',[])),'triangleCount':sum(doc['accessors'][prim['indices']]['count']//3 for me in doc.get('meshes',[]) for prim in me['primitives']),'animations':[a.get('name') for a in doc.get('animations',[])],'nodes':[n.get('name') for n in doc['nodes']],'boundsGame':{'min':[low[0],low[2],-high[1]],'max':[high[0],high[2],-low[1]]},'externalResources':[x['uri'] for key in ['buffers','images'] for x in doc.get(key,[]) if 'uri' in x]}
 with open(os.path.join(BASE,identity+'-export-v5.json'),'w') as f:json.dump(report,f,indent=2)
 print('ASSET_REPORT '+json.dumps(report))
 # Editable source contains the actual asset, named articulation, six clips, then a separate render set.
 return root

def studio(identity,root):
 stage=mat('studio warm chalk',(.49,.43,.31));bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=1.17,depth=.07,location=(0,0,-.065));disc=bpy.context.object;disc.name='STUDIO pedestal - excluded export';disc.data.materials.append(stage);bev=disc.modifiers.new('round pedestal lip','BEVEL');bev.width=.06;bev.segments=3
 ground=mat('studio backdrop',(.78,.72,.60));bpy.ops.mesh.primitive_plane_add(size=200);plane=bpy.context.object;plane.name='STUDIO ground - excluded export';plane.location.z=-.105;plane.data.materials.append(ground)
 world=bpy.context.scene.world;world.color=(.65,.65,.65);world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.77,.70,1);world.node_tree.nodes['Background'].inputs[1].default_value=.38
 def light(name,pos,power,size,color):
  bpy.ops.object.light_add(type='AREA',location=pos);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.data.color=color;l.rotation_euler=(Vector((0,0,.8))-l.location).to_track_quat('-Z','Y').to_euler()
 light('STUDIO large warm key',(3,-4,5),300,4,(1,.87,.69));light('STUDIO soft fill',(-3,-2,2.8),110,3,(.78,.88,1));light('STUDIO rim',(1,3,4),260,3,(1,.87,.64))
 bpy.ops.object.camera_add(location=(4.6,-3.5,2.5));cam=bpy.context.object;cam.name='STUDIO proof camera';cam.rotation_euler=(Vector((0,0,.88))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.68;scene=bpy.context.scene;scene.camera=cam
 scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
 scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(BASE,identity+'-proof-v5.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BASE,identity+'.blend'));bpy.ops.render.render(write_still=True)

def main():
 identities=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['fern']
 export_only='--export-only' in identities
 for identity in [x for x in identities if x!='--export-only']:
  root=make_bird(identity)
  if not export_only:studio(identity,root)
if __name__=='__main__':main()
