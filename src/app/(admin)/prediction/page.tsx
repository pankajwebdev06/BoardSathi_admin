import { createAdminClient } from "@/lib/supabase/admin";
import type { Board, Chapter, Concept, Subject } from "@/lib/types";
import { RecomputeButton } from "./recompute-button";

interface WeightageRow {
  id: string;
  board_id: string;
  subject_id: string;
  scope_type: "chapter" | "concept";
  scope_id: string;
  frequency_score: number;
  importance: "high" | "medium" | "low";
  years_appeared: number[];
  computed_at: string;
}

const IMPORTANCE_STYLES: Record<string, string> = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

// M6 — pre-computed exam prediction. Tag PYQs (M4), recompute per subject,
// students read the stored result offline (M11). No AI involved.
export default async function PredictionPage() {
  const admin = createAdminClient();

  const [{ data: boards }, { data: subjects }, { data: weightage }, { data: chapters }, { data: concepts }] =
    await Promise.all([
      admin.from("boards").select("*"),
      admin.from("subjects").select("*").order("sort_order"),
      admin.from("exam_weightage").select("*").order("frequency_score", { ascending: false }),
      admin.from("chapters").select("*"),
      admin.from("concept").select("*"),
    ]);

  const allBoards = (boards ?? []) as Board[];
  const allSubjects = (subjects ?? []) as Subject[];
  const rows = (weightage ?? []) as WeightageRow[];
  const allChapters = (chapters ?? []) as Chapter[];
  const allConcepts = (concepts ?? []) as Concept[];

  const scopeName = (row: WeightageRow) =>
    row.scope_type === "chapter"
      ? allChapters.find((c) => c.id === row.scope_id)?.title_en ?? "?"
      : allConcepts.find((c) => c.id === row.scope_id)?.name_en ?? "?";

  return (
    <div className="max-w-4xl">
      <h2 className="mb-2 text-2xl font-bold text-gray-900">Exam Prediction</h2>
      <p className="mb-6 text-sm text-gray-500">
        Pre-computed topic weightage from PYQ tags (M6). Tag past-year
        questions on each chapter&apos;s content page, then recompute — the
        student app shows these as &quot;important topics&quot; offline.
      </p>

      {allSubjects.map((subject) => {
        const board = allBoards.find((b) => b.id === subject.board_id);
        const subjectRows = rows.filter((r) => r.subject_id === subject.id);

        return (
          <section key={subject.id} className="mb-8 rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900">
                {board?.name_en ?? ""} · {subject.name_en}
              </h3>
              <RecomputeButton subjectId={subject.id} />
            </div>

            {subjectRows.length === 0 ? (
              <p className="text-sm text-gray-500">
                No weightage computed yet — tag PYQs first, then recompute.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                    <th className="py-1.5">Scope</th>
                    <th className="py-1.5">Topic</th>
                    <th className="py-1.5">Importance</th>
                    <th className="py-1.5">Frequency</th>
                    <th className="py-1.5">Years</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50">
                      <td className="py-1.5 capitalize text-gray-500">{row.scope_type}</td>
                      <td className="py-1.5 font-medium text-gray-900">{scopeName(row)}</td>
                      <td className="py-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${IMPORTANCE_STYLES[row.importance]}`}>
                          {row.importance}
                        </span>
                      </td>
                      <td className="py-1.5 text-gray-700">{row.frequency_score}</td>
                      <td className="py-1.5 text-gray-500">{row.years_appeared.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </div>
  );
}
