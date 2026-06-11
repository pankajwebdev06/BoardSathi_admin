"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAiConfig, testAiConfig } from "./actions";

const PRESETS: Record<string, { base_url: string; placeholder: string }> = {
  anthropic: { base_url: "", placeholder: "claude-sonnet-4-6" },
  openai: { base_url: "https://api.openai.com/v1", placeholder: "gpt-5.2" },
  gemini: {
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
    placeholder: "gemini-3.0-pro",
  },
  groq: { base_url: "https://api.groq.com/openai/v1", placeholder: "llama-4-maverick" },
  deepseek: { base_url: "https://api.deepseek.com/v1", placeholder: "deepseek-chat" },
  openrouter: {
    base_url: "https://openrouter.ai/api/v1",
    placeholder: "anthropic/claude-sonnet-4.6",
  },
};

export function AiSettingsForm({
  initialProvider,
  initialModel,
  initialBaseUrl,
}: {
  initialProvider: string;
  initialModel: string;
  initialBaseUrl: string;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState(
    initialProvider === "anthropic" ? "anthropic" : "openai_compatible"
  );
  const [model, setModel] = useState(initialModel);
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"test" | "save" | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  function buildForm() {
    const fd = new FormData();
    fd.set("provider", provider);
    fd.set("model", model);
    fd.set("base_url", baseUrl);
    fd.set("api_key", apiKey);
    return fd;
  }

  async function handleTest() {
    setBusy("test");
    setStatus(null);
    const result = await testAiConfig(buildForm());
    setStatus({
      ok: result.ok,
      text: result.ok
        ? `✓ Working (${result.latencyMs} ms) — ${result.message}`
        : `✗ ${result.message}`,
    });
    setBusy(null);
  }

  async function handleSave() {
    setBusy("save");
    setStatus(null);
    const result = await saveAiConfig(buildForm());
    if (result.error) {
      setStatus({ ok: false, text: `✗ ${result.error}` });
    } else {
      setStatus({
        ok: true,
        text: `✓ Saved — all generation now uses this provider (test took ${result.tested?.latencyMs} ms)`,
      });
      setApiKey("");
      router.refresh();
    }
    setBusy(null);
  }

  function applyPreset(name: string) {
    const preset = PRESETS[name];
    setProvider(name === "anthropic" ? "anthropic" : "openai_compatible");
    setBaseUrl(preset.base_url);
    setModel(preset.placeholder);
    setStatus(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Quick presets
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(PRESETS).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => applyPreset(name)}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700 hover:bg-gray-200"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          API protocol
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        >
          <option value="anthropic">Anthropic (native)</option>
          <option value="openai_compatible">
            OpenAI-compatible (OpenAI, Gemini, Groq, DeepSeek, OpenRouter…)
          </option>
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Model id
        </label>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="e.g. claude-sonnet-4-6"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Base URL{" "}
          <span className="font-normal text-gray-400">
            (optional for Anthropic/OpenAI defaults)
          </span>
        </label>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          API key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-…"
          autoComplete="off"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        />
      </div>

      {status && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            status.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {status.text}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={busy !== null || !apiKey || !model}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === "test" ? "Testing…" : "Test"}
        </button>
        <button
          onClick={handleSave}
          disabled={busy !== null || !apiKey || !model}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy === "save" ? "Testing & saving…" : "Test & Save"}
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Save runs the test first — a key that fails is never stored. Once
        saved, every generation (questions + long answers) uses this provider.
      </p>
    </div>
  );
}
