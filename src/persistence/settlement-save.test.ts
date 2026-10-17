import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  decodeSettlement,
  encodeSettlement,
  legacyArchive,
  loadSettlement,
  saveQueue,
  validateSettlement,
  settlementMigrationNotice,
} from "./settlement-save";
import { trees } from "../content/settlement";
import { command, initialSettlement, step } from "../simulation/settlement";
import { saveGame } from "./save";
describe("settlement persistence", () => {
  it("preserves the legacy story separately and orders tick/restart writes", async () => {
    await saveGame({ choice: "rank" });
    const save = saveQueue();
    const a = initialSettlement();
    a.tick = 1;
    await Promise.all([save(a), save(initialSettlement())]);
    expect(await loadSettlement()).toEqual(initialSettlement());
    expect(await legacyArchive()).toContain('"rank"');
  });
  it("rejects malformed data, excess stock, broken references, duplicate birds, invalid edges and old stories", () => {
    const initial = initialSettlement();
    for (const mutate of [
      (s: typeof initial) => s.piles[0].stock++,
      (s: typeof initial) => s.paths.push("99,0"),
      (s: typeof initial) => (s.birds[1].id = s.birds[0].id),
      (s: typeof initial) => (s.birds[0].cargo = 1),
      (s: typeof initial) =>
        (s.birds[0].edge = { to: { x: 0, z: 0 }, progress: 0.5 }),
    ]) {
      const s = structuredClone(initial);
      mutate(s);
      expect(() => decodeSettlement(encodeSettlement(s))).toThrow();
      expect(initialSettlement()).toEqual(initial);
    }
    for (const text of [
      "null",
      "{}",
      "not json",
      '{"schemaVersion":1,"storyVersion":"first-evening-1","choice":"rank"}',
    ])
      expect(() => decodeSettlement(text)).toThrow();
  });
});

