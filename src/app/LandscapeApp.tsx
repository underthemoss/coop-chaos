import { useEffect, useRef, useState } from "react";
import { hasTacticalPresentation, stepValleyZoom, valleyZoomNames } from "../game/valley-view";
import type { ValleyZoom } from "../game/valley-view";
import { createValley } from "../game/create-valley";
import { getMap } from "../content/small-valley";
import {
  moveWalker,
  startDelivery,
  stepLandscape,
} from "../simulation/landscape";
import type { Landscape, LandscapeBirdId } from "../simulation/landscape";
import type { MapPoint } from "../content/maps";
import "./landscape.css";
const names = { fern: "Fern", rook: "Rook", dapple: "Dapple", wren: "Wren" };
export function LandscapeApp({
  initial,
  name,
  onSave,
  onExit,
  onStartLiving,
}: {
  initial: Landscape;
  name: string;
  onSave: (state: Landscape) => Promise<void>;
  onExit: () => void;
  onStartLiving?: () => Promise<void>;
}) {
  const [state, setState] = useState(initial),
    [selected, setSelected] = useState<LandscapeBirdId>("fern"),
    [paused, setPaused] = useState(false),
    [legacyFocus, setLegacyFocus] = useState(
      () => window.matchMedia("(max-width: 600px)").matches,
    ),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState(""),
    [saving, setSaving] = useState("Saved on this device");
  const canvas = useRef<HTMLCanvasElement>(null),
    world = useRef<ReturnType<typeof createValley> | null>(null),
    labels = useRef<Record<string, HTMLButtonElement | null>>({});
  const stateRef = useRef(state),
    selectedRef = useRef(selected),
    pausedRef = useRef(paused);
  stateRef.current = state;
  selectedRef.current = selected;
  pausedRef.current = paused;
  const map = getMap(state.mapId, state.mapVersion)!;
  const tactical = hasTacticalPresentation(map);
  const [zoom, setZoom] = useState<ValleyZoom>(2);
  const lastFollow = useRef<ValleyZoom>(2);
  const focus = tactical ? zoom > 0 : legacyFocus;
  function changeZoom(direction: number) {
    setZoom((previous) => {
      const next = stepValleyZoom(previous, direction);
      if (next > 0) lastFollow.current = next;
      return next;
    });
  }
  const pending = useRef<Promise<void>>(Promise.resolve());
  function save(next: Landscape) {
    setSaving("Saving…");
    const task = pending.current
      .catch(() => undefined)
      .then(() => onSave(next));
    pending.current = task;
    void task
      .then(() => setSaving("Saved on this device"))
      .catch((e) => {
        setSaving("Save needs attention");
        setNotice(
          e instanceof Error
            ? e.message
            : "Save failed. Your previous save is retained.",
        );
      });
    return task;
  }
  function travel(at: MapPoint) {
    const next = moveWalker(stateRef.current, selectedRef.current, at);
    if (next) {
      stateRef.current = next;
      setState(next);
      setNotice(`${names[selectedRef.current]} is walking the ground route.`);
      void save(next);
    } else
      setNotice(
        "No ground route there. Choose dry ground, a ramp, or a gravel ford.",
      );
  }
  useEffect(() => {
    try {
      world.current = createValley(canvas.current!, map, {
        pick: travel,
        zoomStep: changeZoom,
        ready: () => setReady(true),
        error: setNotice,
        labels(positions) {
          for (const [id, p] of Object.entries(positions)) {
            const el = labels.current[id];
            if (el) {
              el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
              el.hidden =
                p.x < 0 ||
                p.y < 0 ||
                p.x > canvas.current!.clientWidth ||
                p.y > canvas.current!.clientHeight;
            }
          }
        },
      });
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "The landscape could not start.",
      );
    }
    return () => world.current?.dispose();
  }, []);
  useEffect(() => {
    world.current?.update(state, selected, paused);
  }, [state, selected, paused]);
  useEffect(() => {
    world.current?.focus(focus ? selected : null, zoom);
  }, [focus, selected, zoom]);
  useEffect(() => {
    let ticks = 0;
    const timer = setInterval(() => {
      if (pausedRef.current || !ready) return;
      const next = stepLandscape(stateRef.current, 0.1);
      stateRef.current = next;
      setState(next);
      if (++ticks % 20 === 0) void save(next);
    }, 100);
    return () => clearInterval(timer);
  }, [ready]);
  const bird = state.birds.find((b) => b.id === selected)!;
  return (
    <main className="landscape-app">
      <header className="valley-header">
        <div>
          <p className="valley-kicker">CHICKEN CIV · PRESERVED LANDSCAPE SURVEY</p>
          <h1>{name}</h1>
        </div>
        <div className="valley-header-actions">
          {onStartLiving&&<button onClick={()=>void onStartLiving().catch(()=>setSaving("Could not save this survey. Please retry before starting a living valley."))}>Start a living valley</button>}
          <span role="status">{saving}</span>
          <button
            onClick={async () => {
              try {
                await save(stateRef.current);
                onExit();
              } catch {
                /* retain session for recovery */
              }
            }}
          >
            Save & title
          </button>
        </div>
      </header>
      <section
        className="valley-stage"
        aria-label="Three-dimensional small valley"
      >
        <canvas
          ref={canvas}
          aria-label={`${map.name}: select a chicken, then choose a ground destination`}
        />
        <div className="valley-labels">
          {state.birds.map((b) => (
            <button
              key={b.id}
              ref={(el) => {
                labels.current[b.id] = el;
              }}
              className={selected === b.id ? "selected" : ""}
              onClick={() => setSelected(b.id)}
            >
              {names[b.id]}
              {b.cargo ? " · carrying" : ""}
            </button>
          ))}
        </div>
        {!ready && (
          <p className="valley-loading" role="status">
            Opening the valley…
          </p>
        )}
        <div className={`valley-view${tactical ? " valley-view-tactical" : ""}`}>
          <button aria-pressed={focus} onClick={() => {
            if (tactical) setZoom(focus ? 0 : lastFollow.current);
            else setLegacyFocus(!legacyFocus);
          }}>
            {focus ? "Show whole valley" : "Follow chicken"}
          </button>
          {tactical && <div className="valley-zoom" role="group" aria-label="Camera zoom">
            <button aria-label="Zoom out" disabled={zoom === 0} onClick={() => changeZoom(-1)}>−</button>
            <span aria-live="polite">{valleyZoomNames[zoom]}</span>
            <button aria-label="Zoom in" disabled={zoom === 3} onClick={() => changeZoom(1)}>+</button>
          </div>}
          <button
            aria-pressed={paused}
            onClick={() => {
              setPaused(!paused);
              if (!paused) void save(stateRef.current);
            }}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </section>
      <section className="valley-controls" aria-label="Landscape controls">
        <div className="valley-birds" aria-label="Choose a chicken">
          {state.birds.map((b) => (
            <button
              key={b.id}
              aria-pressed={selected === b.id}
              onClick={() => setSelected(b.id)}
            >
              {names[b.id]}
            </button>
          ))}
        </div>
        <div className="valley-orders">
          <div>
            <strong>{names[selected]}</strong>
            <p>
              {bird.cargo
                ? `Carrying ${bird.cargo} reed bundles`
                : bird.route.length
                  ? "Walking"
                  : "Ready to explore"}{" "}
              · {bird.route.length} route steps
            </p>
          </div>
          <label>
            Walk to{" "}
            <select
              defaultValue=""
              onChange={(e) => {
                const target = map.landmarks.find(
                  (l) => l.id === e.target.value,
                );
                if (target) travel(target.at);
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Choose a landmark
              </option>
              {map.landmarks.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              const next = startDelivery(stateRef.current, selected);
              if (next) {
                stateRef.current = next;
                setState(next);
                setNotice(
                  `${names[selected]} will carry real reed bundles between the two courts.`,
                );
                void save(next);
              }
            }}
          >
            Carry supplies
          </button>
        </div>
        <div className="valley-footer">
          <p>
            {map.name} · {map.size} · {map.width * map.cellSize} ×{" "}
            {map.depth * map.cellSize} m. {map.terrain ? "Crescent bluff, two crossings." : "Three terraces, two fords."} Select a
            chicken, then click dry ground or choose a landmark.
          </p>
          <p>
            {map.landmarks.find(l=>l.id==="west-court")!.name} {state.source} · In transit{" "}
            {state.birds.reduce((n, b) => n + b.cargo, 0)} · {map.landmarks.find(l=>l.id==="east-court")!.name}{" "}
            {state.delivered} bundles
          </p>
        </div>
        <p className="valley-notice" role="status">
          {notice ||
            "Explore the landscape. Construction, combat, and territorial rules are future work."}
        </p>
      </section>
    </main>
  );
}
