# Longbough Valley: inhabited map v1

This is a new `inhabited-valley` / version `1` geography and placement contract for
one settlement. The 36 × 28 metre playable rectangle uses 72 × 56 half-metre cells.
The larger footprint is deliberate: the original 32 × 24 metre terrain study's
small courts cannot hold the actual v8 hero roots, open work court and measured
ground buildings. Existing Ochre Valley v1/v2 authoring and geography are unchanged.

Regenerate and qualify from the repository root:

```sh
python3 scripts/measure-inhabited-map-props.py
node scripts/author-inhabited-valley.mjs
node scripts/qualify-inhabited-valley.mjs
npx vitest run src/content/inhabited-valley.test.ts
```

The source owner is `src/content/inhabited-valley-generator.ts`. It exports the
map and the sole authored placement contract; the runtime consumes the generated
JSON rather than maintaining another placement list. `at`, `work`, `approach`
and spawn positions are map cell coordinates. Physical dimensions and source
local offsets remain metres. Source +Z is the front of Longbough and buildings.

Longbough's anatomical origin sits on the level west shelf at world
`(-8.75, 2.15, -4.25)` metres. The source's negative root underside remains buried;
never translate the source minimum Y onto terrain. Its complete crown remains
within the playable plan rectangle. The open court and ladder threshold occupy
the source's positive-Z/east side. The nursery is beside the roots, separate
from the larger work court. West and east stores have distinct spatial purpose.
The source cache contains eight reeds; construction reeds and food are separate
resource placements, with two reed stands and three food habitats.

The nursery's nearby west commons contain the staple seedheads at `(-7.25, 3.25)`
and protein leaf litter at `(-12.75, 3.25)` world X/Z metres. Mixed forage remains
across the creek at `(5.25, 5.75)`, near the east ford; both reed stands retain
their original positions. Physical routes from the nursery approach are
3.62132, 3.12132 and 18.04835 metres respectively, averaging 8.26366 metres.
Authoring guards the accepted mean route budget of 10.29 metres. This is a
geographic fit condition; runtime owns food forecasts and sustainable care proof.

The hero's canonical root reservation conservatively contains the measured full
wood envelope below one metre, including buried roots, plus .35 metre travel
clearance. It is a reservation, not an exact triangle collision mesh or canopy
collision. Its intentionally blocked cavities prevent trunk shortcuts without
blocking the ladder or front court. Near-ground geometry evidence is the asset
owner's `assets/sculpted/valley-playable/root-sections.json`. The rectangular
bounds and clearance are explicit in the generated placement contract.

Two small birches and one willow use existing original dressing assets, totalling
24,698 triangles. They use measured low-wood source bounds, scaling and .35 metre
route clearance for their canonical map obstruction. The willow's origin is
`(-10.25, 3.75)` on level ground beside the west leaf-litter habitat. Its canopy
projection overlaps the habitat while its trunk stays outside the entire feeder area. Its measured
source AABB overlaps the habitat area by about .535 × 1.982 metres; this describes
a canopy edge, not exact shade or crown collision. Rock source bounds exactly match the shared rotated half extents
used by terrain rendering and blocked map cells. The GLB hashes, measurements,
source-frame assumptions and measurement recipe are retained in
`inhabited-map-prop-bounds-v1.json` and `scripts/measure-inhabited-map-props.py`.

`inhabited-valley-v1-receipt.json` records output hashes and deterministic checks.
The author validates before writing: all named approaches and resources connect;
closing the direct ford preserves a longer flank; routes honor shared edges and
corner blocking; steep cells remain blocked; scene/nav triangle heights agree;
whole building footprints, clearance and front aprons fit level buildable ground;
the front court and complete resource approach areas stay clear. Ground-building footprints plus body clearance are canonical obstacles from world
creation; their suitable terrain remains `buildable: true` independently of
`traversable: false`. Pads expose their exact `reservedCells` in the placement
contract. Construction stages never change topology. Tests reject every pad
centre as a movement destination, exclude reserved cells from routes, preserve
legal approaches and check identical routes before and after completion.

`inhabited-valley-v1-plan.svg` and its Quick Look PNG are diagnostic plans, not
actual 3D scene acceptance or combat balance proof. Yellow marks the direct route;
coral marks the longer flank. The map preserves the creek, pool and west bluff.
Runtime integration, saved settlement semantics, visible reserved-pad markers,
actual 3D and narrow-screen acceptance belong to the runtime qualification owner.
No commit, publication or deployment is performed by map authoring.

## Additive refined version 2

`node scripts/author-inhabited-valley.mjs --version=2` authors the separate
[version 2 snapshot](../../src/content/generated/inhabited-valley-v2.json),
[placement contract](../../src/content/generated/inhabited-valley-placements-v2.json)
and [qualification receipt](inhabited-valley-v2-receipt.json). The default command
still regenerates version 1. The original v1 snapshots are preserved byte for byte.

V2 retains all placement coordinates and meanings, source stock, roots and reserved
pads. Only version/revision differ in the placement document. The shared terrain
has wider asymmetric creek shoulders, two shallow coves, a broad court falloff
and localized western bluff heads. Routes, slope blocking, triangle agreement,
full pad/apron relief, resource footprints and alternate ford are qualified before
any snapshot is written. New games use a separate UUID slot; no v1 save reprojection.
