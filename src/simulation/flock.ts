/** Pure, deterministic rules. Narrative meaning: story/story-system.md. */
export type Choice = "shelter" | "rank";
export type BirdId = "mallow" | "bramble" | "pip" | "rowan";
export interface FlockState {
  readonly choice: Choice | null;
}
export const initialState = (): FlockState => ({ choice: null });

export function resolveShelter(state: FlockState, choice: Choice): FlockState {
  if (state.choice !== null)
    throw new Error("This evening has already been decided.");
  if (choice !== "shelter" && choice !== "rank")
    throw new Error("Unknown shelter choice.");
  return { choice };
}

export function consequences(state: FlockState) {
  if (state.choice === "shelter")
    return {
      sheltered: ["bramble", "pip"] as readonly BirdId[],
      title: "A place for the small.",
      chronicle:
        "Bramble settles Pip in the dry hollow. She promises Rowan her voice at the next gathering. Mallow takes the outer roots, and remembers who asked her to yield.",
      memory:
        "Bramble will speak for Rowan. Mallow expects him to make amends.",
      moods: {
        mallow: "Her place was given away.",
        bramble: "Her chick comes first. Now she owes Rowan.",
        pip: "Warm, dry, and asleep beside Bramble.",
        rowan: "Has Bramble’s support, and a debt to Mallow.",
      },
    };
  if (state.choice === "rank")
    return {
      sheltered: ["mallow"] as readonly BirdId[],
      title: "The old order holds.",
      chronicle:
        "Mallow claims the dry hollow and promises to stand beside Rowan. Bramble tucks Pip beneath her wing at the outer roots. She will remember that rank came before her chick.",
      memory:
        "Mallow will stand beside Rowan. Bramble’s trust in him has broken.",
      moods: {
        mallow: "Her standing was honored. Rowan has her support.",
        bramble: "Shelters Pip herself; will no longer trust Rowan’s promises.",
        pip: "Under Bramble’s wing, outside the dry hollow.",
        rowan: "Has Mallow’s backing, at the cost of Bramble’s trust.",
      },
    };
  return {
    sheltered: [] as readonly BirdId[],
    title: "Rain is coming.",
    chronicle:
      "The flock gathers at the old roots. For now, no one has yielded.",
    memory: "One hollow. Two claims. Everyone is watching Rowan.",
    moods: {
      mallow: "Expects the place her years have earned.",
      bramble: "Wants a dry place for Pip.",
      pip: "Stays close to Bramble.",
      rowan: "Must choose whose claim to uphold.",
    },
  };
}
