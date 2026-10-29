import { describe, expect, it } from 'vitest';
import { inhabitedValleyWorld, originalInhabitedValleyWorld } from '../content/settlement-world';
import { mapPosition } from '../content/maps';
import { command, conserved, foodConserved, initialSettlement, step, route, routeMetres, growthForecast, broodReason, birdPosition } from './settlement';
import { decodeSettlement, encodeSettlement, validateSettlement } from '../persistence/settlement-save';

describe('inhabited world settlement context', () => {
  it.each([originalInhabitedValleyWorld,inhabitedValleyWorld])('reopens paused physical delivery edges in world $identity.version without reprojection', world => {
    let s=command(initialSettlement(world.identity),{type:'build',kind:'treehouse',at:world.trees[0]});
    for(let i=0;i<500&&!s.birds.some(b=>b.edge&&b.cargo);i++)s=step(s);
    expect(s.birds.some(b=>b.edge&&b.cargo)).toBe(true);
    s=command(s,{type:'pause'});
    const raw=encodeSettlement(s), reopened=decodeSettlement(raw);
    expect(reopened).toEqual(s);expect(encodeSettlement(reopened)).toBe(raw);
    expect(reopened.world).toEqual(world.identity);
    expect(step(command(reopened,{type:'pause'}))).toEqual(step(command(s,{type:'pause'})));
  });
  it('builds the earned home through physical delivery, preserving identity and both ledgers on reopen', () => {
    let s = initialSettlement(inhabitedValleyWorld.identity);
    expect(s.piles[0].stock).toBe(8);
    expect(s.birds.map(b=>b.at)).toEqual(inhabitedValleyWorld.spawns);
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    s = command(s,{type:'build',kind:'treehouse',at:inhabitedValleyWorld.trees[0]});
    expect(s.sites).toHaveLength(1);
    let carrying = false;
    for(let i=0;i<6000&&!s.sites[0].complete;i++) {
      s=step(s); carrying ||= s.birds.some(b=>b.cargo>0);
      expect(conserved(s)).toBe(s.initialReeds+s.harvestedReeds);
      expect(foodConserved(s)).toBe(true);
      if(i%50===0) validateSettlement(s);
    }
    expect(carrying).toBe(true);
    expect(s.sites[0].complete).toBe(true);
    expect(s.consumed).toBe(6);
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    const future = JSON.parse(encodeSettlement(s));future.state.world.version=99;
    expect(()=>decodeSettlement(JSON.stringify(future))).toThrow(/unavailable/);
  });
  it('reserves pad footprints from the start, permits their approach, and never remaps legacy coordinates',()=>{
    const s=initialSettlement(inhabitedValleyWorld.identity),map=inhabitedValleyWorld.map!;
    for(const pad of inhabitedValleyWorld.pads){
      expect(route(s,s.birds[0].at,pad.approach)).not.toBeNull();
      expect(route(s,s.birds[0].at,pad.at)).toBeNull();
    }
    const bird=s.birds[0];
    expect(birdPosition(bird,1,s)).toEqual(mapPosition(map,bird.at));
    const old=initialSettlement();
    expect(old.world).toBeUndefined();
    expect(JSON.parse(encodeSettlement(old)).schemaVersion).toBe(8);
    expect(decodeSettlement(encodeSettlement(old))).toEqual(old);
  });
  it('uses physical forecast travel and routes harvested stock into a reserved-pad store',()=>{
    let s=initialSettlement(inhabitedValleyWorld.identity);
    const pad=inhabitedValleyWorld.pads.find(p=>p.id==='store-east')!;
    s=command(s,{type:'build',kind:'store',at:pad.at});
    for(let i=0;i<1500&&!s.sites[0].complete;i++)s=step(s);
    expect(s.sites[0].complete).toBe(true);
    s=command(s,{type:'gather',id:s.patches[1].id,designated:true});
    let stored=false,picked=false;
    for(let i=0;i<2500&&s.sites[0].stock<8;i++){s=step(s);stored ||= s.sites[0].stock>0;if(i%50===0)validateSettlement(s);}
    expect(stored).toBe(true);
    s=command(s,{type:'gather',id:s.patches[1].id,designated:false});
    s=command(s,{type:'build',kind:'treehouse',at:inhabitedValleyWorld.trees[0]});
    for(let i=0;i<2500&&!s.sites[1].complete;i++){s=step(s);picked ||= s.birds.some(b=>b.job?.source===s.sites[0].id&&b.cargo>0);}
    expect(picked).toBe(true);expect(s.sites[1].complete).toBe(true);
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    const f=growthForecast(s), source=s.piles[0].at;
    const mean=s.forage.reduce((n,p)=>n+routeMetres(s,source,p.at),0)/s.forage.length;
    expect(f.averageTravelTicks).toBeCloseTo(mean/1.4/.1);
    expect(f.workerSupply).toBe(Math.floor(f.foodWorkers*1800/(18+f.averageTravelTicks)));
  });
  it('rejects new-world supply creation, relocated patches and untagged blocked ground birds',()=>{
    const s=initialSettlement(inhabitedValleyWorld.identity);
    const altered=structuredClone(s);altered.initialReeds=40;altered.totalReeds=40;altered.piles[0].stock=40;
    expect(()=>validateSettlement(altered)).toThrow();
    const moved=structuredClone(s);moved.patches[0].at={...s.birds[0].at};expect(()=>validateSettlement(moved)).toThrow();
    const blocked=structuredClone(s);blocked.birds[0].at={...inhabitedValleyWorld.pads[0].at};expect(()=>validateSettlement(blocked)).toThrow();
    const flight=command(s,{type:'phase',phase:'evening'});
    flight.birds[0].flight={tree:'longbough',slot:0,sheltered:false,direction:'down',progress:.2,from:{...inhabitedValleyWorld.pads[0].at}};
    expect(()=>decodeSettlement(encodeSettlement(flight))).toThrow();
    flight.birds[0].flight.from={...inhabitedValleyWorld.trees[0].work!};
    expect(decodeSettlement(encodeSettlement(flight))).toEqual(flight);
  });

  it('builds the full earned habitat and ground nursery, then supports and reopens real young',()=>{
    let s=initialSettlement(inhabitedValleyWorld.identity);
    const advanceUntil=(predicate:(state:typeof s)=>boolean,limit=16000)=>{for(let i=0;i<limit&&!predicate(s);i++){s=step(s);if(i%100===0){validateSettlement(s);expect(conserved(s)).toBe(s.totalReeds);expect(foodConserved(s)).toBe(true);}}expect(predicate(s),`timed out at ${s.tick}: ${s.sites.map(p=>p.kind+':'+p.complete).join(',')}; ${s.economy.broods[0]?.stage}; ${s.birds.map(b=>broodReason(s,s.sites.find(p=>p.kind==='nursery')?.id??'',b.id)).join(';')}`).toBe(true);};
    s=command(s,{type:'gather',id:'patch-west',designated:true});
    const tree=inhabitedValleyWorld.trees[0];
    for(const kind of ['treehouse','hauling-basket','sleeping-deck','nursery'] as const){
      s=command(s,{type:'build',kind,at:tree});const id=s.sites.at(-1)!.id;advanceUntil(s=>s.sites.find(p=>p.id===id)!.complete);
      s=decodeSettlement(encodeSettlement(s));
    }
    const nursery=s.sites.find(p=>p.kind==='nursery')!,pad=inhabitedValleyWorld.pads.find(p=>p.kind==='nursery')!;
    expect(nursery.at).toEqual(pad.at);expect(nursery.tree).toBe(tree.id);
    s=command(s,{type:'priority',priority:'provision'});
    advanceUntil(s=>s.birds.some(b=>!broodReason(s,nursery.id,b.id)),30000);
    const mother=s.birds.find(b=>!broodReason(s,nursery.id,b.id))!;
    s=command(s,{type:'brood',site:nursery.id,mother:mother.id});
    advanceUntil(s=>s.birds.length===6,30000);
    expect(s.birds.filter(b=>b.life.stage==='chick').every(b=>b.at.x===pad.approach.x&&b.at.z===pad.approach.z)).toBe(true);
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    advanceUntil(s=>s.birds.length===6&&s.birds.every(b=>b.life.stage==='adult')&&s.economy.broods[0].stage==='complete',40000);
    expect(s.economy.broods[0].stage).toBe('complete');
    expect(s.birds.slice(4).every(b=>b.life.carer&&b.life.mother&&b.life.bond>0)).toBe(true);
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    s=command(s,{type:'phase',phase:'evening'});s.economy.clock.automatic=false;
    let savedGround=false,savedAccess=false;
    for(let i=0;i<3000&&!s.birds.every(b=>b.perch);i++){
      const before=s;
      s=step(s);
      for(const previous of before.birds){
        const current=s.birds.find(b=>b.id===previous.id)!;
        if(previous.flight&&current.flight){
          const a=birdPosition(previous,1,before),b=birdPosition(current,1,s);
          expect(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)).toBeLessThanOrEqual(.140001);
        }
      }
      if(!savedGround&&s.birds.some(b=>b.edge&&!b.flight)){s=decodeSettlement(encodeSettlement(s));savedGround=true;}
      if(!savedAccess&&s.birds.some(b=>b.flight&&b.flight.progress>.4&&b.flight.progress<.8)){s=decodeSettlement(encodeSettlement(s));savedAccess=true;}
    }
    expect(savedGround).toBe(true);expect(savedAccess).toBe(true);
    expect(s.birds.every(b=>b.perch)).toBe(true);
    expect(s.birds.filter(b=>b.perch?.sheltered)).toHaveLength(4);
    s=command(s,{type:'phase',phase:'day'});s.economy.clock.automatic=false;
    advanceUntil(s=>s.birds.every(b=>!b.flight&&!b.perch),3000);
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
  });

});
