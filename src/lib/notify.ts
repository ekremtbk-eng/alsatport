import type { Listing } from "@/data/store";
import { listingMatchesFilter } from "@/lib/listingQuery";

export type SavedSearch = {
  id: string;
  query: string;
  city?: string;
  filter?: string;
  createdAt: number;
  seenIds: string[];
};

export type NotifKind = "price" | "search" | "nearby" | "system";

export type AppNotification = {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  href: string;
  createdAt: number;
  read: boolean;
  listingId?: string;
};

export type NotifPrefs = {
  priceDrop: boolean;
  savedSearch: boolean;
  nearby: boolean;
};

export type GeoState = {
  status: "idle" | "granted" | "denied" | "unavailable";
  lat?: number;
  lng?: number;
  city?: string;
  source?: "gps" | "manual";
  dismissed?: boolean;
};

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  priceDrop: true,
  savedSearch: true,
  nearby: true,
};

export function listingMatchesSearch(listing: Listing, search: SavedSearch) {
  if (search.filter === "urgent" && !listing.urgent) return false;
  if (search.filter === "h48" && !listingMatchesFilter(listing, "h48")) return false;
  const q = search.query.trim().toLocaleLowerCase("tr");
  if (search.city && listing.city !== search.city) return false;
  if (!q) return true;
  const hay = `${listing.title} ${listing.subtitle} ${listing.city} ${listing.district} ${listing.description}`
    .toLocaleLowerCase("tr");
  return hay.includes(q);
}

export function searchLabel(s: SavedSearch) {
  const prefix = s.filter === "urgent" ? "Acil Acil" : s.filter === "h48" ? "Son 48 Saat" : "";
  if (s.query && s.city) return `${prefix ? `${prefix} · ` : ""}${s.query} · ${s.city}`;
  if (s.query) return prefix ? `${prefix} · ${s.query}` : s.query;
  if (s.city) return prefix ? `${prefix} · ${s.city}` : s.city;
  return prefix || "•";
}

export function searchHref(s: SavedSearch) {
  const p = new URLSearchParams();
  if (s.query) p.set("q", s.query);
  if (s.city) p.set("city", s.city);
  const qs = p.toString();
  if (s.filter === "urgent") return qs ? `/acil?${qs}` : "/acil";
  if (s.filter === "h48") return qs ? `/son-48-saat?${qs}` : "/son-48-saat";
  return `/ara?${qs}`;
}

export function formatNotifTime(ts: number, locale = "tr-TR") {
  const diff = Date.now() - ts;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diff < 45_000) return rtf.format(0, "second");
  if (diff < 60_000) return rtf.format(-Math.max(1, Math.floor(diff / 1000)), "second");
  if (diff < 3_600_000) return rtf.format(-Math.floor(diff / 60_000), "minute");
  if (diff < 86_400_000) return rtf.format(-Math.floor(diff / 3_600_000), "hour");
  return new Date(ts).toLocaleDateString(locale);
}
