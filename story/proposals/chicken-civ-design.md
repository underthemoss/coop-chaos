# Chicken Civ: detailed gameplay design

24 October 2026 · Design draft 1

**Accepted direction:** warfare and territorial conquest are the main goal;
write the gameplay and narrative design in detail before creative design.
**Proposed below:** rules, resources, roles, numbers, scenario structure and
progression. None of these new systems is implemented or proven balanced.
The current implementation remains described by [settlement design](../settlement-design.md).
[StarCraft research](chicken-civ-starcraft-gameplay.md) explains the design logic;
[the narrative design](chicken-civ-narrative.md) gives the conflict people and meaning.

## 1. The game the player is trying to win

Chicken Civ is a single-player real-time conquest game with pause. The player
develops a chicken community, mobilizes named adults, and defeats rival coops by
taking and sustaining control of strategically valuable groves. Buildings and
families create the economic strength and continuity needed to campaign. Combat,
territorial expansion and consolidation organize play.

The core loop is **produce → prepare → discover → attack → occupy → supply →
convert the new territory into strength for the next campaign**. A productive
home supports an army; that army gains ground; maintaining the gain competes
with preparing another attack. The recurring decision is how much productive
capacity to commit now, and whether the resulting opening is worth the risk.

The player is provisionally the continuing strategic authority of the coop,
expressed through its council, rather than a controllable immortal monarch.
Individuals retain preferences, agreements, attachments and limits. The player
can issue a clear military plan without manually negotiating every move. Known
unwillingness appears before mobilization; new refusals need a concrete changed
condition and a visible explanation. The institution's name remains creative work.

The target experience is a readable campaign: develop, scout, make a consequential
commitment, fight for a place, recover and exploit a gain. There should be short
contests, raids and reversals before a decisive victory. A roughly thirty-minute
first scenario is a playtest target, not an enforced timer or measured duration.

## 2. What already exists and what this adds

| Existing bounded game | Proposed conquest design |
| --- | --- |
| Four provisional adults, three named trees, free ground travel | Separate warfare scenario with two coops and enough adults to divide work and fighting |
| Renewable staple/protein food and construction reeds | General local food storage, field provisioning, stone, equipment and ammunition |
| Local materials, reservations, physical carrying and construction | Armories, repair, training, field stores and military construction |
| Natural roosts, homes, decks, ladders and hauling baskets | Fortified approaches and structures with contestable control |
| Fertility, nursery supplies, carers, children and maturation | Mobilization, squads, wounds, loss and campaign replenishment |
| Needs, limited preferences, contributor and care memories | Scouting knowledge, combat, territorial control and specific social responses |

New scenarios use explicit starting populations and stocks. They do not reinterpret
an existing save, manufacture adult children, or convert the present four-bird
fixture into an army. Current fixed camera and prototype assets are evidence of
the small grove only; the first combat test should fit that view. Larger-map
navigation is a later interaction-design question, not a hidden dependency here.

## 3. Resources, scarcity and conservation

Use four primary physical resources. Only the first three exist today.

| Resource | Source and renewal | Uses | Strategic pressure |
| --- | --- | --- | --- |
| Staple food | Existing forage; later tended seed plots with bounded recovery | Adult meals, care and field supply | Supports the size and duration of productive and military commitments |
| Protein food | Existing habitats; later maintained insect beds | Distinct dietary need, care and field supply | Valuable habitats make particular territory worth fighting over |
| Reeds | Renewable patches; future tended reed grounds | Homes, containers, woven equipment, barriers and repairs | Immediate army preparation competes with economic infrastructure |
| Stone | New finite surface deposits; later another accessible deposit | Tool reinforcement, equipment and ammunition | Rewards scouting and control of particular ground; advanced combat cannot be expanded indefinitely from one cache |

Do not harvest named living trees as timber. Do not spend eggs as currency, food,
ammunition or research. Future structural materials need a separate reason to
exist; the first warfare design does not need wood, iron, coins and influence
currencies added alongside these four.

Food types are not interchangeable. Hunger and poor diet affect actual ability
to work and recover; they are not a cost paid once to create a soldier. Troops
need continuing meals. A lack of protein should reduce sustained condition over
time rather than instantly switch off an otherwise fed army.

