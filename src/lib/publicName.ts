export type PublicNameSource = {
  displayName?: string | null;
  username?: string | null;
  businessName?: string | null;
  businessVerifiedAt?: Date | string | null;
};

const MASKED_TOKEN = /^\p{L}\.$/u;

/** "Ekrem Tabik" → "Ekrem T.", "Mehmet Ali Yılmaz" → "Mehmet Ali Y."; single tokens stay as-is. */
export function maskPersonName(raw: string | null | undefined): string {
  const parts = String(raw ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  const last = parts[parts.length - 1];
  if (MASKED_TOKEN.test(last)) return parts.join(" ");
  const initial = last.match(/\p{L}/u)?.[0];
  const head = parts.slice(0, -1).join(" ");
  return initial ? `${head} ${initial.toLocaleUpperCase("tr-TR")}.` : head;
}

export function verifiedBusinessName(src: PublicNameSource | null | undefined): string | null {
  const name = src?.businessName?.trim();
  return name && src?.businessVerifiedAt ? name : null;
}

/** Public label for any account; full name only for admin-verified businesses. */
export function publicAccountName(src: PublicNameSource | null | undefined): string {
  return verifiedBusinessName(src) ?? maskPersonName(src?.displayName || src?.username);
}

/** Client-side label for listings, safe for demo/local data that was never server-masked. */
export function listingSellerLabel(listing: { sellerName?: string; sellerBusiness?: boolean }): string {
  const name = listing.sellerName ?? "";
  return listing.sellerBusiness ? name.trim() : maskPersonName(name);
}

export function reviewAuthorLabel(review: { authorName?: string; authorBusiness?: boolean }): string {
  const name = review.authorName ?? "";
  return review.authorBusiness ? name.trim() : maskPersonName(name);
}
