"""Bounded same-anchor correction of project-authored sleeping deck.

Reuses the original project's deterministic recipe, preserving its roof, access
coordinates and two upper berths. Only lower-left approach intrusions are
cropped to a tied open edge. Original source/GLB remain untouched.
"""
import ast
import bpy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path(__file__).resolve().parent
ORIGINAL = ROOT/'assets/sculpted/technology/author_technology.py'
text = ORIGINAL.read_text()
module = ast.parse(text)
fn = next(n for n in module.body if isinstance(n, ast.FunctionDef) and n.name == 'sleeping_deck')
prefix = '\n'.join(text.splitlines()[:fn.lineno-1])
ns = {'__file__': str(ORIGINAL), '__name__': 'compatibility_recipe'}
exec(compile(prefix, str(ORIGINAL), 'exec'), ns)
body = '\n'.join(text.splitlines()[fn.lineno-1:fn.end_lineno])
body = body.replace("tube('splayed floor reed'", "\n        if cx+x < 1.30: continue\n        if cx+x < 1.40: x += .066\n        tube('splayed floor reed'")
body = body.replace("tube('crescent woven side',pts", "pts=[p for p in pts if p[0]>=1.30]\n        tube('crescent woven side',pts")
body = body.replace("tube('woven edge stake'", "\n        if px < 1.30: continue\n        tube('woven edge stake'")
body = body.replace("(bx-.34,by+.035,bz-.08)", "(max(1.30,bx-.34),by+.035,bz-.08)")
# The short saved rise is an open clamber. No full-width rods are allowed
# across its body corridor; grip rails sit to either side instead.
start = body.index("    for j in range(5):tube('home connecting weave'")
end = body.index("    for pts in [[(.05,1.50,.07)", start)
body = body[:start] + body[end:]
body = body.replace("for r in range(4):hoop(", "for r in range(4) if bx > 2 else []:hoop(")
body = body.replace("        tube('sleeping grasp perch'", "        if bx > 2: tube('sleeping grasp perch'")
old_hoop = ns['hoop']


def fitted_hoop(name, center, rx, rz, rad, mat, parent, segments=40):
    import math
    points = [(max(1.30, center[0]+rx*math.cos(j/segments*math.tau)), center[1], center[2]+rz*math.sin(j/segments*math.tau)) for j in range(segments+1)]
    return ns['tube'](name, points, rad, mat, parent)


ns['hoop'] = fitted_hoop
ns['export'] = lambda name: None
exec(compile(body, 'same_anchor_sleeping_deck', 'exec'), ns)
ns['sleeping_deck']()
# Side rails connect both platforms visually, leaving the centre open for the
# immutable steep clamber. Their tied grip stubs face out, away from the body.
deck = bpy.data.objects.get('sleeping-deck')
for z, sign in [(-.96, -1), (-.04, 1)]:
    pts = [(.76, 2.20, z), (1.04, 2.42, z), (1.28, 2.76, z), (1.50, 2.78, z)]
    ns['tube']('tied side climbing rail', pts, [.033,.031,.028,.025], ns['reed'], deck, 7)
    for x,y in [(.84,2.28),(1.06,2.47),(1.25,2.72)]:
        ns['tube']('outward offset grasp', [(x,y,z),(x+.045,y+.025,z+sign*.10)], .025, ns['reed'], deck, 6)
        ns['lash']((x,y,z),deck,.045)
ns['join_under'](deck, 'sleeping-deck-weave')
for ob in bpy.context.scene.objects:
    if ob.type == 'MESH': ob.data.name = ob.name
bpy.context.scene['revision'] = 'same-anchor-open-clamber-v2'
bpy.context.scene['originalRecipeSha256'] = hashlib.sha256(ORIGINAL.read_bytes()).hexdigest()
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'sleeping-deck-compatible.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/environment/buildings/sleeping-deck-compatible.glb'), export_format='GLB', use_selection=True, export_yup=True, export_animations=False)
print('COMPATIBLE_DECK_EXPORTED')
