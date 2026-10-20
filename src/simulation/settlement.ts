import { habitatAnchor, habitatPosition, treeHabitat, treeWorkCell, type HabitatAnchor } from "../content/tree-habitats";
import {
  foodPatches,
  forageTuning,
  reedPatches,
  settlers,
  trees,
  tuning,
  economyTuning,
  offspringNames,
} from "../content/settlement";
import type {
  Appearance,
  FoodPatchId,
  ForagePreference,
  SettlerId,
  TreeId,
} from "../content/settlement";
export type Cell = { x: number; z: number };
export type BuildKind =
  "treehouse" | "store" | "sleeping-deck" | "hauling-basket" | "nursery";
export type Pile = {
  id: string;
  at: Cell;
  stock: number;
  kind: "source" | "salvage";
};
export type ReedPatch = {
  id: string;
  at: Cell;
  capacity: number;
  remaining: number;
  harvested: number;
  designated: boolean;
  regrown: number;
  recoveryProgress: number;
};
export type Site = {
  id: string;
  kind: BuildKind;
  at: Cell;
  tree: TreeId | null;
  delivered: number;
  progress: number;
  complete: boolean;
  stock: number;
  target: number;
  contributors: SettlerId[];
  experiment: boolean;
};
export type Job = {
  kind: "haul" | "stock" | "return" | "build" | "gather";
  source: string;
  destination: string;
  stage: "pickup" | "deliver";
};
export type Perch = { tree: TreeId; slot: number; sheltered: boolean };
export type Flight = Perch & {
  progress: number;
  direction: "up" | "down";
  from: Cell;
};
export type Food = "staple" | "protein";
export type FoodStock = Record<Food, number>;
export type Priority = "balanced" | "build" | "provision";
export type Life = {
  name: string; appearance: Appearance; sex: "hen" | "rooster";
  stage: "chick" | "juvenile" | "adult"; age: number; development: number;
  mother: string | null; father: string | null; carer: string | null;
  bornAt: TreeId | null; bond: number; willing: boolean;
  fertility: { father: string; tick: number } | null; matingProgress: number;
};
export type Egg = { id: string; laidAt: number; fertile: boolean; viable: boolean; child: string | null; hatchTick: number | null };
export type Brood = {
  id: string; site: string; mother: string; father: string; carer: string;
  stage: "laying" | "incubating" | "chicks" | "complete" | "failed";
  progress: number; eggs: Egg[]; careTicks: number; mealProgress: number;
  shortageTicks: number; started: number;
};
export type Nursery = { site: string; food: FoodStock; target: number; brood: string | null };
export type Economy = {
  clock: { day: number; phaseTick: number; automatic: boolean; speed: 1 | 4 };
  priority: Priority; nurseries: Nursery[]; broods: Brood[];
  foodConsumed: FoodStock;
};
export type Provision = { patch: FoodPatchId; destination: string; stage: "pickup" | "deliver"; progress: number };
export type FoodPatch = {
  id: FoodPatchId;
  at: Cell;
  capacity: number;
  remaining: number;
  eaten: number;
  harvested: FoodStock;
  proteinEaten: number;
  regrown: number;
  recoveryProgress: number;
  open: boolean;
};
export type Foraging = {
  patch: FoodPatchId;
  spot: Cell;
  intent: "eat" | "browse";
  progress: number;
};
export type Worker = {
  life: Life; protein: number; foodCargo: Food | null; provision: Provision | null; care: string | null;
  lift: { basket: string; progress: number } | null;
  satiety: number;
  foragePreference: ForagePreference;
  rememberedForage: FoodPatchId | null;
  foraging: Foraging | null;
  id: SettlerId;
  at: Cell;
  edge: { to: Cell; progress: number } | null;
  cargo: number;
  gatheringProgress: number;
  job: Job | null;
  energy: number;
  resting: boolean;
  deliveries: number;
  attachment: TreeId | null;
  memories: string[];
  perch: Perch | null;
  flight: Flight | null;
};
export type Settlement = {
  economy: Economy;
  basketTechnique: { inventor: SettlerId; tree: TreeId; tick: number } | null;
  tick: number;
  phase: "day" | "evening";
  paused: boolean;
  nextId: number;
  forage: FoodPatch[];
  piles: Pile[];
  patches: ReedPatch[];
  initialReeds: number;
  harvestedReeds: number;
  sites: Site[];
  birds: Worker[];
  consumed: number;
  totalReeds: number;
};
export type Command =
  | { type: "priority"; priority: Priority }
  | { type: "speed"; speed: 1 | 4 }
  | { type: "brood"; site: string; mother: string }
  | { type: "forage"; id: string; open: boolean }
  | { type: "build"; kind: BuildKind; at: Cell }
  | { type: "cancel"; id: string }
  | { type: "gather"; id: string; designated: boolean }
  | { type: "stock"; id: string; target: number }
  | { type: "phase"; phase: "day" | "evening" }
  | { type: "pause" };
export const key = (p: Cell) => `${p.x},${p.z}`;
export const same = (a: Cell, b: Cell) => a.x === b.x && a.z === b.z;
export const validCell = (p: Cell) =>
  Number.isInteger(p.x) &&
  Number.isInteger(p.z) &&
  p.x >= -4 &&
  p.x <= 4 &&
  p.z >= -3 &&
  p.z <= 3;
export const cost = (site: Pick<Site, "kind">) =>
  site.kind === "nursery" ? economyTuning.nurseryCost : site.kind === "treehouse"
    ? tuning.treehouseCost
    : site.kind === "sleeping-deck"
      ? tuning.sleepingDeckCost
      : site.kind === "hauling-basket"
        ? tuning.haulingBasketCost
        : tuning.storeCost;
export function basketForTree(state: Settlement, tree: TreeId) {
  return state.sites.find(
    (s) => s.tree === tree && s.kind === "hauling-basket" && s.complete,
  );
}
export function shelteredCapacity(state: Settlement, tree: TreeId) {
  return state.sites.reduce(
    (n, s) =>
      n +
      (s.tree === tree &&
      s.complete &&
      (s.kind === "treehouse" || s.kind === "sleeping-deck")
        ? 2
        : 0),
    0,
  );
}
export function treeBuildOptions(state: Settlement, tree: TreeId) {
  const home = state.sites.some(
    (s) => s.tree === tree && s.kind === "treehouse" && s.complete,
  );
  return (["treehouse", "sleeping-deck", "hauling-basket", "nursery"] as const).map(
    (kind) => {
      const existing = state.sites.some(
        (s) => s.tree === tree && s.kind === kind,
      );
      const reason =
        state.phase !== "day"
          ? "Construction begins in daylight; the next day starts automatically."
          : existing
            ? "This construction already exists at this tree."
            : kind !== "treehouse" && !home
              ? "Complete this tree's home first."
              : kind === "sleeping-deck" && !basketForTree(state, tree)
                ? "Build a hauling basket to supply this elevated deck."
                : "";
      return {
        kind,
        cost: cost({ kind }),
        available: !reason,
        reason,
        label:
          kind === "nursery" ? "Covered root nursery" : kind === "treehouse"
            ? "Home and ladder"
            : kind === "sleeping-deck"
              ? "Extra sleeping deck"
              : state.basketTechnique
                ? "Hauling basket"
                : "Hauling basket experiment",
      };
    },
  );
}
/** Cell-space X/Z, unscaled vertical metres; renderer converts X/Z to art metres. */
export function basketLiftPosition(tree: TreeId, progress: number) {
  const at = trees.find((t) => t.id === tree)!;
  const profile = treeHabitat(tree);
  const base = habitatAnchor(tree, "basket-ground");
  const socket = habitatAnchor(tree, "cargo-socket");
  return { x: at.x + (base.x + socket.x) / 2, z: at.z + (base.z + socket.z) / 2, y: base.y + socket.y + profile.hauling.travelY * progress };
}
export function cargoPosition(state: Settlement, bird: Worker) {
  const basket =
    bird.lift && state.sites.find((s) => s.id === bird.lift!.basket);
  return basket?.tree
    ? basketLiftPosition(basket.tree, bird.lift!.progress)
    : { ...birdPosition(bird), y: birdPosition(bird).y + 0.34 };
}
export function readyForBuild(state: Settlement, site: Site) {
  return (
    !site.complete &&
    (site.delivered === cost(site) ||
      (site.kind === "hauling-basket" &&
        !state.basketTechnique &&
        site.progress < 30 &&
        site.delivered === 3))
  );
}
function completeSite(state: Settlement, site: Site, operator: Worker) {
  state.consumed += site.delivered;
  site.delivered = 0;
  site.complete = true;
  site.contributors = [...new Set([...site.contributors, operator.id])];
  if (site.kind === "nursery") state.economy.nurseries.push({ site: site.id, food: {staple:0,protein:0}, target: economyTuning.nurseryTarget, brood:null });
  if (!site.tree) return;
  const name = trees.find((t) => t.id === site.tree)!.name;
  for (const id of site.contributors) {
    const contributor = state.birds.find((b) => b.id === id)!;
    if (site.kind === "treehouse" || site.kind === "nursery") {
      if (!contributor.attachment) contributor.attachment = site.tree;
      remember(contributor, `Helped build ${name}; wants to sleep there.`);
    } else
      remember(
        contributor,
        `Helped build the ${site.kind === "sleeping-deck" ? "extra sleeping deck" : "hauling basket"} at ${name}.`,
      );
  }
}
export function initialPatches(): ReedPatch[] {
  return reedPatches.map((p) => ({
    ...structuredClone(p),
    remaining: p.capacity,
    harvested: 0,
    designated: false,
    regrown: 0,
    recoveryProgress: 0,
  }));
}
export function initialForage(): FoodPatch[] {
  return foodPatches.map((p) => ({
    id: p.id,
    at: { ...p.at },
    capacity: p.capacity,
    remaining: p.capacity,
    eaten: 0,
    harvested: { staple: 0, protein: 0 },
    proteinEaten: 0,
    regrown: 0,
    recoveryProgress: 0,
    open: true,
  }));
}
export function initialAppetite(id: Appearance) {
  return {
    satiety: forageTuning.initialSatiety as number,
    foragePreference: settlers.find((b) => b.id === id)!.foragePreference,
    rememberedForage: null,
    foraging: null,
  };
}

