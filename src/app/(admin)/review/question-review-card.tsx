"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Question } from "@/lib/types";
import { approveQuestion, rejectQuestion } from "./actions";

const TYPE_LABELS: Record<Question["type"], string> = {
  mcq: "MCQ",
  true_false: "True/False",
  fill_blank: "Fill in the blank",
};

export function QuestionReviewCard({
  question,
  conceptName,
}: {
  question: Question;
  conceptName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: typeof approveQuestion) {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("id", question.id);
    const result = await action(fd);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  const isCorrect = (opt: string) => opt === question.correct_answer;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
          {TYPE_LABELS[question.type]}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium capitalize text-gray-600">
          {question.difficulty}
        </span>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-700">
          {conceptName}
        </span>
        {question.variant_group_id && (
          <span className="rounded-full bg-cyan-100 px-2 py-0.5 font-medium text-cyan-700">
            group {question.variant_group_id.slice(0, 8)}
          </span>
        )}
      </div>

      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <p className="font-medium text-gray-900">{question.stem_en}</p>
        <p className="font-medium text-gray-900">{question.stem_hi}</p>
      </div>

      {question.options_en && question.options_en.length > 0 && (
        <div className="mb-3 grid gap-3 md:grid-cols-2">
          <ul className="space-y-1 text-sm">
            {question.options_en.map((opt, i) => (
              <li
                key={i}
                className={`rounded-lg px-3 py-1.5 ${
                  isCorrect(opt)
                    ? "bg-green-50 font-semibold text-green-800"
                    : "bg-gray-50 text-gray-700"
                }`}
              >
                {opt}
              </li>
            ))}
          </ul>
          <ul className="space-y-1 text-sm">
            {(question.options_hi ?? []).map((opt, i) => (
              <li
                key={i}
                className={`rounded-lg px-3 py-1.5 ${
                  question.options_en && isCorrect(question.options_en[i])
                    ? "bg-green-50 font-semibold text-green-800"
                    : "bg-gray-50 text-gray-700"
                }`}
              >
                {opt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(!question.options_en || question.options_en.length === 0) && (
        <p className="mb-3 text-sm">
          <span className="text-gray-500">Answer: </span>
          <span className="font-semibold text-green-700">{question.correct_answer}</span>
        </p>
      )}

      <div className="mb-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
        <p>{question.explanation_en}</p>
        <p>{question.explanation_hi}</p>
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => act(approveQuestion)}
          disabled={busy}
          className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => {
            if (confirm("Reject and delete this draft question?")) act(rejectQuestion);
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
