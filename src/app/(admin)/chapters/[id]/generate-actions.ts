"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import {
  extractConcepts,
  generateLongAnswersForConcept,
  generateQuestionsForConcept,
  type ExtractedConcept,
} from "@/lib/ai/generation";

export interface GenerationResult {
  error: string | null;
  conceptsUsed?: number;
  questionsCreated?: number;
}

interface ChapterContext {
  pdfBase64: string;
  concepts: { id: string; name_en: string; name_hi: string }[];
}

// Shared prep for all generators: download the chapter PDF and reuse the
// chapter's concepts (extracting them once if missing).
async function loadChapterContext(
  admin: ReturnType<typeof createAdminClient>,
  chapterId: string
): Promise<{ error: string } | ChapterContext> {
  const { data: chapter } = await admin
    .from("chapters")
    .select("id, source_pdf_url")
    .eq("id", chapterId)
    .single();

  if (!chapter) return { error: "Chapter not found" };
  if (!chapter.source_pdf_url) {
    return { error: "Upload the chapter PDF first — generation reads from it" };
  }

  const { data: pdfFile, error: downloadError } = await admin.storage
    .from("chapter-pdfs")
    .download(chapter.source_pdf_url);
  if (downloadError || !pdfFile) {
    return { error: `Could not download PDF: ${downloadError?.message}` };
  }
  const pdfBase64 = Buffer.from(await pdfFile.arrayBuffer()).toString("base64");

  let concepts: ChapterContext["concepts"] = [];
  const { data: existing } = await admin
    .from("concept")
    .select("id, name_en, name_hi")
    .eq("chapter_id", chapterId);

  if (existing && existing.length > 0) {
    concepts = existing;
  } else {
    let extracted: ExtractedConcept[];
    try {
      extracted = await extractConcepts(pdfBase64);
    } catch (e) {
      return { error: `Concept extraction failed: ${(e as Error).message}` };
    }
    const { data: inserted, error: insertError } = await admin
      .from("concept")
      .insert(extracted.map((c) => ({ chapter_id: chapterId, ...c })))
      .select("id, name_en, name_hi");
    if (insertError) return { error: insertError.message };
    concepts = inserted ?? [];
  }

  return { pdfBase64, concepts };
}

// M2: PDF → concepts → per-concept question generation → draft rows.
// Chunked per concept (PRD D-1). Everything lands as status='draft' and must
// pass the review queue (M5) before students ever see it.
export async function generateQuestions(chapterId: string): Promise<GenerationResult> {
  const adminUser = await requireAdmin();
  const admin = createAdminClient();

  const context = await loadChapterContext(admin, chapterId);
  if ("error" in context) return { error: context.error };
  const { pdfBase64, concepts } = context;

  let questionsCreated = 0;
  for (const concept of concepts) {
    let groups;
    try {
      groups = await generateQuestionsForConcept(pdfBase64, {
        name_en: concept.name_en,
        name_hi: concept.name_hi,
      });
    } catch (e) {
      // Partial progress is fine — already-inserted drafts stay; report and stop
      return {
        error: `Generation failed on concept "${concept.name_en}": ${(e as Error).message}`,
        conceptsUsed: concepts.length,
        questionsCreated,
      };
    }

    const rows = groups.flatMap((group) => {
      const variantGroupId = randomUUID();
      return group.variants.map((q) => ({
        chapter_id: chapterId,
        concept_id: concept.id,
        type: q.type,
        difficulty: q.difficulty,
        variant_group_id: variantGroupId,
        stem_en: q.stem_en,
        stem_hi: q.stem_hi,
        options_en: q.options_en,
        options_hi: q.options_hi,
        correct_answer: q.correct_answer,
        explanation_en: q.explanation_en,
        explanation_hi: q.explanation_hi,
        status: "draft",
        created_by: adminUser.id,
        // 001 legacy columns kept in sync so the current student app keeps working
        question_text: q.stem_en,
        question_text_hi: q.stem_hi,
        options: q.options_en,
        explanation: q.explanation_en,
      }));
    });

    const { error: insertError } = await admin.from("questions").insert(rows);
    if (insertError) {
      return {
        error: `Insert failed on concept "${concept.name_en}": ${insertError.message}`,
        conceptsUsed: concepts.length,
        questionsCreated,
      };
    }
    questionsCreated += rows.length;
  }

  revalidatePath(`/chapters/${chapterId}`);
  revalidatePath("/review");
  return { error: null, conceptsUsed: concepts.length, questionsCreated };
}

// M3: PDF → per-concept long-answer generation → draft rows. Same pipeline
// shape as M2; publish_chapter flips approved long answers to published.
export async function generateLongAnswers(
  chapterId: string
): Promise<GenerationResult> {
  const adminUser = await requireAdmin();
  const admin = createAdminClient();

  const context = await loadChapterContext(admin, chapterId);
  if ("error" in context) return { error: context.error };
  const { pdfBase64, concepts } = context;

  let itemsCreated = 0;
  for (const concept of concepts) {
    let items;
    try {
      items = await generateLongAnswersForConcept(pdfBase64, {
        name_en: concept.name_en,
        name_hi: concept.name_hi,
      });
    } catch (e) {
      return {
        error: `Generation failed on concept "${concept.name_en}": ${(e as Error).message}`,
        conceptsUsed: concepts.length,
        questionsCreated: itemsCreated,
      };
    }

    const rows = items.map((item) => ({
      chapter_id: chapterId,
      concept_id: concept.id,
      marks: item.marks,
      question_en: item.question_en,
      question_hi: item.question_hi,
      model_answer_en: item.model_answer_en,
      model_answer_hi: item.model_answer_hi,
      answer_structure: item.answer_structure,
      examiner_keywords: item.examiner_keywords,
      marking_breakdown: item.marking_breakdown,
      diagram_needed: item.diagram_needed,
      writing_tips_en: item.writing_tips_en,
      writing_tips_hi: item.writing_tips_hi,
      status: "draft",
      created_by: adminUser.id,
    }));

    const { error: insertError } = await admin.from("long_answer").insert(rows);
    if (insertError) {
      return {
        error: `Insert failed on concept "${concept.name_en}": ${insertError.message}`,
        conceptsUsed: concepts.length,
        questionsCreated: itemsCreated,
      };
    }
    itemsCreated += rows.length;
  }

  revalidatePath(`/chapters/${chapterId}`);
  revalidatePath("/review");
  return { error: null, conceptsUsed: concepts.length, questionsCreated: itemsCreated };
}
