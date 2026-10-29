import { describe, it, expect } from 'vitest';
import { authorValley, valleyRecipes } from '../content/valley-generator';
import { defaultValley, smallValley, getMap, mapCatalog } from '../content/small-valley';
import sheltered from '../../assets/maps/candidates/sheltered-bend-v1.json';
import open from '../../assets/maps/candidates/open-shoulder-v1.json';
import { findRoute, canTraverse } from './navigation';
import { mapPosition, mapTile, terrainHeight } from '../content/maps';
import { initialLandscape, moveWalker, stepLandscape, walkerPosition, startDelivery } from './landscape';
import { encodeGame, decodeGame } from '../persistence/game-save';
import type { MapDefinition, MapPoint } from '../content/maps';
const candidates = [defaultValley, sheltered, open] as unknown as MapDefinition[];
function distance(map: MapDefinition, start: MapPoint, route: MapPoint[]) {
  let total = 0, previous = start;
  for (const at of route) {
    const points = [previous, { x: (previous.x + at.x) / 2, z: (previous.z + at.z) / 2 }, at].map(p => mapPosition(map, p));
    for (let i = 1; i < points.length; i++)
      total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y, points[i].z - points[i - 1].z);
    previous = at;
  }
  return total;
}
function area(map: MapDefinition, start: MapPoint) {
  const queue = [start], seen = new Set<string>();
  while (queue.length) {
    const p = queue.pop()!, key = `${p.x},${p.z}`;
    if (seen.has(key) || !mapTile(map, p)?.buildable)
      continue;
    seen.add(key);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
      queue.push({ x: p.x + dx, z: p.z + dz });
  }
  return seen.size * map.cellSize ** 2;
}
describe('seeded terrain authoring', () => {
  for (const [i, map] of candidates.entries())
    it(`${map.name}: reproducible terrain, connected courts and useful alternate crossing`, () => {
      expect(authorValley(valleyRecipes[i])).toEqual(map);
      const { source, destination } = map.scenario.supply;
      const route = findRoute(map, source, destination);
      expect(route).not.toBeNull();
      for (const p of [...map.scenario.spawns, ...map.landmarks.map(l => l.at)])
        expect(findRoute(map, source, p), `reachable ${JSON.stringify(p)}`).not.toBeNull();
      const directZ = map.crossings[0].at.z;
      const alternate = { ...map, tiles: map.tiles.map((t, index) => t.surface === 'ford' && Math.abs(Math.floor(index / map.width) - directZ) < 4 ? { ...t, traversable: false } : t) };
      const flank = findRoute(alternate, source, destination);
      expect(flank).not.toBeNull();
      expect(flank!.some(p => mapTile(map, p)?.surface === 'ford' && Math.abs(p.z - map.crossings[1].at.z) < 4)).toBe(true);
      expect(distance(map, source, flank!)).toBeGreaterThan(distance(map, source, route!) * 1.1);
      expect(area(map, source)).toBeGreaterThanOrEqual(6);
      expect(area(map, destination)).toBeGreaterThanOrEqual(14);
      expect(area(map, map.landmarks.find(l => l.id === 'lookout')!.at)).toBeGreaterThanOrEqual(4);
    });
  it('uses continuous shared triangles, blocks steep gradients, and reaches the bluff through gentle access', () => {
    const map = defaultValley;
    let steep = 0;
    for (let z = 0; z < map.depth; z++)
      for (let x = 0; x < map.width; x++) {
        const tile = mapTile(map, { x, z })!, [sw, se, ne, nw] = tile.corners;
        const slope = Math.max(Math.hypot(se - sw, ne - se), Math.hypot(ne - nw, nw - sw)) / map.cellSize;
        if (slope >= .85) {
          expect(tile.traversable).toBe(false);
          steep++;
        }
        if (x < map.width - 1) {
          const east = mapTile(map, { x: x + 1, z })!;
          expect([se, ne]).toEqual([east.corners[0], east.corners[3]]);
        }
        if (z < map.depth - 1) {
          const north = mapTile(map, { x, z: z + 1 })!;
          expect([nw, ne]).toEqual([north.corners[0], north.corners[1]]);
        }
        const p = mapPosition(map, { x: x + .17, z: z - .13 });
        expect(terrainHeight(map, p.x, p.z)).toBeCloseTo(p.y, 9);
      }
    expect(steep).toBeGreaterThan(20);
    const source = map.scenario.supply.source, high = map.landmarks.find(l => l.id === 'lookout')!.at, route = findRoute(map, source, high)!;
    expect(mapPosition(map, high).y - mapPosition(map, source).y).toBeGreaterThan(2);
    expect(route.every((p, i) => canTraverse(map, i ? route[i - 1] : source, p))).toBe(true);
    for (const rock of map.obstacles) {
      expect(rock.cells.length).toBeGreaterThan(0);
      for (const p of rock.cells)
        expect(mapTile(map, p)?.traversable).toBe(false);
    }
  });
  it('keeps speed in metres after cell refinement and conserves cargo through a mid-route portable resume', () => {
    for (const map of [smallValley, defaultValley]) {
      const s = moveWalker(initialLandscape(map), 'fern', map.scenario.supply.destination)!;
      const before = walkerPosition(s, s.birds[0]), next = stepLandscape(s, .1), after = walkerPosition(next, next.birds[0]);
      expect(Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z)).toBeCloseTo(.18, 2);
    }
    let state = startDelivery(initialLandscape(), 'fern')!;
    for (let i = 0; i < 20; i++)
      state = stepLandscape(state, .1);
    expect(state.birds[0].cargo).toBe(2);
    expect(state.birds[0].progress).toBeGreaterThan(0);
    const restored = decodeGame(encodeGame(state)) as typeof state;
    expect(restored).toEqual(state);
    expect(stepLandscape(restored, 100)).toEqual(stepLandscape(state, 100));
    const end = stepLandscape(restored, 100);
    expect(end.source + end.delivered + end.birds.reduce((n, b) => n + b.cargo, 0)).toBe(20);
  });
  it('keeps v1 geography exact, defaults to selected v2 and rejects unavailable identities without fallback', async () => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(smallValley)));
    expect(Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')).toBe('f40c5d82d77e96d69155ddf02a1c6c43981af03f6bb93c5d1d89f29b4afd7295');
    expect(initialLandscape().mapId).toBe('ochre-valley');
    expect(initialLandscape().mapVersion).toBe(2);
    expect(mapCatalog).toHaveLength(2);
    expect(getMap('ochre-valley', 1)).toBe(smallValley);
    expect(decodeGame(encodeGame(initialLandscape(smallValley)))).toEqual(initialLandscape(smallValley));
    const save = JSON.parse(encodeGame(initialLandscape()));
    save.state.mapVersion = 3;
    expect(() => decodeGame(JSON.stringify(save))).toThrow('map version');
    save.state.mapVersion = 2;
    save.state.mapId = 'sheltered-bend';
    expect(() => decodeGame(JSON.stringify(save))).toThrow('map version');
  });
});
