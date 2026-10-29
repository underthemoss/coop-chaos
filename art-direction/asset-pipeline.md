# Asset pipeline

`assets/` holds source-art instructions and, later, appropriately licensed source
files/references. `public/assets/` holds only approved browser-ready exports.
No final models or third-party artwork ship in this foundation. Generated concept
boards stay under `art-direction/concepts/`; they are design evidence, not browser
textures or a substitute for mesh/rig qualification. Do not copy
copyrighted reference imagery into this public repository without rights.

1. Brief from story and the visual bible, using the accepted visual direction in
   [tree exploration](tree-design-exploration.md), the proposals in
   [chicken exploration](chicken-design-exploration.md), and
   [tree kinships](../story/tree-kinships.md) as appropriate. Generated concept
   PNGs are references, not shipped GLBs. Keep botanical family, tree growth form
   and individual identity separable; chicken lineage is not a job or moral caste.
   For a chicken, establish mobility and usable perch/access before authoring clips;
   never assume all future bodies can use the opening flock's flight. Brief identity,
   motive, scale,
   silhouette, emotional beats, camera distance, and required animation clips.
2. Author in Blender. Keep editable source, consistent naming, meter scale,
   applied transforms, a clear root, and stable animation clip names. Check wing
   and foot deformation. Agree a bone/clip contract before many characters depend on it.
3. Export glTF 2.0 binary (`.glb`) with supported PBR materials and embedded assets.
   Verify scale, handedness/orientation, origin, bounds, textures, and animations
   inside Babylon, not just in Blender.
4. Place approved exports under `public/assets/characters/` or `environment/`.
   Add provenance: author/source, license or permission, modifications, file and
   export version. Source and runtime bytes have distinct jobs.
5. Load through full `@babylonjs/loaders/glTF`; it is pinned
   alongside `@babylonjs/core`. Keep import/loading behind `src/game/`. Preserve
   simulation identities and presentation hooks when replacing procedural meshes.
6. Measure download size, GPU memory, draw calls, animation readability, and
   load failure behavior on the actual browser baseline before adding compression
   or texture budgets. No speculative decoder/CDN dependency yet.

Large binary source files may need Git LFS later; choose that policy with actual
assets. Do not introduce remote hosting or a build/export pipeline implicitly.

## Current Blender authoring proof

`npm run assets:build` runs [the portable authoring launcher](../assets/sculpted/build.py)
with Blender 4.5 LTS and Python 3. Set `BLENDER_BIN` to its executable when Blender
is not on PATH. Normal install, build and check consume the checked exports and
never require Blender. [Source provenance and coordinates](../assets/sculpted/README.md)
cover the original environment geometry, generated surface albedos and
[chicken pose contract](../assets/sculpted/chickens/README.md).

The sources retain editable `.blend` files, deterministic authoring recipes,
materials, named anchors and seven chicken action clips (including settled roost). These clips animate rigid
articulations; they are not finished skinned production rigs. The environment
kit includes three trees, a woven home and store, cut reeds, growing reeds and
understory. A separate editable dressing kit adds birch/willow silhouettes,
volumetric bushes, grass, cattails and rocks. The current terrain uses a quiet
world-located earth/grass/woodland albedo mask; generated albedos remain retained
palette studies and reproducible derivatives. Concept boards are references; no scene illustration is used as a
background. Generated ground albedos are surface detail with independent geometry
and lighting. Exact tile seams and material transfer need actual-camera inspection.

The previous [Node experiment](../assets/models/export-models.mjs) is visually
rejected and archived. Its output is confined to ignored `output/legacy-node-assets/`;
it cannot replace runtime exports. A successful GLB export or use of Blender is
not visual acceptance. The [art-led sandbox brief](opening-view-exploration.md)
sets the opening-view-v2 comparison, including close artifacts, the live fixed
camera, motion, materials and environment. Current visual acceptance remains open.

