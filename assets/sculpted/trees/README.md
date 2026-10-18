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

## Qualified geometry snapshot

The existing planning-board caption “tree crown ~11m” refers to height; the
recipe now labels this “tree height ~11m”. Lowfork spans 14.541m across.
Dimensions are complete exported W × H × D, including roots below soil; the
separate top-Y value measures height above the authored ground plane.

| Tree | Dimensions (m) | Top Y (m) | Triangles | Primitives |
| --- | --- | --- | ---: | ---: |
| Lowfork | 14.541 × 10.952 × 7.767 | 10.659 | 34,403 | 3 |
| Splitcrown | 10.637 × 8.959 × 7.270 | 8.666 | 26,349 | 2 |
| Reedside | 9.550 × 8.024 × 6.730 | 7.730 | 23,621 | 2 |

Exact source/runtime hashes and bounds are in `qualification.json`. `proofs.json`
fingerprints the paired source renders, editable planning fixtures and their mesh inputs. The tree
recipe is qualified against author.py SHA-256 `9fcb7f3121393c448e6f441bf5a6cba7ff3c28bd288ec425e7a66dea871e4803`.

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
"$BLENDER_BIN" --background --threads 2 --python assets/sculpted/author.py -- trees
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
