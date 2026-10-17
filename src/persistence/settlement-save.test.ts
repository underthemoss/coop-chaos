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
import { foodPatches, forageTuning, trees } from "../content/settlement";
import {
  command,
  conserved,
  feedingSpots,
  foodConserved,
  initialSettlement,
  step,
} from "../simulation/settlement";
import type { Settlement } from "../simulation/settlement";
import { saveGame } from "./save";
function fortyBundleFixture() {
  const s = initialSettlement();
  s.initialReeds = 40;
  s.totalReeds = 40;
  s.piles[0].stock = 40;
  return s;
}
/** Old shapes are explicit: migration cannot accidentally depend on new fields. */
function oldEnvelope(state: Settlement, version: 1 | 2) {
  const { forage: _forage, ...legacy } = structuredClone(state);
  const birds = legacy.birds.map(
    ({
      satiety: _satiety,
      foragePreference: _preference,
      rememberedForage: _memory,
      foraging: _foraging,
      ...b
    }) => b,
  );
  const v2 = {
    ...legacy,
    paths: ["-3,-2", "-2,-2", "-2,-1", "-2,0", "-2,1", "-2,2"],
    birds,
  };
  if (version === 2)
    return { schemaVersion: 2, simulationVersion: "settlement-2", state: v2 };
  const {
    patches: _patches,
    initialReeds: _initial,
    harvestedReeds: _harvested,
    ...v1
  } = v2;
  return {
    schemaVersion: 1,
    simulationVersion: "settlement-1",
    state: {
      ...v1,
      birds: birds.map(({ gatheringProgress: _progress, ...b }) => b),
    },
  };
}
function advance(s: Settlement, count: number) {
  for (let i = 0; i < count; i++) {
    s = step(s);
    validateSettlement(s);
  }
  return s;
}
function until(s: Settlement, condition: (v: Settlement) => boolean) {
  for (let i = 0; i < 2500 && !condition(s); i++) s = advance(s, 1);
  expect(condition(s)).toBe(true);
  return s;
}
function expectLegacyFacts(migrated: Settlement, source: Settlement) {
  expect(migrated.sites).toEqual(source.sites);
  expect(migrated.piles).toEqual(source.piles);
  expect(migrated.tick).toBe(source.tick);
  expect(migrated.consumed).toBe(source.consumed);
  expect(
    migrated.birds.map(
      ({
        satiety: _satiety,
        foragePreference: _preference,
        rememberedForage: _memory,
        foraging: _foraging,
        ...b
      }) => b,
    ),
  ).toEqual(
    source.birds.map(
      ({
        satiety: _satiety,
        foragePreference: _preference,
        rememberedForage: _memory,
        foraging: _foraging,
        ...b
      }) => b,
    ),
  );
  expect(
    migrated.birds.every(
      (b) =>
        b.satiety === forageTuning.initialSatiety &&
        !b.foraging &&
        !b.rememberedForage,
    ),
  ).toBe(true);
  expect("paths" in migrated).toBe(false);
  expect(foodConserved(migrated)).toBe(true);
}
describe("strict settlement-three persistence", () => {
  it("preserves the legacy story separately and orders tick/restart writes", async () => {
    await saveGame({ choice: "rank" });
    const save = saveQueue();
    const a = initialSettlement();
    a.tick = 1;
    await Promise.all([save(a), save(initialSettlement())]);
    expect(await loadSettlement()).toEqual(initialSettlement());
    expect(await legacyArchive()).toContain('"rank"');
  });
  it("writes schema three and preserves independent food/material facts exactly", () => {
    const s = advance(initialSettlement(), 10);
    expect(JSON.parse(encodeSettlement(s))).toMatchObject({
      schemaVersion: 3,
      simulationVersion: "settlement-3",
    });
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    expect(s.totalReeds).toBe(8);
    expect(s.forage.map((p) => p.remaining)).toEqual([12, 12, 12]);
  });
  it.each([1, 2] as const)(
    "migrates valid v%i mid-cargo edges without changing committed work or materials",
    (version) => {
      const base = version === 1 ? fortyBundleFixture() : initialSettlement();
      const s = advance(
        command(base, {
          type: "build",
          kind: "treehouse",
          at: { ...trees[0] },
        }),
        17,
      );
      expect(s.birds.some((b) => b.cargo && b.edge)).toBe(true);
      const envelope = oldEnvelope(s, version);
      const original = JSON.stringify(envelope);
      const migrated = decodeSettlement(original);
      expectLegacyFacts(migrated, s);
      expect(
        migrated.patches.every(
          (p) => !p.designated && p.remaining === p.capacity,
        ),
      ).toBe(true);
      expect(JSON.stringify(envelope)).toBe(original);
      expect(decodeSettlement(encodeSettlement(migrated))).toEqual(migrated);
      const working = until(migrated, (v) => v.sites[0].complete);
      expect(working.consumed).toBe(6);
      expect(conserved(working)).toBe(s.totalReeds);
    },
  );
  it("preserves v2 gathering progress, extracted cargo and finite reed accounting", () => {
    let s = command(initialSettlement(), {
      type: "gather",
      id: "patch-west",
      designated: true,
    });
    s = until(s, (v) => v.birds.some((b) => b.gatheringProgress > 4));
    let migrated = decodeSettlement(JSON.stringify(oldEnvelope(s, 2)));
    expectLegacyFacts(migrated, s);
    expect(migrated.patches).toEqual(s.patches);
    migrated = until(migrated, (v) => v.birds.some((b) => b.cargo));
    const carried = decodeSettlement(JSON.stringify(oldEnvelope(migrated, 2)));
    expect(carried.patches).toEqual(migrated.patches);
    expect(carried.harvestedReeds).toBe(migrated.harvestedReeds);
    expectLegacyFacts(carried, migrated);
    expect(
      until(
        carried,
        (v) => v.harvestedReeds === 12 && v.birds.every((b) => !b.cargo),
      ).piles[0].stock,
    ).toBe(20);
  });
  it("preserves construction progress, perches, rest, attachments and observed history", () => {
    let s = command(fortyBundleFixture(), {
      type: "build",
      kind: "treehouse",
      at: { ...trees[0] },
    });
    s = until(s, (v) => v.sites[0].progress > 5);
    const building = decodeSettlement(JSON.stringify(oldEnvelope(s, 1)));
    expectLegacyFacts(building, s);
    s = until(building, (v) => v.sites[0].complete);
    s.birds[0].resting = true;
    s.birds[0].memories.push("A prior observed journey.");
    s = advance(command(s, { type: "phase", phase: "evening" }), 100);
    expect(s.birds.every((b) => b.perch)).toBe(true);
    for (const version of [1, 2] as const)
      expectLegacyFacts(
        decodeSettlement(JSON.stringify(oldEnvelope(s, version))),
        s,
      );
  });
  it("handles crowded legacy habitats without rejecting or replacing any saved structure", () => {
    const s = fortyBundleFixture();
    for (let z = -3; z <= 3; z++)
      for (let x = -4; x <= 4; x++) {
        if (x === -3 && z === -2) continue;
        const tree = trees.find((t) => t.x === x && t.z === z);
        s.sites.push({
          id: `site-${s.nextId++}`,
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
    const migrated = decodeSettlement(JSON.stringify(oldEnvelope(s, 1)));
    expectLegacyFacts(migrated, s);
    expect(migrated.patches).toEqual([]);
    expect(migrated.forage).toHaveLength(3);
    expect(
      migrated.forage.every((p) => feedingSpots(migrated, p).length === 0),
    ).toBe(true);
    expect(settlementMigrationNotice(migrated)).toContain("0 of 2");
    expect(decodeSettlement(encodeSettlement(migrated))).toEqual(migrated);
    const cleared = command(migrated, {
      type: "cancel",
      id: migrated.sites[0].id,
    });
    expect(cleared.patches).toEqual([]);
    expect(decodeSettlement(encodeSettlement(cleared))).toEqual(cleared);
  });
  it("relocates v1 reed patches deterministically around existing stores", () => {
    const s = fortyBundleFixture();
    for (const at of [
      { x: -4, z: 0 },
      { x: 3, z: -2 },
    ]) {
      s.sites.push({
        id: `site-${s.nextId++}`,
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
      s.consumed += 4;
      s.piles[0].stock -= 4;
    }
    const migrated = decodeSettlement(JSON.stringify(oldEnvelope(s, 1)));
    expectLegacyFacts(migrated, s);
    expect(migrated.patches.map((p) => p.at)).toEqual([
      { x: -4, z: -1 },
      { x: 3, z: -3 },
    ]);
    expect(decodeSettlement(encodeSettlement(migrated))).toEqual(migrated);
  });
  it("round-trips scratch and recovery progress, with no replay reward", () => {
    let s = initialSettlement();
    s.birds.forEach((b) => {
      b.satiety = 10;
    });
    s = until(s, (v) => v.birds.some((b) => (b.foraging?.progress ?? 0) > 5));
    expect(advance(decodeSettlement(encodeSettlement(s)), 50)).toEqual(
      advance(s, 50),
    );
    s = advance(s, 50);
    s.forage.forEach((p) => {
      s = command(s, { type: "forage", id: p.id, open: false });
    });
    s = advance(s, 17);
    expect(s.forage.some((p) => p.recoveryProgress > 0)).toBe(true);
    expect(advance(decodeSettlement(encodeSettlement(s)), 200)).toEqual(
      advance(s, 200),
    );
  });
  it("rejects malformed current shapes, excess fields and old path state", () => {
    const original = initialSettlement();
    const mutations: ((s: Settlement) => void)[] = [
      (s) => {
        Object.assign(s, { paths: [] });
      },
      (s) => {
        Object.assign(s.forage[0], { extra: true });
      },
      (s) => {
        s.forage[0].remaining--;
      },
      (s) => {
        s.forage[0].capacity++;
      },
      (s) => {
        s.forage[0].eaten = -1;
      },
      (s) => {
        s.forage[0].regrown = 1;
      },
      (s) => {
        s.forage[0].recoveryProgress = forageTuning.recoveryTicks;
      },
      (s) => {
        s.forage[0].recoveryProgress = 1;
      },
      (s) => {
        s.forage[0].at = { x: 4, z: 3 };
      },
      (s) => {
        s.forage[1] = structuredClone(s.forage[0]);
      },
      (s) => {
        s.forage.pop();
      },
      (s) => {
        s.birds[0].satiety = Infinity;
      },
      (s) => {
        s.birds[0].satiety = 101;
      },
      (s) => {
        s.birds[0].foragePreference = "cover";
      },
      (s) => {
        s.birds[0].rememberedForage = "leaf-litter";
      },
      (s) => {
        s.birds[0].gatheringProgress = 1;
      },
      (s) => {
        s.piles[0].stock++;
      },
      (s) => {
        s.birds[0].cargo = 1;
      },
      (s) => {
        s.birds[1].id = s.birds[0].id;
      },
      (s) => {
        s.birds[0].edge = { to: { x: 0, z: 0 }, progress: 0.5 };
      },
    ];
    for (const mutate of mutations) {
      const s = structuredClone(original);
      mutate(s);
      expect(() => validateSettlement(s)).toThrow();
    }
    for (const text of [
      "null",
      "{}",
      "not json",
      '{"schemaVersion":1,"storyVersion":"first-evening-1","choice":"rank"}',
    ])
      expect(() => decodeSettlement(text)).toThrow();
  });
  it("rejects invalid feeding occupancy, closed places, impossible progress and material conflicts", () => {
    const fresh = initialSettlement();
    fresh.birds.forEach((b) => {
      b.satiety = 1;
    });
    const original = advance(fresh, 1);
    const mutations: ((s: Settlement) => void)[] = [
      (s) => {
        Object.assign(s.birds[0].foraging!, {
          progress: forageTuning.scratchTicks,
        });
      },
      (s) => {
        Object.assign(s.birds[0].foraging!, { progress: 1 });
      },
      (s) => {
        Object.assign(s.birds[0].foraging!, { extra: true });
      },
      (s) => {
        s.forage.find((p) => p.id === s.birds[0].foraging!.patch)!.open = false;
      },
      (s) => {
        s.birds[1].foraging = structuredClone(s.birds[0].foraging);
      },
      (s) => {
        s.birds[0].foraging!.spot = { x: -3, z: -2 };
      },
      (s) => {
        s.birds[0].job = {
          kind: "gather",
          source: "patch-west",
          destination: "reeds",
          stage: "pickup",
        };
        s.patches[0].designated = true;
      },
      (s) => {
        s.phase = "evening";
      },
      (s) => {
        const p = s.forage.find((p) => p.id === s.birds[0].foraging!.patch)!;
        p.remaining = 0;
        p.eaten = p.capacity;
      },
    ];
    for (const mutate of mutations) {
      const s = structuredClone(original);
      mutate(s);
      expect(() => validateSettlement(s)).toThrow();
    }
    const over = structuredClone(original);
    const patch = over.forage[0];
    const spots = feedingSpots(over, patch);
    over.birds.forEach((b) => {
      b.foraging = null;
    });
    over.birds.slice(0, 3).forEach((b, i) => {
      b.foraging = {
        patch: patch.id,
        spot: spots[i],
        intent: "eat",
        progress: 0,
      };
    });
    expect(() => validateSettlement(over)).toThrow();
  });
  it("validates old versions before migration and accepts paths only in old decoders", () => {
    for (const version of [1, 2] as const) {
      const old = oldEnvelope(fortyBundleFixture(), version);
      expect(
        decodeSettlement(JSON.stringify(old)).forage.map((p) => p.id),
      ).toEqual(foodPatches.map((p) => p.id));
      old.state.paths.push("99,0");
      expect(() => decodeSettlement(JSON.stringify(old))).toThrow();
      const extra = oldEnvelope(fortyBundleFixture(), version);
      Object.assign(extra.state.birds[0], { satiety: 100 });
      expect(() => decodeSettlement(JSON.stringify(extra))).toThrow();
    }
    expect(() =>
      decodeSettlement(JSON.stringify(oldEnvelope(initialSettlement(), 1))),
    ).toThrow();
    const envelope = JSON.parse(encodeSettlement(initialSettlement()));
    envelope.schemaVersion = 2;
    expect(() => decodeSettlement(JSON.stringify(envelope))).toThrow();
    envelope.simulationVersion = "settlement-2";
    expect(() => decodeSettlement(JSON.stringify(envelope))).toThrow();
  });
  it("rejects finite-reed overreservation, missing fresh patches and accounting changes", () => {
    const s = initialSettlement();
    Object.assign(s.patches[0], {
      designated: true,
      remaining: 1,
      harvested: 11,
    });
    s.harvestedReeds = 11;
    s.totalReeds = 19;
    s.piles[0].stock = 19;
    s.birds.slice(0, 2).forEach((b) => {
      b.job = {
        kind: "gather",
        source: "patch-west",
        destination: "reeds",
        stage: "pickup",
      };
    });
    expect(() => validateSettlement(s)).toThrow();
    s.birds[1].job = null;
    expect(validateSettlement(s)).toEqual(s);
    s.patches[0].remaining++;
    expect(() => validateSettlement(s)).toThrow();
    const absent = initialSettlement();
    absent.patches.pop();
    expect(() => validateSettlement(absent)).toThrow();
  });
});
