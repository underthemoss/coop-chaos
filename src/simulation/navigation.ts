import { mapKey, mapTile, samePoint, mapPosition, mapEdgeLengths } from "../content/maps";
import type { MapDefinition, MapPoint } from "../content/maps";
/** Both ends of a shared edge must meet. Adjacent cliff tops never imply access. */
export function canTraverse(map: MapDefinition, from: MapPoint, to: MapPoint): boolean {
  const a = mapTile(map, from), b = mapTile(map, to);
  if (!a?.traversable || !b?.traversable)
    return false;
  const dx = to.x - from.x, dz = to.z - from.z;
  if (Math.abs(dx) > 1 || Math.abs(dz) > 1 || !(dx || dz))
    return false;
  if (dx && dz) {
    // Both orthogonal corridors must be open; no cutting rock or cliff corners.
    const alongX = { x: to.x, z: from.z }, alongZ = { x: from.x, z: to.z };
    return (canTraverse(map, from, alongX) &&
      canTraverse(map, alongX, to) &&
      canTraverse(map, from, alongZ) &&
      canTraverse(map, alongZ, to));
  }
  const edges = dx === 1
    ? [a.corners[1], a.corners[2], b.corners[0], b.corners[3]]
    : dx === -1
      ? [a.corners[0], a.corners[3], b.corners[1], b.corners[2]]
      : dz === 1
        ? [a.corners[3], a.corners[2], b.corners[0], b.corners[1]]
        : [a.corners[0], a.corners[1], b.corners[3], b.corners[2]];
  return (Math.abs(edges[0]! - edges[2]!) < 0.001 &&
    Math.abs(edges[1]! - edges[3]!) < 0.001);
}
const directions = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, -1],
  [-1, 1],
] as const;
/** Deterministic A*: stable neighbor/tie ordering, physical distance and no random state. */
export function findRoute(map: MapDefinition, from: MapPoint, goal: MapPoint): MapPoint[] | null {
  if (!mapTile(map, from)?.traversable || !mapTile(map, goal)?.traversable)
    return null;
  if (samePoint(from, goal))
    return [];
  const worldGoal = mapPosition(map, goal);
  const heuristic = (at: MapPoint) => {
    const p = mapPosition(map, at);
    return Math.hypot(p.x - worldGoal.x, p.z - worldGoal.z);
  };
  const startKey = mapKey(from), goalKey = mapKey(goal);
  const open: {
    at: MapPoint;
    g: number;
    f: number;
    serial: number;
  }[] = [
    {
      at: { ...from },
      g: 0,
      f: heuristic(from),
      serial: 0,
    },
  ];
  const costs = new Map([[startKey, 0]]), previous = new Map<string, MapPoint>();
  let serial = 1;
  while (open.length) {
    open.sort((a, b) => a.f - b.f || a.serial - b.serial);
    const current = open.shift()!, currentKey = mapKey(current.at);
    if (current.g > costs.get(currentKey)!)
      continue;
    if (currentKey === goalKey) {
      const route: MapPoint[] = [];
      let at = current.at;
      while (!samePoint(at, from)) {
        route.push(at);
        at = previous.get(mapKey(at))!;
      }
      return route.reverse();
    }
    for (const [dx, dz] of directions) {
      const to = { x: current.at.x + dx, z: current.at.z + dz };
      if (!canTraverse(map, current.at, to))
        continue;
      const [first, second] = mapEdgeLengths(map, current.at, to);
      const g = current.g + first + second, toKey = mapKey(to);
      if (g >= (costs.get(toKey) ?? Infinity))
        continue;
      costs.set(toKey, g);
      previous.set(toKey, current.at);
      open.push({
        at: to,
        g,
        f: g + heuristic(to),
        serial: serial++,
      });
    }
  }
  return null;
}
