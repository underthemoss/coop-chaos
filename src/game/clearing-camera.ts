import { mapPosition, mapVertex } from "../content/maps";
import { settlementWorld, type WorldContext } from "../content/settlement-world";
import { fitStudyBounds } from "./tree-study-view";

export type ClearingFraming = "habitat" | "whole" | "follow";
export const defaultClearingZoom = 4.2;
export const clearingZoomLevels = [3.2, defaultClearingZoom, 6] as const;

export function stepClearingZoom(zoom: number, direction: "in" | "out"): number {
  return direction === "in"
    ? [...clearingZoomLevels].reverse().find(level => level < zoom) ?? clearingZoomLevels[0]
    : clearingZoomLevels.find(level => level > zoom) ?? clearingZoomLevels.at(-1)!;
}

export function wheelClearingZoom(zoom: number, deltaY: number): number {
  return deltaY ? stepClearingZoom(zoom, deltaY < 0 ? "in" : "out") : zoom;
}

/** Fit the chosen view first, then apply the same bounded zoom to every frame. */
export function clearingCameraView(context: WorldContext, framing: ClearingFraming, zoom: number, alpha: number, beta: number, aspect: number) {
  const definition = settlementWorld(context), map = definition.map;
  let halfHeight = Math.max(10.8, 10.8 / aspect);
  let target: readonly number[] | null = null;
  if (!map) return { halfHeight, target };
  if (framing === "whole") {
    const fit = fitStudyBounds({ min: [-map.width * map.cellSize / 2, 0, -map.depth * map.cellSize / 2], max: [map.width * map.cellSize / 2, 16, map.depth * map.cellSize / 2] }, alpha, beta, aspect);
    target = fit.center;
    halfHeight = fit.halfSpan;
  } else if (framing === "habitat") {
    const at = mapPosition(map, definition.trees[0]);
    const fit = fitStudyBounds({ min: [at.x - 8.5, at.y - .4, at.z - 5.4], max: [at.x + 8.5, at.y + 13.6, at.z + 5.5] }, alpha, beta, aspect);
    target = [fit.center[0], fit.center[1] - 1, fit.center[2] + 1.2];
    const crownWidth = Math.abs(Math.sin(alpha)) * 8.5 + Math.abs(Math.cos(alpha)) * 5.45;
    halfHeight = Math.max(fit.halfSpan * 1.03 * .78, crownWidth / aspect * 1.12);
  } else halfHeight = defaultClearingZoom;
  return { halfHeight: halfHeight * zoom / defaultClearingZoom, target };
}

export type CameraPoint = { x: number; y: number; z: number };
export type PanAxis = { x: number; y: number };
export type CameraBounds = { minX: number; maxX: number; minZ: number; maxZ: number };

/** Actual authored vertices bound camera centers, not the larger fitted viewport. */
export function clearingCameraBounds(context: WorldContext): CameraBounds | null {
  const map = settlementWorld(context).map;
  if (!map) return null;
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let z = 0; z <= map.depth; z++) for (let x = 0; x <= map.width; x++) {
    const p = mapVertex(map, x, z);
    bounds.minX = Math.min(bounds.minX, p.x); bounds.maxX = Math.max(bounds.maxX, p.x);
    bounds.minZ = Math.min(bounds.minZ, p.z); bounds.maxZ = Math.max(bounds.maxZ, p.z);
  }
  return bounds;
}

/** Positive x/y moves the view right/down in CSS pixels on the ground plane. */
export function clearingPanOffset(pixels: PanAxis, halfHeight: number, height: number, alpha: number, beta: number) {
  const scale = 2 * halfHeight / Math.max(1, height);
  const right = pixels.x * scale, down = pixels.y * scale / Math.cos(beta);
  return { x: -Math.sin(alpha) * right + Math.cos(alpha) * down, z: Math.cos(alpha) * right + Math.sin(alpha) * down };
}

export function boundedCameraPan(target: CameraPoint, offset: { x: number; z: number }, bounds: CameraBounds): CameraPoint {
  return { x: Math.max(bounds.minX, Math.min(bounds.maxX, target.x + offset.x)), y: target.y, z: Math.max(bounds.minZ, Math.min(bounds.maxZ, target.z + offset.z)) };
}

/** Preserve the captured free-view span through zoom and responsive resize. */
export function freeCameraHalfHeight(capturedHalfHeight: number, capturedZoom: number, zoom: number) {
  return capturedHalfHeight * zoom / capturedZoom;
}

export function cameraEdgeAxis(point: PanAxis, width: number, height: number): PanAxis {
  const edge = (value: number, size: number) => value < 0 || value > size ? 0
    : value < 24 ? -(24 - value) / 24 : value > size - 24 ? (value - size + 24) / 24 : 0;
  if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) return { x: 0, y: 0 };
  return { x: edge(point.x, width), y: edge(point.y, height) };
}

/** Arrow and edge speeds use a viewport-height per second; diagonals do not boost speed. */
export function cameraPanPixels(axis: PanAxis, height: number, seconds: number): PanAxis {
  const length = Math.max(1, Math.hypot(axis.x, axis.y));
  const scale = height * .6 * Math.max(0, Math.min(.1, seconds)) / length;
  return { x: axis.x * scale, y: axis.y * scale };
}
