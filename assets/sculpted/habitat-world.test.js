import {readFileSync} from "node:fs";
import {expect,test} from "vitest";
import {NullEngine} from "@babylonjs/core/Engines/nullEngine";
import {Scene} from "@babylonjs/core/scene";
import {TransformNode} from "@babylonjs/core/Meshes/transformNode";
import {Vector3} from "@babylonjs/core/Maths/math.vector";
import {ImportMeshAsync} from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";
import {trees} from "../../src/content/settlement";
import {habitatAnchor,habitatPosition,treeHabitat,habitatPresentation} from "../../src/content/tree-habitats";
import {basketLiftPosition} from "../../src/simulation/settlement";
import {presentedTreePosition,treeScale,carriedBundleScale} from "../../src/game/tree-presentation";

test("actual reed geometry keeps one basket-fitting world size through every parent transfer",async()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  try{
    const loaded=await ImportMeshAsync(readFileSync(new URL("../../public/assets/environment/reed-bundle.glb",import.meta.url)),scene,{pluginExtension:".glb"});
    const root=loaded.meshes[0],bird=new TransformNode("adult",scene);
    bird.scaling.setAll(habitatPresentation.adultScale);
    const size=()=>{
      const lo=new Vector3(Infinity,Infinity,Infinity),hi=new Vector3(-Infinity,-Infinity,-Infinity);
      for(const mesh of root.getChildMeshes()){
        const matrix=mesh.computeWorldMatrix(true),positions=mesh.getVerticesData("position")??[];
        for(let i=0;i<positions.length;i+=3){
          const p=Vector3.TransformCoordinates(Vector3.FromArray(positions,i),matrix);
          lo.minimizeInPlace(p);hi.maximizeInPlace(p);
        }
      }
      return hi.subtract(lo).asArray();
    };
    root.parent=bird;root.scaling.setAll(carriedBundleScale);
    const carried=size();
    root.parent=null;root.scaling.setAll(habitatPresentation.reedBundleScale);
    size().forEach((n,i)=>expect(n).toBeCloseTo(carried[i],6));
    for(const tree of trees){
      root.position.set(tree.x*2,.34,tree.z*2);
      root.scaling.setAll(habitatPresentation.reedBundleScale);
      size().forEach((n,i)=>expect(n).toBeCloseTo(carried[i],6));
      expect(treeScale[tree.id]).toBe(1);
    }
    expect(Math.max(...carried)).toBeGreaterThan(.6);
    expect(Math.max(...carried)).toBeLessThan(.744); // authored moving basket's outer envelope; visual seating is checked in-browser
  }finally{scene.dispose();engine.dispose();}
});

test("actual glTF node world positions share canonical habitat handedness and scale",async()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  try{
    for(const tree of trees)for(const [asset,names,mirror] of [
      [tree.id,["natural-perch-0","natural-perch-1","sheltered-deck","ladder-base"],true],
      ["sleeping-deck",["sheltered-perch-2","sheltered-perch-3","home-edge","ramp-middle","deck-entry"],true],
      ["hauling-basket",["basket-ground","basket-landing","operator-ground","lift-rope"],true],
    ]){
      const bytes=readFileSync(new URL(`../../public/assets/environment/${asset}.glb`,import.meta.url));
      const loaded=await ImportMeshAsync(bytes,scene,{pluginExtension:".glb"});
      const root=loaded.meshes[0];if(mirror)root.scaling.x*=-1;
      root.scaling.scaleInPlace(treeScale[tree.id]);root.position.set(tree.x*2,.18,tree.z*2);
      for(const name of names){
        const node=[...loaded.transformNodes,...loaded.meshes].find(n=>n.name===name);
        expect(node,`${asset}/${name}`).toBeDefined();node.computeWorldMatrix(true);
        const actual=node.getAbsolutePosition();
        const expected=presentedTreePosition(tree.id,habitatPosition(tree.id,habitatAnchor(tree.id,name)));
        expect(actual.x,`${asset}/${name} X`).toBeCloseTo(expected.x,5);
        expect(actual.y).toBeCloseTo(expected.y+.18,5);expect(actual.z).toBeCloseTo(expected.z,5);
      }
      if(asset==="hauling-basket"){
        const basket=loaded.transformNodes.find(n=>n.name==="basket");
        const cargo=loaded.transformNodes.find(n=>n.name==="cargo-socket");
        const base=basket.position.y;
        for(const progress of [0,.325,1]){
          basket.position.y=base+progress*treeHabitat(tree.id).hauling.travelY;
          root.computeWorldMatrix(true);basket.computeWorldMatrix(true);cargo.computeWorldMatrix(true);
          const actual=cargo.getAbsolutePosition();
          const expected=presentedTreePosition(tree.id,basketLiftPosition(tree.id,progress));
          expect(actual.x).toBeCloseTo(expected.x,5);expect(actual.y).toBeCloseTo(expected.y+.18,5);expect(actual.z).toBeCloseTo(expected.z,5);
        }
      }
      root.dispose(false,true);
    }
  }finally{scene.dispose();engine.dispose();}
});
