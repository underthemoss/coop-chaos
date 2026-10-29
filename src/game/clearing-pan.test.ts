import { describe, expect, it } from "vitest";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Viewport } from "@babylonjs/core/Maths/math.viewport";
import { inhabitedValleyWorld, originalInhabitedValleyWorld } from "../content/settlement-world";
import { mapVertex } from "../content/maps";
import { boundedCameraPan, cameraEdgeAxis, cameraPanPixels, clearingCameraBounds, clearingPanOffset, freeCameraHalfHeight } from "./clearing-camera";
import { ClearingPanInput } from "./clearing-pan-input";

describe("living valley camera pan", () => {
  it("moves the orthographic ground view in screen directions and makes grab dragging 1:1", () => {
    const alpha=Math.PI/2.6,beta=Math.PI/3.2,height=720,halfHeight=8;
    const target=new Vector3(3,4,-2);
    const eye=target.add(new Vector3(Math.cos(alpha)*Math.sin(beta)*65,Math.cos(beta)*65,Math.sin(alpha)*Math.sin(beta)*65));
    for(const aspect of [16/9,390/700]){
      const viewport=new Viewport(0,0,height*aspect,height);
      const projection=Matrix.OrthoLH(2*halfHeight*aspect,2*halfHeight,.1,150);
      const project=(offset:Vector3)=>Vector3.Project(new Vector3(1,0,2),Matrix.IdentityReadOnly,Matrix.LookAtLH(eye.add(offset),target.add(offset),Vector3.Up()).multiply(projection),viewport);
      const before=project(Vector3.Zero());
      // Babylon matrices use float32; a thousandth CSS pixel is below presentation resolution.
      for(const pixels of [{x:80,y:0},{x:0,y:-60},{x:-42,y:33}]){
        const pan=clearingPanOffset(pixels,halfHeight,height,alpha,beta);
        const after=project(new Vector3(pan.x,0,pan.z));
        expect(after.x-before.x).toBeCloseTo(-pixels.x,3);
        expect(after.y-before.y).toBeCloseTo(-pixels.y,3);
      }
    }
  });
  it("ramps only in the outer 24 CSS pixels and has no diagonal speed boost", () => {
    expect(cameraEdgeAxis({x:300,y:200},600,400)).toEqual({x:0,y:0});
    expect(cameraEdgeAxis({x:12,y:200},600,400)).toEqual({x:-.5,y:0});
    expect(cameraEdgeAxis({x:600,y:0},600,400)).toEqual({x:1,y:-1});
    expect(cameraEdgeAxis({x:-1,y:0},600,400)).toEqual({x:0,y:0});
    const straight=cameraPanPixels({x:1,y:0},720,1/60),diagonal=cameraPanPixels({x:1,y:1},720,1/60);
    expect(Math.hypot(diagonal.x,diagonal.y)).toBeCloseTo(straight.x);
    const total=(hz:number)=>Array.from({length:hz},()=>cameraPanPixels({x:.5,y:0},720,1/hz).x).reduce((a,b)=>a+b,0);
    expect(total(30)).toBeCloseTo(total(120),8);
    expect(cameraPanPixels({x:1,y:0},720,20)).toEqual(cameraPanPixels({x:1,y:0},720,.1));
  });
  for(const world of [originalInhabitedValleyWorld,inhabitedValleyWorld])it(`clamps target centers to exact authored world ${world.identity.version} bounds without changing height`,()=>{
    const context={world:world.identity},bounds=clearingCameraBounds(context)!;
    const map=world.map!;
    for(let z=0;z<=map.depth;z++)for(let x=0;x<=map.width;x++){
      const p=mapVertex(map,x,z);
      expect(p.x).toBeGreaterThanOrEqual(bounds.minX);expect(p.x).toBeLessThanOrEqual(bounds.maxX);
      expect(p.z).toBeGreaterThanOrEqual(bounds.minZ);expect(p.z).toBeLessThanOrEqual(bounds.maxZ);
    }
    expect(boundedCameraPan({x:0,y:7,z:0},{x:1e6,z:-1e6},bounds)).toEqual({x:bounds.maxX,y:7,z:bounds.minZ});
    expect(boundedCameraPan({x:0,y:7,z:0},{x:-1e6,z:1e6},bounds)).toEqual({x:bounds.minX,y:7,z:bounds.maxZ});
  });
  it("retains captured free-view span, using the same zoom ratio independent of aspect",()=>{
    const captured=17,zoom=4.2;
    expect(freeCameraHalfHeight(captured,zoom,zoom)).toBe(captured);
    expect(freeCameraHalfHeight(captured,zoom,3.2)).toBeCloseTo(captured*3.2/4.2);
    expect(freeCameraHalfHeight(captured,zoom,6)).toBeCloseTo(captured*6/4.2);
    expect(clearingCameraBounds({})).toBeNull();
  });
  it("clears idle edge intent on overlays, buttons, leave and reset; touch cannot supply unobscured mouse intent",()=>{
    const input=new ClearingPanInput();
    const hover=(buttons=0,unobscured=true)=>input.hover({x:0,y:200},600,400,buttons,unobscured);
    hover();expect(input.direction().x).toBe(-1);
    hover(0,false);expect(input.direction()).toEqual({x:0,y:0});
    hover();input.press(1);expect(input.direction()).toEqual({x:0,y:0});
    input.release(0);expect(input.direction()).toEqual({x:0,y:0});
    hover(4);expect(input.direction()).toEqual({x:0,y:0});
    hover();input.leave();expect(input.direction()).toEqual({x:0,y:0});
    hover();input.reset();expect(input.direction()).toEqual({x:0,y:0});
  });
  it("keeps arrow admission separate from placement/editing, releases on focus loss, and never claims action keys",()=>{
    const input=new ClearingPanInput();
    expect(input.keyDown("ArrowRight",false)).toBe(false);
    expect(input.keyDown("s",true)).toBe(false);expect(input.keyDown("m",true)).toBe(false);
    expect(input.keyDown("ArrowRight",true)).toBe(true);expect(input.direction()).toEqual({x:1,y:0});
    input.keyDown("ArrowLeft",true);expect(input.direction()).toEqual({x:0,y:0});
    input.keyUp("ArrowLeft");expect(input.direction().x).toBe(1);
    input.clearKeys();expect(input.direction()).toEqual({x:0,y:0});
    input.keyDown("ArrowUp",true);input.reset();expect(input.direction()).toEqual({x:0,y:0});
  });
  it("makes middle drag exclusive, ignores other pointers, and forgets it on cancellation",()=>{
    const input=new ClearingPanInput();
    input.hover({x:0,y:200},600,400,0,true);input.beginDrag(9,100,80);
    expect(input.direction()).toEqual({x:0,y:0});expect(input.dragTo(10,120,90)).toBeNull();
    expect(input.dragTo(9,120,90)).toEqual({x:-20,y:-10});
    input.reset();expect(input.dragId()).toBeNull();expect(input.dragTo(9,130,100)).toBeNull();
    expect(input.direction()).toEqual({x:0,y:0});
  });
});
