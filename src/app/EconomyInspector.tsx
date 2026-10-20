import { economyTuning, trees } from "../content/settlement";
import { broodReason, broodStatus, growthForecast, type Command, type Settlement } from "../simulation/settlement";

export function EconomyInspector({state,disabled,onCommand}:{state:Settlement;disabled:boolean;onCommand:(command:Command)=>void}) {
  const forecast=growthForecast(state);
  const cycleTicks=economyTuning.dayTicks+economyTuning.eveningTicks;
  const careEach=Math.ceil(forecast.careDemand/2);
  return <section className="economy-inspector" aria-label="Food, work and future residents">
    <span className="eyebrow">A COMMUNITY THAT CAN GROW</span>
    <h2>Food, work & young</h2>
    <p>{forecast.adults} adults · {forecast.young} young · {forecast.pending} future chicks committed</p>
    <p>{forecast.committed}/{forecast.capacity} future adult berths committed. Nurseries add two grounded care places each, and do not add adult sleeping berths.</p>
    <fieldset disabled={disabled} className="priority-picker"><legend>New work priority</legend>
      {(["balanced","build","provision"] as const).map(priority=><button key={priority} aria-pressed={state.economy.priority===priority} onClick={()=>onCommand({type:"priority",priority})}>{({balanced:"Balanced",build:"Build",provision:"Provision"})[priority]}</button>)}
    </fieldset>
    <p className="quiet">Meals, current cargo and urgent brood supplies come first. Balanced keeps {economyTuning.balancedNurseryBuffer} of each food before building; Build favors construction; Provision fills the full nursery target. A caring hen leaves the ordinary workforce.</p>
    <p className="food-forecast"><strong>About {forecast.demand+forecast.careDemand} food needed / cycle · {forecast.supply} estimated supply.</strong> Includes all residents, committed young and continuing care. {forecast.foodWorkers} adults remain available for food and other work.</p>
    <p>Staple: about {forecast.stapleDemand+careEach} needed / {forecast.stapleSupply} available. Protein: about {forecast.proteinDemand+careEach} needed / {forecast.proteinSupply} available.</p>
    <details><summary>How the planning estimate works</summary><p className="quiet">Each open food place is counted once, with a 15% reserve. Food gathering and delivery time limit the {forecast.foodWorkers} available adults to about {forecast.workerSupply} food per cycle; the grove can renew about {forecast.habitatSupply}. The smaller total is used. Staple and protein availability are checked separately before a new brood. This estimate is approximate and does not credit food to storage.</p></details>
    <p className="quiet">Staple seeds and protein forage travel separately. Water and mineral access are dependable in this small grove; structural wood and full nutrition are future work.</p>
    {!state.economy.nurseries.length&&<p>Choose a tree, complete its home, then commission a covered root nursery for 4 reeds. Provision its food before supporting a brood.</p>}
    {state.economy.nurseries.map(nursery=>{
      const site=state.sites.find(s=>s.id===nursery.site)!;
      const tree=trees.find(t=>t.id===site.tree)!;
      const brood=state.economy.broods.find(b=>b.id===nursery.brood);
      return <article className="site-card" key={nursery.site} aria-label={`${tree.name} nursery`}>
        <h3>{tree.name} root nursery</h3>
        <p><strong>{nursery.food.staple} staple · {nursery.food.protein} protein</strong> here · target {nursery.target} of each · capacity {economyTuning.foodCapacity} of each</p>
        {brood&&<><p className="work-status">{broodStatus(state,brood)}</p>
        <p>{state.birds.find(b=>b.id===brood.carer)?.life.name} · {state.birds.some(b=>b.care===brood.id)?"committed to nursery care, away from ordinary work":"returned to community work"}</p>
        <p className="quiet">{(brood.careTicks/cycleTicks).toFixed(1)} cycles of care · {(brood.shortageTicks/600).toFixed(1)} minutes waiting for supplies or condition at 1× time</p>
        <p>{brood.eggs.length?brood.eggs.map((egg,index)=>egg.child?state.birds.find(b=>b.id===egg.child)?.life.name:`Egg ${index+1}: ${egg.viable?"fertile":"lost viability"}`).join(" · "):"Preparing a clutch of two eggs"}</p></>}
        {(!brood||["complete","failed"].includes(brood.stage))&&<>
          <h4>Support a willing hen’s brood</h4>
          <p className="quiet">Two eggs, then 3 cycles of supplied incubation. Chicks need 3 more cycles of care to become juveniles, and another 3 to reach adult work. Fictional play time; care shortages pause progress.</p>
          {state.birds.filter(b=>b.life.stage==="adult"&&b.life.sex==="hen").map(hen=>{
            const reason=broodReason(state,site.id,hen.id);
            return <div className="brood-choice" key={hen.id}><button disabled={disabled||!!reason} onClick={()=>onCommand({type:"brood",site:site.id,mother:hen.id})}>Support {hen.life.name}’s brood</button><p className="quiet">{reason||`${hen.life.name} wants to care; two future adult places and continuing deliveries are committed.`}</p></div>;
          })}
        </>}
      </article>;
    })}
  </section>;
}
