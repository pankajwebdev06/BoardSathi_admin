import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Provider-agnostic AI configuration. Two wire protocols cover practically
// every AI company:
//   - "anthropic": the native Anthropic API (also via proxies with base_url)
//   - "openai_compatible": OpenAI's chat-completions shape, spoken by
//     OpenAI, Google Gemini, Groq, DeepSeek, Mistral, Together, OpenRouter…
export type AiProvider = "anthropic" | "openai_compatible";

export interface AiConfig {
  provider: AiProvider;
  model: string;
  base_url: string | null; // null → the provider's default endpoint
  api_key: string;
}

export const AI_CONFIG_KEY = "ai_config";

/**
 * Active config: the row saved from the AI Settings page wins; falls back to
 * ANTHROPIC_API_KEY in .env.local so existing setups keep working.
 * Returns null when nothing is configured at all.
 */
export async function getAiConfig(): Promise<AiConfig | null> {
  const admin = createAdminClient();
  try {
    const { data } = await admin
      .from("app_setting")
      .select("value")
      .eq("key", AI_CONFIG_KEY)
      .maybeSingle();
    const value = data?.value as Partial<AiConfig> | undefined;
    if (value?.api_key && value?.model && value?.provider) {
      return {
        provider: value.provider,
        model: value.model,
        base_url: value.base_url ?? null,
        api_key: value.api_key,
      };
    }
  } catch {
    // Table missing (migration 003 not applied yet) — fall through to env.
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      base_url: null,
      api_key: process.env.ANTHROPIC_API_KEY,
    };
  }
  return null;
}

/** "sk-ant-api03-Xy…" → "sk-ant…(last 4)" for safe display in the UI. */
export function maskApiKey(key: string): string {
  if (key.length <= 10) return "••••";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