All stock occupies a patch, store, site allocation, equipment item or carried
load. A settlement total is informational. Buildings use delivered material;
field forces use what they carry or can physically receive. Commands reserve
goods against one purpose. Canceling unstarted work releases its reservation;
canceling delivered work exposes recoverable material under explicit salvage
rules. Interruption never silently duplicates, relocates or erases a load.

Renewal is bounded by patch capacity and time. More workers cannot increase a
habitat's recovery rate. Active working spots cap simultaneous extraction;
overflow workers choose another eligible job rather than form an endless queue.
Cultivation later increases dependable output through tending and suitable ground,
not through a universal upgrade multiplier. Renewal continues under the same
simulation clock as all other systems; pause and reload create nothing.

The prototype must retain an exact balance for each primary resource across the
whole scenario: initial physical stock + recorded ecological regeneration =
stock still at sources + carried stock + stored stock + unconsumed stock delivered
to work sites + consumed stock + explicitly recorded loss. These locations are
mutually exclusive. Harvesting and seizing stock are transfers, not new inflow;
reservations annotate an existing quantity and never add another copy. Later
imports or salvage would need explicit conversion entries. Stone fired as ammunition becomes
spent material recorded as consumption; recovering projectiles is outside the
first design. Destroyed containers expose surviving stock; damage that destroys
goods records the amount and cause. Equipment has an ingredient history but is
not also counted as unconsumed raw material.

## 4. Production and local logistics

Three chains connect economy directly to war:

1. **Gather → store → prepare equipment → train and equip an adult → field duty.**
   More equipment production cannot conjure adults or skip training.
2. **Gather food → carry to home or field store → eat → maintain condition.**
   A forward store extends the useful campaigning distance but creates a raid target.
3. **Gather building material → deliver → construct an outpost → staff and supply it.**
   An outpost changes actual control only when the military and supply conditions hold.

Individuals reserve and perform jobs. The player sets local stock targets,
construction priorities, military preparation and named or group assignments.
Needs and urgent care retain precedence in ordinary work. Mobilization has an
explicit handoff: secure the carried load, release or transfer work, reach the
assembly place, train or equip as required, then join the squad. Show the time
and work affected before commitment. Repeated commands cannot restart the handoff
to manufacture progress or reserve the same goods twice.

A carrier needs a destination with room and a route that can be attempted. Enemy
control does not magically forbid movement; it introduces interception risk.
Under normal policy, civilian carriers avoid observed hostile contact. The player
can order an escorted delivery or withdraw the job. Known danger is displayed
with observation time; a remembered empty route is not guaranteed safe.

Squads carry a finite food reserve assigned to named carriers. They consume it
through real meals, not a distance-independent supply tax. Each squad has a chosen
resupply destination and an optional assigned delivery group. When reserves fall,
the player can shorten the campaign, send supply, seize accessible stock or
establish a closer store. No teleporting supply network is granted by map color.
Basic resource availability and maintenance burden must be visible without opening
every individual card.

A Slinger can carry at most six ready stones. Refill requires physical contact
with a friendly field store or a delivering carrier, available unreserved stone,
and a proposed two-second stationary transfer during which the recipient cannot
attack. Transfer at completion moves the smaller of available stock and empty
pouch capacity; interruption releases the reservation without moving stock.
An empty pouch cannot fire. Carriers use their separately declared load capacity
and do not grant a second ammunition pouch to every squad member. Equipment
changes still require the muster court; an ammunition refill is not retraining.

Carrier capacity, trip distance, gathering rate, work spots, storage and processing
capacity are separate limits. The useful throughput is the slowest sustained part
of the chain after current buffers are consumed. A second store should earn its
place by shortening or protecting trips. It does not double the patch's yield.

## 5. Buildings and what they buy

All military buildings are proposed. They follow trees, ground workcourts and
chicken-made access rather than human medieval city blocks.

