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
    preference: "splitcrown",
    pace: 0.82,
    energy: 60,
  },
] as const;
export type SettlerId = (typeof settlers)[number]["id"];
export const tuning = {
  treehouseCost: 6,
  storeCost: 4,
  storeCapacity: 12,
  initialReeds: 8,
  gatherTicks: 24,
  stepSeconds: 0.1,
} as const;

/** Finite construction-material patches; capacities are provisional tuning. */
export const reedPatches = [
  { id: "patch-west", at: { x: -4, z: 0 }, capacity: 12 },
  { id: "patch-east", at: { x: 3, z: -2 }, capacity: 12 },
] as const;
