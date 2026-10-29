# Longbough habitation visual prototype

This original single-tree redesign responds to the user-supplied tree-home
reference inspected on 2026-10-26. It preserves the v5 studies, including the old
Longbough export and both other growth forms. The tall unequal Y fork and
buttressed low working trunk now frame three staggered fitted decks. Static
irregular slats, twig rails and ladders, a woven arched rainhood and a suspended
basket demonstrate visual scale. They create no saved habitat, population,
structural safety, resource, navigation or construction capability.

`author_habitation.py` imports established geometric helpers from
`author_trees.py`, then authors only the new Longbough habitation source/export,
original bark images and presentation receipt. It never invokes a v5 builder or
changes another export. Run from this repository with Blender 4.5.3 LTS:

```sh
"$BLENDER_BIN" --background --threads 4 --python assets/sculpted/valley-trees/author_habitation.py -- --no-render
python3 assets/sculpted/valley-trees/reproduce_habitation.py
python3 assets/sculpted/valley-trees/validate_habitation.py
"$BLENDER_BIN" --background --threads 4 --python assets/sculpted/valley-trees/inspect_habitation.py
"$BLENDER_BIN" --background --threads 4 --python assets/sculpted/valley-trees/author_habitation.py -- --proof-only
```

The source `.blend` retains editable grouped meshes, UVs, vertex colors, packed
original bark images and materials. `--proof-only --front-only` renders the final
front evidence without touching runtime bytes. Normal game build needs no Blender.
`habitation-qualification.json` holds author metadata;
`habitation-gltf-checks.json` validates actual runtime bytes;
`habitation-source-inspection.json` contains static source ray samples;
`habitation-receipt.json` records source/runtime hashes and reproducibility.
Rejected v5 and early habitation evidence is preserved separately with its own
revision/hash, and does not identify the current export.

Runtime asset: `/assets/environment/studies/longbough-habitation-study.glb`.
Root `asset` is identity at anatomical ground Y0, in true meters, glTF +Y up,
authored +Z front. Keep its closed root underside buried; do not normalize minY
onto terrain. The integration owner rotates the whole shared tree transform by
π and keeps existing adults at `.45625`. Preserve PBR, normals, original texture
UVs and `COLOR_0`. The tree meshes are `living-wood` and `crown-foliage`.
All five structural groups begin `study-structure-`; hide this entire prefix for
the natural form. Seven opaque mesh primitives share seven rough nonmetal PBR
materials. Foliage is double-sided opaque. There are two embedded original PNGs
(albedo and tangent-space normal), and no external resource, light, camera,
skin or animation. The normal image is linear/noncolor data. Original bark
pigment, broken directional grain, broad fissures and localized knots are
analytic authored fields, not sampled reference pixels. The runtime wood vertex color is neutral; exported surface variation comes from
the original albedo and normal textures. No global lighting compensation is required.

`habitation-presentation.json` is a compact presentation-only integration input:
actual deck top Y, center/outline, fixed bird floor positions/yaw/cargo and detail
framing bounds. All three floor levels use `study-structure-decks`; distinguish
levels by exact floor Y. The lower deck is 4.2×3.4m, middle 4.3×4.0m, upper
3.7×3.1m before chamfered corners and fitted rear tree cutouts. The shelter's
bounded clear region is 2.5×2.4m with measured source headroom in its inspection
receipt. Body and cargo envelope rays are static art checks; they are not
traversal, real engineering, population or gameplay acceptance.

Provenance: original project-authored branch paths, meshes, palette, seeded
reed/twig construction and analytic bark albedo/normal fields; Blender 4.5.3 LTS.
The user reference was inspected from its supplied local screenshot and the v5
actual-runtime screenshot. Neither image is embedded or copied into a texture.
No third-party mesh, photograph, texture, generated reference pixels, secrets or
new license selection is included. Existing project art direction and tree
kinships govern meaning. This proof claims a substantial anatomy/scale/material
revision, not reference-image fidelity or production-ready art. Broad stylized
wood treatment and clustered crown rhythm remain quality limits. Final browser
framing, rendering, console and performance acceptance belong to the integration
owner. No browser/global npm check, commit or deployment is claimed here.
