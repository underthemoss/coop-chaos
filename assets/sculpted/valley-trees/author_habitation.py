"""Original redesigned Longbough habitation massing; Blender4.5LTS, meters.
No gameplay/safety/capacity contract. Existing v5 exports remain unchanged.
"""
import bpy,bmesh,math,random,json,hashlib,sys,argparse
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
import author_trees as h
S=Path(__file__).resolve().parent;ROOT=S.parents[2];OUT=ROOT/'public/assets/environment/studies';REV='longbough-habitation-v4';R=random.Random(84291)
def pathways():
 p=[
 ([(0,-.35,0),(.15,.8,.12),(-.12,2.25,.04),(-.08,3.3,-.10),(-.80,4.8,-.28),(-1.5,6.4,-.35),(-1.65,8.05,-.45),(-1.0,9.8,-.50),(-1.65,11.35,-.65)],[1.55,1.40,1.25,1.12,1.00,.83,.67,.43,.08]),
 ([(-.12,2.2,0),(.75,3.45,-.3),(1.6,5.1,-.6),(2.45,6.7,-.75),(2.7,8.4,-.65),(3.4,9.9,-.7),(3.9,10.95,-.8)],[1.17,1.06,.91,.76,.59,.36,.07]),
 ([(-.75,4.65,-.3),(-2.4,5.35,-.45),(-3.6,6.8,-.65),(-4.25,8.3,-.75),(-4.1,9.65,-.9)],[.84,.70,.51,.32,.05]),
 ([(1.45,4.85,-.6),(3.0,5.35,-.45),(4.25,6.4,-.7),(4.7,8.05,-.8),(5.2,9.1,-.7)],[.78,.65,.47,.28,.05]),
 ([(-1.6,7.75,-.45),(-2.9,8.75,-1.4),(-3.8,9.8,-1.9),(-4.4,10.65,-2.2)],[.56,.43,.27,.04]),
 ([(-1.05,9.6,-.5),(-.4,10.5,.1),(.0,11.65,.3)],[.40,.27,.035]),
 ([(2.6,8.2,-.65),(1.9,9.1,-1.5),(1.65,10.4,-2.3),(2.2,11.25,-2.8)],[.49,.38,.23,.04]),
 ([(3.4,9.85,-.7),(4.5,10.25,.4),(5.4,10.8,1.0)],[.31,.22,.035]),
 ([(-3.5,6.6,-.65),(-4.4,7.0,.65),(-5.0,8.1,1.7),(-5.2,9.05,2.0)],[.43,.34,.22,.04]),
 ([(4.2,6.3,-.7),(4.7,6.8,.6),(4.25,7.9,1.8),(4.0,8.8,2.1)],[.41,.32,.21,.04]),
 # Rear layers give genuine crown depth while inhabited +Z stays open.
 ([(-.1,3.0,-.3),(-.1,4.7,-1.6),(-.5,6.3,-2.4),(-1.1,8.1,-3.0),(-1.3,9.65,-3.3)],[.91,.73,.54,.33,.05]),
 ([(.0,4.5,-1.5),(1.6,5.8,-2.5),(2.8,7.5,-3.0),(3.2,9.0,-3.3)],[.60,.46,.29,.04]),
 # Supported shoulders physically immediately below each fitted deck.
 ([(.4,2.1,-.1),(1.0,2.55,.65),(2.2,2.5,1.25),(3.0,2.70,1.5)],[.88,.76,.59,.42]),
 ([(-.9,4.65,-.3),(-1.5,5.05,.4),(-2.5,5.03,1.2),(-3.0,5.23,1.55)],[.78,.67,.51,.34]),
 ([(2.3,6.6,-.7),(1.7,7.25,.15),(.9,7.4,.8),(.1,7.65,1.1)],[.66,.56,.43,.30])]
 roots=[
 ([(.1,1.8,0),(-.9,.8,.4),(-2.1,.15,.8),(-3.2,-.27,1.2)],[.94,.80,.46,.10]),
 ([(.2,1.6,.0),(1.3,.65,.3),(2.6,.1,.75),(3.8,-.28,1.15)],[.95,.75,.43,.09]),
 ([(0,1.4,.1),(-.3,.6,-1.3),(-.9,.03,-2.7),(-1.7,-.28,-3.5)],[.9,.72,.40,.10]),
 ([(-.1,1.2,0),(-1.3,.5,-.8),(-2.5,.0,-1.6),(-3.2,-.26,-2.0)],[.83,.65,.36,.08]),
 ([(.5,1.25,0),(1.35,.5,-1.1),(2.3,.0,-2.2),(2.9,-.25,-2.8)],[.77,.61,.33,.08])]
 fans=[((-4.35,10.6,-2.1),(1.9,.95,1.65),820),((-1.65,11.5,-.65),(2.0,.95,1.85),980),((0,11.7,.3),(1.8,.88,1.65),880),((2.2,11.3,-2.8),(1.8,.90,1.65),850),((3.95,11,-.8),(1.95,.92,1.75),950),((5.35,10.8,1),(1.7,.8,1.6),780),((-4.1,9.65,-.9),(1.85,.93,1.8),870),((-5.2,9.05,2),(1.65,.83,1.5),800),((5.2,9.1,-.7),(1.65,.83,1.65),780),((4.55,9.20,1.25),(1.65,.75,1.45),810),((-1.3,9.65,-3.3),(1.9,.9,1.65),890),((3.2,9,-3.3),(1.75,.85,1.6),810)]
 for c,size,n in fans:
  c=Vector(c)
  for off in ((-.8,.35,-.4),(.8,.45,.1),(.1,.1,.85)):
   tip=c+Vector(off);base=c+Vector((0,-.7,0));p.append(([tuple(base),tuple(base.lerp(tip,.55)),tuple(tip)],[.18,.10,.018]))
 return p,roots,fans

