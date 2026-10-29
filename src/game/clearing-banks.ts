import type { MapDefinition } from '../content/maps';
import { mapPosition, mapTile, terrainHeight } from '../content/maps';
import { fieldNoise, seededValue } from '../content/valley-generator';
import bankAssets from '../../assets/sculpted/valley-playable/bank-assets.json';
import { clearingSurface } from './clearing-look';

export type BankProp = { id: keyof typeof bankAssets.assets; x: number; y: number; z: number; scale: number; depth: number; turn: number };

/** No terrain ownership: every mineral footprint, including a small margin,
 * stays inside blocked dry ground. Water, fords, pads and legal routes are excluded. */
export function blockedBankPoint(map: MapDefinition, x: number, z: number) {
  const at = { x: Math.floor(x / map.cellSize + map.width / 2), z: Math.floor(z / map.cellSize + map.depth / 2) };
  const tile = mapTile(map, at);
  return !!tile && !tile.traversable && !tile.buildable && tile.surface !== 'water' && tile.surface !== 'ford';
}

export function bankSkinTile(map: MapDefinition, x: number, z: number) {
  const tile=mapTile(map,{x,z});
  if(!tile || tile.traversable || tile.buildable || tile.surface!=='rock')return false;
  const center=mapPosition(map,{x,z});
  return clearingSurface(map,center.x,center.z).root<=.12;
}

export function bankFootprint(p: BankProp) {
  const bounds = bankAssets.assets[p.id], points: { x: number; z: number }[] = [];
  const halfX = Math.max(Math.abs(bounds.min[0]), bounds.max[0]) * p.scale + .10;
  const halfZ = Math.max(Math.abs(bounds.min[2]), bounds.max[2]) * p.scale * p.depth + .10;
  const nx = Math.ceil(halfX * 2 / .15), nz = Math.ceil(halfZ * 2 / .15);
  for (let iz = 0; iz <= nz; iz++) for (let ix = 0; ix <= nx; ix++) {
    const dx = -halfX + ix / nx * halfX * 2, dz = -halfZ + iz / nz * halfZ * 2;
    points.push({ x: p.x + dx * Math.cos(p.turn) + dz * Math.sin(p.turn), z: p.z - dx * Math.sin(p.turn) + dz * Math.cos(p.turn) });
  }
  return points;
}

/** Exact separating-axis overlap against every possibly touched map cell. */
export function bankFootprintCells(map: MapDefinition,p: BankProp) {
  const b=bankAssets.assets[p.id],hx=Math.max(Math.abs(b.min[0]),b.max[0])*p.scale+.10;
  const hz=Math.max(Math.abs(b.min[2]),b.max[2])*p.scale*p.depth+.10,c=Math.cos(p.turn),s=Math.sin(p.turn),h=map.cellSize/2;
  const ex=Math.abs(c)*hx+Math.abs(s)*hz,ez=Math.abs(s)*hx+Math.abs(c)*hz;
  const cells:{x:number;z:number}[]=[];
  for(let z=Math.floor((p.z-ez)/map.cellSize+map.depth/2);z<=Math.floor((p.z+ez)/map.cellSize+map.depth/2);z++)
    for(let x=Math.floor((p.x-ex)/map.cellSize+map.width/2);x<=Math.floor((p.x+ex)/map.cellSize+map.width/2);x++) {
      const dx=(x+.5-map.width/2)*map.cellSize-p.x,dz=(z+.5-map.depth/2)*map.cellSize-p.z;
      if(Math.abs(dx)>ex+h || Math.abs(dz)>ez+h || Math.abs(dx*c-dz*s)>hx+h*(Math.abs(c)+Math.abs(s)) || Math.abs(dx*s+dz*c)>hz+h*(Math.abs(c)+Math.abs(s)))continue;
      cells.push({x,z});
    }
  return cells;
}

