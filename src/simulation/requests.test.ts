import { describe, expect, it } from "vitest";
import { economyTuning, trees } from "../content/settlement";
import { settlementV5Fixture } from "../persistence/settlement-fixtures";
import { decodeSettlement, encodeSettlement, validateSettlement } from "../persistence/settlement-save";
import { command, conserved, foodConserved, initialSettlement, requestOptions, requestStatus, step, type Settlement } from "./settlement";
function advance(s: Settlement, done: (s: Settlement)=>boolean, limit=4000) {
  for(let i=0;i<limit&&!done(s);i++) {
    s=step(s); validateSettlement(s);
    expect(conserved(s)).toBe(s.totalReeds);expect(foodConserved(s)).toBe(true);
    if(i%17===0)s=decodeSettlement(encodeSettlement(s));
  }
  expect(done(s)).toBe(true);return s;
}
const bird=(s:Settlement)=>s.birds[0];
function request(s:Settlement,kind:"gather"|"build"|"food") {
  const option=requestOptions(s,bird(s)).find(o=>o.kind===kind)!;
  return command(s,{type:"request",bird:bird(s).id,kind,target:option.target});
}
function home() {
  let s=initialSettlement();s.economy.clock.automatic=false;
  s=command(s,{type:"build",kind:"treehouse",at:trees[0]});
  return advance(s,s=>s.sites[0].complete);
}
describe("one-task chicken requests",()=>{
  it("pauses a weaving task at automatic dusk, reloads unchanged, and finishes after morning",()=>{
    let s=command(initialSettlement(),{type:"build",kind:"treehouse",at:trees[0]});
    s=request(s,"build");
    s=advance(s,s=>s.sites[0].progress>0&&s.sites[0].progress<30);
    s.economy.clock.phaseTick=economyTuning.dayTicks-1;
    const progress=s.sites[0].progress;
    const material=conserved(s);
    s=step(s);expect(s.phase).toBe("evening");
    s=decodeSettlement(encodeSettlement(s));
    s=advance(s,s=>s.economy.clock.phaseTick===economyTuning.eveningTicks-1);
    expect(s.sites[0].progress).toBe(progress);
    expect(conserved(s)).toBe(material);expect(s.sites[0].complete).toBe(false);
    const replay=decodeSettlement(encodeSettlement(s));
    s=advance(s,s=>s.sites[0].complete);
    expect(s.phase).toBe("day");
    expect(advance(replay,s=>s.sites[0].complete)).toEqual(s);
    expect(s.sites[0].progress).toBe(30);expect(conserved(s)).toBe(material);
  });
  it("delivers exactly one un-designated bundle, survives replay, then returns to autonomy",()=>{
    let s=request(initialSettlement(),"gather");
    const target=bird(s).request!.target;
    expect(s.patches.every(p=>!p.designated)).toBe(true);
    expect(()=>request(s,"gather")).toThrow(/Finish or cancel/);
    s=advance(s,s=>bird(s).cargo===1);
    expect(bird(s).request?.phase).toBe("working");
    const replay=decodeSettlement(encodeSettlement(s));
    s=advance(s,s=>bird(s).request===null);
    const repeated=advance(replay,s=>bird(s).request===null);
    expect(repeated).toEqual(s);expect(s.harvestedReeds).toBe(1);
    expect(s.piles[0].stock).toBe(9);expect(bird(s).requestResult?.outcome).toBe("done");
    expect(s.patches.find(p=>p.id===target)?.designated).toBe(false);
    s=advance(s,s=>s.tick>=repeated.tick+100);
    expect(s.harvestedReeds).toBe(1);
  });
  it("cancels uncollected at a safe boundary and delivers already-carried material",()=>{
    let s=request(initialSettlement(),"gather");
    s=advance(s,s=>!!bird(s).edge);
    s=command(s,{type:"cancel-request",bird:bird(s).id});
    expect(bird(s).request?.phase).toBe("canceling");
    s=advance(s,s=>!bird(s).request);
    expect(s.harvestedReeds).toBe(0);expect(bird(s).requestResult?.outcome).toBe("cancelled");
    s=request(s,"gather");s=advance(s,s=>bird(s).cargo===1);
    s=command(s,{type:"cancel-request",bird:bird(s).id});
    expect(bird(s).request).toBe(null);expect(bird(s).cargo).toBe(1);
    s=advance(s,s=>bird(s).cargo===0);
    expect(s.piles[0].stock).toBe(9);expect(bird(s).requestResult?.outcome).toBe("cancelled");
  });
  it("queues at night, defers meals and rest, and never grants a young bird work",()=>{
    let s=command(initialSettlement(),{type:"phase",phase:"evening"});
    s=command(s,{type:"build",kind:"treehouse",at:trees[0]});
    s=request(s,"build");expect(requestStatus(s,bird(s))).toMatch(/morning/);
    const queued=s.sites[0];s=advance(s,s=>s.tick===30);
    expect(s.sites[0].delivered).toBe(queued.delivered);
    s=command(s,{type:"phase",phase:"day"});
    bird(s).satiety=5;bird(s).protein=5;
    expect(requestStatus(s,bird(s))).toMatch(/Eating/);
    s=advance(s,s=>bird(s).foraging?.intent==="eat");
    expect(bird(s).cargo).toBe(0);
    const child={...bird(s),life:{...bird(s).life,stage:"chick" as const}};
    expect(requestOptions(s,child).every(o=>!o.available&&o.reason.includes("young"))).toBe(true);
    const carer={...bird(s),care:"brood"};
    expect(requestOptions(s,carer).every(o=>!o.available&&o.reason.includes("Caring"))).toBe(true);
  });
  it("cancels before a pickup on the arrival step without taking a bundle",()=>{
    let s=command(initialSettlement(),{type:"build",kind:"treehouse",at:trees[0]});
    bird(s).at={x:0,z:-2};
    s=request(s,"build");
    s=advance(s,s=>!!bird(s).edge&&bird(s).job?.stage==="pickup"&&bird(s).edge!.progress>.9);
    s=command(s,{type:"cancel-request",bird:bird(s).id});
    s=advance(s,s=>!bird(s).request);
    expect(bird(s).cargo).toBe(0);expect(bird(s).requestResult?.outcome).toBe("cancelled");
  });
  it("ends one help task after its real contribution, not after the entire project",()=>{
    let s=command(initialSettlement(),{type:"build",kind:"treehouse",at:trees[0]});
    s=request(s,"build");s=advance(s,s=>bird(s).requestResult?.outcome==="done");
    expect(s.sites[0].complete).toBe(false);expect(bird(s).deliveries).toBe(1);
    expect(s.sites[0].contributors).toContain(bird(s).id);
  });
  it("helps once, reconciles site cancellation, and preserves cargo conservation",()=>{
    let s=command(initialSettlement(),{type:"build",kind:"treehouse",at:trees[0]});
    s=request(s,"build");s=advance(s,s=>bird(s).cargo===1);
    s=command(s,{type:"cancel",id:s.sites[0].id});
    validateSettlement(s);expect(bird(s).request).toBe(null);
    expect(bird(s).requestResult?.reason).toMatch(/cancelled/);
    s=advance(s,s=>s.birds.every(b=>!b.cargo));expect(s.piles[0].stock).toBe(8);
  });
  it("delivers one real typed meal to the chosen nursery and retains food ledgers",()=>{
    let s=home();s=command(s,{type:"build",kind:"nursery",at:trees[0]});
    s=command(s,{type:"gather",id:"patch-west",designated:true});
    s=advance(s,s=>s.sites.some(site=>site.kind==="nursery"&&site.complete));
    s=command(s,{type:"priority",priority:"build"});
    s=request(s,"food");
    s=advance(s,s=>bird(s).requestResult?.outcome==="done");
    expect(bird(s).requestResult?.reason).toMatch(/Food delivered/);
    expect(s.forage.reduce((n,p)=>n+p.harvested.staple+p.harvested.protein,0)).toBeGreaterThan(0);
  });
  it("migrates strict v5 without inventing orders and rejects forged targets or active work",()=>{
    const old=settlementV5Fixture(home());
    const migrated=decodeSettlement(JSON.stringify({schemaVersion:5,simulationVersion:"settlement-5",state:old}));
    expect(settlementV5Fixture(migrated)).toEqual(old);
    expect(migrated.birds.every(b=>b.request===null&&b.requestResult===null)).toBe(true);
    let s=request(initialSettlement(),"gather");
    bird(s).request!.target="missing";expect(()=>validateSettlement(s)).toThrow();
    s=request(initialSettlement(),"gather");bird(s).request!.phase="working";
    expect(()=>validateSettlement(s)).toThrow();
  });
});
