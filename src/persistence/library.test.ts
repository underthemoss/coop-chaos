import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSlot,
  initializeLibrary,
  inspectSlot,
  listSlots,
  openSlot,
  restoreCheckpoint,
  writeSlot,
} from "./library";
import { command, initialSettlement } from "../simulation/settlement";
import { encodeSettlement } from "./settlement-save";

function db(name: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => {
      if (name === "coop-chaos") r.result.createObjectStore("saves");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function legacy(raw: string) {
  const d = await db("coop-chaos");
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction("saves", "readwrite");
    tx.objectStore("saves").put(raw, "settlement");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  d.close();
}
async function original() {
  const d = await db("coop-chaos");
  const raw = await new Promise<string>((resolve) => {
    const q = d.transaction("saves").objectStore("saves").get("settlement");
    q.onsuccess = () => resolve(q.result);
  });
  d.close();
  return raw;
}
async function corrupt(id: string, raw: string) {
  const d = await db("coop-chaos-library");
  await new Promise<void>((resolve) => {
    const tx = d.transaction("slots", "readwrite"),
      store = tx.objectStore("slots"),
      q = store.get(id);
    q.onsuccess = () => store.put({ ...q.result, raw });
    tx.oncomplete = () => resolve();
  });
  d.close();
}
function locks() {
  const held = new Set<string>();
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      locks: {
        request: async (
          name: string,
          _options: unknown,
          callback: (lock: object | null) => Promise<void>,
        ) => {
          if (held.has(name)) return callback(null);
          held.add(name);
          try {
            await callback({ name });
          } finally {
            held.delete(name);
          }
        },
      },
    },
  });
}
beforeEach(async () => {
  vi.restoreAllMocks();
  locks();
  for (const name of ["coop-chaos-library", "coop-chaos"]) {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.deleteDatabase(name);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }
});
describe("device game library", () => {
  it("distinguishes absent games and imports old save once without changing original bytes or state", async () => {
    expect(await initializeLibrary()).toEqual([]);
    // Once absence was recorded, later legacy writes must not resurrect a deleted/imported game.
    await legacy(encodeSettlement(initialSettlement()));
    expect(await initializeLibrary()).toEqual([]);
  });
  it("imports a valid original once with exact history and keeps the old key untouched", async () => {
    const s = command(initialSettlement(), { type: "pause" });
    const raw = encodeSettlement(s);
    await legacy(raw);
    const first = await initializeLibrary();
    expect(first).toHaveLength(1);
    expect(first[0].status).toBe("valid");
    if (first[0].status === "valid") expect(first[0].state).toEqual(s);
    expect((await initializeLibrary()).map((s) => s.id)).toEqual([
      "legacy-device",
    ]);
    expect(await original()).toBe(raw);
  });
  it("retains corrupt and unsupported original bytes, and new games do not replace them", async () => {
    const raw = "{  exact unreadable original\n";
    await legacy(raw);
    const [bad] = await initializeLibrary();
    expect(bad.status).toBe("damaged");
    expect(bad.raw).toBe(raw);
    await createSlot("Second grove");
    expect(await original()).toBe(raw);
    expect((await listSlots()).find((s) => s.id === bad.id)?.raw).toBe(raw);
    expect(inspectSlot({ ...bad, raw: '{"schemaVersion":99}' }).status).toBe(
      "newer",
    );
  });
  it("creates distinct games/imports and rejects invalid import without replacing any game", async () => {
    await initializeLibrary();
    const a = await createSlot("First");
    const b = await createSlot("Second", a.raw);
    expect(a.id).not.toBe(b.id);
    await expect(createSlot("No", "{bad")).rejects.toThrow();
    expect(await listSlots()).toHaveLength(2);
    expect((await listSlots()).every((s) => s.raw === a.raw)).toBe(true);
  });
  it("validates before commit, preserves latest good on storage failure and rejects stale revisions atomically", async () => {
    const a = await createSlot("First");
    await expect(writeSlot(a.id, 0, "invalid")).rejects.toThrow();
    expect((await listSlots())[0].revision).toBe(0);
    const bad = vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new DOMException("Quota fixture", "QuotaExceededError");
    });
    await expect(writeSlot(a.id, 0, a.raw)).rejects.toThrow("Quota fixture");
    bad.mockRestore();
    expect((await listSlots())[0].revision).toBe(0);
    const next = await writeSlot(
      a.id,
      0,
      encodeSettlement(command(initialSettlement(), { type: "pause" })),
    );
    expect(next.revision).toBe(1);
    expect(next.checkpoint).toBe(a.raw);
    await expect(writeSlot(a.id, 0, a.raw)).rejects.toThrow("another tab");
    expect((await listSlots())[0].raw).toBe(next.raw);
  });
  it("restores a validated checkpoint while keeping rejected bytes in a separate recovery record", async () => {
    const a = await createSlot("First");
    await writeSlot(
      a.id,
      0,
      encodeSettlement(command(initialSettlement(), { type: "pause" })),
    );
    await corrupt(a.id, "EXACT BAD BYTES");
    const restored = await restoreCheckpoint(a.id, 1);
    expect(restored.status).toBe("valid");
    expect(restored.raw).toBe(a.raw);
    const records = await listSlots();
    expect(records).toHaveLength(2);
    expect(records.some((s) => s.raw === "EXACT BAD BYTES")).toBe(true);
  });
  it("holds one writer per slot; captures queued states at request time; closes without stale writes", async () => {
    const a = await createSlot("First"),
      b = await createSlot("Other");
    const session = await openSlot(a.id);
    await expect(openSlot(a.id)).rejects.toThrow("another tab");
    const state = initialSettlement();
    const first = session.save(state);
    state.paused = true;
    const second = session.save(state);
    await Promise.all([first, second]);
    const saved = (await listSlots()).find((s) => s.id === a.id)!;
    expect(JSON.parse(saved.checkpoint!).state.paused).toBe(false);
    expect(JSON.parse(saved.raw).state.paused).toBe(true);
    session.close();
    await expect(session.save(initialSettlement())).rejects.toThrow(
      "no longer save",
    );
    const other = await openSlot(b.id);
    await other.save(initialSettlement());
    other.close();
    expect((await listSlots()).find((s) => s.id === a.id)?.revision).toBe(2);
  });
  it("prevents a session from overwriting a newer revision, retaining its exportable in-memory state", async () => {
    const a = await createSlot("First"),
      session = await openSlot(a.id);
    const newer = await writeSlot(
      a.id,
      0,
      encodeSettlement(command(initialSettlement(), { type: "pause" })),
    );
    await expect(session.save(initialSettlement())).rejects.toThrow(
      "another tab",
    );
    await expect(session.save(initialSettlement())).rejects.toThrow(
      "no longer save",
    );
    expect((await listSlots())[0].raw).toBe(newer.raw);
    expect(session.state).toEqual(initialSettlement());
    session.close();
  });
});
