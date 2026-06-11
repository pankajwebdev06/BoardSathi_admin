import { createAdminClient } from "@/lib/supabase/admin";
import { AI_CONFIG_KEY, maskApiKey, type AiConfig } from "@/lib/ai/config";
import { AiSettingsForm } from "./ai-settings-form";

// AI Settings — plug in any AI company's API. The saved config is stored in
// the service-role-only app_setting table and drives all generation.
export default async function SettingsPage() {
  const admin = createAdminClient();

  let current: AiConfig | null = null;
  let tableMissing = false;
  try {
    const { data, error } = await admin
      .from("app_setting")
      .select("value")
      .eq("key", AI_CONFIG_KEY)
      .maybeSingle();
    if (error?.code === "PGRST205") tableMissing = true;
    current = (data?.value as AiConfig) ?? null;
  } catch {
    tableMissing = true;
  }

  const envFallback = !current && !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="max-w-2xl">
      <h2 className="mb-2 text-2xl font-bold text-gray-900">AI Settings</h2>
      <p className="mb-6 text-sm text-gray-500">
        Use any AI company&apos;s model for content generation. Test the key,
        save it, and the whole system switches to it — no code changes.
      </p>

      {tableMissing && (
        <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          <p className="mb-1 font-semibold">One-time setup needed</p>
          <p>
            The <code>app_setting</code> table does not exist yet. Open the
            Supabase SQL editor and run{" "}
            <code>backend/supabase/migrations/003_app_settings.sql</code> once.
            Testing works without it, but saving needs the table.
          </p>
        </div>
      )}

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-2 font-semibold text-gray-900">Active provider</h3>
        {current ? (
          <dl className="space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-28 text-gray-500">Protocol</dt>
              <dd className="font-medium text-gray-900">
                {current.provider === "anthropic" ? "Anthropic (native)" : "OpenAI-compatible"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 text-gray-500">Model</dt>
              <dd className="font-medium text-gray-900">{current.model}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 text-gray-500">Base URL</dt>
              <dd className="text-gray-900">{current.base_url ?? "provider default"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 text-gray-500">API key</dt>
              <dd className="font-mono text-gray-900">{maskApiKey(current.api_key)}</dd>
            </div>
          </dl>
        ) : envFallback ? (
          <p className="text-sm text-gray-600">
            Using <code>ANTHROPIC_API_KEY</code> from <code>.env.local</code>{" "}
            (claude-sonnet-4-6). Save a config below to override it.
          </p>
        ) : (
          <p className="text-sm text-red-600">
            No provider configured — generation will fail until you save one
            below.
          </p>
        )}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-900">Change provider</h3>
        <AiSettingsForm
          initialProvider={current?.provider ?? "anthropic"}
          initialModel={current?.model ?? ""}
          initialBaseUrl={current?.base_url ?? ""}
        />
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Note: PDF reading + Hindi quality vary by model. PRD D-3: test EN+HI
        generation on one real chapter before scaling content with a new model.
        The key is stored server-side only (RLS: no client can read it) and is
        never sent to the browser or the student app.
      </p>
    </div>
  );
}