export function clearingBanks(map: MapDefinition): BankProp[] {
  const result: BankProp[] = [], seed = map.terrain!.seed;
  // Strongest clustered candidates first, rather than one rock at every grid point.
  const candidates: { x: number; z: number; priority: number }[] = [];
  for (let z = 1; z < map.depth - 1; z++) for (let x = 1; x < map.width - 1; x++) {
    const tile = mapTile(map, { x, z })!, p = mapPosition(map, { x, z });
    if (tile.surface !== 'rock' || tile.traversable || tile.buildable || clearingSurface(map,p.x,p.z).root > .12) continue;
    candidates.push({ x: p.x + (seededValue(seed + 901,x,z)-.5)*.22, z: p.z+(seededValue(seed+902,x,z)-.5)*.22,
      priority: fieldNoise(seed+903,p.x,p.z,2.7)+seededValue(seed+904,x,z)*.25 });
  }
  candidates.sort((a,b)=>b.priority-a.priority);
  for (const p of candidates) {
    if (p.priority < .60 || result.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<1.9)) continue;
    const dx = (terrainHeight(map,p.x+.25,p.z)-terrainHeight(map,p.x-.25,p.z))/.5;
    const dz = (terrainHeight(map,p.x,p.z+.25)-terrainHeight(map,p.x,p.z-.25))/.5;
    const turn = Math.atan2(-dx,-dz) + (fieldNoise(seed+905,p.x,p.z,.7)-.5)*.35;
    for (const [id, scales] of [
      ['bank-shoulder',[.90,.74,.58,.42]], ['bank-shelf',[.85,.65,.42]], ['shore-outcrop',[.75,.55,.38]],
    ] as const) {
      let placed = false;
      for (const [scale,depth] of scales.flatMap(scale=>[1,.5,.3].map(depth=>[scale,depth]))) {
        const prop: BankProp = { id,x:p.x,z:p.z,y:0,scale,depth,turn };
        const footprint = bankFootprint(prop);
        if (!bankFootprintCells(map,prop).every(at=>{
          const t=mapTile(map,at);return t && !t.traversable && !t.buildable && t.surface!=='water' && t.surface!=='ford';
        })) continue;
        // Embed the back of the mass in the real bank; the lowest toe never floats.
        const ground = footprint.map(q=>terrainHeight(map,q.x,q.z));
        prop.y = Math.min(...ground)-.06;
        result.push(prop);placed=true;break;
      }
      if (placed) break;
    }
  }
  return result;
}

/** Fine faceted relief on the blocked rock skin, bounded in XZ. The original
 * terrain remains the sole walk/pick/support surface underneath this veneer. */
export function clearingBankSkin(map: MapDefinition) {
  const positions: number[] = [], indices: number[] = [], uvs: number[] = [], colors: number[] = [];
  const seed = map.terrain!.seed;
  for (let z = 0; z < map.depth; z++) for (let x = 0; x < map.width; x++) {
    if(!bankSkinTile(map,x,z))continue;
    const vertices: number[][] = [];
    for (let iz=0;iz<=2;iz++) for(let ix=0;ix<=2;ix++) {
      const wx=(x+ix/2-map.width/2)*map.cellSize, wz=(z+iz/2-map.depth/2)*map.cellSize;
      const h=terrainHeight(map,wx,wz);
      const edge = [-.12,.12].every(dx=>[-.12,.12].every(dz=>bankSkinTile(map,
        Math.floor((wx+dx)/map.cellSize+map.width/2),Math.floor((wz+dz)/map.cellSize+map.depth/2))));
      const relief = edge ? .006+fieldNoise(seed+912,wx,h*.35+wz,.83)*.035 : 0;
      vertices.push([wx,h+relief,wz]);
    }
    for(let iz=0;iz<2;iz++) for(let ix=0;ix<2;ix++) {
      const a=iz*3+ix;
      for(const triangle of [[a,a+1,a+4],[a,a+4,a+3]]) {
        for(const v of triangle) {
          const p=vertices[v],start=positions.length/3;
          positions.push(...p);indices.push(start);uvs.push(p[0]/64+.5,p[2]/64+.5);
          colors.push(1,1,1,1);
        }
      }
    }
  }
  return {positions,indices,uvs,colors};
}
