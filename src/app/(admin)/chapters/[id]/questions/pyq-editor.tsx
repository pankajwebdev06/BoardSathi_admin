"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPyqTag } from "./pyq-actions";

/** Inline PYQ tag editor (M4): year list in, is_pyq + pyq_years out. */
export function PyqEditor({
  contentType,
  id,
  chapterId,
  initialYears,
}: {
  contentType: "question" | "long_answer";
  id: string;
  chapterId: string;
  initialYears: number[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialYears.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const fd = new FormData();
    fd.set("content_type", contentType);
    fd.set("id", id);
    fd.set("chapter_id", chapterId);
    fd.set("years", value);
    const result = await setPyqTag(fd);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs font-medium text-gray-500">PYQ years</label>
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        placeholder="e.g. 2022, 2024"
        className="w-36 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
      />
      <button
        onClick={save}
        disabled={busy}
        className="rounded-lg bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      {saved && <span className="text-xs text-green-600">Saved ✓</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
