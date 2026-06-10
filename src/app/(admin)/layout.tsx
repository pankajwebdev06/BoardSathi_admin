import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/chapters", label: "Chapters" },
  { href: "/review", label: "Review Queue" },
  { href: "/team", label: "Team" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h1 className="text-lg font-bold text-gray-900">BoardSathi</h1>
          <p className="text-xs text-gray-500">Content Factory</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <p className="mb-2 truncate px-3 text-xs text-gray-500">
            {adminUser.email} · {adminUser.role}
          </p>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