| Building or improvement | Useful output | Cost beyond its recipe | Failure or counterplay |
| --- | --- | --- | --- |
| Existing home and deck | Reachable sheltered rest and household space | Construction and local access | A crowded or blocked approach still constrains it |
| Existing reed store; proposed typed food/stone stores | Local buffers, shorter journeys | Initial stocking and carriers | Local stock can be blocked or captured |
| Weaving and assembly ground | Equipment and components | Adult production time and delivered inputs | Raids or mobilization can stop production |
| Muster court | One adult trains or changes equipment at a time initially | Training time and an existing kit | Extra courts need adults, materials and food to be useful |
| Watch perch | Local observation and alarm | A present watcher with sight and rest | Can be bypassed, obstructed or abandoned |
| Thornwork or woven screen | Specific ground delay or projectile obstruction | Work, material, restricted access and repairs | Flanking, concentrated attack or later engineering |
| Field store | Forward food and ammunition | Actual deliveries and space | Capturing the rear can isolate the fighting force |
| Occupation post at an eligible grove | A place to establish and maintain control | Uncontested presence, assigned garrison and continuing provision | Counterattack, garrison withdrawal or sustained supply failure |
| Recovery shelter | A safe place for wounded adults to receive care | Caregiver time and food | Does not instantly restore an army |
| Later siege workshop | Equipment that defeats entrenched structures | Rare material, assembly, operators and slow movement | Vulnerable supply and protection requirements |

Enemy military works can be damaged, disabled, repaired or dismantled under new
explicit rules. Existing buildings are not currently destructible. Living trees
are not interchangeable fortress health bars: military control concerns the
approaches and installed works. Harm to a tree, if later designed, requires its
own narrative and mechanical treatment; burning every grove is not the default
route to victory.

## 6. Population, mobilization and replacing losses

The first warfare scenario starts with a provisional **twelve named adults per
coop**, including an existing small trained contingent. This is a test fixture,
not accepted population canon or a silent change to the current opening.
Initially plan around four field combatants and eight adults who can gather,
carry, prepare equipment or replace duty holders. The player may mobilize more,
but sees which jobs and deliveries lose people.

Military roles are learned assignments with equipment. Sex, lineage and tree
family do not determine profession. Skill and willingness are individual facts.
A civilian can join after preparation; a veteran can demobilize and return to
work. An untrained civilian can flee or defend itself but does not instantly gain
a specialist's kit and technique because the player pressed Attack.

Training occupies an adult and a muster place for a proposed 45 seconds at 1×
in the first tuning pass. The appropriate kit must already be delivered. Changing
roles returns reusable equipment and takes proposed 15 seconds plus travel at a
muster court. Re-equipping in combat is forbidden. Interrupted preparation retains
honest progress or releases its assignment; cancellation cannot duplicate kits.
Training times are fictional tuning, not claims about natural learning.

Broods remain long investments. The current ideal supported growth takes at least
12 minutes 30 seconds from laying at 1×, plus delays. The first war must therefore
be winnable with starting adults; a nursery is not a unit-production building.
Children stay civilians, and housing/care limits govern proposed support rather
than deleting an existing birth. Longer scenarios can make maturation strategically
important without requiring players to breed replacement soldiers every battle.

Reinforcement first means recalling reserves, recovering wounded adults,
re-equipping survivors and moving troops from another held grove. Future voluntary
recruitment from an existing neutral community can be designed with named origin
and consent; it is not an unlimited spawn button. The first scenario does not
depend on it.

## 7. Exploration, observation and useful uncertainty

Unexplored land hides deposits, detailed terrain, occupants and alternative
approaches. Exploration permanently records stable geography. Currently unseen
activity remains unknown: last-seen positions carry a timestamp and never move
as if the player had live information. Known terrain and current visibility are
separate. Large tree silhouettes can orient the player without exposing hidden
stock or troops.

Each adult observes within a bounded local range and line of sight. A staffed
perch offers a higher vantage only where geometry permits. Canopies and ridges
can conceal an approach; tree height is not universal vision. A scout trades
productive or fighting time for information and can be intercepted. Reports are
available to the player on observation in the first design; a separate messenger
network is deferred to avoid introducing an unproved communication economy.

Exploration should reveal decisions: a nearer stone deposit behind a difficult
approach, an unguarded resource party, an alternative way into a fortified grove,
or a neutral tree whose usable spaces support a forward store. No generic
exploration points or loot chests are required. A discovered technique later
needs a person or artifact with provenance and a practical demonstration.

Scouts can be given a destination, observe area, return, or avoid contact order.
The default scout reports and withdraws from a stronger group instead of chasing
it into unknown terrain. The player can override that plan knowingly. Exploration
and movement remain free; no road construction or artificial province adjacency
rule is required to reach a legal place.

## 8. Terrain and tactical movement

The battlefield has productive clearings, tree clusters, narrow approaches,
water edges and alternate ground passages. The first map uses readable fixed
framing. Terrain creates exposure, sight, route length and usable frontage;
it does not attach a universal defense bonus to all green scenery.

