# Coop Chaos

**A small world. Long memories.** A story-first chicken society game: everyday
needs become questions of status, care, loyalty, and belonging. No humans,
farmers, or commercial egg sales. Coops are tribes; every chicken is someone.

This repository is a **working foundation**, not a complete game. It includes an
elevated, orthographic Babylon.js landscape, four animated procedural 3D placeholder
chickens, character context, and one authored social decision. Two outcomes leave
different relationships and remembered consequences. The visual reference is
[Kingdoms and Castles](https://store.steampowered.com/app/569480/Kingdoms_and_Castles/):
faceted terrain, forest masses, shoreline, and a broad strategy view. The art here
is original procedural placeholder geometry, not borrowed assets or a claim of
matching that game’s production quality. Final modeled and rigged characters,
a campaign, and multiplayer remain future work.

## Run locally

Use Node **20.19+ or 22.12+** (Node 22.12 is recorded in `.nvmrc`) and npm.
If `node` or `npm` is missing, install a compatible Node version first. With a
version manager, `nvm install && nvm use` honors `.nvmrc`.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. A browser with **WebGL 2** is required for
the scene. No API keys, account, external fonts, backend, or asset downloads are
needed. React renders the management UI; Babylon renders a true 3D world with a
2.5D presentation. This uses full `@babylonjs/core`, not Babylon Lite.

```sh
npm run typecheck  # strict TypeScript
npm test           # deterministic social rules and save validation/readback
npm run build      # typecheck and production browser bundle
npm run check      # tests + build (local acceptance command)
npm run preview    # serve the built app locally
```

`npm run test:watch` is available while working. Dependencies are pinned and
`package-lock.json` is the install contract. There is no remote CI or deployment
configuration. No open-source license has been selected.

## Try the first evening

Drag the landscape to pan; scroll or use +/− to zoom. Reset view returns to the
elevated default. With the canvas focused, arrow keys pan, +/− zoom, and 0 resets.
Select a named chicken in the inspector or landscape to learn their wants and
fears. “Find” centers and zooms to the selected individual. Camera state is local
presentation, not a saved story fact. Decide whether Rowan
keeps his promise to the senior hen or gives her dry hollow to a mother and
chick. The flock moves and the character context records the consequence.
This cast and event are **provisional examples**, not approved story canon.

The evening saves to IndexedDB on this browser/device. Refresh restores it.
Export/import a small versioned JSON save to carry it elsewhere; invalid or
incompatible saves are rejected before changing the current evening. Device
storage can be cleared or unavailable, so export a story you want to keep.
Import intentionally replaces the current evening. “Begin again” confirms before
replacing the local outcome. No cross-tab or cloud synchronization is implemented.

## Repository map

| Location | Owns |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Coding context, source ownership, narrative acceptance |
| [story/](story/vision.md) | Vision, world canon, story system and provisional cast |
| [art-direction/](art-direction/visual-bible.md) | Visual language, character/animation direction, pipeline |
| [src/simulation/](src/simulation/flock.ts) | Pure social state and deterministic consequences |
| [src/content/](src/content/first-evening.ts) | Typed playable fixture |
| [src/game/](src/game/create-clearing.ts) | Babylon terrain, fixed-angle navigation, placeholder characters and motion |
| [src/app/](src/app/App.tsx) | React story controls and character context |
| [src/persistence/](src/persistence/save.ts) | Versioned IndexedDB saves, import/export validation |
| [assets/](assets/README.md) | Source/reference art guidance, never runtime imports |
| [public/assets/](public/assets/README.md) | Shipped runtime assets and provenance |
| [docs/](docs/architecture.md) | Architecture, decisions, roadmap, agent workflow |

Start with the narrative and art documents before extending the game. The test
is always: **human motive → social tension → player choice → persistent
consequence → visible story feedback**.
