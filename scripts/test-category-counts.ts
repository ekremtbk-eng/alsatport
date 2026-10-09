/**
 * Dynamic category count tests.
 *
 * Unit part (no DB): no static counts left in the catalog, tree rollup (every parent = own + children).
 * DB/HTTP part runs ONLY against a local database and a local server:
 *
 *   COUNTS_TEST_BASE=http://localhost:3013 DATABASE_URL=<local> npx tsx --conditions=react-server scripts/test-category-counts.ts
 *
 * Creates one throw-away seller (`*@counttest.invalid`) with listings in every status, removed at the end.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, type ListingStatus } from "@prisma/client";
import { allCategoryNodes, categories, walkCategories, type Category } from "@/data/categories";
import { SEA_EQUIP_GROUPS } from "@/data/seaEquip";
import { buildLiveCategoryCounts, rollupCategoryCounts } from "@/lib/categoryCounts";
import type { Listing } from "@/data/store";

const BASE = process.env.COUNTS_TEST_BASE ?? "";
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
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

function descendants(cat: Category): Category[] {
  return [cat, ...(cat.children ?? []).flatMap(descendants)];
}

/** Every parent must equal its own direct total plus the sum of its children. */
function treeConsistent(counts: Record<string, number>, direct: Record<string, number>) {
  const bad: string[] = [];
  for (const c of allCategoryNodes()) {
    const expected = (direct[c.id] ?? 0) + (c.children ?? []).reduce((s, ch) => s + (counts[ch.id] ?? 0), 0);
    if (counts[c.id] !== expected) bad.push(`${c.id}:${counts[c.id]}≠${expected}`);
  }
  return bad;
}

function unitTests() {
  const nodes = allCategoryNodes();
  check("S1", "No category node carries a static count", nodes.every((c) => !("count" in c)), `${nodes.length} nodes`);
  check("S2", "No sea-equipment group/item carries a static count",
    JSON.stringify(SEA_EQUIP_GROUPS).match(/"count":/) === null);
  const literal = /\bcount:\s*[\d_]{2,}/;
  const dataHits = walk("src/data").filter((f) => literal.test(readFileSync(f, "utf8")));
  check("S3", "No numeric `count:` literals in src/data", dataHits.length === 0, dataHits.join(", "));
  const fallback = walk("src").filter((f) => readFileSync(f, "utf8").includes("catalogCount"));
  check("S4", "catalogCount fallback removed everywhere", fallback.length === 0, fallback.join(", "));
  const fake = walk("src").filter((f) => /788[._]?867|376[._]?575|114[._]?477|1[._]?189[._]?745/.test(readFileSync(f, "utf8")));
  check("S5", "Known fake numbers (788.867, 376.575, 114.477, 1.189.745) are gone", fake.length === 0, fake.join(", "));

  const r = rollupCategoryCounts([["vasita-otomobil", 3], ["vasita-suv", 2]]);
  check("R1", "Rollup: Vasıta = Otomobil + Arazi/SUV", r.vasita === 5 && r["vasita-otomobil"] === 3 && r["vasita-suv"] === 2,
    `vasita=${r.vasita}`);
  check("R2", "Rollup: untouched roots stay 0 and every node has a key",
    r.emlak === 0 && nodes.every((c) => typeof r[c.id] === "number"));

  const direct: Record<string, number> = {};
  const tree: Category[] = [];
  walkCategories(categories, (c) => tree.push(c));
  tree.forEach((c, i) => {
    if (i % 3 === 0 && !c.id.startsWith("pets")) direct[c.id] = (i % 7) + 1;
  });
  const big = rollupCategoryCounts(Object.entries(direct));
  const bad = treeConsistent(big, direct);
  check("R3", "Rollup over every category: each parent = own + Σ children", bad.length === 0, bad.slice(0, 3).join(" "));
  const allTotal = Object.values(direct).reduce((s, n) => s + n, 0);
  const rootSum = categories.reduce((s, c) => s + big[c.id], 0);
  check("R4", "Σ roots = Σ all listings", rootSum === allTotal, `${rootSum} vs ${allTotal}`);

  const base = { title: "x", description: "", images: ["/api/media/listings/a.jpg"], categoryId: "vasita-otomobil" };
  const statuses = ["active", "pending", "sold", "expired", "removed", "rejected", "draft", "passive"] as const;
  const fixtures = statuses.map((status, i) => ({ ...base, id: String(i), status }) as unknown as Listing);
  fixtures.push({ ...base, id: "noimg", status: "active", images: [] } as unknown as Listing);
  const client = buildLiveCategoryCounts(fixtures);
  check("R5", "Client fallback counts only active listings with a photo", client.vasita === 1 && client["vasita-otomobil"] === 1,
    `vasita=${client.vasita}`);
}

