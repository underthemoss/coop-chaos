import { useEffect, useRef, useState } from "react";
import { createValley } from "../game/create-valley";
import { treeStudyForms, type TreeStudyForm, type TreeStudyView } from "../game/tree-study-view";
import { defaultValley } from "../content/small-valley";
import { initialLandscape } from "../simulation/landscape";
import "./landscape.css";
import "./tree-study.css";

export function TreeArtStudy({ onExit }: { onExit: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<ReturnType<typeof createValley> | null>(null);
  const [form, setForm] = useState<TreeStudyForm>("longbough");
  const [view, setView] = useState<TreeStudyView>("detail");
  const [branches, setBranches] = useState(false);
  const [structures, setStructures] = useState(true);
  const [loaded, setLoaded] = useState(0), [ready, setReady] = useState(false);
  const [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setLoaded(0); setReady(false); setError("");
    try {
      const instance = createValley(canvas.current!, defaultValley, {
        study: true, studyLoaded: setLoaded, ready: () => setReady(true),
        error: setError, pick: () => undefined, labels: () => undefined,
      });
      world.current = instance;
      instance.update(initialLandscape(defaultValley), "fern", true);
      return () => { instance.dispose(); world.current = null; };
    } catch {
      setError("The 3D study could not start. Retry, or return to title.");
    }
  }, [attempt]);
  useEffect(() => { world.current?.studyView(form, view, branches, structures); }, [form, view, branches, structures, attempt]);
  function chooseForm(next: TreeStudyForm) {
    setForm(next);
    if (next !== "longbough" && view === "detail") setView("whole");
  }
  return <main className="landscape-app tree-study">
    <header className="valley-header">
      <div><span className="kicker">{form === "longbough" ? "Building scale study" : "Visual-only comparison"}</span><h1>Tree art study</h1></div>
      <button onClick={onExit}>Return to title</button>
    </header>
    <div className="tree-study-tools">
      <div role="group" aria-label="Growth form">
        {treeStudyForms.map(asset => <button key={asset.id} aria-pressed={form === asset.id}
          onClick={() => chooseForm(asset.id)}>{asset.name}</button>)}
      </div>
      <div role="group" aria-label="Framing">
        <button aria-pressed={view === "whole"} onClick={() => setView("whole")}>Whole tree</button>
        {form === "longbough" && <button aria-pressed={view === "detail"} onClick={() => setView("detail")}>Inhabited detail</button>}
        <button aria-pressed={view === "chicken"} onClick={() => setView("chicken")}>Chicken scale</button>
      </div>
      <label><input type="checkbox" checked={branches} onChange={e => setBranches(e.target.checked)} /> Show branches</label>
      {form === "longbough" && <label><input type="checkbox" checked={structures} onChange={e => setStructures(e.target.checked)} /> Show structures</label>}
    </div>
    <div className="valley-stage">
      <canvas ref={canvas} role="img" aria-label={`${treeStudyForms.find(a => a.id === form)!.name} tree, ${branches ? "branches exposed" : "natural crown"}${form === "longbough" && structures ? ", static deck structures and chickens" : ""}${view !== "detail" ? ", with four static ground chickens and one cargo bundle for scale" : ""}`} />
      {(!ready || loaded < 3) && !error && <p className="tree-study-status" role="status">Opening study… {loaded}/3 trees</p>}
      {error && <div className="tree-study-status" role="alert"><p>{error}</p><button onClick={() => setAttempt(n => n + 1)}>Retry study</button></div>}
    </div>
    <footer className="tree-study-caption">
      <p>{form === "longbough" ? "Building scale study · staged chickens shown for scale." : "Natural tree forms · four chickens shown for scale, one carrying reeds."}</p>
    </footer>
  </main>;
}
