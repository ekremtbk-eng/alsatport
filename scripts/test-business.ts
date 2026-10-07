/**
 * Corporate store flow test. Runs ONLY against a local server + local database (same setup as test-security):
 *
 *   BUSINESS_TEST_BASE=http://localhost:3013 DATABASE_URL=<local> AUTH_SECRET=<same as server> npx tsx scripts/test-business.ts
 *
 * Flow: member applies → validation → admin reject → resubmit → admin approve (step-up) → public store page →
 * corporate user posts a listing → store ref on the listing → owner edits → contact gate → admin revoke.
 * Creates throw-away users (`*@biztest.invalid`) and removes them, their store and uploads at the end.
 */
import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BUSINESS_TEST_BASE ?? process.env.SECURITY_TEST_BASE ?? "http://localhost:3013";
const DB = process.env.DATABASE_URL ?? "";
const SECRET = process.env.AUTH_SECRET ?? "";
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;

function refuseUnlessLocal() {
  if (!LOOPBACK.test(new URL(BASE).hostname)) throw new Error("Refusing to run against a non-local app.");
  let dbHost = "";
  try {
    dbHost = new URL(DB).hostname;
  } catch {
    throw new Error("DATABASE_URL must point to the local test database.");
  }
  if (!LOOPBACK.test(dbHost)) throw new Error("Refusing to run against a non-local database host.");
  if (SECRET.length < 32) throw new Error("AUTH_SECRET (same value as the local server) is required.");
}
refuseUnlessLocal();

const prisma = new PrismaClient({ datasources: { db: { url: DB } } });
const key = new TextEncoder().encode(SECRET);
const TAG = randomBytes(4).toString("hex");

type Result = { id: string; name: string; pass: boolean; detail: string };
const results: Result[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${name}${detail ? `  — ${detail}` : ""}`);
}

type Role = "member" | "seller" | "admin";
type TestUser = { id: string; email: string; username: string; role: Role };

async function makeUser(label: string, role: Role, complete = false): Promise<TestUser> {
  const email = `${label}-${TAG}@biztest.invalid`;
  const username = `biztest_${label}_${TAG}`;
  const user = await prisma.user.create({
    data: {
      email,
      username,
      role,
      passwordHash: await bcrypt.hash(randomBytes(12).toString("base64url"), 10),
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: `Biz ${label}`,
          fullName: `Biz Test ${label}`,
          profileComplete: complete,
          ...(complete ? { phone: "5321234567", address: "Moda Caddesi No:12 Kadıköy İstanbul", city: "İstanbul" } : {}),
        },
      },
    },
  });
  return { id: user.id, email, username, role };
}

type Sess = { cookie: string; csrf: string };
/** `ageMinutes` back-dates login/2FA: a 2FA done within the last 15 min counts as a fresh step-up. */
async function makeSession(u: TestUser, opts: { mfa?: boolean; stepUp?: boolean; ageMinutes?: number } = {}): Promise<Sess> {
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
      userAgent: "business-test",
    },
  });
  const access = await new SignJWT({ sub: u.id, id: u.id, sid: row.id, role: u.role, email: u.email, username: u.username, pc: 1, ev: 1, typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setSubject(u.id)
    .sign(key);
  const csrf = randomBytes(32).toString("hex");
  return { cookie: `ap_session=${access}; ap_csrf=${csrf}`, csrf };
}

type Res = { status: number; json: Record<string, unknown>; text: string; headers: Headers };

async function send(method: string, p: string, s: Sess | null, body?: BodyInit, contentType?: string): Promise<Res> {
  for (let attempt = 0; ; attempt++) {
    const headers: Record<string, string> = {};
    if (s) {
      headers.cookie = s.cookie;
      if (method !== "GET") headers["x-csrf-token"] = s.csrf;
    }
    if (contentType) headers["content-type"] = contentType;
    const res = await fetch(`${BASE}${p}`, { method, headers, body, redirect: "manual" });
    const text = await res.text();
    const wait = Number(res.headers.get("retry-after") ?? "0");
    if (res.status === 429 && wait > 0 && wait <= 65 && attempt === 0) {
      await new Promise((r) => setTimeout(r, wait * 1000 + 250));
      continue;
    }
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      /* HTML */
    }
    return { status: res.status, json, text, headers: res.headers };
  }
}

const call = (method: string, p: string, s: Sess | null, body?: unknown) =>
  send(method, p, s, body === undefined ? undefined : JSON.stringify(body), body === undefined ? undefined : "application/json");

async function upload(p: string, s: Sess, bytes: Buffer, filename: string, type: string, extra: Record<string, string> = {}) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type }), filename);
  for (const [k, v] of Object.entries(extra)) form.append(k, v);
  return send("POST", p, s, form);
}

async function png(width: number, height: number, color: string) {
  return sharp({ create: { width, height, channels: 3, background: color } })
    .composite([{ input: Buffer.from(`<svg width="${width}" height="${height}"><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 3}" fill="#ffffff"/></svg>`) }])
    .png()
    .toBuffer();
}

