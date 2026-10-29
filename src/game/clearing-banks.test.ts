import { describe, expect, it } from 'vitest';
import originalSnapshot from '../content/generated/inhabited-valley-v1.json';
import refinedSnapshot from '../content/generated/inhabited-valley-v2.json';
import type { MapDefinition } from '../content/maps';
import { mapPosition, mapTile, terrainHeight } from '../content/maps';
import { bankFootprint, bankFootprintCells, bankSkinTile, clearingBanks, clearingBankSkin } from './clearing-banks';

describe.each([originalSnapshot,refinedSnapshot])('blocked bank presentation v$version',snapshot=>{
  const map=snapshot as unknown as MapDefinition;
  it('confines entire mineral OBBs to blocked dry ground and buries every toe',()=>{
    const before=JSON.stringify(map),props=clearingBanks(map);
    expect(props.length).toBeGreaterThan(0);
    expect(clearingBanks(map)).toEqual(props);
    for(const p of props) {
      for(const at of bankFootprintCells(map,p)) {
        const t=mapTile(map,at)!;
        expect(t.traversable).toBe(false);expect(t.buildable).toBe(false);
        expect(['water','ford']).not.toContain(t.surface);
      }
      for(const q of bankFootprint(p))expect(p.y).toBeLessThan(terrainHeight(map,q.x,q.z));
    }
    expect(JSON.stringify(map)).toBe(before);
  });
  it('only replaces blocked mineral faces, never walkable support or a crossing',()=>{
    const before=JSON.stringify(map),skin=clearingBankSkin(map);
    let count=0;
    for(let z=0;z<map.depth;z++)for(let x=0;x<map.width;x++) {
      const t=mapTile(map,{x,z})!;
      if(t.traversable || t.buildable || t.surface==='water' || t.surface==='ford')expect(bankSkinTile(map,x,z)).toBe(false);
      if(bankSkinTile(map,x,z))count++;
    }
    expect(skin.indices).toHaveLength(count*24);
    for(let i=0;i<skin.positions.length;i+=3) {
      const [x,y,z]=skin.positions.slice(i,i+3),physical=terrainHeight(map,x,z);
      expect(y-physical).toBeGreaterThanOrEqual(-1e-8);expect(y-physical).toBeLessThanOrEqual(.113);
    }
    for(const crossing of map.crossings)expect(mapPosition(map,crossing.at)).toEqual(mapPosition(snapshot as unknown as MapDefinition,crossing.at));
    expect(JSON.stringify(map)).toBe(before);
  });
});
