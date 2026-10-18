"""Actual-mesh, true-metre Lowfork habitation study, never runtime content.
Blender 4.5: --python this.py -- [opening|mature] [final].
Rooms are open cutaways so usable floor and all residents remain inspectable.
"""
import bpy,math,json,sys,ast,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
mature='mature' in args;final='final' in args
contract=json.loads((ROOT/'src/content/tree-habitats.json').read_text());anchors=contract['profiles']['canopy-proof']['anchors'];scale=contract['presentation']['adultScale']
module=ast.parse((ROOT/'assets/sculpted/trees.py').read_text());households=ast.literal_eval(next(n.value for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='FUTURE_HOUSEHOLDS' for t in n.targets)))
xyz=lambda p:Vector((p[0],-p[2],p[1]))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def empty(name,parent=None,at=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=xyz(at);return o
world=empty('STUDY source metres')
def append(path,parent):
 with bpy.data.libraries.load(str(path),link=False) as (source,target):target.objects=[n for n in source.objects if not n.startswith('STUDIO')]
 for ob in target.objects:
  if ob:
   bpy.context.collection.objects.link(ob)
   if ob.animation_data:
    ob.animation_data.action=None
    for track in ob.animation_data.nla_tracks:track.mute=True
   if ob.parent is None:ob.parent=parent
 return [o for o in target.objects if o]
for name in ['lowfork','woven-home','sleeping-deck','hauling-basket']:
 objects=append(ROOT/f'assets/sculpted/environment/{name}.blend',world)
 if mature and name=='lowfork':
  for ob in objects:
   if ob.type=='MESH' and 'branch fans' in ob.name:
    # Complete crown cutaway: stacked alpha leaves otherwise create dark
    # transparent-depth patches that obscure the actual packing evidence.
    ob.hide_render=True
 if mature and name in ['woven-home','sleeping-deck']:
  for ob in objects:
   if ob.type=='MESH' and ('hood' in ob.name.lower() or 'shelter' in ob.name.lower()):bpy.data.objects.remove(ob,do_unlink=True)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=.9;return m
reed=material('STUDY new woven floor',(.43,.29,.12));edge=material('STUDY bound reed rims',(.25,.17,.08));route=material('STUDY planned access sage',(.28,.48,.39));freight=material('STUDY future hauling ochre',(.64,.36,.08))
def beam(name,a,b,r,mat,parent=world):
 a=xyz(a);b=xyz(b);delta=b-a;t=delta.normalized();u=t.cross(Vector((0,0,1)) if abs(t.z)<.95 else Vector((1,0,0))).normalized();v=t.cross(u)
 points=[p+(u*math.cos(j*math.tau/8)+v*math.sin(j*math.tau/8))*r for p in [a,b] for j in range(8)]
 faces=[(j,(j+1)%8,(j+1)%8+8,j+8) for j in range(8)]+[tuple(reversed(range(8))),tuple(range(8,16))]
 data=bpy.data.meshes.new(name);data.from_pydata(points,[],faces);data.materials.append(mat);o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.parent=parent;return o

def slab(name,center,size,mat,parent=world):
 x,y,z=center;sx,sy,sz=[v*.5 for v in size];points=[xyz((x+dx*sx,y+dy*sy,z+dz*sz)) for dx,dy,dz in [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1),(-1,1,-1),(1,1,-1),(1,1,1),(-1,1,1)]]
 data=bpy.data.meshes.new(name);data.from_pydata(points,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);data.materials.append(mat);o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.parent=parent;return o

bird_cache={}
def bird(identity,parent,at,name):
 if identity not in bird_cache:
  source_root=empty('STUDY freeze source '+identity);objects=append(ROOT/f'assets/sculpted/chickens/{identity}.blend',source_root)
  bpy.context.scene.frame_set(0);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();frozen=[]
  for ob in objects:
   if ob.type=='MESH':
    evaluated=ob.evaluated_get(deps);data=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=deps);data.transform(evaluated.matrix_world);frozen.append(data)
  for ob in objects+[source_root]:bpy.data.objects.remove(ob,do_unlink=True)
  bird_cache[identity]=frozen
 place=empty(name,parent,at);place.scale=(scale,)*3;objects=[]
 for data in bird_cache[identity]:
  ob=bpy.data.objects.new('STUDY actual '+identity,data);bpy.context.collection.objects.link(ob);ob.parent=place;objects.append(ob)
 return place,objects
