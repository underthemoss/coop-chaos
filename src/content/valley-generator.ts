import type { MapDefinition, MapPoint, MapTile } from './maps';
export type ValleyRecipe = {
  id: string;
  name: string;
  version: number;
  seed: number;
  creekShift: number;
  poolZ: number;
};
export const valleyRecipes: readonly ValleyRecipe[] = [
  {
    id: 'ochre-valley', name: 'Crescent Basin', version: 2, seed: 7319, creekShift: 0, poolZ: 15
  },
  {
    id: 'sheltered-bend', name: 'Sheltered Bend', version: 1, seed: 18427, creekShift: 1.3, poolZ: 11
  },
  {
    id: 'open-shoulder', name: 'Open Shoulder', version: 1, seed: 39041, creekShift: -1, poolZ: 18
  },
];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export function seededValue(seed: number, x: number, z: number) {
  let n = (Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(seed, 144269)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function fieldNoise(seed: number, x: number, z: number, scale: number) {
  const u = x / scale, v = z / scale, a = Math.floor(u), b = Math.floor(v), tx = smooth(0, 1, u - a), tz = smooth(0, 1, v - b);
  const top = seededValue(seed, a, b) * (1 - tx) + seededValue(seed, a + 1, b) * tx;
  const bottom = seededValue(seed, a, b + 1) * (1 - tx) + seededValue(seed, a + 1, b + 1) * tx;
  return top * (1 - tz) + bottom * tz;
}
export function authorValley(recipe: ValleyRecipe): MapDefinition {
  const cellSize = .5, width = 64, depth = 48, seed = recipe.seed;
  const creekX = (z: number) => 11.3 + z * .27 + recipe.creekShift + (fieldNoise(seed + 9, 0, z, 5) - .5) * 3.2;
  const creekWidth = (z: number) => .7 + .32 * fieldNoise(seed + 11, 0, z, 3) + .85 * Math.exp(-(((z - recipe.poolZ) / 2.5) ** 2));
  const water = (z: number) => .2 + z * .045;
  const crossings = [{ x: creekX(7.5), z: 7.5 }, { x: creekX(19), z: 19 }];
  const source = { x: 9, z: 3.5 }, destination = { x: 26, z: 11.7 }, high = { x: 5, z: 12 };
  const base = (x: number, z: number) => {
    // One localized crescent; surrounding land stays at basin elevation.
    const radial = (Math.hypot((x - 14) / 9, (z - 12) / 7) - 1) * 7;
    const outline = radial + (fieldNoise(seed + 27, x, z, 4) - .5) * .7;
    const arc = (1 - smooth(11, 16, x)) * smooth(2, 6, z) * (1 - smooth(18, 22, z));
    const ridge = 2.6 * Math.exp(-((outline / 2.5) ** 2)) * arc * smooth(2.8, 5.5, Math.abs(x - creekX(z)));
    return water(z) + .35 + ridge + (fieldNoise(seed, x, z, 5) - .5) * .18 + (fieldNoise(seed + 1, x, z, 1.4) - .5) * .045;
  };
  const sourceH = base(source.x, source.z), highH = base(high.x, high.z);
  const courts = [{
      p: source, h: sourceH, rx: 2.7, rz: 2
    }, {
      p: destination, h: base(destination.x, destination.z), rx: 3.3, rz: 2.4
    }, {
      p: high, h: highH, rx: 1.8, rz: 1.6
    }];
  const height = (x: number, z: number) => {
    let h = base(x, z);
    for (const c of courts) {
      const d = Math.hypot((x - c.p.x) / c.rx, (z - c.p.z) / c.rz), blend = 1 - smooth(.5, 1.6, d);
      h = h * (1 - blend) + c.h * blend;
    }
    const d = Math.abs(x - creekX(z)), w = creekWidth(z), ford = Math.max(...crossings.map(c => 1 - smooth(.65, 1.55, Math.abs(z - c.z) + (fieldNoise(seed + 71, x, z, 1) - .5) * .4)));
    const bed = water(z) - ((.3 + .12 * fieldNoise(seed + 3, x, z, 2)) * (1 - ford) + .035 * ford);
    const bank = 1 - smooth(w * .65, w + 1.4, d);
    return h * (1 - bank) + bed * bank;
  };
  const vertices = Array.from({ length: (width + 1) * (depth + 1) }, (_, i) => {
    const x = i % (width + 1), z = Math.floor(i / (width + 1));
    return height(x * cellSize, z * cellSize);
  });
  const rocks = [{
      kind: 'ledge' as const, x: 7.6, z: 8.8, scale: .95, turn: 1.7
    }, {
      kind: 'ledge' as const, x: 7.4, z: 14.7, scale: .85, turn: 1.1
    }, {
      kind: 'boulder' as const, x: 6.2, z: 17, scale: 1.9, turn: .4
    }, {
      kind: 'boulder' as const, x: 8.5, z: 10.8, scale: .9, turn: 2.4
    }, {
      kind: 'boulder' as const, x: 9.2, z: 16, scale: .75, turn: .7
    }].map((a, i) => {
    const x = a.x + (seededValue(seed + 81, i, 0) - .5) * .4, z = a.z + (seededValue(seed + 82, i, 0) - .5) * .4, scale = a.scale * (.95 + seededValue(seed + 83, i, 0) * .1);
    const halfWidth = (a.kind === 'ledge' ? 1.5 : .6) * scale, halfDepth = (a.kind === 'ledge' ? .6 : .5) * scale, turn = a.turn;
    const c = Math.cos(turn), s = Math.sin(turn);
    const y = Math.min(...[[-halfWidth, -halfDepth], [halfWidth, -halfDepth], [halfWidth, halfDepth], [-halfWidth, halfDepth], [0, 0]].map(([dx, dz]) => height(x + c * dx + s * dz, z - s * dx + c * dz))) - .1;
    return {
      kind: a.kind, x: x - width * cellSize / 2, y, z: z - depth * cellSize / 2, scale, turn, halfWidth, halfDepth
    };
  });
  const rockContains = (r: typeof rocks[number], x: number, z: number) => {
    const dx = x - width * cellSize / 2 - r.x, dz = z - depth * cellSize / 2 - r.z, c = Math.cos(r.turn), s = Math.sin(r.turn);
    return Math.abs(c * dx - s * dz) < r.halfWidth + .3 && Math.abs(s * dx + c * dz) < r.halfDepth + .3;
  };
  const point = (p: MapPoint) => ({ x: Math.round(p.x / cellSize - .5), z: Math.round(p.z / cellSize - .5) });
  const tiles: MapTile[] = [];
  for (let z = 0; z < depth; z++)
    for (let x = 0; x < width; x++) {
      const px = (x + .5) * cellSize, pz = (z + .5) * cellSize, d = Math.abs(px - creekX(pz)), w = creekWidth(pz);
      const ford = crossings.some(c => Math.abs(pz - c.z) < 1.15), wet = d < w;
      const corners = [vertices[z * (width + 1) + x], vertices[z * (width + 1) + x + 1], vertices[(z + 1) * (width + 1) + x + 1], vertices[(z + 1) * (width + 1) + x]] as [
        number,
        number,
        number,
        number
      ];
      const slope = Math.max(Math.hypot(corners[1] - corners[0], corners[2] - corners[1]), Math.hypot(corners[2] - corners[3], corners[3] - corners[0])) / cellSize;
      const court = courts.some(c => Math.hypot((px - c.p.x) / c.rx, (pz - c.p.z) / c.rz) < .75);
      const blocked = rocks.some(r => rockContains(r, px, pz));
      const grass = fieldNoise(seed + 31, px, pz, 3.7);
      tiles.push({
        corners, surface: wet ? (ford ? 'ford' : 'water') : blocked || slope > .65 ? 'rock' : court || grass > .63 ? 'earth' : 'grass', traversable: x > 0 && z > 0 && x < width - 1 && z < depth - 1 && !blocked && slope < .85 && (!wet || ford), buildable: court && slope < .2 && !wet && !blocked, ...(wet ? { waterLevel: water(pz) } : {})
      });
    }
  const map: MapDefinition = {
    id: recipe.id, version: recipe.version, name: recipe.name, size: 'small', width, depth, cellSize, tiles, scenario: { spawns: [{ x: 8.4, z: 3.2 }, { x: 9.1, z: 3.2 }, { x: 9.8, z: 3.2 }, { x: 9.1, z: 3.9 }].map(point), supply: {
        source: point(source), destination: point(destination), initial: 20
      } }, ramps: [], crossings: crossings.map((at, i) => ({ id: i ? 'flank-ford' : 'basin-ford', at: point(at) })), landmarks: [{
        id: 'west-court', name: 'Bluff court', at: point(source)
      }, {
        id: 'east-court', name: 'Basin court', at: point(destination)
      }, {
        id: 'lookout', name: 'Crescent shoulder', at: point(high)
      }, ...crossings.map((at, i) => ({
        id: i ? 'upper-ford' : 'gravel-ford', name: i ? 'Flank crossing' : 'Broad ford', at: point(at)
      }))], obstacles: rocks.map((r, i) => ({ id: `bluff-rock-${i}`, cells: tiles.flatMap((t, j) => {
        const x = j % width, z = Math.floor(j / width);
        return !t.traversable && rockContains(r, (x + .5) * cellSize, (z + .5) * cellSize) ? [{ x, z }] : [];
      }) })), terrain: {
      rocks, scenery: {
        width: 192, depth: 160, cellSize: .5, origin: { x: -48, z: -40 }, heights: Array.from({ length: 193 * 161 }, (_, i) => height((i % 193) * .5 - 32, Math.floor(i / 193) * .5 - 28))
      }, recipe: 'crescent-field-v1', seed, creek: Array.from({ length: 161 }, (_, z) => {
        const pz = z * cellSize - 28, w = creekWidth(pz);
        return {
          left: { x: creekX(pz) - w - width * cellSize / 2, z: pz - depth * cellSize / 2 }, right: { x: creekX(pz) + w - width * cellSize / 2, z: pz - depth * cellSize / 2 }, level: water(pz)
        };
      })
    }
  };
  return map;
}
