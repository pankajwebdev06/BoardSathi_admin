"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

function refresh() {
  revalidatePath("/review");
  revalidatePath("/chapters");
  revalidatePath("/");
}

export async function approveQuestion(formData: FormData) {
  const adminUser = await requireAdmin();
  const admin = createAdminClient();
  const id = formData.get("id") as string;

  const { error } = await admin
    .from("questions")
    .update({ status: "approved", reviewed_by: adminUser.id })
    .eq("id", id)
    .eq("status", "draft");

  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

export async function rejectQuestion(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  const id = formData.get("id") as string;

  // Rejected drafts are deleted — they were AI output that never shipped
  const { error } = await admin
    .from("questions")
    .delete()
    .eq("id", id)
    .eq("status", "draft");

  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

export async function approveLongAnswer(formData: FormData) {
  const adminUser = await requireAdmin();
  const admin = createAdminClient();
  const id = formData.get("id") as string;

  const { error } = await admin
    .from("long_answer")
    .update({ status: "approved", reviewed_by: adminUser.id })
    .eq("id", id)
    .eq("status", "draft");

  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

export async function rejectLongAnswer(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  const id = formData.get("id") as string;

  // Rejected drafts are deleted — they were AI output that never shipped
  const { error } = await admin
    .from("long_answer")
    .delete()
    .eq("id", id)
    .eq("status", "draft");

  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

export async function approveAllForChapter(formData: FormData) {
  const adminUser = await requireAdmin();
  const admin = createAdminClient();
  const chapterId = formData.get("chapter_id") as string;

  const { error } = await admin
    .from("questions")
    .update({ status: "approved", reviewed_by: adminUser.id })
    .eq("chapter_id", chapterId)
    .eq("status", "draft");

  if (error) return { error: error.message };

  const { error: laError } = await admin
    .from("long_answer")
    .update({ status: "approved", reviewed_by: adminUser.id })
    .eq("chapter_id", chapterId)
    .eq("status", "draft");

  if (laError) return { error: laError.message };
  refresh();
  return { error: null };
}

export async function publishChapter(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  const chapterId = formData.get("chapter_id") as string;

  // DB function flips approved → published and bumps content_version —
  // the delta-sync signal the student app watches (PRD §5.5)
  const { data, error } = await admin.rpc("publish_chapter", {
    p_chapter_id: chapterId,
  });

  if (error) return { error: error.message, version: null };
  refresh();
  return { error: null, version: data as number };
}
