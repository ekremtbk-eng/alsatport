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

function optionsOf(field: AttrField, attrs: Record<string, string>, segment: VehicleSegment) {
  const kind = field.catalogKind ?? segment;
  if (field.optionSource === "vehicleModels") return modelsOfBrand(attrs.brand, kind);
  if (field.optionSource === "vehiclePackages") return packagesOfModel(attrs.brand, attrs.model, kind);
  if (field.optionSource === "vehicleEngines") return enginesOfModel(attrs.brand, attrs.model, kind);
  if (field.optionSource === "vehicleBodies") return bodiesOfModel(attrs.brand, attrs.model, kind);
  if (field.optionSource === "vehicleRanges") return rangesOfModel(attrs.brand, attrs.model, kind);
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
}: {
  schema: ListingSchema;
  attrs: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const segment = schema.catalogKind ?? "auto";

  return (
    <div className="dyn-form">
      <div className="dyn-form-grid">
        {schema.fields.map((field) => {
          const options = optionsOf(field, attrs, segment);
          const parentKey = field.dependsOn;
          const parentMissing = Boolean(parentKey && !attrs[parentKey]);
          const parentField = parentKey ? schema.fields.find((item) => item.key === parentKey) : undefined;
          const parentReady = parentField
            ? !parentField.dependsOn || Boolean(attrs[parentField.dependsOn])
            : true;
          const parentHasNoOptions =
            parentField != null &&
            parentReady &&
            optionsOf(parentField, attrs, segment).length === 0 &&
            Boolean(parentField.optionSource);
          const locked = parentMissing && !parentHasNoOptions;
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
