import { BRAND_MARK_ALIASES, BRAND_MARKS } from "@/data/brandMarks.generated";
import { MANUAL_BRAND_MARKS } from "@/data/brandMarks.manual";

export type BrandMarkData =
  | { kind: "si"; title: string; hex: string; path: string; slug: string }
  | { kind: "file"; title: string; hex: string; file: string; slug: string };

function fold(s: string) {
  // TR locale turns ASCII "I" into "ı" (MSI→msı). Normalize ı→i for brand keys.
  return s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(s: string) {
  return fold(s).replace(/\s+/g, "");
}

/** Resolve a catalog brand label to a mark (or null → letter fallback). */
export function resolveBrandMark(label: string): BrandMarkData | null {
  const raw = label?.trim();
  if (!raw) return null;
  const f = fold(raw);
  const compact = slugify(raw);
  const alias =
    BRAND_MARK_ALIASES[f] ??
    BRAND_MARK_ALIASES[compact] ??
    BRAND_MARK_ALIASES[f.split(" ")[0] ?? ""] ??
    null;

  if (alias?.startsWith("manual:")) {
    const slug = alias.slice("manual:".length);
    const man = MANUAL_BRAND_MARKS[slug];
    if (man) return { kind: "file", slug, title: man.title, hex: man.hex, file: man.file };
  }

  const siSlug = alias && !alias.startsWith("manual:") ? alias : BRAND_MARKS[compact] ? compact : null;
  if (siSlug) {
    const mark = BRAND_MARKS[siSlug];
    if (mark) return { kind: "si", slug: siSlug, title: mark.title, hex: mark.hex, path: mark.path };
  }

  // Direct manual lookup (label not yet in generated aliases)
  const manSlug = MANUAL_BRAND_MARKS[compact] ? compact : null;
  if (manSlug) {
    const man = MANUAL_BRAND_MARKS[manSlug];
    return { kind: "file", slug: manSlug, title: man.title, hex: man.hex, file: man.file };
  }

  const head = raw.split("(")[0]?.trim() ?? "";
  if (head && head !== raw) return resolveBrandMark(head);
  return null;
}

/** Fields that should show brand marks in SearchSelect (values stay plain strings). */
export function isBrandSelectField(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k === "brand" ||
    k === "make" ||
    k.endsWith("brand") ||
    k.includes("marka") ||
    k === "partbrand" ||
    k === "productbrand" ||
    k === "tirebrand" ||
    k === "phonebrand"
  );
}

export function brandInitials(label: string): string {
  const parts = label
    .replace(/\([^)]*\)/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toLocaleUpperCase("tr");
  return (parts[0]?.slice(0, 2) || "?").toLocaleUpperCase("tr");
}
