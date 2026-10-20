import type { ReactNode } from "react";
import { trees, type TreeId } from "../content/settlement";
import { cost, projectReadout, reedSupply, shelteredCapacity, treeBuildOptions, type Command, type Settlement } from "../simulation/settlement";
import { ActionArt } from "./ActionArt";
const names={treehouse:"Tree home",nursery:"Nursery for chicks","hauling-basket":"Hauling basket","sleeping-deck":"Sleeping deck",store:"Store nest"};
const art={treehouse:"home",nursery:"nursery","hauling-basket":"basket","sleeping-deck":"deck",store:"store"} as const;
export function TreeInspector({state,treeId,disabled,onSelect,onCommand,onGather,onFood,children}:{state:Settlement;treeId:TreeId;disabled:boolean;onSelect:(id:TreeId)=>void;onCommand:(command:Command)=>void;onGather:()=>void;onFood:()=>void;children:ReactNode}) {
  const tree=trees.find(t=>t.id===treeId)!;
  const sites=state.sites.filter(s=>s.tree===treeId);
  const options=treeBuildOptions(state,treeId).filter(o=>!sites.some(s=>s.kind===o.kind));
  const recipe=(kind:"treehouse"|"nursery"|"hauling-basket"|"sleeping-deck")=>{
    const option=options.find(o=>o.kind===kind);if(!option)return null;
    const shortfall=Math.max(0,option.cost-reedSupply(state).free);
    return <article className="recipe" key={kind}>
      <button className="action-tile" disabled={disabled||!option.available} onClick={()=>onCommand({type:"build",kind,at:tree})}>
        <ActionArt kind={art[kind]}/><span><strong>{kind==="treehouse"?"Build a home":`Build ${names[kind].toLowerCase()}`}</strong><small>{option.cost} reeds · {kind==="treehouse"||kind==="sleeping-deck"?"2 sleeping places":kind==="nursery"?"2 chicks, with care":"Lifts reeds to the deck"}</small></span>
      </button>
      <p className="action-reason">{option.reason||(shortfall?`You can queue it now. Gather ${shortfall} more ${shortfall===1?"reed":"reeds"}.`:state.phase==="evening"?"Starts in the morning.":"Chickens will carry reeds and weave here.")}</p>
    </article>;
  };
  return <section className="tree-inspector" aria-label={`${tree.name} building places`}>
    <span className="eyebrow">TREE BUILDINGS</span><h2>{tree.name}</h2>
    <nav className="tree-tabs" aria-label="Named trees">{trees.map(t=><button key={t.id} aria-pressed={t.id===treeId} onClick={()=>onSelect(t.id)}>{t.name}</button>)}</nav>
    {sites.filter(s=>!s.complete).map(site=>{const readout=projectReadout(state,site);return <article className="project-card" key={site.id} aria-label={`${names[site.kind]} project`}>
      <h3>{names[site.kind]} queued</h3><p className="task-subtitle">At {tree.name} · {site.delivered}/{cost(site)} reeds delivered</p>
      <progress max={100} value={readout.progress} aria-label={`${names[site.kind]} progress`}/><p role="status">{readout.status}</p>
      {readout.shortfall>0&&<button onClick={onGather}>Choose a chicken to gather reeds</button>}
      <details><summary>Project details</summary><p>{readout.progress}% done · {site.contributors.length?`Helped by ${site.contributors.map(id=>state.birds.find(b=>b.id===id)!.life.name).join(", ")}`:"Work has been requested."}</p><button disabled={disabled} onClick={()=>onCommand({type:"cancel",id:site.id})}>Cancel building</button></details>
    </article>})}
    {recipe("treehouse")}
    {sites.some(s=>s.kind==="treehouse"&&s.complete)&&<p className="ready-building">Home ready · {shelteredCapacity(state,treeId)} sheltered sleeping places</p>}
    {sites.some(s=>s.kind==="nursery"&&s.complete)&&<p className="ready-building">Nursery ready · <button onClick={onFood}>Food for chicks</button></p>}
    <details className="more-buildings"><summary>More buildings</summary>{recipe("nursery")}{recipe("hauling-basket")}{recipe("sleeping-deck")}{children}</details>
    <details><summary>About {tree.name}</summary><p>{tree.description}</p><p>Two natural sleeping branches are here before you build. New homes and decks each add two sheltered sleeping places.</p></details>
  </section>;
}