export function initialEconomy(): Economy {
  return { clock: {day:1,phaseTick:0,automatic:true,speed:1}, priority:"balanced", nurseries:[], broods:[], foodConsumed:{staple:0,protein:0} };
}
export function initialLife(id: Appearance): Life {
  return {name:settlers.find(b=>b.id===id)!.name, appearance:id, sex:id==="rook"?"rooster":"hen", stage:"adult", age:0, development:0, mother:null,father:null,carer:null,bornAt:null,bond:0,willing:true,fertility:null,matingProgress:0};
}
export function birdProfile(bird: Worker) {
  const original = settlers.find(b=>b.id===bird.life.appearance)!;
  return {...original,id:bird.id,name:bird.life.name,role:bird.life.stage==="adult"?original.role:bird.life.stage==="chick"?"Dependent chick":"Growing juvenile",want:bird.life.mother?`Raised at ${trees.find(t=>t.id===bird.life.bornAt)?.name ?? "the nursery"}; remembers familiar care.`:original.want};
}

export function initialSettlement(): Settlement {
  return {
    economy: initialEconomy(),
    basketTechnique: null,
    tick: 0,
    phase: "day",
    paused: false,
    nextId: 1,
    forage: initialForage(),
    piles: [
      {
        id: "reeds",
        at: { x: -3, z: -2 },
        stock: tuning.initialReeds,
        kind: "source",
      },
    ],
    patches: initialPatches(),
    initialReeds: tuning.initialReeds,
    harvestedReeds: 0,
    sites: [],
    birds: settlers.map((b) => ({
      id: b.id,
      life: initialLife(b.id), protein: 85, foodCargo: null, provision: null, care: null,
      lift: null,
      ...initialAppetite(b.id),
      at: { x: -3, z: -2 },
      edge: null,
      cargo: 0,
      gatheringProgress: 0,
      job: null,
      energy: b.energy,
      resting: false,
      deliveries: 0,
      attachment: null,
      memories: [],
      perch: null,
      flight: null,
    })),
    consumed: 0,
    totalReeds: tuning.initialReeds,
  };
}
export function route(_state: Settlement, from: Cell, to: Cell): Cell[] | null {
  return groundRoute(from, to);
}
function groundRoute(from: Cell, to: Cell): Cell[] | null {
  if (!validCell(from) || !validCell(to)) return null;
  const queue: Cell[][] = [[from]];
  const visited = new Set([key(from)]);
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i];
    const p = path[path.length - 1];
    if (same(p, to)) return path;
    for (const n of [
      { x: p.x + 1, z: p.z },
      { x: p.x - 1, z: p.z },
      { x: p.x, z: p.z + 1 },
      { x: p.x, z: p.z - 1 },
    ]) {
      if (!visited.has(key(n)) && validCell(n) && !trees.some(t => same(t, n))) {
        visited.add(key(n));
        queue.push([...path, n]);
      }
    }
  }
  return null;
}
function remember(bird: Worker, text: string) {
  if (!bird.memories.includes(text))
    bird.memories = [...bird.memories, text].slice(-6);
}
function location(state: Settlement, id: string): (Pile | Site) | undefined {
  return (
    state.piles.find((p) => p.id === id) ??
    state.sites.find((s) => s.id === id && s.complete && s.kind === "store")
  );
}
const reserved = (state: Settlement, id: string) =>
  state.birds.filter(
    (b) =>
      b.job?.source === id &&
      b.job.stage === "pickup" &&
      b.job.kind !== "build",
  ).length;
const incoming = (state: Settlement, id: string) =>
  state.birds.filter((b) => b.job?.destination === id && b.job.kind !== "build")
    .length;
export function available(state: Settlement, id: string) {
  const p = location(state, id);
  return p ? p.stock - reserved(state, id) : 0;
}
export function conserved(state: Settlement) {
  return (
    state.piles.reduce((n, p) => n + p.stock, 0) +
    state.sites.reduce((n, s) => n + s.stock + s.delivered, 0) +
    state.birds.reduce((n, b) => n + b.cargo, 0) +
    state.consumed
  );
}
export function command(current: Settlement, action: Command): Settlement {
  const state = structuredClone(current);
  if (action.type === "pause") state.paused = !state.paused;
  if (action.type === "priority") {
    if(!["balanced","build","provision"].includes(action.priority)) throw new Error("Choose a work priority.");
    state.economy.priority=action.priority;
  }
  if (action.type === "speed") {
    if(action.speed!==1&&action.speed!==4)throw new Error("Choose 1× or 4× time.");
    state.economy.clock.speed=action.speed;
  }
  if (action.type === "brood") {
    const reason=broodReason(state,action.site,action.mother);
    if(reason)throw new Error(reason);
    const mother=state.birds.find(b=>b.id===action.mother)!;
    const brood: Brood={id:`brood-${state.nextId++}`,site:action.site,mother:mother.id,father:mother.life.fertility!.father,carer:mother.id,stage:"laying",progress:0,eggs:[],careTicks:0,mealProgress:0,shortageTicks:0,started:state.tick};
    state.economy.broods.push(brood);nurseryAt(state,action.site)!.brood=brood.id;mother.care=brood.id;
    if(!mother.cargo&&!mother.foodCargo){mother.job=null;mother.provision=null;mother.gatheringProgress=0;mother.foraging=null;}
    if(mother.perch){mother.flight={...mother.perch,progress:1,direction:"down",from:treeWorkCell(mother.perch.tree)};mother.perch=null;}
    if(mother.flight)mother.flight.direction="down";
    remember(mother,`Chose to raise a brood at ${trees.find(t=>t.id===state.sites.find(s=>s.id===action.site)!.tree)!.name}; community work must carry on without her.`);
  }
  if (action.type === "forage") {
    const patch = state.forage.find((p) => p.id === action.id);
    if (!patch) throw new Error("Choose an existing food place.");
    patch.open = action.open;
    if (!patch.open)
      for (const bird of state.birds)
        if (bird.foraging?.patch === patch.id) bird.foraging = null;
    if(!patch.open) for(const bird of state.birds) if(bird.provision?.patch===patch.id&&bird.provision.stage==="pickup")bird.provision=null;
  }
  if (action.type === "build") {
    if (!validCell(action.at))
      throw new Error("Choose a cell in the marked glade.");
    if (state.phase !== "day")
      throw new Error("Construction begins in daylight; the next day starts automatically.");
    const tree = trees.find((t) => same(t, action.at));
    if (tree && action.kind !== "store") {
      const option = treeBuildOptions(state, tree.id).find(
        (o) => o.kind === action.kind,
      )!;
      if (!option.available) throw new Error(option.reason);
    }
    if (
      state.sites.some(
        (s) =>
          same(s.at, action.at) &&
          (!tree || s.kind === action.kind || action.kind === "store"),
      ) ||
      state.piles.some((p) => p.kind === "source" && same(p.at, action.at)) ||
      state.patches.some((p) => same(p.at, action.at)) ||
      state.forage.some((p) => same(p.at, action.at)) ||
      state.birds.some((b) => b.foraging && same(b.foraging.spot, action.at))
    )
      throw new Error("This place is already occupied.");
    if (action.kind !== "store" && !tree)
      throw new Error("Treehouses need one of the three marked trees.");
    if (action.kind === "store" && tree)
      throw new Error("Leave the trunk clear; choose another ground cell.");
    state.sites.push({
      id: `site-${state.nextId++}`,
      kind: action.kind,
      at: { x: action.at.x, z: action.at.z },
      tree: action.kind !== "store" ? tree!.id : null,
      delivered: 0,
      progress: 0,
      complete: false,
      stock: 0,
      target: 0,
      contributors: [],
      experiment: false,
    });
  }
  if (action.type === "cancel") {
    const site = state.sites.find((s) => s.id === action.id);
    if (!site || site.complete)
      throw new Error("Only unfinished sites can be canceled.");
    if (site.delivered) {
      // Reuse the physical pile, including its ID: outstanding pickups may refer to it.
      // One location must not accumulate an unbounded history of empty salvage records.
      const salvage = state.piles.find(
        (p) => p.kind === "salvage" && same(p.at, site.at),
      );
      if (salvage) salvage.stock += site.delivered;
      else
        state.piles.push({
          id: `salvage-${state.nextId++}`,
          at: site.at,
          stock: site.delivered,
          kind: "salvage",
        });
    }
    for (const bird of state.birds)
      if (bird.job?.destination === site.id) {
        bird.lift = null;
        if (bird.cargo)
          bird.job = {
            kind: "return",
            source: bird.job.source,
            destination: "reeds",
            stage: "deliver",
          };
        else bird.job = null;
      }
    state.sites = state.sites.filter((s) => s.id !== site.id);
  }
  if (action.type === "gather") {
    const patch = state.patches.find((p) => p.id === action.id);
    if (!patch) throw new Error("Choose an existing reed patch.");
    patch.designated = action.designated;
    if (!action.designated)
      for (const bird of state.birds)
        if (
          bird.job?.kind === "gather" &&
          bird.job.source === patch.id &&
          !bird.cargo
        ) {
          bird.job = null;
          bird.gatheringProgress = 0;
        }
  }
  if (action.type === "stock") {
    const site = state.sites.find(
      (s) => s.id === action.id && s.complete && s.kind === "store",
    );
    if (
      !site ||
      !Number.isInteger(action.target) ||
      action.target < 0 ||
      action.target > tuning.storeCapacity
    )
      throw new Error("Choose a storage target between zero and twelve.");
    site.target = action.target;
  }
  if (action.type === "phase" && action.phase !== state.phase) {
    state.phase = action.phase;
    state.economy.clock.phaseTick=0;
    for (const bird of state.birds) {
      bird.foraging = null;
      if(action.phase === "evening" && bird.provision?.stage === "pickup")bird.provision=null;
      if (
        action.phase === "evening" &&
        !bird.cargo &&
        bird.job?.kind !== "build"
      ) {
        bird.job = null;
        bird.gatheringProgress = 0;
      }
      if (action.phase === "day") {
        if (bird.perch) {
          bird.flight = {
            ...bird.perch,
            direction: "down",
            progress: 1,
            from: treeWorkCell(bird.perch.tree),
          };
          bird.perch = null;
        } else if (bird.flight?.direction === "up")
          bird.flight.direction = "down";
      }
    }
  }
  return state;
}
/** Existing site identities stay at tree origins; work takes place beside the trunk.
 * This also makes legacy salvage at a tree accessible without walking into wood. */