def bark_images():
 # Original analytic directional grain; no reference pixels or external textures.
 w,hh=512,1024;pixels=[];heights=[]
 dark=Vector((.19,.15,.10));base=Vector((.50,.39,.265));warm=Vector((.67,.51,.32))
 for y in range(hh):
  v=y/hh*8
  for x in range(w):
   u=x/w*math.tau;warp=u+.045*math.sin(v*1.8+u*3)+.024*math.sin(v*4.1-u*2)
   fiss=0
   # Five unequal long crevices, interrupted and tapered along growth. Broad
   # warm raised planes stay unstriped; no nested contour-line wallpaper.
   for j,phase in enumerate((.2,1.55,2.75,4.2,5.5)):
    center=phase+.10*math.sin(v*.7+j*1.8)+.035*math.sin(v*2.1+j)
    distance=abs((u-center+math.pi)%math.tau-math.pi)
    width=.025+.018*(.5+.5*math.sin(v*1.3+j*2))
    gate=max(0,min(1,(math.sin(v*.85+j*1.7)+.55)*1.5))
    fiss=max(fiss,math.exp(-(distance/width)**2)*gate)
   ridge=.5+.5*math.sin(warp*2-v*.13)
   medium=.50+.22*math.sin(u*9+.60*math.sin(v*.6+u*2))+.13*math.sin(u*17+v*.23+.9*math.sin(v*.9+u*3))+.10*math.cos(u*27-v*.28+.4*math.sin(v*1.3))
   medium=max(0,min(1,medium));broken=max(0,(.34-medium)/.34)*max(0,min(1,(math.sin(v*1.7+u*4)+.5)*1.4))
   c=base.lerp(warm,.10+ridge*.26+medium*.39).lerp(dark,min(.72,fiss*.76+broken*.26))
   grain=(math.sin(u*57+.65*math.sin(v*2.3))*math.sin(u*39-v*.55))*.014
   c+=Vector((grain,grain*.88,grain*.65))
   height=.38*medium-.72*fiss-.18*broken

   # A few quiet interrupted knots rather than random triangulated patches.
   knot=0
   for ku,kv in ((2.1,3.6),(4.9,6.25),(.65,1.8)):
    rr=math.sqrt(((u-ku)/.19)**2+((v-kv)/.34)**2)
    knot+=math.exp(-rr*rr*.65)*(.5+.5*math.cos(rr*9))
   c=c.lerp(Vector((.32,.245,.16)),min(.55,knot*.42));height-=knot*.16

   speck=.010*math.sin(x*1.81+y*.83)*math.sin(x*.43-y*2.11);c+=Vector((speck,speck,speck))
   pixels.extend((*c,1));heights.append(height)
 image=bpy.data.images.new('original-directional-bark-albedo',width=w,height=hh,alpha=True);image.pixels.foreach_set(pixels);image.filepath_raw=str(S/'habitation-bark-albedo.png');image.file_format='PNG';image.save();image.pack()
 normals=[]
 for y in range(hh):
  for x in range(w):
   du=(heights[y*w+(x+1)%w]-heights[y*w+(x-1)%w])*w*.035/6
   dv=(heights[((y+1)%hh)*w+x]-heights[((y-1)%hh)*w+x])*hh*.035/8
   n=Vector((-du,-dv,1)).normalized();normals.extend((n.x*.5+.5,n.y*.5+.5,n.z*.5+.5,1))
 normal=bpy.data.images.new('original-directional-bark-normal',width=w,height=hh,alpha=True);normal.colorspace_settings.name='Non-Color';normal.pixels.foreach_set(normals);normal.filepath_raw=str(S/'habitation-bark-normal.png');normal.file_format='PNG';normal.save();normal.pack()
 return image,normal

