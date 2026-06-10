import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// All AI runs here, at admin/content-creation time — never in the student app
// (PRD principle #1). Generated content is saved as draft and must pass human
// review before publishing.

const MODEL = "claude-opus-4-8";

function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set in .env.local");
  }
  return new Anthropic();
}

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

function pdfBlock(pdfBase64: string) {
  return {
    type: "document" as const,
    source: {
      type: "base64" as const,
      media_type: "application/pdf" as const,
      data: pdfBase64,
    },
  };
}

async function structuredCall<T>(
  pdfBase64: string,
  prompt: string,
  schema: Record<string, unknown>
): Promise<T> {
  const stream = client().messages.stream({
    model: MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema } },
    messages: [
      {
        role: "user",
        content: [pdfBlock(pdfBase64), { type: "text", text: prompt }],
      },
    ],
  });
  const message = await stream.finalMessage();

  const text = message.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error(`No text block in response (stop_reason: ${message.stop_reason})`);
  }
  return JSON.parse(text.text) as T;
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
