import { describe, expect, it } from "vitest";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Viewport } from "@babylonjs/core/Maths/math.viewport";
import { inhabitedValleyWorld, originalInhabitedValleyWorld } from "../content/settlement-world";
import { clearingCameraView, defaultClearingZoom, stepClearingZoom, wheelClearingZoom, type ClearingFraming } from "./clearing-camera";

describe("living valley orthographic zoom",()=>{
  for(const world of [originalInhabitedValleyWorld,inhabitedValleyWorld])
    for(const framing of ["habitat","whole","follow"] as ClearingFraming[])
      it(`changes actual projected size in ${framing}, world ${world.identity.version}, without retargeting`,()=>{
        for(const aspect of [16/9,390/700]){
          const view=(zoom:number)=>clearingCameraView({world:world.identity},framing,zoom,Math.PI/2.6,Math.PI/3.2,aspect);
          const normal=view(defaultClearingZoom), close=view(stepClearingZoom(defaultClearingZoom,"in")), far=view(stepClearingZoom(defaultClearingZoom,"out"));
          const projectedWidth=(halfHeight:number)=>{
            const projection=Matrix.OrthoLH(2*halfHeight*aspect,2*halfHeight,.1,150);
            const viewport=new Viewport(0,0,390,390/aspect);
            const a=Vector3.Project(new Vector3(-1,0,5),Matrix.IdentityReadOnly,projection,viewport);
            const b=Vector3.Project(new Vector3(1,0,5),Matrix.IdentityReadOnly,projection,viewport);
            return b.x-a.x;
          };
          expect(projectedWidth(close.halfHeight)).toBeGreaterThan(projectedWidth(normal.halfHeight));
          expect(projectedWidth(normal.halfHeight)).toBeGreaterThan(projectedWidth(far.halfHeight));
          expect(close.target).toEqual(normal.target);
          expect(far.target).toEqual(normal.target);
          if(framing==="follow")expect(normal.target).toBeNull();
        }
      });
  it("routes both wheel directions through the button levels and stops at the same bounds",()=>{
    let buttons=defaultClearingZoom,wheel=defaultClearingZoom;
    for(const delta of [-100,-100,-100,100,100,100,100,-100]){
      buttons=stepClearingZoom(buttons,delta<0?"in":"out");
      wheel=wheelClearingZoom(wheel,delta);
      expect(wheel).toBe(buttons);
      expect(wheel).toBeGreaterThanOrEqual(3.2);
      expect(wheel).toBeLessThanOrEqual(6);
    }
    expect(wheelClearingZoom(wheel,0)).toBe(wheel);
    expect(stepClearingZoom(3.2,"in")).toBe(3.2);
    expect(stepClearingZoom(6,"out")).toBe(6);
  });
  it("retains fixed responsive Woodland framing",()=>{
    for(const aspect of [16/9,390/700]){
      const normal=clearingCameraView({},"habitat",defaultClearingZoom,0,1,aspect);
      expect(clearingCameraView({},"habitat",3.2,0,1,aspect)).toEqual(normal);
      expect(clearingCameraView({},"habitat",6,0,1,aspect)).toEqual(normal);
      expect(normal.halfHeight).toBe(Math.max(10.8,10.8/aspect));
    }
  });
});
