# True-metre spatial trees, revision spatial-metre-v2

Original Coop Chaos geometry, authored in Blender 4.5.3 LTS. The original
`../trees.py` recipe runs in `../author.py`'s established helper scope. There are
no external meshes, scans, textures, or embedded concept pixels. The anatomy-v3
and infrastructure-detail boards supply direction; all shipped vertices are
recipe-authored. Editable trees are `../environment/{lowfork,splitcrown,reedside}.blend`;
runtime trees are `public/assets/environment/{lowfork,splitcrown,reedside}.glb`.

This replaces the small-tree geometry, rather than enlarging every object with
a root transform. Lowfork has a taller twisting main stem, low unequal saddles,
four broader potential household forks, continuations beyond each fork, and a
deep asymmetric outer crown. Splitcrown divides into two unequal upper leaders;
Reedside leans into a lower spreading crown. Each tree has individually authored
upper paths and crown fans. This is growth-form variation, not an implementation
of species-dependent powers. Broad angular bark normals, growth-oriented color
patches and Lowfork's old healed scar retain the preceding visual language.

All trees are authored at true metre scale, at root `asset`=(0,0,0), +Y up and
+Z forward in the glTF export. The canonical profile and adult presentation scale
come from `src/content/tree-habitats.json`. No socket is scaled or migrated here.
All three exports have `natural-perch-0/1`, `sheltered-perch-0/1/2/3`,
`sheltered-deck`, and `ladder-base` empty nodes. Home, deck, ladder, basket and
cargo transforms remain canonical. The low root paths retain the clear front
court, operator station and current hauling cleft. Runtime handedness compensation
belongs to the established renderer, not alternate source coordinates.

`qualification.json` records actual shipped/source SHA-256 hashes, dimensions,
triangle/primitive counts, finite unit normals, nondegenerate indexed triangles,
all eight canonical sockets and no authored animation. Triangle/AABB separating
axis checks cover every triangle of wood, scar and foliage: full basket travel
with 10cm margin, the conservative former larger bundle envelope, operator,
loading/ladder/landing space, the six current adult torso/tail envelopes and
continuous .4m-wide front grid approaches from left, right and front. Leg space
starts .18m above natural feet; feet intentionally contact wood. Downward BVH
rays test natural-foot support independently of shelter roofs. These are bounded
clearance checks, not all-animation or arbitrary navigation certification.

The report also tests Lowfork's four oriented future room interiors, proposed
.65m service spine/headroom, 1.5 × .9m turning landings and separate future hoist cleft against actual tree
triangles. Downward rays also establish multiple spread floor-to-fork binding points for every planned household. These are reserved design spaces, not implemented buildings or rules.
The current woven-home and technology exports have separate owners and receipts.
This qualification does not freeze their bytes during independent corrections.

## Lowfork crown and bark refinement

`lowfork-nested-crown-v3` is a Lowfork-only refinement over accepted revision
`2aeca35`. Its main/secondary branch paths, roots, six foot sockets and reserved
future room/access volumes remain fixed. The actual exported unique wood-position
SHA-256 is compared with the accepted export in `qualification.json`; this
comparison covers all 8,509 support-wood positions. The other two tree exports
and editable sources are retained byte for byte. The recipe dispatches the new
Lowfork-specific crown and bark functions only for `name == 'lowfork'`.

The crown replaces oversized .76–1.14m full-span leaf slabs and shallow fans with
63 irregular, deep support lobes, nested shoulders and 5,533 overlapping folded
leaves at .16–.30m full tip span. Recessed support surfaces carry continuous
light/shadow through the crevices; leaves cover the visible shoulders and break
exposed edges. Adjacent leaves share each shoulder's mid-green value, with
selective golden upper faces and cooler undersides. Cool interiors, warmer outer zones and
smooth volume normals are source material/normal decisions, not a baked light
or a runtime effect. Leaves and support faces are omitted conservatively from
canonical future room/service reservations; actual exported triangle checks
remain the authority for empty space.

`lowfork-growth-ribbons-v5` changes wood corner color and normals only. Broad
planes and irregular crease patches follow the nearest living branch/root path;
selective low damp pockets retain restrained moss. The old scar remains the
accepted separate grown-in mesh. No added bark relief changes support, collision
space, limb geometry or footprint. This is an original editable Blender recipe,
not a concept image or a copied mesh. Source geometry proof does not claim that
the accepted concept's finished artistic quality has been reached.

## Qualified geometry snapshot

The planning-board caption “tree height ~11m” refers to height above ground;
Lowfork's revised crown spans 14.120m across.
Dimensions are complete exported W × H × D, including roots below soil; the
separate top-Y value measures height above the authored ground plane.

