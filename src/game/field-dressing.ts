import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { Scene } from '@babylonjs/core/scene';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import type { MapDefinition } from '../content/maps';
import { mapPosition, mapTile } from '../content/maps';
import { clearingLowCover } from './clearing-look';
import { clearingBanks } from './clearing-banks';
import { seededValue, fieldNoise } from '../content/valley-generator';
export async function dressFieldValley(map: MapDefinition, scene: Scene, shadows: ShadowGenerator) {
  const inhabited = map.id === 'inhabited-valley';
  const seed = map.terrain!.seed, sets: Record<string, number[]> = {
    'valley-cliff-ledge': [], 'valley-boulder': [], 'valley-scree': [], 'dressing-grass': [], 'dressing-cattails': []
  };
  if (inhabited) sets['valley/valley-grove-shrub'] = [];
  if (inhabited) for (const id of ['bank-shoulder','bank-shelf','shore-outcrop']) sets[`valley/valley-${id}`]=[];
  const put = (id: string, x: number, y: number, z: number, scale: number, turn: number, height = 1) => {
    sets[id].push(...Matrix.Compose(new Vector3(scale, scale * height, scale), Quaternion.RotationAxis(Vector3.Up(), turn), new Vector3(x, y, z)).toArray());
  };
  for (const r of map.terrain!.rocks)
    put(r.kind === 'ledge' ? 'valley-cliff-ledge' : 'valley-boulder', r.x, r.y - (inhabited ? .06 : 0), r.z, r.scale, r.turn, inhabited ? .58 : 1);
  if (inhabited) for(const p of clearingBanks(map)) {
    sets[`valley/valley-${p.id}`].push(...Matrix.Compose(new Vector3(p.scale,p.scale,p.scale*p.depth),Quaternion.RotationAxis(Vector3.Up(),p.turn),new Vector3(p.x,p.y,p.z)).toArray());
  }
  for (let z = 1; z < map.depth - 1; z++)
    for (let x = 1; x < map.width - 1; x++) {
      const tile = mapTile(map, { x, z })!, p = mapPosition(map, { x, z }), r = seededValue(seed, x, z), turn = seededValue(seed + 5, x, z) * Math.PI * 2;
      const slope = (Math.max(...tile.corners) - Math.min(...tile.corners)) / map.cellSize;
      const cluster = fieldNoise(seed + 7, x * map.cellSize, z * map.cellSize, 2);
      if (inhabited && tile.traversable && !tile.buildable && tile.surface !== 'ford' && slope < .45) {
        const cover = clearingLowCover(map,p.x,p.z);
        // Low leaf/fern-like islands remain traversable, never woody obstacles.
        if (cover > .48 && r < .25) {
          // Unequal off-grid rosettes form open islands, rather than repeated
          // square-grid bushes. Each small plant is cosmetic and pass-through.
          const cx=p.x+(seededValue(seed+47,x,z)-.5)*.45, cz=p.z+(seededValue(seed+48,x,z)-.5)*.45;
          for(let k=0;k<3;k++) {
            const a=turn+k*2.4, radius=.12+k*.10;
            const wx=cx+Math.cos(a)*radius,wz=cz+Math.sin(a)*radius;
            const at={x:Math.floor(wx/map.cellSize+map.width/2),z:Math.floor(wz/map.cellSize+map.depth/2)}, t=mapTile(map,at);
            if(!t?.traversable || t.buildable || t.surface==='ford' || clearingLowCover(map,wx,wz)<.4)continue;
            const y=mapPosition(map,{x:wx/map.cellSize+map.width/2-.5,z:wz/map.cellSize+map.depth/2-.5}).y;
            if(k===0)put('valley/valley-grove-shrub',wx,y-.07,wz,.17+r*.18,a);
            put('dressing-grass',wx,y-.025,wz,.7+r*1.3,a);
          }
        }
      }
      if (inhabited && !tile.traversable && !tile.buildable && tile.surface === 'rock' && r < .13 && cluster > .48) {
        put('valley-scree',p.x,p.y-.10,p.z,.25+r*.4,turn);

      }
      if (tile.surface === 'rock'  && cluster > .35 && r < (inhabited ? .07 : .24))
        put('valley-scree', p.x, p.y - .04, p.z, .22 + r * .55, turn);
      if (tile.surface === 'grass' && slope < .5 && !tile.buildable && r < (inhabited ? (cluster > .57 ? .25 : .005) : .11 + cluster * .12))
        put('dressing-grass', p.x, p.y - .025, p.z, .38 + r * .8, turn);
      if (!tile.buildable && tile.surface !== 'water' && tile.surface !== 'rock') {
        const river = map.terrain!.creek, row = river[Math.round((p.z - river[0].left.z) / map.cellSize)], center = (row.left.x + row.right.x) / 2, width = (row.right.x - row.left.x) / 2, d = Math.abs(p.x - center);
        const cove = inhabited && map.version === 2 && Math.max(Math.exp(-(((p.z-.25)/1.65)**2)),Math.exp(-(((p.z-8.5)/1.9)**2))) > .5;
        if (d > width + .15 && d < width + 1 && r < (inhabited ? (cove ? .43 : cluster > .57 ? .27 : .012) : .19))
          put('dressing-cattails', p.x, p.y - .035, p.z, .32 + r * (inhabited ? .8 : .3), turn);
        if (d > width && d < width + 1.5 && r < .1)
          put('valley-scree', p.x, p.y - .035, p.z, .14 + r * .7, turn);
      }
    }
  const stoneTexture = new Texture('/assets/materials/weathered-stone-v1.jpg', scene, false, false);
  stoneTexture.anisotropicFilteringLevel = 8;
  // Import attempts are one transaction. A late failure must not leave sibling
  // geometry or shared textures alive for the next Retry models attempt.
  const entries = Object.entries(sets);
  const loaded = await Promise.allSettled(entries.map(async ([id]) => {
    const result = await ImportMeshAsync(`/assets/environment/${id}.glb`, scene);
    result.meshes.forEach(m => m.setEnabled(false));
    return result;
  }));
  const discard = () => {
    for (const result of loaded) if (result.status === 'fulfilled') {
      result.value.animationGroups.forEach(group => group.dispose());
      result.value.meshes.forEach(m => m.dispose(false, true));
    }
    stoneTexture.dispose();
  };
  const failure = loaded.find(result => result.status === 'rejected');
  if (failure || scene.isDisposed) {
    discard();
    if (failure?.status === 'rejected') throw failure.reason;
    return;
  }
  try {
  for (const [index, [id, matrices]] of entries.entries()) {
    const result = (loaded[index] as PromiseFulfilledResult<Awaited<ReturnType<typeof ImportMeshAsync>>>).value;
    if (!matrices.length) {
      // Count zero is an ordinary Babylon mesh, not an empty thin-instance set.
      // Keep absent families out of rendering, shadows and the origin.
      result.animationGroups.forEach(group => group.dispose());
      result.meshes.forEach(node => node.dispose(false,true));
      continue;
    }
    for (const node of result.meshes) {
      if (!(node instanceof Mesh) || !node.getTotalVertices())
        continue;
      node.bakeTransformIntoVertices(node.computeWorldMatrix(true).clone());
      if (id.startsWith('valley-') && node.material instanceof PBRMaterial && node.material.name.includes('mineral')) {
        // Render attributes only: preserve positions, triangles and content footprints.
        const p = node.getVerticesData(VertexBuffer.PositionKind)!, n = node.getVerticesData(VertexBuffer.NormalKind)!;
        const uv: number[] = [];
        for (let i = 0; i < p.length; i += 3) {
          const axes = [Math.abs(n[i]), Math.abs(n[i + 1]), Math.abs(n[i + 2])];
          if (axes[1] >= axes[0] && axes[1] >= axes[2]) uv.push(p[i] / 2, p[i + 2] / 2);
          else if (axes[0] > axes[2]) uv.push(p[i + 2] / 2, p[i + 1] / 2);
          else uv.push(p[i] / 2, p[i + 1] / 2);
        }
        node.setVerticesData(VertexBuffer.UVKind, uv);
        // The original dark mineral vertex tint was authored as the entire albedo.
        // Keep its quiet variation, without multiplying the new stone tile by it twice.
        const colors = node.getVerticesData(VertexBuffer.ColorKind);
        const stride = node.getVertexBuffer(VertexBuffer.ColorKind)?.getSize() ?? 3;
        if (colors) {
          for (let i = 0; i < colors.length; i += stride) {
            const mean = (colors[i] + colors[i + 1] + colors[i + 2]) / 3;
            const neutral = .78 + mean * .15;
            for (let c = 0; c < 3; c++) colors[i + c] = neutral + (colors[i + c] - mean) * .2;
          }
          node.setVerticesData(VertexBuffer.ColorKind, colors, false, stride);
        }
        node.material.albedoTexture = stoneTexture;
        node.material.albedoColor = new Color3(1, 1, 1);
      }
      node.parent = null;
      node.position.setAll(0);
      node.rotation.setAll(0);
      node.rotationQuaternion = null;
      node.scaling.setAll(1);
      node.computeWorldMatrix(true);
      node.thinInstanceSetBuffer('matrix', new Float32Array(matrices), 16, true);
      node.thinInstanceRefreshBoundingInfo(true);
      node.isPickable = false;
      node.receiveShadows = true;
      node.setEnabled(true);
      if (id === 'valley-boulder' || id === 'valley-cliff-ledge' || id.startsWith('valley/valley-bank') || id.endsWith('shore-outcrop'))
        shadows.addShadowCaster(node);
    }
    result.meshes.filter(m => !m.getTotalVertices()).forEach(m => m.dispose());
  }
  } catch (error) { discard(); throw error; }
}
