"""Original Longbough sculptural refinement. Blender4.5LTS; isolated study only."""
import bpy,bmesh,math,random,json,hashlib,sys,struct
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
S=Path(__file__).resolve().parent;ROOT=S.parents[2];sys.path.insert(0,str(S))
import author_trees as h
import author_habitation as old
sys.path.insert(0,str(S.parent/'landscape'));import author_landscape as landscape
REV='longbough-refinement-v8';OUT=ROOT/'public/assets/environment/studies';R=random.Random(47391)
FLOORS=[{'id':'lower','floorTag':'study-structure-decks','center':[1.10,3.20,1.65],'width':4.65,'depth':3.70}, {'id':'middle','floorTag':'study-structure-decks','center':[-.85,5.72,1.65],'width':4.25,'depth':3.30},{'id':'upper','floorTag':'study-structure-decks','center':[.05,8.15,.85],'width':3.95,'depth':3.10}]
FIXTURES=[{'id':'lower-fern','floorTag':'study-structure-decks','position':[1.45,3.20,2.78],'yawRadians':.15,'character':'fern','cargo':False},{'id':'lower-rook','floorTag':'study-structure-decks','position':[2.40,3.20,2.30],'yawRadians':-.3,'character':'rook','cargo':True},{'id':'middle-fern','floorTag':'study-structure-decks','position':[-.65,5.72,2.87],'yawRadians':0,'character':'fern','cargo':False},{'id':'upper-rook','floorTag':'study-structure-decks','position':[.70,8.15,1.77],'yawRadians':.3,'character':'rook','cargo':False}]

def wood_data_check(ob,stage):
 # Reacquire custom-data layers after all layer creation or topology operations.
 # Narrow bounds detect UV values accidentally written into RGBA before export
 # clamps those invalid values into superficially legal [0,1] colors.
 colors=[tuple(d.color) for d in ob.data.color_attributes['Color'].data]
 uvs=[tuple(d.uv) for d in ob.data.uv_layers['Longitudinal painted grain'].data]
 assert all(.3<v<1 for c in colors for v in c[:3]) and all(c[3]==1 for c in colors),stage
 assert all(math.isfinite(v) and abs(v)<8 for uv in uvs for v in uv),stage
 assert min(uv[0] for uv in uvs)<-.45 and max(uv[1] for uv in uvs)>1.5,stage
 fingerprint=hashlib.sha256(b''.join(struct.pack('<4f',*c) for c in colors)+b''.join(struct.pack('<2f',*uv) for uv in uvs)).hexdigest()
 return {'stage':stage,'color_min':[min(c[k] for c in colors) for k in range(4)],'color_max':[max(c[k] for c in colors) for k in range(4)],'uv_min':[min(p[k] for p in uvs) for k in range(2)],'uv_max':[max(p[k] for p in uvs) for k in range(2)],'color_uv_fingerprint':fingerprint}

