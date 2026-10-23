import type { Settlement } from "../simulation/settlement";
/** An explicit immutable pre-economy snapshot, for legacy decoder tests only. */
export function settlementV4Fixture(state: Settlement) {
  const { economy: _economy, constructionFocus: _focus, ...s } = structuredClone(state);
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
        request: _request,
        requestResult: _requestResult,
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

/** Immutable v5 shape before direct chicken requests. */
export function settlementV5Fixture(state: Settlement) {
  return {...settlementV6Fixture(state),birds:state.birds.map(({request:_request,requestResult:_result,...bird})=>structuredClone(bird))};
}

/** Immutable v6 shape before community construction focus. */
export function settlementV6Fixture(state: Settlement) {
  const {constructionFocus:_focus,...s}=structuredClone(state);
  return s;
}
