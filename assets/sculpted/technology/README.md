# Chicken-built canopy additions

Original project-authored geometry, created in Blender 4.5.3 LTS on 2026-10-18.
The editable sources are `../environment/sleeping-deck.blend` and
`../environment/hauling-basket.blend`; corresponding checked glTF 2.0 binary
exports live in `public/assets/environment/`. No third-party mesh, image, font,
or generated concept pixels are embedded. This records authorship and permission
within the project; it does not choose a new repository license.

The source recipe is `author_technology.py`. It authors these two additions only,
preserving the existing woven home, trees and chickens. The material palette
matches the existing woven home's warm wood, golden reed and dark fiber, with a
fresh split-reed accent. Individual reeds, curved hood layers, twig braces,
oversized knots and shallow nest cups remain editable in the retained Blender
mesh groups. There are no human house forms or new world-canon assertions.

The sleeping hood revision is `sleeping-hood-v2`; the hauling rig remains v1.
The hood is a curved split-reed cradle with a raised scalloped mouth, layered
cross-weave and tied rear supports. The original deck, cups, ramp and braces
retain their exact exported mesh arrays. Birds in the inspection studio are
context only and are absent from the exported deck.

Run with Blender 4.5 LTS:

```sh
"$BLENDER_BIN" --background --python assets/sculpted/technology/author_technology.py
# Bounded hood regeneration; does not write the hauling GLB or Blender source:
"$BLENDER_BIN" --background --python assets/sculpted/technology/author_technology.py -- --only sleeping-deck
npx vitest run assets/sculpted/technology/technology.test.js
```

Normal app build and tests use the checked exports; they do not require Blender.
The full-kit `npm run assets:build` launcher includes this recipe after the
existing environment kit. For a bounded edit to these additions, invoke this
recipe directly; it does not regenerate or replace unrelated accepted art.

## Attachment and movement contract

All numbers are exported metres: X right, Y up, Z forward. Each `asset` root is
at tree-local `(0,0,0)` and takes the exact same position and `treeScale` as the
existing tree and woven home. Simulation X/Z cells are half these metre offsets.
`src/content/tree-habitats.json` is the physical anchor authority, in
`profiles['canopy-proof']['anchors']`. The recipe consumes its deck berth and
connection anchors. `contract.json` is a generated receipt of coordinates and
export hashes, not a separate geometry authority.

The sleeping extension has a sloping grasp-rung connection from the original
home to two shallow nest cups. `sheltered-perch-2` is `(1.48,2.85,-.5)` and
`sheltered-perch-3` is `(2.52,2.85,-.5)`. Separate `sleeping-deck` and
`sleeping-rainhood` roots allow construction stages to reveal useful work.
The deck also exports `home-edge`, `ramp-middle` and `deck-entry` sockets from
the same canonical contract.

The hauling rig includes crooked lashed masts, triangular braces, a grooved
six-spoke wooden pulley, return rope with a beak grip, landing, and a ground
operator foothold. `hauling-frame` and `hauling-landing` remain static.

`basket` is a separate moving root, initially `(-1.65,.12,-.45)`. Its mesh and
`cargo-socket` are children. `cargo-socket` is local `(0,.22,0)`. To present saved
lift progress `p` from zero through one, add `2.10*p` to the basket root's Y.
The cargo therefore moves from Y `.34` to `2.44`. It is still the simulation's
original carried bundle; the asset does not own resource counts or completion.

`lift-rope` starts at `(-1.82,3.36,-.45)` and its mesh runs down local Y by 2.37.
Set its local Y scale to `(2.37 - 2.10*p)/2.37`. Its lower end stays attached to
the basket's bridle at local `(-.17,.87,0)` throughout the stroke. This remaining
length is always positive, including at the landing. The static return rope
runs over the opposite wheel side to the beak grip at `(-1.07,.41,-.65)`.
`operator-ground` is `(-1.05,0,-.75)` beside that grip. These are presentation
anchors, not additional resources or automatic operator jobs. There are no
authored animation loops or clips; runtime movement follows saved simulation.

## Qualification and limits

`technology.test.js` checks valid embedded glTF, clean scene roots, finite unit
normals, indexed nondegenerate triangles, PBR factors, exact berth anchors,
basket/cargo parentage and continuous bridle/rope alignment over the lift range.
`qualification.json` records exported counts, local mesh bounds and hierarchy.
`hood-v2-qualification.json` records exact floor/ramp/brace array preservation
and unchanged hauling GLB/Blender hashes for the bounded hood revision.
`qualify_hood.py` reads the retained before/after evidence in ignored output;
it does not regenerate assets. The deck has 19,054 triangles, of which the
unchanged deck/cups/ramp/braces account for 9,094.

`render_sleeping_hood.py` produces the neutral daylight close proof in
`output/playwright/technology-art/sleeping-hood-v2/`, with proof-only birds at
the canonical berths. `sleeping-hood-v2-fixed-angle-clean.png` is the clean v2
source-art proof. Actual runtime comb clearance and fixed-frame acceptance
remain with the integrator and primary art owner.

`render_technology.py` produces close views and a Lowfork/home/extension/rig
assembly in ignored `output/playwright/technology-art/`. These use Cycles/AgX
studio lighting and are source-art inspection, not Babylon browser acceptance.
Use the actual fixed camera to accept silhouette, foliage occlusion, moving
cargo, operator staging and narrow-screen readability. The integrator owns that
journey and reduced-motion behavior. Export success does not settle visual quality.
