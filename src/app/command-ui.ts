import { validateDirectOrder, type DirectOrder, type Settlement, type Worker } from "../simulation/settlement";

/** Presentation queries only. The simulation validates every issued command again. */
export function actorBlock(bird: Worker): string {
  return bird.life.stage !== "adult" ? "Too young for direct orders" : bird.care ? "Providing essential brood care" : "";
}

export function targetEligibility(state: Settlement, ids: readonly string[], order: DirectOrder) {
  return ids.flatMap(id => {
    const bird = state.birds.find(b => b.id === id);
    if (!bird) return [];
    let reason = actorBlock(bird);
    if (!reason) try { validateDirectOrder(state, bird, order); }
    catch (cause) { reason = cause instanceof Error ? cause.message : "Target unavailable"; }
    return [{ id, name: bird.life.name, eligible: !reason, reason }];
  });
}

export function awaitingOrderBirds(state: Settlement): Worker[] {
  if (state.phase !== "day") return [];
  return state.birds.filter(b => b.life.stage === "adult" && !b.care && b.direct &&
    !b.direct.order && !b.direct.pending && !b.direct.community && !b.direct.queue.length &&
    !b.resting && b.energy >= 28 && !b.foraging && !b.edge && !b.flight && !b.perch && !b.lift &&
    !b.job && !b.provision && !b.request && !b.cargo && !b.foodCargo);
}

export function recallGroup(ids: readonly string[], state: Settlement): string[] {
  return ids.filter(id => state.birds.some(b => b.id === id));
}

export type ShortcutContext = { gameFocused: boolean; editing: boolean; control: boolean; meta: boolean; alt: boolean; shift: boolean };
export function commandShortcut(key: string, context: ShortcutContext, code=""): "move" | "gather" | "building" | "stop" | "awaiting" | "cancel" | { group: number; assign: boolean } | null {
  if (!context.gameFocused || context.editing || context.control || context.meta || context.alt) return null;
  if (/^Digit[1-9]$/.test(code)) key=code.slice(-1);
  if (/^[1-9]$/.test(key)) return { group: Number(key), assign: context.shift };
  if (key === "Escape") return "cancel";
  if (context.shift) return null;
  const shortcuts = { m: "move", g: "gather", b: "building", s: "stop", i: "awaiting" } as const;
  return shortcuts[key.toLowerCase() as keyof typeof shortcuts] ?? null;
}
