import type { MapDefinition } from '../content/maps';
import { mapPosition, mapTile, terrainHeight } from '../content/maps';
import placements from '../content/generated/inhabited-valley-placements-v1.json';
import { fieldNoise, seededValue } from '../content/valley-generator';

// Presentation fields only. Neither these masks nor scenery add walkable land,
// resources, buildings or collisions to the saved world.
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const fade = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const origins = new WeakMap<MapDefinition, { x: number; z: number }>();

/** A render grade for the home crown's authored olive colors. Keep every leaf's
 * light/dark variation and opacity; bark and source asset bytes are untouched. */
export function homeFoliageColors(colors: ArrayLike<number>, stride: number) {
  const result=Array.from(colors);
  for(let i=0;i<result.length;i+=stride){
    result[i]=Math.min(1,result[i]*1.08+.055);
    result[i+1]=Math.min(1,result[i+1]*1.05+.04);
    result[i+2]=Math.min(1,result[i+2]*1.02+.018);
  }
  return result;
}
export function clearingSurface(map: MapDefinition, x: number, z: number) {
  let hero = origins.get(map);
  if (!hero) { hero = mapPosition(map, placements.tree.at); origins.set(map, hero); }
  const dx = x - hero.x, dz = z - hero.z;
  const noise = fieldNoise(map.terrain!.seed + 213, x, z, 1.2) - .5;
  const court = 1 - fade(.65, 1.35, Math.hypot((dx - 1.2) / 6.3, (dz - 4.5) / 4.8) + noise * .55 + (fieldNoise(map.terrain!.seed + 214, x, z, .42) - .5) * .12);
  const root = 1 - fade(.5, 1.25, Math.hypot(dx / 5.1, (dz - .6) / 3.7) + noise * .2);
  const grove = (1 - fade(.7, 1.3, Math.hypot(dx / 9, (dz + 2.2) / 7))) * (1 - court);
  const cover = fade(.45, .66, fieldNoise(map.terrain!.seed + 372, x, z, 2.3)) * (1 - court);
  return { court, root, grove, cover };
}

/** Low, pass-through growth has no navigation meaning. Keep work targets legible. */
export function clearingLowCover(map: MapDefinition, x: number, z: number) {
  const targets = [placements.tree.work, placements.source.at,
    ...placements.pads.map(p => p.approach), ...placements.resources.map(p => p.at)];
  if (targets.some(at => { const p = mapPosition(map, at); return Math.hypot(x - p.x, z - p.z) < 1; })) return 0;
  return clearingSurface(map, x, z).cover;
}

export type ClearingProp = { id: string; x: number; z: number; scale: number; turn: number; stretch?: [number, number, number]; tint?: string };

/** The tall grove lives outside the playable map. Low skirts use reserved roots
 * or steep blocked ground; routes and pads remain visibly open. */
