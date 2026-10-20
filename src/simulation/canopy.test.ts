import {settlementV4Fixture} from "../persistence/settlement-fixtures";
import { describe, expect, it } from "vitest";
import { treeWorkCell } from "../content/tree-habitats";
import { settlers, trees, tuning } from "../content/settlement";
import {
  decodeSettlement,
  encodeSettlement,
  validateSettlement,
} from "../persistence/settlement-save";
import {
  basketForTree,
  basketLiftPosition,
  birdPosition,
  cargoPosition,
  command,
  conserved,
  initialSettlement,
  perchPosition,
  shelteredCapacity,
  siteStatus,
  step,
  treeBuildOptions,
} from "./settlement";
import type { BuildKind, Settlement } from "./settlement";
function ticks(s: Settlement, count = 1) {
  for (let i = 0; i < count; i++) {
    s = step(s);
    expect(conserved(s)).toBe(s.totalReeds);
    validateSettlement(s);
  }
  return s;
}
function until(
  s: Settlement,
  predicate: (s: Settlement) => boolean,
  limit = 6000,
) {
  for (let i = 0; i < limit && !predicate(s); i++) s = ticks(s);
  expect(predicate(s)).toBe(true);
  return s;
}
function build(
  s: Settlement,
  kind: BuildKind,
  tree: (typeof trees)[number] = trees[0],
) {
  return command(s, { type: "build", kind, at: { x: tree.x, z: tree.z } });
}
let homeFixture: Settlement | undefined;
let prototypeFixture: Settlement | undefined;
function home() {
  if (homeFixture) return structuredClone(homeFixture);
  // A supported legacy forty-bundle budget isolates construction from finite gathering.
  let s = initialSettlement();
  s.initialReeds = s.totalReeds = s.piles[0].stock = 40;
  s = until(build(s, "treehouse"), (s) => s.sites[0].complete);
  homeFixture = structuredClone(s);
  return s;
}
function liftingPrototype() {
  if (prototypeFixture) return structuredClone(prototypeFixture);
  prototypeFixture = until(build(home(), "hauling-basket"), (s) =>
    s.birds.some((b) => b.lift !== null),
  );
  return structuredClone(prototypeFixture);
}
function oldThree(s: Settlement) {
  const { basketTechnique: _technique, ...state } = settlementV4Fixture(s);
  return JSON.stringify({
    schemaVersion: 3,
    simulationVersion: "settlement-3",
    state: {
      ...state,
      sites: state.sites.map(({ experiment: _experiment, ...site }) => site),
      birds: state.birds.map(({ lift: _lift, ...bird }) => bird),
    },
  });
}
describe("supplied canopy construction and demonstrated shared technique", () => {
  it("owns tree prerequisites, distinct colocated sites, costs and new sleeping places", () => {
    const fresh = initialSettlement();
    for (const kind of ["sleeping-deck", "hauling-basket"] as const)
      expect(() => build(fresh, kind)).toThrow(/home first/);
    let s = home();
    expect(
      treeBuildOptions(s, "lowfork").map((o) => [o.kind, o.cost, o.available]),
    ).toEqual([
      ["treehouse", 6, false],
      ["sleeping-deck", 4, false],
      ["hauling-basket", 4, true],
      ["nursery",4,true],
    ]);
    expect(() => build(s, "sleeping-deck")).toThrow(/hauling basket/);
    s = until(build(s, "hauling-basket"), (s) => !!s.basketTechnique);
    s = build(s, "sleeping-deck");
    expect(s.sites).toHaveLength(3);
    expect(() => build(s, "sleeping-deck")).toThrow(/already exists/);
    s = until(s, (s) => s.sites.every((s) => s.complete));
    expect(shelteredCapacity(s, "lowfork")).toBe(4);
    s.birds.forEach((b) => {
      b.attachment = "lowfork";
    });
    s = until(command(s, { type: "phase", phase: "evening" }), (s) =>
      s.birds.every((b) => b.perch !== null),
    );
    expect(s.birds.map((b) => b.perch!.slot).sort()).toEqual([0, 1, 2, 3]);
    expect(s.birds.every((b) => b.perch?.sheltered)).toBe(true);
    expect(
      perchPosition({ tree: "lowfork", sheltered: true, slot: 2 }),
    ).toEqual({ x: trees[0].x + 0.74, z: trees[0].z - 0.25, y: 2.85 });
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
  });
  it("weaves only supplied prototype material and unlocks only after its actual last-bundle lift", () => {
    let s = build(home(), "hauling-basket");
    s = until(s, (s) => s.sites[1].delivered === 2);
    expect(s.sites[1].progress).toBe(0);
    s = until(s, (s) => s.birds.some((b) => b.lift));
    const operator = s.birds.find((b) => b.lift)!;
    const id = operator.id;
    expect(s.sites[1]).toMatchObject({
      delivered: 3,
      progress: 30,
      complete: false,
      experiment: false,
    });
    expect(operator.cargo).toBe(1);
    expect(siteStatus(s, s.sites[1])).toContain(
      `${settlers.find((b) => b.id === id)!.name} raising a construction bundle · 3%`,
    );
    expect(s.basketTechnique).toBeNull();
    expect(cargoPosition(s, operator).y).toBeGreaterThan(
      basketLiftPosition("lowfork", 0).y,
    );
    expect(birdPosition(operator).y).toBe(0);
    expect(operator.lift!.progress).toBe(1 / tuning.liftTicks);
    s = ticks(decodeSettlement(encodeSettlement(s)), tuning.liftTicks - 2);
    expect(s.basketTechnique).toBeNull();
    expect(s.birds.find((b) => b.id === id)!.cargo).toBe(1);
    s = ticks(s);
    expect(s.basketTechnique).toEqual({
      inventor: id,
      tree: "lowfork",
      tick: s.tick,
    });
    expect(s.sites[1]).toMatchObject({
      delivered: 0,
      complete: true,
      experiment: true,
    });
    expect(s.sites[1].contributors).toContain(id);
    expect(
      s.birds
        .find((b) => b.id === id)!
        .memories.some((m) => m.includes("Demonstrated the first")),
    ).toBe(true);
    expect(s.consumed).toBe(10);
    const learned = s.basketTechnique;
    s = ticks(decodeSettlement(encodeSettlement(s)), 200);
    expect(s.basketTechnique).toEqual(learned);
    expect(s.sites.filter((s) => s.experiment)).toHaveLength(1);
  });
  it("persists and pauses partial lifts, finishes carried work at night and then roosts", () => {
    let s = liftingPrototype();
    const progress = s.birds.find((b) => b.lift)!.lift!.progress;
    s = command(s, { type: "pause" });
    expect(ticks(decodeSettlement(encodeSettlement(s)), 60)).toEqual(s);
    s = command(s, { type: "pause" });
    expect(s.birds.find((b) => b.lift)!.lift!.progress).toBe(progress);
    s.birds.find((b) => b.lift)!.satiety = 0;
    s = command(s, { type: "phase", phase: "evening" });
    s = until(decodeSettlement(encodeSettlement(s)), (s) =>
      s.birds.every((b) => b.perch !== null),
    );
    expect(s.basketTechnique).not.toBeNull();
    expect(s.birds.every((b) => !b.cargo && !b.lift)).toBe(true);
    expect(s.consumed).toBe(10);
    expect(tuning.liftTicks).toBe(40);
  });
  it("cancels an interrupted demonstration without lost goods or invented discovery", () => {
    let s = liftingPrototype();
    const operator = s.birds.find((b) => b.lift)!.id;
    s = command(s, { type: "cancel", id: s.sites[1].id });
    expect(s.basketTechnique).toBeNull();
    expect(s.birds.find((b) => b.id === operator)).toMatchObject({
      cargo: 1,
      lift: null,
      job: { kind: "return" },
    });
    s = ticks(decodeSettlement(encodeSettlement(s)), 500);
    expect(s.consumed).toBe(6);
    expect(s.birds.every((b) => !b.cargo)).toBe(true);
    expect(
      s.piles
        .filter((p) => p.kind === "salvage")
        .reduce((n, p) => n + p.stock, 0),
    ).toBe(3);
    expect(s.basketTechnique).toBeNull();
  });
  it("uses the completed basket for actual subsequent deck cargo and serializes operators", () => {
    let s = until(liftingPrototype(), (s) => !!s.basketTechnique);
    s = build(s, "sleeping-deck");
    s = until(s, (s) => s.birds.some((b) => b.lift));
    expect(s.birds.filter((b) => b.lift)).toHaveLength(1);
    const id = s.birds.find((b) => b.lift)!.id;
    expect(s.birds.find((b) => b.id === id)!.cargo).toBe(1);
    expect(s.sites[2].delivered).toBe(0);
    expect(siteStatus(s, s.sites[2])).toContain(
      "raising a construction bundle · 3%",
    );
    expect(siteStatus(s, s.sites[1])).toBe(siteStatus(s, s.sites[2]));
    const learned = s.basketTechnique;
    s = until(
      decodeSettlement(encodeSettlement(s)),
      (s) => s.sites[2].complete,
    );
    expect(
      s.birds
        .find((b) => b.id === id)!
        .memories.some((m) => m.includes("Raised a construction bundle")),
    ).toBe(true);
    expect(s.basketTechnique).toEqual(learned);
    expect(s.consumed).toBe(14);
    expect(basketForTree(s, "lowfork")?.complete).toBe(true);
  });
  it("shares the demonstration across trees and resolves concurrent pending prototypes once", () => {
    let s = home();
    s = until(build(s, "treehouse", trees[1]), (s) => s.sites[1].complete);
    s = build(build(s, "hauling-basket"), "hauling-basket", trees[1]);
    s = until(s, (s) => s.sites.every((s) => s.complete));
    expect(s.sites.filter((s) => s.experiment)).toHaveLength(1);
    expect(
      s.birds
        .flatMap((b) => b.memories)
        .filter((m) => m.includes("Demonstrated the first")),
    ).toHaveLength(1);
    const learned = s.basketTechnique;
    s = until(build(s, "treehouse", trees[2]), (s) => s.sites[4].complete);
    s = build(s, "hauling-basket", trees[2]);
    for (let i = 0; i < 6000 && !s.sites[5].complete; i++) {
      s = ticks(s);
      expect(s.birds.every((b) => !b.lift)).toBe(true);
    }
    expect(s.sites[5].complete).toBe(true);
    expect(s.basketTechnique).toEqual(learned);
  }, 20000);
  it.each([true, false])(
    "normalizes pending prototype jobs on discovery with builder first=%s",
    (builderFirst) => {
      let s = until(
        build(home(), "treehouse", trees[1]),
        (s) => s.sites[1].complete,
      );
      s = build(build(s, "hauling-basket"), "hauling-basket", trees[1]);
      const demonstrated = s.sites[2];
      const pending = s.sites[3];
      Object.assign(demonstrated, { delivered: 3, progress: 30 });
      Object.assign(pending, { delivered: 3, progress: 5 });
      s.piles[0].stock -= 7;
      s.birds.forEach((b) => {
        b.job = null;
        b.edge = null;
        b.foraging = null;
        b.lift = null;
        b.cargo = 0;
        b.satiety = 100;
        b.gatheringProgress = 0;
      });
      const operator = s.birds.find((b) => b.id === "rook")!;
      Object.assign(operator, {
        at: { ...demonstrated.at },
        cargo: 1,
        job: {
          kind: "haul",
          source: "reeds",
          destination: demonstrated.id,
          stage: "deliver",
        },
        lift: { basket: demonstrated.id, progress: 0.975 },
      });
      const builder = s.birds.find((b) => b.id === "fern")!;
      Object.assign(builder, {
        at: treeWorkCell(pending.tree!),
        job: {
          kind: "build",
          source: "",
          destination: pending.id,
          stage: "deliver",
        },
      });
      const order = builderFirst
        ? ["fern", "rook", "dapple", "wren"]
        : ["rook", "fern", "dapple", "wren"];
      s.birds.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      s = decodeSettlement(encodeSettlement(validateSettlement(s)));
      s = decodeSettlement(encodeSettlement(ticks(s)));
      expect(s.basketTechnique?.inventor).toBe("rook");
      expect(s.sites[3]).toMatchObject({
        delivered: 3,
        progress: builderFirst ? 6 : 5,
        complete: false,
      });
      expect(s.birds.find((b) => b.id === "fern")!.job?.kind).not.toBe("build");
      for (let i = 0; i < 3000 && !s.sites[3].complete; i++)
        s = decodeSettlement(encodeSettlement(ticks(s)));
      expect(s.sites[3].complete).toBe(true);
      expect(s.sites.filter((site) => site.experiment)).toHaveLength(1);
      expect(s.consumed).toBe(20);
    },
  );
  it("builds the home, basket and supplied deck from fresh finite reeds", () => {
    let s = until(
      build(initialSettlement(), "treehouse"),
      (s) => s.sites[0].complete,
    );
    s = command(s, { type: "gather", id: s.patches[0].id, designated: true });
    s = until(build(s, "hauling-basket"), (s) => !!s.basketTechnique);
    s = until(build(s, "sleeping-deck"), (s) => s.sites[2].complete);
    expect(s.consumed).toBe(14);
    expect(s.harvestedReeds).toBeGreaterThanOrEqual(6);
    expect(s.totalReeds).toBe(s.initialReeds + s.harvestedReeds);
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
  });
  it("migrates settlement-three mid-carry without resetting original facts and rejects malformed new states", () => {
    let s = home();
    // settlement-three only knows old home/store kinds.
    s = command(s, { type: "build", kind: "store", at: { x: -1, z: -2 } });
    s = until(s, (s) => s.birds.some((b) => b.cargo && b.edge));
    const restored = decodeSettlement(oldThree(s));
    expect(restored.birds.map(b=>({id:b.id,at:b.at,job:b.job,cargo:b.cargo,memories:b.memories}))).toEqual(s.birds.map(b=>({id:b.id,at:b.at,job:b.job,cargo:b.cargo,memories:b.memories})));
    expect(JSON.parse(encodeSettlement(restored)).schemaVersion).toBe(5);
    const completed = home();
    const homeSite = completed.sites[0];
    homeSite.complete = false;
    homeSite.delivered = 6;
    completed.consumed = 0;
    completed.birds.forEach((b) => {
      b.foraging = null;
      b.job = null;
      b.edge = null;
      b.attachment = null;
    });
    completed.birds[0].at = { ...homeSite.at };
    completed.birds[0].job = {
      kind: "build",
      source: "",
      destination: homeSite.id,
      stage: "deliver",
    };
    const boundary = decodeSettlement(oldThree(completed));
    expect(boundary.sites).toEqual(completed.sites);
    expect(boundary.piles).toEqual(completed.piles);
    expect(boundary.birds.map(b=>b.job)).toEqual(completed.birds.map(b=>b.job));
    expect(until(boundary, v=>v.sites[0].complete).sites[0].complete).toBe(true);
    const lifted = liftingPrototype();
    const mutations = [
      (s: Settlement) => {
        s.birds.find((b) => b.lift)!.lift!.progress = 1;
      },
      (s: Settlement) => {
        s.birds.find((b) => b.lift)!.lift!.basket = "missing";
      },
      (s: Settlement) => {
        s.basketTechnique = { inventor: "wren", tree: "lowfork", tick: s.tick };
      },
      (s: Settlement) => {
        s.sites[1].experiment = true;
      },
      (s: Settlement) => {
        Object.assign(s, { obsolete: true });
      },
      (s: Settlement) => {
        s.sites[1].delivered = 4;
        s.piles[0].stock--;
      },
    ];
    for (const mutate of mutations) {
      const bad = structuredClone(lifted);
      mutate(bad);
      expect(() => validateSettlement(bad)).toThrow();
    }
  });
});
