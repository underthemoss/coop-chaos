import { useEffect, useRef, useState } from "react";
import { Clearing } from "../game/Clearing";
import type { Tool } from "../game/Clearing";
import { foodPatches, trees, tuning } from "../content/settlement";
import { EconomyInspector } from "./EconomyInspector";
import { BirdInspector } from "./BirdInspector";
import { ActionArt } from "./ActionArt";
import { TreeInspector } from "./TreeInspector";
import { latestSave } from "./save-status";
import { ProjectCard } from "./ProjectCard";
import type { TreeId, SettlerId } from "../content/settlement";
import {
  command,
  step,
  populationReadout,
  reedSupply,
  requestPlace,
  treeBuildOptions,
  cost,
  constructionFocusReadout,
} from "../simulation/settlement";
import type { Cell, Command, Settlement } from "../simulation/settlement";
import {
  encodeSettlement,
} from "../persistence/settlement-save";
const foodName = (id: string) => foodPatches.find(p => p.id === id)?.name ?? id;
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
  const stateRef = useRef(state);
  const [selected, setSelected] = useState<SettlerId>("fern");
  const [panelOpen, setPanelOpen] = useState(false);
  const [revealedProject, setRevealedProject] = useState<string | null>(null);
  const [selectedNursery,setSelectedNursery]=useState<string|null>(null);
  const [selectedForage, setSelectedForage] = useState<string | null>(null);
  const [panelTarget, setPanelTarget] = useState<"bird" | "food" | "forage" | "gather" | "tree" | "placement" | null>(null);
  const [homeBuilder,setHomeBuilder]=useState<SettlerId|null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [selectedTree, setSelectedTree] = useState<TreeId>("lowfork");
  const inspector = useRef<HTMLElement>(null);
  const [hintDismissed,setHintDismissed] = useState(false);
  function showDetails(target: "bird" | "food" | "forage" | "gather" | "tree") {
    setHomeBuilder(null);
    clearInteractionNotice();
    setPanelOpen(true);
    setPanelTarget(target);
    setFocusRequest(n => n + 1);
  }
  function showMenu() {
    setHomeBuilder(null);
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
  const [cursor, setCursor] = useState<Cell>({ x: -2, z: 2 });
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
  function selectTree(id: TreeId,place=true) {
    setRevealedProject(null);
    const tree = trees.find(t => t.id === id)!;
    if(place&&homeBuilder&&!act({type:"build",kind:"treehouse",at:tree,bird:homeBuilder}))return;
    setSelectedTree(id);
    setCursor({ x: tree.x, z: tree.z });
    setTool("build");
    showDetails("tree");
  }
  function findProject(id: string) {
    const site=stateRef.current.sites.find(s=>s.id===id&&!s.complete);
    if(!site)return;
    selectTree(site.tree??selectedTree,false);
    setCursor(site.at);setRevealedProject(site.id);
  }
  function planHome() {
    setHomeBuilder(selected);setTool("build");setNotice("");setActionFailed(false);setPanelOpen(true);setPanelTarget("placement");setFocusRequest(n=>n+1);
  }
  function pick(at: Cell) {
    setCursor({ x: at.x, z: at.z });
    if(tool === "inspect" || tool === "build") {
      const tree = trees.find(t => t.x === at.x && t.z === at.z);
      if (tree) selectTree(tree.id);
      else if (tool === "build") {setActionFailed(false);setNotice("Choose a named tree to see its building places.");}
      else setPanelOpen(false);
    }
    if(tool === "gather"){
      const patch=stateRef.current.patches.find(p=>p.at.x===at.x&&p.at.z===at.z);
      if(patch)act({type:"gather",id:patch.id,designated:!patch.designated});
      else {setActionFailed(false);setNotice("Choose one of the construction reed patches.");}
    }
    if (tool === "forage") {
      const place = stateRef.current.forage.find(p => p.at.x === at.x && p.at.z === at.z);
      if (place) setSelectedForage(place.id);
      showDetails("forage");
    }
    if (tool === "store")
      act({ type: "build", kind: tool, at });
  }
  const bird = state.birds.find((b) => b.id === selected)??state.birds[0];
  const forecast = populationReadout(state);
  const localFood=state.economy.nurseries.reduce((n,p)=>({staple:n.staple+p.food.staple,protein:n.protein+p.food.protein}),{staple:0,protein:0});
  const hasHome = state.sites.some(s=>s.kind==="treehouse");
  const reeds=reedSupply(state);
  const focus=constructionFocusReadout(state);
  const requestTarget=panelOpen&&panelTarget==="bird"&&bird.request?requestPlace(state,bird.request):null;
  const highlighted=requestTarget?.at??cursor;
  function chooseBird(id:SettlerId){setSelected(id);setTool("inspect");showDetails("bird");}
  function openFood(site?:string){setSelectedNursery(site??null);setTool(site?"inspect":"forage");setSelectedForage(null);showDetails("food");}
  function chooseGatherer(){setTool("inspect");showDetails("bird");}
  function chooseFreeChicken(){const free=state.birds.find(b=>b.life.stage==="adult"&&!b.care&&!b.request);if(free)chooseBird(free.id);}
  const foodPlace=(id:string)=>{
    const place=state.forage.find(p=>p.id===id)!;
    return <article className="food-place" key={id}>
      <h3>{foodName(id)}</h3><p>{place.remaining} food here · {place.open?"chickens may forage":"foraging stopped"}</p>
      <button disabled={busy||!ready} onClick={()=>act({type:"forage",id,open:!place.open})}>{place.open?"Stop foraging here":"Let chickens forage"}</button>
    </article>;
  };
  return <div className="shell">
    <header className="site-header">
      <h1 title={name}>coop chaos<span>.</span></h1>
      <div className="header-actions">
        <span className="phase-label">Day {state.economy.clock.day} · {state.phase==="day"?"Daylight":"Night"}</span>
        <button disabled={!ready||busy} onClick={()=>act({type:"speed",speed:state.economy.clock.speed===1?4:1})} aria-label="Change simulation speed">{state.economy.clock.speed}× time</button>
        <button disabled={!ready||busy} onClick={()=>act({type:"pause"})}>{state.paused?"Resume":"Pause"}</button>
        <button className="build-command" aria-expanded={panelOpen&&panelTarget==="tree"} onClick={()=>selectTree(selectedTree,false)}>Build</button>
        <button aria-expanded={panelOpen&&panelTarget===null} onClick={showMenu}>Menu</button>
      </div>
    </header>
    <main>
      {unsaved&&<div className="save-warning" role="alert"><strong>Unsaved session</strong><span>{storage}</span><button disabled={busy} onClick={()=>void save(stateRef.current)}>Retry save</button><button onClick={()=>download(encodeSettlement(stateRef.current),"coop-chaos-unsaved-session.json")}>Export session</button></div>}
      <div className="economy-strip" aria-label="Settlement resources and capacity">
        <span><strong>{reeds.free}</strong> Reeds ready</span>
        <span>{forecast.label}</span><span><strong>{forecast.committed}/{forecast.capacity}</strong> future places</span>
        {!!state.economy.nurseries.length&&<span><strong>{localFood.staple}</strong> Seeds · <strong>{localFood.protein}</strong> Bugs for chicks</span>}
        <button onClick={()=>openFood()}>Food for chicks</button>
        {focus&&<button className="focus-finder" onClick={()=>findProject(focus.site.id)} aria-label={`Find building first: ${focus.label}`}>Build first · {focus.label}</button>}
      </div>
      <div className="play-layout">
        <Clearing state={state} selected={bird.id} onSelect={chooseBird} onPick={pick} onTree={selectTree} onNursery={openFood} onProject={findProject}
          homePlacement={!!homeBuilder}
          onForage={id=>{setSelectedForage(id);setTool("forage");showDetails("forage");}}
          cursor={highlighted} highlight={!!requestTarget||panelOpen&&panelTarget==="tree"} tool={tool} onCursor={setCursor}/>
        {!hintDismissed&&!hasHome&&!panelOpen&&<div className="purpose-hint">
          <button className="dismiss-hint" aria-label="Dismiss hint" onClick={()=>setHintDismissed(true)}>×</button>
          <p>Make a home in the trees. Click a chicken to ask for help.</p>
          <button onClick={()=>selectTree("lowfork")}>Choose a home</button>
        </div>}
        <nav className="primary-tools" aria-label="World tools">
          <button aria-pressed={tool==="inspect"&&!(panelOpen&&panelTarget==="food")} onClick={()=>{setHomeBuilder(null);clearInteractionNotice();setTool("inspect");setPanelOpen(false);}}>Chickens</button>
          <button aria-pressed={tool==="build"||tool==="store"} onClick={()=>selectTree(selectedTree,false)}>Build</button>
          <button aria-pressed={tool==="gather"} onClick={()=>{setTool("gather");showDetails("gather");}}>Reeds</button>
          <button aria-pressed={tool==="forage"||panelOpen&&panelTarget==="food"} onClick={()=>openFood()}>Food</button>
        </nav>
        {notice&&<p className="world-notice" role={actionFailed?"alert":"status"}>{notice}<button aria-label="Dismiss message" onClick={()=>setNotice("")}>×</button></p>}
        <aside ref={inspector} id="settlement-inspector" className={`inspector field-card${panelOpen?" is-open":""} ${panelTarget??"menu"}-panel`} aria-label="Settlement inspector" hidden={!panelOpen}>
          <button className="close-inspector" onClick={()=>{if(homeBuilder)setTool("inspect");setHomeBuilder(null);setPanelOpen(false);}}>{homeBuilder?"Cancel placement ×":"Close ×"}</button>
          {notice&&actionFailed&&<p className="action-error" role="alert">{notice}</p>}
          {panelTarget==="placement"&&homeBuilder&&<section className="home-placement"><span className="eyebrow">CHOOSE A TREE</span><h2>Build a home</h2><p>{cost({kind:"treehouse"})} reeds · 2 sleeping places</p><p>{state.birds.find(b=>b.id===homeBuilder)?.life.name} will help with one task. The flock carries on building.</p>{trees.map(tree=>{const option=treeBuildOptions(state,tree.id).find(o=>o.kind==="treehouse")!;return <article className="placement-choice" key={tree.id}><button className="action-tile" disabled={!ready||busy||!option.available} onClick={()=>selectTree(tree.id)}><ActionArt kind="home"/><span><strong>Build at {tree.name}</strong><small>{option.available?state.paused?"Planned until you resume":state.phase==="evening"?"Starts in the morning":"Start here":option.reason}</small></span></button></article>;})}</section>}
          {panelTarget==="bird"&&<BirdInspector state={state} bird={bird} disabled={!ready||busy} onCommand={act} onChooseFree={chooseFreeChicken} onBuild={planHome}/>}
          {panelTarget==="tree"&&<TreeInspector state={state} treeId={selectedTree} disabled={!ready||busy} onSelect={selectTree} onCommand={act} onGather={chooseGatherer} revealOther={!!revealedProject&&state.sites.some(s=>s.id===revealedProject&&s.kind==="store")} onFood={()=>openFood(state.economy.nurseries.find(n=>state.sites.find(s=>s.id===n.site)?.tree===selectedTree)?.site)}>
            {state.sites.filter(s=>!s.complete&&s.kind==="store").map(site=><ProjectCard key={site.id} state={state} site={site} place={`ground (${site.at.x}, ${site.at.z})`} disabled={!ready||busy} onCommand={act} onGather={chooseGatherer}/>)}
            <article className="ground-build"><button className="action-tile" disabled={busy||!ready} onClick={()=>{setTool("store");setActionFailed(false);setNotice("Choose open ground for the store nest. Arrow keys and Enter also work.");}}><ActionArt kind="store"/><span><strong>Place store nest</strong><small>4 reeds · holds 12 bundles</small></span></button>
              {tool==="store"&&<div className="cell-controls"><label>Across<select aria-label="Cell X" value={cursor.x} onChange={e=>setCursor({...cursor,x:Number(e.target.value)})}>{Array.from({length:9},(_,i)=>i-4).map(n=><option key={n}>{n}</option>)}</select></label><label>Along<select aria-label="Cell Z" value={cursor.z} onChange={e=>setCursor({...cursor,z:Number(e.target.value)})}>{Array.from({length:7},(_,i)=>i-3).map(n=><option key={n}>{n}</option>)}</select></label><button disabled={busy||!ready} onClick={()=>pick(cursor)}>Build store here</button></div>}
            </article>
            {state.sites.filter(s=>s.complete&&s.kind==="store").map(store=><article className="food-place" key={store.id}><h3>Store nest</h3><p>{store.stock} reeds here</p><label>Keep stocked to <select aria-label={`Stock target ${store.id}`} value={store.target} onChange={e=>act({type:"stock",id:store.id,target:Number(e.target.value)})}>{[0,4,8,12].map(n=><option key={n}>{n}</option>)}</select></label></article>)}
          </TreeInspector>}
          {panelTarget==="food"&&<EconomyInspector state={state} selectedNursery={selectedNursery} onSelectNursery={setSelectedNursery} disabled={busy||!ready} onCommand={act} onBuild={()=>selectTree(selectedTree)}>
            {state.forage.map(p=>foodPlace(p.id))}
          </EconomyInspector>}
          {panelTarget==="forage"&&<section><span className="eyebrow">FOOD PLACES</span><h2>Let chickens eat</h2><p>They find Seeds and Bugs here between jobs.</p>{selectedForage?foodPlace(selectedForage):state.forage.map(p=>foodPlace(p.id))}<button onClick={()=>openFood()}>Food for chicks</button></section>}
          {panelTarget==="gather"&&<section><span className="eyebrow">BUILDING SUPPLIES</span><h2>Gather reeds</h2><p>Ask one chicken for a trip, or let the flock gather between jobs.</p><button onClick={chooseGatherer}>Ask {bird.life.name} for one trip</button>{state.patches.map(p=><article className="food-place" key={p.id}><h3>{p.id==="patch-west"?"West reeds":"East reeds"}</h3><p>{p.remaining} ready · {p.designated?"flock gathering":"not gathering"}</p><button disabled={!ready||busy} onClick={()=>act({type:"gather",id:p.id,designated:!p.designated})}>{p.designated?"Stop flock gathering":"Let the flock gather"}</button></article>)}<details><summary>Where the reeds are</summary><p>{reeds.free} free · {reeds.reserved} reserved for trips · {reeds.carried} carried · {reeds.delivered} delivered to buildings · {state.consumed} woven into finished buildings</p></details></section>}
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
