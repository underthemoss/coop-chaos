import { currentWork, directStatus, type Settlement } from "../simulation/settlement";
import { actorBlock } from "./command-ui";

export function CommandDock({state,ids,targeting,queue,disabled,onTarget,onStop,onCommunity,onBuild,onQueue,onDetails,onClear,onCancel}: {
  state:Settlement; ids:string[]; targeting:"move"|"gather"|"build"|null; queue:boolean; disabled:boolean;
  onTarget:(kind:"move"|"gather"|"build")=>void; onStop:()=>void; onCommunity:()=>void;
  onBuild:()=>void; onQueue:(value:boolean)=>void; onDetails:(id:string)=>void; onClear:()=>void; onCancel:()=>void;
}) {
  const birds=ids.flatMap(id=>state.birds.find(b=>b.id===id)??[]);
  const eligible=birds.filter(b=>!actorBlock(b));
  const single=birds.length===1?birds[0]:null;
  return <section className="command-dock" aria-label="Selected chickens commands">
    <div className="dock-heading"><strong>{single?single.life.name:`${birds.length} chickens selected`}</strong><span>{eligible.length}/{birds.length} eligible adults</span><button onClick={onClear} aria-label="Clear chicken selection">×</button></div>
    <div className="selected-activities" aria-label="Selected chickens and their activity">{birds.map(b=><div key={b.id} className="selected-activity"><button onClick={()=>onDetails(b.id)} aria-label={`Details for ${b.life.name}`} title={`Open ${b.life.name}’s personal details and history`}>{b.life.name}</button><span><small>{b.direct?"Direct orders":"Community work"}</small>{actorBlock(b)|| (b.direct?directStatus(state,b):currentWork(state,b))}</span></div>)}</div>
    <div className="dock-actions">
      <button disabled={disabled||!eligible.length} aria-pressed={targeting==="move"} onClick={()=>onTarget("move")}>Move <kbd>M</kbd></button>
      <button disabled={disabled||!eligible.length} aria-pressed={targeting==="gather"} onClick={()=>onTarget("gather")}>Gather <kbd>G</kbd></button>
      <button disabled={disabled||!eligible.length} aria-pressed={targeting==="build"} onClick={()=>onTarget("build")}>Help build</button>
      <button disabled={disabled||!single||!!actorBlock(single)} onClick={onBuild} title={!single?"Select one builder":actorBlock(single)||`${single.life.name} will build`}>New building <kbd>B</kbd></button>
      <button disabled={disabled||!eligible.length} onClick={onStop}>Stop <kbd>S</kbd></button>
      <button disabled={disabled||!eligible.length} onClick={onCommunity}>Community work</button>
    </div>
    <div className="dock-options"><label><input type="checkbox" checked={queue} onChange={e=>onQueue(e.target.checked)}/>Queue next</label><span>{single?(actorBlock(single)||`${single.life.name} will build new plans`):"New building: select one builder"}</span>{targeting&&<button onClick={onCancel}>Cancel targeting <kbd>Esc</kbd></button>}</div>
  </section>;
}