occupants=[];rooms=[]
qualification=json.loads((ROOT/'assets/sculpted/trees/qualification.json').read_text())
fork_support=qualification['trees']['lowfork'].get('futureFloorSupport',{})
if mature:
 for h in households:
  room=empty('STUDY household '+h['id'],world,h['at']);room.rotation_euler.z=h['yaw']
  slab('STUDY clear interior floor 2.4x2.2m '+h['id'],(0,-.05,0),(2.4,.10,2.2),reed,room)
  # Woven threshold/rim sits outside the measured clear floor.
  for z in [-1.14,1.14]:beam('STUDY floor binding',(-1.24,.02,z),(1.24,.02,z),.035,edge,room)
  for x in [-1.24,1.24]:beam('STUDY floor binding',(x,.02,-1.14),(x,.02,1.14),.035,edge,room)
  # Open cutaway roof frame marks .90m clear headroom without hiding occupants.
  for x in [-1.25,1.25]:
   beam('STUDY hood upright',(x,0,-1.15),(x,1.05,-1.15),.035,edge,room)
   beam('STUDY rainhood rib',(x,1.05,-1.15),(x,1.00,.20),.035,edge,room)
  for z in [-.55,.30]:
   beam('STUDY usable perch 1.5m',(-1.10,.10,z),(.40,.10,z),.032,edge,room)
   for x in [-1.0,.30]:beam('STUDY perch support',(x,0,z),(x,.10,z),.025,edge,room)
  # The .65m single-file aisle opens onto a separate .90m deep turning landing.
  slab('STUDY external landing not sleeping floor '+h['id'],(0,-.035,1.60),(1.5,.07,.90),route,room)
  for row,z in enumerate([-.55,.30]):
   for col,x in enumerate([-.85,-.35,.15]):
    identity=['rook','fern','dapple','wren'][(row*3+col+len(rooms))%4]
    place,objects=bird(identity,room,(x,.132,z),'STUDY resident '+h['id']+str(row*3+col+1));occupants.append((place,objects,room,h['id']))
  for support in fork_support.get(h['id'],{}).get('points',[])[::2]:
   beam('STUDY short floor-to-fork binding '+h['id'],support['branchPoint'],support['floorPoint'],.045,edge)
  rooms.append((h,room))
 # Planned rear service spine follows the open side of the living branches.
 # Width is external circulation, not part of household floor area.
 service=ast.literal_eval(next(n.value for n in module.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='FUTURE_SERVICE_ROUTE' for t in n.targets)))
 def walkway(points,name):
  for a,b in zip(points,points[1:]):
   a=Vector(a);b=Vector(b);delta=b-a;horizontal=math.hypot(delta.x,delta.z);across=Vector((-delta.z/horizontal,0,delta.x/horizontal))
   for side in [-.27,.27]:beam(name+' side cord',a+across*side+Vector((0,.08,0)),b+across*side+Vector((0,.08,0)),.025,route)
   n=max(1,math.ceil(delta.length/.15))
   for i in range(n+1):
    p=a+delta*i/n;beam(name+' woven tread',p-across*.325,p+across*.325,.035,route)
 walkway(service,'STUDY planned .65m circulation')
 walkway([(2.15,6.45,5.05),(2.4,7.25,4.60)],'STUDY planned upper access')
 # Separate future hoist cleft stops at neighborhood A, not a giant shaft.
 for x in [-5.00,-4.35]:beam('STUDY future hoist mast',(x,0,-.60),(x,4.10,-.60),.05,freight)
 beam('STUDY future hoist crossbar',(-5.00,4.10,-.60),(-4.35,4.10,-.60),.05,freight)
 for rung in range(15):beam('STUDY planned beak-and-foot climb',(-5.00,.15+rung*.22,-.60),(-4.35,.15+rung*.22,-.60),.035,freight)
 beam('STUDY future hoist rope',(-4.70,.20,-.60),(-4.70,4.10,-.60),.016,freight)
 slab('STUDY future hoist ground loading',(-4.70,.06,-.60),(.70,.12,.70),freight)
 slab('STUDY future hoist upper landing',(-4.70,3.40,-.60),(.90,.10,.90),freight)
 walkway([(-4.70,3.45,-.60),(-4.70,3.45,3.35),(-3.45,3.45,3.35)],'STUDY future hoist access')
