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
import { decodeSettlement, encodeSettlement } from "./settlement-save";
import { isLandscape } from "./game-save";
import { moveWalker, stepLandscape } from "../simulation/landscape";

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
  it("saves and reopens direct state through the real device session owner", async () => {
    const slot=await createSlot("Direct readback",encodeSettlement(initialSettlement()));
    const session=await openSlot(slot.id);
    if(isLandscape(session.state))throw new Error("Expected settlement");
    const next=command(command(session.state,{type:"stop",bird:"fern"}),{type:"pause"});
    await session.save(next);session.close();await new Promise(resolve=>setTimeout(resolve,0));
    const reopened=await openSlot(slot.id);expect(reopened.state).toEqual(next);reopened.close();
    expect((await listSlots()).find(s=>s.id===slot.id)?.status).toBe("valid");
  });

  it("stores landscape and woodland together, exports/imports routes, and retains landscape locking", async () => {
    const old = await createSlot("Woodland");
    const valley = await createSlot("Valley", undefined, "landscape");
    const session = await openSlot(valley.id);
    if (!isLandscape(session.state)) throw new Error("Expected valley");
    const walking = stepLandscape(
      moveWalker(session.state, "fern", { x: 25, z: 21 })!,
      2.3,
    );
    await session.save(walking);
    await expect(openSlot(valley.id)).rejects.toThrow("another tab");
    session.close();
    const saved = (await listSlots()).find((s) => s.id === valley.id)!;
    const imported = await createSlot("Portable valley", saved.raw);
    expect(imported.status).toBe("valid");
    if (imported.status === "valid") expect(imported.state).toEqual(walking);
    expect((await listSlots()).find((s) => s.id === old.id)?.raw).toBe(old.raw);
    const bad = JSON.parse(saved.raw);
    bad.state.mapVersion = 999;
    const unreadable = inspectSlot({ ...saved, raw: JSON.stringify(bad) });
    expect(unreadable.status).toBe("damaged");
    if (unreadable.status !== "valid")
      expect(unreadable.reason).toContain("map version");
    await expect(createSlot("Unknown", JSON.stringify(bad))).rejects.toThrow(
      "map version",
    );
  });

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
  it("keeps an original living valley exact when a refined valley gets its own slot and reopens", async () => {
    const original = await createSlot("Original valley", undefined, "inhabited-original");
    const originalState = decodeSettlement(original.raw);
    expect(originalState.world).toEqual({id:"inhabited-valley",version:1});
    const refined = await createSlot("Refined valley", undefined, "inhabited");
    expect(refined.id).not.toBe(original.id);
    const refinedState=decodeSettlement(refined.raw);
    expect(refinedState.world).toEqual({id:"inhabited-valley",version:2});
    const paused=command(refinedState,{type:"pause"});
    await writeSlot(refined.id,0,encodeSettlement(paused));
    const stored=await listSlots();
    expect(stored.find(s=>s.id===original.id)!.raw).toBe(original.raw);
    expect(decodeSettlement(stored.find(s=>s.id===original.id)!.raw)).toEqual(originalState);
    expect(decodeSettlement(stored.find(s=>s.id===refined.id)!.raw)).toEqual(paused);
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
