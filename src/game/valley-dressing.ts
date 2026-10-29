import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import type { Scene } from "@babylonjs/core/scene";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { mapPosition, mapTile } from "../content/maps";
import type { MapDefinition } from "../content/maps";
const files = {
  ledge: "valley-cliff-ledge",
  boulder: "valley-boulder",
  scree: "valley-scree",
  grass: "dressing-grass",
  cattails: "dressing-cattails",
};
type Kind = keyof typeof files;
type Placement = {
  x: number;
  y: number;
  z: number;
  scale: number;
  turn: number;
};
/** Original editable Blender kit. Uniform GPU instances preserve the authored materials. */
export async function dressValley(
  map: MapDefinition,
  scene: Scene,
  shadows: ShadowGenerator,
  scenicHeight: (x: number, z: number) => number,
) {
  const sets: Record<Kind, Placement[]> = {
    ledge: [],
    boulder: [],
    scree: [],
    grass: [],
    cattails: [],
  };
  const put = (
    id: Kind,
    x: number,
    y: number,
    z: number,
    scale: number,
    turn: number,
  ) => sets[id].push({ x, y, z, scale, turn });
  for (let z = 0; z < map.depth; z++)
    for (let x = 0; x < map.width; x++) {
      const tile = mapTile(map, { x, z })!,
        p = mapPosition(map, { x, z }),
        seed = x * 17 + z * 29;
      if (tile.surface === "rock")
        put(
          "boulder",
          p.x,
          p.y - 0.08,
          p.z,
          0.6 + (seed % 3) * 0.06,
          seed * 0.61,
        );
      if (tile.surface === "grass" && seed % 2 === 0) {
        const q = mapPosition(map, {
          x: x + 0.32 * Math.sin(seed),
          z: z + 0.3 * Math.cos(seed),
        });
        put(
          "grass",
          q.x,
          q.y - 0.02,
          q.z,
          0.45 + (seed % 4) * 0.09,
          seed * 0.53,
        );
      }
      const bank = [
        { x: x - 1, z },
        { x: x + 1, z },
      ].some((at) => mapTile(map, at)?.surface === "water");
      if (
        bank &&
        tile.surface !== "water" &&
        tile.surface !== "ford" &&
        tile.surface !== "ramp" &&
        seed % 3 !== 0
      ) {
        put("cattails", p.x, p.y - 0.04, p.z, 0.32 + (seed % 3) * 0.07, seed);
        put("grass", p.x + 0.15, p.y, p.z - 0.1, 0.43, seed + 1);
      }
      if (tile.surface === "ford")
        for (let i = 0; i < 3; i++)
          put(
            "scree",
            p.x + 0.24 * Math.sin(seed + i * 2),
            p.y - 0.035,
            p.z + 0.3 * Math.cos(seed + i * 2),
            0.13,
            seed + i,
          );
    }
  // Broad ledges sit behind the discontinuity: their forward toe stays inside
  // 0.44m of its edge, and their top remains below the upper walking surface.
  // Runs end at every ramp mouth and water gap; no dressing invents a barrier.
  for (let z = 0; z < map.depth - 1; z++) {
    const shoulder = (x: number) => {
      const a = mapTile(map, { x, z }),
        b = mapTile(map, { x, z: z + 1 });
      return (
        a &&
        b &&
        b.corners[0] - a.corners[3] > 1.5 &&
        !["water", "ford", "ramp"].includes(a.surface) &&
        b.surface !== "ramp"
      );
    };
    for (let x = 0; x < map.width; ) {
      if (!shoulder(x)) {
        x++;
        continue;
      }
      const start = x;
      while (x < map.width && shoulder(x)) x++;
      const count = Math.ceil((x - start) / 3),
        span = (x - start) / count;
      for (let i = 0; i < count; i++) {
        const left = start + i * span,
          right = left + span;
        const a = mapPosition(map, { x: left - 0.5, z: z + 0.5 - 0.001 }),
          b = mapPosition(map, { x: right - 0.5, z: z + 0.5 - 0.001 });
        const at = { x: (left + right) / 2 - 0.5, z },
          low = mapPosition(map, at).y;
        const high = mapPosition(map, { x: at.x, z: z + 1 }).y;
        const scale = Math.min(
          (Math.hypot(b.x - a.x, b.z - a.z) / 3) * 0.97,
          (high - low + 0.07) / 2,
          1.07,
        );
        const px = (a.x + b.x) / 2,
          pz = (a.z + b.z) / 2;
        const height = high - low;
        const layers = Math.max(1, Math.ceil(height / (2 * scale - 0.12)));
        for (let layer = 0; layer < layers; layer++) {
          const lift =
            layers === 1
              ? 0
              : (layer * Math.max(0, height - 2 * scale)) / (layers - 1);
          put(
            "ledge",
            px,
            low - 0.04 + lift,
            pz + scale * 0.16,
            scale,
            Math.PI,
          );
        }
        if (i % 2 === 0) put("scree", px, low - 0.045, pz + 0.2, 0.45, Math.PI);
      }
    }
  }
  // Partly buried shoulder stones break the regular ledge joins at the upper lip.
  for (let z = 0; z < map.depth - 1; z++)
    for (let x = 0; x < map.width; x++) {
      const a = mapTile(map, { x, z })!,
        b = mapTile(map, { x, z: z + 1 })!;
      const height = b.corners[0] - a.corners[3];
      if (
        height < 1.5 ||
        ["water", "ford", "ramp"].includes(a.surface) ||
        b.surface === "ramp"
      )
        continue;
      if (x % 2 === 0) {
        const p = mapPosition(map, { x, z: z + 0.5 });
        put(
          "boulder",
          p.x,
          b.corners[0] - 0.66,
          p.z + 0.31,
          0.74,
          x * 0.71 + z,
        );
      }
    }
  // Rounded end shoulders conceal exposed returns while remaining below upper ground.
  for (let z = 0; z < map.depth; z++)
    for (let x = 0; x < map.width - 1; x++) {
      const a = mapTile(map, { x, z })!,
        b = mapTile(map, { x: x + 1, z })!;
      if ([a.surface, b.surface].some((v) => v === "water" || v === "ford"))
        continue;
      const left = (a.corners[1] + a.corners[2]) / 2,
        right = (b.corners[0] + b.corners[3]) / 2;
      const height = Math.abs(left - right);
      if (height < 0.3) continue;
      const low = Math.min(left, right),
        sign = left > right ? -1 : 1;
      const p = mapPosition(map, { x: x + 0.5, z });
      const scale = Math.min(1.15, height / 0.9),
        layers = Math.max(1, Math.ceil(height / (scale * 0.9)));
      for (let i = 0; i < layers; i++) {
        const lift =
          layers === 1
            ? 0
            : (i * Math.max(0, height - scale * 0.9)) / (layers - 1);
        put(
          "boulder",
          p.x + sign * scale * 0.3,
          low - 0.02 + lift,
          p.z,
          scale,
          z * 0.7 + x,
        );
      }
    }
  // Asymmetric, partly buried clusters continue into unwalkable scenery.
  for (let side = 0; side < 2; side++)
    for (let i = 0; i < 9 + side * 2; i++) {
      const z =
          -map.depth * map.cellSize * 0.65 +
          (i * map.depth * map.cellSize) / (7 + side),
        x =
          (side ? 1 : -1) *
          ((map.width * map.cellSize) / 2 + 1.8 + (i % 3) * 1.4);
      const scale = 1.7 + (i % 4) * 0.42;
      put("boulder", x, scenicHeight(x, z) - 0.24, z, scale, i * 0.71);
      if (i % 3 !== 1)
        put(
          "scree",
          x + (side ? -1 : 1),
          scenicHeight(x, z) - 0.1,
          z + 1,
          1.05,
          i,
        );
      if (i % 3 === 0)
        put(
          "boulder",
          x + (side ? 1.2 : -1.2),
          scenicHeight(x, z + 1) - 0.35,
          z + 1,
          scale * 0.65,
          i + 1,
        );
      put(
        "grass",
        x + (side ? -0.7 : 0.7),
        scenicHeight(x, z),
        z + 1,
        0.7,
        i * 0.9,
      );
    }
  for (let i = 0; i < 7; i++) {
    const x =
        -map.width * map.cellSize * 0.6 + (i * map.width * map.cellSize) / 5,
      z = (map.depth * map.cellSize) / 2 + 3 + (i % 3) * 1.6;
    put(
      "ledge",
      x,
      scenicHeight(x, z) - 0.35,
      z,
      1.1 + (i % 3) * 0.25,
      i * 0.17,
    );
  }
  const sources = await Promise.all(
    (Object.keys(sets) as Kind[]).map(async (id) => ({
      id,
      result: await ImportMeshAsync(
        `/assets/environment/${files[id]}.glb`,
        scene,
      ),
    })),
  );
  if (scene.isDisposed) {
    sources.forEach((s) => s.result.meshes.forEach((m) => m.dispose()));
    return;
  }
  for (const { id, result } of sources) {
    for (const node of result.meshes) {
      if (!(node instanceof Mesh) || !node.getTotalVertices()) continue;
      // Bake the glTF coordinate conversion once, including its reflected faces,
      // before placing positive-scale instances in Babylon world coordinates.
      node.bakeTransformIntoVertices(node.computeWorldMatrix(true).clone());
      const matrices = new Float32Array(sets[id].length * 16);
      sets[id].forEach((p, i) =>
        Matrix.Compose(
          new Vector3(p.scale, p.scale, p.scale),
          Quaternion.RotationAxis(Vector3.Up(), p.turn),
          new Vector3(p.x, p.y, p.z),
        ).copyToArray(matrices, i * 16),
      );
      node.parent = null;
      node.position.setAll(0);
      node.rotation.setAll(0);
      node.rotationQuaternion = null;
      node.scaling.setAll(1);
      node.computeWorldMatrix(true);
      node.thinInstanceSetBuffer("matrix", matrices, 16, true);
      node.thinInstanceRefreshBoundingInfo(true);
      node.isPickable = false;
      node.receiveShadows = true;
      if (id === "ledge" || id === "boulder") shadows.addShadowCaster(node);
    }
    result.meshes
      .filter((m) => !m.getTotalVertices())
      .forEach((m) => m.dispose());
  }
}
