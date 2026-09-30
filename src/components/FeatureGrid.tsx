"use client";

import type { FeatureGroup } from "@/data/listingSchema";

export function FeatureGrid({
  groups,
  selected,
  onToggle,
  readOnly,
}: {
  groups: FeatureGroup[];
  selected: string[];
  onToggle?: (item: string) => void;
  readOnly?: boolean;
}) {
  const set = new Set(selected);
  return (
    <div className="feat-stack">
      {groups.map((group) => (
        <section key={group.id} className="feat-box">
          <h3 className="feat-box-h">{group.title}</h3>
          <ul className="feat-grid">
            {group.items.map((item) => {
              const on = set.has(item);
              if (readOnly) {
                return (
                  <li key={item} className={`feat-item ${on ? "is-on" : ""}`}>
                    <span className="feat-check" aria-hidden />
                    {item}
                  </li>
                );
              }
              return (
                <li key={item}>
                  <button
                    type="button"
                    className={`feat-item ${on ? "is-on" : ""}`}
                    onClick={() => onToggle?.(item)}
                  >
                    <span className="feat-check" aria-hidden />
                    {item}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
