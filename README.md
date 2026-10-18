# Coop Chaos

**A small world. Long memories.** A chicken treehouse settlement builder.
Ground work and supplies support a growing canopy home; forest clusters become
kingdoms, while productive open commons lie between them. Individuals develop
habits, attachments, and politics through work. No humans, farmers, or commercial
egg sales. Every chicken is someone.

The [settlement design](story/settlement-design.md) owns the loop;
[Life above the ground](story/technology.md) develops treehouses, access,
inventions, and distinct defensive purposes. The larger game remains future.
This playable **construction proof** implements one finite-material chain,
local storage, natural evening flight, and earned woven shelter with ladder use.
The inhabited-tree proof joins the upper deck through the home edge and ramp;
ground deliveries approach beside the trunk. A shared content habitat contract
keeps six berths, cargo and access aligned with authored assets and existing saves.
It does not yet implement food production, predators, population growth, rival
kingdoms, or a broad technology tree. Thirty minutes of enjoyable settlement play is a
future playtest target, not a proven property of this slice.

The visual reference is [Kingdoms and Castles](https://store.steampowered.com/app/569480/Kingdoms_and_Castles/):
faceted landscape, forest masses, shoreline, elevated strategy view.
The earlier Node-authored pass was visually rejected. Original editable Blender
trees, chickens and resource/building assets now replace it; visual acceptance
against opening-view-v2 remains open. The [art-led sandbox brief](art-direction/opening-view-exploration.md)
requires high-quality artifacts in the actual scene. Finite construction-reed
gathering and autonomous mixed-food foraging are implemented with separate resource ledgers.
The elevated view is fixed; responsive framing keeps the playable grove visible.
Seven rigid-articulation action clips support the current birds; production rigs,
a campaign, and multiplayer remain future work.

## Run locally

Use Node **20.19+ or 22.12+** (`.nvmrc` records 22.12) and npm. Install a compatible
Node version if these commands are missing. With nvm, `nvm install && nvm use`.

```sh
npm ci
npm run dev
```

Open Vite's local URL in a **WebGL 2** browser. No keys, accounts, external fonts,
backend, or art downloads are needed. React owns controls; full Babylon.js owns
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

Fresh worlds begin with eight loose construction reeds, two finite reed patches,
and three open mixed-food places. Birds walk freely over the bounded clearing;
there is no player-created road network or connectivity tool.

Without input, chickens choose food places and scratch/peck there. Appetite
interrupts new work, while a carrier first delivers its existing bundle safely.
Fed idle birds also browse without endlessly consuming food. Distance, available
food, occupancy, individual cover/open-ground preference and a remembered productive
place affect the next choice. **Forage** reveals these places; **Settlement** shows
food remaining, occupants/recovery and **Rest/Open** controls. Unused food recovers
on simulation ticks, including a resting place. No offline or phase-change food bonus
occurs. Quantities, appetite and recovery rates are fictional prototype tuning;
mixed forage units do not establish a complete diet, starvation or survival system.

Choose **Gather reeds** to designate a construction reed patch. Birds reserve yield
and storage room, extract one bundle and carry it to the cache or a completed store.
These reeds are not food and do not regrow. Undesignating preserves carried goods.
Choose **Build**, then Lowfork, Splitcrown or Reedside in the world or named-tree list.
The compact tree inspector shows occupied berths, existing work and available builds.
Four named adults autonomously reserve, collect, carry and deliver six local reeds
before weaving a platform, rain hood and ladder, with feeding breaks between jobs.
Different trees retain real travel distances.

For a store nest, click terrain cells or use the X/Z controls and **Use tool**. In store mode,
canvas arrow keys move the cell cursor and Enter uses the tool. The camera has
no pan or zoom controls. **Settlement** opens secondary controls, local stocks,
named bird selection and save tools; the selected bird alone carries a world tag.

A **store nest** costs four reeds and holds twelve at its actual location.
Set its local stocking target, watch deliveries fill it, then place another
treehouse. Builders use the nearest reachable stock; set a filled
store's target to zero to stop refill while testing its contribution. Supporting
storage serves treehouse construction rather than becoming the settlement's goal.

All adults can **Call evening** before building anything: they fly into finite
natural branch perches. A completed treehouse adds two sheltered berths, used
through a visible ground approach and ladder climb. Contributors remember their
work and favor that tree. Natural sleep restores readiness up to 80; shelter up
to 100. Work tires birds; ordinary ground rest can recover readiness. These short,
generous prototype rules are provisional. **Begin day** returns birds to ground.
There is no automatic calendar or predator combat. Woven shelter is not universal
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
reservations release and carriers return their loads physically. Resting a food
place redirects feeders without discarding material cargo. Pause stops simulation
ticks, appetite changes and food recovery exactly.

## Saves and compatibility

The `settlement-4` schema saves to IndexedDB about once per second and
after commands. There is no offline catch-up or cloud/cross-tab synchronization;
use one tab. Export to retain important progress. Import validates shape,
references, resource conservation, jobs, and sleeping occupancy before replacing
anything. Restart confirms replacement. In-flight loads, movement progress, food, feeding, sleep, rest,
and memories are saved facts.

Validated `settlement-1`, `settlement-2` and `settlement-3` saves migrate with their original material baseline,
sites, jobs and history intact. New patches relocate around existing sites. A
fully occupied older map may fit only zero or one patch; the UI reports this and
clearing space later does not respawn reed patches. Saved road data is retired,
while existing adjacent movement progress, cargo, jobs, sites and histories retain
their meaning. Food state is introduced explicitly by migration; reloading does
not refill a food place.

The previous authored dilemma remains a historical fixture in code and story
docs. Its `first-evening-1` device save is retained under its original key; an
**Export old first evening** button appears when present. These story files are
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
| [src/persistence/](src/persistence/settlement-save.ts) | Strict settlement envelope, IndexedDB and ordered writes |
| [assets/](assets/README.md) | Source/reference guidance |
| [public/assets/](public/assets/README.md) | Approved runtime exports and provenance |
| [docs/](docs/architecture.md) | Architecture, research, decisions, roadmap and workflow |

For consequential systems: **economic/spatial decision → observable work →
individual consequence → persistent response**. Ordinary work trips do not need
mandatory dialogue. [Biology research](docs/research/chicken-biology.md)
distinguishes sourced constraints from fictional civilization. The
[earlier gameplay proposal](story/proposals/gameplay-rules-analysis.md) is
historical background, not competing construction or progression canon.
