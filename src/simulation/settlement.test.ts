import { describe, expect, it } from "vitest";
import { trees } from "../content/settlement";
import {
  command,
  conserved,
  initialSettlement as freshSettlement,
  step,
  workerStatus,
} from "./settlement";
import type { Settlement } from "./settlement";
import {
  decodeSettlement,
  encodeSettlement,
  validateSettlement,
} from "../persistence/settlement-save";
// Existing construction/night fixtures retain their original forty-bundle budget.
function initialSettlement(): Settlement {
  const state = freshSettlement();
  state.initialReeds = 40;
  state.totalReeds = 40;
  state.piles[0].stock = 40;
  return state;
}
function tick(s: Settlement, count: number) {
  for (let i = 0; i < count; i++) {
    s = step(s);
    expect(conserved(s)).toBe(s.initialReeds + s.harvestedReeds);
    validateSettlement(s);
  }
  return s;
}
function connect(s: Settlement, x: number, z: number) {
  for (let a = -3; a <= x; a++)
    s = command(s, { type: "path", at: { x: a, z: -2 } });
  for (let b = -2; b <= z; b++)
    s = command(s, { type: "path", at: { x, z: b } });
  return s;
}
function roost() {
  return command(connect(initialSettlement(), -2, 2), {
    type: "build",
    kind: "treehouse",
    at: { x: -2, z: 2 },
  });
}
describe("construction, transport and nights", () => {
  it("canonicalizes content-backed build cells so tree-button saves can reopen", () => {
    const at = { ...trees[0], x: Number(trees[0].x) };
    const s = command(initialSettlement(), {
      type: "build",
      kind: "treehouse",
      at,
    });
    expect(s.sites[0].at).toEqual({ x: -2, z: 2 });
    at.x = 4;
    expect(s.sites[0].at.x).toBe(-2);
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
  });
  it("starts on ground and flies to distinct natural perches without building, then returns by day", () => {
    let s = command(initialSettlement(), { type: "phase", phase: "evening" });
    s = tick(s, 8);
    expect(s.birds.every((b) => b.flight && !b.flight.sheltered)).toBe(true);
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
    s = tick(s, 80);
    expect(s.birds.every((b) => b.perch && !b.perch.sheltered)).toBe(true);
    expect(
      new Set(s.birds.map((b) => `${b.perch!.tree}-${b.perch!.slot}`)).size,
    ).toBe(4);
    s = tick(s, 250);
    expect(s.birds.every((b) => b.energy === 80)).toBe(true);
    s = tick(command(s, { type: "phase", phase: "day" }), 35);
    expect(s.birds.every((b) => !b.perch && !b.flight)).toBe(true);
  });
  it("reserves without double promising, carries local goods, consumes once and gains an actual preferred sheltered bed", () => {
    let s = roost();
    s = tick(s, 1);
    expect(s.birds.filter((b) => b.job).length).toBe(4);
    s = tick(s, 300);
    const site = s.sites[0];
    expect(site.complete).toBe(true);
    expect(s.consumed).toBe(6);
    expect(s.piles[0].stock).toBe(34);
    expect(s.birds.some((b) => b.attachment === "lowfork")).toBe(true);
    s = tick(command(s, { type: "phase", phase: "evening" }), 450);
    expect(s.birds.filter((b) => b.perch?.sheltered)).toHaveLength(2);
    expect(
      s.birds
        .filter((b) => b.perch?.sheltered)
        .every((b) => b.perch!.tree === b.attachment && b.energy === 100),
    ).toBe(true);
    expect(
      s.birds.filter((b) => !b.perch?.sheltered).every((b) => b.energy === 80),
    ).toBe(true);
    validateSettlement(s);
    const sheltered = new Set(
      s.birds.filter((b) => b.perch?.sheltered).map((b) => b.id),
    );
    s = tick(command(s, { type: "phase", phase: "day" }), 35);
    expect(s.birds.every((b) => !b.perch && !b.flight)).toBe(true);
    for (const bird of s.birds)
      expect(bird.energy).toBe(sheltered.has(bird.id) ? 100 : 80);
  });
  it("blocks a carrier on a removed path, preserves mid-carry save exactly, and resumes once repaired", () => {
    let s = tick(roost(), 5);
    const cargo = s.birds.find((b) => b.cargo)!;
    expect(cargo).toBeTruthy();
    s = command(s, { type: "path", at: { x: -2, z: -2 }, remove: true });
    s = tick(s, 20);
    expect(
      s.birds.some((b) => workerStatus(s, b).includes("Route broken")),
    ).toBe(true);
    const reopened = decodeSettlement(encodeSettlement(s));
    const fix = (v: Settlement) =>
      tick(command(v, { type: "path", at: { x: -2, z: -2 } }), 400);
    expect(fix(reopened)).toEqual(fix(s));
    expect(fix(s).consumed).toBe(6);
  });
  it("cancellation releases uncollected commitments, returns carried cargo and retains delivered salvage", () => {
    let s = tick(roost(), 90);
    expect(s.sites[0].delivered).toBeGreaterThan(0);
    s = command(s, { type: "cancel", id: s.sites[0].id });
    expect(s.piles.some((p) => p.kind === "salvage" && p.stock > 0)).toBe(true);
    s = tick(s, 300);
    expect(s.birds.every((b) => b.cargo === 0 && !b.job)).toBe(true);
    expect(s.consumed).toBe(0);
    validateSettlement(s);
    let early = roost();
    early = command(early, { type: "cancel", id: early.sites[0].id });
    expect(early.birds.every((b) => !b.job)).toBe(true);
    expect(early.piles[0].stock).toBe(40);
  });
  it("reuses physical salvage across repeated partial construction and remains reloadable", () => {
    let s = connect(initialSettlement(), -2, 2);
    for (let cycle = 0; cycle < 70; cycle++) {
      s = command(s, { type: "build", kind: "treehouse", at: { x: -2, z: 2 } });
      for (let n = 0; n < 1000 && s.sites[0].delivered === 0; n++)
        s = tick(s, 1);
      expect(s.sites[0].delivered).toBeGreaterThan(0);
      s = command(s, { type: "cancel", id: s.sites[0].id });
      s = decodeSettlement(encodeSettlement(s));
      s = tick(s, 200);
      expect(s.piles.filter((p) => p.kind === "salvage")).toHaveLength(1);
      expect(s.consumed).toBe(0);
    }
    expect(conserved(s)).toBe(40);
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
  });
  it("builds a store, physically fills it, and uses that closer local stock for a further build", () => {
    let s = connect(initialSettlement(), -1, 0);
    s = command(s, { type: "build", kind: "store", at: { x: -1, z: 0 } });
    s = tick(s, 280);
    expect(s.sites[0].complete).toBe(true);
    s = command(s, { type: "stock", id: s.sites[0].id, target: 8 });
    s = tick(s, 350);
    expect(s.sites[0].stock).toBe(8);
    s = connect(s, 1, 3); // link store row to the new trunk
    for (let x = -1; x <= 1; x++)
      s = command(s, { type: "path", at: { x, z: 0 } });
    s = command(s, { type: "stock", id: s.sites[0].id, target: 0 });
    s = command(s, { type: "build", kind: "treehouse", at: { x: 1, z: 3 } });
    s = tick(s, 1);
    expect(s.birds.some((b) => b.job?.source === s.sites[0].id)).toBe(true);
    s = tick(s, 500);
    expect(s.sites[1].complete).toBe(true);
    expect(s.sites[0].stock).toBe(2);
    expect(s.consumed).toBe(10);
    validateSettlement(s);
  });
  it("pause is exact and evening never teleports a blocked bird's load into a bed", () => {
    let s = tick(roost(), 4);
    s = command(s, { type: "pause" });
    expect(step(s)).toBe(s);
    s = command(s, { type: "pause" });
    s = command(s, { type: "path", at: { x: -2, z: -2 }, remove: true });
    s = tick(command(s, { type: "phase", phase: "evening" }), 100);
    expect(s.birds.some((b) => b.cargo && !b.flight && !b.perch)).toBe(true);
    expect(conserved(s)).toBe(40);
  });
});

