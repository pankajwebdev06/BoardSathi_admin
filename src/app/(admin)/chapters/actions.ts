"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export async function createChapter(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();

  const subjectId = formData.get("subject_id") as string;
  const boardId = formData.get("board_id") as string;
  const titleEn = (formData.get("title_en") as string).trim();
  const titleHi = (formData.get("title_hi") as string).trim();
  const number = parseInt(formData.get("number") as string, 10);
  const ncertRef = ((formData.get("ncert_ref") as string) || "").trim() || null;

  const { error } = await admin.from("chapters").insert({
    subject_id: subjectId,
    board_id: boardId,
    // 001 columns kept in sync so the current student app keeps working
    name: titleEn,
    name_hi: titleHi,
    chapter_number: number,
    display_order: number,
    title_en: titleEn,
    title_hi: titleHi,
    number,
    sort_order: number,
    ncert_ref: ncertRef,
  });

  if (error) return { error: error.message };

  revalidatePath("/chapters");
  return { error: null };
}

export async function uploadChapterPdf(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();

  const chapterId = formData.get("chapter_id") as string;
  const file = formData.get("pdf") as File;

  if (!file || file.size === 0) return { error: "No file selected" };
  if (file.type !== "application/pdf") return { error: "File must be a PDF" };

  const path = `${chapterId}/${file.name}`;
  const { error: uploadError } = await admin.storage
    .from("chapter-pdfs")
    .upload(path, file, { upsert: true, contentType: "application/pdf" });

  if (uploadError) return { error: uploadError.message };

  const { error: updateError } = await admin
    .from("chapters")
    .update({ source_pdf_url: path })
    .eq("id", chapterId);

  if (updateError) return { error: updateError.message };

  revalidatePath("/chapters");
  return { error: null };
}
