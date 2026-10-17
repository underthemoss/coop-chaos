import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Clearing } from "../game/Clearing";
import type { Tool } from "../game/Clearing";
import { settlers, trees, tuning } from "../content/settlement";
import type { SettlerId } from "../content/settlement";
import {
  command,
  conserved,
  cost,
  initialSettlement,
  key,
  siteStatus,
  step,
  workerStatus,
  patchStatus,
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
      const next = step(stateRef.current);
      if (next === stateRef.current) return;
      display(next);
      if (next.tick % 10 === 0) void save(next);
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
  function pick(at: Cell) {
    setCursor({ x: at.x, z: at.z });
    if(tool === "inspect")setPanelOpen(true);
    if(tool === "gather"){
      const patch=stateRef.current.patches.find(p=>p.at.x===at.x&&p.at.z===at.z);
      if(patch)act({type:"gather",id:patch.id,designated:!patch.designated});
      else setNotice("Choose one of the reed patches, or connect it with paths first.");
    }
    if (tool === "path" || tool === "remove")
      act({ type: "path", at, remove: tool === "remove" });
    if (tool === "treehouse" || tool === "store")
      act({ type: "build", kind: tool, at });
  }
  async function replace(next: Settlement, message: string) {
    locked.current = true;
    restoreFailed.current = false;
    setBusy(true);
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
  const bird = state.birds.find((b) => b.id === selected)!;
  const person = settlers.find((b) => b.id === selected)!;
  const hasHome = state.sites.some(s=>s.kind==="treehouse"&&s.complete);
  return (
    <div className="shell">
      <header className="site-header">
        <h1>
          coop chaos<span>.</span>
        </h1>
        <span className="edition">GROUND WORK. CANOPY DREAMS.</span>
        <div className="header-actions"><span className="phase-label">{state.phase === "day" ? "Day" : "Evening"} · 4 chickens</span>
        <button disabled={!ready||busy} onClick={()=>act({type:"phase",phase:state.phase==="day"?"evening":"day"})}>{state.phase === "day" ? "Call evening" : "Begin day"}</button>
        <button disabled={!ready||busy} onClick={()=>act({type:"pause"})}>{state.paused?"Resume work":"Pause work"}</button>
        <button aria-expanded={panelOpen} aria-controls="settlement-inspector" onClick={()=>setPanelOpen(!panelOpen)}>{panelOpen?"Close details":"Settlement"}</button></div>
      </header>
      <main>
        <div className="play-layout">
          <Clearing
            state={state}
            selected={selected}
            onSelect={(id)=>{setSelected(id);setPanelOpen(true);}}
            onPick={pick}
            cursor={cursor}
            tool={tool}
            onCursor={setCursor}
          />
          <div className="opening-card" hidden={panelOpen}>
            <span className="eyebrow">A LIVING GROVE</span>
            <h2>{hasHome?"Life in the branches":"Beneath Lowfork"}</h2>
            <p>{tool === "inspect" ? (hasHome ? "A woven home now shelters two birds. Grow another branch of the settlement, or call the flock to rest." : "Four individuals, open ground, and branches to return to. Inspect a bird or make room for a woven home.") : tool === "treehouse" ? "Choose a named tree. Six reeds, carried along connected paths, become two sheltered berths." : tool === "path" ? "Join the reed cache to a marked trunk. Paths connect neighboring cells." : tool === "store" ? "Four reeds make a local store. Place on open ground, then connect it." : "Choose a path to remove. Affected carriers wait with their loads."}</p>
          </div>
          <nav className="primary-tools" aria-label="World tools">
            {(["inspect","gather","treehouse","path"] as Tool[]).map(t=><button key={t} aria-pressed={tool===t} onClick={()=>setTool(t)}>{({inspect:"Inspect",gather:"Gather reeds",path:"Path",treehouse:"Treehouse",store:"Store"})[t as "inspect"|"gather"|"path"|"treehouse"|"store"]}</button>)}
          </nav>
          {notice&&<p className="world-notice" role="alert">{notice}</p>}
          <aside id="settlement-inspector" className={`inspector${panelOpen?" is-open":""}`} aria-label="Settlement inspector" hidden={!panelOpen}>
            <button className="close-inspector" onClick={()=>setPanelOpen(false)}>Close details ×</button>
            <section>
              <div className="section-heading">
                <span className="eyebrow">GROVE & COMMONS</span>
                <span>{state.phase === "day" ? "DAY" : "EVENING"}</span>
              </div>
              <h2>The settlement</h2>
              <p className="intro">
                Mark a treehouse, connect the reed cache to its trunk with
                paths, and let the flock carry and weave. Trees already offer
                natural sleeping branches.
              </p>
              <p className="quiet">
                Evening secures existing loads, then birds fly to natural
                branches or climb into woven shelter. A blocked carrier guards
                its bundle until the path returns.
              </p>
            </section>
            <section>
              <h3>Shape the settlement</h3>
              <button aria-pressed={tool==="store"} onClick={()=>setTool("store")}>Store nest</button>
              <button aria-pressed={tool==="remove"} onClick={()=>setTool("remove")}>Remove path</button>
              <div className="cell-controls">
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
                  disabled={tool === "inspect" || busy || !ready}
                  onClick={() => pick(cursor)}
                >
                  Use tool at {key(cursor)}
                </button>
              </div>
              <div className="tree-choices">
                {trees.map((tree) => (
                  <button
                    key={tree.id}
                    onClick={() => {
                      setCursor({ x: tree.x, z: tree.z });
                      setTool("treehouse");
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
                Paths join orthogonal neighboring cells. Source at (−3, −2).
                Treehouses add 2 sheltered berths; store nests hold 12 local
                bundles. Grid and recipes are provisional.
              </p>
            </section>
            <section aria-label="Gather construction reeds">
              <h3>Reeds from the commons</h3>
              <p className="quiet">Finite construction reeds, not food. Connect a patch to the cache or a completed store with paths; adults gather and carry without a scripted order. No regrowth in this study.</p>
              {state.patches.map(p=><article className="site-card" key={p.id}>
                <h4>{p.id==="patch-west"?"West reed patch":"Creek reed patch"} <span>({key(p.at)})</span></h4>
                <p>{patchStatus(state,p)}</p>
                <button disabled={!p.remaining||busy||!ready} onClick={()=>act({type:"gather",id:p.id,designated:!p.designated})}>{p.designated?"Stop gathering":"Gather reeds"}</button>
                <button onClick={()=>{setCursor(p.at);setTool("path");}}>Connect patch</button>
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
                  No sites yet. Choose a tree, then use the treehouse tool.
                </p>
              )}
              {state.sites.map((site) => (
                <article className="site-card" key={site.id}>
                  <h4>
                    {site.kind === "treehouse"
                      ? `${trees.find((t) => t.id === site.tree)!.name} treehouse`
                      : `Store nest (${key(site.at)})`}
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
                        .map((b) => settlers.find((s) => s.id === b.id)!.name)
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
                    connected jobs.
                  </p>
                ))}
              <p className="ledger">
                {state.consumed} reeds woven into structures ·{" "}
                {conserved(state)}/{state.totalReeds} accounted for
              </p>
            </section>
            <section aria-label="Named workers">
              <h3>Every chicken is someone</h3>
              <div className="bird-picker">
                {settlers.map((s) => (
                  <button
                    aria-pressed={selected === s.id}
                    key={s.id}
                    onClick={() => setSelected(s.id)}
                  >
                    <i style={{ background: s.color }} />
                    {s.name}
                  </button>
                ))}
              </div>
              <article className="character">
                <div className="section-heading">
                  <h2>{person.name}</h2>
                  <span>{person.role}</span>
                </div>
                <p>{person.want}</p>
                <p className="work-status">{workerStatus(state, bird)}</p>
                <p>
                  Readiness {Math.round(bird.energy)} / 100 · {bird.deliveries}{" "}
                  completed deliveries
                </p>
                <p className="quiet">
                  {bird.attachment
                    ? `Helped build ${trees.find((t) => t.id === bird.attachment)!.name}; prefers sleeping there.`
                    : `Usually seeks ${trees.find((t) => t.id === person.preference)!.name}.`}
                  {bird.id === "rook" && !bird.attachment
                    ? " Prefers an open high fork."
                    : ""}
                  {bird.deliveries >= 3
                    ? " Practiced carrying is now a little quicker."
                    : ""}
                </p>
                {bird.memories.slice(-3).map((m) => (
                  <p className="memory" key={m}>
                    ↳ {m}
                  </p>
                ))}
              </article>
              <p className="quiet">
                Short prototype rules: ground rest recovers work readiness;
                natural sleep restores up to 80, shelter up to 100. Exertion
                slows tired carriers. No hunger or predator encounters yet.
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
                    Export old first evening
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
                Separate settlement save. Old first-evening stories are
                retained. Single tab recommended; no offline catch-up.
              </p>
            </section>
          </aside>
        </div>
        <footer>
          <span>
            A chicken-built forest home. The open commons lie between kingdoms.
          </span>
          <span>
            Provisional construction proof · larger settlement loop still to
            come
          </span>
        </footer>
      </main>
    </div>
  );
}
