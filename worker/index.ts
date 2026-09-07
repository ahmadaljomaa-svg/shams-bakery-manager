/** Cloudflare Worker entry point for the vinext-starter template. */
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  ADMIN_PASSWORD?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}


const textEncoder = new TextEncoder();
const SESSION_COOKIE = "shams_admin_session";
const ONE_DAY = 60 * 60 * 24;

function timingSafeEqual(a: string, b: string): boolean {
  const left = textEncoder.encode(a);
  const right = textEncoder.encode(b);
  const max = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < max; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createSession(secret: string): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + ONE_DAY;
  const nonce = crypto.randomUUID();
  const payload = `${expiry}.${nonce}`;
  return `${payload}.${await hmac(payload, secret)}`;
}

async function validSession(request: Request, secret: string): Promise<boolean> {
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!value) return false;
  const decoded = decodeURIComponent(value);
  const [expiry, nonce, signature, extra] = decoded.split(".");
  if (!expiry || !nonce || !signature || extra) return false;
  const expiryNumber = Number(expiry);
  if (!Number.isInteger(expiryNumber) || expiryNumber < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(`${expiry}.${nonce}`, secret);
  return timingSafeEqual(signature, expected);
}

function wantsHtml(request: Request): boolean {
  return (request.headers.get("accept") ?? "").includes("text/html");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] ?? char));
}

function loginPage(error = ""): Response {
  const errorHtml = error ? `<p class="error">${escapeHtml(error)}</p>` : "";
  const html = `<!doctype html><html lang="de" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SHAMS Login</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 20% 10%,#23e8d8 0,transparent 26rem),linear-gradient(135deg,#07111f,#111827 50%,#050816);font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;color:#f8fafc}.card{width:min(92vw,430px);padding:34px;border:1px solid rgba(255,255,255,.16);border-radius:30px;background:rgba(8,13,25,.78);box-shadow:0 24px 80px rgba(0,0,0,.45);backdrop-filter:blur(18px)}.brand{display:flex;align-items:center;gap:14px;margin-bottom:24px}.logo{width:58px;height:58px;border-radius:18px;background:#1bd7c8;display:grid;place-items:center;color:#03121c;font-weight:900;font-size:24px}.eyebrow{color:#7dd3fc;font-size:14px;margin:0 0 5px}.title{font-size:28px;line-height:1.1;font-weight:850;margin:0}.hint{color:#b8c4d8;line-height:1.6;margin:0 0 26px}label{display:block;color:#dbeafe;font-size:14px;font-weight:700;margin-bottom:8px}input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.18);border-radius:16px;background:rgba(2,6,23,.66);padding:15px 16px;color:#fff;font-size:17px;outline:none}input:focus{border-color:#22d3ee;box-shadow:0 0 0 4px rgba(34,211,238,.18)}button{width:100%;margin-top:16px;border:0;border-radius:16px;padding:15px 18px;background:linear-gradient(135deg,#11d7c3,#38bdf8);color:#03121c;font-size:16px;font-weight:850;cursor:pointer}.error{border-radius:14px;background:rgba(248,113,113,.16);color:#fecaca;padding:12px 14px;margin:0 0 16px;font-size:14px}</style></head><body><main class="card"><div class="brand"><div class="logo">S</div><div><p class="eyebrow">SHAMS Hamburg</p><h1 class="title">Admin Zugang</h1></div></div><p class="hint">Bitte Passwort eingeben, um das Bäckerei-System zu öffnen.</p>${errorHtml}<form method="post" action="/login"><label for="password">Passwort</label><input id="password" name="password" type="password" autocomplete="current-password" autofocus required><button type="submit">Einloggen</button></form></main></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

function redirectToLogin(request: Request): Response {
  const url = new URL(request.url);
  const location = `/login?next=${encodeURIComponent(url.pathname + url.search)}`;
  return new Response(null, { status: 302, headers: { location, "cache-control": "no-store" } });
}

function isPublicAsset(pathname: string): boolean {
  return pathname === "/favicon.svg" || pathname === "/shams-logo.jpg" || pathname.startsWith("/_next/") || pathname.startsWith("/assets/");
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // This application serves validated logos directly; image proxying is disabled.
    if (url.pathname === "/_vinext/image" || url.pathname === "/_next/image") return new Response("Not found", {status:404});

    const adminPassword = env.ADMIN_PASSWORD;
    if (!adminPassword) return new Response("Admin password is not configured", { status: 503, headers: { "cache-control": "no-store" } });

    if (url.pathname === "/login" && request.method === "GET") return loginPage();
    if (url.pathname === "/login" && request.method === "POST") {
      const form = await request.formData();
      const password = String(form.get("password") ?? "");
      if (!timingSafeEqual(password, adminPassword)) return loginPage("Falsches Passwort. Bitte erneut versuchen.");
      const session = await createSession(adminPassword);
      const next = url.searchParams.get("next") || "/";
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      return new Response(null, { status: 302, headers: { location: safeNext, "set-cookie": `${SESSION_COOKIE}=${encodeURIComponent(session)}; Max-Age=${ONE_DAY}; Path=/; HttpOnly; Secure; SameSite=Lax`, "cache-control": "no-store" } });
    }
    if (url.pathname === "/logout") return new Response(null, { status: 302, headers: { location: "/login", "set-cookie": `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`, "cache-control": "no-store" } });
    if (!isPublicAsset(url.pathname) && !(await validSession(request, adminPassword))) {
      if (url.pathname.startsWith("/api/")) return Response.json({ error: "Nicht angemeldet" }, { status: 401, headers: { "cache-control": "no-store" } });
      if (wantsHtml(request) || request.method === "GET") return redirectToLogin(request);
      return new Response("Nicht angemeldet", { status: 401, headers: { "cache-control": "no-store" } });
    }

    const result = await handler.fetch(request, env, ctx);
    const response = new Response(result.body, result);
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "same-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.headers.set("Content-Security-Policy", "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com");
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/invoice/")) response.headers.set("Cache-Control", "private, no-store");
    return response;
  },
};

export default worker;

