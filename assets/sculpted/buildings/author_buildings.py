"""Original bound-reed habitation family; Blender 4.5 LTS, true game metres.

All vertices are authored here. Painted reed color is the original generated
source documented in reed-material-provenance.json. No concept pixels embedded.
"""
import bpy
import json
import math
import random
import sys
from pathlib import Path
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path(__file__).resolve().parent
OUT = ROOT / 'public/assets/environment/buildings'
REVISION = 'bound-reed-family-v1'
RNG = random.Random(713049)


def xyz(p):
    return Vector((p[0], -p[2], p[1]))


def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


def color(h):
    return tuple(linear(int(h[i:i+2], 16) / 255) for i in (1, 3, 5)) + (1,)


class Part:
    def __init__(self, name):
        self.name, self.vertices, self.faces, self.uvs, self.materials = name, [], [], [], []

    def face(self, points, uv=None, material=0):
        first = len(self.vertices)
        self.vertices.extend([tuple(p) for p in points])
        self.faces.append(tuple(range(first, first+len(points))))
        self.uvs.append(uv or [(p[0] / .34, p[2] / .34) for p in points])
        self.materials.append(material)

    def tube(self, points, radius, sides=6, material=1, phase=0):
        points = [Vector(p) for p in points]
        radii = radius if isinstance(radius, list) else [radius] * len(points)
        rings, lengths = [], [0]
        for i, p in enumerate(points):
            if i:
                lengths.append(lengths[-1] + (p-points[i-1]).length)
            tangent = (points[min(i+1, len(points)-1)]-points[max(0, i-1)]).normalized()
            a = tangent.cross(Vector((0, 1, 0)) if abs(tangent.y) < .95 else Vector((1, 0, 0))).normalized()
            b = tangent.cross(a).normalized()
            rings.append([p+(math.cos(j/sides*math.tau+phase)*a+math.sin(j/sides*math.tau+phase)*b)*radii[i] for j in range(sides)])
        for i in range(len(points)-1):
            for j in range(sides):
                k = (j+1) % sides
                self.face([rings[i][j], rings[i][k], rings[i+1][k], rings[i+1][j]],
                          [(phase*.05+j/sides*.035, lengths[i]/.34), (phase*.05+(j+1)/sides*.035, lengths[i]/.34),
                           (phase*.05+(j+1)/sides*.035, lengths[i+1]/.34), (phase*.05+j/sides*.035, lengths[i+1]/.34)], material)
        self.face(list(reversed(rings[0])), material=material)
        self.face(rings[-1], material=material)

    def finish(self, mats, parent):
        data = bpy.data.meshes.new(self.name)
        data.from_pydata([xyz(p) for p in self.vertices], [], self.faces)
        data.update()
        # Complete geometry before creating custom-data layers. Reacquire by
        # name after creation; do not retain layer handles over mesh mutation.
        data.uv_layers.new(name='UVMap')
        for poly, uv, material in zip(data.polygons, self.uvs, self.materials):
            poly.material_index = material
            for loop, co in zip(poly.loop_indices, uv):
                data.uv_layers['UVMap'].data[loop].uv = co
        ob = bpy.data.objects.new(self.name, data)
        bpy.context.collection.objects.link(ob)
        ob.parent = parent
        for mat in mats:
            data.materials.append(mat)
        return ob


def materials():
    answer = []
    for name, h in [('painted flattened reed weave', '#ffffff'), ('pale bound reed bundles', '#bda275'), ('darker flax lashings', '#796044')]:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        p = mat.node_tree.nodes.get('Principled BSDF')
        p.inputs['Base Color'].default_value = color(h)
        p.inputs['Roughness'].default_value = .94
        if len(answer) < 2:
            p.inputs['Base Color'].default_value = (1, 1, 1, 1)
            image = bpy.data.images.load(str(SOURCE/'reed-weave-v1-source.png'), check_existing=True)
            image.colorspace_settings.name = 'sRGB'
            image.pack()
            tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
            tex.image = image
            tex.extension = 'REPEAT'
            mat.node_tree.links.new(tex.outputs['Color'], p.inputs['Base Color'])
        answer.append(mat)
    return answer


