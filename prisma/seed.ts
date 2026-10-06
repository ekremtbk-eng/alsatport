import { PrismaClient } from "@prisma/client";
import {
  categories,
  categoryShortcuts,
  walkCategories,
  type Category,
} from "../src/data/categories";
import { SPECIAL_DAY_SEEDS } from "../src/data/specialDays";

/**
 * Base reference data only (categories, special days). Insert-only and idempotent:
 * existing rows are never updated or deleted. Demo sellers/listings live in seed-demo.ts.
 */
const prisma = new PrismaClient();
console.log("prisma seed: start");

type SeedRow = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  navHidden: boolean;
  filterKey: string | null;
  aliases: string[];
  brands: string[];
};

function flatten(): SeedRow[] {
  const byId = new Map<string, SeedRow>();
  let sortOrder = 0;

  const visit = (c: Category) => {
    if (byId.has(c.id)) return;
    byId.set(c.id, {
      id: c.id,
      parentId: c.parentId ?? null,
      slug: c.slug,
      name: c.name,
      icon: c.icon || null,
      sortOrder: sortOrder++,
      navHidden: !!c.navHidden,
      filterKey: c.filter ?? null,
      aliases: c.aliases ?? [],
      brands: c.brands ?? [],
    });
  };

  walkCategories(categoryShortcuts, visit);
  walkCategories(categories, visit);

  const slugUsed = new Set<string>();
  for (const row of byId.values()) {
    if (slugUsed.has(row.slug)) {
      row.slug = `${row.slug}--${row.id}`;
    }
    slugUsed.add(row.slug);
  }

  const ids = new Set(byId.keys());
  for (const row of byId.values()) {
    if (row.parentId && !ids.has(row.parentId)) row.parentId = null;
  }

  return [...byId.values()];
}

async function seedCategories() {
  const rows = flatten();
  const inserted = new Set<string>();
  let remaining = [...rows];

  while (remaining.length) {
    const batch = remaining.filter((r) => !r.parentId || inserted.has(r.parentId));
    if (!batch.length) {
      throw new Error(`Category parent cycle or missing parent: ${remaining.map((r) => r.id).join(", ")}`);
    }
    await prisma.category.createMany({
      data: batch.map((r) => ({
        id: r.id,
        parentId: r.parentId,
        slug: r.slug,
        name: r.name,
        icon: r.icon,
        sortOrder: r.sortOrder,
        navHidden: r.navHidden,
        filterKey: r.filterKey,
        aliases: r.aliases,
        brands: r.brands,
      })),
      skipDuplicates: true,
    });
    for (const r of batch) inserted.add(r.id);
    remaining = remaining.filter((r) => !inserted.has(r.id));
  }

  return inserted.size;
}

async function seedSpecialDays() {
  for (const row of SPECIAL_DAY_SEEDS) {
    await prisma.specialDay.upsert({
      where: { slug: row.slug },
      create: {
        slug: row.slug,
        name: row.name,
        kind: row.kind,
        month: row.month,
        day: row.day,
        year: row.year ?? null,
        durationDays: row.durationDays,
        active: row.active,
        sortOrder: row.sortOrder,
        theme: row.theme,
        eyebrow: row.eyebrow,
        title: row.title,
        body: row.body,
        closing: row.closing,
        cta: row.cta,
      },
      update: {},
    });
  }
  return SPECIAL_DAY_SEEDS.length;
}

async function main() {
  const count = await seedCategories();
  console.log(`Seeded ${count} categories (insert-only).`);
  const days = await seedSpecialDays();
  console.log(`Seeded ${days} special days (insert-only).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
