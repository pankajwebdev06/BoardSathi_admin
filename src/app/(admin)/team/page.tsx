import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import type { AdminUser } from "@/lib/types";
import { AddMemberForm } from "./add-member-form";
import { RemoveMemberButton } from "./remove-member-button";

export default async function TeamPage() {
  const me = await requireAdmin();
  const admin = createAdminClient();

  const { data: members } = await admin
    .from("admin_user")
    .select("id, auth_user_id, email, role")
    .order("created_at");

  const isOwner = me.role === "owner";

  return (
    <div className="max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Team</h2>

      <div className="mb-8 overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              {isOwner && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {((members ?? []) as AdminUser[]).map((m) => (
              <tr key={m.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {m.email}
                  {m.id === me.id && (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                      you
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 capitalize text-gray-700">{m.role}</td>
                {isOwner && (
                  <td className="px-4 py-3 text-right">
                    {m.id !== me.id && <RemoveMemberButton id={m.id} email={m.email} />}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOwner ? (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-1 font-semibold text-gray-900">Add team member</h3>
          <p className="mb-4 text-sm text-gray-500">
            Creates a sign-in for them immediately — share the email and password
            with them directly. Roles: <b>editor</b> manages content,{" "}
            <b>reviewer</b> approves content, <b>owner</b> manages the team too.
          </p>
          <AddMemberForm />
        </div>
      ) : (
        <p className="text-sm text-gray-500">Only the owner can manage team members.</p>
      )}
    </div>
  );
}