def paths():
 # Long asymmetric uninterrupted sweeps; each substantial continuation tapers to
 # a live twig rather than terminating under a floor as a capped support stub.
 p=[
 ([(0,-.75,-.1),(-.22,.25,.04),(-.35,1.3,.06),(-.05,2.8,-.12),(-.42,4.2,-.32),(-1.10,5.7,-.45),(-1.65,7.2,-.55),(-1.8,8.7,-.75),(-2.45,10.0,-.80),(-2.85,11.4,-.85),(-3.65,12.25,-1.0)],[1.36,1.50,1.40,1.22,1.08,.91,.73,.58,.42,.23,.015]),
 ([(-.1,2.7,-.18),(.65,3.9,-.4),(1.6,5.35,-.5),(2.6,6.65,-.75),(3.05,8.0,-.95),(3.0,9.2,-1.15),(3.8,10.45,-1.45),(4.65,11.25,-1.75)],[1.12,1.02,.88,.73,.58,.43,.25,.015]),
 ([(-1.2,5.8,-.48),(-2.4,6.6,-.65),(-3.8,7.15,-.6),(-5.3,8.05,-.42),(-6.55,8.48,-.25)],[.77,.62,.45,.25,.012]),
 ([(1.9,5.7,-.6),(3.4,6.2,-.4),(4.7,7.1,-.10),(5.5,8.15,.10),(6.5,8.65,.35)],[.71,.57,.40,.22,.013]),
 ([(-1.8,8.55,-.7),(-3.0,9.25,-1.35),(-4.05,10.2,-1.9),(-5.1,10.65,-2.2)],[.53,.39,.24,.014]),
 ([(3.0,8.3,-1.0),(4.2,8.7,-1.8),(5.1,9.6,-2.3),(5.7,10.2,-2.5)],[.48,.35,.19,.013]),
 ([(-.2,3.1,-.35),(-.15,4.6,-1.5),(.0,6.3,-2.4),(.3,7.9,-3.0),(1.1,9.45,-3.4),(1.5,10.75,-3.5)],[.88,.73,.58,.43,.26,.014]),
 ([(.1,6.6,-2.5),(-1.0,7.8,-3.1),(-1.8,9.1,-3.5),(-2.55,10.0,-3.9)],[.48,.36,.21,.014]),
 ([(-3.5,7.05,-.65),(-4.0,7.7,.3),(-4.8,8.5,1.15),(-5.6,8.95,1.55)],[.36,.28,.16,.012]),
 ([(4.6,7.0,-.15),(4.5,8.1,.7),(4.95,9.0,1.4),(5.45,9.5,1.7)],[.34,.25,.14,.012]),
 ([(-2.6,10.5,-.82),(-1.8,11.4,-.35),(-1.55,12.25,.0),(-.7,12.6,.25)],[.29,.21,.12,.012]),
 ([(3.15,9.65,-1.3),(2.3,10.4,-2.0),(2.7,11.25,-2.6),(3.3,11.75,-2.8)],[.32,.23,.13,.012])]
 # Buttresses flare from trunk shoulder, curve around stones, then sink below
 # anatomical Y0. Unequal widths/depths create cavities and valleys at the base.
 roots=[
 ([(-.30,2.25,.05),(-.95,1.2,.55),(-1.40,.62,1.25),(-2.15,.18,1.85),(-3.05,-.30,2.15)],[.95,.78,.57,.35,.03]),
 ([(.10,1.95,.05),(.88,1.05,.75),(1.65,.40,1.45),(2.90,.02,1.85),(3.9,-.32,1.65)],[.91,.73,.49,.27,.03]),
 ([(-.40,1.65,-.10),(-1.28,.72,-.72),(-2.25,.17,-1.38),(-3.25,-.26,-1.58)],[.84,.69,.42,.03]),
 ([(.12,1.55,-.25),(.75,.65,-1.38),(1.65,.11,-2.48),(2.5,-.29,-3.08)],[.86,.67,.38,.03]),
 ([(-.45,1.45,-.45),(-.65,.55,-1.8),(-1.0,.03,-3.0),(-1.75,-.3,-3.85)],[.71,.53,.31,.025])]
 # Each crown record is a shallow spreading spray, not a spherical fan.
 sprays=[
 ((-6.15,8.65,-.25),(2.15,.60,1.60),840, -.15),
 ((-5.5,9.15,1.45),(1.72,.56,1.30),730,.35),
 ((-4.8,10.72,-2.10),(2.08,.57,1.54),860,-.23),
 ((-3.25,12.08,-1.05),(2.05,.56,1.52),900,.20),
 ((-.8,12.65,.15),(2.10,.55,1.50),930,-.18),
 ((1.45,10.85,-3.40),(2.13,.58,1.68),870,.35),
 ((-2.45,10.08,-3.80),(2.03,.54,1.56),810,-.15),
 ((4.55,11.35,-1.80),(2.18,.58,1.67),900,.25),
 ((3.3,11.85,-2.75),(1.85,.55,1.43),810,-.20),
 ((5.75,10.25,-2.50),(1.93,.54,1.45),800,.45),
 ((6.3,8.85,.35),(1.88,.54,1.43),780,-.18),
 ((5.3,9.62,1.60),(1.88,.52,1.4),770,.23)]
 # Fine supporting twig continuations belong under the sprays; tips are exposed
 # at a few broken silhouettes, never severed blunt tubes.
 for i,(c,size,count,angle) in enumerate(sprays):
  c=Vector(c)
  for j,(dx,dz) in enumerate(((-.85,-.30),(.80,-.25),(.15,.85))):
   end=c+Vector((dx*size[0]*.65,.10,dz*size[2]*.65));target=c+Vector((0,-.45,0));candidates=[]
   for points,radii in p[:12]:
    pp,rr=h.sample(points,radii,.35)
    candidates.extend(pp)
   base=min(candidates,key=lambda q:(q-target).length_squared);p.append(([tuple(base),tuple(base.lerp(end,.52)+Vector((0,.16,0))),tuple(end)],[.105,.058,.009]))
 return p,roots,sprays