def wood(paths,roots):
 obs=[h.tube(p,r) for p,r in paths]+[h.tube(p,r,'buttress',True) for p,r in roots];h.select(obs);bpy.ops.object.join();ob=bpy.context.object;ob.name='living-wood'
 m=ob.modifiers.new('Fused grown buttresses and forks','REMESH');m.mode='VOXEL';m.voxel_size=.075;m.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=m.name)
 m=ob.modifiers.new('Continuous structural taper','SMOOTH');m.factor=.48;m.iterations=3;bpy.ops.object.modifier_apply(modifier=m.name)
 ob.data.calc_loop_triangles();m=ob.modifiers.new('Controlled wood budget','DECIMATE');m.ratio=min(1,19000/len(ob.data.loop_triangles));bpy.ops.object.modifier_apply(modifier=m.name);ob.data.validate(clean_customdata=True);ob.data.update()
 seg=[]
 for p,r in paths+roots:
  pp,rr=h.sample(p,r,.3);arc=0
  for i in range(len(pp)-1):seg.append((pp[i],pp[i+1],rr[i],rr[i+1],arc));arc+=(pp[i+1]-pp[i]).length
 uv=[];colors=[]
 for vert in ob.data.vertices:
  p=h.game(vert.co);dist,q,t,arc=h.closest(p,seg);rad=p-q;u=t.cross(Vector((0,1,0)) if abs(t.y)<.95 else Vector((1,0,0))).normalized();v=t.cross(u);theta=math.atan2(rad.dot(v),rad.dot(u));grain=math.sin(theta*5-arc*.20+.12*math.sin(arc*1.3));crease=max(0,(-grain-.48)/.52)**2;ridge=max(0,grain)
  vert.co+=h.xyz(rad.normalized())*(ridge*.035-crease*.055)*min(1,rad.length/.45)
  uv.append(((theta/math.tau)%1,arc/8));col=Vector((.94,.94,.94)).lerp(h.rgb('#75815a'),max(0,1-p.y/2.7)*(.17+.10*math.sin(theta*3)))
  colors.append((*col,1))
 attr=ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER');uvmap=ob.data.uv_layers.new(name='Growth aligned bark')
 for poly in ob.data.polygons:
  poly.use_smooth=True;us=[uv[ob.data.loops[l].vertex_index][0] for l in poly.loop_indices];seam=max(us)-min(us)>.5
  for l in poly.loop_indices:
   i=ob.data.loops[l].vertex_index;u,v=uv[i];uvmap.data[l].uv=(u+1 if seam and u<.5 else u,v);attr.data[l].color=colors[i]
 mat=h.mat('habitation-bark-original-texture',.96);nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes.get('Principled BSDF');old=nodes.get('Vertex Color');tex=nodes.new('ShaderNodeTexImage');tex.image,normalimage=bark_images();tex.extension='REPEAT';mult=nodes.new('ShaderNodeMixRGB');mult.blend_type='MULTIPLY';mult.inputs[0].default_value=1;links.new(tex.outputs['Color'],mult.inputs[1]);vc=next(n for n in nodes if n.type=='VERTEX_COLOR');links.new(vc.outputs['Color'],mult.inputs[2]);links.new(mult.outputs[0],p.inputs['Base Color']);normaltex=nodes.new('ShaderNodeTexImage');normaltex.image=normalimage;normaltex.extension='REPEAT';normalnode=nodes.new('ShaderNodeNormalMap');normalnode.inputs['Strength'].default_value=.85;links.new(normaltex.outputs['Color'],normalnode.inputs['Color']);links.new(normalnode.outputs['Normal'],p.inputs['Normal']);ob.data.materials.append(mat);ob.data.update()
 bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.dissolve_degenerate(bm,dist=.00001,edges=list(bm.edges));bad=[f for f in bm.faces if f.calc_area()<1e-10]
 if bad:bmesh.ops.delete(bm,geom=bad,context='FACES')
 bm.to_mesh(ob.data);bm.free();ob.data.validate(clean_customdata=True);ob.data.update()
 attr=ob.data.color_attributes.get('Color')
 for poly in ob.data.polygons:
  for loop in poly.loop_indices:
   vv=ob.data.vertices[ob.data.loops[loop].vertex_index];p=h.game(vv.co);moss=max(0,1-p.y/2.7)*(.15+.09*math.sin(p.x*2+p.z*3));col=Vector((.96,.96,.96)).lerp(h.rgb('#718052'),moss);attr.data[loop].color=(*col,1)
 return ob

