import { describe, expect, it } from "vitest";
import { mapPosition } from "../content/maps";
import { inhabitedValleyWorld, originalInhabitedValleyWorld } from "../content/settlement-world";
import { groundPick } from "./clearing-input";
import { marqueeBirds, projectedBodyBounds } from "./clearing-input";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Viewport } from "@babylonjs/core/Maths/math.viewport";

describe("clearing terrain input", () => {
  it("distinguishes a missing terrain ray from an out-of-world hit without inventing cells", () => {
    expect(groundPick(null)).toEqual({kind:"miss",reason:"no-ground"});
    expect(groundPick({x:100,z:0})).toEqual({kind:"miss",reason:"outside-world"});
    expect(groundPick({x:2,z:-2})).toEqual({kind:"cell",at:{x:1,z:-1}});
  });
  it.each([originalInhabitedValleyWorld, inhabitedValleyWorld])("preserves world $identity.version bounds and exact mapped cells", world => {
    const context={world:world.identity}, map=world.map!;
    const at={x:map.width-1,z:map.depth-1};
    expect(groundPick(mapPosition(map,at),context)).toEqual({kind:"cell",at});
    const edge=mapPosition(map,{x:map.width-1,z:0});
    expect(groundPick({x:edge.x+map.cellSize,z:edge.z},context)).toEqual({kind:"miss",reason:"outside-world"});
    expect(groundPick(null,context)).toEqual({kind:"miss",reason:"no-ground"});
    // A terrain hit is forwarded unchanged; simulation alone decides reachability.
    const blockedIndex=map.tiles.findIndex(t=>!t.traversable);
    const blocked={x:blockedIndex%map.width,z:Math.floor(blockedIndex/map.width)};
    expect(blockedIndex).toBeGreaterThanOrEqual(0);
    expect(groundPick(mapPosition(map,blocked),context)).toEqual({kind:"cell",at:blocked});
  });
});

describe("marquee body geometry",()=>{
  const transform=Matrix.LookAtLH(new Vector3(0,0,-10),Vector3.Zero(),Vector3.Up())
    .multiply(Matrix.PerspectiveFovLH(Math.PI/2,1,.1,100));
  const viewport=new Viewport(0,0,400,400);
  function body(x:number,z=0){
    const corners=[];
    for(const dx of [-.4,.4])for(const dy of [-.4,.4])for(const dz of [-.4,.4])
      corners.push(Vector3.Project(new Vector3(x+dx,dy,z+dz),Matrix.IdentityReadOnly,transform,viewport));
    return projectedBodyBounds(corners,400,400);
  }
  it("selects multiple projected bodies without requiring visible name labels",()=>{
    const birds=new Map([["fern",body(-2)!],["rook",body(2)!]]);
    expect(marqueeBirds(birds,{x:100,y:170},{x:270,y:230})).toEqual(["fern","rook"]);
    expect(marqueeBirds(birds,{x:270,y:230},{x:100,y:170})).toEqual(["fern","rook"]);
    // Intersecting the body edge is enough; neither its center nor its label
    // above the head has to lie inside this small drag rectangle.
    const fern=birds.get("fern")!;
    expect(marqueeBirds(birds,{x:fern.left-1,y:199},{x:fern.left+1,y:201})).toEqual(["fern"]);
  });
  it("rejects behind-camera and offscreen bodies, retaining partial viewport footprints",()=>{
    expect(body(0,-12)).toBeNull();
    expect(body(30)).toBeNull();
    expect(body(10)?.right).toBe(400);
    expect(projectedBodyBounds([{x:NaN,y:2,z:.5}],400,400)).toBeNull();
    expect(marqueeBirds(new Map([["fern",body(-2)!]]),{x:300,y:10},{x:350,y:30})).toEqual([]);
  });
});
