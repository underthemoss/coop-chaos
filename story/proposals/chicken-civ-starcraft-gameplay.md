# Chicken Civ: economy, warfare and territorial conquest

Research and gameplay proposal · 24 October 2026

**Direction accepted; mechanics provisional.** The user calls the game
**Chicken Civ**, formerly Coop Chaos, and explicitly selected "Make warfare and
territorial conquest the main goal" on 24 October 2026. This supersedes the first
draft's settlement-first recommendation. This document uses the new name without
migrating application identifiers. The [settlement design](../settlement-design.md)
records the accepted goal; the specific mechanics below are proposals, not an
implementation plan approved for execution.
Research baseline: `9c655eec0aceba05ce23eabe65ea9de56eabe385`.

## Recommendation

Build a civilization of named chickens that can conquer and hold a landscape:

**Produce → mobilize → scout → attack → occupy → supply → expand production.**

StarCraft supplies a powerful structure for competing investments, spatial
pressure and counterplay. Chicken Civ adds a different consequence: the builder,
carrier, parent and defender can be the same person, and their history survives
the encounter. Military success gains usable territory; settlement success funds
the next military opportunity. Choosing when to mobilize, where to strike and
whether to consolidate a victory should drive the game.

Rival coops are the central opposition from the first strategic prototype.
Predators can later complicate the battlefield but are secondary to warfare.
The society remains inhabited and personal: a soldier has work, attachments,
relationships and a home to return to. War must be enjoyable to direct, and its
economic and personal costs must affect the next decision.

## What StarCraft actually teaches

This research uses Blizzard's original StarCraft/Brood War guides and StarCraft
II guides and designer accounts. They describe different versions. Numerical
examples in those sources are historical; this is not an audit of current race
win rates. The causal synthesis below is our interpretation of those sources.

