"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LongAnswer } from "@/lib/types";
import { approveLongAnswer, rejectLongAnswer } from "./actions";

export function LongAnswerReviewCard({
  item,
  conceptName,
}: {
  item: LongAnswer;
  conceptName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function act(action: typeof approveLongAnswer) {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("id", item.id);
    const result = await action(fd);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700">
          Long answer · {item.marks} marks
        </span>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-700">
          {conceptName}
        </span>
        {item.diagram_needed && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-700">
            diagram needed
          </span>
        )}
      </div>

      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <p className="font-medium text-gray-900">{item.question_en}</p>
        <p className="font-medium text-gray-900">{item.question_hi}</p>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mb-3 text-sm font-medium text-blue-600 hover:underline"
      >
        {expanded ? "Hide details" : "Show model answer, keywords & breakdown"}
      </button>

      {expanded && (
        <div className="mb-4 space-y-4 text-sm">
          <div>
            <h4 className="mb-1 font-semibold text-gray-900">Model answer</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-gray-700">
                {item.model_answer_en}
              </p>
              <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-gray-700">
                {item.model_answer_hi}
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-1 font-semibold text-gray-900">
              Answer structure
            </h4>
            <ol className="list-inside list-decimal space-y-1 text-gray-700">
              {item.answer_structure.map((point, i) => (
                <li key={i}>
                  {point.en} <span className="text-gray-500">/ {point.hi}</span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h4 className="mb-1 font-semibold text-gray-900">
              Examiner keywords
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {item.examiner_keywords.map((kw, i) => (
                <span
                  key={i}
                  className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-1 font-semibold text-gray-900">
              Marking breakdown
            </h4>
            <ul className="space-y-1 text-gray-700">
              {item.marking_breakdown.map((part, i) => (
                <li key={i} className="flex justify-between rounded-lg bg-gray-50 px-3 py-1.5">
                  <span>
                    {part.en} <span className="text-gray-500">/ {part.hi}</span>
                  </span>
                  <span className="font-semibold">{part.marks}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-1 font-semibold text-gray-900">Writing tips</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <p className="text-gray-700">{item.writing_tips_en}</p>
              <p className="text-gray-700">{item.writing_tips_hi}</p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => act(approveLongAnswer)}
          disabled={busy}
          className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => {
            if (confirm("Reject and delete this draft long answer?"))
              act(rejectLongAnswer);
          }}
          disabled={busy}
          className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
