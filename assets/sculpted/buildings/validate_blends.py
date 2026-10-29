"""Reopen every editable source; validate geometry and packed image retention."""
import bpy,math,json,hashlib
from pathlib import Path
SOURCE=Path(__file__).resolve().parent
names=['boughhome','reed-store','root-nursery','boughhome-longbough-modules','sleeping-deck-compatible']
report={}
for name in names:
    path=SOURCE/f'{name}.blend'
    bpy.ops.wm.open_mainfile(filepath=str(path))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in meshes:
        assert all(math.isfinite(v) for p in o.data.vertices for v in p.co)
        for layer in o.data.uv_layers:
            assert all(math.isfinite(v) and abs(v)<1000 for p in layer.data for v in p.uv)
    images=[]
    for im in bpy.data.images:
        if im.packed_file:
            images.append({'name':im.name,'size':list(im.size),'sha256':hashlib.sha256(bytes(im.packed_file.data)).hexdigest()})
    if name!='sleeping-deck-compatible':
        assert any(p['sha256']==hashlib.sha256((SOURCE/'reed-weave-v1-source.png').read_bytes()).hexdigest() for p in images)
    report[name]={'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'meshCount':len(meshes),'meshes':[o.name for o in meshes],'packedImages':images,'finiteCoordinatesAndUVs':True}
(SOURCE/'editable-source-qualification.json').write_text(json.dumps(report,indent=2)+'\n')
print('EDITABLE_SOURCE_PASS',len(report))