def stable_tube(points,radii,name='branch',root=False):
 points,radii=h.sample(points,radii,.145);verts=[];faces=[];last=None;sides=18
 for i,(q,rad) in enumerate(zip(points,radii)):
  t=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized()
  if last is None:u=t.cross(Vector((0,0,1)) if abs(t.z)<.9 else Vector((1,0,0))).normalized()
  else:u=(last-t*last.dot(t)).normalized()
  v=t.cross(u).normalized();last=u
  for j in range(sides):
   a=j*math.tau/sides;flute=1+.14*math.sin(a*5-i*.025)+.05*math.cos(a*3+i*.017);offset=(u*math.cos(a)+v*math.sin(a))*rad*flute
   if root:offset.y*=.62
   verts.append(q+offset)
 for i in range(len(points)-1):
  for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
 faces.extend((tuple(reversed(range(sides))),tuple(range((len(points)-1)*sides,len(points)*sides))))
 return h.mesh(name,verts,faces)

def growth_segments(paths):
 seg=[]
 for pi,(p,r) in enumerate(paths):
  pp,rr=h.sample(p,r,.4);arc=0;last=None
  for i in range(len(pp)-1):
   t=(pp[i+1]-pp[i]).normalized()
   if last is None:u=t.cross(Vector((0,0,1)) if abs(t.z)<.9 else Vector((1,0,0))).normalized()
   else:u=(last-t*last.dot(t)).normalized()
   last=u;seg.append((pp[i],pp[i+1],rr[i],rr[i+1],arc,u,t.cross(u),pi));arc+=(pp[i+1]-pp[i]).length
 kd=KDTree(len(seg))
 for i,s in enumerate(seg):kd.insert((s[0]+s[1])*.5,i)
 kd.balance();return seg,kd

def local_growth(p,seg,kd):
 choices={}
 for _,ix,_ in kd.find_n(p,20):
  a,b,ra,rb,arc,u,v,pi=seg[ix];ab=b-a;t=max(0,min(1,(p-a).dot(ab)/ab.length_squared));q=a+ab*t;rad=p-q;radius=ra+(rb-ra)*t;d=rad.length/max(.06,radius);theta=math.atan2(rad.dot(v),rad.dot(u));rec=(d,theta,arc+ab.length*t,rad.normalized(),radius,pi)
  if pi not in choices or d<choices[pi][0]:choices[pi]=rec
 return sorted(choices.values())[:3]

def wood(paths,roots):
 obs=[stable_tube(p,r) for p,r in paths]+[stable_tube(p,r,'buttress',True) for p,r in roots];h.select(obs);bpy.ops.object.join();ob=bpy.context.object;ob.name='living-wood'
 m=ob.modifiers.new('Merged asymmetric living tree','REMESH');m.mode='VOXEL';m.voxel_size=.075;m.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=m.name)
 m=ob.modifiers.new('Flowing grown junctions','SMOOTH');m.factor=.54;m.iterations=4;bpy.ops.object.modifier_apply(modifier=m.name)
 # Sculpt medium-scale long ridges before reduction; continuous weights at fork
 # joins avoid the previous hard nearest-segment angular relief seams.
 seg,kd=growth_segments(paths+roots);ob.data.update();values=[];sculpt_normals=[v.normal.copy() for v in ob.data.vertices]
 for vert,sculpt_normal in zip(ob.data.vertices,sculpt_normals):
  p=h.game(vert.co);choices=local_growth(p,seg,kd);best=choices[0];relief=0;den=0;shade=0
  for d,theta,arc,rad,radius,pi in choices:
   weight=math.exp(-max(0,d-best[0])*6);phase=theta*7-arc*.17+.32*math.sin(arc*.65+pi*.4);wave=math.sin(phase)+.22*math.sin(theta*13+arc*.23)
   ridge=max(0,wave)**1.4;fiss=max(0,-wave-.48)**1.8;scale=min(1,radius/.60);relief+=weight*(ridge*.105-fiss*.115)*scale;shade+=weight*max(0,min(1,.50+wave*.25));den+=weight
  vert.co+=sculpt_normal*(relief/den);moss=max(0,min(1,(1.65-p.y)/1.65))*.45*(.45+.55*math.sin(p.x*1.9+p.z*.8)**2)
  col=Vector((.88,.86,.80))*(.88+.14*shade/den);col=col.lerp(h.rgb('#657443'),moss);values.append((best[1]/math.tau*2.0,best[2]/3.5,(*col,1)))
 m=ob.modifiers.new('Sculpt surface triangle budget','DECIMATE');ob.data.calc_loop_triangles();m.ratio=min(1,29000/len(ob.data.loop_triangles));bpy.ops.object.modifier_apply(modifier=m.name)
 bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.dissolve_degenerate(bm,dist=.00001,edges=list(bm.edges));bad=[f for f in bm.faces if f.calc_area()<1e-10]
 if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
 bm.to_mesh(ob.data);bm.free();ob.data.validate(clean_customdata=True);ob.data.update()
 # Final topology receives newly evaluated finite longitudinal UV/color data.
 for layer in list(ob.data.uv_layers):ob.data.uv_layers.remove(layer)
 for layer in list(ob.data.color_attributes):ob.data.color_attributes.remove(layer)
 ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER');ob.data.uv_layers.new(name='Longitudinal painted grain');attr=ob.data.color_attributes['Color'];uv=ob.data.uv_layers['Longitudinal painted grain'];values=[]
 for vert in ob.data.vertices:
  p=h.game(vert.co);best=local_growth(p,seg,kd)[0];moss=max(0,min(1,(1.7-p.y)/1.7))*.40*(.45+.55*math.sin(p.x*1.9+p.z*.8)**2);col=Vector((.94,.93,.89)).lerp(h.rgb('#657443'),moss);u=best[1]/math.tau;v=best[2]/6.5
  # The joined root shoulder has several equally plausible growth axes. Use one
  # continuous front-seam-free base chart instead of hard nearest-root charts;
  # graduate back to the branch-local chart below the lowest terrace.
  if p.y<3:
   t=max(0,min(1,(3-p.y)/.8));weight=t*t*(3-2*t);baseu=math.atan2(p.x,p.z)/math.tau;basev=(p.y-.55*max(0,math.hypot(p.x,p.z)-1.25))/6.5;delta=(u-baseu+.5)%1-.5;u=baseu+delta*(1-weight);v=v*(1-weight)+basev*weight
  values.append((u,v,(*col,1)))
 uv_values=[];color_values=[]
 for poly in ob.data.polygons:
  poly.use_smooth=True;us=[values[ob.data.loops[l].vertex_index][0] for l in poly.loop_indices];seam=max(us)-min(us)>.5
  for l in poly.loop_indices:
   u,v,c=values[ob.data.loops[l].vertex_index];uv_values.extend((u+1 if seam and u<0 else u,v));color_values.extend(c)
 ob.data.uv_layers['Longitudinal painted grain'].data.foreach_set('uv',uv_values);ob.data.color_attributes['Color'].data.foreach_set('color',color_values);ob.data.color_attributes.active_color=ob.data.color_attributes['Color']
 ob['wood_data_after_assignment']=json.dumps(wood_data_check(ob,'after-assignment'))
 mat=h.mat('refinement-painted-grown-bark',.96);p=mat.node_tree.nodes.get('Principled BSDF');tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(S/'bark-painted-v1-source.png'),check_existing=True);tex.image.pack();tex.extension='REPEAT';mix=mat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;vc=next(n for n in mat.node_tree.nodes if n.type=='VERTEX_COLOR');mat.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);mat.node_tree.links.new(vc.outputs['Color'],mix.inputs[2]);mat.node_tree.links.new(mix.outputs[0],p.inputs['Base Color']);ob.data.materials.append(mat)
 return ob

