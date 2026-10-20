import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Clearing } from "../game/Clearing";
import type { Tool } from "../game/Clearing";
import { foodPatches, trees, tuning, economyTuning } from "../content/settlement";
import { EconomyInspector } from "./EconomyInspector";
import { TreeInspector } from "./TreeInspector";
import type { TreeId, SettlerId } from "../content/settlement";
import {
  command,
  conserved,
  cost,
  initialSettlement,
  key,
  siteStatus,
  step,
  patchStatus,
  forageStatus,
  growthForecast,
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
  const [panelTarget, setPanelTarget] = useState<"forage" | "tree" | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [selectedTree, setSelectedTree] = useState<TreeId>("lowfork");
  const inspector = useRef<HTMLElement>(null);
  const treeSection = useRef<HTMLDivElement>(null);
  const forageSection = useRef<HTMLElement>(null);
  function showDetails(target: "forage" | "tree") {
    setPanelOpen(true);
    setPanelTarget(target);
    setFocusRequest(n => n + 1);
  }
  function showMenu() {
    setPanelTarget(null);
    setPanelOpen(true);
    setFocusRequest(n => n + 1);
  }
  useEffect(() => {
    if (!panelOpen) return;
    const frame = requestAnimationFrame(() => {
      if (!panelTarget) { inspector.current?.scrollTo({top:0}); return; }
      const target = panelTarget === "tree" ? treeSection.current :
        (selectedForage ? document.getElementById(`food-${selectedForage}`) : forageSection.current);
      target?.scrollIntoView({block: panelTarget === "tree" || panelTarget === "forage" && !selectedForage ? "start" : "nearest"});
      target?.focus({preventScroll: true});
    });
    return () => cancelAnimationFrame(frame);
  }, [panelOpen, panelTarget, selectedForage, selectedTree, focusRequest]);
  const [tool, setTool] = useState<Tool>("inspect");
  const [cursor, setCursor] = useState<Cell>({ x: -2, z: 2 });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(true);
  const restoreFailed = useRef(false);
  const [storage, setStorage] = useState("Opening settlement…");
  const [notice, setNotice] = useState("");
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
      setNotice("");
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
      else {setPanelTarget(null);setPanelOpen(true);}
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
  return (
    <div className="shell">
      <header className="site-header">
        <h1>
          coop chaos<span>.</span>
        </h1>
        <span className="edition">GROUND WORK. CANOPY DREAMS.</span>
        <div className="header-actions"><span className="phase-label">Cycle {state.economy.clock.day} · {state.phase === "day" ? "Day" : "Evening"} · {Math.ceil(((state.phase==="day"?economyTuning.dayTicks:economyTuning.eveningTicks)-state.economy.clock.phaseTick)*tuning.stepSeconds)}s · {state.birds.length} chickens</span>
        <button disabled={!ready||busy} onClick={()=>act({type:"speed",speed:state.economy.clock.speed===1?4:1})} aria-label="Change simulation speed">{state.economy.clock.speed}× time</button>
        <button disabled={!ready||busy} onClick={()=>act({type:"pause"})}>{state.paused?"Resume work":"Pause work"}</button>
        <button className="build-command" aria-expanded={panelOpen&&panelTarget==="tree"} aria-controls="settlement-inspector" onClick={()=>selectTree(selectedTree)}>Build</button>
        <button aria-expanded={panelOpen&&panelTarget!=="tree"} aria-controls="settlement-inspector" onClick={showMenu}>Menu</button></div>
      </header>
      <main>
        <div className="economy-strip" aria-label="Settlement resources and capacity">
          <span><strong>{conserved(state)-state.consumed}</strong> reeds available</span>
          <span><strong>{localFood.staple}</strong> staple · <strong>{localFood.protein}</strong> protein stored</span>
          <span><strong>{forecast.committed}/{forecast.capacity}</strong> future adult berths</span>
          <span>{forecast.adults} adults · {forecast.carers} caring · {state.economy.priority} work</span>
          <button onClick={showMenu}>Food & brood</button>
        </div>
        <div className="play-layout">
          <Clearing
            state={state}
            selected={bird.id}
            onSelect={(id)=>{setSelected(id);setPanelOpen(false);}}
            onPick={pick}
            onTree={selectTree}
            onForage={(id) => { setSelectedForage(id); showDetails("forage"); }}
            cursor={cursor}
            tool={tool}
            onCursor={setCursor}
          />
          <div className="opening-card" hidden={panelOpen}>
            <span className="eyebrow">A LIVING GROVE</span>
            <h2>{hasHome?"Life in the branches":"Beneath Lowfork"}</h2>
            <p>{tool === "inspect" ? (hasHome ? "A woven home awaits its sleepers. Inspect a tree to grow another branch of the settlement, while food deliveries support its young." : "Four individuals, open ground, and branches to return to. Inspect a bird or make room for a woven home.") : tool === "build" ? "Choose a named tree. Inspect its residents and choose what to build." : tool === "store" ? "Four reeds make a local store. Choose open ground; carriers walk there freely." : tool === "forage" ? "The flock finds its own food. Inspect a place to rest it or reopen it." : "Choose a construction reed patch. Material gathering is separate from feeding."}</p>
          </div>
          <nav className="primary-tools" aria-label="World tools">
            {(["inspect","forage","build","gather"] as Tool[]).map(t=><button key={t} aria-pressed={tool===t} onClick={()=>{setTool(t);if(t==="build")selectTree(selectedTree);if(t==="forage") {setSelectedForage(null);showDetails("forage");}}}>{({inspect:"Inspect",forage:"Forage",gather:"Gather reeds",build:"Build",store:"Store"})[t]}</button>)}
          </nav>
          {notice&&<p className="world-notice" role="alert">{notice}</p>}
          <aside ref={inspector} id="settlement-inspector" className={`inspector${panelOpen?" is-open":""}`} aria-label="Settlement inspector" hidden={!panelOpen}>
            <button className="close-inspector" onClick={()=>setPanelOpen(false)}>Close details ×</button>
            {panelTarget === "tree" && <div ref={treeSection} tabIndex={-1}>
              <TreeInspector state={state} treeId={selectedTree} disabled={busy || !ready} onSelect={selectTree} onCommand={act}>
                <article className="ground-build"><h3>Ground structures</h3>
                  <button disabled={busy || !ready} aria-pressed={tool==="store"} onClick={()=>{setTool("store");setNotice("Store nest: choose open ground in the grove, or choose a ground position below.");}}>Place store nest · {cost({kind:"store"})} reeds</button>
                  <p className="quiet">Ground storage holds {tuning.storeCapacity} local reed bundles. Select Place store nest, then choose open ground in the scene.</p>
                  {tool === "store" && <div className="cell-controls">
                    <label>
                      Cell X
                      <select
                        aria-label="Cell X"
                        value={cursor.x}
                        onChange={(e) =>
                          setCursor({ ...cursor, x: Number(e.target.value) })
                        }
                      >
                        {Array.from({ length: 9 }, (_, i) => i - 4).map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Z
                      <select
                        aria-label="Cell Z"
                        value={cursor.z}
                        onChange={(e) =>
                          setCursor({ ...cursor, z: Number(e.target.value) })
                        }
                      >
                        {Array.from({ length: 7 }, (_, i) => i - 3).map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      disabled={tool !== "store" || busy || !ready}
                      onClick={() => pick(cursor)}
                    >
                      Build store at {key(cursor)}
                    </button>
                  </div>}
                </article>
              </TreeInspector>
              <button className="all-controls" onClick={showMenu}>Settlement controls & saves</button>
            </div>}
            <div hidden={panelTarget === "tree"}>
            <EconomyInspector state={state} disabled={busy || !ready} onCommand={act} />
            <section>
              <div className="section-heading">
                <span className="eyebrow">GROVE & COMMONS</span>
                <span>{state.phase === "day" ? "DAY" : "EVENING"}</span>
              </div>
              <h2>The settlement</h2>
              <p className="intro">
                Mark a treehouse and let the flock carry local reeds and weave.
                Chickens walk freely and find food between jobs. Trees already offer
                natural sleeping branches.
              </p>
              <p className="quiet">
                Evening secures existing loads, then birds fly to natural
                branches or climb into woven shelter. Carriers deliver their
                bundles before taking a feeding break.
              </p>
            </section>
            <section>
              <h3>Shape the settlement</h3>
              <button onClick={()=>selectTree(selectedTree)}>Open Build tools</button>
              <div className="tree-choices">
                {trees.map((tree) => (
                  <button
                    key={tree.id}
                    onClick={() => {
                      setCursor({ x: tree.x, z: tree.z });
                      selectTree(tree.id);
                    }}
                  >
                    <strong>{tree.name}</strong>
                    <span>
                      ({tree.x}, {tree.z}) · {tree.description}
                    </span>
                  </button>
                ))}
              </div>
              <p className="quiet">
                Chickens walk over the bounded clearing without player-built roads. Reed cache at (−3, −2).
                Treehouses add 2 sheltered berths; store nests hold 12 local
                bundles. Grid and recipes are provisional.
              </p>
            </section>
            <section aria-label="Foraging places" ref={forageSection} tabIndex={-1}>
              <h3>Food in the commons</h3>
              <p className="quiet">Hungry birds and adults short of protein stop to feed. Rest a place to leave its food for later. Food below capacity renews during daylight, including when birds visit.</p>
              {state.forage.map(p => <article className="site-card" id={`food-${p.id}`} tabIndex={-1} key={p.id} aria-current={selectedForage === p.id ? "true" : undefined}>
                <h4>{foodName(p.id)} <span>{p.remaining}/{p.capacity} food</span></h4>
                <p>{foodPatches.find(f => f.id === p.id)?.description}</p>
                <p>{forageStatus(state,p)}</p>
                <button disabled={busy || !ready} onClick={() => {setSelectedForage(p.id); act({type:"forage",id:p.id,open:!p.open});}}>{p.open ? `Rest ${foodName(p.id)}` : `Open ${foodName(p.id)}`}</button>
              </article>)}
            </section>
            <section aria-label="Gather construction reeds">
              <h3>Reeds from the commons</h3>
              <p className="quiet">Renewable construction fiber, separate from food. Adults carry gathered bundles to the cache or a completed store. Cut patches recover slowly during daylight; harvesting still takes real work.</p>
              {state.patches.map(p=><article className="site-card" key={p.id}>
                <h4>{p.id==="patch-west"?"West reed patch":"Creek reed patch"} <span>({key(p.at)})</span></h4>
                <p>{patchStatus(state,p)}</p>
                <button disabled={busy||!ready} onClick={()=>act({type:"gather",id:p.id,designated:!p.designated})}>{p.designated?"Stop gathering":"Gather reeds"}</button>
              </article>)}
            </section>
            <section aria-label="Construction and local stocks">
              <div className="section-heading">
                <h3>Work & local supplies</h3>
                <span>
                  {state.piles.reduce((n, p) => n + p.stock, 0)} loose ·{" "}
                  {state.birds.reduce((n, b) => n + b.cargo, 0)} carried
                </span>
              </div>
              {!state.sites.length && (
                <p className="quiet">
                  No sites yet. Choose a tree to see its Build choices.
                </p>
              )}
              {state.sites.map((site) => (
                <article className="site-card" key={site.id}>
                  <h4>
                    {site.tree ? `${trees.find((t) => t.id === site.tree)!.name} ${site.kind.replaceAll("-", " ")}` : `Store nest (${key(site.at)})`}
                    <span>
                      {site.complete
                        ? "READY"
                        : `${site.delivered}/${cost(site)}`}
                    </span>
                  </h4>
                  <p>{siteStatus(state, site)}</p>
                  {!site.complete ? (
                    <button
                      onClick={() => act({ type: "cancel", id: site.id })}
                    >
                      Cancel site
                    </button>
                  ) : site.kind === "store" ? (
                    <label>
                      Refill from loose reeds
                      <select
                        aria-label={`Stock target ${site.id}`}
                        value={site.target}
                        onChange={(e) =>
                          act({
                            type: "stock",
                            id: site.id,
                            target: Number(e.target.value),
                          })
                        }
                      >
                        {[0, 4, 8, 12].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="quiet">
                      {state.birds
                        .filter(
                          (b) =>
                            b.perch?.tree === site.tree && b.perch.sheltered,
                        )
                        .map((b) => b.life.name)
                        .join(" & ") || "No sheltered occupants yet"}
                    </p>
                  )}
                </article>
              ))}
              {state.piles
                .filter((p) => p.kind === "salvage" && p.stock > 0)
                .map((p) => (
                  <p key={p.id} className="quiet">
                    Salvage at ({key(p.at)}): {p.stock} reeds, available to
                    local jobs.
                  </p>
                ))}
              <p className="ledger">
                {state.consumed} reeds woven into structures ·{" "}
                {conserved(state)}/{state.totalReeds} accounted for
              </p>
            </section>
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
            </div>
          </aside>
        </div>
        <footer>
          <span>
            A chicken-built forest home. The open commons lie between kingdoms.
          </span>
          <span>
            Provisional economy · 1× real play time; 4× accelerates every rule
          </span>
        </footer>
      </main>
    </div>
  );
}
