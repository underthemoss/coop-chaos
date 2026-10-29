import { inhabitedValleyWorld } from "../content/settlement-world";
import { mapPosition } from "../content/maps";
import { describe, expect, it } from "vitest";
import { trees } from "../content/settlement";
import { command, conserved, initialSettlement, step } from "../simulation/settlement";
import { decodeSettlement, encodeSettlement } from "../persistence/settlement-save";
import { nurseryPresentation, homePartVisible, buildingStage, groundPartVisible, authoredPart, habitatPartVisible } from "./building-presentation";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import valleyHabitat from "../content/valley-habitat.json";

it("keeps earned habitat parts and lift anchors addressable after Babylon hierarchy cloning",()=>{
  const engine=new NullEngine(),scene=new Scene(engine),root=new Mesh("kit",scene);
  const asset=new TransformNode("asset",scene);asset.parent=root;
  for(const name of ["home-deck","home-hood-left","middle-deck","basket","lift-rope"]){
    const group=new TransformNode(name,scene);group.parent=asset;group.metadata={authoredPart:name};
    const mesh=new Mesh(`${name}_primitive0`,scene);mesh.parent=group;mesh.metadata={authoredPart:mesh.name};
  }
  const copy=root.clone("valley-kit-placed",null)!;
  const visible=new Set([...valleyHabitat.profile.stages.home.base,...valleyHabitat.profile.stages.home.frame,...valleyHabitat.profile.stages.home.complete]);
  const parts=copy.getChildMeshes();
  expect(parts.every(p=>p.name.startsWith("valley-kit-placed.asset."))).toBe(true);
  expect(parts.filter(p=>habitatPartVisible(p,visible)).map(authoredPart)).toEqual(["home-deck_primitive0","home-hood-left_primitive0"]);
  for(const name of ["basket","lift-rope"])expect(copy.getDescendants().filter(n=>authoredPart(n)===name)).toHaveLength(1);
  scene.dispose();engine.dispose();
});

describe("Boughhome saved construction presentation", () => {
  it("reveals authored parts from real deliveries and work, unchanged by save/readback", () => {
    let state = command(initialSettlement(), { type: "build", kind: "treehouse", at: trees[0] });
    const observed = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const site = state.sites[0], stage = buildingStage(site);
      observed.add(stage);
      expect(homePartVisible("boughhome.deck", stage)).toBe(stage > 0);
      expect(homePartVisible("boughhome.rainhood-left", stage)).toBe(stage >= 2);
      expect(homePartVisible("boughhome.rainhood-right", stage)).toBe(stage >= 2);
      expect(homePartVisible("boughhome.ladder", stage)).toBe(stage === 3);
      const reopened = decodeSettlement(encodeSettlement(state));
      expect(buildingStage(reopened.sites[0])).toBe(stage);
      expect(conserved(state)).toBe(8);
      if (site.complete) break;
      state = step(state);
    }
    expect([...observed].sort()).toEqual([0, 1, 2, 3]);
    expect(state.sites[0].complete).toBe(true);
    expect(state.consumed).toBe(6);
  });
  it("assembles ground kits without showing completed containers or hoods during construction", () => {
    let state = initialSettlement();
    // Supported legacy supply isolates presentation from gathering; it remains conserved.
    state.initialReeds = state.totalReeds = state.piles[0].stock = 40;
    for (const kind of ["treehouse", "store", "nursery"] as const) {
      state = command(state, { type: "build", kind, at: kind === "store" ? { x: -4, z: -1 } : trees[0] });
      const stages = new Set<number>();
      for (let i = 0; i < 3000; i++) {
        const site = state.sites.at(-1)!, stage = buildingStage(site);
        stages.add(stage);
        for (const part of ["base", "frame", "container", "rainhood", "nest"]) {
          const visible = part === "base" ? stage >= 1 : part === "frame" ? stage >= 2 : stage === 3;
          expect(groundPartVisible(`${kind}.${part}`, stage)).toBe(visible);
        }
        expect(buildingStage(decodeSettlement(encodeSettlement(state)).sites.at(-1)!)).toBe(stage);
        expect(conserved(state)).toBe(40);
        if (site.complete) break;
        state = step(state);
      }
      expect([...stages].sort()).toEqual([0, 1, 2, 3]);
      expect(state.sites.at(-1)!.complete).toBe(true);
    }
    expect(state.consumed).toBe(14);
  });
});

it("places preview and earned nursery at the ground court rather than the scaled tree root",()=>{
  expect(nurseryPresentation(trees[0])).toEqual({x:trees[0].x*2-1.05,y:0,z:(trees[0].z-1)*2+.55});
  const world=inhabitedValleyWorld,pad=world.pads.find(p=>p.kind==="nursery")!;
  expect(nurseryPresentation(pad.at,{world:world.identity})).toEqual(mapPosition(world.map!,pad.at));
});
