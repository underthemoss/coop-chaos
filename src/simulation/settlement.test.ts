import { describe, expect, it } from "vitest";
import {
  foodPatches,
  forageTuning,
  settlers,
  trees,
} from "../content/settlement";
import {
  command,
  conserved,
  feedingSpots,
  foodConserved,
  initialSettlement,
  route,
  step,
  workerStatus,
} from "./settlement";
import type { Settlement } from "./settlement";
import {
  decodeSettlement,
  encodeSettlement,
  validateSettlement,
} from "../persistence/settlement-save";
function tick(s: Settlement, count: number) {
  for (let i = 0; i < count; i++) {
    s = step(s);
    expect(conserved(s)).toBe(s.initialReeds + s.harvestedReeds);
    expect(foodConserved(s)).toBe(true);
    validateSettlement(s);
  }
  return s;
}
function until(
  s: Settlement,
  condition: (v: Settlement) => boolean,
  limit = 3000,
) {
  for (let i = 0; i < limit && !condition(s); i++) s = tick(s, 1);
  expect(condition(s)).toBe(true);
  return s;
}
function build(s = initialSettlement()) {
  return command(s, { type: "build", kind: "treehouse", at: { ...trees[0] } });
}
function hungry(s = initialSettlement()) {
  s.birds.forEach((b) => {
    b.satiety = 35;
  });
  return s;
}
describe("free ground construction, transport and nights", () => {
  it("walks every legal ground cell and builds without authored paths", () => {
    let s = build();
    expect("paths" in s).toBe(false);
    expect(s.sites[0].at).toEqual({ x: -2, z: 2 });
    expect(route(s, { x: -4, z: -3 }, { x: 4, z: 3 })).toHaveLength(15);
    expect(route(s, { x: 5, z: 0 }, { x: 0, z: 0 })).toBeNull();
    s = until(s, (v) => v.sites[0].complete);
    expect(s.consumed).toBe(6);
    expect(s.piles[0].stock).toBe(2);
    expect(s.birds.some((b) => b.attachment === "lowfork")).toBe(true);
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
  });
  it("cancels safely, returns actual cargo and retains delivered salvage", () => {
    let s = until(build(), (v) => v.sites[0].delivered > 0);
    s = command(s, { type: "cancel", id: s.sites[0].id });
    expect(s.piles.some((p) => p.kind === "salvage" && p.stock > 0)).toBe(true);
    s = tick(s, 450);
    expect(s.birds.every((b) => !b.cargo)).toBe(true);
    expect(s.consumed).toBe(0);
    expect(conserved(s)).toBe(8);
  });
  it("reuses physical salvage through repeated interrupted builds and reloads", () => {
    let s = initialSettlement();
    for (let cycle = 0; cycle < 12; cycle++) {
      s = until(build(s), (v) => v.sites[0].delivered > 0);
      s = command(s, { type: "cancel", id: s.sites[0].id });
      s = decodeSettlement(encodeSettlement(s));
      s = tick(s, 200);
      expect(s.piles.filter((p) => p.kind === "salvage")).toHaveLength(1);
      expect(s.consumed).toBe(0);
      expect(conserved(s)).toBe(8);
    }
    expect(decodeSettlement(encodeSettlement(s))).toEqual(s);
  });
  it("safely interrupts pickup/build for hunger but finishes a carried delivery before eating", () => {
    let s = tick(build(), 3);
    const carrier = s.birds.find((b) => b.cargo)!;
    expect(carrier).toBeTruthy();
    const id = carrier.id;
    carrier.satiety = 1;
    s = until(s, (v) => !v.birds.find((b) => b.id === id)!.cargo);
    expect(s.birds.find((b) => b.id === id)!.foraging).toBeNull();
    expect(s.sites[0].delivered).toBeGreaterThan(0);
    s = tick(s, 1);
    expect(s.birds.find((b) => b.id === id)!.foraging?.intent).toBe("eat");
    s = until(s, (v) => v.sites[0].complete);
    expect(s.consumed).toBe(6);
    let pickup = build();
    pickup.birds[0].satiety = 1;
    pickup = tick(pickup, 1);
    expect(pickup.birds[0].job).toBeNull();
    expect(pickup.birds[0].foraging?.intent).toBe("eat");
    expect(pickup.piles[0].stock).toBe(5); // the other three collect their reserved bundles
    let weaving = until(build(), (v) =>
      v.birds.some((b) => b.job?.kind === "build" && !b.edge),
    );
    const weaver = weaving.birds.find(
      (b) => b.job?.kind === "build" && !b.edge,
    )!;
    weaver.satiety = 1;
    weaving = tick(weaving, 1);
    expect(
      weaving.birds.find((b) => b.id === weaver.id)!.foraging?.intent,
    ).toBe("eat");
    expect(weaving.sites[0].delivered).toBe(6);
    expect(until(weaving, (v) => v.sites[0].complete).consumed).toBe(6);
  });
  it("gathers finite construction reeds without roads and conserves extraction through unmarking/night", () => {
    let s = command(initialSettlement(), {
      type: "gather",
      id: "patch-west",
      designated: true,
    });
    s = until(s, (v) => v.birds.some((b) => b.gatheringProgress > 4));
    const reopen = decodeSettlement(encodeSettlement(s));
    expect(tick(reopen, 50)).toEqual(tick(s, 50));
    s = until(s, (v) => v.birds.some((b) => b.cargo));
    const harvested = s.harvestedReeds;
    s = command(s, { type: "gather", id: "patch-west", designated: false });
    expect(s.birds.every((b) => b.cargo || !b.job)).toBe(true);
    s = tick(command(s, { type: "phase", phase: "evening" }), 300);
    expect(s.harvestedReeds).toBe(harvested);
    expect(s.piles[0].stock).toBe(8 + harvested);
    expect(s.birds.every((b) => !b.cargo && b.perch)).toBe(true);
    s = tick(command(s, { type: "phase", phase: "day" }), 35);
    s = command(s, { type: "gather", id: "patch-west", designated: true });
    s = until(
      s,
      (v) => v.patches[0].remaining === 0 && v.birds.every((b) => !b.cargo),
    );
    expect(s.harvestedReeds).toBe(12+s.patches[0].regrown-s.patches[0].remaining);
    expect(s.piles[0].stock).toBe(8+s.harvestedReeds);
    expect(s.patches[1].remaining).toBe(12);
  });
  it("stores locally, reserves finite capacity, and uses stored reeds in a later build", () => {
    let s = command(initialSettlement(), {
      type: "build",
      kind: "store",
      at: { x: -4, z: -1 },
    });
    s = until(s, (v) => v.sites[0].complete);
    s = command(s, { type: "gather", id: "patch-west", designated: true });
    s = until(
      s,
      (v) => v.harvestedReeds === 12 && v.birds.every((b) => !b.cargo),
    );
    expect(s.sites[0].stock).toBe(12);
    expect(s.piles[0].stock).toBe(4);
    s = command(s, { type: "build", kind: "treehouse", at: { x: -2, z: 2 } });
    s = until(s, (v) => v.sites[1].complete);
    expect(s.sites[0].stock).toBe(10);
    expect(s.consumed).toBe(10);
  });
  it("preserves mid-edge progress on hunger and gives night cargo/roost priority over appetite", () => {
    let s = until(build(), (v) => v.birds.some((b) => b.cargo && b.edge));
    const bird = s.birds.find((b) => b.cargo && b.edge)!;
    const progress = bird.edge!.progress;
    bird.satiety = 0;
    s = tick(s, 1);
    expect(
      s.birds.find((b) => b.id === bird.id)!.edge!.progress,
    ).toBeGreaterThan(progress);
    s = command(s, { type: "phase", phase: "evening" });
    const appetite = s.birds.map((b) => b.satiety);
    s = tick(s, 300);
    expect(s.birds.every((b) => !b.cargo && b.perch && !b.foraging)).toBe(true);
    expect(s.birds.map((b) => b.satiety)).toEqual(appetite);
    expect(s.forage.every((p) => p.eaten === 0)).toBe(true);
    s = tick(command(s, { type: "phase", phase: "day" }), 35);
    expect(s.birds.every((b) => !b.perch && !b.flight)).toBe(true);
  });
});
describe("individual field foraging", () => {
  it("starts observable browsing promptly without consuming at full appetite and yields to commissioned work", () => {
    let s = tick(initialSettlement(), 1);
    expect(s.birds[0].foraging?.intent).toBe("browse");
    expect(workerStatus(s, s.birds[0])).toContain(
      "Browsing while work is quiet",
    );
    s = tick(build(s), 20);
    expect(s.birds.some((b) => b.job || b.cargo)).toBe(true);
    expect(s.forage.every((p) => p.eaten === 0)).toBe(true);
    s = until(s, (v) => v.sites[0].complete);
    expect(s.tick).toBeLessThan(400);
  });
  it("promotes a hungry browser to eating before accepting new work", () => {
    let s = tick(initialSettlement(), 1);
    const browser = s.birds[0];
    browser.at = { ...browser.foraging!.spot };
    browser.edge = null;
    browser.satiety = forageTuning.hungry;
    s = tick(build(s), 1);
    expect(s.birds[0].foraging?.intent).toBe("eat");
    expect(s.birds[0].job).toBeNull();
    expect(s.birds[0].cargo).toBe(0);
  });
  it("chooses named habitats by individual preference and distinct finite feeding places", () => {
    let s = hungry();
    // Equal distance leaves distinct personal preferences, rather than sex or role, decisive.
    s.birds.forEach((b) => {
      b.at = { x: 0, z: 0 };

    });
    s = tick(s, 1);
    expect(s.birds.every(b=>b.foraging?.intent==="eat")).toBe(true);
    expect(s.birds.every(b=>b.foragePreference===settlers.find(p=>p.id===b.id)!.foragePreference)).toBe(true);
    for (const patch of s.forage)
      expect(
        s.birds.filter((b) => b.foraging?.patch === patch.id).length,
      ).toBeLessThanOrEqual(2);
    expect(
      new Set(s.birds.map((b) => JSON.stringify(b.foraging!.spot))).size,
    ).toBe(4);
    expect(
      workerStatus(
        s,
        s.birds.find((b) => b.id === "wren")!,
      ),
    ).toContain("favors sheltered litter");
  });
  it("requires travel and an actual scratch bout before atomic food consumption, then resumes useful work", () => {
    let s = build(hungry());
    s = until(s, (v) =>
      v.birds.some(
        (b) => b.foraging?.progress === forageTuning.scratchTicks - 1,
      ),
    );
    const bird = s.birds.find(
      (b) => b.foraging?.progress === forageTuning.scratchTicks - 1,
    )!;
    const patchId = bird.foraging!.patch;
    const patch = s.forage.find((p) => p.id === patchId)!;
    expect(patch.eaten).toBe(0);
    const before = bird.satiety;
    const reeds = s.piles[0].stock;
    const stepped = tick(s, 1);
    const eater = stepped.birds.find((b) => b.id === bird.id)!;
    expect(stepped.forage.find((p) => p.id === patchId)!.eaten).toBeGreaterThan(
      0,
    );
    expect(eater.satiety).toBeCloseTo(
      before + forageTuning.biteSatiety - forageTuning.satietyDrain,
    );
    expect(eater.rememberedForage).toBe(patchId);
    expect(
      eater.memories.some((m) => m.includes("remembers the productive ground")),
    ).toBe(true);
    expect(stepped.piles[0].stock).toBe(reeds);
    s = until(stepped, (v) => v.sites[0].complete);
    expect(s.forage.reduce((n, p) => n + p.eaten, 0)).toBeGreaterThan(0);
    expect(s.consumed).toBe(6);
  });
  it("uses persisted productive memory to change a later choice", () => {
    let s = hungry();
    for (const p of s.forage) p.open = p.id === "insect-verge";
    s = until(s, (v) => v.birds[0].rememberedForage === "insect-verge");
    s = decodeSettlement(encodeSettlement(s));
    s.birds.forEach((b) => {
      b.foraging = null;
      b.edge = null;
      b.at = { x: 0, z: 0 };

      b.satiety = 35;
    });
    s.forage.forEach((p) => {
      p.open = true;
    });
    const withoutMemory = structuredClone(s);
    withoutMemory.birds[0].rememberedForage = null;
    // Fern likes mixed habitat, but nearby seedheads win without productive memory.
    s.birds[0].at = { x: -1, z: -1 };
    withoutMemory.birds[0].at = { x: -1, z: -1 };
    const familiar = step(s).birds[0].foraging!.patch;
    const unfamiliar = step(withoutMemory).birds[0].foraging!.patch;
    expect(familiar).toBe("insect-verge");
    expect(unfamiliar).toBe("seed-common");
  });
  it("releases rested/depleted places without losing food and reselects alternatives", () => {
    let s = tick(hungry(), 1);
    const prior = s.birds[0].foraging!.patch;
    s = command(s, { type: "forage", id: prior, open: false });
    expect(s.birds.filter((b) => b.foraging?.patch === prior)).toHaveLength(0);
    s = tick(s, 1);
    expect(s.birds[0].foraging?.patch).not.toBe(prior);
    for (const p of s.forage) {
      p.open = p.id === "seed-common";
      if (p.open) {
        p.remaining = 1;
        p.eaten = p.capacity - 1;
      }
    }
    s.birds.forEach((b) => {
      b.foraging = null;
      b.edge = null;
      b.at = { x: -1, z: -1 };
      b.satiety = 1;
    });
    s = tick(s, forageTuning.scratchTicks);
    expect(s.forage[0].remaining).toBe(0);
    expect(s.birds.every((b) => !b.foraging)).toBe(true);
    expect(s.forage[0].eaten).toBe(s.forage[0].capacity);
    s.forage.forEach((p) => {
      p.open = false;
    });
    s = tick(s, 1);
    expect(workerStatus(s, s.birds[0])).toContain(
      "waiting for an open food place with room",
    );
  });
  it("conserves both ledgers through sustained work, depletion and modest deterministic recovery", () => {
    let s = command(build(hungry()), {
      type: "gather",
      id: "patch-west",
      designated: true,
    });
    let minimum = 100;
    for (let n = 0; n < 6000; n++) {
      s = step(s);
      if (n % 17 === 0) validateSettlement(s);
      expect(conserved(s)).toBe(s.totalReeds);
      expect(foodConserved(s)).toBe(true);
      minimum = Math.min(minimum, ...s.forage.map((p) => p.remaining));
      if (n === 743) s = decodeSettlement(encodeSettlement(s));
    }
    expect(minimum).toBeLessThan(12);
    expect(s.forage.reduce((n, p) => n + p.regrown, 0)).toBeGreaterThan(10);
    expect(s.birds.every((b) => b.satiety > 0)).toBe(true);
    expect(s.birds.every((b) => b.rememberedForage !== null)).toBe(true);
    expect(s.sites[0].complete).toBe(true);
    expect(s.harvestedReeds).toBe(12+s.patches[0].regrown-s.patches[0].remaining);
    expect(
      s.birds.every(
        (b) =>
          b.foragePreference ===
          settlers.find((f) => f.id === b.id)!.foragePreference,
      ),
    ).toBe(true);
  });
  it("recovers bounded places even while browsing, persisting partial recovery without pause/reload/day-toggle rewards", () => {
    let s = initialSettlement();
    s.forage.forEach((p) => {
      p.open = false;
      p.remaining -= 2;
      p.eaten += 2;
    });
    s = tick(s, 40);
    expect(s.forage[0].recoveryProgress).toBe(40);
    const before = s.forage;
    for (let n = 0; n < 12; n++) {
      s = decodeSettlement(encodeSettlement(s));
      s = command(s, { type: "phase", phase: "evening" });
      s = command(s, { type: "phase", phase: "day" });
    }
    expect(s.forage).toEqual(before);
    s = command(s, { type: "pause" });
    expect(step(s)).toBe(s);
    s = command(s, { type: "pause" });
    s = tick(command(s, { type: "phase", phase: "evening" }), 200);
    expect(s.forage).toEqual(before);
    const resume = command(s, { type: "phase", phase: "day" });
    expect(tick(decodeSettlement(encodeSettlement(resume)), 5)).toEqual(
      tick(resume, 5),
    );
    const regrown = tick(resume, 5);
    expect(regrown.forage[0]).toMatchObject({
      remaining: 11,
      regrown: 1,
      recoveryProgress: 0,
    });
    let used = tick(hungry(), 1);
    const occupied = used.birds[0].foraging!.patch;
    const p = used.forage.find((f) => f.id === occupied)!;
    p.remaining--;
    p.eaten++;
    used = tick(used, 5);
    expect(used.forage.find((f) => f.id === occupied)!.recoveryProgress).toBe(
      5,
    );
  });
  it("keeps crowded legacy feeding cells free of structures without overwriting them", () => {
    const s = initialSettlement();
    const patch = s.forage[0];
    for (const at of feedingSpots(s, patch)) {
      s.sites.push({
        id: `site-${s.nextId++}`,
        at,
        kind: "store",
        tree: null,
        delivered: 0,
        progress: 0,
        complete: false,
        stock: 0,
        target: 0,
        contributors: [],
        experiment: false,
      });
    }
    expect(feedingSpots(s, patch)).toEqual([]);
    s.birds.forEach((b) => {
      b.satiety = 1;
    });
    const working = tick(s, 1);
    expect(working.birds.every((b) => b.foraging?.patch !== patch.id)).toBe(
      true,
    );
    expect(working.sites).toEqual(s.sites);
    expect(foodPatches.map((p) => p.id)).toEqual(s.forage.map((p) => p.id));
  });
});
