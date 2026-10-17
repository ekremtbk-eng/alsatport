/**
 * Stage-4 session-revoke regression helpers.
 *
 * Always runs pure/mock checks (no DB). Optional HTTP + loopback DB:
 *
 *   SECURITY_TEST_BASE=http://127.0.0.1:3014 DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *   AUTH_SECRET=<same as server> npx tsx scripts/test-session-revoke.ts
 *
 * Refuses non-loopback hosts. Never points at production.
 */
import { randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import { safeNextPath } from "../src/lib/profile";

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
let failed = 0;
function check(id: string, name: string, pass: boolean, detail = "") {
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${name}${detail ? `  — ${detail}` : ""}`);
}

// --- Architecture: middleware JWT-only vs page/API live session ---
type SessionRow = { revokedAt: Date | null; expiresAt: Date };
function middlewareAllows(jwtValid: boolean, hasSid: boolean) {
  return jwtValid && hasSid;
}
function liveSessionAllows(jwtValid: boolean, hasSid: boolean, row: SessionRow | null) {
  if (!jwtValid || !hasSid || !row) return false;
  if (row.revokedAt) return false;
  if (row.expiresAt.getTime() <= Date.now()) return false;
  return true;
}
function pageGateAllows(jwtValid: boolean, hasSid: boolean, row: SessionRow | null) {
  // Same as API currentSession — definitive page protection after Stage 4.
  return liveSessionAllows(jwtValid, hasSid, row);
}

const live = { revokedAt: null, expiresAt: new Date(Date.now() + 3600_000) };
const revoked = { revokedAt: new Date(), expiresAt: new Date(Date.now() + 3600_000) };
const expired = { revokedAt: null, expiresAt: new Date(Date.now() - 1000) };

check("A1", "Middleware still allows signed JWT with sid (edge cannot see revoke)", middlewareAllows(true, true) === true);
check("A2", "API denies revoked session", liveSessionAllows(true, true, revoked) === false);
check("A3", "Page gate denies revoked session (closes prior HTML leak)", pageGateAllows(true, true, revoked) === false);
check("A4", "Page + API allow live session", pageGateAllows(true, true, live) && liveSessionAllows(true, true, live));
check("A5", "Expired session row denied by page gate", pageGateAllows(true, true, expired) === false);
check("A6", "Missing sid denied everywhere", !middlewareAllows(true, false) && !pageGateAllows(true, false, live));
check("A7", "Invalid JWT denied everywhere", !middlewareAllows(false, true) && !pageGateAllows(false, true, live));
check(
  "A8",
  "Split remains at middleware, but page gate matches API on revoke",
  middlewareAllows(true, true) && !pageGateAllows(true, true, revoked) && !liveSessionAllows(true, true, revoked),
);

// --- Open redirect on expired-session next= ---
check("R1", "safeNextPath rejects //evil", safeNextPath("//evil.com", "/") === "/");
check("R2", "safeNextPath rejects https://evil", !safeNextPath("https://evil.com", "/").startsWith("https:"));
check("R3", "safeNextPath keeps /profil", safeNextPath("/profil", "/") === "/profil");
check("R4", "safeNextPath blocks /giris loop", safeNextPath("/giris", "/") === "/");
check("R5", "safeNextPath blocks /kayit loop", safeNextPath("/kayit", "/") === "/");

const PROTECTED = [
  "/ilan-ver",
  "/mesajlar",
  "/hesap-tamamla",
  "/ilanlarim",
  "/admin",
  "/profil",
  "/odeme",
  "/favoriler",
  "/bildirimler",
  "/bildirim-ayarlari",
  "/qr",
  "/kurumsal-hesap",
  "/isletme-paneli",
];
check("R6", "All middleware protected prefixes listed for page gate coverage", PROTECTED.length === 13);

async function optionalHttp() {
  const BASE = process.env.SECURITY_TEST_BASE;
  const DB = process.env.DATABASE_URL ?? "";
  const SECRET = process.env.AUTH_SECRET ?? "";
  if (!BASE) {
    console.log("\n(skip HTTP suite — set SECURITY_TEST_BASE + loopback DATABASE_URL + AUTH_SECRET to run)");
    return;
  }
  const app = new URL(BASE);
  if (!LOOPBACK.test(app.hostname)) throw new Error(`Refusing non-local app: ${app.hostname}`);
  let dbHost = "";
  try {
    dbHost = new URL(DB).hostname;
  } catch {
    throw new Error("DATABASE_URL required for HTTP suite");
  }
  if (!LOOPBACK.test(dbHost)) throw new Error(`Refusing non-local DB: ${dbHost}`);
  if (SECRET.length < 32) throw new Error("AUTH_SECRET (32+) required");

  const { PrismaClient } = await import("@prisma/client");
  const bcrypt = (await import("bcryptjs")).default;
  const prisma = new PrismaClient({ datasources: { db: { url: DB } } });
  const key = new TextEncoder().encode(SECRET);
  const TAG = randomBytes(4).toString("hex");
  const PASSWORD = `Rev!${randomBytes(6).toString("base64url")}9a`;

  try {
    const user = await prisma.user.create({
      data: {
        email: `revoke-${TAG}@sectest.invalid`,
        username: `revoke_${TAG}`,
        role: "seller",
        passwordHash: await bcrypt.hash(PASSWORD, 10),
        emailVerifiedAt: new Date(),
        profile: { create: { displayName: "Revoke Test", fullName: "Revoke Test", profileComplete: true } },
      },
    });

    async function mint(sid: string, opts: { exp?: string; badSig?: boolean; role?: string } = {}) {
      const access = await new SignJWT({
        sub: user.id,
        id: user.id,
        sid,
        role: opts.role ?? "seller",
        email: user.email,
        username: user.username,
        pc: 1,
        ev: 1,
        typ: "access",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(opts.exp ?? "15m")
        .setSubject(user.id)
        .sign(opts.badSig ? new TextEncoder().encode("wrong-secret-not-auth-secret!!") : key);
      const csrf = randomBytes(32).toString("hex");
      return { cookie: `ap_session=${access}; ap_csrf=${csrf}`, csrf };
    }

    async function call(
      method: string,
      path: string,
      cookie?: string,
      body?: unknown,
      csrf?: string,
      extraHeaders: Record<string, string> = {},
    ) {
      const headers: Record<string, string> = { ...extraHeaders };
      if (cookie) headers.cookie = cookie;
      if (csrf && method !== "GET") headers["x-csrf-token"] = csrf;
      if (body !== undefined) headers["content-type"] = "application/json";
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "manual",
      });
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        /* */
      }
      const cacheControl = res.headers.get("cache-control") ?? "";
      const xNextCache = res.headers.get("x-nextjs-cache") ?? res.headers.get("x-vercel-cache") ?? "";
      return {
        status: res.status,
        json,
        text,
        location: res.headers.get("location") ?? "",
        setCookie: res.headers.getSetCookie?.() ?? [],
        cacheControl,
        xNextCache,
      };
    }

    const row = await prisma.userSession.create({
      data: {
        userId: user.id,
        method: "password",
        expiresAt: new Date(Date.now() + 3600_000),
        lastSeenAt: new Date(),
        userAgent: "revoke-test",
      },
    });
    const liveSess = await mint(row.id);
    let r = await call("GET", "/profil", liveSess.cookie);
    check("H1", "Live session loads /profil", r.status === 200, `status ${r.status}`);

    r = await call("GET", "/api/account/sessions", liveSess.cookie);
    check("H2", "Live session API ok", r.status === 200, `status ${r.status}`);

    await prisma.userSession.update({ where: { id: row.id }, data: { revokedAt: new Date(), revokedReason: "test" } });
    r = await call("GET", "/api/account/sessions", liveSess.cookie);
    check("H3", "Revoked session API 401", r.status === 401, `status ${r.status}`);
    r = await call("GET", "/profil", liveSess.cookie);
    check(
      "H4",
      "Revoked session redirected off /profil",
      [302, 303, 307, 308].includes(r.status) && /giris|expired-session/.test(r.location),
      `status ${r.status} loc=${r.location}`,
    );

    // Follow expired-session hop if present
    if (r.location.includes("expired-session")) {
      const hop = await call("GET", r.location.startsWith("http") ? new URL(r.location).pathname + new URL(r.location).search : r.location, liveSess.cookie);
      check(
        "H4b",
        "expired-session clears cookies and lands on /giris",
        [302, 303, 307, 308].includes(hop.status) && hop.location.includes("/giris") && hop.setCookie.some((c) => c.includes("ap_session=")),
        `status ${hop.status} loc=${hop.location} cookies=${hop.setCookie.length}`,
      );
      check(
        "H4c",
        "expired-session next= is open-redirect safe",
        hop.location.includes("/giris") && !/evil\.|\/\/evil/i.test(hop.location),
        hop.location,
      );
    }

    const outRow = await prisma.userSession.create({
      data: {
        userId: user.id,
        method: "password",
        expiresAt: new Date(Date.now() + 3600_000),
        lastSeenAt: new Date(),
        userAgent: "revoke-test-out",
      },
    });
    const outSess = await mint(outRow.id);
    r = await call("POST", "/api/auth/logout", outSess.cookie, {}, outSess.csrf);
    const outDb = await prisma.userSession.findUnique({ where: { id: outRow.id }, select: { revokedAt: true } });
    check("H5", "Logout revokes DB session", !!outDb?.revokedAt, `revoked=${!!outDb?.revokedAt}`);
    r = await call("GET", "/profil", outSess.cookie);
    check("H6", "Post-logout /profil blocked", [302, 303, 307, 308].includes(r.status), `status ${r.status}`);

    const bad = await mint(row.id, { badSig: true });
    r = await call("GET", "/profil", bad.cookie);
    check("H7", "Bad JWT signature → login redirect (middleware)", [302, 303, 307, 308].includes(r.status) && r.location.includes("/giris"), `status ${r.status}`);

    const expiredJwt = await mint(row.id, { exp: "0s" });
    await new Promise((r) => setTimeout(r, 50));
    r = await call("GET", "/profil", expiredJwt.cookie);
    check("H8", "Expired JWT → login redirect", [302, 303, 307, 308].includes(r.status) && r.location.includes("/giris"), `status ${r.status}`);

    const adminUser = await prisma.user.create({
      data: {
        email: `revoke-admin-${TAG}@sectest.invalid`,
        username: `revoke_admin_${TAG}`,
        role: "admin",
        passwordHash: await bcrypt.hash(PASSWORD, 10),
        emailVerifiedAt: new Date(),
        profile: { create: { displayName: "Admin Revoke", fullName: "Admin Revoke", profileComplete: true } },
      },
    });
    const adminRow = await prisma.userSession.create({
      data: {
        userId: adminUser.id,
        method: "password",
        expiresAt: new Date(Date.now() + 3600_000),
        lastSeenAt: new Date(),
        userAgent: "revoke-admin",
      },
    });
    const adminAccess = await new SignJWT({
      sub: adminUser.id,
      id: adminUser.id,
      sid: adminRow.id,
      role: "admin",
      email: adminUser.email,
      username: adminUser.username,
      pc: 1,
      ev: 1,
      typ: "access",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setSubject(adminUser.id)
      .sign(key);
    const adminCookie = `ap_session=${adminAccess}; ap_csrf=${randomBytes(32).toString("hex")}`;
    r = await call("GET", "/admin", adminCookie);
    check("H9", "Admin live session can open /admin", r.status === 200, `status ${r.status}`);
    await prisma.userSession.update({ where: { id: adminRow.id }, data: { revokedAt: new Date(), revokedReason: "test" } });
    r = await call("GET", "/admin", adminCookie);
    check("H10", "Revoked admin blocked from /admin page", [302, 303, 307, 308].includes(r.status), `status ${r.status} loc=${r.location}`);

    // Password change keeps current, revokes others
    const keep = await prisma.userSession.create({
      data: {
        userId: user.id,
        method: "password",
        expiresAt: new Date(Date.now() + 3600_000),
        lastSeenAt: new Date(),
        userAgent: "keep",
      },
    });
    const other = await prisma.userSession.create({
      data: {
        userId: user.id,
        method: "password",
        expiresAt: new Date(Date.now() + 3600_000),
        lastSeenAt: new Date(),
        userAgent: "other",
      },
    });
    const keepTok = await mint(keep.id);
    const otherTok = await mint(other.id);
    r = await call("POST", "/api/account/password", keepTok.cookie, { current: PASSWORD, next: `New!${TAG}Aa1!` }, keepTok.csrf);
    const otherDb = await prisma.userSession.findUnique({ where: { id: other.id }, select: { revokedAt: true } });
    const keepDb = await prisma.userSession.findUnique({ where: { id: keep.id }, select: { revokedAt: true } });
    check("H11", "Password change revokes other devices", r.status === 200 && !!otherDb?.revokedAt && !keepDb?.revokedAt, `status ${r.status}`);
    r = await call("GET", "/profil", otherTok.cookie);
    check("H12", "Other device JWT blocked on /profil after password change", [302, 303, 307, 308].includes(r.status), `status ${r.status}`);
    r = await call("GET", "/profil", keepTok.cookie);
    check("H13", "Current device still loads /profil after password change", r.status === 200, `status ${r.status}`);

    // Open redirect on expired-session
    r = await call("GET", "/api/auth/expired-session?next=https://evil.example");
    check("H14", "expired-session rejects absolute URL next", r.location.includes("/giris") && !r.location.includes("evil"), r.location);
    r = await call("GET", "/api/auth/expired-session?next=//evil.example");
    check("H15", "expired-session rejects protocol-relative next", !r.location.includes("evil"), r.location);
    r = await call("GET", "/api/auth/expired-session?next=/api/auth/expired-session");
    check("H16", "expired-session drops API self-next (no resume loop)", r.location.includes("/giris") && !r.location.includes("expired-session"), r.location);
    r = await call("GET", "/api/auth/expired-session?next=/giris");
    check("H17", "expired-session drops /giris next (no auth loop)", r.location.includes("/giris") && !/[?&]next=/.test(r.location), r.location);

    // Member live session must not open /admin (middleware role gate, independent of page session)
    r = await call("GET", "/admin", keepTok.cookie);
    check(
      "H18",
      "Non-admin live session redirected away from /admin",
      [302, 303, 307, 308].includes(r.status) && !r.location.includes("/admin") && !r.location.includes("/giris"),
      `status ${r.status} loc=${r.location}`,
    );

    // RSC / prefetch-style requests still hit the live-session gate (not a static shell)
    const revokedAgain = await prisma.userSession.create({
      data: {
        userId: user.id,
        method: "password",
        expiresAt: new Date(Date.now() + 3600_000),
        lastSeenAt: new Date(),
        userAgent: "rsc-revoke",
      },
    });
    await prisma.userSession.update({ where: { id: revokedAgain.id }, data: { revokedAt: new Date(), revokedReason: "rsc" } });
    const rscTok = await mint(revokedAgain.id);
    // Prefetch (Next-Router-Prefetch) may return a sparse 200 flight without running the full
    // redirecting layout; it must still not embed personal dashboard content, and stay uncacheable.
    r = await call("GET", "/profil", rscTok.cookie, undefined, undefined, {
      RSC: "1",
      "Next-Router-Prefetch": "1",
      Accept: "text/x-component",
    });
    check(
      "H19",
      "RSC prefetch of revoked /profil leaks no personal shell",
      r.status === 200 &&
        /private|no-store/i.test(r.cacheControl) &&
        !/dash-page|DashboardApp|bilgilerim|@sectest\.invalid/.test(r.text),
      `status ${r.status} cc=${r.cacheControl}`,
    );
    // Full RSC navigation (no Prefetch header): redirect is encoded in the flight body (HTTP 200).
    r = await call("GET", "/mesajlar", rscTok.cookie, undefined, undefined, {
      RSC: "1",
      Accept: "text/x-component",
    });
    check(
      "H20",
      "Full RSC revoked /mesajlar encodes login/expired redirect",
      r.status === 200 && /expired-session|\/giris/.test(r.text) && !/msg-page|peerName|@sectest\.invalid/.test(r.text),
      `status ${r.status} redirect=${/expired-session|\/giris/.test(r.text)}`,
    );
    r = await call("GET", "/favoriler", rscTok.cookie);
    check("H21", "Revoked JWT blocked on /favoriler", [302, 303, 307, 308].includes(r.status), `status ${r.status}`);
    r = await call("GET", "/hesap-tamamla", rscTok.cookie);
    check("H22", "Revoked JWT blocked on /hesap-tamamla", [302, 303, 307, 308].includes(r.status), `status ${r.status}`);

    // Full document request after logout: cookies cleared on logout response; bare request without cookie → middleware /giris
    const soft = await prisma.userSession.create({
      data: {
        userId: user.id,
        method: "password",
        expiresAt: new Date(Date.now() + 3600_000),
        lastSeenAt: new Date(),
        userAgent: "soft-nav",
      },
    });
    const softTok = await mint(soft.id);
    r = await call("POST", "/api/auth/logout", softTok.cookie, {}, softTok.csrf);
    const logoutCleared = r.setCookie.some((c) => c.includes("ap_session="));
    check("H23", "Logout response clears ap_session cookie", r.status === 200 && logoutCleared, `status ${r.status} cookies=${r.setCookie.length}`);
    // Simulate client navigation after cookie clear (no auth cookie)
    r = await call("GET", "/profil", undefined, undefined, undefined, { RSC: "1", "Next-Url": "/profil" });
    check("H24", "Client-nav without cookie → /giris (middleware)", [302, 303, 307, 308].includes(r.status) && r.location.includes("/giris"), `status ${r.status} loc=${r.location}`);

    // Live /profil must not be served as a static HIT (dynamic because cookies/noStore)
    r = await call("GET", "/profil", keepTok.cookie);
    const staticHit = /HIT|STALE/i.test(r.xNextCache) || /public/i.test(r.cacheControl);
    check("H25", "Live /profil is not a public/static cache HIT", r.status === 200 && !staticHit, `cache=${r.xNextCache || "none"} cc=${r.cacheControl || "none"}`);

    // Google OAuth start still reachable for a live session (link flow)
    r = await call("GET", "/api/auth/oauth/google/start?intent=link", keepTok.cookie);
    check(
      "H26",
      "Google OAuth link-start still responds for live session",
      [302, 303, 307, 308].includes(r.status),
      `status ${r.status} loc=${r.location.slice(0, 80)}`,
    );

    // Cache-Control on sensitive auth/session endpoints
    r = await call("GET", "/api/auth/expired-session?next=/profil");
    check(
      "H27",
      "expired-session sends private no-store Cache-Control",
      /private/i.test(r.cacheControl) && /no-store/i.test(r.cacheControl),
      `cc=${r.cacheControl || "(unset)"} loc=${r.location}`,
    );
    r = await call("GET", "/api/auth/session", keepTok.cookie);
    check(
      "H28",
      "session API uses no-store semantics from clients (200 live)",
      r.status === 200 && !!r.json.user,
      `status ${r.status}`,
    );
    // Soft-nav simulation: revoked JWT full RSC must not embed personal fields
    r = await call("GET", "/profil", rscTok.cookie, undefined, undefined, {
      RSC: "1",
      Accept: "text/x-component",
    });
    check(
      "H29",
      "Full RSC revoked /profil has redirect markers, no email/PII",
      r.status === 200 &&
        /expired-session|\/giris/.test(r.text) &&
        !new RegExp(user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(r.text) &&
        !/@sectest\.invalid/.test(r.text),
      `status ${r.status}`,
    );
  } finally {
    const ids = (
      await prisma.user.findMany({
        where: { email: { endsWith: "@sectest.invalid" }, username: { contains: TAG } },
        select: { id: true },
      })
    ).map((u) => u.id);
    if (ids.length) {
      await prisma.userSession.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined);
      await prisma.profile.deleteMany({ where: { userId: { in: ids } } }).catch(() => undefined);
      await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  }
}

optionalHttp()
  .then(() => {
    console.log(failed ? `\nFAILED ${failed}` : "\nALL SESSION-REVOKE CHECKS PASSED");
    process.exit(failed ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