else:
 for slot,identity in zip(contract['profiles']['canopy-proof']['shelteredPerches'],['fern','rook','dapple','wren']):
  place,objects=bird(identity,world,anchors[slot],'STUDY opening resident '+identity);occupants.append((place,objects,world,'opening'))

bpy.context.scene.frame_set(0);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
packing=[]
for place,objects,room,house in occupants:
 inv=room.matrix_world.inverted();points=[]
 for ob in objects:
  if ob.type=='MESH':
   evaluated=ob.evaluated_get(deps)
   points.extend(inv@evaluated.matrix_world@Vector(v) for v in evaluated.bound_box)
 lo=[min(v[i] for v in points) for i in range(3)];hi=[max(v[i] for v in points) for i in range(3)]
 # Convert the room-local Blender AABB back to ART coordinates.
 low=[lo[0],lo[2],-hi[1]];high=[hi[0],hi[2],-lo[1]]
 packing.append({'resident':place.name,'household':house,'min':low,'max':high})
checks={'count':len(packing)==(24 if mature else 4)}
if mature:
 checks['allBodiesInsideClearFloor']=all(p['min'][0]>=-1.20 and p['max'][0]<=.55 and p['min'][2]>=-1.10 and p['max'][2]<=1.10 for p in packing)
 checks['clearHeadroom']=all(p['max'][1]<=.90 for p in packing)
 checks['roomsAndAccessClearOfTree']=all(qualification['trees']['lowfork']['checks'].get(k,False) for k in ['futureRoomHeadroom','futureServiceHeadroom','futureHoistClear','futureTurningLandingsClear','futureFloorsBindToForks'])
 checks['noBodyAabbOverlap']=all(not(all(a['min'][i]<b['max'][i] and b['min'][i]<a['max'][i] for i in range(3))) for j,a in enumerate(packing) for b in packing[j+1:] if a['household']==b['household'])
