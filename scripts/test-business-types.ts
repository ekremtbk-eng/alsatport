/**
 * Every corporate business type end to end. Runs ONLY against a local server + local database:
 *
 *   BUSINESS_TEST_BASE=http://localhost:3013 DATABASE_URL=<local> AUTH_SECRET=<same as server> npx tsx scripts/test-business-types.ts
 *
 * For each store category (= business type) with the four company types rotated: apply → admin approve → listing →
 * store page, listing detail card, listing API ref, owner panel + display preferences, phone privacy (listing hint,
 * reveal API, detail/store HTML) with the store phone on, off and on again → /magazalar; then unauthorized phone
 * reveal / preference attempts and an individual seller whose phone flow must stay unchanged.
 * Creates throw-away users (`*@typetest.invalid`) and removes them, their stores, listings and uploads at the end.
 */
import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";
import { categories, type Category } from "@/data/categories";
import { COMPANY_TYPES, businessCategories, businessTypeKey } from "@/lib/business/shared";
import { MESSAGES } from "@/i18n/messages";

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
const DOMAIN = "typetest.invalid";

const results: { id: string; pass: boolean }[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(14)} ${name}${detail ? `  — ${detail}` : ""}`);
}

type Role = "member" | "seller" | "admin";
type TestUser = { id: string; email: string; username: string; role: Role };
type Sess = { cookie: string; csrf: string };
type Res = { status: number; json: Record<string, unknown>; text: string };

async function makeUser(label: string, role: Role, phone?: string): Promise<TestUser> {
  const email = `${label}-${TAG}@${DOMAIN}`;
  const username = `typetest_${label}_${TAG}`.slice(0, 30);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      role,
      passwordHash: await bcrypt.hash(randomBytes(12).toString("base64url"), 10),
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: `Type ${label}`,
          fullName: `Type Test ${label}`,
          profileComplete: !!phone,
          ...(phone ? { phone, address: "Atatürk Caddesi No:5 Merkez", city: "Ankara" } : {}),
        },
      },
    },
  });
  return { id: user.id, email, username, role };
}

async function makeSession(u: TestUser, opts: { mfa?: boolean; stepUp?: boolean } = {}): Promise<Sess> {
  const created = new Date(Date.now() - (opts.mfa ? 60 : 0) * 60_000);
  const row = await prisma.userSession.create({
    data: {
      userId: u.id,
      method: opts.mfa ? "otp" : "password",
      mfaAt: opts.mfa ? created : null,
      stepUpAt: opts.stepUp ? new Date() : null,
      createdAt: created,
      lastSeenAt: created,
      expiresAt: new Date(Date.now() + 3600_000),
      userAgent: "business-types-test",
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

async function uploadImage(s: Sess, kind: "logo" | "cover") {
  const [w, h] = kind === "logo" ? [400, 400] : [1600, 500];
  const bytes = await sharp({ create: { width: w, height: h, channels: 3, background: "#00a844" } }).png().toBuffer();
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: "image/png" }), `${kind}.png`);
  form.append("kind", kind);
  const r = await send("POST", "/api/account/business/media", s, form);
  return String(r.json.url ?? "");
}

function leavesOf(root: Category): string[] {
  const out: string[] = [];
  const walk = (c: Category) => (c.children?.length ? c.children.forEach(walk) : out.push(c.id));
  walk(root);
  return out;
}

/** HTML text comparisons: React escapes these characters in server-rendered markup. */
const html = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");

async function main() {
  console.log(`Business types → ${BASE} (tag ${TAG})\n`);
  const tr = MESSAGES.tr;
  const types = businessCategories();

  // ---------- Static coverage ----------
  check("U1", `Store categories present (${types.length})`, types.length >= 10, types.map((c) => c.id).join(","));
  const generic = types.filter((c) => businessTypeKey(c.id) === "biz.type.store").map((c) => c.id);
  check("U2", "Every store category maps to its own business type label", generic.length === 0, generic.join(","));
  const typeKeys = [...new Set([...types.map((c) => businessTypeKey(c.id)), "biz.type.store", ...COMPANY_TYPES.map((t) => `biz.type.${t}`)])];
  const missing = typeKeys.filter((k) => {
    const row = (MESSAGES as unknown as Record<string, Record<string, string>>);
    return ["tr", "en", "de", "ar", "ru"].some((lang) => !row[lang]?.[k]?.trim());
  });
  check("U3", `Business + company type labels translated in 5 languages (${typeKeys.length} keys)`, missing.length === 0, missing.join(","));
  const virtual = categories.filter((c) => c.filter).map((c) => c.id);
  check("U4", "Virtual filter shortcuts are not business types", !types.some((c) => virtual.includes(c.id)));

  const known = new Set((await prisma.category.findMany({ select: { id: true } })).map((c) => c.id));
  await prisma.rateLimitBucket.deleteMany({});
  const admin = await makeUser("admin", "admin");
  const sAdmin = await makeSession(admin, { mfa: true, stepUp: true });
  const other = await makeUser("other", "member");
  const sOther = await makeSession(other);
  const names: string[] = [];

  try {
    for (const [i, cat] of types.entries()) {
      const companyType = COMPANY_TYPES[i % COMPANY_TYPES.length];
      const id = cat.id;
      const typeLabel = tr[businessTypeKey(id)];
      const ownerPhone = `53${String(Date.now() + i).slice(-8)}`;
      const owner = await makeUser(`o${i}`, "seller", ownerPhone);
      await prisma.profile.update({ where: { userId: owner.id }, data: { phoneVerifiedAt: new Date() } });
      const sOwner = await makeSession(owner);
      const sViewer = await makeSession(await makeUser(`v${i}`, "member"));
      const name = `Typetest ${id} ${TAG}`;
      names.push(name);

      const logoUrl = await uploadImage(sOwner, "logo");
      const coverUrl = await uploadImage(sOwner, "cover");
      let r = await call("POST", "/api/account/business", sOwner, {
        name,
        contactName: "Deneme Yetkili",
        companyType,
        taxOffice: "Çankaya VD",
        taxNumber: "1234567890",
        categoryId: id,
        city: "Ankara",
        district: "Çankaya",
        description: `${typeLabel} türü için oluşturulan geçici yerel test mağazası açıklaması.`,
        email: `store-${i}-${TAG}@${DOMAIN}`,
        phone: "0312 555 00 00",
        logoUrl,
        coverUrl,
      });
      const slug = String((r.json.business as Record<string, unknown> | undefined)?.slug ?? "");
      check(`${id}.apply`, `${typeLabel} (${companyType}) application accepted`, r.status === 200 && !!slug, `status ${r.status} ${String(r.json.error ?? "")}`);
      if (!slug) continue;
      const biz = await prisma.businessAccount.findUnique({ where: { userId: owner.id }, select: { id: true } });
      r = await call("POST", `/api/admin/business/${biz?.id}`, sAdmin, { action: "approve" });
      check(`${id}.approve`, "Admin approval", r.status === 200, `status ${r.status}`);

      const leaf = leavesOf(cat).find((c) => known.has(c));
      const title = `Typetest ilan ${id} ${TAG}`;
      const listing = leaf
        ? await prisma.listing.create({
            data: {
              listingNo: `TT${Date.now()}${i}`,
              sellerId: owner.id,
              categoryId: leaf,
              title,
              description: "Geçici yerel test ilanı.",
              price: 1000 + i,
              city: "Ankara",
              district: "Çankaya",
              status: "active",
              postedAt: new Date(),
              expiresAt: new Date(Date.now() + 30 * 864e5),
            },
          })
        : null;
      check(`${id}.listing`, `Listing in a ${id} leaf category`, !!listing, leaf ?? "no leaf in DB");

      r = await call("GET", `/magaza/${slug}`, null);
      check(
        `${id}.store`,
        "Store page: type label, name, live listing count",
        r.status === 200 && r.text.includes(html(typeLabel)) && r.text.includes(name) && r.text.includes(title) && r.text.includes("Doğrulanmış İşletme"),
        `status ${r.status}`,
      );
      check(`${id}.private`, "Store page hides tax data and contact person", !r.text.includes("1234567890") && !r.text.includes("Deneme Yetkili"));
      if (listing && id === "services") {
        // Service listings open on the provider page, which renders the store card client-side from the listing API.
        r = await call("GET", `/ustalar-hizmetler/firma/${listing.id}`, null);
        check(`${id}.detail`, "Service provider page opens for the store's listing", r.status === 200, `status ${r.status}`);
      } else if (listing) {
        r = await call("GET", `/ilan/${listing.id}`, null);
        check(`${id}.detail`, "Listing detail shows corporate card", r.status === 200 && r.text.includes(`/magaza/${slug}`) && r.text.includes(html(typeLabel)) && r.text.includes("Mağazayı Görüntüle"), `status ${r.status}`);
      }
      if (listing) {
        r = await call("GET", `/api/listings?sellerId=${owner.id}`, null);
        const ref = ((r.json.listings as Record<string, unknown>[] | undefined) ?? []).find((l) => l.id === listing.id)?.store as Record<string, unknown> | undefined;
        check(`${id}.ref`, "Listing API store ref carries the category", ref?.slug === slug && ref?.categoryId === id && !("contactName" in ref), JSON.stringify(ref ?? null));
        r = await call("GET", `/api/listings/${listing.id}`, null);
        const hint = String((r.json.listing as Record<string, unknown> | undefined)?.sellerPhone ?? "");
        check(`${id}.phHint`, "Phone shown (default): listing API carries only a masked hint", hint.includes("*") && hint.endsWith(ownerPhone.slice(-2)) && !r.text.includes(ownerPhone), hint);
        r = await call("POST", `/api/listings/${listing.id}/phone`, sViewer, {});
        check(`${id}.phReveal`, "Phone shown (default): member reveal returns the number", r.status === 200 && r.json.phone === ownerPhone, `status ${r.status} ${String(r.json.error ?? "")}`);
      }

      r = await call("GET", "/isletme-paneli", sOwner);
      check(`${id}.panel`, "Owner panel opens", r.status === 200, `status ${r.status}`);
      r = await call("PATCH", "/api/account/business", sOwner, { showContactName: true, showPhone: false, team: [{ name: "Deneme Üye", role: "Sorumlu" }] });
      const saved = r.json.business as Record<string, unknown> | undefined;
      check(`${id}.prefs`, "Owner saves display preferences + team", r.status === 200 && saved?.showContactName === true && saved?.showPhone === false, `status ${r.status} ${String(r.json.error ?? "")}`);
      r = await call("GET", `/magaza/${slug}`, null);
      check(`${id}.shown`, "Opt-in contact person + team visible", r.text.includes("Deneme Yetkili") && r.text.includes('id="ekibimiz"') && r.text.includes("Deneme Üye"));
      r = await call("GET", `/api/stores/${slug}/contact`, sViewer);
      check(`${id}.contact`, "Contact API respects phone preference", r.status === 200 && r.json.phone === "" && !!r.json.email, JSON.stringify(r.json));

      if (listing) {
        const tail = ownerPhone.slice(-2);
        const masked = `${ownerPhone.slice(0, 4)} *** ** ${tail}`;
        r = await call("GET", `/api/listings/${listing.id}`, null);
        const one = r.json.listing as Record<string, unknown> | undefined;
        const list = await call("GET", `/api/listings?sellerId=${owner.id}`, null);
        const mine = ((list.json.listings as Record<string, unknown>[] | undefined) ?? []).find((l) => l.id === listing.id);
        check(
          `${id}.phHidden`,
          "Phone hidden: no hint in listing / seller APIs",
          !!one && !one.sellerPhone && !!mine && !mine.sellerPhone && !r.text.includes(masked) && !list.text.includes(masked),
          `one=${String(one?.sellerPhone ?? "")} list=${String(mine?.sellerPhone ?? "")}`,
        );
        const page = id === "services" ? `/ustalar-hizmetler/firma/${listing.id}` : `/ilan/${listing.id}`;
        const [detail, store] = await Promise.all([call("GET", page, null), call("GET", `/magaza/${slug}`, null)]);
        check(
          `${id}.phPages`,
          "Phone hidden: detail + store HTML carry neither number nor hint",
          detail.status === 200 && ![detail.text, store.text].some((t) => t.includes(ownerPhone) || t.includes(masked)),
          `status ${detail.status}`,
        );
        r = await call("POST", `/api/listings/${listing.id}/phone`, sViewer, {});
        check(`${id}.phBlocked`, "Phone hidden: member reveal refused", r.status === 404 && r.json.error === "seller.nophone" && !r.text.includes(ownerPhone), `status ${r.status}`);

        r = await call("PATCH", "/api/account/business", sOwner, { showPhone: true });
        check(`${id}.phOn`, "Owner turns the phone back on", r.status === 200 && (r.json.business as Record<string, unknown> | undefined)?.showPhone === true, `status ${r.status}`);
        r = await call("POST", `/api/listings/${listing.id}/phone`, sViewer, {});
        const back = await call("GET", `/api/listings/${listing.id}`, null);
        const hintBack = String((back.json.listing as Record<string, unknown> | undefined)?.sellerPhone ?? "");
        check(`${id}.phRestored`, "Phone shown again: hint + reveal work", r.status === 200 && r.json.phone === ownerPhone && hintBack.endsWith(tail), `status ${r.status}`);
        await call("PATCH", "/api/account/business", sOwner, { showPhone: false });
      }
    }

    // ---------- Unauthorized access + individual sellers (phone reveal) ----------
    const hidden = await prisma.listing.findFirst({ where: { title: `Typetest ilan ${types[0].id} ${TAG}` }, select: { id: true, sellerId: true } });
    if (hidden) {
      const anonCsrf = randomBytes(32).toString("hex");
      let r = await call("POST", `/api/listings/${hidden.id}/phone`, { cookie: `ap_csrf=${anonCsrf}`, csrf: anonCsrf }, {});
      check("A1", "Reveal with a valid CSRF pair but no session is rejected", r.status === 401 && !r.text.includes('"phone"'), `status ${r.status}`);
      const noCsrf = await fetch(`${BASE}/api/listings/${hidden.id}/phone`, {
        method: "POST",
        headers: { cookie: sOther.cookie, "content-type": "application/json" },
        body: "{}",
      });
      check("A2", "Reveal without CSRF token is rejected", noCsrf.status === 403, `status ${noCsrf.status}`);
      r = await call("POST", "/api/listings/not-a-uuid/phone", sOther, {});
      check("A3", "Reveal with a malformed id is rejected", r.status === 400, `status ${r.status}`);
      r = await call("PATCH", "/api/account/business", sOther, { showPhone: true });
      const still = await prisma.businessAccount.findUnique({ where: { userId: hidden.sellerId }, select: { showPhone: true } });
      check("A4", "Non-owner cannot switch a store's phone back on", r.status === 404 && still?.showPhone === false, `status ${r.status}`);
      r = await call("GET", `/api/stores/${(await prisma.businessAccount.findUnique({ where: { userId: hidden.sellerId }, select: { slug: true } }))?.slug}/contact`, null);
      check("A5", "Store contact API without session is rejected", r.status === 401 || r.status === 403, `status ${r.status}`);
      r = await call("POST", `/api/listings/${hidden.id}/phone`, sAdmin, {});
      check("A6", "Hidden phone is not revealed even to admin sessions", r.status === 404 && r.json.error === "seller.nophone", `status ${r.status}`);
    }

    const indPhone = `54${String(Date.now()).slice(-8)}`;
    const ind = await makeUser("ind", "seller", indPhone);
    await prisma.profile.update({ where: { userId: ind.id }, data: { phoneVerifiedAt: new Date() } });
    const indListing = await prisma.listing.create({
      data: {
        listingNo: `TTI${Date.now()}`,
        sellerId: ind.id,
        categoryId: leavesOf(types.find((c) => c.id === "shopping") ?? types[0]).find((c) => known.has(c)) ?? "",
        title: `Typetest bireysel ${TAG}`,
        description: "Geçici yerel test ilanı.",
        price: 500,
        city: "Ankara",
        district: "Çankaya",
        status: "active",
        postedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 864e5),
      },
    });
    let ir = await call("GET", `/api/listings/${indListing.id}`, null);
    const indHint = String((ir.json.listing as Record<string, unknown> | undefined)?.sellerPhone ?? "");
    check("I1", "Individual seller: masked hint unchanged", indHint.includes("*") && indHint.endsWith(indPhone.slice(-2)) && !ir.text.includes(indPhone), indHint);
    ir = await call("POST", `/api/listings/${indListing.id}/phone`, sOther, {});
    check("I2", "Individual seller: member reveal unchanged", ir.status === 200 && ir.json.phone === indPhone, `status ${ir.status} ${String(ir.json.error ?? "")}`);
    ir = await call("POST", `/api/listings/${indListing.id}/phone`, null, {});
    check("I3", "Individual seller: anonymous reveal still rejected", ir.status === 401 || ir.status === 403, `status ${ir.status}`);

    const r = await call("GET", "/magazalar", null);
    const absent = names.filter((n) => !r.text.includes(n));
    check("M1", `All ${names.length} type stores listed on /magazalar`, r.status === 200 && absent.length === 0, absent.join(", "));
  } finally {
    const tagged = await prisma.user.findMany({ where: { email: { endsWith: `-${TAG}@${DOMAIN}` } }, select: { id: true } });
    const ids = tagged.map((u) => u.id);
    await prisma.listingImage.deleteMany({ where: { listing: { sellerId: { in: ids } } } });
    await prisma.listing.deleteMany({ where: { sellerId: { in: ids } } });
    await prisma.businessAccount.deleteMany({ where: { userId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    const uploads = path.join(process.cwd(), ".data", "uploads");
    for (const id of ids) await rm(path.join(uploads, "business", id), { recursive: true, force: true });
    const left = await prisma.user.count({ where: { email: { endsWith: `@${DOMAIN}` } } });
    check("X1", "Test data removed", left === 0, `${left} users left`);
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
