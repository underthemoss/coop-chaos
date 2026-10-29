import { settlementWorld, worldTrees, worldFoodPatches, worldReedPatches, type WorldContext } from "../content/settlement-world";
import { mapTile } from "../content/maps";
import { canTraverse } from "../simulation/navigation";
import { treeWorkCell } from "../content/tree-habitats";
import {
  initialSettlement,
  initialForage,
  initialAppetite,
  initialLife,
  initialEconomy,
  feedingSpots,
  initialPatches,
  conserved,
  available,
  validCell,
  key,
  cost,
  readyForBuild,
  shelteredCapacity,
  basketForTree,
  nextFood,
} from "../simulation/settlement";
import type { Settlement, Cell } from "../simulation/settlement";
import {
  forageTuning,
  economyTuning,
  offspringNames,
  reedPatches,
  settlers,
  trees,
  tuning,
} from "../content/settlement";
const fail = (): never => {
  throw new Error(
    "This settlement save is damaged or incompatible. Nothing was imported.",
  );
};
function object(v: unknown, fields: string[]): Record<string, unknown> {
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    Object.keys(v).length !== fields.length ||
    fields.some((f) => !Object.hasOwn(v, f))
  )
    return fail();
  return v as Record<string, unknown>;
}
function integer(v: unknown, min = 0, max = 1e9): v is number {
  return (
    typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max
  );
}
function number(v: unknown, min = 0, max = 1): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}
function cell(v: unknown, fractional = false, context?: WorldContext): v is Cell {
  const p = object(v, ["x", "z"]);
  const map = settlementWorld(context).map;
  const minX = map ? 0 : -4, maxX = map ? map.width - 1 : 4;
  const minZ = map ? 0 : -3, maxZ = map ? map.depth - 1 : 3;
  if (!number(p.x, minX, maxX) || !number(p.z, minZ, maxZ) ||
    (!fractional && (!integer(p.x, minX, maxX) || !integer(p.z, minZ, maxZ)))) return fail();
  return true;
}
function list(v: unknown, max: number): unknown[] {
  if (!Array.isArray(v) || v.length > max) return fail();
  return v;
}
function text(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length < 200;
}
function perch(v: unknown, flying: boolean, upgraded: boolean, context?: WorldContext) {
  const p = object(
    v,
    flying
      ? ["tree", "slot", "sheltered", "progress", "direction", "from"]
      : ["tree", "slot", "sheltered"],
  );
  if (
    !worldTrees(context).some((t) => t.id === p.tree) ||
    !integer(p.slot, 0, upgraded && p.sheltered ? 3 : 1) ||
    typeof p.sheltered !== "boolean"
  )
    fail();
  if (
    flying &&
    (!number(p.progress) ||
      !["up", "down"].includes(p.direction as string) ||
      !cell(p.from, true, context))
  )
    fail();
  if(flying&&settlementWorld(context).map){
    const tree=worldTrees(context).find(t=>t.id===p.tree)!;
    const landing=treeWorkCell(tree.id,context);
    if(key(p.from as Cell)!==key(landing)||!mapTile(settlementWorld(context).map!,landing)?.traversable)fail();
  }
}
/** Validate shape AND relationships before any state or IndexedDB replacement. */
const legacyInitialReeds = 40;
const maximumHarvest = reedPatches.reduce(
  (total, patch) => total + patch.capacity,
  0,
);
/** Version 1 has an immutable shape and material budget, independent of fresh-game tuning. */
function validateVersion(
  value: unknown,
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
  context?: WorldContext,
): Settlement {
  const definition = settlementWorld(context);
  const trees = worldTrees(context), foodPatches = worldFoodPatches(context), reedPatches = worldReedPatches(context);
  const checkedCell = (v: unknown, fractional = false) => cell(v, fractional, context);
  const legacy = version === 1;
  const current = version >= 3;
  const upgraded = version >= 4;
  const economy = version >= 5;
  const requests = version >= 6;
  const s = object(value, [
    ...(context?.world ? ["world"] : []),
    ...(version >= 7 ? ["constructionFocus"] : []),
    ...(upgraded ? ["basketTechnique"] : []),
    ...(economy ? ["economy"] : []),
    "tick",
    "phase",
    "paused",
    "nextId",
    ...(current ? ["forage"] : ["paths"]),
    "piles",
    "sites",
    "birds",
    "consumed",
    "totalReeds",
    ...(legacy ? [] : ["patches", "initialReeds", "harvestedReeds"]),
  ]);
  if (!!context?.world && s.initialReeds !== definition.source.stock) fail();
  const budget = legacy
    ? legacyInitialReeds
    : (s.initialReeds === 8 || s.initialReeds === legacyInitialReeds) &&
        integer(s.harvestedReeds, 0, economy ? 1e9 : maximumHarvest)
      ? (s.initialReeds as number) + (s.harvestedReeds as number)
      : fail();
  if (!legacy) {
    const patches = list(s.patches, reedPatches.length);
    // Older worlds may have filled every available cell with saved blueprints.
    // New worlds always contain both patches; legacy migrations preserve what fits.
    if (
      s.initialReeds !== legacyInitialReeds &&
      patches.length !== reedPatches.length
    )
      fail();
    let harvested = 0;
    const ids = new Set();
    for (const value of patches) {
      const p = object(value, [
        "id",
        "at",
        "capacity",
        "remaining",
        "harvested",
        "designated",
        ...(economy ? ["regrown", "recoveryProgress"] : []),
      ]);
      const fixture = reedPatches.find((f) => f.id === p.id);
      if (
        !fixture ||
        ids.has(p.id) ||
        !checkedCell(p.at) ||
        (!!context?.world && key(p.at as Cell) !== key(fixture.at)) ||
        p.capacity !== fixture.capacity ||
        !integer(p.remaining, 0, fixture.capacity) ||
        !integer(p.harvested, 0, economy ? 1e9 : fixture.capacity) ||
        (economy &&
          (!integer(p.regrown) ||
            !integer(
              p.recoveryProgress,
              0,
              economyTuning.reedRecoveryTicks - 1,
            ) ||
            (p.remaining === fixture.capacity && p.recoveryProgress !== 0))) ||
        p.remaining + p.harvested !==
          fixture.capacity + (economy ? (p.regrown as number) : 0) ||
        typeof p.designated !== "boolean"
      )
        fail();
      ids.add(p.id);
      harvested += p.harvested as number;
    }
    if (harvested !== s.harvestedReeds) fail();
  }
  if (
    !integer(s.tick) ||
    !["day", "evening"].includes(s.phase as string) ||
    typeof s.paused !== "boolean" ||
    !integer(s.nextId, 1) ||
    !integer(s.consumed, 0, budget) ||
    s.totalReeds !== budget
  )
    fail();
  const paths = current ? [] : list(s.paths, 63);
  for (const p of paths) {
    if (typeof p !== "string" || !/^-?\d+,-?\d+$/.test(p)) fail();
    const [x, z] = (p as string).split(",").map(Number);
    if (!validCell({ x, z }, context) || key({ x, z }) !== p) fail();
  }
  if (new Set(paths).size !== paths.length) fail();
  for (const value of list(s.piles, 64)) {
    const p = object(value, ["id", "at", "stock", "kind"]);
    if (
      !text(p.id) ||
      !checkedCell(p.at) ||
      !integer(p.stock, 0, budget) ||
      !["source", "salvage"].includes(p.kind as string)
    )
      fail();
  }
  for (const value of list(s.sites, economy ? 72 : upgraded ? 69 : 63)) {
    const p = object(value, [
      "id",
      "kind",
      "at",
      "tree",
      "delivered",
      "progress",
      "complete",
      "stock",
      "target",
      "contributors",
      ...(upgraded ? ["experiment"] : []),
    ]);
    if (
      !text(p.id) ||
      !/^site-\d+$/.test(p.id as string) ||
      ![
        "treehouse",
        "store",
        ...(upgraded ? ["sleeping-deck", "hauling-basket"] : []),
        ...(economy ? ["nursery"] : []),
      ].includes(p.kind as string) ||
      !checkedCell(p.at) ||
      typeof p.complete !== "boolean" ||
      !integer(p.delivered, 0, 6) ||
      !integer(p.progress, 0, 30) ||
      !integer(p.stock, 0, 12) ||
      !integer(p.target, 0, 12)
    )
      fail();
    if (definition.map) {
      if (p.kind === "store" || p.kind === "nursery") {
        if (!definition.pads.some(pad => pad.kind === p.kind && key(pad.at) === key(p.at as Cell) && (pad.tree ?? null) === p.tree)) fail();
      } else if (!trees.some(t => t.id === p.tree && key(t) === key(p.at as Cell))) fail();
    } else if (p.kind !== "store"
      ? !trees.some(t => t.id === p.tree && key(t) === key(p.at as Cell))
      : p.tree !== null || trees.some(t => key(t) === key(p.at as Cell))) fail();
    if (
      upgraded &&
      (typeof p.experiment !== "boolean" ||
        (p.experiment && (p.kind !== "hauling-basket" || !p.complete)))
    )
      fail();
    for (const id of list(p.contributors, economy ? 1000 : 6))
      if (
        !(economy
          ? list(s.birds, 1000).some(
              (b) => (b as Record<string, unknown>).id === id,
            )
          : settlers.some((b) => b.id === id))
      )
        fail();
    if (
      new Set(p.contributors as unknown[]).size !==
      (p.contributors as unknown[]).length
    )
      fail();
    if (
      p.complete
        ? p.progress !== 30 || p.delivered !== 0
        : p.progress !== 0 &&
          p.delivered !== (p.kind === "treehouse" ? 6 : 4) &&
          !(upgraded && p.kind === "hauling-basket" && p.delivered === 3)
    )
      fail();
    if (
      (p.kind !== "store" && (p.stock !== 0 || p.target !== 0)) ||
      (!p.complete && (p.stock !== 0 || p.target !== 0))
    )
      fail();
    if ((p.delivered as number) > (p.kind === "treehouse" ? 6 : 4)) fail();
  }
  for (const value of list(s.birds, economy ? 1000 : 4)) {
    const b = object(value, [
      "id",
      "at",
      "edge",
      "cargo",
      "job",
      "energy",
      "resting",
      "deliveries",
      "attachment",
      "memories",
      "perch",
      "flight",
      ...(upgraded ? ["lift"] : []),
      ...(requests ? ["request", "requestResult"] : []),
      ...(version === 10 && value && typeof value === "object" && "direct" in value ? ["direct"] : []),
      ...(economy ? ["life", "protein", "foodCargo", "provision", "care"] : []),
      ...(legacy ? [] : ["gatheringProgress"]),
      ...(current
        ? ["satiety", "foragePreference", "rememberedForage", "foraging"]
        : []),
    ]);
    if (
      !(economy
        ? text(b.id) &&
          (settlers.some((p) => p.id === b.id) ||
            /^chick-[1-9]\d*$/.test(b.id as string))
        : settlers.some((p) => p.id === b.id)) ||
      !checkedCell(b.at) ||
      (!!context?.world && !b.perch && !b.flight && !mapTile(definition.map!,b.at as Cell)?.traversable) ||
      !integer(b.cargo, 0, 1) ||
      !number(b.energy, 0, 100) ||
      typeof b.resting !== "boolean" ||
      !integer(b.deliveries) ||
      (b.attachment !== null && !trees.some((t) => t.id === b.attachment))
    )
      fail();
    if (!legacy && !integer(b.gatheringProgress, 0, tuning.gatherTicks - 1))
      fail();
    for (const m of list(b.memories, 6)) if (!text(m)) fail();
    if (b.edge !== null) {
      const e = object(b.edge, ["to", "progress"]);
      checkedCell(e.to);
      if (
        !number(e.progress, 0, 0.999999999) ||
        (definition.map ? !canTraverse(definition.map, b.at as Cell, e.to as Cell) :
        Math.abs((e.to as Cell).x - (b.at as Cell).x) + Math.abs((e.to as Cell).z - (b.at as Cell).z) !== 1)
      )
        fail();
    }
    if (b.job !== null) {
      const j = object(b.job, ["kind", "source", "destination", "stage"]);
      if (
        ![
          "haul",
          "stock",
          "return",
          "build",
          ...(legacy ? [] : ["gather"]),
        ].includes(j.kind as string) ||
        typeof j.source !== "string" ||
        !text(j.destination) ||
        !["pickup", "deliver"].includes(j.stage as string)
      )
        fail();
      if (
        j.kind === "build"
          ? b.cargo !== 0 || j.stage !== "deliver" || j.source !== ""
          : b.cargo !== (j.stage === "pickup" ? 0 : 1)
      )
        fail();
    } else if (b.cargo !== 0 && !(version === 10 && b.direct)) fail();
    if (!legacy && (b.gatheringProgress as number) > 0) {
      const j = b.job as Record<string, unknown> | null;
      if (!j || j.kind !== "gather" || j.stage !== "pickup" || b.edge) fail();
      const patch = (s.patches as Settlement["patches"]).find(
        (p) => p.id === j!.source,
      );
      if (!patch || key(patch.at) !== key(b.at as Cell)) fail();
    }
    if (upgraded && b.lift !== null) {
      const lift = object(b.lift, ["basket", "progress"]);
      if (
        !text(lift.basket) ||
        !number(lift.progress, 0, 0.999999999) ||
        b.edge ||
        b.perch ||
        b.flight ||
        b.foraging ||
        b.cargo !== 1
      )
        fail();
    }
    if (b.perch !== null) perch(b.perch, false, upgraded, context);
    if (b.flight !== null) perch(b.flight, true, upgraded, context);
    if (
      (b.perch || b.flight) &&
      (b.job || b.edge || b.cargo || (b.perch && b.flight))
    )
      fail();
    if (
      s.phase === "day" &&
      (b.perch ||
        (b.flight &&
          (b.flight as Record<string, unknown>).direction !== "down"))
    )
      fail();
  }
  if (current) {
    const places = list(s.forage, foodPatches.length);
    if (places.length !== foodPatches.length) fail();
    const foodIds = new Set();
    for (const value of places) {
      const p = object(value, [
        "id",
        "at",
        "capacity",
        "remaining",
        "eaten",
        ...(economy ? ["harvested", "proteinEaten"] : []),
        "regrown",
        "recoveryProgress",
        "open",
      ]);
      const fixture = foodPatches.find((f) => f.id === p.id);
      const harvested = economy
        ? foodStock(p.harvested)
        : { staple: 0, protein: 0 };
      if (economy && !integer(p.proteinEaten, 0, p.eaten as number)) fail();
      if (
        !fixture ||
        foodIds.has(p.id) ||
        !checkedCell(p.at) ||
        key(p.at as Cell) !== key(fixture.at) ||
        p.capacity !== fixture.capacity ||
        !integer(p.remaining, 0, fixture.capacity) ||
        !integer(p.eaten) ||
        !integer(p.regrown) ||
        fixture.capacity + (p.regrown as number) !==
          (p.remaining as number) +
            (p.eaten as number) +
            harvested.staple +
            harvested.protein ||
        !integer(
          p.recoveryProgress,
          0,
          Math.max(110, forageTuning.recoveryTicks) - 1,
        ) ||
        (p.remaining === fixture.capacity && p.recoveryProgress !== 0) ||
        typeof p.open !== "boolean"
      )
        fail();
      foodIds.add(p.id);
    }
    for (const value of s.birds as unknown[]) {
      const b = value as Record<string, unknown>;
      const fixture = settlers.find(
        (p) =>
          p.id ===
          (economy ? (b.life as Record<string, unknown>)?.appearance : b.id),
      );
      if (!fixture) fail();
      if (
        !number(b.satiety, 0, 100) ||
        b.foragePreference !== fixture!.foragePreference ||
        (b.rememberedForage !== null &&
          !places.some(
            (p) =>
              (p as Record<string, unknown>).id === b.rememberedForage &&
              ((p as Record<string, unknown>).eaten as number) > 0,
          ))
      )
        fail();
      if (b.foraging !== null) {
        const f = object(b.foraging, ["patch", "spot", "intent", "progress"]);
        if (
          !foodIds.has(f.patch) ||
          !checkedCell(f.spot) ||
          !["eat", "browse"].includes(f.intent as string) ||
          !integer(f.progress, 0, forageTuning.scratchTicks - 1) ||
          b.job ||
          (b.cargo && !(version===10&&b.direct)) ||
          b.perch ||
          b.flight ||
          s.phase !== "day" ||
          ((f.progress as number) > 0 &&
            (b.edge || key(b.at as Cell) !== key(f.spot as Cell)))
        )
          fail();
      }
    }
  }
  const state = value as Settlement;
  if (current) {
    const positions = new Set<string>();
    for (const patch of state.forage) {
      const visitors = state.birds.filter(
        (b) => b.foraging?.patch === patch.id,
      );
      if (
        visitors.length > forageTuning.maximumOccupancy ||
        (visitors.length && (!patch.open || patch.remaining === 0))
      )
        fail();
      for (const bird of visitors) {
        const spot = bird.foraging!.spot;
        if (
          positions.has(key(spot)) ||
          !feedingSpots(state, patch).some((p) => key(p) === key(spot))
        )
          fail();
        positions.add(key(spot));
      }
    }
  }
  const ids = [...state.piles, ...state.sites].map((p) => p.id);
  if (
    new Set(ids).size !== ids.length ||
    (economy
      ? settlers.some((p) => !state.birds.some((b) => b.id === p.id))
      : state.birds.length !== 4) ||
    new Set(state.birds.map((b) => b.id)).size !== state.birds.length ||
    new Set(
      state.sites.map((p) =>
        upgraded && p.tree ? `${p.tree}-${p.kind}` : key(p.at),
      ),
    ).size !== state.sites.length
  )
    fail();
  if (!legacy) {
    const occupied = new Set([
      ...trees.map(key),
      ...state.piles.map((p) => key(p.at)),
      ...state.sites.map((p) => key(p.at)),
    ]);
    for (const patch of state.patches) {
      if (occupied.has(key(patch.at))) fail();
      occupied.add(key(patch.at));
    }
  }
  if (upgraded) {
    for (const site of state.sites) {
      if (
        (site.kind === "sleeping-deck" ||
          site.kind === "hauling-basket" ||
          (economy && site.kind === "nursery")) &&
        !state.sites.some(
          (h) => h.kind === "treehouse" && h.complete && h.tree === site.tree,
        )
      )
        fail();
    }
    if (
      !state.basketTechnique &&
      state.sites.some(
        (site) => site.kind === "hauling-basket" && site.delivered > 3,
      )
    )
      fail();
    if (
      state.sites.some(
        (site) =>
          site.kind === "sleeping-deck" && !basketForTree(state, site.tree!),
      )
    )
      fail();
    const winners = state.sites.filter((s) => s.experiment);
    if (state.basketTechnique !== null) {
      const t = object(state.basketTechnique, ["inventor", "tree", "tick"]);
      if (
        !(economy
          ? state.birds.some((b) => b.id === t.inventor)
          : settlers.some((b) => b.id === t.inventor)) ||
        !trees.some((tree) => tree.id === t.tree) ||
        !integer(t.tick, 0, state.tick) ||
        winners.length !== 1 ||
        winners[0].tree !== t.tree ||
        !winners[0].contributors.includes(
          t.inventor as Settlement["birds"][number]["id"],
        )
      )
        fail();
    } else if (
      winners.length ||
      state.sites.some((s) => s.kind === "hauling-basket" && s.complete)
    )
      fail();
    const lifting = new Set<string>();
    for (const b of state.birds)
      if (b.lift) {
        const basket = state.sites.find((s) => s.id === b.lift!.basket);
        const target = state.sites.find((s) => s.id === b.job?.destination);
        if (
          !basket ||
          basket.kind !== "hauling-basket" ||
          !target ||
          b.job?.kind !== "haul" ||
          b.job.stage !== "deliver" ||
          (key(b.at) !== key(basket.at) &&
            (!basket.tree || key(b.at) !== key(treeWorkCell(basket.tree, context)))) ||
          lifting.has(basket.id) ||
          !(basket.complete
            ? target.kind === "sleeping-deck" && target.tree === basket.tree
            : target.id === basket.id &&
              basket.delivered === 3 &&
              basket.progress === 30)
        )
          fail();
        lifting.add(basket!.id);
      }
  }
  const source = state.piles.filter((p) => p.kind === "source");
  if (
    source.length !== 1 ||
    source[0].id !== "reeds" ||
    key(source[0].at) !== key(definition.source.at) ||
    state.sites.some((p) => key(p.at) === key(definition.source.at))
  )
    fail();
  for (const p of state.piles)
    if (p.kind === "salvage" && !/^salvage-\d+$/.test(p.id)) fail();
  if (
    ids.some((id) => id !== "reeds" && Number(id.split("-")[1]) >= state.nextId)
  )
    fail();
  if (
    conserved(state) !== state.totalReeds ||
    state.consumed !==
      state.sites.filter((p) => p.complete).reduce((n, p) => n + cost(p), 0)
  )
    fail();
  for (const p of [
    ...state.piles,
    ...state.sites.filter((p) => p.complete && p.kind === "store"),
  ])
    if (available(state, p.id) < 0) fail();
  if (!legacy)
    for (const patch of state.patches) {
      const reservations = state.birds.filter(
        (b) =>
          b.job?.kind === "gather" &&
          b.job.source === patch.id &&
          b.job.stage === "pickup",
      ).length;
      if (reservations > patch.remaining) fail();
    }
  const sleeping = new Set<string>();
  for (const b of state.birds) {
    if (
      b.attachment &&
      !state.sites.some((p) => p.complete && p.tree === b.attachment)
    )
      fail();
    if (b.job) {
      const j = b.job;
      const destination = state.sites.find((p) => p.id === j.destination);
      if (
        j.kind === "build"
          ? !destination ||
            destination.complete ||
            !(upgraded
              ? readyForBuild(state, destination)
              : destination.delivered === cost(destination))
          : j.kind === "gather"
            ? !state.patches.some((p) => p.id === j.source)
            : ![
                ...state.piles,
                ...state.sites.filter((p) => p.complete && p.kind === "store"),
              ].some((p) => p.id === j.source)
      )
        fail();
      if (j.kind === "gather") {
        const patch = state.patches.find((p) => p.id === j.source)!;
        // Replacing intent retains this pickup reservation only until the
        // current movement edge ends. The new intent need not be Gather.
        const pendingPickupEdge = version === 10 && b.direct?.pending && !!b.edge;
        if (
          !state.piles.some(
            (p) => p.kind === "source" && p.id === j.destination,
          ) &&
          !(destination?.complete && destination.kind === "store")
        )
          fail();
        if (
          j.stage === "pickup" &&
          ((!patch.designated && !(requests && b.request?.kind === "gather" && b.request.target === patch.id) && !(version === 10 && b.direct?.order?.kind === "gather" && b.direct.order.target === patch.id) && !pendingPickupEdge) || state.phase !== "day")
        )
          fail();
      }
      if (
        (j.kind === "haul" && (!destination || destination.complete)) ||
        (j.kind === "stock" &&
          (!destination?.complete || destination.kind !== "store")) ||
        (j.kind === "return" &&
          (j.destination !== "reeds" || j.stage !== "deliver"))
      )
        fail();
    }
    const p = b.perch ?? b.flight;
    if (p) {
      const id = `${p.tree}-${p.sheltered}-${p.slot}`;
      if (
        sleeping.has(id) ||
        (p.sheltered &&
          !(upgraded
            ? p.slot < shelteredCapacity(state, p.tree)
            : state.sites.some((s) => s.complete && s.tree === p.tree)))
      )
        fail();
      sleeping.add(id);
    }
  }
  for (const p of state.sites) {
    const incoming = state.birds.filter(
      (b) => b.job?.destination === p.id && b.job.kind !== "build",
    ).length;
    if (
      p.complete
        ? p.stock + incoming > tuning.storeCapacity
        : p.delivered + incoming > cost(p)
    )
      fail();
  }
  if (economy) validateEconomy(state, version);
  if (requests) validateRequests(state);
  if (version === 10) validateDirectControls(state);
  if (version >= 7 && state.constructionFocus !== null &&
      (typeof state.constructionFocus !== "string" || !state.sites.some(site=>site.id===state.constructionFocus&&!site.complete))) fail();
  return structuredClone(state);
}
export function validateSettlement(value: unknown): Settlement {
  const identity = value && typeof value === "object" && "world" in value ? (value as Settlement).world : undefined;
  const direct = !!(value && typeof value === "object" && Array.isArray((value as Settlement).birds) && (value as Settlement).birds.some(b=>"direct" in b));
  if (!identity) return validateVersion(value, direct ? 10 : 8);
  const world = object(identity, ["id", "version"]);
  if (world.id !== "inhabited-valley" || ![1, 2].includes(world.version as number)) throw new Error("This inhabited world or world version is unavailable. Its original data is preserved.");
  return validateVersion(value, direct ? 10 : 9, { world: identity });
}
function foodStock(value: unknown) {
  const p = object(value, ["staple", "protein"]);
  if (!integer(p.staple) || !integer(p.protein)) fail();
  return p as { staple: number; protein: number };
}
/** Relationships are checked after the immutable shapes, before any import write. */
/** Immutable source bounds: changing live pacing must never loosen an older format. */
const legacyGrowth = { incubationTicks: 7200, juvenileTicks: 7200, adultTicks: 14400 };
function validateEconomy(state: Settlement, version: number) {
  const trees = worldTrees(state);
  const growth = version < 8 ? legacyGrowth : economyTuning;
  const e = object(state.economy, [
    "clock",
    "priority",
    "nurseries",
    "broods",
    "foodConsumed",
  ]);
  const clock = object(e.clock, ["day", "phaseTick", "automatic", "speed"]);
  if (
    !integer(clock.day, 1) ||
    !integer(
      clock.phaseTick,
      0,
      (state.phase === "day"
        ? economyTuning.dayTicks
        : economyTuning.eveningTicks) - 1,
    ) ||
    typeof clock.automatic !== "boolean" ||
    ![1, 4].includes(clock.speed as number) ||
    !["balanced", "build", "provision"].includes(e.priority as string)
  )
    fail();
  const consumed = foodStock(e.foodConsumed);
  const bird = (id: unknown) => state.birds.find((b) => b.id === id);
  const nurseryIds = new Set<string>();
  for (const value of list(e.nurseries, 3)) {
    const n = object(value, ["site", "food", "target", "brood"]);
    const site = state.sites.find((s) => s.id === n.site);
    const food = foodStock(n.food);
    if (
      !site ||
      site.kind !== "nursery" ||
      !site.complete ||
      nurseryIds.has(site.id) ||
      food.staple > economyTuning.foodCapacity ||
      food.protein > economyTuning.foodCapacity ||
      n.target !== economyTuning.nurseryTarget ||
      (n.brood !== null && !text(n.brood))
    )
      fail();
    nurseryIds.add(site!.id);
  }
  if (
    state.sites.some(
      (s) => s.kind === "nursery" && s.complete && !nurseryIds.has(s.id),
    )
  )
    fail();
  const broodIds = new Set<string>(),
    eggIds = new Set<string>(),
    children = new Set<string>(),
    activeCarers = new Set<string>();
  for (const value of list(e.broods, 1000)) {
    const b = object(value, [
      "id",
      "site",
      "mother",
      "father",
      "carer",
      "stage",
      "progress",
      "eggs",
      "careTicks",
      "mealProgress",
      "shortageTicks",
      "started",
    ]);
    if (
      !text(b.id) ||
      !/^brood-[1-9]\d*$/.test(b.id) ||
      Number(b.id.split("-")[1]) >= state.nextId ||
      broodIds.has(b.id) ||
      !nurseryIds.has(b.site as string) ||
      bird(b.mother)?.life.sex !== "hen" ||
      bird(b.father)?.life.sex !== "rooster" ||
      bird(b.mother)?.life.stage !== "adult" ||
      bird(b.father)?.life.stage !== "adult" ||
      b.carer !== b.mother ||
      !bird(b.carer) ||
      !["laying", "incubating", "chicks", "complete", "failed"].includes(
        b.stage as string,
      ) ||
      !integer(b.started, 0, state.tick) ||
      !integer(
        b.progress,
        0,
        b.stage === "laying" || b.stage === "failed"
          ? economyTuning.layingTicks - 1
          : b.stage === "incubating"
            ? growth.incubationTicks - 1
            : 0,
      ) ||
      !integer(b.careTicks, 0, state.tick - (b.started as number)) ||
      (b.progress as number) > (b.careTicks as number) ||
      !integer(b.mealProgress, 0, economyTuning.mealTicks - 1) ||
      !integer(b.shortageTicks)
    )
      fail();
    broodIds.add(b.id as string);
    const eggs = list(b.eggs, 2);
    if (
      (b.stage === "incubating" ||
        b.stage === "chicks" ||
        b.stage === "complete") &&
      eggs.length !== 2
    )
      fail();
    if (
      b.stage === "laying" &&
      eggs.length !==
        Math.floor((b.progress as number) / (economyTuning.layingTicks / 2))
    )
      fail();
    if (
      b.stage === "failed" &&
      (eggs.length === 0 ||
        !eggs.some(
          (value) =>
            state.tick - ((value as Record<string, unknown>).laidAt as number) >
            economyTuning.eggViabilityTicks,
        ))
    )
      fail();
    for (let i = 0; i < eggs.length; i++) {
      const egg = object(eggs[i], [
        "id",
        "laidAt",
        "fertile",
        "viable",
        "child",
        "hatchTick",
      ]);
      if (
        egg.id !== `egg-${b.id}-${i}` ||
        eggIds.has(egg.id as string) ||
        !integer(egg.laidAt, b.started as number, state.tick) ||
        typeof egg.fertile !== "boolean" ||
        typeof egg.viable !== "boolean" ||
        !egg.fertile ||
        (b.stage !== "failed" && !egg.viable) ||
        (egg.child === null) !== (egg.hatchTick === null)
      )
        fail();
      eggIds.add(egg.id as string);
      if (egg.child !== null) {
        const child = bird(egg.child);
        if (
          !child ||
          children.has(child.id) ||
          !egg.fertile ||
          !egg.viable ||
          !integer(egg.hatchTick, egg.laidAt as number, state.tick) ||
          child.life.mother !== b.mother ||
          child.life.father !== b.father ||
          child.life.carer !== b.carer ||
          child.life.bornAt !==
            state.sites.find((s) => s.id === b.site)?.tree ||
          (b.stage !== "chicks" && b.stage !== "complete")
        )
          fail();
        children.add(child!.id);
      } else if (b.stage === "chicks" || b.stage === "complete") fail();
      if (b.stage === "failed" && egg.viable) fail();
    }
    const active = ["laying", "incubating", "chicks"].includes(
      b.stage as string,
    );
    const n = state.economy.nurseries.find((n) => n.site === b.site)!;
    if (active && n.brood !== b.id) fail();
    const needsCarer =
      b.stage === "laying" ||
      b.stage === "incubating" ||
      (b.stage === "chicks" &&
        eggs.some(
          (v) =>
            bird((v as Record<string, unknown>).child)?.life.stage === "chick",
        ));
    if (needsCarer) {
      if (
        activeCarers.has(b.carer as string) ||
        bird(b.carer)?.care !== b.id ||
        bird(b.carer)?.life.stage !== "adult"
      )
        fail();
      activeCarers.add(b.carer as string);
    }
    if (
      b.stage === "complete" &&
      eggs.some(
        (v) =>
          bird((v as Record<string, unknown>).child)?.life.stage !== "adult",
      )
    )
      fail();
  }
  for (const n of state.economy.nurseries)
    if (
      n.brood !== null &&
      !state.economy.broods.some((b) => b.id === n.brood && b.site === n.site)
    )
      fail();
  for (const b of state.birds) {
    const l = object(b.life, [
      "name",
      "appearance",
      "sex",
      "stage",
      "age",
      "development",
      "mother",
      "father",
      "carer",
      "bornAt",
      "bond",
      "willing",
      "fertility",
      "matingProgress",
    ]);
    if (
      !text(l.name) ||
      !settlers.some((s) => s.id === l.appearance) ||
      !["hen", "rooster"].includes(l.sex as string) ||
      !["chick", "juvenile", "adult"].includes(l.stage as string) ||
      !integer(l.age) ||
      !integer(l.development, 0, l.age as number) ||
      !integer(l.bond, 0, (version < 8 ? l.development : l.age) as number) ||
      typeof l.willing !== "boolean" ||
      !integer(l.matingProgress, 0, economyTuning.matingTicks - 1) ||
      !number(b.protein, 0, 100)
    )
      fail();
    const original = settlers.find((s) => s.id === b.id);
    if (original) {
      if (
        l.name !== original.name ||
        l.appearance !== original.id ||
        l.sex !== (b.id === "rook" ? "rooster" : "hen") ||
        l.stage !== "adult" ||
        l.mother !== null ||
        l.father !== null ||
        l.carer !== null ||
        l.bornAt !== null ||
        l.development !== 0 ||
        l.bond !== 0
      )
        fail();
    } else {
      if (
        !children.has(b.id) ||
        bird(l.mother)?.life.sex !== "hen" ||
        bird(l.father)?.life.sex !== "rooster" ||
        !bird(l.carer) ||
        [l.mother, l.father, l.carer].includes(b.id) ||
        !trees.some((t) => t.id === l.bornAt) ||
        Number(b.id.split("-")[1]) >= state.nextId ||
        (l.stage === "chick"
          ? (l.development as number) >= growth.juvenileTicks
          : l.stage === "juvenile"
            ? (l.development as number) < growth.juvenileTicks ||
              (l.development as number) >= growth.adultTicks
            : (l.development as number) < growth.adultTicks)
      )
        fail();
    }
    if (l.fertility !== null) {
      const f = object(l.fertility, ["father", "tick"]);
      if (
        l.sex !== "hen" ||
        l.stage !== "adult" ||
        bird(f.father)?.life.sex !== "rooster" ||
        bird(f.father)?.life.stage !== "adult" ||
        !integer(f.tick, 0, state.tick)
      )
        fail();
    }
    if (l.matingProgress && (l.sex !== "hen" || l.stage !== "adult")) fail();
    if (
      b.care !== null &&
      (!activeCarers.has(b.id) ||
        !state.economy.broods.some((v) => v.id === b.care && v.carer === b.id))
    )
      fail();
    const activities = [b.job, b.foraging, b.provision].filter(Boolean).length;
    if (
      activities > 1 ||
      ((b.perch || b.flight || b.lift) && (b.foodCargo || b.provision)) ||
      (b.care &&
        (b.perch ||
          (b.flight && b.flight.direction !== "down") ||
          (b.job && b.cargo !== 1) ||
          (b.provision && !b.foodCargo))) ||
      (b.life.stage !== "adult" &&
        (b.job ||
          b.cargo ||
          b.lift ||
          b.provision ||
          b.foodCargo ||
          b.care ||
          b.perch ||
          b.flight)) ||
      (b.life.stage === "chick" && (b.foraging || b.edge))
    )
      fail();
    if (b.foodCargo !== null && !["staple", "protein"].includes(b.foodCargo))
      fail();
    if (b.provision !== null) {
      const p = object(b.provision, [
        "patch",
        "destination",
        "stage",
        "progress",
      ]);
      const patch = state.forage.find((f) => f.id === p.patch),
        n = state.economy.nurseries.find((n) => n.site === p.destination);
      if (
        !patch ||
        !n ||
        !["pickup", "deliver"].includes(p.stage as string) ||
        !integer(p.progress, 0, forageTuning.scratchTicks - 1) ||
        (p.stage === "pickup"
          ? b.foodCargo !== null ||
            !patch.open ||
            state.phase !== "day" ||
            patch.remaining === 0
          : b.foodCargo === null) ||
        (p.progress && (b.edge || key(b.at) !== key(patch.at)))
      )
        fail();
    } else if (b.foodCargo !== null && !b.direct) fail();
  }
  for (const patch of state.forage) {
    const pickups = state.birds.filter(
      (b) => b.provision?.patch === patch.id && b.provision.stage === "pickup",
    ).length;
    if (pickups > patch.remaining) fail();
  }
  for (const n of state.economy.nurseries)
    for (const food of ["staple", "protein"] as const) {
      const incoming = state.birds.filter(
        (b) =>
          b.provision?.destination === n.site &&
          (b.foodCargo === food ||
            (b.provision.stage === "pickup" &&
              nextFood(
                state.forage.find((p) => p.id === b.provision!.patch)!,
              ) === food)),
      ).length;
      if (n.food[food] + incoming > economyTuning.foodCapacity) fail();
    }
  for (const food of ["staple", "protein"] as const) {
    const harvested = state.forage.reduce((v, p) => v + p.harvested[food], 0);
    if (
      harvested !==
      consumed[food] +
        state.economy.nurseries.reduce((v, n) => v + n.food[food], 0) +
        state.birds.filter((b) => b.foodCargo === food).length
    )
      fail();
  }
  // Every child has one authoritative hatch record; ids share the saved sequence.
  const offspring = state.birds
    .filter((b) => b.life.mother !== null)
    .sort((a, b) => Number(a.id.split("-")[1]) - Number(b.id.split("-")[1]));
  offspring.forEach((b, i) => {
    const name =
      offspringNames[i % offspringNames.length] +
      (i >= offspringNames.length
        ? ` ${Math.floor(i / offspringNames.length) + 1}`
        : "");
    const brood = state.economy.broods.find((v) =>
      v.eggs.some((e) => e.child === b.id),
    )!;
    const ordinal = brood.eggs.findIndex((e) => e.child === b.id);
    const egg = brood.eggs[ordinal];
    if (
      (version >= 8 && b.life.bond > brood.careTicks) ||
      b.life.name !== name ||
      b.life.appearance !== bird(b.life.mother)!.life.appearance ||
      b.life.sex !== (ordinal % 2 ? "rooster" : "hen") ||
      b.life.age !== state.tick - egg.hatchTick! ||
      egg.hatchTick! <
        Math.max(...brood.eggs.map((e) => e.laidAt)) +
          growth.incubationTicks
    )
      fail();
  });
  const sequence = [
    ...state.sites.map((s) => s.id),
    ...state.piles.filter((p) => p.kind === "salvage").map((p) => p.id),
    ...state.economy.broods.map((b) => b.id),
    ...offspring.map((b) => b.id),
  ].map((id) => Number(id.split("-")[1]));
  if (new Set(sequence).size !== sequence.length) fail();
  const allIds = [
    ...state.piles.map((p) => p.id),
    ...state.sites.map((s) => s.id),
    ...state.economy.broods.map((b) => b.id),
    ...state.birds.map((b) => b.id),
    ...eggIds,
  ];
  if (new Set(allIds).size !== allIds.length) fail();
}

