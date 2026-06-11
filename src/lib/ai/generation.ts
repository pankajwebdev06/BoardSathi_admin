import "server-only";
import { getAiConfig } from "./config";
import { runStructuredGeneration } from "./provider";

// All AI runs here, at admin/content-creation time — never in the student app
// (PRD principle #1). Generated content is saved as draft and must pass human
// review before publishing. The provider/model comes from the AI Settings
// page (any AI company), falling back to ANTHROPIC_API_KEY in .env.local.

export interface ExtractedConcept {
  name_en: string;
  name_hi: string;
}

export interface GeneratedQuestion {
  type: "mcq" | "true_false" | "fill_blank";
  difficulty: "easy" | "medium" | "hard";
  stem_en: string;
  stem_hi: string;
  options_en: string[];
  options_hi: string[];
  correct_answer: string;
  explanation_en: string;
  explanation_hi: string;
}

export interface GeneratedVariantGroup {
  concept_aspect: string;
  variants: GeneratedQuestion[];
}

/** Bilingual point used in answer_structure / marking_breakdown JSONB. */
export interface BilingualPoint {
  en: string;
  hi: string;
}

export interface GeneratedLongAnswer {
  marks: number; // 3 or 5
  question_en: string;
  question_hi: string;
  model_answer_en: string;
  model_answer_hi: string;
  answer_structure: BilingualPoint[];
  examiner_keywords: string[];
  marking_breakdown: (BilingualPoint & { marks: number })[];
  diagram_needed: boolean;
  writing_tips_en: string;
  writing_tips_hi: string;
}

const CONCEPT_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name_en: { type: "string" },
          name_hi: { type: "string" },
        },
        required: ["name_en", "name_hi"],
        additionalProperties: false,
      },
    },
  },
  required: ["concepts"],
  additionalProperties: false,
};

const QUESTION_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    groups: {
      type: "array",
      items: {
        type: "object",
        properties: {
          concept_aspect: {
            type: "string",
            description: "The specific aspect of the concept this variant group tests",
          },
          variants: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["mcq", "true_false", "fill_blank"] },
                difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                stem_en: { type: "string" },
                stem_hi: { type: "string" },
                options_en: { type: "array", items: { type: "string" } },
                options_hi: { type: "array", items: { type: "string" } },
                correct_answer: {
                  type: "string",
                  description:
                    "For mcq: the exact text of the correct option (English). For true_false: 'true' or 'false'. For fill_blank: the missing word/phrase in English.",
                },
                explanation_en: { type: "string" },
                explanation_hi: { type: "string" },
              },
              required: [
                "type",
                "difficulty",
                "stem_en",
                "stem_hi",
                "options_en",
                "options_hi",
                "correct_answer",
                "explanation_en",
                "explanation_hi",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["concept_aspect", "variants"],
        additionalProperties: false,
      },
    },
  },
  required: ["groups"],
  additionalProperties: false,
};

