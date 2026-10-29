import original from './generated/ochre-valley-v1.json';
import crescent from './generated/ochre-valley-v2.json';
import type { MapDefinition } from './maps';

// Published map versions are immutable data. Do not regenerate saved geography
// with platform-dependent trigonometry; see assets/maps/README.md for provenance.
export const smallValley = original as unknown as MapDefinition;
export const defaultValley = crescent as unknown as MapDefinition;
export const mapCatalog: readonly MapDefinition[] = [smallValley, defaultValley];
export const getMap = (id: string, version: number) =>
  mapCatalog.find((map) => map.id === id && map.version === version);
