# Living valley and preserved landscape studies

## Current default: Living valley

The New game form's **Refined small valley** creates a functional **Living valley**
settlement, not the earlier tree-free survey. Its single `Settlement` owner handles
construction, renewable reeds, separate typed food, local stores, care, eggs and
named growth. `src/content/settlement-world.ts` binds saved world identity to the
36×28m/.5m-cell [inhabited map](../assets/maps/INHABITED-VALLEY.md), authoritative
placements and [Longbough habitat](../src/content/valley-habitat.json). Geometry
and surface-distance routing remain shared with the terrain renderer.

Longbough's bare living asset is present from the start. Two natural branches are
available; six reeds earn the lower two-place Boughhome, and the real hauling
basket's first construction lift unlocks the two-place middle deck. There is no
free upper platform. Total adult capacity is six, with four starting adults and
room for two eventual grown young. The separate ground nursery adds two dependent
care places, not adult berths. Fixed store/nursery footprints remain reserved from
world creation through completion; markers expose the sites and all work, pickup,
care and young arrival uses their legal ground approaches.

The main-tree camera faces the authored habitation front and fits crown/root/court;
map fit is for orientation and selected-bird framing shows physical work. Adults
and attached cargo use `.45625` presentation scale. Ground movement and authored
access measure physical metres: ground travel uses nominal 1.4m/s with existing pace modifiers, while authored access uses fixed nominal 1.4m/s.
Access first routes to the canonical tree workcell, then follows shared grounded
approach and climb/flight waypoints. Natural landing folds wings and adopts the
authored perch heading; this is presentation of saved progress, not new flight rules.

Codec9 stores an explicit world/scenario identity and validates canonical resource
fixtures, legal ground positions and mapped flight landings. Woodland v1–v8 saves
retain their decoder, two-metre grid, habitats, `.365` scale and timing. Old
`ochre-valley` surveys remain separate landscape saves with their original map and
20 generic bundles. **Start a living valley** opens a new-slot form; it does not
convert or overwrite a survey. All kinds use the existing device library and
writer locking. The static title Tree art study still creates no settlement state.

The current map demonstrates supplied laying, incubation, two grounded young and
growth into six adult residents. The conservative forecast averages routes to all
open food patches; optional remote patches in future maps could reduce its estimate
even when nearer supply is sufficient. That limitation needs revisiting before
such map expansion. Combat, vision, territorial capture and moving-unit collision
remain unimplemented. Foliage occlusion, terrain/material polish and forest-scale
performance remain production work. [Integrated evidence](../output/inhabited-valley-v1/README.md)
distinguishes rule fixtures, actual browser work and the primary's Codex-browser proof.

## Playable clearing art pass, 2026-10-28

The [clearing qualification](../output/clearing-beauty-v1/README.md) records a scoped
renderer/asset improvement to the existing Living valley: a warm irregular work
court, root leafmould, low traversable plant islands, overlapping cool scenic
groves, subdued turf, localized stone and shallow-water colour. Crown/root/court
framing is tighter and responsive; Whole valley remains an orientation view.
Final golden-green hero foliage preserves habitat geometry and all earned stages.
No map, route, resource, simulation, codec or saved-state semantics change.

A genuine isolated new game builds the six-reed home, then preserves its paused
state through export/readback and refresh. Late scenery failure/retry, reduced
motion, narrow rendering and local performance are included in the receipt.
Preserved angular banks and repeated stylized canopy forms remain art limitations;
local frame measurements do not establish large-map or forest performance.

## Preserved tree-free surveys

Earlier Small valley games use `ochre-valley`, version `2` (**Crescent Basin**, seed
7319): a 32 × 24 metre continuous heightfield sampled at half-metre cells. One
western crescent bluff surrounds an open basin; a meandering creek has a broad
direct ford and a longer flank crossing. Smooth court constraints preserve
contiguous buildable areas of 6.5, 14.5 and 4 square metres. These are geography
reservations, not implemented construction. Closing the direct ford leaves a
30.79 metre court-to-court route instead of the normal 20.39 metre route.

The reproducible [design-time authoring pipeline](../assets/maps/README.md)
combines landform fields, constrained courts, creek depth and seeded relief.
It validates routes and clearings before exporting a content snapshot. Three
small recipes are retained offline; only the curated default ships. There is
no runtime random-map UI or large-map navigation implementation.

