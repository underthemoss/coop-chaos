import { cost, gatherRecovery, projectReadout, requestOptions, type Command, type Settlement, type Site } from "../simulation/settlement";
const names={treehouse:"Tree home",nursery:"Nursery for chicks","hauling-basket":"Hauling basket","sleeping-deck":"Sleeping deck",store:"Store nest"};

/** Shared construction controls for tree projects and ground stores. */
export function ProjectCard({state,site,place,disabled,onCommand,onGather}:{state:Settlement;site:Site;place:string;disabled:boolean;onCommand:(command:Command)=>void;onGather:()=>void}) {
  const readout=projectReadout(state,site);
  const {helper,reason,canChoose}=gatherRecovery(state);
  const focused=state.constructionFocus===site.id;
  return <article id={`project-${site.id}`} className={`project-card${focused?" is-focused":""}`} aria-label={`${names[site.kind]} project`}>
    <h3>{names[site.kind]} · {readout.title.toLowerCase()}</h3><p className="task-subtitle">At {place} · {site.delivered}/{cost(site)} reeds delivered</p>
    <progress max={100} value={readout.progress} aria-label={`${names[site.kind]} progress`}/><p role="status">{readout.status}</p>
    {!!readout.waiting&&!readout.status.includes(readout.waiting)&&<p>{readout.waiting}</p>}
    {focused&&<p className="focus-status" role="status">Building first</p>}
    <button className="build-command" disabled={disabled} onClick={()=>onCommand({type:"focus-build",site:focused?null:site.id})}>{focused?"Use normal order":"Build this first"}</button>
    <p className="action-reason">For next free chickens. Current deliveries finish; care and food priorities stay in place.</p>
    {state.paused?<button disabled={disabled} onClick={()=>onCommand({type:"pause"})}>Resume work</button>:readout.shortfall>0&&<><p>Needs {readout.shortfall} more {readout.shortfall===1?"reed":"reeds"}.</p>{helper?<button disabled={disabled} onClick={()=>{const option=requestOptions(state,helper).find(o=>o.kind==="gather")!;onCommand({type:"request",bird:helper.id,kind:"gather",target:option.target});}}>Ask {helper.life.name} to gather reeds</button>:<><p>{reason}</p>{canChoose&&<button onClick={onGather}>Choose a chicken</button>}</>}</>}
    <details><summary>Project details</summary><p>{readout.progress}% done · {site.contributors.length?`Helped by ${site.contributors.map(id=>state.birds.find(b=>b.id===id)!.life.name).join(", ")}`:"Work has been requested."}</p><button disabled={disabled} onClick={()=>onCommand({type:"cancel",id:site.id})}>Cancel building</button></details>
  </article>;
}
