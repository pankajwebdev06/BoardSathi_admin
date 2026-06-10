import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. All content writes go through this,
// per the PRD security model (students can never write content tables).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
