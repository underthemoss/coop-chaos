import { initialState } from "../simulation/flock";
import type { FlockState } from "../simulation/flock";

const DATABASE = "coop-chaos";
const STORE = "saves";
const KEY = "first-evening";
export function encodeSave(state: FlockState): string {
  return JSON.stringify(
    { schemaVersion: 1, storyVersion: "first-evening-1", choice: state.choice },
    null,
    2,
  );
}
export function decodeSave(text: string): FlockState {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("This file is not a valid Coop Chaos save.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid save.");
  const data = value as Record<string, unknown>;
  if (
    data.schemaVersion !== 1 ||
    data.storyVersion !== "first-evening-1" ||
    !Object.hasOwn(data, "choice") ||
    ![null, "shelter", "rank"].includes(data.choice as null | string) ||
    Object.keys(data).some(
      (key) => !["schemaVersion", "storyVersion", "choice"].includes(key),
    )
  ) {
    throw new Error(
      "This save is damaged or belongs to a different story version.",
    );
  }
  return { choice: data.choice as FlockState["choice"] };
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Close other Coop Chaos tabs to open this save."));
  });
}
async function storedSave(write?: string): Promise<string | undefined> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE,
        write === undefined ? "readonly" : "readwrite",
      );
      const request =
        write === undefined
          ? transaction.objectStore(STORE).get(KEY)
          : transaction.objectStore(STORE).put(write, KEY);
      transaction.oncomplete = () =>
        resolve(
          write === undefined ? (request.result as string | undefined) : write,
        );
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Save interrupted."));
    });
  } finally {
    db.close();
  }
}
export async function loadSave(): Promise<FlockState> {
  const text = await storedSave();
  return text === undefined ? initialState() : decodeSave(text);
}
export async function saveGame(state: FlockState): Promise<void> {
  await storedSave(encodeSave(state));
}
