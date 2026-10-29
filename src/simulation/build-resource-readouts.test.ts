import { describe, expect, it } from "vitest";
import { inhabitedValleyWorld, reedPatchName } from "../content/settlement-world";
import { trees } from "../content/settlement";
import { command, conserved, constructionBudget, initialSettlement, requestOptions, requestPlace, step, type Settlement } from "./settlement";
import { decodeSettlement, encodeSettlement, validateSettlement } from "../persistence/settlement-save";
function advance(s:Settlement,predicate:(s:Settlement)=>boolean,limit=5000){for(let i=0;i<limit&&!predicate(s);i++){s=step(s);expect(conserved(s)).toBe(s.initialReeds+s.harvestedReeds);validateSettlement(s);}expect(predicate(s)).toBe(true);return s;}
describe("construction material budget and selected gathering",()=>{
 it("counts every physical bundle once across multiple plans, pickups, deliveries and cancellation",()=>{
  let s=command(initialSettlement(),{type:"build",kind:"treehouse",at:trees[0]});
  s=command(s,{type:"build",kind:"store",at:{x:4,z:3}});
  expect(constructionBudget(s)).toMatchObject({outstanding:10,physical:8,shortfall:2,free:8,potential:24});
  s=advance(s,v=>v.birds.some(b=>b.cargo>0));
  expect(constructionBudget(s).shortfall).toBe(2);
  s=advance(s,v=>v.sites[0].delivered>0);
  expect(constructionBudget(s).shortfall).toBe(2);
  s=command(s,{type:"pause"});const paused=decodeSettlement(encodeSettlement(s));expect(constructionBudget(paused)).toEqual(constructionBudget(s));
  s=command(s,{type:"cancel",id:s.sites[0].id});
  expect(constructionBudget(s).shortfall).toBe(0);expect(conserved(s)).toBe(8);
 });
 it("includes gathered cargo on its way to storage, rather than asking to gather it again",()=>{
  let s=command(initialSettlement(),{type:"build",kind:"store",at:{x:4,z:3}});
  s=advance(s,v=>v.sites[0].complete);
  s=command(s,{type:"gather",id:"patch-west",designated:true});
  s=advance(s,v=>v.birds.some(b=>b.cargo>0&&b.job?.kind==="gather"));
  s=command(s,{type:"build",kind:"treehouse",at:trees[0]});
  const b=constructionBudget(s);expect(b.carried).toBeGreaterThan(0);expect(b.shortfall).toBe(Math.max(0,6-b.physical));expect(b.shortfall).toBeLessThan(Math.max(0,6-b.free));
 });
 it("requests the explicitly selected farther field, roundtrips and rejects exhausted, unreachable and stale targets",()=>{
  let s=initialSettlement(inhabitedValleyWorld.identity);s.paused=true;
  const bird=s.birds[0];const nearest=requestOptions(s,bird).find(o=>o.kind==="gather")!.target;
  const target=s.patches.find(p=>p.id!==nearest)!.id;
  expect(requestOptions(s,bird,target).find(o=>o.kind==="gather")!.target).toBe(target);
  s=command(s,{type:"request",bird:bird.id,kind:"gather",target});
  expect(s.birds[0].request?.target).toBe(target);expect(requestPlace(s,s.birds[0].request!)?.name).toBe(reedPatchName(s,target));
  expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
  expect(()=>command(s,{type:"request",bird:bird.id,kind:"gather",target})).toThrow(/request/);
  s=command(s,{type:"cancel-request",bird:bird.id});
  expect(()=>command(s,{type:"request",bird:bird.id,kind:"gather",target:"missing"})).toThrow();
  const dry=structuredClone(s);dry.patches.find(p=>p.id===target)!.remaining=0;
  expect(()=>command(dry,{type:"request",bird:bird.id,kind:"gather",target})).toThrow();
  const blocked=structuredClone(s);blocked.patches.find(p=>p.id===target)!.at={x:-100,z:-100};
  expect(()=>command(blocked,{type:"request",bird:bird.id,kind:"gather",target})).toThrow();
  s=command(s,{type:"request",bird:bird.id,kind:"gather",target});s=command(s,{type:"pause"});
  s=advance(s,v=>!v.birds[0].request);expect(s.birds[0].requestResult?.outcome).toBe("done");expect(s.harvestedReeds).toBe(1);
 });
 it("queues a selected valley field from the canonical landing place at night",()=>{
  let s=initialSettlement(inhabitedValleyWorld.identity);s.economy.clock.automatic=false;
  s=command(s,{type:"phase",phase:"evening"});
  s=advance(s,v=>!!v.birds[0].perch);
  const target="patch-east",b=s.birds[0];
  expect(requestOptions(s,b,target).find(o=>o.kind==="gather")?.available).toBe(true);
  s=command(s,{type:"request",bird:b.id,kind:"gather",target});
  expect(s.birds[0].cargo).toBe(0);expect(s.birds[0].perch).not.toBeNull();
  expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
  s=command(s,{type:"phase",phase:"day"});s=advance(s,v=>v.birds[0].requestResult?.outcome==="done");
  expect(s.harvestedReeds).toBe(1);
 });

});
