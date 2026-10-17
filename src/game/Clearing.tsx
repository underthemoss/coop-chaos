import { useEffect, useRef, useState } from "react";
import { createClearing } from "./create-clearing";
import type { Cell, Settlement } from "../simulation/settlement";
import { foodPatches, settlers, trees } from "../content/settlement";
import type { SettlerId } from "../content/settlement";
export type Tool = "inspect" | "gather" | "forage" | "treehouse" | "store";
export function Clearing({
  state,
  selected,
  onSelect,
  onPick,
  onForage,
  cursor,
  tool,
  onCursor,
}: {
  state: Settlement;
  selected: SettlerId;
  onSelect: (id: SettlerId) => void;
  onPick: (at: Cell) => void;
  onForage: (id: string) => void;
  cursor: Cell;
  tool: Tool;
  onCursor: (at: Cell) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<ReturnType<typeof createClearing> | null>(null);
  const labels = useRef<Record<string, HTMLButtonElement | null>>({});
  const latest = useRef({ onSelect, onPick });
  latest.current = { onSelect, onPick };
  const [error, setError] = useState("");
  const [assets, setAssets] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    try {
      world.current = createClearing(
        canvas.current!,
        (id) => latest.current.onSelect(id),
        (positions) => {
          for (const [id, point] of Object.entries(positions)) {
            const label = labels.current[id];
            if (label) {
              label.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -100%)`;
              label.style.visibility = point.visible ? "visible" : "hidden";
            }
          }
        },
        (at) => latest.current.onPick(at),
        setAssets,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The landscape could not load.",
      );
    }
    return () => {
      world.current?.dispose();
      world.current = null;
    };
  }, []);
  useEffect(() => {
    world.current?.update(state);
  }, [state]);
  useEffect(() => {
    world.current?.select(selected);
  }, [selected]);
  useEffect(() => {
    world.current?.cursor(cursor, tool === "treehouse" || tool === "store");
  }, [cursor, tool]);
  return (
    <section className="world" aria-label="The treehouse settlement">
      {assets !== "ready" && <div className="asset-notice" role="status">
        <strong>{assets === "loading" ? "Opening the grove…" : "The grove models could not load."}</strong>
        {assets === "failed" && <button onClick={() => void world.current?.retryAssets()}>Retry models</button>}
      </div>}
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-describedby="camera-hint"
        aria-label="3D chicken settlement. Fixed view. In build mode arrow keys move the cell cursor and Enter uses the tool."
        onKeyDownCapture={(e) => {
          if (tool !== "treehouse" && tool !== "store") return;
          const d: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, 1],
            ArrowDown: [0, -1],
          };
          if (d[e.key]) {
            e.preventDefault();
            e.stopPropagation();
            onCursor({
              x: Math.max(-4, Math.min(4, cursor.x + d[e.key][0])),
              z: Math.max(-3, Math.min(3, cursor.z + d[e.key][1])),
            });
          } else if (e.key === "Enter") {
            e.preventDefault();
            onPick(cursor);
          }
        }}
      />
      <div className="landscape-labels">
        {settlers.map((b) => (
          <button
            key={b.id}
            ref={(el) => {
              labels.current[b.id] = el;
            }}
            className={`bird-label${selected === b.id ? " active" : ""}`}
            aria-label={`Select ${b.name} in landscape`}
            onClick={() => onSelect(b.id)}
          >
            {b.name}
          </button>
        ))}
        {trees.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              labels.current[t.id] = el;
            }}
            className="tree-label"
            hidden={tool!=="treehouse"}
            onClick={() => {
              onCursor({ x: t.x, z: t.z });
              onPick({ x: t.x, z: t.z });
            }}
            aria-label={`Choose ${t.name} tree`}
          >
            {t.name}
            <small>
              2 natural
              {state.sites.some((s) => s.complete && s.tree === t.id)
                ? " + 2 sheltered"
                : " branches"}
            </small>
          </button>
        ))}
        {state.forage.map(p => <button key={p.id} className="tree-label forage-label" hidden={tool !== "forage"} ref={el => {labels.current[p.id] = el;}} onClick={() => onForage(p.id)} aria-label={`Inspect ${p.id} forage place`}>
          {foodPatches.find(f => f.id === p.id)?.name ?? p.id}<small>{p.remaining}/{p.capacity} food · {p.open ? "open" : "resting"}</small>
        </button>)}
        {state.patches.map(p=><button key={p.id} className="tree-label patch-label" hidden={tool!=="gather"} ref={el=>{labels.current[p.id]=el;}} onClick={()=>onPick(p.at)} aria-label={`${p.designated?"Stop gathering":"Gather reeds from"} ${p.id}`}>
          {p.id==="patch-west"?"West reeds":"Creek reeds"}<small>{p.remaining} remaining · {p.designated?"gathering":"available"}</small>
        </button>)}
        <button
          ref={(el) => {
            labels.current.reeds = el;
          }}
          className="tree-label source-label"
          hidden={tool!=="gather" && tool!=="treehouse" && tool!=="store"}
          onClick={() => onCursor({ x: -3, z: -2 })}
        >
          Reed cache<small>{state.piles[0].stock} local bundles</small>
        </button>
      </div>
      {error && (
        <p className="scene-error" role="alert">
          {error}
        </p>
      )}
      <div className="world-caption">
        <span className="eyebrow">THE CANOPY COMMONS</span>
        <span>
          {state.phase === "evening"
            ? "Evening · secure loads, then settle"
            : "Day · ground work, canopy dreams"}
          {state.paused ? " · PAUSED" : ""}
        </span>
      </div>
      <p id="camera-hint" className="camera-hint">
        {tool === "inspect" ? "Choose a bird · fixed grove view" : tool === "forage" ? "Choose a food place · inspect or rest it" : tool === "gather" ? "Choose a construction reed patch" : `${tool.toUpperCase()} · choose a cell · arrows move cursor · Enter uses tool`}
      </p>
    </section>
  );
}
