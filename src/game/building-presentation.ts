import { settlementWorld, type WorldContext } from "../content/settlement-world";
import { mapPosition } from "../content/maps";
import type { Cell, Site } from "../simulation/settlement";
import { cost, groundAccess } from "../simulation/settlement";

/** Authored reed kit. These are render assets, never additional recipes or stores. */
export const buildingAssets = [
  { id: "sleeping-deck", path: "environment/buildings/sleeping-deck-compatible.glb" },
  { id: "boughhome", path: "environment/buildings/boughhome.glb" },
  { id: "reed-store", path: "environment/buildings/reed-store.glb" },
  { id: "root-nursery", path: "environment/buildings/root-nursery.glb" },
] as const;

/** The saved construction state controls every visible part of the reed kit. */
export function buildingStage(site: Site): 0 | 1 | 2 | 3 {
  return site.complete ? 3 : site.progress >= 10 ? 2 : site.delivered >= cost(site) ? 1 : 0;
}

export function homePartVisible(name: string, stage: number) {
  const part = name.toLowerCase();
  return stage > 0 && !(part.includes("rainhood") && stage < 2 || part.includes("ladder") && stage < 3);
}

/** Ground kits are assembled in place; never flatten a completed roof or container. */
export function groundPartVisible(name: string, stage: number) {
  const part = name.toLowerCase();
  if (stage === 0) return false;
  if (/hood|container|nest|finish/.test(part)) return stage === 3;
  if (part.includes("frame")) return stage >= 2;
  return true; // Authored base, floor and ground-contact bindings.
}

/** Babylon prefixes cloned node names; keep source semantics independent of instances. */
export function authoredPart(node: { name: string; metadata?: { authoredPart?: string } | null }) {
  return node.metadata?.authoredPart ?? node.name;
}

export function habitatPartVisible(node: Parameters<typeof authoredPart>[0], names: ReadonlySet<string>) {
  const name = authoredPart(node);
  return [...names].some(part => name === part || name.startsWith(`${part}_primitive`));
}

/** Preview and earned nursery use the same ground placement in both supported worlds. */
export function nurseryPresentation(at:Cell,state?:WorldContext) {
  const map=settlementWorld(state).map;
  if(map)return mapPosition(map,at);
  const court=groundAccess(at,state);
  return {x:court.x*2-1.05,y:0,z:court.z*2+.55};
}
