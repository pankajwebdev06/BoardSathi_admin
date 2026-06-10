import { createAdminClient } from "@/lib/supabase/admin";
import type { Board, Subject } from "@/lib/types";
import { NewChapterForm } from "./new-chapter-form";

export default async function NewChapterPage() {
  const admin = createAdminClient();

  const [{ data: boards }, { data: subjects }] = await Promise.all([
    admin.from("boards").select("*").order("name_en"),
    admin.from("subjects").select("*").order("sort_order"),
  ]);

  return (
    <div className="max-w-xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">New chapter</h2>
      <NewChapterForm
        boards={(boards ?? []) as Board[]}
        subjects={(subjects ?? []) as Subject[]}
      />
    </div>
  );
}
