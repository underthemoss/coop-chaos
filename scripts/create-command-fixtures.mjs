import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
 const sim=await vite.ssrLoadModule('/src/simulation/settlement.ts');
 const {inhabitedValleyWorld:world}=await vite.ssrLoadModule('/src/content/settlement-world.ts');
 const save=await vite.ssrLoadModule('/src/persistence/settlement-save.ts');
 const out='output/direct-commands-v1';await mkdir(out,{recursive:true});
 function until(s,p,max=40000){for(let i=0;i<max&&!p(s);i++)s=sim.step(s);if(!p(s))throw new Error(`Fixture condition not reached at ${s.tick}`);save.validateSettlement(s);return s;}
 async function record(name,s){if(!s.paused)s=sim.command(s,{type:'pause'});const raw=save.encodeSettlement(s);if(JSON.stringify(save.decodeSettlement(raw))!==JSON.stringify(s))throw new Error('Roundtrip changed state');await writeFile(`${out}/${name}.json`,raw);return s;}
 let cargo=sim.initialSettlement(world.identity);cargo.economy.clock.automatic=false;
 cargo=sim.command(cargo,{type:'build',kind:'treehouse',at:world.trees[0],bird:'fern'});
 cargo=until(cargo,s=>!!s.birds[0].cargo&&!!s.birds[0].edge);
 cargo=sim.command(cargo,{type:'stop',bird:'fern'});cargo=until(cargo,s=>!s.birds[0].direct.pending);
 await record('qa-held-cargo',cargo);
 let care=sim.initialSettlement(world.identity);
 care=sim.command(care,{type:'gather',id:care.patches[0].id,designated:true});
 care=sim.command(care,{type:'build',kind:'treehouse',at:world.trees[0]});care=until(care,s=>s.sites[0].complete);
 for(const kind of ['hauling-basket','sleeping-deck','nursery']){care=sim.command(care,{type:'build',kind,at:world.trees[0]});const id=care.sites.at(-1).id;care=until(care,s=>s.sites.find(p=>p.id===id).complete);}
 const nursery=care.sites.find(s=>s.kind==='nursery');
 care=sim.command(care,{type:'priority',priority:'provision'});care=until(care,s=>s.birds.some(b=>!sim.broodReason(s,nursery.id,b.id)));
 const mother=care.birds.find(b=>!sim.broodReason(care,nursery.id,b.id));
 care=sim.command(care,{type:'brood',site:nursery.id,mother:mother.id});
 await record('qa-essential-care',care);
 care=until(care,s=>s.birds.length>4);await record('qa-young-and-care',care);
 console.log(`Generated isolated import fixtures in ${out}; carer ${mother.life.name}; no browser storage touched.`);
} finally {await vite.close();}
