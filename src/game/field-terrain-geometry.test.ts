import { describe,expect,it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import snapshot from '../content/generated/inhabited-valley-v1.json';
import type { MapDefinition } from '../content/maps';
import { mapPosition,mapVertex } from '../content/maps';
import { bankSkinTile } from './clearing-banks';
import { fieldTerrainGeometry } from './field-terrain-geometry';
const map=snapshot as unknown as MapDefinition;
describe('canonical terrain picking',()=>{
  it('retains every exact terrain triangle even where visible bank faces replace the land',()=>{
    const g=fieldTerrainGeometry(map);
    expect(g.indices).toHaveLength(map.width*map.depth*6);
    let bank: {x:number;z:number}|undefined;
    for(let z=0;z<map.depth;z++)for(let x=0;x<map.width;x++) {
      const offset=(z*map.width+x)*4;
      expect(g.indices.slice((z*map.width+x)*6,(z*map.width+x+1)*6)).toEqual([offset,offset+1,offset+2,offset,offset+2,offset+3]);
      const tile=map.tiles[z*map.width+x];
      for(const [i,[vx,vz]] of [[x,z],[x+1,z],[x+1,z+1],[x,z+1]].entries()) {
        const p=mapVertex(map,vx,vz);
        expect(g.positions.slice((offset+i)*3,(offset+i+1)*3)).toEqual([p.x,tile.corners[i],p.z]);
      }
      if(bankSkinTile(map,x,z))bank={x,z};
    }
    expect(bank).toBeDefined();
    // Match createClearing's explicit terrain predicate: invisible support remains
    // the hit, rather than passing through a visible non-pickable rock to far land.
    const engine=new NullEngine(),scene=new Scene(engine),terrain=new Mesh('canonical',scene),data=new VertexData();
    Object.assign(data,g);data.applyToMesh(terrain);terrain.material=new StandardMaterial('pick',scene);terrain.isVisible=false;terrain.computeWorldMatrix(true);
    const p=mapPosition(map,bank!);
    const hit=scene.pickWithRay(new Ray(new Vector3(p.x,p.y+10,p.z),Vector3.Down()),m=>m===terrain);
    expect(hit?.hit).toBe(true);expect(hit?.pickedMesh).toBe(terrain);
    expect(hit!.pickedPoint!.y).toBeCloseTo(p.y,6);
    scene.dispose();engine.dispose();
  });
});
