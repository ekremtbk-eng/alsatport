/**
 * "Acil Acil" authorization test. Runs ONLY against a local server + local database:
 *
 *   URGENT_TEST_BASE=http://localhost:3013 DATABASE_URL=<local> AUTH_SECRET=<same as server> npx tsx scripts/test-urgent.ts
 *
 * Throw-away users (`*@urgenttest.invalid`) for: individual, pending / rejected / revoked / half-approved business,
 * an approved business (approved and later revoked through the real admin API) and an admin. All removed at the end.
 */
import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { SignJWT } from "jose";
import { PrismaClient, type BusinessStatus } from "@prisma/client";

const BASE = process.env.URGENT_TEST_BASE ?? process.env.SECURITY_TEST_BASE ?? "http://localhost:3013";
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

const results: { id: string; pass: boolean }[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${name}${detail ? `  — ${detail}` : ""}`);
}

type Role = "member" | "seller" | "admin";
type TestUser = { id: string; email: string; username: string; role: Role };

async function makeUser(label: string, role: Role): Promise<TestUser> {
  const email = `${label}-${TAG}@urgenttest.invalid`;
  const username = `urgtest_${label}_${TAG}`;
  const user = await prisma.user.create({
    data: {
      email,
      username,
      role,
      passwordHash: await bcrypt.hash(randomBytes(12).toString("base64url"), 10),
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: `Urg ${label}`,
          fullName: `Urgent Test ${label}`,
          profileComplete: true,
          phone: `53${String(randomBytes(4).readUInt32BE() % 100_000_000).padStart(8, "0")}`,
          address: "Moda Caddesi No:12 Kadıköy İstanbul",
          city: "İstanbul",
        },
      },
    },
  });
  return { id: user.id, email, username, role };
}

async function makeBusiness(u: TestUser, status: BusinessStatus, verified: boolean) {
  await prisma.businessAccount.create({
    data: {
      userId: u.id,
      slug: `urgtest-${u.username.replace(/_/g, "-")}`.toLowerCase(),
      status,
      name: `Urgtest Firma ${u.username}`,
      contactName: "Test Kişi",
      companyType: "limited",
      taxOffice: "Kadıköy VD",
      taxNumber: "1234567890",
      categoryId: "shopping",
      city: "İstanbul",
      district: "Kadıköy",
      description: "Acil Acil yetki testi için oluşturulan geçici işletme kaydı.",
      email: `firma-${u.username}@urgenttest.invalid`,
      phone: "02165554433",
      ...(status === "approved" ? { approvedAt: new Date() } : {}),
      ...(status === "revoked" ? { approvedAt: new Date(Date.now() - 86400_000), revokedAt: new Date() } : {}),
      ...(status === "rejected" ? { rejectReason: "Eksik belge" } : {}),
    },
  });
  if (verified) {
    await prisma.profile.update({ where: { userId: u.id }, data: { businessName: `Urgtest Firma ${u.username}`, businessVerifiedAt: new Date() } });
  }
}

type Sess = { cookie: string; csrf: string };
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
      userAgent: "urgent-test",
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

type Res = { status: number; json: Record<string, unknown>; text: string };
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
    return { status: res.status, json, text };
  }
}
const call = (method: string, p: string, s: Sess | null, body?: unknown) =>
  send(method, p, s, body === undefined ? undefined : JSON.stringify(body), body === undefined ? undefined : "application/json");

async function photoFor(s: Sess) {
  const bytes = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#1d4ed8" } })
    .composite([{ input: Buffer.from(`<svg width="800" height="600"><circle cx="400" cy="300" r="180" fill="#fff"/></svg>`) }])
    .png()
    .toBuffer();
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: "image/png" }), "photo.png");
  form.append("categoryId", "shopping-other");
  const r = await send("POST", "/api/uploads", s, form);
  return String(r.json.url ?? "");
}

function listingBody(photo: string, extra: Record<string, unknown> = {}) {
  return {
    title: `Urgtest kulaklık ${TAG}`,
    description: "Kutulu, faturalı, az kullanılmış kablosuz kulaklık. Elden teslim edilebilir.",
    categoryId: "shopping-other",
    city: "İstanbul",
    district: "Kadıköy",
    price: 1500,
    images: [photo],
    specs: [],
    features: [],
    ...extra,
  };
}

const SPOOF = {
  businessVerified: true,
  businessStatus: "approved",
  isBusiness: true,
  sellerBusiness: true,
  store: { slug: "sahte", name: "Sahte Firma" },
  featured: true,
  vip: true,
};

const dbUrgent = async (id: string) => (await prisma.listing.findUnique({ where: { id }, select: { urgent: true } }))?.urgent;
const urgentCount = (sellerId: string) => prisma.listing.count({ where: { sellerId, urgent: true } });
const publicListing = async (sellerId: string, id: string) => {
  const r = await call("GET", `/api/listings?sellerId=${sellerId}`, null);
  return ((r.json.listings as Record<string, unknown>[] | undefined) ?? []).find((l) => l.id === id);
};

async function main() {
  console.log(`Acil Acil authorization → ${BASE} (tag ${TAG})\n`);
  await prisma.rateLimitBucket.deleteMany({});
  try {
    const admin = await makeUser("admin", "admin");
    const indiv = await makeUser("indiv", "seller");
    const pend = await makeUser("pend", "seller");
    const rej = await makeUser("rej", "seller");
    const revk = await makeUser("revk", "seller");
    const half = await makeUser("half", "seller");
    const corp = await makeUser("corp", "seller");
    await makeBusiness(pend, "pending", false);
    await makeBusiness(rej, "rejected", false);
    await makeBusiness(revk, "revoked", false);
    await makeBusiness(half, "approved", false);
    await makeBusiness(corp, "pending", false);

    const sAdmin = await makeSession(admin, { mfa: true, ageMinutes: 60, stepUp: true });
    const sIndiv = await makeSession(indiv);
    const sPend = await makeSession(pend);
    const sRej = await makeSession(rej);
    const sRevk = await makeSession(revk);
    const sHalf = await makeSession(half);
    const sCorp = await makeSession(corp);

    const pIndiv = await photoFor(sIndiv);
    const pCorp = await photoFor(sCorp);
    check("P0", "Fixture photos uploaded", !!pIndiv && !!pCorp);

    // ---------- Guest ----------
    let r = await call("POST", "/api/listings", null, listingBody(pIndiv, { urgent: true }));
    check("G1", "Guest cannot create an Acil Acil listing", r.status === 401 || r.status === 403, `status ${r.status}`);
    const guestCsrf = { cookie: `ap_csrf=${"x".repeat(32)}`, csrf: "x".repeat(32) };
    r = await call("POST", "/api/listings", guestCsrf, listingBody(pIndiv, { urgent: true }));
    check("G2", "Guest with a forged CSRF pair still cannot create", r.status === 401 || r.status === 403, `status ${r.status}`);

    // ---------- Individual ----------
    r = await call("POST", "/api/listings", sIndiv, listingBody(pIndiv, { urgent: true }));
    check("I1", "Individual cannot create Acil Acil", r.status === 403 && r.json.error === "urgent.err.businessOnly", `status ${r.status} ${String(r.json.error)}`);
    r = await call("POST", "/api/listings", sIndiv, listingBody(pIndiv, { urgent: true, ...SPOOF }));
    check("I2", "Spoofed business flags in payload do not grant Acil Acil", r.status === 403 && r.json.error === "urgent.err.businessOnly", `status ${r.status} ${String(r.json.error)}`);
    r = await call("POST", "/api/listings", sIndiv, listingBody(pIndiv, { urgent: "true" }));
    check("I3", "Non-boolean urgent value rejected", r.status === 400, `status ${r.status}`);
    check("I4", "No urgent listing stored for the individual", (await urgentCount(indiv.id)) === 0);

    r = await call("POST", "/api/listings", sIndiv, listingBody(pIndiv, SPOOF));
    const indivListing = String(r.json.id ?? "");
    const created = r.json.listing as Record<string, unknown> | undefined;
    check("I5", "Individual can still publish a normal listing", r.status === 200 && !!indivListing && created?.urgent === false, `status ${r.status} ${String(r.json.error ?? "")}`);
    const control = await call("POST", "/api/listings", sIndiv, listingBody(pIndiv, { featured: false, vip: false }));
    const ctl = control.json.listing as Record<string, unknown> | undefined;
    check(
      "I6",
      "Spoofed store/business/featured flags ignored (featured/vip identical whatever the client sends)",
      control.status === 200 && !created?.store && created?.sellerBusiness === false && created?.featured === ctl?.featured && created?.vip === ctl?.vip,
      `store=${JSON.stringify(created?.store ?? null)} sellerBusiness=${String(created?.sellerBusiness)} featured=${String(created?.featured)}/${String(ctl?.featured)} vip=${String(created?.vip)}/${String(ctl?.vip)}`,
    );

    r = await call("PUT", `/api/listings/${indivListing}`, sIndiv, { urgent: true });
    check("I7", "Individual cannot turn own listing into Acil Acil", r.status === 403 && r.json.error === "urgent.err.businessOnly" && (await dbUrgent(indivListing)) === false, `status ${r.status}`);
    r = await call("PUT", `/api/listings/${indivListing}`, sIndiv, { urgent: true, ...SPOOF, title: `Urgtest güncel ${TAG}` });
    check("I8", "Update with spoofed business flags blocked", r.status === 403 && (await dbUrgent(indivListing)) === false, `status ${r.status}`);
    r = await call("PUT", `/api/listings/${indivListing}`, sIndiv, { title: `Urgtest düzenlendi ${TAG}` });
    check("I9", "Individual can still edit the listing normally", r.status === 200 && (r.json.listing as Record<string, unknown>)?.urgent === false, `status ${r.status}`);

    // ---------- Non-approved business states ----------
    for (const [id, name, s, u] of [
      ["N1", "Pending business", sPend, pend],
      ["N2", "Rejected business", sRej, rej],
      ["N3", "Revoked business", sRevk, revk],
      ["N4", "Approved row without verified badge (inconsistent)", sHalf, half],
    ] as const) {
      const photo = await photoFor(s);
      r = await call("POST", "/api/listings", s, listingBody(photo, { urgent: true }));
      check(id, `${name} cannot create Acil Acil`, r.status === 403 && r.json.error === "urgent.err.businessOnly" && (await urgentCount(u.id)) === 0, `status ${r.status} ${String(r.json.error)}`);
    }

    // ---------- Approved business (through the real admin API) ----------
    const biz = await prisma.businessAccount.findUniqueOrThrow({ where: { userId: corp.id }, select: { id: true, slug: true } });
    r = await call("POST", "/api/listings", sCorp, listingBody(pCorp, { urgent: true }));
    check("A0", "Still-pending applicant blocked before approval", r.status === 403, `status ${r.status}`);
    r = await call("POST", `/api/admin/business/${biz.id}`, sAdmin, { action: "approve" });
    check("A1", "Admin approves the business (step-up)", r.status === 200 && r.json.state === "approved", `status ${r.status}`);

    r = await call("POST", "/api/listings", sCorp, listingBody(pCorp, { urgent: true }));
    const corpUrgent = String(r.json.id ?? "");
    const cu = r.json.listing as Record<string, unknown> | undefined;
    check("A2", "Approved business creates an Acil Acil listing", r.status === 200 && cu?.urgent === true && (await dbUrgent(corpUrgent)) === true, `status ${r.status} ${String(r.json.error ?? "")}`);
    check("A3", "Listing carries the verified store reference (server-built)", (cu?.store as Record<string, unknown> | undefined)?.slug === biz.slug);

    r = await call("POST", "/api/listings", sCorp, listingBody(pCorp));
    const corpNormal = String(r.json.id ?? "");
    check("A4", "Approved business can also publish a normal listing", r.status === 200 && (r.json.listing as Record<string, unknown>)?.urgent === false);
    r = await call("PUT", `/api/listings/${corpNormal}`, sCorp, { urgent: true });
    check("A5", "Approved business turns own listing into Acil Acil", r.status === 200 && (await dbUrgent(corpNormal)) === true, `status ${r.status}`);
    r = await call("PUT", `/api/listings/${corpNormal}`, sCorp, { urgent: false });
    check("A6", "Approved business can switch Acil Acil off", r.status === 200 && (await dbUrgent(corpNormal)) === false, `status ${r.status}`);

    const pub = await publicListing(corp.id, corpUrgent);
    check("A7", "Public API shows the Acil Acil flag + store for the approved business", pub?.urgent === true && !!pub?.store);
    r = await call("GET", "/acil", null);
    check("A8", "/acil page is public", r.status === 200, `status ${r.status}`);

    // ---------- IDOR / BOLA ----------
    r = await call("PUT", `/api/listings/${corpNormal}`, sIndiv, { urgent: true });
    check("O1", "Individual cannot touch another user's listing", r.status === 403 && (await dbUrgent(corpNormal)) === false, `status ${r.status}`);
    r = await call("PUT", `/api/listings/${indivListing}`, sCorp, { urgent: true });
    check("O2", "Approved business cannot flag someone else's listing", r.status === 403 && (await dbUrgent(indivListing)) === false, `status ${r.status}`);
    r = await call("PUT", `/api/listings/${indivListing}`, sAdmin, { urgent: true });
    check("O3", "Admin edit cannot grant Acil Acil to an individual's listing", r.status === 403 && r.json.error === "urgent.err.businessOnly" && (await dbUrgent(indivListing)) === false, `status ${r.status} ${String(r.json.error)}`);

    // ---------- Legacy flag of an individual (stored before this rule) ----------
    await prisma.listing.update({ where: { id: indivListing }, data: { urgent: true } });
    const legacy = await publicListing(indiv.id, indivListing);
    check("L1", "Stored flag of an individual is not shown publicly", !!legacy && legacy.urgent === false);
    r = await call("GET", `/api/listings/${indivListing}`, null);
    check("L2", "Detail API also hides it", (r.json.listing as Record<string, unknown> | undefined)?.urgent === false);
    r = await call("PUT", `/api/listings/${indivListing}`, sIndiv, { title: `Urgtest legacy ${TAG}` });
    check("L3", "Owner can still edit a legacy-flagged listing", r.status === 200 && (r.json.listing as Record<string, unknown>)?.urgent === false, `status ${r.status}`);

    // ---------- Revoke ----------
    r = await call("POST", `/api/admin/business/${biz.id}`, sAdmin, { action: "revoke", reason: "Test" });
    check("R1", "Admin revokes the business", r.status === 200 && r.json.state === "revoked", `status ${r.status}`);
    const afterRevoke = await publicListing(corp.id, corpUrgent);
    check("R2", "Existing Acil Acil listing stays live but loses the flag publicly", !!afterRevoke && afterRevoke.urgent === false && !afterRevoke.store);
    check("R3", "Stored data is preserved (no destructive change)", (await dbUrgent(corpUrgent)) === true);
    r = await call("POST", "/api/listings", sCorp, listingBody(pCorp, { urgent: true }));
    check("R4", "Revoked business cannot create new Acil Acil listings", r.status === 403 && r.json.error === "urgent.err.businessOnly", `status ${r.status}`);
    r = await call("PUT", `/api/listings/${corpNormal}`, sCorp, { urgent: true });
    check("R5", "Revoked business cannot re-flag an existing listing", r.status === 403 && (await dbUrgent(corpNormal)) === false, `status ${r.status}`);
    r = await call("PUT", `/api/listings/${corpUrgent}`, sCorp, { title: `Urgtest revoke sonrası ${TAG}` });
    check("R6", "Revoked business can still edit its listings normally", r.status === 200 && (r.json.listing as Record<string, unknown>)?.urgent === false, `status ${r.status}`);
  } catch (err) {
    check("X", "Test run crashed", false, err instanceof Error ? err.message.split("\n").slice(-1)[0] : String(err));
  } finally {
    const tagged = await prisma.user.findMany({ where: { email: { endsWith: `-${TAG}@urgenttest.invalid` } }, select: { id: true } });
    const ids = tagged.map((u) => u.id);
    await prisma.listingImage.deleteMany({ where: { listing: { sellerId: { in: ids } } } });
    await prisma.listing.deleteMany({ where: { sellerId: { in: ids } } });
    await prisma.businessAccount.deleteMany({ where: { userId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    const uploads = path.join(process.cwd(), ".data", "uploads");
    for (const id of ids) await rm(path.join(uploads, "listings", id), { recursive: true, force: true });
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
