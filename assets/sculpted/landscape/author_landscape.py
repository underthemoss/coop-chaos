"""Original Coop Chaos valley rock kit, landscape-v1; Blender 4.5 LTS.

Standalone, seeded editable mesh authoring. No imported meshes or pixels.
Run: blender --background --python assets/sculpted/landscape/author_landscape.py
Use -- --no-render to export only; --proof-only renders checked sources only.
Game coordinates are X right / Y up / Z forward; source converts to Blender Z up.
"""
import bpy, math, random, json, hashlib, sys, argparse
from pathlib import Path
from mathutils import Vector

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
OUT = ROOT / 'public/assets/environment'
REV = 'landscape-v3'
DIMENSIONS = {'cliff-ledge': (3, 2, 1.2), 'boulder': (1.2, .9, 1), 'scree': (1.8, .3, 1)}

def xyz(v): return Vector((v[0], -v[2], v[1]))
def linear(h):
    c=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    return Vector([v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c])
def mix(a,b,t): return linear(a).lerp(linear(b), max(0,min(1,t)))

def clear():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for group in (bpy.data.meshes,bpy.data.materials,bpy.data.curves,bpy.data.cameras,bpy.data.lights):
        for item in list(group):
            if item.users==0: group.remove(item)

def material(name, roughness):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.use_backface_culling=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=roughness
    p.inputs['Specular IOR Level'].default_value=.22
    n=m.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Color'
    m.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color'])
    return m

class Sculpture:
    def __init__(self, seed):
        self.rand=random.Random(seed);self.v=[];self.f=[];self.colors=[];self.mats=[]
    def face(self, indices, color, mat=0):
        self.f.append(tuple(indices));self.colors.append((*color,1));self.mats.append(mat)
    def triangle(self, points, color, mat=0):
        s=len(self.v);self.v.extend(points);self.face((s,s+1,s+2),color,mat)
    def stone(self, center, size, sides=12, levels=7, moss=.3, phase=0):
        """Hand-designed broken ring courses, broad planes, narrow undercuts.

        Radius shoulders and offset strata produce geometry relief, never an
        icosphere; seam values denote fracture material, not directional shade.
        """
        r=self.rand;center=Vector(center);w,h,d=size;start=len(self.v);first_face=len(self.f)
        if levels==7:
            heights=[0,.08,.28,.46,.56,.87,1]
            radii=[.71,.92,1,.97,.89,.82,.57]
        else:
            heights=[0,.10,.49,.87,1];radii=[.72,1,.96,.84,.54]
        angles=[j*math.tau/sides+r.uniform(-.045,.045)+phase for j in range(sides)]
        outline=[1+r.uniform(-.13,.10) for j in range(sides)]
        ringcenters=[]
        for k,t in enumerate(heights):
            shear=Vector((math.sin(k*.8+phase)*w*.035,0,math.cos(k*1.2+phase)*d*.035))
            ringcenters.append(center+Vector((shear.x,t*h,shear.z)))
            for j,a in enumerate(angles):
                rr=radii[k]*outline[j]*(1+.065*math.sin(j*1.7+k*.73)+.03*math.sin(j*3.1+k*2))
                # Offset high fracture corners without subdividing into noise.
                y=t*h+(0 if k==0 else h*.032*math.sin(j*2.1+phase+k*.45))
                x=math.cos(a)*w*.5*rr;z=math.sin(a)*d*.5*rr
                self.v.append(center+Vector((x+shear.x,y,z+shear.z)))
        for k in range(levels-1):
            for j in range(sides):
                a=start+k*sides+j;b=start+k*sides+(j+1)%sides
                q=(a,a+sides,b+sides,b)
                # Muted earthy rock; cooler mineral faces and thin recess courses.
                value=.43+r.uniform(-.19,.19)+.16*math.sin(j*1.8+phase)
                col=mix('#5e6a64','#a3957c',value)
                if k==3 and math.sin(j*.83+phase)>.35: col=mix('#586359','#7e8172',r.uniform(.1,.6))
                if k==0: col*=.88
                tris=[(q[0],q[1],q[2]),(q[0],q[2],q[3])] if (k+j)%2 else [(q[0],q[1],q[3]),(q[1],q[2],q[3])]
                for tri in tris:
                    self.face(tri,col*(1+r.uniform(-.035,.035)))
        # Caps triangulate around an off-center crown. Stone remains closed.
        s=len(self.v);self.v.extend([center,ringcenters[-1]+Vector((w*.025,h*.025,-d*.04))])
        for j in range(sides):
            self.face((s,start+j,start+(j+1)%sides),mix('#5b625b','#77786a',.4))
            a=start+(levels-1)*sides+j;b=start+(levels-1)*sides+(j+1)%sides
            tri=(s+1,b,a);col=mix('#858779','#a49b83',r.uniform(.20,.63))
            self.face(tri,col)
        # Coherent cushions cross top fracture triangles and hug their relief.
        rock_faces=self.f[first_face:]
        def height(x,z):
            found=[]
            for face in rock_faces:
                a,b,c=[self.v[i] for i in face]
                den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z)
                if abs(den)<1e-12:continue
                u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den
                v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den
                if min(u,v,1-u-v)>=-1e-6:found.append(u*a.y+v*b.y+(1-u-v)*c.y)
            return max(found) if found else center.y+h*.8
        for patch in range(round(moss*4)):
            cx=center.x+w*r.uniform(-.19,.19);cz=center.z+d*r.uniform(-.19,.19)
            rx=w*r.uniform(.095,.18);rz=d*r.uniform(.10,.19);angle=r.uniform(0,math.tau)
            begin=len(self.v);self.v.append(Vector((cx,height(cx,cz)+.009,cz)))
            for j in range(12):
                a=j*math.tau/12;rad=1+.19*math.sin(a*3+patch)+r.uniform(-.07,.07)
                dx=math.cos(a)*rx*rad;dz=math.sin(a)*rz*rad
                x=cx+dx*math.cos(angle)-dz*math.sin(angle);z=cz+dx*math.sin(angle)+dz*math.cos(angle)
                self.v.append(Vector((x,height(x,z)+.008,z)))
            for j in range(12):self.face((begin,begin+1+(j+1)%12,begin+1+j),mix('#465536','#718146',r.uniform(.12,.62)),1)
    def normalize(self, dimensions):
        lo=Vector([min(v[i] for v in self.v) for i in range(3)])
        hi=Vector([max(v[i] for v in self.v) for i in range(3)])
        mid=(lo+hi)/2
        for j,p in enumerate(self.v):
            self.v[j]=Vector(((p.x-mid.x)/(hi.x-lo.x)*dimensions[0],(p.y-lo.y)/(hi.y-lo.y)*dimensions[1],(p.z-mid.z)/(hi.z-lo.z)*dimensions[2]))
    def object(self):
        data=bpy.data.meshes.new('valley-authored-rock-geometry');data.from_pydata([xyz(v) for v in self.v],[],self.f);data.update()
        if data.validate(verbose=False):raise RuntimeError('Geometry needed repair')
        ob=bpy.data.objects.new('weathered-stone-and-moss',data);bpy.context.collection.objects.link(ob)
        data.materials.append(material('valley-mineral-rough',.94));data.materials.append(material('valley-moss-rough',.99))
        attr=data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
        for poly,color,mi in zip(data.polygons,self.colors,self.mats):
            poly.material_index=mi
            for loop in poly.loop_indices:attr.data[loop].color=color
        return ob

