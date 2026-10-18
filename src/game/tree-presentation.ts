import { trees, type TreeId } from "../content/settlement";
import { birdPosition, perchPosition, type Worker } from "../simulation/settlement";

/** One presentation transform for mesh, home, ladder and occupied/approached anchors.
 * Ground cells and all saved simulation coordinates retain their original meaning. */
export const treeScale: Record<TreeId, number> = {
  lowfork: 1,
  splitcrown: 0.76,
  reedside: 0.62,
};
/** Convert tree-local simulation coordinates without changing saved cells. */
export function presentedTreePosition(treeId: TreeId, p: {x:number;y:number;z:number}) {
  const tree=trees.find(t=>t.id===treeId)!;
  const scale=treeScale[treeId];
  return {x:tree.x*2+(p.x-tree.x)*2*scale,y:p.y*scale,z:tree.z*2+(p.z-tree.z)*2*scale};
}
export function presentedBirdPosition(bird: Worker) {
  const p = birdPosition(bird);
  const perch = bird.perch ?? bird.flight;
  if (!perch) return { x: p.x * 2, y: p.y, z: p.z * 2 };
  const tree = trees.find((t) => t.id === perch.tree)!;
  const scale = treeScale[tree.id];
  const end = perchPosition(perch);
  const endDelta = {
    x: (end.x - tree.x) * 2 * (scale - 1),
    y: end.y * (scale - 1),
    z: (end.z - tree.z) * 2 * (scale - 1),
  };
  if (!bird.flight) return {
    x: p.x * 2 + endDelta.x,
    y: p.y + endDelta.y,
    z: p.z * 2 + endDelta.z,
  };
  const t = bird.flight.progress;
  if (!perch.sheltered) return {
    x: p.x * 2 + endDelta.x * t,
    y: p.y + endDelta.y * t,
    z: p.z * 2 + endDelta.z * t,
  };
  // Match the saved approach/climb/exit phases while moving their visual anchors.
  const approach = Math.min(1, t / .4);
  const climb = Math.min(1, Math.max(0, (t - .4) / .45));
  const exit = Math.max(0, (t - .85) / .15);
  const baseDelta = -1.08 * (scale - 1);
  return {
    x: p.x * 2 + endDelta.x * exit,
    y: p.y + endDelta.y * climb,
    z: p.z * 2 + baseDelta * approach + (endDelta.z - baseDelta) * exit,
  };
}
