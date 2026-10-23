import type { ReactNode } from "react";
import { trees, type TreeId } from "../content/settlement";
import { reedSupply, shelteredCapacity, treeBuildOptions, type Command, type Settlement } from "../simulation/settlement";
import { ActionArt } from "./ActionArt";
import { ProjectCard } from "./ProjectCard";
const names={treehouse:"Tree home",nursery:"Nursery for chicks","hauling-basket":"Hauling basket","sleeping-deck":"Sleeping deck",store:"Store nest"};
const art={treehouse:"home",nursery:"nursery","hauling-basket":"basket","sleeping-deck":"deck",store:"store"} as const;
export function TreeInspector({state,treeId,disabled,onSelect,onCommand,onGather,onFood,revealOther,children}:{state:Settlement;treeId:TreeId;disabled:boolean;onSelect:(id:TreeId)=>void;onCommand:(command:Command)=>void;onGather:()=>void;onFood:()=>void;revealOther?:boolean;children:ReactNode}) {
  const tree=trees.find(t=>t.id===treeId)!;
  const sites=state.sites.filter(s=>s.tree===treeId);
  const options=treeBuildOptions(state,treeId).filter(o=>!sites.some(s=>s.kind===o.kind));
  const recipe=(kind:"treehouse"|"nursery"|"hauling-basket"|"sleeping-deck")=>{
    const option=options.find(o=>o.kind===kind);if(!option)return null;
    const shortfall=Math.max(0,option.cost-reedSupply(state).free);
    return <article className="recipe" key={kind}>
      <button className="action-tile" disabled={disabled||!option.available} onClick={()=>onCommand({type:"build",kind,at:tree})}>
        <ActionArt kind={art[kind]}/><span><strong>{kind==="treehouse"?"Build a home":`Build ${names[kind].toLowerCase()}`}</strong><small>{option.cost} reeds · {kind==="treehouse"||kind==="sleeping-deck"?"2 sleeping places":kind==="nursery"?"Ground care for 2 future chicks":"Lifts reeds to the deck"}</small></span>
      </button>
      <p className="action-reason">{option.reason||(state.paused?"Work is paused. You can plan it now, then resume.":state.phase==="evening"?"Starts in the morning.":shortfall?`You can plan it now. Gather ${shortfall} more ${shortfall===1?"reed":"reeds"}.`:"Chickens will carry reeds and weave here.")}</p>
    </article>;
  };
  return <section className="tree-inspector" aria-label={`${tree.name} building places`}>
    <span className="eyebrow">TREE BUILDINGS</span><h2>{tree.name}</h2>
    <nav className="tree-tabs" aria-label="Named trees">{trees.map(t=><button key={t.id} aria-pressed={t.id===treeId} onClick={()=>onSelect(t.id)}>{t.name}</button>)}</nav>
    {sites.filter(s=>!s.complete).map(site=><ProjectCard key={site.id} state={state} site={site} place={tree.name} disabled={disabled} onCommand={onCommand} onGather={onGather}/>)}
    {recipe("treehouse")}
    {sites.some(s=>s.kind==="treehouse"&&s.complete)&&<p className="ready-building">Home ready · {shelteredCapacity(state,treeId)} sheltered sleeping places</p>}
    {sites.some(s=>s.kind==="nursery"&&s.complete)&&<p className="ready-building">Nursery ready · <button onClick={onFood}>Care for this brood</button></p>}
    {sites.some(s=>s.kind==="treehouse"&&s.complete)&&<div className="home-choices"><h3>Grow the flock or improve this home</h3>{recipe("nursery")}{sites.some(s=>s.kind==="hauling-basket"&&s.complete)?recipe("sleeping-deck"):recipe("hauling-basket")}</div>}
    <details className="more-buildings" open={revealOther||undefined}><summary>Other building controls</summary>{!sites.some(s=>s.kind==="hauling-basket"&&s.complete)&&recipe("sleeping-deck")}{children}</details>
    <details><summary>About {tree.name}</summary><p>{tree.description}</p><p>Two natural sleeping branches are here before you build. New homes and decks each add two sheltered sleeping places.</p></details>
  </section>;
}