function migrationPatches(legacy: Settlement) {
  const occupied = new Set([
    ...trees.map(key),
    ...legacy.piles.map((p) => key(p.at)),
    ...legacy.sites.map((p) => key(p.at)),
  ]);
  const cells: Cell[] = [];
  for (let z = -3; z <= 3; z++)
    for (let x = -4; x <= 4; x++) cells.push({ x, z });
  return initialPatches().flatMap((patch) => {
    const candidates = cells
      .filter((at) => !occupied.has(key(at)))
      .sort(
        (a, b) =>
          Math.abs(a.x - patch.at.x) +
            Math.abs(a.z - patch.at.z) -
            (Math.abs(b.x - patch.at.x) + Math.abs(b.z - patch.at.z)) ||
          a.z - b.z ||
          a.x - b.x,
      );
    const at = candidates[0];
    if (!at) return [];
    occupied.add(key(at));
    return [{ ...patch, at }];
  });
}
function migrateVersionFour(value: unknown): Settlement {
  const state = validateVersion(value, 4);
  return validateSettlement({
    ...state,
    constructionFocus: null,
    economy: initialEconomy(),
    patches: state.patches.map((p) => ({
      ...p,
      regrown: 0,
      recoveryProgress: 0,
    })),
    forage: state.forage.map((p) => ({
      ...p,
      harvested: { staple: 0, protein: 0 },
      proteinEaten: 0,
    })),
    birds: state.birds.map((b) => ({
      ...b,
      life: initialLife(b.id as import("../content/settlement").Appearance),
      protein: 85,
      foodCargo: null,
      provision: null,
      care: null,
      request: null, requestResult: null,
    })),
  });
}
function migrateVersionThree(value: unknown): Settlement {
  const state = validateVersion(value, 3);
  return migrateVersionFour({
    ...state,
    basketTechnique: null,
    sites: state.sites.map((s) => ({ ...s, experiment: false })),
    birds: state.birds.map((b) => ({ ...b, lift: null })),
  });
}
function migrateVersionTwo(value: unknown): Settlement {
  const state = validateVersion(value, 2);
  const { paths: _paths, ...facts } = state as Settlement & { paths: string[] };
  return migrateVersionThree({
    ...facts,
    forage: initialForage().map(
      ({ harvested: _harvested, proteinEaten: _protein, ...p }) => p,
    ),
    birds: state.birds.map((b) => ({
      ...b,
      ...initialAppetite(b.id as import("../content/settlement").Appearance),
    })),
  });
}
function migrateLegacy(value: unknown): Settlement {
  const legacy = validateVersion(value, 1);
  return migrateVersionTwo({
    ...legacy,
    initialReeds: legacyInitialReeds,
    harvestedReeds: 0,
    patches: migrationPatches(legacy).map(
      ({ regrown: _regrown, recoveryProgress: _recovery, ...p }) => p,
    ),
    birds: legacy.birds.map((b) => ({ ...b, gatheringProgress: 0 })),
  });
}
/** Derived from saved facts so this import limitation remains visible after reopening. */
export function settlementMigrationNotice(state: Settlement): string | null {
  return state.initialReeds === legacyInitialReeds &&
    state.patches.length < reedPatches.length
    ? `This older settlement has ${state.patches.length} of ${reedPatches.length} new reed patches. Existing sites and supplies were preserved; clearing space does not create additional patches.`
    : null;
}
export function encodeSettlement(state: Settlement): string {
  return JSON.stringify({
    schemaVersion: state.birds.some(b=>b.direct) ? 10 : state.world ? 9 : 8,
    simulationVersion: state.birds.some(b=>b.direct) ? "settlement-10" : state.world ? "settlement-9" : "settlement-8",
    state,
  });
}
export function decodeSettlement(text: string): Settlement {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return fail();
  }
  if (value && typeof value === "object" && "storyVersion" in value)
    throw new Error(
      "This is a first-evening story, not a settlement. Its original device save is preserved; export it using the archive tool.",
    );
  const envelope = object(value, [
    "schemaVersion",
    "simulationVersion",
    "state",
  ]);
  if (
    envelope.schemaVersion === 1 &&
    envelope.simulationVersion === "settlement-1"
  )
    return migrateLegacy(envelope.state);
  if (
    envelope.schemaVersion === 2 &&
    envelope.simulationVersion === "settlement-2"
  )
    return migrateVersionTwo(envelope.state);
  if (
    envelope.schemaVersion === 3 &&
    envelope.simulationVersion === "settlement-3"
  )
    return migrateVersionThree(envelope.state);
  if (
    envelope.schemaVersion === 4 &&
    envelope.simulationVersion === "settlement-4"
  )
    return migrateVersionFour(envelope.state);
  if (
    envelope.schemaVersion === 5 &&
    envelope.simulationVersion === "settlement-5"
  )
    return migrateVersionFive(envelope.state);
  if (envelope.schemaVersion === 6 && envelope.simulationVersion === "settlement-6")
    return migrateGrowth({...validateVersion(envelope.state,6), constructionFocus:null});
  if (envelope.schemaVersion === 7 && envelope.simulationVersion === "settlement-7")
    return migrateGrowth(validateVersion(envelope.state,7));
  if (envelope.schemaVersion === 8 && envelope.simulationVersion === "settlement-8")
    return validateVersion(envelope.state, 8);
  if (envelope.schemaVersion === 9 && envelope.simulationVersion === "settlement-9") {
    if (!envelope.state || typeof envelope.state !== "object" || !(envelope.state as Settlement).world) return fail();
    if((envelope.state as Settlement).birds?.some(b=>"direct" in b))return fail();
    return validateSettlement(envelope.state);
  }
  if (envelope.schemaVersion === 10 && envelope.simulationVersion === "settlement-10") return validateSettlement(envelope.state);
  return fail();
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("coop-chaos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("saves");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error("Close other Coop Chaos tabs."));
  });
}
async function stored(id: string, text?: string): Promise<string | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
        "saves",
        text === undefined ? "readonly" : "readwrite",
      );
      const store = tx.objectStore("saves");
      const r = text === undefined ? store.get(id) : store.put(text, id);
      tx.oncomplete = () =>
        resolve(text === undefined ? (r.result as string | undefined) : text);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Save interrupted."));
    });
  } finally {
    db.close();
  }
}
export async function loadSettlement() {
  const text = await stored("settlement");
  return text === undefined ? initialSettlement() : decodeSettlement(text);
}
export async function legacyArchive() {
  return stored("first-evening");
}
/** Serial order means an older tick can never finish after a newer import/restart. */
export function saveQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return (state: Settlement): Promise<void> => {
    const text = encodeSettlement(state);
    const write = tail
      .catch(() => undefined)
      .then(() => stored("settlement", text));
    tail = write;
    return write.then(() => undefined);
  };
}

