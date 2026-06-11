import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Chapter, Concept, LongAnswer, Question } from "@/lib/types";
import { PyqEditor } from "./pyq-editor";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
};

// M4 — all chapter content in one list with inline PYQ tagging.
// pyq_years feed the exam-prediction computation (M6).
export default async function ChapterQuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const [{ data: chapter }, { data: questions }, { data: longAnswers }, { data: concepts }] =
    await Promise.all([
      admin.from("chapters").select("*").eq("id", id).single(),
      admin
        .from("questions")
        .select("*")
        .eq("chapter_id", id)
        .order("status")
        .order("created_at"),
      admin
        .from("long_answer")
        .select("*")
        .eq("chapter_id", id)
        .order("status")
        .order("marks"),
      admin.from("concept").select("*").eq("chapter_id", id),
    ]);

  if (!chapter) notFound();
  const ch = chapter as Chapter;
  const qs = (questions ?? []) as Question[];
  const las = (longAnswers ?? []) as LongAnswer[];
  const cos = (concepts ?? []) as Concept[];

  const conceptName = (cid: string | null) =>
    cos.find((c) => c.id === cid)?.name_en ?? "untagged";

  const pyqCount =
    qs.filter((q) => q.is_pyq).length + las.filter((l) => l.is_pyq).length;

  return (
    <div className="max-w-4xl">
      <div className="mb-1 text-sm">
        <Link href={`/chapters/${ch.id}`} className="text-blue-600 hover:underline">
          ← Chapter {ch.number}: {ch.title_en}
        </Link>
      </div>
      <h2 className="mb-1 text-2xl font-bold text-gray-900">
        Content & PYQ tagging
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Tag items that appeared in past board exams with their years — the
        exam-prediction computation (M6) reads these tags. {pyqCount} of{" "}
        {qs.length + las.length} items tagged so far.
      </p>

      <h3 className="mb-3 text-lg font-semibold text-gray-900">
        Questions ({qs.length})
      </h3>
      <div className="mb-8 space-y-3">
        {qs.length === 0 && (
          <p className="text-sm text-gray-500">No questions yet — generate them from the chapter page.</p>
        )}
        {qs.map((q) => (
          <div key={q.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLES[q.status]}`}>
                {q.status}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                {q.type}
              </span>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-700">
                {conceptName(q.concept_id)}
              </span>
              {q.is_pyq && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">
                  PYQ {q.pyq_years.join(", ")}
                </span>
              )}
            </div>
            <p className="mb-3 text-sm font-medium text-gray-900">{q.stem_en}</p>
            <PyqEditor
              contentType="question"
              id={q.id}
              chapterId={ch.id}
              initialYears={q.pyq_years}
            />
          </div>
        ))}
      </div>

      <h3 className="mb-3 text-lg font-semibold text-gray-900">
        Long answers ({las.length})
      </h3>
      <div className="space-y-3">
        {las.length === 0 && (
          <p className="text-sm text-gray-500">No long answers yet — generate them from the chapter page.</p>
        )}
        {las.map((la) => (
          <div key={la.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLES[la.status]}`}>
                {la.status}
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700">
                {la.marks} marks
              </span>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-700">
                {conceptName(la.concept_id)}
              </span>
              {la.is_pyq && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">
                  PYQ {la.pyq_years.join(", ")}
                </span>
              )}
            </div>
            <p className="mb-3 text-sm font-medium text-gray-900">{la.question_en}</p>
            <PyqEditor
              contentType="long_answer"
              id={la.id}
              chapterId={ch.id}
              initialYears={la.pyq_years}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
