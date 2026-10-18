import { type TreeId } from "../content/settlement";
import { habitatScale, habitatPosition, habitatPresentation, type HabitatPoint } from "../content/tree-habitats";
import { birdPosition, type Worker } from "../simulation/settlement";

/** Meshes, access routes, berths and cargo share the content-owned habitat transform. */
export const treeScale: Record<TreeId, number> = {
  lowfork: habitatScale("lowfork"), splitcrown: habitatScale("splitcrown"), reedside: habitatScale("reedside"),
};
/** Cancel the bird parent scale so one physical bundle survives every transfer. */
export const carriedBundleScale=habitatPresentation.reedBundleScale/habitatPresentation.adultScale;
export function presentedTreePosition(treeId: TreeId, p: HabitatPoint) {
  const origin = habitatPosition(treeId, {x:0,y:0,z:0});
  const scale=treeScale[treeId];
  return {x:origin.x*2+(p.x-origin.x)*2*scale,y:p.y*scale,z:origin.z*2+(p.z-origin.z)*2*scale};
}
export function presentedBirdPosition(bird: Worker) {
  const perch = bird.perch ?? bird.flight;
  const p = birdPosition(bird, perch ? treeScale[perch.tree] : 1);
  return {x:p.x*2,y:p.y,z:p.z*2};
}

/** Authored chickens face +Z; align that forward axis with actual travel. */
export function birdHeading(delta: {x:number;z:number}) {
  return Math.atan2(delta.x, delta.z);
}
