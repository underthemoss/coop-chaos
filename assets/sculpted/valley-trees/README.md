# Isolated valley tree studies

The newer inhabited Longbough refinement is documented in [REFINEMENT.md](REFINEMENT.md)
and uses its own GLB, metadata and generated painted textures. The earlier inhabited
prototype remains in [HABITATION.md](HABITATION.md). The natural three-form v5
exports and provenance described below remain unchanged.

Three original natural growth-form prototypes, authored in true meters for the
isolated **Tree art study**. Longbough has an unequal broad low bough architecture;
Crowncourt splits into two rising crowns; Windward (`riverside-study.glb`) bends
its principal axis and secondary limbs downstream. They share a restrained warm
bark and muted olive small-leaf language. They establish no species, kinship,
habitation capacity, resource, collision, navigation or simulation meaning.

`author_trees.py` is the standalone deterministic Blender 4.5 LTS recipe. Each
`*-study.blend` retains editable meshes, two materials, corner colors and a root
named `asset`. `*-qualification.json` records author metadata; actual runtime
bounds, bytes, hashes, triangle counts, normals, color ranges and resource checks
are in `*-gltf-checks.json`. These generated records are the integration contract.

```sh
"$BLENDER_BIN" --background --threads 4 --python assets/sculpted/valley-trees/author_trees.py -- longbough
"$BLENDER_BIN" --background --threads 4 --python assets/sculpted/valley-trees/author_trees.py -- crowncourt
"$BLENDER_BIN" --background --threads 4 --python assets/sculpted/valley-trees/author_trees.py -- riverside
python3 assets/sculpted/valley-trees/validate.py longbough crowncourt riverside
BLENDER_BIN="$BLENDER_BIN" python3 assets/sculpted/valley-trees/reproduce.py
```

Append `--no-render` after a name to rebuild only the source/export/qualification.
`--proof-only` creates DCC camera evidence without changing runtime bytes.
`inspect_source.py -- name` (run through Blender's `--python`) builds that asset's
front/strategy/branches contact sheet and samples the open near-ground window.
Source ray probes are art evidence, never mobility or capacity claims.

All GLBs have identity root transforms, +Y up and authored +Z front/open face.
Place anatomical origin Y=0 directly on terrain; the closed root underside extends
below zero and must stay buried. Do not raise the mesh by its minimum Y. Full
bounds and wood Y≤1m footprint are reported separately. Root footprints are
geometry bounds, not walkable or buildable footprints. Preserve authored normals,
`COLOR_0` and PBR when importing. Hide `crown-foliage` for the branches-only view;
`living-wood` contains the fused trunk, roots and tapered branches. The foliage
node includes recessed irregular support cores plus individually folded six-face
leaves of .16–.245m full span. Both use one opaque material: support cores never
need transparent sorting. There are two mesh primitives and two materials per
asset, no images, textures, external resources, animations, cameras, lights or
skins. `study-warm-growth-bark` has roughness .91; `study-olive-small-leaves` .93,
double-sided. Metallic is zero. Bark pigment follows the same local growth field
as restrained radial ridges, dark crevices and selective root moss. Color ranges
are checked in actual GLB bytes. Normal game install/build needs no Blender.

Studio PNGs and studio Blends are source inspection evidence. Their cameras,
lights and floor do not enter GLBs. This prototype does not claim concept-image
parity or finished production bark/leaf quality. Real-engine framing, light,
scale, narrow layout and console acceptance belong to the integration owner.
No global npm check, browser acceptance, commit, publication or deployment is
claimed by this asset authoring receipt.

Provenance: original branch control points, seeded mathematical mesh recipes,
leaf construction, core geometry and palette authored within this project on
2026-10-26, exported with Blender 4.5.3 LTS. Internal visual reference:
`art-direction/concepts/chicken-civ-scene-v2.png`, read with the visual bible,
asset pipeline, tree exploration and tree kinships. Existing procedural helper
patterns were inspected for technique; this script imports no old recipe and
regenerates no old export. No third-party meshes, photographs, textures,
image-generated pixels, copied artwork or secrets are embedded. This provenance
does not select a new repository license.
