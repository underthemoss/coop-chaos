import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { FresnelParameters } from '@babylonjs/core/Materials/fresnelParameters';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { MapDefinition } from '../content/maps';
import { terrainHeight } from '../content/maps';
import { valleyGroundTexture, creekTexture, creekNormalTexture } from './valley-materials';
import { dressFieldValley } from './field-dressing';
import { fieldTerrainGeometry } from './field-terrain-geometry';
import { FieldSurfaceMaterial } from './field-surface-material';
import { clearingBankSkin } from './clearing-banks';
import { clearingSceneryHeight } from './clearing-look';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
export function createFieldTerrain(map: MapDefinition, scene: Scene) {
  const material = new StandardMaterial('field-grass-earth-stone', scene);
  material.specularColor = new Color3(.025, .025, .025);
  material.backFaceCulling = false;
  const albedo = valleyGroundTexture(map, scene);
  material.diffuseTexture = albedo.texture;
  material.bumpTexture = albedo.bump ?? null;
  material.useParallax = false;
  const surfaces = new FieldSurfaceMaterial(material, albedo.mask!, scene, map.id === "inhabited-valley");
  const {positions,indices,visibleIndices,uvs,colors,normals}=fieldTerrainGeometry(map,albedo.uv);
  const data = new VertexData();
  Object.assign(data, {
    positions, indices, uvs, colors, normals
  });
  const terrain = new Mesh('field-shared-terrain', scene);
  data.applyToMesh(terrain);
  terrain.material = material;
  terrain.receiveShadows = true;
  let visibleTerrain = terrain;
  if (map.id === 'inhabited-valley') {
    // Predicate-based scene picking intersects this complete invisible support
    // mesh. Visible relief must never let a bank click pass to ground behind it.
    terrain.isVisible = false;
    const visibleData = new VertexData();
    Object.assign(visibleData,{positions,indices:visibleIndices,uvs,colors,normals});
    visibleTerrain = new Mesh('field-visible-terrain',scene);
    visibleData.applyToMesh(visibleTerrain);
    visibleTerrain.material=material;visibleTerrain.receiveShadows=true;visibleTerrain.isPickable=false;
    const skin = clearingBankSkin(map), bankData = new VertexData(), bankNormals: number[] = [];
    VertexData.ComputeNormals(skin.positions,skin.indices,bankNormals);
    Object.assign(bankData,{...skin,normals:bankNormals});
    const bank = new Mesh('clearing-blocked-rock-relief',scene);bankData.applyToMesh(bank);
    // The same continuous surface fields and tiled material cross the skin edge;
    // a separately shaded slab would expose the tile-selection contour.
    bank.material=material;bank.receiveShadows=true;bank.isPickable=false;
  }
  // Scenic land extends the content-owned edge; it is explicitly outside traversal.
  const scenicPositions: number[] = [], scenicIndices: number[] = [], scenicUV: number[] = [];
  const field = map.terrain!.scenery;
  const scenicHeight = (x:number,z:number) => map.id === "inhabited-valley" ? clearingSceneryHeight(map,x,z) : terrainHeight(map,x,z);
  for (let z = 0; z <= field.depth; z++)
    for (let x = 0; x <= field.width; x++) {
      const wx = field.origin.x + x * field.cellSize, wz = field.origin.z + z * field.cellSize;
      scenicPositions.push(wx, scenicHeight(wx,wz), wz);
      scenicUV.push(...albedo.uv(wx, wz));
    }
  for (let z = 0; z < field.depth; z++)
    for (let x = 0; x < field.width; x++) {
      const wx = field.origin.x + (x + .5) * field.cellSize, wz = field.origin.z + (z + .5) * field.cellSize;
      if (Math.abs(wx) < map.width * map.cellSize / 2 && Math.abs(wz) < map.depth * map.cellSize / 2)
        continue;
      const a = z * (field.width + 1) + x, b = a + 1, c = a + field.width + 2, d = a + field.width + 1;
      scenicIndices.push(a, c, b, a, d, c);
    }
  const scenicNormals: number[] = [];
  for (let z = 0; z <= field.depth; z++)
    for (let x = 0; x <= field.width; x++) {
      const at = (dx: number, dz: number) => scenicHeight(field.origin.x+(x+dx)*field.cellSize,field.origin.z+(z+dz)*field.cellSize);
      const nx = -(at(1, 0) - at(-1, 0)) / (2 * field.cellSize), nz = -(at(0, 1) - at(0, -1)) / (2 * field.cellSize), length = Math.hypot(nx, 1, nz);
      scenicNormals.push(nx / length, 1 / length, nz / length);
    }
  const sd = new VertexData();
  Object.assign(sd, {
    positions: scenicPositions, indices: scenicIndices, uvs: scenicUV, normals: scenicNormals
  });
  const scenery = new Mesh('field-scenic-shoulders', scene);
  sd.applyToMesh(scenery);
  scenery.material = material;
  scenery.isPickable = false;
  scenery.receiveShadows = true;
  if (map.id === 'inhabited-valley') {
    // Background continuation only: no navigation, picking or resource semantics.
    // Match the existing scenic border exactly, then fade into a distant grove.
    const farPositions: number[] = [], farIndices: number[] = [], farNormals: number[] = [], farUV: number[] = [];
    const nx = 192, nz = 160, step = 1;
    for (let z = 0; z <= nz; z++) for (let x = 0; x <= nx; x++) {
      const wx = -96 + x * step, wz = -80 + z * step;
      farPositions.push(wx, scenicHeight(wx,wz), wz);
      farUV.push(...albedo.uv(wx,wz));
      const dx = (scenicHeight(wx+.25,wz) - scenicHeight(wx-.25,wz)) / .5;
      const dz = (scenicHeight(wx,wz+.25) - scenicHeight(wx,wz-.25)) / .5;
      const length = Math.hypot(dx, 1, dz); farNormals.push(-dx / length, 1 / length, -dz / length);
    }
    for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
      const wx = -96 + (x + .5) * step, wz = -80 + (z + .5) * step;
      if (Math.abs(wx) < 48 && Math.abs(wz) < 40) continue;
      const a = z * (nx + 1) + x; farIndices.push(a,a+nx+2,a+1,a,a+nx+1,a+nx+2);
    }
    const farData = new VertexData();
    Object.assign(farData,{positions:farPositions,indices:farIndices,normals:farNormals,uvs:farUV});
    const far = new Mesh('clearing-distant-continuation',scene);farData.applyToMesh(far);
    far.material=material;far.isPickable=false;far.receiveShadows=true;
  }
  const river = map.terrain!.creek, wp: number[] = [], wi: number[] = [], wu: number[] = [], wc: number[] = [];
  const crossSections = [0, .12, .32, .5, .68, .88, 1];
  const visibleRiver = [...river];
  if(map.id === "inhabited-valley")for(const end of [river[0],river[river.length-1]]) {
    const sign=end===river[0]?-1:1;
    for(let step=1;step<=80;step++){const dz=step*.5*sign, drift=Math.sin(dz*.10)*.7;visibleRiver.push({left:{x:end.left.x+drift,z:end.left.z+dz},right:{x:end.right.x+drift,z:end.right.z+dz},level:end.level+dz*.023});}
  }
  visibleRiver.sort((a,b)=>a.left.z-b.left.z);
  for (const row of visibleRiver)
    for (const t of crossSections) {
      const x = row.left.x + (row.right.x - row.left.x) * t, z = row.left.z, depth = Math.max(0, row.level - scenicHeight(x,z));
      const deep = Math.min(1, depth / .38), inhabited = map.id === 'inhabited-valley';
      const shallow = inhabited ? [.53, .53, .40] : [.37, .56, .48], pool = inhabited ? [.19, .34, .31] : [.18, .43, .44];
      wp.push(x, row.level + .006, z);
      wu.push(x * .55, z * .55);
      wc.push(...shallow.map((v, c) => v * (1 - deep) + pool[c] * deep), .24 + .66 * deep);
    }
  for (let i = 0; i < visibleRiver.length - 1; i++)
    for (let j = 0; j < crossSections.length - 1; j++) {
      const a = i * crossSections.length + j, b = a + 1, c = a + crossSections.length + 1, d = a + crossSections.length;
      wi.push(a, b, c, a, c, d);
    }
  const wn = wp.map((_, i) => i % 3 === 1 ? 1 : 0), wd = new VertexData();
  Object.assign(wd, {
    positions: wp, indices: wi, normals: wn, uvs: wu, colors: wc
  });
  const waterMaterial = new StandardMaterial('field-blue-green-creek', scene);
  waterMaterial.diffuseColor = Color3.White();
  waterMaterial.specularColor = Color3.FromHexString('#8caba4');
  waterMaterial.specularPower = 96;
  waterMaterial.backFaceCulling = false;
  const ripples = creekTexture(scene, true);
  const rippleNormal = creekNormalTexture(scene);
  waterMaterial.bumpTexture = rippleNormal;
  waterMaterial.useReflectionFresnelFromSpecular = false;
  waterMaterial.reflectionFresnelParameters = new FresnelParameters({ bias: .015, power: 4, leftColor: new Color3(.14, .14, .14), rightColor: new Color3(.015, .015, .015) });
  waterMaterial.diffuseTexture = ripples;
  const creek = new Mesh('field-continuous-creek', scene);
  wd.applyToMesh(creek);
  creek.material = waterMaterial;
  creek.isPickable = false;
  creek.hasVertexAlpha = true;
  return {
    terrain, creek, shadowCasters: [visibleTerrain], loadDressing: async (shadows: ShadowGenerator) => {
      await Promise.all([albedo.ready, surfaces.ready, dressFieldValley(map, scene, shadows)]);
    }, animate(time: number) {
      if (!waterMaterial.reflectionTexture && scene.environmentTexture) {
        const sky = scene.environmentTexture.clone();
        if (sky) { sky.level = .06; waterMaterial.reflectionTexture = sky; }
      }
      ripples.vOffset = -(time * .025) % 1;
      rippleNormal.vOffset = -(time * .025) % 1;
    }
  };
}
