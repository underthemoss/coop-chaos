import { worldTrees } from "../content/settlement-world";
import type { TreeId } from "../content/settlement";
import type { Settlement } from "../simulation/settlement";
import { buildingNames } from "./BuildCatalog";
/** Named tree selection leads to the shared catalog or an exact saved project. */
export function TreeInspector({state,treeId,onBuild,onProject}:{state:Settlement;treeId:TreeId;onBuild:()=>void;onProject:(id:string)=>void}) {
 const tree=worldTrees(state).find(t=>t.id===treeId)!;
 return <section aria-label={`${tree.name} building places`}><span className="eyebrow">NAMED TREE</span><h2>{tree.name}</h2><p>{tree.description}</p><button className="build-command" onClick={onBuild}>Choose a building</button>{state.sites.filter(s=>s.tree===treeId).map(s=><button className="placement-choice" key={s.id} onClick={()=>onProject(s.id)}>{buildingNames[s.kind]} · {s.complete?"Ready":"In progress"}</button>)}</section>;
}
