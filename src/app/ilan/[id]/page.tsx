import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { isUuid } from "@/lib/ids";
import { isBlockedLiveAnimalListing } from "@/lib/liveAnimalPolicy";
import { findListingRecord, toClientListing } from "@/lib/listings/store";
import { isLiveRow } from "@/lib/listings/lifecycle";
import { isDemoListingRow, isServiceCategoryId } from "@/lib/seoIndexing";
import { findCategory } from "@/data/categories";
import { listingJsonLd, pageMetadata, absoluteAssetUrl } from "@/lib/seo";
import { formatMoney } from "@/i18n/config";
import { ListingDetailClient } from "./ListingDetailClient";

type Ctx = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) {
    return pageMetadata({ title: "İlan · AlsatPort", description: "İlan detayı.", path: `/ilan/${id}`, index: false });
  }
  const row = await findListingRecord(id);
  if (!row || !isLiveRow(row)) {
    return { title: "İlan · AlsatPort", robots: { index: false, follow: false } };
  }
  const listing = toClientListing(row);
  if (isBlockedLiveAnimalListing(listing)) {
    return { title: "İlan · AlsatPort", robots: { index: false, follow: false } };
  }
  const priceLabel = formatMoney(listing.price, "tr");
  const place = [listing.city, listing.district].filter(Boolean).join(" / ");
  const title = `${listing.title} · ${priceLabel}`;
  const description = [priceLabel, place, listing.subtitle || listing.description || listing.title]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 180);
  return pageMetadata({
    title,
    description,
    path: `/ilan/${id}`,
    index: !isDemoListingRow(row) && !isServiceCategoryId(row.categoryId),
    follow: true,
    images: listing.images.slice(0, 4).map((url) => ({
      url: absoluteAssetUrl(url),
      alt: listing.title,
      width: 1200,
      height: 630,
    })),
    priceAmount: listing.price,
    priceCurrency: "TRY",
  });
}

export default async function ListingDetailPage({ params }: Ctx) {
  const { id } = await params;
  let schema: ReturnType<typeof listingJsonLd> | null = null;
  if (isUuid(id)) {
    const row = await findListingRecord(id);
    if (row && isLiveRow(row) && !isDemoListingRow(row)) {
      const listing = toClientListing(row);
      if (!isBlockedLiveAnimalListing(listing)) {
        const cat = findCategory(listing.categoryId);
        schema = listingJsonLd({
          id: listing.id,
          title: listing.title,
          description: listing.description || listing.subtitle || listing.title,
          price: listing.price,
          images: listing.images,
          city: listing.city,
          categoryName: cat?.name,
          categorySlug: cat?.slug,
        });
      }
    }
  }
  return (
    <>
      {schema ? <JsonLd data={schema} /> : null}
      <ListingDetailClient />
    </>
  );
}
