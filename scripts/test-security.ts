/**
 * Server-side security regression suite. Runs ONLY against a local server + local database:
 *
 *   1. start the app locally in production mode on a local DB (e.g. `next start -p 3013`)
 *   2. SECURITY_TEST_BASE=http://localhost:3013 DATABASE_URL=<local> AUTH_SECRET=<same as server> npm run test:security
 *
 * It creates throw-away users (`*@sectest.invalid`) and removes them at the end.
 * Never point it at production: the script refuses non-loopback hosts.
 */
import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.SECURITY_TEST_BASE ?? "http://localhost:3013";
const DB = process.env.DATABASE_URL ?? "";
const SECRET = process.env.AUTH_SECRET ?? "";

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
function refuseUnlessLocal() {
  const app = new URL(BASE);
  if (!LOOPBACK.test(app.hostname)) throw new Error(`Refusing to run against non-local app: ${app.hostname}`);
  let dbHost = "";
  try {
    dbHost = new URL(DB).hostname;
  } catch {
    throw new Error("DATABASE_URL must point to the local test database.");
  }
  if (!LOOPBACK.test(dbHost)) throw new Error(`Refusing to run against non-local database host: ${dbHost}`);
  if (SECRET.length < 32) throw new Error("AUTH_SECRET (same value as the local server) is required.");
}
refuseUnlessLocal();

const prisma = new PrismaClient({ datasources: { db: { url: DB } } });
const key = new TextEncoder().encode(SECRET);
const TAG = randomBytes(4).toString("hex");
const PASSWORD = `Sec!${randomBytes(6).toString("base64url")}9a`;