`src/content/maps.ts` defines the shared geometry, traversal and scenario
contract. Saved version `1` retains its exact original three terraces, four
ramps, fords and rock geography; the catalog resolves each ID/version explicitly.
Shared rock footprints block terrain clearance before decoration. The renderer
consumes their positions, scales and rotations rather than inventing obstacles.

Pure simulation finds deterministic routes, rejects steep slopes, cliff jumps
and diagonal corner cuts, and samples the same terrain triangles as the renderer.
Route costs and movement measure physical surface distance in metres, including
the bend at a shared cell edge; half-metre refinement does not halve bird speed.
Named chickens walk those routes. A delivery order transfers actual reed bundles
from the west court into a carrier and then into the east court. Interrupting a
trip retains cargo; all stock locations sum to the scenario's initial supply.
These demonstration reeds do not modify the woodland economy's separate ledgers.

The renderer loads chicken models and original low dressing, with no tree GLBs
in this scene. Overview framing follows map dimensions. Valley v2 starts in
tactical follow on desktop and narrow layouts; its bounded camera controls are
described below. Valley v1 retains its original framing. Reduced motion stops
optional water/pose animation while essential ground movement and written route
feedback remain available. Keyboard-accessible chicken and landmark controls
provide an alternative to terrain picking.

`src/persistence/game-save.ts` dispatches a portable landscape envelope containing
its exact map ID/version and saved route progress. Unknown maps/versions fail
visibly and retain original bytes. Existing settlement encoders, v1–v8 migrations
and tree identities remain unchanged. Both modes share the existing device
library, writer locks, revisions, checkpoint recovery and import/export. Account
copies currently accept woodland settlements only; the interface explains using
Export/Import for valley games.

This is a local implementation study. Concept resemblance, actual-camera asset
quality, performance on other devices and the larger gameplay design require
separate evidence and acceptance. A successful build does not prove those layers.


The original [landscape-v3 rock kit](../assets/sculpted/landscape/README.md)
includes editable Blender sources and export provenance. Its decorative instances
preserve the authored materials. [Local qualification evidence](../output/landscape-qualification/README.md)
records the original study. [Terrain v2 qualification](../output/landscape-qualification/terrain-v2/README.md)
records the new revision, actual scene captures and remaining acceptance limits.

The v2 [surface pass](../assets/sculpted/surfaces/README.md) adds original fine
meadow and weathered-stone tiles, textured worn earth, irregular wet/gravel masks
and a visible shallow bed. Original rock bodies receive matching stone detail.
Water has restrained normal ripples and a soft response to the existing sky.
This changes presentation only: exact map bytes, heights, triangles, obstacle
footprints, routes, camera, lighting and portable state stay fixed. Valley v1 and
woodland keep their original appearance. [Surface evidence](../output/landscape-qualification/surfaces-v1/README.md)
records actual-camera results, CPU bake/cache cost and local frame measurements;
it does not establish finished art or performance on other devices.


## Valley v2 readability and bounded zoom

The v2 study presents all four adults at 1.25 times their prior render scale
(`.45625` from `.365`), including their attached cargo. Their proportions, foot
origins, ground offset, saved positions and physical movement are unchanged.
The selected ring has a `.9m` centreline diameter and `.035m` tube, rather than
scaling the old ring. Its label follows the actual animated body/cargo bounds.

Four instant camera stops preserve the elevated orientation: whole valley uses
the original exact map-fit view; wide, tactical and close follow the selected
chicken with orthographic vertical halfspans of 6m, 4.2m and 3.2m. Tactical is the
default at every viewport size. The whole-valley/follow toggle remembers the last
follow stop. Accessible minus/plus buttons and a debounced wheel over the canvas
step between these bounds. Ctrl/Meta wheel remains available to the browser.
There is no free pan or rotation, and reduced motion introduces no zoom glide.
Camera/selection are session presentation, never portable simulation state.

This supersedes prior fixed-scale/no-zoom guidance for **valley v2 only**.
Woodland and valley v1 retain their existing scale, controls and camera behavior.
[Readability evidence](../output/landscape-qualification/readability-v1/README.md)
records actual projected pixel sizes, controls, route/save alignment and limits.
Whole-valley view is for orientation; individual birds remain small on narrow
screens. The larger visual footprint does not add physical body clearance,
collision or combat rules to the point-based traversal simulation.

