// Temporary connectivity check — run: node --env-file=.env.local check-connection.mjs
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: svc, Authorization: `Bearer ${svc}` };

async function get(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers });
  return { status: res.status, body: await res.json() };
}

const boards = await get("boards?select=code,name_en,name_hi,class");
console.log("boards:", boards.status, JSON.stringify(boards.body));

const subjects = await get("subjects?select=name_en&limit=100");
console.log("subjects count:", Array.isArray(subjects.body) ? subjects.body.length : subjects.body);

const chapters = await get("chapters?select=title_en,title_hi,content_version");
console.log("chapters:", chapters.status, JSON.stringify(chapters.body));

const concepts = await get("concept?select=name_en,name_hi");
console.log("concepts:", concepts.status, JSON.stringify(concepts.body));

const tables = ["long_answer", "exam_weightage", "student", "attempt", "progress", "streak", "report", "admin_user"];
for (const t of tables) {
  const r = await get(`${t}?select=*&limit=1`);
  console.log(`${t}:`, r.status === 200 ? "OK" : `ERROR ${r.status} ${JSON.stringify(r.body).slice(0, 100)}`);
}

// Storage bucket check
const bucket = await fetch(`${url}/storage/v1/bucket/chapter-pdfs`, { headers });
console.log("chapter-pdfs bucket:", bucket.status === 200 ? "OK" : `ERROR ${bucket.status}`);
