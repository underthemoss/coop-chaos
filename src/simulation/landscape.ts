import type { MapDefinition, MapPoint } from "../content/maps";
import { mapPosition, mapEdgeLengths, samePoint } from "../content/maps";
import { getMap, defaultValley } from "../content/small-valley";
import { findRoute } from "./navigation";
export const landscapeBirds = ["fern", "rook", "dapple", "wren"] as const;
export type LandscapeBirdId = (typeof landscapeBirds)[number];
export type Walker = {
  id: LandscapeBirdId;
  at: MapPoint;
  route: MapPoint[];
  progress: number;
  cargo: number;
  delivery: boolean;
};
export type Landscape = {
  kind: "landscape";
  mapId: string;
  mapVersion: number;
  elapsed: number;
  birds: Walker[];
  source: number;
  delivered: number;
};
export function initialLandscape(map: MapDefinition = defaultValley): Landscape {
  return {
    kind: "landscape",
    mapId: map.id,
    mapVersion: map.version,
    elapsed: 0,
    source: map.scenario.supply.initial,
    delivered: 0,
    birds: landscapeBirds.map((id, i) => ({
      id,
      at: { ...map.scenario.spawns[i] },
      route: [],
      progress: 0,
      cargo: 0,
      delivery: false,
    })),
  };
}
export function walkerPosition(state: Landscape, bird: Walker) {
  const map = getMap(state.mapId, state.mapVersion)!;
  const next = bird.route[0] ?? bird.at;
  return mapPosition(map, {
    x: bird.at.x + (next.x - bird.at.x) * bird.progress,
    z: bird.at.z + (next.z - bird.at.z) * bird.progress,
  });
}
/** Redirect only after completing the current edge; never teleport an in-flight walker. */
export function moveWalker(state: Landscape, id: LandscapeBirdId, to: MapPoint, delivery = false): Landscape | null {
  const map = getMap(state.mapId, state.mapVersion)!;
  const bird = state.birds.find((b) => b.id === id)!;
  const anchor = bird.progress > 0 ? bird.route[0] : bird.at;
  const route = findRoute(map, anchor, to);
  if (!route)
    return null;
  return {
    ...state,
    birds: state.birds.map((b) => b.id !== id
      ? b
      : {
        ...b,
        route: bird.progress > 0 ? [anchor, ...route] : route,
        delivery,
      }),
  };
}
export function startDelivery(state: Landscape, id: LandscapeBirdId): Landscape | null {
  const bird = state.birds.find((b) => b.id === id)!;
  const supply = getMap(state.mapId, state.mapVersion)!.scenario.supply;
  return moveWalker(state, id, bird.cargo ? supply.destination : supply.source, true);
}
/** Pure distance-based movement. Only arrivals transfer real stock; no renderer outcomes. */
export function stepLandscape(state: Landscape, seconds: number): Landscape {
  if (!Number.isFinite(seconds) || seconds <= 0)
    return state;
  const map = getMap(state.mapId, state.mapVersion)!;
  const { source: sourcePoint, destination: deliveryPoint } = map.scenario.supply;
  const result: Landscape = {
    ...state,
    elapsed: state.elapsed + seconds,
    birds: state.birds.map((b) => ({
      ...b,
      at: { ...b.at },
      route: [...b.route],
    })),
  };
  for (const bird of result.birds) {
    let remaining = seconds;
    while (remaining > 1e-8) {
      if (!bird.route.length) {
        if (!bird.delivery)
          break;
        if (samePoint(bird.at, sourcePoint) &&
          !bird.cargo &&
          result.source > 0) {
          bird.cargo = Math.min(2, result.source);
          result.source -= bird.cargo;
          bird.route = findRoute(map, bird.at, deliveryPoint)!;
        }
        else if (samePoint(bird.at, deliveryPoint) && bird.cargo) {
          result.delivered += bird.cargo;
          bird.cargo = 0;
          if (result.source)
            bird.route = findRoute(map, bird.at, sourcePoint)!;
          else
            bird.delivery = false;
        }
        else if (!bird.cargo && !result.source)
          bird.delivery = false;
        else
          bird.route = findRoute(map, bird.at, bird.cargo ? deliveryPoint : sourcePoint)!;
        if (!bird.route.length)
          break;
      }
      const [first, second] = mapEdgeLengths(map, bird.at, bird.route[0]);
      const distance = first + second;
      const traveled = bird.progress <= 0.5
        ? first * bird.progress * 2
        : first + second * (bird.progress - 0.5) * 2;
      const used = Math.min(remaining, (distance - traveled) / 1.8);
      const next = Math.min(distance, traveled + used * 1.8);
      bird.progress = next <= first
        ? next / first * 0.5
        : 0.5 + (next - first) / second * 0.5;
      remaining -= used;
      if (bird.progress >= 1 - 1e-10) {
        bird.at = bird.route.shift()!;
        bird.progress = 0;
      }
    }
  }
  return result;
}