Ground movement is bounded and collision-aware at the simulation's chosen scale.
Buildings and defended approaches can block specific spaces. Units must not
overlap into an infinitely dense fighting stack. A narrow entrance limits how
many can attack at once and can also trap a retreat. A larger force should be
able to seek another route rather than wait forever behind its first member.

Flight remains body- and load-dependent. Short flights to reachable branches
or across a gap can enable position changes for capable adults, but do not imply
permanent aerial armies, instant map travel or carrying any load. Grounded and
low-flight birds need honest alternative routes. Combat in a canopy requires
actual approach, occupancy and escape capacity; it cannot be a floor of invulnerable
archers. Full multi-level fighting is later scope; the first battle is on ground
and readable approaches.

## 9. Combat roster and conditional advantages

Start with three proposed roles. Their names and visual equipment are placeholders
for creative design. Each role is available to suitable willing adults without
sex or family locks.

| Role | Intended use | Gives up | Practical answer |
| --- | --- | --- | --- |
| Guard | Hold a frontage, protect a carrier or occupy a post | Speed and pursuit | Bypass the held frontage, flank it or deny supply |
| Raider | Scout aggressively, strike carriers and encircle isolated troops | Durability and sustained frontal strength | Keep a reserve, escort supplies and force a frontal engagement |
| Slinger | Support a line and threaten exposed troops from short range | Ammunition, mobility while firing and close defense | Close distance, obstruct sight, flank or make it waste ammunition |

These are conditional advantages, not an automatic three-way damage bonus.
Terrain, numbers, fatigue, equipment and formation can outweigh nominal role.
No role should be best at holding, raiding, ranged damage and economical upkeep.
Engineering and siege roles arrive only after entrenched defense is a proven
problem; they are not required to make the first battle work.

The first numerical hypothesis is intentionally small and inspectable:

| Parameter | Guard | Raider | Slinger |
| --- | --- | --- | --- |
| Health | 100 | 75 | 65 |
| Damage per completed attack | 10 | 8 | 12 |
| Attack interval at full condition | 2.4 s | 1.6 s | 3.5 s |
| Relative ground speed | 1.0 | 1.3 | 0.9 |
| Reach | Adjacent contact | Adjacent contact | Up to four reference ground cells; cannot shoot at adjacent contact |
| Distinct constraint | 25% damage reduction within a front-facing arc while holding | Speed advantage costs fatigue during sustained pursuit | Six carried stones; one consumed on each released shot; must stand to aim |
| Initial kit recipe | 2 reeds + 1 stone | 1 reed + 1 stone | 2 reeds + 2 stones, ammunition separate |

These values are proposed test inputs, not accepted rules or calibrated balance.
Reference cells are simulation distances, not arbitrary screen pixels. Armor
reduction applies only to eligible attacks from the guarded frontage, never to
all damage because a Guard happens to be nearby. Individual traits should initially
affect a narrow preference or learned proficiency rather than bury these roles
under many modifiers. Optional personality variability must not make a matchup
impossible to understand.

## 10. Commands, attack resolution and retreat

The player can select individuals or a squad and order move, attack target,
advance while engaging, hold, escort, raid a specified supply site, retreat to
a chosen rally, and occupy an eligible post. Orders show objective, members,
readiness, carried supply and known opposition. The first UI should make one
small squad manageable without requiring individual attack-clicking.

Each attack follows approach → face/aim → visible commitment → resolve → recover.
Range, line of sight, target state and available ammunition are simulation facts.
Melee fails if the target leaves legal reach before contact. A ranged shot consumes
ammunition at release; the prototype resolves a hit only if its target remains
in the declared range and clear line of sight at impact. A failed shot remains
spent. This simplified rule needs readable animation and testing; no decorative
projectile may decide damage independently of simulation.

Resolve simultaneous attacks from the same tick against a shared pre-resolution
state, with deterministic ordering for secondary effects. No random accuracy or
critical hits are needed in the first prototype. A later random system requires
an explicit seed and clear player-facing meaning.

Hold keeps a frontage and limits pursuit. Advance engages encountered threats
without forgetting its destination indefinitely. Raid attacks the assigned goods
or military objective and withdraws under its retreat policy; it does not seek
every civilian across the map. Escorts remain near their charges. Retreat
prioritizes movement to the rally and breaks voluntary attacks; surrounded units
can still be intercepted. No command grants invulnerability.

