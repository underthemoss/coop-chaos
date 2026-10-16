import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Clearing } from "../game/Clearing";
import { birds, evening } from "../content/first-evening";
import {
  consequences,
  initialState,
  resolveShelter,
} from "../simulation/flock";
import type { BirdId, Choice, FlockState } from "../simulation/flock";
import {
  decodeSave,
  encodeSave,
  loadSave,
  saveGame,
} from "../persistence/save";

export function App() {
  const [state, setState] = useState<FlockState>(initialState);
  const [selected, setSelected] = useState<BirdId>("rowan");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [storage, setStorage] = useState("Opening the chronicle…");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    loadSave()
      .then((saved) => {
        if (active) {
          setState(saved);
          setStorage(
            saved.choice
              ? "Chronicle restored on this device"
              : "Your story saves on this device",
          );
        }
      })
      .catch(() => {
        if (active)
          setStorage("Device storage unavailable. Export to keep your story.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  async function persist(next: FlockState) {
    setBusy(true);
    setNotice("");
    setState(next);
    try {
      await saveGame(next);
      setStorage("Chronicle saved on this device");
    } catch {
      setStorage("Could not save on this device. Export to keep your story.");
    } finally {
      setBusy(false);
    }
  }
  function choose(choice: Choice) {
    if (!ready || busy || state.choice) return;
    void persist(resolveShelter(state, choice));
  }
  function exportStory() {
    const url = URL.createObjectURL(
      new Blob([encodeSave(state)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "coop-chaos-first-evening.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importStory(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 16_384) {
      setNotice(
        "That file is too large for this story. Your evening is unchanged.",
      );
      return;
    }
    try {
      const next = decodeSave(await file.text());
      await persist(next);
      setNotice("Imported this evening.");
    } catch (cause) {
      setNotice(
        `${cause instanceof Error ? cause.message : "Could not import this save."} Your evening is unchanged.`,
      );
    }
  }
  const bird = birds.find((value) => value.id === selected)!;
  const outcome = consequences(state);
  return (
    <div className="shell">
      <header className="site-header">
        <h1 className="wordmark">
          <span className="brand-mark" aria-hidden="true">
            c
          </span>
          coop chaos<span className="wordmark-dot">.</span>
        </h1>
        <span className="edition">A SMALL WORLD. LONG MEMORIES.</span>
        <span className="prototype">
          PLAYABLE FOUNDATION <span>01</span>
        </span>
      </header>
      <main>
        <div className="play-layout">
          <Clearing state={state} selected={selected} onSelect={setSelected} />
          <aside className="inspector" aria-label="Flock and story inspector">
            <section className="flock-section" aria-label="Named characters">
              <div className="flock-bar">
                <span className="eyebrow">MEET THE FLOCK</span>
                <span>Four lives, tangled together</span>
              </div>
              <div className="bird-picker" aria-label="Choose a character">
                {birds.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    className={
                      selected === item.id ? "bird-tab selected" : "bird-tab"
                    }
                    aria-pressed={selected === item.id}
                  >
                    <span
                      className="feather-swatch"
                      style={{ background: item.color }}
                    />
                    <span>
                      {item.name}
                      <small>{item.role}</small>
                    </span>
                  </button>
                ))}
              </div>
              <article className="character" aria-live="polite">
                <div className="character-heading">
                  <h2>{bird.name}</h2>
                  <span>{bird.role}</span>
                </div>
                <p>{bird.want}</p>
                <p className="fear">
                  <span>Afraid of</span>{" "}
                  {bird.fear.charAt(0).toLowerCase() + bird.fear.slice(1)}
                </p>
                <p className="character-memory">
                  <span aria-hidden="true">↳</span> {outcome.moods[bird.id]}
                </p>
              </article>
            </section>
            <section className="story-panel" aria-label="The first evening">
              <div className="chapter-label">
                <span>THE FIRST EVENING</span>
                <span>01 / 01</span>
              </div>
              {!state.choice ? (
                <>
                  <p className="eyebrow story-kicker">
                    A QUESTION OF BELONGING
                  </p>
                  <h2>{evening.title}</h2>
                  <p className="story-description">{evening.description}</p>
                  <div className="choice-list">
                    {evening.choices.map((choice, index) => (
                      <button
                        key={choice.id}
                        disabled={!ready || busy}
                        className="choice"
                        onClick={() => choose(choice.id)}
                      >
                        <span className="choice-number">0{index + 1}</span>
                        <span>
                          <strong>{choice.title}</strong>
                          <small>{choice.detail}</small>
                        </span>
                        <span className="choice-arrow" aria-hidden="true">
                          ↗
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="choice-footnote">
                    No perfect choice. A flock that remembers.
                  </p>
                </>
              ) : (
                <div aria-live="polite">
                  <p className="eyebrow story-kicker">A CHOICE REMEMBERED</p>
                  <h2>{outcome.title}</h2>
                  <p className="story-description">{outcome.chronicle}</p>
                  <div className="remembered">
                    <span className="eyebrow">WHAT THEY CARRY FORWARD</span>
                    <p>{outcome.memory}</p>
                  </div>
                  <p className="choice-footnote">
                    This is the end of the playable study.
                    <br />
                    The larger story is still taking shape.
                  </p>
                </div>
              )}
              <div className="chronicle-tools">
                <p className="save-status" role="status">
                  {storage}
                </p>
                <div>
                  <button disabled={!ready || busy} onClick={exportStory}>
                    Export story
                  </button>
                  <button
                    disabled={!ready || busy}
                    onClick={() => fileInput.current?.click()}
                  >
                    Import story
                  </button>
                  {state.choice && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Start this evening again? Export first if you want to keep this outcome.",
                          )
                        )
                          void persist(initialState());
                      }}
                    >
                      Begin again
                    </button>
                  )}
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => void importStory(event)}
                  hidden
                />
                {notice && (
                  <p className="import-notice" role="alert">
                    {notice}
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
        <footer>
          <span>Coops are tribes. Every chicken is someone.</span>
          <span>Single player · one provisional social study</span>
        </footer>
      </main>
    </div>
  );
}
