import type { MetadataRoute } from "next";
import { flattenCategories, hrefForCategory } from "@/data/categories";
import { CORPORATE_NAV } from "@/data/corporate";
import { prisma } from "@/lib/db";
import { liveListingWhere } from "@/lib/listings/lifecycle";
import { nonDemoListingWhere, serviceCategoryIds } from "@/lib/seoIndexing";
import { appOrigin } from "@/lib/site";

export const revalidate = 3600;

/** Third-level service leaves stay reachable via internal links but are too thin to submit. */
function isDeepServicePath(path: string) {
  return path.startsWith("/ustalar-hizmetler/") && path.split("/").length > 4;
}

type Row = { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] };

/** Only canonical, indexable URLs: no redirects, noindex pages, filter/search variants or demo listings. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = appOrigin();
  const now = new Date();
  const staticPaths: Row[] = [
    { path: "/", priority: 1, changeFrequency: "hourly" },
    { path: "/kategoriler", priority: 0.9, changeFrequency: "daily" },
    { path: "/acil", priority: 0.8, changeFrequency: "hourly" },
    { path: "/son-48-saat", priority: 0.8, changeFrequency: "hourly" },
    { path: "/hizmet-vermek-istiyorum", priority: 0.7, changeFrequency: "monthly" },
    { path: "/ara", priority: 0.7, changeFrequency: "daily" },
    ...CORPORATE_NAV.map((n) => ({ path: n.href, priority: 0.5, changeFrequency: "monthly" as const })),
    { path: "/kvkk", priority: 0.3, changeFrequency: "yearly" },
    { path: "/gizlilik-politikasi", priority: 0.4, changeFrequency: "yearly" },
    { path: "/kullanim-kosullari", priority: 0.4, changeFrequency: "yearly" },
    { path: "/cerez-aydinlatma", priority: 0.3, changeFrequency: "yearly" },
    { path: "/ilan-kurallari", priority: 0.4, changeFrequency: "yearly" },
  ];
  const seen = new Set(staticPaths.map((r) => r.path));
  const categoryPaths: string[] = [];
  for (const c of flattenCategories()) {
    if (c.filter) continue;
    const path = hrefForCategory(c);
    if (seen.has(path) || isDeepServicePath(path)) continue;
    seen.add(path);
    categoryPaths.push(path);
  }

  let listings: { id: string; updatedAt: Date }[] = [];
  try {
    listings = await prisma.listing.findMany({
      where: {
        deletedAt: null,
        ...liveListingWhere(),
        categoryId: { notIn: serviceCategoryIds() },
        AND: [nonDemoListingWhere()],
      },
      select: { id: true, updatedAt: true },
      take: 45000,
      orderBy: { updatedAt: "desc" },
    });
  } catch {
    listings = [];
  }
  return [
    ...staticPaths.map((row) => ({
      url: `${origin}${row.path}`,
      lastModified: now,
      changeFrequency: row.changeFrequency,
      priority: row.priority,
    })),
    ...categoryPaths.map((path) => ({
      url: `${origin}${path}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...listings.map((row) => ({
      url: `${origin}/ilan/${row.id}`,
      lastModified: row.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
