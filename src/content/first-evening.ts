import type { BirdId, Choice } from "../simulation/flock";

/** Provisional fixture, maintained with story/story-system.md; never world canon by inference. */
export const birds: {
  id: BirdId;
  name: string;
  role: string;
  color: string;
  want: string;
  fear: string;
}[] = [
  {
    id: "rowan",
    name: "Rowan",
    role: "The protector",
    color: "#384c46",
    want: "To hold the flock together, and be seen keeping his word.",
    fear: "Losing the trust that makes his protection mean something.",
  },
  {
    id: "mallow",
    name: "Mallow",
    role: "The senior hen",
    color: "#eee1bb",
    want: "Recognition for the years she has given this coop.",
    fear: "Being quietly made irrelevant by those she helped raise.",
  },
  {
    id: "bramble",
    name: "Bramble",
    role: "A mother with a claim",
    color: "#b46a38",
    want: "Safety for Pip, even if she must challenge the pecking order.",
    fear: "Being asked to accept harm for the sake of someone else’s standing.",
  },
  {
    id: "pip",
    name: "Pip",
    role: "The next generation",
    color: "#e7bd5e",
    want: "Warmth, belonging, and Bramble nearby.",
    fear: "Being left alone when the weather turns.",
  },
];

export const evening = {
  title: "Who gets the hollow?",
  description:
    "Rain is on its way. Rowan promised Mallow her usual place beneath the dry roots. Tonight, Bramble asks for the hollow for her chick. Both turn to Rowan.",
  choices: [
    {
      id: "shelter" as Choice,
      title: "Make room for Bramble & Pip",
      detail: "Put care before rank. Ask Mallow to yield her place.",
    },
    {
      id: "rank" as Choice,
      title: "Honor Mallow’s claim",
      detail: "Keep your promise to the senior hen. Bramble must find cover.",
    },
  ],
};
