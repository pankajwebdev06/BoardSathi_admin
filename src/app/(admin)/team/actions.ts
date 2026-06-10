"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

const ROLES = ["owner", "editor", "reviewer"] as const;

export async function addTeamMember(formData: FormData) {
  const me = await requireAdmin();
  if (me.role !== "owner") return { error: "Only the owner can add team members" };

  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = (formData.get("password") as string) || "";
  const role = formData.get("role") as string;

  if (!email.includes("@")) return { error: "Valid email required" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  if (!ROLES.includes(role as (typeof ROLES)[number])) return { error: "Invalid role" };

  const admin = createAdminClient();

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) return { error: authError.message };

  const { error: insertError } = await admin.from("admin_user").insert({
    auth_user_id: created.user.id,
    email,
    role,
  });
  if (insertError) {
    // Roll back the orphaned auth user so the email can be retried
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: insertError.message };
  }

  revalidatePath("/team");
  return { error: null };
}

export async function removeTeamMember(formData: FormData) {
  const me = await requireAdmin();
  if (me.role !== "owner") return { error: "Only the owner can remove team members" };

  const id = formData.get("id") as string;
  if (id === me.id) return { error: "You cannot remove yourself" };

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("admin_user")
    .select("auth_user_id")
    .eq("id", id)
    .single();

  const { error: deleteError } = await admin.from("admin_user").delete().eq("id", id);
  if (deleteError) return { error: deleteError.message };

  if (target?.auth_user_id) {
    await admin.auth.admin.deleteUser(target.auth_user_id);
  }

  revalidatePath("/team");
  return { error: null };
}
