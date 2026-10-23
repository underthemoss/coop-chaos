import { describe, expect, it } from "vitest";
import frozen from "./fixtures/settlement-v7-growth.json";
import { decodeSettlement, encodeSettlement, validateSettlement } from "./settlement-save";
import { command, conserved, foodConserved, step, type Settlement } from "../simulation/settlement";

// Captured by the original settlement-7 rules at 25a99cc, before pacing changed.
// These populated histories deliberately do not depend on live tuning constants.
function source(name: keyof typeof frozen, version = 7) {
  const value = structuredClone(frozen[name]) as unknown as {schemaVersion:number;simulationVersion:string;state:Settlement};
  value.schemaVersion = version;
  value.simulationVersion = `settlement-${version}`;
  if (version < 7) delete (value.state as Partial<Settlement>).constructionFocus;
  if (version < 6) for (const bird of value.state.birds) {
    delete (bird as Partial<typeof bird>).request;
    delete (bird as Partial<typeof bird>).requestResult;
  }
  return value;
}
function migrate(value: ReturnType<typeof source>) { return decodeSettlement(JSON.stringify(value)); }
function ledger(s: Settlement) { expect(foodConserved(s)).toBe(true); expect(conserved(s)).toBe(s.totalReeds); validateSettlement(s); }

