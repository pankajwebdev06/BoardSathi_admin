"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

// M4: PYQ tagging — is_pyq + pyq_years drive exam prediction (M6).
// years come in as free text ("2022, 2023"); empty clears the tag.
export async function setPyqTag(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();

  const contentType = formData.get("content_type") as string;
  const id = formData.get("id") as string;
  const chapterId = formData.get("chapter_id") as string;
  const yearsRaw = (formData.get("years") as string) ?? "";

  if (contentType !== "question" && contentType !== "long_answer") {
    return { error: "Unknown content type" };
  }

  const years = [
    ...new Set(
      yearsRaw
        .split(/[,\s]+/)
        .map((y) => parseInt(y, 10))
        .filter((y) => !Number.isNaN(y))
    ),
  ].sort();

  const invalid = years.find((y) => y < 2000 || y > 2100);
  if (invalid) return { error: `"${invalid}" doesn't look like an exam year` };

  const table = contentType === "question" ? "questions" : "long_answer";
  const { error } = await admin
    .from(table)
    .update({ is_pyq: years.length > 0, pyq_years: years })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(`/chapters/${chapterId}/questions`);
  return { error: null, years };
}
