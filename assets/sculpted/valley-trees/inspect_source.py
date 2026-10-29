"""Blender source inspection and rendered-camera contact sheet; no GLB writes."""
import bpy,json,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
SOURCE=Path(__file__).resolve().parent
name=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'longbough'
revision=json.loads((SOURCE/(name+'-qualification.json')).read_text())['revision']
bpy.ops.wm.open_mainfile(filepath=str(SOURCE/(name+'-study.blend')))
def xyz(p):return Vector((p[0],-p[2],p[1]))
result={'revision':revision,'source':name+'-study.blend','probe_contract':'Render-only vertical rays from Y=.01; X[-1.25,1.25] step.25, Z[1.5,3] step.25. Samples are art-clearance evidence, not a traversal/capacity contract.','anatomical_ground_y':0,'meshes':{}}
for meshname in ('living-wood','crown-foliage'):
    ob=bpy.data.objects[meshname];tree=BVHTree.FromObject(ob,bpy.context.evaluated_depsgraph_get());heights=[];openrays=0
    for i in range(11):
        for j in range(7):
            hit,norm,index,distance=tree.ray_cast(xyz((-1.25+i*.25,.01,1.5+j*.25)),xyz((0,1,0)))
            if hit is None:openrays+=1
            else:heights.append(hit.z)
    result['meshes'][meshname]={'rays':77,'unobstructed_rays':openrays,'minimum_overhead_hit_y':min(heights) if heights else None,'maximum_overhead_hit_y':max(heights) if heights else None}
(SOURCE/(name+'-source-inspection.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
images=[]
for view in ('front','strategy','branches'):
    file=SOURCE/(name+'-'+revision+'-'+view+'.png')
    if not file.is_file():raise RuntimeError('Render still missing '+str(file))
    image=bpy.data.images.load(str(file));image.scale(800,686);images.append(image)
w=2400;h=686;pixels=[0.0]*(w*h*4)
for i,image in enumerate(images):
    data=list(image.pixels)
    for row in range(h):
        start=(row*w+i*800)*4;pixels[start:start+3200]=data[row*3200:(row+1)*3200]
out=bpy.data.images.new(name+' contact sheet',width=w,height=h,alpha=True);out.pixels.foreach_set(pixels);out.filepath_raw=str(SOURCE/(name+'-'+revision+'-contact-sheet.png'));out.file_format='PNG';out.save()