class Sprays(h.Leaves):
 def patch(self,center,size,angle,index,count):
  r=self.rand;c=Vector(center);sx,sy,sz=size;u=Vector((math.cos(angle),0,math.sin(angle)));v=Vector((-math.sin(angle),0,math.cos(angle)))
  # Three unequal spreading shoulders overlap vertically and in depth. Closed
  # interiors are recessed well within each individual leaf envelope.
  lobes=[(Vector((-.25*sx,-.16*sy,.08*sz)),(.84,.88,.82),.42),(Vector((.40*sx,-.40*sy,.12*sz)),(.70,.82,.75),.31),(Vector((.12*sx,.40*sy,-.18*sz)),(.65,.76,.70),.27)]
  for li,(shift,scale,weight) in enumerate(lobes):
   cc=c+shift;xx=sx*scale[0];yy=sy*scale[1];zz=sz*scale[2];N=19;start=len(self.v);self.v.append(cc+Vector((0,yy*.28,0)))
   for j in range(N):
    a=j*math.tau/N;rr=.62+.075*math.sin(a*3+index*.6+li)+.055*math.cos(a*5+index);pos=cc+u*math.cos(a)*xx*rr+v*math.sin(a)*zz*rr;pos.y-=yy*(.10+.12*math.cos(a*2+index));self.v.append(pos)
   bot=len(self.v);self.v.append(cc+Vector((0,-yy*.40,0)))
   for j in range(N):
    col=h.mix('#30452e','#5b6b3d',.25+.12*(j%3)/2)
    for tri,n in (((start,start+1+(j+1)%N,start+1+j),Vector((0,1,0))),((bot,start+1+j,start+1+(j+1)%N),Vector((0,-1,0)))):self.f.append(tri);self.colors.append((*col,1));self.normals.append(n)
   amount=round(count*weight)
   for j in range(amount):
    a=j*2.399963229+index*.71+li;radius=math.sqrt((j+.5)/amount);rr=radius*(.88+.12*math.sin(a*3+index)+.065*math.cos(a*5-index*.7));p=cc+u*math.cos(a)*xx*rr+v*math.sin(a)*zz*rr
    p.y+=yy*(.55*(1-radius**1.4)+.19*math.sin(a*3+index+li)+r.uniform(-.14,.12))
    # Outer shoulder leaves turn downward over the support's hidden side face.
    if radius>.72:p.y-=yy*(radius-.72)*1.25
    out=(Vector((0,1,0))*.65+u*math.cos(a)*(.35+radius*.45)+v*math.sin(a)*(.35+radius*.45)).normalized();normal=out
    lit=max(0,min(1,.42+.20*math.sin(a*2+index)+.15*(1-radius)+li*.06));col=h.mix('#415435','#b0b45d',lit)*r.uniform(.88,1.1);length=r.uniform(.18,.30);self.leaf(p,normal,out,length,length*r.uniform(.47,.62),col)
   for k in range(r.randint(4,7)):
    a=r.uniform(0,math.tau);base=cc+u*math.cos(a)*xx*.83+v*math.sin(a)*zz*.83+Vector((0,-yy*.1,0));drop=r.uniform(.20,.65);n=r.randint(5,11)
    for j in range(n):
     t=j/max(1,n-1);p=base+(u*math.cos(a)+v*math.sin(a))*(t*.12)+Vector((0,-drop*t,0))+u*(.06*math.sin(j*2.4));normal=(u*math.cos(a)+v*math.sin(a)+Vector((0,.2,0))).normalized();self.leaf(p,normal,normal,r.uniform(.17,.26),r.uniform(.08,.12),h.mix('#405332','#929c49',r.uniform(.2,.65)),True)

