"use client";

import { X } from "lucide-react";
import { STD_DATE_PRESETS } from "@/components/StdFilterSidebar";
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

/** Values that read on their own as a chip ("Çankaya", "2+1", "Jakuzi"); others keep a "Label: value" prefix. */
const BARE_KEYS = new Set(["city", "district", "neighborhood", "rooms", "homeType", "deal"]);
const RANGE_PREFIX: Record<string, string> = { sqmNetMin: "Net ", duesMin: "Aidat " };

function fmt(n: string) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString("tr-TR") : n;
}

export function FilterChips({
  fields,
  state,
  onRemove,
  onClear,
  clearLabelKey = "flt.clear",
}: {
  fields: FilterField[];
  state: FilterState;
  /** `value` removes one item of a multi-value filter; without it the whole key (and its range pair) is cleared. */
  onRemove: (key: string, value?: string) => void;
  onClear: () => void;
  clearLabelKey?: string;
}) {
  const { t } = useI18n();
  const skip = new Set(["hours24", "includeDesc", "mappedOnly", "renoSub"]);
  const chips: { id: string; key: string; value?: string; text: string }[] = [];
  const seen = new Set<string>();
  for (const [key, value] of Object.entries(state)) {
    if (!value || skip.has(key) || seen.has(key)) continue;
    const minPair = key.endsWith("Max") ? fields.find((f) => f.pairKey === key) : undefined;
    if (minPair) {
      if (state[minPair.key]) continue;
      const text = minPair.group
        ? `${RANGE_PREFIX[minPair.key] ?? ""}≤ ${fmt(value)} ${minPair.suffix ?? ""}`.trim()
        : `${labelOf(t, minPair, key)}: ≤ ${value}`;
      chips.push({ id: key, key, text });
      continue;
    }
    const field = fields.find((f) => f.key === key) ?? fields.find((f) => f.pairKey === key);
    if (key.endsWith("Min") && field?.pairKey) {
      const max = state[field.pairKey] ?? "";
      seen.add(field.pairKey);
      if (field.group) {
        const span = max ? `${fmt(value)}–${fmt(max)}` : `${fmt(value)}+`;
        const unit = field.suffix ? ` ${field.suffix}` : ` (${labelOf(t, field, key)})`;
        chips.push({ id: key, key, text: `${RANGE_PREFIX[key] ?? ""}${span}${unit}` });
      } else {
        chips.push({
          id: key,
          key,
          text: max ? `${labelOf(t, field, key)}: ${value}–${max}` : `${labelOf(t, field, key)}: ${value}+`,
        });
      }
      continue;
    }
    if (key === "posted") {
      const preset = STD_DATE_PRESETS.find((p) => p.id === value);
      chips.push({ id: key, key, text: `${t("flt.posted")}: ${preset ? t(preset.labelKey) : value}` });
      continue;
    }
    if (key === "urgent" && value === "1") {
      chips.push({ id: key, key, text: labelOf(t, field, key) });
      continue;
    }
    if (field?.group && (field.kind === "multi" || field.multiPick)) {
      for (const item of value.split(",").filter(Boolean)) {
        const bare = field.kind === "multi" || BARE_KEYS.has(key);
        chips.push({ id: `${key}:${item}`, key, value: item, text: bare ? item : `${labelOf(t, field, key)}: ${item}` });
      }
      continue;
    }
    if (field?.group && BARE_KEYS.has(key)) {
      chips.push({ id: key, key, text: value });
      continue;
    }
    chips.push({ id: key, key, text: `${labelOf(t, field, key)}: ${value.replaceAll(",", ", ")}` });
  }
  if (!chips.length) return null;
  return (
    <div className="flt-chips">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          className="flt-chip"
          aria-label={`${c.text} ×`}
          onClick={() => onRemove(c.key, c.value)}
        >
          {c.text}
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ))}
      <button type="button" className="flt-chip is-clear" onClick={onClear}>
        {t(clearLabelKey)}
      </button>
    </div>
  );
}
