import { describe, it, expect } from "vitest";
import {
  initialSettlement, command, step, broodReason, broodStatus,
  growthForecast, foodConserved, conserved, populationReadout, nurseryReadout, treeActivity, foodRecovery,
} from "./settlement";
import type { Settlement } from "./settlement";
import { economyTuning, trees } from "../content/settlement";
import { encodeSettlement, decodeSettlement, validateSettlement } from "../persistence/settlement-save";

function advance(s: Settlement, ticks: number) {
  for (let i = 0; i < ticks; i++) {
    s = step(s);
    if (i % 100 === 0) {
      expect(foodConserved(s)).toBe(true);
      expect(conserved(s)).toBe(s.totalReeds);
      validateSettlement(s);
    }
  }
  return s;
}
function until(s: Settlement, predicate: (s: Settlement) => boolean, limit = 12000) {
  for (let i = 0; i < limit && !predicate(s); i++) s = advance(s, 1);
  expect(predicate(s), `Timed out at tick ${s.tick}: ${broodStatusIfPresent(s)}`).toBe(true);
  return s;
}
function broodStatusIfPresent(s: Settlement) {
  return s.economy.broods[0] ? broodStatus(s, s.economy.broods[0]) : "no brood";
}
function opening() {
  let s = command(initialSettlement(), { type: "gather", id: "patch-west", designated: true });
  s = command(s, { type: "build", kind: "treehouse", at: trees[0] });
  s = until(s, s => s.sites[0].complete);
  s = command(s, { type: "build", kind: "nursery", at: trees[0] });
  s = until(s, s => s.sites[1].complete);
  s = command(s, { type: "priority", priority: "provision" });
  return until(s, s => s.birds.some(b => !broodReason(s, s.sites[1].id, b.id)));
}
function support(s = opening()) {
  const mother = s.birds.find(b => !broodReason(s, s.sites[1].id, b.id))!;
  return command(s, { type: "brood", site: s.sites[1].id, mother: mother.id });
}
function drainNursery(s: Settlement) {
  s = structuredClone(s);
  for (const food of ["staple", "protein"] as const) {
    s.economy.foodConsumed[food] += s.economy.nurseries[0].food[food];
    s.economy.nurseries[0].food[food] = 0;
  }
  return s;
}