async function dbTests() {
  if (!LOOPBACK.test(new URL(DB).hostname)) throw new Error("Refusing to run DB tests against a non-local database.");
  if (BASE && !LOOPBACK.test(new URL(BASE).hostname)) throw new Error("Refusing to run HTTP tests against a non-local app.");
  const { computeCategoryCounts, getCategoryCounts, invalidateCategoryCounts, publicCountWhere } = await import(
    "@/lib/listings/categoryCounts"
  );
  const prisma = new PrismaClient({ datasources: { db: { url: DB } } });

  const before = await computeCategoryCounts();
  const roots = categories.filter((c) => c.id !== "pets");
  const mismatch: string[] = [];
  for (const root of roots) {
    const ids = descendants(root).map((c) => c.id);
    const n = await prisma.listing.count({ where: { ...publicCountWhere(), categoryId: { in: ids } } });
    if (n !== before.counts[root.id]) mismatch.push(`${root.id}:${before.counts[root.id]}≠${n}`);
  }
  check("D1", "Every root (except Hayvanlar) equals an independent COUNT over its subtree", mismatch.length === 0,
    mismatch.slice(0, 3).join(" ") || `vasita=${before.counts.vasita}`);
  const direct: Record<string, number> = {};
  const rows = await prisma.listing.groupBy({ by: ["categoryId"], where: publicCountWhere(), _count: { _all: true } });
  for (const row of rows) direct[row.categoryId] = row._count._all;
  const badTree = treeConsistent(before.counts, Object.fromEntries(Object.entries(direct).filter(([k]) => !k.startsWith("pets"))));
  check("D2", "DB counts are tree-consistent outside Hayvanlar", badTree.filter((b) => !b.startsWith("pets")).length === 0,
    badTree.filter((b) => !b.startsWith("pets")).slice(0, 3).join(" "));

  if (BASE) {
    const res = await fetch(`${BASE}/api/categories/counts`);
    const body = (await res.json().catch(() => null)) as { ok?: boolean; counts?: Record<string, number>; total?: number } | null;
    check("H1", "GET /api/categories/counts → 200 ok", res.status === 200 && body?.ok === true, `status=${res.status}`);
    const cc = res.headers.get("cache-control") ?? "";
    check("H2", "Short shared cache (s-maxage=30) on the counts endpoint", /s-maxage=30/.test(cc), cc);
    const all = allCategoryNodes().every((c) => typeof body?.counts?.[c.id] === "number");
    check("H3", "Endpoint returns a number for every category id", all);
    const same = !!body?.counts && Object.keys(before.counts).every((k) => body.counts![k] === before.counts[k]);
    check("H4", "Endpoint values = DB groupBy values (Vasıta, Otomobil, all ids)", same,
      `vasita api=${body?.counts?.vasita} db=${before.counts.vasita}`);
    check("H5", "Endpoint total = Σ roots", body?.total === categories.reduce((s, c) => s + (body?.counts?.[c.id] ?? 0), 0));
  }

  const seller = await prisma.user.create({
    data: {
      email: `seller-${TAG}@counttest.invalid`,
      username: `counttest_${TAG}`,
      role: "seller",
      passwordHash: await bcrypt.hash(randomBytes(12).toString("base64url"), 10),
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: "Count Test",
          fullName: "Count Test",
          profileComplete: true,
          phone: `53${String(randomBytes(4).readUInt32BE() % 100_000_000).padStart(8, "0")}`,
          city: "Ankara",
        },
      },
    },
  });
  const now = Date.now();
  const day = 86400_000;
  type Fx = { key: string; status: ListingStatus; categoryId?: string; title?: string; expiresAt?: Date | null; deletedAt?: Date; image?: boolean };
  const fixtures: Fx[] = [
    { key: "live", status: "active" },
    { key: "noexp", status: "active", expiresAt: null },
    { key: "noimg", status: "active", image: false },
    { key: "pending", status: "pending" },
    { key: "sold", status: "sold" },
    { key: "expired", status: "expired" },
    { key: "pastexp", status: "active", expiresAt: new Date(now - day) },
    { key: "removed", status: "removed" },
    { key: "rejected", status: "rejected" },
    { key: "draft", status: "draft" },
    { key: "passive", status: "passive" },
    { key: "deleted", status: "active", deletedAt: new Date(now) },
    { key: "suv", status: "active", categoryId: "vasita-suv" },
    { key: "petacc", status: "active", categoryId: "pets-acc", title: "Kedi maması 2 kg" },
    { key: "petban", status: "active", categoryId: "pets-farm-poultry", title: "Satılık yavru kedi" },
  ];
  const created: string[] = [];
  try {
    for (const f of fixtures) {
      const row = await prisma.listing.create({
        data: {
          status: f.status,
          postedAt: new Date(now),
          expiresAt: f.expiresAt === undefined ? new Date(now + 10 * day) : f.expiresAt,
          deletedAt: f.deletedAt,
          sellerId: seller.id,
          listingNo: `CT${TAG}${f.key}`,
          categoryId: f.categoryId ?? "vasita-otomobil",
          title: f.title ?? `Count test ${f.key} ${TAG}`,
          description: "Sayaç test ilanı.",
          price: 1000,
          city: "Ankara",
          images: f.image === false
            ? undefined
            : { create: [{ storageKey: `test/${TAG}/${f.key}`, url: `/api/media/listings/test-${TAG}-${f.key}.jpg`, sortOrder: 0, isCover: true }] },
        },
      });
      created.push(row.id);
    }

    const after = await computeCategoryCounts();
    const d = (id: string) => after.counts[id] - before.counts[id];
    check("D3", "Only live listings counted: Otomobil +2 (active, no-expiry), others excluded",
      d("vasita-otomobil") === 2, `Δotomobil=${d("vasita-otomobil")}`);
    check("D4", "pending / sold / expired / past-expiry / removed / rejected / draft / passive / soft-deleted / no-photo excluded",
      d("vasita-otomobil") === 2 && d("vasita") === 3, `Δvasita=${d("vasita")}`);
    check("D5", "Vasıta root = Σ subcategories after the change (+3 = 2 Otomobil + 1 SUV)",
      d("vasita") === d("vasita-otomobil") + d("vasita-suv") && d("vasita-suv") === 1);
    check("D6", "Hayvanlar: accessory counted, banned live-animal listing hidden",
      d("pets-acc") === 1 && d("pets-farm-poultry") === 0 && d("pets") === 1,
      `Δpets=${d("pets")} Δpets-farm-poultry=${d("pets-farm-poultry")}`);
    check("D7", "Total grows by exactly the 4 public listings", after.total - before.total === 4, `Δ=${after.total - before.total}`);

    invalidateCategoryCounts();
    const first = await getCategoryCounts();
    await prisma.listing.update({ where: { id: created[0] }, data: { status: "sold", soldAt: new Date() } });
    const cachedRead = await getCategoryCounts();
    check("C1", "Within the TTL the cached map is reused (no query per request)", cachedRead === first);
    invalidateCategoryCounts();
    const fresh = await getCategoryCounts();
    check("C2", "After invalidation (sold) the count drops immediately",
      fresh.counts["vasita-otomobil"] === first.counts["vasita-otomobil"] - 1, `${first.counts["vasita-otomobil"]}→${fresh.counts["vasita-otomobil"]}`);
  } finally {
    await prisma.listingImage.deleteMany({ where: { listingId: { in: created } } });
    await prisma.listing.deleteMany({ where: { id: { in: created } } });
    await prisma.user.delete({ where: { id: seller.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

async function main() {
  unitTests();
  if (DB) await dbTests();
  else console.log("(DB/HTTP part skipped — set a local DATABASE_URL and COUNTS_TEST_BASE)");
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
