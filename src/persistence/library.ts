import { decodeSettlement, encodeSettlement } from "./settlement-save";
import { initialSettlement } from "../simulation/settlement";
import type { Settlement } from "../simulation/settlement";

/** Device metadata is deliberately independent of the simulation save envelope. */
export interface Slot {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  revision: number;
  raw: string;
  checkpoint: string | null;
}
export type SaveProblem = "damaged" | "newer";
export type SlotView = Slot &
  (
    | { status: "valid"; state: Settlement }
    | { status: SaveProblem; reason: string }
  );
export class LibraryError extends Error {
  constructor(
    public kind: "storage" | "conflict" | "locked" | "invalid",
    message: string,
  ) {
    super(message);
  }
}
const DB = "coop-chaos-library";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("slots", { keyPath: "id" });
      r.result.createObjectStore("meta");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(
        new LibraryError(
          "storage",
          "Device storage could not be opened. Your saved games have not been replaced.",
        ),
      );
    r.onblocked = () =>
      reject(
        new LibraryError(
          "storage",
          "Close older Coop Chaos tabs, then retry opening your games.",
        ),
      );
  });
}
function transaction<T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction, result: (v: T) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let value: T;
    const tx = db.transaction(stores, mode);
    tx.oncomplete = () => resolve(value);
    tx.onerror = tx.onabort = () =>
      reject(
        tx.error ??
          new LibraryError(
            "storage",
            "The device save did not complete. The previous saved game is retained.",
          ),
      );
    try {
      work(tx, (v) => {
        value = v;
      });
    } catch (error) {
      tx.abort();
      reject(error);
    }
  });
}
export function inspectSlot(slot: Slot): SlotView {
  try {
    return { ...slot, status: "valid", state: decodeSettlement(slot.raw) };
  } catch {
    let newer = false;
    try {
      const envelope = JSON.parse(slot.raw);
      newer = Number(envelope.schemaVersion) > 8;
    } catch {
      /* unreadable bytes stay available for download */
    }
    return {
      ...slot,
      status: newer ? "newer" : "damaged",
      reason: newer
        ? "This game was saved by a newer version. Open it with an updated game; the original is preserved."
        : "This game could not be read. Its original data is preserved; download it before seeking help.",
    };
  }
}
async function legacyRaw(): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("coop-chaos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("saves");
    r.onerror = () =>
      reject(
        new LibraryError(
          "storage",
          "The previous device save could not be accessed. Retry before creating a game.",
        ),
      );
    r.onblocked = () =>
      reject(
        new LibraryError("storage", "Close older Coop Chaos tabs, then retry."),
      );
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction("saves");
      const q = tx.objectStore("saves").get("settlement");
      tx.oncomplete = () => {
        db.close();
        resolve(q.result as string | undefined);
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}
/** Import the old single key once. Never update or delete that original key. */
export async function initializeLibrary(): Promise<SlotView[]> {
  const db = await database();
  try {
    const migrated = await transaction<boolean>(
      db,
      ["meta"],
      "readonly",
      (tx, result) => {
        const r = tx.objectStore("meta").get("legacy-imported");
        r.onsuccess = () => result(r.result === true);
      },
    );
    if (!migrated) {
      const raw = await legacyRaw();
      await transaction<void>(
        db,
        ["meta", "slots"],
        "readwrite",
        (tx, result) => {
          const meta = tx.objectStore("meta");
          const check = meta.get("legacy-imported");
          check.onsuccess = () => {
            if (check.result !== true) {
              if (raw !== undefined) {
                const now = Date.now();
                tx.objectStore("slots").add({
                  id: "legacy-device",
                  name: "My first grove",
                  createdAt: now,
                  updatedAt: now,
                  revision: 0,
                  raw,
                  checkpoint: null,
                } satisfies Slot);
              }
              meta.put(true, "legacy-imported");
            }
            result();
          };
        },
      );
    }
    return await listWith(db);
  } finally {
    db.close();
  }
}
async function listWith(db: IDBDatabase): Promise<SlotView[]> {
  const slots = await transaction<Slot[]>(
    db,
    ["slots"],
    "readonly",
    (tx, result) => {
      const r = tx.objectStore("slots").getAll();
      r.onsuccess = () => result(r.result);
    },
  );
  return slots
    .map(inspectSlot)
    .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
}
export async function listSlots(): Promise<SlotView[]> {
  const db = await database();
  try {
    return await listWith(db);
  } finally {
    db.close();
  }
}
function validText(state: Settlement): string {
  const raw = encodeSettlement(state);
  decodeSettlement(raw);
  return raw;
}
function nameOf(name: string) {
  const clean = name.trim().slice(0, 60);
  if (!clean) throw new LibraryError("invalid", "Give this grove a name.");
  return clean;
}
export async function createSlot(
  name: string,
  text?: string,
): Promise<SlotView> {
  const raw = validText(
    text === undefined ? initialSettlement() : decodeSettlement(text),
  );
  const now = Date.now();
  const slot: Slot = {
    id: crypto.randomUUID(),
    name: nameOf(name),
    createdAt: now,
    updatedAt: now,
    revision: 0,
    raw,
    checkpoint: null,
  };
  const db = await database();
  try {
    await transaction<void>(db, ["slots"], "readwrite", (tx, result) => {
      tx.objectStore("slots").add(slot);
      result();
    });
    return inspectSlot(slot);
  } finally {
    db.close();
  }
}
/** Optimistic revision is checked inside the same transaction as the replacement. */
export async function writeSlot(
  id: string,
  expected: number,
  raw: string,
): Promise<Slot> {
  decodeSettlement(raw);
  const db = await database();
  let conflict = false;
  try {
    const next = await transaction<Slot | undefined>(
      db,
      ["slots"],
      "readwrite",
      (tx, result) => {
        const store = tx.objectStore("slots"),
          r = store.get(id);
        r.onsuccess = () => {
          const old = r.result as Slot | undefined;
          if (!old || old.revision !== expected) {
            conflict = true;
            result(undefined);
            return;
          }
          if (inspectSlot(old).status !== "valid") {
            conflict = true;
            result(undefined);
            return;
          }
          const next = {
            ...old,
            raw,
            checkpoint: old.raw,
            revision: old.revision + 1,
            updatedAt: Date.now(),
          };
          store.put(next);
          result(next);
        };
      },
    );
    if (conflict || !next)
      throw new LibraryError(
        "conflict",
        "This game changed in another tab. Your unsaved session is kept here. Export it, then return to title and reopen the saved game.",
      );
    return next;
  } finally {
    db.close();
  }
}
export async function restoreCheckpoint(
  id: string,
  expected: number,
): Promise<SlotView> {
  const release = await claimWriter(id);
  let db: IDBDatabase | undefined;
  let problem = false;
  try {
    db = await database();
  } catch (e) {
    release();
    throw e;
  }
  try {
    const next = await transaction<Slot | undefined>(
      db,
      ["slots"],
      "readwrite",
      (tx, result) => {
        const store = tx.objectStore("slots"),
          r = store.get(id);
        r.onsuccess = () => {
          const old = r.result as Slot | undefined;
          if (!old || old.revision !== expected || old.checkpoint === null) {
            problem = true;
            result(undefined);
            return;
          }
          try {
            decodeSettlement(old.checkpoint);
          } catch {
            problem = true;
            result(undefined);
            return;
          }
          // Retain the rejected bytes as a separate recovery record before restoring.
          const now = Date.now();
          store.add({
            ...old,
            id: crypto.randomUUID(),
            name: `${old.name} · original`,
            createdAt: now,
            updatedAt: now,
            revision: 0,
            checkpoint: null,
          });
          const next = {
            ...old,
            raw: old.checkpoint,
            checkpoint: null,
            revision: old.revision + 1,
            updatedAt: now,
          };
          store.put(next);
          result(next);
        };
      },
    );
    if (problem || !next)
      throw new LibraryError(
        "conflict",
        "The checkpoint is unavailable or this game changed. Reload the game library and try again.",
      );
    return inspectSlot(next);
  } finally {
    db.close();
    release();
  }
}
export interface GameSession {
  slot: Slot;
  state: Settlement;
  save: (state: Settlement) => Promise<void>;
  close: () => void;
}
/** A held browser lock prevents two active writers. No silent takeover. */
async function claimWriter(id: string): Promise<() => void> {
  if (!globalThis.navigator?.locks)
    throw new LibraryError(
      "locked",
      "This browser cannot safely lock a saved game. Use a browser with Web Locks support to play; you can still export your games.",
    );
  let release!: () => void;
  let acquired!: (value: boolean) => void;
  const ready = new Promise<boolean>((r) => {
    acquired = r;
  });
  const held = new Promise<void>((r) => {
    release = r;
  });
  const lockTask = navigator.locks.request(
    `coop-chaos:slot:${id}`,
    { ifAvailable: true },
    async (lock) => {
      acquired(!!lock);
      if (lock) await held;
    },
  );
  void lockTask.catch(() => acquired(false));
  if (!(await ready))
    throw new LibraryError(
      "locked",
      "This grove is open in another tab. Save and return to title there, then try again. Your game has not been taken over.",
    );
  return release;
}
export async function openSlot(id: string): Promise<GameSession> {
  const release = await claimWriter(id);
  try {
    const view = (await listSlots()).find((s) => s.id === id);
    if (!view || view.status !== "valid")
      throw new LibraryError(
        "invalid",
        "This saved game is unavailable. Open Load game for recovery options.",
      );
    let slot: Slot = view,
      closed = false,
      conflicted = false,
      tail: Promise<void> = Promise.resolve();
    return {
      slot: view,
      state: view.state,
      save(state) {
        if (closed || conflicted)
          return Promise.reject(
            new LibraryError(
              "conflict",
              "This game session can no longer save. Export your session, then reopen from title.",
            ),
          );
        // Capture and validate now, rather than after an earlier write finishes.
        let raw: string;
        try {
          raw = validText(state);
        } catch {
          return Promise.reject(
            new LibraryError(
              "invalid",
              "This session could not be validated. The previous save is retained. Export this session for recovery.",
            ),
          );
        }
        const pending = tail
          .catch(() => undefined)
          .then(async () => {
            if (closed || conflicted)
              throw new LibraryError(
                "conflict",
                "This session is closed. The saved game is unchanged.",
              );
            try {
              slot = await writeSlot(id, slot.revision, raw);
            } catch (e) {
              if (e instanceof LibraryError && e.kind === "conflict")
                conflicted = true;
              throw e;
            }
          });
        tail = pending;
        return pending;
      },
      close() {
        closed = true;
        void tail.catch(() => undefined).finally(release);
      },
    };
  } catch (e) {
    release();
    throw e;
  }
}
