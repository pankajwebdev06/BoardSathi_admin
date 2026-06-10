// Temporary connectivity check — run: node --env-file=.env.local check-connection.mjs
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: svc, Authorization: `Bearer ${svc}` };

async function check(table, select) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${select}&limit=5`, { headers });
  const body = await res.json();
  return { status: res.status, body };
}

const boards = await check("boards", "code,name_en,slug");
console.log("boards:", boards.status, JSON.stringify(boards.body));

const concept = await check("concept", "name_en");
console.log("concept:", concept.status, JSON.stringify(concept.body).slice(0, 300));

const admin = await check("admin_user", "email,role");
console.log("admin_user:", admin.status, JSON.stringify(admin.body));
