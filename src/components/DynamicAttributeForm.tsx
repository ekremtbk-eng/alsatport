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

const CHILD_KEYS = ["model", "trim", "engine", "body", "range", "gear", "drive", "power"] as const;

function optionsOf(field: AttrField, attrs: Record<string, string>, segment: VehicleSegment) {
  const kind = field.catalogKind ?? segment;
  if (field.optionSource === "vehicleModels") return modelsOfBrand(attrs.brand, kind);
  if (field.optionSource === "vehiclePackages") return packagesOfModel(attrs.brand, attrs.model, kind);
  if (field.optionSource === "vehicleEngines") return enginesOfModel(attrs.brand, attrs.model, kind);
  if (field.optionSource === "vehicleBodies") return bodiesOfModel(attrs.brand, attrs.model, kind);
  if (field.optionSource === "vehicleRanges") return rangesOfModel(attrs.brand, attrs.model, kind);
  return field.options ?? [];
}

function lockHint(dependsOn?: string) {
  if (dependsOn === "brand") return "Önce marka seçin";
  if (dependsOn === "model") return "Önce model seçin";
  if (dependsOn === "trim") return "Önce seri seçin";
  if (dependsOn === "engine") return "Önce motor seçin";
  if (dependsOn === "body") return "Önce kasa tipi seçin";
  return "Önce üst kademeyi seçin";
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

  function setField(field: AttrField, value: string) {
    onChange(field.key, value);
    const idx = CHILD_KEYS.indexOf(field.key as (typeof CHILD_KEYS)[number]);
    if (idx >= 0) {
      for (const key of CHILD_KEYS.slice(idx + 1)) onChange(key, "");
    }
    if (field.key === "brand") {
      for (const key of CHILD_KEYS) onChange(key, "");
    }
  }

  return (
    <div className="dyn-form">
      <div className="dyn-form-grid">
        {schema.fields.map((field) => {
          const locked = Boolean(field.dependsOn && !attrs[field.dependsOn ?? ""]);
          const options = optionsOf(field, attrs, segment);
          const placeholder = locked ? lockHint(field.dependsOn) : "Seçiniz";
          if (field.kind === "number" || field.kind === "text") {
            return (
              <label key={field.key} className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                <input
                  value={attrs[field.key] ?? ""}
                  inputMode={field.kind === "number" ? "numeric" : undefined}
                  disabled={locked}
                  onChange={(e) =>
                    setField(
                      field,
                      field.kind === "number" ? e.target.value.replace(/\D/g, "") : e.target.value,
                    )
                  }
                  placeholder={field.key === "km" ? "120000" : field.key.includes("sqm") ? "120" : ""}
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
                onChange={(v) => setField(field, v)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
