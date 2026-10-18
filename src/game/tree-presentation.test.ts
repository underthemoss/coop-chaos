import { describe, expect, test } from "vitest";
import { initialSettlement, basketLiftPosition } from "../simulation/settlement";
import { trees } from "../content/settlement";
import { presentedBirdPosition, presentedTreePosition, treeScale } from "./tree-presentation";

describe("tree presentation preserves attachment truth",()=>{
  for(const tree of trees) test(`${tree.id}: natural and sheltered anchors, ladder and unchanged ground`,()=>{
    const bird=initialSettlement().birds[0];
    expect(presentedBirdPosition(bird)).toEqual({x:bird.at.x*2,y:0,z:bird.at.z*2});
    const scale=treeScale[tree.id];
    for(const sheltered of [false,true])for(const slot of [0,1]){
      bird.perch={tree:tree.id,slot,sheltered};
      const end=presentedBirdPosition(bird);
      expect(end.x).toBeCloseTo(tree.x*2+(slot===0?-.86:.86)*scale);
      expect(end.y).toBeCloseTo((sheltered?2.25:3.15+slot*.18)*scale);
      expect(end.z).toBeCloseTo(tree.z*2+(sheltered?-.5:.46)*scale);
      bird.perch=null;bird.flight={tree:tree.id,slot,sheltered,direction:"up",progress:0,from:{x:tree.x,z:tree.z}};
      expect(presentedBirdPosition(bird)).toEqual({x:tree.x*2,y:0,z:tree.z*2});
      if(sheltered){bird.flight.progress=.4;const base=presentedBirdPosition(bird);expect(base.z).toBeCloseTo(tree.z*2-1.08*scale);expect(base.y).toBe(0);}
      bird.flight.progress=1;const arrived=presentedBirdPosition(bird);for(const axis of ["x","y","z"] as const)expect(arrived[axis]).toBeCloseTo(end[axis],10);bird.flight=null;
    }
  });
});

// These are the authored deck sockets and cargo socket, not alternate gameplay rules.
describe("canopy additions share the existing tree transform",()=>{
  for(const tree of trees) test(`${tree.id}: extra berths and raised cargo remain attached`,()=>{
    const scale=treeScale[tree.id],bird=initialSettlement().birds[0];
    for(const slot of [2,3]){
      bird.perch={tree:tree.id,slot,sheltered:true};
      const p=presentedBirdPosition(bird);
      expect(p.x).toBeCloseTo(tree.x*2+(slot===2?1.48:2.52)*scale);
      expect(p.y).toBeCloseTo(2.85*scale);
      expect(p.z).toBeCloseTo(tree.z*2-.5*scale);
      bird.perch=null;
      bird.flight={tree:tree.id,slot,sheltered:true,direction:"up",progress:1,from:{x:tree.x,z:tree.z}};
      for(const axis of ["x","y","z"] as const)expect(presentedBirdPosition(bird)[axis]).toBeCloseTo(p[axis],10);
      bird.flight=null;
    }
    for(const progress of [0,.25,1]){
      const p=presentedTreePosition(tree.id,basketLiftPosition(tree.id,progress));
      expect(p.x).toBeCloseTo(tree.x*2-1.65*scale);
      expect(p.y).toBeCloseTo((.12+2.1*progress+.22)*scale);
      expect(p.z).toBeCloseTo(tree.z*2-.45*scale);
    }
  });
});

describe("supported deck access follows the same saved parameter in both directions",()=>{
  for(const tree of trees)for(const slot of [2,3])test(`${tree.id} berth ${slot}: ladder then home, ramp and deck`,()=>{
    const bird=initialSettlement().birds[0],scale=treeScale[tree.id];
    const stops=[{t:.7,p:[0,2.25,-1.08]},{t:.76,p:[0,2.25,-.5]},{t:.82,p:[.78,2.25,-.5]},{t:.9,p:[1.07,2.48,-.5]},{t:.95,p:[1.27,2.85,-.5]}];
    for(const {t,p} of stops){
      bird.flight={tree:tree.id,slot,sheltered:true,direction:"up",progress:t,from:{x:tree.x,z:tree.z-1}};
      const up=presentedBirdPosition(bird);
      expect(up.x).toBeCloseTo(tree.x*2+p[0]*scale,8);expect(up.y).toBeCloseTo(p[1]*scale,8);expect(up.z).toBeCloseTo(tree.z*2+p[2]*scale,8);
      bird.flight.direction="down";expect(presentedBirdPosition(bird)).toEqual(up);
    }
  });
});
