/** Authored geography shared by pure navigation and the Babylon presentation.
* Cell corners are SW, SE, NE, NW. Discontinuous edges are cliffs, never ramps.
* World coordinates keep one cellSize scale; no renderer-only walkable shortcuts.
*/
export type MapPoint = {
  x: number;
  z: number;
};
export type Surface = "grass" | "earth" | "rock" | "water" | "ford" | "ramp";
export type MapTile = {
  surface: Surface;
  corners: readonly [
    number,
    number,
    number,
    number
  ];
  traversable: boolean;
  buildable: boolean;
  waterLevel?: number;
};
export type MapDefinition = {
  terrain?: {
    rocks: readonly {
      kind: "ledge" | "boulder";
      x: number;
      y: number;
      z: number;
      scale: number;
      turn: number;
      halfWidth: number;
      halfDepth: number;
    }[];
    scenery: {
      width: number;
      depth: number;
      cellSize: number;
      origin: MapPoint;
      heights: readonly number[];
    };
    recipe: string;
    seed: number;
    creek: readonly {
      left: MapPoint;
      right: MapPoint;
      level: number;
    }[];
  };
  id: string;
  version: number;
  name: string;
  size: "small" | "medium" | "large";
  width: number;
  depth: number;
  cellSize: number;
  tiles: readonly MapTile[];
  /** Scenario-owned starting positions and conserved demonstration stock. */
  scenario: {
    spawns: readonly MapPoint[];
    supply: {
      source: MapPoint;
      destination: MapPoint;
      initial: number;
    };
  };
  /** Shared planar vertex offsets, in cell units, for irregular authored landforms. */
  vertexOffsets?: readonly MapPoint[];
  ramps: readonly {
    id: string;
    from: MapPoint;
    to: MapPoint;
  }[];
  crossings: readonly {
    id: string;
    at: MapPoint;
  }[];
  landmarks: readonly {
    id: string;
    name: string;
    at: MapPoint;
  }[];
  obstacles: readonly {
    id: string;
    cells: readonly MapPoint[];
  }[];
};
export const mapKey = (p: MapPoint) => `${p.x},${p.z}`;
export const samePoint = (a: MapPoint, b: MapPoint) => a.x === b.x && a.z === b.z;
export const mapTile = (map: MapDefinition, p: MapPoint): MapTile | undefined => Number.isInteger(p.x) &&
  Number.isInteger(p.z) &&
  p.x >= 0 &&
  p.z >= 0 &&
  p.x < map.width &&
  p.z < map.depth
  ? map.tiles[p.z * map.width + p.x]
  : undefined;
export const tileHeight = (tile: MapTile) => tile.corners.reduce((sum, value) => sum + value, 0) / 4;
export function mapVertex(map: MapDefinition, x: number, z: number) {
  const offset = map.vertexOffsets?.[z * (map.width + 1) + x] ?? { x: 0, z: 0 };
  return {
    x: (x - map.width / 2 + offset.x) * map.cellSize,
    z: (z - map.depth / 2 + offset.z) * map.cellSize,
  };
}
/** Continuous world position from cell units, including the exact authored ramp surface. */
export function mapPosition(map: MapDefinition, p: MapPoint) {
  const cell = {
    x: Math.max(0, Math.min(map.width - 1, Math.floor(p.x + 0.5))),
    z: Math.max(0, Math.min(map.depth - 1, Math.floor(p.z + 0.5))),
  };
  const tile = mapTile(map, cell)!;
  const u = Math.max(0, Math.min(1, p.x - cell.x + 0.5));
  const v = Math.max(0, Math.min(1, p.z - cell.z + 0.5));
  const [sw, se, ne, nw] = tile.corners;
  // Same SW–NE diagonal as the rendered terrain triangles.
  const y = v <= u
    ? sw + (se - sw) * u + (ne - se) * v
    : sw + (ne - nw) * u + (nw - sw) * v;
  const vertices = [
    mapVertex(map, cell.x, cell.z),
    mapVertex(map, cell.x + 1, cell.z),
    mapVertex(map, cell.x + 1, cell.z + 1),
    mapVertex(map, cell.x, cell.z + 1),
  ];
  const sample = (axis: "x" | "z") => {
    const [a, b, c, d] = vertices.map((p) => p[axis]);
    return v <= u
      ? a + (b - a) * u + (c - b) * v
      : a + (c - d) * u + (d - a) * v;
  };
  return {
    x: sample("x"), y, z: sample("z")
  };
}
/** Adjacent cell centers cross the shared triangle surface in two straight halves.
* Keep saved progress in cell units while measuring work and time in metres.
*/
export function mapEdgeLengths(map: MapDefinition, from: MapPoint, to: MapPoint) {
  const a = mapPosition(map, from);
  const middle = mapPosition(map, { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 });
  const b = mapPosition(map, to);
  const length = (p: typeof a, q: typeof a) => Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
  return [length(a, middle), length(middle, b)] as const;
}
/** Shared scenic heightfield triangles; its inner vertices are identical to playable terrain. */
export function terrainHeight(map: MapDefinition, x: number, z: number): number {
  const f = map.terrain!.scenery;
  const gx = Math.max(0, Math.min(f.width - 1e-6, (x - f.origin.x) / f.cellSize));
  const gz = Math.max(0, Math.min(f.depth - 1e-6, (z - f.origin.z) / f.cellSize));
  const ix = Math.floor(gx), iz = Math.floor(gz), u = gx - ix, v = gz - iz;
  const sw = f.heights[iz * (f.width + 1) + ix], se = f.heights[iz * (f.width + 1) + ix + 1];
  const nw = f.heights[(iz + 1) * (f.width + 1) + ix], ne = f.heights[(iz + 1) * (f.width + 1) + ix + 1];
  return v <= u ? sw + (se - sw) * u + (ne - se) * v : sw + (ne - nw) * u + (nw - sw) * v;
}