def bundle(part, points, radius=.045, material=1, count=5):
    # Several small round stems and constraining bands, never a solid plank.
    tangent = (Vector(points[-1])-Vector(points[0])).normalized()
    a = tangent.cross(Vector((0, 1, 0)) if abs(tangent.y) < .95 else Vector((1, 0, 0))).normalized()
    b = tangent.cross(a).normalized()
    for j in range(count):
        angle = j/count*math.tau
        offset = (math.cos(angle)*a+math.sin(angle)*b)*radius*.52
        part.tube([Vector(p)+offset for p in points], radius*.36, 5, material, j*.31)


def lash(part, at, axis='z', radius=.065, turns=4):
    turns = min(turns, 3)
    for k in range(turns):
        pts = []
        for j in range(9):
            a = j/8*math.tau
            if axis == 'z':
                p = (at[0]+math.cos(a)*radius, at[1]+math.sin(a)*radius, at[2]+(k-(turns-1)/2)*.014)
            else:
                p = (at[0]+(k-(turns-1)/2)*.014, at[1]+math.cos(a)*radius, at[2]+math.sin(a)*radius)
            pts.append(p)
        part.tube(pts, .007, 4, 2)


def oval_panel(part, center, width, depth, y, thickness=.035, seed=0, roundness=1, surface_only=False, arrival_notch=False):
    # A continuous woven mat with a crooked oval perimeter. Individual bundled
    # edges and sparse reinforcing stems provide physical silhouette relief.
    ring = []
    for j in range(48):
        a = j/48*math.tau
        r = 1+.008*math.sin(a*5+.5*seed)+.006*math.sin(a*9+seed)
        ca, sa = math.cos(a), math.sin(a)
        ring.append((center[0]+math.copysign(abs(ca)**roundness, ca)*width*.5*r, y, center[2]+math.copysign(abs(sa)**roundness, sa)*depth*.5*r))
    if arrival_notch:
        # A true open arrival slot, separate from the useful sleeping mats.
        index = min((j for j in range(len(ring)) if ring[j][2]<center[2]-depth*.25), key=lambda j: abs(ring[j][0]-center[0]))
        p, q, r = ring[(index-1)%len(ring)], ring[index], ring[(index+1)%len(ring)]
        def edge_z(a,b,x): return a[2]+(b[2]-a[2])*(x-a[0])/(b[0]-a[0])
        ring[index:index+1] = [(-.20,y,edge_z(p,q,-.20)),(-.20,y,-.82),(.20,y,-.82),(.20,y,edge_z(q,r,.20))]
    top_triangles = tessellate_polygon([[Vector(p) for p in ring]])
    for indices in top_triangles:
        tri = [Vector(ring[i]) for i in indices]
        part.face(list(reversed(tri)))
        if not surface_only:
            part.face([Vector((p.x,y-thickness,p.z)) for p in tri])
    for j, p in enumerate(ring):
        q = ring[(j+1) % len(ring)]
        if not surface_only:
            part.face([(p[0], y-thickness, p[2]), (q[0], y-thickness, q[2]), q, p], material=1)
    part.tube(ring+[ring[0]], .020, 6, 1)


