import { createClient } from "@supabase/supabase-js";

export const accountUnavailable = "Accounts are not available on this version yet. You can still play and save on this device.";

/** Only public browser configuration belongs here. Never accept a privileged key. */
export function accountConfig(env: { VITE_SUPABASE_URL?: string; VITE_SUPABASE_PUBLISHABLE_KEY?: string; VITE_ACCOUNT_EMAIL_READY?: string }) {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (env.VITE_ACCOUNT_EMAIL_READY !== "true" || !url || !key?.startsWith("sb_publishable_") || key.length < 20) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") return null;
    return { url: parsed.origin, key };
  } catch { return null; }
}

const config = accountConfig({VITE_SUPABASE_URL:import.meta.env.VITE_SUPABASE_URL,VITE_SUPABASE_PUBLISHABLE_KEY:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,VITE_ACCOUNT_EMAIL_READY:import.meta.env.VITE_ACCOUNT_EMAIL_READY});
export const accountClient = config ? createClient(config.url, config.key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;