class Parts:
 def __init__(self):self.v=[];self.f=[];self.c=[]
 def add(self,verts,faces,color):
  off=len(self.v);self.v.extend(verts)
  for face in faces:self.f.append(tuple(off+i for i in face));self.c.append((*color,1))
 def beam(self,a,b,width,depth=None,color='#8d7753'):
  a=Vector(a);b=Vector(b);t=(b-a).normalized();u=t.cross(Vector((0,1,0)) if abs(t.y)<.95 else Vector((1,0,0))).normalized();v=t.cross(u);d=depth or width;verts=[]
  for p in (a,b):
   for x,y in ((-1,-1),(-1,1),(1,1),(1,-1)):verts.append(p+u*x*width*.5+v*y*d*.5)
  self.add(verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],h.rgb(color)*R.uniform(.88,1.09))
 def twig(self,a,b,r,color='#99855d'):
  a=Vector(a);b=Vector(b);t=(b-a).normalized();u=t.cross(Vector((0,1,0)) if abs(t.y)<.95 else Vector((1,0,0))).normalized();v=t.cross(u);vv=[];side=6
  for k,p in enumerate((a,a.lerp(b,.48)+u*r*.35,b)):
   for j in range(side):vv.append(p+(u*math.cos(j*math.tau/side)+v*math.sin(j*math.tau/side))*r*(1-.12*k))
  ff=[]
  for k in range(2):
   for j in range(side):ff.append((k*side+j,k*side+(j+1)%side,(k+1)*side+(j+1)%side,(k+1)*side+j))
  ff.extend([tuple(reversed(range(side))),tuple(range(12,18))]);self.add(vv,ff,h.rgb(color)*R.uniform(.88,1.07))
 def object(self,name,material):
  ob=h.mesh(name,self.v,self.f);ob.data.materials.append(h.mat(material,.96));attr=ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
  for poly,color in zip(ob.data.polygons,self.c):
   for loop in poly.loop_indices:attr.data[loop].color=color
  return ob

