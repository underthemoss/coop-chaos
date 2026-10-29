import { describe, it, expect } from "vitest";
import {
  initialLandscape,
  moveWalker,
  startDelivery,
  stepLandscape,
  walkerPosition,
} from "./landscape";
import { decodeGame, encodeGame } from "../persistence/game-save";
import { initialSettlement } from "./settlement";
import {
  encodeSettlement,
  decodeSettlement,
} from "../persistence/settlement-save";
import { smallValley } from "../content/small-valley";
import { mapTile } from "../content/maps";
describe("portable valley traversal", () => {
  it("replays deterministically and resumes mid-ramp without teleportation", () => {
    let state = moveWalker(initialLandscape(smallValley), "fern", { x: 25, z: 21 })!;
    for (let i = 0; i < 60; i++) state = stepLandscape(state, 0.1);
    const restored = decodeGame(encodeGame(state));
    expect(restored).toEqual(state);
    if (!("kind" in restored)) throw new Error("wrong mode");
    expect(walkerPosition(restored, restored.birds[0])).toEqual(
      walkerPosition(state, state.birds[0]),
    );
    expect(stepLandscape(restored, 120)).toEqual(stepLandscape(state, 120));
    const end = stepLandscape(state, 120);
    expect(end.birds[0].at).toEqual({ x: 25, z: 21 });
    expect(end.birds[0].route).toEqual([]);
  });
  it("keeps redirection on the current edge and rejects water destinations", () => {
    let s = moveWalker(initialLandscape(smallValley), "fern", { x: 25, z: 21 })!;
    s = stepLandscape(s, 0.2);
    const before = walkerPosition(s, s.birds[0]);
    const next = moveWalker(s, "fern", { x: 5, z: 3 })!;
    expect(walkerPosition(next, next.birds[0])).toEqual(before);
    const water = smallValley.tiles.findIndex((t) => t.surface === "water");
    expect(
      moveWalker(s, "fern", {
        x: water % smallValley.width,
        z: Math.floor(water / smallValley.width),
      }),
    ).toBeNull();
  });
  it("conserves real cargo through interrupted orders, save and competing carriers", () => {
    let s = initialLandscape(smallValley);
    s = startDelivery(s, "fern")!;
    s = startDelivery(s, "rook")!;
    for (let i = 0; i < 4000; i++) {
      s = stepLandscape(s, 0.2);
      expect(
        s.source + s.delivered + s.birds.reduce((n, b) => n + b.cargo, 0),
      ).toBe(20);
      if (i === 100) {
        s = decodeGame(encodeGame(s)) as typeof s;
        s = moveWalker(s, "fern", { x: 6, z: 4 })!;
      }
    }
    expect(s.delivered).toBeGreaterThan(0);
    expect(s.source).toBe(0);
    for (const bird of s.birds)
      expect(mapTile(smallValley, bird.at)?.traversable).toBe(true);
  });
  it("preserves original settlement envelope and geography, rejects unknown maps and illegal paths", () => {
    const legacy = initialSettlement(),
      raw = encodeSettlement(legacy);
    expect(encodeGame(legacy)).toBe(raw);
    expect(decodeGame(raw)).toEqual(decodeSettlement(raw));
    const envelope = JSON.parse(encodeGame(initialLandscape(smallValley)));
    envelope.state.mapVersion = 999;
    expect(() => decodeGame(JSON.stringify(envelope))).toThrow("map version");
    envelope.state.mapVersion = 1;
    envelope.state.birds[0].route = [{ x: 25, z: 21 }];
    expect(() => decodeGame(JSON.stringify(envelope))).toThrow("route");
    envelope.state.birds[0].route = [];
    envelope.state.source = 21;
    expect(() => decodeGame(JSON.stringify(envelope))).toThrow("conserved");
  });
});
