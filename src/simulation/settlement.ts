import { reedPatches, settlers, trees, tuning } from "../content/settlement";
import type { SettlerId, TreeId } from "../content/settlement";
export type Cell = { x: number; z: number };
export type BuildKind = "treehouse" | "store";
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
export type Worker = {
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
  tick: number;
  phase: "day" | "evening";
  paused: boolean;
  nextId: number;
  paths: string[];
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
  | { type: "path"; at: Cell; remove?: boolean }
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
  site.kind === "treehouse" ? tuning.treehouseCost : tuning.storeCost;
export function initialPatches(): ReedPatch[] {
  return reedPatches.map((p) => ({
    ...structuredClone(p),
    remaining: p.capacity,
    harvested: 0,
    designated: false,
  }));
}
export function initialSettlement(): Settlement {
  return {
    tick: 0,
    phase: "day",
    paused: false,
    nextId: 1,
    paths: ["-3,-2"],
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
export function route(state: Settlement, from: Cell, to: Cell): Cell[] | null {
  if (!state.paths.includes(key(from)) || !state.paths.includes(key(to)))
    return null;
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
      if (!visited.has(key(n)) && state.paths.includes(key(n))) {
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
  if (action.type === "path") {
    if (!validCell(action.at))
      throw new Error("Choose a cell in the marked glade.");
    const id = key(action.at);
    if (action.remove) state.paths = state.paths.filter((p) => p !== id);
    else if (!state.paths.includes(id)) state.paths.push(id);
  }
  if (action.type === "build") {
    if (!validCell(action.at))
      throw new Error("Choose a cell in the marked glade.");
    if (state.phase !== "day")
      throw new Error("Begin day before placing construction.");
    const tree = trees.find((t) => same(t, action.at));
    if (
      state.sites.some((s) => same(s.at, action.at)) ||
      state.piles.some((p) => p.kind === "source" && same(p.at, action.at)) ||
      state.patches.some((p) => same(p.at, action.at))
    )
      throw new Error("This place is already occupied.");
    if (action.kind === "treehouse" && !tree)
      throw new Error("Treehouses need one of the three marked trees.");
    if (action.kind === "store" && tree)
      throw new Error("Leave the trunk clear; choose another ground cell.");
    state.sites.push({
      id: `site-${state.nextId++}`,
      kind: action.kind,
      at: { x: action.at.x, z: action.at.z },
      tree: action.kind === "treehouse" ? tree!.id : null,
      delivered: 0,
      progress: 0,
      complete: false,
      stock: 0,
      target: 0,
      contributors: [],
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
            from: { ...bird.at },
          };
          bird.perch = null;
        } else if (bird.flight?.direction === "up")
          bird.flight.direction = "down";
      }
    }
  }
  return state;
}
function destination(state: Settlement, bird: Worker): Cell | undefined {
  if (!bird.job) return undefined;
  if (bird.job.stage === "pickup")
    return bird.job.kind === "gather"
      ? state.patches.find((p) => p.id === bird.job!.source)?.at
      : location(state, bird.job.source)?.at;
  return (
    location(state, bird.job.destination)?.at ??
    state.sites.find((s) => s.id === bird.job!.destination)?.at
  );
}
function move(state: Settlement, bird: Worker, to: Cell): boolean {
  if (same(bird.at, to) && !bird.edge) return true;
  if (!bird.edge) {
    const path = route(state, bird.at, to);
    if (!path || path.length < 2) return false;
    bird.edge = { to: path[1], progress: 0 };
  }
  if (
    !state.paths.includes(key(bird.at)) ||
    !state.paths.includes(key(bird.edge.to))
  )
    return false;
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
      site.delivered === cost(site) &&
      !state.birds.some(
        (b) => b.job?.kind === "build" && b.job.destination === site.id,
      ) &&
      route(state, bird.at, site.at)
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
          route(state, bird.at, p.at) &&
          route(state, p.at, site.at),
      )
      .sort(
        (a, b) =>
          route(state, a.at, site.at)!.length -
            route(state, b.at, site.at)!.length || a.id.localeCompare(b.id),
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
    const improved = state.sites.some((s) => s.complete && s.tree === tree.id);
    const slots: Perch[] = [];
    const shelteredFirst = bird.id !== "rook" || bird.attachment === tree.id;
    for (const sheltered of shelteredFirst ? [true, false] : [false, true])
      if (!sheltered || improved)
        for (let slot = 0; slot < 2; slot++)
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
export function perchPosition(perch: Perch) {
  const tree = trees.find((t) => t.id === perch.tree)!;
  return {
    x: tree.x + (perch.slot === 0 ? -0.43 : 0.43),
    z: tree.z - (perch.sheltered ? 0.25 : -0.23),
    y: perch.sheltered ? 2.25 : 3.15 + perch.slot * 0.18,
  };
}
export function birdPosition(bird: Worker) {
  const perch = bird.perch ?? bird.flight;
  if (!perch) return { ...groundPosition(bird), y: 0 };
  const end = perchPosition(perch);
  if (!bird.flight) return end;
  const f = bird.flight;
  const t = f.progress;
  // Improved platforms have a readable ground approach followed by a ladder ascent.
  if (f.sheltered) {
    const tree = trees.find((t) => t.id === f.tree)!;
    const base = { x: tree.x, z: tree.z - 0.54 };
    const approach = Math.min(1, t / 0.4);
    const climb = Math.min(1, Math.max(0, (t - 0.4) / 0.45));
    const exit = Math.max(0, (t - 0.85) / 0.15);
    return {
      x: f.from.x + (base.x - f.from.x) * approach + (end.x - base.x) * exit,
      z: f.from.z + (base.z - f.from.z) * approach + (end.z - base.z) * exit,
      y: end.y * climb,
    };
  }
  return {
    x: f.from.x + (end.x - f.from.x) * t,
    z: f.from.z + (end.z - f.from.z) * t,
    y: end.y * t + Math.sin(Math.PI * t) * 1.2,
  };
}
export function step(current: Settlement): Settlement {
  if (current.paused) return current;
  const state = structuredClone(current);
  state.tick++;
  for (const bird of state.birds) {
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
      if (bird.energy < 80) bird.energy = Math.min(80, bird.energy + 0.04);
      continue;
    }
    const to = destination(state, bird);
    if (!to || !move(state, bird, to)) continue;
    if (job.kind === "build") {
      const site = state.sites.find((s) => s.id === job.destination)!;
      if (site.complete || site.delivered !== cost(site)) {
        bird.job = null;
        continue;
      }
      site.progress = Math.min(30, site.progress + 1);
      bird.energy = Math.max(0, bird.energy - 0.08);
      if (site.progress === 30) {
        state.consumed += site.delivered;
        site.delivered = 0;
        site.complete = true;
        bird.job = null;
        if (site.tree)
          for (const id of new Set([...site.contributors, bird.id])) {
            const contributor = state.birds.find((b) => b.id === id)!;
            if (!contributor.attachment) contributor.attachment = site.tree;
            remember(
              contributor,
              `Helped build ${trees.find((t) => t.id === site.tree)!.name}; wants to sleep there.`,
            );
          }
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
        site.delivered += bird.cargo;
        site.contributors.push(bird.id);
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
  if (bird.flight)
    return `${bird.flight.direction === "up" ? (bird.flight.sheltered ? "Approaching / climbing the ladder" : "Flying up to a natural branch") : "Returning to the ground"} at ${trees.find((t) => t.id === bird.flight!.tree)!.name}`;
  if (bird.perch)
    return `${bird.perch.sheltered ? "Sheltered" : "Natural branch"} rest at ${trees.find((t) => t.id === bird.perch!.tree)!.name} · perch ${bird.perch.slot + 1}`;
  if (bird.resting) return "Resting on the ground before returning to work";
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
      (bird.edge
        ? !state.paths.includes(key(bird.at)) ||
          !state.paths.includes(key(bird.edge.to))
        : !route(state, bird.at, to));
    if (blocked)
      return `Route broken — ${bird.cargo ? "guarding a carried bundle; repair the path to secure it" : "waiting for a connected path"}`;
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
  if (!state.paths.includes(key(bird.at))) {
    const tree = trees.find((t) => same(t, bird.at));
    return `Needs a path from ${tree ? `${tree.name}'s ground cell` : "this ground cell"} to work`;
  }
  return "Available — waiting for material and a connected job";
}
export function siteStatus(state: Settlement, site: Site) {
  if (site.complete)
    return site.kind === "store"
      ? `${site.stock} / ${tuning.storeCapacity} reeds stored locally`
      : "Two sheltered perches ready · ladder access";
  if (
    !state.paths.includes(key(site.at)) ||
    (![
      ...state.piles,
      ...state.sites.filter((p) => p.complete && p.kind === "store"),
    ].some((p) => available(state, p.id) > 0 && route(state, p.at, site.at)) &&
      site.delivered + incoming(state, site.id) < cost(site))
  )
    return "Needs reachable local reeds and a continuous path";
  if (
    state.birds.some(
      (b) =>
        b.job?.destination === site.id &&
        workerStatus(state, b).startsWith("Route broken"),
    )
  )
    return "Carrier blocked — repair the missing path; goods remain with the bird";
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
  if (jobs.some((b) => workerStatus(state, b).startsWith("Route broken")))
    return "Gatherer blocked · repair the path";
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
    return "Waiting for a connected path to the patch and storage";
  if (state.phase === "evening") return "Gathering resumes by day";
  return `${patch.remaining} / ${patch.capacity} reeds · ${jobs.length} gathering`;
}
