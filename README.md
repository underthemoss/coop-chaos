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
It does not yet implement food production, predators, population growth, rival
kingdoms, or a technology tree. Thirty minutes of enjoyable settlement play is a
future playtest target, not a proven property of this slice.

The visual reference is [Kingdoms and Castles](https://store.steampowered.com/app/569480/Kingdoms_and_Castles/):
faceted landscape, forest masses, shoreline, elevated strategy view.
The earlier Node-authored pass was visually rejected. Original editable Blender
trees, chickens and resource/building assets now replace it; visual acceptance
against opening-view-v2 remains open. The [art-led sandbox brief](art-direction/opening-view-exploration.md)
requires high-quality artifacts in the actual scene. Finite construction-reed
gathering is implemented; food foraging and regrowth are not.
The elevated view is fixed; responsive framing keeps the playable grove visible.
Six rigid-articulation action clips support the current birds; production rigs,
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

Fresh worlds begin with eight loose reeds and two finite patches of twelve.
Choose **Gather reeds**, designate a patch and connect it to the cache or a
completed store with paths. Birds reserve a destination, walk to the patch,
gather one bundle and carry it to local storage. Extraction depletes the patch;
there is no regrowth or food yield. Undesignating preserves already carried goods.

Choose **Treehouse**, then Lowfork, Splitcrown, or Reedside at its marked
cell. With **Path**, connect neighboring cells from the reed cache at
**(−3, −2)** to the trunk. Four named adults autonomously reserve, collect,
carry, and deliver reeds before weaving the platform, rain hood, and ladder.
One short Lowfork route is (−2, −2), (−2, −1), (−2, 0), (−2, 1), (−2, 2).
Different trunks require different route layouts and distances.

Click terrain cells or use the X/Z controls and **Use tool**. In build mode,
canvas arrow keys move the cell cursor and Enter uses the tool. The camera has
no pan or zoom controls. **Settlement** opens secondary controls, local stocks,
named bird selection and save tools; the selected bird alone carries a world tag.

A **store nest** costs four reeds and holds twelve at its actual location.
Set its local stocking target, watch deliveries fill it, then place another
connected treehouse. Builders use the nearest reachable stock; set a filled
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

**Remove path** can interrupt work. A blocked bird waits with its bundle until
access is repaired, including at evening. Canceling unfinished sites leaves
already delivered reeds as local salvage; uncollected reservations release and
carriers return their loads physically. Pause stops simulation ticks exactly.

## Saves and compatibility

The `settlement-2` schema saves to IndexedDB about once per second and
after commands. There is no offline catch-up or cloud/cross-tab synchronization;
use one tab. Export to retain important progress. Import validates shape,
references, resource conservation, jobs, and sleeping occupancy before replacing
anything. Restart confirms replacement. In-flight loads, routes, sleep, rest,
and memories are saved facts.

Validated `settlement-1` saves migrate with their original forty-reed baseline,
sites, jobs and history intact. New patches relocate around existing sites. A
fully occupied older map may fit only zero or one patch; the UI reports this and
clearing space later does not respawn patches.

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
individual consequence → persistent response**. Ordinary paths do not need
mandatory dialogue. [Biology research](docs/research/chicken-biology.md)
distinguishes sourced constraints from fictional civilization. The
[earlier gameplay proposal](story/proposals/gameplay-rules-analysis.md) is
historical background, not competing construction or progression canon.