| Tree | Dimensions (m) | Top Y (m) | Triangles | Primitives |
| --- | --- | --- | ---: | ---: |
| Lowfork | 14.120 × 10.873 × 7.483 | 10.579 | 44,502 | 3 |
| Splitcrown | 10.637 × 8.959 × 7.270 | 8.666 | 26,349 | 2 |
| Reedside | 9.550 × 8.024 × 6.730 | 7.730 | 23,621 | 2 |

Exact source/runtime hashes and bounds are in `qualification.json`. `proofs.json`
fingerprints the paired source renders, editable planning fixtures and their mesh inputs. The tree
recipe is qualified against author.py SHA-256 `01396de56954fd478ff3a34f74f891359b2ba9a5cec91e43fd600c22d7df03b1`.
The 10,099-triangle increase over the accepted 34,403-triangle Lowfork supplies
smaller overlapping leaves and nested crown coverage; the support wood is
unchanged and the export retains three primitives. `refinement-generation.json`
records byte-identical independent generation and bark-only re-export after
reopening the editable source. Broad bark normals and color are computed from
explicit vertex geometry, avoiding stale Blender normal/centroid caches.

## Static habitation study

`planning.py` produces editable `opening-study.blend` and `mature-study.blend`,
JSON actual-mesh packing evidence and labeled source renders in
`output/playwright/tree-metre-v2/`. The opening has four adults in the two
commissioned berths of the existing home and two of the existing sleeping deck.
The separate `*-occupied-whole-final.png` anatomy renders deliberately populate all
six current foot sockets (including both natural perches) as a clearance gauge;
they do not represent the four-bird game roster.

The mature cutaway has exactly four future households with six adults each.
Household A represents the lower neighborhood expanded onto the adjacent fork;
the old starter floors become shared work/arrival landings with zero additional
counted berths. This is a future layout, not a promised construction sequence.

The tested clear interior floor is **2.4 × 2.2m**, increased from the initial
2.4 × 1.8m study envelope to accommodate complete bodies/tails, two rows and a
front interior space. Two 1.5m perches give 3m total. Adult centres are .5m apart across
rows and .85m between rows; the side aisle is .65m and the external arrival
landing is 1.5m wide × .90m deep, excluded from sleeping-floor area. Actual frozen source
meshes at canonical .365 scale are used, not proxy dots. Their complete AABBs
must fit the floor, stay outside the side aisle, avoid one another and remain
under .9m headroom. The study JSON reports those checks and each resident's
bounds. It does not certify flapping/turning animations or furnish a built house.

Sage geometry marks proposed external branch/bridge circulation. Ochre geometry
marks a distinct future ground hoist and beak-and-foot climb to the first
neighborhood, with upper stages reserved. The current implemented hoist remains
unchanged. In the mature render only, foliage and shelter roofs
are omitted to reveal all four rooms; labels disclose the cutaway. The normal
occupied tree render retains opaque foliage. Four, 24, 16 (Splitcrown) and 12
(Reedside) are habitation planning targets, conditional on food, water and care;
no biological carrying capacity or numeric structural load is claimed. Only
Lowfork's 24-resident future layout is occupied and measured in this slice.

## Bounded reproduction

```sh
"$BLENDER_BIN" --background --threads 2 --python assets/sculpted/author.py -- lowfork
"$BLENDER_BIN" --background --threads 2 --python assets/sculpted/trees/reproduce.py
"$BLENDER_BIN" --background --threads 2 --python assets/sculpted/trees/qualify.py
"$BLENDER_BIN" --background --threads 2 --python assets/sculpted/trees/render.py -- lowfork occupied final
"$BLENDER_BIN" --background --threads 2 --python assets/sculpted/trees/planning.py -- opening final
"$BLENDER_BIN" --background --threads 2 --python assets/sculpted/trees/planning.py -- mature final
npx vitest run assets/sculpted/lowfork/lowfork.test.js
```

These source renders use the runtime camera orientation and handedness with a
bounded orthographic studio framing. They are source geometry evidence. Actual
Babylon lighting, the three-tree grove overlap, saved state, world routes and
full application qualification remain with the runtime/browser owner. No commit,
publication, deployment or population-growth mechanic is implied.

The refinement comparison retains the fixed original camera/light in
`output/playwright/lowfork-refinement-v3/before-occupied-whole.png` (accepted
`2aeca35` input) and `after-v3-occupied-whole.png` (current qualified input).
These opaque source renders are distinct from the runtime owner's matched
Babylon captures. Neither the source proof nor the static planning cutaway
claims concept-art parity or animated circulation clearance.
