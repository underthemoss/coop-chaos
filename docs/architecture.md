# Architecture

One strict TypeScript npm project, Vite static app, React/CSS controls, and full
Babylon.js WebGL 2 rendering. No backend, account, multiplayer, or remote authority.
The elevated low-poly world follows the spatial qualities of the user's
[Kingdoms and Castles reference](https://store.steampowered.com/app/569480/Kingdoms_and_Castles/),
using original chicken-built structures and Blender-authored GLB bird/tree proofs.

## Current construction proof

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
reeds. Finite designated patches reserve yield before walking; extraction atomically
reduces the patch and introduces exactly one carried bundle.
A store refill uses loose piles, preventing stores endlessly refilling each other;
construction can use either piles or completed local stores by shortest route.

Canceling unfinished construction releases uncollected commitments, creates a
salvage pile for delivered material, and redirects cargo to the original cache
via real movement. Finished buildings cannot be demolished. Material is never
an invisible lost-resource sink.

Three food places are separate from construction reeds. The simulation owns
appetite, at most two feeder spots per place, choice/preferences, productive-place
memory, scratch/peck progress, consumption and unused-place recovery. Cargo is
delivered before feeding; night roosting takes precedence. Food remaining plus
eaten equals initial capacity plus recovered units per place. Recovery uses ticks,
not wall time; pause, refresh and day changes cannot grant food. Bounded ground
routing is independent of renderer scenery; no general collision engine was added.

Explicit day/evening is saved simulation state, not a full calendar. Evening
stops new collection, lets existing loads and active weaving finish where
reachable, then allocates distinct perches. Three trees each offer two natural
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
put the world first. The elevated orthographic camera is fixed, with responsive aspect fitting; no
pan, zoom, drag navigation or Find action ships. Store placement gives arrows/Enter
to its grid cursor. The compact primary tool strip and optional inspector keep
the world dominant. Listeners, observer, scene and engine dispose
on unmount. No assets are loaded from the visual reference.

`src/content/tree-habitats.json` owns the shared habitat profile, tree bindings and
presentation scales: six berth endpoints, ladder/home/ramp waypoints, ground work
cell, basket/cargo/rope/operator sockets and lift travel. TypeScript simulation and
presentation consume it; Python authoring reads the same data. Generated asset
receipts describe exports, rather than establishing another anchor table. Existing
saved progress remains the parameter for the supported route, with no schema change.
All three trees explicitly share this proof profile; their art does not establish
species-specific capabilities. All tree GLBs and the new additions compensate glTF X
handedness once, before their shared presentation scale.

Tree selection opens `TreeInspector`, which reads canonical `treeBuildOptions`.
Treehouse, sleeping deck and hauling basket are unique by tree and kind; the latter
two require a completed home; the elevated deck also requires its local completed
basket for supply access. Extra decks add slots 2/3 alongside existing home
slots 0/1. A basket prototype weaves three supplied bundles, then lifts its fourth
real reserved bundle before consuming the recipe and recording `basketTechnique`.
Later completed baskets lift deck supplies. `Worker.lift` retains the delivery job
and cargo until arrival; no renderer counter can complete a lift. Basket and rope
nodes follow saved progress. Cargo uses `cargoPosition` and the same tree scale
as authored sockets; operator staging is presentation only. Cancellation and
phase changes remain simulation-owned. Migration grants no fabricated invention.

## Saves and ordering

IndexedDB database `coop-chaos` version 1, object store `saves`, key `settlement`
holds `{ schemaVersion: 4, simulationVersion: "settlement-4", state }`.
`src/persistence/settlement-save.ts` validates exact object fields, finite values,
IDs/references, finite patch capacities and harvest ledgers, route edges, commitments, stock capacity, conservation,
construction consumption, and exclusive perch occupancy. Imports validate before
state replacement; malformed files leave current state unchanged. Valid settlement-1, settlement-2 and settlement-3
saves migrate without changing their existing sites, workers, supplies or histories.
Old path data is retired while in-flight edges and work remain intact. New
food state is introduced by versioned migration. New reed patches use free legal cells; crowded older worlds may receive fewer
than two patches, with a visible notice and no later automatic respawn.

One ordered write queue captures snapshots when requested. Earlier writes cannot
finish after a later import/restart and overwrite it. Replacement pauses stepping
while reading/validating/saving; commands are locked during that operation. Tick
saves occur about once per second, commands save immediately, and transaction
completion defines success. Export uses current state. Storage failure retains
playability with an export notice. A failed initial decode does not autosave over
the unread original; an explicit restart or valid import is needed first.
No cloud, cross-tab conflict resolution, offline simulation, or general migration framework.

Fresh settlements start with 8 loose construction reeds and two finite patches.
Extraction atomically transfers one patch reed into worker cargo. Initial loose
reeds plus harvested reeds equal loose stock, local stores, cargo, unfinished
deliveries and material consumed by completed structures. Patch capacity separately
equals remaining plus harvested reeds; unharvested reeds are not loose stock.

Legacy `src/simulation/flock.ts`, `src/content/first-evening.ts`, and
`src/persistence/save.ts` retain the historical dilemma and exact
`first-evening-1` meaning at key `first-evening`. Its device data is untouched;
export is offered when found. The settlement decoder explicitly rejects that
format. Legacy tests remain useful compatibility checks. It is no longer the
app's default experience or a privileged campaign cast.

## Next boundaries, not implemented

[Technology design](../story/technology.md) develops ground, trunk, and canopy
layers. Forest clusters are political homes; productive open commons supply
bounded mixed-food foraging and future richer ecology and shared-use disputes.
Current geography and travel do not implement territory, complete nutrition, predators, or pacts. Food
production, brood care, growing population, threats, district relationships,
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
