import { describe, expect, it } from "vitest";
import { fitStudyBounds, unionStudyBounds } from "./tree-study-view";

describe("equal tree-study framing", () => {
  const bounds = unionStudyBounds([
    { min: [-8.5, -1.3, -5.4], max: [8.4, 13.6, 4] },
    { min: [-4, 0, -3.5], max: [4, 8.5, 3.5] },
    { min: [-3, 0, -3.3], max: [5, 6.5, 3.3] },
    { min: [-2.8, -.4, -4.2], max: [2.8, 1, -2.8] },
  ]);
  for (const aspect of [16 / 9, 390 / 520, 320 / 390]) for (const beta of [Math.PI / 3.25, 1.1]) {
    it(`keeps crown and fixture corners inside at aspect ${aspect}, pitch ${beta}`, () => {
      const alpha = -Math.PI / 2.35;
      const fit = fitStudyBounds(bounds, alpha, beta, aspect);
      for (const x of [bounds.min[0], bounds.max[0]])
        for (const y of [bounds.min[1], bounds.max[1]])
          for (const z of [bounds.min[2], bounds.max[2]]) {
            const p = [x, y, z].map((v, i) => v - fit.center[i]);
            const horizontal = -Math.sin(alpha) * p[0] + Math.cos(alpha) * p[2];
            const vertical = -Math.cos(alpha) * Math.cos(beta) * p[0] + Math.sin(beta) * p[1] - Math.sin(alpha) * Math.cos(beta) * p[2];
            expect(Math.abs(horizontal)).toBeLessThan(fit.halfSpan * aspect);
            expect(Math.abs(vertical)).toBeLessThan(fit.halfSpan);
          }
    });
  }
  it("retains the tallest and widest candidates rather than fitting the selected one", () => {
    expect(bounds).toEqual({ min: [-8.5, -1.3, -5.4], max: [8.4, 13.6, 4] });
  });
});
