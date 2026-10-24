import { describe, expect, it } from "vitest";
import { latestSave } from "./save-status";
import type { SaveFeedback } from "./save-status";
import { initialSettlement } from "../simulation/settlement";
function deferred() {
  let resolve!: () => void, reject!: (reason: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
describe("session save feedback", () => {
  it("an older valid commit cannot hide a newer immediately rejected candidate", async () => {
    const first = deferred(),
      reports: SaveFeedback[] = [];
    let attempt = 0;
    const save = latestSave(
      () =>
        ++attempt === 1
          ? first.promise
          : Promise.reject(new Error("Invalid latest session")),
      (v) => reports.push(v),
    );
    const older = save(initialSettlement());
    expect(reports).toEqual([{ saving: true }]);
    expect(await save(initialSettlement())).toBe(false);
    first.resolve();
    expect(await older).toBe(false);
    expect(reports).toEqual([
      { saving: true },
      { saving: true },
      { saved: false, reason: "Invalid latest session" },
    ]);
  });
  it("a newer successful retry clears failure without a delayed older error reversing it", async () => {
    const first = deferred(),
      reports: SaveFeedback[] = [];
    let attempt = 0;
    const save = latestSave(
      () => (++attempt === 1 ? first.promise : Promise.resolve()),
      (v) => reports.push(v),
    );
    const older = save(initialSettlement());
    expect(await save(initialSettlement())).toBe(true);
    first.reject(new Error("Old failure"));
    await older;
    expect(reports).toEqual([{ saving: true }, { saving: true }, { saved: true }]);
  });
});
