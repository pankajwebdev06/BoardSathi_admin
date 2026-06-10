import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Chapter, Concept } from "@/lib/types";
import { PdfUploadForm } from "./pdf-upload-form";

export default async function ChapterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const [{ data: chapter }, { data: concepts }] = await Promise.all([
    admin.from("chapters").select("*").eq("id", id).single(),
    admin.from("concept").select("*").eq("chapter_id", id).order("name_en"),
  ]);

  if (!chapter) notFound();
  const ch = chapter as Chapter;

  return (
    <div className="max-w-2xl">
      <h2 className="mb-1 text-2xl font-bold text-gray-900">
        Chapter {ch.number}: {ch.title_en}
      </h2>
      <p className="mb-6 text-gray-500">{ch.title_hi}</p>

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