class Parts(old.Parts):
 def __init__(self):super().__init__()
 def twig(self,a,b,r,color='#99855d'):
  a=Vector(a);b=Vector(b);self.curved([a,b],r,color)
 def curved(self,points,r,color):
  pp,_=h.sample(points,[r]*len(points),.3)
  if len(pp)>4:pp=pp[::2]+([pp[-1]] if (pp[-1]-pp[::2][-1]).length>.001 else [])
  sides=4 if r<.035 else 6;vv=[];last=None
  for i,p in enumerate(pp):
   t=(pp[min(len(pp)-1,i+1)]-pp[max(0,i-1)]).normalized()
   if last is None:u=t.cross(Vector((0,1,0)) if abs(t.y)<.9 else Vector((1,0,0))).normalized()
   else:u=(last-t*last.dot(t)).normalized()
   v=t.cross(u);last=u
   for j in range(sides):a=j*math.tau/sides;vv.append(p+(u*math.cos(a)+v*math.sin(a))*r*(1-i/max(1,len(pp)-1)*.08))
  ff=[]
  for i in range(len(pp)-1):
   for j in range(sides):ff.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
  ff.extend((tuple(reversed(range(sides))),tuple(range((len(pp)-1)*sides,len(pp)*sides))));self.add(vv,ff,h.rgb(color)*R.uniform(.91,1.08))

def inside(point,outline):
 x,z=point;yes=False
 for a,b in zip(outline,outline[1:]+outline[:1]):
  if (a[2]>z)!=(b[2]>z) and x<(b[0]-a[0])*(z-a[2])/(b[2]-a[2])+a[0]:yes=not yes
 return yes

