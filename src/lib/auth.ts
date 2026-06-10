import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUser } from "@/lib/types";

// Guard for admin pages: requires a Supabase session AND a matching row in
// admin_user. Content writes still go through the service-role client.
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: adminUser } = await admin
    .from("admin_user")
    .select("id, auth_user_id, email, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!adminUser) redirect("/login?error=not_admin");

  return adminUser as AdminUser;
}