type Result = { id: string; name: string; pass: boolean; detail: string };
const results: Result[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${name}${detail ? `  — ${detail}` : ""}`);
}

type Role = "member" | "seller" | "admin";
type TestUser = { id: string; email: string; username: string; role: Role };

async function makeUser(label: string, role: Role): Promise<TestUser> {
  const email = `${label}-${TAG}@sectest.invalid`;
  const username = `sectest_${label}_${TAG}`;
  const user = await prisma.user.create({
    data: {
      email,
      username,
      role,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      emailVerifiedAt: new Date(),
      profile: { create: { displayName: `Test ${label}`, fullName: `Test ${label}`, profileComplete: true } },
    },
  });
  return { id: user.id, email, username, role };
}

type Sess = { sid: string; cookie: string; csrf: string };
async function makeSession(
  u: TestUser,
  opts: { mfa?: boolean; stepUp?: boolean; ageMinutes?: number; tokenRole?: Role; noSid?: boolean } = {},
): Promise<Sess> {
  const created = new Date(Date.now() - (opts.ageMinutes ?? 0) * 60_000);
  const row = await prisma.userSession.create({
    data: {
      userId: u.id,
      method: opts.mfa ? "otp" : "password",
      mfaAt: opts.mfa ? created : null,
      stepUpAt: opts.stepUp ? new Date() : null,
      createdAt: created,
      lastSeenAt: created,
      expiresAt: new Date(Date.now() + 3600_000),
      userAgent: "security-test",
    },
  });
  const claims: Record<string, unknown> = {
    sub: u.id,
    id: u.id,
    role: opts.tokenRole ?? u.role,
    email: u.email,
    username: u.username,
    pc: 1,
    ev: 1,
    typ: "access",
  };
  if (!opts.noSid) claims.sid = row.id;
  const access = await new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setSubject(u.id)
    .sign(key);
  const csrf = randomBytes(32).toString("hex");
  return { sid: row.id, cookie: `ap_session=${access}; ap_csrf=${csrf}`, csrf };
}

async function call(method: string, path: string, s?: Sess | null, body?: unknown, extra: Record<string, string> = {}) {
  const first = await rawCall(method, path, s, body, extra);
  const wait = Number(first.headers.get("retry-after") ?? "0");
  // The edge limiter (per IP, ~1 min window) can trip when the suite is re-run back to back.
  if (first.status === 429 && wait > 0 && wait <= 65) {
    await new Promise((r) => setTimeout(r, wait * 1000 + 250));
    return rawCall(method, path, s, body, extra);
  }
  return first;
}

async function rawCall(method: string, path: string, s?: Sess | null, body?: unknown, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { ...extra };
  if (s) {
    headers.cookie = s.cookie;
    if (method !== "GET") headers["x-csrf-token"] = s.csrf;
  }
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
    /* not JSON */
  }
  return { status: res.status, json, text, headers: res.headers };
}

async function guestCsrf() {
  const csrf = randomBytes(32).toString("hex");
  return { sid: "", cookie: `ap_csrf=${csrf}`, csrf } satisfies Sess;
}

async function main() {
  console.log(`Security suite → ${BASE} (tag ${TAG})\n`);
  // Per-IP buckets (hashed keys, up to 1 h) are shared by every run from this machine; local DB only.
  await prisma.rateLimitBucket.deleteMany({});
  const admin = await makeUser("admin", "admin");
  const a = await makeUser("usera", "seller");
  const b = await makeUser("userb", "seller");
  const category = await prisma.category.findFirst({ select: { id: true } });
  if (!category) throw new Error("Local DB has no categories; run the base seed first.");
  const listing = await prisma.listing.create({
    data: {
      listingNo: `SECTEST-${TAG}`,
      sellerId: a.id,
      categoryId: category.id,
      title: "Security test listing",
      price: 1,
      city: "İstanbul",
      status: "draft",
    },
  });
  const convo = await prisma.conversation.create({ data: { buyerId: admin.id, sellerId: a.id, listingId: listing.id } });

  try {
    // ---------------- Guest ----------------
    let r = await call("GET", "/api/admin/overview");
    check("G1", "Guest → admin API denied", r.status === 401, `status ${r.status}`);
    r = await call("GET", "/api/account/sessions");
    check("G2", "Guest → account sessions denied", r.status === 401, `status ${r.status}`);
    r = await call("GET", `/api/conversations/${convo.id}`);
    check("G3", "Guest → conversation denied", r.status === 401, `status ${r.status}`);
    r = await call("GET", "/admin");
    check("G4", "Guest → /admin page redirects to login", [302, 303, 307, 308].includes(r.status) && (r.headers.get("location") ?? "").includes("/giris"), `status ${r.status}`);
    r = await call("POST", "/api/auth/login", null, { identifier: a.email, password: PASSWORD });
    check("G5", "Login without CSRF token rejected", r.status === 403, `status ${r.status}`);
    r = await call("POST", "/api/auth/login", await guestCsrf(), { identifier: a.email, password: PASSWORD }, { origin: "https://evil.example" });
    check("G6", "Login from foreign Origin rejected", r.status === 403, `status ${r.status}`);

    const known = await call("POST", "/api/auth/login", await guestCsrf(), { identifier: b.email, password: "Wrong!pass12" });
    const unknown = await call("POST", "/api/auth/login", await guestCsrf(), { identifier: `nobody-${TAG}@sectest.invalid`, password: "Wrong!pass12" });
    check(
      "G7",
      "Login: unknown vs wrong password indistinguishable",
      known.status === unknown.status && known.json.error === unknown.json.error,
      `${known.status}/${String(known.json.error)} vs ${unknown.status}/${String(unknown.json.error)}`,
    );

    let throttled = false;
    for (let i = 0; i < 8; i++) {
      const t = await call("POST", "/api/auth/login", await guestCsrf(), { identifier: `brute-${TAG}@sectest.invalid`, password: "Wrong!pass12" });
      if (t.status === 429) {
        throttled = true;
        break;
      }
    }
    check("G8", "Login brute force throttled (429)", throttled);

    r = await call("GET", "/api/media/..%2F..%2F..%2Fetc%2Fpasswd");
    check("G9", "Media path traversal blocked", r.status >= 400 && !/root:/.test(r.text), `status ${r.status}`);

    r = await call("GET", "/");
    const h = r.headers;
    const csp = h.get("content-security-policy") ?? "";
    check(
      "G10",
      "Security headers on HTML",
      !!csp && /frame-ancestors 'none'/.test(csp) && h.get("x-content-type-options") === "nosniff" && !!h.get("referrer-policy") && !!h.get("strict-transport-security"),
      `csp=${!!csp} nosniff=${h.get("x-content-type-options")} hsts=${!!h.get("strict-transport-security")}`,
    );
    check("G11", "No X-Powered-By header", !h.get("x-powered-by"));

    // ---------------- Authenticated user ----------------
    const sa = await makeSession(a);
    const sb = await makeSession(b);
    r = await call("GET", "/api/admin/overview", sa);
    check("U1", "User → admin API forbidden", r.status === 403, `status ${r.status}`);
    r = await call("PATCH", `/api/admin/users/${a.id}`, sa, { role: "admin" });
    check("U2", "User cannot self-promote via admin API", r.status === 403, `status ${r.status}`);
    const forged = await makeSession(a, { tokenRole: "admin", mfa: true });
    r = await call("GET", "/api/admin/overview", forged);
    check("U3", "Token claiming admin role ignored (DB role wins)", r.status === 403, `status ${r.status}`);

    r = await call("GET", `/api/conversations/${convo.id}`, sb);
    check("U4", "IDOR: other user's conversation not readable", r.status === 403 || r.status === 404, `status ${r.status}`);
    r = await call("GET", `/api/conversations/${convo.id}`, sa);
    check("U5", "Participant can read own conversation", r.status === 200, `status ${r.status}`);

    r = await call("PUT", `/api/listings/${listing.id}`, sb, { title: "hijacked" });
    const stillA = await prisma.listing.findUnique({ where: { id: listing.id }, select: { title: true, deletedAt: true } });
    check("U6", "IDOR: cannot edit another seller's listing", r.status >= 400 && stillA?.title === "Security test listing", `status ${r.status}`);
    r = await call("DELETE", `/api/listings/${listing.id}`, sb);
    const afterDel = await prisma.listing.findUnique({ where: { id: listing.id }, select: { deletedAt: true, status: true } });
    check("U7", "IDOR: cannot delete another seller's listing", r.status >= 400 && !afterDel?.deletedAt, `status ${r.status}`);
    r = await call("GET", `/api/listings/${listing.id}`, sb);
    check("U8", "Draft listing hidden from non-owner", r.status === 404, `status ${r.status}`);

    const sa2 = await makeSession(a);
    r = await call("DELETE", "/api/account/sessions", sb, { scope: "one", id: sa2.sid });
    const sa2Row = await prisma.userSession.findUnique({ where: { id: sa2.sid }, select: { revokedAt: true } });
    check("U9", "IDOR: cannot revoke another user's session", r.status === 404 && !sa2Row?.revokedAt, `status ${r.status}`);

    r = await call("GET", "/api/account/sessions", sa);
    const list = (r.json.sessions as { id: string; current: boolean }[] | undefined) ?? [];
    check("U10", "Session list is own-only and marks current", r.status === 200 && list.some((x) => x.id === sa.sid && x.current) && !list.some((x) => x.id === sb.sid), `n=${list.length}`);
    check("U11", "Session list exposes no raw IP/device hash", !/deviceHash|"ip_address"|\d+\.\d+\.\d+\.\d+/.test(r.text));

    r = await call("DELETE", "/api/account/sessions", sa, { scope: "others" });
    const other = await call("GET", "/api/account/sessions", sa2);
    const self = await call("GET", "/api/account/sessions", sa);
    check("U12", "Sign out other devices revokes them, keeps current", r.status === 200 && other.status === 401 && self.status === 200, `others=${other.status} self=${self.status}`);

    const legacy = await makeSession(a, { noSid: true });
    r = await call("GET", "/api/account/sessions", legacy);
    check("U13", "Legacy token without session id rejected", r.status === 401, `status ${r.status}`);
    r = await call("GET", "/mesajlar", legacy);
    check(
      "U14",
      "Legacy token treated as signed-out by middleware",
      [302, 303, 307, 308].includes(r.status) && (r.headers.get("location") ?? "").includes("/giris"),
      `status ${r.status}`,
    );

    const doomed = await makeSession(a);
    await prisma.userSession.update({ where: { id: doomed.sid }, data: { revokedAt: new Date(), revokedReason: "test" } });
    r = await call("GET", "/api/account/sessions", doomed);
    check("U15", "Revoked session rejected", r.status === 401, `status ${r.status}`);

    const out = await makeSession(a);
    await call("POST", "/api/auth/logout", out, {});
    const outRow = await prisma.userSession.findUnique({ where: { id: out.sid }, select: { revokedAt: true } });
    r = await call("GET", "/api/account/sessions", out);
    check("U16", "Logout revokes the server-side session", !!outRow?.revokedAt && r.status === 401, `status ${r.status}`);

    r = await call("GET", `/api/payments/${randomUUID()}`, sb);
    check("U17", "Unknown/foreign payment not readable", r.status === 404, `status ${r.status}`);

    r = await call("POST", "/api/account/profile", sb, {
      fullName: "Test Kullanıcı",
      phone: "05321234567",
      address: "Deneme Mahallesi Test Sokak No 1 Kadıköy İstanbul",
      role: "admin",
      email: "x@sectest.invalid",
      emailVerifiedAt: null,
      securityVersion: 99,
    });
    const bRow = await prisma.user.findUnique({ where: { id: b.id }, select: { role: true, email: true, securityVersion: true } });
    check(
      "U18",
      "Mass assignment: role/email/securityVersion not writable via profile",
      r.status === 200 && bRow?.role !== "admin" && bRow?.email === b.email && bRow?.securityVersion !== 99,
      `status ${r.status} role=${bRow?.role}`,
    );

    r = await call("POST", "/api/account/sessions", sa, {});
    check("U19", "Unsupported method not allowed", r.status === 405, `status ${r.status}`);

    // ---------------- Business-logic hardening ----------------
    const banned = await prisma.listing.create({
      data: { listingNo: `SECTEST-${TAG}-R`, sellerId: a.id, categoryId: category.id, title: "Security removed listing", price: 1, city: "İstanbul", status: "removed" },
    });
    r = await call("POST", "/api/listings/renew", sa, { id: banned.id });
    const bannedRow = await prisma.listing.findUnique({ where: { id: banned.id }, select: { status: true } });
    check("H1", "Moderator-removed listing cannot be self-renewed", r.status === 403 && bannedRow?.status === "removed", `status ${r.status} now=${bannedRow?.status}`);
    await prisma.listing.delete({ where: { id: banned.id } });

    const lapsed = await prisma.listing.create({
      data: {
        listingNo: `SECTEST-${TAG}-E`,
        sellerId: a.id,
        categoryId: category.id,
        title: "Security expired listing",
        description: "Security test listing description that is long enough to pass validation.",
        price: 1,
        city: "İstanbul",
        status: "expired",
        images: { create: { storageKey: `listings/${a.id}/sectest.jpg`, url: `/api/media/listings/${a.id}/sectest.jpg`, isCover: true } },
      },
    });
    r = await call("PUT", `/api/listings/${lapsed.id}`, sa, { status: "active" });
    const lapsedRow = await prisma.listing.findUnique({ where: { id: lapsed.id }, select: { status: true } });
    check("H7", "Expired listing not reactivated by an edit", r.status === 200 && lapsedRow?.status === "expired", `status ${r.status} ${String(r.json.error ?? "")} now=${lapsedRow?.status}`);
    await prisma.listing.delete({ where: { id: lapsed.id } });

    r = await call("POST", "/api/conversations", sb, { listingId: listing.id });
    const draftConvo = await prisma.conversation.count({ where: { listingId: listing.id, buyerId: b.id } });
    check("H2", "No new conversation on a non-active listing", r.status === 404 && draftConvo === 0, `status ${r.status}`);

    const msg = await prisma.message.create({ data: { conversationId: convo.id, senderId: a.id, body: "security test" } });
    r = await call("POST", "/api/reports", sb, { targetType: "message", messageId: msg.id, reason: "spam" });
    const strayReports = await prisma.report.count({ where: { reporterId: b.id } });
    check("H3", "Cannot report a message from someone else's conversation", r.status === 404 && strayReports === 0, `status ${r.status}`);
    r = await call("POST", "/api/reports", sb, { targetType: "user", reportedUserId: b.id, reason: "spam" });
    check("H4", "Cannot report yourself", r.status === 400, `status ${r.status}`);

    const stale = await makeSession(b, { ageMinutes: 60 });
    r = await call("POST", "/api/account/email/change/start", stale, { email: `moved-${TAG}@sectest.invalid` });
    check("H5", "Email change needs a recent sign-in", r.status === 403 && r.json.error === "auth.err.reauth", `status ${r.status} ${String(r.json.error)}`);
    r = await call("POST", "/api/account/email/change/start", sb, { email: b.email });
    check("H6", "Fresh session passes the email-change gate", r.status === 400 && r.json.error === "acct.email.same", `status ${r.status} ${String(r.json.error)}`);

    // ---------------- Phone scraping ----------------
    const PHONE = "05329876543";
    await prisma.profile.update({ where: { userId: a.id }, data: { phone: PHONE, phoneVerifiedAt: new Date() } });
    const live = await prisma.listing.create({
      data: { listingNo: `SECTEST-${TAG}-P`, sellerId: a.id, categoryId: category.id, title: "Security phone listing", price: 1, city: "İstanbul", status: "active" },
    });
    const digits = (s: string) => s.replace(/\D/g, "");
    const leaks = (text: string) => digits(text).includes(PHONE.slice(1)) || text.includes(PHONE);
    r = await call("GET", `/api/listings/${live.id}`);
    check("P1", "Guest listing JSON has no full seller phone", r.status === 200 && !leaks(r.text), `status ${r.status}`);
    r = await call("GET", `/api/listings/${live.id}`, sb);
    check("P2", "Signed-in listing JSON has no full seller phone", r.status === 200 && !leaks(r.text), `status ${r.status}`);
    r = await call("GET", `/api/listings?sellerId=${a.id}`, sb);
    check("P3", "Bulk listing API has no full seller phones", r.status === 200 && !leaks(r.text), `status ${r.status}`);
    r = await call("GET", `/ilan/${live.id}`);
    check("P4", "Listing HTML has no full seller phone", r.status === 200 && !leaks(r.text), `status ${r.status}`);
    r = await call("POST", `/api/listings/${live.id}/phone`, await guestCsrf(), {});
    check("P5", "Guest cannot reveal phone", r.status === 401, `status ${r.status}`);
    const reader = await makeUser("reader", "member");
    const sr = await makeSession(reader);
    r = await call("POST", `/api/listings/${live.id}/phone`, sr, {});
    check("P6", "Verified user can reveal one phone", r.status === 200 && r.json.phone === PHONE, `status ${r.status}`);
    r = await call("POST", `/api/listings/${listing.id}/phone`, sr, {});
    check("P7", "Draft listing phone not revealable by others", r.status === 404, `status ${r.status}`);
    let capped = false;
    for (let i = 0; i < 25 && !capped; i++) {
      const t = await call("POST", `/api/listings/${live.id}/phone`, sr, {});
      // A long Retry-After means the per-account reveal cap fired, not the 1-minute edge limiter.
      if (t.status === 429 && Number(t.headers.get("retry-after") ?? "0") > 65) capped = true;
    }
    check("P8", "Phone reveal is rate limited per account", capped);
    await prisma.listing.delete({ where: { id: live.id } });

    // ---------------- Admin ----------------
    const noMfa = await makeSession(admin);
    r = await call("GET", "/api/admin/overview", noMfa);
    check("A1", "Admin without 2FA session denied", r.status === 403 && r.json.error === "auth.err.adminMfa", `status ${r.status} ${String(r.json.error)}`);
    const mfa = await makeSession(admin, { mfa: true, ageMinutes: 60 });
    r = await call("GET", "/api/admin/overview", mfa);
    check("A2", "Admin with 2FA session allowed", r.status === 200, `status ${r.status}`);
    r = await call("GET", "/api/admin/overview", null, undefined, {});
    check("A3", "Admin API still denied without cookie", r.status === 401);

    const sbLive = await makeSession(b);
    r = await call("PATCH", `/api/admin/users/${b.id}`, mfa, { banned: true });
    const bBan = await prisma.user.findUnique({ where: { id: b.id }, select: { bannedAt: true } });
    check("A4", "Ban requires fresh step-up", r.status === 403 && r.json.error === "auth.err.stepUp" && !bBan?.bannedAt, `status ${r.status} ${String(r.json.error)}`);

    const fresh = await makeSession(admin, { mfa: true, ageMinutes: 60, stepUp: true });
    r = await call("PATCH", `/api/admin/users/${b.id}`, fresh, { banned: true });
    const bLive = await call("GET", "/api/account/sessions", sbLive);
    check("A5", "Ban with step-up succeeds and revokes target sessions", r.status === 200 && bLive.status === 401, `ban=${r.status} target=${bLive.status}`);
    const audit = await prisma.auditLog.findFirst({ where: { actorId: admin.id, entityId: b.id }, orderBy: { createdAt: "desc" } });
    check("A6", "Admin action written to audit log", !!audit, audit?.action ?? "none");
    await call("PATCH", `/api/admin/users/${b.id}`, fresh, { banned: false });

    r = await call("PATCH", `/api/admin/users/${admin.id}`, fresh, { banned: true });
    check("A7", "Admin cannot ban themselves", r.status >= 400, `status ${r.status}`);

    r = await call("POST", `/api/admin/listings/${listing.id}`, mfa, { action: "remove" });
    const notRemoved = await prisma.listing.findUnique({ where: { id: listing.id }, select: { status: true } });
    check("A8", "Listing removal requires step-up", r.status === 403 && notRemoved?.status !== "removed", `status ${r.status}`);

    r = await call("POST", "/api/admin/step-up", mfa, { action: "confirm", otp: "000000" });
    check("A9", "Step-up rejects a wrong code", r.status === 401, `status ${r.status}`);

    r = await call("GET", "/api/admin/reports?status=bogus", mfa);
    check("A11", "Admin reports rejects unknown status filter", r.status === 400, `status ${r.status}`);

    r = await call("POST", "/api/admin/test-email", sr, {});
    check("A12", "Test mail denied for non-admin", r.status === 403, `status ${r.status}`);
    r = await call("POST", "/api/admin/test-email", mfa, {});
    check("A13", "Test mail requires fresh step-up", r.status === 403 && r.json.error === "auth.err.stepUp", `status ${r.status} ${String(r.json.error)}`);
    r = await call("POST", "/api/admin/test-email", null, {}, { cookie: fresh.cookie });
    check("A14", "Test mail requires CSRF token", r.status === 403 && r.json.error === "auth.err.csrf", `status ${r.status} ${String(r.json.error)}`);
    r = await call("POST", "/api/admin/test-email", fresh, { to: "someone-else@example.com" });
    await new Promise((res) => setTimeout(res, 800));
    const mailAudit = await prisma.auditLog.findFirst({
      where: { actorId: admin.id, action: { startsWith: "admin.test_mail" } },
      orderBy: { createdAt: "desc" },
    });
    // Local runs have no mail transport, so the authorised call reaches the sender and reports 503.
    check(
      "A15",
      "Test mail passes gates, ignores supplied address, audits without it",
      r.status === 503 && r.json.error === "auth.err.mail" && !!mailAudit && !JSON.stringify(mailAudit.payload).includes("@"),
      `status ${r.status} audit=${mailAudit?.action ?? "none"}`,
    );

    const errs = [await call("GET", "/api/listings/not-a-uuid"), await call("POST", "/api/auth/login", await guestCsrf(), "{bad json" as unknown)];
    check("A10", "Error responses leak no stack traces", errs.every((e) => !/at \w+ \(|node_modules|prisma\./i.test(e.text)));
  } finally {
    await prisma.message.deleteMany({ where: { conversationId: convo.id } });
    await prisma.conversation.deleteMany({ where: { id: convo.id } });
    await prisma.listing.deleteMany({ where: { id: listing.id } });
    const tagged = await prisma.user.findMany({ where: { email: { endsWith: `-${TAG}@sectest.invalid` } }, select: { id: true } });
    const ids = tagged.map((u) => u.id);
    await prisma.report.deleteMany({ where: { reporterId: { in: ids } } });
    await prisma.listing.deleteMany({ where: { sellerId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }

  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exit(1);
});
