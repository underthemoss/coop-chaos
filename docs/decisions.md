# Foundation decisions

- **Browser and single player first.** Keep a static app with no auth/backend.
  Multiplayer is a later design problem, not a hidden dependency today.
- **Full Babylon.js, TypeScript, Vite, React/CSS.** Babylon owns the true 3D world;
  React owns accessible management UI. An angled camera supplies 2.5D presentation.
  Production art is intended to come from Blender through GLB. The user’s
  [Kingdoms and Castles reference](https://store.steampowered.com/app/569480/Kingdoms_and_Castles/)
  establishes the intended landscape scale: faceted terrain, forest masses,
  shoreline, elevated strategy camera. Use original chicken-world geometry,
  never copied assets or human medieval buildings. A fixed default with bounded
  pan/zoom supports both the broader place and individual character inspection.
  The world dominates the desktop view; a restrained inspector carries context.
- **Pure simulation.** Rules stay independent of UI, rendering, storage, and FPS.
  The first event is deterministic and resolves once, with named consequences.
- **Story and art are separate owners.** `story/` owns the premise and canon;
  `art-direction/` owns visual/animation direction. Provisional code fixtures do
  not silently become canon. The coding contract links both.
- **Small versioned local saves.** IndexedDB plus validated JSON transfer proves
  continuity without premature campaign/platform abstraction. No cloud sync.
- **Public repository hygiene.** Only project context and licensed work belong
  here. No license has been chosen. No deployment/CI service has been configured.
