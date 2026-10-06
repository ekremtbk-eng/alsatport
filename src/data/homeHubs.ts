import { categories, findCategory, hrefForCategory } from "@/data/categories";

export type HomeHub = {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  href: string;
};

function portalHref(id: string, fallback: string) {
  if (id === "jobs") return "/is-ilanlari";
  if (id === "services") return "/ustalar-hizmetler";
  const cat = findCategory(id);
  return cat ? hrefForCategory(cat) : fallback;
}

function hub(id: string, icon: string, hint = ""): HomeHub {
  const cat = findCategory(id);
  return {
    id,
    label: cat?.name ?? id,
    hint,
    icon,
    href: portalHref(id, "/kategoriler"),
  };
}

/** Compact homepage icon row mapped to live category nodes. */
export const HOME_HUBS: HomeHub[] = [
  hub("vasita", "car"),
  hub("emlak", "home"),
  hub("shopping-phone", "smartphone"),
  hub("shopping-fashion", "shirt"),
  hub("shopping-decor", "sofa"),
  hub("pets", "paw"),
  hub("vasita-moto", "bike"),
  hub("jobs", "briefcase"),
  hub("shopping-baby", "baby"),
  hub("services", "hammer"),
  { id: "more", label: "Diğer", icon: "grid", href: "/kategoriler" },
];

/** Desktop row: eight live hubs, remaining via Tümünü Gör. */
export const HOME_MAIN_HUBS = HOME_HUBS.filter((h) => h.id !== "more").slice(0, 8);

export const HOME_HERO_CATEGORIES = [
  { id: "", label: "Tüm Kategoriler" },
  ...categories.map((c) => ({ id: c.id, label: c.name })),
];

export const HOME_POPULAR_SEARCHES = [
  "emlak-konut-satilik",
  "emlak-konut-kiralik",
  "vasita",
  "shopping-phone",
  "jobs",
  "emlak-isyeri-dukkan",
]
  .map((id) => {
    const cat = findCategory(id);
    if (!cat) return null;
    return { id: cat.id, label: cat.name, href: portalHref(id, hrefForCategory(cat)) };
  })
  .filter((x): x is { id: string; label: string; href: string } => Boolean(x));

export const HOME_FEATURED_TABS = ["vasita", "emlak", "shopping-phone", "shopping-decor", "jobs"]
  .map((id) => {
    const cat = findCategory(id);
    if (!cat) return null;
    return { id: cat.id, label: cat.name };
  })
  .filter((x): x is { id: string; label: string } => Boolean(x));

export const HOME_DISCOVER = [
  { href: "/son-48-saat", labelKey: "home.disc.fast", icon: "clock" },
  { href: "/ara?kategori=satilik-konut", labelKey: "home.disc.invest", icon: "building" },
  { href: "/acil", labelKey: "home.disc.urgent", icon: "flame" },
] as const;
