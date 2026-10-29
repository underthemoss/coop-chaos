import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { inhabitedValleyWorld } from "../content/settlement-world";
import { command, conserved, foodConserved, initialSettlement, step, type Command, type Settlement } from "../simulation/settlement";
import { decodeSettlement, encodeSettlement, loadSettlement, saveQueue, validateSettlement } from "./settlement-save";

function gatherBoundary():Settlement {
  let state=initialSettlement(inhabitedValleyWorld.identity);
  state=command(state,{type:"speed",speed:4});
  state=command(state,{type:"direct",bird:"fern",order:{kind:"gather",target:"patch-west"}});
  for(let tick=0;tick<5000;tick++){
    state=step(state);const fern=state.birds[0];
    if(fern.deliveries>=3&&fern.edge&&fern.job?.kind==="gather"&&fern.job.stage==="pickup")return state;
  }
  throw new Error("Expected a real gather pickup edge after three deliveries");
}
const replacements:Command[]=[
  {type:"build",kind:"treehouse",at:inhabitedValleyWorld.trees[0],bird:"fern"},
  {type:"direct",bird:"fern",order:{kind:"move",at:inhabitedValleyWorld.spawns[1]}},
  {type:"stop",bird:"fern"},
  {type:"community",bird:"fern"},
];
describe("saved direct intent at a safe-boundary handoff",()=>{
 it.each(replacements)("saves $type while retaining only the current pickup edge",async replacement=>{
  const before=gatherBoundary();validateSettlement(before);
  let state=command(before,replacement);
  expect(state.birds[0].direct?.pending).toBe(true);expect(state.birds[0].job).toEqual(before.birds[0].job);expect(state.birds[0].edge).toEqual(before.birds[0].edge);
  const save=saveQueue();await save(state);state=await loadSettlement();
  expect(state).toEqual(command(before,replacement));
  for(let tick=0;tick<100&&state.birds[0].direct?.pending;tick++){
    expect(conserved(state)).toBe(state.initialReeds+state.harvestedReeds);expect(foodConserved(state)).toBe(true);
    state=decodeSettlement(encodeSettlement(step(state)));
  }
  expect(state.birds[0].direct?.pending??false).toBe(false);expect(state.birds[0].job?.kind).not.toBe("gather");
  expect(conserved(state)).toBe(state.initialReeds+state.harvestedReeds);expect(foodConserved(state)).toBe(true);
  await save(state);expect(await loadSettlement()).toEqual(state);
 });
 it("still rejects an undesignated pickup without a pending real edge",()=>{
  const before=gatherBoundary(),state=command(before,{type:"stop",bird:"fern"});
  const notPending=structuredClone(state);notPending.birds[0].direct!.pending=false;
  expect(()=>validateSettlement(notPending)).toThrow();
  const noEdge=structuredClone(state);noEdge.birds[0].edge=null;
  expect(()=>validateSettlement(noEdge)).toThrow();
 });
});
