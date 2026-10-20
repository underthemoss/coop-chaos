import type { Settlement } from "../simulation/settlement";
/** An explicit immutable pre-economy snapshot, for legacy decoder tests only. */
export function settlementV4Fixture(state: Settlement) {
  const { economy: _economy, ...s } = structuredClone(state);
  return {
    ...s,
    patches: s.patches.map(
      ({ regrown: _regrown, recoveryProgress: _recovery, ...p }) => p,
    ),
    forage: s.forage.map(
      ({ harvested: _harvested, proteinEaten: _proteinEaten, ...p }) => p,
    ),
    birds: s.birds.map(
      ({
        life: _life,
        protein: _protein,
        foodCargo: _cargo,
        provision: _provision,
        care: _care,
        ...b
      }) => b,
    ),
  };
}