def balconies():
 decks=Parts();support=Parts();rails=Parts();reed=Parts();rope=Parts();plants=Parts();old.R=R
 for idx,f in enumerate(FLOORS):
  x,y,z=f['center'];rx=f['width']/2;rz=f['depth']/2;outline=[]
  # Bowed sweeping front edge, asymmetric rear lobes. No rectangular pallet.
  for j in range(34):
   a=j*math.tau/34;radius=1+.045*math.sin(a*3+idx)+.025*math.cos(a*5-idx);xx=x+math.cos(a)*rx*radius;zz=z+math.sin(a)*rz*radius
   if math.sin(a)<-.25:zz+=.20*math.cos(a*2+idx)
   outline.append([xx,y,zz])
  f['outline']=outline
  count=round(f['width']/.19);step=f['width']/count
  for j in range(count):
   xx=x-rx+(j+.5)*step;zs=[]
   for a,b in zip(outline,outline[1:]+outline[:1]):
    if (a[0]<=xx<b[0]) or (b[0]<=xx<a[0]):zs.append(a[2]+(b[2]-a[2])*(xx-a[0])/(b[0]-a[0]))
   if len(zs)<2:continue
   back,front=min(zs),max(zs)
   # Leave the true grown stem outside the traversable deck surface.
   if idx==0 and abs(xx+.10)<1.28:back=max(back,-.1+math.sqrt(max(0,1.28**2-(xx+.10)**2)))
   if idx==1 and abs(xx+1.12)<.95:back=max(back,-.45+math.sqrt(max(0,.95**2-(xx+1.12)**2)))
   if idx==2 and abs(xx+1.70)<.69:back=max(back,-.68+math.sqrt(max(0,.69**2-(xx+1.70)**2)))
   if front-back<.12:continue
   # Worn irregular edges; all floor tops remain exact author meter Y.
   left=xx-step*.47;right=xx+step*.47;back+=R.uniform(0,.05);front-=R.uniform(0,.05)
   vv=[(left,y-.19,back),(right,y-.19,back+.025),(right,y-.19,front),(left,y-.19,front-.02),(left,y,back),(right,y,back+.025),(right,y,front),(left,y,front-.02)];decks.add(vv,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],h.mix('#706044','#aa9166',R.uniform(.35,.85)))
   # Sparse split-grain grooves have physical depth and warm worn sides.
   if j%3==0:
    end=back+(front-back)*R.uniform(.45,.85);groove=R.uniform(.009,.017);decks.beam((xx+step*.16,y-.003,back+.12),(xx+step*.13,y-.003,end),groove,.005,'#65543b')
  # A curved perimeter sill with slightly varying thickness follows each arc.
  for a,b in zip(outline,outline[1:]+outline[:1]):support.twig(Vector(a)-Vector((0,.23,0)),Vector(b)-Vector((0,.23,0)),.085,'#7a6240')
  # Transverse bearing beams directly meet substantial forks under floors.
  for dz in (-.5,.65):support.beam((x-rx*.82,y-.29,z+dz),(x+rx*.82,y-.29,z+dz),.18,.22,'#6e593c')
  anchors=[(-.15,y-1.1,-.2),(1.15 if idx!=1 else -1.0,y-.95,-.1)] if idx<2 else [(-1.6,7.05,-.6),(2.8,7.20,-.85)]
  for sign,anchor in zip((-1,1),anchors):support.curved([anchor,(x+sign*rx*.38,y-.65,z+.35),(x+sign*rx*.68,y-.30,z+.8)],.095,'#6e5a3c')
  # Unequal twig posts/rails curve along the bulging floor edge, front gaps
  # intentionally retain birds/ladder entry legibility.
  posts=[]
  for j in range(0,34,2):
   p=Vector(outline[j]);theta=j*math.tau/34
   if p.z>z+rz*.65 and abs(p.x-x)<.58:posts.append(None);continue
   height=R.uniform(.46,.65);top=p+Vector((R.uniform(-.09,.09),height,R.uniform(-.08,.08)));rails.curved([p-Vector((0,.14,0)),p.lerp(top,.5)+Vector((.035,0,-.02)),top],R.uniform(.033,.044),'#9e8558');posts.append((j,top))
   for k in (-1,0,1):rope.twig(p+Vector((-.07,.15+k*.025,0)),p+Vector((.07,.15+k*.025,0)),.010,'#baa16a')
  for aa,bb in zip(posts,posts[1:]+posts[:1]):
   if aa is None or bb is None:continue
   j,a=aa;k,b=bb
   if (a-b).length>1.25:continue
   mid=(a+b)*.5;out=mid-Vector((x,mid.y,z));mid+=out.normalized()*.035;mid.y-=.045;rails.curved([a,mid,b],.027,'#a18a60')
   if j%4==0:rails.curved([a-Vector((0,.24,0)),mid-Vector((0,.26,0)),b-Vector((0,.24,0))],.019,'#897549')
 # Crooked narrow gripping ladders instead of straight broad stairs.
 ends=[((3.10,.07,3.18),(2.75,3.20,2.55)),((.10,3.20,2.67),(.12,5.72,2.90)),((.96,5.72,2.78),(.96,8.15,1.82))]
 for idx,(a,b) in enumerate(ends):
  a=Vector(a);b=Vector(b);width=.48;side=Vector((width/2,0,0));points=[]
  for k in range(6):t=k/5;p=a.lerp(b,t)+Vector((math.sin(t*math.pi)*(.12 if idx%2 else -.10),0,.06*math.sin(t*math.tau)));points.append(p)
  for sign in (-1,1):rails.curved([p+side*sign for p in points],.037,'#7e6743')
  n=max(4,round((b-a).length/.25))
  for j in range(n+1):t=j/n;p=a.lerp(b,t)+Vector((math.sin(t*math.pi)*(.12 if idx%2 else -.10),0,.06*math.sin(t*math.tau)));rails.twig(p-side+Vector((0,R.uniform(-.025,.025),0)),p+side+Vector((0,R.uniform(-.025,.025),0)),.027,'#ac925d')
 # Woven plant baskets/nest bundles sit against rear/outer rails, never a roof.
 def basket(c,rad,height,planter=False):
  x,y,z=c;n=14
  for j in range(n):
   a=j*math.tau/n;reed.twig((x+math.cos(a)*rad*.68,y,z+math.sin(a)*rad*.68),(x+math.cos(a)*rad,y+height,z+math.sin(a)*rad),.020,'#9d8651')
  for k in range(6):
   yy=y+k*height/5;rr=rad*(.68+.32*k/5)
   for j in range(n):
    a=j*math.tau/n;b=(j+1)*math.tau/n;reed.twig((x+math.cos(a)*rr,yy,z+math.sin(a)*rr),(x+math.cos(b)*rr,yy,z+math.sin(b)*rr),.017,'#806c43')
  if planter:
   for j in range(18):
    a=R.uniform(0,math.tau);end=Vector((x+math.cos(a)*rad*R.uniform(.7,1.6),y+height+R.uniform(.26,.75),z+math.sin(a)*rad*R.uniform(.7,1.5)));plants.curved([(x,y+height*.8,z),tuple(Vector((x,y+height,z)).lerp(end,.5)+Vector((0,.1,0))),tuple(end)],.014,'#718044')
  return
 for c in ((-.95,3.2,2.05),(-2.12,5.72,1.3),(-.68,8.15,.55)):basket(c,.26,.38,True)
 # Small nest-like grasses are loosely bundled on middle rear space.
 for j in range(35):
  a=R.uniform(0,math.tau);rad=R.uniform(.1,.53);x=-1.45+math.cos(a)*rad;z=1.15+math.sin(a)*rad;reed.curved([(x,5.75,z),(x+R.uniform(-.2,.2),5.88+R.uniform(0,.2),z+.1),(x+R.uniform(-.3,.3),5.79,z+.35)],.013,'#a79853')
 # Crooked hauling arm and single original hanging wicker basket.
 support.curved([(2.7,3.0,1.25),(3.18,3.95,1.45),(3.42,4.55,1.65),(4.05,4.53,1.85)],.065,'#81683f');rope.twig((4.03,4.53,1.85),(4.03,1.98,1.85),.018,'#b4a172');basket((4.03,1.42,1.85),.31,.46)
 for sign in (-1,1):rope.twig((4.03+sign*.30,1.86,1.85),(4.03,2.0,1.85),.016,'#b4a172')
 return [decks.object('study-structure-decks','refinement-weathered-split-timber'),support.object('study-structure-supports','refinement-old-branchwood'),rails.object('study-structure-rails-ladders','refinement-crooked-twig-rails'),reed.object('study-structure-woven-hood-basket','refinement-wicker-nest-reeds'),rope.object('study-structure-lashings-hoist','refinement-twine'),plants.object('study-structure-plants','refinement-small-plant-stems')]

