# Historical first-evening study

The default app now runs the [treehouse construction proof](settlement-design.md#treehouse-direction-and-current-thin-proof). This document preserves the old fixture and save meaning, not a required opening or sequel.

## Narrative acceptance

The accepted [settlement design](settlement-design.md) makes construction,
production, transport, and expansion the regular play. For consequential systems,
trace **economic/spatial decision → observable work → individual consequence →
persistent response**. Identify motives behind important reactions: what each
chicken wants, fears, and needs from whom. Repeated work and encounters can tell
the story without mandatory dialogue. Routine construction needs spatial purpose;
tooling fixes need no invented story rationale.

Named trees also carry personality and history. [Tree kinships](tree-kinships.md)
owns the distinction between a chicken's personal attachment and a tree's
relationship with its community. Affinity can influence behavior without fixing
allegiance or blocking travel. Future mixed-family capabilities must emerge
through useful places and work, not collecting species for modifiers. The legacy
fixture below predates this direction and does not implement it.

Relationships are directed and contextual. A character can respect someone's
courage and resent their decision. A future system may quantify these facts,
but a number alone is not a story. Neither kinship nor rank erases individuality.

## Provisional fixture: the first evening

**Everything below is an authored example, not user-established canon.** Typed
content lives in `src/content/first-evening.ts`; the deterministic rule lives in
`src/simulation/flock.ts`. Keep those implementations and this account coherent.
The example does not establish the final player identity: the player is simply
choosing Rowan's response for this study.

| Character | Wants | Fears | Social leverage |
| --- | --- | --- | --- |
| Rowan, rooster | Hold the flock together and keep his word | Protection without trust | The others look to him to uphold a claim |
| Mallow, senior hen | Recognition for years given to her coop | Becoming irrelevant | Customary standing and public backing |
| Bramble, mother | A dry place for Pip | Her chick harmed to preserve another's standing | Her voice and allegiance at the next gathering |
| Pip, chick | Warmth and Bramble nearby | Being left alone in the weather | A relationship worth protecting, not a commodity |

Rain is coming. Rowan promised Mallow her usual place beneath the dry roots.
Bramble asks for the hollow for Pip. It cannot satisfy both claims tonight.

- **Give Bramble and Pip the hollow:** care and safety outrank Rowan's promise.
  Bramble promises him her voice at the next gathering. Mallow takes the outer
  roots and expects amends. The pair moves to the hollow, and the chronicle and
  character context remember the new support and grievance.
- **Honor Mallow's claim:** customary standing and a promise prevail. Mallow
  promises to stand beside Rowan. Bramble shelters Pip under her wing at the
  outer roots and no longer trusts Rowan's promises. Mallow moves into the
  hollow; chronicle and context remember the cost.

This is one irreversible decision within an evening, with explicit restart or
save replacement outside the story. It is not a recurring event to farm support.
The save records the chosen branch; presentation derives the same relationships
and shelter facts after reload. There are no implemented future gatherings,
weather damage, alliance mechanics, generational progression, or procedural plot.
The ending is a remembered consequence, not a claim that a campaign exists.

## Future work and compatibility

The fixture is a historical technical study, not a required opening, final roster,
or next-scene mandate. Build toward the settlement loop, beginning with its thin
construction-delivery proof. New individuals should become recognizable through
work and history rather than inheriting this cast's special status.

Existing first-evening saves retain their exact branch meaning at their original
key. Settlement now uses a separate strict `settlement-4` envelope, migrates validated
`settlement-1`, `settlement-2` and `settlement-3` worlds while preserving existing work and resources, validates imports,
and explicitly rejects legacy story files as incompatible settlement state. The
app offers export of an old device story when present. Legacy rule/save tests
remain; new settlement tests cover in-flight work and persistent experiences.
