import { describe, expect, it } from "vitest";
import { followHalfSpan, hasTacticalPresentation, stepValleyZoom } from "./valley-view";

describe("landscape presentation contract", () => {
  it("limits the new presentation to the selected v2 map", () => {
    expect(hasTacticalPresentation({ id: "ochre-valley", version: 2 })).toBe(true);
    expect(hasTacticalPresentation({ id: "ochre-valley", version: 1 })).toBe(false);
    expect(hasTacticalPresentation({ id: "other", version: 2 })).toBe(false);
  });
  it("steps between map fit and the three bounded physical follow spans", () => {
    expect([0, 1, 2, 3].map((n) => followHalfSpan(n as 0 | 1 | 2 | 3))).toEqual([6, 6, 4.2, 3.2]);
    expect(stepValleyZoom(0, -1)).toBe(0);
    expect(stepValleyZoom(3, 1)).toBe(3);
    expect(stepValleyZoom(0, 200)).toBe(1);
    expect(stepValleyZoom(2, -20)).toBe(1);
    expect(stepValleyZoom(2, 0)).toBe(2);
  });
});
