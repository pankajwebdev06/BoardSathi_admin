"use client";

import { useState } from "react";
import { removeTeamMember } from "./actions";

export function RemoveMemberButton({ id, email }: { id: string; email: string }) {
  const [removing, setRemoving] = useState(false);

  async function handleRemove(formData: FormData) {
    if (!confirm(`Remove ${email}? They will no longer be able to sign in.`)) return;
    setRemoving(true);
    const result = await removeTeamMember(formData);
    if (result.error) {
      alert(result.error);
      setRemoving(false);
    }
  }

  return (
    <form action={handleRemove} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={removing}
        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
      >
        {removing ? "Removing…" : "Remove"}
      </button>
    </form>
  );
}