export function groundAccess(at: Cell): Cell {
  const tree = trees.find(t => same(t, at));
  return tree ? treeWorkCell(tree.id) : at;
}
function destination(state: Settlement, bird: Worker): Cell | undefined {
  if (!bird.job) return undefined;
  const at = bird.job.stage === "pickup"
    ? bird.job.kind === "gather"
      ? state.patches.find(p => p.id === bird.job!.source)?.at
      : location(state, bird.job.source)?.at
    : location(state, bird.job.destination)?.at ?? state.sites.find(s => s.id === bird.job!.destination)?.at;
  return at && groundAccess(at);
}
function move(state: Settlement, bird: Worker, to: Cell): boolean {
  if (same(bird.at, to) && !bird.edge) return true;
  if (!bird.edge) {
    const path = route(state, bird.at, to);
    if (!path || path.length < 2) return false;
    bird.edge = { to: path[1], progress: 0 };
  }
  const fixture = birdProfile(bird);
  bird.edge.progress +=
    0.07 *
    fixture.pace *
    (bird.deliveries >= 3 ? 1.12 : 1) *
    (bird.energy < 35 || bird.protein < economyTuning.proteinMinimum || bird.satiety < 20 ? 0.65 : 1);
  bird.energy = Math.max(0, bird.energy - 0.035);
  if (bird.edge.progress >= 1) {
    bird.at = bird.edge.to;
    bird.edge = null;
  }
  return same(bird.at, to) && !bird.edge;
}
function assign(state: Settlement, bird: Worker) {
  if(bird.life.stage!=="adult"||bird.care)return;
  if(assignProvision(state,bird,true))return;
  if(state.economy.priority!=="build"&&assignProvision(state,bird))return;
  const sites = state.sites.filter((s) => !s.complete);
  for (const site of sites) {
    if (
      readyForBuild(state, site) &&
      !state.birds.some(
        (b) => b.job?.kind === "build" && b.job.destination === site.id,
      ) &&
      route(state, bird.at, groundAccess(site.at))
    ) {
      bird.job = {
        kind: "build",
        source: "",
        destination: site.id,
        stage: "deliver",
      };
      return;
    }
  }
  const demands = [
    ...sites.filter((s) => s.delivered + incoming(state, s.id) < cost(s)),
    ...state.sites.filter(
      (s) =>
        s.complete &&
        s.kind === "store" &&
        s.stock + incoming(state, s.id) < s.target,
    ),
  ];
  for (const site of demands) {
    const sources = [
      ...state.piles,
      ...state.sites.filter((s) => s.complete && s.kind === "store"),
    ]
      .filter(
        (p) =>
          p.id !== site.id &&
          available(state, p.id) > 0 &&
          route(state, bird.at, groundAccess(p.at)) &&
          route(state, groundAccess(p.at), groundAccess(site.at)),
      )
      .sort(
        (a, b) =>
          route(state, groundAccess(a.at), groundAccess(site.at))!.length -
            route(state, groundAccess(b.at), groundAccess(site.at))!.length || a.id.localeCompare(b.id),
      );
    // Storage refill originates at loose material; stores never endlessly refill one another.
    const source = sources.find(
      (s) => !site.complete || state.piles.some((p) => p.id === s.id),
    );
    if (source) {
      bird.job = {
        kind: site.complete ? "stock" : "haul",
        source: source.id,
        destination: site.id,
        stage: "pickup",
      };
      return;
    }
  }
  for (const patch of state.patches) {
    if (
      !patch.designated ||
      patch.remaining <= reserved(state, patch.id) ||
      !route(state, bird.at, patch.at)
    )
      continue;
    const targets = [
      ...state.piles.filter((p) => p.kind === "source"),
      ...state.sites.filter(
        (s) =>
          s.complete &&
          s.kind === "store" &&
          s.stock + incoming(state, s.id) < tuning.storeCapacity,
      ),
    ]
      .filter((p) => route(state, patch.at, p.at))
      .sort(
        (a, b) =>
          route(state, patch.at, a.at)!.length -
            route(state, patch.at, b.at)!.length || a.id.localeCompare(b.id),
      );
    if (targets[0]) {
      bird.job = {
        kind: "gather",
        source: patch.id,
        destination: targets[0].id,
        stage: "pickup",
      };
      bird.gatheringProgress = 0;
      return;
    }
  }
  if(state.economy.priority==="build")assignProvision(state,bird);
}
function occupied(state: Settlement, perch: Perch) {
  return state.birds.some((b) =>
    [b.perch, b.flight].some(
      (p) =>
        p &&
        p.tree === perch.tree &&
        p.slot === perch.slot &&
        p.sheltered === perch.sheltered,
    ),
  );
}
function settle(state: Settlement, bird: Worker) {
  const fixture = birdProfile(bird);
  const order = [...trees].sort(
    (a, b) =>
      (a.id === bird.attachment ? -10 : a.id === fixture.preference ? -5 : 0) -
      (b.id === bird.attachment ? -10 : b.id === fixture.preference ? -5 : 0),
  );
  for (const tree of order) {
    const capacity = shelteredCapacity(state, tree.id);
    const slots: Perch[] = [];
    const shelteredFirst = bird.id !== "rook" || bird.attachment === tree.id;
    for (const sheltered of shelteredFirst ? [true, false] : [false, true])
      if (!sheltered || capacity)
        for (let slot = 0; slot < (sheltered ? capacity : 2); slot++)
          slots.push({ tree: tree.id, slot, sheltered });
    const perch = slots.find((p) => !occupied(state, p));
    if (perch) {
      const point = groundPosition(bird);
      bird.flight = { ...perch, direction: "up", progress: 0, from: point };
      bird.edge = null;
      return;
    }
  }
}
export function groundPosition(bird: Worker): Cell {
  return bird.edge
    ? {
        x: bird.at.x + (bird.edge.to.x - bird.at.x) * bird.edge.progress,
        z: bird.at.z + (bird.edge.to.z - bird.at.z) * bird.edge.progress,
      }
    : bird.at;
}
export function perchPosition(perch: Perch, anchorScale = 1) {
  const profile = treeHabitat(perch.tree);
  const name = (perch.sheltered ? profile.shelteredPerches : profile.naturalPerches)[perch.slot] as HabitatAnchor;
  const at = habitatAnchor(perch.tree, name);
  return habitatPosition(perch.tree, { x: at.x * anchorScale, y: at.y * anchorScale, z: at.z * anchorScale });
}
function interpolatePoint(a: {x:number;y:number;z:number}, b: {x:number;y:number;z:number}, t: number) {
  return { x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t, z: a.z + (b.z-a.z)*t };
}
/** Pure spatial read: anchorScale lets the renderer use the same authored route,
 * without changing saved cells, progress, or outcomes. Downward travel reverses it. */
