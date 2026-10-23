# Architecture

One strict TypeScript npm project, Vite static app, React/CSS controls, and full
Babylon.js WebGL 2 rendering. No backend, account, multiplayer, or remote authority.
The elevated low-poly world follows the spatial qualities of the user's
[Kingdoms and Castles reference](https://store.steampowered.com/app/569480/Kingdoms_and_Castles/),
using original chicken-built structures and Blender-authored GLB bird/tree proofs.

## Current deterministic settlement economy

`src/content/settlement.ts` adapts the provisional roster, three tree landmarks,
and numerical tuning from [settlement design](../story/settlement-design.md).
`src/simulation/settlement.ts` owns `Settlement`, validated commands, fixed steps,
route finding, jobs, stock commitments, physical cargo, consumption, fatigue,
perches, movement progress, and sparse memories. No UI, DOM, engine, persistence,
wall clock, or randomness enters this module. A bounded grid and deterministic
breadth-first route search are sufficient here; there is no general engine framework.

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
The existing resize observer refits the fixed view and its projected labels/hit coordinates
to that visible area, so the card does not cover selected birds or work destinations.
The elevated orthographic camera is fixed, with responsive aspect fitting; no
pan, zoom, drag navigation or Find action ships. Store placement gives arrows/Enter
to its grid cursor. The compact primary tool strip and optional inspector keep
the world dominant. Listeners, observer, scene and engine dispose
on unmount. No assets are loaded from the visual reference.

`src/content/tree-habitats.json` owns the shared habitat profile, tree bindings and
presentation sizes: six berth endpoints, ladder/home/ramp waypoints, ground work
cell, basket/cargo/rope/operator sockets and lift travel. TypeScript simulation and
presentation consume it; Python authoring reads the same data. Generated asset
receipts describe exports, rather than establishing another anchor table. Existing
saved progress remains the parameter for the supported route, with no schema change.
All three trees explicitly share this proof profile; their art does not establish
species-specific capabilities. All tree GLBs and the new additions compensate glTF X
handedness once. All inhabited trees and structures use metre-scale habitats
(scale one); the independent adult mesh scale is `.365`. Saved simulation
X/Z cells still map to two render metres, while Y and local anchors are metres.
The same physical reed bundle uses scale `.5` when staged or lifted; its parent
scale is canceled when attached to a chicken, so transfers never change its size.
Small invisible bird hit proxies preserve selection without enlarging their art;
selected labels use the revised body envelope. No save schema or berth ID changes.

The persistent header Build command and tree selection open `TreeInspector` at
its named-tree choices. It reads canonical `treeBuildOptions` for costs and locked
reasons; ground Store placement lives in More buildings. Menu contains saved-settlement controls; Food is a separate compact panel. Bird selection opens a name/current-work card with at most three one-task requests, without the old roster/profile/stats. Identities, memories and needs remain saved simulation facts. Existing commissions lead the tree card with simulation-owned progress, workers and next need. `reedSupply` separates free usable stock, reservations, cargo and delivered material; the headline reads only free stock. The conservation ledger still includes all physical goods. Night commissions may queue; allocation of new work waits for daylight.
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

One ordered write queue captures snapshots when requested. Earlier writes cannot
finish after a later import/restart and overwrite it. Replacement pauses stepping
while reading/validating/saving; commands are locked during that operation. Tick
saves occur about once per second, commands save immediately, and transaction
completion defines success. Export uses current state. Storage failure retains
playability with an export notice. A failed initial decode does not autosave over
the unread original; an explicit restart or valid import is needed first.
No cloud, cross-tab conflict resolution, offline simulation, or general migration framework.

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
workcourt and does not add or obstruct adult routes. Its low rainhood reuses only
the authored woven-home roof/support meshes over the existing woven-store base.
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

## One-task chicken requests

`Worker.request` is one bounded slot (`gather`, `build`, `food`) with a canonical target, issued tick and pending/waiting/working/canceling phase. `requestResult` keeps only the latest outcome/reason/tick. Both are simulation facts. `requestOptions`, `requestStatus`, `currentWork` and `projectReadout` provide presentation read models; UI sends ordinary commands and highlights the saved destination.

`build` optionally names the initiating adult. The pure command validates eligibility and commits the site plus its existing build request atomically; stale or rejected commands leave the source state unchanged. The bird's Build a home action opens explicit tree placement, while normal tree inspection keeps the recipe route. Saved unfinished sites drive immediate workcourt rings and one project badge per tree; no transient animation or timer supplies project truth. `projectReadout` distinguishes travel from grounded weaving and gives pause precedence. `gatherRecovery` supplies a named eligible helper or separates busy adults from depleted/unreachable reeds. UI command failures remain accessible near the action and differ from ordinary guidance.

Requests reuse material jobs, food provisions, routes and reservations. A gather request delivers one bundle from its shown patch without changing the flock's designation. Help build delivers one bundle or completes one weaving task at its shown project. Bring food delivers one typed unit to the shown nursery up to its normal saved target. Existing cargo, essential feeding, sleep/rest, active care and urgent brood supply take precedence. Young and active carers cannot accept new work requests. No stats bonus, teleport, resource creation, permission fiction or social grudge is introduced.

An initial request releases uncollected ordinary work only at a safe cell boundary. Cancellation does the same; carried goods retain their physical job and finish delivery. Completion is recorded only by the actual delivery or weaving success path. Food reservation reconciliation, meals and phase interruption return an unfinished request to waiting. Removed/completed/full/depleted targets end with a reason; targets never silently change. Ordinary autonomous work resumes afterward and can continue while a request lacks inputs. The latest result does not retain deleted site references.

The strict v6 decoder validates request shape, target references, adult eligibility, active job correspondence and bounded result text/ticks. Immutable v5 is validated before adding null request/result fields. Older migration stages preserve their established ledgers, identities and progress, then add these fields; import/reload cannot create another delivery or advance time.

### Local care read models

`populationReadout`, `nurseryReadout` and `treeActivity` in simulation project saved residents, unhatched commitments, physical care stages and single-tree badge precedence. App, local EconomyInspector and world badges consume those projections; they do not advance care or invent eggs. `foodRecovery` reuses the existing provisioning assignment on a disposable state to identify a free adult with a real available trip to the chosen nursery. The existing food request accepts that local nursery target, preserving cargo, care and pending request behavior. These are read projections and existing commands; save v6 and economic tuning are unchanged.

## Persistent construction focus

`Settlement.constructionFocus` is a nullable unfinished site ID. `focus-build` validates the target atomically; null clearing is idempotent. Strict v7 validation rejects missing, completed and malformed references. Source-version validation precedes v6 migration, which adds null without changing plans, jobs, cargo, requests or economy. All earlier migrations also begin in normal order. Completion and cancellation clear a matching focus.

Only free autonomous construction allocation changes: `assignConstruction` first tries all eligible focused work (ready weaving or unreserved material pickup), then falls back to the existing insertion-order assignment if none is actionable. An explicit named request supplies its own target and bypasses focus. Existing jobs, reservations, secured cargo and lifts are never redirected by switching focus. Care, self-feeding, sleep/rest, urgent provision and the existing global policy retain precedence. No sites are reordered and no numerical costs or timings change.

`constructionFocusReadout` and `treeActivity` project the saved choice; a focused unfinished project leads the existing single tree badge, retaining actual work/wait state. Shared `ProjectCard` serves both tree structures and unfinished ground stores. The compact global finder opens and reveals the existing project card; ground stores remain under Other building controls with coordinates and their existing ground construction marker, without another tree-style world badge. Actual contributions and shortages come from `projectReadout`, separate from the chosen priority.