describe("bounded economic population", () => {
  it("builds and provisions a fresh community, then grows durable named workers through real care", () => {
    let s = opening();
    expect(s.tick).toBe(1699);
    expect(s.economy.clock.automatic).toBe(true);
    expect(s.sites.filter(site => site.complete)).toHaveLength(2);
    expect(s.consumed).toBe(10);
    s = support(s);
    const mother = s.birds.find(b => b.care)!;
    expect(mother.job).toBeNull();
    expect(growthForecast(s)).toMatchObject({ carers: 1, foodWorkers: 3, committed: 6 });
    expect(populationReadout(s)).toMatchObject({label:"4 adults · 2 expected",chicks:0,juveniles:0,committed:6});
    expect(nurseryReadout(s,s.sites[1].id).stage).toBe("Preparing · 0/2 eggs laid");
    expect(nurseryReadout(s,s.sites[1].id).progress).toBe(0);
    s = until(s, s => s.economy.broods[0].eggs.length === 2);
    const eggIds = s.economy.broods[0].eggs.map(e => e.id);
    expect(new Set(eggIds).size).toBe(2);
    s = decodeSettlement(encodeSettlement(s));
    s = until(s, s => s.birds.length === 6, 20000);
    expect(s.tick).toBe(9321);
    const hatch = structuredClone(s);
    expect(populationReadout(s)).toMatchObject({label:"4 adults · 2 chicks",pending:0,committed:6});
    expect(nurseryReadout(s,s.sites[1].id)).toMatchObject({title:"Chicks growing",progress:0});
    expect(s.birds.slice(4).map(b => b.life.name)).toEqual(["Pip", "Clover"]);
    for (const child of s.birds.slice(4)) {
      expect(child.life).toMatchObject({ stage: "chick", development: 0, mother: mother.id, father: "rook", carer: mother.id, bornAt: "lowfork" });
      expect(child.flight).toBeNull();
      expect(child.job).toBeNull();
    }
    s = decodeSettlement(encodeSettlement(s));
    s = advance(s, economyTuning.juvenileTicks);
    expect(s.birds.slice(4).every(b => b.life.stage === "juvenile" && b.life.development === 7200 && !b.flight && !b.perch)).toBe(true);
    expect(s.birds.slice(4).every(b => b.attachment === "lowfork" && b.life.bond === 7200)).toBe(true);
    expect(s.birds.find(b => b.id === mother.id)!.care).toBeNull();
    expect(populationReadout(s)).toMatchObject({label:"4 adults · 2 juveniles",pending:0,committed:6});
    expect(nurseryReadout(s,s.sites[1].id)).toMatchObject({title:"Juveniles growing",carer:null,progress:50,progressLabel:"Growth toward adulthood"});
    s = decodeSettlement(encodeSettlement(s));
    s = until(s, s => s.birds.every(b => b.life.stage === "adult"), 20000);
    s = advance(s, 1);
    expect(s.tick).toBe(23722);
    expect(s.economy.broods[0].stage).toBe("complete");
    expect(populationReadout(s)).toMatchObject({label:"6 adults",pending:0,committed:6});
    expect(nurseryReadout(s,s.sites[1].id)).toMatchObject({title:"Young grown",progress:100,carer:null});
    expect(s.economy.broods[0].eggs.map(e => e.child)).toEqual(hatch.economy.broods[0].eggs.map(e => e.child));
    expect(s.birds).toHaveLength(6);
    expect(s.birds.slice(4).every(b => b.memories.some(m => m.includes("Grew into community work")))).toBe(true);
    expect(s.patches[0].harvested).toBeGreaterThan(s.patches[0].capacity);
    expect(foodConserved(s)).toBe(true);
  }, 30000);

  it("projects actual care arrival, pause, shortage and completion before a brood starts again", () => {
    let s=support();
    const site=s.sites[1].id;
    const mother=s.birds.find(b=>b.care)!;
    expect(treeActivity(s,"lowfork")!.id).toBe(site);
    expect(nurseryReadout(s,site).title).toBe("Carer arriving");
    const paused=command(s,{type:"pause"});
    expect(nurseryReadout(paused,site)).toMatchObject({title:"Care paused",progress:0});
    expect(nurseryReadout(decodeSettlement(encodeSettlement(paused)),site)).toEqual(nurseryReadout(paused,site));
    s=until(s,s=>s.economy.broods[0].careTicks>0);
    expect(nurseryReadout(s,site).title).toBe("Preparing");
    const hungry=structuredClone(s);
    hungry.birds.find(b=>b.id===mother.id)!.satiety=5;
    const eating=step(hungry);
    expect(eating.birds.find(b=>b.id===mother.id)!.foraging?.intent).toBe("eat");
    expect(nurseryReadout(eating,site)).toMatchObject({title:"Carer needs a meal",stalled:true});
    expect(nurseryReadout(eating,site).status).toContain("Foraging for a meal");
    expect(nurseryReadout(command(eating,{type:"pause"}),site).title).toBe("Care paused");
    const empty=drainNursery(s);
    expect(nurseryReadout(empty,site)).toMatchObject({title:"Needs food",stalled:true});
    expect(nurseryReadout(empty,site).status).toContain("No local Seeds or Bugs");
    expect(nurseryReadout(empty,site).carer!.id).toBe(mother.id);
    const proteinStall=structuredClone(s);
    proteinStall.economy.nurseries[0].food={staple:1,protein:0};
    proteinStall.forage.forEach(p=>p.open=false);
    expect(foodRecovery(proteinStall,site).openPatch).toBe("leaf-litter");
    const improvement=command(s,{type:"build",kind:"hauling-basket",at:trees[0]});
    expect(treeActivity(improvement,"lowfork")!.kind).toBe("hauling-basket");
    expect(treeActivity(improvement,"lowfork")!.complete).toBe(false);
    const unavailable=opening();
    expect(broodReason(unavailable,site,"rook")).toContain("adult hen");
  },30000);

  it("routes a named helper request to the chosen local nursery without replacing care or requests", () => {
    let s=opening();
    s=command(s,{type:"build",kind:"treehouse",at:trees[1]});
    s=until(s,s=>s.sites.at(-1)!.complete);
    s=command(s,{type:"build",kind:"nursery",at:trees[1]});
    s=until(s,s=>s.sites.at(-1)!.complete);
    const local=s.sites.at(-1)!.id;
    const recovery=foodRecovery(s,local);
    expect(recovery.helper).not.toBeNull();
    const before=structuredClone(s);
    expect(foodRecovery(s,local)).toEqual(recovery);
    expect(s).toEqual(before);
    s=command(s,{type:"request",bird:recovery.helper!.id,kind:"food",target:local});
    expect(s.birds.find(b=>b.id===recovery.helper!.id)!.request!.target).toBe(local);
    expect(()=>command(s,{type:"request",bird:recovery.helper!.id,kind:"food",target:local})).toThrow("Finish or cancel");
    expect(foodRecovery(s,local).helper?.id).not.toBe(recovery.helper!.id);
    s=until(s,s=>s.birds.find(b=>b.id===recovery.helper!.id)!.requestResult?.outcome==="done");
    expect(s.birds.find(b=>b.id===recovery.helper!.id)!.memories.at(-1)).toContain(trees[1].name);
    expect(foodConserved(s)).toBe(true);
    const closed=structuredClone(s);
    closed.forage.forEach(p=>p.open=false);
    expect(foodRecovery(closed,local)).toMatchObject({helper:null});
    expect(foodRecovery(closed,local).reason).toContain("closed");
  },30000);

  it("saves and replays ongoing incubation without duplicating eggs or chicks", () => {
    let s = support();
    s = until(s, s => s.economy.broods[0].stage === "incubating");
    const restored = decodeSettlement(encodeSettlement(s));
    const a = advance(s, 7600);
    const b = advance(restored, 7600);
    expect(b).toEqual(a);
    expect(a.birds).toHaveLength(6);
    expect(new Set(a.economy.broods[0].eggs.map(e => e.child)).size).toBe(2);
    expect(() => command(a, { type: "brood", site: a.sites[1].id, mother: "fern" })).toThrow("current brood");
  });

  it("secures carried food after a habitat closes, through hunger, priority changes and evening", () => {
    let s = opening();
    s = support(s);
    s = until(s, s => s.birds.some(b => b.foodCargo));
    const carrier = s.birds.find(b => b.foodCargo)!;
    const food = carrier.foodCargo!;
    const delivered = carrier.deliveries;
    s = command(s, { type: "forage", id: carrier.provision!.patch, open: false });
    s = command(s, { type: "priority", priority: "build" });
    s.birds.find(b => b.id === carrier.id)!.satiety = 0;
    s.birds.find(b => b.id === carrier.id)!.protein = 0;
    s = command(s, { type: "phase", phase: "evening" });
    s = decodeSettlement(encodeSettlement(s));
    s = until(s, s => !s.birds.find(b => b.id === carrier.id)!.foodCargo, 400);
    expect(s.birds.find(b => b.id === carrier.id)!.deliveries).toBeGreaterThan(delivered);
    expect(s.economy.nurseries[0].food[food] + s.economy.foodConsumed[food]).toBeGreaterThan(0);
    expect(foodConserved(s)).toBe(true);
  });

  it("reconciles mixed-food reservations after pickups and bites so every tick survives reload", () => {
    let s=command(initialSettlement(),{type:"gather",id:"patch-west",designated:true});
    s=command(s,{type:"build",kind:"treehouse",at:trees[0]});
    s=until(s,s=>s.sites[0].complete);
    s=command(s,{type:"build",kind:"nursery",at:trees[0]});
    s=until(s,s=>s.sites[1].complete);
    s=command(s,{type:"priority",priority:"provision"});
    s=command(s,{type:"forage",id:"leaf-litter",open:false});
    for(let i=0;i<3000;i++) {
      s=advance(s,1);
      if(i%100===0)expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    }
    expect(foodConserved(s)).toBe(true);
    expect(s.economy.nurseries[0].food.staple).toBeLessThanOrEqual(8);
  });

  it("continues supplied care at night and pauses it for a local shortage without inventing food", () => {
    let s = support();
    s = until(s, s => s.economy.broods[0].stage === "incubating");
    s = command(s, { type: "phase", phase: "evening" });
    const consumed = s.economy.foodConsumed.protein;
    const progress = s.economy.broods[0].progress;
    s = advance(s, 200);
    expect(s.economy.broods[0].progress).toBe(progress + 200);
    expect(s.economy.foodConsumed.protein).toBeGreaterThan(consumed);
    s = drainNursery(s);
    // Resting the food places cancels uncollected tasks; an already carried unit
    // still arrives honestly. Wait until those deliveries have been consumed.
    for (const patch of s.forage) s = command(s, { type: "forage", id: patch.id, open: false });
    s = advance(s, 500);
    const paused = s.economy.broods[0].progress;
    const shortages = s.economy.broods[0].shortageTicks;
    s = advance(s, 100);
    expect(s.economy.broods[0].progress).toBe(paused);
    expect(s.economy.broods[0].shortageTicks).toBeGreaterThan(shortages);
    expect(nurseryReadout(s,s.sites[1].id)).toMatchObject({title:"Needs food",stalled:true});
    expect(foodConserved(s)).toBe(true);
  });

  it("allocates competing construction and food differently under all three policies while protecting brood care", () => {
    const ready = support();
    const results = (["build", "balanced", "provision"] as const).map(priority => {
      let s = command(ready, { type: "priority", priority });
      for (const tree of trees.slice(1)) s = command(s, { type: "build", kind: "treehouse", at: tree });
      s = advance(s, 1200);
      expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
      return {
        delivered: s.sites.filter(site => !site.complete).reduce((n, site) => n + site.delivered, 0),
        food: s.economy.nurseries[0].food.staple + s.economy.nurseries[0].food.protein,
        care: s.economy.broods[0].careTicks,
        shortages: s.economy.broods[0].shortageTicks,
      };
    });
    const [build, balanced, provision] = results;
    expect(build.delivered).toBeGreaterThan(balanced.delivered);
    expect(balanced.delivered).toBeGreaterThan(provision.delivered);
    expect(provision.food).toBeGreaterThan(balanced.food);
    expect(balanced.food).toBeGreaterThan(build.food);
    // The emergency floor takes precedence even for Build: the accepted brood
    // receives the same care through this contention, rather than being abandoned.
    expect(new Set(results.map(r => r.care)).size).toBe(1);
    expect(new Set(results.map(r => r.shortages)).size).toBe(1);
    expect(build.care).toBeGreaterThan(1000);
  });

  it("exposes a recoverable protein bottleneck under Build priority and supply neglect", () => {
    let s = command(support(), { type: "priority", priority: "build" });
    s = command(s, { type: "build", kind: "treehouse", at: trees[1] });
    s = command(s, { type: "build", kind: "treehouse", at: trees[2] });
    s = advance(s, 2400);
    expect(s.economy.broods[0].shortageTicks).toBe(181);
    for (const id of ["leaf-litter", "insect-verge"]) s = command(s, { type: "forage", id, open: false });
    s = advance(s, 2400);
    expect(s.economy.nurseries[0].food).toEqual({ staple: 6, protein: 0 });
    expect(broodStatusIfPresent(s)).toContain("local Bugs");
    const stalled = s.economy.broods[0].progress;
    for (const id of ["leaf-litter", "insect-verge"]) s = command(s, { type: "forage", id, open: true });
    s = command(s, { type: "priority", priority: "provision" });
    s = advance(s, 2400);
    expect(s.economy.broods[0].progress - stalled).toBe(1428);
    expect(s.economy.nurseries[0].food).toEqual({ staple: 6, protein: 6 });
  });

  it("uses a second provisioned tree to add housing and shorten food access without duplicating habitat yield", () => {
    let s = opening();
    const before = growthForecast(s);
    s = until(s, s => s.phase === "day");
    s = command(s, { type: "priority", priority: "build" });
    s = command(s, { type: "build", kind: "treehouse", at: trees[2] });
    s = until(s, s => s.sites.some(t => t.tree === "reedside" && t.kind === "treehouse" && t.complete));
    s = until(s, s => s.phase === "day");
    s = command(s, { type: "build", kind: "nursery", at: trees[2] });
    s = until(s, s => s.economy.nurseries.length === 2);
    s = command(s, { type: "priority", priority: "provision" });
    s = until(s, s => s.economy.nurseries[1].food.staple >= 2 && s.economy.nurseries[1].food.protein >= 2);
    const after = growthForecast(s);
    expect(after.capacity - before.capacity).toBe(2);
    expect(after.averageDistance).toBeLessThan(before.averageDistance);
    expect(after.workerSupply).toBeGreaterThan(before.workerSupply);
    expect(after.habitatSupply).toBe(before.habitatSupply);
  });

  it("keeps protein and staple forecasts separate and lets food bind before the maximum housing", () => {
    let s = opening();
    const hen = s.birds.find(b => !broodReason(s, s.sites[1].id, b.id))!;
    s = command(s, { type: "forage", id: "leaf-litter", open: false });
    s = command(s, { type: "forage", id: "insect-verge", open: false });
    expect(broodReason(s, s.sites[1].id, hen.id)).toContain("Protein food forecast");
    expect(growthForecast(s).proteinSupply).toBe(0);
    s = opening();
    const template = s.birds[0];
    for (let i = 0; i < 10; i++) s.birds.push({ ...structuredClone(template), id: `forecast-${i}`, life: { ...structuredClone(template.life), name: `Forecast ${i}` } });
    // Maximum built capacity is 18. A hypothetical fully housed population of
    // fourteen still cannot start another brood from the three shared habitats.
    for (const tree of trees) for (const kind of ["treehouse", "sleeping-deck"] as const) {
      if (!s.sites.some(site => site.tree === tree.id && site.kind === kind)) s.sites.push({ ...structuredClone(s.sites[0]), id: `forecast-${tree.id}-${kind}`, tree: tree.id, at: { x: tree.x, z: tree.z }, kind });
    }
    expect(growthForecast(s)).toMatchObject({ committed: 14, capacity: 18, spare: 4 });
    expect(broodReason(s, s.sites[1].id, "fern")).toContain("Staple food forecast");
  });

  it("seeks protein even when already calorie-satiated", () => {
    let s=initialSettlement();
    const bird=s.birds[0];
    bird.satiety=100;bird.protein=0;
    s=until(s,s=>s.birds[0].protein>=economyTuning.proteinMinimum,1000);
    expect(s.forage.find(p=>p.id==="leaf-litter")!.proteinEaten+s.forage.find(p=>p.id==="insect-verge")!.proteinEaten).toBeGreaterThan(0);
    expect(s.birds[0].satiety).toBeGreaterThan(60);
  });

  it("does not award age, recovery or care through phase commands, speed changes, pause or reload", () => {
    let s = support();
    const before = { tick: s.tick, age: s.birds[0].life.age, reeds: s.patches.map(p => p.regrown), food: s.forage.map(p => p.regrown), care: s.economy.broods[0].careTicks };
    s = command(s, { type: "phase", phase: "evening" });
    s = command(s, { type: "phase", phase: "day" });
    s = command(s, { type: "speed", speed: 4 });
    s = command(s, { type: "pause" });
    s = decodeSettlement(encodeSettlement(s));
    s = advance(s, 1000);
    expect({ tick: s.tick, age: s.birds[0].life.age, reeds: s.patches.map(p => p.regrown), food: s.forage.map(p => p.regrown), care: s.economy.broods[0].careTicks }).toEqual(before);
    expect(s.economy.clock.speed).toBe(4);
    s = command(s, { type: "pause" });
    s = advance(s, 2400);
    expect(s.tick).toBe(before.tick + 2400);
    expect(s.economy.clock.day).toBe(2);
  });
});
