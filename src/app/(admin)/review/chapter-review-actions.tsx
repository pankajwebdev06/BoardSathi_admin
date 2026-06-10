"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveAllForChapter, publishChapter } from "./actions";

export function ChapterReviewActions({
  chapterId,
  draftCount,
  approvedCount,
}: {
  chapterId: string;
  draftCount: number;
  approvedCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleApproveAll() {
    setBusy(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("chapter_id", chapterId);
    const result = await approveAllForChapter(fd);
    setMessage(result.error ?? null);
    setBusy(false);
    router.refresh();
  }

  async function handlePublish() {
    if (
      !confirm(
        `Publish ${approvedCount} approved questions? Students will download them on next sync.`
      )
    )
      return;
    setBusy(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("chapter_id", chapterId);
    const result = await publishChapter(fd);
    setMessage(
      result.error ?? `Published — chapter is now v${result.version}`
    );
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={handleApproveAll}
          disabled={busy || draftCount === 0}
          className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-green-700 shadow-sm hover:bg-green-50 disabled:opacity-50"
        >
          Approve all ({draftCount})
        </button>
        <button
          onClick={handlePublish}
          disabled={busy || approvedCount === 0}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Publish ({approvedCount})
        </button>
      </div>
      {message && <p className="text-xs text-gray-600">{message}</p>}
    </div>
  );
}
