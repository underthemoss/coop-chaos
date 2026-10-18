import {expect,test} from "vitest";
import {trees} from "../content/settlement";
import {treeWorkCell} from "../content/tree-habitats";
import {initialSettlement,route,step,command,conserved,foodConserved} from "./settlement";
import {encodeSettlement,decodeSettlement} from "../persistence/settlement-save";

test("new trips avoid every trunk and legacy trunk positions egress without losing cargo",()=>{
  let s=command(initialSettlement(),{type:"build",kind:"treehouse",at:{x:trees[0].x,z:trees[0].z}});
  const path=route(s,{x:-4,z:2},{x:4,z:2})!;
  expect(path.some(p=>trees.some(t=>t.x===p.x&&t.z===p.z))).toBe(false);
  const b=s.birds[0];b.at={x:trees[0].x,z:trees[0].z};b.edge=null;
  s=decodeSettlement(encodeSettlement(s));
  s=step(s);expect(s.birds[0].edge?.to).toEqual(treeWorkCell("lowfork"));
  for(let i=0;i<700&&!s.sites[0].complete;i++){
    s=step(s);expect(conserved(s)).toBe(8);expect(foodConserved(s)).toBe(true);
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    for(const bird of s.birds)if(bird.job?.kind==="build"&&!bird.edge)expect(bird.at).toEqual(treeWorkCell("lowfork"));
  }
  expect(s.sites[0].complete).toBe(true);
});

test("old v4 midflight fields roundtrip unchanged and finish both directions",()=>{
  for(const direction of ["up","down"] as const){
    let s=initialSettlement();s.phase=direction==="up"?"evening":"day";
    s.birds[0].flight={tree:"lowfork",slot:0,sheltered:false,direction,progress:.51,from:{x:-2,z:2}};
    const saved=encodeSettlement(s);expect(encodeSettlement(decodeSettlement(saved))).toBe(saved);
    for(let i=0;i<60;i++)s=step(s);
    expect(s.birds[0].flight).toBeNull();expect(conserved(s)).toBe(8);
    if(direction==="up")expect(s.birds[0].perch?.tree).toBe("lowfork");
    else expect(s.birds[0].at).not.toEqual({x:-2,z:2});
  }
});

test("legacy trunk lift finishes once; new lifted deliveries and four saved deck descents use supported access",()=>{
  let s=initialSettlement();s.initialReeds=s.totalReeds=s.piles[0].stock=40;
  const advance=(predicate:(state:typeof s)=>boolean)=>{
    for(let i=0;i<4000&&!predicate(s);i++){
      s=step(s);expect(conserved(s)).toBe(40);expect(foodConserved(s)).toBe(true);
      expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    }
    expect(predicate(s)).toBe(true);
  };
  const build=(kind:"treehouse"|"hauling-basket"|"sleeping-deck")=>{s=command(s,{type:"build",kind,at:{x:-2,z:2}});};
  build("treehouse");advance(v=>v.sites[0].complete);
  build("hauling-basket");advance(v=>v.birds.some(b=>b.lift));
  const operator=s.birds.find(b=>b.lift)!;
  expect(operator.at).toEqual(treeWorkCell("lowfork"));
  operator.at={x:-2,z:2}; // An actual v4 operating location, with job/cargo retained.
  const saved=encodeSettlement(s);s=decodeSettlement(saved);expect(encodeSettlement(s)).toBe(saved);
  advance(v=>!!v.basketTechnique);expect(s.consumed).toBe(10);
  build("sleeping-deck");advance(v=>v.birds.some(b=>b.lift));
  expect(s.birds.find(b=>b.lift)!.at).toEqual(treeWorkCell("lowfork"));
  advance(v=>v.sites.every(p=>p.complete));expect(s.consumed).toBe(14);
  s.birds.forEach(b=>{b.attachment="lowfork";});s=command(s,{type:"phase",phase:"evening"});
  advance(v=>v.birds.every(b=>b.perch));
  expect(s.birds.map(b=>b.perch!.slot).sort()).toEqual([0,1,2,3]);
  s=command(s,{type:"phase",phase:"day"});
  const deckBird=s.birds.find(b=>b.flight?.slot===2)!;
  deckBird.flight!.from={x:-2,z:2};deckBird.flight!.progress=.83;
  const oldMidflight=encodeSettlement(s);s=decodeSettlement(oldMidflight);expect(encodeSettlement(s)).toBe(oldMidflight);
  advance(v=>v.birds.every(b=>!b.flight&&!b.perch));
  // The old origin remains readable; after landing every occupant exits the trunk.
  for(let i=0;i<35;i++)s=step(s);
  expect(s.birds.every(b=>b.at.x!==-2||b.at.z!==2)).toBe(true);
});
