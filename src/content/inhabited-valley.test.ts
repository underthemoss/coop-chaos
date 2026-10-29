import { describe, expect, it } from 'vitest';
import originalSnapshot from './generated/inhabited-valley-v1.json';
import refinedSnapshot from './generated/inhabited-valley-v2.json';
import originalPlacements from './generated/inhabited-valley-placements-v1.json';
import refinedPlacements from './generated/inhabited-valley-placements-v2.json';
import { authorInhabitedValley, inhabitedPlacements } from './inhabited-valley-generator';
import { canTraverse, findRoute } from '../simulation/navigation';
import { mapPosition, mapTile, mapEdgeLengths, terrainHeight } from './maps';

describe.each([1,2] as const)('authored inhabited valley v%i', version => {
  const snapshot=version === 1 ? originalSnapshot : refinedSnapshot;
  const placementSnapshot=version === 1 ? originalPlacements : refinedPlacements;
  it('keeps distinct nursery food routes within the accepted physical geography budget', () => {
    const map=authorInhabitedValley(version),p=inhabitedPlacements(version),nursery=p.pads.find(p=>p.kind==='nursery')!;
    const foods=p.resources.filter(r=>r.kind!=='reeds');
    const distances=foods.map(food=>{
      const path=findRoute(map,nursery.approach,food.at)!;
      expect(path).not.toBeNull();
      let previous=nursery.approach,metres=0;
      for(const at of path){metres+=mapEdgeLengths(map,previous,at).reduce((a,b)=>a+b);previous=at;}
      return metres;
    });
    expect(distances.reduce((a,b)=>a+b)/distances.length).toBeLessThanOrEqual(10.29);
    expect(foods.filter(r=>r.kind==='staple'||r.kind==='protein').every(r=>mapPosition(map,r.at).x<0)).toBe(true);
    expect(mapPosition(map,foods.find(r=>r.kind==='mixed')!.at).x).toBeGreaterThan(0);
    expect(p.resources.filter(r=>r.kind==='reeds').map(r=>mapPosition(map,r.at).x)).toEqual([-4.25,9.25]);
  });
  it('regenerates both saved geography and its placement contract exactly', () => {
    expect(authorInhabitedValley(version)).toEqual(snapshot);
    expect(inhabitedPlacements(version)).toEqual(placementSnapshot);
    expect(snapshot.id).toBe(placementSnapshot.map.id);
    expect(snapshot.version).toBe(placementSnapshot.map.version);
    expect(snapshot.width * snapshot.cellSize).toBe(36);
    expect(snapshot.depth * snapshot.cellSize).toBe(28);
    expect(snapshot.scenario.supply.initial).toBe(8);
  });

  it('shares terrain triangles, blocks excessive slopes and never routes through roots or rocks', () => {
    const map = authorInhabitedValley(version);
    for (let z = 0; z < map.depth; z++) for (let x = 0; x < map.width; x++) {
      const tile = mapTile(map, {x,z})!, [sw,se,ne,nw] = tile.corners;
      const slope = Math.max(Math.hypot(se-sw,ne-se),Math.hypot(ne-nw,nw-sw))/map.cellSize;
      if (slope >= .85) expect(tile.traversable).toBe(false);
      if (x < map.width-1) expect([se,ne]).toEqual([mapTile(map,{x:x+1,z})!.corners[0],mapTile(map,{x:x+1,z})!.corners[3]]);
      if (z < map.depth-1) expect([nw,ne]).toEqual([mapTile(map,{x,z:z+1})!.corners[0],mapTile(map,{x,z:z+1})!.corners[1]]);
      const p = mapPosition(map,{x:x+.17,z:z-.13});
      expect(terrainHeight(map,p.x,p.z)).toBeCloseTo(p.y,9);
    }
    for (const obstacle of map.obstacles) {
      expect(obstacle.cells.length).toBeGreaterThan(0);
      for (const at of obstacle.cells) expect(mapTile(map,at)?.traversable).toBe(false);
    }
    const p=inhabitedPlacements(version);
    expect(mapTile(map,p.tree.at)?.traversable).toBe(false);
    for(const at of [...p.spawns,p.tree.work,...p.pads.map(p=>p.approach),...p.resources.map(r=>r.at)]) {
      const route=findRoute(map,p.source.at,at)!;
      expect(route).not.toBeNull();
      for(let i=0;i<route.length;i++) expect(canTraverse(map,i?route[i-1]:p.source.at,route[i])).toBe(true);
    }
  });

  it('retains the flank crossing when the entire direct ford closes', () => {
    const map=authorInhabitedValley(version),{source,destination}=map.scenario.supply;
    const closed={...map,tiles:map.tiles.map((t,i)=>t.surface==='ford'&&Math.abs(Math.floor(i/map.width)-map.crossings[0].at.z)<4?{...t,traversable:false}:t)};
    const direct=findRoute(map,source,destination)!,flank=findRoute(closed,source,destination)!;
    expect(direct).not.toBeNull();expect(flank).not.toBeNull();
    expect(flank.length).toBeGreaterThan(direct.length*1.3);
    expect(flank.some(at=>mapTile(map,at)?.surface==='ford'&&Math.abs(at.z-map.crossings[1].at.z)<4)).toBe(true);
  });

  it('reserves whole building footprints before construction while preserving buildability and legal approaches', () => {
    const map=authorInhabitedValley(version),p=inhabitedPlacements(version),blocked=new Set<string>();
    for(const pad of p.pads) {
      expect(pad.navigation).toBe('reserved-from-world-creation');
      expect(findRoute(map,p.source.at,pad.at)).toBeNull();
      expect(mapTile(map,pad.at)?.buildable).toBe(true);
      expect(mapTile(map,pad.at)?.traversable).toBe(false);
      expect(mapTile(map,pad.approach)?.traversable).toBe(true);
      const frontRow=Math.ceil((pad.footprint.depth/2+pad.clearance+map.cellSize/2)/map.cellSize);
      expect(frontRow*map.cellSize).toBeLessThan(pad.footprint.depth/2+pad.frontApron);
      for(const dx of [-1,0,1]) {
        const apron={x:pad.at.x+dx,z:pad.at.z+frontRow};
        expect(mapTile(map,apron)?.traversable).toBe(true);
        expect(findRoute(map,p.source.at,apron)).not.toBeNull();
        expect(findRoute(map,apron,pad.approach)).not.toBeNull();
      }
      expect(map.obstacles.find(o=>o.id===`${pad.id}-pad-reservation`)?.cells).toEqual(pad.reservedCells);
      for(const at of pad.reservedCells) {
        blocked.add(`${at.x},${at.z}`);
        expect(mapTile(map,at)?.traversable).toBe(false);
        expect(mapTile(map,at)?.buildable).toBe(true);
      }
      const center=mapPosition(map,pad.at), heights:number[]=[];
      for(let z=0;z<map.depth;z++)for(let x=0;x<map.width;x++) {
        const q=mapPosition(map,{x,z}),half=map.cellSize/2;
        const inside=(w:number,d:number,front=0)=>Math.abs(q.x-center.x)<w/2+half&&q.z+half>center.z-d/2&&q.z-half<center.z+d/2+front;
        if(inside(pad.footprint.width+pad.clearance*2,pad.footprint.depth+pad.clearance*2,pad.frontApron-pad.clearance)) {
          expect(mapTile(map,{x,z})?.buildable,`${pad.id}: ${x},${z}`).toBe(true);
          heights.push(...mapTile(map,{x,z})!.corners);
        }
        if(inside(pad.footprint.width,pad.footprint.depth)) blocked.add(`${x},${z}`);
      }
      expect(Math.max(...heights)-Math.min(...heights)).toBeLessThan(.08);
    }
    const built={...map,tiles:map.tiles.map((t,i)=>blocked.has(`${i%map.width},${Math.floor(i/map.width)}`)?{...t,traversable:false}:t)};
    expect(built.tiles).toEqual(map.tiles); // Completing a building cannot change topology.
    for(const at of [p.tree.work,...p.pads.map(p=>p.approach),...p.resources.map(r=>r.at)]) {
      const route=findRoute(map,p.source.at,at)!;
      expect(route).not.toBeNull();
      expect(route.every(step=>!blocked.has(`${step.x},${step.z}`))).toBe(true);
      expect(findRoute(built,p.source.at,at)).toEqual(route);
    }
  });
});
