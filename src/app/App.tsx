import { buildingPlace, settlementWorld } from "../content/settlement-world";
import type { GroundPickMiss } from "../game/clearing-input";
import { useEffect, useRef, useState } from "react";
import { Clearing } from "../game/Clearing";
import type { Tool } from "../game/Clearing";
import { tuning } from "../content/settlement";
import { EconomyInspector } from "./EconomyInspector";
import { BirdInspector } from "./BirdInspector";
import { CommandDock } from "./CommandDock";
import { actorBlock, awaitingOrderBirds, commandShortcut, recallGroup } from "./command-ui";
import { BuildCatalog, buildingNames } from "./BuildCatalog";
import { TreeInspector } from "./TreeInspector";
import { SuppliesInspector } from "./SuppliesInspector";
import { latestSave } from "./save-status";
import { ProjectCard } from "./ProjectCard";
import type { TreeId, SettlerId } from "../content/settlement";
import {
  command,
  groupMoveOrders,
  groundAccess,
  directOrderLabel,
  directStatus,
  shelteredCapacity,
  step,
  populationReadout,
  reedSupply,
  requestPlace,
  treeBuildOptions,
  cost,
  constructionFocusReadout,
  constructionBudget,
} from "../simulation/settlement";
import type { BuildKind, Cell, Command, DirectOrder, Settlement } from "../simulation/settlement";
import {
  encodeSettlement,
} from "../persistence/settlement-save";
function download(text: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function App({initial, name, onSave, onExit}: {initial:Settlement;name:string;onSave:(state:Settlement)=>Promise<void>;onExit:()=>void}) {
  const [state, setState] = useState(initial);
  const definition = settlementWorld(state), trees=definition.trees, foodPatches=definition.foodPatches;
  const foodName = (id:string)=>foodPatches.find(p=>p.id===id)?.name??id;
  const stateRef = useRef(state);
  const [selected, setSelected] = useState<SettlerId>("fern");
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const [targetMode,setTargetMode]=useState<"move"|"gather"|"build"|null>(null);
  const [queueOrder,setQueueOrder]=useState(false);
  const [controlGroups,setControlGroups]=useState<Record<number,string[]>>({});
  const [controlsOpen,setControlsOpen]=useState(false);
  const gameRoot=useRef<HTMLDivElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [revealedProject, setRevealedProject] = useState<string | null>(null);
  const [selectedNursery,setSelectedNursery]=useState<string|null>(null);
  const [selectedForage, setSelectedForage] = useState<string | null>(null);
  const [panelTarget, setPanelTarget] = useState<"bird" | "food" | "forage" | "gather" | "tree" | "placement" | "catalog" | "project" | null>(null);
  const [recipe,setRecipe]=useState<BuildKind|null>(null);
  const [selectedPatch,setSelectedPatch]=useState<string|null>(null);
  const [homeBuilder,setHomeBuilder]=useState<SettlerId|null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [selectedTree, setSelectedTree] = useState<TreeId>(trees[0].id);
  const inspector = useRef<HTMLElement>(null);
  const [hintDismissed,setHintDismissed] = useState(false);
  function showDetails(target: "bird" | "food" | "forage" | "gather" | "tree") {
    setHomeBuilder(null);setRecipe(null);
    clearInteractionNotice();
    setPanelOpen(true);
    setPanelTarget(target);
    setFocusRequest(n => n + 1);
  }
  function showMenu() {
    cancelPlacement();
    clearInteractionNotice();
    setPanelTarget(null);
    setPanelOpen(true);
    setFocusRequest(n => n + 1);
  }
  useEffect(() => {
    if (!panelOpen) return;
    const frame = requestAnimationFrame(() => {
      const card=inspector.current;
      const project=revealedProject?document.getElementById(`project-${revealedProject}`):null;
      if(card)card.scrollTo({top:project?project.getBoundingClientRect().top-card.getBoundingClientRect().top+card.scrollTop-(parseFloat(getComputedStyle(card).scrollPaddingTop)||12):0});
    });
    return () => cancelAnimationFrame(frame);
  }, [panelOpen, panelTarget, selectedForage, selectedTree, focusRequest, revealedProject]);
  useEffect(()=>{
    const card=inspector.current;
    if(!panelOpen||!card)return;
    const reserve=()=>card.parentElement?.style.setProperty("--card-height",`${card.offsetHeight}px`);
    const observer=new ResizeObserver(reserve);observer.observe(card);reserve();
    return ()=>observer.disconnect();
  },[panelOpen]);
  const [tool, setTool] = useState<Tool>("inspect");
  const [cursor, setCursor] = useState<Cell>({x:trees[0].x,z:trees[0].z});
  const ready = true;
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const saveFailed = useRef(false);
  const [unsaved,setUnsaved] = useState(false);
  const [storage, setStorage] = useState("Saved on this device");
  const [notice, setNotice] = useState("");
  const [actionFailed,setActionFailed]=useState(false);
  function clearInteractionNotice(){setNotice(current=>/^(Building queued\.|Choose (open ground|a named tree|one of the construction))/.test(current)?"":current);}
  function display(next: Settlement) {
    stateRef.current = next;
    setState(next);
  }
  const saveReporter=useRef<ReturnType<typeof latestSave>|null>(null);
  if(!saveReporter.current)saveReporter.current=latestSave(onSave,feedback=>{
    if("saving" in feedback){setStorage("Saving…");return;}
    saveFailed.current=!feedback.saved;setUnsaved(!feedback.saved);
    setStorage(feedback.saved?"Saved on this device":feedback.reason);
  });
  const save=saveReporter.current;
  async function returnToTitle(){
    if(locked.current)return;
    locked.current=true;setBusy(true);
    if(await save(stateRef.current))onExit();
    else {locked.current=false;setBusy(false);}
  }
  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(saveFailed.current){event.preventDefault();}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[]);
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      if (locked.current || document.hidden) return;
      const previousTick=stateRef.current.tick;
      let next = stateRef.current;
      for(let i=0;i<stateRef.current.economy.clock.speed;i++)next=step(next);
      if (next === stateRef.current) return;
      display(next);
      if (!saveFailed.current && Math.floor(next.tick/10)>Math.floor(previousTick/10)) void save(next);
    }, tuning.stepSeconds * 1000);
    return () => clearInterval(id);
  }, [ready]);
  function act(action: Command) {
    if (!ready || locked.current) return false;
    try {
      const next = command(stateRef.current, action);
      display(next);
      if(!saveFailed.current)void save(next);
      setNotice(action.type==="focus-build" ? action.site===null ? "Normal construction order. Current work continues." : `Construction priority set to ${constructionFocusReadout(next)!.label}. Current deliveries and care continue.` : "");
      setActionFailed(false);
      return true;
    } catch (cause) {
      setActionFailed(true);
      setNotice(
        cause instanceof Error
          ? cause.message
          : "That action could not be completed.",
      );
      return false;
    }
  }
  function focusGame(){gameRoot.current?.focus({preventScroll:true});}
  function cancelPlacement(){setTargetMode(null);setRecipe(null);setHomeBuilder(null);setTool("inspect");}
  function openCatalog(){cancelPlacement();setPanelTarget("catalog");setPanelOpen(true);setFocusRequest(n=>n+1);}
  function chooseRecipe(kind:BuildKind,helper:SettlerId|null=null){
    setRecipe(kind);setHomeBuilder(helper);setTool(kind==="store"?"store":"build");setNotice("");setActionFailed(false);setPanelTarget("placement");setPanelOpen(true);
    const pad=definition.pads.find(p=>p.kind===kind&&!stateRef.current.sites.some(s=>s.at.x===p.at.x&&s.at.z===p.at.z));
    setCursor(pad?.at??trees.find(t=>treeBuildOptions(stateRef.current,t.id).find(o=>o.kind===kind)?.available)??trees[0]);setFocusRequest(n=>n+1);
  }
  function commission(at:Cell){
    if(!recipe)return;
    if(!act({type:"build",kind:recipe,at,...(homeBuilder?{bird:homeBuilder}:{})}))return;
    const site=stateRef.current.sites.at(-1)!;cancelPlacement();setRevealedProject(site.id);setPanelTarget("project");setPanelOpen(true);setCursor(site.at);setFocusRequest(n=>n+1);
  }
  function selectTree(id:TreeId){
    const tree=trees.find(t=>t.id===id)!;
    if(targetMode){pick(tree);return;}
    if(recipe){commission(tree);return;}
    cancelPlacement();setSelectedTree(id);setCursor(tree);showDetails("tree");
  }
  function findProject(id:string){const site=stateRef.current.sites.find(s=>s.id===id);if(!site)return;cancelPlacement();setCursor(site.at);setRevealedProject(id);setPanelTarget("project");setPanelOpen(true);setFocusRequest(n=>n+1);}
  function inspectPatch(id:string){cancelPlacement();setSelectedPatch(id);setCursor(stateRef.current.patches.find(p=>p.id===id)!.at);setTool("gather");showDetails("gather");}
  function planHome(){
    if(locked.current)return;
    const builder=selectedIds.length===1?stateRef.current.birds.find(b=>b.id===selectedIds[0]):null;
    if(!builder||actorBlock(builder)){setNotice(builder?`${builder.life.name}: ${actorBlock(builder)}.`:"Select one builder for a new building.");setActionFailed(true);return;}
    cancelPlacement();setHomeBuilder(builder.id);setPanelTarget("catalog");setPanelOpen(true);setFocusRequest(n=>n+1);
  }
  function startTarget(kind:"move"|"gather"|"build"){
    if(locked.current)return;
    if(!selectedIds.length){setNotice("Select a chicken before giving an order.");setActionFailed(true);return;}
    cancelPlacement();focusGame();setPanelOpen(false);setTargetMode(kind);setActionFailed(false);setNotice(`Choose ${kind==="move"?"ground":kind==="gather"?"a reed patch":"an unfinished project"} for the selected chickens.`);
  }
  function issueOrder(order:DirectOrder,queue=false){
    if(locked.current)return;
    const ids=selectedIds;
    if(!ids.length){setNotice("Select a chicken before giving an order.");setActionFailed(true);return;}
    const moves=order.kind==="move"?groupMoveOrders(stateRef.current,ids,order.at):null;
    let next=stateRef.current;const messages:string[]=[];let accepted=0;
    for(const id of [...ids].sort()){
      const actor=next.birds.find(b=>b.id===id);if(!actor)continue;
      const actual=moves?.get(id)??order;
      try{next=command(next,{type:"direct",bird:id,order:actual,queue:queue||queueOrder});accepted++;messages.push(`${actor.life.name}: ${(queue||queueOrder)?"queued":"accepted"} ${directOrderLabel(next,actual)}${next.paused?" · paused":` · ${directStatus(next,next.birds.find(b=>b.id===id)!)}`}.`);}
      catch(cause){messages.push(cause instanceof Error?cause.message:`${actor.life.name}: order rejected.`);}
    }
    if(accepted){display(next);if(!saveFailed.current)void save(next);}
    setNotice(messages.join(" "));setActionFailed(accepted===0);if(accepted){setTargetMode(null);focusGame();}
  }
  function targetMiss(reason:GroundPickMiss,context:boolean){
    if(!targetMode&&(!context||!selectedIds.length))return;
    const names=selectedIds.map(id=>stateRef.current.birds.find(b=>b.id===id)?.life.name).filter(Boolean).join(" · ");
    const place=stateRef.current.world?"valley":"clearing";
    setNotice(`${names?`${names}: `:""}${reason==="no-ground"?"No ground at that point. ":""}Choose ground inside the ${place}.`);
    setActionFailed(true);
  }
  function contextOrder(at:Cell,queue=false){
    if(targetMode){pick(at,queue);return;}
    const current=stateRef.current;const patch=current.patches.find(p=>p.at.x===at.x&&p.at.z===at.z);
    const site=current.sites.find(s=>!s.complete&&s.at.x===at.x&&s.at.z===at.z);
    if(patch){issueOrder({kind:"gather",target:patch.id},queue);return;}
    if(site){issueOrder({kind:"build",target:site.id},queue);return;}
    issueOrder({kind:"move",at},queue);
  }
  function pick(at:Cell,queue=false){
    setCursor(at);
    if(targetMode){
      const patch=stateRef.current.patches.find(p=>p.at.x===at.x&&p.at.z===at.z);
      const site=stateRef.current.sites.find(s=>!s.complete&&((s.at.x===at.x&&s.at.z===at.z)||(groundAccess(s.at,stateRef.current).x===at.x&&groundAccess(s.at,stateRef.current).z===at.z)));
      if(targetMode==="move")issueOrder({kind:"move",at},queue);
      else if(targetMode==="gather"&&patch)issueOrder({kind:"gather",target:patch.id},queue);
      else if(targetMode==="build"&&site)issueOrder({kind:"build",target:site.id},queue);
      else{setNotice(`Choose ${targetMode==="gather"?"a marked reed patch":"an unfinished project"}.`);setActionFailed(true);}
      return;
    }
    if(recipe){commission(at);return;}
    const patch=stateRef.current.patches.find(p=>p.at.x===at.x&&p.at.z===at.z);
    if(patch){inspectPatch(patch.id);return;}
    const site=stateRef.current.sites.find(s=>s.at.x===at.x&&s.at.z===at.z);
    if(site){findProject(site.id);return;}
    const tree=trees.find(t=>t.x===at.x&&t.z===at.z);
    if(tree){selectTree(tree.id);return;}
    if(tool==="forage"){const place=stateRef.current.forage.find(p=>p.at.x===at.x&&p.at.z===at.z);if(place)setSelectedForage(place.id);showDetails("forage");}
    else setPanelOpen(false);
  }
  const bird = state.birds.find((b) => b.id === selected)??state.birds[0];
  const forecast = populationReadout(state);
  const sheltered=trees.reduce((n,t)=>n+shelteredCapacity(state,t.id),0);
  const localFood=state.economy.nurseries.reduce((n,p)=>({staple:n.staple+p.food.staple,protein:n.protein+p.food.protein}),{staple:0,protein:0});
  const hasHome = state.sites.some(s=>s.kind==="treehouse");
  const reeds=reedSupply(state);
  const budget=constructionBudget(state);
  const project=state.sites.find(s=>s.id===revealedProject);
  const focus=constructionFocusReadout(state);
  const requestTarget=panelOpen&&panelTarget==="bird"&&bird.request?requestPlace(state,bird.request):null;
  const highlighted=requestTarget?.at??cursor;
  function selectGroup(ids:string[],add=false){
    const next=recallGroup(add?Array.from(new Set([...selectedIds,...ids])):ids,stateRef.current);
    cancelPlacement();focusGame();setSelectedIds(next);setPanelOpen(false);setNotice("");setActionFailed(false);
    if(next.length){setSelected(next.at(-1)!);setTool("inspect");}
  }
  function chooseBird(id:SettlerId,add=false){
    if(add&&selectedIds.includes(id)){selectGroup(selectedIds.filter(x=>x!==id));return;}
    selectGroup([id],add);
  }
  function inspectBird(id:SettlerId){setSelected(id);showDetails("bird");}
  function selectHelper(id:SettlerId){setSelected(id);setSelectedIds([id]);}
  function cycleAwaiting(){
    const awaiting=awaitingOrderBirds(stateRef.current);
    if(!awaiting.length){setNotice("No available adults are awaiting direct orders right now.");setActionFailed(false);return;}
    const index=awaiting.findIndex(b=>b.id===selectedIds[0]);
    const next=awaiting[(index+1)%awaiting.length];selectGroup([next.id]);
    setNotice(`${next.life.name} is awaiting orders · ${awaiting.length} available ${awaiting.length===1?"adult":"adults"}.`);
  }
  function useControlGroup(group:number,assign=false){
    if(assign){
      if(!selectedIds.length){setNotice("Select chickens before assigning a control group.");return;}
      setControlGroups(current=>({...current,[group]:[...selectedIds]}));
      setNotice(`Group ${group}: ${selectedIds.map(id=>stateRef.current.birds.find(b=>b.id===id)?.life.name).join(" · ")}. Kept for this play session.`);return;
    }
    const ids=recallGroup(controlGroups[group]??[],stateRef.current);
    if(!ids.length){setNotice(`Group ${group} is empty. Select chickens, then press Shift + ${group} to assign it for this play session.`);return;}
    selectGroup(ids);
  }
  function groupAction(type:"stop"|"community"){
    if(locked.current)return;
    const ids=selectedIds;
    if(!ids.length){setNotice("Select a chicken before giving an order.");setActionFailed(true);return;}let next=stateRef.current;const messages:string[]=[];let accepted=0;
    for(const id of [...ids].sort()){try{next=command(next,{type,bird:id});accepted++;messages.push(`${next.birds.find(b=>b.id===id)!.life.name}: ${type==="stop"?"Stop accepted; awaiting orders, retaining held goods":"returning to community work"}.`);}catch(cause){messages.push(cause instanceof Error?cause.message:"Order rejected.");}}
    if(accepted){display(next);if(!saveFailed.current)void save(next);}
    setNotice(messages.join(" "));setActionFailed(!accepted);setTargetMode(null);
  }
  useEffect(()=>{const handler=(event:KeyboardEvent)=>{
    const target=event.target instanceof Element?event.target:null;
    const action=commandShortcut(event.key,{gameFocused:!!target&&!!gameRoot.current?.contains(target),editing:!!target?.closest("input,textarea,select,form,[contenteditable]:not([contenteditable='false']),[role='dialog']"),control:event.ctrlKey,meta:event.metaKey,alt:event.altKey,shift:event.shiftKey},event.code);
    if(!action||event.repeat)return;
    if(controlsOpen){if(action==="cancel"){event.preventDefault();setControlsOpen(false);focusGame();}return;}
    if(action==="cancel"){
      event.preventDefault();
      if(targetMode||recipe){cancelPlacement();setPanelOpen(false);setNotice("");}
      else if(panelOpen)setPanelOpen(false);
      else selectGroup([]);
      return;
    }
    if(panelOpen&&panelTarget===null)return;
    event.preventDefault();
    if(typeof action==="object")useControlGroup(action.group,action.assign);
    else if(action==="awaiting")cycleAwaiting();
    else if(action==="building")planHome();
    else if(action==="stop")groupAction("stop");
    else startTarget(action);
  };window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);});
  function openFood(site?:string){setSelectedNursery(site??null);setTool(site?"inspect":"forage");setSelectedForage(null);showDetails("food");}
  function chooseFreeChicken(){const free=state.birds.find(b=>b.life.stage==="adult"&&!b.care&&!b.request);if(free)chooseBird(free.id);}
  const foodPlace=(id:string)=>{
    const place=state.forage.find(p=>p.id===id)!;
    return <article className="food-place" key={id}>
      <h3>{foodName(id)}</h3><p>{place.remaining} food here · {place.open?"chickens may forage":"foraging stopped"}</p>
      <button disabled={busy||!ready} onClick={()=>act({type:"forage",id,open:!place.open})}>{place.open?"Stop foraging here":"Let chickens forage"}</button>
    </article>;
  };
  return <div className={`shell${selectedIds.length?" has-selection":""}`} ref={gameRoot} tabIndex={-1}>
    <header className="site-header">
      <h1 title={name}>{state.world ? "chicken civ" : "coop chaos"}<span>.</span></h1>
      <div className="header-actions">
        <span className="phase-label">Day {state.economy.clock.day} · {state.phase==="day"?"Daylight":"Night"}</span>
        <button disabled={!ready||busy} onClick={()=>act({type:"speed",speed:state.economy.clock.speed===1?4:1})} aria-label="Change simulation speed">{state.economy.clock.speed}× time</button>
        <button disabled={!ready||busy} onClick={()=>act({type:"pause"})}>{state.paused?"Resume":"Pause"}</button>
        <button className="build-command" aria-expanded={panelOpen&&panelTarget==="catalog"&&!homeBuilder} onClick={openCatalog}>Community building</button>
        <button aria-expanded={controlsOpen} onClick={()=>setControlsOpen(!controlsOpen)}>Controls</button>
        <button aria-expanded={panelOpen&&panelTarget===null} onClick={showMenu}>Menu</button>
      </div>
    </header>
    <main>
      {unsaved&&<div className="save-warning" role="alert"><strong>Unsaved session</strong><span>{storage}</span><button disabled={busy} onClick={()=>void save(stateRef.current)}>Retry save</button><button onClick={()=>download(encodeSettlement(stateRef.current),"coop-chaos-unsaved-session.json")}>Export session</button></div>}
      <div className="economy-strip" aria-label="Settlement resources and capacity">
        <button onClick={()=>{cancelPlacement();setSelectedPatch(null);setTool("gather");showDetails("gather");}}><strong>{reeds.free}</strong> Reeds ready</button>{budget.shortfall>0&&<button onClick={()=>{setSelectedPatch(null);setTool("gather");showDetails("gather");}}>Plans need {budget.shortfall} more {budget.shortfall===1?"reed":"reeds"}</button>}
        <span>{forecast.label}</span><span className="capacity-readout" title={`${forecast.committed} residents and expected young / ${forecast.capacity} reachable adult berths: ${forecast.capacity-sheltered} natural + ${sheltered} sheltered. Includes expected young; this is future adult capacity, not current sleeping occupancy.`}><strong>Future adult places: {forecast.committed} / {forecast.capacity}</strong><small>{forecast.spare<0?`Need ${-forecast.spare} more places`:`${forecast.spare} available for growth`} · includes expected young</small></span>
        {!!state.economy.nurseries.length&&<span><strong>{localFood.staple}</strong> Seeds · <strong>{localFood.protein}</strong> Bugs for chicks</span>}
        <button onClick={()=>openFood()}>Food for chicks</button>
        {focus&&<button className="focus-finder" onClick={()=>findProject(focus.site.id)} aria-label={`Find building first: ${focus.label}`}>Build first · {focus.label}</button>}
      </div>
      <div className="play-layout">
        <Clearing state={state} selected={bird.id} selectedIds={selectedIds} onGroup={selectGroup} onContext={contextOrder} onTargetMiss={targetMiss} targeting={targetMode} onSelect={chooseBird} onPick={pick} onTree={selectTree} onNursery={openFood} onProject={id=>targetMode==="build"?issueOrder({kind:"build",target:id}):findProject(id)}
          homePlacement={!!recipe} placementKind={recipe} selectedPatch={selectedPatch} onPatch={id=>targetMode==="gather"?issueOrder({kind:"gather",target:id}):inspectPatch(id)} onOrder={issueOrder}
          nurseryFocused={panelOpen&&(recipe==="nursery"||panelTarget==="project"&&project?.kind==="nursery"||panelTarget==="food"&&state.economy.nurseries.length>0)}
          onForage={id=>{setSelectedForage(id);setTool("forage");showDetails("forage");}}
          cursor={highlighted} highlight={!!requestTarget||!!recipe||panelOpen&&(panelTarget==="tree"||panelTarget==="gather"&&!!selectedPatch)} tool={tool} onCursor={setCursor}/>
        {!hintDismissed&&!hasHome&&!panelOpen&&!selectedIds.length&&<div className="purpose-hint">
          <button className="dismiss-hint" aria-label="Dismiss hint" onClick={()=>setHintDismissed(true)}>×</button>
          <p>Make a home in the trees. Click a chicken to ask for help.</p>
          <button onClick={()=>chooseRecipe("treehouse")}>Choose a home</button>
        </div>}
        <nav className="primary-tools" aria-label="World tools">
          <button aria-pressed={tool==="inspect"&&!(panelOpen&&(panelTarget==="food"||panelTarget==="catalog"))} onClick={()=>{cancelPlacement();clearInteractionNotice();setPanelOpen(false);}}>Chickens</button>
          <button aria-pressed={tool==="build"||tool==="store"||panelOpen&&panelTarget==="catalog"} onClick={openCatalog}>Community build</button>
          <button aria-pressed={tool==="gather"} onClick={()=>{cancelPlacement();setSelectedPatch(null);setTool("gather");showDetails("gather");}}>Reeds</button>
          <button aria-pressed={tool==="forage"||panelOpen&&panelTarget==="food"} onClick={()=>openFood()}>Food</button>
        </nav>
        <div className="command-area"><div className="session-tools" aria-label="Session selection controls"><button onClick={cycleAwaiting}>Awaiting orders <kbd>I</kbd></button><div className="control-groups" aria-label="Session control groups">{Array.from({length:9},(_,i)=>i+1).map(group=><button key={group} className={controlGroups[group]?.length?"assigned":""} onClick={event=>useControlGroup(group,event.shiftKey)} title={`Group ${group}: ${controlGroups[group]?.map(id=>state.birds.find(b=>b.id===id)?.life.name).join(", ")||"empty"}. Click to recall; Shift-click to assign selection. This play session only.`} aria-label={`Group ${group}${controlGroups[group]?.length?`: ${controlGroups[group].map(id=>state.birds.find(b=>b.id===id)?.life.name).join(", ")}`:": empty"}`}>{group}</button>)}</div></div>
        {selectedIds.length>0&&<CommandDock state={state} ids={selectedIds} targeting={targetMode} queue={queueOrder} disabled={busy} onTarget={startTarget} onStop={()=>groupAction("stop")} onCommunity={()=>groupAction("community")} onBuild={planHome} onQueue={setQueueOrder} onDetails={inspectBird} onClear={()=>selectGroup([])} onCancel={()=>{setTargetMode(null);setNotice("");}}/>}</div>
        {controlsOpen&&<section className="controls-help" aria-label="Game controls"><button className="dismiss-hint" aria-label="Close controls help" onClick={()=>{setControlsOpen(false);focusGame();}}>×</button><h2>Command the coop</h2><p>Click a chicken to select. Shift-click adds or removes; drag across chickens to select a group.</p><p>Right-click ground to move, reeds to gather, or an unfinished project to help build. Shift adds to the order queue.</p><p><kbd>M</kbd> Move · <kbd>G</kbd> Gather · <kbd>B</kbd> New building (one builder) · <kbd>S</kbd> Stop · <kbd>I</kbd> Awaiting orders. Escape cancels targeting before clearing selection.</p><p><kbd>Shift + 1–9</kbd> assigns a group; <kbd>1–9</kbd> recalls it. Or Shift-click/click the group buttons. Groups last this play session; saved orders survive reopening.</p><p>Pan at clear canvas edges, with arrows when the canvas is focused, or middle-button drag. Scroll or use +/− to zoom. Follow is an explicit camera choice.</p><p>Stop holds carried goods. Community work releases direct control. Meals and rest can delay orders.</p></section>}
        {notice&&<p className="world-notice" role={actionFailed?"alert":"status"}>{notice}<button aria-label="Dismiss message" onClick={()=>setNotice("")}>×</button></p>}
        <aside ref={inspector} id="settlement-inspector" className={`inspector field-card${panelOpen?" is-open":""} ${panelTarget??"menu"}-panel`} aria-label="Settlement inspector" hidden={!panelOpen}>
          <button className="close-inspector" onClick={()=>{cancelPlacement();setPanelOpen(false);}}>{recipe?"Cancel placement ×":"Close ×"}</button>
          {notice&&actionFailed&&<p className="action-error" role="alert">{notice}</p>}
          {panelTarget==="catalog"&&<><p>{homeBuilder?`${state.birds.find(b=>b.id===homeBuilder)?.life.name} will build this until complete.`:"Community building · free community adults may build."}</p><BuildCatalog state={state} onChoose={kind=>chooseRecipe(kind,homeBuilder)}/></>}
          {panelTarget==="placement"&&recipe&&<section className="home-placement"><span className="eyebrow">CHOOSE ITS PLACE</span><h2>{buildingNames[recipe]}</h2><p>{cost({kind:recipe})} reeds · select a marked place to commission</p>{homeBuilder&&<p>{state.birds.find(b=>b.id===homeBuilder)?.life.name} will build here until complete.</p>}<p>{state.paused?"Planned until you resume.":state.phase==="evening"?"Work starts in the morning.":"The flock will carry reeds and build here."}</p>{recipe==="store"&&state.world?definition.pads.filter(p=>p.kind==="store").map(p=><button className="placement-choice" key={p.id} disabled={state.sites.some(s=>s.at.x===p.at.x&&s.at.z===p.at.z)} onFocus={()=>setCursor(p.at)} onPointerEnter={()=>setCursor(p.at)} onClick={()=>commission(p.at)}>Commission {p.name}</button>):recipe==="store"?<><p>Choose open ground in the world, or move the cursor with arrow keys and press Enter.</p><button onClick={()=>commission(cursor)}>Commission store here</button></>:trees.map(tree=>{const option=treeBuildOptions(state,tree.id).find(o=>o.kind===recipe)!;return <article key={tree.id}><button className="placement-choice" disabled={!option.available} onFocus={()=>setCursor(tree)} onPointerEnter={()=>setCursor(tree)} onClick={()=>commission(tree)}>Commission at {tree.name}</button>{!option.available&&<p>{option.reason}</p>}</article>;})}<button onClick={()=>{setRecipe(null);setTool("inspect");setPanelTarget("catalog");setFocusRequest(n=>n+1);}}>Back to buildings</button></section>}
          {panelTarget==="bird"&&<BirdInspector state={state} bird={bird} disabled={!ready||busy} onCommand={act} onChooseFree={chooseFreeChicken}/>}
          {panelTarget==="tree"&&<TreeInspector state={state} treeId={selectedTree} onBuild={openCatalog} onProject={findProject}/>}
          {panelTarget==="project"&&project&&<section><span className="eyebrow">{buildingPlace(state,project)}</span>{!project.complete?<ProjectCard state={state} site={project} place={buildingPlace(state,project)} disabled={busy} onCommand={action=>{if(act(action)&&action.type==="cancel"){setPanelTarget("catalog");setRevealedProject(null);}}} onGather={()=>{setSelectedPatch(null);setTool("gather");showDetails("gather");}}/>:<><h2>{buildingNames[project.kind]} ready</h2>{project.kind==="store"?<><p><strong>{project.stock}</strong> / 12 bundles stored here</p><label>Refill from loose reeds to<select aria-label={`Stock target ${project.id}`} value={project.target} onChange={e=>act({type:"stock",id:project.id,target:Number(e.target.value)})}>{[0,4,8,12].map(n=><option key={n}>{n}</option>)}</select></label><p className="action-reason">A minimum refill target, not a cap. Gatherers may deposit here. Builders collect local bundles as needed.</p></>:project.kind==="nursery"?<button onClick={()=>openFood(project.id)}>Care for this brood</button>:<p>Built by {project.contributors.map(id=>state.birds.find(b=>b.id===id)?.life.name).join(", ")||"the community"}.</p>}<button onClick={openCatalog}>Choose another building</button></>}</section>}
          {panelTarget==="food"&&<EconomyInspector state={state} selectedNursery={selectedNursery} onSelectNursery={setSelectedNursery} disabled={busy||!ready} onCommand={act} onBuild={openCatalog}>
            {state.forage.map(p=>foodPlace(p.id))}
          </EconomyInspector>}
          {panelTarget==="forage"&&<section><span className="eyebrow">FOOD PLACES</span><h2>Let chickens eat</h2><p>They find Seeds and Bugs here between jobs.</p>{selectedForage?foodPlace(selectedForage):state.forage.map(p=>foodPlace(p.id))}<button onClick={()=>openFood()}>Food for chicks</button></section>}
          {panelTarget==="gather"&&<SuppliesInspector state={state} patchId={selectedPatch} selected={selected} onPatch={inspectPatch} onCommand={act} onBird={selectHelper} onInspectBird={inspectBird}/>}
          {panelTarget===null&&<section className="menu-content"><h2>{name}</h2>
            <section className="save-tools">
              <p role="status">{storage}</p>
              <div>
                <button disabled={busy} onClick={()=>void returnToTitle()}>Save and return to title</button>
                <button disabled={busy} onClick={()=>void save(stateRef.current)}>Save now</button>
                <button onClick={()=>download(encodeSettlement(stateRef.current),"coop-chaos-settlement.json")}>Export settlement</button>
              </div>
              <p className="quiet">On this device · no offline time elapses. New and Load game are on the title screen.</p>
              {unsaved&&<button onClick={()=>{if(window.confirm("Leave this unsaved session? Your previous saved game stays on this device. Export first to keep your latest work."))onExit();}}>Return without saving</button>}
            </section>
          </section>}
        </aside>
      </div>
    </main>
  </div>;
}
