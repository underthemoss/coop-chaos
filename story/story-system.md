# Story system and first-evening study

## Narrative acceptance

For every gameplay/story change, identify a human motive, its social tension,
the player's meaningful choice, a persistent consequence, and visible feedback.
Ask what each chicken wants, fears, and needs from whom. The causal chain must
be specific enough that a player can explain another character's reaction.
Routine build fixes need no invented story rationale.

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

## Extending the story

First extend a consequence into a second scene that acknowledges the earlier
choice. Keep cast IDs stable, add schema/content migration before incompatible
save changes, and test that earlier promises and grievances are not erased.
Let different named characters respond differently to the same pressure.
