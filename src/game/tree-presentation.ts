import type { Settlement } from "../simulation/settlement";
import { type TreeId } from "../content/settlement";
import { habitatScale, habitatPosition, habitatPresentation, habitatAnchor, type HabitatPoint } from "../content/tree-habitats";
import { birdPosition, type Worker } from "../simulation/settlement";

/** Meshes, access routes, berths and cargo share the content-owned habitat transform. */
export const treeScale: Record<TreeId, number> = {
  lowfork: habitatScale("lowfork"), splitcrown: habitatScale("splitcrown"), reedside: habitatScale("reedside"),
  longbough: 1,
};
/** Cancel the bird parent scale so one physical bundle survives every transfer. */
export const carriedBundleScale=habitatPresentation.reedBundleScale/habitatPresentation.adultScale;
export function presentedTreePosition(treeId: TreeId, p: HabitatPoint, state?: Settlement) {
  if (state?.world) return p;
  const origin = habitatPosition(treeId, {x:0,y:0,z:0});
  const scale=treeScale[treeId];
  return {x:origin.x*2+(p.x-origin.x)*2*scale,y:p.y*scale,z:origin.z*2+(p.z-origin.z)*2*scale};
}
export function presentedBirdPosition(bird: Worker, state?: Settlement) {
  const perch = bird.perch ?? bird.flight;
  const p = birdPosition(bird, perch ? treeScale[perch.tree] : 1, state);
  if(state?.world) return p;
  return {x:p.x*2,y:p.y,z:p.z*2};
}

/** Authored chickens face +Z; align that forward axis with actual travel. */
export function birdHeading(delta: {x:number;z:number}) {
  return Math.atan2(delta.x, delta.z);
}

/** Grounded approach and folded landing are distinct parts of the saved route. */
export function accessAction(bird: Worker): "walk" | "flight" | "roost" {
  const access=bird.flight;
  if(!access||access.sheltered)return "walk";
  if(access.tree!=="longbough")return "flight";
  if(access.progress<=.1)return "walk";
  return access.progress>.70?"roost":"flight";
}

/** Reopened access has no previous rendered point; use the saved path, not spawn. */
export function accessHeading(bird: Worker, state?: Settlement): number | null {
  const access = bird.flight;
  if (!access) return null;
  const a = Math.max(0, access.progress - .0001), b = Math.min(1, access.progress + .0001);
  const before = presentedBirdPosition({ ...bird, flight: { ...access, progress: a } }, state);
  const after = presentedBirdPosition({ ...bird, flight: { ...access, progress: b } }, state);
  const sign = access.direction === "up" ? 1 : -1;
  const delta = { x: (after.x - before.x) * sign, z: (after.z - before.z) * sign };
  if (Math.hypot(delta.x, delta.z) > .000001) return birdHeading(delta);
  if (access.sheltered && Math.abs(after.y - before.y) > .000001) {
    // Descend facing the ladder as well: this is a clamber, not a backwards spawn-facing walk.
    const top = habitatAnchor(access.tree, "ladder-top"), entry = habitatAnchor(access.tree, "home-entry");
    return birdHeading({ x: entry.x - top.x, z: entry.z - top.z });
  }
  return null;
}


/** A deterministic short-clamber posture, not a change to the saved foot route. */
export function clamberLean(bird: Worker): number {
  const access = bird.flight;
  if (!access?.sheltered || access.slot < 2 || access.direction !== "down") return 0;
  const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  return .35 * Math.min(smooth((access.progress - .82) / .03), smooth((.98 - access.progress) / .03));
}
