# Settlement design

## Accepted direction and present status

Coop Chaos is a chicken settlement builder in which the individuals running the
economy gradually become its heroes, rivals, tyrants, and ancestors. Forest
clusters become their kingdoms: treehouses and canopy neighborhoods above a
supporting ground economy. Named trees are central characters whose personalities
and histories shape the meaning of home. Tree families are species-rooted cultural
kinship groups, not formal taxonomic ranks; they are separate from individual
ancestry and growth forms such as Longbough.
Chickens can affiliate naturally with a tree while crossing freely and changing
ties. [Tree kinships](tree-kinships.md) owns this accepted direction and labels its
detailed family names, character examples, consciousness expression and unlock
recipes as proposals. Productive open commons between the woods supply
materials, forage and insects; repeated shared use can later create pacts and
rivalry. Neither woodland safety nor territory follows automatically from scenery.
The player
guides the whole coop: construction, production, transport, staffing, and
expansion are the regular play. Characters become recognizable through what
they do together. Story grows from the settlement's functioning and failures. There is no authored
opening arc or mandatory order of play. The immediate MVP is an art-led living
sandbox: a high-quality inhabited grove, basic foraging and building, and
individuals worth observing. Its [art brief](../art-direction/opening-view-exploration.md)
owns the artifact inventory and actual-camera visual proof.