## Separate tree art study

The title-screen Tree art study is a read-only visual comparison using the same
`createValley` scene owner, map, terrain materials and chicken scale. Its
optional study presentation loads three natural-tree assets at one grounded
origin, with four staged birds and a cargo bundle. Whole-tree framing uses their
combined bounds; chicken-scale framing uses the established 4.2m tactical
halfspan. Explicit branch inspection hides foliage only.

`TreeArtStudy` owns accessible comparison controls and the scene lifetime. It
does not mount `LandscapeApp`, open a game session, start simulation intervals,
issue movement orders or write storage. Tree transforms and static fixture
positions never enter map navigation or portable state. Return to title and retry
dispose the scene, including late loads. Woodland assets and playable valley v1/v2
remain unchanged. This does not establish playable trees, homes, combat, vision
or unit collision. [Tree-art direction](../art-direction/tree-design-exploration.md#isolated-natural-tree-runtime-comparison)
and [local evidence](../output/landscape-qualification/tree-exploration-v1/README.md)
record the comparison and its remaining visual limits.

The subsequent Longbough **building-scale study** enlarges only that isolated art
asset and stages static deck massings and adult figures. It opens in Inhabited
detail with structures shown, with Whole tree and Chicken scale available.
Structure and foliage toggles remain independent; only Longbough exposes the
structure/detail controls. Deck fixtures come from source-owned measured floors,
use the same .45625 adult scale, and imply no capacity or working access.
Inhabited detail hides the ground gauges; Whole tree and Chicken scale show them.
Hiding structures hides the staged deck figures with them.
Crowncourt/Windward, the playable valley map and all save/navigation contracts
retain their previous meaning. [Building-scale evidence](../output/landscape-qualification/tree-habitation-v1/README.md)
records the new asset revision and actual-camera acceptance.

The 2026-10-27 refinement responds to the user's rejection of the previous v4
tree's art fidelity. It uses a separate rebuilt Longbough and study-only angled
lighting, cool shaded fill and softened contact shadows. Inhabited detail uses
beta 1.10; Whole tree and Chicken scale retain their established angle. These
presentation changes do not modify playable valley lighting, map bytes, routes,
saves or woodland assets. Earlier functional acceptance is not approval of the
rejected art. The primary accepted the final v8 actual-camera refinement as a substantial
improvement, with stylized foliage, joinery, root grain and stone limits still
visible. [Refinement evidence](../output/landscape-qualification/tree-art-refinement-v2/README.md)
separates visual review, actual floor/cargo/framing proof, save isolation and local
rendering cost. This static hero study establishes no playable habitation or
forest-scale performance claim.


The separate bound-reed building slice adds fitted Boughhome hood modules to
this static Longbough presentation. The existing tree and floor/figure metadata
remain intact; the new sibling glTF uses the same source transform and structure
toggle. This is a close art proof, not saved Woodland housing. That earlier building-kit slice put playable Boughhome,
reed store and ground nursery in Woodland, retaining its original scale and anchors.
The current Living valley integration above is a separate functional host adaptation. [Building-kit evidence](../output/building-implementation-v1/README.md)
records both consumers and their distinct claims.

## Refined Living valley v2, 2026-10-28

The default new inhabited game uses world `inhabited-valley`, version 2. Original
small valley remains available as version 1, with exact saved geography and state.
The existing New game form creates a distinct library slot; no existing slot is
upgraded or moved. This is separate from the older `ochre-valley` survey versions.

The refined terrain keeps the 36×28m extent, 0.5m cells, 2.15m Longbough court,
fixed pads/approaches and resource meanings. Broader unequal soil shoulders,
shallow coves and intermittent western rock heads replace the parallel steep
rims. Both fords and the longer alternate route remain functional. Source,
snapshot and validation receipts live in [the map handoff](../assets/maps/INHABITED-VALLEY.md).

[Second clearing qualification](../output/clearing-beauty-v2/README.md) separates
new-version gameplay/save proof from art acceptance. Broad grass uniformity,
simplified scenic crown shoulders and water microdetail remain art refinement;
this is not exact concept parity or a forest production budget.
