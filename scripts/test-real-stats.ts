/**
 * No fabricated statistics: visitor counter, corporate-member claim, service ratings/reviews/checks.
 *
 * Unit part (no DB): source scans and pure helpers.
 * DB/HTTP part runs ONLY against a local database and a local server:
 *
 *   STATS_TEST_BASE=http://localhost:3013 DATABASE_URL=<local> npx tsx --conditions=react-server scripts/test-real-stats.ts
 *
 * Creates throw-away users (`*@statstest.invalid`, one `@demo.alsatport.com`) with business accounts, removed at the end.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, type BusinessStatus } from "@prisma/client";
import { MESSAGES } from "@/i18n/messages";
import { buildFirmProfile, serviceRating } from "@/lib/serviceFirm";
import type { Listing } from "@/data/store";
import type { SellerReview } from "@/data/reviews";

const BASE = process.env.STATS_TEST_BASE ?? "";
const DB = process.env.DATABASE_URL ?? "";
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const TAG = randomBytes(4).toString("hex");

const results: { id: string; pass: boolean }[] = [];
function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${name}${detail ? `  — ${detail}` : ""}`);
}

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk("src");
const grep = (re: RegExp) => files.filter((f) => re.test(readFileSync(f, "utf8")));
const LOCALES = ["tr", "en", "de", "ar", "ru"] as const;
const msg = (key: string) => LOCALES.map((l) => MESSAGES[l][key]).filter((s): s is string => typeof s === "string");

function unitTests() {
  check("V1", "Random visitor badge component is gone", !existsSync("src/components/home/LiveVisitorsBadge.tsx"));
  const live = grep(/LiveVisitors|live-visitors|"home\.live/);
  check("V2", "No visitor-counter code, styles or texts left", live.length === 0, live.join(", "));
  const tr = grep(/kişi (siteyi )?inceliyor|browsing (right )?now/);
  check("V3", "No 'Şu an X kişi inceliyor' text in any language", tr.length === 0, tr.join(", "));
  const rnd = files.filter((f) => f.includes(join("src", "components")) && /Math\.random/.test(readFileSync(f, "utf8")));
  check("V4", "No Math.random in UI components", rnd.length === 0, rnd.join(", "));

  const fake = grep(/24[.,]000|24 000/);
  check("B1", "'24.000 kurumsal üye' claim removed in all languages", fake.length === 0, fake.join(", "));
  const thousands = msg("svc.offerLead").join(" ");
  check("B2", "No 'binlerce / thousands of providers' claim", !/binlerce|thousands|Tausend|آلاف|тысяч/i.test(thousands));
  check("B3", "Corporate count text is a {n} template in every language", msg("svc.heroSub").length === 5 && msg("svc.heroSub").every((s) => s.includes("{n}")));
  check("B4", "Count-free fallback text has no number", msg("svc.heroSubPlain").length === 5 && msg("svc.heroSubPlain").every((s) => !/\d/.test(s)));

  const listing = { id: "l1", sellerId: "s1", categoryId: "services-reno-paint", title: "Boya", description: "", images: [], features: [], city: "Ankara", district: "", price: 1000 } as unknown as Listing;
  const none = serviceRating(listing, []);
  check("R1", "Service rating without reviews is 0 / 0 (no generated score)", none.avg === 0 && none.count === 0);
  const reviews = [4, 5].map((rating, i) => ({ id: `r${i}`, sellerId: "s1", authorId: `a${i}`, authorName: "x", authorAvatar: "", rating, text: "ok", createdAt: "" }) as SellerReview);
  const real = serviceRating(listing, reviews);
  check("R2", "Service rating = real review average and count", real.avg === 4.5 && real.count === 2, `${real.avg}/${real.count}`);
  const firmSrc = readFileSync("src/lib/serviceFirm.ts", "utf8");
  check("R3", "Synthetic reviewer names/texts and generator removed", !/syntheticFirmReviews|REVIEWERS|SNIPPETS|2350/.test(firmSrc));
  check("R4", "Firm profile renders only real reviews", !/synthetic/i.test(readFileSync("src/components/ServiceFirmProfile.tsx", "utf8")));
  const plain = buildFirmProfile(listing, []);
  const biz = buildFirmProfile({ ...listing, sellerBusiness: true } as Listing, []);
  check("R5", "'Kontrol ettiğimiz bilgiler' empty for non-verified sellers", plain.checks.length === 0 && plain.rating.count === 0);
  check("R6", "Verified business shows only the admin-reviewed application fields",
    biz.checks.map((c) => c.label).join("|") === "Ticari Ünvanı|Yetkili Adı Soyadı|Vergi Dairesi|Vergi Numarası");
  check("R7", "Same profile on every render (no random checklist length)",
    buildFirmProfile({ ...listing, id: "other" } as Listing, []).checks.length === 0);
}

async function dbTests() {
  if (!LOOPBACK.test(new URL(DB).hostname)) throw new Error("Refusing to run DB tests against a non-local database.");
  if (BASE && !LOOPBACK.test(new URL(BASE).hostname)) throw new Error("Refusing to run HTTP tests against a non-local app.");
  const { countVerifiedBusinesses, verifiedBusinessWhere } = await import("@/lib/business/store");
  const prisma = new PrismaClient({ datasources: { db: { url: DB } } });
  const before = await prisma.businessAccount.count({ where: verifiedBusinessWhere() });

  if (BASE) {
    const res = await fetch(`${BASE}/api/stats/businesses`);
    const body = (await res.json().catch(() => null)) as { ok?: boolean; verifiedBusinesses?: number } | null;
    check("H1", "GET /api/stats/businesses → 200 ok", res.status === 200 && body?.ok === true, `status=${res.status}`);
    check("H2", "Endpoint value = DB count of verified businesses", body?.verifiedBusinesses === before, `api=${body?.verifiedBusinesses} db=${before}`);
    check("H3", "Short shared cache (s-maxage=300)", /s-maxage=300/.test(res.headers.get("cache-control") ?? ""));
    const keys = Object.keys(body ?? {}).sort().join(",");
    check("H4", "Endpoint exposes only the count (no names, e-mails, tax data)", keys === "ok,verifiedBusinesses", keys);
  }

  type Fx = { key: string; status: BusinessStatus; banned?: boolean; demo?: boolean };
  const fixtures: Fx[] = [
    { key: "ok", status: "approved" },
    { key: "pending", status: "pending" },
    { key: "rejected", status: "rejected" },
    { key: "revoked", status: "revoked" },
    { key: "banned", status: "approved", banned: true },
    { key: "demo", status: "approved", demo: true },
  ];
  const userIds: string[] = [];
  try {
    for (const f of fixtures) {
      const user = await prisma.user.create({
        data: {
          email: f.demo ? `stats-${TAG}-${f.key}@demo.alsatport.com` : `stats-${TAG}-${f.key}@statstest.invalid`,
          username: `statstest_${TAG}_${f.key}`,
          role: "seller",
          passwordHash: await bcrypt.hash(randomBytes(12).toString("base64url"), 10),
          emailVerifiedAt: new Date(),
          bannedAt: f.banned ? new Date() : null,
        },
      });
      userIds.push(user.id);
      await prisma.businessAccount.create({
        data: {
          userId: user.id,
          slug: `statstest-${TAG}-${f.key}`,
          status: f.status,
          name: `Stats Test ${f.key}`,
          contactName: "Stats Test",
          companyType: "limited",
          taxOffice: "Çankaya",
          taxNumber: "1234567890",
          categoryId: "services",
          city: "Ankara",
          email: `biz-${TAG}-${f.key}@statstest.invalid`,
          phone: "5320000000",
          approvedAt: f.status === "approved" ? new Date() : null,
        },
      });
    }
    const after = await prisma.businessAccount.count({ where: verifiedBusinessWhere() });
    check("D1", "Only approved, non-banned, non-demo businesses count (+1 of 6 fixtures)", after - before === 1, `Δ=${after - before}`);
    const cached = await countVerifiedBusinesses();
    check("D2", "countVerifiedBusinesses() matches the independent count", cached === after, `${cached} vs ${after}`);
  } finally {
    await prisma.businessAccount.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }
}

async function main() {
  unitTests();
  if (DB) await dbTests();
  else console.log("(DB/HTTP part skipped — set a local DATABASE_URL and STATS_TEST_BASE)");
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
