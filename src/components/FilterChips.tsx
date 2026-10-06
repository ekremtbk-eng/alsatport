"use client";

import { X } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import type { FilterField, FilterState } from "@/lib/categoryFilters";

function labelOf(t: (k: string) => string, field?: FilterField, key?: string) {
  if (field) {
    const hit = t(field.labelKey);
    if (hit !== field.labelKey) return hit;
  }
  const map: Record<string, string> = {
    city: "İl",
    district: "İlçe",
    neighborhood: "Mahalle",
    brand: "Marka",
    model: "Model",
    trim: "Seri / Paket",
    kimden: "Kimden",
    fuel: "Yakıt",
    gear: "Vites",
    keyword: "Kelime",
  };
  return (key && map[key]) || field?.labelKey || key || "";
}

export function FilterChips({
  fields,
  state,
  onRemove,
  onClear,
}: {
  fields: FilterField[];
  state: FilterState;
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const skip = new Set(["hours24", "includeDesc", "mappedOnly", "renoSub"]);
  const chips: { key: string; text: string }[] = [];
  const seen = new Set<string>();
  for (const [key, value] of Object.entries(state)) {
    if (!value || skip.has(key) || seen.has(key)) continue;
    if (key.endsWith("Max") && fields.some((f) => f.pairKey === key)) continue;
    const field = fields.find((f) => f.key === key) ?? fields.find((f) => f.pairKey === key);
    if (key.endsWith("Min") && field?.pairKey) {
      const max = state[field.pairKey] ?? "";
      chips.push({
        key,
        text: max ? `${labelOf(t, field, key)}: ${value}–${max}` : `${labelOf(t, field, key)}: ${value}+`,
      });
      seen.add(field.pairKey);
      continue;
    }
    chips.push({ key, text: `${labelOf(t, field, key)}: ${value.replaceAll(",", ", ")}` });
  }
  if (!chips.length) return null;
  return (
    <div className="flt-chips">
      {chips.map((c) => (
        <button key={c.key} type="button" className="flt-chip" onClick={() => onRemove(c.key)}>
          {c.text}
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ))}
      <button type="button" className="flt-chip is-clear" onClick={onClear}>
        {t("flt.clear")}
      </button>
    </div>
  );
}
