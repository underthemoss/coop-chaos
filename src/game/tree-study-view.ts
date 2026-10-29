/** Render-only bounds; these never enter geography or a save. */
export type StudyBounds = { min: readonly number[]; max: readonly number[] };
export type TreeStudyView = "whole" | "detail" | "chicken";
export interface StudyHabitation {
  revision: string;
  assetUrl: string;
  anatomicalGroundY: number;
  front: string;
  deckFloors: readonly { id: string; floorTag: string; center: readonly number[]; outline: readonly (readonly number[])[] }[];
  birdFixtures: readonly { id: string; floorTag: string; position: readonly number[]; yawRadians: number; character: string; cargo: boolean }[];
  detailBounds: StudyBounds;
}
export const treeStudyForms = [
  { id: "longbough", name: "Longbough", file: "longbough-study.glb" },
  { id: "crowncourt", name: "Crowncourt", file: "crowncourt-study.glb" },
  { id: "windward", name: "Windward", file: "riverside-study.glb" },
] as const;
export type TreeStudyForm = typeof treeStudyForms[number]["id"];
export function unionStudyBounds(bounds: readonly StudyBounds[]): StudyBounds {
  return {
    min: [0, 1, 2].map(i => Math.min(...bounds.map(b => b.min[i]))),
    max: [0, 1, 2].map(i => Math.max(...bounds.map(b => b.max[i]))),
  };
}
/** Orthographic fit in the existing camera basis, equal across all growth forms. */
export function fitStudyBounds(bounds: StudyBounds, alpha: number, beta: number, aspect: number) {
  const center = bounds.min.map((v, i) => (v + bounds.max[i]) / 2);
  const half = bounds.min.map((v, i) => (bounds.max[i] - v) / 2);
  const width = Math.abs(Math.sin(alpha)) * half[0] + Math.abs(Math.cos(alpha)) * half[2];
  const height = Math.abs(Math.cos(alpha) * Math.cos(beta)) * half[0]
    + Math.sin(beta) * half[1] + Math.abs(Math.sin(alpha) * Math.cos(beta)) * half[2];
  return { center, halfSpan: Math.max(height, width / aspect) * 1.12 };
}
