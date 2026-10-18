"use client";

import { SearchSelect } from "@/components/SearchSelect";
import { isBrandSelectField } from "@/lib/brandMarks";
import {
  bodiesOfModel,
  enginesOfModel,
  modelsOfBrand,
  packagesOfModel,
  rangesOfModel,
  type VehicleSegment,
} from "@/data/listingOptions";
import type { AttrField, ListingSchema } from "@/data/listingSchema";
import { withApprovedOptions, type ApprovedVehicle } from "@/data/vehicleRequests";
import { fieldUnit } from "@/lib/listings/currency";

/**
 * Catalog picks (brand → model → package → engine …) whose value is no longer offered for the parents above
 * them, e.g. from an old draft. Fields without catalog options are never flagged.
 */
export function staleCatalogAttrs(schema: ListingSchema, attrs: Record<string, string>, approved?: ApprovedVehicle[]) {
  const segment = schema.catalogKind ?? "auto";
  return schema.fields.filter((field) => {
    const value = attrs[field.key];
    if (!value || !(field.optionSource || (field.key === "brand" && field.catalogKind))) return false;
    const options = optionsOf(field, attrs, segment, approved);
    return options.length > 0 && !options.includes(value);
  });
}

/** Values of `prev` that are still valid choices in `next`, so switching category keeps what still fits. */
export function carryAttrs(prev: Record<string, string>, next: ListingSchema, approved?: ApprovedVehicle[]) {
  const segment = next.catalogKind ?? "auto";
  const out: Record<string, string> = {};
  for (const field of next.fields) {
    const value = prev[field.key];
    if (!value) continue;
    if (field.kind === "number" || field.kind === "text") {
      out[field.key] = value;
      continue;
    }
    if (optionsOf(field, out, segment, approved).includes(value)) out[field.key] = value;
  }
  return out;
}

function optionsOf(field: AttrField, attrs: Record<string, string>, segment: VehicleSegment, approved?: ApprovedVehicle[]) {
  const kind = field.catalogKind ?? segment;
  const merge = (level: "brand" | "model" | "trim" | "engine", options: string[]) =>
    withApprovedOptions(level, options, approved, kind, attrs);
  if (field.optionSource === "vehicleModels") return merge("model", modelsOfBrand(attrs.brand, kind));
  if (field.optionSource === "vehiclePackages") return merge("trim", packagesOfModel(attrs.brand, attrs.model, kind));
  if (field.optionSource === "vehicleEngines") return merge("engine", enginesOfModel(attrs.brand, attrs.model, kind));
  if (field.optionSource === "vehicleBodies") return bodiesOfModel(attrs.brand, attrs.model, kind);
  if (field.optionSource === "vehicleRanges") return rangesOfModel(attrs.brand, attrs.model, kind);
  if (field.key === "brand" && field.catalogKind && approved?.length) return merge("brand", field.options ?? []);
  return field.options ?? [];
}

/** Digits with at most one decimal comma (12,5); a typed dot becomes a comma. */
function decimalInput(raw: string) {
  const s = raw.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const i = s.indexOf(",");
  return i < 0 ? s : `${s.slice(0, i + 1)}${s.slice(i + 1).replace(/,/g, "").slice(0, 2)}`;
}

function lockHint(dependsOn?: string) {
  if (dependsOn === "brand") return "Önce marka seçin";
  if (dependsOn === "model") return "Önce model seçin";
  if (dependsOn === "trim") return "Önce seri / paket seçin";
  if (dependsOn === "engine") return "Önce motor seçin";
  if (dependsOn === "body") return "Önce kasa tipi seçin";
  return "Önce üst kademeyi seçin";
}

function emptyHint(field: AttrField) {
  if (field.key === "model") return "Bu seçim için uygun model bulunamadı.";
  if (field.key === "trim") return "Bu model için seri / paket bulunamadı.";
  if (field.key === "engine") return "Bu seçim için motor seçeneği bulunamadı.";
  if (field.key === "body") return "Bu seçim için kasa tipi bulunamadı.";
  if (field.key === "range") return "Bu seçim için menzil bilgisi bulunamadı.";
  return "Bu seçim için uygun seçenek bulunamadı.";
}

export function DynamicAttributeForm({
  schema,
  attrs,
  onChange,
  approved,
  currency,
  invalid,
}: {
  schema: ListingSchema;
  attrs: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Admin-approved catalog additions, only passed for vasıta schemas. */
  approved?: ApprovedVehicle[];
  /** Currency chosen for the listing; amount fields are labelled with it. */
  currency?: string;
  /** Required keys the last validation found empty; they are outlined until filled. */
  invalid?: string[];
}) {
  const segment = schema.catalogKind ?? "auto";
  const lockedMemo = new Map<string, boolean>();
  const isLocked = (field: AttrField, depth = 0): boolean => {
    const cached = lockedMemo.get(field.key);
    if (cached !== undefined) return cached;
    const parentKey = field.dependsOn;
    let locked = false;
    if (parentKey && !attrs[parentKey] && depth < 12) {
      const parentField = schema.fields.find((item) => item.key === parentKey);
      const parentSkippable =
        parentField != null &&
        Boolean(parentField.optionSource) &&
        !isLocked(parentField, depth + 1) &&
        optionsOf(parentField, attrs, segment, approved).length === 0;
      locked = !parentSkippable;
    }
    lockedMemo.set(field.key, locked);
    return locked;
  };

  return (
    <div className="dyn-form">
      <div className="dyn-form-grid">
        {schema.fields.map((field) => {
          const options = optionsOf(field, attrs, segment, approved);
          const locked = isLocked(field);
          const placeholder = locked ? lockHint(field.dependsOn) : "Seçiniz";
          const bad = Boolean(invalid?.includes(field.key));
          if (field.kind === "number" || field.kind === "text") {
            const unit = fieldUnit(field, currency);
            return (
              <label key={field.key} className={`block ${bad ? "dyn-invalid" : ""}`} data-attr-key={field.key}>
                <span className="mb-1.5 block text-sm font-semibold text-ink">
                  {field.label}
                  {unit ? ` (${unit})` : ""}
                  {field.required ? " *" : ""}
                </span>
                <input
                  value={attrs[field.key] ?? ""}
                  aria-invalid={bad || undefined}
                  inputMode={field.kind === "number" ? (field.decimal ? "decimal" : "numeric") : undefined}
                  disabled={locked}
                  maxLength={field.kind === "number" ? 12 : 120}
                  onChange={(e) =>
                    onChange(
                      field.key,
                      field.kind !== "number"
                        ? e.target.value
                        : field.decimal
                          ? decimalInput(e.target.value)
                          : e.target.value.replace(/\D/g, ""),
                    )
                  }
                  placeholder={
                    field.key === "km"
                      ? "120000"
                      : field.key.includes("sqm")
                        ? "120"
                        : field.key === "ageMonths"
                          ? "18"
                          : field.key === "qty"
                            ? "1"
                            : ""
                  }
                  className="h-12 w-full rounded-xl border border-line bg-panel px-3 text-sm text-ink shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
            );
          }
          return (
            <div key={field.key} className={bad ? "dyn-invalid" : undefined} data-attr-key={field.key}>
              <SearchSelect
                label={`${field.label}${field.required ? " *" : ""}`}
                value={attrs[field.key] ?? ""}
                options={options}
                disabled={locked}
                placeholder={placeholder}
                emptyLabel={!locked && field.dependsOn ? emptyHint(field) : "Sonuç yok"}
                menuMode="inline"
                visual={isBrandSelectField(field.key) ? "brand" : "none"}
                onChange={(v) => onChange(field.key, v)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