describe("stage-preserving settlement-eight growth migration", () => {
  for (const version of [5, 6, 7]) for (const name of Object.keys(frozen) as (keyof typeof frozen)[]) {
    it(`preserves every other saved fact from immutable v${version} ${name}`, () => {
      const old = source(name, version), expected = structuredClone(old.state);
      if (version < 7) expected.constructionFocus = null;
      if (version < 6) for (const bird of expected.birds) {bird.request=null;bird.requestResult=null;}
      for (const brood of expected.economy.broods) if (brood.stage === "incubating") brood.progress=Math.floor(brood.progress/3);
      for (const bird of expected.birds) if (bird.life.stage!=="adult") bird.life.development=Math.floor(bird.life.development/3);
      const migrated=migrate(old);
      expect(migrated).toEqual(expected); // Exact whitelist: only same-stage progress and older additive fields.
      expect(migrate(old)).toEqual(migrated);
      expect(decodeSettlement(encodeSettlement(migrated))).toEqual(migrated);
      expect(JSON.parse(encodeSettlement(migrated)).schemaVersion).toBe(8);
      ledger(migrated);
      if(migrated.paused) expect(step(migrated)).toEqual(migrated);
    });
  }
  for(const [name,field,ends] of [
    ["incubating","progress",[[0,0],[7199,2399]]],
    ["chick","development",[[0,0],[7199,2399]]],
    ["juvenile","development",[[7200,2400],[14399,4799]]],
  ] as const) for(const [oldProgress,newProgress] of ends) {
    it(`maps ${name} endpoint ${oldProgress} without crossing a stage`,()=>{
      const old=source(name);old.state.tick+=10000;old.state.economy.broods[0].careTicks+=10000;
      for(const child of old.state.birds.filter(b=>b.life.mother)){child.life.age+=10000;child.life.bond=Math.min(child.life.bond,oldProgress);if(field==="development")child.life.development=oldProgress;}
      if(field==="progress")old.state.economy.broods[0].progress=oldProgress;
      const s=migrate(old);expect(s.birds.map(b=>[b.id,b.life.stage])).toEqual(old.state.birds.map(b=>[b.id,b.life.stage]));
      expect(field==="progress"?s.economy.broods[0].progress:s.birds.find(b=>b.life.mother)!.life.development).toBe(newProgress);ledger(s);
    });
  }
  it("validates immutable legacy stage, bond and historical hatch bounds before mapping",()=>{
    for(const version of [5,6,7]) {
      const incubation=source("incubating",version);incubation.state.tick+=10000;incubation.state.economy.broods[0].careTicks+=10000;incubation.state.economy.broods[0].progress=7200;expect(()=>migrate(incubation)).toThrow();
      for(const [name,invalid] of [["chick",7200],["juvenile",7199],["juvenile",14400]] as const){const old=source(name,version);const child=old.state.birds.find(b=>b.life.mother)!;old.state.tick+=10000;for(const b of old.state.birds.filter(b=>b.life.mother))b.life.age+=10000;child.life.development=invalid;expect(()=>migrate(old)).toThrow();}
      const bond=source("chick",version);bond.state.birds.find(b=>b.life.mother)!.life.bond=4001;expect(()=>migrate(bond)).toThrow();
      const hatch=source("chick",version);for(const egg of hatch.state.economy.broods[0].eggs)egg.hatchTick!-=5000;for(const b of hatch.state.birds.filter(b=>b.life.mother))b.life.age+=5000;expect(()=>migrate(hatch)).toThrow();
    }
  });
  it("keeps actual care/bond history distinct from compressed progress, with strict v8 bounds",()=>{
    const s=migrate(source("chick")), child=s.birds.find(b=>b.life.mother)!;
    expect(child.life).toMatchObject({age:4000,bond:4000,development:1333});
    const tooOld=structuredClone(s);tooOld.birds.find(b=>b.id===child.id)!.life.bond=4001;expect(()=>validateSettlement(tooOld)).toThrow();
    const tooMuchCare=migrate(source("juvenile")),grown=tooMuchCare.birds.find(b=>b.life.mother)!;
    tooMuchCare.tick+=5000;for(const b of tooMuchCare.birds.filter(b=>b.life.mother))b.life.age+=5000;
    validateSettlement(tooMuchCare);
    grown.life.bond=tooMuchCare.economy.broods[0].careTicks+1;expect(()=>validateSettlement(tooMuchCare)).toThrow();
    const original=structuredClone(s);original.birds[0].life.bond=1;expect(()=>validateSettlement(original)).toThrow();
  });
  it("imports paused shortage and cargo without growth, then conserves recovery after reopening food",()=>{
    let s=migrate(source("pausedShortageCargo"));const start=structuredClone(s),development=s.birds.filter(b=>b.life.mother).map(b=>b.life.development);
    expect(s.paused).toBe(true);expect(s.constructionFocus).toBe("site-6");expect(s.birds.some(b=>b.cargo&&b.job)).toBe(true);
    s=decodeSettlement(encodeSettlement(step(s)));expect(s).toEqual(start);
    s=command(s,{type:"pause"});for(let i=0;i<500;i++)s=step(s);
    expect(s.birds.filter(b=>b.life.mother).map(b=>b.life.development)).toEqual(development);ledger(s);
    for(const patch of s.forage)s=command(s,{type:"forage",id:patch.id,open:true});s=command(s,{type:"priority",priority:"provision"});
    for(let i=0;i<2400;i++)s=step(s);
    expect(s.birds.filter(b=>b.life.mother).some(b=>b.life.development>development[0])).toBe(true);ledger(s);expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
  });
  it("does not hatch on import and hatches each saved egg once on the next qualified tick",()=>{
    const old=source("incubating");old.state.tick+=10000;old.state.economy.broods[0].careTicks+=10000;old.state.economy.broods[0].progress=7199;
    let s=migrate(old);expect(s.birds).toHaveLength(4);expect(s.economy.broods[0].progress).toBe(2399);
    s=step(s);expect(s.birds).toHaveLength(6);ledger(s);
    const ids=s.birds.map(b=>b.id);s=step(decodeSettlement(encodeSettlement(s)));expect(s.birds.map(b=>b.id)).toEqual(ids);ledger(s);
  });
  it("keeps a saved juvenile juvenile until the next healthy tick, then matures once",()=>{
    const old=source("juvenile");old.state.tick+=10000;
    for(const child of old.state.birds.filter(b=>b.life.mother)){child.life.age+=10000;child.life.development=14399;child.satiety=80;child.protein=80;}
    let s=migrate(old);expect(s.birds.slice(4).every(b=>b.life.stage==="juvenile"&&b.life.development===4799)).toBe(true);
    s=step(s);expect(s.birds.slice(4).every(b=>b.life.stage==="adult"&&b.life.development===4800)).toBe(true);ledger(s);
    const memories=s.birds.slice(4).map(b=>b.memories.filter(m=>m.includes("Grew into community work")));
    s=step(decodeSettlement(encodeSettlement(s)));expect(s.birds.slice(4).map(b=>b.memories.filter(m=>m.includes("Grew into community work")))).toEqual(memories);ledger(s);
  });
});
