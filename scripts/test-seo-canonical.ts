/**
 * Synthetic SEO checks (no network, no DB): hub vs leaf canonicals, redirects, JSON-LD URLs.
 * Run: npx tsx scripts/test-seo-canonical.ts
 */
import { findCategory, hrefForCategory, flattenCategories } from "@/data/categories";
import {
  SEO_DESCRIPTION,
  SEO_TITLE,
  categoryHubNeedsCanonicalRedirect,
  categoryJsonLd,
  categorySeoCopy,
  withPreservedSearchParams,
} from "@/lib/seo";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const priority = ["cep-telefonu", "bilgisayar", "teknik-elektronik", "ikinci-el", "yedek-parca"] as const;

assert(SEO_TITLE.includes("Ücretsiz İlan Ver"), "homepage title");
assert(SEO_DESCRIPTION.includes("ikinci el telefon"), "homepage description");
assert(!SEO_DESCRIPTION.toLowerCase().includes("emlak"), "homepage desc should not lead with emlak");

for (const slug of priority) {
  const cat = findCategory(slug);
  assert(cat, `missing category ${slug}`);
  assert(!categoryHubNeedsCanonicalRedirect(cat!), `${slug} should stay on hub path`);
  assert(hrefForCategory(cat!).startsWith("/kategoriler/"), `${slug} hub href`);
  const copy = categorySeoCopy(cat!);
  assert(copy.title.includes("AlSatPort"), `${slug} title brand`);
  assert(copy.description.length >= 80, `${slug} description length`);
}

const leaf = findCategory("akilli-telefon");
assert(leaf, "akilli-telefon");
assert(categoryHubNeedsCanonicalRedirect(leaf!), "leaf needs redirect from /kategoriler/…");
assert(hrefForCategory(leaf!) === "/ara?kategori=akilli-telefon", "leaf canonical");

const merged = withPreservedSearchParams("/ara?kategori=akilli-telefon", { sira: "yeni", kategori: "ignored" });
assert(merged === "/ara?kategori=akilli-telefon&sira=yeni", `query merge got ${merged}`);

/** Double kategori / cat must not replace the canonical kategori already on the path. */
const doubleKat = withPreservedSearchParams("/ara?kategori=akilli-telefon", {
  kategori: "bilgisayar",
  cat: "yedek-parca",
  priceMin: "1000",
});
assert(
  doubleKat === "/ara?kategori=akilli-telefon&priceMin=1000",
  `double kategori merge got ${doubleKat}`,
);

/** Encoded slug still resolves; hub redirect helper stays consistent. */
const encodedLeaf = findCategory(decodeURIComponent("akilli-telefon"));
assert(encodedLeaf?.id === leaf!.id, "encoded slug resolve");
assert(categoryHubNeedsCanonicalRedirect(encodedLeaf!), "encoded leaf still redirects");

assert(!findCategory("bu-slug-yok-xyz-999"), "unknown slug should miss");
assert(!findCategory(""), "empty slug should miss");

const hubLd = categoryJsonLd(findCategory("cep-telefonu")!);
const graph = (hubLd as { "@graph": Record<string, unknown>[] })["@graph"];
const itemList = graph.find((n) => n["@type"] === "ItemList") as
  | { itemListElement: { url: string }[] }
  | undefined;
assert(itemList?.itemListElement?.length, "hub ItemList children");
for (const item of itemList!.itemListElement) {
  assert(!item.url.includes("/kategoriler/akilli-telefon"), `child still hub-shaped: ${item.url}`);
  assert(item.url.includes("/ara?kategori=") || item.url.includes("/kategoriler/"), `odd child url ${item.url}`);
  const childSlug = item.url.split("kategori=")[1]?.split("&")[0] || item.url.split("/kategoriler/")[1];
  if (childSlug && item.url.includes("kategori=")) {
    const child = findCategory(decodeURIComponent(childSlug));
    assert(child, `ItemList child slug missing: ${childSlug}`);
    assert(item.url === `https://alsatport.com${hrefForCategory(child!)}`, `ItemList URL mismatch ${item.url}`);
  }
}

const leafLd = categoryJsonLd(leaf!);
const leafGraph = (leafLd as { "@graph": Record<string, unknown>[] })["@graph"];
const collection = leafGraph.find((n) => n["@type"] === "CollectionPage") as { url?: string } | undefined;
assert(collection?.url === "https://alsatport.com/ara?kategori=akilli-telefon", `leaf collection url ${collection?.url}`);
const crumb = leafGraph.find((n) => n["@type"] === "BreadcrumbList");
assert(crumb, "leaf BreadcrumbList");
assert(!JSON.stringify(leafLd).includes("AggregateRating"), "no fake ratings");
assert(!JSON.stringify(leafLd).includes("shippingDetails"), "no fake shipping");

let redirectLeaves = 0;
let hubs = 0;
for (const c of flattenCategories()) {
  if (c.filter) continue;
  if (categoryHubNeedsCanonicalRedirect(c)) redirectLeaves++;
  else if (hrefForCategory(c).startsWith("/kategoriler/")) hubs++;
}
assert(redirectLeaves === 627, `expected 627 leaf redirects, got ${redirectLeaves}`);
assert(hubs > 10, `expected hub pages, got ${hubs}`);

/** UX: leaf canonical stays on /ara so existing filter query keys remain usable after redirect. */
assert(hrefForCategory(leaf!).startsWith("/ara?"), "leaf UX path is search listings");
assert(hrefForCategory(findCategory("cep-telefonu")!) === "/kategoriler/cep-telefonu", "hub UX path unchanged");

console.log(
  JSON.stringify(
    {
      ok: true,
      SEO_TITLE,
      priorityHubs: priority.length,
      redirectLeaves,
      hubs,
      sampleLeafRedirect: "/kategoriler/akilli-telefon → " + hrefForCategory(leaf!),
      sampleQueryMerge: merged,
      doubleKategoriMerge: doubleKat,
    },
    null,
    2,
  ),
);
