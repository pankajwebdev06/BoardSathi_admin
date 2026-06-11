"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeWeightage } from "./actions";

export function RecomputeButton({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("subject_id", subjectId);
    const result = await computeWeightage(fd);
    setBusy(false);
    setMessage(result.error ?? `Computed ${result.rows} weightage rows`);
    if (!result.error) router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={busy}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Computing…" : "Recompute"}
      </button>
      {message && <span className="text-xs text-gray-600">{message}</span>}
    </div>
  );
}
