/**
 * Open-redirect / return-path checks for the login → /kurumsal-hesap flow.
 * Pure checks always run; HTTP checks run when RETURN_TEST_BASE points at a local `next start`.
 * Never point RETURN_TEST_BASE at production for the OAuth part (it only issues GETs, but keep it local).
 */
import { afterAuthHref, allowlistedReturn, safeNextPath } from "../src/lib/profile";
import { safeNextPath as oauthSafeNextPath } from "../src/lib/oauth/nextPath";

let pass = 0;
let fail = 0;
let skip = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  -> ${detail}` : ""}`);
}
function skipped(name: string, why: string) {
  skip++;
  console.log(`SKIP  ${name}  (${why})`);
}

const HOSTILE = [
  "https://evil.com",
  "http://evil.com",
  "//evil.com",
  "///evil.com",
  "/\\evil.com",
  "\\\\evil.com",
  "/..//evil.com",
  "/./..//evil.com",
  "/%2F%2Fevil.com",
  "/%5C%5Cevil.com",
  "javascript:alert(1)",
  "data:text/html,x",
  "https:evil.com",
  "evil.com",
  "/\tevil.com",
  "/\n/evil.com",
  " //evil.com",
  "%2F%2Fevil.com",
  "https%3A%2F%2Fevil.com",
];

function sameOrigin(path: string) {
  const base = "https://alsatport.com";
  return new URL(path, base).origin === base;
}

console.log("— client safeNextPath (src/lib/profile.ts)");
for (const raw of HOSTILE) {
  const out = safeNextPath(raw, "/fallback");
  check(`profile.safeNextPath stays on site for ${JSON.stringify(raw)}`, sameOrigin(out) && !out.startsWith("//"), out);
}
check("profile.safeNextPath keeps /kurumsal-hesap", safeNextPath("/kurumsal-hesap", "/x") === "/kurumsal-hesap");
check("profile.safeNextPath keeps /ilan-ver?x=1", safeNextPath("/ilan-ver?x=1", "/x") === "/ilan-ver?x=1");
check("profile.safeNextPath blocks auth loop /giris", safeNextPath("/giris?next=/x", "/fb") === "/fb");

console.log("— OAuth safeNextPath (src/lib/oauth/nextPath.ts)");
for (const raw of HOSTILE) {
  const out = oauthSafeNextPath(raw);
  check(`oauth.safeNextPath stays on site for ${JSON.stringify(raw)}`, sameOrigin(out) && !out.startsWith("//"), out);
}
check("oauth.safeNextPath keeps /kurumsal-hesap", oauthSafeNextPath("/kurumsal-hesap") === "/kurumsal-hesap");

console.log("— allowlist");
check("allowlistedReturn(/kurumsal-hesap)", allowlistedReturn("/kurumsal-hesap") === "/kurumsal-hesap");
check("allowlistedReturn(/kurumsal-hesap?x=1) strips query", allowlistedReturn("/kurumsal-hesap?x=1") === "/kurumsal-hesap");
check("allowlistedReturn(/isletme-paneli)", allowlistedReturn("/isletme-paneli") === "/isletme-paneli");
for (const raw of [...HOSTILE, "/admin", "/kurumsal-hesap-evil", "/profil", "/KURUMSAL-HESAP", "", null]) {
  check(`allowlistedReturn rejects ${JSON.stringify(raw)}`, allowlistedReturn(raw) === null);
}

