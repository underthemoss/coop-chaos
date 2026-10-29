import type { MapDefinition, MapPoint, MapTile } from './maps';
import { fieldNoise } from './valley-generator';

/** Authored settlement geography. Legacy terrain recipes and snapshots stay exact. */
export const inhabitedValleyRevision = 'inhabited-valley-v1';
const cellSize = .5, width = 72, depth = 56, halfW = 18, halfD = 14, seed = 7319;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
export const inhabitedCell = (x: number, z: number): MapPoint => ({ x: Math.round((x + halfW) / cellSize - .5), z: Math.round((z + halfD) / cellSize - .5) });
const world = (p: MapPoint) => ({ x: (p.x + .5) * cellSize - halfW, z: (p.z + .5) * cellSize - halfD });
/** Whole cells intersecting a physical building plus body clearance are reserved forever.
 * Buildable describes suitable terrain; traversable independently describes walking access. */
function reservedPadCells(pad: { at: MapPoint; footprint: { width: number; depth: number }; clearance: number }): MapPoint[] {
  const center = world(pad.at), halfCell = cellSize / 2;
  return Array.from({ length: width * depth }, (_, i) => ({ x: i % width, z: Math.floor(i / width) })).filter(at => {
    const p = world(at);
    return Math.abs(p.x - center.x) < pad.footprint.width / 2 + pad.clearance + halfCell && Math.abs(p.z - center.z) < pad.footprint.depth / 2 + pad.clearance + halfCell;
  });
}
/** Canonical authored placement: all at/work/approach/spawn coordinates are map cells. */
export function inhabitedPlacements(version: 1 | 2 = 1) {
  return {
    revision: version === 1 ? inhabitedValleyRevision : 'inhabited-valley-v2', map: { id: 'inhabited-valley', version },
    coordinates: 'at/work/approach/spawns are map cells; footprints/source offsets are art metres; source +Z faces work court.',
    tree: { id: 'longbough', name: 'Longbough', at: inhabitedCell(-8.75, -4.25), work: inhabitedCell(-5.75, -.75), profile: 'longbough-v1', scale: 1, yaw: 0, art: 'longbough-bare-v8', origin: 'source-zero-on-ground-preserve-negative-root-Y' },
    rootReservation: { source: 'assets/sculpted/valley-playable/root-sections.json', localMin: { x: -3.5, z: -4.1 }, localMax: { x: 4.1, z: 2.5 }, routeClearance: .35 },
    frontCourt: { localCenter: { x: 4, z: 4.4 }, width: 3.8, depth: 3.2 },
    pads: [
      { id: 'store-west', kind: 'store', tree: null, at: inhabitedCell(-10.25, 6.25), approach: inhabitedCell(-10.25, 8.25), footprint: { width: 1.76, depth: 1.4604 }, clearance: .4, frontApron: 1 },
      { id: 'store-east', kind: 'store', tree: null, at: inhabitedCell(11.25, 2.75), approach: inhabitedCell(11.25, 4.75), footprint: { width: 1.76, depth: 1.4604 }, clearance: .4, frontApron: 1 },
      { id: 'nursery-longbough', kind: 'nursery', tree: 'longbough', at: inhabitedCell(-10.25, .25), approach: inhabitedCell(-10.25, 1.75), footprint: { width: 1.53407, depth: 1.42148 }, clearance: .3, frontApron: 1 },
    ].map(pad => ({ ...pad, navigation: 'reserved-from-world-creation', reservedCells: reservedPadCells(pad) })),
    source: { id: 'reeds', at: inhabitedCell(-5.25, 2.25), stock: 8 },
    resources: [
      { id: 'patch-west', kind: 'reeds', name: 'West reed stand', description: 'A reachable bank stand on the home side of the creek.', at: inhabitedCell(-4.25, 10.25), radius: .8, capacity: 12 },
      { id: 'patch-east', kind: 'reeds', name: 'East reed field', description: 'Renewable reeds across the creek make carrying distance matter.', at: inhabitedCell(9.25, -3.75), radius: 1.25, capacity: 12 },
      { id: 'seed-common', kind: 'staple', habitat: 'open', name: 'Seedhead Common', description: 'Open seedheads and green shoots on the productive west commons near the nursery.', at: inhabitedCell(-7.25, 3.25), radius: 1.6, capacity: 12 },
      { id: 'leaf-litter', kind: 'protein', habitat: 'cover', name: 'Leaf-litter Hollow', description: 'A willow canopy edge beside the west nursery, with leaf litter and scratching insects.', at: inhabitedCell(-12.75, 3.25), radius: 1.3, capacity: 12 },
      { id: 'insect-verge', kind: 'mixed', habitat: 'mixed', name: 'Insect Verge', description: 'A grassy east-bank margin beyond the ford, with insects, scattered seeds and soft greens.', at: inhabitedCell(5.25, 5.75), radius: 1.2, capacity: 12 },
    ],
    scenicTrees: [
      { id: 'west-margin-tree', art: 'dressing-birch', at: inhabitedCell(-15.25, 10.75), scale: .65, yaw: 0, lowWoodBounds: { min: { x: -.267951, z: -.256234 }, max: { x: .325675, z: .255769 } }, routeClearance: .35 },
      { id: 'east-margin-tree', art: 'dressing-birch', at: inhabitedCell(14.75, -10.75), scale: .65, yaw: 0, lowWoodBounds: { min: { x: -.267951, z: -.256234 }, max: { x: .325675, z: .255769 } }, routeClearance: .35 },
      { id: 'west-cover-tree', art: 'dressing-willow', at: inhabitedCell(-10.25, 3.75), scale: .7, yaw: 0, lowWoodBounds: { min: { x: -.427517, z: -.32 }, max: { x: .305847, z: .329365 } }, routeClearance: .35 },
    ],
    spawns: [[-8.25, 1.25], [-7.25, 1.25], [-8.25, 2.25], [-7.25, 2.25]].map(([x, z]) => inhabitedCell(x, z)),
  };
}

