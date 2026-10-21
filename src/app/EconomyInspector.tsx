import { ActionArt } from "./ActionArt";
import type { ReactNode } from "react";
import { economyTuning, trees } from "../content/settlement";
import { broodReason, foodRecovery, nurseryReadout, populationReadout, type Command, type Settlement } from "../simulation/settlement";
const plain=(text:string)=>text.replace(/staple/gi,"Seeds").replace(/protein/gi,"Bugs").replace(/berths/gi,"future places");
export function EconomyInspector({state,selectedNursery,onSelectNursery,disabled,onCommand,onBuild,children}:{state:Settlement;selectedNursery:string|null;onSelectNursery:(id:string)=>void;disabled:boolean;onCommand:(command:Command)=>void;onBuild:()=>void;children:ReactNode}) {
  const forecast=populationReadout(state), careEach=Math.ceil(forecast.careDemand/2);
  const nursery=state.economy.nurseries.find(n=>n.site===selectedNursery)??state.economy.nurseries.find(n=>state.economy.broods.some(b=>b.id===n.brood&&!['complete','failed'].includes(b.stage)))??state.economy.nurseries[0];
  const site=state.sites.find(s=>s.id===nursery?.site), tree=trees.find(t=>t.id===site?.tree);
  const brood=state.economy.broods.find(b=>b.id===nursery?.brood);
  const active=brood&&!['complete','failed'].includes(brood.stage);
  const care=nursery?nurseryReadout(state,nursery.site):null;
  const recovery=nursery?foodRecovery(state,nursery.site):null;
  return <section className="economy-inspector" aria-label="Food for chicks">
    <div className="illustrated-heading"><ActionArt kind="nursery"/><div><span className="eyebrow">GROWING A COMMUNITY</span><h2>{tree?`${tree.name} nursery`:"Food for chicks"}</h2></div></div>
    {!nursery&&<><p>Eggs need a warm nursery and a caring hen. Build a home, then a nursery.</p><button className="build-command" onClick={onBuild}>Choose a tree to build</button></>}
    {state.economy.nurseries.length>1&&<nav className="tree-tabs" aria-label="Local nurseries">{state.economy.nurseries.map(n=><button key={n.site} aria-pressed={n.site===nursery?.site} onClick={()=>onSelectNursery(n.site)}>{trees.find(t=>t.id===state.sites.find(s=>s.id===n.site)!.tree)!.name}</button>)}</nav>}
    {nursery&&care&&<article className="nursery-card" aria-label={`${tree!.name} nursery`}>
      {brood&&<><h3>{care.title}</h3><p className="brood-stage">{care.stage}</p><progress max={100} value={care.progress} aria-label={care.progressLabel}/><p className="quiet">{care.progress}% · {care.progressLabel.toLowerCase()}</p><p role="status">{care.status}</p></>}
      <p className="local-food"><strong>{nursery.food.staple} Seeds · {nursery.food.protein} Bugs</strong> stored here</p>
      {care.carer&&<p className="quiet">{care.carer.life.name} is committed to care, unavailable for building.</p>}
      {state.paused?<button className="build-command" disabled={disabled} onClick={()=>onCommand({type:"pause"})}>Resume care and work</button>:recovery?.helper?<button disabled={disabled} onClick={()=>onCommand({type:"request",bird:recovery.helper!.id,kind:"food",target:nursery.site})}>Ask {recovery.helper.life.name} to bring food here</button>:recovery?.openPatch?<button disabled={disabled} onClick={()=>onCommand({type:"forage",id:recovery.openPatch!,open:true})}>Reopen {recovery.openPatch==="leaf-litter"?"Leaf-litter Hollow":recovery.openPatch==="seed-common"?"Seedhead Common":"Insect Verge"}</button>:<p className="action-reason">{recovery?.reason}</p>}
      <fieldset disabled={disabled} className="priority-picker"><legend>Flock priority</legend>{(["balanced","build","provision"] as const).map(priority=><button key={priority} aria-pressed={state.economy.priority===priority} onClick={()=>onCommand({type:"priority",priority})}>{({balanced:"A bit of both",build:"Build first",provision:"Food first"})[priority]}</button>)}</fieldset>
      <p className="quiet">Food first fills local stores before ordinary building and may slow construction. Urgent care and personal meals come first under every priority.</p>
      {!active&&<>{!brood&&<p>{care.status}</p>}<p>A willing hen needs recent fertility, food, rest and two future places. Time together may lead to fertility; waiting alone does not guarantee it.</p>{state.birds.filter(b=>b.life.stage==="adult"&&b.life.sex==="hen").map(hen=>{const reason=broodReason(state,nursery.site,hen.id);return <div className="brood-choice" key={hen.id}><button disabled={disabled||!!reason} onClick={()=>onCommand({type:"brood",site:nursery.site,mother:hen.id})}>Support {hen.life.name}’s brood</button><p className="action-reason">{reason?plain(reason):`${hen.life.name} wants to care for two future chicks. No eggs laid yet.`}</p></div>})}</>}
      {active&&<p className="quiet">Incubation needs 3 supplied cycles. Chicks then need continuing ground care; juveniles feed themselves before becoming adults.</p>}
    </article>}
    <details><summary>Food places</summary>{children}</details>
    <details><summary>Food & growing details</summary><p>{forecast.label}</p><p>{forecast.committed}/{forecast.capacity} future adult places committed, including expected unhatched young. This is future capacity, not occupied sleeping places. Young stay on the ground until grown.</p><p>{forecast.carers} carers away from ordinary work · {forecast.foodWorkers} adults available for food and construction.</p><p>Per cycle: about {forecast.demand+forecast.careDemand} food needed / {forecast.supply} estimated supply.</p><p>Seeds: {forecast.stapleDemand+careEach} needed / {forecast.stapleSupply} supply. Bugs: {forecast.proteinDemand+careEach} needed / {forecast.proteinSupply} supply.</p><p className="quiet">Food first fills {economyTuning.nurseryTarget} of each food; A bit of both keeps {economyTuning.balancedNurseryBuffer}. Estimates count each food place once and include travel, carers and expected chicks. Estimates are not stored food. Water and minerals are dependable here.</p></details>
  </section>;
}