FLOORS=[{'id':'lower','floorTag':'study-structure-decks','center':[1.2,3.20,1.6],'width':4.2,'depth':3.4},{'id':'middle','floorTag':'study-structure-decks','center':[-1.0,5.72,1.8],'width':4.3,'depth':4.0},{'id':'upper','floorTag':'study-structure-decks','center':[1.0,8.15,.9],'width':3.7,'depth':3.1}]
def structures():
 decks=Parts();support=Parts();rails=Parts();reed=Parts();rope=Parts()
 for idx,f in enumerate(FLOORS):
  x,y,z=f['center'];w=f['width'];d=f['depth'];count=round(w/.19);step=w/count
  # Real individual irregular slats, constant checked top-Y and worn ends.
  for j in range(count):
   xx=x-w/2+(j+.5)*step;chamfer=max(0,abs(xx-x)-(w/2-.38));front=z+d/2-chamfer-R.uniform(0,.10);back=z-d/2+chamfer+R.uniform(0,.1)
   if idx==0 and abs(xx)<1.35:back=max(back,math.sqrt(max(0,1.35**2-xx**2)))
   if idx==1 and abs(xx+1.5)<1:back=max(back,-.35+math.sqrt(max(0,1-(xx+1.5)**2)))
   decks.beam((xx,y-.10,back),(xx,y-.10,front),step*.94,.20,'#967a51')
  outline=[[x-w/2+.35,y,z-d/2],[x+w/2-.35,y,z-d/2],[x+w/2,y,z-d/2+.35],[x+w/2,y,z+d/2-.35],[x+w/2-.35,y,z+d/2],[x-w/2+.35,y,z+d/2],[x-w/2,y,z+d/2-.35],[x-w/2,y,z-d/2+.35]];f['outline']=outline
  for zz in (z-d*.31,z+d*.31):support.beam((x-w*.48,y-.32,zz),(x+w*.48,y-.32,zz),.24,.28,'#6b573a')
  for xx in (x-w*.31,x+w*.31):support.beam((xx,y-.4,z-d*.48),(xx,y-.4,z+d*.48),.23,.26,'#79613e')
  # Unequal diagonal braces meet substantial tree shoulders behind the deck.
  for xx in (x-w*.35,x+w*.35):support.twig((xx*.62,y-1.08,-.15),(xx,y-.35,z+d*.28),.13,'#6e583b')
  # Crooked twig edge rails, with a front opening at each ladder landing.
  for a,b in zip(outline,outline[1:]+outline[:1]):
   a=Vector(a);b=Vector(b);side=b-a;steps=max(2,round(side.length/.62));posts=[]
   for j in range(steps+1):
    p=a+side*j/steps
    if p.z>z+d*.45 and abs(p.x-x)<.55:continue
    top=p+Vector((R.uniform(-.04,.04),.52+R.uniform(-.04,.05),R.uniform(-.04,.04)));rails.twig(p-Vector((0,.18,0)),top,.042,'#a48c60');posts.append(top)
    for k in (-1,0,1):rope.twig(p+Vector((-.075,.10+k*.035,0)),p+Vector((.075,.10+k*.035,0)),.013,'#b19b65')
   for aa,bb in zip(posts,posts[1:]):
    if (aa-bb).length<1:rails.twig(aa,bb,.027,'#9a8458');rails.twig(aa-Vector((0,.23,0)),bb-Vector((0,.23,0)),.019,'#8a754e')
 # Gripping ladders have real floor-to-floor landing endpoints, static proof.
 ladder_ends=[((3.10,.08,3.15),(2.8,3.2,2.8)),((.25,3.2,2.85),(.45,5.72,3.50)),((.90,5.72,3.50),(.7,8.15,2.1))]
 for a,b in ladder_ends:
  a=Vector(a);b=Vector(b);side=Vector((.32,0,0))
  for sign in (-1,1):rails.twig(a+side*sign,b+side*sign,.045,'#7d6844')
  for j in range(round((b-a).length/.23)+1):
   p=a.lerp(b,j/round((b-a).length/.23));rails.twig(p-side,p+side,.030,'#a28a5c')
 # A woven arched rainhood: open front, reed barrel form, no human cottage.
 hx,hy,hz=-1.0,5.82,2.10;rx,ry,depth=1.72,1.78,2.4
 for j in range(43):
  t=math.pi*(j+.35)/43.7;xx=hx+rx*math.cos(t);yy=hy+ry*math.sin(t)
  reed.twig((xx,yy,hz-depth/2-.06),(xx+R.uniform(-.025,.025),yy+R.uniform(-.025,.025),hz+depth/2+.10),.031,'#a99b5a' if j%4 else '#77824a')
 for zz in [hz-depth/2+i*depth/9 for i in range(10)]:
  prev=None
  for j in range(22):
   t=math.pi*j/21;p=(hx+(rx+.025)*math.cos(t),hy+(ry+.025)*math.sin(t),zz)
   if prev:reed.twig(prev,p,.023,'#7d7049')
   prev=p
 # Curved back screen, built of crossed reeds; front arch remains open.
 for j in range(21):
  xx=hx-rx*.94+j*rx*1.88/20;height=ry*math.sqrt(max(0,1-((xx-hx)/rx)**2));reed.twig((xx,hy+.08,hz-depth/2),(xx,hy+height-.06,hz-depth/2),.024,'#97874d')
 # Hoist arm, hanging rope and open woven basket beside lower landing.
 support.twig((2.9,3.05,1.6),(3.45,4.65,1.7),.09,'#806741');support.twig((3.42,4.62,1.7),(4.10,4.62,1.9),.08,'#8c744b');rope.twig((4.03,4.62,1.9),(4.03,2.1,1.9),.022,'#bba575')
 bx,by,bz=4.03,1.55,1.9
 for j in range(18):
  a=j*math.tau/18;reed.twig((bx+math.cos(a)*.25,by,bz+math.sin(a)*.25),(bx+math.cos(a)*.34,by+.48,bz+math.sin(a)*.34),.025,'#a08a55')
 for k in range(7):
  y=by+k*.07;rad=.25+k*.014
  for j in range(18):
   a=j*math.tau/18;b=(j+1)*math.tau/18;reed.twig((bx+math.cos(a)*rad,y,bz+math.sin(a)*rad),(bx+math.cos(b)*rad,y,bz+math.sin(b)*rad),.018,'#8e7b4c')
 for sign in (-1,1):rope.twig((bx+sign*.31,by+.45,bz),(bx,2.14,bz),.020,'#bba575')
 for j in range(5):reed.twig((bx-.2+j*.1,by,bz-.24),(bx-.2+j*.1,by,bz+.24),.03,'#9a854e')
 return [decks.object('study-structure-decks','habitation-weathered-deck'),support.object('study-structure-supports','habitation-branchwood-support'),rails.object('study-structure-rails-ladders','habitation-twig-rails'),reed.object('study-structure-woven-hood-basket','habitation-woven-reeds'),rope.object('study-structure-lashings-hoist','habitation-twine')]

