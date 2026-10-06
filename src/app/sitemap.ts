import type { MetadataRoute } from "next";
import { flattenCategories, hrefForCategory } from "@/data/categories";
import { SITE_SITELINKS } from "@/data/sitelinks";
import { prisma } from "@/lib/db";
import { liveListingWhere } from "@/lib/listings/lifecycle";
import { appOrigin } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = appOrigin();
  const now = new Date();
  const staticPaths: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] =
    [
      { path: "/", priority: 1, changeFrequency: "hourly" },
      { path: "/kategoriler", priority: 0.9, changeFrequency: "daily" },
      ...SITE_SITELINKS.map((l) => ({
        path: l.href,
        priority: 0.95 as const,
        changeFrequency: "daily" as const,
      })),
      { path: "/acil", priority: 0.8, changeFrequency: "hourly" },
      { path: "/son-48-saat", priority: 0.8, changeFrequency: "hourly" },
      { path: "/hizmet-vermek-istiyorum", priority: 0.7, changeFrequency: "monthly" },
      { path: "/ara", priority: 0.7, changeFrequency: "daily" },
      { path: "/kurumsal", priority: 0.5, changeFrequency: "monthly" },
      { path: "/kurumsal/hakkimizda", priority: 0.5, changeFrequency: "monthly" },
      { path: "/kurumsal/iletisim", priority: 0.5, changeFrequency: "monthly" },
      { path: "/kvkk", priority: 0.3, changeFrequency: "yearly" },
      { path: "/gizlilik-politikasi", priority: 0.4, changeFrequency: "yearly" },
      { path: "/kullanim-kosullari", priority: 0.4, changeFrequency: "yearly" },
      { path: "/cerez-aydinlatma", priority: 0.3, changeFrequency: "yearly" },
      { path: "/ilan-kurallari", priority: 0.4, changeFrequency: "yearly" },
    ];
  const staticSet = new Set(staticPaths.map((r) => r.path));
  const uniqueCats = [
    ...new Set(
      flattenCategories()
        .filter((c) => !c.filter)
        .map((c) => hrefForCategory(c)),
    ),
  ].filter((path) => !staticSet.has(path));
  let listings: { id: string; updatedAt: Date }[] = [];
  try {
    listings = await prisma.listing.findMany({
      where: { deletedAt: null, ...liveListingWhere() },
      select: { id: true, updatedAt: true },
      take: 5000,
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
    ...uniqueCats.map((path) => ({
      url: `${origin}${path}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
    ...listings.map((row) => ({
      url: `${origin}/ilan/${row.id}`,
      lastModified: row.updatedAt,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
  ];
}
