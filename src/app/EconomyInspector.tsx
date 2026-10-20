import { ActionArt } from "./ActionArt";
import type { ReactNode } from "react";
import { economyTuning, trees } from "../content/settlement";
import { broodReason, broodStatus, growthForecast, type Command, type Settlement } from "../simulation/settlement";
const plain=(text:string)=>text.replace(/staple/gi,"Seeds").replace(/protein/gi,"Bugs").replace(/berths/gi,"sleeping places").replace(/choose Provision/gi,"choose Food first");
export function EconomyInspector({state,disabled,onCommand,onBuild,onSelectBird,children}:{state:Settlement;disabled:boolean;onCommand:(command:Command)=>void;onBuild:()=>void;onSelectBird:(id:string)=>void;children:ReactNode}) {
  const forecast=growthForecast(state), careEach=Math.ceil(forecast.careDemand/2);
  return <section className="economy-inspector" aria-label="Food for chicks">
    <div className="illustrated-heading"><ActionArt kind="nursery"/><div><span className="eyebrow">GROWING A COMMUNITY</span><h2>Food for chicks</h2></div></div>
    {!state.economy.nurseries.length&&<><p>Eggs need a warm nursery and a caring hen. Build a home, then a nursery.</p><button className="build-command" onClick={onBuild}>Choose a tree to build</button></>}
    {state.economy.nurseries.map(n=>{
      const site=state.sites.find(s=>s.id===n.site)!, tree=trees.find(t=>t.id===site.tree)!;
      const brood=state.economy.broods.find(b=>b.id===n.brood);
      const shortage=n.food.staple<2||n.food.protein<2;
      return <article className="nursery-card" key={n.site} aria-label={`${tree.name} nursery`}>
        <h3>{tree.name} nursery</h3><p className="local-food"><strong>{n.food.staple} Seeds · {n.food.protein} Bugs</strong> here</p>
        {shortage&&<p>Needs {n.food.staple<2?"Seeds":"Bugs"}. Ask a chicken to bring food.</p>}
        <button onClick={()=>onSelectBird(state.birds.find(b=>b.life.stage==="adult"&&!b.care)?.id??state.birds[0].id)}>Choose a food helper</button>
        {brood&&!['complete','failed'].includes(brood.stage)?<><p role="status">{plain(broodStatus(state,brood))}</p><p>{state.birds.find(b=>b.id===brood.carer)?.life.name} is caring here, away from building.</p><p className="quiet">Warm eggs hatch after 3 supplied cycles. Chicks grow with more food and care.</p></>:<>
          <p>With enough food and sleeping places, a willing hen can raise two chicks.</p>
          {state.birds.filter(b=>b.life.stage==="adult"&&b.life.sex==="hen").map(hen=>{const reason=broodReason(state,site.id,hen.id);return <div className="brood-choice" key={hen.id}><button disabled={disabled||!!reason} onClick={()=>onCommand({type:"brood",site:site.id,mother:hen.id})}>Support {hen.life.name}’s brood</button><p className="action-reason">{reason?plain(reason):`${hen.life.name} wants to care for two chicks.`}</p></div>})}
        </>}
      </article>;
    })}
    <fieldset disabled={disabled} className="priority-picker"><legend>What should the flock do first?</legend>{(["balanced","build","provision"] as const).map(priority=><button key={priority} aria-pressed={state.economy.priority===priority} onClick={()=>onCommand({type:"priority",priority})}>{({balanced:"A bit of both",build:"Build first",provision:"Food first"})[priority]}</button>)}</fieldset>
    {children}
    <details><summary>Food & growing details</summary><p>{forecast.adults} adults · {forecast.young} young · {forecast.pending} chicks expected</p><p>{forecast.committed}/{forecast.capacity} sleeping places needed later.</p><p>Per cycle: about {forecast.demand+forecast.careDemand} food needed / {forecast.supply} estimated supply.</p><p>Seeds: {forecast.stapleDemand+careEach} needed / {forecast.stapleSupply} supply. Bugs: {forecast.proteinDemand+careEach} needed / {forecast.proteinSupply} supply.</p><p className="quiet">Care takes a hen away from other work. Food first fills {economyTuning.nurseryTarget} of each food; A bit of both keeps {economyTuning.balancedNurseryBuffer}. Meals and urgent care come first. Estimates count each food place once and include travel, carers and expected chicks; they do not put food into storage. Water and minerals are dependable here.</p></details>
  </section>;
}