For the adult-only first scenario, nonmobilized workers and supply carriers use
a provisional civilian profile: 65 health, no armor, relative speed 1.0 unladen
or 0.75 carrying a full goods load, and a 3-damage contact strike every three
seconds only when a retreat is blocked. They flee toward their assigned safe
place on observing a hostile within that hostile's known attack reach, or on
taking damage; they do not pursue or acquire a military role automatically.
The normal advance order prioritizes active enemy combatants. A raid may target
observed adult carriers and military supplies; a direct attack order may target
an observed enemy adult. Escorts protect fleeing carriers through ordinary
position and attacks, not damage interception or invulnerability. Civilian wounds
and rescue follow the same rules below. Mobilized soldiers carrying supplies
retain their equipped role and its constraints. Children are absent from this
first contest; later scenarios containing them require explicit protection,
evacuation and harm rules before implementation.

Health, fatigue and condition are enough for the first combat model. Use visible
individual retreat thresholds instead of an additional abstract army-morale
currency. The default adult tries to withdraw below a proposed 25% health or when
unable to continue; willing committed defenders can have a known different limit.
Personal limits are explained before an order, and a critical injury always
removes fighting ability. A player can choose a costly stand without silently
turning everyone into an obedient disposable unit.

At zero health, the first proposed model incapacitates the individual on the
ground. One adult can evacuate a casualty at reduced movement and cannot fight
while carrying them. A proposed 60-second stabilization window at 1× makes failed
rescue lethal; pause pauses it. Supplying care at a recovery shelter stops that
timer and begins slower recovery. Opponents prioritize active threats and do not
automatically execute incapacitated birds. These are fictional rules requiring
playtest: repeated helpless casualties could create tedious rescue work, while
too-easy recovery could erase the cost of war. Death is permanent within the
scenario state and leaves named history; reload preserves outcomes rather than
rerolling them.

On incapacitation, carried goods and loose ammunition drop at the casualty's
actual location, releasing their job reservations. They become one recoverable
pile with a single pickup reservation; nothing is also retained in the casualty's
inventory. The worn kit remains attached to the person during evacuation and
cannot be used by the rescuer. At a recovery shelter it may be removed to local
storage so another trained adult can later equip it at a muster court. Death
leaves that same kit recoverable at the body, or attached to a body currently
being carried; it never creates a second kit or teleports one home. Accessible
dropped goods and unclaimed kits may be seized by either side. Pickup requires
space and actual transport; no automatic sale, repair or raw-material salvage
exists in the first contest. The first prototype has no equipment durability
system, so destruction of a kit must be an explicit later rule, not an incidental
effect of removing its former owner from active play.

## 11. Territory, capture and occupation

Territory has three distinct meanings:

- **Observed military presence:** who can currently interfere with a place.
- **Control of a strategic grove:** who maintains its occupation post under the
  capture and supply rules.
- **Allegiance of people and trees:** what those individuals recognize, accept
  or resist. Military capture does not overwrite this.

Strategic groves are authored places with resource and access value. Control
does not create a magical border that blocks enemy movement or grants every
nearby uncollected resource. Workers still have to reach, gather and carry goods.
The territory overlay summarizes control and contested approaches; it does not
replace visible troops and infrastructure.

The proposed capture sequence is:

1. Reach the grove and defeat, displace or compel withdrawal of active defenders
   at its occupation position. Simply scouting it is insufficient.
2. Keep at least one eligible combatant within a provisional two-ground-cell
   radius of the post for 30 seconds of uncontested occupation work. An active
   hostile combatant in that same visible capture zone pauses progress; leaving
   it without an eligible occupier removes incomplete progress. Casualties and
   noncombatant residents cannot capture or contest it.
3. Establish or repair its post with delivered materials. A neutral grove requires
   construction; an intact enemy post can be reused after control changes.
4. Assign at least one active combatant to remain in that zone as the garrison,
   and deliver enough of both food types for its next scheduled meal to the post's
   local store. This makes it an operational holding; the interface shows that
   threshold and the projected next shortage. Military control can change before
   the site is economically productive.
5. Continue staffing and provisioning it. Withdrawing the entire garrison makes
   it unsecured and stops victory credit immediately. Food below that next-meal threshold
   make it isolated: no victory credit or free fighting bonus; the player has a
   visible opportunity to deliver food or withdraw before further condition loss.