report={'revision':'spatial-metre-v2','studyOnly':True,'implementedPopulationGrowth':False,'adultScale':scale,'clearInteriorFloor':[2.4,2.2],'perchLength':3.0,'sideAisle':.65,'externalLandingDepth':.90,'externalLandingWidth':1.5,'households':households,'occupants':packing,'checks':checks,'sourceTreeSha256':qualification['trees']['lowfork']['sha256'],'sourceHomeSha256':__import__('hashlib').sha256((ROOT/'public/assets/environment/woven-home.glb').read_bytes()).hexdigest(),'forkSupport':fork_support,'actualChickenSourceHashes':{name:hashlib.sha256((ROOT/f'assets/sculpted/chickens/{name}.blend').read_bytes()).hexdigest() for name in ['rook','fern','dapple','wren']}}
folder=ROOT/'assets/sculpted/trees';(folder/f'{"mature" if mature else "opening"}-study.json').write_text(json.dumps(report,indent=2)+'\n')
# Save the actual editable spatial fixture before adding camera labels/studio.
bpy.ops.wm.save_as_mainfile(filepath=str(folder/f'{"mature" if mature else "opening"}-study.blend'))
world.scale.x=-1
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=6 if final else 4;scene.cycles.use_denoising=final;scene.cycles.max_bounces=4;scene.cycles.diffuse_bounces=2;scene.render.threads_mode='FIXED';scene.render.threads=2
scene.render.resolution_x=1500;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('STUDY sky');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.60,.67,.65,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8;scene.view_settings.view_transform='AgX'
bpy.ops.mesh.primitive_plane_add(size=100);ground=bpy.context.object;ground.name='STUDY ground';ground.data.materials.append(material('STUDY soil',(.24,.22,.15)))
d=bpy.data.lights.new('STUDY key','AREA');d.energy=2200;d.size=9;ob=bpy.data.objects.new('STUDY key',d);scene.collection.objects.link(ob);ob.location=(8,10,15);ob.rotation_euler=(Vector((0,0,5))-ob.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('STUDY actual runtime orientation');cam=bpy.data.objects.new(d.name,d);scene.collection.objects.link(cam);alpha=-math.pi/2.6;beta=math.pi/3.2;center=Vector((-.25,-1.2,5.1));cam.location=center+Vector((-math.cos(alpha)*math.sin(beta),-math.sin(alpha)*math.sin(beta),math.cos(beta)))*30;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=19.5;scene.camera=cam
# Camera-plane labels are authored text objects, not an image-generation overlay.
ink=material('STUDY label cream',(.95,.91,.77));ink.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(.95,.91,.77,1);ink.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=.8
bpy.context.view_layer.update()
from bpy_extras.object_utils import world_to_camera_view
q=cam.rotation_euler.to_quaternion();right=q@Vector((1,0,0));up=q@Vector((0,1,0));forward=q@Vector((0,0,-1));aspect=scene.render.resolution_y/scene.render.resolution_x

def label(text,x,y,size=.24):
 curve=bpy.data.curves.new('STUDY label','FONT');curve.body=text;curve.size=size;curve.align_y='TOP';curve.space_line=1.15
 ob=bpy.data.objects.new('STUDY label '+text[:30],curve);scene.collection.objects.link(ob);ob.rotation_euler=cam.rotation_euler;ob.location=cam.location+forward*12+right*((x-.5)*d.ortho_scale)+up*((y-.5)*d.ortho_scale*aspect);curve.materials.append(ink)
label('LOWFORK  /  '+('24 RESIDENTS • FOUR FUTURE HOUSEHOLDS' if mature else 'FOUR OPENING ADULTS • CURRENT TWO-BERTH HOMES'),.035,.965,.31)
label('ACTUAL TREE + CHICKEN MESHES  |  adults 0.55–0.66 m  |  tree height ~11 m',.035,.92,.22)
if mature:
 callouts={'A':(.07,.48),'B':(.76,.45),'C':(.10,.77),'D':(.77,.77)}
 def screen_point(x,y):return cam.location+forward*12+right*((x-.5)*d.ortho_scale)+up*((y-.5)*d.ortho_scale*aspect)
 for h,room in rooms:
  p=world_to_camera_view(scene,cam,world.matrix_world@xyz(h['at'])+Vector((0,0,.35)))
  x,y=callouts[h['id']]
  label(h['id']+'  /  6 residents'+('\nLower home expanded' if h['id']=='A' else '')+'\n2.4 × 2.2 m clear floor',x,y,.205)
  # Leaders stay on the camera plane, visible through the ghosted crown.
  a=screen_point(x+.08,y-.065);b=screen_point(p.x,p.y)
  def art(v):return (v.x,v.z,-v.y)
  beam('STUDY leader '+h['id'],art(a),art(b),.010,ink,None)
  label(h['id'],p.x-.008,p.y+.018,.24)
 label('Starter floors become shared work landings: zero additional berths.\nSAGE: 0.90 m turning landings + 0.65 m service spine\nOCHRE: separate future hoist to first neighborhood; upper stages reserved',.035,.145,.22)
 label('CUTAWAY: foliage + shelter roofs omitted • NOT IMPLEMENTED GROWTH\n24 is a habitat study, conditional on food, water and care; no load/carrying-capacity claim.',.035,.075,.20)
else:
 label('Existing home and sleeping deck: two commissioned berths each.\nUpper forks, roost limbs and flight windows remain reserved.',.035,.13,.24)
 label('SOURCE SCALE PROOF • Current gameplay capacity unchanged',.035,.055,.20)
out=ROOT/'output/playwright/tree-metre-v2';out.mkdir(parents=True,exist_ok=True);scene.render.filepath=str(out/f'{"mature" if mature else "opening"}-planning-{ "final" if final else "quick"}.png');scene.render.image_settings.file_format='PNG';bpy.ops.render.render(write_still=True)
print(json.dumps({'checks':checks,'report':str(folder/f'{"mature" if mature else "opening"}-study.json')},indent=2))
assert all(checks.values()),'Planning packing check failed'
