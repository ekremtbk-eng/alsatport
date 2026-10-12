/**
 * Client CSRF handling against an in-memory double-submit server (same rules as requireMutatingRequest):
 * concurrent callers share one token, a rotated cookie costs exactly one retry, nothing loops.
 * Run: npx tsx scripts/test-csrf-client.ts
 */
import { randomBytes } from "node:crypto";
import { apiPost, apiUpload, getCsrfToken, resetCsrfToken } from "../src/lib/security/client";

type Mode = "normal" | "origin-reject" | "forbidden" | "csrf-down";

const server = {
  cookie: "",
  mode: "normal" as Mode,
  csrfCalls: 0,
  sends: [] as { url: string; token: string; body: string }[],
  rotate() {
    this.cookie = randomBytes(32).toString("hex");
    return this.cookie;
  },
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  await new Promise((r) => setTimeout(r, 5 + Math.random() * 15));
  if (url === "/api/auth/csrf") {
    server.csrfCalls += 1;
    if (server.mode === "csrf-down") throw new TypeError("network down");
    return json(200, { ok: true, token: server.rotate() });
  }
  const token = new Headers(init?.headers).get("X-CSRF-Token") ?? "";
  const body = typeof init?.body === "string" ? init.body : init?.body ? "[form]" : "";
  server.sends.push({ url, token, body });
  if (server.mode === "origin-reject") return json(403, { ok: false, error: "auth.err.csrf" });
  if (!server.cookie || token !== server.cookie) return json(403, { ok: false, error: "auth.err.csrf" });
  if (server.mode === "forbidden") return json(403, { ok: false, error: "auth.err.forbidden" });
  return json(200, { ok: true });
}) as typeof fetch;

function fresh(mode: Mode = "normal") {
  resetCsrfToken();
  server.cookie = "";
  server.mode = mode;
  server.csrfCalls = 0;
  server.sends = [];
}

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function main() {
  fresh();
  const tokens = await Promise.all(Array.from({ length: 8 }, () => getCsrfToken()));
  check("C1 8 parallel getCsrfToken -> 1 request, 1 token", server.csrfCalls === 1 && new Set(tokens).size === 1 && tokens[0] === server.cookie, `requests=${server.csrfCalls}`);

  fresh();
  const parallel = await Promise.all(Array.from({ length: 6 }, (_, i) => apiPost<{ ok: boolean }>(`/api/x${i}`, { i })));
  check(
    "C2 6 parallel POSTs on a cold page share one valid token",
    server.csrfCalls === 1 && parallel.every((r) => r.status === 200) && server.sends.length === 6 && new Set(server.sends.map((s) => s.token)).size === 1,
    `csrf=${server.csrfCalls} sends=${server.sends.length}`,
  );

  fresh();
  await getCsrfToken();
  server.rotate();
  server.csrfCalls = 0;
  const afterRotate = await Promise.all(Array.from({ length: 5 }, (_, i) => apiPost<{ ok: boolean }>(`/api/r${i}`, { i })));
  check(
    "C3 cookie rotated by another tab -> one shared refresh, every POST retried once and succeeds",
    server.csrfCalls === 1 && afterRotate.every((r) => r.status === 200) && server.sends.length === 10,
    `csrf=${server.csrfCalls} sends=${server.sends.length}`,
  );
  const perUrl = new Map<string, number>();
  for (const s of server.sends) perUrl.set(s.url, (perUrl.get(s.url) ?? 0) + 1);
  check("C4 each request sent at most twice", [...perUrl.values()].every((n) => n <= 2));
  check("C5 retry re-sends the identical body", server.sends.filter((s) => s.url === "/api/r3").every((s) => s.body === JSON.stringify({ i: 3 })));

  fresh("origin-reject");
  const rejected = await apiPost<{ ok: boolean; error?: string }>("/api/blocked", { a: 1 });
  check(
    "C6 server keeps rejecting (bad Origin) -> exactly 2 sends, 403 surfaced, no loop",
    rejected.status === 403 && rejected.error === "auth.err.csrf" && server.sends.length === 2 && server.csrfCalls === 2,
    `sends=${server.sends.length} csrf=${server.csrfCalls}`,
  );

  fresh("forbidden");
  const forbidden = await apiPost<{ ok: boolean; error?: string }>("/api/admin-only", {});
  check("C7 non-CSRF 403 is not retried", forbidden.status === 403 && forbidden.error === "auth.err.forbidden" && server.sends.length === 1 && server.csrfCalls === 1);

  fresh("csrf-down");
  const down = await apiPost<{ ok: boolean; error?: string }>("/api/x", {});
  check("C8 CSRF endpoint unreachable -> request goes out without a token and is rejected", down.status === 403 && server.sends.every((s) => s.token === ""));
  server.mode = "normal";
  const recovered = await apiPost<{ ok: boolean }>("/api/x", {});
  check("C9 failed token fetch is not cached; next call recovers", recovered.status === 200);

  fresh();
  await getCsrfToken();
  server.rotate();
  const upload = await apiUpload<{ ok: boolean }>("/api/uploads", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
  check("C10 upload retries once with a rotated cookie", upload.status === 200 && server.sends.length === 2 && server.sends[1].body === "[form]");

  fresh();
  const seen = new Set<string>();
  const sequential: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const r = await apiPost<{ ok: boolean }>("/api/seq", { i });
    sequential.push(r.status);
    seen.add(server.sends[server.sends.length - 1].token);
  }
  check("C11 sequential POSTs reuse the cached token (no per-request rotation)", sequential.every((s) => s === 200) && server.csrfCalls === 1 && seen.size === 1);

  console.log(failed ? `\n${failed} FAILED` : "\nall passed");
  process.exit(failed ? 1 : 0);
}

void main();
