import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Chapter, Concept } from "@/lib/types";
import { PdfUploadForm } from "./pdf-upload-form";
import { GenerateButton, GenerateLongAnswersButton } from "./generate-button";

export default async function ChapterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const [{ data: chapter }, { data: concepts }, draft, approved, published, laDraft, laApproved, laPublished] =
    await Promise.all([
      admin.from("chapters").select("*").eq("id", id).single(),
      admin.from("concept").select("*").eq("chapter_id", id).order("name_en"),
      admin.from("questions").select("*", { count: "exact", head: true }).eq("chapter_id", id).eq("status", "draft"),
      admin.from("questions").select("*", { count: "exact", head: true }).eq("chapter_id", id).eq("status", "approved"),
      admin.from("questions").select("*", { count: "exact", head: true }).eq("chapter_id", id).eq("status", "published"),
      admin.from("long_answer").select("*", { count: "exact", head: true }).eq("chapter_id", id).eq("status", "draft"),
      admin.from("long_answer").select("*", { count: "exact", head: true }).eq("chapter_id", id).eq("status", "approved"),
      admin.from("long_answer").select("*", { count: "exact", head: true }).eq("chapter_id", id).eq("status", "published"),
    ]);

  if (!chapter) notFound();
  const ch = chapter as Chapter;

  return (
    <div className="max-w-2xl">
      <h2 className="mb-1 text-2xl font-bold text-gray-900">
        Chapter {ch.number}: {ch.title_en}
      </h2>
      <p className="mb-2 text-gray-500">{ch.title_hi}</p>
      <p className="mb-6 text-sm">
        <Link
          href={`/chapters/${ch.id}/questions`}
          className="text-blue-600 hover:underline"
        >
          View all content &amp; tag PYQs →
        </Link>
      </p>

      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-3 font-semibold text-gray-900">Details</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-36 text-gray-500">Content version</dt>
            <dd className="font-medium text-gray-900">v{ch.content_version}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-36 text-gray-500">NCERT reference</dt>
            <dd className="text-gray-900">{ch.ncert_ref ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-36 text-gray-500">Source PDF</dt>
            <dd className="text-gray-900">{ch.source_pdf_url ?? "Not uploaded"}</dd>
          </div>
        </dl>
      </div>

      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-3 font-semibold text-gray-900">NCERT source PDF</h3>
        <PdfUploadForm chapterId={ch.id} hasPdf={!!ch.source_pdf_url} />
      </div>

      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-1 font-semibold text-gray-900">AI question generation</h3>
        <p className="mb-4 text-sm text-gray-500">
          Reads the uploaded PDF, tags concepts, and creates bilingual draft
          questions with variants. Drafts go to the{" "}
          <Link href="/review" className="text-blue-600 hover:underline">
            Review Queue
          </Link>{" "}
          — nothing reaches students until approved and published.
        </p>
        <div className="mb-4 flex gap-4 text-sm">
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">
            Draft: {draft.count ?? 0}
          </span>
          <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
            Approved: {approved.count ?? 0}
          </span>
          <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
            Published: {published.count ?? 0}
          </span>
        </div>
        <GenerateButton chapterId={ch.id} hasPdf={!!ch.source_pdf_url} />
      </div>

      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-1 font-semibold text-gray-900">
          AI long-answer generation
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          The writing-technique differentiator (M3): model answer, examiner
          keywords, marks breakdown and writing tips — bilingual, per concept.
          Drafts go to the Review Queue.
        </p>
        <div className="mb-4 flex gap-4 text-sm">
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">
            Draft: {laDraft.count ?? 0}
          </span>
          <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
            Approved: {laApproved.count ?? 0}
          </span>
          <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
            Published: {laPublished.count ?? 0}
          </span>
        </div>
        <GenerateLongAnswersButton chapterId={ch.id} hasPdf={!!ch.source_pdf_url} />
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-3 font-semibold text-gray-900">
          Concepts ({(concepts ?? []).length})
        </h3>
        {(concepts ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">
            No concepts tagged yet. Concepts are created during AI question
            generation (M2).
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(concepts as Concept[]).map((c) => (
              <li key={c.id} className="flex justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="font-medium text-gray-900">{c.name_en}</span>
                <span className="text-gray-500">{c.name_hi}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
