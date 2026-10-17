import {
  initialSettlement,
  initialForage,
  initialAppetite,
  feedingSpots,
  initialPatches,
  conserved,
  available,
  validCell,
  key,
  cost,
} from "../simulation/settlement";
import type { Settlement, Cell } from "../simulation/settlement";
import {
  foodPatches,
  forageTuning,
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
function cell(v: unknown, fractional = false): v is Cell {
  const p = object(v, ["x", "z"]);
  if (
    !number(p.x, -4, 4) ||
    !number(p.z, -3, 3) ||
    (!fractional && (!integer(p.x, -4, 4) || !integer(p.z, -3, 3)))
  )
    return fail();
  return true;
}
function list(v: unknown, max: number): unknown[] {
  if (!Array.isArray(v) || v.length > max) return fail();
  return v;
}
function text(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length < 200;
}
function perch(v: unknown, flying: boolean) {
  const p = object(
    v,
    flying
      ? ["tree", "slot", "sheltered", "progress", "direction", "from"]
      : ["tree", "slot", "sheltered"],
  );
  if (
    !trees.some((t) => t.id === p.tree) ||
    !integer(p.slot, 0, 1) ||
    typeof p.sheltered !== "boolean"
  )
    fail();
  if (
    flying &&
    (!number(p.progress) ||
      !["up", "down"].includes(p.direction as string) ||
      !cell(p.from, true))
  )
    fail();
}
/** Validate shape AND relationships before any state or IndexedDB replacement. */
const legacyInitialReeds = 40;
const maximumHarvest = reedPatches.reduce(
  (total, patch) => total + patch.capacity,
  0,
);
/** Version 1 has an immutable shape and material budget, independent of fresh-game tuning. */
function validateVersion(value: unknown, version: 1 | 2 | 3): Settlement {
  const legacy = version === 1;
  const current = version === 3;
  const s = object(value, [
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
  const budget = legacy
    ? legacyInitialReeds
    : (s.initialReeds === 8 || s.initialReeds === legacyInitialReeds) &&
        integer(s.harvestedReeds, 0, maximumHarvest)
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
      ]);
      const fixture = reedPatches.find((f) => f.id === p.id);
      if (
        !fixture ||
        ids.has(p.id) ||
        !cell(p.at) ||
        p.capacity !== fixture.capacity ||
        !integer(p.remaining, 0, fixture.capacity) ||
        !integer(p.harvested, 0, fixture.capacity) ||
        p.remaining + p.harvested !== fixture.capacity ||
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
    if (!validCell({ x, z }) || key({ x, z }) !== p) fail();
  }
  if (new Set(paths).size !== paths.length) fail();
  for (const value of list(s.piles, 64)) {
    const p = object(value, ["id", "at", "stock", "kind"]);
    if (
      !text(p.id) ||
      !cell(p.at) ||
      !integer(p.stock, 0, budget) ||
      !["source", "salvage"].includes(p.kind as string)
    )
      fail();
  }
  for (const value of list(s.sites, 63)) {
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
    ]);
    if (
      !text(p.id) ||
      !/^site-\d+$/.test(p.id as string) ||
      !["treehouse", "store"].includes(p.kind as string) ||
      !cell(p.at) ||
      typeof p.complete !== "boolean" ||
      !integer(p.delivered, 0, 6) ||
      !integer(p.progress, 0, 30) ||
      !integer(p.stock, 0, 12) ||
      !integer(p.target, 0, 12)
    )
      fail();
    if (
      p.kind === "treehouse"
        ? !trees.some((t) => t.id === p.tree && key(t) === key(p.at as Cell))
        : p.tree !== null || trees.some((t) => key(t) === key(p.at as Cell))
    )
      fail();
    for (const id of list(p.contributors, 6))
      if (!settlers.some((b) => b.id === id)) fail();
    if (
      p.complete
        ? p.progress !== 30 || p.delivered !== 0
        : p.progress !== 0 && p.delivered !== (p.kind === "treehouse" ? 6 : 4)
    )
      fail();
    if (
      (p.kind !== "store" && (p.stock !== 0 || p.target !== 0)) ||
      (!p.complete && (p.stock !== 0 || p.target !== 0))
    )
      fail();
    if ((p.delivered as number) > (p.kind === "treehouse" ? 6 : 4)) fail();
  }
  for (const value of list(s.birds, 4)) {
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
      ...(legacy ? [] : ["gatheringProgress"]),
      ...(current
        ? ["satiety", "foragePreference", "rememberedForage", "foraging"]
        : []),
    ]);
    if (
      !settlers.some((p) => p.id === b.id) ||
      !cell(b.at) ||
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
      cell(e.to);
      if (
        !number(e.progress, 0, 0.999999999) ||
        Math.abs((e.to as Cell).x - (b.at as Cell).x) +
          Math.abs((e.to as Cell).z - (b.at as Cell).z) !==
          1
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
    } else if (b.cargo !== 0) fail();
    if (!legacy && (b.gatheringProgress as number) > 0) {
      const j = b.job as Record<string, unknown> | null;
      if (!j || j.kind !== "gather" || j.stage !== "pickup" || b.edge) fail();
      const patch = (s.patches as Settlement["patches"]).find(
        (p) => p.id === j!.source,
      );
      if (!patch || key(patch.at) !== key(b.at as Cell)) fail();
    }
    if (b.perch !== null) perch(b.perch, false);
    if (b.flight !== null) perch(b.flight, true);
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
        "regrown",
        "recoveryProgress",
        "open",
      ]);
      const fixture = foodPatches.find((f) => f.id === p.id);
      if (
        !fixture ||
        foodIds.has(p.id) ||
        !cell(p.at) ||
        key(p.at as Cell) !== key(fixture.at) ||
        p.capacity !== fixture.capacity ||
        !integer(p.remaining, 0, fixture.capacity) ||
        !integer(p.eaten) ||
        !integer(p.regrown) ||
        fixture.capacity + (p.regrown as number) !==
          (p.remaining as number) + (p.eaten as number) ||
        !integer(p.recoveryProgress, 0, forageTuning.recoveryTicks - 1) ||
        (p.remaining === fixture.capacity && p.recoveryProgress !== 0) ||
        typeof p.open !== "boolean"
      )
        fail();
      foodIds.add(p.id);
    }
    for (const value of s.birds as unknown[]) {
      const b = value as Record<string, unknown>;
      const fixture = settlers.find((p) => p.id === b.id)!;
      if (
        !number(b.satiety, 0, 100) ||
        b.foragePreference !== fixture.foragePreference ||
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
          !cell(f.spot) ||
          !["eat", "browse"].includes(f.intent as string) ||
          !integer(f.progress, 0, forageTuning.scratchTicks - 1) ||
          b.job ||
          b.cargo ||
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
    state.birds.length !== 4 ||
    new Set(state.birds.map((b) => b.id)).size !== 4 ||
    new Set(state.sites.map((p) => key(p.at))).size !== state.sites.length
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
  const source = state.piles.filter((p) => p.kind === "source");
  if (
    source.length !== 1 ||
    source[0].id !== "reeds" ||
    key(source[0].at) !== "-3,-2" ||
    state.sites.some((p) => key(p.at) === "-3,-2")
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
            destination.delivered !== cost(destination)
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
        if (
          !state.piles.some(
            (p) => p.kind === "source" && p.id === j.destination,
          ) &&
          !(destination?.complete && destination.kind === "store")
        )
          fail();
        if (
          j.stage === "pickup" &&
          (!patch.designated || state.phase !== "day")
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
          !state.sites.some((s) => s.complete && s.tree === p.tree))
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
  return structuredClone(state);
}
export function validateSettlement(value: unknown): Settlement {
  return validateVersion(value, 3);
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
function migrateVersionTwo(value: unknown): Settlement {
  const state = validateVersion(value, 2);
  const { paths: _paths, ...facts } = state as Settlement & { paths: string[] };
  return validateSettlement({
    ...facts,
    forage: initialForage(),
    birds: state.birds.map((b) => ({ ...b, ...initialAppetite(b.id) })),
  });
}
function migrateLegacy(value: unknown): Settlement {
  const legacy = validateVersion(value, 1);
  return migrateVersionTwo({
    ...legacy,
    initialReeds: legacyInitialReeds,
    harvestedReeds: 0,
    patches: migrationPatches(legacy),
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
    schemaVersion: 3,
    simulationVersion: "settlement-3",
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
    return validateSettlement(envelope.state);
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
