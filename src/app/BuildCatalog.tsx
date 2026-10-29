import { settlementWorld } from "../content/settlement-world";
import { cost, treeBuildOptions, type BuildKind, type Settlement } from "../simulation/settlement";
import { ActionArt } from "./ActionArt";
export const buildingNames:Record<BuildKind,string>={treehouse:"Boughhome",nursery:"Nursery for chicks",store:"Reed store","hauling-basket":"Hauling basket","sleeping-deck":"Sleeping deck"};
const effects:Record<BuildKind,string>={treehouse:"2 sheltered sleeping places",nursery:"Ground care for 2 future chicks",store:"Holds 12 physical reed bundles","hauling-basket":"Lifts reeds to the elevated deck","sleeping-deck":"2 more sheltered sleeping places"};
const art={treehouse:"home",nursery:"nursery",store:"store","hauling-basket":"basket","sleeping-deck":"deck"} as const;
export function BuildCatalog({state,onChoose}:{state:Settlement;onChoose:(kind:BuildKind)=>void}) {
  const world=settlementWorld(state);
  return <section aria-label="Building catalog"><span className="eyebrow">BUILD IN THE GROVE</span><h2>Choose a building</h2><p>Choose its place next. Chickens carry real reeds and weave it there.</p>{(Object.keys(buildingNames) as BuildKind[]).map(kind=>{
    const options=world.trees.map(t=>treeBuildOptions(state,t.id).find(o=>o.kind===kind));
    const available=kind==="store"?!state.world||world.pads.some(p=>p.kind==="store"&&!state.sites.some(s=>s.at.x===p.at.x&&s.at.z===p.at.z)):options.some(o=>o?.available);
    const reason=kind==="store"?"Both reed-store courts are occupied.":options[0]?.reason;
    return <article className="recipe" key={kind}><button className="action-tile" disabled={!available} onClick={()=>onChoose(kind)}><ActionArt kind={art[kind]}/><span><strong>{buildingNames[kind]}</strong><small>{cost({kind})} reeds · {effects[kind]}</small></span></button>{!available&&<p className="action-reason">{reason}</p>}</article>;
  })}<p className="action-reason">Plans may exceed your stock. Reeds are paid through physical deliveries.</p></section>;
}
