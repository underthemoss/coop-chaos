"""Compare current source with retained v3 studio source, excluding material fields."""
import bpy,json,hashlib,struct
from pathlib import Path
S=Path(__file__).resolve().parent
names=('living-wood','crown-foliage','study-structure-decks','study-structure-supports','study-structure-rails-ladders','study-structure-woven-hood-basket','study-structure-lashings-hoist')
def signatures(path):
 bpy.ops.wm.open_mainfile(filepath=str(path));out={}
 for name in names:
  ob=bpy.data.objects[name];m=ob.data;m.calc_loop_triangles();positions=b''.join(struct.pack('<3f',*v.co) for v in m.vertices);indices=b''.join(struct.pack('<3I',*t.vertices) for t in m.loop_triangles)
  out[name]={'position_sha256':hashlib.sha256(positions).hexdigest(),'triangle_index_sha256':hashlib.sha256(indices).hexdigest(),'vertices':len(m.vertices),'triangles':len(m.loop_triangles)}
 return out
v3=signatures(S/'longbough-habitation-v3-studio.blend');v4=signatures(S/'longbough-habitation-study.blend');same=v3==v4
r={'state':'PASS' if same else 'FAIL','reference':'longbough-habitation-v3-studio.blend','current':'longbough-habitation-study.blend','scope':'All seven native source mesh vertex positions and tessellated triangle indices; material fields intentionally excluded. Local mesh coordinates correspond under unchanged Blender/glTF axis conversion.','geometry_identical':same,'v3':v3,'v4':v4}
(S/'habitation-geometry-equivalence.json').write_text(json.dumps(r,indent=2)+'\n');assert same;print('HABITATION_GEOMETRY_EQUIVALENCE PASS')
