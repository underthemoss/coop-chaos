import contract from "./tree-habitats.json";
import valleyContract from "./valley-habitat.json";
import { trees, type TreeId } from "./settlement";
import { settlementWorld, type WorldContext } from "./settlement-world";
import { mapPosition } from "./maps";

export type HabitatPoint = { x: number; y: number; z: number };
export type HabitatAnchor = keyof typeof contract.profiles["canopy-proof"]["anchors"];
export const habitatContract = contract;
/** World sizes do not depend on which tree a chicken inhabits. */
export const habitatPresentation = contract.presentation;
export type HabitatProfile = {
  anchors: Record<string, readonly number[]>;
  naturalPerches: readonly string[];
  shelteredPerches: readonly string[];
  homeAccess: readonly { progress: number; anchor: string }[];
  deckAccess: readonly { progress: number; anchor: string }[];
  placeAccess?: Record<string, readonly { progress: number; anchor: string }[]>;
  perchYawRadians?: Record<string, number>;
  groundWorkPoint?: readonly number[];
  groundApproach?: readonly string[];
  naturalGroundApproach?: readonly string[];
  groundWorkCell?: readonly number[];
  places: { natural: string; home: string; hauling: string; deck: string };
  hauling: {
    basketNode: string; ropeNode: string; travelY: number;
    ropeRestLength: number; bridleAboveBasket: number;
    cargoYawRadians?: number;
  };
};
export const treeHabitat = (tree: TreeId): HabitatProfile => tree === "longbough"
  ? valleyContract.profile
  : contract.profiles[contract.trees[tree].profile as keyof typeof contract.profiles];
export const habitatScale = (tree: TreeId) => tree === "longbough" ? 1 : contract.trees[tree].scale;
export function habitatAnchor(tree: TreeId, name: string): HabitatPoint {
  const [x, y, z] = treeHabitat(tree).anchors[name];
  return { x, y, z };
}
/** Convert authored local metres to unscaled simulation coordinates. */
export function habitatPosition(tree: TreeId, point: HabitatPoint, context?: WorldContext): HabitatPoint {
  const world = settlementWorld(context);
  if (world.map) {
    const treeAt = world.trees.find(t => t.id === tree);
    if (!treeAt) throw new Error("This tree does not belong to this world.");
    const at = mapPosition(world.map, treeAt);
    return { x: at.x + point.x, y: at.y + point.y, z: at.z + point.z };
  }
  const at = trees.find(t => t.id === tree)!;
  return { x: at.x + point.x / 2, y: point.y, z: at.z + point.z / 2 };
}
export function treeWorkCell(tree: TreeId, context?: WorldContext) {
  const world = settlementWorld(context);
  if (world.map) {
    const instance = world.trees.find(t => t.id === tree);
    if (!instance?.work) throw new Error("This tree has no grounded work approach.");
    return { ...instance.work };
  }
  const at = trees.find(t => t.id === tree)!;
  const [x, z] = treeHabitat(tree).groundWorkCell!;
  return { x: at.x + x, z: at.z + z };
}
