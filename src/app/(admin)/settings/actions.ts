"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { AI_CONFIG_KEY, type AiConfig, type AiProvider } from "@/lib/ai/config";
import { testProvider, type TestResult } from "@/lib/ai/provider";

function configFromForm(formData: FormData): AiConfig | { error: string } {
  const provider = formData.get("provider") as AiProvider;
  const model = ((formData.get("model") as string) ?? "").trim();
  const baseUrl = ((formData.get("base_url") as string) ?? "").trim();
  const apiKey = ((formData.get("api_key") as string) ?? "").trim();

  if (provider !== "anthropic" && provider !== "openai_compatible") {
    return { error: "Pick a provider" };
  }
  if (!model) return { error: "Model id is required (e.g. claude-sonnet-4-6, gpt-5.2, gemini-3.0-pro)" };
  if (!apiKey) return { error: "API key is required" };
  if (baseUrl && !/^https?:\/\//.test(baseUrl)) {
    return { error: "Base URL must start with https://" };
  }

  return { provider, model, base_url: baseUrl || null, api_key: apiKey };
}

/** Test button: runs a tiny real call with the FORM values (nothing saved). */
export async function testAiConfig(formData: FormData): Promise<TestResult> {
  await requireAdmin();
  const config = configFromForm(formData);
  if ("error" in config) return { ok: false, message: config.error, latencyMs: 0 };
  return testProvider(config);
}

/** Submit button: tests first, then persists — the system uses it from the
 *  very next generation call. */
export async function saveAiConfig(
  formData: FormData
): Promise<{ error: string | null; tested?: TestResult }> {
  await requireAdmin();
  const admin = createAdminClient();

  const config = configFromForm(formData);
  if ("error" in config) return { error: config.error };

  // Never persist a config that does not actually work
  const tested = await testProvider(config);
  if (!tested.ok) {
    return { error: `Test failed — not saved. ${tested.message}`, tested };
  }

  const { error } = await admin.from("app_setting").upsert({
    key: AI_CONFIG_KEY,
    value: config,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "PGRST205") {
      return {
        error:
          "app_setting table is missing — paste backend/supabase/migrations/003_app_settings.sql into the Supabase SQL editor once, then save again.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { error: null, tested };
}
