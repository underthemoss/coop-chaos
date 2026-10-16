# Architecture

A single npm project, static browser app, TypeScript strict. Vite builds it;
React/CSS owns management UI; full Babylon.js owns the WebGL 2 scene. There is
no backend, account, network multiplayer, or authoritative server simulation.
The rendering target is modeled, animated 3D chickens in a broad low-poly
landscape with an elevated strategy camera. The user reference is
[Kingdoms and Castles, official store](https://store.steampowered.com/app/569480/Kingdoms_and_Castles/).
Use its terrain/forest/shoreline scale as visual guidance, preserving an original
chicken world with no human medieval architecture or borrowed assets.

## Ownership and data flow

`src/content/first-evening.ts` adapts the provisional narrative fixture.
`src/simulation/flock.ts` owns a pure `FlockState` and `resolveShelter` command.
A choice can resolve exactly once. `consequences` derives shelter occupants,
relationship meaning, character reaction, and chronicle from that branch. No
randomness or engine clock influences this rule. Future randomness must be seeded;
future time-based simulation must have an explicit fixed step independent of FPS.

React sends a choice to the rule, updates its view, and commits the compact state
through `src/persistence/save.ts`. The renderer receives state and moves the
relevant birds; mesh picking selects a character only. Babylon does not create
or save social outcomes. Reduced motion removes idle movement; text remains a
complete account of the decision. The scene is a contiguous faceted terrain mesh, merged low-poly forest masses,
shoreline/water, worn paths, and a natural root refuge. Four procedural named
characters inhabit the gathering glade; there is no hidden settlement economy.
Projected HTML name buttons and a selection ring preserve identity at world scale.

The orthographic camera has a fixed elevated angle. Drag/arrow keys pan within
bounds; wheel or +/− zoom within limits; reset restores the default; Find centers
and zooms to the selected character. Camera changes never mutate social state
or saves. React owns controls/labels; the scene projects label positions without
per-frame React rendering. The world takes remaining desktop viewport space
beside a scrollable inspector; narrow layout places the world first. Input
listeners, the viewport observer, and engine/scene are disposed on unmount.

IndexedDB database `coop-chaos`, version 1, store `saves`, key `first-evening`
holds a JSON envelope: `schemaVersion: 1`, `storyVersion: first-evening-1`, and
`choice: null | shelter | rank`. Validate all imports and reads; reject unknown
fields and incompatible versions. Derived relationships are not independently
serialized, avoiding contradictory counters. Save success means transaction
completion. Failed storage keeps the in-memory choice playable and explicitly
offers export. Import validates before replacing state; restart is explicit.
Before changing branch meaning or shape, define migration or explicit rejection.
This intentionally small adapter is not a general campaign save platform.

## Checks and boundaries

Vitest covers both social outcomes, replay rejection, save validation,
round-tripping, and IndexedDB commit/reopen using fake-indexeddb. Browser smoke
must additionally prove actual WebGL scene rendering, selection, choice feedback,
refresh restoration, malformed-import preservation, functional pan/zoom/reset/Find,
and a usable narrow layout.

Pinned compatible dependencies and the lockfile were resolved on Node 20.20.2.
Vite 8 supports Node 20.19+/22.12+. Vitest 4 is deliberately retained for the Node
20 baseline; Vitest 5 requires Node 22.12+. TypeScript 6 is the checked compiler.
No lint layer is added yet: strict/no-unused compiler checks and focused tests
cover this small foundation without competing configuration. Add lint when actual
conventions or failure patterns justify it.

The initial Babylon bundle is comparatively large. Prefer measured code splitting
and asset loading when the next slice establishes real payloads; do not switch
to Babylon Lite or flatten the world to solve a speculative budget.