function migrateVersionFive(value: unknown): Settlement {
  const state=validateVersion(value,5);
  return migrateGrowth({...state,constructionFocus:null,birds:state.birds.map(b=>({...b,request:null,requestResult:null}))});
}
function validateRequests(state: Settlement) {
  for(const bird of state.birds) {
    if(bird.request!==null) {
      const r=object(bird.request,["kind","target","phase","issued"]);
      if(!["gather","build","food"].includes(r.kind as string)||!text(r.target)||!["pending","waiting","working","canceling"].includes(r.phase as string)||!integer(r.issued,0,state.tick)||bird.life.stage!=="adult")fail();
      if(r.kind==="gather") {
        if(!state.patches.some(p=>p.id===r.target))fail();
      } else {
        const site=state.sites.find(s=>s.id===r.target);
        if(!site||(r.kind==="build"&&site.complete)||(r.kind==="food"&&!state.economy.nurseries.some(n=>n.site===site.id)))fail();
      }
      if(r.phase==="working") {
        const j=bird.job;
        if(r.kind==="gather" ? j?.kind!=="gather"||j.source!==r.target : r.kind==="build" ? !j||!["haul","build"].includes(j.kind)||j.destination!==r.target : bird.provision?.destination!==r.target)fail();
      }
    }
    if(bird.requestResult!==null) {
      const r=object(bird.requestResult,["kind","outcome","reason","tick"]);
      if(!["gather","build","food"].includes(r.kind as string)||!["done","cancelled","unavailable"].includes(r.outcome as string)||!text(r.reason)||String(r.reason).length>160||!integer(r.tick,0,state.tick))fail();
    }
  }
}