The renderer stages the complete kit, reports loading/failure, permits retry and
disposes late async loads on unmount. Preserve simulation identities, cargo,
perch/deck/ladder anchors and saved coordinates when replacing art. In legacy Woodland, all three
inhabited trees use metre-scale habitats; homes, ladder approaches, flight
endpoints and occupied perches share that transform. Adults keep their independent
`.365` presentation scale; never enlarge them to compensate for tree framing. Keep fixed
responsive framing, with no camera navigation or zoom. Validate topology, finite
normals, PBR materials, embedded resources, anchors and clips, then qualify actual
movement/work, attachment alignment, narrow layout and measured local performance.

Valley v2 has a scoped exception to that woodland framing contract: all adults
and their attached cargo use `.45625` render scale (25% larger), with original
proportions and foot origins. Its bounded map-fit / 6m / 4.2m / 3.2m camera
halfspans and actual head/cargo label anchors are owned by the
[landscape study](../docs/landscape-study.md#valley-v2-readability-and-bounded-zoom).
This does not change source GLBs, woodland/v1 scale, map clearance or save data.

For the current lighting proof, compare assets at the same runtime camera before
changing effects. The close Blender renders use Cycles/AgX and studio key/fill/rim;
they are not a matched Babylon lighting baseline. The runtime now loads an original
analytic sky, prefiltered locally to a checked `.env`, alongside its directional
sun, contact shadows and restrained SSAO. See the [source/provenance and conversion
steps](../assets/sculpted/README.md#original-ambient-sky). No remote demo environment
is fetched. StandardMaterial diffuse colors use their documented gamma input;
imported linear glTF PBR factors remain untouched. The controlled comparison keeps
exposure, sun and camera fixed; image processing uses its standard output treatment
without an additional tone mapper. Geometry, material structure and composition
remain the quality owners; adding effects does not establish visual acceptance.

The workflow follows Babylon's [HDR environment guide](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/HDREnvironment)
and [PBR environment irradiance documentation](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/masterPBR).
Helena Hansen's original [Lush Tree breakdown](https://gamesartist.co.uk/lush-tree/)
is a craft reference for authored foliage volume and material structure, not a
source of copied assets. Compare matched camera/light evidence before attributing
a flat crown to the exporter or adding another effect.

The Lowfork refinement keeps two comparisons separate: the new crown under the
previous runtime light, then a warmer directional key with cooler, lower ambient
fill under the same fixed camera and exposure. Root-edge leafmould, fallen leaves
and small partly buried stones are local surface dressing; the front workcourt
and existing movement rules remain clear. Check cream feathers, occupied faces,
raised bundles and evening readability before accepting either light or materials.

## Canopy additions

`assets/sculpted/technology/author_technology.py` is included in `assets:build`.
It authors the lateral sleeping deck and hauling basket with editable Blender
sources and checked GLBs. The content-owned [habitat contract](../src/content/tree-habitats.json)
defines tree-local perches, supported access routes, moving basket, cargo socket,
operator and scalable lift-rope anchors. Its generated [export receipt](../assets/sculpted/technology/contract.json)
records the resulting asset hashes and sockets; it is not a second source of truth. The runtime applies one shared tree transform to art and occupants;
saved simulation progress drives essential lift movement even under reduced motion.
The basket is an original woven beak-scale rig, not a powered elevator.


## Inhabited tree proof

Lowfork anatomy is being compared with the provisional [anatomy and infrastructure
exploration](tree-design-exploration.md): supported home forks, crown windows,
clear cargo shaft and accessible occupied berths. Keep the six existing berth
endpoints and saved movement parameter stable while replacing the anatomy. Qualify
actual mesh/node world coordinates after glTF handedness and tree scale, not only
matching numeric tables. The upper sleeping route must follow the ladder, home
edge and connecting ramp in both directions. This proves usable habitat; it does
not introduce food, shade or predator effects. Concept fidelity remains a separate
visual acceptance condition.

## Root nursery presentation

The covered nursery reuses the original `woven-home.glb` rainhood group (bundled
reeds, cross lashings and twig supports), with its deck/ladder hidden, above the
existing `woven-store.glb` base. Presentation scales the roof to a low open-front
shelter and a second store to a shallow egg nest. Sources remain
`assets/sculpted/author.py`; no new mesh export or external asset is introduced.
Small pale egg meshes are 0.08m across and 0.104m high, clustered in the nest;
saved viability and hatch state control their visibility. Care/entry positions
and simulation footprint are unchanged.

## Action-card illustrations

Original Coop Chaos action illustrations were generated with the built-in OpenAI image generator on 2026-10-20 under the art owner's direction. No third-party imagery is used. Retained RGBA originals live in `assets/ui-actions/`; runtime alpha-preserving 256px PNG exports live in `public/assets/ui/actions/`. Source images are not loaded by the game. Normal downsampling/PNG optimization adds no redraw. The reed bundle, woven home, leaf food parcel and sheltered egg nest are interface illustrations, not world assets, recipe variations or gameplay markers. `ActionArt` presents them on plain cream/ochre cards with bark-green text; no textured background competes with the labels. Source-generation provenance is recorded with the originals. Actual alpha and cream-card rendering are checked in browser acceptance.


## Tree-free valley rock kit

The original [landscape-v3 kit](../assets/sculpted/landscape/README.md) retains
editable Blender sources, its deterministic authoring recipe, provenance and
actual-GLB validation records. Runtime exports are `valley-cliff-ledge.glb`,
`valley-boulder.glb` and `valley-scree.glb` in `public/assets/environment/`.
The valley renderer preserves the opaque rough PBR materials and vertex colors
through GPU instances. The kit supplies decorative rock shoulders and gravel;
the shared map still owns traversal and ramp clearance. No tree GLBs load in
this scenario. [Landscape qualification](../output/landscape-qualification/README.md)
records actual-camera evidence separately from the studio contact sheet.

The selected v2 valley places two partially buried ledges and three boulders from
content-owned transforms and blocked footprints. Actual Babylon instance bounds
were checked against those footprints; large forms cast directional shadows.
The [map authoring pipeline](../assets/maps/README.md) owns shared heightfields,
creek and scenic continuation. Continuous slope/soil/creek-distance masks blend
the original meadow and earth albedos; deterministic instances add sparse cover.
No flattened concept image supplies terrain. [Terrain v2 evidence](../output/landscape-qualification/terrain-v2/README.md)
records actual-camera acceptance as an improved foundation, not finished art.

## Valley v2 surface polish

Original [surface tile sources and exact prompts](../assets/sculpted/surfaces/README.md)
retain generation provenance and reproducible 1024px JPEG derivatives. A single
v2 terrain material blends hardware-filtered meadow, triplanar stone and the
original earth tile using continuous slope/soil/shore masks. Rock props receive
render-only UVs and a neutral mineral tint; source GLBs, geometry, moss material
and shared footprints remain intact. The creek uses gentle directional normals
and the existing sky environment, with optional motion frozen under reduced
motion. No reflection render target or new lighting setup is introduced.
[Surface qualification](../output/landscape-qualification/surfaces-v1/README.md)
separates visual acceptance, local performance and unchanged map/save contracts.

## Natural-tree comparison assets

The [isolated tree source](../assets/sculpted/valley-trees/README.md) owns editable
Blender files, deterministic authoring, actual-GLB bounds and provenance for
`longbough-study.glb`, `crowncourt-study.glb` and `riverside-study.glb` in
`public/assets/environment/studies/`. The last file displays as Windward. These
new filenames preserve all woodland assets and their saved identities.

Each asset uses metre-authored +Y up, +Z open front, a center-ground `asset` root,
and separate `living-wood` / `crown-foliage` mesh nodes. Opaque rough bark/foliage
materials and authored vertex colors remain intact. The study rotates the open
face toward the fixed camera without changing biological scale. Foliage can be
hidden for explicit anatomy inspection. Asset positions are render-only and do
not add obstacles or tree functionality to the unchanged valley map.

The title study loads all three candidates once per scene, computes one union
fit, enables one candidate at a time, and disposes scene resources on exit or
retry. Late asynchronous loads cannot revive an exited study. Only this optional
presentation loads tree GLBs; the playable small valley remains tree-free.
[Tree-study evidence](../output/landscape-qualification/tree-exploration-v1/README.md)
separates visual acceptance, local rendering cost and unchanged save/asset proof.

The later Longbough building-scale pass uses the exclusive
`longbough-habitation-study.glb`, preserving the three earlier natural-tree bytes.
Its [habitation source contract](../assets/sculpted/valley-trees/HABITATION.md)
and [asset receipt](../assets/sculpted/valley-trees/habitation-receipt.json)
retain the reference provenance and reproducible original material sources.
Separate `study-structure-*` meshes contain deck/shelter/access massing; wood and
foliage retain their existing independent tags. A compact source-owned
`habitation-presentation.json` records the actual deck floors, static bird
positions and detail bounds. These render-only coordinates never enter saves,
map geometry or habitat rules. The renderer clones original adult presentation
meshes at the same .45625 scale onto those measured floors; source characters
remain untouched. [Building-scale evidence](../output/landscape-qualification/tree-habitation-v1/README.md)
qualifies actual floor contact, cargo, framing and disposal separately from source
renders. Source coordinates pass through the actual glTF handedness transform;
anatomical Y0 stays on terrain while the closed root underside remains buried.
The user's closer reference was delivered 2026-10-26.

On 2026-10-27 the user rejected that v4 inhabited prototype's art fidelity.
Historical functional acceptance and measured floor contact remain evidence,
not approval of its bark, crown, branching or scaffold-like structures. The isolated
refinement uses a separate asset and presentation metadata, preserving v4 and
all three natural v5 exports. The asset owner controls original geometry,
materials, fitted floors and root dressing; the runtime owner controls only the
study's presentation, lighting and actual-camera qualification. Playable maps,
saves, woodland assets and adult/cargo scale remain unchanged. The v8 source-owned
`longbough-refinement-study.glb` and `refinement-presentation.json` now supply the
default Longbough study. Its [source contract](../assets/sculpted/valley-trees/REFINEMENT.md)
and [frozen receipt](../assets/sculpted/valley-trees/refinement-receipt.json) record
original painted bark/timber sources, embedded textures, floors and export
checks. Runtime preserves those PBR materials and source geometry; the angled
key/cool fill/contact shadow treatment applies only to the optional study.
The primary accepted substantial visual improvement on the final actual frames,
with prototype foliage, joins, root grain and stone limits retained in
[qualification](../output/landscape-qualification/tree-art-refinement-v2/README.md).
The 18,854,276-byte, 135,942-triangle hero asset is not a forest production budget.


## Bound-reed habitation kit (27 October 2026)

The authorized first building implementation uses separate original exports in
`public/assets/environment/buildings/` and editable source/provenance in
`assets/sculpted/buildings/`. The existing Woodland living trees and habitat
coordinates remain the functional hosts. Boughhome, local reed store and ground
nursery implement the existing recipes/capacities, using visible bound reeds
rather than creating an unsupported fabricated-timber supply.

`src/game/building-presentation.ts` maps saved delivery/work/completion to part
visibility. Bases, frames and finished containers/hoods are real authored groups;
complete structures are never vertically squashed for construction. Dedicated
nursery geometry replaces borrowed home/store parts, while actual saved food,
eggs and dependents remain renderer instances from simulation state. Store
bundles reflect actual local reeds, not decorative inventory.

The host-fitted Longbough module export shares the static tree’s glTF source
frame as a sibling import, follows its structure toggle and disposes with it.
It adds no saved building, floor capacity or navigation. Woodland .365 and study
.45625 adult presentation scales remain distinct. The current Living valley uses .45625 with a separate authoritative habitat profile. Old asset bytes remain
available. A separately exported sleeping-deck approach correction retains the same saved
access anchors and useful support under both top berths. Its short tied-grip
clamber uses a renderer-only .35-radian upper descent posture, not a new route
or continuous walking floor. The main ladder has an arrival opening and
connected side grips. [Frozen kit/source receipt](../assets/sculpted/buildings/asset-receipt.json)
records exact bytes, fit samples, support contacts and reproducibility.

See [building design](chicken-civ-buildings.md#authorized-first-playable-habitation-kit)
and [runtime evidence](../output/building-implementation-v1/README.md) for
qualification status, source receipts, exact hashes and remaining limits.

## Playable Living valley host adaptation

The default inhabited world now loads `environment/valley/longbough-living.glb`
and `longbough-woven-kit.glb`. The bare tree preserves accepted v8 wood/crown positions, indices and proportions,
with anatomical origin Y0 and metre units. The clearing appearance pass changes
vertex palette, normals and wood UV scale while preserving physical geometry.
The woven kit implements earned lower home2, middle deck2 and the real lift; no
static free upper floor is imported. `src/content/valley-habitat.json` is the one
authoritative anchor/stage/socket/path profile consumed by authoring and runtime.
[Source receipt](../assets/sculpted/valley-playable/asset-receipt.json) records exact
bytes, reproducibility, standing/animated fit and foot support. Source sample
clearance is evidence for these authored routes, not a general collision engine.

Living valley adults use `.45625`; woodland remains `.365`. Shared profile paths
include ground approaches around the ladder and natural-branch landing headings.
Grounded natural access walks before launching, and folds wings before landing.
Source tags survive cloning, so saved earned stages control actual visible meshes
and functional lift empties remain distinct. The real reed payload uses the
authored socket height/yaw once; rope fibre has one-metre authored length about a
fixed top. Dedicated store/nursery exports present actual stock and care.

The default habitation-front frame fits crown/roots/court; bounded selected-bird
views retain individual work. Newworld-only warm key/cool fill and softer grounded
shadows harmonize terrain and tree without altering preserved survey/Woodland art.
[Integrated runtime evidence](../output/inhabited-valley-v1/README.md) includes earned
stages and actual Codex-browser entry. This is a playable foundation, not exact
concept parity, finished foliage/terrain, or a production forest budget. The
separate Tree art study remains static and creates no saved habitation.


## Longbough clearing look development, 2026-10-28

The playable Living valley now combines the [original grove kit and appearance
source](../assets/sculpted/valley-playable/README.md) with one renderer-owned
[clearing composition](../src/game/clearing-look.ts). Overlapping cool broadleaf
masses sit outside the playable bounds; root shrubs and bank stones use blocked
space. Low traversable leaf/grass islands leave one metre clear around resource
centres and canonical work/approach targets and avoid building pads. These are
decorations, not resource stock, collision rules or new construction.

The warm earth court, root leafmould, subdued turf and local stone treatment share
the existing terrain material owner. Distant scenic continuation uses that same
material to avoid a rectangular material seam. The inhabited-world daylight key,
cool fill and tighter responsive crown/root/court framing are scoped to this
world; Woodland and preserved survey presentation remain separate. Imported PBR
materials and authored COLOR_0/normals are retained. Final hero revision
`longbough-clearing-appearance-v4-warm-foliage` adds golden-green upper shoulders
and cooler green recesses without changing positions, indices, habitat or kit.

Scenery loading is transactional: disabled imports are published only when all
siblings succeed; a failed attempt disposes its geometry, animations and shared
texture before Retry models. [Runtime qualification](../output/clearing-beauty-v1/README.md)
records the actual late-shrub failure, rule-generated home, exact paused readback,
matched daylight frames and local performance. This is an accepted first-clearing
art pass, not concept parity or finished forest art. Angular preserved banks,
repeated stylized scenic crown anatomy and production-scale optimization remain.

### Second clearing refinement and terrain versioning

The refined default inhabited world v2 replaces the canal-like continuous court
rims with broad asymmetric soil shoulders, shallow creek coves and local rocky
heads. Version1 geography remains exact for existing saves; the new scene is a
separate game slot. Original bank shoulder/shelf/outcrop assets are partly buried
only within fully blocked dry footprints. Off-grid low planting remains cosmetic
and pass-through; pads, work targets and crossings remain legible.

The shape-v3 hero/scenic crowns retain the accepted warm foliage palette and
playable habitat fit. Crown silhouette and depth are refined, without changing
wood, building stages or profile anchors. Imported PBR attributes remain intact.
Current source provenance is in [the asset receipt](../assets/sculpted/valley-playable/asset-receipt.json).
[Runtime evidence](../output/clearing-beauty-v2/README.md) records actual daylight,
build/save/refresh, narrow/reduced-motion and local rendering cost. Remaining broad
grass uniformity, scenic core shoulders and water microdetail are future polish;
this pass does not claim exact concept parity.
