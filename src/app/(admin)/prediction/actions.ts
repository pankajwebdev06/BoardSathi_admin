"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

interface PyqRow {
  chapter_id: string;
  concept_id: string | null;
  pyq_years: number[];
}

interface ScoreAcc {
  frequency: number;
  years: Set<number>;
}

function accumulate(map: Map<string, ScoreAcc>, key: string, years: number[]) {
  const acc = map.get(key) ?? { frequency: 0, years: new Set<number>() };
  acc.frequency += years.length;
  for (const y of years) acc.years.add(y);
  map.set(key, acc);
}

// 3+ distinct exam years → high, 2 → medium, 1 → low. Pre-computed, stored,
// served to students from cache — no AI, no runtime computation (PRD M6/M11).
function importanceFor(distinctYears: number): "high" | "medium" | "low" {
  if (distinctYears >= 3) return "high";
  if (distinctYears === 2) return "medium";
  return "low";
}

/**
 * M6 — recompute exam_weightage for one subject from PYQ tags.
 * frequency_score = how many (item, year) appearances; importance buckets by
 * distinct years. Chapter and concept scopes both computed.
 */
export async function computeWeightage(formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  const subjectId = formData.get("subject_id") as string;

  const { data: subject } = await admin
    .from("subjects")
    .select("id, board_id")
    .eq("id", subjectId)
    .single();
  if (!subject) return { error: "Subject not found", rows: 0 };

  const { data: chapters } = await admin
    .from("chapters")
    .select("id")
    .eq("subject_id", subjectId);
  const chapterIds = (chapters ?? []).map((c) => c.id as string);
  if (chapterIds.length === 0) {
    return { error: "Subject has no chapters", rows: 0 };
  }

  const [{ data: pyqQuestions }, { data: pyqLongAnswers }] = await Promise.all([
    admin
      .from("questions")
      .select("chapter_id, concept_id, pyq_years")
      .in("chapter_id", chapterIds)
      .eq("is_pyq", true),
    admin
      .from("long_answer")
      .select("chapter_id, concept_id, pyq_years")
      .in("chapter_id", chapterIds)
      .eq("is_pyq", true),
  ]);

  const byChapter = new Map<string, ScoreAcc>();
  const byConcept = new Map<string, ScoreAcc>();
  for (const row of [
    ...((pyqQuestions ?? []) as PyqRow[]),
    ...((pyqLongAnswers ?? []) as PyqRow[]),
  ]) {
    const years = row.pyq_years ?? [];
    if (years.length === 0) continue;
    accumulate(byChapter, row.chapter_id, years);
    if (row.concept_id) accumulate(byConcept, row.concept_id, years);
  }

  const rows = [
    ...[...byChapter.entries()].map(([scopeId, acc]) => ({
      scope_type: "chapter",
      scope_id: scopeId,
      ...toRow(acc),
    })),
    ...[...byConcept.entries()].map(([scopeId, acc]) => ({
      scope_type: "concept",
      scope_id: scopeId,
      ...toRow(acc),
    })),
  ].map((r) => ({
    ...r,
    board_id: subject.board_id,
    subject_id: subjectId,
    computed_at: new Date().toISOString(),
  }));

  function toRow(acc: ScoreAcc) {
    const years = [...acc.years].sort();
    return {
      frequency_score: acc.frequency,
      importance: importanceFor(years.length),
      years_appeared: years,
    };
  }

  // Replace this subject's weightage wholesale — stale scopes must not linger
  const { error: deleteError } = await admin
    .from("exam_weightage")
    .delete()
    .eq("subject_id", subjectId);
  if (deleteError) return { error: deleteError.message, rows: 0 };

  if (rows.length > 0) {
    const { error: insertError } = await admin
      .from("exam_weightage")
      .insert(rows);
    if (insertError) return { error: insertError.message, rows: 0 };
  }

  revalidatePath("/prediction");
  return { error: null, rows: rows.length };
}