const TAX_NUMBER = "1234567890";
const TAX_OFFICE = `Kadıköy VD ${TAG}`;
const STORE_NAME = `Biztest Elektronik ${TAG}`;

async function main() {
  console.log(`Business flow → ${BASE} (tag ${TAG})\n`);
  await prisma.rateLimitBucket.deleteMany({});
  const admin = await makeUser("admin", "admin");
  const corp = await makeUser("corp", "seller", true);
  const other = await makeUser("other", "member");
  const sCorp = await makeSession(corp);
  const sOther = await makeSession(other);
  const sAdminNoStep = await makeSession(admin, { mfa: true, ageMinutes: 60 });
  const sAdmin = await makeSession(admin, { mfa: true, ageMinutes: 60, stepUp: true });
  let slug = "";
  let listingId = "";

  try {
    // ---------- Starting point ----------
    let r = await call("GET", "/api/account/business", null);
    check("B1", "Guest cannot read business status", r.status === 401, `status ${r.status}`);
    r = await call("GET", "/api/account/business", sCorp);
    check("B2", "Normal user starts without a corporate record", r.status === 200 && r.json.business === null, `status ${r.status}`);

    // ---------- Uploads ----------
    r = await upload("/api/account/business/media", sCorp, Buffer.from("not an image at all"), "x.png", "image/png", { kind: "logo" });
    check("U1", "Non-image upload rejected", r.status === 400, `status ${r.status} ${String(r.json.error)}`);
    r = await upload("/api/account/business/media", sCorp, randomBytes(2 * 1024 * 1024 + 10), "big.png", "image/png", { kind: "logo" });
    check("U2", "Logo over 2 MB rejected", r.status === 400 && r.json.error === "biz.err.logoSize", `status ${r.status} ${String(r.json.error)}`);
    r = await upload("/api/account/business/media", sCorp, await png(600, 600, "#00c853"), "logo.png", "image/png", { kind: "bogus" });
    check("U3", "Unknown media kind rejected", r.status === 400, `status ${r.status}`);
    const logoRes = await upload("/api/account/business/media", sCorp, await png(600, 600, "#00c853"), "logo.png", "image/png", { kind: "logo" });
    const coverRes = await upload("/api/account/business/media", sCorp, await png(1600, 500, "#047857"), "cover.png", "image/png", { kind: "cover" });
    const logoUrl = String(logoRes.json.url ?? "");
    const coverUrl = String(coverRes.json.url ?? "");
    check("U4", "Logo and cover upload (normalised to webp)", logoRes.status === 200 && coverRes.status === 200 && logoUrl.endsWith(".webp") && coverUrl.endsWith(".webp"), `${logoRes.status}/${coverRes.status}`);
    // ---------- Application validation ----------
    const application = {
      name: STORE_NAME,
      contactName: "Ayşe Yılmaz",
      companyType: "limited",
      taxOffice: TAX_OFFICE,
      taxNumber: TAX_NUMBER,
      categoryId: "shopping",
      city: "İstanbul",
      district: "Kadıköy",
      description: "Kadıköy'de 2010'dan beri ikinci el ve sıfır elektronik satışı yapan işletmeyiz.",
      website: "biztest.example.com",
      email: `magaza-${TAG}@biztest.invalid`,
      phone: "0216 555 44 33",
      logoUrl,
      coverUrl,
    };
    r = await call("POST", "/api/account/business", sCorp, { ...application, nationalId: "12345678901" });
    check("V1", "Unknown fields (e.g. national ID) are rejected", r.status === 400, `status ${r.status}`);
    r = await call("POST", "/api/account/business", sCorp, { ...application, birthDate: "1990-01-01" });
    check("V2", "Birth date is not accepted", r.status === 400, `status ${r.status}`);
    r = await call("POST", "/api/account/business", sCorp, { ...application, taxNumber: "12345" });
    check("V3", "Invalid tax number rejected", r.status === 400 && r.json.error === "biz.err.taxNumber", String(r.json.error));
    r = await call("POST", "/api/account/business", sCorp, { ...application, district: "Çankaya" });
    check("V4", "District outside the province rejected", r.status === 400 && r.json.error === "biz.err.district", String(r.json.error));
    r = await call("POST", "/api/account/business", sCorp, { ...application, logoUrl: `/api/media/business/${other.id}/logo-${"0".repeat(8)}-0000-0000-0000-${"0".repeat(12)}.webp` });
    check("V5", "Someone else's image URL rejected", r.status === 400 && r.json.error === "biz.err.image", String(r.json.error));
    r = await call("POST", "/api/account/business", sCorp, { ...application, logoUrl: "https://evil.example.com/x.webp" });
    check("V6", "External image URL rejected", r.status === 400 && r.json.error === "biz.err.image", String(r.json.error));
    r = await call("POST", "/api/account/business", sCorp, { ...application, categoryId: "filter-urgent" });
    check("V7", "Virtual/filter category rejected", r.status === 400 && r.json.error === "biz.err.category", String(r.json.error));
    r = await call("POST", "/api/account/business", sCorp, { ...application, description: "kısa" });
    check("V8", "Too-short description rejected", r.status === 400 && r.json.error === "biz.err.description", String(r.json.error));
    r = await call("POST", "/api/account/business", sOther, application);
    check("V9", "Another user cannot submit with my uploaded images", r.status === 400 && r.json.error === "biz.err.image", String(r.json.error));

    r = await call("POST", "/api/account/business", sCorp, application);
    const applied = r.json.business as Record<string, unknown> | undefined;
    slug = String(applied?.slug ?? "");
    check("F1", "Valid application accepted as pending", r.status === 200 && applied?.status === "pending" && !!slug, `status ${r.status} slug=${slug}`);
    let prof = await prisma.profile.findUnique({ where: { userId: corp.id }, select: { businessVerifiedAt: true, businessName: true } });
    check("F2", "No badge before approval", !prof?.businessVerifiedAt && !prof?.businessName);
    r = await call("GET", `/magaza/${slug}`, null);
    check("F3", "Pending store page is not public", r.status === 404, `status ${r.status}`);
    r = await call("PATCH", "/api/account/business", sCorp, { description: "Bekleyen başvuruda düzenleme denemesi yapılıyor." });
    check("F4", "Store profile edit blocked while pending", r.status === 409, `status ${r.status}`);

    // ---------- Admin review ----------
    const row = await prisma.businessAccount.findUnique({ where: { userId: corp.id }, select: { id: true } });
    const bizId = row?.id ?? "";
    if (!bizId || !slug) throw new Error("Application was not created; aborting the remaining flow.");
    r = await call("POST", `/api/admin/business/${bizId}`, sCorp, { action: "approve" });
    check("A1", "Applicant cannot approve their own store", r.status === 401 || r.status === 403, `status ${r.status}`);
    r = await call("POST", `/api/admin/business/${bizId}`, sOther, { action: "approve" });
    check("A2", "Normal member cannot approve", r.status === 401 || r.status === 403, `status ${r.status}`);
    r = await call("GET", "/api/admin/business?status=pending", sOther);
    check("A3", "Normal member cannot list applications", r.status === 401 || r.status === 403, `status ${r.status}`);
    r = await call("POST", `/api/admin/business/${bizId}`, sAdminNoStep, { action: "approve" });
    const state = await prisma.businessAccount.findUnique({ where: { id: bizId }, select: { status: true } });
    check("A4", "Admin approval requires fresh step-up", r.status === 403 && r.json.error === "auth.err.stepUp" && state?.status === "pending", `status ${r.status} ${String(r.json.error)}`);
    // First round: approve, then revoke, so re-application after revocation is covered too.
    r = await call("POST", `/api/admin/business/${bizId}`, sAdmin, { action: "approve" });
    check("A5", "Approve from pending works with step-up", r.status === 200, `status ${r.status}`);
    r = await call("POST", `/api/admin/business/${bizId}`, sAdmin, { action: "revoke" });
    check("A5b", "Revoke from approved works", r.status === 200 && r.json.state === "revoked", `status ${r.status}`);
    r = await call("POST", "/api/account/business", sCorp, application);
    check("A6", "Revoked user can re-apply (back to pending)", r.status === 200 && (r.json.business as Record<string, unknown>)?.status === "pending", `status ${r.status}`);
    check("A7", "Slug stays stable after first approval", (r.json.business as Record<string, unknown>)?.slug === slug);

    r = await call("POST", `/api/admin/business/${bizId}`, sAdmin, { action: "reject" });
    check("A8", "Reject requires a reason", r.status === 400 && r.json.error === "biz.err.reason", String(r.json.error));
    r = await call("POST", `/api/admin/business/${bizId}`, sAdmin, { action: "reject", reason: "Vergi levhası bilgisi eksik" });
    check("A9", "Reject with reason", r.status === 200 && r.json.state === "rejected", `status ${r.status}`);
    r = await call("GET", "/api/account/business", sCorp);
    const mine = r.json.business as Record<string, unknown> | undefined;
    check("A10", "User sees Reddedildi + reason in profile", mine?.status === "rejected" && mine?.rejectReason === "Vergi levhası bilgisi eksik");
    r = await call("POST", `/api/admin/business/${bizId}`, sAdmin, { action: "approve" });
    check("A11", "Cannot approve a rejected application directly", r.status === 409, `status ${r.status}`);
    r = await call("POST", "/api/account/business", sCorp, application);
    check("A12", "Resubmission after rejection → pending", r.status === 200 && (r.json.business as Record<string, unknown>)?.status === "pending");
    r = await call("GET", "/api/admin/business?status=pending", sAdminNoStep);
    const list = (r.json.businesses as Record<string, unknown>[] | undefined) ?? [];
    check("A13", "Admin list shows the application with tax data", r.status === 200 && list.some((b) => b.id === bizId && b.taxNumber === TAX_NUMBER));
    r = await call("POST", `/api/admin/business/${bizId}`, sAdmin, { action: "approve" });
    check("A14", "Admin approves", r.status === 200 && r.json.state === "approved", `status ${r.status}`);
    prof = await prisma.profile.findUnique({ where: { userId: corp.id }, select: { businessVerifiedAt: true, businessName: true } });
    check("A15", "Approval grants the verified-business label", !!prof?.businessVerifiedAt && prof?.businessName === STORE_NAME);
    const audit = await prisma.auditLog.findFirst({ where: { actorId: admin.id, entityId: bizId, action: "business.approve" } });
    check("A16", "Approval is audit-logged", !!audit);
    r = await call("POST", `/api/admin/business/${bizId}`, sAdmin, { action: "approve" });
    check("A17", "Double approval rejected", r.status === 409, `status ${r.status}`);

    // ---------- Public store ----------
    r = await call("GET", `/magaza/${slug}`, null);
    const html = r.text;
    check("S1", "Store page public without login", r.status === 200 && html.includes(STORE_NAME), `status ${r.status}`);
    check("S2", "Store page index,follow", /<meta name="robots" content="index, follow"/.test(html));
    check("S3", "Store page canonical", html.includes(`rel="canonical" href="https://alsatport.com/magaza/${slug}"`) || new RegExp(`rel="canonical" href="[^"]*/magaza/${slug}"`).test(html));
    check("S4", "Firm-specific title", new RegExp(`<title>${STORE_NAME}`).test(html));
    check("S5", "No tax number / tax office / contact person / private contact on public page", !html.includes(TAX_NUMBER) && !html.includes(TAX_OFFICE) && !html.includes("Ayşe Yılmaz") && !html.includes(application.email) && !html.includes("555 44 33"));
    check("S6", "Shows province/district only + badge", html.includes("Kadıköy, İstanbul") && html.includes("Doğrulanmış İşletme"));
    r = await call("GET", "/magazalar", null);
    check("S7", "Store listed on /magazalar", r.status === 200 && r.text.includes(STORE_NAME) && /<meta name="robots" content="index, follow"/.test(r.text));
    r = await call("GET", `/magazalar?il=${encodeURIComponent("İstanbul")}&ilce=${encodeURIComponent("Kadıköy")}&kategori=shopping&dogrulanmis=1`, null);
    check("S8", "Filters (category/il/ilçe/verified) include the store; filtered page noindex", r.text.includes(STORE_NAME) && /content="noindex, follow"/.test(r.text));
    r = await call("GET", `/magazalar?il=${encodeURIComponent("Ankara")}`, null);
    check("S9", "Other-province filter excludes the store", r.status === 200 && !r.text.includes(STORE_NAME));
    // sitemap.xml is regenerated hourly (revalidate = 3600), so store URLs appear on the next regeneration.
    r = await call("GET", "/sitemap.xml", null);
    check("S10", "Sitemap lists /magazalar", r.text.includes("/magazalar</loc>"));
    r = await call("GET", "/robots.txt", null);
    check("S11", "robots.txt disallows private business pages", r.text.includes("Disallow: /kurumsal-hesap") && r.text.includes("Disallow: /isletme-paneli"));
    r = await call("GET", "/kurumsal-hesap", null);
    check("S12", "Application page requires login", r.status === 307 || r.status === 302 || r.status === 308, `status ${r.status}`);
    r = await call("GET", "/isletme-paneli", sCorp);
    check("S13", "Business panel is noindex", r.status === 200 && /content="noindex, nofollow"/.test(r.text), `status ${r.status}`);
    r = await call("GET", "/kurumsal-hesap", sCorp);
    check("S14", "Application page is noindex", r.status === 200 && /content="noindex, nofollow"/.test(r.text), `status ${r.status}`);

    // ---------- Contact gate ----------
    r = await call("GET", `/api/stores/${slug}/contact`, null);
    check("C1", "Guest cannot read store phone/e-mail", r.status === 401, `status ${r.status}`);
    r = await call("GET", `/api/stores/${slug}/contact`, sOther);
    check("C2", "Signed-in member gets store contact", r.status === 200 && r.json.email === application.email && String(r.json.phone).includes("555"), `status ${r.status}`);

    // ---------- Corporate user posts a listing ----------
    const photo = await upload("/api/uploads", sCorp, await png(800, 600, "#1d4ed8"), "photo.png", "image/png", { categoryId: "shopping-other" });
    const photoUrl = String(photo.json.url ?? "");
    check("L1", "Corporate user uploads a listing photo", photo.status === 200 && !!photoUrl, `status ${photo.status} ${String(photo.json.error ?? "")}`);
    r = await call("POST", "/api/listings", sCorp, {
      title: `Biztest kulaklık ${TAG}`,
      description: "Kutulu, faturalı, az kullanılmış kablosuz kulaklık. Mağazamızdan teslim alınabilir.",
      categoryId: "shopping-other",
      city: "İstanbul",
      district: "Kadıköy",
      price: 1500,
      images: [photoUrl],
      specs: [],
      features: [],
    });
    listingId = String(r.json.id ?? "");
    check("L2", "Corporate user posts a listing", r.status === 200 && !!listingId, `status ${r.status} ${String(r.json.error ?? "")}`);
    const created = r.json.listing as Record<string, unknown> | undefined;
    const ref = created?.store as Record<string, unknown> | undefined;
    check("L3", "New listing carries the store reference", ref?.slug === slug && ref?.name === STORE_NAME, JSON.stringify(ref ?? null));
    r = await call("GET", `/api/listings?sellerId=${corp.id}`, null);
    const pub = ((r.json.listings as Record<string, unknown>[] | undefined) ?? []).find((l) => l.id === listingId);
    check(
      "L4",
      "Public listing API exposes store ref + firm name",
      (pub?.store as Record<string, unknown> | undefined)?.slug === slug && pub?.sellerBusiness === true && pub?.sellerName === STORE_NAME,
      `found=${!!pub} sellerName=${String(pub?.sellerName)} sellerBusiness=${String(pub?.sellerBusiness)}`,
    );
    r = await call("GET", `/ilan/${listingId}`, null);
    check("L5", "Listing detail public; shows Mağazaya Git link", r.status === 200 && r.text.includes(`/magaza/${slug}`) && r.text.includes("Mağazaya Git"), `status ${r.status}`);
    r = await call("GET", `/magaza/${slug}`, null);
    check("L6", "Store page lists the new listing", r.text.includes(`Biztest kulaklık ${TAG}`));
    r = await call("GET", "/api/account/business", sCorp);
    const stats = (r.json.business as Record<string, unknown> | undefined)?.stats as Record<string, number> | undefined;
    check("L7", "Panel stats are real counts", stats?.active === 1 && stats?.sold === 0 && stats?.favorites === 0, JSON.stringify(stats ?? null));

    // ---------- Owner edits ----------
    r = await call("PATCH", "/api/account/business", sCorp, { description: "Güncel açıklama: elektronik, aksesuar ve teknik servis." , website: "" });
    check("E1", "Owner edits store profile", r.status === 200 && (r.json.business as Record<string, unknown>)?.description === "Güncel açıklama: elektronik, aksesuar ve teknik servis.");
    r = await call("PATCH", "/api/account/business", sCorp, { name: "Başka Firma" });
    check("E2", "Firm name locked after approval", r.status === 400, `status ${r.status}`);
    r = await call("PATCH", "/api/account/business", sCorp, { taxNumber: "9999999999" });
    check("E3", "Tax number locked after approval", r.status === 400, `status ${r.status}`);
    r = await call("PATCH", "/api/account/business", sOther, { description: "Başkasının mağazasını düzenleme girişimi denemesi." });
    const after = await prisma.businessAccount.findUnique({ where: { id: bizId }, select: { description: true } });
    check("E4", "Another user cannot edit this store", r.status === 404 && after?.description?.startsWith("Güncel açıklama") === true, `status ${r.status}`);
    r = await call("POST", "/api/account/business", sCorp, application);
    check("E5", "Approved user cannot overwrite via re-apply", r.status === 409, `status ${r.status}`);

    // ---------- Revoke ----------
    r = await call("POST", `/api/admin/business/${bizId}`, sAdminNoStep, { action: "revoke" });
    check("R1", "Revoke requires step-up", r.status === 403, `status ${r.status}`);
    r = await call("POST", `/api/admin/business/${bizId}`, sAdmin, { action: "revoke", reason: "Test kaldırma" });
    check("R2", "Admin revokes corporate status", r.status === 200 && r.json.state === "revoked", `status ${r.status}`);
    r = await call("GET", `/magaza/${slug}`, null);
    check("R3", "Revoked store page disappears", r.status === 404, `status ${r.status}`);
    prof = await prisma.profile.findUnique({ where: { userId: corp.id }, select: { businessVerifiedAt: true, businessName: true } });
    check("R4", "Revoke removes the badge", !prof?.businessVerifiedAt && !prof?.businessName);
    r = await call("GET", `/api/listings?sellerId=${corp.id}`, null);
    const afterRevoke = ((r.json.listings as Record<string, unknown>[] | undefined) ?? []).find((l) => l.id === listingId);
    check("R5", "Listing stays live, store ref removed", !!afterRevoke && !afterRevoke.store && !afterRevoke.sellerBusiness);
    r = await call("GET", `/api/stores/${slug}/contact`, sOther);
    check("R6", "Revoked store contact unavailable", r.status === 404, `status ${r.status}`);
    r = await call("GET", "/magazalar", null);
    check("R7", "Revoked store removed from /magazalar", !r.text.includes(STORE_NAME));
  } finally {
    const tagged = await prisma.user.findMany({ where: { email: { endsWith: `-${TAG}@biztest.invalid` } }, select: { id: true } });
    const ids = tagged.map((u) => u.id);
    await prisma.listingImage.deleteMany({ where: { listing: { sellerId: { in: ids } } } });
    await prisma.listing.deleteMany({ where: { sellerId: { in: ids } } });
    await prisma.businessAccount.deleteMany({ where: { userId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    const uploads = path.join(process.cwd(), ".data", "uploads");
    for (const id of ids) {
      await rm(path.join(uploads, "business", id), { recursive: true, force: true });
      await rm(path.join(uploads, "listings", id), { recursive: true, force: true });
    }
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
