import { describe, expect, it } from "vitest";
import { mapPosition, mapTile, samePoint } from "../content/maps";
import { smallValley } from "../content/small-valley";
import { canTraverse, findRoute } from "./navigation";

describe("authored valley navigation", () => {
  it("routes deterministically around an actual obstacle", () => {
    const from = { x: 8, z: 4 },
      to = { x: 13, z: 4 };
    const route = findRoute(smallValley, from, to)!;
    expect(route.length).toBeGreaterThan(5);
    expect(route).toEqual(findRoute(smallValley, from, to));
    let previous = from;
    for (const cell of route) {
      expect(canTraverse(smallValley, previous, cell)).toBe(true);
      expect(mapTile(smallValley, cell)?.surface).not.toBe("rock");
      previous = cell;
    }
    expect(previous).toEqual(to);
  });
  it("reaches all three elevation bands through authored ramps and crosses only at fords", () => {
    const from = { x: 5, z: 3 },
      to = { x: 25, z: 21 };
    const route = findRoute(smallValley, from, to)!;
    expect(route).not.toBeNull();
    expect(route.some((p) => mapTile(smallValley, p)?.surface === "ramp")).toBe(
      true,
    );
    expect(route.some((p) => mapTile(smallValley, p)?.surface === "ford")).toBe(
      true,
    );
    expect(
      route.some((p) => mapTile(smallValley, p)?.surface === "water"),
    ).toBe(false);
    expect(mapPosition(smallValley, route.at(-1)!).y).toBeGreaterThan(4.3);
    expect(mapPosition(smallValley, route.at(-1)!).y).toBeLessThan(4.7);
    expect(canTraverse(smallValley, { x: 10, z: 7 }, { x: 10, z: 8 })).toBe(
      false,
    );
    expect(canTraverse(smallValley, { x: 10, z: 15 }, { x: 10, z: 16 })).toBe(
      false,
    );
  });
  it("has two genuine alternative crossings, consistent ramp heights and no diagonal corner cuts", () => {
    for (const crossing of smallValley.crossings)
      expect(mapTile(smallValley, crossing.at)?.surface).toBe("ford");
    for (const ramp of smallValley.ramps)
      expect(findRoute(smallValley, ramp.from, ramp.to)).not.toBeNull();
    expect(canTraverse(smallValley, { x: 9, z: 3 }, { x: 10, z: 2 })).toBe(
      false,
    );
    const onRamp = mapPosition(smallValley, { x: 6, z: 7.25 });
    expect(onRamp.y).toBeCloseTo(1.21875, 0);
    const start = { x: 6, z: 5 },
      end = { x: 6, z: 10 };
    const route = findRoute(smallValley, start, end)!;
    expect(
      route.every((p, i) =>
        canTraverse(smallValley, i ? route[i - 1]! : start, p),
      ),
    ).toBe(true);
    expect(samePoint(route.at(-1)!, end)).toBe(true);
  });
  it("rejects off-map, water, rock and fractional destinations", () => {
    expect(findRoute(smallValley, { x: 5, z: 3 }, { x: -1, z: 4 })).toBeNull();
    expect(findRoute(smallValley, { x: 5, z: 3 }, { x: 10, z: 3 })).toBeNull();
    expect(findRoute(smallValley, { x: 5, z: 3 }, { x: 16, z: 2 })).toBeNull();
    expect(findRoute(smallValley, { x: 5, z: 3 }, { x: 5.1, z: 3 })).toBeNull();
  });
});
