import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { decodeSave, encodeSave, loadSave, saveGame } from "./save";
import {
  consequences,
  initialState,
  resolveShelter,
} from "../simulation/flock";

describe("versioned saves", () => {
  it("round-trips each decision and its derived social consequences", () => {
    for (const choice of ["shelter", "rank"] as const) {
      const state = resolveShelter(initialState(), choice);
      expect(consequences(decodeSave(encodeSave(state)))).toEqual(
        consequences(state),
      );
    }
  });
  it("rejects malformed, incomplete, tampered and future saves", () => {
    for (const text of [
      "not json",
      "null",
      "{}",
      "[]",
      '{"schemaVersion":2,"choice":"rank"}',
      '{"schemaVersion":1,"storyVersion":"first-evening-1","choice":"war"}',
      '{"schemaVersion":1,"storyVersion":"first-evening-1","choice":null,"loyalty":999}',
    ]) {
      expect(() => decodeSave(text)).toThrow();
    }
  });
  it("commits to IndexedDB and reopens the same coherent state", async () => {
    expect(await loadSave()).toEqual(initialState());
    await saveGame({ choice: "shelter" });
    expect(await loadSave()).toEqual({ choice: "shelter" });
    await saveGame({ choice: "rank" });
    expect(await loadSave()).toEqual({ choice: "rank" });
  });
});
