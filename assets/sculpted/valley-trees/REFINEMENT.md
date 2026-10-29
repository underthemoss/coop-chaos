# Longbough sculptural refinement — v8

This original static art study replaces only the displayed Longbough candidate.
It does not change the preserved natural three-form v5 studies or the earlier
inhabited v4 export. It proves a visual composition, not gameplay, occupancy,
structural strength, navigation, production readiness or concept-art parity.

The tree has one fused asymmetric Y-shaped wood mesh, unequal tapering boughs,
flared roots, growth-aligned sculpted ridges and original painted bark. Rounded
split-timber terraces at three heights have crooked twig rails and ladders,
loose reed/nest material, small planted baskets and one suspended wicker basket.
There is no roof. The crown uses overlapping unequal shoulders, recessed opaque
support interiors and 12,635 individually modeled small leaves. Root moss and
three partly buried original stones belong to this candidate.

## Integration contract

- Runtime: `public/assets/environment/studies/longbough-refinement-study.glb`.
- Source: `longbough-refinement-study.blend`; recipe `author_refinement.py`.
- Coordinates: true meters, glTF +Y up, authored +Z open front, identity root
  `asset`. Place anatomical Y=0 directly at terrain; do not normalize minimum Y.
  The closed root underside reaches -1.215m and stays buried.
- Actual full bounds: X [-8.473, 8.393], Y [-1.215, 13.575], Z [-5.375, 3.517]m.
  Above-ground height 13.575m; width 16.866m; depth 8.893m. This is wider than the
  provisional 12–14m target; camera fit must use actual bounds.
- Wood/root footprint for vertices at Y≤1m: X [-3.219,3.891], Z [-3.825,2.209]m.
  The wood section at Y=1.3m spans X [-1.861,1.590], Z [-1.578,1.494]m.
  These are art geometry measurements, not clear or walkable footprints.
- `living-wood` and `crown-foliage` are separate. All seven other mesh names begin
  `study-structure-` and can be hidden as a group. The retained name
  `study-structure-woven-hood-basket` now contains baskets/nest reeds only.
- 135,942 triangles, nine mesh primitives/materials, two embedded original PNG
  albedos; no external resources, animations, skins, cameras or lights. Wood
  28,976 triangles; foliage 77,178; structures/dressing 29,788. Opaque rough
  nonmetal PBR; bark has no mismatched analytic normal overlay. Preserve authored
  normals, COLOR_0, UVs and PBR. No special loader shader is required.
- `refinement-presentation.json` owns the three curved floor outlines, four static
  bird fixture positions and detail bounds. Floor tops are exactly Y3.20/5.72/8.15m.
  Floor centers: lower [1.10,3.20,1.65], middle [-.85,5.72,1.65], upper
  [.05,8.15,.85]m. Nominal oval sizes 4.65×3.70, 4.25×3.30, 3.95×3.10m;
  rear cutouts exclude the living trunk. Do not treat whole ovals as clear floors.
  Body scale remains the integration owner's .45625; no character export changes.

## Rebuild and checks

Use Blender 4.5.3 LTS and Python 3; game installation needs neither. `BLENDER_BIN`
selects the executable and is not a project setting.

```sh
"$BLENDER_BIN" --background --threads 4 --python assets/sculpted/valley-trees/author_refinement.py -- --no-render
python3 assets/sculpted/valley-trees/validate_refinement.py
"$BLENDER_BIN" --background --threads 4 --python assets/sculpted/valley-trees/inspect_refinement.py
BLENDER_BIN="$BLENDER_BIN" python3 assets/sculpted/valley-trees/reproduce_refinement.py
"$BLENDER_BIN" --background --threads 4 --python assets/sculpted/valley-trees/author_refinement.py -- --proof-only
```

Two independent builds must produce identical GLB bytes. Editable Blender files
are not claimed byte deterministic because Blender includes session metadata.
The actual-byte validator checks names/transforms, bounds, triangle budget,
indices, finite data, unit normals, nondegenerate faces, positive wood volume,
opaque rough materials, embedded resources and narrow wood color/UV ranges.
Source inspection reopens the saved Blend and compares custom-data fingerprints
from assignment through assembly to reopen. Four center-floor rays and 25 vertical
samples around each bird fixture verify .9m body headroom (1.35m for cargo). Six
brace anchor samples lie inside the trunk or within 1.2mm of its surface. These
samples are visual placement evidence; they do not prove full circulation or
physical structural adequacy. Real engine contact/framing and all browser checks
belong to the integration owner.

V5/v6 WIP source PNGs are retained as rejected evidence. V5 WIP GLB and metadata
are in `refinement-evidence/`. V6's bad custom data was detected in both source
and actual runtime; it is not the current artifact. V7 corrected that defect by allocating both custom-data
layers before reacquiring handles, writing immutable flat arrays with foreach_set,
and avoiding later wood BMesh roundtrips. Narrow RGB/alpha and UV checks catch the
old corruption that exporter clamping could conceal. The exact single Blender
internal cause was not independently reproduced; the corrected boundaries and
runtime bytes are measured, rather than assuming a loader/gamma fix.

## Provenance and limits

`refinement-provenance.json` records generated-image prompts, original source
paths and byte hashes. Both painted albedos were generated with the built-in
imagegen tool by the primary agent, visually inspected, and copied byte-for-byte
into this source folder. They are original generated images, not mathematical
textures or third-party photographs. No raster editing was used. The bark grain
is mapped longitudinally with branch-local coordinates and selective neutral/moss
vertex tint; timber uses lengthwise strips. No reference picture is embedded.
Geometry/control points, seeded recipes, foliage, terrace outlines, rails,
lashings, baskets/plants and stones are authored here. The recipe reuses local
mesh/material helper functions from `author_trees.py` and `author_habitation.py`
without regenerating their old assets. V8 root stones reuse the original
`assets/sculpted/landscape/author_landscape.py` fractured-course mineral/moss
geometry helper; no old stone export is regenerated. V8 uses one continuous
base UV chart graduating to branch charts below the lowest terrace, removing
the former rectangular lower-root patch. The v7 GLB/recipe/checks remain in
`refinement-evidence/v7/`. Only root UVs and the stone group change; expanded
triangle POSITION/NORMAL fingerprints verify every other mesh unchanged. This does not select a repository license.

Remaining art limits: repeated stylized foliage shoulder rhythm and similar leaf
lighting, branch-local UV transitions at forks, broad bark stylization, faceted stones and simplified beak/foot-built
joinery. Texture seams and painted illumination are art qualifications, not
asserted seamlessness. This single large study is 18.8MB and is not a settlement
forest performance budget. No simulation, access rules, collision, population,
shelter capacity, construction process, strength or safety is established. No
commit, deployment or production acceptance is claimed.
