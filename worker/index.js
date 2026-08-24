const FIREBASE_WEB_API_KEY = "AIzaSyCBRjUBOrwyFfmze1U2guIvdPjdyh05z7A";
const GITHUB_REPO = "content";
const GITHUB_BRANCH = "main";
const CONTENT_ROOT = "drkprty/works";
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, repo: GITHUB_REPO }, 200, cors);
      }

      if (request.method === "GET" && url.pathname.startsWith("/asset/")) {
        const path = allowedPath(decodeURIComponent(url.pathname.slice(7)));
        return serveAsset(path, env, cors);
      }

      await requireAdmin(request, env);

      if (request.method === "POST" && url.pathname === "/upload") {
        const type = request.headers.get("content-type") || "";
        if (!["image/jpeg", "image/png", "image/webp"].includes(type)) throw httpError(415, "Use JPG, PNG or WebP.");
        const bytes = await request.arrayBuffer();
        if (!bytes.byteLength) throw httpError(400, "Empty upload.");
        if (bytes.byteLength > 20 * 1024 * 1024) throw httpError(413, "Maximum image size is 20 MB.");

        const workId = safeSegment(url.searchParams.get("workId") || "work");
        const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
        const path = `${CONTENT_ROOT}/${workId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        await githubPut(path, bytes, env);
        return json({ ok: true, path, url: `${url.origin}/asset/${encodePath(path)}` }, 200, cors);
      }

      if (request.method === "DELETE" && url.pathname === "/file") {
        const path = allowedPath(url.searchParams.get("path") || "");
        await githubDelete(path, env);
        return json({ ok: true, path }, 200, cors);
      }

      return json({ error: "Not found." }, 404, cors);
    } catch (error) {
      console.error(error);
      return json({ error: error.message || "Unexpected server error." }, Number(error.status) || 500, cors);
    }
  }
};

function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "*").split(",").map(x => x.trim()).filter(Boolean);
  const value = allowed.includes("*") ? "*" : (allowed.includes(origin) ? origin : "null");
  return {
    "access-control-allow-origin": value,
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "Authorization,Content-Type",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

function json(body, status, extra) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });
}
function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
function safeSegment(v) { return String(v).replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "work"; }
function allowedPath(v) {
  const p = String(v).replace(/^\/+/, "");
  if (!p.startsWith(CONTENT_ROOT + "/") || p.includes("..")) throw httpError(400, "Invalid content path.");
  return p;
}
function encodePath(p) { return p.split("/").map(encodeURIComponent).join("/"); }

async function requireAdmin(request, env) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) throw httpError(401, "Authentication required.");
  const idToken = header.slice(7).trim();
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  if (!r.ok) throw httpError(401, "Invalid or expired Firebase session.");
  const data = await r.json();
  const user = data.users?.[0];
  if (!user?.localId) throw httpError(401, "Invalid Firebase session.");
  if (env.ADMIN_EMAILS) {
    const allowed = String(env.ADMIN_EMAILS).split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(String(user.email || "").toLowerCase())) throw httpError(403, "This account cannot manage content.");
  }
}

function githubHeaders(env, accept = "application/vnd.github+json") {
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER) throw httpError(500, "GitHub is not configured.");
  return {
    "authorization": `Bearer ${env.GITHUB_TOKEN}`,
    "accept": accept,
    "x-github-api-version": "2022-11-28",
    "user-agent": "drkprty-art-content"
  };
}
function githubUrl(path, env) {
  return `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${GITHUB_REPO}/contents/${encodePath(path)}`;
}
async function githubPut(path, buffer, env) {
  const r = await fetch(githubUrl(path, env), {
    method: "PUT",
    headers: { ...githubHeaders(env), "content-type": "application/json" },
    body: JSON.stringify({ message: `DRKPRTY ART: upload ${path.split("/").pop()}`, content: toBase64(buffer), branch: GITHUB_BRANCH })
  });
  if (!r.ok) { const d = await safeJson(r); throw httpError(r.status, `GitHub upload failed: ${d.message || r.statusText}`); }
}
async function githubMeta(path, env) {
  const r = await fetch(`${githubUrl(path, env)}?ref=${GITHUB_BRANCH}`, { headers: githubHeaders(env) });
  if (r.status === 404) return null;
  if (!r.ok) { const d = await safeJson(r); throw httpError(r.status, `GitHub lookup failed: ${d.message || r.statusText}`); }
  return r.json();
}
async function githubDelete(path, env) {
  const meta = await githubMeta(path, env);
  if (!meta) return;
  const r = await fetch(githubUrl(path, env), {
    method: "DELETE",
    headers: { ...githubHeaders(env), "content-type": "application/json" },
    body: JSON.stringify({ message: `DRKPRTY ART: delete ${path.split("/").pop()}`, sha: meta.sha, branch: GITHUB_BRANCH })
  });
  if (!r.ok) { const d = await safeJson(r); throw httpError(r.status, `GitHub delete failed: ${d.message || r.statusText}`); }
}
async function serveAsset(path, env, cors) {
  const r = await fetch(`${githubUrl(path, env)}?ref=${GITHUB_BRANCH}`, { headers: githubHeaders(env, "application/vnd.github.raw") });
  if (!r.ok) return new Response(r.status === 404 ? "Not found" : "Asset unavailable", { status: r.status === 404 ? 404 : 502, headers: cors });
  const headers = new Headers(cors);
  headers.set("content-type", r.headers.get("content-type") || "application/octet-stream");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(r.body, { headers });
}
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer); let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}
async function safeJson(r) { try { return await r.json(); } catch { return {}; } }
