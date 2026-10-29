import crescent from './generated/ochre-valley-v2.json';
import type { MapDefinition, MapPoint, MapTile } from "./maps";

const rectangle = (
  x: number,
  z: number,
  width: number,
  depth: number,
): MapPoint[] =>
  Array.from({ length: width * depth }, (_, i) => ({
    x: x + (i % width),
    z: z + Math.floor(i / width),
  }));
const obstacles = [
  {
    id: "split-rock",
    cells: [...rectangle(10, 3, 2, 2), { x: 12, z: 4 }, { x: 11, z: 5 }],
  },
  {
    id: "east-outcrop",
    cells: [...rectangle(21, 10, 2, 3), { x: 20, z: 11 }, { x: 23, z: 12 }],
  },
  {
    id: "high-crown",
    cells: [...rectangle(10, 20, 3, 2), { x: 9, z: 21 }, { x: 12, z: 19 }],
  },
  {
    id: "bank-stones",
    cells: [
      { x: 18, z: 3 },
      { x: 19, z: 3 },
      { x: 13, z: 11 },
      { x: 14, z: 11 },
      { x: 17, z: 19 },
    ],
  },
] as const;
const rockCells = new Set(
  obstacles.flatMap((o) => o.cells.map((c) => `${c.x},${c.z}`)),
);
const ramps = [
  {
    id: "west-rise",
    from: { x: 6, z: 5 },
    to: { x: 6, z: 10 },
    x0: 5,
    x1: 8,
    z0: 6,
    z1: 9,
    low: 0.3,
  },
  {
    id: "east-rise",
    from: { x: 27, z: 5 },
    to: { x: 27, z: 10 },
    x0: 26,
    x1: 28,
    z0: 6,
    z1: 9,
    low: 0.3,
  },
  {
    id: "upper-west-rise",
    from: { x: 5, z: 13 },
    to: { x: 5, z: 18 },
    x0: 4,
    x1: 7,
    z0: 14,
    z1: 17,
    low: 2.4,
  },
  {
    id: "upper-east-rise",
    from: { x: 25, z: 13 },
    to: { x: 25, z: 18 },
    x0: 24,
    x1: 27,
    z0: 14,
    z1: 17,
    low: 2.4,
  },
];
// Broad shoulder runs give the authored ledges room without narrowing ramp mouths.
const lowerLip = Array.from({ length: 32 }, (_, x) =>
  x < 4
    ? 9
    : x < 11
      ? 8
      : x < 15
        ? 9
        : x < 20
          ? 8
          : x < 24
            ? 10
            : x < 29
              ? 8
              : 9,
);
const upperLip = Array.from({ length: 32 }, (_, x) =>
  x < 4
    ? 17
    : x < 11
      ? 16
      : x < 15
        ? 18
        : x < 20
          ? 16
          : x < 24
            ? 17
            : x < 28
              ? 16
              : 18,
);
export const valleyBandHeight = (z: number, x = 10) =>
  z < lowerLip[x]! ? 0.3 : z < upperLip[x]! ? 2.4 : 4.5;
// Shared vertex relief keeps every walkable seam watertight; it is authored presentation data, not randomness.
const relief = (x: number, z: number) =>
  0.065 * Math.sin(x * 0.8) +
  0.045 * Math.cos(z * 0.9) +
  0.035 * Math.sin(x * 0.3 + z * 0.6);
export const creekColumn = (z: number) =>
  15 + Math.round(Math.sin(z * 0.32) * 1.25);
const isCreek = (x: number, z: number) =>
  x === creekColumn(z) || x === creekColumn(z) + 1;
const isFord = (x: number, z: number) =>
  isCreek(x, z) && (z === 4 || z === 5 || z === 12 || z === 13);
