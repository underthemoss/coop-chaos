import { habitatAnchor, habitatPosition, treeHabitat, treeWorkCell, type HabitatAnchor } from "../content/tree-habitats";
import {
  foodPatches,
  forageTuning,
  reedPatches,
  settlers,
  trees,
  tuning,
} from "../content/settlement";
import type {
  FoodPatchId,
  ForagePreference,
  SettlerId,
  TreeId,
} from "../content/settlement";
export type Cell = { x: number; z: number };
export type BuildKind =
  "treehouse" | "store" | "sleeping-deck" | "hauling-basket";
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
export type FoodPatch = {
  id: FoodPatchId;
  at: Cell;
  capacity: number;
  remaining: number;
  eaten: number;
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
  site.kind === "treehouse"
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
  return (["treehouse", "sleeping-deck", "hauling-basket"] as const).map(
    (kind) => {
      const existing = state.sites.some(
        (s) => s.tree === tree && s.kind === kind,
      );
      const reason =
        state.phase !== "day"
          ? "Begin day before placing construction."
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
          kind === "treehouse"
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
  if (!site.tree) return;
  const name = trees.find((t) => t.id === site.tree)!.name;
  for (const id of site.contributors) {
    const contributor = state.birds.find((b) => b.id === id)!;
    if (site.kind === "treehouse") {
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
  }));
}
export function initialForage(): FoodPatch[] {
  return foodPatches.map((p) => ({
    id: p.id,
    at: { ...p.at },
    capacity: p.capacity,
    remaining: p.capacity,
    eaten: 0,
    regrown: 0,
    recoveryProgress: 0,
    open: true,
  }));
}
export function initialAppetite(id: SettlerId) {
  return {
    satiety: forageTuning.initialSatiety as number,
    foragePreference: settlers.find((b) => b.id === id)!.foragePreference,
    rememberedForage: null,
    foraging: null,
  };
}
export function initialSettlement(): Settlement {
  return {
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
  if (action.type === "forage") {
    const patch = state.forage.find((p) => p.id === action.id);
    if (!patch) throw new Error("Choose an existing food place.");
    patch.open = action.open;
    if (!patch.open)
      for (const bird of state.birds)
        if (bird.foraging?.patch === patch.id) bird.foraging = null;
  }
  if (action.type === "build") {
    if (!validCell(action.at))
      throw new Error("Choose a cell in the marked glade.");
    if (state.phase !== "day")
      throw new Error("Begin day before placing construction.");
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
    for (const bird of state.birds) {
      bird.foraging = null;
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
  const fixture = settlers.find((s) => s.id === bird.id)!;
  bird.edge.progress +=
    0.07 *
    fixture.pace *
    (bird.deliveries >= 3 ? 1.12 : 1) *
    (bird.energy < 35 ? 0.65 : 1);
  bird.energy = Math.max(0, bird.energy - 0.035);
  if (bird.edge.progress >= 1) {
    bird.at = bird.edge.to;
    bird.edge = null;
  }
  return same(bird.at, to) && !bird.edge;
}
function assign(state: Settlement, bird: Worker) {
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
  const fixture = settlers.find((b) => b.id === bird.id)!;
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
    (p) => p.capacity + p.regrown === p.remaining + p.eaten,
  );
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
        patch.remaining === 0 ||
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
    patch.remaining === 0 ||
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
  patch.remaining--;
  patch.eaten++;
  bird.satiety = Math.min(100, bird.satiety + forageTuning.biteSatiety);
  bird.rememberedForage = patch.id;
  const name = foodPatches.find((p) => p.id === patch.id)!.name;
  remember(bird, `Found food at ${name}; remembers the productive ground.`);
  activity.progress = 0;
  if (bird.satiety >= forageTuning.satisfied) bird.foraging = null;
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
    return `Resting · ${patch.remaining} / ${patch.capacity} food · recovers while unused by day`;
  if (patch.remaining === 0)
    return "Picked over · recovers while unused by day";
  return `${patch.remaining} / ${patch.capacity} food · ${occupied} / 2 visiting`;
}
export function step(current: Settlement): Settlement {
  if (current.paused) return current;
  const state = structuredClone(current);
  state.tick++;
  if (state.phase === "day")
    for (const patch of state.forage) {
      if (patch.remaining === patch.capacity) {
        patch.recoveryProgress = 0;
        continue;
      }
      if (state.birds.some((b) => b.foraging?.patch === patch.id)) continue;
      patch.recoveryProgress++;
      if (patch.recoveryProgress >= forageTuning.recoveryTicks) {
        patch.remaining++;
        patch.regrown++;
        patch.recoveryProgress = 0;
      }
    }
  for (const bird of state.birds) {
    if (state.phase === "day")
      bird.satiety = Math.max(0, bird.satiety - forageTuning.satietyDrain);
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
    if (bird.edge && !bird.job && !bird.foraging) {
      move(state, bird, bird.edge.to);
      continue;
    }
    if (state.phase === "day") {
      // Carried goods always reach their destination. Interrupt uncollected work only
      // at a ground-cell boundary, preserving every committed material bundle.
      if (
        bird.satiety <= forageTuning.hungry &&
        !bird.cargo &&
        !bird.edge &&
        (!bird.foraging || bird.foraging.intent === "browse")
      ) {
        if (chooseForage(state, bird, "eat")) {
          bird.job = null;
          bird.gatheringProgress = 0;
        }
      }
      if (bird.foraging) {
        if (bird.foraging.intent === "browse" && !bird.edge) {
          assign(state, bird);
          if (bird.job) bird.foraging = null;
        }
        if (bird.foraging) {
          forageStep(state, bird);
          continue;
        }
      }
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
    const job = bird.job;
    if (!job) {
      const index = settlers.findIndex((b) => b.id === bird.id);
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
  return state;
}
export function workerStatus(state: Settlement, bird: Worker): string {
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
    return `${settlers.find((b) => b.id === operator.id)!.name} raising a construction bundle · ${Math.round(operator.lift!.progress * 100)}%`;
  if (site.complete)
    return site.kind === "store"
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
    return "Depleted · all construction reeds gathered";
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