function gathering() {
  let s = freshSettlement();
  for (const at of [
    { x: -4, z: -2 },
    { x: -4, z: -1 },
    { x: -4, z: 0 },
  ])
    s = command(s, { type: "path", at });
  return command(s, { type: "gather", id: "patch-west", designated: true });
}
function until(s: Settlement, condition: (state: Settlement) => boolean) {
  for (let n = 0; n < 2500 && !condition(s); n++) s = tick(s, 1);
  expect(condition(s)).toBe(true);
  return s;
}
describe("finite construction-reed gathering", () => {
  it("starts with eight loose bundles and permits an independent first build", () => {
    let s = freshSettlement();
    expect(s.initialReeds).toBe(8);
    expect(s.totalReeds).toBe(8);
    expect(s.patches.map((p) => p.remaining)).toEqual([12, 12]);
    s = command(connect(s, -2, 2), {
      type: "build",
      kind: "treehouse",
      at: { x: -2, z: 2 },
    });
    s = tick(s, 350);
    expect(s.sites[0].complete).toBe(true);
    expect(s.consumed).toBe(6);
    expect(s.piles[0].stock).toBe(2);
    expect(s.harvestedReeds).toBe(0);
  });
  it("reserves finite yield, gathers visibly, exhausts exactly once and preserves both ledgers", () => {
    let s = gathering();
    s = until(s, (v) => v.birds.some((b) => b.gatheringProgress > 0));
    expect(s.patches[0].remaining).toBe(12);
    expect(s.birds.filter((b) => b.job?.kind === "gather")).toHaveLength(4);
    expect(
      s.birds.some((b) => workerStatus(s, b).startsWith("Gathering reeds")),
    ).toBe(true);
    s = tick(s, 2000);
    expect(s.patches[0]).toMatchObject({ remaining: 0, harvested: 12 });
    expect(s.patches[1]).toMatchObject({ remaining: 12, harvested: 0 });
    expect(s.harvestedReeds).toBe(12);
    expect(s.piles[0].stock).toBe(20);
    expect(conserved(s)).toBe(20);
    expect(s.birds.every((b) => b.cargo === 0 && !b.job)).toBe(true);
    expect(
      s.birds.every((b) =>
        b.memories.some((m) => m.includes("Gathered construction reeds")),
      ),
    ).toBe(true);
    const exhausted = s;
    s = tick(s, 400);
    expect(s.harvestedReeds).toBe(exhausted.harvestedReeds);
    expect(s.piles[0].stock).toBe(exhausted.piles[0].stock);
  });
  it("does not assign disconnected patches, releases canceled unextracted yield, and keeps extracted cargo", () => {
    let s = command(freshSettlement(), {
      type: "gather",
      id: "patch-west",
      designated: true,
    });
    s = tick(s, 30);
    expect(s.birds.every((b) => !b.job)).toBe(true);
    s = until(gathering(), (v) => v.birds.some((b) => b.gatheringProgress > 0));
    s = command(s, { type: "gather", id: "patch-west", designated: false });
    expect(s.birds.every((b) => !b.job && b.gatheringProgress === 0)).toBe(
      true,
    );
    expect(s.patches[0].remaining).toBe(12);
    s = command(s, { type: "gather", id: "patch-west", designated: true });
    s = until(s, (v) => v.birds.some((b) => b.cargo));
    const harvested = s.harvestedReeds;
    const carried = s.birds.filter((b) => b.cargo).map((b) => b.id);
    s = command(s, { type: "gather", id: "patch-west", designated: false });
    expect(s.birds.filter((b) => b.cargo).map((b) => b.id)).toEqual(carried);
    expect(
      s.birds.filter((b) => b.job).every((b) => b.job?.stage === "deliver"),
    ).toBe(true);
    s = tick(s, 300);
    expect(s.harvestedReeds).toBe(harvested);
    expect(s.piles[0].stock).toBe(8 + harvested);
  });
  it("saves gathering progress and route interruptions without duplicate pickup, including night release", () => {
    let s = until(gathering(), (v) =>
      v.birds.some((b) => b.gatheringProgress > 4),
    );
    const gatheringReopen = decodeSettlement(encodeSettlement(s));
    expect(gatheringReopen).toEqual(s);
    expect(tick(gatheringReopen, 50)).toEqual(tick(s, 50));
    s = command(s, { type: "path", at: { x: -4, z: 0 }, remove: true });
    const before = s;
    s = tick(s, 20);
    expect(s.harvestedReeds).toBe(before.harvestedReeds);
    expect(
      s.birds.some((b) => workerStatus(s, b).includes("Route broken")),
    ).toBe(true);
    s = command(s, { type: "phase", phase: "evening" });
    expect(s.birds.every((b) => !b.job && b.gatheringProgress === 0)).toBe(
      true,
    );
    expect(s.patches[0].remaining).toBe(12);
    s = tick(s, 100);
    expect(s.birds.every((b) => b.perch)).toBe(true);
  });
  it("preserves mid-cargo loads through path removal, designation removal, night and reload", () => {
    let s = until(gathering(), (v) => v.birds.some((b) => b.cargo));
    s = command(s, { type: "path", at: { x: -4, z: -1 }, remove: true });
    s = command(s, { type: "gather", id: "patch-west", designated: false });
    s = command(s, { type: "phase", phase: "evening" });
    const harvested = s.harvestedReeds;
    s = tick(s, 100);
    expect(s.birds.some((b) => b.cargo && !b.perch && !b.flight)).toBe(true);
    const restored = decodeSettlement(encodeSettlement(s));
    expect(restored).toEqual(s);
    const repair = (state: Settlement) =>
      tick(command(state, { type: "path", at: { x: -4, z: -1 } }), 500);
    expect(repair(restored)).toEqual(repair(s));
    s = repair(s);
    expect(s.harvestedReeds).toBe(harvested);
    expect(s.piles[0].stock).toBe(8 + harvested);
    expect(s.birds.every((b) => b.cargo === 0 && b.perch)).toBe(true);
  });
  it("pauses partial gathering when its storage route breaks and resumes the saved reservation after repair", () => {
    let s = until(gathering(), (v) =>
      v.birds.some((b) => b.gatheringProgress > 4),
    );
    const bird = s.birds.find((b) => b.gatheringProgress > 4)!;
    const progress = bird.gatheringProgress;
    s = command(s, { type: "path", at: { x: -4, z: -1 }, remove: true });
    s = tick(s, 40);
    expect(s.birds.find((b) => b.id === bird.id)!.gatheringProgress).toBe(
      progress,
    );
    expect(s.birds.find((b) => b.id === bird.id)!.job?.stage).toBe("pickup");
    expect(s.harvestedReeds).toBe(0);
    const repair = (state: Settlement) =>
      tick(command(state, { type: "path", at: { x: -4, z: -1 } }), 1800);
    const reopened = decodeSettlement(encodeSettlement(s));
    expect(repair(reopened)).toEqual(repair(s));
    expect(repair(s).patches[0].remaining).toBe(0);
  });
  it("reserves only the last available yield when several adults are idle", () => {
    let s = gathering();
    Object.assign(s.patches[0], { remaining: 1, harvested: 11 });
    s.harvestedReeds = 11;
    s.totalReeds = 19;
    s.piles[0].stock = 19;
    s = tick(s, 1);
    expect(s.birds.filter((b) => b.job?.kind === "gather")).toHaveLength(1);
    s = tick(s, 500);
    expect(s.patches[0].remaining).toBe(0);
    expect(s.harvestedReeds).toBe(12);
    expect(s.piles[0].stock).toBe(20);
  });
  it("delivers to reachable local storage, with reserved capacity shared among gatherers", () => {
    let s = freshSettlement();
    for (const at of [
      { x: -4, z: -2 },
      { x: -4, z: -1 },
    ])
      s = command(s, { type: "path", at });
    s = command(s, { type: "build", kind: "store", at: { x: -4, z: -1 } });
    s = until(s, (v) => v.sites[0].complete);
    s = command(s, { type: "path", at: { x: -4, z: 0 } });
    s = command(s, { type: "gather", id: "patch-west", designated: true });
    s = tick(s, 2500);
    expect(s.sites[0].stock).toBe(12);
    expect(s.piles[0].stock).toBe(4);
    expect(s.patches[0].remaining).toBe(0);
    expect(conserved(s)).toBe(20);
  });
});