def root_stones():
 part=Parts();sculpt=landscape.Sculpture(71425)
 for i,(c,size) in enumerate((((-1.8,.28,1.1),(.72,.83,.69)),((1.0,.18,1.55),(.59,.67,.62)),((1.9,.08,-1.6),(.78,.61,.66)))):
  x,y,z=c;sx,sy,sz=size;sculpt.stone((x,y-.35,z),(sx*2,sy+.35,sz*2),12,7,.55,i*.73)
 # Reuse the original valley kit's fractured courses, mineral color variation
 # and small relief-hugging moss cushions, combined into one study primitive.
 for face,col in zip(sculpt.f,sculpt.colors):part.add([sculpt.v[j] for j in face],[tuple(range(len(face)))],Vector(col[:3]))
 return part.object('study-structure-root-dressing','refinement-root-stone')

def build():
 global R;R=random.Random(47391);old.R=R;h.clear();p,r,f=paths();trunk=wood(p,r);leaves=Sprays(48931)
 for i,(c,size,count,angle) in enumerate(f):
  cc=Vector(c);cc.y-=max(0,cc.y-10.7)*.19;ss=(size[0]*1.04,size[1]*2.35,size[2]*1.08);leaves.patch(cc,ss,angle,i,round(count*1.10))
 foliage=leaves.object();obs=[trunk,foliage]+balconies()+[root_stones()]
 for ob in obs[2:]:
  bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free();ob.data.update()
 deck=obs[2];uv=deck.data.uv_layers.new(name='Split timber lengthwise grain');attr=deck.data.color_attributes['Color']
 for poly in deck.data.polygons:
  for loop in poly.loop_indices:
   p=h.game(deck.data.vertices[deck.data.loops[loop].vertex_index].co);uv.data[loop].uv=(p.x/2.2,p.z/4.5);attr.data[loop].color=(.94,.94,.92,1)
 mat=deck.data.materials[0];nodes=mat.node_tree.nodes;links=mat.node_tree.links;tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(S/'timber-painted-v1-source.png'),check_existing=True);tex.image.pack();tex.extension='REPEAT';links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color']);deck.data.color_attributes.active_color=attr
 trunk['wood_data_after_assembly']=json.dumps(wood_data_check(trunk,'after-all-mesh-assembly'))
 root=bpy.data.objects.new('asset',None);bpy.context.collection.objects.link(root)
 for ob in obs:ob.parent=root
 root['revision']=REV;root['scope']='Original isolated static visual study; no gameplay/capacity/navigation/safety contract';bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
 return root,obs,leaves