Enemy victory progress and production rights at the post stop on successful
capture; the attacker gains neither a second copy of stock nor a recruited enemy
population. Physical stores can be seized if secured. Opponents can withdraw
carried goods. Residents remain named people with prior affiliations. The first
prototype's central grove has no civilian household, avoiding a fake occupation
society before allegiance rules exist. Full inhabited conquest later needs explicit
evacuation, continued residence, service, resistance and negotiated submission.

## 12. Winning, losing and preventing a runaway lead

The first scenario has each coop's home grove and one contested central grove.
Win by maintaining an operational holding at the central grove for a proposed
two complete four-minute cycles. The visible progress advances only while
garrisoned, supplied and uncontested; enemy contest pauses it, and a change of
controller resets it. These are transparent scenario rules, not a universal
number for all maps. A home post can also be contested, creating a reason to
keep a reserve. If a side loses its last controlled post, it has one four-minute
cycle to re-establish an operational holding; failure ends the scenario in defeat.
The recovery countdown is visible and only clears when a holding is operational,
so briefly touching a flag cannot refresh it. Survivors can remain in the ending:
defeat does not require killing every chicken. These are proposed scenario rules
requiring playtest, particularly the interaction between recovery and central
victory timers.

A side also loses immediately if every adult is dead or beyond possible rescue
and no one can resume action. If no active adult remains but a casualty has a
valid ongoing recovery process, that process can finish; otherwise the remaining
stabilization timers determine the loss. The player can concede at any time.
Check terminal conditions once after each complete simulation tick; simultaneous
terminal successes or failures are a draw rather than an actor-order advantage.
Unstaffed flags alone cannot keep an eliminated side in the contest indefinitely.

Larger scenarios can require a stated set of strategic groves held simultaneously
or a rival's capitulation after its operational holdings are defeated. Exact
objectives are declared before play. Victory never requires hunting every child,
egg or fleeing civilian. Peace and alliance can serve a conquest strategy, but
the first win condition is achieved through territorial competition. A peaceful
sandbox may later be a mode; it is not the main design target.

Holding more territory should be rewarding. Prevent an effortless snowball through
real commitments: construction and repair before production, longer reinforcement
trips, garrison labor, limited carriers and more approaches to defend. Do not
secretly reduce the winner's damage or conjure an enemy army. The loser can raid
rear supply, consolidate a shorter frontage or counterattack a lightly held post.
Those opportunities must be present in the map and actual economy.

Turtling in the home grove should preserve forces but surrender the central
objective. All-out aggression can secure it early but risks exhausted reserves
or a counterattack at home. Economic investment should pay back before the
contest is inevitably lost if protected competently. The correct balance is
several viable timings, not equal success regardless of decisions.

## 13. Rival decisions and difficulty

The rival gathers, carries, builds, trains, eats and occupies under the same core
rules. It cannot spend negative stock or know unseen troop positions. An explicit
starting advantage can be a declared scenario difficulty; hidden production
cheats are not needed for the first design.

Give the first rival a small set of legible plans: develop and contest; raid supply
and withdraw; defend then counterattack. It chooses among them from known local
facts and saved strategic commitments. Scout reports change its estimate.
Initially scripted priorities can test a rule; label that fixture accurately.
Only a rival that can alter commitments when conditions change can qualify the
full strategic loop. Exact AI implementation is later engineering work.

Difficulty changes planning quality, scouting, coordination and declared starting
conditions. It should not remove warning time by teleportation. Pause and speed
remain player controls in single player. A first combat alarm may optionally
pause once as an accessibility setting; it must not be a required source of
military advantage or repeatedly interrupt every small encounter.

## 14. Progression and invention

The [Long Crow progression specification](chicken-civ-progression.md) expands
this outline into proposed technology dependencies, trials, personal expertise,
offices and succession. It owns those detailed proposals; this section retains
the base conquest loop and its current implementation boundary.

The first progression has three functional stages, not an automatic age timer:

| Stage | Economic capability | Military possibility | New weakness |
| --- | --- | --- | --- |
| Assemble | Local stores, weaving, muster court | Small equipped squads, scouting, raids | Mobilization removes a large share of available labor |
| Sustain | Field stores, better hauling and repair | Longer expeditions, reinforced holdings | Supply routes and garrisons become commitments |
| Breach | A demonstrated engineering technique and specialist equipment | Attack entrenched works or create a new approach | Expensive operators and equipment need protection |