def wing(part, center, width, depth, height, facing=-1, side=0, compact=False, support_y=None):
    """One swept folded wing: textured two-sided shell, fibers/ribs/bound lip.

    The rear heel curves down, the open mouth rises; no enclosed human room.
    Unequal center ridges and scalloped ends avoid a half-cylinder roof.
    """
    def surface(u, t):
        w = width*.5*(.76+.24*math.sin(math.pi*(.10+.78*t)))
        x = center[0]+u*w+.035*math.sin(math.pi*t)*(1-u*u)*(1 if side == 0 else -1)
        z = center[2]+facing*(t-.5)*depth
        h = height*(.35+.61*math.sin(math.pi*.72*t))
        h += height*(.10*(1-abs(u))-.10*abs(u)**1.8)*math.sin(math.pi*t)
        h += .025*math.sin(u*5+side)*t
        y = center[1]+h
        if compact and side == 0 and x < -1.035 and y < 3.30:
            x = -1.035
        return Vector((x, y, z))
    nu, nt = 18, 14
    for i in range(nu):
        for j in range(nt):
            params = [(i/nu*2-1, j/nt), ((i+1)/nu*2-1, j/nt), ((i+1)/nu*2-1, (j+1)/nt), (i/nu*2-1, (j+1)/nt)]
            pts = [surface(u, t) for u, t in params]
            uv = [((u+1)*width/2/.34+side*.37, t*depth/.34) for u, t in params]
            part.face(pts, uv)
            part.face([p-Vector((0, .022, 0)) for p in reversed(pts)], list(reversed(uv)))
    for u in [-1, 1]:
        pts = [surface(u, j/20) for j in range(21)]
        bundle(part, pts, .047, count=5)
    for t in [0, 1]:
        pts = [surface(j/24*2-1, t) for j in range(25)]
        bundle(part, pts, .040, count=5)
    for k, t in enumerate([.08, .25, .45, .64, .81, .96]):
        pts = [surface(j/18*2-1, t)+Vector((0, .014, 0)) for j in range(19)]
        part.tube(pts, .009 if k%2 else .012, 5, 2 if k in [0, 5] else 1)
    for i in range(15):
        u = (i/14*2-1)*.97
        pts = [surface(u, j/10)+Vector((0, .010, 0)) for j in range(11)]
        part.tube(pts, [.0065]*10+[.0045], 4, 1)
    # Short frayed lip ends remain grouped; no dense invisible strand mesh.
    for i in range(20):
        u = (i/19*2-1)*.98
        p = surface(u, 1)
        end = p+Vector((.008*math.sin(i*2), -.018-.016*(i%3), facing*(.035+.012*(i%4))))
        part.tube([p, end], [.008, .003], 4, 1)
    for u in [-.85, .85]:
        heel = surface(u, .05)
        foot = Vector((heel.x, ((2.25 if compact else center[1])-.02) if support_y is None else support_y, heel.z-facing*.025))
        if compact:
            foot.x = max(-.94, min(.94, foot.x))
            foot.z -= .10
        # Compact supports live behind bodies, never across the transit notch.
        bundle(part, [foot, heel], .035, count=4)
        lash(part, heel, radius=.034, turns=3)
    # Curved woven return supplies shelter mass. The compact host's right
    # transit side and left cargo-cleft side remain open; only its rear folds
    # descend. The large host can carry a full unequal outer cheek.
    def curtain(top_points, bottom_points):
        for i in range(len(top_points)-1):
            for j in range(5):
                t0, t1 = j/5, (j+1)/5
                def p(k, t):
                    return bottom_points[k].lerp(top_points[k], t)+Vector((0, 0, -facing*.035*math.sin(t*math.pi)))
                pts = [p(i, t0), p(i+1, t0), p(i+1, t1), p(i, t1)]
                uv = [(i*.07/.34, t0*height/.34), ((i+1)*.07/.34, t0*height/.34), ((i+1)*.07/.34, t1*height/.34), (i*.07/.34, t1*height/.34)]
                part.face(pts, uv)
                part.face(list(reversed([v+Vector((0, 0, facing*.015)) for v in pts])), list(reversed(uv)))
        bundle(part, bottom_points, .034, count=5)
        for i in range(0, len(top_points), 3):
            bundle(part, [bottom_points[i], bottom_points[i].lerp(top_points[i], .5), top_points[i]], .023, count=3)
            lash(part, top_points[i], radius=.035, turns=3)
    back_us = [(-1+i/16*2) for i in range(17)]
    if compact and side == 1:
        back_us = [-1+i/16*1.58 for i in range(17)]
    top = [surface(u, 0) for u in back_us]
    bottom = [Vector((p.x, (2.25 if compact else center[1])+.11+.025*math.sin(i*.6), p.z-facing*.035)) for i, p in enumerate(top)]
    curtain(top, bottom)
    if not compact:
        outer = -1 if side == 0 else 1
        top = [surface(outer, i/16*.70) for i in range(17)]
        bottom = []
        for i, p in enumerate(top):
            t = i/16
            h = center[1]+.14+(p.y-center[1]-.155)*t**1.5
            bottom.append(Vector((p.x+outer*.015*math.sin(t*math.pi), h, p.z)))
        curtain(top, bottom)
    return surface