def write():
 print('REFINEMENT_BUILD_START',flush=True);root,obs,leaves=build();print('REFINEMENT_GEOMETRY_READY',flush=True);bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(S/'longbough-refinement-study.blend'));h.select([root]+obs);file=OUT/'longbough-refinement-study.glb'
 args=dict(filepath=str(file),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
 props=bpy.ops.export_scene.gltf.get_rna_type().properties
 if 'export_vertex_color' in props:args['export_vertex_color']='ACTIVE'
 bpy.ops.export_scene.gltf(**args)
 groups={}
 for ob in obs:ob.data.calc_loop_triangles();groups[ob.name]={'bounds':h.bounds([h.game(v.co) for v in ob.data.vertices]),'triangles':len(ob.data.loop_triangles)}
 presentation={'revision':REV,'assetUrl':'/assets/environment/studies/longbough-refinement-study.glb','anatomicalGroundY':0,'front':'+Z','deckFloors':FLOORS,'birdFixtures':FIXTURES,'detailBounds':{'min':[-3.4,1.8,-.65],'max':[4.4,9.8,3.7]}}
 (S/'refinement-presentation.json').write_text(json.dumps(presentation,indent=2)+'\n');q={'revision':REV,'file':str(file.relative_to(ROOT)),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bytes':file.stat().st_size,'bounds':h.bounds([h.game(v.co) for ob in obs for v in ob.data.vertices]),'groups':groups,'triangles':sum(v['triangles'] for v in groups.values()),'leaf_count':len(leaves.spans),'leaf_fullspan_m':[min(leaves.spans),max(leaves.spans)],'source':'assets/sculpted/valley-trees/longbough-refinement-study.blend','presentation':presentation};(S/'refinement-qualification.json').write_text(json.dumps(q,indent=2)+'\n');print('REFINEMENT_EXPORTED '+json.dumps(q));return obs

def proof(obs):
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));ob=bpy.context.object;m=bpy.data.materials.new('STUDIO-ground');m.diffuse_color=(.28,.30,.24,1);ob.data.materials.append(m);scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.world.color=(.34,.38,.43)
 for label,at,power,size in [('key',(-10,-12,19),3400,10),('fill',(9,-5,13),1100,9),('rim',(0,9,18),2400,8)]:
  data=bpy.data.lights.new('STUDIO-'+label,'AREA');data.energy=power;data.shape='DISK';data.size=size;ob=bpy.data.objects.new('STUDIO-'+label,data);scene.collection.objects.link(ob);ob.location=at;ob.rotation_euler=(Vector((0,0,6))-ob.location).to_track_quat('-Z','Y').to_euler()
 data=bpy.data.cameras.new('STUDIO-camera');cam=bpy.data.objects.new('STUDIO-camera',data);scene.collection.objects.link(cam);data.type='ORTHO';scene.camera=cam;scene.view_settings.view_transform='AgX';scene.render.resolution_x=1400;scene.render.resolution_y=1400;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for label,at,target,scale in [('front',(7,-24,12),(0,0,6.3),17.3),('strategy',(10,-23,23),(0,0,6.3),17.3),('detail',(6,-24,14),(.0,-1.0,5.6),11.5),('anatomy',(7,-24,12),(0,0,6.3),17.3)]:
  if '--front-only' in sys.argv and label!='front':continue
  obs[1].hide_render=label=='anatomy';cam.location=at;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();data.ortho_scale=scale;scene.render.filepath=str(S/(REV+'-'+label+'.png'));bpy.ops.render.render(write_still=True)
 obs[1].hide_render=False;bpy.ops.wm.save_as_mainfile(filepath=str(S/(REV+'-studio.blend')))
if __name__=='__main__':
 if '--proof-only' in sys.argv:
  bpy.ops.wm.open_mainfile(filepath=str(S/'longbough-refinement-study.blend'));obs=[bpy.data.objects[n] for n in ('living-wood','crown-foliage','study-structure-decks','study-structure-supports','study-structure-rails-ladders','study-structure-woven-hood-basket','study-structure-lashings-hoist','study-structure-plants','study-structure-root-dressing')]
 else:obs=write()
 if '--no-render' not in sys.argv:proof(obs)
