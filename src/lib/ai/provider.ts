import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AiConfig } from "./config";

// One entry point for every AI call in the content factory. The active
// AiConfig decides which wire protocol is used — swap providers from the
// AI Settings page without touching any generation code.

const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";

function extractJson(text: string): string {
  // Tolerate providers that wrap JSON in markdown fences or add prose.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

async function anthropicCall(
  config: AiConfig,
  pdfBase64: string | null,
  prompt: string,
  schema: Record<string, unknown>
): Promise<string> {
  const client = new Anthropic({
    apiKey: config.api_key,
    ...(config.base_url ? { baseURL: config.base_url } : {}),
  });

  const content: Anthropic.ContentBlockParam[] = [];
  if (pdfBase64) {
    content.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: pdfBase64,
      },
    });
  }
  content.push({ type: "text", text: prompt });

  const stream = client.messages.stream({
    model: config.model,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content }],
  });
  const message = await stream.finalMessage();

  const text = message.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error(`No text in response (stop_reason: ${message.stop_reason})`);
  }
  return text.text;
}

async function openAiCompatibleCall(
  config: AiConfig,
  pdfBase64: string | null,
  prompt: string,
  schema: Record<string, unknown>
): Promise<string> {
  const baseUrl = (config.base_url ?? OPENAI_DEFAULT_BASE_URL).replace(/\/$/, "");

  const content: unknown[] = [];
  if (pdfBase64) {
    content.push({
      type: "file",
      file: {
        filename: "chapter.pdf",
        file_data: `data:application/pdf;base64,${pdfBase64}`,
      },
    });
  }
  // Some providers ignore response_format, so the prompt also demands JSON.
  content.push({
    type: "text",
    text: `${prompt}\n\nRespond with ONLY valid JSON matching the required structure — no prose, no markdown fences.`,
  });

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content }],
      max_tokens: 16000,
      response_format: {
        type: "json_schema",
        json_schema: { name: "result", schema },
      },
    }),
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 300);
    throw new Error(`${response.status} from ${baseUrl}: ${body}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("Provider returned an empty response");
  }
  return extractJson(text);
}

/**
 * Run one structured-output generation against the active provider.
 * Returns parsed JSON of type T; throws with a readable message on failure.
 */
export async function runStructuredGeneration<T>(
  config: AiConfig,
  pdfBase64: string | null,
  prompt: string,
  schema: Record<string, unknown>
): Promise<T> {
  const raw =
    config.provider === "anthropic"
      ? await anthropicCall(config, pdfBase64, prompt, schema)
      : await openAiCompatibleCall(config, pdfBase64, prompt, schema);
  return JSON.parse(config.provider === "anthropic" ? raw : extractJson(raw)) as T;
}

export interface TestResult {
  ok: boolean;
  message: string;
  latencyMs: number;
}

/** Cheap end-to-end check used by the Test button — no PDF, tiny output. */
export async function testProvider(config: AiConfig): Promise<TestResult> {
  const started = Date.now();
  try {
    if (config.provider === "anthropic") {
      const client = new Anthropic({
        apiKey: config.api_key,
        ...(config.base_url ? { baseURL: config.base_url } : {}),
      });
      const message = await client.messages.create({
        model: config.model,
        max_tokens: 16,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
      });
      const text = message.content.find((b) => b.type === "text");
      return {
        ok: true,
        message: `Model replied: "${text?.type === "text" ? text.text.trim() : "?"}"`,
        latencyMs: Date.now() - started,
      };
    }

    const baseUrl = (config.base_url ?? OPENAI_DEFAULT_BASE_URL).replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.api_key}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        max_tokens: 16,
      }),
    });
    if (!response.ok) {
      const body = (await response.text()).slice(0, 200);
      return {
        ok: false,
        message: `${response.status}: ${body}`,
        latencyMs: Date.now() - started,
      };
    }
    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content ?? "?";
    return {
      ok: true,
      message: `Model replied: "${String(reply).trim().slice(0, 40)}"`,
      latencyMs: Date.now() - started,
    };
  } catch (e) {
    return {
      ok: false,
      message: (e as Error).message,
      latencyMs: Date.now() - started,
    };
  }
}
