import type { MapDefinition } from "../content/maps";

/** Presentation only: these values never enter the portable simulation state. */
export type ValleyZoom = 0 | 1 | 2 | 3;
export const valleyZoomNames = ["Whole valley", "Wide", "Tactical", "Close"] as const;
export function hasTacticalPresentation(map: Pick<MapDefinition, "id" | "version">) {
  return map.id === "ochre-valley" && map.version === 2;
}
export function stepValleyZoom(level: ValleyZoom, direction: number): ValleyZoom {
  return Math.max(0, Math.min(3, level + Math.sign(direction))) as ValleyZoom;
}
export function followHalfSpan(level: ValleyZoom) {
  return [6, 6, 4.2, 3.2][level];
}
