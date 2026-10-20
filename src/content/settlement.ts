/** Provisional fixture and tuning. Design owner: story/settlement-design.md. */
export const trees = [
  {
    id: "lowfork",
    name: "Lowfork",
    x: -2,
    z: 2,
    description: "Broad low branches, a short route across the glade.",
  },
  {
    id: "splitcrown",
    name: "Splitcrown",
    x: 1,
    z: 3,
    description:
      "Twin crowns at the forest edge; room for a canopy neighborhood.",
  },
  {
    id: "reedside",
    name: "Reedside",
    x: 3,
    z: 0,
    description: "A waterside fork, farther from the starting bundles.",
  },
] as const;
export type TreeId = (typeof trees)[number]["id"];
export const settlers = [
  {
    id: "fern",
    name: "Fern",
    color: "#eee0b8",
    role: "Careful weaver",
    want: "Wants a dry place she helped make, and remembers her own work.",
    foragePreference: "mixed",
    preference: "splitcrown",
    pace: 0.9,
    energy: 72,
  },
  {
    id: "rook",
    name: "Rook",
    color: "#3e5149",
    role: "Restless carrier",
    want: "Likes a high open fork and being first back with a load.",
    foragePreference: "open",
    preference: "lowfork",
    pace: 1.12,
    energy: 78,
  },
  {
    id: "dapple",
    name: "Dapple",
    color: "#b16e40",
    role: "Steady builder",
    want: "Wants the work finished before settling near the water.",
    foragePreference: "mixed",
    preference: "reedside",
    pace: 1,
    energy: 66,
  },
  {
    id: "wren",
    name: "Wren",
    color: "#d8ba76",
    role: "Cautious explorer",
    want: "Takes a little longer, and prefers a sheltered sleeping place.",
    foragePreference: "cover",
    preference: "splitcrown",
    pace: 0.82,
    energy: 60,
  },
] as const;
export type Appearance = (typeof settlers)[number]["id"];
export type SettlerId = string;
/** Provisional playtest costs and timings, not measured chicken biology. */
export const tuning = {
  treehouseCost: 6,
  storeCost: 4,
  sleepingDeckCost: 4,
  haulingBasketCost: 4,
  storeCapacity: 12,
  initialReeds: 8,
  gatherTicks: 24,
  liftTicks: 40,
  stepSeconds: 0.1,
} as const;

/** Finite construction-material patches; capacities are provisional tuning. */
export const reedPatches = [
  { id: "patch-west", at: { x: -4, z: 0 }, capacity: 12 },
  { id: "patch-east", at: { x: 3, z: -2 }, capacity: 12 },
] as const;

/** Mixed edible forage, never construction reeds. All rates are playtest assumptions,
 * not measured nutrition or a complete diet/water simulation. */
export const foodPatches = [
  {
    id: "seed-common",
    name: "Seedhead Common",
    at: { x: -1, z: -1 },
    habitat: "open",
    description:
      "Open seedheads, green shoots and small insects among the grasses.",
    capacity: 12,
  },
  {
    id: "leaf-litter",
    name: "Leaf-litter Hollow",
    at: { x: 0, z: 2 },
    habitat: "cover",
    description:
      "Sheltered leaf litter with fallen seeds, tender leaves and scratching insects.",
    capacity: 12,
  },
  {
    id: "insect-verge",
    name: "Insect Verge",
    at: { x: 3, z: 1 },
    habitat: "mixed",
    description:
      "A grassy woodland edge with insects, scattered seeds and soft greens.",
    capacity: 12,
  },
] as const;
export type FoodPatchId = (typeof foodPatches)[number]["id"];
export type ForagePreference = "open" | "cover" | "mixed";
export const forageTuning = {
  initialSatiety: 82,
  satietyDrain: 0.06,
  hungry: 45,
  satisfied: 80,
  biteSatiety: 24,
  scratchTicks: 18,
  recoveryTicks: 45,
  maximumOccupancy: 2,
  browseInterval: 120,
} as const;

/** Bounded economy tuning: fictional play time, never biological measurements. */
export const economyTuning = {
  dayTicks: 1800,
  eveningTicks: 600,
  reedRecoveryTicks: 240,
  nurseryCost: 4,
  foodCapacity: 8,
  nurseryTarget: 6,
  balancedNurseryBuffer: 3,
  urgentNurseryBuffer: 2,
  matingTicks: 180,
  fertilityTicks: 14400,
  layingTicks: 300,
  incubationTicks: 7200,
  juvenileTicks: 7200,
  adultTicks: 14400,
  eggViabilityTicks: 2400,
  mealTicks: 180,
  juvenileMealTicks: 240,
  proteinDrain: 0.012,
  proteinBite: 30,
  proteinMinimum: 30,
} as const;
export const offspringNames = ["Pip", "Clover", "Hazel", "Moss", "Ash", "Bramble", "Sorrel", "Finch", "Pebble", "Thistle", "Flint", "Juniper", "Aster", "Rowan"] as const;