const LONG_ANSWER_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          marks: { type: "integer", enum: [3, 5] },
          question_en: { type: "string" },
          question_hi: { type: "string" },
          model_answer_en: { type: "string" },
          model_answer_hi: { type: "string" },
          answer_structure: {
            type: "array",
            description: "Ordered outline of the answer, point by point",
            items: {
              type: "object",
              properties: {
                en: { type: "string" },
                hi: { type: "string" },
              },
              required: ["en", "hi"],
              additionalProperties: false,
            },
          },
          examiner_keywords: {
            type: "array",
            description:
              "Terms the examiner scans for — format each as 'English term (हिंदी शब्द)'",
            items: { type: "string" },
          },
          marking_breakdown: {
            type: "array",
            description: "How the marks split across answer parts",
            items: {
              type: "object",
              properties: {
                en: { type: "string" },
                hi: { type: "string" },
                marks: { type: "number" },
              },
              required: ["en", "hi", "marks"],
              additionalProperties: false,
            },
          },
          diagram_needed: { type: "boolean" },
          writing_tips_en: { type: "string" },
          writing_tips_hi: { type: "string" },
        },
        required: [
          "marks",
          "question_en",
          "question_hi",
          "model_answer_en",
          "model_answer_hi",
          "answer_structure",
          "examiner_keywords",
          "marking_breakdown",
          "diagram_needed",
          "writing_tips_en",
          "writing_tips_hi",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

async function structuredCall<T>(
  pdfBase64: string,
  prompt: string,
  schema: Record<string, unknown>
): Promise<T> {
  const config = await getAiConfig();
  if (!config) {
    throw new Error(
      "No AI provider configured — open AI Settings, enter an API key, test it and save."
    );
  }
  return runStructuredGeneration<T>(config, pdfBase64, prompt, schema);
}

/**
 * Extract the key concepts (topic tags) from a chapter PDF.
 * Concepts power weak-area analytics and exam prediction (PRD §5).
 */
export async function extractConcepts(pdfBase64: string): Promise<ExtractedConcept[]> {
  const result = await structuredCall<{ concepts: ExtractedConcept[] }>(
    pdfBase64,
    `This is an NCERT Class 10 textbook chapter (India). Identify the 4-8 key concepts (topics) a board-exam student must master from this chapter.

Rules:
- Each concept should be a distinct, testable topic — not a section heading.
- name_en: concise English name (3-6 words).
- name_hi: the same concept in Hindi (Devanagari), using standard NCERT Hindi terminology.`,
    CONCEPT_SCHEMA
  );
  return result.concepts;
}

/**
 * Generate variant groups of original questions for one concept.
 * Chunked per concept per PRD D-1 so no single call runs too long.
 */
/**
 * Generate long-answer items (M3 — the writing-technique differentiator):
 * not just WHAT the answer is, but HOW to write it for marks. One call per
 * concept (PRD D-1 chunking).
 */
export async function generateLongAnswersForConcept(
  pdfBase64: string,
  concept: ExtractedConcept,
  itemCount = 2
): Promise<GeneratedLongAnswer[]> {
  const result = await structuredCall<{ items: GeneratedLongAnswer[] }>(
    pdfBase64,
    `This is an NCERT Class 10 textbook chapter (India). Create board-exam long-answer practice items for UP Board / Bihar Board students on this ONE concept:

Concept: ${concept.name_en} (${concept.name_hi})

Produce exactly ${itemCount} items: one 3-mark and one 5-mark question.

Each item must teach the student HOW TO WRITE THE ANSWER FOR MARKS — this is the whole point:
- question: a realistic board-exam long-answer question on this concept.
- model_answer: a complete answer exactly as a top-scoring student would write it in the exam — right length for the marks (3-mark ≈ 60-80 words, 5-mark ≈ 100-150 words), structured, no fluff.
- answer_structure: the ordered skeleton of the answer (3-6 points) — what to write first, second, third.
- examiner_keywords: 4-8 terms the examiner scans for before awarding marks. Format each as "English term (हिंदी शब्द)".
- marking_breakdown: how the total marks split across the answer's parts (parts must sum to the item's marks).
- diagram_needed: true only if a labelled diagram is expected for full marks.
- writing_tips: 2-3 sentences of plain, simple advice in the voice of a friendly teacher — common mistakes, what the examiner looks for ("examiner ye dekhta hai"), how to present.

Content rules (critical):
- ORIGINAL content — never copy sentences from the book verbatim.
- Bilingual everywhere: every field in BOTH English and Hindi. Hindi must be natural, simple, Class-10 appropriate Devanagari with standard NCERT terminology — not literal machine translation.
- Ground everything in the chapter content from the PDF.`,
    LONG_ANSWER_SCHEMA
  );
  return result.items;
}

export async function generateQuestionsForConcept(
  pdfBase64: string,
  concept: ExtractedConcept,
  groupCount = 3
): Promise<GeneratedVariantGroup[]> {
  const result = await structuredCall<{ groups: GeneratedVariantGroup[] }>(
    pdfBase64,
    `This is an NCERT Class 10 textbook chapter (India). Generate exam-practice questions for UP Board / Bihar Board students on this ONE concept:

Concept: ${concept.name_en} (${concept.name_hi})

Produce exactly ${groupCount} variant groups. Each group:
- Tests ONE specific aspect of the concept.
- Contains 2-3 variants that test that SAME aspect in genuinely DIFFERENT ways (different scenario, different angle, different question form) — NOT mere rewordings. A student who memorised one variant's answer should still have to understand the concept to answer the others.
- Mix question types across the chapter: mcq (4 options), true_false (options must be ["True","False"] / ["सत्य","असत्य"]), fill_blank (stem contains ____, options empty array).
- Mix difficulties: easy, medium, hard.

Content rules (critical):
- Questions must be ORIGINAL — never copy sentences from the book text verbatim.
- Bilingual: stem, options and explanation in BOTH English and Hindi. Hindi must be natural, simple, Class-10 appropriate Devanagari using standard NCERT terminology — not literal machine translation.
- options_hi must correspond 1:1 in order with options_en.
- correct_answer: for mcq the exact English option text; for true_false "true"/"false"; for fill_blank the English answer word/phrase.
- Explanations should teach the concept in 1-3 simple sentences, not just restate the answer.`,
    QUESTION_SCHEMA
  );
  return result.groups;
}
