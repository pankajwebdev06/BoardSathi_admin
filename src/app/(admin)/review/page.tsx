import { createAdminClient } from "@/lib/supabase/admin";
import type { Chapter, Concept, LongAnswer, Question } from "@/lib/types";
import { QuestionReviewCard } from "./question-review-card";
import { LongAnswerReviewCard } from "./long-answer-review-card";
import { ChapterReviewActions } from "./chapter-review-actions";
import { ReportCard, type OpenReport } from "./report-card";

interface ReportRow {
  id: string;
  content_type: "question" | "long_answer";
  content_id: string;
  reason: string;
  created_at: string;
}

export default async function ReviewQueuePage() {
  const admin = createAdminClient();

  const [
    { data: drafts },
    { data: approvedCounts },
    { data: laDrafts },
    { data: laApprovedCounts },
    { data: openReports },
  ] = await Promise.all([
    admin
      .from("questions")
      .select("*")
      .eq("status", "draft")
      .order("chapter_id")
      .order("variant_group_id")
      .order("created_at"),
    admin.from("questions").select("chapter_id").eq("status", "approved"),
    admin
      .from("long_answer")
      .select("*")
      .eq("status", "draft")
      .order("chapter_id")
      .order("marks")
      .order("created_at"),
    admin.from("long_answer").select("chapter_id").eq("status", "approved"),
    admin
      .from("report")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
  ]);

  // Resolve a one-line preview for each reported item (M13 acceptance:
  // content type, content id and reason must be visible to the admin)
  const reportRows = (openReports ?? []) as ReportRow[];
  const reportedQuestionIds = reportRows
    .filter((r) => r.content_type === "question")
    .map((r) => r.content_id);
  const reportedLaIds = reportRows
    .filter((r) => r.content_type === "long_answer")
    .map((r) => r.content_id);

  const [{ data: reportedQs }, { data: reportedLas }] = await Promise.all([
    reportedQuestionIds.length > 0
      ? admin.from("questions").select("id, stem_en").in("id", reportedQuestionIds)
      : Promise.resolve({ data: [] }),
    reportedLaIds.length > 0
      ? admin.from("long_answer").select("id, question_en").in("id", reportedLaIds)
      : Promise.resolve({ data: [] }),
  ]);

  const reports: OpenReport[] = reportRows.map((r) => ({
    ...r,
    preview:
      r.content_type === "question"
        ? ((reportedQs ?? []).find((q) => q.id === r.content_id)?.stem_en ??
          `(deleted question ${r.content_id.slice(0, 8)})`)
        : ((reportedLas ?? []).find((l) => l.id === r.content_id)?.question_en ??
          `(deleted long answer ${r.content_id.slice(0, 8)})`),
  }));

  const draftQuestions = (drafts ?? []) as Question[];
  const draftLongAnswers = (laDrafts ?? []) as LongAnswer[];
  const chapterIds = [
    ...new Set([
      ...draftQuestions.map((q) => q.chapter_id),
      ...draftLongAnswers.map((la) => la.chapter_id),
      ...(approvedCounts ?? []).map((r) => r.chapter_id as string),
      ...(laApprovedCounts ?? []).map((r) => r.chapter_id as string),
    ]),
  ];

  let chapters: Chapter[] = [];
  let concepts: Concept[] = [];
  if (chapterIds.length > 0) {
    const [{ data: ch }, { data: co }] = await Promise.all([
      admin.from("chapters").select("*").in("id", chapterIds),
      admin.from("concept").select("*").in("chapter_id", chapterIds),
    ]);
    chapters = (ch ?? []) as Chapter[];
    concepts = (co ?? []) as Concept[];
  }

  const conceptName = (id: string | null) =>
    concepts.find((c) => c.id === id)?.name_en ?? "untagged";
  const approvedByChapter = (chapterId: string) =>
    (approvedCounts ?? []).filter((r) => r.chapter_id === chapterId).length +
    (laApprovedCounts ?? []).filter((r) => r.chapter_id === chapterId).length;

  if (chapterIds.length === 0 && reports.length === 0) {
    return (
      <div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">Review Queue</h2>
        <p className="text-sm text-gray-500">
          Nothing to review. Generate questions or long answers from a chapter
          page — drafts will appear here for approval, then publishing.
          Student reports also land here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Review Queue</h2>

      {reports.length > 0 && (
        <section className="mb-10">
          <h3 className="mb-1 text-lg font-semibold text-gray-900">
            Student reports ({reports.length})
          </h3>
          <p className="mb-4 text-sm text-gray-500">
            Students flagged these items in the app — fix the content, then
            mark resolved.
          </p>
          <div className="space-y-4">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </section>
      )}

      {chapterIds.map((chapterId) => {
        const chapter = chapters.find((c) => c.id === chapterId);
        const chapterDrafts = draftQuestions.filter(
          (q) => q.chapter_id === chapterId
        );
        const chapterLaDrafts = draftLongAnswers.filter(
          (la) => la.chapter_id === chapterId
        );
        const approvedCount = approvedByChapter(chapterId);
        const draftCount = chapterDrafts.length + chapterLaDrafts.length;

        return (
          <section key={chapterId} className="mb-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {chapter ? `Ch ${chapter.number}: ${chapter.title_en}` : "Chapter"}
                </h3>
                <p className="text-sm text-gray-500">
                  {chapterDrafts.length} draft questions ·{" "}
                  {chapterLaDrafts.length} draft long answers · {approvedCount}{" "}
                  approved awaiting publish · v{chapter?.content_version}
                </p>
              </div>
              <ChapterReviewActions
                chapterId={chapterId}
                draftCount={draftCount}
                approvedCount={approvedCount}
              />
            </div>

            <div className="space-y-4">
              {chapterDrafts.map((q) => (
                <QuestionReviewCard
                  key={q.id}
                  question={q}
                  conceptName={conceptName(q.concept_id)}
                />
              ))}
              {chapterLaDrafts.map((la) => (
                <LongAnswerReviewCard
                  key={la.id}
                  item={la}
                  conceptName={conceptName(la.concept_id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
