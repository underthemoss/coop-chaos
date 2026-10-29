import { describe, expect, it } from 'vitest';
import snapshot from '../content/generated/inhabited-valley-v1.json';
import currentSnapshot from '../content/generated/inhabited-valley-v2.json';
import placements from '../content/generated/inhabited-valley-placements-v1.json';
import habitat from '../content/valley-habitat.json';
import type { MapDefinition } from '../content/maps';
import { mapPosition, mapTile, terrainHeight } from '../content/maps';
import { clearingLowCover, clearingProps, clearingPropHeight, clearingSurface, clearingSceneryHeight, homeFoliageColors } from './clearing-look';

const map = snapshot as unknown as MapDefinition;
describe('inhabited clearing presentation', () => {
  it('lifts the home foliage without changing alpha or erasing leaf variation',()=>{
    const source=[.067,.114,.043,1,.192,.227,.080,.7,.486,.400,.141,1];
    const before=[...source],grade=homeFoliageColors(source,4);
    expect(source).toEqual(before);
    expect([grade[3],grade[7],grade[11]]).toEqual([1,.7,1]);
    for(const c of [0,1,2]){
      expect(grade[c]).toBeLessThan(grade[c+4]);
      expect(grade[c+4]).toBeLessThan(grade[c+8]);
      expect(grade[c+8]).toBeLessThan(1);
    }
  });
  it('keeps new woody scenery outside the playable boundary and work areas open', () => {
    const before = JSON.stringify(map), props = clearingProps(map);
    expect(clearingProps(map)).toEqual(props);
    const hero = mapPosition(map, placements.tree.at);
    for (const p of props) {
      expect(Number.isFinite(clearingPropHeight(map, p))).toBe(true);
      if (p.id.startsWith('grove-') || p.id === 'willow' || p.id === 'birch') {
        expect(Math.abs(p.x) > 18 || Math.abs(p.z) > 14).toBe(true);
      } else {
        const at = { x: Math.round(p.x / map.cellSize + map.width / 2 - .5), z: Math.round(p.z / map.cellSize + map.depth / 2 - .5) };
        expect(mapTile(map, at)?.traversable).toBe(false);
        expect(mapTile(map, at)?.buildable).toBe(false);
        for (const pad of placements.pads) {
          const approach = mapPosition(map, pad.approach);
          expect(Math.hypot(p.x - approach.x, p.z - approach.z)).toBeGreaterThan(.9);
        }
        for (const name of [...habitat.profile.groundApproach, ...habitat.profile.naturalGroundApproach]) {
          const anchor = habitat.profile.anchors[name as keyof typeof habitat.profile.anchors];
          expect(Math.hypot(p.x - hero.x - anchor[0], p.z - hero.z - anchor[2])).toBeGreaterThan(1);
        }
      }
    }
    expect(JSON.stringify(map)).toBe(before);
  });
  it('keeps the scenic continuation continuous at the exact canonical edge', () => {
    for(const snapshot of [map,currentSnapshot as unknown as MapDefinition]){
    const map=snapshot;
    const before=JSON.stringify(map);
    for(const z of [-14,-8,0,8,14])for(const x of [-18,-9,0,9,18]){
      expect(clearingSceneryHeight(map,x,z)).toBeCloseTo(terrainHeight(map,x,z),10);
      for(const [dx,dz] of [[.001,0],[-.001,0],[0,.001],[0,-.001]])
        expect(Math.abs(clearingSceneryHeight(map,x+dx,z+dz)-clearingSceneryHeight(map,x,z))).toBeLessThan(.03);
    }
    for(let z=-80;z<=80;z+=2)for(let x=-96;x<=96;x+=2){
      expect(Number.isFinite(clearingSceneryHeight(map,x,z))).toBe(true);
      expect(clearingSceneryHeight(map,x,z)).toBeGreaterThan(-3);
      expect(clearingSceneryHeight(map,x,z)).toBeLessThan(9);
    }
    expect(JSON.stringify(map)).toBe(before);
    }
  });
  it('separates a calm work court from root leafmould without discontinuous masks', () => {
    const hero = mapPosition(map, placements.tree.at);
    expect(clearingSurface(map, hero.x + 1.2, hero.z + 4.5).court).toBeGreaterThan(.95);
    expect(clearingSurface(map, hero.x, hero.z).root).toBeGreaterThan(.95);
    for (let z = -14; z < 14; z += .7) for (let x = -18; x < 18; x += .7) {
      const a = clearingSurface(map, x, z), b = clearingSurface(map, x + .01, z);
      for (const key of ['court', 'root', 'grove', 'cover'] as const) {
        expect(a[key]).toBeGreaterThanOrEqual(0); expect(a[key]).toBeLessThanOrEqual(1);
        expect(Math.abs(a[key] - b[key])).toBeLessThan(.05);
      }
    }
    for (const at of [placements.tree.work, placements.source.at, ...placements.pads.map(p => p.approach), ...placements.resources.map(p => p.at)]) {
      const p = mapPosition(map, at);
      expect(clearingLowCover(map, p.x, p.z)).toBe(0);
    }
  });
});
