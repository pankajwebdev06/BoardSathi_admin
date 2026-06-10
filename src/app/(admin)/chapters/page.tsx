import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Board, Chapter, Subject } from "@/lib/types";

export default async function ChaptersPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject: subjectId } = await searchParams;
  const admin = createAdminClient();

  const [{ data: boards }, { data: subjects }] = await Promise.all([
    admin.from("boards").select("*").order("name_en"),
    admin.from("subjects").select("*").order("sort_order"),
  ]);

  let chapters: Chapter[] = [];
  if (subjectId) {
    const { data } = await admin
      .from("chapters")
      .select("*")
      .eq("subject_id", subjectId)
      .order("sort_order");
    chapters = (data ?? []) as Chapter[];
  }

  const boardName = (id: string) =>
    (boards as Board[] | null)?.find((b) => b.id === id)?.name_en ?? "";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Chapters</h2>
        <Link
          href="/chapters/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + New chapter
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(subjects as Subject[] | null)?.map((s) => (
          <Link
            key={s.id}
            href={`/chapters?subject=${s.id}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              s.id === subjectId
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
            }`}
          >
            {s.name_en} · {boardName(s.board_id)}
          </Link>
        ))}
      </div>

      {!subjectId ? (
        <p className="text-sm text-gray-500">Select a subject to see its chapters.</p>
      ) : chapters.length === 0 ? (
        <p className="text-sm text-gray-500">No chapters yet for this subject.</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Title (EN)</th>
                <th className="px-4 py-3">Title (HI)</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">PDF</th>
              </tr>
            </thead>
            <tbody>
              {chapters.map((ch) => (
                <tr key={ch.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-500">{ch.number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/chapters/${ch.id}`} className="hover:text-blue-600">
                      {ch.title_en}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{ch.title_hi}</td>
                  <td className="px-4 py-3 text-gray-500">v{ch.content_version}</td>
                  <td className="px-4 py-3">
                    {ch.source_pdf_url ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Uploaded
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Missing
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