export function clearingProps(map: MapDefinition): ClearingProp[] {
  const props: ClearingProp[] = [];
  const put = (id: string, x: number, z: number, scale: number, turn: number) => props.push({ id, x, z, scale, turn });
  // Three unequal masses frame the home, wet meadow and dry grove edge. Tall trunks
  // remain scenic: neither the silhouette nor this palette creates a habitat.
  const groups = [
    { tint: '#adc1b4', points: [[-21,-12,1.13,.5],[-23,-17,1.40,2.0],[-18,-20,1.18,4.1],[-13,-19,1.02,.9],[-9,-22,1.37,2.8],[-4,-19,.78,1.6]] },
    { tint: '#8caeb1', points: [[-23,1,.94,1.4],[-25,6,1.18,3.8],[-22,11,.76,2.7],[-24,17,1.23,.2],[-18,18,.86,4.2]] },
    { tint: '#eddfa9', points: [[12,-20,1.13,3.4],[17,-22,1.40,.7],[22,-18,.83,2.4],[23,-11,1.08,4.7],[19,-17,.93,1.8]] },
  ];
  for (const [g, group] of groups.entries()) for (const [i, [x,z,scale,turn]] of group.points.entries()) {
    props.push({ id:(i+g)%3===0?'grove-spread':'grove-oak', x,z,scale,turn,tint:group.tint,
      stretch:[i%2?.86:1.08,.82+(i%4)*.15,.88+(i%3)*.12] });
    put('grove-shrub',x+Math.sin(turn)*2.7,z+Math.cos(turn)*2.1,.75+(i%3)*.16,turn+.9);
    if(i%2===0)props.push({id:'grove-spread',x:x+2.2,z:z-2.1,scale:scale*.67,turn:turn+1.7,stretch:[1.18,.82,.9],tint:group.tint});
  }
  for(const [x,z,s,t] of [[20,-7,.92,.4],[22.8,-5.5,1.15,2.1],[19.8,5.8,1.2,1.1],[24,8.4,.8,3.2],[22.5,5.2,.68,.9]])put('birch',x,z,s,t);
  for(const [i,[x,z,s,t]] of [[-13,-27,1.6,.7],[-6,-26,1.25,2.6],[2,-28,1.1,1.7],[8,-27,1.45,3.7],[-18,-31,1.35,1.8],[16,-30,1.6,4.9],[-5,-33,1.4,.3],[5,-36,1.3,2.1]].entries())props.push({id:i%3===1?'grove-spread':'grove-oak',x,z,scale:s,turn:t,stretch:[1.15,.85+(i%3)*.18,1.1],tint:'#70929b'});
  for(const [i,[x,z,s]] of [[-18,-16,1.6],[-13,-16.2,1.3],[-7.5,-17,1.7],[-3,-18,1.2],[2,-23,1.9],[7,-25,1.5],[12,-17,1.4],[18,-16,1.3],[-21,-9,1.3],[-20,-3,1.7],[-22,4,1.2],[-21,11,1.4],[20,-4,1.1],[21,1,1.4],[21.5,7,1.1]].entries())props.push({id:'grove-shrub',x,z,scale:s,turn:i*2.3,stretch:[.75,1.45,.8],tint:'#a1b299'});
  put('willow', -2.7, -26, 1.35, 2.2);
  put('willow', -3.5, -19.5, .95, .7);
  put('willow', 6.8, 20, 1.1, 2.3);
  const hero = mapPosition(map, placements.tree.at);
  // Deliberate root pockets; the front ladder/court is left completely open.
  for (const [x, z, s] of [[-3.4, -.8, .65], [-2.8, -2.8, .9], [1.9, -3.9, .7], [3.6, -1.6, .6], [-3.2, 1.5, .42]]) {
    put('bush-b', hero.x + x, hero.z + z, s, x);
    put('grass', hero.x + x + .35, hero.z + z + .15, .8, z);
  }
  // Clusters on blocked banks and scarps, never an invisible obstacle in a route.
  for (let z = 1; z < map.depth - 1; z++) for (let x = 1; x < map.width - 1; x++) {
    const tile = mapTile(map, { x, z })!, p = mapPosition(map, { x, z });
    const random = seededValue(481, x, z);
    if (tile.traversable || tile.buildable || tile.surface === 'water' || tile.surface === 'ford') continue;
    const root = clearingSurface(map, p.x, p.z).root;
    if (root > .15) continue; // The authored living roots supply their own silhouette.
    const patch = fieldNoise(391, p.x, p.z, 2.4);
    if (random > .12 || patch < .52) continue;
    const scale = .65 + random * 2;
    // Entire small footprint must remain in blocked ground, with no pad tiles.
    let safe = true;
    for (const dx of [-2, 0, 2]) for (const dz of [-2, 0, 2]) {
      const t = mapTile(map, { x: x + dx, z: z + dz });
      if (!t || t.traversable || t.buildable || t.surface === 'water' || t.surface === 'ford') safe = false;
    }
    if (safe) {
      put('rock-a', p.x, p.z, scale, random * 37);
      put('bush-c', p.x + .2, p.z - .15, scale * .55, random * 41);
    }
  }
  return props;
}

export function clearingPropHeight(map: MapDefinition, prop: ClearingProp) {
  // Sink mineral bases into the slope rather than balancing at their centers.
  if (prop.id.startsWith('rock') || prop.id.startsWith('bush')) return Math.min(...[-.45, .45].flatMap(dx => [-.35, .35].map(dz => terrainHeight(map, prop.x + dx * prop.scale, prop.z + dz * prop.scale)))) - .06;
  return clearingSceneryHeight(map, prop.x, prop.z) - .025;
}

/** Render-only continuation. Preserve the gameplay edge, then spread into broad
 * forest shoulders instead of extruding the clamped scenic border into a wall. */
export function clearingSceneryHeight(map: MapDefinition, x: number, z: number) {
  const hw=map.width*map.cellSize/2,hd=map.depth*map.cellSize/2;
  const bx=Math.max(-hw,Math.min(hw,x)),bz=Math.max(-hd,Math.min(hd,z));
  const outside=Math.hypot(x-bx,z-bz);
  if(!outside)return terrainHeight(map,x,z);
  const shoulder=terrainHeight(map,bx,bz)+Math.min(outside,18)*.055
    +(Math.sin(x*.14+z*.08)*.65+Math.cos(z*.16-x*.09)*.45)*fade(0,8,outside);
  const river=map.terrain!.creek,first=river[0],last=river[river.length-1];
  const rz=Math.max(0,Math.min(river.length-1,(z-first.left.z)/map.cellSize));
  const i=Math.min(river.length-2,Math.floor(rz)),t=rz-i,row=river[i],next=river[i+1];
  const end=z<first.left.z?first:z>last.left.z?last:null,beyond=end?z-end.left.z:0;
  const center=(row.left.x+row.right.x)*(1-t)/2+(next.left.x+next.right.x)*t/2+Math.sin(beyond*.10)*.7;
  const level=row.level*(1-t)+next.level*t+beyond*.023;
  const channel=1-fade(.65,3.0+Math.sin(z*.19)*.35,Math.abs(x-center));
  const broadShelf=Math.min(shoulder,level+.55+fade(2,14,Math.abs(x-center))*1.35);
  const natural=broadShelf*(1-channel)+(level-.20)*channel;
  return terrainHeight(map,x,z)*(1-fade(0,5,outside))+natural*fade(0,5,outside);
}