Technology comes from a supplied experiment and a useful demonstration, following
[technology design](../technology.md). Ordinary familiar construction should not
require repetitive ceremonies. A working invention teaches the community a
technique; the inventor retains credit, but their death does not erase all knowledge.
Future power and science-fiction lifts remain a later creative and mechanical
branch, not a prerequisite for conquest.

## 15. Interface information and feedback

Keep the world dominant. The primary views are a compact economy summary, selected
squad or place orders, and an inspectable map/control overlay. The economy summary
distinguishes free goods, committed goods and delivered field stock. A forecast
is labeled as an estimate and never counted as inventory.

Before an operation, show who goes, who remains, expected field supply, known
opposition and the intended rally. During it, show objective progress, casualties,
low reserve and a blocked delivery with an actionable cause. Afterward, show
territory gained or lost, material consumed, returning adults, injuries and the
few incidents that changed relationships. Avoid a wall of identical notifications.

Inspecting an individual explains their actual role, condition, current order,
home and relevant memory. Narrative must not imply a rescue, grievance or secret
intent that the simulation did not establish. Keyboard commands, narrow layouts,
reduced motion and pause must preserve the same information and authority.

## 16. Pacing, initial recipes and what must be tuned

Use the existing four-minute day/evening cycle as an initial shared clock, with
1×/4× and pause, while explicitly defining military night behavior. Ordinary
construction can retain daylight work; a committed squad may travel or fight at
night but still needs rest and has reduced observation. Night does not teleport
troops home or erase capture progress. Neither side gets a free night advantage.

Provisional additional construction recipes: muster court 4 reeds; field store
4 reeds; occupation post 6 reeds plus 2 stone; watch perch 3 reeds; recovery
shelter 4 reeds. These are starting hypotheses. Construction consumes delivered
inputs and adult work; no structure completes on payment alone. Existing recipes
are not silently altered by this table.

Keep current food demand and recovery as the baseline until a measured throughput
study for twelve adults is available. Author enough actual food places for that
roster plus reasonable military travel; do not assume the present four-adult
map scales. The design requires a positive peacetime surplus and a measurable
shortfall under excessive mobilization. Exact food demand, patch capacities,
training/build times, combat values, control timer and recovery duration must be
tuned together. Stating them as solved balance would be false precision.

## 17. Prototype and acceptance

The requested phase is detailed written design and narrative, followed by creative
design. No implementation begins merely because this document exists. The first
later playable warfare proof should contain two coops, three groves, a small
resource map, three combat roles, physical field supply, one capture objective,
withdrawal and casualty recovery. A neutral central grove avoids needing the
entire occupation-politics system in the first experiment. No predator, giant
technology tree, multiplayer or elaborate diplomacy is required.

Compare three plans under the same initial conditions: early mobilization,
economic development then attack, and defensive preparation then counterattack.
Repeat under changed travel distances, stone access and approach layouts. Record
first contact, first capture, economic interruptions, supply delivered, army
losses and recovery, control changes and completion time. Do not declare a plan
viable because one favorable run succeeded.

Required design outcomes are meaningful choice of timing and target; an economic
cost for mobilization; readable scouting and counters; capture that affects
actual opportunities; and a credible route to counterattack after a setback.
Players should identify a named chicken through what happened and explain why
they won or lost. Fun and emotional effect require playtests, not arithmetic alone.

Implementation qualification later must cover command → rule → save/readback →
render → refresh, including simultaneous attacks, spent ammunition, injuries,
capture interruptions, changed allegiance, stolen stock and casualties in transit.
Maintain pure deterministic simulation and strict versioned saves. Browser proof
must include the real 3D battle, console, narrow controls and reduced motion.

## 18. Deliberate boundaries and decisions for evaluation

The strategic goal and design-before-creative sequence are settled by the user.
The draft chooses a concrete first model so it can be criticized: territorial
holding victory, three roles, existing-adult mobilization, physical supply and
recoverable casualties with real risk of death. These are recommendations, not
silently accepted canon.

The highest-impact tests are whether twelve adults permit both economy and battle;
whether supply is interesting rather than constant maintenance; whether casualty
recovery creates attachment rather than chores; whether stone/ammunition produces
useful geography; and whether the control timer encourages campaigning rather
than one repetitive central brawl. Occupation of inhabited enemy groves, longer
generational campaigns and larger-map controls need subsequent detailed slices.
They are not required to prove this first coherent loop, and their absence must
remain visible in any implementation claim.
