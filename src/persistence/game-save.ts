import { decodeSettlement, encodeSettlement } from "./settlement-save";
import type { Settlement } from "../simulation/settlement";
import type { Landscape } from "../simulation/landscape";
import { landscapeBirds } from "../simulation/landscape";
import { getMap } from "../content/small-valley";
import { mapTile } from "../content/maps";
import { canTraverse } from "../simulation/navigation";
export type GameState = Settlement | Landscape;
export function isLandscape(state: GameState): state is Landscape {
  return "kind" in state && state.kind === "landscape";
}
export function decodeGame(raw: string): GameState {
  const parsed = JSON.parse(raw);
  if (parsed?.kind !== "chicken-civ-landscape") return decodeSettlement(raw);
  if (parsed.schemaVersion !== 1)
    throw new Error(
      "This landscape save version is not supported. Its original data is preserved.",
    );
  const s = parsed.state as Landscape;
  const map = s && getMap(s.mapId, s.mapVersion);
  if (!map)
    throw new Error(
      "This landscape map or map version is unavailable. Its original data is preserved.",
    );
  const valid = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0;
  if (
    s.kind !== "landscape" ||
    !valid(s.elapsed) ||
    !Number.isSafeInteger(s.source) ||
    s.source < 0 ||
    !Number.isSafeInteger(s.delivered) ||
    s.delivered < 0 ||
    !Array.isArray(s.birds) ||
    s.birds.length !== 4
  )
    throw new Error("Invalid landscape state.");
  for (const [i, b] of s.birds.entries()) {
    if (
      !b ||
      b.id !== landscapeBirds[i] ||
      !mapTile(map, b.at)?.traversable ||
      !valid(b.progress) ||
      b.progress >= 1 ||
      !Number.isSafeInteger(b.cargo) ||
      b.cargo < 0 ||
      b.cargo > 2 ||
      typeof b.delivery !== "boolean" ||
      !Array.isArray(b.route) ||
      b.route.length > map.tiles.length ||
      (!b.route.length && b.progress !== 0)
    )
      throw new Error("Invalid landscape walker.");
    let at = b.at;
    for (const next of b.route) {
      if (!canTraverse(map, at, next))
        throw new Error("Invalid landscape route.");
      at = next;
    }
  }
  if (
    s.source + s.delivered + s.birds.reduce((sum, b) => sum + b.cargo, 0) !==
    map.scenario.supply.initial
  )
    throw new Error("Landscape cargo is not conserved.");
  return s;
}
export function encodeGame(state: GameState): string {
  if (!isLandscape(state)) return encodeSettlement(state);
  const raw = JSON.stringify({
    kind: "chicken-civ-landscape",
    schemaVersion: 1,
    state,
  });
  decodeGame(raw);
  return raw;
}