def build(name):
    s=Sculpture({'cliff-ledge':71401,'boulder':71402,'scree':71403}[name])
    if name=='cliff-ledge':
        # Interlocking broad strata, stepped front ledges and recessed shoulders.
        s.stone((-.88,0,-.1),(1.22,1.60,1.02),12,7,.68,.14)
        s.stone((.18,.02,-.19),(1.47,1.92,.91),13,7,.6,.25)
        s.stone((1.08,0,-.04),(.95,1.42,.97),11,7,.55,-.1)
        s.stone((-.66,.14,.39),(1.72,.55,.67),11,5,.52,.09)
        s.stone((.67,.43,.30),(1.48,.61,.70),11,5,.40,.4)
        s.stone((-.14,1.08,.12),(1.56,.37,.76),12,5,.48,.25)
        s.stone((-1.22,0,.37),(.52,.39,.53),8,5,.26,1)
        s.stone((1.34,0,.37),(.48,.33,.46),8,5,.26,2)
    elif name=='boulder':
        s.stone((0,0,0),(1.2,.9,1),18,7,.68,.17)
        # Small lodged chips break the foot, without a competing main mass.
        s.stone((-.40,0,.28),(.27,.18,.26),8,5,.1,.1)
        s.stone((.40,0,.15),(.23,.13,.2),7,5,.12,.3)
    else:
        # A composed dry stream-gravel fan: broad stones anchor varied chips.
        r=s.rand
        for i in range(24):
            a=i*2.399963;radius=math.sqrt((i+.25)/24)
            x=math.cos(a)*radius*.79;z=math.sin(a)*radius*.40
            if i<5:w=r.uniform(.34,.47);h=r.uniform(.18,.29)
            else:w=r.uniform(.12,.28);h=r.uniform(.07,.16)
            s.stone((x,0,z),(w,h,w*r.uniform(.65,.95)),7 if i<5 else 6,5,.16 if i<3 else .08,a)
        # Dry gravel has warmer mineral content than the cliff kit.
        s.colors=[(*Vector(c[:3]).lerp(linear('#9b8769'),.24),c[3]) if mi==0 else c for c,mi in zip(s.colors,s.mats)]
    s.normalize(DIMENSIONS[name]);ob=s.object()
    root=bpy.data.objects.new('asset',None);bpy.context.collection.objects.link(root);ob.parent=root
    return root,ob