export function birdPosition(bird: Worker, anchorScale = 1) {
  const perch = bird.perch ?? bird.flight;
  if (!perch) return { ...groundPosition(bird), y: 0 };
  const end = perchPosition(perch, anchorScale);
  if (!bird.flight) return end;
  const f = bird.flight;
  const t = f.progress;
  if (f.sheltered) {
    const profile = treeHabitat(f.tree);
    const access = f.slot >= 2 ? profile.deckAccess : profile.homeAccess;
    const anchor = (name: string) => {
      const p = habitatAnchor(f.tree, name as HabitatAnchor);
      return habitatPosition(f.tree, {x:p.x*anchorScale,y:p.y*anchorScale,z:p.z*anchorScale});
    };
    // Walk the existing ground grid around trunk bases before the short ladder approach.
    // Legacy starts inside a trunk are allowed to leave, never newly traversed.
    const approach = groundRoute(f.from, treeWorkCell(f.tree)) ?? [f.from];
    const points = approach.map(p => ({...p,y:0}));
    points.push(anchor("ladder-base"));
    if (t <= access[0].progress) {
      const u = t / access[0].progress * (points.length-1);
      const i = Math.min(points.length-2, Math.floor(u));
      return interpolatePoint(points[i], points[i+1], u-i);
    }
    let start = anchor(access[0].anchor), previous = access[0].progress;
    for (const waypoint of [...access.slice(1), {progress:1,anchor:"berth"}]) {
      const next = waypoint.anchor === "berth" ? end : anchor(waypoint.anchor);
      if (t <= waypoint.progress) return interpolatePoint(start,next,(t-previous)/(waypoint.progress-previous));
      start=next;previous=waypoint.progress;
    }
    return end;
  }
  return {
    x: f.from.x + (end.x - f.from.x) * t,
    z: f.from.z + (end.z - f.from.z) * t,
    y: end.y * t + Math.sin(Math.PI * t) * 1.2,
  };
}
/** Edible-food ledger is independent of construction material. */
export function foodConserved(state: Settlement) {
  return state.forage.every(
    (p) => p.capacity + p.regrown === p.remaining + p.eaten + p.harvested.staple + p.harvested.protein,
  ) && (["staple","protein"] as Food[]).every(food =>
    state.forage.reduce((n,p)=>n+p.harvested[food],0) ===
    state.economy.nurseries.reduce((n,p)=>n+p.food[food],0)+state.birds.filter(b=>b.foodCargo===food).length+state.economy.foodConsumed[food]);
}
const distance = (a: Cell, b: Cell) =>
  Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
/** Nearby legal feeding positions adapt around existing legacy structures.
 * No structure is moved or deleted to make room for a new habitat. */
export function feedingSpots(state: Settlement, patch: FoodPatch): Cell[] {
  const blocked = new Set([
    ...trees.map(key),
    ...state.sites.map((s) => key(s.at)),
    ...state.piles.map((p) => key(p.at)),
    ...state.patches.map((p) => key(p.at)),
  ]);
  const spots: Cell[] = [];
  for (let z = -3; z <= 3; z++)
    for (let x = -4; x <= 4; x++) {
      const at = { x, z };
      if (distance(at, patch.at) <= 2 && !blocked.has(key(at))) spots.push(at);
    }
  return spots.sort(
    (a, b) =>
      distance(a, patch.at) - distance(b, patch.at) || a.z - b.z || a.x - b.x,
  );
}
function chooseForage(
  state: Settlement,
  bird: Worker,
  intent: Foraging["intent"],
): boolean {
  const choices = state.forage
    .flatMap((patch) => {
      const occupants = state.birds.filter(
        (b) => b.id !== bird.id && b.foraging?.patch === patch.id,
      );
      if (
        !patch.open ||
        patch.remaining <= state.birds.filter(b=>b.provision?.stage==="pickup"&&b.provision.patch===patch.id).length ||
        occupants.length >= forageTuning.maximumOccupancy
      )
        return [];
      const spot = feedingSpots(state, patch).find(
        (at) =>
          !state.birds.some(
            (b) => b.id !== bird.id && b.foraging && same(b.foraging.spot, at),
          ),
      );
      if (!spot) return [];
      const habitat = foodPatches.find((p) => p.id === patch.id)!.habitat;
      const preference = habitat === bird.foragePreference ? 5 : 0;
      const remembered = bird.rememberedForage === patch.id ? 7 : 0;
      const score =
        preference +
        (bird.protein<50&&nextFood(patch)==="protein"?30:0) +
        (bird.satiety<forageTuning.hungry&&nextFood(patch)==="staple"?25:0) +
        remembered +
        patch.remaining * 0.4 -
        distance(bird.at, spot) -
        occupants.length * 2;
      return [{ patch, spot, score }];
    })
    .sort((a, b) => b.score - a.score || a.patch.id.localeCompare(b.patch.id));
  if (!choices[0]) return false;
  bird.foraging = {
    patch: choices[0].patch.id,
    spot: { ...choices[0].spot },
    intent,
    progress: 0,
  };
  bird.resting = false;
  return true;
}
function forageStep(state: Settlement, bird: Worker) {
  const activity = bird.foraging!;
  const patch = state.forage.find((p) => p.id === activity.patch)!;
  if (
    !patch.open ||
    patch.remaining <= state.birds.filter(b=>b.provision?.patch===patch.id&&b.provision.stage==="pickup").length ||
    !feedingSpots(state, patch).some((at) => same(at, activity.spot))
  ) {
    bird.foraging = null;
    return;
  }
  if (!move(state, bird, activity.spot)) return;
  activity.progress++;
  if (activity.progress < forageTuning.scratchTicks) return;
  if (activity.intent === "browse") {
    bird.foraging = null;
    return;
  }
  // Food leaves its place only after real travel and a completed scratch bout.
  const food=nextFood(patch);
  patch.remaining--;
  patch.eaten++;
  if(food==="protein") {patch.proteinEaten++;bird.protein=Math.min(100,bird.protein+economyTuning.proteinBite);bird.satiety=Math.min(100,bird.satiety+8);}
  else bird.satiety = Math.min(100, bird.satiety + forageTuning.biteSatiety);
  bird.rememberedForage = patch.id;
  const name = foodPatches.find((p) => p.id === patch.id)!.name;
  remember(bird, `Found food at ${name}; remembers the productive ground.`);
  activity.progress = 0;
  if (bird.satiety >= forageTuning.satisfied && bird.protein>=50) bird.foraging = null;
  if (patch.remaining === 0)
    for (const visitor of state.birds)
      if (visitor.foraging?.patch === patch.id) visitor.foraging = null;
}
export function forageStatus(state: Settlement, patch: FoodPatch): string {
  const occupied = state.birds.filter(
    (b) => b.foraging?.patch === patch.id,
  ).length;
  if (feedingSpots(state, patch).length === 0)
    return "No feeding room among the existing structures";
  if (!patch.open)
    return `Resting · ${patch.remaining} / ${patch.capacity} food · recovers on daytime ticks`;
  if (patch.remaining === 0)
    return "Picked over · recovers on daytime ticks";
  return `${patch.remaining} / ${patch.capacity} food · ${occupied} / 2 visiting`;
}
/** Food units are removed one at a time; mixed edges alternate their nutrient yield. */
export function nextFood(patch: FoodPatch): Food {
  if (patch.id === "leaf-litter") return "protein";
  if (patch.id === "seed-common") return "staple";
  return (patch.eaten + patch.harvested.staple + patch.harvested.protein) % 2 ? "protein" : "staple";
}
/** Planning estimate: shared habitat recovery counted once, with a 15% reserve.
 * A blended meal/delivery costs a scratch bout plus 18 ticks per average route cell.
 * Carers cannot contribute. This is a conservative forecast, not credited inventory. */
