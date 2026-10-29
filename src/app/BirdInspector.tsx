import { birdProfile, currentWork, directOrderLabel, directStatus, requestStatus, type Command, type Settlement, type Worker } from "../simulation/settlement";
import { targetEligibility } from "./command-ui";
export function BirdInspector({state,bird,disabled,onCommand,onChooseFree}:{state:Settlement;bird:Worker;disabled:boolean;onCommand:(command:Command)=>void;onChooseFree:()=>void}) {
  const blocked=bird.life.stage!=="adult"?`${bird.life.name} is too young for direct orders.`:bird.care?`${bird.life.name} is providing essential brood care.`:"";
  const food=state.economy.nurseries.map(n=>({target:n.site,eligible:targetEligibility(state,[bird.id],{kind:"food",target:n.site})[0]?.eligible})).find(n=>n.eligible);
  const profile=birdProfile(bird,state);
  return <section className="bird-inspector" aria-label={`${bird.life.name} actions`}>
    <span className="eyebrow">{bird.direct?"DIRECT ORDERS":"COMMUNITY WORK"}</span><h2>{bird.life.name}</h2>
    <p className="current-work">{blocked||(bird.direct?directStatus(state,bird):currentWork(state,bird))}</p>
    <p>{profile.want}</p>
    <p className="task-subtitle">{bird.life.stage} · energy {Math.round(bird.energy)} · appetite {Math.round(bird.satiety)} · {bird.deliveries} deliveries</p>
    {bird.request&&<p className="action-reason">Earlier one-trip request: {requestStatus(state,bird)}. A new direct order replaces it.</p>}
    {blocked?<button disabled={disabled} onClick={onChooseFree}>Choose a free adult</button>:<>
      {!!bird.direct?.queue.length&&<ol className="order-queue" aria-label={`${bird.life.name} queued orders`}>{bird.direct.queue.map((order,i)=><li key={i}>{directOrderLabel(state,order)}</li>)}</ol>}
      {state.paused&&<button disabled={disabled} onClick={()=>onCommand({type:"pause"})}>Resume time</button>}
      {food?.eligible&&<button disabled={disabled} onClick={()=>onCommand({type:"direct",bird:bird.id,order:{kind:"food",target:food.target}})}>Bring food · one trip</button>}
    </>}
    {!!bird.memories.length&&<><h3>Remembered experience</h3><ul>{bird.memories.map(memory=><li key={memory}>{memory}</li>)}</ul></>}
    {bird.requestResult&&<p className="last-result">{bird.requestResult.reason}</p>}
    <p className="action-reason">Every eligible adult can gather and build. Character profiles do not grant classes or combat skills.</p>
  </section>;
}
