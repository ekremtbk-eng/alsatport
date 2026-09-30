import { PrismaClient } from "@prisma/client";
import {
  categories,
  categoryShortcuts,
  walkCategories,
  type Category,
} from "../src/data/categories";

const prisma = new PrismaClient();

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

async function main() {
  const count = await seedCategories();
  console.log(`Seeded ${count} categories.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
