/**
 * Service provider page shows only seller-entered or DB-backed data, and the owner can edit the missing parts.
 *
 *   FIRM_TEST_BASE=http://localhost:3013 DATABASE_URL=<local> AUTH_SECRET=<same as server> npx tsx scripts/test-firm-profile.ts
 *
 * Unit part is pure. The HTTP part runs ONLY against a local server + local database and removes its
 * throw-away users (`*@firmtest.invalid`) at the end.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";
import type { Listing } from "@/data/store";
import { districtsOf } from "@/data/turkey";
import { MESSAGES } from "@/i18n/messages";
import { cleanFirmExtras, isFirmOpen, type PublicFirm } from "@/lib/business/firmProfile";
import { buildFirmProfile } from "@/lib/serviceFirm";

const BASE = process.env.FIRM_TEST_BASE ?? process.env.SECURITY_TEST_BASE ?? "http://localhost:3013";
const DB = process.env.DATABASE_URL ?? "";
const SECRET = process.env.AUTH_SECRET ?? "";
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;

type Result = { id: string; name: string; pass: boolean; detail: string };
const results: Result[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${name}${detail ? `  — ${detail}` : ""}`);
}

const baseListing = {
  id: "l1",
  sellerId: "s1",
  categoryId: "services-reno-paint",
  title: "Boya Badana",
  description: "",
  images: [],
  specs: [],
  features: [],
  city: "Ankara",
  district: "Çankaya",
  price: 0,
} as unknown as Listing;

const firm: PublicFirm = {
  slug: "ornek",
  name: "Örnek Boya",
  description: "Sahibinin yazdığı açıklama.",
  hours: { always: false, days: [{ day: 1, open: "09:00", close: "18:00" }] },
  serviceDistricts: ["Çankaya", "Keçiören"],
  priceList: [{ title: "Oda boyama", min: 2500, max: 4000, unit: "oda" }],
  announcements: [{ text: "Ekim boyunca keşif ücretsiz.", at: Date.UTC(2026, 9, 1) }],
  faq: [{ q: "Malzeme dahil mi?", a: "Hayır, ayrıca fiyatlanır." }],
};

function unitTests() {
  const empty = buildFirmProfile(baseListing, []);
  check(
    "U1",
    "No data → no prices, districts, announcements, Q&A, hours or about text",
    !empty.prices.length && !empty.districts.length && !empty.announcements.length && !empty.qa.length &&
      empty.open === null && empty.hours === null && !empty.hoursNote && !empty.hours24 && empty.about === "" && !empty.details.length,
    JSON.stringify({ p: empty.prices.length, d: empty.districts.length, a: empty.about }),
  );
  const again = buildFirmProfile({ ...baseListing, id: "other-id", sellerId: "other" } as Listing, []);
  check("U2", "Profile does not vary by listing/seller id (no hash-seeded content)",
    JSON.stringify({ ...empty, crumbs: [] }) === JSON.stringify({ ...again, crumbs: [] }));

  const priced = buildFirmProfile({ ...baseListing, price: 1500 } as Listing, []);
  check("U3", "Without a firm price list, only the listing's own price is shown",
    priced.prices.length === 1 && priced.prices[0].min === 1500 && priced.prices[0].title === "Boya Badana" && !priced.prices[0].max);

  const pattern = buildFirmProfile(
    { ...baseListing, specs: [{ label: "Çalışma", value: "7/24" }, { label: "Garanti", value: "1 yıl" }], features: ["Keşif ücretsiz"] } as unknown as Listing,
    [],
  );
  check("U4", "Listing specs/features are shown as entered; 7/24 only when the seller chose it",
    pattern.hours24 && pattern.open === null && pattern.hoursNote === "7/24" &&
      pattern.details.some((d) => d.label === "Garanti" && d.value === "1 yıl") && pattern.features[0] === "Keşif ücretsiz");

  const mesai = buildFirmProfile({ ...baseListing, specs: [{ label: "Çalışma", value: "Mesai (09–18)" }] } as unknown as Listing, []);
  check("U5", "Office-hours pattern is not turned into an open/closed state", mesai.open === null && !mesai.hours24);

  const full = buildFirmProfile({ ...baseListing, description: "İlan açıklaması" } as Listing, [], firm);
  check("U6", "Owner-entered firm data is passed through unchanged",
    full.about === firm.description && full.districts.join() === "Çankaya,Keçiören" && full.prices[0].max === 4000 &&
      full.announcements[0].text === firm.announcements[0].text && full.qa[0].a === firm.faq[0].a);

  // Mon 5 Oct 2026; Istanbul = UTC+3
  check("H1", "Open inside the owner's hours (Istanbul time)", isFirmOpen(firm.hours, new Date("2026-10-05T07:00:00Z")) === true);
  check("H2", "Closed after closing time", isFirmOpen(firm.hours, new Date("2026-10-05T16:00:00Z")) === false);
  check("H3", "Closed on a day without hours", isFirmOpen(firm.hours, new Date("2026-10-11T09:00:00Z")) === false);
  check("H4", "No hours entered → state unknown (null)", isFirmOpen(null) === null);

  const ankara = districtsOf("Ankara");
  const bad = cleanFirmExtras({ serviceDistricts: ["Kadıköy"] }, "Ankara");
  check("V1", "District outside the business city is rejected", "error" in bad && bad.error === "biz.err.districts");
  const badHours = cleanFirmExtras({ hours: { always: false, days: [{ day: 1, open: "18:00", close: "09:00" }] } }, "Ankara");
  check("V2", "Closing before opening is rejected", "error" in badHours && badHours.error === "biz.err.hours");
  const badPrice = cleanFirmExtras({ priceList: [{ title: "Boya", min: 0 }] }, "Ankara");
  check("V3", "Zero / missing price is rejected", "error" in badPrice && badPrice.error === "biz.err.prices");
  const ok = cleanFirmExtras(
    { serviceDistricts: [ankara[0]], priceList: [{ title: "Boya", min: 100, max: 100 }], announcements: [{ text: "Ekim boyunca keşif ücretsiz." }] },
    "Ankara",
    [{ text: "Ekim boyunca keşif ücretsiz.", at: 123 }],
  );
  check("V4", "Valid input is kept; unchanged announcement keeps its date; max = min collapses",
    !("error" in ok) && ok.serviceDistricts?.[0] === ankara[0] && ok.announcements?.[0].at === 123 && ok.priceList?.[0].max === undefined);

  const src = readFileSync("src/lib/serviceFirm.ts", "utf8");
  check("S1", "Generators removed (hash, moneyRange, getHours, template about text)",
    !/function hash|moneyRange|getHours\(|uzman ekibi|n % [34]/.test(src));
  const keys = ["firm.tab.hours", "firm.owner.hint", "biz.firm.title", "biz.err.districts", "biz.err.hours", "biz.err.prices", "biz.err.announcements", "biz.err.faq", "day.7"];
  const missing = keys.filter((k) => (["tr", "en", "de", "ar", "ru"] as const).some((l) => !MESSAGES[l][k]));
  check("S2", "New texts exist in all 5 languages", missing.length === 0, missing.join(", "));
}

type Sess = { cookie: string; csrf: string };
type Res = { status: number; json: Record<string, unknown> };

async function httpTests() {
  if (!LOOPBACK.test(new URL(BASE).hostname)) throw new Error("Refusing to run against a non-local app.");
  let dbHost = "";
  try {
    dbHost = new URL(DB).hostname;
  } catch {
    throw new Error("DATABASE_URL must point to the local test database.");
  }
  if (!LOOPBACK.test(dbHost)) throw new Error("Refusing to run against a non-local database host.");
  if (SECRET.length < 32) throw new Error("AUTH_SECRET (same value as the local server) is required.");

  const prisma = new PrismaClient({ datasources: { db: { url: DB } } });
  const key = new TextEncoder().encode(SECRET);
  const TAG = randomBytes(4).toString("hex");
  let phoneSeq = 0;

  async function makeUser(label: string) {
    const email = `${label}-${TAG}@firmtest.invalid`;
    const username = `firmtest_${label}_${TAG}`;
    const user = await prisma.user.create({
      data: {
        email,
        username,
        role: "member",
        passwordHash: await bcrypt.hash(randomBytes(12).toString("base64url"), 10),
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            displayName: `Firm ${label}`,
            fullName: `Firm Test ${label}`,
            profileComplete: true,
            phone: `53${String(parseInt(TAG, 16) % 1e6).padStart(6, "0")}${String(++phoneSeq).padStart(2, "0")}`,
            address: "Kızılay Caddesi No:5 Çankaya Ankara",
            city: "Ankara",
          },
        },
      },
    });
    return { id: user.id, email, username };
  }

  async function makeSession(u: { id: string; email: string; username: string }): Promise<Sess> {
    const row = await prisma.userSession.create({
      data: { userId: u.id, method: "password", expiresAt: new Date(Date.now() + 3600_000), userAgent: "firm-test" },
    });
    const access = await new SignJWT({ sub: u.id, id: u.id, sid: row.id, role: "member", email: u.email, username: u.username, pc: 1, ev: 1, typ: "access" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .setSubject(u.id)
      .sign(key);
    const csrf = randomBytes(32).toString("hex");
    return { cookie: `ap_session=${access}; ap_csrf=${csrf}`, csrf };
  }

  async function call(method: string, p: string, s: Sess | null, body?: unknown): Promise<Res> {
    for (let attempt = 0; ; attempt++) {
      const headers: Record<string, string> = {};
      if (s) {
        headers.cookie = s.cookie;
        if (method !== "GET") headers["x-csrf-token"] = s.csrf;
      }
      if (body !== undefined) headers["content-type"] = "application/json";
      const res = await fetch(`${BASE}${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
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
        /* not JSON */
      }
      return { status: res.status, json };
    }
  }

  const bizData = (userId: string, status: "approved" | "pending") => ({
    userId,
    slug: `firmtest-${status}-${TAG}`,
    status,
    name: `Firmtest ${status} ${TAG}`,
    contactName: "Firm Test",
    companyType: "sahis" as const,
    taxOffice: "Çankaya VD",
    taxNumber: "1234567890",
    categoryId: "services",
    city: "Ankara",
    district: "Çankaya",
    description: "Sahibinin girdiği gerçek firma açıklaması burada yer alır.",
    email: `biz-${status}-${TAG}@firmtest.invalid`,
    phone: "03120000000",
    ...(status === "approved" ? { approvedAt: new Date() } : {}),
  });

  try {
    await prisma.rateLimitBucket.deleteMany({});
    const owner = await makeUser("owner");
    const pendingUser = await makeUser("pending");
    const other = await makeUser("other");
    await prisma.businessAccount.create({ data: bizData(owner.id, "approved") });
    await prisma.businessAccount.create({ data: bizData(pendingUser.id, "pending") });
    const sOwner = await makeSession(owner);
    const sPending = await makeSession(pendingUser);
    const sOther = await makeSession(other);

    let r = await call("GET", `/api/stores/by-seller/${owner.id}`, null);
    let f = r.json.firm as PublicFirm | null;
    check("A1", "New approved business: all extras empty (nothing generated)",
      r.status === 200 && !!f && f.hours === null && !f.serviceDistricts.length && !f.priceList.length && !f.announcements.length && !f.faq.length);

    const ankara = districtsOf("Ankara");
    const extras = {
      hours: { always: false, days: [{ day: 1, open: "09:00", close: "18:00" }, { day: 6, open: "10:00", close: "14:00" }] },
      serviceDistricts: [ankara[0], ankara[1]],
      priceList: [{ title: "Oda boyama", min: 2500, max: 4000, unit: "oda" }],
      announcements: [{ text: "Ekim boyunca keşif ücretsiz." }],
      faq: [{ q: "Malzeme dahil mi?", a: "Hayır, ayrıca fiyatlanır." }],
    };
    r = await call("PATCH", "/api/account/business", sOwner, extras);
    const saved = (r.json.business as { extras?: PublicFirm } | undefined)?.extras;
    check("A2", "Owner saves hours, districts, prices, announcements and Q&A", r.status === 200 && saved?.priceList[0]?.min === 2500, `status ${r.status} ${String(r.json.error ?? "")}`);

    r = await call("GET", `/api/stores/by-seller/${owner.id}`, null);
    f = r.json.firm as PublicFirm | null;
    check("A3", "Public endpoint returns exactly what the owner entered",
      !!f && f.serviceDistricts.join() === `${ankara[0]},${ankara[1]}` && f.faq[0]?.q === "Malzeme dahil mi?" &&
        !!f.hours && !f.hours.always && f.hours.days.length === 2 && f.announcements[0]?.text === "Ekim boyunca keşif ücretsiz.");
    const leaked = ["taxNumber", "taxOffice", "email", "phone", "contactName", "userId", "id"].filter((k) => f && k in f);
    check("A4", "Public endpoint exposes no tax / contact / internal ids", leaked.length === 0, leaked.join(", "));
    const firstAt = f?.announcements[0]?.at;

    r = await call("PATCH", "/api/account/business", sOwner, { serviceDistricts: ["Kadıköy"] });
    check("A5", "District outside the business city rejected", r.status === 400 && r.json.error === "biz.err.districts", `status ${r.status}`);
    r = await call("PATCH", "/api/account/business", sOwner, { hours: { always: false, days: [{ day: 2, open: "20:00", close: "08:00" }] } });
    check("A6", "Invalid hours rejected", r.status === 400 && r.json.error === "biz.err.hours", `status ${r.status}`);
    r = await call("PATCH", "/api/account/business", sOwner, { priceList: [{ title: "x", min: -5 }] });
    check("A7", "Invalid price rejected", r.status === 400, `status ${r.status}`);
    r = await call("PATCH", "/api/account/business", sOwner, { faq: [{ q: "<script>alert(1)</script> soru", a: "cevap <b>x</b>" }] });
    const stored = await prisma.businessAccount.findUnique({ where: { userId: owner.id }, select: { faq: true } });
    check("A8", "Q&A text is sanitised (no HTML stored)", r.status === 200 && !/[<>]/.test(JSON.stringify(stored?.faq)), `status ${r.status}`);

    await new Promise((res) => setTimeout(res, 20));
    r = await call("PATCH", "/api/account/business", sOwner, { announcements: [{ text: "Ekim boyunca keşif ücretsiz." }, { text: "Yeni şube açıldı." }] });
    const ann = (r.json.business as { extras?: PublicFirm } | undefined)?.extras?.announcements ?? [];
    check("A9", "Unchanged announcement keeps its original date", ann[0]?.at === firstAt && ann.length === 2 && ann[1].at >= (firstAt ?? 0));

    r = await call("PATCH", "/api/account/business", sOther, { faq: [{ q: "Başkasının profili?", a: "Olmamalı" }] });
    const ownerFaq = await prisma.businessAccount.findUnique({ where: { userId: owner.id }, select: { faq: true } });
    check("A10", "A user without an approved business cannot edit anyone's profile",
      r.status === 404 && !JSON.stringify(ownerFaq?.faq).includes("Başkasının"), `status ${r.status}`);
    r = await call("PATCH", "/api/account/business", sPending, { faq: [{ q: "Bekleyen hesap sorusu", a: "Olmamalı" }] });
    check("A11", "Pending business cannot edit the service profile", r.status === 409, `status ${r.status}`);
    r = await call("PATCH", "/api/account/business", null, { faq: [] });
    check("A12", "Anonymous edit refused", r.status === 401 || r.status === 403, `status ${r.status}`);
    r = await call("PATCH", "/api/account/business", { ...sOwner, csrf: "wrong" }, { faq: [] });
    check("A13", "Edit without a valid CSRF token refused", r.status === 403, `status ${r.status}`);

    r = await call("GET", `/api/stores/by-seller/${pendingUser.id}`, null);
    check("A14", "Pending business has no public firm profile", r.status === 200 && r.json.firm === null);
    r = await call("GET", `/api/stores/by-seller/not-a-uuid`, null);
    check("A15", "Malformed seller id → firm null", r.status === 200 && r.json.firm === null);

    r = await call("PATCH", "/api/account/business", sOwner, { hours: null, serviceDistricts: [], priceList: [], announcements: [], faq: [] });
    r = await call("GET", `/api/stores/by-seller/${owner.id}`, null);
    f = r.json.firm as PublicFirm | null;
    check("A16", "Owner can clear every section; it is then empty again (no fallback content)",
      !!f && f.hours === null && !f.serviceDistricts.length && !f.priceList.length && !f.announcements.length && !f.faq.length);

    const rest = await prisma.businessAccount.findUnique({ where: { userId: owner.id }, select: { description: true, taxNumber: true } });
    check("A17", "Saving extras leaves the rest of the store untouched",
      rest?.description === bizData(owner.id, "approved").description && rest?.taxNumber === "1234567890");
  } finally {
    const tagged = await prisma.user.findMany({ where: { email: { endsWith: `-${TAG}@firmtest.invalid` } }, select: { id: true } });
    const ids = tagged.map((u) => u.id);
    await prisma.businessAccount.deleteMany({ where: { userId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}

async function main() {
  unitTests();
  if (process.env.FIRM_UNIT_ONLY !== "1") await httpTests();
  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
