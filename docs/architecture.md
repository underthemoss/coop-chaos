# Architecture

One strict TypeScript npm project, Vite static app, React/CSS controls, and full
Babylon.js WebGL 2 rendering. Simulation remains local and single player. Optional
Supabase email accounts store explicit save copies; they never own simulation rules.
The elevated low-poly world follows the spatial qualities of the user's
[Kingdoms and Castles reference](https://store.steampowered.com/app/569480/Kingdoms_and_Castles/),
using original chicken-built structures and Blender-authored GLB bird/tree proofs.

## Settlement world contexts and preserved surveys

`src/content/settlement-world.ts` adapts explicit world/scenario identity for the
single `Settlement` rules owner. New **Small valley** games create Living valley:
36×28m terrain sampled at .5m, one exact-origin Longbough, authored resource zones
and reserved build pads. `maps.ts` owns geometry/navigation, generated placements
own world positions and legal approaches, and `valley-habitat.json` owns local
six-place anchors, stage groups, grounded access paths and lift sockets. Python
asset authoring and TypeScript consumers read the same profile. There is no
coordinate overlay of the old Woodland simulation and no duplicate economy.

Mapped routing uses shared terrain triangles and physical surface distance.
Ground movement is nominal 1.4m/s with existing individual pace modifiers; authored access uses fixed nominal 1.4m/s. Access first
routes to the canonical legal tree workcell, then consumes the profile's grounded
approach and metre-length access path. All fixed pad footprints remain blocked;
work/pickup/care/spawn targets use legal approaches. Nursery `Site.at` is its ground
pad and `Site.tree` its affiliation. Adult render scale is `.45625`; the main-tree
view faces +Z and fits crown/roots/court, with bounded map/follow views.

Codec9 saves world identity and validates canonical resource fixtures, supplies,
legal ground locations and mapped flight origin/landing cells. Legacy settlement
v1–v8 decoding and Woodland geography/timing remain exact. Existing `ochre-valley`
v1/v2 saves still dispatch to the tree-free survey owner, preserving map version
and 20 generic bundles. Its explicit Start a living valley action creates a new
slot; it cannot silently turn survey cargo into reeds. The same library, writer
lock, portable import/export and explicit account-copy boundary remain in use.
[Current scope and compatibility](landscape-study.md#current-default-living-valley)
and [map source](../assets/maps/INHABITED-VALLEY.md) record the contracts.

## Current deterministic settlement economy

`src/content/settlement.ts` adapts the provisional roster, legacy three tree landmarks,
and numerical tuning from [settlement design](../story/settlement-design.md).
`src/simulation/settlement.ts` owns `Settlement`, validated commands, fixed steps,
route finding, jobs, stock commitments, physical cargo, consumption, fatigue,
perches, movement progress, and sparse memories. No UI, DOM, engine, persistence,
wall clock, or randomness enters this module. Woodland retains bounded-grid breadth-first routes; mapped worlds use shared deterministic terrain routing. There is no general engine framework.

Ground routes join legal neighboring cells without player-created paths. New trips avoid tree-base cells; tree jobs use the adjacent front work cell while `Site.at` retains the tree origin. Legacy edges into or through a trunk finish and egress, and an already-active old lift finishes its reserved bundle in place. Jobs reserve one source bundle before walking to collect
it. Reserved quantities derive from pickup jobs, so there is no second counter
to drift. Pickup moves source stock into bird cargo; delivery moves cargo into a
site allocation or local store. Building consumes its exact delivered recipe
once; `consumed` records permanent structure material. Local piles, stores,
site allocations, cargo, and consumption sum to initial loose supply plus harvested
reeds. Capacity-limited renewable designated patches reserve yield before walking; extraction atomically
reduces the patch and introduces exactly one carried bundle.
A store refill uses loose piles, preventing stores endlessly refilling each other;
construction can use either piles or completed local stores by shortest route.

Canceling unfinished construction releases uncollected commitments, creates a
salvage pile for delivered material, and redirects cargo to the original cache
via real movement. Finished buildings cannot be demolished. Material is never
an invisible lost-resource sink.

Three food places are separate from construction reeds. The simulation owns
appetite, at most two feeder spots per place, choice/preferences, productive-place
memory, scratch/peck progress, consumption and bounded daytime recovery. Cargo is
delivered before feeding. Active care and secured food deliveries continue at night. Food remaining plus
eaten and harvested units equals initial capacity plus recovered units per place. Recovery uses ticks,
not wall time; pause, refresh and day changes cannot grant food. Bounded ground
routing is independent of renderer scenery; no general collision engine was added.

Automatic day/evening and cycle progress are saved simulation state. Evening
stops new collection and weaving, preserves construction progress, and lets secured loads
finish delivery (including a necessary lift) before allocating distinct perches. Weaving resumes
in daylight. Three trees each offer two natural
places from the start; improvements add two sheltered places. Contributors gain
a persistent attachment that changes their preferred tree. Temperament also
changes preferred trees or open/sheltered berths. Natural travel uses saved
fly-up/down progress; improved access has a ground approach, ladder climb, and
home-edge/ramp traversal before the additional deck, reversed on descent. Perched rest affects saved readiness: natural up to 80,
sheltered up to 100. Tired workers slow and can recover on the ground.

`src/app/App.tsx` drives one 100 ms step per foreground interval. Hidden time
and missed intervals do not accumulate. Babylon's render FPS never advances
rules. Pausing preserves ticks exactly. React sends commands to the simulation
and renders its facts; it does not calculate parallel resource totals or outcomes.
The renderer receives snapshots, interpolates essential movement, projects names,
and displays food habitats, local bundles, construction stages, perches and cargo.
Reduced motion suppresses idle bob and wing flutter; position and written work
feedback remain legible. Ground picking yields grid intentions; rules validate
placement. Keyboard/select controls provide equivalent placement and named selection.

The world fills desktop play space beside a scrollable inspector; narrow screens
reserve the open card's measured height plus tool clearance below the rendered world.
The existing resize observer refits the current view and its projected labels/hit coordinates
to that visible area, so the card does not cover selected birds or work destinations.
Woodland keeps its fixed responsive orthographic view. Living valley offers
Longbough, Whole valley and explicit Follow framing. `clearing-camera.ts` fits
each view, then applies its bounded zoom to the orthographic span; buttons and
canvas-only wheel input share React zoom state. Zoom preserves framing and the
explicitly followed actor, while inspector wheel events retain ordinary scrolling.
Living valley also supports idle fine-mouse edge pan (outer24 CSS pixels),
canvas-focused arrows and captured middle-button dragging. `ClearingPanInput`
retains only held navigation intent; renderer listeners clear it on overlay/leave,
button interaction, blur, visibility loss and cancellation. Camera motion uses
real render time and the current orthographic span, independently of simulation
pause/speed. Manual movement captures the current target/span and leaves Follow;
free position survives zoom/resize. Explicit preset clicks recenter even when the
same preset was active; Follow explicitly chooses the current selected actor.
Pure camera helpers project screen-relative ground movement and clamp the
horizontal camera center to actual authored map vertex bounds. The entire viewport
need not fit inside that rectangle. This is transient presentation state; camera
navigation writes no bird orders or save geography. S remains Stop, M remains Move,
and UI/modifier keys never start keyboard pan.
Store placement gives arrows/Enter
to its grid cursor. The compact primary tool strip and optional inspector keep
the world dominant. Listeners, observer, scene and engine dispose
on unmount. No assets are loaded from the visual reference.

`src/content/tree-habitats.json` owns the shared habitat profile, tree bindings and
presentation sizes: six berth endpoints, ladder/home/ramp waypoints, ground work
cell, basket/cargo/rope/operator sockets and lift travel. TypeScript simulation and
presentation consume it; Python authoring reads the same data. Generated asset
receipts describe exports, rather than establishing another anchor table. Existing
saved progress remains the parameter for the supported route, with no schema change.
In legacy Woodland, all three trees explicitly share this proof profile; their art does not establish
species-specific capabilities. All tree GLBs and the new additions compensate glTF X
handedness once. Woodland inhabited trees and structures use metre-scale habitats
(scale one); the independent adult mesh scale is `.365`. Saved simulation
X/Z cells still map to two render metres, while Y and local anchors are metres.
The same physical reed bundle uses scale `.5` when staged or lifted; its parent
scale is canceled when attached to a chicken, so transfers never change its size.
Small invisible bird hit proxies preserve selection without enlarging their art;
selected labels use the revised body envelope. No save schema or berth ID changes.

The persistent header Community building command and tree selection open `TreeInspector` at
its named-tree choices. It reads canonical `treeBuildOptions` for costs and locked
reasons; ground Store placement lives in More buildings. Menu contains saved-settlement controls; Food is a separate compact panel. Bird selection updates one compact command dock with per-person activity and explicit targeting. Personal Details opens separately and retains needs, memories, queue and Bring food. New building requires one explicitly selected eligible adult; the community catalog is a separate intent. Identities, memories and needs remain saved simulation facts. Existing commissions lead the tree card with simulation-owned progress, workers and next need. `reedSupply` separates free usable stock, reservations, cargo and delivered material; the headline reads only free stock. The conservation ledger still includes all physical goods. Night commissions may queue; allocation of new work waits for daylight.
Treehouse, sleeping deck and hauling basket are unique by tree and kind; the latter
two require a completed home; the elevated deck also requires its local completed
basket for supply access. Extra decks add slots 2/3 alongside existing home
slots 0/1. A basket prototype weaves three supplied bundles, then lifts its fourth
real reserved bundle before consuming the recipe and recording `basketTechnique`.
Later completed baskets lift deck supplies. `Worker.lift` retains the delivery job
and cargo until arrival; no renderer counter can complete a lift. Basket and rope
nodes follow saved progress. Lifted cargo uses `cargoPosition` and authored
sockets; its visible size stays independent of bird and tree. Operator staging is presentation only. Cancellation and
phase changes remain simulation-owned. Migration grants no fabricated invention.

## Saves and ordering

IndexedDB database `coop-chaos` version 1, object store `saves`, key `settlement`
holds `{ schemaVersion: 8, simulationVersion: "settlement-8", state }`.
`src/persistence/settlement-save.ts` validates exact object fields, finite values,
IDs/references, finite patch capacities and harvest ledgers, route edges, commitments, stock capacity, conservation,
construction consumption, and exclusive perch occupancy. Imports validate before
state replacement; malformed files leave current state unchanged. Valid settlement-1 through settlement-7
saves migrate without changing their existing sites, workers, supplies or histories.
Old path data is retired while in-flight edges and work remain intact. New
food state is introduced by versioned migration. Version-eight growth migration first
validates populated v5–v7 states against immutable 7,200/7,200/14,400 timing bounds,
including stage ranges and earliest hatch history. It then floor-maps incubation,
chick and juvenile progress within the same stage to 2,400/2,400/4,800. Adults and
laying/failed broods are unchanged. Age, hatch ticks, actual care ticks/bond and all
other saved facts remain exact; no simulation tick or stage transition occurs on
import. V8 validates bond against actual age and its authoritative brood's care
history rather than compressed development units. Immutable old-timing fixtures
cover stage edges, completed adults, paused shortages and secured cargo. New reed patches use free legal cells; crowded older worlds may receive fewer
than two patches, with a visible notice and no later automatic respawn.

`FrontDoor` opens a static illustrated title before lazily mounting the game and
Babylon scene. `src/persistence/library.ts` owns device slots in the separate
`coop-chaos-library` IndexedDB database. Metadata contains name, creation/update
time, revision, exact save text and at most one previous valid checkpoint; it is
not a new simulation schema. Initialization atomically records a one-time import
of the old `coop-chaos/saves/settlement` key without modifying the source bytes.
Absence, valid data, damaged/newer data and storage errors have distinct outcomes.
The historical story archive is read independently and cannot reject a valid game.

New/import actions persist a separate validated slot before mounting it. Recovery
never mounts a fresh playable substitute for rejected data. Exact original bytes
can be downloaded. Checkpoint restoration validates the checkpoint, claims the
writer lock and archives the rejected record before atomic replacement. There is
no destructive restart in the main journey.

`openSlot` holds a Web Lock for the session; another tab cannot take it over. A
transaction checks the expected revision before any update, so stale writes also
fail safely. Unsupported locking fails closed for editing. Each session captures
and strictly roundtrips candidates when requested, then serializes atomic writes.
Closing prevents queued stale writes and releases the lock after pending work.
`latestSave` generation-tags UI feedback: an older successful commit cannot hide
a newer rejected candidate. Only transaction completion reports durability. Save
failure leaves the latest good slot and current unsaved session intact with retry
and export; Save and return to title stays in play if persistence fails. Reload
returns to title, with no offline time advancement.

`src/account/` independently owns optional email authentication and owner-scoped
remote copies. Device games are not uploaded on login. Explicit copies bind a
stable action ID and initiating owner; retries reconcile that same copy, and
account changes discard cached lists and stale responses. Remote loads become new
local slots. See [account setup](account-setup.md) for configuration and the
unverified email/hosted boundary. No multiplayer, automatic synchronization,
cross-tab merge, or remote simulation authority is introduced.

Fresh settlements start with 8 loose construction reeds and two renewable capacity-limited patches.
Extraction atomically transfers one patch reed into worker cargo. Initial loose
reeds plus harvested reeds equal loose stock, local stores, cargo, unfinished
deliveries and material consumed by completed structures. Patch capacity plus bounded regrowth separately
equals remaining plus harvested reeds; unharvested reeds are not loose stock.

Legacy `src/simulation/flock.ts`, `src/content/first-evening.ts`, and
`src/persistence/save.ts` retain the historical dilemma and exact
`first-evening-1` meaning at key `first-evening`. Its device data is untouched;
export is offered when found. The settlement decoder explicitly rejects that
format. Legacy tests remain useful compatibility checks. It is no longer the
app's default experience or a privileged campaign cast.

## Dynamic population and fixed time

`src/simulation/settlement.ts` owns saved life profiles, typed food cargo,
nursery stocks, fertility events, brood/care assignment, durable eggs and child
identities. It also owns canonical support/blocked reasons and growth forecasts.
React renders those outputs; Babylon never decides births, access or completion.
Original IDs and adult mobility remain stable. Dynamic consumers resolve names
and appearance through `birdProfile`; appearance selects an existing original
asset, while identity remains the saved worker ID. Grounded young do not enter
adult flight, hauling or construction code. The renderer clones inherited
appearance and animation targets independently and applies stage proportions.

The saved automatic clock advances phase after 1,800 day or 600 evening ticks;
`speed` changes how many canonical fixed steps the app schedules. Pause halts
all progress. Import/reload creates no elapsed-time catch-up. Carer presence,
local typed meals, egg viability and growth all advance in the same step.
Nursery food and egg meshes present saved state. The nursery is beside the root
workcourt and does not add or obstruct adult routes. The dedicated bound-reed nursery export replaces the earlier borrowed home roof/store base.
A shallow scaled woven nest holds clustered 0.08m eggs (0.104m high); viable
unhatched saved eggs alone create these meshes. No oversized egg markers or
smooth nursery domes are used.

Food patch ledgers separate eaten and typed harvested units. Harvested food
must equal all nursery stock, food cargo and consumed care food. Renewable reed
ledgers include cumulative regrowth, so lifetime harvest may exceed initial patch
capacity. Source-version validation precedes additive v5 migration: existing
cargo, edges, jobs, construction, identities and memories survive; new biological
fields begin without fabricated mating history. Strict egg-child references,
parent/carer links, growth age bounds and exclusive care assignments protect
reload/replay. Durable states include care self-feeding breaks and secured cargo
which must finish delivery before care.

## Next boundaries, not implemented

[Technology design](../story/technology.md) develops ground, trunk, and canopy
layers. Forest clusters are political homes; productive open commons supply
bounded mixed-food foraging and future richer ecology and shared-use disputes.
Current geography and travel do not implement territory, complete nutrition, predators, or pacts. Cultivated food
production, threats, district relationships,
powered lifts, and late science-fiction elevators remain
future. Keep their goods/jobs/capabilities with simulation; advance save versions
intentionally when meanings change. Do not implement a universal defense counter.

## Checks and limits

Vitest covers meaningful transport/conservation, interruption, cancellation,
local-store reuse, natural/improved sleep, attachment, mid-work save replay,
strict validation, ordered IndexedDB replacement, and retained legacy rules.
Browser qualification additionally exercises actual WebGL rendering, input,
carry/build/storage/refresh, evening access, malformed import, narrow layout,
console and reduced motion. Tests alone do not prove art or enjoyable duration.

Pinned dependencies support Node 20.19+/22.12+. Vitest 4 retains the Node 20
baseline; TypeScript 6 checks strict/no-unused. No lint or remote CI. Prepared deployment configuration is owned separately;
local checks do not establish deployment. Direct Babylon module imports keep the initial payload smaller
than barrel imports; its bundle remains large enough to trigger Vite's chunk
warning. Measure real needs before speculative engine changes or asset pipelines.

## Original asset proof

`assets/sculpted/build.py` launches Blender 4.5 LTS source recipes for original
environment and chicken assets. `npm run assets:build` requires Blender and Python;
normal build/check consume the checked GLBs. The archived Node exporter writes
only ignored experimental output. The source pipeline retains editable geometry,
PBR materials, stable tree anchors and seven rigid-articulation bird clips.

The complete kit stages before becoming visible, with loading/failure/retry
feedback. Late async loads dispose after unmount. Stable simulation roots retain
selection, cargo and saved ground/flight/ladder/perch positions. Action selection
renders saved worker state; it does not decide jobs. Standard terrain materials
use display-space colors; imported glTF PBR colors retain the loader's linear
contract. Directional shadows and restrained screen-space occlusion supply local
depth. Source tests check indexed topology, finite unit normals, materials,
attachments and named clips; actual art, motion and performance need browser proof.

## Direct chicken commands and legacy requests

Optional `Worker.direct` owns current order, bounded queue16, safe-boundary pending
state, explicit community return and retained food origin. Orders extend the
existing deterministic jobs/provisions/routes/reservations rather than adding
another movement system. Target validation precedes any replacement or append.
`prepareDirect` clears uncollected jobs at a safe cell, waits for descent, and
lowers active lifts safely. Stop holds actual goods; new work/Return routes them
through existing destination capacity, counting incoming real cargo. Direct
allocation precedes urgent community provisioning; personal meals/rest may suspend
then resume the same intent. Young and essential carers reject commands.

Moves complete on arrival, gather repeats the exact patch until depletion, and
build repeats delivery/weaving until complete. Finite Bring food completes on one
delivery. Completion advances a queued successor or remains directly controlled
idle. `groupMoveOrders` validates each actual actor and assigns stable distinct
legal arrivals. `directStatus` and `commandDestination` feed UI/world read models.
App owns transient group selection, session-only control groups, structured awaiting-order queries and target mode; the existing direct-order validator supplies target eligibility. The renderer consumes target clicks before selection and presents eligibility rings without deciding outcomes. Renderer observes commands
and routes. Selecting a different actor never retargets the camera's explicit Follow.

A named `build` atomically commits its plan and sustained builder; header catalog
plans are community commissions. Legacy `request` and `requestResult` remain
compatible/readable for older saves and bounded community recovery trips. Requests
reject direct actors; recovery suggestions exclude them, preventing duplicate
control ownership. Existing legacy cargo delivery semantics remain valid.

Codec10 adds validated optional direct state and food origin. A pending direct replacement may retain an existing gather pickup reservation only on its real current movement edge; validation preserves that safe-boundary transition even when the new intent is Build, Move, Stop or community return. At edge completion the simulation discards the old pickup before new work. Codec8/9 saves keep
their original shape when no direct state exists. All world9 resource, tile,
route, flight and fixed-anchor geometry checks still apply to world-bearing10;
world identity/version never changes on read. Save/reload does not advance work.

## Persistent construction focus

`Settlement.constructionFocus` is a nullable unfinished site ID. `focus-build` validates the target atomically; null clearing is idempotent. Strict v7 validation rejects missing, completed and malformed references. Source-version validation precedes v6 migration, which adds null without changing plans, jobs, cargo, requests or economy. All earlier migrations also begin in normal order. Completion and cancellation clear a matching focus.

Only free autonomous construction allocation changes: `assignConstruction` first tries all eligible focused work (ready weaving or unreserved material pickup), then falls back to the existing insertion-order assignment if none is actionable. An explicit named request supplies its own target and bypasses focus. Existing jobs, reservations, secured cargo and lifts are never redirected by switching focus. Care, self-feeding, sleep/rest, urgent provision and the existing global policy retain precedence. No sites are reordered and no numerical costs or timings change.

`constructionFocusReadout` and `treeActivity` project the saved choice; a focused unfinished project leads the existing single tree badge, retaining actual work/wait state. Shared `ProjectCard` serves both tree structures and unfinished ground stores. The compact global finder opens and reveals the existing project card; ground stores remain under Other building controls with coordinates and their existing ground construction marker, without another tree-style world badge. Actual contributions and shortages come from `projectReadout`, separate from the chosen priority.


## Bound-reed building presentation

`src/game/building-presentation.ts` maps existing saved deliveries, work and
completion into authored base/frame/finish visibility. `createClearing` owns the
separate Boughhome, reed-store and ground-nursery models, their saved stock/food
instances and scene cleanup. These exports add no recipe, stock type, capacity,
technique, save field or simulation outcome. The ground nursery no longer borrows
a home roof or a store basket. A reed store shows only its actual local reeds.

`accessHeading` in `tree-presentation.ts` derives the facing of saved access from
the existing path derivative and direction. Paused reopen cannot infer heading
from the renderer's initial spawn point. Vertical facing follows the actual
route derivative, including the longer home ladder timing. The rule-owned saved position/progress
remain untouched. The short steep upper-deck approach is a clamber beside tied
grips: its endpoint and berth floors provide support, while continuous floor
contact along the interpolated climb is not claimed. Access currently forbids
carried cargo; the hauling basket remains the actual elevated-material route.

The async loader publishes templates and character appearances only after every
dependency succeeds, preventing young clones from retaining failed-attempt
materials/animation targets. It reapplies the latest saved state before ready,
including paused basket cargo. A hip-centred upper-body wrapper preserves keyed
head/wing coordinates and leaves feet unchanged during the deterministic
upper-descent lean; ground, roost and other access reset it.

Separate host-fitted Boughhome modules join the static Longbough study in its
actual glTF source frame as a sibling import. They follow the existing structure
toggle, async error/retry and scene disposal. They create no gameplay state.
[Qualification](../output/building-implementation-v1/README.md) distinguishes
Woodland .365-scale adults from the study's .45625-scale figures. Living valley now uses .45625 with its own shared habitat contract.

## Integrated Living valley rendering and qualification

`createClearing` renders the same world-aware Settlement, terrain, resource fields
and saved stages. Cloned nodes retain source semantic tags for part visibility
and rope/basket/socket lookup. The basket socket owns payload height and yaw once;
its one-metre authored rope scales from its fixed top to saved lift progress.
Templates/appearances publish transactionally only after the full dependency batch
succeeds, and the latest paused state is reapplied before ready. Late nursery-load
failure with saved young is covered by retry/disposal evidence. Grounded natural
access uses walking through its prefix, then flight and folded landing; the old
Woodland upper-descent lean is not applied to this new geometry.

The food forecast remains conservative: newworld route labour uses physical metres
at nominal 1.4m/s without individual pace adjustment, while Woodland retains eighteen ticks per grid cell. Recovery
counts each open patch once, but average distance includes all open patches. Future
optional remote habitats may lower this estimate despite sufficient nearer supply;
this must be revisited before claiming general map balance. Current authored mixed
supply supports the demonstrated brood. No combat, moving-unit collision or forest
performance claim follows from this foundation.

[Qualification](../output/inhabited-valley-v1/README.md) records actual UI build/save/refresh,
rule-produced complete care fixtures, scene/error/narrow/reduced-motion checks and
the separate primary Codex-browser new-game/home journey.

## Refined inhabited geography, world v2

The existing Settlement owner resolves `inhabited-valley` versions 1 and 2
explicitly. New games default to v2; Original small valley creates v1. Both retain codec9 without direct orders and use additive codec10 with them, the same recipes, profile, source identities and fixed building pads.
The v1 generated map and placements are immutable compatibility snapshots.
`authorInhabitedValley(2)` exports a separate shared heightfield with broad unequal
creek shoulders, two shallow coves and localized rocky heads. Routes and rendered
support both consume that version's exact tile triangles.

No migration or coordinate reprojection occurs. The existing library creates a
new UUID slot, leaving old raw state and checkpoints intact; a new v2 game becomes
Continue only after creation. Unknown world identities/versions fail visibly.
Older builds unaware of v2 may classify its schema9 file as damaged rather than
newer, while retaining exportable bytes.

## Build/resource interaction ownership

`constructionBudget` derives aggregate unfinished material demand from Settlement:
`max(0, sum(cost-delivered) - (free+reserved+carried))`. It does not sum individual
project shortages or include standing patch yield. `requestOptions` accepts an
optional exact gather patch; the request command validates that same target.
Default nearest-target behavior remains. Perched/flight availability uses the
canonical ground work cell, while assignment still waits for actual descent,
daylight, routes and personal/care guards.

SettlementWorld supplies patch and pad names without adding metadata to saved
patch records. App owns transient catalog/recipe/selection intent and cancels it
on placement exits. Clearing renders that intent with isolated matte preview
materials, then renders saved project stages and local quantities. Nursery
preview and earned model share `nurseryPresentation`. Direct controls add codec10 without world migration or a second worker subsystem. [Translation](build-resource-interactions.md).

Visible bank relief is restricted to blocked mineral cells. Picking uses a
complete invisible canonical terrain mesh, so a nonpickable visible bank cannot
pass a click through to unrelated land behind it. Imported decoration families
with no placements are disposed rather than rendered as source templates.
