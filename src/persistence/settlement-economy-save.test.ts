import { describe, expect, it } from "vitest";
import { economyTuning, trees } from "../content/settlement";
import {
  initialLife,
  initialSettlement,
  initialAppetite,
  step,
} from "../simulation/settlement";
import type { Settlement, Worker } from "../simulation/settlement";
import {
  decodeSettlement,
  encodeSettlement,
  validateSettlement,
} from "./settlement-save";
import { settlementV4Fixture } from "./settlement-fixtures";

function nurseryFixture(): Settlement {
  const s = initialSettlement();
  s.tick = 8000;
  s.nextId = 4;
  s.initialReeds = 40;
  s.totalReeds = 40;
  s.piles[0].stock = 30;
  s.consumed = 10;
  s.sites = [
    {
      id: "site-1",
      kind: "treehouse",
      at: { x: trees[0].x, z: trees[0].z },
      tree: trees[0].id,
      delivered: 0,
      progress: 30,
      complete: true,
      stock: 0,
      target: 0,
      contributors: ["fern"],
      experiment: false,
    },
    {
      id: "site-2",
      kind: "nursery",
      at: { x: trees[0].x, z: trees[0].z },
      tree: trees[0].id,
      delivered: 0,
      progress: 30,
      complete: true,
      stock: 0,
      target: 0,
      contributors: ["fern"],
      experiment: false,
    },
  ];
  s.economy.nurseries = [
    {
      site: "site-2",
      food: { staple: 4, protein: 4 },
      target: 6,
      brood: "brood-3",
    },
  ];
  s.forage[0].remaining = 4;
  s.forage[0].harvested.staple = 8;
  s.forage[1].remaining = 4;
  s.forage[1].harvested.protein = 8;
  s.economy.foodConsumed = { staple: 4, protein: 4 };
  s.economy.broods = [
    {
      id: "brood-3",
      site: "site-2",
      mother: "fern",
      father: "rook",
      carer: "fern",
      stage: "incubating",
      progress: economyTuning.incubationTicks - 1,
      eggs: [0, 1].map((i) => ({
        id: `egg-brood-3-${i}`,
        laidAt: 150 * (i + 1),
        fertile: true,
        viable: true,
        child: null,
        hatchTick: null,
      })),
      careTicks: 7499,
      mealProgress: 0,
      shortageTicks: 0,
      started: 0,
    },
  ];
  s.birds[0].care = "brood-3";
  s.birds[0].at = { x: -2, z: 1 };
  return s;
}
function newbornFixture() {
  const s = nurseryFixture();
  const brood = s.economy.broods[0];
  brood.stage = "chicks";
  brood.progress = 0;
  brood.careTicks = 7500;
  for (let i = 0; i < 2; i++) {
    const id = `chick-${s.nextId++}`;
    const child: Worker = {
      ...structuredClone(s.birds[0]),
      id,
      life: {
        ...initialLife("fern"),
        name: i ? "Clover" : "Pip",
        sex: i ? "rooster" : "hen",
        stage: "chick",
        mother: "fern",
        father: "rook",
        carer: "fern",
        bornAt: "lowfork",
      },
      ...initialAppetite("fern"),
      care: null,
      at: { x: -2, z: 1 },
    };
    s.birds.push(child);
    brood.eggs[i].child = id;
    brood.eggs[i].hatchTick = s.tick;
  }
  return s;
}

