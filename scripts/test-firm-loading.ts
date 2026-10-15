/**
 * Service provider page loading state in a real (headless) browser. Runs ONLY against a local server + local database:
 *
 *   FIRM_TEST_BASE=http://localhost:3014 DATABASE_URL=<local> npx tsx scripts/test-firm-loading.ts
 *
 * Creates one throw-away seller (`*@firmload.invalid`) with a service listing and removes both at the end.
 * Checks: on a slow network (1.5 s latency, app-wide listing feed answered empty so the page must fetch the listing
 * itself) the page shows a loading status and never "İlan bulunamadı" while the request is in flight; once it resolves
 * the provider profile renders; a normal load never flashes not-found; an unknown or malformed id shows the not-found
 * message only after loading; no console errors or hydration mismatches.
 */
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { categories, walkCategories } from "@/data/categories";

const BASE = (process.env.FIRM_TEST_BASE ?? "http://localhost:3014").replace(/\/$/, "");
const DB = process.env.DATABASE_URL ?? "";
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const NOT_FOUND = "İlan bulunamadı";
const LOADING = "Yükleniyor";

if (!LOOPBACK.test(new URL(BASE).hostname)) throw new Error("Refusing to run against a non-local app.");
let dbHost = "";
try {
  dbHost = new URL(DB).hostname;
} catch {
  throw new Error("DATABASE_URL must point to the local test database.");
}
if (!LOOPBACK.test(dbHost)) throw new Error("Refusing to run against a non-local database host.");