console.log("— afterAuthHref");
function withUrl<T>(path: string, search: string, fn: () => T): T {
  const g = globalThis as unknown as { window?: unknown };
  const prev = g.window;
  g.window = { location: { pathname: path, search } };
  try {
    return fn();
  } finally {
    g.window = prev;
  }
}
const biz = "?next=%2Fkurumsal-hesap";
check("login + complete profile -> /kurumsal-hesap", withUrl("/giris", biz, () => afterAuthHref(false)) === "/kurumsal-hesap");
check("login + incomplete profile -> /kurumsal-hesap", withUrl("/giris", biz, () => afterAuthHref(true)) === "/kurumsal-hesap");
check(
  "signup -> e-mail verify carries next",
  withUrl("/kayit", biz, () => afterAuthHref(true, false, true)) === "/eposta-dogrula?sent=1&next=%2Fkurumsal-hesap",
);
check("signup without intent unchanged", withUrl("/kayit", "", () => afterAuthHref(true, false, true)) === "/eposta-dogrula?sent=1");
check("login without next unchanged (complete -> /)", withUrl("/giris", "", () => afterAuthHref(false)) === "/");
check("login without next unchanged (incomplete -> profile)", withUrl("/giris", "", () => afterAuthHref(true)) === "/profil/bilgilerim");
check("existing next=/ilan-ver still works", withUrl("/giris", "?next=%2Filan-ver", () => afterAuthHref(false)) === "/ilan-ver");
for (const raw of HOSTILE) {
  const out = withUrl("/giris", `?next=${encodeURIComponent(raw)}`, () => afterAuthHref(false)) ?? "";
  check(`afterAuthHref never leaves site for ${JSON.stringify(raw)}`, sameOrigin(out) && !out.startsWith("//"), out);
  const verify = withUrl("/kayit", `?next=${encodeURIComponent(raw)}`, () => afterAuthHref(true, false, true));
  check(`verify redirect drops hostile next ${JSON.stringify(raw)}`, verify === "/eposta-dogrula?sent=1", String(verify));
}

async function http() {
  const base = process.env.RETURN_TEST_BASE?.replace(/\/$/, "");
  if (!base) {
    skipped("HTTP checks", "RETURN_TEST_BASE not set");
    return;
  }
  console.log(`— HTTP (${base})`);
  const get = (path: string) => fetch(`${base}${path}`, { redirect: "manual" });

  const r1 = await get("/kurumsal-hesap");
  const loc1 = r1.headers.get("location") ?? "";
  check("guest /kurumsal-hesap -> /giris?next=/kurumsal-hesap", r1.status >= 300 && r1.status < 400 && new URL(loc1, base).pathname === "/giris" && new URL(loc1, base).searchParams.get("next") === "/kurumsal-hesap", `${r1.status} ${loc1}`);

  for (const path of ["/giris", "/kayit", "/giris?next=%2Fkurumsal-hesap", "/kayit?next=%2Fkurumsal-hesap", "/giris?next=https%3A%2F%2Fevil.com"]) {
    const r = await get(path);
    check(`GET ${path} -> 200`, r.status === 200, String(r.status));
  }

  const stateNext = async (next: string) => {
    const r = await get(`/api/auth/oauth/google/start?next=${encodeURIComponent(next)}`);
    const loc = r.headers.get("location") ?? "";
    if (loc.includes("oauth=off")) return { off: true as const };
    const state = new URL(loc).searchParams.get("state") ?? "";
    const payload = JSON.parse(Buffer.from(state.split(".")[1] ?? "", "base64url").toString("utf8")) as { next?: string };
    return { off: false as const, next: payload.next ?? "", host: new URL(loc).host };
  };
  const probe = await stateNext("/kurumsal-hesap");
  if (probe.off) {
    skipped("OAuth start state checks", "Google OAuth not configured locally");
    return;
  }
  check("OAuth start keeps next=/kurumsal-hesap in signed state", probe.next === "/kurumsal-hesap", probe.next);
  check("OAuth start redirects to the provider", /google\.com$/.test(probe.host), probe.host);
  for (const raw of HOSTILE) {
    const s = await stateNext(raw);
    const ok = !s.off && sameOrigin(s.next) && !s.next.startsWith("//") && new URL(s.next, "https://alsatport.com").host === "alsatport.com";
    check(`OAuth state stays on site for ${JSON.stringify(raw)}`, ok, s.off ? "off" : s.next);
  }
}

http()
  .catch((err) => {
    fail++;
    console.log(`FAIL  HTTP checks crashed: ${err instanceof Error ? err.message : String(err)}`);
  })
  .finally(() => {
    console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`);
    process.exit(fail ? 1 : 0);
  });
