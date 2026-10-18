import contract from "./tree-habitats.json";
import { trees, type TreeId } from "./settlement";

export type HabitatPoint = { x: number; y: number; z: number };
export type HabitatAnchor = keyof typeof contract.profiles["canopy-proof"]["anchors"];
export const habitatContract = contract;
export const treeHabitat = (tree: TreeId) =>
  contract.profiles[contract.trees[tree].profile as keyof typeof contract.profiles];
export const habitatScale = (tree: TreeId) => contract.trees[tree].scale;
export function habitatAnchor(tree: TreeId, name: HabitatAnchor): HabitatPoint {
  const [x, y, z] = treeHabitat(tree).anchors[name];
  return { x, y, z };
}
/** Convert authored local metres to unscaled simulation coordinates. */
export function habitatPosition(tree: TreeId, point: HabitatPoint): HabitatPoint {
  const at = trees.find(t => t.id === tree)!;
  return { x: at.x + point.x / 2, y: point.y, z: at.z + point.z / 2 };
}
export function treeWorkCell(tree: TreeId) {
  const at = trees.find(t => t.id === tree)!;
  const [x, z] = treeHabitat(tree).groundWorkCell;
  return { x: at.x + x, z: at.z + z };
}
