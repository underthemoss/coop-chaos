import type { Settlement } from "../simulation/settlement";
export type SaveFeedback = { saving: true } | { saved: true } | { saved: false; reason: string };
/** Only the latest requested save may report the current session's durability. */
export function latestSave(
  write: (state: Settlement) => Promise<void>,
  report: (feedback: SaveFeedback) => void,
) {
  let generation = 0;
  return async (state: Settlement): Promise<boolean> => {
    const attempt = ++generation;
    report({ saving: true });
    try {
      await write(state);
      if (attempt !== generation) return false;
      report({ saved: true });
      return true;
    } catch (cause) {
      if (attempt === generation)
        report({
          saved: false,
          reason:
            cause instanceof Error
              ? cause.message
              : "Device save failed. Your previous save is retained.",
        });
      return false;
    }
  };
}
