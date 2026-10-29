"""Actual-byte checks for the isolated Longbough habitation visual prototype."""
import sys,json,math,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from validate import decode,bounds
S=Path(__file__).resolve().parent;ROOT=S.parents[2];file=ROOT/'public/assets/environment/studies/longbough-habitation-study.glb'
g,access,raw=decode(file);expected={'living-wood','crown-foliage','study-structure-decks','study-structure-supports','study-structure-rails-ladders','study-structure-woven-hood-basket','study-structure-lashings-hoist'}
assert {n['name'] for n in g['nodes']}==expected|{'asset'}
assert not any(g.get(k) for k in ('cameras','animations','skins'));assert 'KHR_lights_punctual' not in g.get('extensions',{})
assert len(g['materials'])==7 and len(g.get('images',[]))==2
assert all('uri' not in o for o in g.get('buffers',[])+g.get('images',[]));assert all(im['mimeType']=='image/png' and 'bufferView' in im for im in g['images'])
for m in g['materials']:
 assert m.get('alphaMode','OPAQUE')=='OPAQUE';p=m['pbrMetallicRoughness'];assert p.get('metallicFactor',1)==0 and p['roughnessFactor']>=.9
 if m['name']=='habitation-bark-original-texture':assert 'baseColorTexture' in p and 'normalTexture' in m
for n in g['nodes']:assert n.get('translation',[0,0,0])==[0,0,0] and n.get('rotation',[0,0,0,1])==[0,0,0,1] and n.get('scale',[1,1,1])==[1,1,1]
result={};points=[];total=0
for node in g['nodes']:
 if 'mesh' not in node:continue
 mesh=g['meshes'][node['mesh']];assert len(mesh['primitives'])==1;p=mesh['primitives'][0];a=p['attributes'];assert all(k in a for k in ('POSITION','NORMAL','COLOR_0'))
 if node['name']=='living-wood':assert 'TEXCOORD_0' in a
 pos=access(a['POSITION']);norm=access(a['NORMAL']);cols=access(a['COLOR_0']);color_access=g['accessors'][a['COLOR_0']]
 if color_access.get('normalized'):
  divisor={5121:255,5123:65535}[color_access['componentType']];cols=[tuple(v/divisor for v in c) for c in cols]
 ix=[i[0] for i in access(p['indices'])];assert len(ix)%3==0 and all(0<=i<len(pos) for i in ix);assert all(math.isfinite(v) for arr in (pos,norm,cols) for pnt in arr for v in pnt);assert all(abs(sum(v*v for v in n)-1)<.0002 for n in norm)
 smallest=1e10;volume=0
 for i in range(0,len(ix),3):
  aa,b,c=[pos[j] for j in ix[i:i+3]];u=[b[j]-aa[j] for j in range(3)];v=[c[j]-aa[j] for j in range(3)];cross=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);area=math.sqrt(sum(x*x for x in cross))*.5;assert area>1e-12,(node['name'],i,area);smallest=min(smallest,area);volume+=(aa[0]*(b[1]*c[2]-b[2]*c[1])+aa[1]*(b[2]*c[0]-b[0]*c[2])+aa[2]*(b[0]*c[1]-b[1]*c[0]))/6
 result[node['name']]={'triangles':len(ix)//3,'exported_vertices':len(pos),'bounds':bounds(pos),'minimum_triangle_area':smallest,'signed_volume':volume,'linear_color_min':[min(c[k] for c in cols) for k in range(3)],'linear_color_max':[max(c[k] for c in cols) for k in range(3)]}
 if node['name']=='living-wood':assert volume>0;result[node['name']]['low_y_le_1m_bounds']=bounds([p for p in pos if p[1]<=1])
 points.extend(pos);total+=len(ix)//3
assert 60000<total<125000;assert -.85<min(p[1] for p in points)<0
q=json.loads((S/'habitation-qualification.json').read_text());assert q['sha256']==hashlib.sha256(raw).hexdigest()
out={'state':'PASS','revision':q['revision'],'file':str(file.relative_to(ROOT)),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'bounds':bounds(points),'triangles':total,'draw_primitives':7,'groups':result,'embedded_original_pngs':g['images'],'checks':['glTF2 embedded binary','Exact root/group/material names and unit transforms','Opaque rough nonmetal PBR','Wood has original embedded albedo/normal textures and TEXCOORD_0','Finite indexed geometry and unit normals','No degenerate triangles; positive wood signed volume','No external resources, animation, skin, camera or lights']}
(S/'habitation-gltf-checks.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
