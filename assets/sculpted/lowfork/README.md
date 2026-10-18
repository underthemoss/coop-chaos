# Lowfork living anatomy v3

Original Coop Chaos geometry authored in Blender 4.5.3 LTS on 2026-10-18.
Editable sources: `../environment/lowfork.blend` and
`../environment/woven-home.blend`. Runtime exports:
`public/assets/environment/lowfork.glb` and `woven-home.glb`.
Recipe: `../author.py`, bounded `lowfork` and `woven-home` entry points.
No third-party mesh, texture, scanned object, or concept pixels are embedded.
The anatomy-v3 and tree-infrastructure-details-v1 concept boards supplied visual
direction; every runtime vertex is authored by the retained Python recipe.

Runtime bark correction `lowfork-split-growth-planes-v4` preserves all approved
v3 triangle positions, topology, scar/crown geometry, sockets and support.
Wood corner normals now select broad discrete orientation planes from the real
fused surface instead of blending a smooth radial field. Angular boundaries stay
split; the material has warm upward faces, deeper muted creases and broad
growth-oriented patches. No extra grain, grooves, leaves or geometry were added.
`geometry-v3-baseline.json` retains the prior export hash and canonical triangle
position hashes so the unchanged geometry is verified independently of the
normal-driven vertex splitting in glTF.

Lowfork has eighteen unequal living growth paths and five broad buttresses,
fused into one continuous editable wood mesh. Three principal gestures carry
the crown and existing rooms: a twisting upright, a long low left arm, and a
rising right saddle. Two continuing branches support the unchanged natural
roosts. Broad turning bark planes share their field with warm/cool bark colors;
the old scar is a flush irregular heartwood wound projected into this surface.
The layered crown uses five hand-shaped irregular footprints, folded leaf
outlines, drooping undersides and volume-oriented normals. Inner and front
windows preserve sight of occupants and work. Roots flatten and bury their ends
around the approach court rather than ending as exposed radial spikes.

The export has 27,618 triangles and three material primitives: wood 10,302,
crown 17,220, old scar 96. This is slightly below the approximate 28–35k target;
no extra leaf or bark noise was added just to fill the budget. Bounds in ART
metres are approximately X[-6.141,5.048], Y[-.287,7.949], Z[-1.367,2.834].
All other tree exports retain their prior bytes. The woven-home change only
replaces its roof with a high, scalloped open-front rainhood. Its exported deck
and ladder positions, normals and indices match revision
`375589beb5647f33e35af568a5ea0e101c5ac8ab` exactly. The three source groups
`deck`, `rainhood`, `ladder` remain separate. The companion sleeping-deck hood
is independently owned by the technology recipe.

The single coordinate reference is `src/content/tree-habitats.json`, profile
`canopy-proof`. Source helpers use X right, Y up, Z forward; Blender is Z up and
glTF exports Y up. Root `asset` stays at tree-local zero with the same runtime
tree scale. Babylon's default left-handed import needs the agreed X compensation
on the tree root so that the right saddle and left cargo cleft align. Exported
sockets are `natural-perch-0/1`, `sheltered-perch-0/1/2/3`, `sheltered-deck`, and
`ladder-base`. Other route coordinates remain in the canonical habitat profile.
No authored motion or simulation outcome is added.

Rebuild and qualify only these owned assets:

```sh
"$BLENDER_BIN" --background --python assets/sculpted/author.py -- lowfork
"$BLENDER_BIN" --background --python assets/sculpted/author.py -- woven-home
# Normal/material correction only, retaining the current Lowfork mesh positions:
"$BLENDER_BIN" --background --python assets/sculpted/author.py -- lowfork-bark
"$BLENDER_BIN" --background --python assets/sculpted/lowfork/qualify.py
npx vitest run assets/sculpted/lowfork/lowfork.test.js
"$BLENDER_BIN" --background --python assets/sculpted/lowfork/render.py -- occupied final
"$BLENDER_BIN" --background --python assets/sculpted/lowfork/render.py -- occupied close final
```

`qualification.json` records export/source hashes, bounds, unit-normal errors,
minimum triangle areas, canonical sockets, and actual triangle-box separating
axis clearance checks. The predicate is exercised with crossing and separated
triangles, including a crossing triangle with every vertex outside the box.
The entire basket sweep has a 10cm margin; a second full-stroke volume includes
the cargo bundle's longer depth. Operator, loading, arrival, ladder approach,
landing and all six standing torso/head envelopes are tested against tree wood,
scar and foliage. Standing envelopes extend 1.33m above the saved foot positions;
they do not claim all possible wing/tail orientations or animation poses clear.
Natural perch support is measured by downward BVH rays against exported wood,
independent of roofs: tops Y3.15524 /3.31600 at foot anchors Y3.15 /3.33.
The bark check also verifies that each exported wood triangle's corner normals
agree within .01 radians (.58 degree). Blender's local custom-normal encoding
introduces small deviations near its polar singularity; this bound remains far
below the roughly 30-degree changes between the broad authored planes.

Source inspection proofs live in `output/playwright/lowfork-anatomy-v3/`:
`bare-whole-final.png`, `occupied-whole-final.png`, and
`occupied-close-final.png`. Six actual chicken source meshes appear at saved
anchors at runtime .73 scale for a front-facing occupancy study; repeated birds
are inspection context only. The proof uses the runtime camera orientation,
mirrored to match its handedness, with bounded orthographic framing and a Cycles
studio light. These images are source geometry evidence, not browser acceptance.
The integrator owns actual runtime framing, lighting, route and saved-state
acceptance, plus the shared full application checks. No commit or deployment is
implied by this artifact receipt.

The bark v4 bare proof is `bare-whole-bark-v4.png` in the same output directory;
the integrator's matched runtime re-capture is the visual acceptance layer for
this correction. Earlier occupied proofs show the approved anatomy and hoods,
before the final bark treatment.
