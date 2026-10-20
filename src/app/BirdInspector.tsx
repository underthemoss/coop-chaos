import { currentWork, requestOptions, requestPlace, requestStatus, type Command, type Settlement, type Worker } from "../simulation/settlement";
import { ActionArt } from "./ActionArt";
export function BirdInspector({state,bird,disabled,onCommand,onChooseFree,onBuild}:{state:Settlement;bird:Worker;disabled:boolean;onCommand:(command:Command)=>void;onChooseFree:()=>void;onBuild:()=>void}) {
  const request=bird.request;
  const place=request&&requestPlace(state,request);
  const sharedBlock=bird.life.stage!=="adult"?`${bird.life.name} is too young to carry or build.`:bird.care?`${bird.life.name} is caring for eggs and chicks.`:"";
  const freeChicken=state.birds.some(b=>b.life.stage==="adult"&&!b.care&&!b.request);
  return <section className="bird-inspector" aria-label={`${bird.life.name} actions`}>
    <span className="eyebrow">CHICKEN ACTIONS</span>
    <h2>{bird.life.name}</h2>
    <p className="current-work">{sharedBlock||currentWork(state,bird)}</p>
    {request?<div className="request-card" role="status">
      <h3>{{gather:"Gather reeds",build:"Help build",food:"Bring food"}[request.kind]} requested</h3>
      <p className="task-subtitle">One {request.kind==="build"?"task":"trip"} · {place?.name}</p>
      <p>{requestStatus(state,bird)}</p>
      <button disabled={disabled} onClick={()=>onCommand({type:"cancel-request",bird:bird.id})}>Cancel request</button>
    </div>:<>
      {bird.requestResult&&<p className="last-result" role="status">{bird.requestResult.reason.replace(/ Back to community work\.$/,"")}</p>}
      {sharedBlock?<div className="shared-action-block"><button disabled={disabled||!freeChicken} onClick={onChooseFree}>Choose a free chicken</button>{!freeChicken&&<p>Every adult is caring or has a request. Let them finish first.</p>}</div>:<div className="bird-actions">{requestOptions(state,bird).map(option=><div className="action-choice" key={option.kind}>
        <button className="action-tile" disabled={disabled||(!option.available&&option.kind!=="build")} onClick={()=>option.kind==="build"&&!option.available?onBuild():onCommand({type:"request",bird:bird.id,kind:option.kind,target:option.target})}>
          <ActionArt kind={option.kind}/><span><strong>{option.kind==="build"&&!option.available?"Plan a home":option.label}</strong><small>{option.kind==="build"&&!option.available?"Choose a tree, then ask for help":!option.available?option.reason:`One ${option.kind==="build"?"task":"trip"}${option.place?` · ${option.place.name}`:""}`}</small></span>
        </button>
      </div>)}</div>}
    </>}
  </section>;
}
