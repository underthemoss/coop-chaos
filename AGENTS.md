# Coop Chaos: working agreements

Read [story/vision.md](story/vision.md) before changing gameplay, narrative, or
player experience. Read [story/world.md](story/world.md) and
[story/story-system.md](story/story-system.md) for the relevant social rules and
fixture. Read [art-direction/visual-bible.md](art-direction/visual-bible.md) and
[art-direction/asset-pipeline.md](art-direction/asset-pipeline.md) before visual,
character, animation, or runtime-asset work. Architecture and commands live in
[docs/architecture.md](docs/architecture.md) and [README.md](README.md).

## The game must personify people

This is a society of chickens with comic dignity and emotionally credible stakes.
Every hen and rooster is someone, with wants, fears, relationships, loyalties,
and social leverage. There are no humans or farmers. Coops are tribes, not a
requirement for farm buildings. Eggs become the next generation, not sale goods.

The visual reference is [Kingdoms and Castles](https://store.steampowered.com/app/569480/Kingdoms_and_Castles/):
elevated strategy camera, broad faceted terrain, forest masses, shoreline/water,
and simple readable forms. Keep the world dominant, with a restrained story
inspector. Preserve individual identity through selection and zoom. Build an
original chicken landscape; no borrowed assets or human medieval buildings,
and no claim that this small foundation matches a finished game’s art quality.

For a gameplay or narrative proposal, trace:
**human motive → social tension → player choice → persistent consequence → visible story feedback**.
Ask: What does this chicken want? What do they fear? From whom do they need
recognition, safety, affection, or allegiance? What will they remember?

Do not accept a mechanic merely because its counters work. Its pressure must be
legible as a social dilemma, choices must express competing values, and affected
characters must visibly react and remember. Hens are never interchangeable
breeding, marriage, or inventory tokens. A kinship transfer can involve desire,
resistance, coercion, compromise, or betrayal; represent the named hen's position
and lasting ties. Do not replace difficult politics with universally happy
arrangements. Roosters' protection, rivalries, and pacts also have social costs.
Human analogies are diverse fictional inspiration, not universal anthropology.
Routine tooling fixes do not need a fabricated narrative justification.

## Ownership and change discipline

- `story/` owns world canon, narrative principles, and the status of examples.
  Label inventions provisional until explicitly accepted. Code implements these
  sources; it must not silently establish competing canon.
- `art-direction/` owns visual language, silhouettes, motion, and art handoff.
- `src/content/` owns typed playable content adapted from the story documents.
  Keep prose/fixture changes synchronized with their cited narrative source.
- `src/simulation/` owns pure deterministic rules. No React, Babylon, DOM, or
  persistence dependencies. Random rules, when added, require an explicit seed.
- `src/game/` renders simulation state with Babylon; it does not decide outcomes.
- `src/app/` owns accessible controls and presentation. `src/persistence/` owns
  save schemas and validation, never social rules.

Agents are the coding team. Leave clear interfaces and a useful handoff for the
next agent. Extend existing owners before adding a parallel subsystem. Prefer
small, working slices. Single player is the present scope; do not add backend,
auth, multiplayer, monetization, or deployment infrastructure speculatively.
Do not introduce secrets or unlicensed assets into this public repository.

Before declaring a change complete, run the smallest meaningful checks plus
`npm run check`. Test social consequences and replay protection when rules
change. For a changed integrated journey, check input → rule → save/readback →
render → refresh as applicable. Browser acceptance must include the actual 3D
scene, console, usable narrow layout, and meaningful choice feedback. Honor
reduced motion. A successful build is not proof of a rendered scene.

A handoff states changed files, tested layers and evidence, unresolved work,
and next action. Distinguish local checks, browser acceptance, commits,
publication, and deployment. Update narrative/design docs with semantic changes;
do not duplicate canon into new instructions or create a competing `agents.md`.
