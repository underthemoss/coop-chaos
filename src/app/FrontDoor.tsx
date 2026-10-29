import { lazy, Suspense, useEffect, useRef, useState } from "react";
import grove from "../../art-direction/concepts/inhabited-grove-v1.png";
import {
  createSlot,
  initializeLibrary,
  listSlots,
  openSlot,
  restoreCheckpoint,
} from "../persistence/library";
import type { GameSession, SlotView } from "../persistence/library";
import { legacyArchive } from "../persistence/settlement-save";
import { encodeGame, isLandscape } from "../persistence/game-save";
import { populationReadout } from "../simulation/settlement";
import { AccountPanel } from "../account/AccountPanel";
import { useAccountSession } from "../account/useAccountSession";
import { accountService, copyPageSize } from "../account/service";
const LandscapeGame = lazy(() =>
  import("./LandscapeApp").then((m) => ({ default: m.LandscapeApp })),
);
const TreeStudy = lazy(() => import("./TreeArtStudy").then(m => ({ default: m.TreeArtStudy })));
const Game = lazy(() => import("./App").then((m) => ({ default: m.App })));
function download(text: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function summary(slot: SlotView) {
  return slot.status === "valid"
    ? isLandscape(slot.state)
      ? `Preserved valley survey · ${slot.state.delivered} bundles delivered`
      : ` ${slot.state.world ? (slot.state.world.version === 1 ? "Original living valley · " : "Refined living valley · ") : "Woodland · "}Day ${slot.state.economy.clock.day} · ${populationReadout(slot.state).label}`
    : slot.status === "newer"
      ? "Newer game version"
      : "Recovery needed";
}
const message = (e: unknown) =>
  e instanceof Error
    ? e.message
    : "Device storage is unavailable. Your saved games have not been replaced.";
export function FrontDoor() {
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [route, setRoute] = useState<
    "title" | "new" | "load" | "login" | "signup" | "study"
  >("title");
  const [mapChoice, setMapChoice] = useState<"inhabited" | "inhabited-original" | "landscape" | "woodland">(
    "inhabited",
  );
  const [name, setName] = useState("");
  const [session, setSession] = useState<GameSession | null>(null);
  const [recovery, setRecovery] = useState<string | null>(null);
  const [copies, setCopies] = useState<
    Array<{ id: string; name: string; createdAt: string }>
  >([]);
  const [moreCopies, setMoreCopies] = useState(false);
  const [copyOffset, setCopyOffset] = useState(0);
  const copyGeneration = useRef(0);
  const [copySource, setCopySource] = useState<string>("");
  const copyIntent = useRef<{
    id: string;
    owner: string | undefined;
    slot: string;
    name: string;
    text: string;
  } | null>(null);
  const [copyRetry, setCopyRetry] = useState(false);
  const [cloudNotice, setCloudNotice] = useState("");
  const [archive, setArchive] = useState<string>();
  const [archiveError, setArchiveError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const account = useAccountSession();
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setSlots(await initializeLibrary());
      setStorageReady(true);
    } catch (e) {
      setStorageReady(false);
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    void legacyArchive()
      .then(setArchive)
      .catch(() =>
        setArchiveError(
          "The archived story could not be opened. Your settlement games are available independently.",
        ),
      );
  }, []);
  useEffect(() => () => session?.close(), [session]);
  const accountId = useRef(account.session?.user.id);
  accountId.current = account.session?.user.id;
  useEffect(() => {
    let active = true;
    const generation = ++copyGeneration.current;
    setCopies([]);
    setMoreCopies(false);
    setCopyOffset(0);
    setCopySource("");
    copyIntent.current = null;
    setCopyRetry(false);
    setCloudNotice("");
    if (account.status === "signed-in")
      void accountService.copies
        .list()
        .then((v) => {
          if (active && generation === copyGeneration.current) {
            setCopies(v);
            setCopyOffset(v.length);
            setMoreCopies(v.length === copyPageSize);
          }
        })
        .catch((e) => {
          if (active && generation === copyGeneration.current)
            setCloudNotice(message(e));
        });
    return () => {
      active = false;
    };
  }, [account.session?.user.id, account.status]);
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function play(id: string) {
    await run(async () => {
      const next = await openSlot(id);
      setSession(next);
    });
  }
  async function leave() {
    session?.close();
    setSession(null);
    setRoute("title");
    setRecovery(null);
    await refresh();
  }
  async function make(text?: string, proposedName?: string) {
    await run(async () => {
      const slot = await createSlot(proposedName ?? name, text, mapChoice);
      setSlots(await listSlots());
      const next = await openSlot(slot.id);
      setSession(next);
      setName("");
    });
  }
  const valid = slots.filter((s) => s.status === "valid");
  const cloudValid = valid.filter(
    (s) => s.status === "valid" && !isLandscape(s.state) && !s.state.world,
  );
  const latest = valid[0];
  const broken = slots.filter((s) => s.status !== "valid");
  const selected = slots.find((s) => s.id === recovery);
  if (session)
    return (
      <Suspense
        fallback={
          <div className="game-opening" role="status">
            Opening {session.slot.name}…
          </div>
        }
      >
        {isLandscape(session.state) ? (
          <LandscapeGame
            initial={session.state}
            name={session.slot.name}
            onSave={session.save}
            onExit={() => void leave()}
            onStartLiving={async()=>{await session.save(session.state);await leave();setMapChoice("inhabited");setRoute("new");}}
          />
        ) : (
          <Game
            key={session.slot.id}
            initial={session.state}
            name={session.slot.name}
            onSave={session.save}
            onExit={() => void leave()}
          />
        )}
      </Suspense>
    );
  if (route === "study") return <Suspense fallback={<div className="game-opening" role="status">Opening tree study…</div>}><TreeStudy onExit={() => setRoute("title")} /></Suspense>;
  return (
    <div
      className="front-door"
      style={{ "--grove-art": `url(${grove})` } as React.CSSProperties}
    >
      <div
        className="title-art"
        role="img"
        aria-label="An illustrated grove of spreading trees and woven chicken homes"
      />
      <main className="title-content">
        <header className="title-brand">
          <h1>
            chicken civ<span>.</span>
          </h1>
          <p>A small world. Long memories.</p>
        </header>
        <section
          className="title-card"
          aria-label={
            route === "title"
              ? "Play Chicken Civ"
              : route === "load"
                ? "Load game"
                : route === "new"
                  ? "New game"
                  : "Account"
          }
        >
          {route !== "title" && (
            <button
              className="text-button back-title"
              onClick={() => {
                setRoute("title");
                setRecovery(null);
                setError("");
              }}
            >
              ← Back to title
            </button>
          )}
          {loading ? (
            <p role="status">Opening games on this device…</p>
          ) : (
            <>
              {route === "title" && (
                <>
                  {latest && (
                    <button
                      className="title-primary continue-game"
                      disabled={busy}
                      onClick={() => void play(latest.id)}
                    >
                      <strong>Continue</strong>
                      <span>
                        {latest.name} · {summary(latest)}
                      </span>
                    </button>
                  )}
                  <button
                    className={latest ? "title-secondary" : "title-primary"}
                    disabled={busy || !storageReady}
                    onClick={() => {
                      setRoute("new");
                      setName(`Grove ${slots.length + 1}`);
                    }}
                  >
                    New game
                  </button>
                  <button
                    className="title-secondary"
                    disabled={busy || !storageReady}
                    onClick={() => setRoute("load")}
                  >
                    Load game
                  </button>
                  <button className="title-secondary" disabled={busy} onClick={() => setRoute("study")}>Tree art study</button>
                  {!!broken.length && (
                    <button
                      className="recovery-link"
                      onClick={() => {
                        setRoute("load");
                        setRecovery(broken[0].id);
                      }}
                    >
                      A saved game needs attention · recovery options
                    </button>
                  )}
                  <p className="device-caption">
                    On this device. Your groves stay here unless you export or
                    save a copy to your account.
                  </p>
                  <div className="account-links">
                    {account.status === "signed-in" ? (
                      <>
                        <span>{account.session?.user.email}</span>
                        <button
                          className="text-button"
                          onClick={() =>
                            void run(async () => {
                              await accountService.signOut();
                            })
                          }
                        >
                          Log out
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="text-button"
                          onClick={() => setRoute("login")}
                        >
                          Log in
                        </button>
                        <span>·</span>
                        <button
                          className="text-button"
                          onClick={() => setRoute("signup")}
                        >
                          Create account
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
              {route === "new" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void make();
                  }}
                >
                  <h2>A new game</h2>
                  <label className="title-label">
                    Map
                    <select
                      aria-label="Map"
                      value={mapChoice}
                      disabled={busy}
                      onChange={(e) =>
                        setMapChoice(e.target.value as "inhabited" | "inhabited-original" | "landscape" | "woodland")
                      }
                    >
                      <option value="inhabited">Refined small valley · living settlement</option>
                      <option value="inhabited-original">Original small valley · living settlement</option>
                      <option value="landscape">Valley landscape survey (legacy)</option>
                      <option value="woodland">Woodland settlement</option>
                    </select>
                  </label>
                  <p>
                    {(mapChoice === "inhabited" || mapChoice === "inhabited-original") ? "Make a living home around Longbough. Gather reeds, weave homes and local stores, care for the next generation, and cross the creek to forage." : mapChoice === "landscape"
                      ? "Explore a crescent bluff and open basin. Cross the creek and carry supplies. Landscape study; settlement and battles come later."
                      : "Four chickens. An open clearing. The established woodland settlement."}
                  </p>
                  <label className="title-label">
                    Game name
                    <input
                      autoFocus
                      required
                      maxLength={60}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <button
                    className="title-primary"
                    disabled={busy || !name.trim()}
                  >
                    {busy ? "Creating…" : "Start new game"}
                  </button>
                  <p className="device-caption">
                    Creates a separate saved game. Your other groves are kept.
                  </p>
                </form>
              )}
              {route === "load" && (
                <>
                  <h2>Load game</h2>
                  <p className="eyebrow">ON THIS DEVICE</p>
                  <div className="slot-list">
                    {slots.length === 0 && <p>No saved games here yet.</p>}
                    {slots.map((slot) => (
                      <article className="slot-card" key={slot.id}>
                        <h3>{slot.name}</h3>
                        <p>{summary(slot)}</p>
                        <time dateTime={new Date(slot.updatedAt).toISOString()}>
                          {new Date(slot.updatedAt).toLocaleString()}
                        </time>
                        <div className="slot-actions">
                          {slot.status === "valid" ? (
                            <button
                              disabled={busy}
                              onClick={() => void play(slot.id)}
                            >
                              Play
                            </button>
                          ) : (
                            <button onClick={() => setRecovery(slot.id)}>
                              Recovery options
                            </button>
                          )}
                          <button
                            onClick={() =>
                              download(
                                slot.raw,
                                `${slot.name.replace(/[^a-z0-9-]/gi, "-")}.json`,
                              )
                            }
                          >
                            {slot.status === "valid"
                              ? "Export"
                              : "Download original"}
                          </button>
                        </div>
                        {selected?.id === slot.id &&
                          selected.status !== "valid" && (
                            <div
                              className="recovery-card"
                              role="region"
                              aria-label={`Recover ${slot.name}`}
                            >
                              <p>{selected.reason}</p>
                              <p>No autosave will overwrite this record.</p>
                              <button
                                disabled={busy}
                                onClick={() => void refresh()}
                              >
                                Retry reading
                              </button>
                              {selected.checkpoint && (
                                <button
                                  disabled={busy}
                                  onClick={() =>
                                    void run(async () => {
                                      await restoreCheckpoint(
                                        selected.id,
                                        selected.revision,
                                      );
                                      setSlots(await listSlots());
                                      setRecovery(null);
                                    })
                                  }
                                >
                                  Restore last valid checkpoint
                                </button>
                              )}
                              <button
                                disabled={busy}
                                onClick={() => {
                                  setRoute("new");
                                  setName(`Grove ${slots.length + 1}`);
                                }}
                              >
                                Start a new game · keep original
                              </button>
                            </div>
                          )}
                      </article>
                    ))}
                  </div>
                  <button
                    className="title-secondary"
                    disabled={busy}
                    onClick={() => input.current?.click()}
                  >
                    Import a game file
                  </button>
                  <input
                    hidden
                    ref={input}
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f)
                        void run(async () => {
                          if (f.size > 262144)
                            throw new Error(
                              "Save exceeds the 256 KB limit. Nothing was imported.",
                            );
                          await createSlot(
                            f.name.replace(/\.json$/i, ""),
                            await f.text(),
                          );
                          setSlots(await listSlots());
                        });
                    }}
                  />
                  <p className="device-caption">
                    Imports become a separate local game. Existing games are
                    kept.
                  </p>
                  {archive && (
                    <button
                      onClick={() =>
                        download(archive, "coop-chaos-first-evening.json")
                      }
                    >
                      Export archived story
                    </button>
                  )}
                  {archiveError && (
                    <p className="device-caption">{archiveError}</p>
                  )}
                  {account.status === "signed-in" && (
                    <section className="cloud-copies">
                      <h3>Copies in your account</h3>
                      <p>
                        Account copies support woodland settlements. Living valleys and valley
                        games stay on this device; use Export and Import to move
                        them.
                      </p>
                      <p>
                        Explicit copies, separate from games on this device.
                      </p>
                      {copies.map((copy) => (
                        <article className="slot-card" key={copy.id}>
                          <h3>{copy.name}</h3>
                          <time>
                            {new Date(copy.createdAt).toLocaleString()}
                          </time>
                          <button
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                const owner = accountId.current;
                                const data = await accountService.copies.get(
                                  copy.id,
                                );
                                if (owner !== accountId.current)
                                  throw new Error(
                                    "Your account changed. Nothing was loaded.",
                                  );
                                await createSlot(data.name, data.text);
                                setSlots(await listSlots());
                                setCloudNotice(
                                  "Account copy loaded as a new game on this device.",
                                );
                              })
                            }
                          >
                            Load as new local game
                          </button>
                        </article>
                      ))}
                      {moreCopies && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              const owner = accountId.current;
                              const generation = ++copyGeneration.current;
                              const page =
                                await accountService.copies.list(copyOffset);
                              if (
                                owner !== accountId.current ||
                                generation !== copyGeneration.current
                              )
                                return;
                              setCopies((current) => [
                                ...current,
                                ...page.filter(
                                  (copy) =>
                                    !current.some((old) => old.id === copy.id),
                                ),
                              ]);
                              setCopyOffset(copyOffset + page.length);
                              setMoreCopies(page.length === copyPageSize);
                            })
                          }
                        >
                          Load more account copies
                        </button>
                      )}
                      <label className="title-label">
                        Game to copy
                        <select
                          value={copySource}
                          onChange={(e) => {
                            setCopySource(e.target.value);
                            copyIntent.current = null;
                            setCopyRetry(false);
                          }}
                        >
                          <option value="">Choose a local game</option>
                          {cloudValid.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        disabled={busy || !copySource}
                        onClick={() =>
                          void run(async () => {
                            const slot = slots.find((s) => s.id === copySource);
                            if (
                              slot?.status === "valid" &&
                              (isLandscape(slot.state) || slot.state.world)
                            )
                              throw new Error(
                                "Export this valley game to move it; account copies support woodland settlements.",
                              );
                            if (!slot || slot.status !== "valid")
                              throw new Error("Choose a valid local game.");
                            const owner = accountId.current;
                            if (!owner)
                              throw new Error(
                                "Log in before saving an account copy.",
                              );
                            const intent = copyIntent.current ?? {
                              id: crypto.randomUUID(),
                              owner,
                              slot: slot.id,
                              name: slot.name,
                              text: encodeGame(slot.state),
                            };
                            if (
                              intent.owner !== owner ||
                              intent.slot !== slot.id
                            )
                              throw new Error(
                                "Choose this game again to save an account copy.",
                              );
                            copyIntent.current = intent;
                            setCopyRetry(true);
                            await accountService.copies.create(
                              intent.name,
                              intent.text,
                              intent.id,
                              owner,
                            );
                            const generation = ++copyGeneration.current;
                            const updated = await accountService.copies.list();
                            if (owner !== accountId.current)
                              throw new Error(
                                "Your account changed. Refresh account copies to check the saved result.",
                              );
                            copyIntent.current = null;
                            setCopyRetry(false);
                            if (generation !== copyGeneration.current) return;
                            setCopies(updated);
                            setCopyOffset(updated.length);
                            setMoreCopies(updated.length === copyPageSize);
                            setCloudNotice(
                              "A separate copy was saved to your account.",
                            );
                          })
                        }
                      >
                        {copyRetry
                          ? "Retry saving this copy"
                          : "Save copy to account"}
                      </button>
                      {cloudNotice && <p role="status">{cloudNotice}</p>}
                    </section>
                  )}
                </>
              )}
              {(route === "login" || route === "signup") && (
                <AccountPanel mode={route} onClose={() => setRoute("title")} />
              )}
            </>
          )}
          {error && (
            <div className="title-error" role="alert">
              <p>{error}</p>
              <button disabled={busy} onClick={() => void refresh()}>
                Retry device storage
              </button>
            </div>
          )}
        </section>
        <footer className="title-footer">
          A living chicken settlement · single player
        </footer>
      </main>
    </div>
  );
}
