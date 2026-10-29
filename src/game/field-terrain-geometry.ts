import type { MapDefinition } from '../content/maps';
import { mapPosition, mapTile, mapVertex } from '../content/maps';
import { fieldGroundUV } from './field-surfaces';
import { bankSkinTile } from './clearing-banks';

/** Exact shared support/picking triangles; the visible bank veneer is separate. */
export function fieldTerrainGeometry(map: MapDefinition, uv: (x:number,z:number)=>number[] = fieldGroundUV) {
  const positions: number[] = [], indices: number[] = [], visibleIndices: number[] = [], uvs: number[] = [], colors: number[] = [], normals: number[] = [];
  for (let z = 0; z < map.depth; z++)
    for (let x = 0; x < map.width; x++) {
      const tile = mapTile(map, { x, z })!;
      for (const [i, [vx, vz]] of [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]].entries()) {
        const p = mapVertex(map, vx, vz), h = tile.corners[i];
        positions.push(p.x, h, p.z);
        uvs.push(...uv(p.x, p.z));
        colors.push(1, 1, 1, 1);
        const west = mapPosition(map, { x: vx - .7, z: vz - .5 }).y, east = mapPosition(map, { x: vx - .3, z: vz - .5 }).y;
        const south = mapPosition(map, { x: vx - .5, z: vz - .7 }).y, north = mapPosition(map, { x: vx - .5, z: vz - .3 }).y;
        const nx = -(east - west) / (.4 * map.cellSize), nz = -(north - south) / (.4 * map.cellSize), length = Math.hypot(nx, 1, nz);
        normals.push(nx / length, 1 / length, nz / length);
      }
      const start = positions.length / 3 - 4;
      // Picking always retains the exact complete content-owned triangles.
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
      if (map.id !== 'inhabited-valley' || !bankSkinTile(map,x,z))
        visibleIndices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
  return {positions,indices,visibleIndices,uvs,colors,normals};
}