// Freeze the original envelope's shape and forty-bundle starting budget explicitly.
function legacyEnvelope(state = initialSettlement()) {
  const {
    patches: _patches,
    initialReeds: _initial,
    harvestedReeds: _harvested,
    ...legacy
  } = state;
  return {
    schemaVersion: 1,
    simulationVersion: "settlement-1",
    state: {
      ...legacy,
      birds: legacy.birds.map(
        ({ gatheringProgress: _progress, ...bird }) => bird,
      ),
    },
  };
}
function fortyBundleFixture() {
  const s = initialSettlement();
  s.initialReeds = 40;
  s.totalReeds = 40;
  s.piles[0].stock = 40;
  return s;
}
describe("versioned finite-reed saves", () => {
  it("writes a strict version-two envelope and round-trips the fresh eight-bundle world", () => {
    const s = initialSettlement();
    expect(JSON.parse(encodeSettlement(s))).toMatchObject({
      schemaVersion: 2,
      simulationVersion: "settlement-2",
    });
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    expect(s.totalReeds).toBe(8);
  });
  it("fully validates version one before adding unworked patches without resetting saved deliveries or progress", () => {
    let s = fortyBundleFixture();
    for (const at of [
      { x: -2, z: -2 },
      { x: -2, z: -1 },
      { x: -2, z: 0 },
      { x: -2, z: 1 },
      { x: -2, z: 2 },
    ])
      s = command(s, { type: "path", at });
    s = command(s, { type: "build", kind: "treehouse", at: { x: -2, z: 2 } });
    for (let n = 0; n < 17; n++) s = step(s);
    expect(s.birds.some((b) => b.cargo || b.edge)).toBe(true);
    const envelope = legacyEnvelope(s);
    const original = JSON.stringify(envelope);
    const migrated = decodeSettlement(original);
    expect(migrated).toEqual(s);
    expect(migrated.initialReeds).toBe(40);
    expect(migrated.harvestedReeds).toBe(0);
    expect(
      migrated.patches.every(
        (p) => p.remaining === p.capacity && !p.designated,
      ),
    ).toBe(true);
    expect(JSON.stringify(envelope)).toBe(original);
    expect(decodeSettlement(encodeSettlement(migrated))).toEqual(migrated);
    let direct = s;
    let reopened = migrated;
    for (let n = 0; n < 350; n++) {
      direct = step(direct);
      reopened = step(reopened);
    }
    expect(reopened).toEqual(direct);
    expect(reopened.piles[0].stock).toBe(34);
  });
  it("relocates new patches around legacy stores deterministically while preserving sites and paths", () => {
    const state = fortyBundleFixture();
    for (const at of [
      { x: -4, z: 0 },
      { x: 3, z: -2 },
    ]) {
      state.sites.push({
        id: `site-${state.nextId++}`,
        kind: "store",
        at,
        tree: null,
        delivered: 0,
        progress: 30,
        complete: true,
        stock: 0,
        target: 0,
        contributors: [],
      });
      state.consumed += 4;
      state.piles[0].stock -= 4;
    }
    state.paths.push("-4,-1");
    const text = JSON.stringify(legacyEnvelope(state));
    const migrated = decodeSettlement(text);
    expect(migrated.sites).toEqual(state.sites);
    expect(migrated.paths).toEqual(state.paths);
    expect(migrated.piles).toEqual(state.piles);
    expect(migrated.birds).toEqual(state.birds);
    expect(migrated.consumed).toBe(8);
    expect(migrated.patches.map((p) => p.at)).toEqual([
      { x: -4, z: -1 },
      { x: 3, z: -3 },
    ]);
    expect(migrated).toEqual(decodeSettlement(text));
    expect(decodeSettlement(encodeSettlement(migrated))).toEqual(migrated);
    let working = command(migrated, { type: "path", at: { x: -4, z: -2 } });
    working = command(working, {
      type: "gather",
      id: "patch-west",
      designated: true,
    });
    for (let n = 0; n < 800; n++) {
      working = step(working);
      validateSettlement(working);
      if (n === 38) working = decodeSettlement(encodeSettlement(working));
    }
    expect(working.patches[0].remaining).toBe(0);
    expect(working.harvestedReeds).toBe(12);
    expect(working.sites).toEqual(state.sites);
    expect(working.piles[0].stock).toBe(44);
    expect(decodeSettlement(encodeSettlement(working))).toEqual(working);
  });
  it("accepts distinct legal relocated patch cells but rejects overlaps with trees, caches or each other", () => {
    const state = initialSettlement();
    state.patches[0].at = { x: -4, z: -1 };
    expect(decodeSettlement(encodeSettlement(state))).toEqual(state);
    for (const at of [{ x: 1, z: 3 }, { x: -3, z: -2 }, state.patches[1].at]) {
      const invalid = structuredClone(state);
      invalid.patches[0].at = at;
      expect(() => decodeSettlement(encodeSettlement(invalid))).toThrow();
    }
    const occupied = command(state, {
      type: "build",
      kind: "store",
      at: { x: 0, z: 0 },
    });
    occupied.patches[0].at = { x: 0, z: 0 };
    expect(() => decodeSettlement(encodeSettlement(occupied))).toThrow();
  });
  it("accepts a legacy glade covered by unpaid blueprints, preserving every site", () => {
    const state = fortyBundleFixture();
    for (let z = -3; z <= 3; z++)
      for (let x = -4; x <= 4; x++) {
        if (x === -3 && z === -2) continue;
        const tree = trees.find((t) => t.x === x && t.z === z);
        state.sites.push({
          id: `site-${state.nextId++}`,
          at: { x, z },
          kind: tree ? "treehouse" : "store",
          tree: tree?.id ?? null,
          delivered: 0,
          progress: 0,
          complete: false,
          stock: 0,
          target: 0,
          contributors: [],
        });
      }
    expect(state.sites).toHaveLength(62);
    expect(state.piles[0].stock).toBe(40);
    const migrated = decodeSettlement(JSON.stringify(legacyEnvelope(state)));
    expect(migrated.sites).toEqual(state.sites);
    expect(migrated.birds).toEqual(state.birds);
    expect(migrated.piles).toEqual(state.piles);
    expect(migrated.paths).toEqual(state.paths);
    expect(migrated.patches).toEqual([]);
    expect(migrated.initialReeds).toBe(40);
    expect(migrated.totalReeds).toBe(40);
    expect(migrated.harvestedReeds).toBe(0);
    expect(decodeSettlement(encodeSettlement(migrated))).toEqual(migrated);
    expect(settlementMigrationNotice(migrated)).toContain("0 of 2");
    const cleared = command(migrated, {
      type: "cancel",
      id: migrated.sites[0].id,
    });
    expect(cleared.patches).toEqual([]);
    expect(decodeSettlement(encodeSettlement(cleared))).toEqual(cleared);
    expect(settlementMigrationNotice(cleared)).toContain(
      "clearing space does not create additional patches",
    );
    const oneFree = structuredClone(state);
    oneFree.sites.pop();
    const partial = decodeSettlement(JSON.stringify(legacyEnvelope(oneFree)));
    expect(partial.patches).toHaveLength(1);
    expect(partial.patches[0]).toMatchObject({
      id: "patch-west",
      at: { x: 4, z: 3 },
      capacity: 12,
      remaining: 12,
      harvested: 0,
    });
    expect(partial.sites).toEqual(oneFree.sites);
    expect(decodeSettlement(encodeSettlement(partial))).toEqual(partial);
    expect(settlementMigrationNotice(partial)).toContain("1 of 2");
  });
  it("requires both patches in fresh worlds and rejects harvesting from absent legacy patches", () => {
    const fresh = initialSettlement();
    fresh.patches.pop();
    expect(() => validateSettlement(fresh)).toThrow();
    expect(settlementMigrationNotice(initialSettlement())).toBeNull();
    const older = fortyBundleFixture();
    older.patches = [];
    expect(validateSettlement(older)).toEqual(older);
    older.birds[0].job = {
      kind: "gather",
      source: "patch-west",
      destination: "reeds",
      stage: "pickup",
    };
    expect(() => validateSettlement(older)).toThrow();
    older.birds[0].job = null;
    older.harvestedReeds = 1;
    older.totalReeds = 41;
    older.piles[0].stock = 41;
    expect(() => validateSettlement(older)).toThrow();
  });
  it("preserves legacy sleep, attachments, rest and observed history exactly", () => {
    let s = fortyBundleFixture();
    s.birds[0].resting = true;
    s.birds[0].memories = ["A prior observed journey."];
    s.birds[0].deliveries = 4;
    s = command(s, { type: "phase", phase: "evening" });
    for (let n = 0; n < 70; n++) s = step(s);
    expect(s.birds.every((b) => b.perch)).toBe(true);
    expect(decodeSettlement(JSON.stringify(legacyEnvelope(s)))).toEqual(s);
  });
  it("rejects invalid legacy budgets and extra new fields instead of laundering them through migration", () => {
    const original = legacyEnvelope(fortyBundleFixture());
    const extra = structuredClone(original);
    Object.assign(extra.state, { patches: [] });
    const lowBudget = legacyEnvelope(initialSettlement());
    const invalidJob = structuredClone(original);
    Object.assign(invalidJob.state.birds[0], {
      job: {
        kind: "gather",
        source: "patch-west",
        destination: "reeds",
        stage: "pickup",
      },
    });
    const duplicate = structuredClone(original);
    duplicate.state.birds[1].id = duplicate.state.birds[0].id;
    for (const envelope of [extra, lowBudget, invalidJob, duplicate])
      expect(() => decodeSettlement(JSON.stringify(envelope))).toThrow();
  });
  it("rejects more pickup reservations than a patch's remaining yield", () => {
    const state = initialSettlement();
    Object.assign(state.patches[0], {
      designated: true,
      remaining: 1,
      harvested: 11,
    });
    state.harvestedReeds = 11;
    state.totalReeds = 19;
    state.piles[0].stock = 19;
    for (const bird of state.birds.slice(0, 2))
      bird.job = {
        kind: "gather",
        source: "patch-west",
        destination: "reeds",
        stage: "pickup",
      };
    expect(() => validateSettlement(state)).toThrow();
    state.birds[1].job = null;
    expect(validateSettlement(state)).toEqual(state);
  });
  it("rejects forged patch accounting, shapes, reservations, progress and version pairing", () => {
    const original = initialSettlement();
    const mutations: ((s: typeof original) => void)[] = [
      (s) => {
        s.patches[0].remaining--;
      },
      (s) => {
        s.patches[0].capacity++;
      },
      (s) => {
        s.patches[0].harvested++;
      },
      (s) => {
        s.harvestedReeds++;
        s.totalReeds++;
        s.piles[0].stock++;
      },
      (s) => {
        s.patches[1] = structuredClone(s.patches[0]);
      },
      (s) => {
        s.patches[0].at.x = 99;
      },
      (s) => {
        s.birds[0].gatheringProgress = 1;
      },
      (s) => {
        s.birds[0].job = {
          kind: "gather",
          source: "missing",
          destination: "reeds",
          stage: "pickup",
        };
      },
      (s) => {
        s.birds[0].job = {
          kind: "gather",
          source: "patch-west",
          destination: "reeds",
          stage: "pickup",
        };
      },
      (s) => {
        Object.assign(s.patches[0], { extra: true });
      },
    ];
    for (const mutate of mutations) {
      const state = structuredClone(original);
      mutate(state);
      expect(() => validateSettlement(state)).toThrow();
    }
    const envelope = JSON.parse(encodeSettlement(original));
    envelope.schemaVersion = 1;
    expect(() => decodeSettlement(JSON.stringify(envelope))).toThrow();
    envelope.schemaVersion = 2;
    envelope.simulationVersion = "settlement-1";
    expect(() => decodeSettlement(JSON.stringify(envelope))).toThrow();
  });
});
