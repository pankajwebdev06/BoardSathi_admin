import { createAdminClient } from "@/lib/supabase/admin";

async function getCounts() {
  const admin = createAdminClient();

  const [boards, subjects, chapters, draft, approved, published] =
    await Promise.all([
      admin.from("boards").select("*", { count: "exact", head: true }),
      admin.from("subjects").select("*", { count: "exact", head: true }),
      admin.from("chapters").select("*", { count: "exact", head: true }),
      admin.from("questions").select("*", { count: "exact", head: true }).eq("status", "draft"),
      admin.from("questions").select("*", { count: "exact", head: true }).eq("status", "approved"),
      admin.from("questions").select("*", { count: "exact", head: true }).eq("status", "published"),
    ]);

  return {
    boards: boards.count ?? 0,
    subjects: subjects.count ?? 0,
    chapters: chapters.count ?? 0,
    draft: draft.count ?? 0,
    approved: approved.count ?? 0,
    published: published.count ?? 0,
  };
}

export default async function DashboardPage() {
  const counts = await getCounts();

  const cards = [
    { label: "Boards", value: counts.boards },
    { label: "Subjects", value: counts.subjects },
    { label: "Chapters", value: counts.chapters },
    { label: "Draft questions", value: counts.draft },
    { label: "Approved (awaiting publish)", value: counts.approved },
    { label: "Published questions", value: counts.published },
  ];

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
