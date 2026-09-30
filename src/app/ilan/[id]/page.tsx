import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { isUuid } from "@/lib/ids";
import { isBlockedLiveAnimalListing } from "@/lib/liveAnimalPolicy";
import { findListingRecord, toClientListing } from "@/lib/listings/store";
import { findCategory } from "@/data/categories";
import { listingJsonLd, pageMetadata } from "@/lib/seo";
import { ListingDetailClient } from "./ListingDetailClient";

type Ctx = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) {
    return pageMetadata({ title: "İlan · AlsatPort", description: "İlan detayı.", path: `/ilan/${id}`, index: false });
  }
  const row = await findListingRecord(id);
  if (!row || row.status !== "active") {
    return { title: "İlan · AlsatPort", robots: { index: false, follow: false } };
  }
  const listing = toClientListing(row);
  if (isBlockedLiveAnimalListing(listing)) {
    return { title: "İlan · AlsatPort", robots: { index: false, follow: false } };
  }
  const title = `${listing.title} · AlsatPort`;
  const description = (listing.description || listing.subtitle || listing.title).slice(0, 160);
  const image = listing.images[0];
  return pageMetadata({
    title,
    description,
    path: `/ilan/${id}`,
    images: image ? [{ url: image, alt: listing.title }] : undefined,
  });
}

export default async function ListingDetailPage({ params }: Ctx) {
  const { id } = await params;
  let schema: ReturnType<typeof listingJsonLd> | null = null;
  if (isUuid(id)) {
    const row = await findListingRecord(id);
    if (row && row.status === "active") {
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
