"use client";

import { useRef, useState } from "react";
import { addTeamMember } from "./actions";

export function AddMemberForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const result = await addTeamMember(formData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(`${formData.get("email")} added — share the password with them.`);
    formRef.current?.reset();
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Email</label>
        <input type="email" name="email" required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Temporary password (min 8 characters)</label>
        <input
          type="text"
          name="password"
          required
          minLength={8}
          autoComplete="off"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Role</label>
        <select name="role" defaultValue="editor" className={inputClass}>
          <option value="editor">Editor — creates and edits content</option>
          <option value="reviewer">Reviewer — reviews and approves content</option>
          <option value="owner">Owner — full access incl. team management</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Adding…" : "Add member"}
      </button>
    </form>
  );
}
