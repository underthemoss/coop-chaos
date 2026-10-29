import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { command, initialSettlement, step, type Settlement, type Worker } from "../simulation/settlement";
import { loadSettlement, saveQueue, encodeSettlement } from "../persistence/settlement-save";
import { trees } from "../content/settlement";
import { actorBlock, awaitingOrderBirds, commandShortcut, recallGroup, targetEligibility } from "./command-ui";
import { BirdInspector } from "./BirdInspector";
import { CommandDock } from "./CommandDock";
import { Clearing } from "../game/Clearing";
const noop=()=>{};
const focus={gameFocused:true,editing:false,control:false,meta:false,alt:false,shift:false};
function stopped(){let state=initialSettlement();state.economy.clock.automatic=false;for(const bird of state.birds)state=command(state,{type:"stop",bird:bird.id});return state;}
function dock(state:Settlement,ids:string[]){return renderToStaticMarkup(<CommandDock state={state} ids={ids} targeting={null} queue={false} disabled={false} onTarget={noop} onStop={noop} onCommunity={noop} onBuild={noop} onQueue={noop} onDetails={noop} onClear={noop} onCancel={noop}/>);}
describe("command presentation contract",()=>{
 it("reports each mixed actor and uses the owner's target validation without mutation",()=>{
  const state=initialSettlement(),ids=state.birds.map(b=>b.id);state.birds[1].care="brood";state.birds[2].life.stage="juvenile";
  const before=structuredClone(state),order={kind:"gather" as const,target:state.patches[0].id};
  const actors=targetEligibility(state,ids,order);
  expect(actors.map(a=>a.eligible)).toEqual([true,false,false,true]);expect(actors[1].reason).toMatch(/care/);expect(actors[2].reason).toMatch(/young/);expect(state).toEqual(before);
  state.patches[0].remaining=0;expect(targetEligibility(state,[ids[0]],order)[0].reason).toMatch(/depleted|reed|harvest/i);
  expect(actorBlock(state.birds[0])).toBe("");
 });
 it("selects awaiting orders from structured work state and excludes every active obligation",()=>{
  const state=stopped();expect(awaitingOrderBirds(state).map(b=>b.id)).toEqual(state.birds.map(b=>b.id));
  const patches:Partial<Worker>[]=[{care:"brood"},{resting:true},{energy:27},{cargo:1},{foodCargo:"staple"},{edge:{to:{x:0,z:0},progress:0}},{flight:{}} as Partial<Worker>,{perch:{}} as Partial<Worker>,{lift:{basket:"basket",progress:0}},{job:{}} as Partial<Worker>,{provision:{}} as Partial<Worker>,{request:{}} as Partial<Worker>,{foraging:{}} as Partial<Worker>];
  for(const patch of patches){const copy=structuredClone(state);Object.assign(copy.birds[0],patch);expect(awaitingOrderBirds(copy).map(b=>b.id)).not.toContain(copy.birds[0].id);}
  for(const direct of [{pending:true},{community:true},{queue:[{kind:"move",at:{x:0,z:0}}]},{order:{kind:"move",at:{x:0,z:0}}}]){const copy=structuredClone(state);Object.assign(copy.birds[0].direct!,direct);expect(awaitingOrderBirds(copy).map(b=>b.id)).not.toContain(copy.birds[0].id);}
  const evening=structuredClone(state);evening.phase="evening";expect(awaitingOrderBirds(evening)).toEqual([]);
  const community=initialSettlement();expect(awaitingOrderBirds(community)).toEqual([]);
 });
 it("keeps gameplay shortcuts within the game and preserves text and browser controls",()=>{
  for(const [key,action] of [["m","move"],["G","gather"],["b","building"],["s","stop"],["i","awaiting"],["Escape","cancel"]])expect(commandShortcut(key,focus)).toBe(action);
  expect(commandShortcut("1",focus)).toEqual({group:1,assign:false});expect(commandShortcut("9",{...focus,shift:true})).toEqual({group:9,assign:true});
  for(const context of [{gameFocused:false},{editing:true},{control:true},{meta:true},{alt:true}])for(const key of ["m","i","1","Escape"])expect(commandShortcut(key,{...focus,...context})).toBeNull();
  expect(commandShortcut("!",{...focus,shift:true},"Digit1")).toEqual({group:1,assign:true});
  expect(commandShortcut("F1",focus)).toBeNull();expect(commandShortcut("g",{...focus,shift:true})).toBeNull();
 });
 it("recalls only living session members without changing selection storage or saved game",()=>{
  const state=initialSettlement(),group=[state.birds[0].id,"departed",state.birds[1].id],raw=encodeSettlement(state);
  expect(recallGroup(group,state)).toEqual([state.birds[0].id,state.birds[1].id]);expect(group).toContain("departed");expect(encodeSettlement(state)).toBe(raw);expect(raw).not.toContain("controlGroups");
 });
 it("shows individual names and actual statuses while requiring an explicit single builder",()=>{
  const state=stopped();state.birds[1].life.stage="juvenile";
  const html=dock(state,[state.birds[0].id,state.birds[1].id]);
  expect(html).toContain("2 chickens selected");expect(html).toContain("1/2 eligible adults");expect(html).toContain(state.birds[0].life.name);expect(html).toContain(state.birds[1].life.name);expect(html).toContain("Too young");expect(html).toContain("Select one builder");expect(html).toMatch(/disabled=""[^>]*title="Select one builder"/);
  expect(dock(state,[state.birds[0].id])).toContain(`${state.birds[0].life.name} will build`);
 });
 it("retains a named command through save, readback, rendered status and a second reopen",async()=>{
  let state=stopped();state=command(state,{type:"direct",bird:"fern",order:{kind:"move",at:{x:0,z:0}}});
  const save=saveQueue();await save(state);state=await loadSettlement();expect(dock(state,["fern"])).toContain("Move to 0, 0 · walking");
  for(let tick=0;tick<2000&&state.birds[0].direct?.order;tick++)state=step(state);
  await save(state);const reopened=await loadSettlement();expect(reopened.birds[0].at).toEqual({x:0,z:0});expect(awaitingOrderBirds(reopened).map(b=>b.id)).toContain("fern");expect(dock(reopened,["fern"])).toContain("Awaiting orders");
 });
 it("keeps Bring food available in named Details for an adult already in direct control",()=>{
  let state=initialSettlement();state.economy.clock.automatic=false;state.initialReeds=state.totalReeds=state.piles[0].stock=40;
  for(const kind of ["treehouse","nursery"] as const){state=command(state,{type:"build",kind,at:trees[0]});for(let tick=0;tick<6000&&!state.sites.at(-1)!.complete;tick++)state=step(state);expect(state.sites.at(-1)!.complete).toBe(true);}
  state=command(state,{type:"stop",bird:"fern"});
  const html=renderToStaticMarkup(<BirdInspector state={state} bird={state.birds[0]} disabled={false} onCommand={noop} onChooseFree={noop}/>);
  expect(html).toContain("Bring food · one trip");expect(html).toContain("Fern actions");
 });
 it("makes every unfinished project accessible even when two share one tree",()=>{
  let state=initialSettlement();state.economy.clock.automatic=false;state=command(state,{type:"build",kind:"treehouse",at:trees[0]});
  for(let tick=0;tick<5000&&!state.sites[0].complete;tick++)state=step(state);
  expect(state.sites[0].complete).toBe(true);
  state=command(state,{type:"build",kind:"nursery",at:trees[0]});state=command(state,{type:"build",kind:"hauling-basket",at:trees[0]});
  expect(state.sites).toHaveLength(3);
  const html=renderToStaticMarkup(<Clearing state={state} selected="fern" selectedIds={["fern"]} onGroup={noop} onContext={noop} onOrder={noop} targeting="build" onTargetMiss={noop} onSelect={noop} onPick={noop} onTree={noop} onNursery={noop} onProject={noop} onForage={noop} cursor={{x:0,z:0}} highlight={false} tool="inspect" onCursor={noop} homePlacement={false} placementKind={null} selectedPatch={null} onPatch={noop} nurseryFocused={false}/>);
  expect(html).toContain("Hauling basket ·");expect(html).toContain("Nursery for chicks ·");expect(html.match(/1\/1 eligible/g)).toHaveLength(2);expect(html).not.toContain("Select Fern in landscape");
 });
});
