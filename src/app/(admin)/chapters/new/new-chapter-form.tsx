"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createChapter } from "../actions";
import type { Board, Subject } from "@/lib/types";

export function NewChapterForm({
  boards,
  subjects,
}: {
  boards: Board[];
  subjects: Subject[];
}) {
  const router = useRouter();
  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const boardSubjects = useMemo(
    () => subjects.filter((s) => s.board_id === boardId),
    [subjects, boardId]
  );

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = await createChapter(formData);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.push(`/chapters?subject=${formData.get("subject_id")}`);
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <form action={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
      <div>
        <label className={labelClass}>Board</label>
        <select
          name="board_id"
          value={boardId}
          onChange={(e) => setBoardId(e.target.value)}
          className={inputClass}
        >
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name_en}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Subject</label>
        <select name="subject_id" className={inputClass}>
          {boardSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name_en}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Chapter number</label>
        <input type="number" name="number" min={1} required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Title (English)</label>
        <input type="text" name="title_en" required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Title (Hindi)</label>
        <input type="text" name="title_hi" required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>NCERT reference (optional)</label>
        <input
          type="text"
          name="ncert_ref"
          placeholder="e.g. NCERT Class 10 Science, Chapter 1"
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Creating…" : "Create chapter"}
      </button>
    </form>
  );
}
