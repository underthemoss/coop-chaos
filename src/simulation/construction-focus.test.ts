import {describe,expect,it} from "vitest";
import {trees} from "../content/settlement";
import {settlementV6Fixture} from "../persistence/settlement-fixtures";
import {decodeSettlement,encodeSettlement,validateSettlement} from "../persistence/settlement-save";
import {broodReason,command,conserved,constructionFocusReadout,cost,foodConserved,initialSettlement,projectReadout,step,treeActivity,type Settlement} from "./settlement";

function until(s:Settlement,predicate:(s:Settlement)=>boolean,max=10000) {
  for(let i=0;i<max&&!predicate(s);i++) {
    s=step(s);
    expect(conserved(s)).toBe(s.totalReeds);
    expect(foodConserved(s)).toBe(true);
    if(i%100===0)validateSettlement(s);
  }
  expect(predicate(s)).toBe(true);validateSettlement(s);return s;
}
function projects() {
  let s=command(initialSettlement(),{type:"gather",id:"patch-west",designated:true});
  for(const tree of trees)s=command(s,{type:"build",kind:"treehouse",at:tree});
  return s;
}
function completeTimes(s:Settlement) {
  const times:Record<string,number>={};
  s=until(s,v=>{for(const site of v.sites)if(site.complete&&!times[site.id])times[site.id]=v.tick;return v.sites.every(site=>site.complete);});
  return {s,times};
}
function supported() {
  let s=command(initialSettlement(),{type:"gather",id:"patch-west",designated:true});
  s=command(s,{type:"build",kind:"treehouse",at:trees[0]});s=until(s,v=>v.sites[0].complete);
  s=command(s,{type:"build",kind:"nursery",at:trees[0]});s=until(s,v=>v.sites[1].complete);
  s=command(s,{type:"priority",priority:"provision"});
  s=until(s,v=>v.birds.some(b=>!broodReason(v,v.sites[1].id,b.id)));
  return command(s,{type:"brood",site:s.sites[1].id,mother:s.birds.find(b=>!broodReason(s,s.sites[1].id,b.id))!.id});
}
describe("persistent next construction focus",()=>{
  it("finishes a later contested project earlier without reordering plans or losing work",()=>{
    const start=projects(),last=start.sites[2].id;
    const normal=completeTimes(start);
    const focused=completeTimes(command(start,{type:"focus-build",site:last}));
    expect(focused.times[last]).toBeLessThan(normal.times[last]);
    expect(focused.s.sites.map(s=>s.id)).toEqual(start.sites.map(s=>s.id));
    expect(focused.s.constructionFocus).toBeNull();
    expect(focused.s.consumed).toBe(normal.s.consumed);
    expect(start.constructionFocus).toBeNull();
  },30000);

  it("tries focused material pickup before another project's ready weaving, then falls back usefully",()=>{
    let s=projects();s.sites[0].delivered=cost(s.sites[0]);s.piles[0].stock-=cost(s.sites[0]);validateSettlement(s);
    const focused=step(command(s,{type:"focus-build",site:s.sites[2].id}));
    expect(focused.birds[0].job).toMatchObject({kind:"haul",destination:s.sites[2].id});
    expect(step(s).birds[0].job).toMatchObject({kind:"build",destination:s.sites[0].id});
    // No loose reeds remain: the focused home is blocked, but the supplied home
    // can still be woven. The focus remains a plan rather than an idle lock.
    s.sites[1].delivered=2;s.piles[0].stock=0;
    s=command(s,{type:"focus-build",site:s.sites[2].id});validateSettlement(s);
    expect(projectReadout(s,s.sites[2]).shortfall).toBe(6);
    expect(step(s).birds[0].job).toMatchObject({kind:"build",destination:s.sites[0].id});
    expect(constructionFocusReadout(s)?.site.id).toBe(s.sites[2].id);
  });

  it("switches and clears without touching in-flight reservations, cargo, jobs, or lifts",()=>{
    let s=projects();s=until(s,v=>v.birds.some(b=>b.cargo>0));
    for(const focus of [s.sites[2].id,s.sites[1].id,null,null]) {
      const before=structuredClone(s);s=command(s,{type:"focus-build",site:focus});
      expect({...s,constructionFocus:before.constructionFocus}).toEqual(before);
      validateSettlement(s);
    }
    let lift=command(initialSettlement(),{type:"gather",id:"patch-west",designated:true});
    lift=command(lift,{type:"build",kind:"treehouse",at:trees[0]});lift=until(lift,v=>v.sites[0].complete);
    lift=command(lift,{type:"build",kind:"hauling-basket",at:trees[0]});lift=until(lift,v=>v.birds.some(b=>!!b.lift));
    lift=command(lift,{type:"build",kind:"treehouse",at:trees[1]});
    const original=structuredClone(lift.birds);
    lift=command(lift,{type:"focus-build",site:lift.sites[2].id});
    expect(lift.birds).toEqual(original);validateSettlement(lift);
    lift=until(lift,v=>v.sites[1].complete);
    expect(lift.basketTechnique).not.toBeNull();
  },30000);

  it("retains named requests, care, self-needs, and food-policy precedence",()=>{
    const start=supported();
    let s=command(start,{type:"build",kind:"treehouse",at:trees[1]});
    s=command(s,{type:"build",kind:"treehouse",at:trees[2]});
    const helper=s.birds.find(b=>!b.care&&!b.request)!;
    s=command(s,{type:"request",bird:helper.id,kind:"build",target:s.sites[2].id});
    const before=structuredClone(s);
    s=command(s,{type:"focus-build",site:s.sites[3].id});
    expect(s.birds).toEqual(before.birds);expect(s.economy).toEqual(before.economy);
    s=until(s,v=>v.birds.find(b=>b.id===helper.id)!.request?.phase==="working");
    expect(s.birds.find(b=>b.id===helper.id)!.job?.destination).toBe(s.sites[2].id);
    const carer=s.birds.find(b=>!!b.care)!;expect(carer.job).toBeNull();
    // Identical urgent/normal provisioning decisions under each existing policy.
    for(const priority of ["balanced","build","provision"] as const) {
      let a=command(start,{type:"build",kind:"treehouse",at:trees[1]});
      a=command(a,{type:"priority",priority});
      // Move local stock into the consumed ledger and return any freed cargo
      // physically, yielding a valid controlled low-food/free-labor fixture.
      for(const food of ["staple","protein"] as const){a.economy.foodConsumed[food]+=a.economy.nurseries[0].food[food];a.economy.nurseries[0].food[food]=0;}
      a.birds.forEach(b=>{if(!b.care){a.piles[0].stock+=b.cargo;if(b.foodCargo)a.economy.foodConsumed[b.foodCargo]++;b.job=null;b.provision=null;b.cargo=0;b.foodCargo=null;b.edge=null;b.foraging=null;b.resting=false;b.energy=70;b.satiety=80;b.protein=80;}});
      validateSettlement(a);
      const b=command(a,{type:"focus-build",site:a.sites[2].id});
      validateSettlement(step(b));
      expect(step(b).birds.map(b=>b.provision)).toEqual(step(a).birds.map(b=>b.provision));
      expect(step(b).economy.priority).toBe(priority);
    }
    const hungry=projects();hungry.birds[0].satiety=5;
    const next=step(command(hungry,{type:"focus-build",site:hungry.sites[2].id}));
    expect(next.birds[0].foraging?.intent).toBe("eat");expect(next.birds[0].job).toBeNull();
  },30000);

  it("clears canceled focus, rejects stale targets atomically, and preserves one badge per tree",()=>{
    let s=projects(),id=s.sites[2].id;s=command(s,{type:"focus-build",site:id});
    const before=structuredClone(s);
    expect(()=>command(s,{type:"focus-build",site:"missing"})).toThrow(/unfinished project/);expect(s).toEqual(before);
    s=command(s,{type:"cancel",id});expect(s.constructionFocus).toBeNull();
    s=until(s,v=>v.sites[0].complete);const complete=s.sites[0].id;
    expect(()=>command(s,{type:"focus-build",site:complete})).toThrow(/unfinished project/);
    s=command(s,{type:"build",kind:"nursery",at:trees[0]});s=command(s,{type:"build",kind:"hauling-basket",at:trees[0]});
    const basket=s.sites.at(-1)!;expect(treeActivity(s,"lowfork")!.kind).toBe("nursery");
    s=command(s,{type:"focus-build",site:basket.id});expect(treeActivity(s,"lowfork")!.id).toBe(basket.id);
    s=command(s,{type:"build",kind:"store",at:{x:4,z:3}});s=command(s,{type:"focus-build",site:s.sites.at(-1)!.id});
    expect(constructionFocusReadout(s)?.label).toBe("Store nest at ground (4, 3)");validateSettlement(s);
  },30000);

  it("migrates strict v6 to normal order and roundtrips only live nullable current focus",()=>{
    const original=until(projects(),s=>s.birds.some(b=>b.cargo>0));
    const old=settlementV6Fixture(original);
    const migrated=decodeSettlement(JSON.stringify({schemaVersion:6,simulationVersion:"settlement-6",state:old}));
    expect(migrated.constructionFocus).toBeNull();expect(settlementV6Fixture(migrated)).toEqual(old);
    const focused=command(migrated,{type:"focus-build",site:migrated.sites[2].id});
    expect(JSON.parse(encodeSettlement(focused)).schemaVersion).toBe(8);
    expect(decodeSettlement(encodeSettlement(focused))).toEqual(focused);
    for(const invalid of [undefined,42,"missing",{}])expect(()=>validateSettlement({...focused,constructionFocus:invalid})).toThrow();
    const completed=completeTimes(original).s;
    expect(()=>validateSettlement({...completed,constructionFocus:completed.sites[0].id})).toThrow();
    // A v6 envelope must never smuggle a new field past its strict migration.
    expect(()=>decodeSettlement(JSON.stringify({schemaVersion:6,simulationVersion:"settlement-6",state:focused}))).toThrow();
  },30000);
});
