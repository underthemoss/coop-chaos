import {
  trees,
  foodPatches,
  reedPatches,
  tuning,
  type TreeId,
  type FoodPatchId,
  type ForagePreference,
} from "./settlement";
import type { MapDefinition, MapPoint } from "./maps";
import inhabitedMap from "./generated/inhabited-valley-v1.json";
import placements from "./generated/inhabited-valley-placements-v1.json";
import refinedMap from "./generated/inhabited-valley-v2.json";
import refinedPlacements from "./generated/inhabited-valley-placements-v2.json";

/** Only this identity is saved. Immutable content owns geography and starting facts. */
export type WorldIdentity = { id: string; version: number };
export type WorldContext = { world?: WorldIdentity };
export type WorldTree = {
  id: TreeId;
  name: string;
  description: string;
  x: number;
  z: number;
  work?: MapPoint;
};
export type GroundBuildPad = {
  id: string;
  name: string;
  kind: "store" | "nursery";
  tree?: TreeId;
  at: MapPoint;
  approach: MapPoint;
  footprint: { width: number; depth: number };
};
export type SettlementWorld = {
  identity: WorldIdentity;
  name: string;
  map?: MapDefinition;
  trees: readonly WorldTree[];
  source: { at: MapPoint; stock: number };
  spawns: readonly MapPoint[];
  reedPatches: readonly { id: string; name: string; description: string; at: MapPoint; capacity: number }[];
  foodPatches: readonly {
    id: FoodPatchId;
    name: string;
    description: string;
    habitat: ForagePreference;
    at: MapPoint;
    capacity: number;
  }[];
  pads: readonly GroundBuildPad[];
};

/** Legacy cells, starting values and object shapes remain unchanged. */
export const woodlandWorld: SettlementWorld = {
  identity: { id: "woodland", version: 1 },
  name: "Woodland settlement",
  trees,
  source: { at: { x: -3, z: -2 }, stock: tuning.initialReeds },
  spawns: Array.from({ length: 4 }, () => ({ x: -3, z: -2 })),
  reedPatches: reedPatches.map(p => ({...p, name: p.id === "patch-west" ? "West reeds" : "East reeds", description: "Construction reeds recover during daylight."})),
  foodPatches,
  pads: [],
};

function inhabitedWorld(map: MapDefinition, placements: typeof refinedPlacements): SettlementWorld { return {
  identity: { id: map.id, version: map.version },
  name: map.version === 1 ? "Original living valley" : "Refined living valley",
  map,
  trees: [{
    id: "longbough", name: placements.tree.name,
    description: "A broad living fork above the basin; reed homes grow around its branches.",
    ...placements.tree.at, work: placements.tree.work,
  }],
  source: placements.source,
  spawns: placements.spawns,
  reedPatches: placements.resources.filter(r => r.kind === "reeds").map(r => ({ id: r.id, name: r.name, description: r.description, at: r.at, capacity: r.capacity })),
  foodPatches: placements.resources.filter(r => r.kind !== "reeds").map(r => ({
    id: r.id as FoodPatchId, name: r.name, description: r.description,
    habitat: r.habitat as ForagePreference, at: r.at, capacity: r.capacity,
  })),
  pads: placements.pads.map(p => ({ ...p, name: p.kind === "store" ? `${p.id === "store-west" ? "West" : "East"} reed store` : `${placements.tree.name} nursery`, kind: p.kind as GroundBuildPad["kind"], tree: p.tree as TreeId | undefined })),
}; }

export const originalInhabitedValleyWorld = inhabitedWorld(inhabitedMap as unknown as MapDefinition, placements);
export const inhabitedValleyWorld = inhabitedWorld(refinedMap as unknown as MapDefinition, refinedPlacements);

/** Kept explicit: unknown scenario identities never fall back to another world. */
export function settlementWorld(context?: WorldContext): SettlementWorld {
  if (!context?.world) return woodlandWorld;
  if (context.world.id === "woodland" && context.world.version === 1)
    return woodlandWorld;
  if (context.world.id === originalInhabitedValleyWorld.identity.id && context.world.version === 1) return originalInhabitedValleyWorld;
  if (context.world.id === inhabitedValleyWorld.identity.id && context.world.version === inhabitedValleyWorld.identity.version)
    return inhabitedValleyWorld;
  throw new Error("This inhabited world or world version is unavailable. Its original data is preserved.");
}

export const worldTrees = (context?: WorldContext) => settlementWorld(context).trees;
export const worldFoodPatches = (context?: WorldContext) => settlementWorld(context).foodPatches;
export const worldReedPatches = (context?: WorldContext) => settlementWorld(context).reedPatches;

/** Current world metadata supplies every resource/place name, including legacy saves. */
export function reedPatchName(context: WorldContext, id: string) { return worldReedPatches(context).find(p=>p.id===id)?.name ?? id; }
export function buildingPlace(context: WorldContext, site: {at:MapPoint;tree:string|null}) {
  const world=settlementWorld(context);
  return world.pads.find(p=>p.at.x===site.at.x&&p.at.z===site.at.z)?.name ?? world.trees.find(t=>t.id===site.tree)?.name ?? "Reed store";
}