const bankDrop = (x: number, z: number) => {
  const adjacent = [
    [x - 1, z - 1],
    [x, z - 1],
    [x, z],
    [x - 1, z],
  ];
  return adjacent.some(([a, b]) => isFord(a, b))
    ? 0
    : adjacent.some(([a, b]) => isCreek(a, b))
      ? 0.22
      : 0;
};
const tiles: MapTile[] = [];
for (let z = 0; z < 24; z++)
  for (let x = 0; x < 32; x++) {
    const base = valleyBandHeight(z, x);
    const ramp = ramps.find(
      (r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1,
    );
    const creek = x === creekColumn(z) || x === creekColumn(z) + 1;
    const ford = creek && (z === 4 || z === 5 || z === 12 || z === 13);
    const rock = rockCells.has(`${x},${z}`);
    const boundary = x === 0 || x === 31 || z === 0 || z === 23;
    const court =
      (x >= 3 && x <= 8 && z >= 2 && z <= 4) ||
      (x >= 25 && x <= 29 && z >= 11 && z <= 13) ||
      (x >= 3 && x <= 8 && z >= 19 && z <= 21);
    const earth =
      court ||
      Math.hypot((x - 12) / 4, (z - 6) / 2.8) < 1 ||
      Math.hypot((x - 23) / 5, (z - 16) / 3) < 1;
    let corners: MapTile["corners"] = [base, base, base, base];
    if (ramp) {
      const south = ramp.low + (2.1 * (z - ramp.z0)) / 4;
      const north = ramp.low + (2.1 * (z - ramp.z0 + 1)) / 4;
      corners = [south, south, north, north];
    } else if (creek && !ford)
      corners = [base - 0.58, base - 0.58, base - 0.58, base - 0.58];
    corners = corners.map((h, i) => {
      const vx = x + (i === 1 || i === 2 ? 1 : 0),
        vz = z + (i >= 2 ? 1 : 0);
      return h + relief(vx, vz) - (creek && !ford ? 0 : bankDrop(vx, vz));
    }) as unknown as MapTile["corners"];
    tiles.push({
      surface: creek
        ? ford
          ? "ford"
          : "water"
        : rock
          ? "rock"
          : ramp
            ? "ramp"
            : earth
              ? "earth"
              : "grass",
      corners,
      ...(creek ? { waterLevel: base + (ford ? 0.12 : -0.12) } : {}),
      traversable: !boundary && !rock && (!creek || ford),
      buildable: court && !rock && !boundary && !creek && !ramp,
    });
  }
/** One authored compact map. Additional maps can use different dimensions and data;
 * this catalog does not generate maps, alter old settlements, or imply combat rules.
 */
export const smallValley: MapDefinition = {
  id: "ochre-valley",
  version: 1,
  name: "Ochre Valley",
  size: "small",
  width: 32,
  depth: 24,
  cellSize: 1.0,
  tiles,
  scenario: {
    spawns: [
      { x: 4, z: 3 },
      { x: 5, z: 3 },
      { x: 6, z: 3 },
      { x: 7, z: 3 },
    ],
    supply: {
      source: { x: 5, z: 3 },
      destination: { x: 27, z: 12 },
      initial: 20,
    },
  },
  vertexOffsets: Array.from({ length: 33 * 25 }, (_, i) => {
    const x = i % 33,
      z = Math.floor(i / 33);
    return {
      x:
        0.22 * Math.sin(z * 1.2 + x * 0.61) +
        0.09 * Math.cos(z * 0.43 - x * 0.8),
      z:
        0.2 * Math.sin(x * 0.91 + z * 0.71) +
        0.08 * Math.cos(x * 0.3 - z * 0.8),
    };
  }),
  ramps: ramps.map(({ id, from, to }) => ({ id, from, to })),
  crossings: [
    { id: "gravel-ford", at: { x: creekColumn(5), z: 5 } },
    { id: "upper-ford", at: { x: creekColumn(13), z: 13 } },
  ],
  landmarks: [
    { id: "west-court", name: "West court", at: { x: 5, z: 3 } },
    { id: "gravel-ford", name: "Gravel ford", at: { x: creekColumn(5), z: 5 } },
    { id: "east-court", name: "East court", at: { x: 27, z: 12 } },
    {
      id: "upper-ford",
      name: "Upper crossing",
      at: { x: creekColumn(13), z: 13 },
    },
    { id: "lookout", name: "High shelf", at: { x: 25, z: 21 } },
  ],
  obstacles,
};
export const defaultValley = crescent as unknown as MapDefinition;
export const mapCatalog: readonly MapDefinition[] = [smallValley, defaultValley];
export const getMap = (id: string, version: number) =>
  mapCatalog.find((map) => map.id === id && map.version === version);
