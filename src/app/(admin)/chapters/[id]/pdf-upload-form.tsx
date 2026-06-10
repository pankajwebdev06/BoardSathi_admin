"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadChapterPdf } from "../actions";

export function PdfUploadForm({
  chapterId,
  hasPdf,
}: {
  chapterId: string;
  hasPdf: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setUploading(true);
    setError(null);
    const result = await uploadChapterPdf(formData);
    if (result.error) {
      setError(result.error);
      setUploading(false);
      return;
    }
    setUploading(false);
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <input type="hidden" name="chapter_id" value={chapterId} />
      <input
        type="file"
        name="pdf"
        accept="application/pdf"
        required
        className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={uploading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {uploading ? "Uploading…" : hasPdf ? "Replace PDF" : "Upload PDF"}
      </button>
    </form>
  );
}
