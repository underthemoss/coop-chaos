"""Original playable Longbough reed kit, driven by the content-owned JSON.

The living asset is extracted losslessly by extract_living.py. This source
authors only earned infrastructure: rounded woven bays, bound supports, open
climbing grips and a functional moving basket/rope hierarchy. No timber floor.
"""
import bpy
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
sys.path.insert(0, str(ROOT/'assets/sculpted/buildings'))
from author_buildings import Part, bundle, lash, wing, materials, xyz

CONTRACT = json.loads((ROOT/'src/content/valley-habitat.json').read_text())
P = CONTRACT['profile']
A = P['anchors']
OUT = ROOT/'public/assets/environment/valley'


def empty(name, position, parent=None):
    ob = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(ob)
    ob.location = xyz(position)
    ob.parent = parent
    return ob


def inside(p, poly):
    x, z = p
    result = False
    for a, b in zip(poly, poly[1:]+poly[:1]):
        if (a[1] > z) != (b[1] > z) and x < (b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:
            result = not result
    return result


def union_outline(polys, holes=()):
    """Split analytic polygon edges and retain exact union boundary segments."""
    all_polys = list(polys)+list(holes)
    edges = [(a, b) for poly in all_polys for a, b in zip(poly, poly[1:]+poly[:1])]
    boundary = []
    def filled(p):
        return any(inside(p, poly) for poly in polys) and not any(inside(p, poly) for poly in holes)
    for a, b in edges:
        dx, dz = b[0]-a[0], b[1]-a[1]
        ts = [0, 1]
        for c, d in edges:
            sx, sz = d[0]-c[0], d[1]-c[1]
            det = dx*sz-dz*sx
            if abs(det) < 1e-10:
                continue
            t = ((c[0]-a[0])*sz-(c[1]-a[1])*sx)/det
            u = ((c[0]-a[0])*dz-(c[1]-a[1])*dx)/det
            if 1e-9 < t < 1-1e-9 and -.0000001 <= u <= 1.0000001:
                ts.append(t)
        ts = sorted(set(round(t, 9) for t in ts))
        for t0, t1 in zip(ts, ts[1:]):
            if t1-t0 < 1e-8:
                continue
            start = (a[0]+dx*t0, a[1]+dz*t0)
            end = (a[0]+dx*t1, a[1]+dz*t1)
            mid = ((start[0]+end[0])/2, (start[1]+end[1])/2)
            scale = math.hypot(dx, dz)
            normal = (-dz/scale*.00001, dx/scale*.00001)
            left = filled((mid[0]+normal[0], mid[1]+normal[1]))
            right = filled((mid[0]-normal[0], mid[1]-normal[1]))
            if left != right:
                boundary.append((start, end) if left else (end, start))
    key = lambda p: (round(p[0], 6), round(p[1], 6))
    remaining = {key(a): (a, b) for a, b in boundary}
    start = sorted(remaining)[0]
    ring, cursor = [], start
    while cursor in remaining:
        a, b = remaining.pop(cursor)
        ring.append(a)
        cursor = key(b)
        if cursor == start:
            break
    assert cursor == start and not remaining, ('disconnected/invalid floor', len(remaining), cursor, remaining)
    return ring


def rectangle(x0, z0, x1, z1):
    return [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]


def bay_outline(bay):
    x, _, z = A[bay['anchor']]
    points = []
    # Rounded woven bays with broad supported heel corners for hood posts.
    for j in range(48):
        a = j/48*math.tau
        c, s = math.cos(a), math.sin(a)
        points.append((x+math.copysign(abs(c)**.62, c)*bay['width']/2,
                       z+math.copysign(abs(s)**.62, s)*bay['depth']/2))
    return points


def mat_floor(part, outline, y):
    ring = [Vector((x, y, z)) for x, z in outline]
    for tri in tessellate_polygon([ring]):
        points = [ring[i] for i in tri]
        part.face(list(reversed(points)))
        part.face([p-Vector((0, .055, 0)) for p in points])
    for a, b in zip(ring, ring[1:]+ring[:1]):
        part.face([a, b, b-Vector((0, .055, 0)), a-Vector((0, .055, 0))], material=1)
    # Raised perimeter stays below sole+0.08; central travel surface is flat.
    bundle(part, [tuple(p-Vector((0, .025, 0))) for p in ring+[ring[0]]], .028, count=3)


def finish(part, mats, root):
    # The original family uses two otherwise identical painted reed slots.
    # Collapse those here; semantic stage groups remain separate meshes.
    part.materials = [0 if index < 2 else 1 for index in part.materials]
    ob = part.finish([mats[0], mats[2]], root)
    ob['semantic_group'] = part.name
    return ob


def supports(name, outline, floor_y, endpoints, mats, root):
    part = Part(name)
    # Few large compression bundles visibly bear on living branch crotches.
    # Actual wood intersection/support is validated, not implied by an empty.
    for index, (wood, arrival) in enumerate(endpoints):
        middle = tuple((wood[k]+arrival[k])*.5 + (0.04 if k == 2 else 0) for k in range(3))
        bundle(part, [wood, middle, arrival], .075, count=6)
        lash(part, arrival, radius=.08)
        lash(part, wood, radius=.085)
    # Sparse bundled reed ribs under each useful bay, clipped by floor outline.
    for x in [min(p[0] for p in outline)+.2+i*.48 for i in range(12)]:
        hits = []
        for a, b in zip(outline, outline[1:]+outline[:1]):
            if (a[0] <= x < b[0]) or (b[0] <= x < a[0]):
                hits.append(a[1]+(x-a[0])/(b[0]-a[0])*(b[1]-a[1]))
        hits.sort()
        for lo, hi in zip(hits[::2], hits[1::2]):
            if hi-lo > .1:
                bundle(part, [(x, floor_y-.075, lo+.02), (x+.02, floor_y-.11, (lo+hi)/2),
                              (x, floor_y-.075, hi-.02)], .035, count=4)
    return finish(part, mats, root)


def ladder(name, start, top, mats, root):
    part = Part(name)
    a, b = Vector(start), Vector(top)
    forward = Vector((b.x-a.x, 0, b.z-a.z)).normalized()
    side_axis = Vector((forward.z, 0, -forward.x))
    # .80m between rail centres gives >.65m clear between bundles. Body plane
    # remains open; alternating offset grips replace torso-height cross-rods.
    for side in [-1, 1]:
        pts = [tuple(a.lerp(b, j/12)+side_axis*(side*.46)-forward*.36) for j in range(13)]
        bundle(part, pts, .045, count=4)
    for i in range(max(2, int((b.y-a.y)/.25))):
        t = (i+.3)/max(2, int((b.y-a.y)/.25))
        p = a.lerp(b, t)
        # Connected rear cross lashings stay behind a forward-facing body;
        # small grips extend towards feet without crossing the centre torso.
        for side in [-1, 1]:
            grip = [p+side_axis*(side*.46)-forward*.36+Vector((0,-.025,0)),
                    p+side_axis*(side*.35)-forward*.30,
                    p+side_axis*(side*.27)-forward*.24+Vector((0,.025,0))]
            bundle(part, grip, .026, count=3)
            if i % 2 == 0:
                lash(part, tuple(grip[0]), radius=.045)
    return finish(part, mats, root)


def kit():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1
    root = empty('asset', (0, 0, 0))
    mats = materials()
    obs = []
    lower = CONTRACT['authoring']['lowerBays']
    middle = CONTRACT['authoring']['middleBays']
    # The front strip forms one connected .65m circulation path. An open
    # arrival notch preserves the rising body plane before supported entry.
    lower_ring = union_outline([*[bay_outline(b) for b in lower], rectangle(-.26, 2.70, 2.95, 3.35)],
                               [rectangle(2.40, 3.25, 3.2, 3.7)])
    middle_ring = union_outline([*[bay_outline(b) for b in middle], rectangle(-1.22, 2.30, .95, 2.95)],
                                [rectangle(.30, 2.84, 1.05, 3.4)])
    floor_report = {}
    for name, outline, y in [('home-deck', lower_ring, A['home-entry'][1]),
                             ('middle-deck', middle_ring, A['deck-entry'][1])]:
        part = Part(name)
        mat_floor(part, outline, y)
        obs.append(finish(part, mats, root))
        area = abs(sum(a[0]*b[1]-b[0]*a[1] for a, b in zip(outline, outline[1:]+outline[:1])))*.5
        floor_report[name] = {'y': y, 'areaM2': area, 'outlineXZ': outline}
    # Living wood support contacts below the former static v8 terrace.
    obs.append(supports('home-support', lower_ring, 3.2,
                        CONTRACT['authoring']['supportConnections']['home'], mats, root))
    obs.append(supports('middle-support', middle_ring, 5.72,
                        CONTRACT['authoring']['supportConnections']['middle'], mats, root))
    for i, bay in enumerate(lower):
        part = Part('home-hood-'+('left' if i == 0 else 'right'))
        foot = A[bay['anchor']]
        # Same original folded-wing family, deeper enclosed heel and open face.
        wing(part, foot, bay['width']*.94, min(bay['depth']-.14, 1.45), bay['hoodHeight'],
             facing=1, side=i, support_y=foot[1]-.02)
        # A modest rear sleeping bolster uses bundled reeds, no extra capacity.
        bundle(part, [(foot[0]-.37, foot[1]+.045, foot[2]-.55),
                      (foot[0], foot[1]+.055, foot[2]-.57),
                      (foot[0]+.37, foot[1]+.045, foot[2]-.55)], .035, count=4)
        obs.append(finish(part, mats, root))
    rails = Part('middle-rails')
    # Unequal rear perimeter, open front for climbing and occupied faces.
    for bay in middle:
        x, y, z = A[bay['anchor']]
        pts = [(x+math.cos(a)*bay['width']*.48, y+.36+.025*math.sin(3*a), z+math.sin(a)*bay['depth']*.48)
               for a in [math.pi+i/12*math.pi for i in range(13)]]
        bundle(rails, pts, .025, count=3)
        for p in [pts[0], pts[6], pts[-1]]:
            bundle(rails, [(p[0], y-.015, p[2]), p], .025, count=3)
    obs.append(finish(rails, mats, root))
    obs.append(ladder('home-ladder', A['ladder-base'], A['ladder-top'], mats, root))
    obs.append(ladder('middle-ladder', A['middle-ladder-base'], A['middle-ladder-top'], mats, root))
    # Small landing tongue connects the basket near rim to the right bay.
    landing = Part('basket-landing-weave')
    br = A['basket-landing']
    landing_ring = [(2.80, 2.17), (3.02, 2.17), (3.02, 2.83), (2.8, 2.83)]
    mat_floor(landing, landing_ring, P['hauling']['landingFloorY'])
    bundle(landing, [(2.15, 2.8, 1.6), (2.8, 3.07, 2.4), (3.02, 3.1, 2.5)], .05, count=5)
    obs.append(finish(landing, mats, root))
    guide = Part('basket-guide')
    # Curved reed cantilever is tied to real living support. The shaft itself
    # stays clear; no opaque decorative lift mechanism or fabricated lumber.
    tie = CONTRACT['authoring']['supportConnections']['basketGuide'][0][0]
    bundle(guide, [tie, (2.65, 5.15, 1.05), tuple(A['lift-rope'])], .075, count=6)
    for p in [tie, A['lift-rope']]:
        lash(guide, p, radius=.085)
    bundle(guide, [(3.55, .03, 2.5), (3.95, .05, 2.5)], .035, count=4)
    obs.append(finish(guide, mats, root))
    basket_root = empty(P['hauling']['basketNode'], A['basket-ground'], root)
    basket = Part('basket-weave')
    rim = [(math.cos(i/40*math.tau)*.42, .44, math.sin(i/40*math.tau)*.35) for i in range(41)]
    floor_outline = [(math.cos(i/40*math.tau)*.36, math.sin(i/40*math.tau)*.29) for i in range(40)]
    mat_floor(basket, floor_outline, .08)
    bundle(basket, rim, .035, count=4)
    for j in range(16):
        a = j/16*math.tau
        bundle(basket, [(.36*math.cos(a), .06, .29*math.sin(a)),
                        (.42*math.cos(a), .44, .35*math.sin(a))], .016, count=3)
    for y in [.13, .23, .33]:
        basket.tube([(.4*math.cos(i/40*math.tau), y, .33*math.sin(i/40*math.tau)) for i in range(41)], .012, 5, 1)
    for z in [-.23, .23]:
        bundle(basket, [(-.37, .42, z), (-.17, .77, z*.2), (0, .95, 0),
                        (.17, .77, z*.2), (.37, .42, z)], .020, count=3)
    obs.append(finish(basket, mats, basket_root))
    cargo_socket = empty('cargo-socket', A['cargo-socket'], basket_root)
    cargo_socket.rotation_euler.z = P['hauling']['cargoYawRadians']
    rope_root = empty(P['hauling']['ropeNode'], A['lift-rope'], root)
    rope = Part('lift-rope-fiber')
    # Author one metre; runtime scales local Blender-Z/glTF-Y about the top.
    bundle(rope, [(0, 0, 0), (0, -1, 0)], .018, count=3)
    obs.append(finish(rope, mats, rope_root))
    rope_root['axis'] = '-Y'
    rope_root['authored_length'] = 1
    for name, p in A.items():
        if name not in ('cargo-socket', 'basket-ground', 'lift-rope'):
            empty(name, p, root)
    empty('basket-ground', A['basket-ground'], root)
    bpy.context.scene['habitat_revision'] = CONTRACT['revision']
    (SOURCE/'floor-measures.json').write_text(json.dumps({'revision': CONTRACT['revision'], 'profileSha256': hashlib.sha256((ROOT/'src/content/valley-habitat.json').read_bytes()).hexdigest(), 'floors': floor_report}, indent=2)+'\n')
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'longbough-woven-kit.blend'))
    bpy.ops.export_scene.gltf(filepath=str(OUT/'longbough-woven-kit.glb'), export_format='GLB',
                              export_animations=False, export_yup=True, export_extras=True)
    return root, obs


def living_source():
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/sculpted/valley-trees/longbough-refinement-study.blend'))
    keep = {ob for ob in bpy.data.objects if ob.name in ('asset', 'living-wood', 'crown-foliage')}
    for ob in list(bpy.data.objects):
        if ob not in keep:
            bpy.data.objects.remove(ob, do_unlink=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'longbough-living.blend'))


if __name__ == '__main__':
    kit()
    living_source()
