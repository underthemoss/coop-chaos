import { createFieldTerrain } from "./field-terrain";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";
import { mapTile, mapVertex, mapPosition } from "../content/maps";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import {
  valleyGroundTexture,
  groundUV,
  creekTexture,
} from "./valley-materials";
import { dressValley } from "./valley-dressing";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import type { MapDefinition, Surface } from "../content/maps";

type Geometry = { positions: number[]; indices: number[]; colors: number[] };
const geometry = (): Geometry => ({ positions: [], indices: [], colors: [] });
const color = (hex: string) => Color3.FromHexString(hex);
const palette: Record<Surface, Color3> = {
  grass: color("#89945b"),
  earth: color("#c7a46d"),
  ramp: color("#b49b67"),
  rock: color("#8c8a74"),
  water: color("#607f76"),
  ford: color("#bcb58e"),
};
function quad(data: Geometry, corners: number[][], tint: Color3) {
  const start = data.positions.length / 3;
  data.positions.push(...corners.flat());
  data.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  for (let i = 0; i < 4; i++) data.colors.push(tint.r, tint.g, tint.b, 1);
}
function mesh(
  name: string,
  data: Geometry,
  scene: Scene,
  material: StandardMaterial,
) {
  const result = new Mesh(name, scene),
    vertices = new VertexData(),
    normals: number[] = [];
  vertices.positions = data.positions;
  vertices.uvs = data.positions.flatMap((_, i) =>
    i % 3 === 0
      ? name.includes("creek")
        ? [data.positions[i] * 0.35, data.positions[i + 2] * 0.5]
        : name.includes("cliff")
          ? [
              data.positions[i] * 0.35,
              (data.positions[i + 1] + data.positions[i + 2] * 0.3) * 0.4,
            ]
          : groundUV(data.positions[i], data.positions[i + 2])
      : [],
  );
  vertices.indices = data.indices;
  vertices.colors = data.colors;
  VertexData.ComputeNormals(data.positions, data.indices, normals);
  vertices.normals = normals;
  vertices.applyToMesh(result);
  result.material = material;
  result.receiveShadows = true;
  return result;
}
function matte(name: string, scene: Scene) {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.White();
  material.specularColor = new Color3(0.025, 0.025, 0.025);
  return material;
}
/** Authored terrain geometry is built from the same corner heights the route simulation samples. */
export function createMapTerrain(map: MapDefinition, scene: Scene) {
  if (map.terrain) return createFieldTerrain(map,scene);
  const top = geometry(),
    cliffs = geometry(),
    water = geometry(),
    foam = geometry();
  const groundMaterial = matte("valley-earth-and-grass", scene),
    rockMaterial = matte("layered-limestone", scene);
  const albedo = valleyGroundTexture(map, scene);
  groundMaterial.diffuseTexture = albedo.texture;
  const stoneTexture = new DynamicTexture(
      "limestone-rough-facets",
      { width: 512, height: 512 },
      scene,
      true,
    ),
    stoneCtx = stoneTexture.getContext();
  stoneCtx.fillStyle = "#8d8f79";
  stoneCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 360; i++) {
    const x = (i * 73) % 512,
      y = (i * 137) % 512;
    stoneCtx.strokeStyle = i % 3 ? "#8c8a7944" : "#d4c5a333";
    stoneCtx.lineWidth = 1 + (i % 3);
    stoneCtx.beginPath();
    stoneCtx.moveTo(x, y);
    stoneCtx.lineTo(x + 15 + (i % 31), y + 3 + (i % 9));
    stoneCtx.lineTo(x + 37 + (i % 43), y + 2);
    stoneCtx.stroke();
  }
  stoneTexture.update(false);
  rockMaterial.diffuseTexture = stoneTexture;
  const waterRows = Array.from({ length: map.depth }, (_, z) => {
    const cells = Array.from({ length: map.width }, (_, x) => ({
      x,
      z,
    })).filter((p) => ["water", "ford"].includes(mapTile(map, p)!.surface));
    if (!cells.length) return undefined;
    const p = mapPosition(map, cells[Math.floor(cells.length / 2)]);
    return { x: p.x, level: mapTile(map, cells[0])!.waterLevel! };
  });
  const creekCenter = (z: number) => {
    const row = z / map.cellSize + map.depth / 2;
    if (row < 0)
      return (waterRows[0]?.x ?? Infinity) + 0.7 * Math.sin(row * 0.25);
    if (row >= map.depth)
      return (
        (waterRows.at(-1)?.x ?? Infinity) +
        0.7 * Math.sin((row - map.depth) * 0.3)
      );
    return waterRows[Math.floor(row)]?.x ?? Infinity;
  };
  const scenicHeight = (x: number, z: number) => {
    const halfW = (map.width * map.cellSize) / 2,
      halfD = (map.depth * map.cellSize) / 2;
    const out = Math.hypot(
      Math.max(0, Math.abs(x) - halfW),
      Math.max(0, Math.abs(z) - halfD),
    );
    const gridZ = Math.max(
      0,
      Math.min(map.depth - 1, z / map.cellSize + (map.depth - 1) / 2),
    );
    const base = mapPosition(map, {
      x: Math.max(
        0,
        Math.min(map.width - 1, x / map.cellSize + (map.width - 1) / 2),
      ),
      z: gridZ,
    }).y;
    const hills =
      (out / (out + 5)) *
      (2 +
        1.3 * Math.sin(x * 0.17 + z * 0.1) +
        1.1 * Math.cos(z * 0.22 - x * 0.13) +
        (z > halfD ? 4 : 0));
    const bank = Math.max(0, 1 - Math.abs(x - creekCenter(z)) / 3.2);
    return base + hills * (1 - bank) - bank * 0.55;
  };
  for (let z = 0; z < map.depth; z++)
    for (let x = 0; x < map.width; x++) {
      const tile = mapTile(map, { x, z })!,
        [sw, se, ne, nw] = tile.corners;
      const [a, b, c, d] = [
        mapVertex(map, x, z),
        mapVertex(map, x + 1, z),
        mapVertex(map, x + 1, z + 1),
        mapVertex(map, x, z + 1),
      ];
      const grassMix =
        tile.surface === "grass"
          ? 0.12 + 0.08 * Math.sin(x * 0.47 + z * 0.21)
          : 0;
      const tint = (
        tile.surface === "water"
          ? palette.water
          : tile.surface === "ford"
            ? color("#d5d0b1")
            : Color3.White()
      ).scale(1 + grassMix * 0.05);
      quad(
        top,
        [
          [a.x, sw, a.z],
          [b.x, se, b.z],
          [c.x, ne, c.z],
          [d.x, nw, d.z],
        ],
        tint,
      );
      // Vertical strata occur only at authored height discontinuities. Ramps retain open mouths.
      const sides = [
        {
          next: { x, z: z - 1 },
          a: [a.x, sw, a.z],
          b: [b.x, se, b.z],
          other: [3, 2],
        },
        {
          next: { x: x + 1, z },
          a: [b.x, se, b.z],
          b: [c.x, ne, c.z],
          other: [0, 3],
        },
        {
          next: { x, z: z + 1 },
          a: [c.x, ne, c.z],
          b: [d.x, nw, d.z],
          other: [1, 0],
        },
        {
          next: { x: x - 1, z },
          a: [d.x, nw, d.z],
          b: [a.x, sw, a.z],
          other: [2, 1],
        },
      ];
      for (const side of sides) {
        const neighbor = mapTile(map, side.next);
        if (!neighbor) continue;
        const lowA = neighbor?.corners[side.other[0]!] ?? -1.8,
          lowB = neighbor?.corners[side.other[1]!] ?? -1.8;
        if (side.a[1]! <= lowA + 0.01 && side.b[1]! <= lowB + 0.01) continue;
        const bands = Math.max(
          1,
          Math.ceil(Math.max(side.a[1]! - lowA, side.b[1]! - lowB) / 0.8),
        );
        for (let band = 0; band < bands; band++) {
          const aY = lowA + ((side.a[1]! - lowA) * band) / bands,
            bY = lowB + ((side.b[1]! - lowB) * band) / bands;
          const aTop = lowA + ((side.a[1]! - lowA) * (band + 1)) / bands,
            bTop = lowB + ((side.b[1]! - lowB) * (band + 1)) / bands;
          const dx = side.b[0]! - side.a[0]!,
            dz = side.b[2]! - side.a[2]!,
            length = Math.hypot(dx, dz);
          const ledge = (point: number[], height: number, t: number) => {
            const push = -Math.sin(Math.PI * t) * 0.06;
            return [
              point[0]! + (dz / length) * push,
              height,
              point[2]! - (dx / length) * push,
            ];
          };
          quad(
            cliffs,
            [
              ledge(side.a, aY, band / bands),
              ledge(side.b, bY, band / bands),
              ledge(side.b, bTop, (band + 1) / bands),
              ledge(side.a, aTop, (band + 1) / bands),
            ],
            Color3.White().scale(0.94 + 0.05 * Math.sin(x * 2.7 + z + band)),
          );
        }
        // The creek descends over each terrace as actual stepped water, not an implied crossing.
        if (
          tile.waterLevel !== undefined &&
          neighbor?.waterLevel !== undefined &&
          tile.waterLevel > neighbor.waterLevel + 0.2
        ) {
          const a = side.a,
            b = side.b;
          const dx = b[0]! - a[0]!,
            dz = b[2]! - a[2]!,
            length = Math.hypot(dx, dz),
            nx = dz / length,
            nz = -dx / length;
          for (let section = 0; section < 5; section++) {
            const t = section / 5,
              u = (section + 0.78) / 5,
              spread = 0.1 + 0.06 * Math.sin(section * 2 + x),
              level = neighbor.waterLevel + 0.025;
            quad(
              foam,
              [
                [a[0]! + dx * t, level, a[2]! + dz * t],
                [a[0]! + dx * u, level, a[2]! + dz * u],
                [
                  a[0]! + dx * u + nx * spread,
                  level,
                  a[2]! + dz * u + nz * spread,
                ],
                [
                  a[0]! + dx * t + nx * spread,
                  level,
                  a[2]! + dz * t + nz * spread,
                ],
              ],
              color("#e1e5d1"),
            );
          }
          quad(
            water,
            [
              [a[0]!, neighbor.waterLevel, a[2]!],
              [b[0]!, neighbor.waterLevel, b[2]!],
              [b[0]!, tile.waterLevel, b[2]!],
              [a[0]!, tile.waterLevel, a[2]!],
            ],
            color("#e0e8d9"),
          );
        }
      }
    }
  // One continuous strip shares bank vertices across every row, including bends.
  const creekRows = Array.from({ length: map.depth }, (_, z) => {
    const cells = Array.from({ length: map.width }, (_, x) => x).filter(
      (x) => mapTile(map, { x, z })!.waterLevel !== undefined,
    );
    return cells.length
      ? {
          left: cells[0],
          right: cells.at(-1)! + 1,
          level: mapTile(map, { x: cells[0], z })!.waterLevel!,
        }
      : undefined;
  });
  const bankEdge = (row: number) => {
    const before = creekRows[Math.max(0, row - 1)],
      after = creekRows[Math.min(map.depth - 1, row)];
    if (!before || !after) return undefined;
    return [
      mapVertex(map, Math.min(before.left, after.left), row),
      mapVertex(map, Math.max(before.right, after.right), row),
    ];
  };
  for (let z = 0; z < map.depth; z++) {
    const row = creekRows[z],
      a = bankEdge(z),
      b = bankEdge(z + 1);
    if (!row || !a || !b) continue;
    const y = row.level + 0.035;
    quad(
      water,
      [
        [a[0].x, y, a[0].z],
        [a[1].x, y, a[1].z],
        [b[1].x, y, b[1].z],
        [b[0].x, y, b[0].z],
      ],
      color("#c0ddd0"),
    );
    const next = creekRows[z + 1];
    if (next && Math.abs(next.level - row.level) > 0.04)
      quad(
        water,
        [
          [b[0].x, y, b[0].z],
          [b[1].x, y, b[1].z],
          [b[1].x, next.level + 0.035, b[1].z],
          [b[0].x, next.level + 0.035, b[0].z],
        ],
        color("#c0ddd0"),
      );
  }
  // Concentric scenic strips share the exact authored outer edge, then rise into unwalkable valley shoulders.
  const scenic = geometry(),
    edge: { x: number; z: number; y: number }[] = [];
  for (let x = 0; x <= map.width; x++) {
    const p = mapVertex(map, x, 0);
    edge.push({
      ...p,
      y: mapTile(map, { x: Math.min(x, map.width - 1), z: 0 })!.corners[
        x === map.width ? 1 : 0
      ],
    });
  }
  for (let z = 1; z <= map.depth; z++) {
    const p = mapVertex(map, map.width, z);
    edge.push({
      ...p,
      y: mapTile(map, { x: map.width - 1, z: Math.min(z, map.depth - 1) })!
        .corners[z === map.depth ? 2 : 1],
    });
  }
  for (let x = map.width - 1; x >= 0; x--) {
    const p = mapVertex(map, x, map.depth);
    edge.push({ ...p, y: mapTile(map, { x, z: map.depth - 1 })!.corners[3] });
  }
  for (let z = map.depth - 1; z > 0; z--) {
    const p = mapVertex(map, 0, z);
    edge.push({ ...p, y: mapTile(map, { x: 0, z })!.corners[0] });
  }
  const rings = [0, 1.8, 4, 8, 15, 28, 55];
  const ringPoint = (i: number, d: number) => {
    const p = edge[i],
      length = Math.hypot(p.x, p.z);
    const x = p.x + (p.x / length) * d,
      z = p.z + (p.z / length) * d;
    return [x, p.y + (scenicHeight(x, z) - p.y) * Math.min(1, d / 1.8), z];
  };
  for (let r = 0; r < rings.length - 1; r++)
    for (let i = 0; i < edge.length; i++) {
      const j = (i + 1) % edge.length;
      quad(
        scenic,
        [
          ringPoint(i, rings[r]),
          ringPoint(i, rings[r + 1]),
          ringPoint(j, rings[r + 1]),
          ringPoint(j, rings[r]),
        ],
        Color3.White(),
      );
    }
  const scenery = mesh(
    "valley-unwalkable-scenic-shoulders",
    scenic,
    scene,
    groundMaterial,
  );
  scenery.isPickable = false;
  // Continue the creek beyond play bounds into the surrounding landscape.
  for (const direction of [-1, 1])
    for (let i = 0; i < 32; i++) {
      const za = direction * ((map.depth * map.cellSize) / 2 + i * 1.7),
        zb = za + direction * 1.7;
      const end = direction < 0 ? waterRows[0] : waterRows.at(-1);
      if (!end) continue;
      const level = end.level;
      const ca = creekCenter(za),
        cb = creekCenter(zb),
        wa = 1.0 + 0.1 * Math.sin(za),
        wb = 1.0 + 0.1 * Math.sin(zb);
      const border = bankEdge(direction < 0 ? 0 : map.depth);
      const points = [
        i === 0 && border
          ? [border[0].x, level + 0.035, border[0].z]
          : [ca - wa, level + 0.035, za],
        i === 0 && border
          ? [border[1].x, level + 0.035, border[1].z]
          : [ca + wa, level + 0.035, za],
        [cb + wb, level + 0.035, zb],
        [cb - wb, level + 0.035, zb],
      ];
      quad(water, direction < 0 ? points.reverse() : points, color("#c0ddd0"));
    }

  groundMaterial.backFaceCulling = false;
  rockMaterial.backFaceCulling = false;
  const terrain = mesh("valley-traversable-ground", top, scene, groundMaterial);
  terrain.metadata = { valleyGround: true };
  const cliffMesh = mesh(
    "valley-stratified-cliffs",
    cliffs,
    scene,
    rockMaterial,
  );
  cliffMesh.isPickable = false;
  const waterMaterial = matte("blue-green-creek", scene);
  waterMaterial.alpha = 0.94;
  waterMaterial.specularColor = color("#d9eee1");
  waterMaterial.specularPower = 96;
  waterMaterial.backFaceCulling = false;
  const foamMaterial = matte("creek-drop-foam", scene);
  foamMaterial.backFaceCulling = false;
  foamMaterial.emissiveColor = new Color3(0.08, 0.1, 0.09);
  const froth = mesh("valley-drop-froth", foam, scene, foamMaterial);
  froth.isPickable = false;
  const ripples = creekTexture(scene);
  waterMaterial.diffuseTexture = ripples;
  const creek = mesh("valley-creek", water, scene, waterMaterial);
  creek.isPickable = false;
  return {
    terrain,
    shadowCasters: [cliffMesh],
    creek,
    loadDressing: async (shadows: ShadowGenerator) => {
      await Promise.all([
        albedo.ready,
        dressValley(map, scene, shadows, scenicHeight),
      ]);
    },
    animate(time: number) {
      ripples.vOffset = -(time * 0.025) % 1;
    },
  };
}