class Canopy(h.Leaves):
 def core(self,c,radii,index):
  super().core(c,radii*.84,index)
 def fan(self,index,center,size,count):
  r=self.rand;c=Vector(center);sx,sy,sz=size
  lobes=[(Vector((-.40*sx,.05*sy,-.18*sz)),Vector((.78*sx,.74*sy,.67*sz)),.35),
         (Vector((-.03*sx,.65*sy,-.25*sz)),Vector((.56*sx,.65*sy,.57*sz)),.24),
         (Vector((.53*sx,-.22*sy,.10*sz)),Vector((.69*sx,.67*sy,.62*sz)),.26),
         (Vector((-.43*sx,-.53*sy,.49*sz)),Vector((.51*sx,.58*sy,.53*sz)),.15)]
  for li,(offset,radii,weight) in enumerate(lobes):
   amount=round(count*.69*weight);self.core(c+offset,radii,index*4+li)
   for j in range(amount):
    y=1-2*(j+.5)/amount;a=j*2.39996323+index*.73+li
    direction=Vector((math.sqrt(1-y*y)*math.cos(a),y,math.sqrt(1-y*y)*math.sin(a)))
    ripple=1+.17*math.sin(a*3+y*4+index)+.09*math.cos(a*5-y*2+li)
    p=c+offset+Vector((direction.x*radii.x,direction.y*radii.y,direction.z*radii.z))*ripple*(r.uniform(.90,1.03) if j%6==0 else r.uniform(.55,.81))
    out=Vector((direction.x/radii.x,direction.y/radii.y,direction.z/radii.z)).normalized();normal=(out*.83+Vector((0,.30,0))).normalized();tone=.36+.12*(c.y-8.5)/4+.07*math.sin(index*1.4)
    col=h.mix('#344b30','#9b9c50',tone)*(1 if direction.y>-.2 else .67);length=r.uniform(.18,.29);self.leaf(p,normal,out,length,length*r.uniform(.38,.52),col)
  for k in range(r.randint(4,7)):
   a=r.uniform(0,math.tau);base=c+Vector((math.cos(a)*sx*r.uniform(.65,.91),-sy*r.uniform(.1,.6),math.sin(a)*sz*r.uniform(.65,.91)));amount=r.randint(9,17);drop=r.uniform(.3,.95)
   for j in range(amount):
    t=(j+r.uniform(0,.35))/amount;p=base+Vector((math.cos(a)*math.sin(t*1.8)*.2,-drop*t,math.sin(a)*math.sin(t*1.8)*.2));p+=Vector((math.cos(j*2.4)*.09,0,math.sin(j*2.4)*.09));n=Vector((math.cos(a),.12,math.sin(a)));self.leaf(p,n,n,r.uniform(.18,.26),r.uniform(.075,.11),h.mix('#3c5133','#8d924a',.35),True)

