# Bound-reed habitation kit v1

Original authored Blender geometry for the first compact playable Boughhome,
local reed store and ground nursery, plus separate fitted hood modules for the
accepted v8 Longbough art study. The old assets remain available. The larger
concept dimensions, timber economy, machinery and population proposals are not
implemented by this kit.

`fit-contract.json` owns this asset handoff, referring to the unchanged canonical
`src/content/tree-habitats.json`. It records metre coordinates, stage names,
post contacts, the arrival opening and the separate upper-deck correction.
`study-presentation.json` supplies only the independent study module URL/revision.
The game and simulation remain the owners of construction, stock, care, access
and capacity.

| Export | Triangles | Meshes / primitives | Bytes |
| --- | ---: | ---: | ---: |
| boughhome.glb | 32,986 | 4 / 11 | 4,681,676 |
| reed-store.glb | 12,178 | 3 / 6 | 3,245,220 |
| root-nursery.glb | 33,090 | 4 / 10 | 4,705,172 |
| boughhome-longbough-modules.glb | 30,532 | 2 / 6 | 4,437,792 |
| sleeping-deck-compatible.glb | 19,392 | 2 / 8 | 1,033,820 |

Runtime exports live in `public/assets/environment/buildings/`. Each has a
same-named editable `.blend` here. Exact bounds, image hashes, material checks,
source hashes and final export hashes are in `asset-receipt.json`.

## Fit and presentation

The compact home retains the exact Y2.25 floor and two sheltered berth anchors.
Its paired folded wings have woven partial rear returns, bundled reed ribs,
edge fibers and lashings; the right transit side stays open. Four rear hood
posts embed into the floor. The floor contacts living wood in all three
canonical Woodland growth forms. This is contact evidence, not a strength model.
Woodland adults remain .365 scale. New reed construction adds no plank timber.

The centre arrival opening spans X±.20 and extends from the front edge near
Z−1.24 to Z−.82. Connected ladder rails retain X±.285/Z−1.08; paired curved
side grips end near X±.15/Z−.89. The intermediate ladder-top anchor is an open
climb grip. The final home-entry at Z−.5 and both sleeping mats remain supported.
The floor is not asserted to support feet at every interpolated climb position.

The upper deck is a separate same-anchor adaptation of the original project
recipe. It removes torso-crossing full-width approach rods and the raised left
cup/perch lip, adds tied outer grips and scoops the approach. Its first retained
floor reed shifts +.066m, preserving useful support under both left-berth feet.
The renderer supplies a modest .35-radian upper-body descent lean with unchanged
leg/foot coordinates. The source body sweep and actual engine pose qualification
are distinct. Actual saved access is unburdened; hypothetical cargo intersects
this short approach and is not advertised as an available carrying journey.

The store contains no decorative resource stock. The renderer clones only real
saved reed stock/delivery. The nursery is a ground care structure with six
load-bearing post ends buried .01m below authored Y0; suspended shell fibers
are decorative ends. The renderer owns actual food, eggs and dependents. Its
nest remains a separate finished group; no second old nest should be cloned.

Longbough modules are authored directly in v8 host-local metres, with no extra
floor and all mesh tags beginning `study-structure-`. Their four post feet meet
the existing lower terrace. Study adults remain .45625 scale; static figures
and fitted hoods add no simulated places or capacity. Existing v8 timber
terraces are unchanged; only the added modules are bound reeds.

## Reproduce

Use Blender 4.5.3 LTS (4.5 LTS pipeline), from the repository root:

```sh
BLENDER --background --python assets/sculpted/buildings/author_buildings.py
BLENDER --background --python assets/sculpted/buildings/author_compatible_deck.py
BLENDER --background --python assets/sculpted/buildings/validate_buildings.py
BLENDER --background --python assets/sculpted/buildings/validate_actual_fit.py
BLENDER --background --python assets/sculpted/buildings/validate_contacts.py
BLENDER --background --python assets/sculpted/buildings/validate_berth_support.py
BLENDER --background --python assets/sculpted/buildings/validate_blends.py
BLENDER --background --python assets/sculpted/buildings/render_buildings.py
BLENDER --background --python assets/sculpted/buildings/qualify_final.py
```

`BLENDER` denotes the installed Blender executable. Both authoring recipes use
true game metres, X right / Y up / Z forward, exported as standard Y-up glTF.
Integration applies the established source-frame conversion consistently. No
external modelling package or downloaded geometry is required. The compatible
deck recipe reads the existing project technology helper/function, whose input
hash is preserved in provenance. It never regenerates the old export.

`validate_runtime_sweep.py` additionally consumes the integration-owned evaluated
mesh packets under `output/building-implementation-v1/`. The first clamber
packet had a rejected keyed-rig relation; use the repaired v2 packet for current
actual-pose evidence. Angle sweeps reconstruct the upper pivot on the valid
upright v2 packet, using the exact affected-group flags, and apply lean only to
descent. These source tests reposition one evaluated pose; they do not replace
actual animated engine inspection at each progress value.

## Evidence and limits

All five GLBs reproduced byte for byte in fresh Blender authoring processes.
All five saved editable sources reopened with finite mesh/UV data; the four
new kit sources retain the packed original reed image. Indexed exports have
finite UVs, unit normals, no degenerate triangles, opaque materials and no
animation/external resource dependencies.

The new home passes conservative reserved-shaft/body boxes and all four actual
source birds over 93 sampled rest-body positions each, including ladder,
arrival, lateral approach and six existing berths. Functional contacts below
foot+.13m are excluded. The final upper approach clears the 24 source-equivalent
body checks with the agreed descent pose. Sole-ray evidence retains 80–83%
left-foot and 100% right-foot sampled coverage at the left upper berth; gaps
between round reeds explain missed rays. The original roughly .03m minimum
upper floor-to-foot gap remains. This is no zero-collision physics claim.

Source renders are `candidate-home.png`, `candidate-home-isolated.png`,
`candidate-longbough.png`, `candidate-store.png` and `candidate-nursery.png`.
Final actual Babylon art, staged construction, all-tree fit, reduced-motion
traversal, narrow layout, performance and save/refresh evidence belong to the
integration owner at `output/building-implementation-v1/`.

The weave has visible painted shading and repetition; exact seamlessness and
pure unlit albedo are not claimed. Bundled stems, repeated lashing rhythm and
compact open shelter fit remain stylized first-kit limits. No structural
strength, private-room enclosure, navigation, extra housing, new mobility,
material yield or broader concept-art parity is established by these assets.
