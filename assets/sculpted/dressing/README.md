# Clearing dressing, revision dressing-v2

Nine original decorative assets authored for the Coop Chaos clearing. These do
not add playable species, resource behavior, obstacles, or world canon.

Source: `../author_dressing.py`, standalone Blender 4.5 LTS recipe. The recipe
uses one locally seeded `random.Random` per asset and never imports `author.py`.
It writes only its own nine `dressing-*.blend` / `dressing-*.glb`, qualification
JSON, and optionally its revisioned group studio/proof. Existing tree, character,
construction and resource exports are outside this recipe.

```
blender --background \
  --python assets/sculpted/author_dressing.py -- --no-render
```

`--only birch` (or another ID below) limits export. `--proof-only` creates the
group studio/render without exporting assets. Omitting `--no-render` also renders
that revision's studio proof; do not overwrite accepted proof evidence when
changing geometry: advance `REV` first. `--no-render` saves editable per-asset
Blends and exports GLBs. All editable meshes and vertex colors remain separate;
there is no external dependency, generated bitmap, downloaded model or texture.

| ID suffix | Width × height × depth, units | Triangles | Draw primitives |
| --- | --- | ---: | ---: |
| birch | 3.46 × 7.33 × 2.27 | 5,106 | 2 |
| willow | 4.84 × 5.44 × 2.95 | 14,486 | 2 |
| bush-a | 2.08 × 1.35 × 1.42 | 2,726 | 2 |
| bush-b | 2.22 × 1.24 × 1.59 | 2,654 | 2 |
| bush-c | 1.93 × 1.58 × 1.64 | 2,742 | 2 |
| grass | .72 × .41 × .70 | 304 | 1 |
| cattails | 1.58 × 1.81 × 1.52 | 1,224 | 2 |
| rock-a | 1.56 × .85 × 1.12 | 40 | 1 |
| rock-b | 1.80 × .57 × 1.31 | 40 | 1 |

Files are `public/assets/environment/dressing-{ID}.glb`. The root is `asset` at
(0,0,0), glTF +Y up/+Z forward, exact lowest point Y=0. Scale1 is one authored
world unit; use uniform instance scaling and yaw variation. No animations,
textures, cameras, studio objects or lights ship. One or two opaque rough PBR
materials per file read `COLOR_0`. Reuse imported materials/meshes for instances;
do not replace material colors or disable imported normals. Leaf/grass plates
are double sided and folded in 3D. Tree/bush envelopes only place leaves and
guide custom normals: no hidden solid sphere or camera-facing billboard ships.

The birch has pale angular bark and flush brown lenticel markings, a curved
slender stem and staggered airy leaves. Willow foliage follows hanging spray
volumes with long folded leaves, visible curved boughs and small inter-spray gaps.
Bushes have overlapping broad leaves on irregular full lobes, with dark lower
envelopes. Broad height/lobe color variation is independent of world sunlight.
The foliage normals combine a faceted lobe envelope (74%) and local leaf folds
(26%), preserving crown volume while retaining readable planes. Reeds/grass use
curved folded blades, not pin-thin spikes. Rocks are closed volumetric cut forms,
with broad lavender-gray planes and restrained ochre mineral variation.

Provenance: all meshes, vertex colors, normal fields and recipes authored here
from original mathematical constructions. Internal visual references are
`art-direction/concepts/opening-view-v2.png`, the visual bible and tree kinships.
No reference image is embedded or used as a game background. Earlier Lowfork
canopy authoring informed the envelope technique; this separate recipe neither
imports nor changes it. No hard directional lighting is baked into assets.

Qualification: `qualification.json` contains exact game-space bounds, GLB hashes,
vertex/triangle counts. `gltf-checks.json` records finite indexed geometry, unit
normals, no degenerate triangles, ground seating, opaque materials and resource
checks. `determinism.json` compares a repeated standalone export and separately
records unchanged existing GLBs/author.py during that run. The narrow regression
suite is `dressing.test.js` (11 tests). A prior v1 rock ring order produced inward
faces; v2 reverses the winding and tests positive signed volume on both closed
rocks. The coordinate conversion (x,y,z)→Blender(x,-z,y) has determinant+1; ring
orientation, not a reflected export transform, caused the defect.

The neutral daylight group proof is `dressing-v2-group-proof.png`, with its
editable studio archived at `output/dressing-v2/archive/dressing-v2-group-studio.blend`.
Intermediate v1 proof/studio, Blender backups, the repeat-run input hash snapshot
and the duplicate frozen recipe are retained in that ignored archive. The
authoritative recipe remains `assets/sculpted/author_dressing.py`. It is DCC evidence. Runtime composition,
lighting, instancing density and fixed-camera art acceptance remain with the
integration owner and Astra. No browser acceptance is claimed here.