export function growthForecast(state: Settlement, extraCarers=0) {
  const adults=state.birds.filter(b=>b.life.stage==="adult").length;
  const young=state.birds.length-adults;
  const pending=state.economy.broods.filter(b=>b.stage==="laying"||b.stage==="incubating").reduce((n,b)=>n+2-b.eggs.filter(e=>e.child).length,0);
  const capacity=trees.reduce((n,t)=>n+2+shelteredCapacity(state,t.id),0);
  const open=state.forage.filter(p=>p.open&&feedingSpots(state,p).length>0);
  const habitatSupply=Math.floor(open.length*economyTuning.dayTicks/forageTuning.recoveryTicks*.85);
  const yieldPerPatch=economyTuning.dayTicks/forageTuning.recoveryTicks*.85;
  const stapleSupply=Math.floor(open.reduce((n,p)=>n+(p.id==="seed-common"?1:p.id==="insect-verge"?.5:0),0)*yieldPerPatch);
  const proteinSupply=Math.floor(open.reduce((n,p)=>n+(p.id==="leaf-litter"?1:p.id==="insect-verge"?.5:0),0)*yieldPerPatch);
  const courts=state.economy.nurseries.map(n=>groundAccess(state.sites.find(s=>s.id===n.site)!.at));
  const averageDistance=open.length?open.reduce((sum,p)=>sum+Math.min(...(courts.length?courts:[state.piles[0].at]).map(at=>(route(state,at,p.at)?.length??40)-1)),0)/open.length:40;
  const carers=state.birds.filter(b=>b.care).length;
  const foodWorkers=Math.max(0,adults-carers-extraCarers);
  const workerSupply=Math.floor(foodWorkers*economyTuning.dayTicks/(forageTuning.scratchTicks+18*averageDistance));
  const supply=Math.min(habitatSupply,workerSupply);
  const demand=Math.ceil((adults+young+pending)*economyTuning.dayTicks*(forageTuning.satietyDrain/forageTuning.biteSatiety+economyTuning.proteinDrain/economyTuning.proteinBite));
  const activeCare=state.economy.broods.filter(b=>state.birds.some(w=>w.care===b.id)).length;
  const stapleDemand=Math.ceil((adults+young+pending)*economyTuning.dayTicks*forageTuning.satietyDrain/forageTuning.biteSatiety);
  const proteinDemand=Math.ceil((adults+young+pending)*economyTuning.dayTicks*economyTuning.proteinDrain/economyTuning.proteinBite);
  const careDemand=activeCare*Math.ceil((economyTuning.dayTicks+economyTuning.eveningTicks)*2/economyTuning.mealTicks);
  return {adults,young,pending,capacity,committed:state.birds.length+pending,supply,stapleSupply,proteinSupply,stapleDemand,proteinDemand,habitatSupply,workerSupply,averageDistance,foodWorkers,demand,careDemand,spare:capacity-state.birds.length-pending,carers};
}
export function broodReason(state: Settlement, siteId: string, motherId: string): string {
  const site=state.sites.find(s=>s.id===siteId&&s.kind==="nursery"&&s.complete);
  const nursery=state.economy.nurseries.find(n=>n.site===siteId);
  const mother=state.birds.find(b=>b.id===motherId);
  if(!site||!nursery) return "Complete a home and its covered root nursery first.";
  if(nursery.brood && !["complete","failed"].includes(state.economy.broods.find(b=>b.id===nursery.brood)!.stage)) return "This nursery is supporting its current brood.";
  if(!mother||mother.life.stage!=="adult"||mother.life.sex!=="hen"||!mother.life.willing) return "Choose an adult hen who wants to raise a brood.";
  if(mother.care) return `${mother.life.name} is already caring for a brood.`;
  if(!mother.life.fertility || state.tick-mother.life.fertility.tick>economyTuning.fertilityTicks) return `${mother.life.name} has no recent fertility history; a willing, well-fed adult pair must spend time together.`;
  if(mother.satiety<60||mother.protein<50||mother.energy<40) return `${mother.life.name} needs food, protein and rest before laying.`;
  if(nursery.food.staple<2||nursery.food.protein<2) return "Deliver at least 2 staple food and 2 protein food to this nursery.";
  const forecast=growthForecast(state);
  if(forecast.spare<2) return `Two future adult places needed: ${forecast.committed} residents and committed young / ${forecast.capacity} reachable berths. Build another home or deck.`;
  if(forecast.adults-forecast.carers<3) return "Keep at least two other adults available to deliver food while the hen cares.";
  const nextDemand=forecast.demand+forecast.careDemand+Math.ceil(2*economyTuning.dayTicks*(forageTuning.satietyDrain/forageTuning.biteSatiety+economyTuning.proteinDrain/economyTuning.proteinBite))+Math.ceil((economyTuning.dayTicks+economyTuning.eveningTicks)*2/economyTuning.mealTicks);
  const careEach=forecast.careDemand/2+Math.ceil((economyTuning.dayTicks+economyTuning.eveningTicks)/economyTuning.mealTicks);
  const nextStaple=forecast.stapleDemand+Math.ceil(2*economyTuning.dayTicks*forageTuning.satietyDrain/forageTuning.biteSatiety)+careEach;
  const nextProtein=forecast.proteinDemand+Math.ceil(2*economyTuning.dayTicks*economyTuning.proteinDrain/economyTuning.proteinBite)+careEach;
  const shortages=[
    {food:"Staple",need:nextStaple,supply:forecast.stapleSupply,places:"Seedhead Common or Insect Verge"},
    {food:"Protein",need:nextProtein,supply:forecast.proteinSupply,places:"Leaf-litter Hollow or Insect Verge"},
  ].filter(f=>f.need>f.supply).sort((a,b)=>b.need/Math.max(1,b.supply)-a.need/Math.max(1,a.supply));
  if(shortages[0]) {
    const shortage=shortages[0];
    return `${shortage.food} food forecast needs about ${Math.ceil(shortage.need)} per cycle; these open places support ${shortage.supply}. Reopen ${shortage.places}.`;
  }
  const projected=growthForecast(state,1);
  if(nextDemand>projected.supply) return `Food forecast needs ${nextDemand} units / cycle; ${projected.foodWorkers} available adults and these routes support about ${projected.supply}. More food access or grown workers are needed before another brood.`;
  if(!state.forage.some(p=>p.open&&p.id==="leaf-litter")||!state.forage.some(p=>p.open&&p.id!=="leaf-litter")) return "Open both staple and protein habitats for continuing deliveries.";
  return "";
}
export function broodStatus(state: Settlement, brood: Brood): string {
  const nursery=state.economy.nurseries.find(n=>n.site===brood.site)!;
  const mother=state.birds.find(b=>b.id===brood.mother)!;
  if(brood.stage==="failed") return "Unincubated eggs lost viability. The nursery can support a new plan; no chicks were created.";
  if(brood.stage==="complete") return "Both young are adult workers; their nursery and carer remain part of their history.";
  if(!nursery.food.staple || !nursery.food.protein) return `Waiting for local ${!nursery.food.staple ? "staple" : "protein"} food · care and growth pause · choose Provision and reopen its food places · ${mother.life.name} is committed to this brood`;
  if(brood.stage==="laying") return `${mother.life.name} preparing and laying · ${brood.eggs.length}/2 eggs · ${Math.round(brood.progress/economyTuning.layingTicks*100)}%`;
  if(brood.stage==="incubating") return `${mother.life.name} incubating ${brood.eggs.length} fertile eggs · ${Math.round(brood.progress/economyTuning.incubationTicks*100)}% · needs 3 cycles of supplied care`;
  const children=brood.eggs.flatMap(e=>state.birds.find(b=>b.id===e.child)??[]);
  return children.map(b=>`${b.life.name}: ${b.life.stage}, ${Math.round(b.life.development/economyTuning.adultTicks*100)}% grown`).join(" · ");
}
function nurseryAt(state: Settlement, id: string) { return state.economy.nurseries.find(n=>n.site===id); }
function foodIncoming(state: Settlement, id: string, food?: Food) {
  return state.birds.filter(b=>b.provision?.destination===id&&(!food || (b.foodCargo??(b.provision.stage==="pickup"&&nextFood(state.forage.find(p=>p.id===b.provision!.patch)!)))===food)).length;
}
/** Mixed-patch yield changes after every bite/pickup. Uncollected reservations
 * may therefore change food type; release any excess before publishing a tick.
 * Real cargo keeps its capacity reservation and is never discarded. */
