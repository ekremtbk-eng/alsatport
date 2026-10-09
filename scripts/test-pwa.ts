/**
 * PWA, platform detection and footer app/social section.
 *
 *   npx tsx scripts/test-pwa.ts                                  (unit checks only)
 *   PWA_TEST_BASE=http://localhost:3013 npx tsx scripts/test-pwa.ts   (+ HTTP checks against a local server)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { detectPlatform, installPath } from "../src/lib/pwa/platform";
import { APP_TARGETS, safeAppUrl } from "../src/data/appDistribution";
import { SOCIAL_ACCOUNTS, LEGAL_SOCIAL } from "../src/data/legal";
import { MESSAGES } from "../src/i18n/messages";
import manifest from "../src/app/manifest";

const BASE = process.env.PWA_TEST_BASE ?? "";
const results: { id: string; pass: boolean }[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(4)} ${name}${detail ? `  — ${detail}` : ""}`);
}

const UA = {
  androidChrome: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  androidFirefox: "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1",
  ipadDesktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  macSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  macChrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  winEdge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
  winFirefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
  linuxChrome: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  linuxFirefox: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
  chromeos: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

function unit() {
  const d = (ua: string, touch = 0) => detectPlatform(ua, "", touch);
  check("P1", "Android Chrome → android", d(UA.androidChrome).platform === "android");
  check("P2", "iPhone Safari → ios", d(UA.iphone).platform === "ios" && d(UA.iphone).isSafari);
  check("P3", "iPad desktop-mode (Macintosh + touch) → ios", d(UA.ipadDesktop, 5).platform === "ios");
  check("P4", "Mac Safari (no touch) → mac + Safari", d(UA.macSafari).platform === "mac" && d(UA.macSafari).isSafari);
  check("P5", "Mac Chrome → mac, Chromium", d(UA.macChrome).platform === "mac" && d(UA.macChrome).isChromium);
  check("P6", "Windows Edge → windows, Chromium", d(UA.winEdge).platform === "windows" && d(UA.winEdge).isChromium);
  check("P7", "Linux Chrome / Firefox → linux", d(UA.linuxChrome).platform === "linux" && d(UA.linuxFirefox).platform === "linux");
  check("P8", "ChromeOS → linux", d(UA.chromeos).platform === "linux");
  check("P9", "userAgentData platform wins when UA is reduced", detectPlatform("Mozilla/5.0", "Windows").platform === "windows");
  check("P10", "unknown UA → other", d("curl/8.0").platform === "other");

  check("I1", "captured prompt → prompt", installPath(d(UA.androidChrome), true) === "prompt");
  check("I2", "iPhone (Safari or Chrome) → Share instructions", installPath(d(UA.iphone), false) === "ios-share" && installPath(d(UA.iphoneChrome), false) === "ios-share");
  check("I3", "Mac Safari → Add to Dock", installPath(d(UA.macSafari), false) === "mac-safari");
  check("I4", "Android Firefox → browser menu", installPath(d(UA.androidFirefox), false) === "android-menu");
  check("I5", "Desktop Chromium without prompt → address-bar install", installPath(d(UA.winEdge), false) === "desktop-menu" && installPath(d(UA.macChrome), false) === "desktop-menu");
  check("I6", "Firefox desktop → unsupported (suggest Chrome/Edge/Safari)", installPath(d(UA.winFirefox), false) === "unsupported" && installPath(d(UA.linuxFirefox), false) === "unsupported");

  check("A1", "safeAppUrl rejects null / http / javascript / unknown host / lookalike",
    [null, "http://play.google.com/x", "javascript:alert(1)", "https://evil.example/app.apk", "https://play.google.com.evil.io/x"].every((u) => safeAppUrl(u) === null));
  check("A2", "safeAppUrl accepts official https store", safeAppUrl("https://play.google.com/store/apps/details?id=com.alsatport") !== null);
  const configured = APP_TARGETS.filter((t) => t.url);
  check("A3", "every configured native target passes the allowlist", configured.every((t) => safeAppUrl(t.url) !== null), `${configured.length} configured`);
  check("A4", "no native download is configured yet (all shown as Yakında)", configured.length === 0);

  check("S1", "social accounts: only https URLs, Instagram configured", SOCIAL_ACCOUNTS.every((a) => !a.url || a.url.startsWith("https://")) && !!SOCIAL_ACCOUNTS.find((a) => a.id === "instagram")?.url);
  check("S2", "unconfigured accounts have no URL (no placeholders)", SOCIAL_ACCOUNTS.filter((a) => a.id !== "instagram").every((a) => a.url === null));
  check("S3", "JSON-LD sameAs only lists configured accounts", LEGAL_SOCIAL.length === SOCIAL_ACCOUNTS.filter((a) => a.url).length);

  const m = manifest();
  const icons = m.icons ?? [];
  check("M1", "manifest id/start_url/scope = /", m.id === "/" && m.start_url === "/" && m.scope === "/");
  check("M2", "manifest standalone display + theme colour", m.display === "standalone" && !!m.theme_color);
  check("M3", "manifest has 192, 512 and maskable icons",
    icons.some((i) => i.sizes === "192x192") && icons.some((i) => i.sizes === "512x512" && i.purpose === "any") && icons.some((i) => i.purpose === "maskable"));

  const keys = Object.keys(MESSAGES.tr).filter((k) => k.startsWith("apps."));
  const locales = ["tr", "en", "de", "ar", "ru"] as const;
  const missing = locales.flatMap((l) => keys.filter((k) => !MESSAGES[l][k]?.trim()).map((k) => `${l}:${k}`));
  check("L1", `apps.* keys translated in 5 languages (${keys.length} keys)`, keys.length > 25 && missing.length === 0, missing.slice(0, 3).join(","));
}

type FakeEvent = { request: { method: string; url: string; mode: string }; responded: boolean; respondWith: (p: unknown) => void; waitUntil: (p: unknown) => void };

function serviceWorker() {
  const src = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");
  const listeners: Record<string, (e: FakeEvent) => void> = {};
  const ctx: Record<string, unknown> = {
    self: {
      location: { origin: "https://alsatport.com" },
      addEventListener: (type: string, fn: (e: FakeEvent) => void) => (listeners[type] = fn),
      clients: { claim: () => Promise.resolve() },
      skipWaiting: () => Promise.resolve(),
    },
    caches: { open: () => Promise.resolve({ match: () => undefined, put: () => undefined, keys: () => [] }), match: () => Promise.resolve(undefined), keys: () => Promise.resolve([]) },
    fetch: () => Promise.resolve({ ok: true, type: "basic", clone() { return this; } }),
    Response: { error: () => ({}) },
    URL,
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const cacheable = ctx.isCacheableStatic as (u: URL) => boolean;
  const u = (p: string) => new URL(p, "https://alsatport.com");

  check("W1", "caches hashed /_next/static assets and brand icons", cacheable(u("/_next/static/chunks/app-abc123.js")) && cacheable(u("/icon-192.png")) && cacheable(u("/offline.html")));
  const never = ["/", "/api/listings", "/api/auth/session", "/profil", "/mesajlar/1", "/admin", "/favoriler", "/_next/image?url=x", "/icon-192.png?v=2", "/sw.js", "/manifest.webmanifest"];
  check("W2", "never caches pages, API, account, messages, admin, images API", never.every((p) => !cacheable(u(p))), never.filter((p) => cacheable(u(p))).join(","));
  check("W3", "ignores cross-origin assets", !cacheable(new URL("https://images.unsplash.com/_next/static/x.js")));

  const fire = (method: string, p: string, mode: string) => {
    const e: FakeEvent = { request: { method, url: u(p).toString(), mode }, responded: false, respondWith() { e.responded = true; }, waitUntil() {} };
    listeners.fetch!(e);
    return e.responded;
  };
  check("W4", "non-GET requests are never intercepted", !fire("POST", "/api/listings", "cors") && !fire("POST", "/giris", "navigate"));
  check("W5", "API and OAuth navigations go straight to the network", !fire("GET", "/api/auth/oauth/google/callback?code=x", "navigate") && !fire("GET", "/admin", "navigate"));
  check("W6", "data fetches (API, RSC) are not intercepted", !fire("GET", "/api/listings?count=1", "cors") && !fire("GET", "/profil?_rsc=1", "cors"));
  check("W7", "page navigations get network-first with offline fallback only", fire("GET", "/ara", "navigate") && fire("GET", "/profil", "navigate"));
  check("W8", "static assets are served cache-first", fire("GET", "/_next/static/chunks/a.js", "no-cors"));
  check("W9", "precache list is static-only", /const OFFLINE_URL = "\/offline\.html";/.test(src) && /PRECACHE = \[OFFLINE_URL, "\/icon-192\.png", "\/favicon-32x32\.png"\];/.test(src));
}

async function http() {
  if (!BASE) return;
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("PWA_TEST_BASE must be a local server.");
  const man = await fetch(`${BASE}/manifest.webmanifest`);
  const mj = (await man.json()) as { start_url?: string; display?: string };
  check("H1", "/manifest.webmanifest served", man.status === 200 && mj.start_url === "/" && mj.display === "standalone");
  const sw = await fetch(`${BASE}/sw.js`);
  check("H2", "/sw.js served as JavaScript, never cached by HTTP",
    sw.status === 200 && /javascript/.test(sw.headers.get("content-type") ?? "") && /no-cache/.test(sw.headers.get("cache-control") ?? ""),
    `${sw.headers.get("content-type")} | ${sw.headers.get("cache-control")}`);
  check("H3", "/sw.js allowed to control scope /", sw.headers.get("service-worker-allowed") === "/");
  const off = await fetch(`${BASE}/offline.html`);
  check("H4", "/offline.html served", off.status === 200 && (await off.text()).includes("İnternet bağlantısı yok"));

  for (const p of ["/", "/ara"]) {
    const res = await fetch(`${BASE}${p}`);
    const html = await res.text();
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!);
    const bad = hrefs.filter((h) => /play\.google\.com|apps\.apple\.com|\.apk(\?|$)|\.exe(\?|$)|\.dmg(\?|$)|\.msi(\?|$)|\.appimage|facebook\.com|linkedin\.com|youtube\.com|\/\/(www\.)?x\.com|twitter\.com/i.test(h));
    check(`H5${p === "/" ? "a" : "b"}`, `${p}: footer app section rendered, no fake store/APK/EXE/DMG or social links`,
      res.status === 200 && html.includes("ft-apps") && bad.length === 0 && hrefs.includes("https://www.instagram.com/alsatport"), bad.join(","));
  }
  const reg = await fetch(`${BASE}/`);
  check("H6", "page links the manifest", (await reg.text()).includes('rel="manifest"'));
}

async function main() {
  unit();
  serviceWorker();
  await http();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}
main();
