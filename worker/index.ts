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
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // This application serves validated logos directly; image proxying is disabled.
    if (url.pathname === "/_vinext/image" || url.pathname === "/_next/image") return new Response("Not found", {status:404});

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
