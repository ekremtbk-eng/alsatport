import { categories, findCategory, hrefForCategory } from "@/data/categories";

function portalHref(id: string, fallback: string) {
  if (id === "jobs") return "/is-ilanlari";
  if (id === "services") return "/ustalar-hizmetler";
  const cat = findCategory(id);
  return cat ? hrefForCategory(cat) : fallback;
}

export function categoryBarHref(id: string, slugHref: string) {
  return portalHref(id, slugHref);
}

/** Header category strip — real catalog roots, not mock labels. */
export const SITE_SITELINKS = categories.map((cat) => ({
  id: cat.id,
  name: cat.name,
  href: portalHref(cat.id, hrefForCategory(cat)),
}));
