import { clearingSurface } from './clearing-look';
import type { MapDefinition } from '../content/maps';
import { mapPosition, terrainHeight } from '../content/maps';
import { fieldNoise, seededValue } from '../content/valley-generator';

// A v2-only world bake. Legacy valley UVs and materials remain at their original scale.
const extent = 64;
export const fieldGroundUV = (x: number, z: number) => [x / extent + .5, z / extent + .5];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number[], b: number[], t: number) => a.map((v, c) => v * (1 - t) + b[c] * t);

/** Broad surface masks, shallow gravel and gentle relief; no changes to physical terrain. */
type PaintedSurface = { color: ImageData; normal: ImageData; mask: ImageData; bakeMs: number };
let cached: { map: MapDefinition; size: number; result: Promise<PaintedSurface> } | undefined;
export function paintFieldSurface(map: MapDefinition, meadow: ImageData, earth: ImageData, size: number) {
  if (cached?.map === map && cached.size === size) return cached.result;
  const result = bakeFieldSurface(map, meadow, earth, size);
  cached = { map, size, result };
  return result;
}
async function bakeFieldSurface(map: MapDefinition, meadow: ImageData, earth: ImageData, size: number): Promise<PaintedSurface> {
  const started = performance.now();
  const seed = map.terrain!.seed, river = map.terrain!.creek;
  const inhabited = map.id === 'inhabited-valley';
  const color = new ImageData(size, size);
  const normalSize = 512, normal = new ImageData(normalSize, normalSize);
  const heights = new Float32Array(size * size), grassMask = new Float32Array(size * size), gravelMask = new Float32Array(size * size), rockMask = new Float32Array(size * size);
  const moistureMask = new Float32Array(size * size);
  const fieldSize = 256;
  const field = new Float32Array(fieldSize * fieldSize * 3);
  for (let z = 0; z < fieldSize; z++) for (let x = 0; x < fieldSize; x++) {
    const wx = (x / (fieldSize - 1) - .5) * extent, wz = (z / (fieldSize - 1) - .5) * extent;
    const dx = (terrainHeight(map, wx + .3, wz) - terrainHeight(map, wx - .3, wz)) / .6;
    const dz = (terrainHeight(map, wx, wz + .3) - terrainHeight(map, wx, wz - .3)) / .6;
    const i = (z * fieldSize + x) * 3;
    field[i] = Math.hypot(dx, dz); field[i + 1] = terrainHeight(map, wx, wz);
    field[i + 2] = fieldNoise(seed + 61, wx, wz, 2.2);
  }
  const fieldAt = (x: number, z: number, channel: number) => {
    const u = clamp(x / extent + .5) * (fieldSize - 1), v = clamp(z / extent + .5) * (fieldSize - 1);
    const ix = Math.min(fieldSize - 2, Math.floor(u)), iz = Math.min(fieldSize - 2, Math.floor(v)), tx = u - ix, tz = v - iz;
    const at = (dx: number, dz: number) => field[((iz + dz) * fieldSize + ix + dx) * 3 + channel];
    return (at(0, 0) * (1 - tx) + at(1, 0) * tx) * (1 - tz) + (at(0, 1) * (1 - tx) + at(1, 1) * tx) * tz;
  };
  const courts = map.landmarks.filter(l => l.id.includes('court')).map(l => mapPosition(map, l.at));
  const sample = (image: ImageData, x: number, z: number, scale: number) => {
    const u = Math.floor(((x / scale % 1 + 1) % 1) * image.width);
    const v = Math.floor(((z / scale % 1 + 1) % 1) * image.height);
    return image.data[(v * image.width + u) * 4] / 255;
  };
  for (let row = 0; row < size; row++) {
    if (row % 16 === 0) await new Promise<void>(resolve => setTimeout(resolve, 0));
    const z = (row / size - .5) * extent;
    const rz = (z - river[0].left.z) / map.cellSize;
    const ri = Math.max(0, Math.min(river.length - 2, Math.floor(rz))), t = clamp(rz - ri);
    const left = river[ri].left.x * (1 - t) + river[ri + 1].left.x * t;
    const right = river[ri].right.x * (1 - t) + river[ri + 1].right.x * t;
    const level = river[ri].level * (1 - t) + river[ri + 1].level * t;
    for (let col = 0; col < size; col++) {
      const x = (col / size - .5) * extent, index = row * size + col;
      const grain = sample(earth, x, z, 3), blades = sample(meadow, x, z, 6);
      const soil = fieldAt(x, z, 2), clumps = fieldNoise(seed + 62, x, z, .42);
      const mineral = fieldNoise(seed + 65, x, z, .7), mineralFine = fieldNoise(seed + 66, x, z, .19);
      const slope = fieldAt(x, z, 0);
      const exposure = inhabited ? .42+.58*smooth(.29,.72,fieldNoise(seed+619,x,z,1.55)) : 1;
      const rock = smooth(.3, .8, slope) * (.7 + mineral * .3) * exposure;
      let court = 0;
      for (const p of courts) court = Math.max(court, 1 - smooth(.2, 1.35, Math.hypot((x - p.x) / 3.2, (z - p.z) / 2.1)));
      const clearing = inhabited ? clearingSurface(map, x, z) : { court: 0, root: 0, grove: 0, cover: 0 };
      court = Math.max(court, clearing.court);
      const bank = Math.max(left - x, x - right), shore = fieldNoise(seed + 101, x, z, 1.1);
      const pocket = smooth(.3, .75, shore);
      const center = (left + right) / 2;
      const ahead = river[Math.min(river.length - 1, ri + 3)], behind = river[Math.max(0, ri - 3)];
      const curve = (ahead.left.x + ahead.right.x + behind.left.x + behind.right.x) / 4 - center;
      const fan = clamp(curve * (x < center ? -1 : 1) * 5) * .55;
      const gravel = 1 - smooth(-.14, (inhabited ? -.04 : .06) + pocket * (inhabited ? 1.65 : 1.3) + fan, bank);
      const submerged = 1 - smooth(level - .05, level + .12, fieldAt(x, z, 1));
      const damp = (1 - smooth(-.05, .18 + (1 - pocket) * .45, bank)) * (1 - submerged);
      const moisture = (1-smooth(.2,7,bank))*(1-court*.85);
      moistureMask[index] = clamp(moisture*.7 + clearing.grove*.4 + clearing.root*.35);
      const dry = clamp(.12 + (soil - .5) * .22 + court * .65);
      const grass = mix([.32, .43, .20], [.53, .51, .29], dry);
      const grassShade = .97 + blades * .045 + clumps * .025;
      let land = grass.map(v => v * grassShade);
      const stone = mix([.32, .36, .34], [.61, .56, .43], mineral);
      const stoneShade = (.83 + mineralFine * .25);
      const shelteredMoss = smooth(.64, .86, soil) * (1 - smooth(.7, 1.15, slope)) * .32;
      land = mix(land, mix(stone.map(v => v * stoneShade), [.27, .34, .18], shelteredMoss), rock);
      const pebble = sample(earth, x, z, .65), wetGravel = mix([.30, .33, .29], [.59, .55, .43], pebble);
      const dryGravel = mix([.45, .43, .33], [.68, .62, .47], grain);
      land = mix(land, dryGravel, gravel * (1 - submerged));
      land = mix(land, [.25 + pebble * .12, .28 + pebble * .11, .22 + pebble * .10], damp * .55);
      land = mix(land, wetGravel, submerged);
      if (inhabited) {
        const earthCourt = mix([.54, .45, .30], [.70, .61, .43], grain * .6 + soil * .4);
        const leafMould = mix([.20, .25, .15], [.38, .35, .21], grain);
        land = mix(land, earthCourt, court * (1 - gravel));
        land = mix(land, leafMould, clearing.root * (1 - court) * .8);
        land = mix(land, [.24, .32, .23], clearing.grove * .28 * (1 - rock));
        land = mix(land, leafMould, clearing.cover * .08 * (1 - rock) * (1 - gravel));
      }
      for (let c = 0; c < 3; c++) color.data[index * 4 + c] = land[c] * 255;
      color.data[index * 4 + 3] = 255;
      heights[index] = (grain * .012 + clumps * .018) * (1 - rock) + rock * mineralFine * .012 + gravel * pebble * .018;
      grassMask[index] = (1 - gravel) * (1 - rock) * (1 - court * .94) * (1 - clearing.root * .62) * (1 - clearing.cover * .10);
      gravelMask[index] = Math.max(gravel, submerged);
      rockMask[index] = rock * (1 - gravel);
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(color, 0, 0);
  const pixel = size / extent;
  // Broken gravel clusters continue under shallow water; tiny shapes cannot change clearance.
  for (let iz = -132; iz < 132; iz++) for (let ix = -132; ix < 132; ix++) {
    const r = seededValue(seed + 401, ix, iz), q = seededValue(seed + 402, ix, iz);
    const x = ix * .16 + seededValue(seed + 403, ix, iz) * .16;
    const z = iz * .16 + seededValue(seed + 404, ix, iz) * .16;
    const u = Math.round((x / extent + .5) * size), v = Math.round((z / extent + .5) * size);
    if (r > gravelMask[v * size + u] * .7) continue;
    const radius = (.025 + q * .055) * pixel;
    ctx.fillStyle = `rgba(45,51,44,${.22 + r * .15})`;
    ctx.beginPath(); ctx.ellipse(u, v + .5, radius * 1.2, radius * .7, q * 5, 0, Math.PI * 2); ctx.fill();
    const value = Math.round(102 + q * 68);
    ctx.fillStyle = `rgba(${value + 12},${value + 6},${value - 12},.7)`;
    ctx.beginPath(); ctx.ellipse(u - .3, v - .35, radius, radius * .6, q * 5, 0, Math.PI * 2); ctx.fill();
  }
  const painted = ctx.getImageData(0, 0, size, size);
  const step = extent / normalSize;
  for (let z = 0; z < normalSize; z++) for (let x = 0; x < normalSize; x++) {
    const at = (dx: number, dz: number) => {
      const u = Math.max(0, Math.min(size - 1, Math.round((x + dx) * size / normalSize)));
      const v = Math.max(0, Math.min(size - 1, Math.round((z + dz) * size / normalSize)));
      return heights[v * size + u];
    };
    const nx = (at(-1, 0) - at(1, 0)) / (2 * step), ny = (at(0, -1) - at(0, 1)) / (2 * step), length = Math.hypot(nx, ny, 1), i = (z * normalSize + x) * 4;
    normal.data[i] = 128 + nx / length * 127; normal.data[i + 1] = 128 + ny / length * 127;
    normal.data[i + 2] = 128 + 127 / length; normal.data[i + 3] = 255;
  }
  const mask = new ImageData(512, 512);
  for (let z = 0; z < 512; z++) for (let x = 0; x < 512; x++) {
    const i = Math.floor(z * size / 512) * size + Math.floor(x * size / 512), target = (z * 512 + x) * 4;
    mask.data[target] = grassMask[i] * 255;
    mask.data[target + 1] = rockMask[i] * 255;
    mask.data[target + 2] = (inhabited ? moistureMask[i] : fieldAt((x / 512 - .5) * extent, (z / 512 - .5) * extent, 2)) * 255;
    mask.data[target + 3] = Math.max(0, 1 - grassMask[i] - rockMask[i]) * (1 - gravelMask[i]) * 255;
  }
  return { color: painted, normal, mask, bakeMs: performance.now() - started };
}
