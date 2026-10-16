import { describe, expect, it } from "vitest";
import { consequences, initialState, resolveShelter } from "./flock";

describe("the first evening", () => {
  it("protecting Pip earns Bramble’s backing and leaves Mallow a remembered grievance", () => {
    const before = initialState();
    const after = resolveShelter(before, "shelter");
    expect(before.choice).toBeNull();
    expect(consequences(after).sheltered).toEqual(["bramble", "pip"]);
    expect(consequences(after).moods.rowan).toContain("debt to Mallow");
    expect(consequences(after).memory).toContain(
      "Bramble will speak for Rowan",
    );
  });
  it("honoring rank earns a different ally and costs Bramble’s trust", () => {
    const outcome = consequences(resolveShelter(initialState(), "rank"));
    expect(outcome.sheltered).toEqual(["mallow"]);
    expect(outcome.moods.bramble).toContain("no longer trust");
    expect(outcome.memory).toContain("Mallow will stand beside Rowan");
  });
  it("cannot replay the decision to accumulate or replace consequences", () => {
    const decided = resolveShelter(initialState(), "shelter");
    expect(() => resolveShelter(decided, "rank")).toThrow(
      "already been decided",
    );
    expect(decided.choice).toBe("shelter");
  });
});
