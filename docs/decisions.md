# Project decisions

- **Browser and single player first.** Keep a static app with no auth/backend.
  Multiplayer is a later design problem, not a hidden dependency today.
- **Full Babylon.js, TypeScript, Vite, React/CSS.** Babylon owns the true 3D world;
  React owns accessible management UI. An angled camera supplies 2.5D presentation.
  Production art is intended to come from Blender through GLB. The user’s
  [Kingdoms and Castles reference](https://store.steampowered.com/app/569480/Kingdoms_and_Castles/)
  establishes the intended landscape scale: faceted terrain, forest masses,
  shoreline, elevated strategy camera. Use original chicken-world geometry,
  never copied assets or human medieval buildings. The current art-focused MVP
  uses fixed responsive framing, with no pan or zoom
  controls. Selection and a restrained inspector preserve individual access.
  The world dominates the desktop view; a restrained inspector carries context.
- **Settlement building is the core play.** The accepted
  [settlement design](../story/settlement-design.md) owns construction, production,
  free chicken movement, local stores, visible autonomous deliveries, and
  expansion. Chickens fictionally cultivate and build with beaks and feet.
  Individuals become recognizable through work; logistics creates social power
  and later district politics. A later substantial proof is a settlement loop,
  with one thin construction-delivery proof inside it. The old authored dilemma
  and cast have no privileged status or mandatory sequel. The thin treehouse delivery, local-store and saved roost/rest proof is implemented;
  production, growth, predators and district politics remain future.
- **Free movement, with trails later.** Chickens move and forage without
  player-authored roads or a path-connectivity gate. Optional worn trails may
  emerge from repeated traffic later. The Path controls, road rendering and
  connectivity gate are removed. Strict versioned migration retires road data
  while preserving existing work, cargo and movement progress.
- **Art-led living sandbox next.** The [opening brief](../art-direction/opening-view-exploration.md)
  owns the v2 visual reference, concrete asset inventory and authoring-route proof.
  Basic foraging, treehouse commissioning and inspection should support autonomous
  life, without an authored opening arc or mandatory build order. The bounded
  implementation gathers finite construction reeds, with atomic extraction and
  physically carried delivery. Separate food places support autonomous feeding
  and unused-place recovery. Fresh loose stock is eight,
  with two twelve-reed patches, all provisional tuning. The rejected Node GLBs
  are replaced by editable Blender assets; actual-camera art acceptance remains
  open. Prove actual artifacts
  close up and at the live fixed camera before expanding the map or systems.
- **Trees are central characters.** [Tree kinships](../story/tree-kinships.md)
  owns named trees, botanical families and changeable cross-family affiliation.
  Family, individual ancestry and growth form are separate facts. Mixed-family
  communities gain complementary opportunities through actual places, knowledge
  and work; single-family communities remain viable. Detailed names, recipes and
  consciousness expression are proposals, not implemented rules.
- **Pure simulation.** Rules stay independent of UI, rendering, storage, and FPS.
  Settlement uses explicit 100 ms steps independent of render FPS, deterministic
  routes and no offline catch-up. The legacy event still resolves once.
- **Story and art are separate owners.** `story/` owns the premise and canon;
  `art-direction/` owns visual/animation direction. Provisional code fixtures do
  not silently become canon. The coding contract links both.
- **Small versioned local saves.** IndexedDB plus validated JSON transfer proves
  continuity without premature campaign/platform abstraction. No cloud sync.
- **Public repository hygiene.** Only project context and licensed work belong
  here. No license has been chosen. No remote CI is configured. Deployment preparation is owned separately; local
  qualification does not establish a release.

- **Ground economy, trunk access, canopy home.** Forest clusters become kingdoms;
  productive open commons supply food foraging and future shared-use politics. Natural
  flight by the opening adult fixtures precedes building. Future low-flight
  bodies need honest natural perch/access options; no save reinterpretation is
  implied. Treehouse improvements add real sheltered
  occupancy and ladder use. [Technology design](../story/technology.md) permits
  chicken-invented machinery and late science-fiction elevators; no human builders
  or universal predator immunity. Exact costs, capacity and rest rates are provisional.
- **Separate save meanings.** Settlement uses a strict `settlement-3` envelope at
  its own key, ordered local writes, and validation before replacement. Validated
  v1 worlds migrate with forty original reeds and all existing sites/jobs intact.
  New finite patches relocate to free cells; crowded old maps may fit fewer than
  two, with an explicit notice and no later automatic respawn. Old
  `first-evening-1` device data remains untouched and exportable, never migrated
  into a different fiction silently.

- **Bounded autonomous food foraging.** Three mixed-food places start open. Appetite
  prompts feeding before new work, cargo delivers first, and fed idle birds may
  browse without consuming. Place choice includes distance, yield, occupancy,
  individual preference and remembered success. Unused food recovers on ticks.
  Food and finite construction reeds have separate ledgers. Rates are fictional
  tuning; this is not full nutrition, starvation, egg production or predator play.
