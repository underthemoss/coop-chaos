# Chicken Civ

**A small world. Long memories.** A chicken treehouse settlement builder.
Ground work and supplies support a growing canopy home; forest clusters become
kingdoms, while productive open commons lie between them. Individuals develop
habits, attachments, and politics through work. No humans, farmers, or commercial
egg sales. Every chicken is someone.

The [settlement design](story/settlement-design.md) owns the loop;
[Life above the ground](story/technology.md) develops treehouses, access,
inventions, and distinct defensive purposes. The larger game remains future.
This playable bounded economy connects renewable reeds, staple/protein foraging,
physical nursery deliveries, home construction, care and named population growth.
Four starting adults can support two chicks which grow into workers. A covered
root nursery costs four reeds after a home; it supplies grounded care places,
not adult housing. Existing natural, home and deck routes provide six actual
adult berths per tree. Broader household layouts, cultivated food production,
predators, rival kingdoms and advanced technology remain future. Thirty minutes
of enjoyable play is a playtest target, not a proven property.

The visual reference is [Kingdoms and Castles](https://store.steampowered.com/app/569480/Kingdoms_and_Castles/):
faceted landscape, forest masses, shoreline, elevated strategy view.
The earlier Node-authored pass was visually rejected. Original editable Blender
trees, chickens and resource/building assets now replace it; visual acceptance
against opening-view-v2 remains open. The [art-led sandbox brief](art-direction/opening-view-exploration.md)
requires high-quality artifacts in the actual scene. Renewable construction-reed
gathering and autonomous mixed-food foraging are implemented with separate resource ledgers.
Woodland retains fixed responsive framing; Living valley adds bounded main-tree, map and selected-bird views. The +/− buttons and mouse wheel over the canvas zoom each Living valley view through the same bounded levels. Pan with the mouse at a clear canvas edge, arrow keys while the canvas is focused, or middle-button drag. Manual movement enters Free camera; view buttons recenter and Follow explicitly resumes tracking.
Seven rigid-articulation action clips support the current birds; production rigs,
a campaign, and multiplayer remain future work.

## Play the living valley

**New game → Refined small valley** starts **Living valley** (inhabited world v2), a real settlement in
an authored 36×28m valley. Longbough has two natural branch places before building;
four adults initially share those places and ground rest. Commission its six-reed
Boughhome, watch named deliveries and weaving create two sheltered places, then
build the hauling basket and earn a two-place middle deck. Ground stores hold
actual reeds; the four-reed root nursery supports two dependent chicks and adds
no adult housing. Open reed/food patches and named work requests support the same
conserved construction, food, care and growth owner described below.

The main-tree view faces the habitation front; selection and bounded camera
controls make individual work readable. Reserved store/nursery courts have visible
markers and legal approaches. Birds route around terrain, roots and those pads;
this foundation does not implement combat or moving-unit collision. Adult render
scale is `.45625`, ground cells are .5m, and ground/access travel uses physical
metres: ground travel is nominal 1.4m/s with existing individual pace modifiers; authored access uses fixed nominal 1.4m/s.

**Woodland settlement** retains its original geography, anchors and presentation.
Old tree-free valley survey slots retain their map/version, generic 20-bundle
ledger and bytes; **Start a living valley** creates a separate new slot instead
of converting those bundles into construction reeds. The title's **Tree art
study** remains a static visual comparison, separate from both playable games.
Original Living valley v1 remains selectable and loadable with its exact geography.
The refined v2 creek has broader asymmetric soil shoulders, shallow coves and
local defended bluffs. Creating it uses a separate save slot; Continue never
reprojects an existing v1 game onto new terrain.

See [the current world contract](docs/landscape-study.md#current-default-living-valley)
and [qualification evidence](output/inhabited-valley-v1/README.md).

## Food and a first brood

Choose **Balanced**, **Build** or **Provision** in Food & brood. Policies order
new work: Balanced buffers three of each nursery food before construction,
Provision fills the target of six, and Build chooses construction first. Urgent
meals, carried deliveries and the active-brood emergency floor take priority.
Build a home, then its four-reed **covered root nursery**. Adults deliver staple
and protein food to local targets of six each (capacity eight each). Support is
offered for named willing hens with actual recent fertility, good condition,
local supplies, future adult housing and a sustainable food/work forecast.

Laying two eggs takes supplied work. Incubation needs one four-minute cycle;
chicks need another supplied cycle of care to become juveniles and one further
healthy cycle to become adult workers. Shortages pause progress and explain why.
Chicks and juveniles stay grounded; their care history affects later attachment.
No offline progress, free growth button or commercial egg inventory exists.
Water/mineral access is dependable within this grove; structural wood is future.
See [the owning economy rules](story/settlement-design.md#implemented-bounded-food-care-and-population-economy)
for provisional rates, conservation and forecast limits.

## Run locally

Use Node **20.19+ or 22.12+** (`.nvmrc` records 22.12) and npm. Install a compatible
Node version if these commands are missing. With nvm, `nvm install && nvm use`.

```sh
npm ci
npm run dev
```

Open Vite's local URL in a **WebGL 2** browser. Guest play needs no keys, accounts, external fonts,
backend, or art downloads. Optional email accounts and explicit remote save copies use the setup in [account setup](docs/account-setup.md). React owns controls; full Babylon.js owns
the true 3D world with an elevated 2.5D presentation.

```sh
npm run typecheck
npm test           # simulation, conservation, interruption, saves and legacy rules
npm run build      # strict TypeScript + production bundle
npm run check      # required local acceptance: tests + build
npm run preview
```

`npm run assets:build` regenerates editable Blender sources and runtime GLBs from
`assets/sculpted/` using Blender 4.5 LTS and Python 3. Set `BLENDER_BIN` if needed.
Shipped GLBs require no local art tool to run.
`npm run test:watch` is available. Pinned dependencies and `package-lock.json`
are the install contract. No remote CI or open-source license has been selected. Prepared deployment
configuration is documented separately in [deployment notes](docs/deployment.md);
local qualification does not establish publication.

## Gather and build freely

Fresh worlds begin with eight loose construction reeds, two capacity-limited renewable reed patches,
and three open mixed-food places. Birds walk freely over the bounded clearing;
there is no player-created road network or connectivity tool.

Without input, chickens choose food places and scratch/peck there. Appetite
interrupts new work, while a carrier first delivers its existing bundle safely.
Fed idle birds also browse without endlessly consuming food. Distance, available
food, occupancy, individual cover/open-ground preference and a remembered productive
place affect the next choice. **Forage** reveals these places; **Settlement** shows
food remaining, occupants/recovery and **Rest/Open** controls. Food recovers while below capacity, including while visited,
on simulation ticks, including a resting place. No offline or phase-change food bonus
occurs. Quantities, appetite and recovery rates are fictional prototype tuning;
mixed forage units do not establish a complete diet, starvation or survival system.

Choose **Gather reeds** to designate a construction reed patch. Birds reserve yield
and storage room, extract one bundle and carry it to the cache or a completed store.
These reeds are not food and recover one unit per 240 daytime ticks up to capacity. Undesignating preserves carried goods.
Choose the persistent **Community building** command in the header, then Longbough in Living valley, or Lowfork, Splitcrown or
Reedside in Woodland, in the named-tree list or world. The construction inspector shows costs,
available builds and locked reasons. A new commission immediately stays at the top with its next need and named workers.
Four named adults autonomously reserve, collect, carry and deliver six local reeds
before weaving a platform, rain hood and ladder, with feeding breaks between jobs.
Different trees retain real travel distances.

Living valley offers authored reserved store pads and their legal approaches. In Woodland, for a ground store, choose **Place store nest** in Build, then click open terrain
or use its X/Z controls and **Build store**. In store mode,
canvas arrow keys move the cell cursor and Enter uses the tool. Woodland retains
its fixed responsive camera. **Menu** contains save tools; **Food** opens food for chicks and food places. Select chickens with left-click, Shift toggle or a ground drag. Right-click ground to Move, a reed patch to gather repeatedly there, or an unfinished project to build until complete. The compact command dock offers the same targeting with left-click/touch, **Move M**, **Gather G**, **Help build**, **New building B** (one selected builder), **Stop S** and **Community work**. Personal Details opens separately. Selection leaves the camera in place; **Follow** is explicit. Shift or **Queue next** appends up to sixteen orders. A successor to gathering waits for depletion. Direct control stays idle after completion until explicit community return. Stop retains held cargo at the next safe cell; new work/Return routes it physically. Meals/rest suspend then resume intent; young and essential carers reject orders. The top **Reeds ready** count excludes reserved, carried and already-delivered building materials; these remain visible in optional details. A building can be queued before all its reeds are ready, with an explicit shortage and gather action. Night commissions start in the morning.

A **store nest** costs four reeds and holds twelve at its actual location.
Set its local stocking target, watch deliveries fill it, then place another
treehouse. Builders use the nearest reachable stock; set a filled
store's target to zero to stop refill while testing its contribution. Supporting
storage serves treehouse construction rather than becoming the settlement's goal.

A fresh grove automatically cycles through three minutes of day and one minute of evening. Pause and 1×/4× time controls use the same fixed simulation ticks. At evening, they fly into finite
natural branch perches. A completed treehouse adds two sheltered berths, used
through a visible ground approach and ladder climb. Contributors remember their
work and favor that tree. Natural sleep restores readiness up to 80; shelter up
to 100. Work tires birds; ordinary ground rest can recover readiness. These generous play rules are provisional. Morning returns birds to ground automatically. There is no predator combat. Woven shelter is not universal
invulnerability.

At a completed home, four reeds fund **Experiment with a hauling basket**: three
bundles become a woven rig, and its operator must raise the last reserved bundle
before the shared technique is learned. That named demonstration is remembered.
Afterward, **Build hauling basket** is available at other completed homes. A
finished local basket enables a four-reed **extra sleeping deck**, adding two
more sheltered berths. It raises the real deck deliveries, one operator at a time;
it does not create goods or carry chickens. Recipes and short lift times are
provisional. Lift progress, cargo and the learned technique survive reload.

Canceling unfinished sites leaves delivered reeds as local salvage; uncollected
reservations release and carriers return their loads physically. Stopping foraging at a food
place redirects feeders without discarding material cargo. Pause stops simulation
ticks, appetite changes and food recovery exactly.

## Saves and compatibility

The illustrated title screen opens before the 3D game. **Continue** opens the most
recent valid game on this device. **New game** creates a separate named grove;
**Load game** lists local games and imports JSON as another game. Existing games
are never replaced by creating or importing. In play, **Menu → Save and return to
title** saves before leaving; export remains available. Reload returns to title.

Woodland saves without direct orders retain `settlement-8`, inhabited worlds retain
`settlement-9`; direct state uses additive `settlement-10` with the same world
identity, geometry, jobs and physical goods. Separate device-library
metadata owns game names, timestamps, revisions and one previous valid checkpoint.
The old single `settlement` key is imported once into the library and its exact
original bytes are never changed. Unreadable or newer records stay outside the
3D game with retry, exact-original download and a new-game path. A valid previous
checkpoint can be restored while retaining the rejected bytes as another record.
Legacy story archive access cannot block settlement games.

Saves capture and strictly validate the candidate before an atomic IndexedDB
commit, about once per second and after commands. Only a completed transaction
reports success. A failed write keeps the previous good game, labels the current
session unsaved and offers retry/export; returning to title does not discard it
silently. A browser Web Lock permits one active writer per game, and transactional
revision checks reject stale writes. Browsers without Web Locks can export games
but cannot open an unsafe editing session. There is no offline catch-up or
cross-tab merging. In-flight loads, movement, food, care and memories stay saved
simulation facts.

**Log in** and **Create account** are optional email-code routes. They never gate
guest play or automatically upload device games. An explicit **Save copy to
account** creates a separate remote copy; **Load as new local game** imports one
without replacing a device game. Account copies remain distinct from local games,
and account changes clear cached remote data. Missing provider configuration is
shown honestly; real email delivery and hosted acceptance require the configured
provider described in [account setup](docs/account-setup.md).

Older growth saves keep their current stage and proportional progress under the
one-cycle pacing. Age, actual care/bond history, eggs, identities and deliveries
remain unchanged; importing never hatches or matures a bird.

Validated `settlement-1` through `settlement-7` saves migrate with their original material baseline,
sites, jobs and history intact. New patches relocate around existing sites. A
fully occupied older map may fit only zero or one patch; the UI reports this and
clearing space later does not respawn reed patches. Saved road data is retired,
while existing adjacent movement progress, cargo, jobs, sites and histories retain
their meaning. Food state is introduced explicitly by migration; reloading does
not refill a food place.

The previous authored dilemma remains a historical fixture in code and story
docs. Its `first-evening-1` device save is retained under its original key; an
**Export archived story** button appears when present. These story files are
explicitly rejected as settlement imports, never silently reinterpreted.

## Repository map

| Location | Owns |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Coding context, ownership, acceptance |
| [story/](story/vision.md) | Canon, settlement design, technology, historical fixtures |
| [art-direction/](art-direction/visual-bible.md) | Visual language, animation, asset pipeline |
| [src/simulation/](src/simulation/settlement.ts) | Pure commands, fixed steps, local goods, jobs, rest and perches |
| [src/content/](src/content/settlement.ts) | Provisional playable roster, landmarks and tuning |
| [src/game/](src/game/create-clearing.ts) | Babylon landscape, structures, cargo, movement and picking |
| [src/app/](src/app/App.tsx) | Accessible controls, fixed-step driver, inspector and save coordination |
| [src/persistence/](src/persistence/settlement-save.ts) | Strict settlement envelope, local game library, validated atomic writes and compatibility |
| [assets/](assets/README.md) | Source/reference guidance |
| [public/assets/](public/assets/README.md) | Approved runtime exports and provenance |
| [docs/](docs/architecture.md) | Architecture, research, decisions, roadmap and workflow |

For consequential systems: **economic/spatial decision → observable work →
individual consequence → persistent response**. Ordinary work trips do not need
mandatory dialogue. [Biology research](docs/research/chicken-biology.md)
distinguishes sourced constraints from fictional civilization. The
[earlier gameplay proposal](story/proposals/gameplay-rules-analysis.md) is
historical background, not competing construction or progression canon.

An unfinished project can be marked **Build this first**. The next free community construction work tries that project before normal order; current deliveries, named requests, care, meals and the chosen food policy continue. **Use normal order** clears the choice, and completion or cancellation clears it automatically. A tree’s single world badge shows its focused project. The compact **Build first** indicator finds any chosen project, including ground stores under Other building controls; stores retain their ground construction marker. Material shortages still need real gathered reeds; focus is not a guaranteed worker or speed bonus. Older saves migrate with no project focused.

Command the Coop uses one selected-chicken dock: M move, G gather, B new building
(one builder), S stop, I awaiting orders. Shift+1–9 assigns session groups and
1–9 recalls them; groups reset on reopen while saved orders persist. Header
Controls opens dismissible help. [Interaction contract](docs/build-resource-interactions.md).
