// One-time admin bootstrap — run: node --env-file=.env.local create-admin.mjs <email> <password>
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  apikey: svc,
  Authorization: `Bearer ${svc}`,
  "Content-Type": "application/json",
};

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node --env-file=.env.local create-admin.mjs <email> <password>");
  process.exit(1);
}

// 1. Create the auth user (email pre-confirmed so login works immediately)
const createRes = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers,
  body: JSON.stringify({ email, password, email_confirm: true }),
});
const created = await createRes.json();

let authUserId;
if (createRes.status === 200 || createRes.status === 201) {
  authUserId = created.id;
  console.log("auth user created:", authUserId);
} else if (created.error_code === "email_exists" || created.code === "email_exists") {
  // Already registered — look the user up instead
  const listRes = await fetch(
    `${url}/auth/v1/admin/users?page=1&per_page=100`,
    { headers }
  );
  const list = await listRes.json();
  const existing = (list.users ?? []).find((u) => u.email === email);
  if (!existing) {
    console.error("email_exists but user not found in list:", created);
    process.exit(1);
  }
  authUserId = existing.id;
  console.log("auth user already existed:", authUserId);
} else {
  console.error("auth create failed:", createRes.status, JSON.stringify(created));
  process.exit(1);
}

// 2. Upsert the admin_user row with owner role
const upsertRes = await fetch(
  `${url}/rest/v1/admin_user?on_conflict=email`,
  {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ auth_user_id: authUserId, email, role: "owner" }),
  }
);
const upserted = await upsertRes.json();
if (upsertRes.status >= 300) {
  console.error("admin_user upsert failed:", upsertRes.status, JSON.stringify(upserted));
  process.exit(1);
}
console.log("admin_user row:", JSON.stringify(upserted));

// 3. Verify login actually works with the anon key (same path the panel uses)
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: anon, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
console.log("login test:", loginRes.status === 200 ? "OK — sign-in works" : `FAILED ${loginRes.status}`);