function reconcileFoodReservations(state: Settlement) {
  for(const nursery of state.economy.nurseries) for(const food of ["staple","protein"] as const) {
    const candidates=state.birds.filter(b=>b.provision?.destination===nursery.site&&b.provision.stage==="pickup"&&nextFood(state.forage.find(p=>p.id===b.provision!.patch)!)===food);
    let excess=nursery.food[food]+foodIncoming(state,nursery.site,food)-economyTuning.foodCapacity;
    for(const bird of candidates.reverse()) {
      if(excess<=0)break;
      bird.provision=null;
      excess--;
    }
  }
}
function assignProvision(state: Settlement, bird: Worker, urgentOnly=false): boolean {
  for(const nursery of state.economy.nurseries) {
    const active=state.economy.broods.find(b=>b.id===nursery.brood);
    if(urgentOnly&&(!active||["complete","failed"].includes(active.stage)||Math.min(nursery.food.staple,nursery.food.protein)>=economyTuning.urgentNurseryBuffer)) continue;
    const target=urgentOnly ? economyTuning.urgentNurseryBuffer : state.economy.priority==="balanced" ? Math.min(nursery.target,economyTuning.balancedNurseryBuffer) : nursery.target;
    const foods: Food[]=["staple","protein"];
    foods.sort((a,b)=>nursery.food[a]+foodIncoming(state,nursery.site,a)-nursery.food[b]-foodIncoming(state,nursery.site,b));
    const site=state.sites.find(s=>s.id===nursery.site)!;
    for(const food of foods) {
      if(nursery.food[food]+foodIncoming(state,nursery.site,food)>=target)continue;
      const patches=state.forage.filter(p=>p.open&&nextFood(p)===food&&p.remaining>state.birds.filter(b=>b.provision?.patch===p.id&&b.provision.stage==="pickup").length&&feedingSpots(state,p).length>0&&route(state,bird.at,p.at)&&route(state,p.at,groundAccess(site.at)))
        .sort((a,b)=>distance(bird.at,a.at)+distance(a.at,groundAccess(site.at))-distance(bird.at,b.at)-distance(b.at,groundAccess(site.at))||a.id.localeCompare(b.id));
      if(patches[0]){bird.provision={patch:patches[0].id,destination:nursery.site,stage:"pickup",progress:0};return true;}
    }
  }
  return false;
}
function provisionStep(state: Settlement, bird: Worker) {
  const task=bird.provision!;
  const patch=state.forage.find(p=>p.id===task.patch)!;
  const nursery=nurseryAt(state,task.destination)!;
  const site=state.sites.find(s=>s.id===task.destination)!;
  if(task.stage==="pickup") {
    if(!patch.open||!patch.remaining){bird.provision=null;return;}
    if(!move(state,bird,patch.at))return;
    if(++task.progress<forageTuning.scratchTicks)return;
    const food=nextFood(patch);
    // Mixed yield can change while travelling; capacity is checked against actual cargo.
    if(nursery.food[food]+foodIncoming(state,nursery.site,food)>economyTuning.foodCapacity){bird.provision=null;return;}
    patch.remaining--;patch.harvested[food]++;bird.foodCargo=food;
    task.stage="deliver";task.progress=0;
  } else {
    if(!move(state,bird,groundAccess(site.at)))return;
    const food=bird.foodCargo!;
    if(nursery.food[food]>=economyTuning.foodCapacity)return;
    nursery.food[food]++;bird.foodCargo=null;bird.provision=null;bird.deliveries++;
    remember(bird,`Delivered ${food} food to the root nursery at ${trees.find(t=>t.id===site.tree)!.name}.`);
  }
}
function childWorker(state: Settlement, brood: Brood, ordinal: number): Worker {
  const mother=state.birds.find(b=>b.id===brood.mother)!;
  const site=state.sites.find(s=>s.id===brood.site)!;
  const born=state.birds.filter(b=>b.life.mother).length;
  const name=offspringNames[born%offspringNames.length]+(born>=offspringNames.length?` ${Math.floor(born/offspringNames.length)+1}`:"");
  return {id:`chick-${state.nextId++}`, life:{...initialLife(mother.life.appearance),name,sex:ordinal%2?"rooster":"hen",stage:"chick",age:0,development:0,mother:brood.mother,father:brood.father,carer:brood.carer,bornAt:site.tree,bond:0,willing:true},protein:85,foodCargo:null,provision:null,care:null,lift:null,...initialAppetite(mother.life.appearance),at:groundAccess(site.at),edge:null,cargo:0,gatheringProgress:0,job:null,energy:75,resting:false,deliveries:0,attachment:null,memories:[`Hatched in the root nursery at ${trees.find(t=>t.id===site.tree)!.name}; ${mother.life.name} kept the eggs warm.`],perch:null,flight:null};
}
function careStep(state: Settlement, bird: Worker): boolean {
  const brood=state.economy.broods.find(b=>b.id===bird.care)!;
  const nursery=nurseryAt(state,brood.site)!;
  const site=state.sites.find(s=>s.id===brood.site)!;
  if(!move(state,bird,groundAccess(site.at)))return true;
  bird.resting=false;
  if(!nursery.food.staple||!nursery.food.protein){brood.shortageTicks++;return true;}
  if(++brood.mealProgress>=economyTuning.mealTicks) {
    nursery.food.staple--;nursery.food.protein--;state.economy.foodConsumed.staple++;state.economy.foodConsumed.protein++;
    bird.satiety=Math.min(100,bird.satiety+40);bird.protein=Math.min(100,bird.protein+35);brood.mealProgress=0;
  }
  if(bird.satiety<forageTuning.hungry||bird.protein<economyTuning.proteinMinimum){brood.shortageTicks++;return true;}
  brood.careTicks++;bird.energy=Math.max(40,bird.energy-.002);
  if(brood.stage==="laying") {
    const next=brood.progress+1;
    if(next%(economyTuning.layingTicks/2)===0) {
      if(!nursery.food.staple||!nursery.food.protein){brood.shortageTicks++;return true;}
      nursery.food.staple--;nursery.food.protein--;state.economy.foodConsumed.staple++;state.economy.foodConsumed.protein++;
      brood.eggs.push({id:`egg-${brood.id}-${brood.eggs.length}`,laidAt:state.tick,fertile:true,viable:true,child:null,hatchTick:null});
    }
    brood.progress=next;
    if(brood.progress===economyTuning.layingTicks){brood.stage="incubating";brood.progress=0;remember(bird,`Laid two fertile eggs at ${trees.find(t=>t.id===site.tree)!.name}; stays to incubate them.`);}
  } else if(brood.stage==="incubating") {
    if(++brood.progress===economyTuning.incubationTicks) {
      for(let i=0;i<brood.eggs.length;i++) {
        const egg=brood.eggs[i];
        if(!egg.viable||egg.child)continue;
        const child=childWorker(state,brood,i);state.birds.push(child);egg.child=child.id;egg.hatchTick=state.tick;
        remember(bird,`Kept ${child.life.name} warm from egg to chick at ${trees.find(t=>t.id===site.tree)!.name}.`);
      }
      brood.stage="chicks";brood.progress=0;
    }
  } else if(brood.stage==="chicks") {
    for(const egg of brood.eggs) {
      const child=state.birds.find(b=>b.id===egg.child);
      if(!child||child.life.stage!=="chick")continue;
      child.life.development++;child.life.bond++;child.satiety=Math.max(80,child.satiety);child.protein=Math.max(80,child.protein);
      if(child.life.development>=economyTuning.juvenileTicks) {
        child.life.stage="juvenile";child.attachment=site.tree;
        remember(child,`${bird.life.name}'s continuing care made ${trees.find(t=>t.id===site.tree)!.name} feel like home.`);
      }
    }
    if(brood.eggs.every(e=>state.birds.find(b=>b.id===e.child)?.life.stage!=="chick")) {
      bird.care=null;remember(bird,`The young at ${trees.find(t=>t.id===site.tree)!.name} can now feed themselves; returned to community work.`);
    }
  }
  return true;
}
function economyTick(state: Settlement) {
  for(const patch of state.patches) {
    if(patch.remaining===patch.capacity){patch.recoveryProgress=0;continue;}
    if(state.phase==="day"&&++patch.recoveryProgress>=economyTuning.reedRecoveryTicks){patch.remaining++;patch.regrown++;patch.recoveryProgress=0;}
  }
  for(const bird of state.birds) {
    bird.life.age++;
    if(bird.life.stage==="adult"&&bird.life.sex==="hen"&&bird.life.willing&&!bird.care&&!bird.perch&&!bird.flight&&state.phase==="day"&&bird.satiety>=60&&bird.protein>=50) {
      const partner=state.birds.find(b=>b.id!==bird.id&&b.life.stage==="adult"&&b.life.sex==="rooster"&&b.life.willing&&b.satiety>=60&&b.protein>=50&&distance(b.at,bird.at)<=1&&!b.perch&&!b.flight);
      if(partner) {
        if(++bird.life.matingProgress>=economyTuning.matingTicks) {bird.life.fertility={father:partner.id,tick:state.tick};bird.life.matingProgress=0;remember(bird,`Spent willing time with ${partner.life.name}; a recent fertile pairing is remembered.`);}
      } else bird.life.matingProgress=0;
    }
  }
  for(const brood of state.economy.broods) {
    if(brood.stage==="laying"&&brood.eggs.some(e=>!e.child&&state.tick-e.laidAt>economyTuning.eggViabilityTicks)) {
      brood.stage="failed";brood.eggs.forEach(e=>{e.viable=false;});const carer=state.birds.find(b=>b.id===brood.carer)!;carer.care=null;remember(carer,"The unincubated eggs lost viability while the nursery waited for support.");
    }
    if(brood.stage==="chicks"&&brood.eggs.every(e=>state.birds.find(b=>b.id===e.child)?.life.stage==="adult"))brood.stage="complete";
  }
}

