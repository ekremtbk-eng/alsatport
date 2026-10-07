import type { Listing } from "@/data/store";
import { schemaForCategoryId } from "@/data/listingSchema";
import { LIVESTOCK_AGE_MAX_MONTHS, LIVESTOCK_QTY_MAX, PET_SPEC, petListingKind } from "@/data/petCatalog";

type Spec = Listing["specs"][number];

const NUMBER_LIMITS: Record<string, { min: number; max: number }> = {
  [PET_SPEC.age]: { min: 0, max: LIVESTOCK_AGE_MAX_MONTHS },
  [PET_SPEC.qty]: { min: 1, max: LIVESTOCK_QTY_MAX },
};

/**
 * Hayvanlar Alemi specs must match the category's own form: product fields (e.g. "Durum") never
 * survive on a live-animal listing and vice versa. Other categories are returned untouched.
 */
export function enforcePetSpecs(categoryId: string, specs: Spec[]): { specs: Spec[]; missingRequired: boolean } {
  const kind = petListingKind(categoryId);
  if (!kind) return { specs, missingRequired: false };
  const fields = schemaForCategoryId(categoryId).fields;
  const byLabel = new Map(fields.map((field) => [field.specLabel, field]));
  const seen = new Set<string>();
  const out: Spec[] = [];
  for (const spec of specs) {
    const field = byLabel.get(spec.label);
    if (!field || seen.has(field.specLabel)) continue;
    let value = spec.value.trim();
    if (field.kind === "select") {
      if (!field.options?.includes(value)) continue;
    } else if (field.kind === "number") {
      const digits = value.replace(/\D/g, "");
      if (!digits) continue;
      const n = Number(digits);
      const limit = NUMBER_LIMITS[field.specLabel] ?? { min: 0, max: 1_000_000 };
      if (!Number.isSafeInteger(n) || n < limit.min || n > limit.max) continue;
      value = String(n);
    }
    if (!value) continue;
    seen.add(field.specLabel);
    out.push({ label: field.specLabel, value });
  }
  const missingRequired =
    kind === "livestock" && fields.some((field) => field.required && !seen.has(field.specLabel));
  return { specs: out, missingRequired };
}