def setup():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for collection in [bpy.data.meshes, bpy.data.materials]:
        for block in list(collection):
            collection.remove(block)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1
    parent = bpy.data.objects.new('asset', None)
    bpy.context.collection.objects.link(parent)
    return parent, materials()


def boughhome():
    root, mats = setup()
    deck = Part('deck')
    oval_panel(deck, (0, 2.25, -.54), 2.04, 1.39, 2.25, .042, 1, .5, arrival_notch=True)
    # Broad compact mat stays clear of the live basket shaft to the left.
    for z in [-1.02, -.72, -.40, -.10]:
        if z < -.82:
            for a,b in [(-1.0,-.25),(.25,1.03)]:
                bundle(deck, [(a,2.17,z),(b,2.17,z)],.043,count=5)
        else:
            bundle(deck, [(-1.0, 2.17, z), (0, 2.15, z-.025), (1.03, 2.17, z)], .043, count=5)
    for x in [-.84, .84]:
        for z in [-.98, -.08]:
            lash(deck, (x, 2.175, z), axis='x', radius=.052, turns=4)
        # A thin woven mat shares the exact standing plane; its small bolster
        # stays behind the standing body rather than raising the saved feet.
        oval_panel(deck, (x, 2.2505, -.53), .40, .91, 2.2505, .008, int(x*20), surface_only=True)
        bundle(deck, [(x-.20, 2.285, -1.00), (x, 2.29, -1.01), (x+.20, 2.285, -1.00)], .027, count=5)
    # Low side/rear bound rims, with an entirely open front and right transit.
    for side in [-1, 1]:
        pts = [(side*1.015, 2.30+.025*math.sin(t*math.pi), -.96+t*.97) for t in [0, .2, .4, .6, .8, 1]]
        bundle(deck, pts, .028, count=3)
    left = Part('rainhood-left')
    right = Part('rainhood-right')
    wing(left, (-.70, 2.25, -.54), .84, 1.10, 1.43, -1, 0, True)
    wing(right, (.73, 2.85, -.52), .79, 1.02, 1.30, -1, 1, True)
    ladder = Part('ladder')
    for x in [-.285, .285]:
        bundle(ladder, [(x, .045, -1.08), (x+.008, 1.12, -1.08), (x, 2.22, -1.08)], .036, count=5)
    for j in range(10):
        y = .17+j*.224
        for side in [-1, 1]:
            bundle(ladder, [(side*.30, y, -1.08), (side*.21, y+.004, -.96), (side*.15, y+.006, -.89)], .024, count=3)
        for x in [-.285, .285]:
            lash(ladder, (x, y, -1.08), axis='x', radius=.035, turns=3)
    return root, [p.finish(mats, root) for p in [deck, left, right, ladder]]


def reed_store():
    root, mats = setup()
    base, frame, container = Part('store-base-bindings'), Part('store-frame'), Part('store-container-finish')
    oval_panel(base, (0, .04, 0), 1.72, 1.42, .04, .035, 3)
    # The one open inventory bay stays empty; actual saved bundles fill it.
    for j in range(26):
        a = j/25*math.pi*1.55-.28
        x, z = math.cos(a)*.80, math.sin(a)*.65
        h = .42+.10*math.sin(a+.3)
        bundle(frame, [(x, .02, z), (x*.99, h*.55, z*.99), (x*.98, h, z*.98)], .023, count=3)
    for k in range(12):
        y = .08+k*.033
        pts = []
        for j in range(47):
            a = j/46*math.pi*1.55-.28
            pts.append((math.cos(a)*(.80+.008*math.sin(j*math.pi+k)), y, math.sin(a)*(.65+.008*math.cos(j*math.pi+k))))
        container.tube(pts, .014, 5, 1 if k%4 else 2)
    for yy in [.07, .47]:
        pts = [(math.cos(a)*.81, yy+.025*math.sin(a), math.sin(a)*.66) for a in [j/48*math.tau for j in range(49)]]
        bundle(container, pts, .031, count=3)
    # Quiet high rear splash panel, folded aside from the receiving mouth.
    for side in [-1, 1]:
        x = side*.69
        bundle(frame, [(x, .08, .39), (x, .62, .47)], .033, count=4)
        lash(frame, (x, .38, .43), radius=.040, turns=4)
    for j in range(16):
        x0 = -.68+j*.085
        pts = [(x0, .30, .48), (x0+.01, .61+.025*math.sin(j), .49)]
        container.tube(pts, .017, 5, 1)
    for y in [.35, .46, .58]:
        container.tube([(-.70, y, .49), (0, y+.015, .51), (.70, y-.008, .49)], .012, 5, 2)
    return root, [p.finish(mats, root) for p in [base, frame, container]]