export function authorInhabitedValley(version: 1 | 2 = 1): MapDefinition {
  const refined = version === 2;
  const placements = inhabitedPlacements(version), hero = world(placements.tree.at);
  const padBlocks = new Set(placements.pads.flatMap(pad => pad.reservedCells.map(at => `${at.x},${at.z}`)));
  const creekX = (z: number) => refined ? 2.0-1.5*smooth(2,5,z)+z*.10+(fieldNoise(seed+9,0,z+halfD,5)-.5)*2.4 : .4 + z * .15 + (fieldNoise(seed + 9, 0, z + halfD, 5) - .5) * 1.5;
  const creekWidth = (z: number) => refined ? .85+.35*fieldNoise(seed+11,0,z+halfD,3)+.95*Math.exp(-(((z-7)/2.7)**2)) : .7 + .2 * fieldNoise(seed + 11, 0, z + halfD, 3) + .65 * Math.exp(-(((z - 7) / 2.1) ** 2));
  const creekSideWidth = (z: number, side: number) => creekWidth(z) + (refined ?
    (side < 0 ? .6*Math.exp(-(((z-.25)/1.65)**2)) : .72*Math.exp(-(((z-8.5)/1.9)**2))) : 0);
  const water = (z: number) => .65 + z * .023;
  const crossings = [{ x: creekX(3.75), z: 3.75 }, { x: creekX(-9.25), z: -9.25 }];
  const base = (x: number, z: number) => {
    const crescent = Math.hypot((x + 9) / 7.4, (z + 1) / 9.8) - 1;
    const ridge = 2.6 * Math.exp(-((crescent / .23) ** 2)) * (1 - smooth(-13, -5, x)) * smooth(3, 5, Math.abs(x - creekX(z)));
    if(refined) {
      // One broken crescent of defensible rock, rather than a continuous
      // ridge enclosing the settlement. The east commons rolls gently down.
      const outcrops=.15+.85*Math.max(Math.exp(-(((z+6)/2.8)**2)),Math.exp(-(((z-7)/2.1)**2)));
      const bluff=1.35*Math.exp(-((crescent/.44)**2))*(1-smooth(-14,-10,x))*outcrops;
      return water(z)+.42+1.12*(1-smooth(-7,-2,x))+bluff+(fieldNoise(seed,x+halfW,z+halfD,5)-.5)*.14;
    }
    return water(z) + .38 + 1.2 * (1 - smooth(-7, -2, x)) + ridge + (fieldNoise(seed, x + halfW, z + halfD, 5) - .5) * .18 + (fieldNoise(seed + 1, x + halfW, z + halfD, 1.4) - .5) * .045;
  };
  const rectDistance = (x: number, z: number, cx: number, cz: number, rx: number, rz: number) => Math.max(Math.abs(x - cx) - rx, Math.abs(z - cz) - rz);
  const courts = refined ? [
    {x:-9,z:-3,rx:6.2,rz:7,h:2.15},
    {x:-12.75,z:3.25,rx:2.1,rz:2.1,h:2.15},
    ...placements.pads.map(p=>{const w=world(p.at);return {x:w.x,z:w.z+.4,rx:p.footprint.width/2+1.15,rz:p.footprint.depth/2+1.65,h:w.x<0?2.15:1.18};}),
    {x:9.25,z:-3.75,rx:2.4,rz:2.4,h:.96},
  ] : [
    { x: -8.5, z: .5, rx: 6, rz: 10.3, h: 2.15 },
    { x: 9, z: 6, rx: 5.5, rz: 5.5, h: 1.18 },
    { x: 9.25, z: -3.75, rx: 2.4, rz: 2.4, h: .96 },
  ];
  const height = (x: number, z: number) => {
    let h = base(x, z);
    for (const c of courts) { const blend = 1 - smooth(-.2, refined ? 4.8 : 2.2, rectDistance(x, z, c.x, c.z, c.rx, c.rz)); h = h * (1 - blend) + c.h * blend; }
    const d = Math.abs(x - creekX(z)), w = creekSideWidth(z, x-creekX(z)), ford = Math.max(...crossings.map(c => 1 - smooth(.65, 1.4, Math.abs(z - c.z))));
    const bed = water(z) - (.34 * (1 - ford) + .035 * ford);
    // Wide unequal shoulders provide shallow coves and grassy soil access.
    const shoulder = refined ? (x<creekX(z)?4.4:3.25)+fieldNoise(seed+41,x,z,3)*.9 : 1.5;
    const bank = 1-smooth(w*.65,w+shoulder+ford*(refined?.55:1.7),d);
    return h * (1 - bank) + bed * bank;
  };
  const vertices = Array.from({ length: (width + 1) * (depth + 1) }, (_, i) => height((i % (width + 1)) * cellSize - halfW, Math.floor(i / (width + 1)) * cellSize - halfD));
  const rocks = [
    { kind: 'ledge' as const, x: -16.2, z: -5.5, scale: 1.1, turn: 1.65 },
    { kind: 'ledge' as const, x: -16.1, z: 2.5, scale: .9, turn: 1.4 },
    { kind: 'boulder' as const, x: -13.5, z: -11.5, scale: 1.3, turn: .3 },
    { kind: 'boulder' as const, x: 13.75, z: -6.75, scale: 1.1, turn: .7 },
  ].map(r => {
    const halfWidth = (r.kind === 'ledge' ? 1.5 : .6) * r.scale, halfDepth = (r.kind === 'ledge' ? .6 : .5) * r.scale, c = Math.cos(r.turn), s = Math.sin(r.turn);
    const y = Math.min(...[[-halfWidth, -halfDepth], [halfWidth, -halfDepth], [halfWidth, halfDepth], [-halfWidth, halfDepth], [0, 0]].map(([dx, dz]) => height(r.x + c * dx + s * dz, r.z - s * dx + c * dz))) - .12;
    return { ...r, y, halfWidth, halfDepth };
  });
  const rockContains = (r: typeof rocks[number], x: number, z: number) => { const dx = x - r.x, dz = z - r.z, c = Math.cos(r.turn), s = Math.sin(r.turn); return Math.abs(c * dx - s * dz) < r.halfWidth + .3 && Math.abs(s * dx + c * dz) < r.halfDepth + .3; };
  const reservation = placements.rootReservation, clearance = reservation.routeClearance;
  const rootContains = (x: number, z: number) => x - hero.x >= reservation.localMin.x - clearance && x - hero.x <= reservation.localMax.x + clearance && z - hero.z >= reservation.localMin.z - clearance && z - hero.z <= reservation.localMax.z + clearance;
  const smallTreeContains = (t: typeof placements.scenicTrees[number], x: number, z: number) => { const p = world(t.at), b = t.lowWoodBounds, c = t.routeClearance; return x - p.x >= b.min.x * t.scale - c && x - p.x <= b.max.x * t.scale + c && z - p.z >= b.min.z * t.scale - c && z - p.z <= b.max.z * t.scale + c; };
  const tiles: MapTile[] = [];
  for (let z = 0; z < depth; z++) for (let x = 0; x < width; x++) {
    const px = (x + .5) * cellSize - halfW, pz = (z + .5) * cellSize - halfD, d = Math.abs(px - creekX(pz)), w = creekSideWidth(pz, px-creekX(pz)), wet = d < w, ford = crossings.some(c => Math.abs(pz - c.z) < 1.15);
    const corners = [vertices[z * (width + 1) + x], vertices[z * (width + 1) + x + 1], vertices[(z + 1) * (width + 1) + x + 1], vertices[(z + 1) * (width + 1) + x]] as [number, number, number, number];
    const slope = Math.max(Math.hypot(corners[1] - corners[0], corners[2] - corners[1]), Math.hypot(corners[2] - corners[3], corners[3] - corners[0])) / cellSize;
    const blockedRock = rocks.some(r => rockContains(r, px, pz)), blockedTree = rootContains(px, pz) || placements.scenicTrees.some(t => smallTreeContains(t, px, pz));
    const court = courts.some(c => rectDistance(px, pz, c.x, c.z, c.rx, c.rz) < -.35), grass = fieldNoise(seed + 31, px + halfW, pz + halfD, 3.7);
    tiles.push({ corners, surface: wet ? (ford ? 'ford' : 'water') : blockedRock || slope > .65 ? 'rock' : court || grass > .63 ? 'earth' : 'grass', traversable: x > 0 && z > 0 && x < width - 1 && z < depth - 1 && !blockedRock && !blockedTree && !padBlocks.has(`${x},${z}`) && slope < .85 && (!wet || ford), buildable: court && slope < .2 && !wet && !blockedRock && !blockedTree, ...(wet ? { waterLevel: water(pz) } : {}) });
  }
  const cellsWhere = (predicate: (x: number, z: number) => boolean) => tiles.flatMap((_, i) => { const x = i % width, z = Math.floor(i / width); return predicate((x + .5) * cellSize - halfW, (z + .5) * cellSize - halfD) ? [{ x, z }] : []; });
  return {
    id: 'inhabited-valley', version, name: 'Longbough Valley', size: 'small', width, depth, cellSize, tiles,
    scenario: { spawns: placements.spawns, supply: { source: placements.source.at, destination: inhabitedCell(9.25, 5.75), initial: 8 } },
    ramps: [], crossings: crossings.map((p, i) => ({ id: i ? 'flank-ford' : 'basin-ford', at: inhabitedCell(p.x, p.z) })),
    landmarks: [
      { id: 'west-court', name: 'Longbough work court', at: placements.tree.work },
      { id: 'east-court', name: 'East productive commons', at: inhabitedCell(9.25, 5.75) },
      { id: 'lookout', name: 'West shelf', at: inhabitedCell(-14.25, -8.75) },
      ...crossings.map((p, i) => ({ id: i ? 'upper-ford' : 'gravel-ford', name: i ? 'Long flank crossing' : 'Broad ford', at: inhabitedCell(p.x, p.z) })),
    ],
    obstacles: [...rocks.map((r, i) => ({ id: `inhabited-rock-${i}`, cells: cellsWhere((x, z) => rockContains(r, x, z)) })), { id: 'longbough-root-reservation', cells: cellsWhere(rootContains) }, ...placements.scenicTrees.map(t => ({ id: `${t.id}-roots`, cells: cellsWhere((x, z) => smallTreeContains(t, x, z)) })), ...placements.pads.map(pad => ({ id: `${pad.id}-pad-reservation`, cells: pad.reservedCells }))],
    terrain: { rocks, scenery: { width: 192, depth: 160, cellSize, origin: { x: -48, z: -40 }, heights: Array.from({ length: 193 * 161 }, (_, i) => height((i % 193) * cellSize - 48, Math.floor(i / 193) * cellSize - 40)) }, recipe: refined ? 'inhabited-valley-v2' : inhabitedValleyRevision, seed, creek: Array.from({ length: 161 }, (_, i) => { const z = i * cellSize - 40; return { left: { x: creekX(z) - creekSideWidth(z,-1), z }, right: { x: creekX(z) + creekSideWidth(z,1), z }, level: water(z) }; }) },
  };
}
