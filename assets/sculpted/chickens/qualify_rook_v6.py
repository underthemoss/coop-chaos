import bpy,os,json,hashlib,struct,math
from pathlib import Path
base=Path(__file__).resolve().parent
root=base.parents[2]
def collect(path):
 bpy.ops.wm.open_mainfile(filepath=str(path))
 return {o.name:dict(vertices=[tuple(v.co) for v in o.data.vertices],polygons=sorted(tuple(sorted(p.vertices)) for p in o.data.polygons),materials=[p.material_index for p in o.data.polygons],location=tuple(o.location),rotation=tuple(o.rotation_euler),scale=tuple(o.scale)) for o in bpy.context.scene.objects if o.type=='MESH' and not o.name.startswith('STUDIO')}
old=collect(base/'rook-v5.blend');new=collect(base/'rook.blend')
assert old.keys()==new.keys()
unchanged=[name for name in old if old[name]==new[name]]
print('DIFFERENCES '+json.dumps({name:{k:sum(x!=y for x,y in zip(old[name][k],new[name][k])) if isinstance(old[name][k],list) else (old[name][k],new[name][k]) for k in old[name] if old[name][k]!=new[name][k]} for name in old if old[name]!=new[name]}))
assert set(old)-set(unchanged)=={'body sculpted mesh'}
a=old['body sculpted mesh'];b=new['body sculpted mesh']
assert a['polygons']==b['polygons'] and a['materials']==b['materials']
changed=sum(x!=y for x,y in zip(a['vertices'],b['vertices']))
assert changed==468,changed
raw=(root/'public/assets/characters/rook.glb').read_bytes();size=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+size]);report=json.loads((base/'rook-export-v6.json').read_text())
assert struct.unpack_from('<I',raw,8)[0]==len(raw)
names=[n.get('name','') for n in doc['nodes']]
assert all(n in names for n in ['asset','body','head','wing','far-wing','leg-left','leg-right'])
assert not any('STUDIO' in n for n in names) and not report['externalResources']
clips={a['name']:len(a['channels']) for a in doc['animations']}
assert set(clips)=={'idle','walk','gather','carry','weave','flight'} and all(n==18 for n in clips.values())
assert abs(report['boundsGame']['min'][1])<1e-6
for a in doc['accessors']:
 for key in ['min','max']:assert all(math.isfinite(v) for v in a.get(key,[]))
prior=json.loads((base/'qualification-v5.json').read_text());unchanged_birds=[]
for bird in prior:
 if bird['id']=='rook':continue
 assert hashlib.sha256((root/'public/assets/characters'/(bird['id']+'.glb')).read_bytes()).hexdigest()==bird['sha256']
 unchanged_birds.append(bird['id'])
result=dict(state='READY',revision='rook-v6',sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),triangles=report['triangleCount'],meshes=report['meshCount'],materials=report['materialCount'],bounds=report['boundsGame'],clipChannels=clips,unchangedMeshes=unchanged,changedSickleVertices=changed,unchangedOtherBirdGLBs=unchanged_birds,checks=['Blender source geometry comparison: only 468 sickle vertices changed; topology and material assignments identical','GLB length, finite accessor bounds, required hooks, six clips with18channels, soleY0, no studio or external resources','SHA256 comparison preserves Fern, Dapple and Wren v5 exports'])
(base/'qualification-rook-v6.json').write_text(json.dumps(result,indent=2));print('QUALIFICATION '+json.dumps(result))
