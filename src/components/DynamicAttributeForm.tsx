"use client";

import { SearchSelect } from "@/components/SearchSelect";
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
}: {
  schema: ListingSchema;
  attrs: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Admin-approved catalog additions, only passed for vasıta schemas. */
  approved?: ApprovedVehicle[];
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
          if (field.kind === "number" || field.kind === "text") {
            return (
              <label key={field.key} className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">
                  {field.label}
                  {field.unit ? ` (${field.unit})` : ""}
                  {field.required ? " *" : ""}
                </span>
                <input
                  value={attrs[field.key] ?? ""}
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
            <div key={field.key}>
              <SearchSelect
                label={`${field.label}${field.required ? " *" : ""}`}
                value={attrs[field.key] ?? ""}
                options={options}
                disabled={locked}
                placeholder={placeholder}
                emptyLabel={!locked && field.dependsOn ? emptyHint(field) : "Sonuç yok"}
                onChange={(v) => onChange(field.key, v)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
