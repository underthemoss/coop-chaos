import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Clearing } from "../game/Clearing";
import type { Tool } from "../game/Clearing";
import { foodPatches, trees, tuning } from "../content/settlement";
import { EconomyInspector } from "./EconomyInspector";
import { BirdInspector } from "./BirdInspector";
import { ActionArt } from "./ActionArt";
import { TreeInspector } from "./TreeInspector";
import type { TreeId, SettlerId } from "../content/settlement";
import {
  command,
  initialSettlement,
  step,
  growthForecast,
  reedSupply,
  requestPlace,
} from "../simulation/settlement";
import type { Cell, Command, Settlement } from "../simulation/settlement";
import {
  decodeSettlement,
  encodeSettlement,
  legacyArchive,
  loadSettlement,
  saveQueue,
  settlementMigrationNotice,
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
export function App() {
  const [state, setState] = useState(initialSettlement);
  const stateRef = useRef(state);
  const [selected, setSelected] = useState<SettlerId>("fern");
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedForage, setSelectedForage] = useState<string | null>(null);
  const [panelTarget, setPanelTarget] = useState<"bird" | "food" | "forage" | "gather" | "tree" | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [selectedTree, setSelectedTree] = useState<TreeId>("lowfork");
  const inspector = useRef<HTMLElement>(null);
  const [hintDismissed,setHintDismissed] = useState(false);
  function showDetails(target: "bird" | "food" | "forage" | "gather" | "tree") {
    clearInteractionNotice();
    setPanelOpen(true);
    setPanelTarget(target);
    setFocusRequest(n => n + 1);
  }
  function showMenu() {
    clearInteractionNotice();
    setPanelTarget(null);
    setPanelOpen(true);
    setFocusRequest(n => n + 1);
  }
  useEffect(() => {
    if (!panelOpen) return;
    const frame = requestAnimationFrame(() => {
      inspector.current?.scrollTo({top:0});
    });
    return () => cancelAnimationFrame(frame);
  }, [panelOpen, panelTarget, selectedForage, selectedTree, focusRequest]);
  useEffect(()=>{
    const card=inspector.current;
    if(!panelOpen||!card)return;
    const reserve=()=>card.parentElement?.style.setProperty("--card-height",`${card.offsetHeight}px`);
    const observer=new ResizeObserver(reserve);observer.observe(card);reserve();
    return ()=>observer.disconnect();
  },[panelOpen]);
  const [tool, setTool] = useState<Tool>("inspect");
  const [cursor, setCursor] = useState<Cell>({ x: -2, z: 2 });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(true);
  const restoreFailed = useRef(false);
  const [storage, setStorage] = useState("Opening settlement…");
  const [notice, setNotice] = useState("");
  function clearInteractionNotice(){setNotice(current=>/^(Building queued\.|Choose (open ground|a named tree|one of the construction))/.test(current)?"":current);}
  const [archive, setArchive] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  const queue = useRef(saveQueue());
  function display(next: Settlement) {
    stateRef.current = next;
    setState(next);
  }
  async function save(next: Settlement) {
    try {
      await queue.current(next);
      setStorage("Saved on this device");
    } catch {
      setStorage("Device save failed. Export to keep your settlement.");
    }
  }
  useEffect(() => {
    let active = true;
    void Promise.all([loadSettlement(), legacyArchive()])
      .then(([saved, legacy]) => {
        if (active) {
          stateRef.current = saved;
          setState(saved);
          setArchive(legacy);
          setNotice(settlementMigrationNotice(saved)??"");
          setStorage("Settlement restored · no offline time elapsed");
        }
      })
      .catch((cause) => {
        if (active) {
          restoreFailed.current = true;
          setNotice(
            `Could not restore: ${cause instanceof Error ? cause.message : "storage unavailable"}`,
          );
          setStorage(
            "Original device data retained. Export this session before restarting.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setReady(true);
          locked.current = false;
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      if (locked.current || restoreFailed.current || document.hidden) return;
      const previousTick=stateRef.current.tick;
      let next = stateRef.current;
      for(let i=0;i<stateRef.current.economy.clock.speed;i++)next=step(next);
      if (next === stateRef.current) return;
      display(next);
      if (Math.floor(next.tick/10)>Math.floor(previousTick/10)) void save(next);
    }, tuning.stepSeconds * 1000);
    return () => clearInterval(id);
  }, [ready]);
  function act(action: Command) {
    if (!ready || locked.current) return;
    if (restoreFailed.current) {
      setNotice(
        "The device save could not be read. Import a valid settlement or explicitly restart before working; the original is retained.",
      );
      return;
    }
    try {
      const next = command(stateRef.current, action);
      display(next);
      void save(next);
      setNotice(action.type === "build" ? "Building queued. Chickens will bring reeds and weave." : "");
    } catch (cause) {
      setNotice(
        cause instanceof Error
          ? cause.message
          : "That action could not be completed.",
      );
    }
  }
  function selectTree(id: TreeId) {
    const tree = trees.find(t => t.id === id)!;
    setSelectedTree(id);
    setCursor({ x: tree.x, z: tree.z });
    setTool("build");
    showDetails("tree");
  }
  function pick(at: Cell) {
    setCursor({ x: at.x, z: at.z });
    if(tool === "inspect" || tool === "build") {
      const tree = trees.find(t => t.x === at.x && t.z === at.z);
      if (tree) selectTree(tree.id);
      else if (tool === "build") setNotice("Choose a named tree to see its building places.");
      else setPanelOpen(false);
    }
    if(tool === "gather"){
      const patch=stateRef.current.patches.find(p=>p.at.x===at.x&&p.at.z===at.z);
      if(patch)act({type:"gather",id:patch.id,designated:!patch.designated});
      else setNotice("Choose one of the construction reed patches.");
    }
    if (tool === "forage") {
      const place = stateRef.current.forage.find(p => p.at.x === at.x && p.at.z === at.z);
      if (place) setSelectedForage(place.id);
      showDetails("forage");
    }
    if (tool === "store")
      act({ type: "build", kind: tool, at });
  }
  async function replace(next: Settlement, message: string) {
    locked.current = true;
    restoreFailed.current = false;
    setBusy(true);
    setSelected(current=>next.birds.some(b=>b.id===current)?current:next.birds[0].id);
    display(next);
    setPanelOpen(false);setTool("inspect");
    await save(next);
    setNotice(message);
    locked.current = false;
    setBusy(false);
  }
  async function importSave(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    locked.current = true;
    setBusy(true);
    try {
      if (file.size > 262144)
        throw new Error("Save exceeds the 256 KB prototype limit.");
      const next = decodeSettlement(await file.text());
      await replace(
        next,
        "Imported settlement. In-flight work resumes from its saved position. "+(settlementMigrationNotice(next)??""),
      );
    } catch (cause) {
      setNotice(
        `${cause instanceof Error ? cause.message : "Import failed."} Your settlement is unchanged.`,
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const bird = state.birds.find((b) => b.id === selected)??state.birds[0];
  const forecast = growthForecast(state);
  const localFood=state.economy.nurseries.reduce((n,p)=>({staple:n.staple+p.food.staple,protein:n.protein+p.food.protein}),{staple:0,protein:0});
  const hasHome = state.sites.some(s=>s.kind==="treehouse"&&s.complete);
  const reeds=reedSupply(state);
  const requestTarget=panelOpen&&panelTarget==="bird"&&bird.request?requestPlace(state,bird.request):null;
  const highlighted=requestTarget?.at??cursor;
  function chooseBird(id:SettlerId){setSelected(id);setTool("inspect");showDetails("bird");}
  function openFood(){setTool("forage");setSelectedForage(null);showDetails("food");}
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
      <h1>coop chaos<span>.</span></h1>
      <div className="header-actions">
        <span className="phase-label">Day {state.economy.clock.day} · {state.phase==="day"?"Daylight":"Night"}</span>
        <button disabled={!ready||busy} onClick={()=>act({type:"speed",speed:state.economy.clock.speed===1?4:1})} aria-label="Change simulation speed">{state.economy.clock.speed}× time</button>
        <button disabled={!ready||busy} onClick={()=>act({type:"pause"})}>{state.paused?"Resume":"Pause"}</button>
        <button className="build-command" aria-expanded={panelOpen&&panelTarget==="tree"} onClick={()=>selectTree(selectedTree)}>Build</button>
        <button aria-expanded={panelOpen&&panelTarget===null} onClick={showMenu}>Menu</button>
      </div>
    </header>
    <main>
      <div className="economy-strip" aria-label="Settlement resources and capacity">
        <span><strong>{reeds.free}</strong> Reeds ready</span>
        <span><strong>{forecast.adults}/{forecast.capacity}</strong> Sleeping places</span>
        {!!state.economy.nurseries.length&&<span><strong>{localFood.staple}</strong> Seeds · <strong>{localFood.protein}</strong> Bugs for chicks</span>}
        <button onClick={openFood}>Food for chicks</button>
      </div>
      <div className="play-layout">
        <Clearing state={state} selected={bird.id} onSelect={chooseBird} onPick={pick} onTree={selectTree}
          onForage={id=>{setSelectedForage(id);setTool("forage");showDetails("forage");}}
          cursor={highlighted} highlight={!!requestTarget||panelOpen&&panelTarget==="tree"} tool={tool} onCursor={setCursor}/>
        {!hintDismissed&&!hasHome&&!panelOpen&&<div className="purpose-hint">
          <button className="dismiss-hint" aria-label="Dismiss hint" onClick={()=>setHintDismissed(true)}>×</button>
          <p>Make a home in the trees. Click a chicken to ask for help.</p>
          <button onClick={()=>selectTree("lowfork")}>Choose a home</button>
        </div>}
        <nav className="primary-tools" aria-label="World tools">
          <button aria-pressed={tool==="inspect"} onClick={()=>{clearInteractionNotice();setTool("inspect");setPanelOpen(false);}}>Chickens</button>
          <button aria-pressed={tool==="build"||tool==="store"} onClick={()=>selectTree(selectedTree)}>Build</button>
          <button aria-pressed={tool==="gather"} onClick={()=>{setTool("gather");showDetails("gather");}}>Reeds</button>
          <button aria-pressed={tool==="forage"} onClick={openFood}>Food</button>
        </nav>
        {notice&&<p className="world-notice" role="alert">{notice}<button aria-label="Dismiss message" onClick={()=>setNotice("")}>×</button></p>}
        <aside ref={inspector} id="settlement-inspector" className={`inspector field-card${panelOpen?" is-open":""} ${panelTarget??"menu"}-panel`} aria-label="Settlement inspector" hidden={!panelOpen}>
          <button className="close-inspector" onClick={()=>setPanelOpen(false)}>Close ×</button>
          {panelTarget==="bird"&&<BirdInspector state={state} bird={bird} disabled={!ready||busy} onCommand={act} onChooseFree={chooseFreeChicken} onBuild={()=>selectTree(selectedTree)}/>}
          {panelTarget==="tree"&&<TreeInspector state={state} treeId={selectedTree} disabled={!ready||busy} onSelect={selectTree} onCommand={act} onGather={chooseGatherer} onFood={openFood}>
            <article className="ground-build"><button className="action-tile" disabled={busy||!ready} onClick={()=>{setTool("store");setNotice("Choose open ground for the store nest. Arrow keys and Enter also work.");}}><ActionArt kind="store"/><span><strong>Place store nest</strong><small>4 reeds · holds 12 bundles</small></span></button>
              {tool==="store"&&<div className="cell-controls"><label>Across<select aria-label="Cell X" value={cursor.x} onChange={e=>setCursor({...cursor,x:Number(e.target.value)})}>{Array.from({length:9},(_,i)=>i-4).map(n=><option key={n}>{n}</option>)}</select></label><label>Along<select aria-label="Cell Z" value={cursor.z} onChange={e=>setCursor({...cursor,z:Number(e.target.value)})}>{Array.from({length:7},(_,i)=>i-3).map(n=><option key={n}>{n}</option>)}</select></label><button disabled={busy||!ready} onClick={()=>pick(cursor)}>Build store here</button></div>}
            </article>
            {state.sites.filter(s=>s.complete&&s.kind==="store").map(store=><article className="food-place" key={store.id}><h3>Store nest</h3><p>{store.stock} reeds here</p><label>Keep stocked to <select aria-label={`Stock target ${store.id}`} value={store.target} onChange={e=>act({type:"stock",id:store.id,target:Number(e.target.value)})}>{[0,4,8,12].map(n=><option key={n}>{n}</option>)}</select></label></article>)}
          </TreeInspector>}
          {panelTarget==="food"&&<EconomyInspector state={state} disabled={busy||!ready} onCommand={act} onBuild={()=>selectTree(selectedTree)} onSelectBird={chooseBird}>
            <details><summary>Food places</summary>{state.forage.map(p=>foodPlace(p.id))}</details>
          </EconomyInspector>}
          {panelTarget==="forage"&&<section><span className="eyebrow">FOOD PLACES</span><h2>Let chickens eat</h2><p>They find Seeds and Bugs here between jobs.</p>{selectedForage?foodPlace(selectedForage):state.forage.map(p=>foodPlace(p.id))}<button onClick={openFood}>Food for chicks</button></section>}
          {panelTarget==="gather"&&<section><span className="eyebrow">BUILDING SUPPLIES</span><h2>Gather reeds</h2><p>Ask one chicken for a trip, or let the flock gather between jobs.</p><button onClick={chooseGatherer}>Ask {bird.life.name} for one trip</button>{state.patches.map(p=><article className="food-place" key={p.id}><h3>{p.id==="patch-west"?"West reeds":"East reeds"}</h3><p>{p.remaining} ready · {p.designated?"flock gathering":"not gathering"}</p><button disabled={!ready||busy} onClick={()=>act({type:"gather",id:p.id,designated:!p.designated})}>{p.designated?"Stop flock gathering":"Let the flock gather"}</button></article>)}<details><summary>Where the reeds are</summary><p>{reeds.free} free · {reeds.reserved} reserved for trips · {reeds.carried} carried · {reeds.delivered} delivered to buildings · {state.consumed} woven into finished buildings</p></details></section>}
          {panelTarget===null&&<section className="menu-content"><h2>Menu</h2>
            <section className="save-tools">
              <p role="status">{storage}</p>
              <div>
                <button
                  disabled={!ready || busy}
                  onClick={() =>
                    download(
                      encodeSettlement(stateRef.current),
                      "coop-chaos-settlement.json",
                    )
                  }
                >
                  Export settlement
                </button>
                <button
                  disabled={!ready || busy}
                  onClick={() => fileInput.current?.click()}
                >
                  Import settlement
                </button>
                <button
                  disabled={!ready || busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Restart this settlement? Export first to keep it.",
                      )
                    )
                      void replace(
                        initialSettlement(),
                        "Started a fresh settlement.",
                      );
                  }}
                >
                  Restart
                </button>
                {archive && (
                  <button
                    onClick={() =>
                      download(archive, "coop-chaos-first-evening.json")
                    }
                  >
                    Export archived story
                  </button>
                )}
              </div>
              <input
                hidden
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                onChange={(e) => void importSave(e)}
              />
              <p className="quiet">
                Saved on this device. No offline time elapses.
              </p>
            </section>

          </section>}
        </aside>
      </div>
    </main>
  </div>;
}
