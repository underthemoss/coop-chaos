import {trees,economyTuning} from '../content/settlement';
import {describe,it,expect} from 'vitest';
import {initialSettlement,command,step,conserved,foodConserved,groupMoveOrders,route,gatherRecovery,foodRecovery,directStatus,type Settlement} from './settlement';
import {inhabitedValleyWorld,originalInhabitedValleyWorld} from '../content/settlement-world';
import {decodeSettlement,encodeSettlement,validateSettlement} from '../persistence/settlement-save';
function fresh(){const s=initialSettlement();s.economy.clock.automatic=false;return s;}
function run(s:Settlement,done:(s:Settlement)=>boolean,max=6000){for(let i=0;i<max&&!done(s);i++){s=step(s);expect(conserved(s)).toBe(s.initialReeds+s.harvestedReeds);expect(foodConserved(s)).toBe(true);validateSettlement(s);}expect(done(s)).toBe(true);return s;}
describe('saved direct commands',()=>{
 it('moves, queues finite moves, then stays awaiting orders across reload',()=>{
  let s=fresh();s=command(s,{type:'direct',bird:'fern',order:{kind:'move',at:{x:0,z:0}}});
  s=command(s,{type:'direct',bird:'fern',order:{kind:'move',at:{x:1,z:0}},queue:true});
  s=decodeSettlement(encodeSettlement(s));s=run(s,s=>!s.birds[0].direct?.order);
  expect(s.birds[0].at).toEqual({x:1,z:0});expect(s.birds[0].direct).toBeDefined();
  s=run(s,s=>s.tick>500);expect(s.birds[0].job).toBeNull();expect(s.birds[0].direct?.order).toBeNull();
 });
 it('gathers the exact patch repeatedly, retaining control after completion',()=>{
  let s=fresh();const patch=s.patches[0];
  s=command(s,{type:'direct',bird:'fern',order:{kind:'gather',target:patch.id}});
  s=command(s,{type:'direct',bird:'fern',order:{kind:'move',at:{x:0,z:0}},queue:true});
  s=run(s,s=>s.birds[0].deliveries>=2);
  expect(s.patches[0].harvested).toBeGreaterThanOrEqual(2);expect(s.patches[1].harvested).toBe(0);
  expect(s.birds[0].direct?.order?.kind).toBe('gather');expect(s.birds[0].direct?.queue).toHaveLength(1);expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
 });
 it('sustains named construction through all hauling and weaving, then remains direct',()=>{
  let s=fresh();for(const b of s.birds.slice(1))s=command(s,{type:'stop',bird:b.id});
  s=command(s,{type:'build',kind:'treehouse',at:trees[0],bird:'fern'});
  s=run(s,s=>s.sites[0].complete);
  expect(s.birds[0].deliveries).toBe(6);expect(s.birds[0].direct?.order).toBeNull();expect(s.birds[0].job).toBeNull();
 });
 it('stops at the next edge, holds cargo across cancellation/reload, then routes on explicit return',()=>{
  let s=fresh();s=command(s,{type:'build',kind:'treehouse',at:trees[0],bird:'fern'});
  s=run(s,s=>!!s.birds[0].cargo&&!!s.birds[0].edge);
  const edge=s.birds[0].edge!.to,deliveries=s.birds[0].deliveries;
  s=command(s,{type:'stop',bird:'fern'});s=run(s,s=>!s.birds[0].direct?.pending);
  expect(s.birds[0].at).toEqual(edge);expect(s.birds[0].cargo).toBe(1);expect(s.birds[0].job).toBeNull();
  s=command(s,{type:'cancel',id:s.sites[0].id});s=decodeSettlement(encodeSettlement(s));
  s=run(s,s=>s.tick>500);expect(s.birds[0].cargo).toBe(1);expect(s.birds[0].deliveries).toBe(deliveries);
  s=command(s,{type:'community',bird:'fern'});s=run(s,s=>!s.birds[0].direct);expect(s.birds[0].cargo).toBe(0);
 });
 it.each([originalInhabitedValleyWorld,inhabitedValleyWorld])('keeps world $identity.version coordinates and strict geometry with direct state',world=>{
  let s=initialSettlement(world.identity);s=command(s,{type:'stop',bird:'fern'});s=command(s,{type:'pause'});
  expect(step(s)).toBe(s);expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
  const broken=structuredClone(s);broken.birds[0].at=world.pads[0].at;expect(()=>validateSettlement(broken)).toThrow();
  const moved=structuredClone(s);moved.patches[0].at=s.birds[0].at;expect(()=>validateSettlement(moved)).toThrow();
 });
 it('rejects unavailable actors and replacements atomically and assigns deterministic group cells',()=>{
  let s=fresh();s=command(s,{type:'direct',bird:'fern',order:{kind:'move',at:{x:0,z:0}}});
  const raw=encodeSettlement(s);expect(()=>command(s,{type:'direct',bird:'fern',order:{kind:'move',at:{x:99,z:0}}})).toThrow();expect(encodeSettlement(s)).toBe(raw);
  const young=structuredClone(s);young.birds[0].life.stage='juvenile';expect(()=>command(young,{type:'stop',bird:'fern'})).toThrow(/too young/);
  const care=structuredClone(s);care.birds[0].care='brood';expect(()=>command(care,{type:'stop',bird:'fern'})).toThrow(/essential/);
  care.birds[1].life.stage='juvenile';expect([...groupMoveOrders(care,care.birds.map(b=>b.id),{x:0,z:0}).keys()]).toEqual(['dapple','wren']);
  let full=s;for(let i=0;i<16;i++)full=command(full,{type:'direct',bird:'fern',order:{kind:'move',at:{x:1,z:0}},queue:true});const accepted=encodeSettlement(full);expect(()=>command(full,{type:'direct',bird:'fern',order:{kind:'move',at:{x:0,z:0}},queue:true})).toThrow(/16/);expect(encodeSettlement(full)).toBe(accepted);
  const ids=s.birds.map(b=>b.id),a=groupMoveOrders(s,ids,{x:0,z:0}),b=groupMoveOrders(s,[...ids].reverse(),{x:0,z:0});expect(a).toEqual(b);expect(new Set([...a.values()].map(o=>o.kind==='move'?JSON.stringify(o.at):'')).size).toBe(4);
  for(const [id,o] of a)if(o.kind==='move')expect(route(s,s.birds.find(b=>b.id===id)!.at,o.at)).not.toBeNull();
 });
 it('starts a queued move after a pending safe stop, retaining it through readback',()=>{
  let s=fresh();s=command(s,{type:'direct',bird:'fern',order:{kind:'move',at:{x:0,z:0}}});
  s=run(s,s=>!!s.birds[0].edge);s=command(s,{type:'stop',bird:'fern'});
  s=command(s,{type:'direct',bird:'fern',order:{kind:'move',at:{x:1,z:0}},queue:true});
  s=decodeSettlement(encodeSettlement(s));s=run(s,s=>!s.birds[0].direct?.order);
  expect(s.birds[0].at).toEqual({x:1,z:0});
 });
 it('keeps legacy recovery requests out of direct control and preserves rejected state',()=>{
  let s=fresh();for(const b of s.birds)s=command(s,{type:'stop',bird:b.id});
  expect(gatherRecovery(s).helper).toBeNull();const raw=encodeSettlement(s);
  expect(()=>command(s,{type:'request',bird:'fern',kind:'gather',target:s.patches[0].id})).toThrow(/community work first/);
  expect(encodeSettlement(s)).toBe(raw);
 });
 it('saves each food pickup and limits returned cargo to actual nursery capacity',()=>{
  let s=fresh();s.initialReeds=s.totalReeds=s.piles[0].stock=40;
  s=command(s,{type:'build',kind:'treehouse',at:trees[0]});s=run(s,s=>s.sites[0].complete);
  s=command(s,{type:'build',kind:'nursery',at:trees[0]});s=run(s,s=>s.sites[1].complete);
  for(const b of s.birds)s=command(s,{type:'stop',bird:b.id});
  const target=s.sites[1].id,helpers=['fern','rook','dapple'];
  for(const id of helpers){
   s=command(s,{type:'direct',bird:id,order:{kind:'food',target}});
   s=run(s,s=>!!s.birds.find(b=>b.id===id)!.foodCargo);
   s=decodeSettlement(encodeSettlement(s));expect(s.birds.find(b=>b.id===id)!.direct!.foodPatch).toBeTruthy();
   expect(s.birds.find(b=>b.id===id)!.foodCargo).toBe('staple');
   s=command(s,{type:'stop',bird:id});s=run(s,s=>!s.birds.find(b=>b.id===id)!.direct!.pending);
  }
  while(s.economy.nurseries[0].food.staple<6||s.economy.nurseries[0].food.protein<6){
   s=command(s,{type:'direct',bird:'wren',order:{kind:'food',target}});
   s=run(s,s=>!s.birds.find(b=>b.id==='wren')!.direct!.order);
  }
  expect(foodRecovery(s,target).helper).toBeNull();
  const custody=encodeSettlement(s);expect(()=>command(s,{type:'brood',site:target,mother:'fern'})).toThrow(/deliver held goods/);expect(encodeSettlement(s)).toBe(custody);expect(decodeSettlement(custody)).toEqual(s);
  for(const id of helpers)s=command(s,{type:'community',bird:id});
  s=step(s);validateSettlement(s);s=decodeSettlement(encodeSettlement(s));
  const incoming=s.birds.filter(b=>b.provision?.destination===target&&b.foodCargo==='staple').length;
  expect(s.economy.nurseries[0].food.staple+incoming).toBe(economyTuning.foodCapacity);
  expect(s.birds.some(b=>b.direct?.community&&b.foodCargo&&!b.provision)).toBe(true);
  expect(foodConserved(s)).toBe(true);
 });

 it('suspends for meals and rest, then resumes its saved intended move',()=>{
  let s=fresh();s.birds[0].satiety=0;s.birds[0].energy=10;
  s=command(s,{type:'direct',bird:'fern',order:{kind:'move',at:{x:1,z:0}}});s=step(s);
  expect(s.birds[0].foraging?.intent).toBe('eat');expect(s.birds[0].direct?.order?.kind).toBe('move');
  s=decodeSettlement(encodeSettlement(s));s=run(s,s=>!s.birds[0].direct?.order);
  expect(s.birds[0].at).toEqual({x:1,z:0});expect(s.birds[0].direct).toBeDefined();
 });
 it('lowers a stopped active lift before releasing its job, retaining hungry cargo through reload',()=>{
  let s=fresh();s.initialReeds=s.totalReeds=s.piles[0].stock=40;
  for(const b of s.birds.slice(1))s=command(s,{type:'stop',bird:b.id});
  s=command(s,{type:'build',kind:'treehouse',at:trees[0],bird:'fern'});s=run(s,s=>s.sites[0].complete);
  s=command(s,{type:'build',kind:'hauling-basket',at:trees[0],bird:'fern'});s=run(s,s=>!!s.birds[0].lift&&s.birds[0].lift.progress>0);
  const before=s.birds[0].lift!.progress;s.birds[0].satiety=0;s=command(s,{type:'stop',bird:'fern'});
  s=step(s);expect(s.birds[0].lift?.progress??0).toBeLessThan(before);validateSettlement(s);s=decodeSettlement(encodeSettlement(s));
  s=run(s,s=>!s.birds[0].direct?.pending);expect(s.birds[0].cargo).toBe(1);expect(s.birds[0].job).toBeNull();
  const deliveries=s.birds[0].deliveries;s=run(s,s=>s.birds[0].foraging?.intent==='eat');expect(s.birds[0].cargo).toBe(1);expect(s.birds[0].deliveries).toBe(deliveries);
 });

 it('names overnight sleep truthfully and resumes only after morning descent',()=>{
  let s=command(fresh(),{type:'phase',phase:'evening'});s=run(s,s=>!!s.birds[0].perch);
  s=command(s,{type:'direct',bird:'fern',order:{kind:'move',at:{x:1,z:0}}});
  expect(directStatus(s,s.birds[0])).toMatch(/sleeping until morning/);s=decodeSettlement(encodeSettlement(s));
  s=command(s,{type:'phase',phase:'day'});expect(directStatus(s,s.birds[0])).toMatch(/safe ground descent/);
  s=run(s,s=>!s.birds[0].direct?.order);expect(s.birds[0].at).toEqual({x:1,z:0});
 });

});