export function step(current: Settlement): Settlement {
  if (current.paused) return current;
  let state = structuredClone(current);
  state.tick++;
  const clock=state.economy.clock;
  if(clock.automatic&&++clock.phaseTick >= (state.phase==="day"?economyTuning.dayTicks:economyTuning.eveningTicks)) {
    const phase=state.phase==="day"?"evening":"day";
    if(phase==="day")clock.day++;
    state=command(state,{type:"phase",phase});
  }
  economyTick(state);
  if (state.phase === "day")
    for (const patch of state.forage) {
      if (patch.remaining === patch.capacity) {
        patch.recoveryProgress = 0;
        continue;
      }
      patch.recoveryProgress++;
      if (patch.recoveryProgress >= forageTuning.recoveryTicks) {
        patch.remaining++;
        patch.regrown++;
        patch.recoveryProgress = 0;
      }
    }
  const juvenilesAtStart=new Set(state.birds.filter(b=>b.life.stage==="juvenile").map(b=>b.id));
  for (const bird of [...state.birds]) {
    if(bird.life.stage==="chick")continue;
    if(bird.life.stage==="juvenile") {
      if(juvenilesAtStart.has(bird.id)&&bird.satiety>=forageTuning.hungry&&bird.protein>=economyTuning.proteinMinimum)bird.life.development++;
      if(bird.life.development>=economyTuning.adultTicks) {
        bird.life.stage="adult";
        remember(bird,`Grew into community work; remembers ${state.birds.find(b=>b.id===bird.life.carer)?.life.name??"a carer"} and the nursery at ${trees.find(t=>t.id===bird.life.bornAt)?.name}.`);
      }
    }
    if (state.phase === "day") {
      bird.protein=Math.max(0,bird.protein-economyTuning.proteinDrain);
      bird.satiety = Math.max(0, bird.satiety - forageTuning.satietyDrain);
    }
    if (bird.flight) {
      bird.flight.progress += bird.flight.direction === "up" ? 0.035 : -0.035;
      if (bird.flight.progress >= 1) {
        bird.perch = {
          tree: bird.flight.tree,
          slot: bird.flight.slot,
          sheltered: bird.flight.sheltered,
        };
        const tree = trees.find((t) => t.id === bird.flight!.tree)!;
        bird.at = { x: tree.x, z: tree.z };
        bird.flight = null;
        remember(
          bird,
          `Slept ${bird.perch.sheltered ? "under woven shelter" : "on a natural branch"} at ${tree.name}.`,
        );
      } else if (bird.flight.progress <= 0) {
        bird.at = {
          x: Math.round(bird.flight.from.x),
          z: Math.round(bird.flight.from.z),
        };
        bird.flight = null;
      }
      continue;
    }
    if (bird.perch) {
      const cap = bird.perch.sheltered ? 100 : 80;
      if (bird.energy < cap)
        bird.energy = Math.min(
          cap,
          bird.energy + (bird.perch.sheltered ? 0.25 : 0.16),
        );
      continue;
    }
    // Legacy saves may stand on, or finish an already committed edge through, a
    // trunk. Egress before taking new work; an active old lift must finish first.
    const trunk = !bird.lift && trees.find(t => same(t, bird.at));
    if (trunk) {
      move(state, bird, bird.edge?.to ?? treeWorkCell(trunk.id));
      continue;
    }
    if (bird.edge && !bird.job && !bird.foraging && !bird.provision && !bird.care) {
      move(state, bird, bird.edge.to);
      continue;
    }
    if (state.phase === "day") {
      // Carried goods always reach their destination. Interrupt uncollected work only
      // at a ground-cell boundary, preserving every committed material bundle.
      if (
        (bird.satiety <= forageTuning.hungry || bird.protein < economyTuning.proteinMinimum) &&
        !bird.cargo && !bird.foodCargo &&
        !bird.edge &&
        (!bird.foraging || bird.foraging.intent === "browse")
      ) {
        if (chooseForage(state, bird, "eat")) {
          bird.job = null;
          bird.gatheringProgress = 0;
          bird.provision=null;
        }
      }
      if (bird.foraging) {
        if (bird.foraging.intent === "browse" && !bird.edge) {
          assign(state, bird);
          if (bird.job || bird.provision || bird.care) bird.foraging = null;
        }
        if (bird.foraging) {
          forageStep(state, bird);
          continue;
        }
      }
    }
    if(bird.provision){provisionStep(state,bird);continue;}
    if(bird.care&&!bird.cargo){careStep(state,bird);continue;}
    if(bird.life.stage==="juvenile") {
      if(state.phase==="evening"){
        const brood=state.economy.broods.find(b=>b.eggs.some(e=>e.child===bird.id))!;
        move(state,bird,groundAccess(state.sites.find(s=>s.id===brood.site)!.at));
        bird.energy=Math.min(80,bird.energy+.16);
      } else if(!bird.foraging&&(bird.satiety<forageTuning.satisfied||bird.protein<60)) {
        if(chooseForage(state,bird,"eat"))forageStep(state,bird);
      }
      continue;
    }
    if (!bird.job && state.phase === "evening") {
      settle(state, bird);
      continue;
    }
    if (!bird.job && (bird.resting || bird.energy < 28)) {
      bird.resting = bird.energy < 75;
      if (bird.energy < 75) bird.energy = Math.min(75, bird.energy + 0.2);
      continue;
    }
    if (!bird.job && state.phase === "day") assign(state, bird);
    if(bird.provision){provisionStep(state,bird);continue;}
    const job = bird.job;
    if (!job) {
      const index = state.birds.findIndex((b) => b.id === bird.id);
      if (
        state.phase === "day" &&
        (state.tick + index * 25) % forageTuning.browseInterval === 1 &&
        chooseForage(state, bird, "browse")
      )
        forageStep(state, bird);
      if (bird.energy < 80) bird.energy = Math.min(80, bird.energy + 0.04);
      continue;
    }
    const to = destination(state, bird);
    // A saved v4 lift may already be operating at the old trunk cell. Finish that
    // reserved lift in place; subsequent trips use the adjacent work cell.
    if (!to || (!bird.lift && !move(state, bird, to))) continue;
    if (job.kind === "build") {
      const site = state.sites.find((s) => s.id === job.destination)!;
      if (!readyForBuild(state, site)) {
        bird.job = null;
        continue;
      }
      site.progress = Math.min(30, site.progress + 1);
      bird.energy = Math.max(0, bird.energy - 0.08);
      if (site.progress === 30) {
        site.contributors = [...new Set([...site.contributors, bird.id])];
        bird.job = null;
        if (site.delivered === cost(site)) completeSite(state, site, bird);
      }
    } else if (job.kind === "gather" && job.stage === "pickup") {
      const patch = state.patches.find((p) => p.id === job.source)!;
      if (!patch.designated || patch.remaining === 0 || state.phase !== "day") {
        bird.job = null;
        bird.gatheringProgress = 0;
        continue;
      }
      const target = location(state, job.destination);
      if (!target || !route(state, patch.at, target.at)) continue;
      bird.gatheringProgress++;
      bird.energy = Math.max(0, bird.energy - 0.08);
      if (bird.gatheringProgress === tuning.gatherTicks) {
        patch.remaining--;
        patch.harvested++;
        state.harvestedReeds++;
        state.totalReeds++;
        bird.cargo = 1;
        bird.gatheringProgress = 0;
        job.stage = "deliver";
        remember(
          bird,
          `Gathered construction reeds at the ${patch.id === "patch-west" ? "western" : "eastern"} patch.`,
        );
      }
    } else if (job.stage === "pickup") {
      const source = location(state, job.source);
      if (!source || source.stock < 1) {
        bird.job = null;
        continue;
      }
      source.stock--;
      bird.cargo = 1;
      job.stage = "deliver";
    } else {
      const target = location(state, job.destination);
      const site = state.sites.find(
        (s) => s.id === job.destination && !s.complete,
      );
      if (site) {
        const prototype =
          site.kind === "hauling-basket" && !state.basketTechnique;
        const basket =
          site.kind === "sleeping-deck" && site.tree
            ? basketForTree(state, site.tree)
            : prototype && site.delivered === 3
              ? site
              : undefined;
        if (prototype && site.delivered === 3 && site.progress < 30) continue;
        if (basket || bird.lift) {
          const liftingBasket =
            basket ?? state.sites.find((s) => s.id === bird.lift!.basket)!;
          if (!bird.lift) {
            if (state.birds.some((b) => b.lift?.basket === liftingBasket.id))
              continue;
            bird.lift = { basket: liftingBasket.id, progress: 0 };
          }
          bird.lift.progress = Math.min(
            1,
            bird.lift.progress + 1 / tuning.liftTicks,
          );
          if (bird.lift.progress < 1) continue;
          bird.lift = null;
          remember(
            bird,
            `Raised a construction bundle with the basket at ${trees.find((t) => t.id === site.tree)!.name}.`,
          );
          if (prototype) {
            state.basketTechnique = {
              inventor: bird.id,
              tree: site.tree!,
              tick: state.tick,
            };
            site.experiment = true;
            // Discovery changes all pending prototypes to ordinary supplied work.
            // Earlier birds may already have woven this tick; release their now
            // ineligible jobs immediately so the resulting state remains saveable.
            for (const builder of state.birds) {
              if (builder.job?.kind !== "build") continue;
              const pending = state.sites.find(
                (s) => s.id === builder.job!.destination,
              );
              if (pending && !readyForBuild(state, pending)) builder.job = null;
            }
            remember(
              bird,
              `Demonstrated the first hauling basket at ${trees.find((t) => t.id === site.tree)!.name}; the coop learned the technique.`,
            );
          }
        }
        site.delivered += bird.cargo;
        site.contributors = [...new Set([...site.contributors, bird.id])];
        if (site.progress === 30 && site.delivered === cost(site))
          completeSite(state, site, bird);
      } else if (target) {
        if ("complete" in target && target.stock >= tuning.storeCapacity)
          continue;
        target.stock += bird.cargo;
      } else continue;
      bird.cargo = 0;
      bird.deliveries++;
      if (bird.deliveries === 3)
        remember(bird, "Three deliveries taught a surer carrying rhythm.");
      bird.job = null;
    }
  }
  reconcileFoodReservations(state);
  return state;
}
export function workerStatus(state: Settlement, bird: Worker): string {
  if(bird.foodCargo)return `Carrying ${bird.foodCargo} food to a local nursery · reed work waits until delivery`;
  if(bird.provision)return bird.provision.progress?`Gathering ${nextFood(state.forage.find(p=>p.id===bird.provision!.patch)!)} food for a nursery`:`Walking to gather nursery food`;
  if(!bird.foraging&&bird.care) {
    const brood=state.economy.broods.find(b=>b.id===bird.care)!;
    return `${same(bird.at,groundAccess(state.sites.find(s=>s.id===brood.site)!.at))?"Caring at":"Walking to"} the root nursery · ${broodStatus(state,brood)} · unavailable for building`;
  }
  if(bird.life.stage==="chick")return `Dependent chick · grounded root nursery · ${Math.round(bird.life.development/economyTuning.juvenileTicks*100)}% to juvenile · care from ${state.birds.find(b=>b.id===bird.life.carer)?.life.name}`;
  if(bird.life.stage==="juvenile"&&!bird.foraging)return `Growing juvenile · grounded; self-feeding, no adult work or flight yet · ${Math.round(bird.life.development/economyTuning.adultTicks*100)}% to adult`;

  if (bird.lift)
    return `Operating the hauling basket · raising a real reed bundle · ${Math.round(bird.lift.progress * 100)}%`;
  if (bird.cargo && bird.job?.kind === "haul") {
    const site = state.sites.find((s) => s.id === bird.job!.destination);
    if (
      site?.kind === "hauling-basket" &&
      !state.basketTechnique &&
      site.delivered === 3 &&
      site.progress < 30 &&
      same(bird.at, groundAccess(site.at)) &&
      !bird.edge
    )
      return "Keeping the final bundle secure while the basket is woven";
  }
  if (bird.flight)
    return `${bird.flight.direction === "up" ? (bird.flight.sheltered ? "Approaching / climbing the ladder" : "Flying up to a natural branch") : "Returning to the ground"} at ${trees.find((t) => t.id === bird.flight!.tree)!.name}`;
  if (bird.perch)
    return `${bird.perch.sheltered ? "Sheltered" : "Natural branch"} rest at ${trees.find((t) => t.id === bird.perch!.tree)!.name} · perch ${bird.perch.slot + 1}`;
  if (bird.foraging) {
    const activity = bird.foraging;
    const patch = foodPatches.find((p) => p.id === activity.patch)!;
    const reason =
      activity.intent === "eat"
        ? "Appetite prompted a food break"
        : "Browsing while work is quiet";
    const remembered =
      bird.rememberedForage === activity.patch
        ? "; remembers finding food here"
        : "";
    const preference =
      bird.foragePreference === "cover"
        ? "sheltered litter"
        : bird.foragePreference === "open"
          ? "open seedheads"
          : "mixed edges";
    const action =
      same(bird.at, activity.spot) && !bird.edge
        ? `${activity.intent === "eat" ? "Scratching for food" : "Browsing and scratching"} · ${Math.round((activity.progress / forageTuning.scratchTicks) * 100)}%`
        : "Walking to forage";
    return `${action} at ${patch.name} · ${reason}; favors ${preference}${remembered}`;
  }
  if (bird.resting)
    return bird.satiety <= forageTuning.hungry
      ? "Resting on the ground; hungry and waiting for an open food place with room"
      : "Resting on the ground before returning to work";
  if (bird.job) {
    const to = destination(state, bird);
    const gatherTarget =
      bird.job.kind === "gather" && bird.job.stage === "pickup"
        ? location(state, bird.job.destination)
        : undefined;
    const blocked =
      (bird.job.kind === "gather" &&
        bird.job.stage === "pickup" &&
        (!gatherTarget || !to || !route(state, to, gatherTarget.at))) ||
      !to ||
      !route(state, bird.at, to);
    if (blocked)
      return `Destination unavailable — ${bird.cargo ? "keeping a carried bundle secure" : "waiting for available work"}`;
    if (bird.job.kind === "gather" && !bird.cargo)
      return bird.gatheringProgress > 0
        ? `Gathering reeds · ${Math.round((bird.gatheringProgress / tuning.gatherTicks) * 100)}%`
        : "Walking to gather reserved reeds";
    if (bird.job.kind === "build")
      return "Weaving the delivered reeds into a useful structure";
    return bird.cargo
      ? bird.job.kind === "return"
        ? "Returning a canceled site's bundle to the source"
        : "Carrying a reed bundle to its destination"
      : "Walking to collect a reserved bundle";
  }
  if (state.phase === "evening")
    return "Looking for an unoccupied sleeping perch";
  return bird.satiety <= forageTuning.hungry
    ? "Hungry · waiting for an open food place with room"
    : "Available · watching for useful work, with occasional browsing";
}

