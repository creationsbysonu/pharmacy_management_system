import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. It bypasses row level security, so it is imported by
 * exactly two places: the operator console and the staff-login provisions.
 * It returns null when the key is missing so the UI can explain the setup step
 * instead of throwing a stack trace at the operator.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const ADMIN_KEY_HINT =
  "Add SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API) to this deployment, then redeploy.";
