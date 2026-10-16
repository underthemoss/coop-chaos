import { useEffect, useRef, useState } from "react";
import { createClearing } from "./create-clearing";
import type { BirdId, FlockState } from "../simulation/flock";
import { birds } from "../content/first-evening";

export function Clearing({
  state,
  selected,
  onSelect,
}: {
  state: FlockState;
  selected: BirdId;
  onSelect: (id: BirdId) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<ReturnType<typeof createClearing> | null>(null);
  const labels = useRef<Partial<Record<BirdId, HTMLButtonElement>>>({});
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(100);
  useEffect(() => {
    try {
      world.current = createClearing(
        canvas.current!,
        onSelect,
        (positions) => {
          for (const bird of birds) {
            const label = labels.current[bird.id];
            const point = positions[bird.id];
            if (!label) continue;
            label.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -100%)`;
            label.style.visibility = point.visible ? "visible" : "hidden";
          }
        },
        setZoom,
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
  }, [onSelect]);
  useEffect(() => {
    world.current?.update(state);
  }, [state]);
  useEffect(() => {
    world.current?.select(selected);
  }, [selected]);
  return (
    <section className="world" aria-label="The landscape at the old roots">
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-describedby="camera-hint"
        aria-label="An elevated 3D landscape with forest, water, and four chicken characters. Arrow keys pan, plus and minus zoom, zero resets."
      />
      <div className="landscape-labels">
        {birds.map((bird) => (
          <button
            key={bird.id}
            ref={(element) => {
              if (element) labels.current[bird.id] = element;
            }}
            className={`bird-label${selected === bird.id ? " active" : ""}`}
            aria-label={`Select ${bird.name} in landscape`}
            onClick={() => onSelect(bird.id)}
          >
            {bird.name}
          </button>
        ))}
      </div>
      {error && (
        <p className="scene-error" role="alert">
          {error}
        </p>
      )}
      <div className="world-caption">
        <span className="eyebrow">THE OLD ROOTS</span>
        <span>Early evening · rain on its way</span>
      </div>
      <div className="world-meta">Provisional landscape & characters</div>
      <div className="camera-toolbar" aria-label="Camera controls">
        <button
          disabled={!!error}
          aria-label="Zoom in"
          onClick={() => world.current?.zoomIn()}
        >
          +
        </button>
        <output aria-label="Camera zoom">{zoom}%</output>
        <button
          disabled={!!error}
          aria-label="Zoom out"
          onClick={() => world.current?.zoomOut()}
        >
          −
        </button>
        <span className="toolbar-divider" />
        <button
          disabled={!!error}
          className="text-control"
          onClick={() => world.current?.focus(selected)}
        >
          Find {birds.find((bird) => bird.id === selected)!.name}
        </button>
        <button
          disabled={!!error}
          className="text-control"
          onClick={() => world.current?.reset()}
        >
          Reset view
        </button>
      </div>
      <p id="camera-hint" className="camera-hint">
        Drag to pan · scroll to zoom <span>· arrow keys when focused</span>
      </p>
    </section>
  );
}
