import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { decodeSettlement, encodeSettlement } from "../persistence/settlement-save";
import { accountClient, accountUnavailable } from "./client";

export type AccountMode = "login" | "signup";
export type CloudCopy = { id: string; name: string; createdAt: string };
export const emailCodeLength = 8;
export const maxCloudSaveBytes = 262144;
export const copyPageSize = 50;
const table = "account_save_copies";
const metadata = "id,name,created_at";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function accountError(error: unknown): string {
  return error instanceof Error ? error.message : "The account service could not complete that request. Please try again.";
}
function check(error: {message: string} | null) { if (error) throw new Error(error.message); }
function emailAddress(value: string) {
  const email = value.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}
function copyName(value: string) {
  const name = value.trim();
  if (!name || name.length > 80) throw new Error("Name the copy using 1–80 characters.");
  return name;
}
function savedText(text: string) {
  if (new TextEncoder().encode(text).byteLength > maxCloudSaveBytes) throw new Error("This save is too large for an account copy (maximum 256 KiB).");
  const state = decodeSettlement(text);
  const canonical = encodeSettlement(state);
  if (new TextEncoder().encode(canonical).byteLength > maxCloudSaveBytes) throw new Error("This save is too large for an account copy (maximum 256 KiB).");
  return {state, text: canonical};
}
function copy(value: unknown): CloudCopy {
  const row = value as {id?: unknown; name?: unknown; created_at?: unknown} | null;
  if (!row || typeof row.id !== "string" || !uuid.test(row.id) || typeof row.name !== "string" || !row.name.trim() || row.name.length > 80 || typeof row.created_at !== "string" || !Number.isFinite(Date.parse(row.created_at)))
    throw new Error("The account returned an unreadable save copy. Nothing was loaded.");
  return {id:row.id, name:row.name, createdAt:row.created_at};
}

export function createAccountService(client: SupabaseClient | null) {
  function ready() { if (!client) throw new Error(accountUnavailable); return client; }
  async function owner() {
    const {data,error} = await ready().auth.getUser(); check(error);
    if (!data.user || data.user.is_anonymous) throw new Error("Log in to use account copies.");
    return data.user.id;
  }
  async function sameOwner(id: string) {
    const {data,error} = await ready().auth.getSession(); check(error);
    if (data.session?.user.id !== id) throw new Error("Your account changed during this request. Please try again.");
  }
  return {
    available: client !== null,
    unavailableReason: client ? null : accountUnavailable,
    async getSession(): Promise<Session | null> {
      const {data,error} = await ready().auth.getSession(); check(error); return data.session;
    },
    subscribe(listener: (session: Session | null) => void): () => void {
      if (!client) return () => {};
      const {data} = client.auth.onAuthStateChange((_event,session) => listener(session));
      return () => data.subscription.unsubscribe();
    },
    async requestCode(email: string, mode: AccountMode) {
      const {error} = await ready().auth.signInWithOtp({email:emailAddress(email), options:{shouldCreateUser:mode === "signup"}});
      check(error);
    },
    async verifyCode(email: string, token: string): Promise<Session> {
      if (!new RegExp(`^\\d{${emailCodeLength}}$`).test(token.trim())) throw new Error(`Enter the ${emailCodeLength}-digit code from your email.`);
      const {data,error} = await ready().auth.verifyOtp({email:emailAddress(email),token:token.trim(),type:"email"}); check(error);
      if (!data.session) throw new Error("No session was returned. Request a new code and try again.");
      return data.session;
    },
    async signOut() { const {error} = await ready().auth.signOut({scope:"local"}); check(error); },
    copies: {
      /** Paginated newest first. No payloads or device saves are fetched by listing. */
      async list(offset = 0): Promise<CloudCopy[]> {
        if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("Invalid save-copy page.");
        const id = await owner();
        const {data,error} = await ready().from(table).select(metadata).eq("owner_id",id).order("created_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+copyPageSize-1);
        check(error); await sameOwner(id);
        if (!Array.isArray(data)) throw new Error("The account returned an unreadable save list.");
        return data.map(copy);
      },
      async get(id: string) {
        if (!uuid.test(id)) throw new Error("Choose a valid account copy.");
        const user = await owner();
        const {data,error} = await ready().from(table).select(`${metadata},payload`).eq("owner_id",user).eq("id",id).single();
        check(error); await sameOwner(user);
        const entry = copy(data);
        if (!data || typeof data.payload !== "string") throw new Error("This account copy has no readable settlement. Nothing was loaded.");
        return {...entry, ...savedText(data.payload)};
      },
      async create(name: string, text: string, copyId: string, expectedOwner: string): Promise<CloudCopy> {
        if (!uuid.test(copyId)) throw new Error("Start a new save-copy request with a valid ID.");
        const label = copyName(name), saved = savedText(text); // Reject damaged/oversized saves before a network write.
        const id = await owner();
        if (id !== expectedOwner) throw new Error("Your account changed before saving. Start a new copy in the current account.");
        try {
          const {data,error} = await ready().from(table).insert({id:copyId,owner_id:id,name:label,payload:saved.text}).select(metadata).single();
          if (!error) {await sameOwner(id);return copy(data);}
        } catch { /* A lost reply may follow a committed insert. Reconcile by the same immutable ID. */ }
        const {data,error} = await ready().from(table).select(`${metadata},payload`).eq("owner_id",id).eq("id",copyId).single();
        await sameOwner(id);
        if (error || !data) throw new Error("Could not confirm this account copy. Retry this save with the same request ID.");
        if (data.name !== label || data.payload !== saved.text) throw new Error("That copy ID already belongs to a different saved copy. Start a new copy.");
        return copy(data);
      },
    },
  };
}
export type AccountService = ReturnType<typeof createAccountService>;
export const accountService = createAccountService(accountClient);
