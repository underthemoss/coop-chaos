import { describe, expect, test } from "vitest";
import { initialSettlement, basketLiftPosition, command, step } from "../simulation/settlement";
import { trees } from "../content/settlement";
import { presentedBirdPosition, presentedTreePosition, treeScale, carriedBundleScale, birdHeading, accessHeading, accessAction, clamberLean } from "./tree-presentation";
import { habitatPresentation } from "../content/tree-habitats";

test("Longbough uses grounded walking before flight and folds before branch grasp in either direction",()=>{
  const bird=initialSettlement().birds[0];
  for(const direction of ["up","down"] as const){
    bird.flight={tree:"longbough",slot:0,sheltered:false,direction,progress:0,from:bird.at};
    for(const [progress,action] of [[.05,"walk"],[.1,"walk"],[.5,"flight"],[.71,"roost"],[1,"roost"]] as const){bird.flight.progress=progress;expect(accessAction(bird)).toBe(action);}
  }
  bird.flight!.tree="lowfork";expect(accessAction(bird)).toBe("flight");
});

test("adult and material world sizes are independent of the inhabited tree",()=>{
  expect(habitatPresentation.adultScale).toBe(.365);
  // All previously saved endpoints now refer to actual metres, without
  // shrinking either the house or a delivered bundle on secondary trees.
  for(const tree of trees){
    expect(treeScale[tree.id]).toBe(1);
    expect(carriedBundleScale*habitatPresentation.adultScale).toBeCloseTo(habitatPresentation.reedBundleScale,12);
    expect(habitatPresentation.reedBundleScale*treeScale[tree.id]).toBe(habitatPresentation.reedBundleScale);
  }
  expect(habitatPresentation.reedBundleScale*1.23).toBeLessThan(.744); // actual bundle length / basket depth
  expect(habitatPresentation.birdPickDiameter).toBeGreaterThan(.364);
});

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

test("authored +Z beak and carried load face the direction of travel",()=>{
  for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1],[2,-3]]){
    const a=birdHeading({x,z}),length=Math.hypot(x,z);
    expect(Math.sin(a)).toBeCloseTo(x/length,12);
    expect(Math.cos(a)).toBeCloseTo(z/length,12);
  }
});


test("paused saved access faces the route in both directions independently of a previous frame", async () => {
  const { encodeSettlement, decodeSettlement } = await import("../persistence/settlement-save");
  let built = initialSettlement();
  built.initialReeds = built.totalReeds = built.piles[0].stock = 40;
  for (const kind of ["treehouse", "hauling-basket", "sleeping-deck"] as const) {
    built = command(built, { type: "build", kind, at: trees[0] });
    for (let i = 0; i < 4000 && !built.sites.at(-1)!.complete; i++) built = step(built);
    expect(built.sites.at(-1)!.complete).toBe(true);
  }
  for (const direction of ["up", "down"] as const) for (const progress of [.86, .9, .925]) {
    const state = structuredClone(built), bird = state.birds[0];
    state.phase = direction === "up" ? "evening" : "day";
    state.economy.clock.phaseTick = 0;
    bird.job = null; bird.edge = null; bird.lift = null; bird.perch = null; bird.cargo = 0; bird.foraging = null;
    state.birds.forEach(other => { other.foraging = null; });
    state.paused = true;
    bird.flight = { tree: "lowfork", slot: 2, sheltered: true, direction, progress, from: { x: -2, z: 1 } };
    const portable = encodeSettlement(state), reopened = decodeSettlement(portable);
    expect(accessHeading(reopened.birds[0])).toBeCloseTo(direction === "up" ? Math.PI / 2 : -Math.PI / 2, 8);
    expect(presentedBirdPosition(reopened.birds[0])).toEqual(presentedBirdPosition(bird));
    expect(encodeSettlement(reopened)).toBe(portable);
  }
  expect(accessHeading(initialSettlement().birds[0])).toBeNull();
});


test("clamber posture fades from saved progress and resets outside upper descent", () => {
  const bird = initialSettlement().birds[0];
  bird.flight = { tree: "lowfork", slot: 2, sheltered: true, direction: "down", progress: .9, from: { x: -2, z: 1 } };
  const feet = presentedBirdPosition(bird);
  expect(clamberLean(bird)).toBe(.35);
  expect(presentedBirdPosition(bird)).toEqual(feet);
  for (const progress of [0, .82, .98, 1]) { bird.flight.progress = progress; expect(clamberLean(bird)).toBe(0); }
  bird.flight.progress = .835; expect(clamberLean(bird)).toBeCloseTo(.175);
  bird.flight.progress = .9; bird.flight.direction = "up"; expect(clamberLean(bird)).toBe(0);
  bird.flight.direction = "down"; bird.flight.slot = 1; expect(clamberLean(bird)).toBe(0);
  bird.flight = null; expect(clamberLean(bird)).toBe(0);
});


test("vertical sheltered access faces its authored arrival instead of the spawn point", () => {
  const bird = initialSettlement().birds[0];
  for (const direction of ["up", "down"] as const) for (const slot of [0, 1, 2, 3]) for (const progress of slot < 2 ? [.55, .7, .8] : [.55, .65]) {
    bird.flight = { tree: "lowfork", slot, sheltered: true, direction, progress, from: { x: -2, z: 1 } };
    expect(accessHeading(bird)).toBe(0);
  }
});