/** Source validation has already succeeded. Only same-stage progress units change;
 * chronological age, care/bond history and every other saved fact stay intact. */
function migrateGrowth(state: Settlement): Settlement {
  for (const brood of state.economy.broods) {
    if (brood.stage === "incubating")
      brood.progress = Math.floor(brood.progress * economyTuning.incubationTicks / legacyGrowth.incubationTicks);
  }
  for (const bird of state.birds) {
    if (bird.life.stage === "chick")
      bird.life.development = Math.floor(bird.life.development * economyTuning.juvenileTicks / legacyGrowth.juvenileTicks);
    else if (bird.life.stage === "juvenile")
      bird.life.development = economyTuning.juvenileTicks + Math.floor(
        (bird.life.development - legacyGrowth.juvenileTicks) *
        (economyTuning.adultTicks - economyTuning.juvenileTicks) /
        (legacyGrowth.adultTicks - legacyGrowth.juvenileTicks));
  }
  return validateSettlement(state);
}

function validateDirectControls(state: Settlement) {
  for(const bird of state.birds) {
    if(!("direct" in bird))continue;
    const d=object(bird.direct,["order","queue","pending","community","foodPatch"]);
    if(bird.life.stage!=="adult" || bird.care || bird.request || typeof d.pending!=="boolean" || typeof d.community!=="boolean" || d.foodPatch!==null&&!state.forage.some(p=>p.id===d.foodPatch))fail();
    const orders=[...(d.order===null?[]:[d.order]),...list(d.queue,16)];
    if(d.community && (d.order!==null || (d.queue as unknown[]).length))fail();
    for(const value of orders) {
      if(!value || typeof value!=="object")fail();
      const kind=(value as {kind:unknown}).kind;
      const o=object(value,kind==="move"?["kind","at"]:["kind","target"]);
      if(kind==="move") {
        cell(o.at,false,state);
        const at=o.at as Cell;
        if(state.world && !mapTile(settlementWorld(state).map!,at)?.traversable || worldTrees(state).some(t=>key(t)===key(at)))fail();
      } else if(!["gather","build","food"].includes(kind as string)||!text(o.target))fail();
      // A queued target may have completed/cancelled since issue; execution retires it.
    }
    if(bird.foodCargo && !d.foodPatch)fail();
  }
}
