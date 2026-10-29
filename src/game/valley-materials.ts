import { paintFieldSurface, fieldGroundUV } from "./field-surfaces";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import type { Scene } from "@babylonjs/core/scene";
import type { MapDefinition } from "../content/maps";
import { mapPosition, mapTile } from "../content/maps";
const extent = 192;
export const groundUV = (x: number, z: number) => [
  x / extent + 0.5,
  z / extent + 0.5,
];
const clamp = (x: number) => Math.max(0, Math.min(1, x));
function pixels(src: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, c.width, c.height));
    };
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}
/** Bake the existing original albedos into broad, world-located masks, rather than coloring each cell. */
export function valleyGroundTexture(map: MapDefinition, scene: Scene) {
  // Fine grass/stone stays in mipmapped GPU tiles; this bake carries broad masks and bed grain.
  const size = map.terrain ? 1024 : 2048,
    texture = new DynamicTexture(
      "ochre-valley-world-albedo",
      { width: size, height: size },
      scene,
      true,
    );
  const bump = map.terrain ? new DynamicTexture("crescent-surface-normal", { width: 512, height: 512 }, scene, true) : undefined;
  if (bump) { bump.gammaSpace = false; bump.level = .18; }
  const mask = map.terrain ? RawTexture.CreateRGBATexture(new Uint8Array(512 * 512 * 4), 512, 512, scene, true, false) : undefined;
  if (mask) mask.gammaSpace = false;
  const ctx = texture.getContext();
  ctx.fillStyle = "#9a9b62";
  ctx.fillRect(0, 0, size, size);
  texture.update(false);
  const ready = Promise.all([
    pixels("/assets/materials/meadow-albedo.jpg"),
    pixels("/assets/materials/ground-albedo.jpg"),
  ]).then(async ([broad, fine]) => {
    if (scene.isDisposed) return;
    const data = new ImageData(size, size);
    const courts = map.landmarks
      .filter((l) => l.id.includes("court"))
      .map((l) => mapPosition(map, l.at));
    const creek = Array.from({ length: map.depth }, (_, z) => {
      const cells = Array.from({ length: map.width }, (_, x) => ({
        x,
        z,
      })).filter((p) => mapTile(map, p)?.waterLevel !== undefined);
      return cells.length
        ? mapPosition(map, cells[Math.floor(cells.length / 2)])
        : undefined;
    });
    const ramps = map.ramps.map((r) => ({
      a: mapPosition(map, r.from),
      b: mapPosition(map, r.to),
    }));
    const sample = (
      p: ImageData,
      x: number,
      z: number,
      scale: number,
      c: number,
    ) => {
      const u = (((((x / scale) % 1) + 1) % 1) * p.width) | 0,
        v = (((((z / scale) % 1) + 1) % 1) * p.height) | 0;
      return p.data[(v * p.width + u) * 4 + c] / 255;
    };
    if (map.terrain) {
      const painted = await paintFieldSurface(map, broad, fine, size);
      if (scene.isDisposed) return;
      texture.metadata = { bakeMs: painted.bakeMs };
      ctx.putImageData(painted.color, 0, 0);
      bump!.getContext().putImageData(painted.normal, 0, 0);
      mask!.update(painted.mask.data);
      texture.update(false);
      bump!.update(false);
      return;
    }
    for (let row = 0; row < size; row++)
      for (let col = 0; col < size; col++) {
        const x = (col / size - 0.5) * extent,
          z = (row / size - 0.5) * extent;
        let soil = 0.1;
        for (const p of courts)
          soil = Math.max(
            soil,
            clamp(1.3 - Math.hypot((x - p.x) / 3.8, (z - p.z) / 2.5)),
          );
        for (const { a, b } of ramps) {
          const t = clamp(
            ((x - a.x) * (b.x - a.x) + (z - a.z) * (b.z - a.z)) /
              ((b.x - a.x) ** 2 + (b.z - a.z) ** 2),
          );
          const d = Math.hypot(
            x - a.x - (b.x - a.x) * t,
            z - a.z - (b.z - a.z) * t,
          );
          soil = Math.max(soil, clamp(1.25 - d / 1.6) * 0.9);
        }
        const r = sample(broad, x, z, 21, 0),
          g = sample(broad, x, z, 21, 1);
        soil = clamp(
          soil + (r - g) * 1.5 + 0.12 * Math.sin(x * 0.43 + z * 0.25),
        );
        const detail = 0.9 + sample(fine, x, z, 9, 0) * 0.18;
        const rowIndex = Math.max(
          0,
          Math.min(
            creek.length - 1,
            Math.round(z / map.cellSize + (map.depth - 1) / 2),
          ),
        );
        const bank =
          clamp(
            2.2 - Math.abs(x - (creek[rowIndex]?.x ?? Infinity)) / map.cellSize,
          ) * 0.8;
        const earth = [0.69, 0.5, 0.26],
          grass = [0.4, 0.49, 0.24],
          gravel = [0.69, 0.65, 0.49];
        for (let c = 0; c < 3; c++)
          data.data[(row * size + col) * 4 + c] =
            255 *
            ((grass[c] * (1 - soil) + earth[c] * soil) * (1 - bank) +
              gravel[c] * bank) *
            detail;
        data.data[(row * size + col) * 4 + 3] = 255;
      }
    ctx.putImageData(data, 0, 0);
    texture.update(false);
  });
  return { texture, bump, mask, ready, uv: map.terrain ? fieldGroundUV : groundUV };
}
export function creekTexture(scene: Scene, neutral = false) {
  const t = new DynamicTexture(
      "directional-creek-ripples",
      { width: 256, height: 512 },
      scene,
      true,
    ),
    ctx = t.getContext();
  ctx.fillStyle = neutral ? "#e0e9e5" : "#619b99";
  ctx.fillRect(0, 0, 256, 512);
  if (neutral) {
    // Sparse flow-aligned highlights, not a grain field over the whole creek.
    for (let i = 0; i < 24; i++) {
      const x = (i * 97) % 256, y = (i * 181) % 512;
      ctx.strokeStyle = i % 3 ? '#b9d5cc33' : '#ffffff44';
      ctx.lineWidth = .75;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 2, y + 5, x + 1, y + 12 + i % 9); ctx.stroke();
    }
  } else {
  for (let i = 0; i < 90; i++) {
    const x = (i * 73) % 256,
      y = (i * 131) % 512;
    ctx.strokeStyle = neutral ? (i % 4 ? "#a7c1b744" : "#ffffff55") : (i % 4 ? "#76aeaa55" : "#c8e0d355");
    ctx.lineWidth = i % 3 ? 1 : 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 5, y - 2);
    ctx.lineTo(x + 12, y + 2);
    ctx.lineTo(x + 20 + (i % 18), y - 1);
    ctx.stroke();
  }
  }
  t.update(false);
  return t;
}

/** Gentle flow-aligned normal ripples; motion is driven by the same reduced-motion clock. */
export function creekNormalTexture(scene: Scene) {
  const size = 256, texture = new DynamicTexture('creek-directional-normal', { width: size, height: size }, scene, true);
  const data = new ImageData(size, size);
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2, v = z / size * Math.PI * 2;
    const envelope = .35 + .65 * (Math.sin(u * 2 + Math.sin(v)) * .5 + .5);
    const nx = Math.cos(u * 3 + v * 2) * .025;
    const ny = (Math.cos(v * 9 + Math.sin(u) * 1.5) * .075 + Math.cos(v * 17 + u * 2) * .025) * envelope;
    const length = Math.hypot(nx, ny, 1), i = (z * size + x) * 4;
    data.data[i] = 128 + nx / length * 127; data.data[i + 1] = 128 + ny / length * 127;
    data.data[i + 2] = 128 + 127 / length; data.data[i + 3] = 255;
  }
  texture.getContext().putImageData(data, 0, 0);
  texture.gammaSpace = false;
  texture.level = .55;
  texture.update(false);
  return texture;
}
