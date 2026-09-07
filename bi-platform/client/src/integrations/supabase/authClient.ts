import { createClient } from "@supabase/supabase-js";
import { brokeredPreviewStorage } from "./previewAuthStorage";

const AUTH_SUPABASE_URL =
  import.meta.env.VITE_AUTH_SUPABASE_URL || "https://afqidjbyfrhtxheenhhp.supabase.co";
const AUTH_SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_AUTH_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_xZJHFC98c2Zf7WBcdSEV5g_bAGW8iSb";

export const authSupabase = createClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: brokeredPreviewStorage(),
    storageKey: "hopi-hari-platform-auth",
    persistSession: true,
    autoRefreshToken: true,
  },
});
