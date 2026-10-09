import { vehicleComboError, vehicleProfileFromCategoryId } from "@/data/vehicleIndex";
import { vehicleProfileSpec } from "@/data/vehicleProfiles";

type Spec = { label: string; value: string };

function specValue(specs: Spec[], label?: string) {
  if (!label) return "";
  return specs.find((s) => s.label === label)?.value.trim() ?? "";
}

/** Brand / model / package as stored by the vasıta profile form, or null outside those categories. */
export function vehicleComboOf(categoryId: string, specs: Spec[]) {
  if (!categoryId.startsWith("vasita-")) return null;
  const spec = vehicleProfileSpec(vehicleProfileFromCategoryId(categoryId));
  if (!spec) return null;
  const label = (key: string) => spec.fields.find((f) => f.key === key)?.specLabel;
  return {
    segment: spec.segment,
    brand: specValue(specs, label("brand")),
    model: specValue(specs, label("model")),
    trim: specValue(specs, label("trim")),
  };
}

/**
 * Rejects a model that does not belong to the chosen catalog brand (or a package outside the model). Brands outside
 * the catalog are left alone. On edit, an unchanged combination is accepted so older listings stay editable.
 */
export function vehicleSpecError(categoryId: string, specs: Spec[], previous?: { categoryId: string; specs: Spec[] }) {
  const combo = vehicleComboOf(categoryId, specs);
  if (!combo) return null;
  if (previous) {
    const before = vehicleComboOf(previous.categoryId, previous.specs);
    if (before && before.segment === combo.segment && before.brand === combo.brand && before.model === combo.model && before.trim === combo.trim) {
      return null;
    }
  }
  return vehicleComboError(combo.segment, combo) ? "post.vehicleModel" : null;
}