const prisma = new PrismaClient({ datasources: { db: { url: DB } } });
const TAG = randomBytes(4).toString("hex");
const DOMAIN = "firmload.invalid";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const results: boolean[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(4)} ${name}${detail ? `  — ${detail}` : ""}`);
}

class Cdp {
  private id = 0;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  onEvent: (method: string, params: Record<string, unknown>) => void = () => {};
  constructor(private ws: WebSocket) {
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data)) as { id?: number; method?: string; params?: Record<string, unknown>; result?: unknown; error?: { message: string } };
      if (msg.id == null) {
        if (msg.method) this.onEvent(msg.method, msg.params ?? {});
        return;
      }
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    });
  }
  send<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}, sessionId?: string) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise<T>((resolve, reject) => this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject }));
  }
}

const chrome = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
].find(existsSync);

/** Records, from the first paint on, whether the not-found or loading text was ever on screen. */
const WATCH_JS = `(() => {
  window.__seen = { notFound: false, loading: false };
  const look = () => {
    const t = document.body ? document.body.innerText : "";
    if (t.includes(${JSON.stringify(NOT_FOUND)})) window.__seen.notFound = true;
    if (document.querySelector('[data-firm-loading]') && t.includes(${JSON.stringify(LOADING)})) window.__seen.loading = true;
  };
  new MutationObserver(look).observe(document, { childList: true, subtree: true, characterData: true });
  document.addEventListener('DOMContentLoaded', look);
})()`;

async function main() {
  if (!chrome) throw new Error("Chrome/Edge not found.");
  const known = new Set((await prisma.category.findMany({ select: { id: true } })).map((c) => c.id));
  const services = categories.find((c) => c.id === "services");
  let leaf = "";
  if (services) {
    walkCategories([services], (c) => {
      if (!leaf && !c.children?.length && known.has(c.id)) leaf = c.id;
    });
  }
  if (!leaf) throw new Error("No service leaf category in the local database.");

  const user = await prisma.user.create({
    data: {
      email: `seller-${TAG}@${DOMAIN}`,
      username: `firmload_${TAG}`,
      role: "seller",
      passwordHash: "!",
      emailVerifiedAt: new Date(),
      profile: { create: { displayName: `Firm ${TAG}`, city: "Ankara" } },
    },
  });
  const title = `Firmload hizmet ${TAG}`;
  const listing = await prisma.listing.create({
    data: {
      listingNo: `FL${Date.now()}`,
      sellerId: user.id,
      categoryId: leaf,
      title,
      description: "Geçici yerel test ilanı.",
      price: 750,
      city: "Ankara",
      district: "Çankaya",
      status: "active",
      postedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 864e5),
    },
  });

  const dir = mkdtempSync(path.join(tmpdir(), "ap-firm-"));
  const port = 9600 + Math.floor(Math.random() * 100);
  const proc = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${dir}${path.sep}profile`, "--headless=new", "--no-first-run", "--disable-gpu", "about:blank"], { stdio: "ignore" });
  try {
    const ssr = await fetch(`${BASE}/ustalar-hizmetler/firma/${listing.id}`);
    const ssrText = await ssr.text();
    check("S1", "Server HTML for an existing listing has no not-found text", ssr.status === 200 && !ssrText.includes(NOT_FOUND), `status ${ssr.status}`);

    let wsUrl = "";
    for (let i = 0; i < 60 && !wsUrl; i++) {
      await sleep(250);
      try {
        wsUrl = ((await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()) as { webSocketDebuggerUrl: string }).webSocketDebuggerUrl;
      } catch {}
    }
    const ws = new WebSocket(wsUrl);
    await new Promise((r, j) => {
      ws.addEventListener("open", r, { once: true });
      ws.addEventListener("error", j, { once: true });
    });
    const cdp = new Cdp(ws);
    const errors: string[] = [];
    let listingRequests = 0;
    const record = (text: string) => {
      // A link prefetch cut off because the script navigates to the next page; Next falls back on its own.
      if (/^Failed to fetch RSC payload for .* Falling back to browser navigation/.test(text)) return;
      errors.push(text.split("\n")[0].slice(0, 200));
    };
    cdp.onEvent = (method, params) => {
      if (method === "Runtime.exceptionThrown") {
        const d = params.exceptionDetails as { text?: string; exception?: { description?: string } };
        record(d.exception?.description ?? d.text ?? "exception");
      } else if (method === "Runtime.consoleAPICalled" && params.type === "error") {
        const args = (params.args as { value?: unknown; description?: string }[]) ?? [];
        record(args.map((a) => String(a.value ?? a.description ?? "")).join(" "));
      } else if (method === "Network.requestWillBeSent") {
        const url = String((params.request as { url?: string } | undefined)?.url ?? "");
        if (url.endsWith(`/api/listings/${listing.id}`)) listingRequests++;
      } else if (method === "Fetch.requestPaused") {
        void send("Fetch.fulfillRequest", {
          requestId: params.requestId,
          responseCode: 200,
          responseHeaders: [{ name: "content-type", value: "application/json" }],
          body: Buffer.from(JSON.stringify({ ok: true, listings: [] })).toString("base64"),
        }).catch(() => undefined);
      }
    };
    const { targetId } = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });
    const send = <T = Record<string, unknown>>(m: string, p: Record<string, unknown> = {}) => cdp.send<T>(m, p, sessionId);
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", { source: WATCH_JS });
    const ev = async <T>(expression: string): Promise<T> => {
      const r = await send<{ result: { value: T }; exceptionDetails?: { text: string } }>("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
      return r.result.value;
    };
    const waitFor = async (expr: string, ms = 20000) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        if (await ev<boolean>(`Boolean(${expr})`).catch(() => false)) return true;
        await sleep(100);
      }
      return false;
    };
    const seen = () => ev<{ notFound: boolean; loading: boolean }>("window.__seen");
    const titleShown = `document.querySelector('h1') && document.querySelector('h1').textContent.includes(${JSON.stringify(title)})`;
    const notFoundShown = `document.body.innerText.includes(${JSON.stringify(NOT_FOUND)})`;

    // 1) Slow network, and the app-wide listing feed answered empty so the page must load the listing itself.
    await send("Fetch.enable", { patterns: [{ urlPattern: `${BASE}/api/listings`, requestStage: "Request" }] });
    await send("Network.emulateNetworkConditions", { offline: false, latency: 1500, downloadThroughput: -1, uploadThroughput: -1 });
    const started = Date.now();
    await send("Page.navigate", { url: `${BASE}/ustalar-hizmetler/firma/${listing.id}` });
    const issuedBy = Date.now() + 30000;
    while (!listingRequests && Date.now() < issuedBy) await sleep(50);
    const hydrated = listingRequests > 0;
    const during = await ev<{ loading: boolean; status: boolean; notFound: boolean }>(`({
      loading: document.body.innerText.includes(${JSON.stringify(LOADING)}),
      status: !!document.querySelector('[data-firm-loading][role="status"]'),
      notFound: ${notFoundShown},
    })`);
    check("B1", "Listing request issued by the page while it is still loading", hydrated, `${Date.now() - started} ms`);
    check("B2", "While loading: accessible loading status is shown", during.loading && during.status, JSON.stringify(during));
    check("B3", "While loading: no not-found message", !during.notFound);
    const rendered = await waitFor(titleShown, 30000);
    const afterSlow = await seen();
    check("B4", "After the response: provider profile renders, loading gone", rendered && !(await ev<boolean>("!!document.querySelector('[data-firm-loading]')")));
    check("B5", "Slow load: not-found never appeared at any point", !afterSlow.notFound && afterSlow.loading, JSON.stringify(afterSlow));
    await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await send("Fetch.disable");

    // 2) Normal-speed load (the feed may serve the listing from cache).
    await send("Page.navigate", { url: `${BASE}/ustalar-hizmetler/firma/${listing.id}` });
    const fast = await waitFor(titleShown);
    const afterFast = await seen();
    check("B6", "Normal load: profile renders without a not-found flash", fast && !afterFast.notFound, JSON.stringify(afterFast));

    // 3) Unknown id: loading first, then the existing not-found message.
    await send("Page.navigate", { url: `${BASE}/ustalar-hizmetler/firma/${randomUUID()}` });
    const missing = await waitFor(notFoundShown);
    const afterMissing = await seen();
    const leftover = await ev<boolean>("!!document.querySelector('[data-firm-loading]')");
    const backLink = await ev<boolean>("!!document.querySelector('a[href=\"/ustalar-hizmetler\"]')");
    check("B7", "Unknown listing: not-found message shown once loading ends", missing && !leftover && backLink, JSON.stringify({ ...afterMissing, leftover, backLink }));

    // 4) Malformed id: same message, no crash.
    await send("Page.navigate", { url: `${BASE}/ustalar-hizmetler/firma/not-a-uuid` });
    check("B8", "Malformed id: not-found message shown", await waitFor(notFoundShown));

    const hydration = errors.filter((e) => /Hydration failed|Minified React error #(418|423|425)/.test(e));
    check("B9", "No console errors / hydration mismatches", errors.length === 0, errors.slice(0, 3).join(" | ") + (hydration.length ? ` (hydration ${hydration.length})` : ""));
    ws.close();
  } finally {
    proc.kill();
    await sleep(500);
    rmSync(dir, { recursive: true, force: true });
    await prisma.listing.deleteMany({ where: { sellerId: user.id } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    const left = await prisma.user.count({ where: { email: { endsWith: `@${DOMAIN}` } } });
    check("X1", "Test data removed", left === 0, `${left} users left`);
    await prisma.$disconnect();
  }

  const failed = results.filter((p) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exit(1);
});
