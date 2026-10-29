/**
 * EİDS temporary publish-lock unit + loopback API checks.
 *
 *   E2E_BASE=http://127.0.0.1:3014 E2E_DATABASE_URL=postgresql://postgres@127.0.0.1:55433/alsat \
 *     npx tsx --conditions=react-server scripts/test-eids-publish-lock.ts
 *
 * Unit section always runs. API section runs only when E2E_* point at loopback.
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  EIDS_PUBLISH_UNLOCK_TOKEN,
  eidsBlocksActivePublish,
  eidsGatePrefixes,
  isEidsGateCategory,
  isEidsPublishLockActive,
} from "../src/lib/listings/eidsPublishLock";
import { newPeriod } from "../src/lib/listings/lifecycle";

type Row = { id: string; name: string; pass: boolean; detail?: string };
const results: Row[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(6)} ${name}${detail ? `  — ${detail}` : ""}`);
}

const TAG = randomBytes(3).toString("hex");
const STRONG = `Eids!${TAG}9aA`;
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;

console.log("\n--- unit: gate helpers (default lock ON) ---");
delete process.env.EIDS_PUBLISH_UNLOCK;
delete process.env.EIDS_PUBLISH_LOCK;
delete process.env.EIDS_GATE_CATEGORY_PREFIXES;
check("U1", "lock active by default", isEidsPublishLockActive());
check("U2", "emlak root gated", isEidsGateCategory("emlak"));
check("U3", "vasita-otomobil gated", isEidsGateCategory("vasita-otomobil"));
check("U3b", "emlak-konut-satilik-daire leaf gated", isEidsGateCategory("emlak-konut-satilik-daire"));
check("U3c", "vasita-deniz leaf gated", isEidsGateCategory("vasita-deniz"));
check("U4", "shopping not gated", !isEidsGateCategory("shopping"));
check("U5", "parts-auto not gated", !isEidsGateCategory("parts-auto"));
check("U6", "blocks create (no existing)", eidsBlocksActivePublish("vasita-otomobil"));
check(
  "U7",
  "allows content edit of already-active gated listing",
  !eidsBlocksActivePublish("vasita-otomobil", { status: "active", categoryId: "vasita-otomobil" }),
);
check(
  "U8",
  "blocks renew of expired gated listing",
  eidsBlocksActivePublish("emlak-konut-satilik-daire", { status: "expired", categoryId: "emlak-konut-satilik-daire" }),
);
check(
  "U8b",
  "blocks reactivation passive→active gated",
  eidsBlocksActivePublish("vasita-otomobil", { status: "passive", categoryId: "vasita-otomobil" }),
);
check(
  "U9",
  "blocks category move shopping→vasita while active",
  eidsBlocksActivePublish("vasita-moto", { status: "active", categoryId: "shopping" }),
);
check(
  "U10",
  "allows active shopping stay shopping",
  !eidsBlocksActivePublish("shopping", { status: "active", categoryId: "shopping" }),
);

process.env.EIDS_PUBLISH_LOCK = "0";
check("U11a", "EIDS_PUBLISH_LOCK=0 does NOT disable", isEidsPublishLockActive());
delete process.env.EIDS_PUBLISH_LOCK;
process.env.EIDS_PUBLISH_UNLOCK = "0";
check("U11", "EIDS_PUBLISH_UNLOCK=0 alone does NOT disable", isEidsPublishLockActive());
process.env.EIDS_PUBLISH_UNLOCK = EIDS_PUBLISH_UNLOCK_TOKEN;
check("U12", "exact unlock token disables gate", !isEidsPublishLockActive());
delete process.env.EIDS_PUBLISH_UNLOCK;

process.env.EIDS_GATE_CATEGORY_PREFIXES = "typo,shopping,parts";
check(
  "U13",
  "invalid PREFIXES fall back to defaults (emlak+vasita still gated)",
  eidsGatePrefixes().join(",") === "emlak,vasita" && isEidsGateCategory("vasita-otomobil"),
  `prefixes=${eidsGatePrefixes().join(",")}`,
);
process.env.EIDS_GATE_CATEGORY_PREFIXES = "emlak-konut-satilik,vasita-otomobil";
check(
  "U14",
  "narrow PREFIXES: satilik leaf gated, vasita-deniz not",
  isEidsGateCategory("emlak-konut-satilik-daire") &&
    isEidsGateCategory("vasita-otomobil") &&
    !isEidsGateCategory("vasita-deniz") &&
    !isEidsGateCategory("emlak-arsa-tarla"),
);
delete process.env.EIDS_GATE_CATEGORY_PREFIXES;

const BASE = (process.env.E2E_BASE ?? "").replace(/\/$/, "");
const DB = process.env.E2E_DATABASE_URL ?? "";
const runApi = Boolean(BASE && DB);

async function apiSection() {
  if (!runApi) {
    console.log("\n--- api: SKIPPED (set E2E_BASE + E2E_DATABASE_URL for loopback) ---");
    return;
  }
  if (!LOOPBACK.test(new URL(BASE).hostname)) throw new Error("Refusing non-local app");
  const dbHost = new URL(DB).hostname;
  if (!LOOPBACK.test(dbHost) || new URL(DB).port !== "55433") throw new Error("Refusing non-loopback:55433");

  console.log(`\n--- api: ${BASE} ---`);
  const prisma = new PrismaClient({ datasources: { db: { url: DB } } });
  type Sess = { cookie: string; csrf: string };

  async function login(email: string, password: string): Promise<Sess> {
    const jar = new Map<string, string>();
    const take = (r: Response) => {
      for (const c of typeof r.headers.getSetCookie === "function" ? r.headers.getSetCookie() : []) {
        const [kv] = c.split(";");
        const i = kv.indexOf("=");
        if (i > 0) jar.set(kv.slice(0, i), kv.slice(i + 1));
      }
    };
    const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    let r = await fetch(`${BASE}/api/auth/csrf`);
    take(r);
    let { token } = (await r.json()) as { token: string };
    jar.set("ap_csrf", token);
    r = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": token, cookie: cookie(), Origin: BASE },
      body: JSON.stringify({ identifier: email, password }),
    });
    take(r);
    r = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: cookie() }, cache: "no-store" });
    take(r);
    ({ token } = (await r.json()) as { token: string });
    jar.set("ap_csrf", token);
    return { cookie: cookie(), csrf: token };
  }

  async function call(method: string, path: string, s: Sess, body?: unknown) {
    if (method !== "GET") {
      const c = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: s.cookie }, cache: "no-store" });
      const { token } = (await c.json()) as { token: string };
      s.csrf = token;
      const jar = new Map(
        s.cookie
          .split("; ")
          .filter(Boolean)
          .map((p) => {
            const i = p.indexOf("=");
            return [p.slice(0, i), p.slice(i + 1)] as [string, string];
          }),
      );
      jar.set("ap_csrf", token);
      if (typeof c.headers.getSetCookie === "function") {
        for (const x of c.headers.getSetCookie()) {
          const [kv] = x.split(";");
          const i = kv.indexOf("=");
          if (i > 0) jar.set(kv.slice(0, i), kv.slice(i + 1));
        }
      }
      s.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    }
    const headers: Record<string, string> = { Origin: BASE, cookie: s.cookie };
    if (method !== "GET") headers["x-csrf-token"] = s.csrf;
    let payload: string | undefined;
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(`${BASE}${path}`, { method, headers, body: payload, redirect: "manual" });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      /* HTML */
    }
    return { status: res.status, json };
  }

  const email = `eids-${TAG}@eids-test.invalid`;
  const user = await prisma.user.create({
    data: {
      email,
      username: `eids_${TAG}`,
      role: "seller",
      passwordHash: await bcrypt.hash(STRONG, 10),
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: "EIDS",
          fullName: "EIDS Tester",
          profileComplete: true,
          phone: "05321112233",
          address: "Test Cad No:1 Kadıköy",
          city: "İstanbul",
        },
      },
    },
  });
  const sess = await login(email, STRONG);

  const imgUrl = `https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&eids=${TAG}`;
  // Seed one active vasita listing via DB (bypasses gate) to test edit/delete
  const period = newPeriod();
  const live = await prisma.listing.create({
    data: {
      status: "active",
      postedAt: period.postedAt,
      expiresAt: period.expiresAt,
      sellerId: user.id,
      listingNo: `EIDS${TAG}`,
      categoryId: "vasita-otomobil",
      title: `EIDS live ${TAG}`,
      description: "Seeded for edit/delete under lock",
      price: 100_000,
      city: "İstanbul",
      district: "Kadıköy",
      specs: [],
      features: [],
      images: {
        create: [{ storageKey: `eids/${TAG}/1`, url: imgUrl, sortOrder: 0, isCover: true }],
      },
    },
  });

  const blockedCreate = await call("POST", "/api/listings", sess, {
    title: `EIDS block ${TAG}`,
    description: "Should be blocked by EİDS gate",
    categoryId: "vasita-otomobil",
    city: "İstanbul",
    district: "Kadıköy",
    price: 50_000,
    images: [imgUrl],
    specs: [
      { label: "Marka", value: "BMW" },
      { label: "Model", value: "3 Serisi" },
      { label: "Paket", value: "316i" },
      { label: "Yıl", value: "2019" },
      { label: "Km", value: "10.000 km" },
      { label: "Vites", value: "Manuel" },
      { label: "Yakıt", value: "Benzin" },
      { label: "Renk", value: "Beyaz" },
      { label: "Kimden", value: "Sahibinden" },
    ],
  });
  // A1 product change: gated creates succeed as owner-only drafts (not active).
  const draftOk =
    blockedCreate.status === 200 &&
    blockedCreate.json.ok === true &&
    blockedCreate.json.listing?.status === "draft" &&
    !blockedCreate.json.listing?.expiresAt;
  check(
    "A1",
    "POST vasita create → 200 draft (not active)",
    draftOk,
    `status=${blockedCreate.status} listingStatus=${String(blockedCreate.json.listing?.status)}`,
  );

  const blockedEmlak = await call("POST", "/api/listings", sess, {
    title: `EIDS emlak ${TAG}`,
    description: "Should be draft",
    categoryId: "emlak-konut-satilik-daire",
    city: "İstanbul",
    district: "Kadıköy",
    price: 1_000_000,
    images: [imgUrl],
    specs: [],
  });
  check(
    "A2",
    "POST emlak create → 200 draft (not active)",
    blockedEmlak.status === 200 && blockedEmlak.json.listing?.status === "draft",
    `status=${blockedEmlak.status} listingStatus=${String(blockedEmlak.json.listing?.status)}`,
  );
  if (blockedCreate.json.listing?.id) {
    const anonGet = await call("GET", `/api/listings/${blockedCreate.json.listing.id}`);
    check(
      "A1b",
      "anonymous GET draft → 404",
      anonGet.status === 404,
      `status=${anonGet.status}`,
    );
  }

  const titleEdit = await call("PUT", `/api/listings/${live.id}`, sess, { title: `EIDS edited ${TAG}` });
  check("A3", "PUT title on already-active vasita allowed", titleEdit.status === 200, `status=${titleEdit.status}`);

  const catBypass = await call("PUT", `/api/listings/${live.id}`, sess, {
    // try moving a hypothetical shopping listing — seed a shopping active then move
  });
  void catBypass;

  const shop = await prisma.listing.create({
    data: {
      status: "active",
      postedAt: period.postedAt,
      expiresAt: period.expiresAt,
      sellerId: user.id,
      listingNo: `EIDSS${TAG}`,
      categoryId: "shopping",
      title: `EIDS shop ${TAG}`,
      description: "Shopping for bypass test",
      price: 100,
      city: "İstanbul",
      district: "Kadıköy",
      specs: [],
      features: [],
      images: {
        create: [{ storageKey: `eids/${TAG}/s`, url: imgUrl, sortOrder: 0, isCover: true }],
      },
    },
  });
  const bypass = await call("PUT", `/api/listings/${shop.id}`, sess, { categoryId: "vasita-otomobil" });
  check(
    "A4",
    "PUT category shopping→vasita blocked",
    bypass.status === 403 && bypass.json.error === "listing.err.eidsRequired",
    `status=${bypass.status}`,
  );

  const expired = await prisma.listing.create({
    data: {
      status: "expired",
      postedAt: new Date(Date.now() - 20 * 864e5),
      expiresAt: new Date(Date.now() - 864e5),
      sellerId: user.id,
      listingNo: `EIDSE${TAG}`,
      categoryId: "vasita-otomobil",
      title: `EIDS expired ${TAG}`,
      description: "Renew should fail",
      price: 90_000,
      city: "İstanbul",
      district: "Kadıköy",
      specs: [],
      features: [],
      images: {
        create: [{ storageKey: `eids/${TAG}/e`, url: imgUrl, sortOrder: 0, isCover: true }],
      },
    },
  });
  const renew = await call("POST", "/api/listings/renew", sess, { id: expired.id });
  check(
    "A5",
    "renew expired vasita → 403 eidsRequired",
    renew.status === 403 && renew.json.error === "listing.err.eidsRequired",
    `status=${renew.status}`,
  );

  const sold = await prisma.listing.create({
    data: {
      status: "sold",
      soldAt: new Date(),
      postedAt: period.postedAt,
      expiresAt: period.expiresAt,
      sellerId: user.id,
      listingNo: `EIDSSOLD${TAG}`,
      categoryId: "emlak-arsa-tarla",
      title: `EIDS sold ${TAG}`,
      description: "Resale should fail",
      price: 500_000,
      city: "İstanbul",
      district: "Kadıköy",
      specs: [],
      features: [],
      images: {
        create: [{ storageKey: `eids/${TAG}/sold`, url: imgUrl, sortOrder: 0, isCover: true }],
      },
    },
  });
  const resale = await call("POST", `/api/listings/${sold.id}/sold`, sess, { action: "resale" });
  check(
    "A6",
    "resale emlak → 403 eidsRequired",
    resale.status === 403 && resale.json.error === "listing.err.eidsRequired",
    `status=${resale.status}`,
  );

  const del = await call("DELETE", `/api/listings/${live.id}`, sess);
  check("A7", "DELETE existing vasita still allowed", del.status === 200, `status=${del.status}`);

  const pause = await call("PUT", `/api/listings/${shop.id}`, sess, { status: "passive" });
  check("A8", "PUT pause shopping allowed", pause.status === 200, `status=${pause.status}`);

  // cleanup
  const lids = (
    await prisma.listing.findMany({ where: { sellerId: user.id }, select: { id: true } })
  ).map((l) => l.id);
  await prisma.listingImage.deleteMany({ where: { listingId: { in: lids } } });
  await prisma.listing.deleteMany({ where: { id: { in: lids } } });
  await prisma.userSession.deleteMany({ where: { userId: user.id } });
  await prisma.profile.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();
}

async function main() {
  try {
    await apiSection();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length || process.exitCode) process.exit(1);
}

main();
