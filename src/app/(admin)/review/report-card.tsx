"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveReport } from "./actions";

export interface OpenReport {
  id: string;
  content_type: "question" | "long_answer";
  content_id: string;
  reason: string;
  created_at: string;
  preview: string;
}

export function ReportCard({ report }: { report: OpenReport }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve() {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("id", report.id);
    const result = await resolveReport(fd);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
          {report.content_type === "question" ? "Question" : "Long answer"}
        </span>
        <span className="text-gray-400">
          {new Date(report.created_at).toLocaleDateString()}
        </span>
      </div>
      <p className="mb-1 text-sm font-medium text-gray-900">{report.preview}</p>
      <p className="mb-3 text-sm text-gray-600">
        Reason: <span className="font-medium">{report.reason}</span>
      </p>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={resolve}
        disabled={busy}
        className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        Mark resolved
      </button>
    </div>
  );
}
