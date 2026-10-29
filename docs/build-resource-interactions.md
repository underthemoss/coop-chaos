# Building and resource interactions, v3 · Command the Coop

The reference is the causal clarity of StarCraft's economy, translated to this
game's physical reeds and named chickens. These are historical official guides,
not current balance specifications. No assets or numeric balance were copied.

## Reference observations

- [SC2 Resources](https://news.blizzard.com/en-us/article/4488900/game-guide-resources):
  workers repeat harvest and return trips; distance and crowding affect throughput,
  and finite deposits eventually require another location.
- [SC2 Special Control](https://news.blizzard.com/en-us/article/4552955/game-guide-special-control):
  selection, contextual commands, hotkeys and event/idle-worker focus reduce the
  effort of turning a visible situation into an intention.
- [SC2 Common Mistakes](https://news.blizzard.com/en-us/article/4552958/game-guide-common-mistakes):
  excessive queued investment restricts other choices; cancellation releases a
  commitment. This is distinct from the eventual usefulness of that investment.
- [SC2 Supply](https://news.blizzard.com/en-us/article/4488314/game-guide-supply):
  population capacity is a separate gate from spendable resources.
- [Original StarCraft Probe](https://classic.battle.net/scc/protoss/units/probe.shtml):
  construction commits labor differently by race: a Probe can leave after starting
  a warp, an SCV stays, and a Drone becomes its building. This historical contrast
  should not be silently generalized to SC2 or to chickens.
- [SC2 Buildings](https://news.blizzard.com/en-us/article/4488317/game-guide-buildings):
  worker selection, building choice and location form a deliberate sequence;
  construction placement also affects movement and access.
- [SC2 Base Expansions](https://news.blizzard.com/en-us/article/4488311/game-guide-base-expansions):
  an additional resource location changes travel, investment and maintenance
  demands. Its military advice is outside this settlement pass.

## Translation implemented

| Decision | Chicken Civ implementation |
| --- | --- |
| Income and travel | Inspect a named renewable patch; actual trips and local storage determine throughput. |
| Labor commitment | Named direct orders persist; exact-patch harvest and named building repeat until completion or redirection. |
| Investment | Commission a plan, then deliver physical material; cancellation salvages actual quantities. |
| Capacity | Show residents plus expected young committed against reachable future adult places, separately from reeds and storage. |
| Placement | Choose a recipe and legal authored anchor; preview before commissioning. |
| Feedback | Exact-node work, project stages and shared material budget reveal what happens next. |

Selection identifies actual actors without camera movement. Left-click selects,
Shift toggles membership, and dragging across onscreen chicken bodies selects a
group independently of which name label is visible. Right-click
legal ground moves; right-click reeds repeatedly harvests that exact patch;
right-click an unfinished project sustains its construction. Move (M), Gather (G) and
Help build targeting provide the same accessible left-click/touch path. Stop (S)
retains cargo at the next safe cell; Return to community work explicitly releases
control. New work routes retained physical cargo before taking further inputs.
A rejected order preserves accepted work and targeting mode. Canvas clicks that
miss terrain or fall outside the world show a rejection without inventing a
destination. Groups accept eligible named actors and list individual rejections;
legal arrival cells are deterministic and distinct.

Direct mode persists after completion as awaiting orders. Shift or Queue next
appends up to sixteen orders; a successor to gathering waits for depletion, and a
successor to construction waits for completion. Named personal Details shows the queue and
waiting cause, all selected actors have rings, and saved destinations/routes give
restrained world feedback. Camera Follow is explicit and independent of selection.
Meals/rest suspend then resume intent. Young and essential carers reject commands;
urgent community supplies do not redirect direct orders. A stopped lift lowers
safely; night perching/ascent says Sleeping until morning and resumes after
normal morning descent. Full storage or unavailable materials waits without
inventing goods or silently reassigning unrelated work. Bring food is explicitly
one physical trip, followed by direct idle. Legacy recovery requests only use
community workers. Simulation owns these rules; App owns transient group/target
intent, and renderer observes saved orders. Additive codec10 retains direct intent,
queue and held-food origin while retaining immutable world1/world2 geography.

The five-recipe catalog leads to legal authored anchors, then one explicit
commission, sustaining that named adult when opened through New building (B) in the command dock; the explicitly named Community building catalog commissions community work. A group must select one builder explicitly for a new plan; Help build targets an existing plan. An invalid individual action never falls back to community work. Its translucent asset preview is temporary presentation, with no
saved building or resources. Cancel, Escape, Menu, close and mode changes exit
placement. Commission opens the exact saved project. Construction still requires
real delivery followed by weaving; its visual stages follow saved progress.

`Reeds ready` means unreserved physical stock. A shared material budget subtracts
all free, reserved and carried bundles once from unfinished costs less delivered
material. Paused plans retain demand. Standing patches are potential harvest,
not stock. Plans may exceed supply; this is a material estimate, not a guarantee
of labor, route, capacity or completion time. A completed store's stock is local;
its refill target is a minimum sought from loose reeds, not its capacity.

For example, two unfinished plans cost 10 reeds and already hold 2 delivered.
There are 3 free, 1 reserved in stock and 2 carried: 8 still to deliver minus 6
physical gives 2 more to harvest. The reserved bundle is not counted again as
incoming cargo, and carried bundles are not subtracted twice. Another 24 standing
reeds are possible future harvest, so they do not erase this deficit. Delivery
reduces both outstanding demand and physical supply by the same quantity.

Cancellation uses actual saved cargo/delivered-material salvage, without an
imported refund percentage. Chickens remain people: care and personal needs can
delay a request. Sheltered future places remain separate from building reeds.

## Deliberately deferred

Manual deposit destinations, finite-patch conversion, new labor policies and
combat remain deferred. Reeds regrow at their existing rate. Recipe costs, work
timing, capacity rules and map identities remain unchanged.

## Command the Coop interaction contract

One compact command dock follows the actual selection; selection does not open
personal Details or move the camera. Each selected chicken has a named activity
and direct/community status. Details keeps personal needs, memories, queue and
the unique Bring food one-trip action. The Supplies helper selector stays in
Supplies; its explicit Details button opens the named chicken.

Target mode consumes world clicks before selection. Gather and Help build show
all matching targets, including multiple unfinished projects at the same tree.
The existing direct-order validator supplies each actor's eligibility and reason:
all, partial group, or unavailable. Restrained rings and an accessible target list
show the same scope sent by the command. Escape cancels targeting before it can
clear selection. A rejected target retains the previous order.

Future adult places is committed residents plus expected young / reachable adult
capacity, with the shortage or space for growth stated directly. It is not current
sleeping occupancy. Natural and sheltered places remain in the existing model;
free/reserved/carried/delivered materials and legal material-short plans retain
their existing meaning.

Awaiting orders (I, or the visible button) cycles daytime adults already in direct
control with no current, pending or queued order, essential care, rest, meal,
travel, work task or held cargo. It queries structured saved state; it does not
parse status prose. An empty result is stated. M/G/B/S/I work while game selection
or command buttons retain focus, but ignore text entry, selects, form/dialog
controls, modal help/menu contexts, modifiers and focus outside the game.

Shift+1–9 assigns the current selection to a session group; 1–9 recalls it. Small
clickable groups support Shift-click/click and name every member in their tooltip.
Groups last only this play session and are not saved; direct orders persist as
before. Ctrl/Cmd+numbers retain their browser meaning. Controls help is optional,
dismissible and reopenable from the header. Its shortcut is I rather than F1 to
avoid browser help. No mandatory opening sequence or new simulation rule is added.