| Mechanism | Evidence and underlying design lesson |
| --- | --- |
| Shared investment budget | Workers, production buildings, units and upgrades compete for resources. An economy needs both income and spending capacity. Money held back is an option, but does not itself act on the battlefield. [SC2 economy guide](https://news.blizzard.com/en-us/article/4488313/game-guide-economy) |
| Diminishing returns | Crowded resource patches stop rewarding additional workers at the same rate. Travel also limits extraction. Extra labor needs another productive place, not just another assignment. [Original StarCraft resources](https://classic.battle.net/scc/gs/res.shtml) |
| Resources create different commitments | Minerals fund broad development; gas constrains many advanced choices. Finite deposits encourage expansion, while richer exposed sites exchange security for faster income. [SC2 resources guide](https://news.blizzard.com/en-us/article/4488900/game-guide-resources) |
| Buildings buy conversion capacity | Income, supply and production capacity are distinct constraints. Overcommitting resources to queues or failing to provide the needed capacity can delay a response despite an otherwise large economy. [SC2 common mistakes](https://news.blizzard.com/en-us/article/4552958/game-guide-common-mistakes), [supply guide](https://news.blizzard.com/en-us/article/4488314/game-guide-supply) |
| Geography prices expansion | A nearby expansion receives help sooner; a distant one may be concealed but difficult to reinforce. The value of an economic asset includes the time needed to protect it. [SC2 expansion guide](https://news.blizzard.com/en-us/article/4488311/game-guide-base-expansions) |
| Information changes investment | Scouting reveals commitments before their output arrives. Travel gives a defender time to prepare, so an apparent advantage can expire en route. The useful question is what can arrive in time, not merely who currently has more. [Original StarCraft reconnaissance](https://classic.battle.net/scc/gs/recon.shtml) |
| Asymmetry lives in the process | Probes initiate construction and leave, SCVs remain occupied, and Drones become structures. Different labor commitments generate different decisions without requiring wholly unrelated economies. [Original StarCraft Probe guide](https://classic.battle.net/scc/protoss/units/probe.shtml) |
| Strong tools need readable responses | Blizzard's designers describe replacing overly general roles, making support units easier to read and contest, and seeing positioning and player responses reshape matchups. A useful roster offers distinct situations, not successive versions of the same best unit. [Designer retrospective on units](https://news.blizzard.com/en-gb/article/21509420/evolution-complete-reimagining-classic-starcraft-units-for-starcraft-ii) |
| Pacing and recovery are designed together | Blizzard explicitly connected resource changes to expansion pressure, then revisited reserves to improve recovery after losing access to further bases. Pressure that produces decisions can also become pressure that prevents recovery. [Major design changes](https://news.blizzard.com/en-us/article/20975163/starcraft-ii-multiplayer-major-design-changes) |

The resulting pattern is a cycle: **investment creates a temporary weakness;
surviving that weakness earns an advantage; using the advantage creates another
commitment that somebody can answer.** This is not a universal rock-paper-scissors
formula in which aggression always defeats growth. Timing, information, terrain,
execution and the particular commitment determine the result.

There are also two different meanings of balance. Competitive fairness concerns
matchups and skill levels. Strategic richness concerns whether situations keep
changing which choice is attractive. Chicken Civ should borrow the second now;
neither a design document nor symmetrical prices can prove it.

## Translation into Chicken Civ

The accepted goal is conquest. The detailed proposal now lives in
[Chicken Civ: detailed gameplay design](chicken-civ-design.md), with a separate
[narrative and campaign design](chicken-civ-narrative.md). Those documents own the
proposed rules and examples; this study retains the research and reasoning.

The core choice is how much productive capacity to mobilize, where to strike,
and whether to exploit a victory immediately or consolidate it. Existing adults
train and equip for military duties. Their absence reduces actual gathering,
carrying, building or care. An army consumes physical supplies, gains a position,
and needs a garrison and deliveries to turn that position into a sustained holding.

| StarCraft pattern | Chicken Civ translation |
| --- | --- |
| Economic growth versus current military force | Develop local output and infrastructure, or mobilize more existing adults now |
| Production capacity | Supplied assembly and training places turn materials and adult time into field capability |
| Valuable expansions | Occupied groves improve access to food, stone and useful forward positions |
| Timing attacks | Strike before an opponent's new position is supplied, its training completes or its reserve returns |
| Scouting and counterplay | Discover commitments, alternate approaches and vulnerable supply; respond with positioning or a different target |
| Limited ability to defend many places | Garrison duties and reinforcement distance make territorial gains costly to hold |
| Recovery after setbacks | Retreating survivors, reserve adults, rear supplies and counterattacks remain actual options |

Chicken Civ's resources are partly renewable, so expansion pressure need not come
from copying exhausted mineral fields. Limited sustainable throughput, useful
locations and contested objectives can drive expansion. The proposed stone and
ammunition chain adds a specific finite resource, rather than making the whole
living landscape run out to force movement.

Conquest creates a positive loop: more territory offers more production and
better military positions. Physical supply, occupation labor and exposed approaches
check that loop. These costs must be real enough to create counterattack
opportunities without making every successful expansion feel like a punishment.
The leader's strength remains earned; the rival is not secretly granted resources.

## Keep people and trees consequential

The same individual can carry, build, care and fight at different times. Population
cannot function as an instant military purchase: the current supported growth
already requires at least 12 minutes 30 seconds at 1× from laying, before delays.
Use starting adults and reserves for the first campaign; leave generational
replenishment to the longer timescale it actually supports.

Military control and allegiance are distinct. Capturing a post can seize usable
stock and secure access, but it cannot turn a hen into inventory, rewrite a
resident's family, or make a named tree loyal. A wounded veteran, a rescued carrier
and an occupied household should each retain a history that affects subsequent
choices. This makes conquest more personal without making every order a dialogue.

The narrative proposal supplies motives for expansion, rival interests and named
participants. Warfare is allowed to be the player's ambition. Consequences give
that ambition substance; they do not turn every victory into an automatic moral
failure or every peace offer into the correct answer.

## The first strategic proof changes with the goal

The former predator-and-escort experiment would not establish this game. The
proposed first warfare scenario is two rival coops, three strategic groves,
local production, adult mobilization, three small combat roles, physical field
supply and a central capture objective that must be held. It can use explicit
scenario populations while preserving the current four-adult fixture and saves.

Compare early attack, economic development followed by attack, and defensive
preparation followed by counterattack. Vary route lengths, deposits and approaches.
Look for different circumstances favoring different commitments, meaningful
scouting, visible supply failures, reversals after capture and a clear reason
for victory or defeat. The particular role statistics, recipes and holding timer
in the detailed design are test hypotheses, not proven balance.

## Design sequence and status

The user requested **detailed gameplay and narrative first, creative design next**.
The written packet therefore precedes new artwork or implementation. The
[creative handoff](../../art-direction/chicken-civ-creative-handoff.md) identifies
what the next phase must make legible: roles, individual identity, resource flows,
contested groves, tactical alternatives and the history left by a campaign.
Existing art references and actual-camera acceptance standards remain useful;
they do not prevent this authorized design work.

No combat, conquest, general army supply or rival AI is implemented by these
papers. The current local-resource and population mechanics provide reusable
foundations. The next design evaluation concerns the proposed rules and narrative;
future implementation and playtests must separately establish correctness,
readability, fun and balance.