export function siteStatus(state: Settlement, site: Site) {
  const operator = state.birds.find(
    (b) =>
      b.lift && (b.lift.basket === site.id || b.job?.destination === site.id),
  );
  if (operator)
    return `${operator.life.name} raising a construction bundle · ${Math.round(operator.lift!.progress * 100)}%`;
  if (site.complete)
    return site.kind === "nursery"
      ? `Covered root nursery · 2 grounded care places · ${nurseryAt(state,site.id)?.food.staple??0} staple / ${nurseryAt(state,site.id)?.food.protein??0} protein food`
      : site.kind === "store"
      ? `${site.stock} / ${tuning.storeCapacity} reeds stored locally`
      : site.kind === "sleeping-deck"
        ? "Two extra sheltered berths ready · ladder access"
        : site.kind === "hauling-basket"
          ? `${site.experiment ? "First demonstrated basket" : "Hauling basket ready"} · lifts deck construction bundles`
          : "Two sheltered perches ready · ladder access";
  if (
    ![
      ...state.piles,
      ...state.sites.filter((p) => p.complete && p.kind === "store"),
    ].some((p) => available(state, p.id) > 0 && route(state, groundAccess(p.at), groundAccess(site.at))) &&
    site.delivered + incoming(state, site.id) < cost(site)
  )
    return "Needs available local construction reeds";
  if (
    state.birds.some(
      (b) =>
        b.job?.destination === site.id &&
        workerStatus(state, b).startsWith("Destination unavailable"),
    )
  )
    return "Carrier waiting for an available destination; goods remain with the bird";
  if (
    site.kind === "hauling-basket" &&
    !state.basketTechnique &&
    site.delivered >= 3
  )
    return site.progress < 30
      ? `Weaving prototype · ${Math.round((site.progress / 30) * 100)}% · final bundle reserved for demonstration`
      : "Basket woven · waiting for the final bundle to be raised";
  return site.delivered === cost(site)
    ? `Weaving · ${Math.round((site.progress / 30) * 100)}%`
    : `${site.delivered} / ${cost(site)} reeds at site · ${incoming(state, site.id)} assigned`;
}

export function patchStatus(state: Settlement, patch: ReedPatch): string {
  if (patch.remaining === 0)
    return `Cut back · new construction reeds recover on day ticks (${patch.recoveryProgress}/${economyTuning.reedRecoveryTicks})`;
  if (!patch.designated)
    return `${patch.remaining} / ${patch.capacity} reeds · designate to gather`;
  const jobs = state.birds.filter(
    (b) =>
      b.job?.kind === "gather" &&
      b.job.source === patch.id &&
      b.job.stage === "pickup",
  );
  if (
    jobs.some((b) =>
      workerStatus(state, b).startsWith("Destination unavailable"),
    )
  )
    return "Gatherer waiting for storage";
  const targets = [
    ...state.piles.filter((p) => p.kind === "source"),
    ...state.sites.filter(
      (s) =>
        s.complete &&
        s.kind === "store" &&
        s.stock + incoming(state, s.id) < tuning.storeCapacity,
    ),
  ];
  if (
    !state.birds.some((b) => route(state, b.at, patch.at)) ||
    !targets.some((p) => route(state, patch.at, p.at))
  )
    return "Waiting for available local storage";
  if (state.phase === "evening") return "Gathering resumes by day";
  return `${patch.remaining} / ${patch.capacity} reeds · ${jobs.length} gathering`;
}