describe("v5 economy persistence", () => {
  it("accepts cumulative renewable reeds beyond the original capacity without minting on reload", () => {
    const s = initialSettlement();
    s.patches[0].harvested = 36;
    s.patches[0].regrown = 36;
    s.harvestedReeds = 36;
    s.totalReeds = 44;
    s.piles[0].stock = 44;
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    s.patches[0].regrown--;
    expect(() => validateSettlement(s)).toThrow();
  });
  it("round-trips food in transit, local stock, consumed meals and qualified incubation", () => {
    const s = nurseryFixture();
    const carrier = s.birds[1];
    s.economy.nurseries[0].food.staple--;
    carrier.provision = {
      patch: "seed-common",
      destination: "site-2",
      stage: "deliver",
      progress: 0,
    };
    carrier.foodCargo = "staple";
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    const restored = decodeSettlement(encodeSettlement(s));
    expect(step(restored)).toEqual(step(s));
    restored.economy.foodConsumed.staple++;
    expect(() => validateSettlement(restored)).toThrow();
  });
  it("validates actual hatch and care ticks across reload without duplicate chicks", () => {
    let s = nurseryFixture();
    s = step(s);
    expect(s.birds).toHaveLength(6);
    expect(s.economy.broods[0].stage).toBe("chicks");
    validateSettlement(s);
    let restored = decodeSettlement(encodeSettlement(s));
    for (let i = 0; i < 50; i++) {
      s = step(s);
      restored = step(restored);
      validateSettlement(s);
    }
    expect(restored).toEqual(s);
    expect(restored.birds).toHaveLength(6);
  });
  it("accepts one growth tick at juvenile transition and rejects development ahead of age", () => {
    const s = newbornFixture();
    s.tick += economyTuning.juvenileTicks;
    s.birds[0].care = null;
    s.economy.broods[0].careTicks += economyTuning.juvenileTicks;
    for (const child of s.birds.filter((b) => b.life.mother)) {
      child.life.age = economyTuning.juvenileTicks;
      child.life.development = economyTuning.juvenileTicks;
      child.life.bond = economyTuning.juvenileTicks;
      child.life.stage = "juvenile";
    }
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    s.birds[4].life.development++;
    expect(() => validateSettlement(s)).toThrow();
  });
  it("preserves care while an adult finishes cargo or takes a self-feeding break", () => {
    const reed = nurseryFixture();
    reed.birds[0].cargo = 1;
    reed.piles[0].stock--;
    reed.birds[0].job = {
      kind: "return",
      source: "reeds",
      destination: "reeds",
      stage: "deliver",
    };
    expect(decodeSettlement(encodeSettlement(reed))).toEqual(reed);
    const food = nurseryFixture();
    food.economy.nurseries[0].food.staple--;
    food.birds[0].foodCargo = "staple";
    food.birds[0].provision = {
      patch: "seed-common",
      destination: "site-2",
      stage: "deliver",
      progress: 0,
    };
    expect(decodeSettlement(encodeSettlement(food))).toEqual(food);
    const feeding = nurseryFixture();
    feeding.birds[0].foraging = {
      patch: "seed-common",
      spot: { x: -1, z: -1 },
      intent: "eat",
      progress: 0,
    };
    expect(decodeSettlement(encodeSettlement(feeding))).toEqual(feeding);
    const descending = nurseryFixture();
    descending.birds[0].flight = {
      tree: "lowfork",
      slot: 0,
      sheltered: true,
      direction: "down",
      progress: 1,
      from: { x: -2, z: 1 },
    };
    expect(decodeSettlement(encodeSettlement(descending))).toEqual(descending);
  });
  it("keeps expired unincubated eggs terminal across reload", () => {
    const s = nurseryFixture();
    const b = s.economy.broods[0];
    b.stage = "failed";
    b.progress = 200;
    b.eggs = b.eggs.slice(0, 1);
    b.eggs[0].viable = false;
    s.birds[0].care = null;
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    s.economy.broods[0].eggs[0].viable = true;
    expect(() => validateSettlement(s)).toThrow();
  });
  it("round-trips named newborn identities and authoritative hatch lineage", () => {
    const s = newbornFixture();
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    const mutations: ((s: Settlement) => void)[] = [
      (s) => {
        s.birds[4].life.name = "Invented";
      },
      (s) => {
        s.birds[4].life.father = "missing";
      },
      (s) => {
        s.birds[4].life.appearance = "rook";
      },
      (s) => {
        s.birds[4].life.stage = "adult";
      },
      (s) => {
        s.birds[4].life.age = 1;
      },
      (s) => {
        s.birds[4].job = {
          kind: "build",
          source: "",
          destination: "site-2",
          stage: "deliver",
        };
      },
      (s) => {
        s.economy.broods[0].eggs[1].child = s.economy.broods[0].eggs[0].child;
      },
      (s) => {
        s.economy.broods[0].eggs[0].hatchTick = 300;
      },
      (s) => {
        s.economy.broods[0].eggs[0].id = "egg-replayed";
      },
      (s) => {
        s.birds[0].care = null;
      },
    ];
    for (const mutate of mutations) {
      const corrupt = structuredClone(s);
      mutate(corrupt);
      expect(() => validateSettlement(corrupt)).toThrow();
    }
  });
  it("rejects impossible state, foreign refs, excess fields and shared reservations", () => {
    const s = nurseryFixture();
    const mutations: ((s: Settlement) => void)[] = [
      (s) => {
        Object.assign(s.economy, { reward: true });
      },
      (s) => {
        s.economy.nurseries[0].food.protein++;
      },
      (s) => {
        s.economy.clock.phaseTick = economyTuning.dayTicks;
      },
      (s) => {
        s.economy.broods[0].father = "fern";
      },
      (s) => {
        s.economy.broods[0].carer = "missing";
      },
      (s) => {
        s.economy.broods[0].stage = "complete";
        s.economy.broods[0].progress = 0;
      },
      (s) => {
        s.sites[1].contributors.push("missing");
      },
      (s) => {
        s.birds[0].life.fertility = { father: "fern", tick: s.tick };
      },
      (s) => {
        s.birds[0].life.fertility = { father: "rook", tick: s.tick + 1 };
      },
      (s) => {
        s.birds[0].provision = {
          patch: "seed-common",
          destination: "site-2",
          stage: "pickup",
          progress: 0,
        };
      },
    ];
    for (const mutate of mutations) {
      const corrupt = structuredClone(s);
      mutate(corrupt);
      expect(() => validateSettlement(corrupt)).toThrow();
    }
  });
  it("migrates v4 immutable source facts and old recovery progress with additive defaults", () => {
    const s = initialSettlement();
    s.tick = 500;
    s.forage[0].remaining = 11;
    s.forage[0].eaten = 1;
    s.forage[0].recoveryProgress = 109;
    s.birds[0].memories = ["An observed old trip."];
    const v4 = settlementV4Fixture(s);
    const restored = decodeSettlement(
      JSON.stringify({
        schemaVersion: 4,
        simulationVersion: "settlement-4",
        state: v4,
      }),
    );
    expect(settlementV4Fixture(restored)).toEqual(v4);
    expect(restored.economy.clock.automatic).toBe(true);
    expect(
      restored.birds.every(
        (b) => !b.life.fertility && !b.life.mother && !b.life.father,
      ),
    ).toBe(true);
    expect(
      restored.forage.every(
        (p) =>
          p.harvested.staple === 0 &&
          p.harvested.protein === 0 &&
          p.proteinEaten === 0,
      ),
    ).toBe(true);
    expect(
      restored.patches.every(
        (p) => p.regrown === 0 && p.recoveryProgress === 0,
      ),
    ).toBe(true);
    expect(decodeSettlement(encodeSettlement(restored))).toEqual(restored);
    Object.assign(v4.birds[0], { life: initialLife("fern") });
    expect(() =>
      decodeSettlement(
        JSON.stringify({
          schemaVersion: 4,
          simulationVersion: "settlement-4",
          state: v4,
        }),
      ),
    ).toThrow();
  });
});