def save(name):
    clear();root,ob=build(name);scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
    root['asset_revision']=REV;root['author']='Coop Chaos original project-authored geometry';root['units']='meters'
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/('valley-'+name+'.blend')),check_existing=False)
    bpy.ops.object.select_all(action='DESELECT');root.select_set(True);ob.select_set(True)
    file=OUT/('valley-'+name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
    return {'revision':REV,'file':str(file.relative_to(ROOT)),'source':'assets/sculpted/landscape/valley-'+name+'.blend','sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bytes':file.stat().st_size,'dimensions':DIMENSIONS[name],'triangles':sum(len(p.vertices)-2 for p in ob.data.polygons),'vertices':len(ob.data.vertices),'materials':['valley-mineral-rough','valley-moss-rough'],'nodes':['asset','weathered-stone-and-moss']}

def text(body,at,size):
    curve=bpy.data.curves.new('STUDIO-label','FONT');curve.body=body;curve.size=size;curve.align_x='CENTER'
    ob=bpy.data.objects.new('STUDIO-label',curve);bpy.context.collection.objects.link(ob);ob.location=at
    ob.rotation_euler=(math.radians(64),0,0)
    m=bpy.data.materials.get('STUDIO-text') or bpy.data.materials.new('STUDIO-text');m.diffuse_color=(.12,.16,.13,1);ob.data.materials.append(m)

def proof():
    clear();layout=[('cliff-ledge',(-2.15,0,0),1),('boulder',(1.15,0,.20),1.4),('scree',(3.25,0,.20),1.1)]
    for name,at,scale in layout:
        root,ob=build(name);root.location=xyz(at);root.scale=(scale,scale,scale)
        text(name.replace('-',' ').upper(),(at[0],-1.21,.035),.135)
    text('VALLEY STONE  /  ORIGINAL AUTHORED KIT',(.4,.85,2.5),.20)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));floor=bpy.context.object;floor.name='STUDIO floor'
    m=bpy.data.materials.new('STUDIO warm stone');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.36,.37,.32,1);p.inputs['Roughness'].default_value=1;floor.data.materials.append(m)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
    scene.world.color=(.32,.36,.42)
    for name,at,power,size in [('key',(-4,-6,9),1250,6),('fill',(5,-1,5),500,5),('rim',(0,5,8),800,5)]:
        data=bpy.data.lights.new('STUDIO '+name,'AREA');data.energy=power;data.shape='DISK';data.size=size;ob=bpy.data.objects.new('STUDIO '+name,data);scene.collection.objects.link(ob);ob.location=at;ob.rotation_euler=(Vector((0,0,.7))-ob.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('STUDIO camera');cam=bpy.data.objects.new('STUDIO camera',data);scene.collection.objects.link(cam);cam.location=(6,-12,8.2);cam.rotation_euler=(Vector((.2,0,.8))-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=9.4;scene.camera=cam
    scene.view_settings.view_transform='AgX';scene.render.resolution_x=1800;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(SOURCE/(REV+'-contact-sheet.png'))
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(REV+'-studio.blend')),check_existing=False);bpy.ops.render.render(write_still=True)

if __name__=='__main__':
    bpy.context.preferences.filepaths.save_version=0
    parser=argparse.ArgumentParser();parser.add_argument('--no-render',action='store_true');parser.add_argument('--proof-only',action='store_true');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if not args.proof_only:
        result={name:save(name) for name in DIMENSIONS};(SOURCE/'qualification.json').write_text(json.dumps(result,indent=2)+'\n');print('LANDSCAPE_READY '+json.dumps(result))
    if not args.no_render:proof()