def root_nursery():
    root, mats = setup()
    base, frame, hood, nest = Part('nursery-base-floor-bindings'), Part('nursery-frame'), Part('nursery-hood-finish'), Part('nursery-nest-finish')
    oval_panel(base, (0, .055, -.04), 1.42, 1.37, .055, .035, 5)
    # Low, shallow dependent cradle; not an adult household or extra resource.
    for k in range(5):
        pts = [(math.cos(a)*(.59+.008*k), .075+k*.024, .08+math.sin(a)*.43) for a in [j/36*math.pi for j in range(37)]]
        base.tube(pts, .016, 5, 1 if k%3 else 2)
    for x in [-.63, .63]:
        bundle(frame, [(x, -.01, .32), (x, .56, .36), (x*.9, .90, .27)], .031, count=4)
        lash(frame, (x, .40, .34), radius=.036, turns=4)
    wing(hood, (-.25, .20, .10), .95, .92, 1.02, -1, 0, support_y=-.010)
    wing(hood, (.34, .18, .20), .77, .79, .92, -1, 1, support_y=-.010)
    # Exact old egg-display center is retained; renderer owns egg/food content.
    for k in range(4):
        pts = [(math.cos(a)*(.17+k*.012), .065+k*.015, -.58+math.sin(a)*(.14+k*.01)) for a in [j/28*math.tau for j in range(29)]]
        nest.tube(pts, .012, 5, 1 if k%2 else 2)
    return root, [p.finish(mats, root) for p in [base, frame, hood, nest]]


def longbough_modules():
    root, mats = setup()
    parts = []
    for name, center, width, depth, height, side in [
        ('study-structure-boughhome-wing-left', [-.26, 3.20, 2.44], 1.65, 1.45, 1.65, 0),
        ('study-structure-boughhome-wing-right', [2.24, 3.20, 1.90], 1.58, 1.45, 1.70, 1),
    ]:
        part = Part(name)
        wing(part, center, width, depth, height, 1, side)
        mat_z = center[2]-.18
        oval_panel(part, (center[0], center[1]+.006, mat_z), width*.65, depth*.58, center[1]+.006, .006, side+8)
        bundle(part, [(center[0]-width*.27, center[1]+.055, mat_z-depth*.27), (center[0], center[1]+.06, mat_z-depth*.28), (center[0]+width*.27, center[1]+.055, mat_z-depth*.27)], .045, count=5)
        parts.append(part.finish(mats, root))
    # No floor duplication: accepted living supports and existing terrace stay.
    return root, parts


BUILDERS = {'boughhome': boughhome, 'reed-store': reed_store, 'root-nursery': root_nursery,
            'boughhome-longbough-modules': longbough_modules}


def export(name):
    root, obs = BUILDERS[name]()
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.context.scene['revision'] = REVISION
    bpy.context.scene['asset_name'] = name
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    for ob in obs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/f'{name}.blend'))
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{name}.glb'), export_format='GLB', use_selection=True,
                              export_animations=False, export_yup=True, export_extras=True)
    print('BUILDING_EXPORTED', name)


if __name__ == '__main__':
    names = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else list(BUILDERS)
    for name in names:
        export(name)