def build():
 global R;R=random.Random(84291);h.clear();p,r,f=pathways();trunk=wood(p,r);leaves=Canopy(732019)
 for i,(c,s,n) in enumerate(f):leaves.fan(i,c,s,n)
 foliage=leaves.object()
 # Gentle olive-to-ochre warmth on upper foliage, restrained inner shadows.
 attr=foliage.data.color_attributes['Color']
 for poly in foliage.data.polygons:
  mid=sum((h.game(foliage.data.vertices[i].co) for i in poly.vertices),Vector())/len(poly.vertices);warm=max(0,min(1,(mid.y-8.5)/4))*.18
  for l in poly.loop_indices:
   color=Vector(attr.data[l].color[:3]);color=color.lerp(h.rgb('#a5a051'),warm);attr.data[l].color=(*color,1)
 obs=[trunk,foliage]+structures();root=bpy.data.objects.new('asset',None);bpy.context.collection.objects.link(root)
 for ob in obs:ob.parent=root
 root['revision']=REV;root['scope']='Static visual habitation massing; no capacity, movement, safety or simulation contract';bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
 return root,obs,leaves

def write():
 root,obs,leaves=build();OUT.mkdir(exist_ok=True,parents=True);bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(S/'longbough-habitation-study.blend'));h.select([root]+obs);f=OUT/'longbough-habitation-study.glb';bpy.ops.export_scene.gltf(filepath=str(f),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
 bbox=h.bounds([h.game(v.co) for ob in obs for v in ob.data.vertices]);groups={}
 for ob in obs:ob.data.calc_loop_triangles();groups[ob.name]={'bounds':h.bounds([h.game(v.co) for v in ob.data.vertices]),'triangles':len(ob.data.loop_triangles)}
 fixtures=[{'id':'lower-fern','floorTag':'study-structure-decks','position':[1.75,3.20,2.85],'yawRadians':.15,'character':'fern','cargo':False},{'id':'lower-rook','floorTag':'study-structure-decks','position':[2.6,3.20,2.3],'yawRadians':-.3,'character':'rook','cargo':True},{'id':'middle-fern','floorTag':'study-structure-decks','position':[-.4,5.72,3.48],'yawRadians':0,'character':'fern','cargo':False},{'id':'upper-rook','floorTag':'study-structure-decks','position':[1.55,8.15,1.90],'yawRadians':.3,'character':'rook','cargo':False}]
 presentation={'revision':REV,'assetUrl':'/assets/environment/studies/longbough-habitation-study.glb','anatomicalGroundY':0,'front':'+Z','deckFloors':FLOORS,'birdFixtures':fixtures,'detailBounds':{'min':[-3.35,2.0,-.55],'max':[4.45,9.7,3.90]}}
 (S/'habitation-presentation.json').write_text(json.dumps(presentation,indent=2)+'\n');receipt={'revision':REV,'file':str(f.relative_to(ROOT)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size,'bounds':bbox,'groups':groups,'total_triangles':sum(q['triangles'] for q in groups.values()),'leaf_count':len(leaves.spans),'leaf_fullspan_m':[min(leaves.spans),max(leaves.spans)],'presentation':presentation,'source':'assets/sculpted/valley-trees/longbough-habitation-study.blend','reference_inspected':'User supplied Screenshot2026-10-26at1.43.35PM; source image inspected, not embedded','limits':'Original static visual massing. Not a usable habitat, population/safety/navigation claim, or concept-fidelity acceptance.'};(S/'habitation-qualification.json').write_text(json.dumps(receipt,indent=2)+'\n');print('HABITATION_READY '+json.dumps(receipt));return obs

def proof(obs):
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.02));ob=bpy.context.object;m=bpy.data.materials.new('STUDIOground');m.diffuse_color=(.28,.30,.24,1);ob.data.materials.append(m);scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.world.color=(.34,.38,.43)
 for label,at,power,size in [('key',(-10,-12,19),3400,10),('fill',(9,-5,13),1100,9),('rim',(0,9,18),2400,8)]:
  data=bpy.data.lights.new('STUDIO'+label,'AREA');data.energy=power;data.shape='DISK';data.size=size;ob=bpy.data.objects.new('STUDIO'+label,data);scene.collection.objects.link(ob);ob.location=at;ob.rotation_euler=(Vector((0,0,6))-ob.location).to_track_quat('-Z','Y').to_euler()
 camdata=bpy.data.cameras.new('STUDIOcamera');cam=bpy.data.objects.new('STUDIOcamera',camdata);scene.collection.objects.link(cam);camdata.type='ORTHO';scene.camera=cam;scene.view_settings.view_transform='AgX';scene.render.resolution_x=1400;scene.render.resolution_y=1400;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for label,at,target,scale in [('front',(7,-24,12),(0,0,6.1),16.5),('strategy',(10,-23,23),(0,0,6),16.5),('detail',(6,-24,14),(.0,-1.0,5.8),11.2),('anatomy',(7,-24,12),(0,0,6.1),16.5)]:
  if '--front-only' in sys.argv and label!='front':continue
  obs[1].hide_render=label=='anatomy';cam.location=at;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();camdata.ortho_scale=scale;scene.render.filepath=str(S/(REV+'-'+label+'.png'));bpy.ops.render.render(write_still=True)
 obs[1].hide_render=False;bpy.ops.wm.save_as_mainfile(filepath=str(S/(REV+'-studio.blend')))
if __name__=='__main__':
 args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
 if '--proof-only' in args:
  bpy.ops.wm.open_mainfile(filepath=str(S/'longbough-habitation-study.blend'));obs=[bpy.data.objects[n] for n in ('living-wood','crown-foliage','study-structure-decks','study-structure-supports','study-structure-rails-ladders','study-structure-woven-hood-basket','study-structure-lashings-hoist')]
 else:obs=write()
 if '--no-render' not in args:proof(obs)