This direction is accepted. The current app implements bounded autonomous food
foraging alongside the [thin treehouse construction and roost proof](#treehouse-direction-and-current-thin-proof);
renewable food/material gathering, local nursery supplies and bounded population growth are implemented below; cultivated food production, threats and politics remain future. The old
four-bird dilemma in [story-system.md](story-system.md) is a historical technical
study, whose cast and event have no privileged place in the future game. This document owns the accepted progression and construction
direction. [The earlier gameplay analysis](proposals/gameplay-rules-analysis.md)
remains useful background, with its former next-slice plan superseded here.

The chickens deliberately cultivate, weave, store, and build with beaks and feet.
These are fictional capabilities, not biological claims. There are no humans or
farmers. [Biology research](../docs/research/chicken-biology.md) supplies constraints
on nutrition, reproduction, care, bodies, and danger. Exact recipes, counts,
starting roster, rates, calendar, predator species, and behavioral formulas remain
provisional.

## Implemented bounded food, care and population economy

This accepted MVP extends the existing construction owner; all numerical rates
remain provisional fictional playtest tuning. It does not establish thirty-minute
fun or full ecological balance. A fresh four-adult community can build a home,
commission its covered **root nursery** for four reeds, deliver local food, and
support a named willing hen. The nursery is beside the ground workcourt, clear
of the hauling approach. It has two dependent care places and storage of eight
staple and eight protein units, targeted to six each. It adds **no adult berths**.
A completed home is required. Current reachable adult capacity is two natural,
two home and two deck places per tree: at most eighteen across three trees, not
the future twenty-four-resident Lowfork layout study.

Seedhead Common provides staple food, Leaf-litter Hollow protein, and Insect
Verge alternates the two. Food recovery is one unit per 45 daytime ticks, bounded
by each patch's twelve-unit capacity. Browsing consumes nothing and does not
freeze recovery. Adult satiety and protein both matter: hungry or low-protein
birds seek the appropriate food before new ordinary work; low condition slows
work and prevents a new brood. Water and mineral access are dependable authored
facts of this small grove. This is not a complete nutrition model. Structural
wood, cultivation recipes and larger food chains remain future.

An adult physically scratches up one food unit, carries its typed cargo, and
delivers it to a specific nursery. Food never teleports from a global counter.
Balanced maintains a moderate buffer of three of each food before construction;
Provision fills the full saved target of six before construction. Build chooses
construction first. Essential meals, secured cargo and urgent active-brood supply
(the emergency floor of two of each) take precedence under every policy. These policies order eligible jobs; they grant no
stat bonus. An active carer is removed from ordinary construction and gathering.

Initial adult sex and expressed willingness are provisional named fixture facts,
not castes. A willing fed adult pair must spend 180 actual nearby ground ticks
together to establish saved fertility history, valid for 14,400 ticks. No past
mate or eggs are invented when migrating an old save. Support checks the named
hen's willingness/condition/history, completed nursery, at least two local units
of each food, two future adult berths, other adult delivery capacity and food
forecast. The hen lays two durable eggs over 300 supplied care ticks, consuming
one unit of each food per egg. Unincubated eggs expire after 2,400 ticks. First
fertile, well-cared eggs hatch deterministically after 7,200 supplied incubation
ticks; broader stochastic loss is deferred. One egg can create only one child.

Care requires the assigned adult to be physically at the nursery, with continuing
local staple and protein food. A care meal costs one of each per 180 care ticks,
including evening. Shortages pause care, incubation and dependent growth with an
explicit reason; they do not create free progress. Self-care breaks are real.
Chicks remain grounded, consume continuing care and become juveniles after 7,200
qualified post-hatch ticks. Juveniles remain grounded, feed themselves and become
adult workers at 14,400 qualified post-hatch ticks. They never use adult flight
early. Newborns inherit their mother's existing visual appearance with smaller
bodies and restrained comb/tail; their own names, parents, age, stage, birthplace,
carer bond and memories persist. Repeated care establishes an attachment to the
nursery tree which contributes to later adult home choice.

The automatic clock uses 1,800 daytime and 600 evening ticks (four minutes at
1×), with pause and 1×/4× controls. Every need, recovery and development uses the
same 0.1-second simulation ticks. There is no offline catch-up. The support-only
phase command changes neither age nor resources; normal UI has no phase button.
A supplied incubation is three cycles; juvenile and adult thresholds are three
and six cycles after hatching. Full adulthood is therefore roughly forty minutes
from a fresh opening, not a claimed thirty-minute complete growth loop.

Growth planning counts existing residents and pending eggs once. The displayed
food forecast counts each open habitat's recovery once, retains a 15% habitat
reserve, and caps supply by available non-carers and average route distance.
Its blended unit cost is a scratch bout plus eighteen ticks per average route
cell; this is a conservative planning estimate, never credited stock. Existing
and pending residents plus active care costs are subtracted before another plan.
Food can constrain new support before the eighteen-berth maximum. A second tree
adds actual home berths and a nursery nearer some food; it grants no territory
or free yield. Capacity gates govern starting a new community-supported plan,
never deletion or refusal of an already existing birth.

Conservation is exact: each patch's initial capacity plus regrowth equals its
remaining units plus eating and harvested cargo. Typed harvested food equals
local storage plus current cargo plus consumed care food. Initial loose reeds
plus harvested reeds equal physical stock, cargo, allocations and construction
consumption; patch capacity plus regrowth equals remaining plus harvested reeds.
Version-five saves preserve every durable egg/child reference and validate these
ledgers. Versions one through four migrate after validating their original shape
and preserve their actual goods, work, identities and memories.

## What the player does

For the sandbox MVP, direct actions are to inspect individuals, rest or reopen
existing food places, designate construction reeds, and commission a treehouse
at an eligible tree. Birds move freely over bounded ground and carry out eligible
work autonomously. These are independent possibilities, not quest steps.

Food and building materials have different causes and ledgers. Three mixed-food
places are open from the start. Appetite prompts feeding before a new work job;
a carrier secures its current bundle first. Idle fed birds still browse, without
endlessly eating. Distance, food remaining, up to two distinct feeding spots,
provisional individual cover/open preferences and remembered productive ground
influence choice. Scratching and pecking precede actual consumption and satiety
gain. A depleted place recovers on daytime simulation ticks, including while visited; Rest/Open changes availability,
not a refill button. Exact timing, yields and satiety are fictional tuning, not
claims about a complete diet or measured natural recovery. There is no random death, explicit water demand, predator or dominance model in this slice. The bounded nursery loop below adds egg laying and growth.

Construction reed designation creates work with reserved yield and local storage
room. Extraction atomically removes one available reed into carried cargo; stopping
collection preserves already carried bundles. Reeds recover one unit per 240 daytime ticks up to patch capacity and are never
food. Source stock, local stores, delivered allocations, cargo and consumed building
materials retain their own conservation ledger. Food capacity plus recovered food
separately equals remaining plus eaten and physically harvested food. Reloading or switching day/evening
creates neither resource. The construction/save chain remains reusable; actual-camera
art quality is still an acceptance condition.

The wider settlement direction then lets the player place and improve structures,
allocate local storage, and set
construction, production, and food priorities. Balance
carriers and producers against brood care, rest, patrols, and escorts. Establish
frontier roosts when the existing settlement can support them. Later, negotiate
access, exchange goods or duties, and contest claims with neighboring coops.

The world should make these decisions legible: a bird drags nesting grass to a
weaving ground; another carries a bundle toward a treehouse ladder; a
sentinel waits at an exposed crossing. Selecting a site explains its missing
input, labor, route, or capacity. Selecting a bird explains its current task,
observed preferences, condition, and relevant history. Biography is optional context.

The everyday appeal is concrete: supply the new canopy broodroom while reed deliveries
are backed up and the western approach is dangerous. Layout improvements should
create visible, satisfying changes before a larger political system is needed.

## Places worth building

The following structure roles are accepted design families. Exact building
variants, costs, capacities, and unlock order require playtesting. Tree anatomy
and history should make placement personal as well as useful. A broad fork,
sheltered landing or productive material can support a different working place;
buildings must use those places rather than erase the tree beneath a generic skin.
Mixed-family kingdoms gain complementary capabilities through suitable spaces,
materials, shared knowledge and actual labor. They receive no automatic bonus
per species. Single-family kingdoms remain viable, with trade or alternate work
providing other routes rather than hard species-collection gates.

| Place                                 | Work and tradeoff                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Treehouses and shared branch decks    | Usable sleeping and gathering space anchored to living trees; concentration simplifies supply but makes access and a breach consequential.  |
| Ladders, trunk hoists and later lifts | Connect ground work to canopy life; each access system trades construction effort, throughput and maintenance against mobility.             |
| Seed plots and drying grounds         | Cultivate, harvest, and prepare staple food; useful open ground also exposes workers.                                                       |
| Scratch yards and insect beds         | Maintain supplementary protein production from suitable inputs; moisture, labor, time, and neglect matter.                                  |
| Store nests                           | Hold local food and materials; placement determines travel, congestion, and who receives supplies first.                                    |
| Weaving grounds                       | Turn gathered grass, reeds, and twigs into useful components; compete with other work for material and carriers.                            |
| Canopy broodrooms                     | Supply incubation and chick care within treehouse homes; require suitable carers, food, access and continuing attention after construction. |
| Covered routes and branch crossings   | Connect sites and provide safer passage; investment competes with immediate production and expansion.                                       |
| Watch perches and thornworks          | Support warning and defensible approaches; need available defenders and reachable supply.                                                   |
| Dust grounds                          | Maintenance, rest, and social gathering; use and exclusion make relationships visible.                                                      |
| Frontier treehouses                   | Establish another forest home cluster; open opportunity while extending supply, trunk access and protection duties.                         |

Use chicken-built reed, twig, grass, and thorn forms integrated with trunks, branches and
terrain, supported by ground stores, work areas and routes. These are purposeful structures with visible work states, not miniature
human medieval buildings. The visual owner remains the
[art direction](../art-direction/visual-bible.md).

## Production and growth

Construction links gathering, transport, processing, delivery, and completion.
A representative chain is grass and reeds → weaving → branch-deck and shelter
components → delivery to a tree anchor → usable treehouse space and ladder
access. Later, supplied canopy broodrooms add care space. These are examples of
interlocking work, not finalized recipes. A completed deck or broodroom must not
silently supply food, incubation, or an available carer.

Population links adequate nutrition and reproductive conditions → fertile eggs
where possible → sustained incubation → dependent chicks → growing juveniles →
future workers or defenders. Eggs are future lives, never commercial output.
Ten eggs do not instantly produce ten workers. Fertility, successful hatching,
care, and maturation are distinct; failed eggs cannot remain an infinite stock.

Expansion links a food surplus → support for scouting and watching → a frontier
roost → connected, protected transport → access to additional resources. More
land stretches travel and defense. A rich patch that cannot reliably supply its
workers or return its output is not free prosperity.

Protein production links suitable gathered inputs → maintained insect beds →
harvest → local distribution to birds with different needs. Calories, protein,
calcium, and grinding grit have distinct purposes, while the first playable
representation should remain understandable. The exact ecological inputs and
conversion rates need design and research; no industrial output is assumed.

## Transport is visible work

Free movement, local stores, and autonomous carriers are central. Chickens do not
need player-authored roads to forage or work. Optional worn trails may emerge
from repeated traffic later; they are not a player construction task. Physical
distance, terrain and access still matter.
Goods exist at locations or in transit; a settlement total must not make distant
material instantly available. Show a delivery moving through the world and let
the player inspect where it came from, where it is going, and why it stopped.

Jobs need an identifiable purpose, reachable source and destination, available
material, carrying capacity, and an eligible worker. Reserve material against a
specific commitment so several jobs cannot promise the same bundle. Pickup
moves goods from source to cargo; delivery moves them into destination storage
or a construction allocation. Construction consumes delivered inputs as work
progresses under explicit rules. Cancellation, destination removal, interruption,
or carrier injury must release or relocate commitments coherently.

These principles do not finalize scheduling, reservation, or routing algorithms.
Choose a coherent implementation in the thin proof. Unreachable work needs a visible reason and a
useful remedy; endlessly circling workers and unexplained frozen counters fail.

## Safety changes the network

A route has distance and capacity, but also exposure, visibility, refuge, terrain,
and protection. Open sky, concealed approaches, mud, slopes, and gaps between
safe places can change its value. Cover is a tradeoff rather than universal
protection. Patrols and escorts consume actual time and cannot protect two
incompatible locations simultaneously.

Predators persist in the landscape with locations, opportunities, and histories.
A profitable hunting approach can become a recurring transport problem rather
than an isolated random deletion. Exact predator needs and species remain open.
Offer understandable signs and response opportunities: add cover, connect an
intermediate refuge, staff an escort, move production, reroute, or accept risk.

Watching a crossing, retreating, and buying escape time should matter. Injury or
loss changes the available workforce and relationships. Protection need not mean
invulnerable combat, and a saved chick should not erase the cost to its defender.

## Individuals emerge through repetition

Every chicken has persistent identity from the beginning. Recognition grows
through behavior: a carrier repeatedly takes the exposed leg, a hen finds useful
patches, a rooster escorts beyond the usual boundary, or a nervous worker waits
for familiar companions. Bodies and tendencies affect possibilities without
assigning breeds fixed professions, cultures, courage, or moral worth. Chicken
lineages are fictional breed-inspired varieties, not separate species or job
castes. The opening four adults are flight-capable fixtures; later low-flight
bodies require appropriate natural low perches and practical access. Do not
retrofit a mobility system or a lineage identity into existing saved birds.

An individual's attachment to a named tree and that tree's relationship with its
whole community should each retain causes and consequences. Familiarity is not
a border lock: chickens can visit, work across tree-family neighborhoods, resist
an expectation or settle elsewhere. Shared work can deepen ties, while neglect
or conflict can change them. Exact relationship rules remain design proposals;
the current contributor preference implements only one narrow personal memory.

Observed histories accumulate. Experience may improve a route worker's skill;
an attack may make the same worker wary there. Injury can reduce ability while
leaving affection and standing intact. Birds raised or working together can
prefer one another's company. These are proposed behavioral expressions whose
strength and exact rules need testing, not prewritten outcomes for every bird.

Distinguish dominance in contested encounters from affection, trust, fear,
recognized standing, and obligations. A reliable protector can become oppressive;
a disliked rival can rescue others. Describe causes through witnessed incidents
and behavior, preserving uncertainty about private motives without hiding known
work or danger. Do not replace a history with a universal alignment label.

## Infrastructure becomes politics

An efficient central feeding junction may also concentrate social power. A
powerful bird can displace others, attract companions, and control reliable
access. Favored birds become better supplied while subordinates take longer or
riskier routes. The player can distribute feeding sites, change access priorities,
open another connection, or relocate protection. Politics arises through the
logistics the player has built.

As outposts mature, repeated work, rest, and care form district communities. A
protein-producing district, a major broodhouse, or a reliable water crossing can
create dependence and bargaining power. Local loyalties may complicate a recall
or staffing decision. Infrastructure is not automatic legitimacy, and an order
can be accepted, negotiated, resisted, or abandoned for a visible reason.

Pacts, marriage or household moves, and fostering can later connect communities.
Named hens retain preferences, earlier ties, offspring relationships, and social
leverage. Arrangements may involve acceptance, resistance, coercion, or betrayal;
represent the consequences without treating transfers as inventory. Fictional
institutions may vary across coops. No universal human culture is implied.

## Proof sequence and acceptance

The **next proof is the art-led living sandbox**, judged against opening-view-v2
in the actual renderer, including close artifact views and a useful fixed-camera
scene. First prove the authoring route, then integrate the world, birds, resources,
work poses and useful building artifacts. Basic foraging and building should make
the place interesting to watch and influence without an authored plot or a
mandatory first-home sequence. The existing thin delivery/roost/save chain is a
reusable foundation, not visual acceptance. The bounded food study below is implemented; wider ecology remains proposed.

A later substantial settlement-loop proof can use roughly a dozen chickens as a
provisional starting target on a small landscape. Add food production, a canopy
broodroom, work/rest/care pressure, and a persistent predator problem with patrol
or escort responses when those systems are designed. Exact counts and roster
remain open; none is a prerequisite for the bounded art MVP.

The implemented ground movement has no Path tool or player connectivity gate.
Internal deterministic routing keeps travel within legal ground. Its validation
journey is: place a site → reserve and collect a local input → carry and deliver
it → consume it through construction → reveal usable output. Feeding breaks,
cancellation and save/reload must remain coherent. This tests causality, not a
player script or a reason to gate free observation. Optional natural worn trails
remain later presentation work.

Then connect production, population pressure, safety, and expansion. Test whether
building and improving the settlement is enjoyable for roughly thirty minutes.
That is an acceptance target, **not proven fun or implemented duration**. Only
after the core loop works should several districts and neighboring pacts make
larger politics useful. Elaborate warfare and multiplayer remain later work.

Acceptance for that larger settlement loop must demonstrate:

- Resources are conserved across stores, reservations, cargo, delivery, consumption,
  and losses; interruption cannot manufacture or silently duplicate goods.
- Unreachable or blocked jobs explain their cause and recover when it is resolved.
- Saved deliveries resume coherently without duplicate goods, work, or completion.
- Layout and staffing offer meaningful alternatives under supply and route danger.
- Individual experience changes later observable behavior and survives reload.
- A player recognizes a particular chicken by its actions and makes a construction
  or staffing decision partly because of that bird.
- A loss changes both how the economy works and how the player feels about it.
- Watching, building, diagnosing, and expanding stays engaging through the target
  session, established by playtesting rather than the number of implemented systems.

For consequential systems, trace **economic/spatial decision → observable work →
individual consequence → persistent response**, and identify the motives behind
that response. An ordinary work trip needs a clear spatial purpose, not compulsory
moral dialogue. Narrative succeeds when useful work becomes somebody's history.

## Treehouse direction and current thin proof

Construction is about treehouses and access: ground economy → trunk transport →
canopy neighborhood. Forest clusters grow into kingdoms; open fields between
them are productive no-man's-land with bounded mixed-food foraging and future richer ecology. Shared journeys
and repeated field use can later create pacts and rivalry. Woodland is not absolute
safety, and current scenery does not implement territory or danger. Home construction
anchors to real trees; supporting ground stores and routes serve canopy homes.
[Life above the ground](technology.md) owns the extended invention and defense
examples: woven shelter and ladders, counterweight hauling and canopy bridges,
powered lifts, then science-fiction elevators and responsive defenses. These
are chicken inventions, not a prohibition on machinery or copied human housing.

The implemented construction proof uses four provisional adults: Fern, Rook,
Dapple and Wren. Fresh worlds have eight loose reeds and two renewable, capacity-limited patches of
twelve construction reeds. Existing forty-reed worlds retain their supplies.
The cast, patch counts, a six-bundle treehouse, a
four-bundle store of capacity twelve, and all rates are tuning fixtures. Lowfork,
Splitcrown and Reedside are original candidate landmarks in small grove/edge
clusters at different route distances across the commons. They are not named
kingdoms, guaranteed refuges, or permanent canon characters.

Everyone starts on the ground. Each tree has two natural sleeping branches from
the start; all four adults can fly up and down. No construction is needed for
basic roosting. A woven branch deck, rain hood and readable ladder are earned
through reserve → pickup → visible carry → delivery → construction consumption.
The output adds two sheltered places. Selecting a tree reveals its residents,
current work and contextual Build choices. At a completed home, a four-reed lateral
sleeping deck adds two more sheltered places. A separate four-reed hauling-basket
experiment turns three delivered bundles into a rig, then its named operator
raises the fourth actual bundle before the flock learns the technique. The
operator remembers the demonstration. Learned baskets can be built at other
homes and raise subsequent deck supplies; the elevated deck requires a completed local basket for its supply access. Material, work and access are the cause of
progress, without abstract research points. Exact costs and short durations are
provisional. Saved lift progress and cargo retain one physical meaning. Improved occupancy uses an actual ground
approach and ladder climb; it is not a cosmetic access label. Finished buildings
cannot be demolished in this proof. Ground cells permit free placement of supporting
store nests, while treehouses require one of the three existing trunks. Local
stored goods supply later builds through free ground travel.

Explicit evening and day commands are saved facts rather than a full calendar.
Evening stops new collection and feeding, and secures existing loads before rest,
rather than teleporting goods or abandoning a duplicated load. Natural sleep restores
readiness up to 80, woven shelter up to 100. Work exerts birds, tired carriers
slow, and ordinary ground rest recovers readiness. These generous short rules
make the difference observable alongside appetite-driven feeding, without a full
survival or complete nutrition model.
Shelter currently means sleeping access and rest quality, not tested defense.

A contributor remembers helping make its first treehouse and prefers that tree
at evening. Fern usually seeks Splitcrown, Dapple Reedside, Wren prefers shelter
and travels cautiously, and Rook usually favors an open high fork until attachment
changes his choice. Finite occupancy can displace a preference. Sparse observed
memories, delivery practice, readiness, sleep identity and movement progress persist;
there is no claim of full relationship AI, general emotions or species personality.
Motives are legible through wanting a home made by one's own work, rest, and
familiar places. The player can build another improvement or rest or reopen a feeding place.

The old four-bird first-evening dilemma remains a historical technical fixture.
Its separate save retains its original meaning and can be exported when present;
settlement imports reject that incompatible story format explicitly. The current
proof does not establish thirty-minute fun, cultivated food production, predator
encounters, population loss, neighboring politics or advanced powered technology. Those remain
the substantial settlement milestone and subsequent proofs above.


## Inhabited anatomy: current proof and next questions

### Scale, sleeping places and future households

Adult presentation is `.365` times the editable chicken meshes: roughly
0.55–0.66m standing, with 0.31–0.36m body width. This is a fictional visual
envelope, not a claim that every breed has those dimensions. A bird keeps the
same size at every tree. Habitat anchors, structures, ladders and baskets use
metres at scale one on all three trees; secondary trees no longer shrink their
homes and access. Simulation ground cells remain two metres wide.

The opening roster is four adults; the bounded economy can add named young. Each tree offers two natural
fallback berths, two commissioned home berths, and two extra-deck berths. These
six slot identities prove access and saved occupancy; they do not establish a
mature tree's carrying capacity. The existing home floor is about 2.16×1.69m,
with only two commissioned sleepers. Materials also keep one visible size:
the same reed bundle is about 0.615m long on the ground, in a beak or in a basket.

Future planning targets are 24 sheltered residents at Lowfork in four six-place
households, 16 at Splitcrown in four four-place households, and 12 at Reedside in
three four-place households. These are design targets requiring an actual layout
proof, not implemented populations or guaranteed botanical capacities. Natural
sleepers are separate fallback space, not extra sustainable population. Food,
land and care must independently support any future population.

The accepted static Lowfork study places 24 actual adult meshes in four six-place
households. Each has a 2.4×2.2m clear sleeping floor, two 1.5m perches (3m total),
0.5m adult centres, a 0.65m side/service aisle, a separate 1.5×0.9m arrival and
turning landing, and 0.9m clear headroom. The deeper floor replaces the initial
2.4×1.8m study input. Actual body bounds, tree clearance and spread fork support
were checked; this is not implemented population growth, animated turning,
structural load or biological carrying-capacity proof. Splitcrown's 16 and
Reedside's 12 remain targets without occupied layout proofs. Reserve a 0.6m
clear doorway, 0.65m single-bird circulation/ladder and 0.9–1.0m passing courts.
These are generous fictional design envelopes, not husbandry minima. Sleeping perches,
shared laying nests, brooding/care places and work/cargo circulation have distinct
purposes and cannot be counted interchangeably. For context, [University of
Minnesota Extension](https://extension.umn.edu/agriculture/animals-and-livestock/poultry/raising-chickens-for-eggs)
describes shared laying nests for four to five birds and managed indoor floor
space of three to five square feet per bird. That backyard-husbandry guidance
does not establish our fictional household design or a tree's population limit.

The current inhabited-tree slice keeps the existing natural roost, home fork,
hauling cleft and upper sleeping deck as physical places. Six saved berth endpoints
remain stable. Extra-deck occupants climb the home ladder and cross its edge and
connecting ramp; they do not climb an imaginary vertical extension. Ground
construction and deliveries approach beside the trunk. The tree identity stays at
its origin, while free movement avoids new transit through tree bases. Existing
saved journeys and carried goods remain compatible.

This proves anatomy as usable habitat: roosts, supported homes, cargo clearance,
access and a ground workcourt. It adds no new food, shade or predator effects.
Next provisional ecosystem work should connect species-specific usable fork/crown
profiles to capabilities; root and leaf-litter food places to actual local foods
and regrowth; and canopy exposure, shelter and mobility to distinct predator
approaches. Mixed-family complementarity must follow usable places, materials and
work, not a mandatory diversity bonus. These questions remain future design and
require their own rule and art proof.

## Implemented one-task requests and readable work

A selected named adult can be asked to **Gather reeds**, **Help build** or **Bring food** at one shown place. These are requests for one physical trip or weaving task, not control of the chicken's whole day or a promise to finish a building. The existing work system owns every reservation, journey, pickup, delivery and contribution. Gather does not silently open the patch to the flock. Food reaches an existing nursery physically. Meals, current cargo, sleep, rest, active care and urgent brood supplies still come first; young and carers cannot accept new work. A waiting request explains its cause. After one successful contribution the bird resumes autonomous community work. This bounded request is not a new consent/politics system and invents no relationship response.

Only one request may be pending per chicken. Canceling uncollected work waits for a safe step; cargo is delivered before the chicken takes other work. A request whose target is removed, completed, full or depleted ends visibly rather than selecting a different target. The request and its latest bounded result survive saving, with no new resources or extra progress on reload.

For the first home, **Build a home** on a selected adult opens deliberate tree placement. Choosing an explicitly labeled named tree commissions the home and that adult's one-task help together; an ineligible adult or stale place leaves neither a partial project nor a replacement request. Cancel placement stops without building. Ordinary tree inspection retains its recipe action and never commissions merely by selecting a tree.

Every unfinished commission immediately has an ochre workcourt ring and a planned project badge in the world, before a worker or finished structure exists. These present saved plans, not pretend construction. One badge per tree leads with a focused unfinished project, otherwise the first unfinished project, and counts further projects; the tree card lists them all. Fetching, carrying, walking to weave and actual weaving name the chickens doing that work. A pending request remains a named wait, not an active contribution. Paused work leads with **Resume work** and never silently resumes; morning, personal needs and material waits remain truthful. A shortage offers one available named reed helper without replacing another request or care, or explains why no helper or harvest is available. Depleted reeds recover on daylight ticks.

The headline **Reeds ready** means unreserved source and store stock usable by new work. Delivered construction material, cargo and reservations are distinct physical facts in optional details. A project can queue before all reeds exist; it immediately shows delivered material, a named worker when allocated, and its next need. Night commissions are allowed and state **Starts in the morning**; weaving pauses with its materials and progress retained, secured cargo finishes delivery, and workers then sleep. Tree homes remain six reeds/two sheltered sleeping places, with the nursery and next home improvement directly visible after completion. The nursery costs four reeds and provides ground care for two future chicks; building it creates no eggs. A completed basket exposes the existing sleeping deck recipe. Other building controls remain secondary. The selected-chicken, tree and food cards keep the world dominant. Seeds/Bugs are plain presentation names for the existing staple/protein ledgers; food for chicks leads with local need and a useful helper action, with approximate planning details optional. The first purpose hint is optional and dismissible, not an authored quest.

### Local nursery feedback (accepted interface slice)

A completed nursery's single world badge opens care at that named tree. Unfinished construction keeps badge precedence; there are never stacked targets at one tree. Nursery feedback follows saved preparation, actual laid eggs, incubation, named chicks and juveniles, then grown adults. Stage progress is physical simulation progress, not a countdown promise. Paused time, carer arrival, missing local food and individual hunger explain stalls. A named available adult can be asked for one food trip to this exact nursery without replacing an existing request or care. Food priorities remain explicit player choices: Food first can slow ordinary building; urgent care and personal meals retain precedence.

The headline separates adults, chicks, juveniles and expected unhatched commitments. Future places count current residents plus unhatched commitments against reachable eventual adult capacity; they are neither occupied sleeping places nor available workers. Young remain grounded until grown. Local stored Seeds and Bugs are actual inventory; cycle forecasts remain separate estimates. A hen's care removes her from ordinary construction until the chicks feed themselves. No fertility, care, food or growth timings are changed by this interface.

## Implemented construction focus

The player can choose **Build this first** on any unfinished tree structure or ground store. This is a community construction priority, not ownership of a chicken or a promise of immediate work. The next available construction assignment tries the chosen project’s weaving or reed pickup before other projects; if it cannot act there, useful ordinary work continues. **Use normal order** clears the choice. Completion or cancellation also clears it. All other plans remain, in their original order.

Current deliveries, reservations and basket lifts finish normally; existing named requests retain their target. Care, personal needs and the player’s food policy keep their existing precedence. Focus neither moves reeds already committed elsewhere nor silently designates habitat, replaces a request or changes Food/Build policy. Actual project progress and named contributions remain distinct from its priority. A tree’s single world badge shows its focused project; ground stores retain their planned construction marker. The compact finder opens the exact chosen project after closing its panel or reloading. Older settlements reopen in normal order. This interface does not change construction costs, reed renewal, hauling throughput, or growth timing.
