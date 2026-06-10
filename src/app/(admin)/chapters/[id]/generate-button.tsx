"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  generateLongAnswers,
  generateQuestions,
  type GenerationResult,
} from "./generate-actions";

function GenerationRunner({
  hasPdf,
  label,
  runningLabel,
  doneNoun,
  run,
}: {
  hasPdf: boolean;
  label: string;
  runningLabel: string;
  doneNoun: string;
  run: () => Promise<GenerationResult>;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  async function handleGenerate() {
    setRunning(true);
    setResult(null);
    const res = await run();
    setResult(res);
    setRunning(false);
    if (!res.error) router.refresh();
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleGenerate}
        disabled={running || !hasPdf}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {running ? runningLabel : label}
      </button>

      {!hasPdf && (
        <p className="text-sm text-gray-500">Upload the chapter PDF first.</p>
      )}

      {result?.error && <p className="text-sm text-red-600">{result.error}</p>}

      {result && !result.error && (
        <p className="text-sm text-green-600">
          Done — {result.questionsCreated} draft {doneNoun} across{" "}
          {result.conceptsUsed} concepts. Review them in the Review Queue.
        </p>
      )}
    </div>
  );
}

export function GenerateButton({
  chapterId,
  hasPdf,
}: {
  chapterId: string;
  hasPdf: boolean;
}) {
  return (
    <GenerationRunner
      hasPdf={hasPdf}
      label="Generate questions with AI"
      runningLabel="Generating… (this takes a few minutes)"
      doneNoun="questions"
      run={() => generateQuestions(chapterId)}
    />
  );
}

export function GenerateLongAnswersButton({
  chapterId,
  hasPdf,
}: {
  chapterId: string;
  hasPdf: boolean;
}) {
  return (
    <GenerationRunner
      hasPdf={hasPdf}
      label="Generate long answers with AI"
      runningLabel="Generating… (this takes a few minutes)"
      doneNoun="long answers"
      run={() => generateLongAnswers(chapterId)}
    />
  );
}
