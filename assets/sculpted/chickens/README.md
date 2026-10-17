# Sculpted chicken source — v5 birds with Rook v6 tail

Original Coop Chaos artwork authored by the Codex chicken asset executor on
2026-10-16. No downloaded meshes, texture images, or reference pixels are embedded.
This is original project source; no third-party asset license is required. The concept references are
`art-direction/concepts/chicken-models-v2.png` and `chicken-acting-v1.png`;
they guide shape and acting, and are not textures.

`author_chickens.py` is the deterministic editable author recipe for Blender 4.5.
Each `<id>.blend` contains the modeled character plus a clearly named STUDIO
camera, pedestal, backdrop, and three lights. Studio objects are added after the
runtime export and are absent from the GLBs. `<id>-proof-v5.png` is a close
three-quarter Cycles render of the actual source geometry, not concept artwork.

Run the author with Blender in background mode, for example:

```sh
blender --background --python assets/sculpted/chickens/author_chickens.py -- fern
```

Pass additional IDs to build the other sources. `--no-render` writes each GLB
and editable `.blend` including the STUDIO setup, and skips proof rendering.
`--export-only` writes only GLBs/reports, omitting STUDIO creation, source saving
and proof rendering; it takes precedence if both flags are present.

```sh
blender --background --python assets/sculpted/chickens/author_chickens.py -- fern rook dapple wren --no-render
```

Pass additional IDs to build the other sources. This writes only this source
folder and `public/assets/characters/{fern,rook,dapple,wren}.glb`. Do not run the
older Node placeholder exporter afterward: it would replace these GLB files.

## Shape and export contract

The author uses explicit lofted profiles for the continuous compact belly,
breast and curved neck, a separately articulated head, thin convex feather
plates following each torso cross-section, overlapping folded quills and oval
coverts without a baseplate, a sculpted fan tail, shaped beak,
small inset eyes, coral comb and wattles, and articulated bare legs and toes.
The style retains broad flat facets and subtle vertex/material variation; only
small living face details and bare feet use smooth shading. Source geometry is
editable, with disconnected feather islands merged under each articulation to
control runtime objects. All four are provisional flight-capable adult forms;
none uses flightless Silkie plumage or feather-footed Brahma morphology.

The GLB is glTF 2.0, meters, +Y up, +Z forward, sole at Y=0 and origin beneath the bird, with an
`asset` root. Fern is approximately 1.742 units tall before runtime scaling.
Other bodies preserve adult face/feet proportions. The root scale intentionally
makes Wren smaller; it does not turn her into a chick. Rook has three separated curved sickles at distinct heights/angles, a short
secondary fan, and pointed copper hackles lying flat on his neck. Identity,
roles, and simulation content are unchanged. Node names:

- `body`: origin `(0, 0, 0)`; renderer may overwrite vertical bob.
- `head`: pivot `(0, 1.2254815, .31)`; rest Euler rotation zero.
- `wing`: right folded wing pivot `(.39, 1.0054815, .03)`; rest zero.
- `far-wing`: matching left wing pivot `(-.39, 1.0054815, .03)`; rest zero.
- `leg-left`, `leg-right`: articulated shanks, toes and feathered thigh.

Coordinates above are glTF/game coordinates. The author converts to Blender's
Z-up convention before export. The clear `body/head/wing` hierarchy preserves
existing presentation hooks. Meshes/materials do not decide simulation outcomes.

## Authored motion studies

NLA tracks are named `idle`, `walk`, `gather`, `carry`, `weave`, `flight`. These
are reusable transform-based pose studies (head, body, two wings and two legs),
not skinned deformation clips or a claim of completed animation acceptance.
The source keeps the tracks muted so its neutral pose is easy to inspect. The
GLB exporter isolates the named tracks. Runtime must choose either these tracks
or its direct node poses for a given articulation, to avoid competing animation.
The export preserves constant pose channels: each clip has 18 channels
(translation, rotation and scale for six articulation transforms), so tucked
flight legs and carry head pose survive clip changes. Root translation and task
eligibility stay with the runtime/simulation owners.
The `gather` pose does not authorize or implement forage rules.

Actual locomotion speed/foot contact, beak-held cargo, flight reach and perch
contact require integrated Babylon qualification; a close source render does
not prove those layers. Browser console, narrow view, saved-state compatibility,
and performance acceptance belong to the integration owner.

## Evidence and qualification

`<id>-export-v5.json` records actual exported bounds, meshes, materials, triangle
counts, hooks and clips. `qualification-v5.json` records SHA256 and glTF channel
checks. `<id>-proof-v5.png` is the neutral source proof; Fern's walk, gather and
flight pose renders use `<id>-<action>-proof-v5.png`. Earlier versioned proof and
report files are retained unchanged. Editable `<id>.blend` files are the current
v5 sources; `author_chickens-v5.py` snapshots the corresponding author recipe.

The author validates Blender mesh data before export. The GLBs contain six
articulated meshes each, PBR materials and embedded geometry; no external
textures, fonts, meshes, image generators or model generators were used. No
online asset was copied or redistributed. Runtime performance, camera readability
and motion acceptance remain the integration owner's actual-scene checks.

## Rook v6 focused tail revision

Rook alone now uses `rook-proof-v6.png`, `rook-export-v6.json`, and
`qualification-rook-v6.json`; `rook.blend` is the current editable v6 source.
`rook-v5.blend` preserves the prior source and all v5 evidence remains unchanged.
`author_chickens-v6.py` snapshots the author recipe. Only Rook's three sickle
feather surfaces changed: middle blade widths are approximately .176, .196 and
.137 game units after root scaling; they retain width through the middle and
taper near the tips. Blade planes tilt toward the side view, with distinct
curves and heights and a slightly lower tallest arch. The short fan is unchanged.

The focused source comparison found exactly 468 changed sickle vertices;
other geometry, mesh topology and material assignments match v5. SHA256 checks
confirmed Fern, Dapple and Wren GLBs are unchanged. Rook retains all six clips
with 18 channels each, six articulated meshes, and 12,460 triangles. Actual
scene qualification remains with the integration owner.
